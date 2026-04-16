import jwt from "jsonwebtoken";
import { prisma } from "@/db";
import ms from "ms";
import type { UserWithPermissions } from "@/auth/permissions";
import type { JWTPayload } from "jose";
import type { Prisma } from "@/lib/prisma/client";
import { cookieOpts } from "@/plugins/utils/use-cookie";

export const ACCESS_TOKEN_TTL = "10m"; // or '15m', '30m' short-lived token
export const REFRESH_TOKEN_TTL = "30d"; // '14 days', '60 days', etc long-lived token

export interface TokenPayload extends JWTPayload {
  userId: string;
  email: string;
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
  const accessPayload = { sub: userId, email };
  const refreshPayload = { sub: userId };

  const accessToken = jwt.sign(
    accessPayload,
    process.env.ACCESS_TOKEN_SECRET!,
    { expiresIn: ms(ACCESS_TOKEN_TTL), algorithm: "PS256" }
  );

  const refreshToken = jwt.sign(
    refreshPayload,
    process.env.REFRESH_TOKEN_SECRET!,
    { expiresIn: ms(REFRESH_TOKEN_TTL), algorithm: "PS256" }
  );

  return { accessToken, refreshToken };
}

export async function deleteAuthTokens(
  cookieStore: Request["cookieStore"]
): Promise<void> {
  if (!cookieStore) {
    console.warn("No cookieStore available — cannot delete auth tokens");
    return;
  }

  await Promise.all([
    cookieStore.delete("accessToken"),
    cookieStore.delete("refreshToken"),
  ]);
}

export async function setAuthTokensInCookies(
  cookieStore: Request["cookieStore"],
  tokens: { accessToken?: string; refreshToken?: string },
  options: {
    accessTtl?: ms.StringValue | number;
    refreshTtl?: ms.StringValue | number;
  } = {}
): Promise<void> {
  if (!cookieStore) {
    console.warn("No cookieStore available — cannot set auth tokens");
    return;
  }

  const { accessTtl = ACCESS_TOKEN_TTL, refreshTtl = REFRESH_TOKEN_TTL } =
    options;

  const accessMs = typeof accessTtl === "number" ? accessTtl : ms(accessTtl);
  const refreshMs =
    typeof refreshTtl === "number" ? refreshTtl : ms(refreshTtl);

  const promises: Promise<void>[] = [];

  if (tokens.accessToken) {
    promises.push(
      cookieStore.set({
        name: "accessToken",
        value: tokens.accessToken,
        ...cookieOpts(accessMs),
      })
    );
  }

  if (tokens.refreshToken) {
    promises.push(
      cookieStore.set({
        name: "refreshToken",
        value: tokens.refreshToken,
        ...cookieOpts(refreshMs),
      })
    );
  }

  await Promise.all(promises);
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
    const transactionResult = await prisma.$transaction(async (tx) => {
      // 1. Check if token exists in database
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
              refreshTokenVersion: true,
            },
          },
        },
      });

      if (!tokenRecord) {
        return { success: false, error: "Refresh token not found" };
      }

      // 2. Check if token is expired
      if (tokenRecord.expiresAt < new Date()) {
        // Clean up expired token
        await tx.session.delete({
          where: { id: tokenRecord.id },
        });
        return { success: false, error: "Refresh token expired" };
      }

      // 3. Verify cryptographic integrity & basic claims
      const payload = verifyRefreshToken(refreshTokenValue);
      if (!payload) {
        // Signature invalid / malformed / wrong secret / tampered → very suspicious
        // You may want stronger reaction than normal expiration
        await tx.session.delete({ where: { id: tokenRecord.id } });

        return { success: false, error: "Invalid refresh token" };
      }

      // 4. Payload consistency check
      if (payload.sub !== tokenRecord.user?.id.toString()) {
        // adjust field names
        await tx.session.delete({ where: { id: tokenRecord.id } });
        return { success: false, error: "Token user mismatch" };
      }

      if (tokenRecord.tokenVersion !== tokenRecord.user.refreshTokenVersion) {
        await tx.session.delete({ where: { id: tokenRecord.id } });
        return { success: false, error: "Session revoked" };
      }

      // 5. Check if user still exists and not deleted
      if (!tokenRecord.user || tokenRecord.user?.deletedAt) {
        return { success: false, error: "User no longer exists" };
      }

      // 6. Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = generateTokens({
        userId: tokenRecord.user.id,
        email: tokenRecord.user.email,
      });

      // 7. Update refresh token in database (rotate it)
      const expiresAt = new Date();
      expiresAt.setUTCDate(expiresAt.getDate() + 30); // 30 days from now

      await prisma.session.update({
        where: {
          id: tokenRecord.id,
        },
        data: {
          refreshToken: newRefreshToken,
          expiresAt,
          lastUsedAt: new Date(),
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

async function bumpUserVersion(tx: Prisma.TransactionClient, userId: string) {
  return tx.user.update({
    where: { id: userId },
    data: { refreshTokenVersion: { increment: 1 } },
    select: { id: true, email: true, refreshTokenVersion: true },
  });
}

interface RevokeResult {
  success: boolean;
  error?: string;
  newRefreshToken?: string; // Only returned in strong mode if current session kept
  deletedCount?: number; // Always useful for logging/UI feedback
}

export async function revokeOtherSessions(
  userId: string,
  currentRefreshToken?: string, // Optional: to identify & preserve current session
  forceVersionBump: boolean = false // false = lightweight "other devices" mode
): Promise<RevokeResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      let newRefreshToken: string | undefined;
      let currentSessionId: string | undefined;
      let newVersion: number | undefined;

      let updatedUser: Awaited<ReturnType<typeof bumpUserVersion>> | undefined;

      // 1. Optional strong mode: bump version for global/leaked-token protection
      if (forceVersionBump) {
        updatedUser = await bumpUserVersion(tx, userId);
        newVersion = updatedUser.refreshTokenVersion;
      }

      // 2. Try to identify current session (if token provided)
      if (currentRefreshToken) {
        const currentSession = await tx.session.findUnique({
          where: { refreshToken: currentRefreshToken },
          select: { id: true, userId: true },
        });

        if (currentSession && currentSession.userId === userId) {
          currentSessionId = currentSession.id;

          // In strong mode: rotate refresh token & sync version
          if (forceVersionBump && newVersion !== undefined) {
            const { refreshToken: freshRefreshToken } = generateTokens({
              userId: updatedUser!.id, // safe because we bumped version
              email: updatedUser!.email,
            });

            const expiresAt = new Date();
            expiresAt.setUTCDate(expiresAt.getDate() + 30); // 30 days from now

            await tx.session.update({
              where: { id: currentSession.id },
              data: {
                tokenVersion: newVersion,
                refreshToken: freshRefreshToken,
                expiresAt,
                lastUsedAt: new Date(),
              },
            });

            newRefreshToken = freshRefreshToken;
          }
          // In lightweight mode: do nothing to current session (just exclude it from delete)
        } else {
          console.warn(
            `Invalid current refresh token during revocation for user ${userId}`
          );
          // Proceed → will delete everything (fallback to full revocation)
        }
      }

      // 3. Delete other sessions (exclude current if identified)
      const { count } = await tx.session.deleteMany({
        where: {
          userId,
          ...(currentSessionId && { id: { not: currentSessionId } }),
        },
      });

      return {
        success: true,
        newRefreshToken, // only set in strong mode when current preserved
        deletedCount: count,
      };
    });
  } catch (err) {
    console.error("Revocation failed:", err);
    return { success: false, error: "Failed to revoke sessions" };
  }
}

