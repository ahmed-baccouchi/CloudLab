export enum UserRole {
  STUDENT = 'STUDENT',
  INSTRUCTOR = 'INSTRUCTOR',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export interface UserProfileDto {
  bio?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  preferredTerminalTheme?: string;
}

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: UserRole;
  status: UserStatus;
  profile?: UserProfileDto;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface TokenResponseDto {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: UserDto;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  iat?: number;
  exp?: number;
}
