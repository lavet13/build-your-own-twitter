import jwt from "jsonwebtoken";
import { prisma } from "@/db";
import ms from "ms";
import type { UserWithPermissions } from "@/auth/permissions";

export const ACCESS_TOKEN_TTL = "10m"; // or '15m', '30m' short-lived token
export const REFRESH_TOKEN_TTL = "30d"; // '14 days', '60 days', etc long-lived token

export interface TokenPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return <TokenPayload>jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch {
    // expired/invalid token
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return <TokenPayload>jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    // expired/invalid token
    return null;
  }
}

export function generateTokens({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const accessToken = jwt.sign(
    { userId, email },
    process.env.ACCESS_TOKEN_SECRET!,
    { expiresIn: ms(ACCESS_TOKEN_TTL), algorithm: "PS256" }
  );

  const refreshToken = jwt.sign(
    { userId, email },
    process.env.REFRESH_TOKEN_SECRET!,
    { expiresIn: ms(REFRESH_TOKEN_TTL), algorithm: "PS256" }
  );

  return { accessToken, refreshToken };
}

export interface RefreshResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}

export async function refreshTokens(
  refreshTokenValue: string
): Promise<RefreshResult> {
  try {
    // 1. Verify the refresh token JWT
    const payload = verifyRefreshToken(refreshTokenValue);
    if (!payload) {
      return { success: false, error: "Invalid refresh token" };
    }

    const transactionResult = await prisma.$transaction(async (tx) => {
      // 2. Check if token exists in database
      const tokenRecord = await tx.session.findUnique({
        where: {
          refreshToken: refreshTokenValue,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              deletedAt: true,
            },
          },
        },
      });

      if (!tokenRecord) {
        return { success: false, error: "Refresh token not found" };
      }

      // 3. Check if token is expired
      if (tokenRecord.expiresAt < new Date()) {
        // Clean up expired token
        await tx.session.delete({
          where: { id: tokenRecord.id },
        });
        return { success: false, error: "Refresh token expired" };
      }

      // 4. Check if user still exists and not deleted
      if (!tokenRecord.user || tokenRecord.user?.deletedAt) {
        return { success: false, error: "User no longer exists" };
      }

      // 5. Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = generateTokens({
        userId: tokenRecord.user.id,
        email: tokenRecord.user.email,
      });

      // 6. Update refresh token in database (rotate it)
      const expiresAt = new Date();
      expiresAt.setUTCDate(expiresAt.getDate() + 30); // 30 days from now

      await prisma.session.update({
        where: {
          id: tokenRecord.id,
        },
        data: {
          refreshToken: newRefreshToken,
          expiresAt,
        },
      });

      return {
        success: true,
        accessToken,
        refreshToken: newRefreshToken,
      };
    });

    return transactionResult;
  } catch (error) {
    console.error("Token refresh error:", error);
    return { success: false, error: "Token refresh failed" };
  }
}

/**
 * Build a Set of all effective permissions for a user
 * Combines role permissions + user-specific grants/revokes
 */
export function getEffectivePermissions(
  user: UserWithPermissions
): Set<string> {
  const permissions = new Set<string>();

  // 1. Add all permissions from role
  if (user.role) {
    for (const rp of user.role.permissions) {
      permissions.add(rp.permission.name);
    }
  }

  // 2. Apply user-specific overrides
  for (const up of user.directPermissions) {
    if (up.grantedBy) {
      permissions.add(up.permission.name);
    } else {
      permissions.delete(up.permission.name); // Revoke permission
    }
  }

  return permissions;
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(
  user: UserWithPermissions,
  permission: string
): boolean {
  const effectivePerms = getEffectivePermissions(user);
  return effectivePerms.has(permission);
}

/**
 * Check if user has ALL of the given permissions
 */
export function hasAllPermissions(
  user: UserWithPermissions,
  ...permissions: string[]
): boolean {
  const effectivePerms = getEffectivePermissions(user);
  return permissions.every((perm) => effectivePerms.has(perm));
}

/**
 * Check if user has a specific role
 */
export function hasRole(user: UserWithPermissions, roleName: string): boolean {
  return user.role?.name === roleName;
}

/**
 * Check if user has ANY of the given roles
 */
export function hasAnyRole(
  user: UserWithPermissions,
  ...roleNames: string[]
): boolean {
  return roleNames.some((role) => hasRole(user, role));
}
