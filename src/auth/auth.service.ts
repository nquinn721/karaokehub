import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { UserService } from '../user/user.service';
import { CreateUserDto, LoginDto } from './dto/auth.dto';

export interface User {
  id: string;
  email: string;
  name: string;
  stageName?: string;
  avatar?: string;
  provider?: string;
  providerId?: string;
  isAdmin?: boolean;
}

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private jwtService: JwtService,
    private userService: UserService,
  ) {
    // Initialize Google OAuth2 client
    this.googleClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );
  }

  async register(
    createUserDto: CreateUserDto,
  ): Promise<{ user: User; token: string; message?: string }> {
    const { email, password, name, stageName } = createUserDto;

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
      stageName,
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
    console.log('🟢 [AUTH_SERVICE] Starting OAuth user validation');
    console.log('🔍 [AUTH_SERVICE] Input parameters:', {
      provider,
      profileId: profile?.id,
      profileDisplayName: profile?.displayName,
      profileEmails: profile?.emails,
      profilePhotos: profile?.photos,
    });

    const { id, emails, displayName, photos } = profile;
    const email = emails?.[0]?.value;

    console.log('🔍 [AUTH_SERVICE] Extracted data:', {
      id,
      email,
      displayName,
      avatar: photos?.[0]?.value,
    });

    // For non-Facebook providers, email is required
    if (!email && provider !== 'facebook') {
      console.error('🔴 [AUTH_SERVICE] OAuth validation error: No email provided', {
        provider,
        profileId: id,
      });
      throw new Error('No email provided by OAuth provider');
    }

    // For Facebook, warn if no email but continue
    if (!email && provider === 'facebook') {
      console.warn(
        '⚠️ [AUTH_SERVICE] Facebook login without email - user may not have granted email permission',
        {
          provider,
          profileId: id,
        },
      );
    }

    let user = null;

    if (email) {
      console.log('🔍 [AUTH_SERVICE] Looking up user by email:', email);
      // Check if user exists by email first
      user = await this.userService.findByEmail(email);
      console.log(
        '🔍 [AUTH_SERVICE] User found by email:',
        user ? { id: user.id, email: user.email } : 'Not found',
      );
    }

    if (!user) {
      console.log('🔍 [AUTH_SERVICE] Looking up user by provider ID:', { provider, id });
      // Check if user exists by provider ID
      user = await this.userService.findByProvider(provider, id);
      console.log(
        '🔍 [AUTH_SERVICE] User found by provider ID:',
        user ? { id: user.id, email: user.email } : 'Not found',
      );
    }

    if (!user) {
      console.log('🟢 [AUTH_SERVICE] Creating new user');
      // Create new user
      const userData: any = {
        name: displayName || `${provider}_user_${id}`,
        avatar: photos?.[0]?.value,
        provider,
        providerId: id,
      };

      // Only add email if we have one
      if (email) {
        userData.email = email;
      } else {
        // For Facebook users without email, create a placeholder email
        userData.email = `${provider}_${id}@placeholder.karaoke`;
      }

      console.log('🔍 [AUTH_SERVICE] Creating user with data:', userData);
      try {
        user = await this.userService.create(userData);
        console.log('🟢 [AUTH_SERVICE] User created successfully:', {
          id: user.id,
          email: user.email,
        });
      } catch (error) {
        console.error('🔴 [AUTH_SERVICE] Error creating user:', {
          error: error.message,
          stack: error.stack,
          userData,
        });
        throw error;
      }
    } else {
      console.log('🟢 [AUTH_SERVICE] User exists, handling provider linking/updates');

      // If this is a Facebook login and user was found by email,
      // we need to decide how to handle provider linking
      if (provider === 'facebook' && email && user.provider !== 'facebook') {
        console.log('🔍 [AUTH_SERVICE] Facebook login for user with different provider:', {
          existingProvider: user.provider,
          userEmail: user.email,
          facebookId: id,
        });

        // For existing users logging in with Facebook, we'll:
        // 1. Keep their original provider (Google/GitHub) for continuity
        // 2. Update their profile with Facebook data if it's better/newer
        // 3. Log this as a successful Facebook login

        const updateData: any = {};

        // Update avatar if Facebook has one and it's different/better
        const providerAvatar = photos?.[0]?.value;
        if (providerAvatar && providerAvatar !== user.avatar) {
          updateData.avatar = providerAvatar;
          console.log('🔍 [AUTH_SERVICE] Updating avatar from Facebook:', {
            oldAvatar: user.avatar,
            newAvatar: providerAvatar,
          });
        }

        // Update name if Facebook has a better one
        if (displayName && displayName !== user.name && displayName.length > user.name.length) {
          updateData.name = displayName;
          console.log('🔍 [AUTH_SERVICE] Updating name from Facebook:', {
            oldName: user.name,
            newName: displayName,
          });
        }

        if (Object.keys(updateData).length > 0) {
          user = await this.userService.update(user.id, updateData);
          console.log('🟢 [AUTH_SERVICE] User profile updated with Facebook data:', updateData);
        }

        console.log(
          '🟢 [AUTH_SERVICE] Facebook login successful for existing user - provider linking complete',
        );
      } else if (provider === user.provider) {
        // Same provider login - update profile data as usual
        const providerAvatar = photos?.[0]?.value;
        if (providerAvatar && providerAvatar !== user.avatar) {
          console.log('🔍 [AUTH_SERVICE] Updating user avatar for same provider:', {
            provider,
            oldAvatar: user.avatar,
            newAvatar: providerAvatar,
          });
          user = await this.userService.update(user.id, { avatar: providerAvatar });
        }
      } else {
        console.log('🔍 [AUTH_SERVICE] Different provider login - email match found:', {
          existingProvider: user.provider,
          newProvider: provider,
          userEmail: user.email,
        });

        // Handle case where user has different provider but same email
        // For now, we'll just update the avatar and continue with existing provider
        const providerAvatar = photos?.[0]?.value;
        if (providerAvatar && providerAvatar !== user.avatar) {
          user = await this.userService.update(user.id, { avatar: providerAvatar });
        }
      }
    }

    console.log('🟢 [AUTH_SERVICE] OAuth user validation completed successfully:', {
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      userProvider: user.provider,
    });

    return user;
  }

  async validateUser(payload: any): Promise<User> {
    try {
      const user = await this.userService.findOne(payload.sub);

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      console.error('JWT validation failed:', error.message);
      throw error;
    }
  }

  async verifyGoogleCredential(
    credential: string,
  ): Promise<{ user: User; token: string; isNewUser: boolean }> {
    try {
      console.log('🟢 [GOOGLE_ONE_TAP] Starting credential verification');

      // Verify the Google JWT token
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Invalid Google credential payload');
      }

      console.log('🟢 [GOOGLE_ONE_TAP] Google credential verified for:', payload.email);

      const { sub: googleId, email, name, picture } = payload;

      if (!email || !googleId) {
        throw new Error('Required user information missing from Google credential');
      }

      // Check if user exists
      let existingUser = await this.userService.findByEmail(email);
      let isNewUser = false;

      if (existingUser) {
        console.log('🟢 [GOOGLE_ONE_TAP] Existing user found:', email);

        // Update user info if needed (in case profile changed)
        if (existingUser.name !== name || existingUser.avatar !== picture) {
          existingUser = await this.userService.update(existingUser.id, {
            name: name || existingUser.name,
            avatar: picture || existingUser.avatar,
          });
        }
      } else {
        console.log('🟢 [GOOGLE_ONE_TAP] Creating new user:', email);

        // Create new user
        existingUser = await this.userService.create({
          email,
          name: name || email.split('@')[0], // Use part before @ as fallback name
          avatar: picture,
          provider: 'google',
          providerId: googleId,
          // No password for OAuth users
        });

        isNewUser = true;
      }

      // Generate JWT token
      const token = this.generateToken(existingUser);

      console.log('🟢 [GOOGLE_ONE_TAP] Authentication successful for:', email, { isNewUser });

      return {
        user: existingUser,
        token,
        isNewUser,
      };
    } catch (error) {
      console.error('🔴 [GOOGLE_ONE_TAP] Verification failed:', error.message);
      throw new Error(`Google credential verification failed: ${error.message}`);
    }
  }

  generateToken(user: User): string {
    const payload = { sub: user.id, email: user.email };

    try {
      const token = this.jwtService.sign(payload);
      return token;
    } catch (error) {
      console.error('JWT token generation failed:', error.message);
      throw error;
    }
  }
}
