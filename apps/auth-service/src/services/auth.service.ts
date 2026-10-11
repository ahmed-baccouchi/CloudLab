import crypto from 'crypto';
import { authRepository } from '../db/auth.repository';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { EmailService } from './email.service';
import { RegisterDto, LoginDto, TokenResponseDto, UserDto, UserStatus, UserRole } from '@cloudlab/shared-types';

export class EmailNotVerifiedError extends Error {
  code = 'EMAIL_NOT_VERIFIED';
  constructor(message: string = 'Please verify your email address before logging in.') {
    super(message);
    this.name = 'EmailNotVerifiedError';
  }
}

export class AuthService {
  static async register(dto: RegisterDto, avatarUrl?: string): Promise<{ message: string; user: UserDto }> {
    const existing = await authRepository.findByEmail(dto.email);
    if (existing) {
      throw new Error('A user with this email address already exists');
    }

    if (!dto.password || dto.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    const passwordHash = await PasswordService.hash(dto.password);
    
    // Generate secure verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const userRecord = await authRepository.createUser({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
      verificationToken,
      verificationExpires,
      avatarUrl,
    });

    // Send verification email asynchronously
    await EmailService.sendVerificationEmail(userRecord.email, userRecord.first_name, verificationToken);

    const userDto = authRepository.toUserDto(userRecord);