// // In your GraphQL schema/resolvers (e.g., changePassword mutation)
// async changePassword(
//   parent,
//   { oldPassword, newPassword },
//   context: { request, prisma, userId /* from auth middleware */ }
// ) {
//   // 1. Validate old password, hash new one, update user
//   const hashedNew = await hashPassword(newPassword);
//   await context.prisma.user.update({
//     where: { id: context.userId },
//     data: { password: hashedNew },
//   });
//
//   // 2. Get current refresh token from cookies (or from auth context if stored)
//   const currentRefreshToken = context.request.cookies.get('refreshToken')?.value;
//
//   // 3. Revoke others + rotate if strong mode
//   const revokeResult = await revokeOtherSessions(
//     context.userId,
//     currentRefreshToken,
//     true  // forceVersionBump = true for password change
//   );
//
//   if (!revokeResult.success) {
//     throw new Error(revokeResult.error || 'Revocation failed');
//   }
//
//   // 4. If we rotated → set new cookies in response
//   if (revokeResult.newRefreshToken) {
//     const cookieStore = context.request.cookieStore;
//
//     if (cookieStore) {
//       // Optional: also generate & set new access token if you want instant new access
//       const { accessToken } = generateTokens({
//         userId: context.userId,
//         email: /* fetch email if needed */,
//       });
//
//       await Promise.all([
//         cookieStore.set({
//           name: 'accessToken',
//           value: accessToken,
//           ...cookieOpts(ms(ACCESS_TOKEN_TTL)),
//         }),
//         cookieStore.set({
//           name: 'refreshToken',
//           value: revokeResult.newRefreshToken,
//           ...cookieOpts(ms(REFRESH_TOKEN_TTL)),
//         }),
//       ]);
//     }
//   }
//
//   return {
//     success: true,
//     message: 'Password changed and other devices logged out',
//   };
// }

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
