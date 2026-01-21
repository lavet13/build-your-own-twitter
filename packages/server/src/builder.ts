import SchemaBuilder from "@pothos/core"; // type ArgBuilder, // type InputFieldBuilder,
import RelayPlugin from "@pothos/plugin-relay";
import PrismaPlugin from "@pothos/plugin-prisma";
import MocksPlugin from "@pothos/plugin-mocks";
import ScopeAuthPlugin, {
  AuthScopeFailureType,
  type AuthFailure,
} from "@pothos/plugin-scope-auth";

import { prisma } from "@/db";
import type PrismaTypes from "@/lib/pothos-prisma-types";
import { getDatamodel } from "@/lib/pothos-prisma-types";
import type { Context } from "@/context";

import { DateTimeResolver } from "graphql-scalars";
import {
  getUserWithPermissions,
  type UserWithPermissions,
} from "@/auth/permissions";
import { GraphQLError } from "graphql";
import {
  hasAllPermissions,
  hasAnyRole,
  hasPermission,
  hasRole,
} from "@/auth/utils";

export interface PothosTypes {
  AuthScopes: {
    unauthenticated: boolean; // Everyone (even logged out)
    authenticated: boolean; // Must be logged in
    hasRole: string;
    hasAnyRole: string[];
    hasPermission: string;
    hasPermissions: string[];
    canReadMessage: string;
    canDeleteMessage: string;
    canEditUser: string;
    isMessageParticipant: string;
  };
  AuthContexts: {
    authenticated: Context & UserWithPermissions;
  };
  Context: Context;
  PrismaTypes: PrismaTypes;
  Scalars: {
    DateTime: {
      Input: Date;
      Output: Date;
    };
  };
}

function findError(failure: AuthFailure): Error | null {
  // Check if this failure has an error attached
  if ("error" in failure && failure.error) {
    return failure.error;
  }

  // Recursively check nested failures ($any, $all)
  if (
    failure.kind === AuthScopeFailureType.AnyAuthScopes ||
    failure.kind === AuthScopeFailureType.AllAuthScopes
  ) {
    for (const child of failure.failures) {
      const error = findError(child);
      if (error) return error;
    }
  }

  return null;
}

/*
 * For building helpers (e.g. input fields, args)
 * */
export type TypesWithDefaults =
  PothosSchemaTypes.ExtendDefaultTypes<PothosTypes>;

/**
 * Schema Builder Configuration
 *
 * This file ONLY configures the builder - it does NOT define any schema types.
 * All type definitions should be in src/schema/ files.
 */
const builder = new SchemaBuilder<PothosTypes>({
  plugins: [RelayPlugin, ScopeAuthPlugin, PrismaPlugin, MocksPlugin],
  scopeAuth: {
    // necessary for the any/all scopes which could potentially throw errors,
    // and we need to catch them in the unauthorizedError
    treatErrorsAsUnauthorized: true,
    unauthorizedError: (_parent, _context, _info, result) => {
      const originalError = findError(result.failure);

      if (originalError) {
        console.error(`Auth scope error: ${originalError}`);

        if (process.env.NODE_ENV === "production") {
          return new GraphQLError(
            `Authorization failed: ${originalError.message}`,
            {
              extensions: {
                code: "UNAUTHORIZED",
                originalError: originalError.message,
              },
            }
          );
        }
      }

      // In production, generic error
      return new GraphQLError("Not authorized");
    },
    authScopes: async (context) => {
      const currentUser = await getUserWithPermissions(context);

      return {
        unauthenticated: true, // basically a constant, right?
        authenticated: !!currentUser,

        hasRole: (roleName) => {
          if (!currentUser) return false;
          return hasRole(currentUser, roleName);
        },

        hasAnyRole: (roleNames) => {
          if (!currentUser) return false;
          return hasAnyRole(currentUser, ...roleNames);
        },

        hasPermission: (permissionName) => {
          if (!currentUser) return false;
          return hasPermission(currentUser, permissionName);
        },

        hasPermissions: (permissionNames) => {
          if (!currentUser) return false;
          return hasAllPermissions(currentUser, ...permissionNames);
        },

        canReadMessage: async (messageId) => {
          if (!currentUser) return false;

          // Check if has global permission
          if (hasPermission(currentUser, "message:read:any")) {
            return true;
          }

          // Otherwise, check if user is sender or receiver
          const message = await prisma.message.findUnique({
            where: { id: messageId },
            select: { senderId: true, receiverId: true },
          });

          return (
            message?.senderId === currentUser.id ||
            message?.receiverId === currentUser.id
          );
        },

        canDeleteMessage: async (messageId) => {
          if (!currentUser) return false;

          // Admins can delete any message
          if (hasPermission(currentUser, "message:delete:any")) {
            return true;
          }

          // Users can only delete their own messages
          if (hasPermission(currentUser, "message:delete:own")) {
            const message = await prisma.message.findUnique({
              where: { id: messageId },
              select: { senderId: true },
            });
            return message?.senderId === currentUser.id;
          }

          return false;
        },

        canEditUser: (userId) => {
          if (!currentUser) return false;

          // Admins can edit any user
          if (hasPermission(currentUser, "user:edit:any")) {
            return true;
          }

          // Users can edit themselves
          if (hasPermission(currentUser, "user:edit:own")) {
            return userId === currentUser.id;
          }

          return false;
        },

        isMessageParticipant: async (messageId) => {
          if (!currentUser) return false;

          const message = await prisma.message.findUnique({
            where: {
              id: messageId,
            },
            select: {
              senderId: true,
              receiverId: true,
            },
          });

          return (
            message?.senderId === currentUser.id ||
            message?.receiverId === currentUser.id
          );
        },
      };
    },
  },
  prisma: {
    client: prisma,
    dmmf: getDatamodel(),
    // warn when not using a query parameter correctly
    onUnusedQuery: process.env.NODE_ENV === "production" ? null : "warn",
  },
});

builder.addScalarType("DateTime", DateTimeResolver);

builder.queryType({});
builder.mutationType({});
// builder.subscriptionType({});

export { builder };
