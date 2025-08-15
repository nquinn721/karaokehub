import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserService } from '../user/user.service';
import { CreateUserDto, LoginDto } from './dto/auth.dto';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider?: string;
  providerId?: string;
  isAdmin?: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private userService: UserService,
  ) {}

  async register(
    createUserDto: CreateUserDto,
  ): Promise<{ user: User; token: string; message?: string }> {
    const { email, password, name } = createUserDto;

    // Check if user exists
    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      // If user exists but doesn't have a password (OAuth user), allow them to set one
      if (!existingUser.password) {
        console.log(
          `User ${email} exists but has no password (OAuth user), allowing password assignment`,
        );

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update the user with the new password and name if provided
        const updatedUser = await this.userService.update(existingUser.id, {
          password: hashedPassword,
          name: name || existingUser.name, // Update name if provided, otherwise keep existing
        });

        // Generate JWT token
        const token = this.generateToken(updatedUser);

        return {
          user: updatedUser,
          token,
        };
      } else {
        // User exists and already has a password
        throw new Error('User already exists with a password. Please use login instead.');
      }
    }

    // Hash password for new user
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.userService.create({
      email,
      name,
      password: hashedPassword,
    });

    // Generate JWT token
    const token = this.generateToken(user);

    return { user, token };
  }

  async login(loginDto: LoginDto): Promise<{ user: User; token: string }> {
    const { email, password } = loginDto;

    // Find user
    const user = (await this.userService.findByEmail(email)) as any;
    if (!user || !user.password) {
      throw new Error('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Remove password from user object
    const { password: _, ...userWithoutPassword } = user;

    // Generate JWT token
    const token = this.generateToken(userWithoutPassword);

    return { user: userWithoutPassword, token };
  }

  async validateOAuthUser(profile: any, provider: string): Promise<User> {
    const { id, emails, displayName, photos } = profile;
    const email = emails?.[0]?.value;

    if (!email) {
      console.error('🔴 OAuth validation error: No email provided', { provider, profileId: id });
      throw new Error('No email provided by OAuth provider');
    }

    // Check if user exists by email first
    let user = await this.userService.findByEmail(email);

    if (!user) {
      // Check if user exists by provider ID
      user = await this.userService.findByProvider(provider, id);
    }

    if (!user) {
      // Create new user
      user = await this.userService.create({
        email,
        name: displayName || email,
        avatar: photos?.[0]?.value,
        provider,
        providerId: id,
      });
    } else {
      // Update existing user's avatar if provider has one and it's different
      const providerAvatar = photos?.[0]?.value;
      if (providerAvatar && providerAvatar !== user.avatar) {
        user = await this.userService.update(user.id, { avatar: providerAvatar });
      }
    }

    return user;
  }

  async validateUser(payload: any): Promise<User> {
    try {
      console.log('🔵 [JWT_VALIDATION] Starting user validation from JWT payload', {
        payload,
        userId: payload?.sub,
        userEmail: payload?.email,
        timestamp: new Date().toISOString(),
      });

      const user = await this.userService.findOne(payload.sub);

      if (!user) {
        console.error('🔴 [JWT_VALIDATION] User not found in database', {
          requestedUserId: payload.sub,
          payload,
          timestamp: new Date().toISOString(),
        });
        throw new Error('User not found');
      }

      console.log('🟢 [JWT_VALIDATION] User validation successful', {
        foundUserId: user?.id,
        foundUserEmail: user?.email,
        requestedUserId: payload?.sub,
        timestamp: new Date().toISOString(),
      });

      return user;
    } catch (error) {
      console.error('🔴 [JWT_VALIDATION] User validation failed', {
        error: error.message,
        stack: error.stack,
        payload,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  generateToken(user: User): string {
    console.log('🔵 [JWT_GENERATION] Starting token generation', {
      userId: user?.id,
      userEmail: user?.email,
      timestamp: new Date().toISOString(),
    });

    const payload = { sub: user.id, email: user.email };
    console.log('🔵 [JWT_GENERATION] JWT payload created', {
      payload,
      timestamp: new Date().toISOString(),
    });

    try {
      const token = this.jwtService.sign(payload);
      console.log('🟢 [JWT_GENERATION] JWT token generated successfully', {
        tokenLength: token?.length,
        tokenPrefix: token?.substring(0, 20) + '...',
        payload,
        timestamp: new Date().toISOString(),
      });
      return token;
    } catch (error) {
      console.error('🔴 [JWT_GENERATION] JWT token generation failed', {
        error: error.message,
        stack: error.stack,
        payload,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }
}