    return {
      message: 'Account created! Please check your email to verify your account before logging in.',
      user: userDto,
    };
  }

  static async login(dto: LoginDto): Promise<TokenResponseDto> {
    const user = await authRepository.findByEmail(dto.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isMatch = await PasswordService.compare(dto.password, user.password_hash);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    // Email verification gate
    if (user.status === UserStatus.PENDING) {
      throw new EmailNotVerifiedError('Your account is locked until you verify your email address.');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new Error('Your account has been suspended. Please contact platform support.');
    }

    const userDto = authRepository.toUserDto(user);
    const accessToken = TokenService.generateAccessToken(userDto);
    const { token: refreshToken, expiresAt } = TokenService.generateRefreshToken();

    await authRepository.saveRefreshToken(user.id, refreshToken, expiresAt);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 900,
      user: userDto,
    };
  }

  static async verifyEmail(token: string): Promise<{ message: string; user: UserDto }> {
    if (!token) {
      throw new Error('Verification token is required');
    }

    const user = await authRepository.findByVerificationToken(token);
    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    if (user.status === UserStatus.ACTIVE) {
      return {
        message: 'Your email address is already verified! Your account is active and unlocked.',
        user: authRepository.toUserDto(user),
      };
    }

    if (user.email_verification_expires && new Date() > new Date(user.email_verification_expires)) {
      throw new Error('Verification token has expired. Please request a new one.');
    }

    await authRepository.activateUser(user.id);
    const updatedUser = await authRepository.findById(user.id);
    if (!updatedUser) {
      throw new Error('User record missing');
    }

    return {
      message: 'Email successfully verified! Your account is now active and you may log in.',
      user: authRepository.toUserDto(updatedUser),
    };
  }

  static async resendVerification(email: string): Promise<{ message: string }> {
    if (!email) {
      throw new Error('Email address is required');
    }

    const user = await authRepository.findByEmail(email);
    if (!user) {
      // Return generic message to avoid email enumeration
      return { message: 'If an account exists with this email, a verification link has been sent.' };
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new Error('This account is already verified. You can log in directly.');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await authRepository.saveVerificationToken(user.id, token, expires);
    await EmailService.sendVerificationEmail(user.email, user.first_name, token);

    return { message: 'A new verification link has been sent to your email.' };
  }

  static async forgotPassword(email: string): Promise<{ message: string }> {
    if (!email) {
      throw new Error('Email address is required');
    }

    const user = await authRepository.findByEmail(email);
    if (!user) {
      // Mask presence for security
      return { message: 'If an account exists with this email, password reset instructions have been sent.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await authRepository.savePasswordResetToken(user.id, token, expires);
    await EmailService.sendPasswordResetEmail(user.email, user.first_name, token);

    return { message: 'If an account exists with this email, password reset instructions have been sent.' };
  }

  static async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    if (!token) {
      throw new Error('Password reset token is required');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    const user = await authRepository.findByPasswordResetToken(token);
    if (!user) {
      throw new Error('Invalid or expired password reset link');
    }

    if (user.password_reset_expires && new Date() > new Date(user.password_reset_expires)) {
      throw new Error('Password reset link has expired. Please request a new one.');
    }

    const passwordHash = await PasswordService.hash(newPassword);
    await authRepository.updatePassword(user.id, passwordHash);

    return { message: 'Your password has been successfully reset! You can now log in.' };
  }

  static async refresh(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    const tokenRecord = await authRepository.findRefreshToken(refreshToken);
    if (!tokenRecord || new Date() > new Date(tokenRecord.expires_at)) {
      throw new Error('Invalid or expired refresh token');
    }

    const user = await authRepository.findById(tokenRecord.user_id);
    if (!user) {
      throw new Error('User not found');
    }

    const userDto = authRepository.toUserDto(user);
    const accessToken = TokenService.generateAccessToken(userDto);

    return {
      accessToken,
      expiresIn: 900,
    };
  }

  static async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string; bio?: string; githubUrl?: string; linkedinUrl?: string; preferredTerminalTheme?: string },
  ): Promise<UserDto> {
    const user = await authRepository.findById(userId);
    if (!user) throw new Error('User not found');

    // Validate firstName/lastName length if provided
    if (data.firstName !== undefined && data.firstName.trim().length < 1) throw new Error('First name cannot be empty');
    if (data.lastName !== undefined && data.lastName.trim().length < 1) throw new Error('Last name cannot be empty');

    // Validate GitHub/LinkedIn as URLs if provided
    const urlPattern = /^https?:\/\/.+/;
    if (data.githubUrl && data.githubUrl.trim() && !urlPattern.test(data.githubUrl)) {
      throw new Error('GitHub URL must be a valid URL starting with http:// or https://');
    }
    if (data.linkedinUrl && data.linkedinUrl.trim() && !urlPattern.test(data.linkedinUrl)) {
      throw new Error('LinkedIn URL must be a valid URL starting with http:// or https://');
    }

    const validThemes = ['dracula', 'cyberpunk', 'matrix', 'monokai', 'nord', 'solarized'];
    if (data.preferredTerminalTheme && !validThemes.includes(data.preferredTerminalTheme)) {
      throw new Error(`Invalid terminal theme. Allowed: ${validThemes.join(', ')}`);
    }

    await authRepository.updateProfile(userId, data);
    const updated = await authRepository.findById(userId);
    if (!updated) throw new Error('User not found after update');
    return authRepository.toUserDto(updated);
  }

  static async updateAvatar(userId: string, avatarUrl: string): Promise<UserDto> {
    const user = await authRepository.findById(userId);
    if (!user) throw new Error('User not found');
    // Normalize: treat empty strings as "remove avatar" and store NULL so rendering
    // falls back to initials instead of an invalid empty URL.
    const normalized = avatarUrl && avatarUrl.trim().length > 0 ? avatarUrl : (null as unknown as string);
    await authRepository.updateAvatarUrl(userId, normalized);
    const updated = await authRepository.findById(userId);
    if (!updated) throw new Error('User not found after update');
    return authRepository.toUserDto(updated);
  }

  static async getMe(userId: string): Promise<UserDto> {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return authRepository.toUserDto(user);
  }

  static async adminListUsers(): Promise<UserDto[]> {
    const users = await authRepository.findAllUsers();
    return users.map((u) => authRepository.toUserDto(u));
  }

  static async adminUpdateUserStatus(userId: string, status: UserStatus): Promise<UserDto> {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    await authRepository.updateUserStatus(userId, status);
    const updated = await authRepository.findById(userId);
    if (!updated) throw new Error('User not found after update');
    return authRepository.toUserDto(updated);
  }

  static async adminUpdateUserRole(userId: string, role: UserRole): Promise<UserDto> {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    if (role === 'INSTRUCTOR') {
      throw new Error('Promoting users to INSTRUCTOR is not permitted via admin panel per platform policy.');
    }
    await authRepository.updateUserRole(userId, role);
    const updated = await authRepository.findById(userId);
    if (!updated) throw new Error('User not found after update');
    return authRepository.toUserDto(updated);
  }

  static async logout(userId: string, refreshToken?: string): Promise<{ message: string }> {
    if (refreshToken) {
      try {
        await authRepository.revokeRefreshToken(refreshToken);
      } catch (e) {
        // Ignore if token doesn't exist
      }
    }
    await authRepository.revokeAllRefreshTokensForUser(userId).catch(() => {});
    return {
      message: 'Logged out successfully. All sessions have been invalidated.',
    };
  }

  /**
   * Invalidate a single refresh token without requiring a user id.
   * Used from the tolerant logout endpoint when the client only has an
   * expired/invalid access token but still provides a refresh token.
   */
  static async invalidateRefreshTokenOnly(refreshToken: string): Promise<void> {
    if (!refreshToken) return;
    try {
      await authRepository.revokeRefreshToken(refreshToken);
    } catch (_) {
      // ignore — token may not exist or may already be revoked
    }
  }
}
