import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { JwtPayload, UserDto } from '@cloudlab/shared-types';

export class TokenService {
  static generateAccessToken(user: UserDto): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiration as any,
    });
  }

  static generateRefreshToken(): { token: string; expiresAt: Date } {
    const token = uuidv4() + '-' + uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration
    return { token, expiresAt };
  }

  static verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, config.jwtSecret) as JwtPayload;
  }
}
