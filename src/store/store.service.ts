import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Microphone } from '../avatar/entities/microphone.entity';
import { UserMicrophone } from '../avatar/entities/user-microphone.entity';
import { User } from '../entities/user.entity';
import { StripeService } from '../subscription/stripe.service';
import { CoinPackage } from './entities/coin-package.entity';
import { Transaction, TransactionStatus, TransactionType } from './entities/transaction.entity';

@Injectable()
export class StoreService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Microphone)
    private microphoneRepository: Repository<Microphone>,
    @InjectRepository(UserMicrophone)
    private userMicrophoneRepository: Repository<UserMicrophone>,
    @InjectRepository(CoinPackage)
    private coinPackageRepository: Repository<CoinPackage>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private stripeService: StripeService,
  ) {}

  async getCoinPackages() {
    return this.coinPackageRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', priceUSD: 'ASC' },
    });
  }

  async getStoreMicrophones() {
    return this.microphoneRepository.find({
      where: { isAvailable: true },
      order: { rarity: 'ASC', coinPrice: 'ASC' },
    });
  }

  async getUserMicrophones(userId: string) {
    return this.userMicrophoneRepository.find({
      where: { userId },
      relations: ['microphone'],
      order: { acquiredAt: 'DESC' },
    });
  }

  async purchaseMicrophoneWithCoins(userId: string, microphoneId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const microphone = await this.microphoneRepository.findOne({
      where: { id: microphoneId, isAvailable: true },
    });
    if (!microphone) {
      throw new NotFoundException('Microphone not found or not available');
    }

    // Check if user already owns this microphone
    const existingOwnership = await this.userMicrophoneRepository.findOne({
      where: { userId, microphoneId },
    });
    if (existingOwnership) {
      throw new BadRequestException('You already own this microphone');
    }

    // Check if user has enough coins
    if (user.coins < microphone.coinPrice) {
      throw new BadRequestException('Insufficient coins');
    }

    // Start transaction
    const queryRunner = this.userRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Deduct coins from user
      user.coins -= microphone.coinPrice;
      await queryRunner.manager.save(user);

      // Add microphone to user's collection
      const userMicrophone = this.userMicrophoneRepository.create({
        userId,
        microphoneId,
      });
      await queryRunner.manager.save(userMicrophone);

      // Record transaction
      const transaction = this.transactionRepository.create({
        userId,
        type: TransactionType.MICROPHONE_PURCHASE,
        status: TransactionStatus.COMPLETED,
        coinAmount: -microphone.coinPrice,
        microphoneId,
        description: `Purchased ${microphone.name}`,
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      return {
        success: true,
        userMicrophone,
        remainingCoins: user.coins,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async addCoinsToUser(userId: string, coinAmount: number, description?: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.coins += coinAmount;
    await this.userRepository.save(user);

    // Record transaction
    const transaction = this.transactionRepository.create({
      userId,
      type: TransactionType.REWARD,
      status: TransactionStatus.COMPLETED,
      coinAmount,
      description: description || 'Coins added',
    });
    await this.transactionRepository.save(transaction);

    return { success: true, newBalance: user.coins };
  }

  async getUserTransactions(userId: string) {
    return this.transactionRepository.find({
      where: { userId },
      relations: ['coinPackage'],
      order: { createdAt: 'DESC' },
      take: 50, // Limit to recent transactions
    });
  }

  async getUserCoins(userId: string): Promise<number> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    return user?.coins || 0;
  }

  async createCoinPurchaseSession(userId: string, coinPackageId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const coinPackage = await this.coinPackageRepository.findOne({
      where: { id: coinPackageId, isActive: true },
    });
    if (!coinPackage) {
      throw new NotFoundException('Coin package not found');
    }

    // Ensure user has a Stripe customer ID
    if (!user.stripeCustomerId) {
      const customer = await this.stripeService.createCustomer(user.email, user.name);
      user.stripeCustomerId = customer.id;
      await this.userRepository.save(user);
    }

    // Create pending transaction
    const transaction = this.transactionRepository.create({
      userId,
      type: TransactionType.COIN_PURCHASE,
      status: TransactionStatus.PENDING,
      coinAmount: coinPackage.coinAmount + coinPackage.bonusCoins,
      priceUSD: coinPackage.priceUSD,
      coinPackageId,
      description: `Purchase ${coinPackage.name}`,
    });
    const savedTransaction = await this.transactionRepository.save(transaction);

    // Check if user has saved payment methods for simplified checkout
    const paymentMethods = await this.stripeService.getCustomerPaymentMethods(
      user.stripeCustomerId,
    );

    // Create URLs for success/cancel redirects
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const successUrl = `${baseUrl}/store?payment=success&transaction=${savedTransaction.id}`;
    const cancelUrl = `${baseUrl}/store?payment=cancelled`;

    // Create Stripe checkout session
    const session = await this.stripeService.createOneTimeCheckoutSession(
      user.stripeCustomerId,
      Math.round(coinPackage.priceUSD * 100), // Convert to cents
      'usd',
      coinPackage.name,
      successUrl,
      cancelUrl,
      {
        transactionId: savedTransaction.id,
        userId,
        coinPackageId,
        type: 'coin_purchase',
      },
    );

    // Update transaction with Stripe Session ID
    savedTransaction.stripeSessionId = session.id;
    await this.transactionRepository.save(savedTransaction);

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
      transactionId: savedTransaction.id,
      hasPaymentMethods: paymentMethods.length > 0,
    };
  }

  async processCoinPurchaseSuccess(transactionId: string, stripePaymentIntentId?: string) {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
      relations: ['coinPackage'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status === TransactionStatus.COMPLETED) {
      return { success: true, message: 'Transaction already processed' };
    }

    // For checkout sessions, verify the session is complete
    if (transaction.stripeSessionId) {
      try {
        const session = await this.stripeService.getCheckoutSession(transaction.stripeSessionId);
        if (session.payment_status !== 'paid') {
          throw new Error('Payment not completed');
        }
      } catch (error) {
        console.error('Error verifying Stripe session:', error);
        throw new Error('Failed to verify payment status');
      }
    } else if (transaction.stripePaymentIntentId && stripePaymentIntentId) {
      // Legacy payment intent validation
      if (transaction.stripePaymentIntentId !== stripePaymentIntentId) {
        throw new Error('Payment intent ID mismatch');
      }
    } else {
      throw new Error('No valid payment verification method');
    }

    const user = await this.userRepository.findOne({ where: { id: transaction.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Start database transaction
    const queryRunner = this.userRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Add coins to user
      user.coins += transaction.coinAmount;
      await queryRunner.manager.save(user);

      // Update transaction status
      transaction.status = TransactionStatus.COMPLETED;
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      return {
        success: true,
        newCoinBalance: user.coins,
        coinsAdded: transaction.coinAmount,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
