// ============================================================
// AUTH SERVICE
// ============================================================

import { Injectable, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto';
import { JwtPayload } from './interfaces';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditService: AuditService,
  ) {}

  /**
   * Admin creation is a super-admin action only. Ran publicly (as it was),
   * anyone could mint admin accounts — a privilege escalation hole.
   */
  async register(dto: RegisterDto, creatorId?: string, ctx?: { ipAddress?: string; userAgent?: string; requestId?: string }) {
    const roleName = dto.roleName || 'viewer';
    if (roleName === 'super_admin') {
      throw new ForbiddenException(
        'super_admin accounts cannot be created through this endpoint; promote an existing admin instead',
      );
    }

    // Check if username or email exists
    const existing = await this.prisma.adminUser.findFirst({
      where: {
        OR: [
          { username: dto.username },
          { email: dto.email },
        ],
      },
    });

    if (existing) {
      throw new ConflictException('Username or email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user
    const user = await this.prisma.adminUser.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        createdBy: creatorId,
      },
    });

    // Assign the requested (non-super-admin) role
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });

    if (role) {
      await this.prisma.adminUserRole.create({
        data: {
          adminId: user.id,
          roleId: role.id,
        },
      });
    }

    await this.auditService.log({
      actorId: creatorId,
      actorType: 'admin',
      action: 'admin.registered',
      entityType: 'AdminUser',
      entityId: user.id,
      after: {
        username: user.username,
        email: user.email,
        roleName,
        createdBy: creatorId,
      },
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
      requestId: ctx?.requestId,
      metadata: { source: 'auth.register' },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.username, user.email);

    // Store refresh token
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    // Find user by email or username
    const user = await this.prisma.adminUser.findFirst({
      where: {
        OR: [
          { email: dto.email },
          { username: dto.email },
        ],
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.username, user.email);

    // Store refresh token
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    // Get roles and permissions
    const roles = user.roles.map((ur) => ur.role.name);
    const permissions = await this.getUserPermissions(user.id);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
        permissions,
      },
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string) {
    // Find refresh token
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (new Date(tokenRecord.expiresAt) < new Date()) {
      // Delete expired token
      await this.prisma.refreshToken.delete({
        where: { id: tokenRecord.id },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    // Generate new tokens
    const tokens = await this.generateTokens(
      tokenRecord.user.id,
      tokenRecord.user.username,
      tokenRecord.user.email,
    );

    // Delete old refresh token
    await this.prisma.refreshToken.delete({
      where: { id: tokenRecord.id },
    });

    // Store new refresh token
    await this.storeRefreshToken(tokenRecord.user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.adminUser.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const roles = user.roles.map((ur) => ur.role.name);
    const permissions = user.roles.flatMap((ur) =>
      ur.role.permissions.map((rp) => `${rp.permission.resource}:${rp.permission.action}`),
    );

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      roles,
      permissions: [...new Set(permissions)],
    };
  }

  private async generateTokens(userId: string, username: string, email: string) {
    const payload: JwtPayload = {
      sub: userId,
      username,
      email,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, token: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }

  private async getUserPermissions(userId: string): Promise<string[]> {
    const userRoles = await this.prisma.adminUserRole.findMany({
      where: { adminId: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const permissions = userRoles.flatMap((ur) =>
      ur.role.permissions.map((rp) => `${rp.permission.resource}:${rp.permission.action}`),
    );

    return [...new Set(permissions)];
  }
}
