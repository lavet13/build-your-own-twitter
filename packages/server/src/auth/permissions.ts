import type { Context } from "@/context";
import { prisma } from "@/db";
import { verifyAccessToken } from "@/auth/utils";
import type { Prisma } from "@/lib/prisma/client";

export type UserWithPermissions = Prisma.UserGetPayload<{
  select: {
    id: true;
    email: true;
    username: true;
    role: {
      select: {
        id: true;
        name: true;
        description: true;
        permissions: {
          select: {
            permission: {
              select: {
                id: true;
                name: true;
              };
            };
          };
        };
      };
    };
    directPermissions: {
      select: {
        permission: {
          select: {
            id: true;
            name: true;
          };
        };
        grantedBy: true;
        grantedAt: true;
      };
    };
  };
}>;

export async function getUserWithPermissions(
  context: Context
): Promise<UserWithPermissions | null> {
  if (!context.accessToken) return null;

  const payload = verifyAccessToken(context.accessToken);

  if (!payload) return null;

  return prisma.user.findUnique({
    where: {
      id: payload.userId,
    },
    select: {
      id: true,
      email: true,
      username: true,
      role: {
        select: {
          id: true,
          name: true,
          description: true,
          permissions: {
            select: {
              permission: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      directPermissions: {
        select: {
          permission: {
            select: {
              id: true,
              name: true,
            },
          },
          grantedBy: true,
          grantedAt: true,
        },
      },
    },
  });
}
