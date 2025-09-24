import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { AvatarService } from '../avatar/services/avatar.service';
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
    private avatarService: AvatarService,
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

    // Assign basic microphones to new user
    try {
      await this.avatarService.assignBasicMicrophones(user.id);
      console.log(`✅ Assigned basic microphones to new user ${user.id}`);
    } catch (error) {
      console.error(`❌ Failed to assign basic microphones to user ${user.id}:`, error);
      // Don't fail registration if microphone assignment fails
    }

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

    // Helper function to check if user has a custom (manually selected) avatar
    const hasCustomAvatar = async (userId: string): Promise<boolean> => {
      try {
        const currentAvatar = await this.avatarService.getUserAvatar(userId);
        if (!currentAvatar) return false;

        // Consider it custom if:
        // 1. It's not the default alex avatar
        // 2. It's not an OAuth provider URL (starts with http)
        // 3. It's one of our named avatars (not alex, which is default)
        const isDefault = currentAvatar.avatarId === 'alex';
        const isOAuthUrl = currentAvatar.avatarId.startsWith('http');
        const isNamedAvatar = ['blake', 'cameron', 'joe', 'juan', 'kai', 'onyx', 'tyler'].includes(
          currentAvatar.avatarId,
        );

        return !isDefault && (isNamedAvatar || !isOAuthUrl);
      } catch (error) {
        console.error('🔴 [AUTH_SERVICE] Error checking custom avatar:', error);
        return false;
      }
    };

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

        // Assign basic microphones to new OAuth user
        try {
          await this.avatarService.assignBasicMicrophones(user.id);
          console.log(`✅ Assigned basic microphones to new OAuth user ${user.id}`);
        } catch (micError) {
          console.error(
            `❌ Failed to assign basic microphones to OAuth user ${user.id}:`,
            micError,
          );
          // Don't fail OAuth registration if microphone assignment fails
        }

        // Store profile image from provider if available
        const providerProfileImage = photos?.[0]?.value;
        if (providerProfileImage) {
          try {
            await this.userService.update(user.id, {
              profileImageUrl: providerProfileImage,
            });
            console.log('🟢 [AUTH_SERVICE] Stored profile image from OAuth provider');
          } catch (imageError) {
            console.error('🔴 [AUTH_SERVICE] Failed to store profile image:', imageError);
            // Continue without profile image
          }
        }
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

      // Handle profile image updates for existing users
      const updateData: any = {};
      const providerProfileImage = photos?.[0]?.value;

      // Always capture/update profile image if:
      // 1. User doesn't have a profile image yet, OR
      // 2. The provider image is different from what we have stored
      if (providerProfileImage) {
        const shouldUpdateImage =
          !user.profileImageUrl || user.profileImageUrl !== providerProfileImage;

        if (shouldUpdateImage) {
          updateData.profileImageUrl = providerProfileImage;
          console.log('🔍 [AUTH_SERVICE] Updating profile image from OAuth provider:', {
            provider,
            oldImage: user.profileImageUrl || 'none',
            newImage: providerProfileImage,
          });
        }
      }

      // If this is a Facebook login and user was found by email with different provider
      if (provider === 'facebook' && email && user.provider !== 'facebook') {
        console.log('🔍 [AUTH_SERVICE] Facebook login for user with different provider:', {
          existingProvider: user.provider,
          userEmail: user.email,
          facebookId: id,
        });

        // Update name if Facebook has a better one
        if (displayName && displayName !== user.name && displayName.length > user.name.length) {
          updateData.name = displayName;
          console.log('🔍 [AUTH_SERVICE] Updating name from Facebook:', {
            oldName: user.name,
            newName: displayName,
          });
        }
      }

      // Apply any updates to the user
      if (Object.keys(updateData).length > 0) {
        try {
          user = await this.userService.update(user.id, updateData);
          console.log('🟢 [AUTH_SERVICE] User profile updated with OAuth data:', updateData);
        } catch (updateError) {
          console.error('� [AUTH_SERVICE] Failed to update user profile:', updateError);
          // Continue with login even if profile update fails
        }
      }

      // Log successful OAuth login
      console.log('🟢 [AUTH_SERVICE] OAuth login successful for existing user:', {
        provider,
        userId: user.id,
        profileImageUpdated: !!updateData.profileImageUrl,
      });
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
        if (existingUser.name !== name) {
          existingUser = await this.userService.update(existingUser.id, {
            name: name || existingUser.name,
          });
        }

        // Only update avatar if user doesn't have a custom avatar
        if (picture) {
          try {
            // Check if user has a custom avatar (not from OAuth provider)
            const userAvatar = await this.avatarService.getUserAvatar(existingUser.id);
            const isCustomAvatar =
              userAvatar &&
              !userAvatar.avatarId?.startsWith('http') &&
              !userAvatar.avatarId?.includes('googleusercontent') &&
              !userAvatar.avatarId?.includes('facebook') &&
              !userAvatar.avatarId?.includes('github');

            if (!isCustomAvatar) {
              await this.avatarService.updateUserAvatar(existingUser.id, {
                baseAvatarId: picture,
              });
              console.log('🟢 [GOOGLE_ONE_TAP] Updated avatar for existing user');
            } else {
              console.log('🔒 [GOOGLE_ONE_TAP] Preserving custom avatar for existing user');
            }
          } catch (avatarError) {
            console.error('🔴 [GOOGLE_ONE_TAP] Failed to update avatar:', avatarError);
          }
        }
      } else {
        console.log('🟢 [GOOGLE_ONE_TAP] Creating new user:', email);

        // Create new user
        existingUser = await this.userService.create({
          email,
          name: name || email.split('@')[0], // Use part before @ as fallback name
          provider: 'google',
          providerId: googleId,
          // No password for OAuth users
        });

        // Assign basic microphones to new Google One-Tap user
        try {
          await this.avatarService.assignBasicMicrophones(existingUser.id);
          console.log(
            `✅ Assigned basic microphones to new Google One-Tap user ${existingUser.id}`,
          );
        } catch (micError) {
          console.error(
            `❌ Failed to assign basic microphones to Google One-Tap user ${existingUser.id}:`,
            micError,
          );
          // Don't fail registration if microphone assignment fails
        }

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
