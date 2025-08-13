import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
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

  async register(createUserDto: CreateUserDto): Promise<{ user: User; token: string }> {
    const { email, password, name } = createUserDto;

    // Check if user exists
    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
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
      throw new Error('No email provided by OAuth provider');
    }

    // Check if user exists
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
    }

    return user;
  }

  async validateUser(payload: any): Promise<User> {
    const user = await this.userService.findOne(payload.sub);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  generateToken(user: User): string {
    const payload = { sub: user.id, email: user.email };
    return this.jwtService.sign(payload);
  }
}
