import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Microphone } from '../avatar/entities/microphone.entity';
import { UserMicrophone } from '../avatar/entities/user-microphone.entity';
import { User } from '../entities/user.entity';
import { StripeService } from '../subscription/stripe.service';
import { CoinPackage } from './entities/coin-package.entity';
import { Transaction } from './entities/transaction.entity';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Microphone, UserMicrophone, CoinPackage, Transaction]),
    ConfigModule,
  ],
  controllers: [StoreController],
  providers: [StoreService, StripeService],
  exports: [StoreService],
})
export class StoreModule {}
