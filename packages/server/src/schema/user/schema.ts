import { builder } from "@/builder";
import { prisma } from "@/db";
import { Prisma } from "@/lib/prisma/client";
import { prismaConnectionHelpers, queryFromInfo } from "@pothos/plugin-prisma";

export const FollowNode = builder.prismaNode("Follow", {
  id: { field: "followingId_followedById" },

  select: {
    followingId: true,
    followedById: true,
  },

  fields: (t) => ({
    createdAt: t.expose("createdAt", { type: "DateTime" }),

    followingId: t.exposeID("followingId", {
      description: "ID of the user who is following",
    }),
    followedById: t.exposeID("followedById", {
      description: "ID of the user being followed",
    }),

    following: t.relation("following", {
      description: "The user who is following",
    }),

    followedBy: t.relation("followedBy", {
      description: "The user being followed",
    }),

    followingDuration: t.string({
      select: {
        createdAt: true,
      },
      resolve: (follow) => {
        const now = new Date();
        const created = follow.createdAt;
        const days = Math.floor(
          (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (days === 0) return "Today";
        if (days === 1) return "1 day";
        if (days < 7) return `${days} days`;
        if (days < 30) return `${Math.floor(days / 7)} weeks`;
        if (days < 365) return `${Math.floor(days / 30)} months`;

        return `${Math.floor(days / 365)} years`;
      },
    }),

    isMutual: t.boolean({
      resolve: async (parent) => {
        const reverseFollow = await prisma.follow.findUnique({
          where: {
            followingId_followedById: {
              followingId: parent.followedById,
              followedById: parent.followingId,
            },
          },
        });

        return !!reverseFollow;
      },
    }),
  }),
});

export const MessageNode = builder.prismaNode("Message", {
  id: { field: "id" },

  select: {
    id: true,
  },

  fields: (t) => ({
    content: t.exposeString("content"),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    isRead: t.exposeBoolean("isRead"),
    readAt: t.expose("readAt", { type: "DateTime" }),

    sender: t.relation("sender", { nullable: false }),
    receiver: t.relation("receiver", { nullable: false }),

    recentReply: t.string({
      nullable: true,
      args: {
        after: t.arg({ type: "DateTime", required: true }),
      },
      select: (args) => ({
        replies: {
          take: 1,
          where: {
            createdAt: { gt: args.after },
          },
          orderBy: { createdAt: "desc" },
          select: {
            content: true,
          },
        },
      }),
      resolve: (message) => {
        return message.replies[0]?.content;
      },
    }),

    senderInfo: t.string({
      args: {
        includeEmail: t.arg.boolean({ defaultValue: false }),
      },
      select: (args) => ({
        sender: {
          select: {
            username: true,
            displayName: true,
            ...(args.includeEmail && { email: true }), // conditionally select the field
          },
        },
      }),
      resolve: (message) => {
        const sender = message.sender;

        let info = sender.displayName || sender.username || "Unknown";

        if ("email" in sender && sender.email) {
          info += `(${sender.email})`;
        }

        return info;
      },
    }),

    senderDisplayName: t.string({
      select: {
        sender: {
          select: {
            displayName: true,
            username: true,
            email: true,
          },
        },
      },
      resolve: (message) =>
        message.sender.displayName ||
        message.sender.username ||
        message.sender.email.split("@")[0],
    }),

    replies: t.relation("replies"),
    replyTo: t.relation("replyTo"),
  }),
});

export const ProfileNode = builder.prismaNode("Profile", {
  id: { field: "id" },

  select: {
    id: true,
  },

  fields: (t) => ({
    avatar: t.exposeString("avatar"),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    updatedAt: t.expose("updatedAt", { type: "DateTime" }),
  }),
});

export const UserNode = builder.prismaNode("User", {
  id: { field: "id" },

  select: {
    id: true,
  },

  fields: (t) => ({
    email: t.exposeString("email", { nullable: false }),
    username: t.exposeString("username"),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    displayName: t.exposeString("displayName"),
    profile: t.relation("profile"),

    unreadCount: t.int({
      select: {
        receivedMessages: {
          where: { isRead: true },
          select: { id: true },
        },
      },
      resolve: (user) => user.receivedMessages.length,
    }),

    lastMessagePreview: t.string({
      nullable: true,
      select: {
        sentMessages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            content: true,
          },
        },
      },
      resolve: (user) => {
        const lastMessage = user.sentMessages[0];
        if (!lastMessage) return null;

        return lastMessage.content.length > 50
          ? lastMessage.content.slice(0, 50) + "..."
          : lastMessage.content;
      },
    }),

    avatarUrl: t.string({
      nullable: true,
      select: {
        profile: {
          select: {
            avatar: true,
          },
        },
      },
      resolve: (user) => user.profile?.avatar,
    }),

    name: t.string({
      select: {
        displayName: true,
        username: true,
        email: true,
      },
      resolve: (user) =>
        user.displayName || user.username || user.email.split("@")[0],
    }),

    hasAvatar: t.boolean({
      select: {
        profile: {
          select: {
            avatar: true,
          },
        },
      },
      resolve: (user) => !!user.profile?.avatar,
    }),

    // messagesConnection: t.relatedConnection("sentMessages", {
    //   cursor: "id",
    //   totalCount: true,
    //
    //   defaultSize: 20,
    //   maxSize: 100,
    // }),

    advancedMessagesConnection: t.relatedConnection("sentMessages", {
      cursor: "id",
      totalCount: true,

      args: {
        unreadOnly: t.arg.boolean({ defaultValue: false }),
        hasReplies: t.arg.boolean(),
        oldestFirst: t.arg.boolean({ defaultValue: false }),
        search: t.arg.string(),
      },

      query: (args) => {
        const where: Prisma.MessageWhereInput = {};

        if (args.unreadOnly) {
          where.isRead = false;
        }

        if (args.hasReplies !== undefined) {
          where.replies = args.hasReplies ? { some: {} } : { none: {} };
        }

        if (args.search) {
          where.content = {
            contains: args.search,
            mode: "insensitive",
          };
        }

        return {
          where: Object.keys(where).length > 0 ? where : undefined,
          orderBy: {
            createdAt: args.oldestFirst ? "asc" : "desc",
          },
        };
      },
    }),

    receivedMessagesConnection: t.relatedConnection("receivedMessages", {
      cursor: "id",

      totalCount: true,

      args: {
        unreadOnly: t.arg.boolean({ defaultValue: false }),
      },

      query: (args) => {
        const where: Prisma.MessageWhereInput = {};

        if (args.unreadOnly) {
          where.isRead = false;
        }

        return {
          where: Object.keys(where).length > 0 ? where : undefined,
          orderBy: { createdAt: "desc" },
        };
      },
    }),

    sentMessages: t.relation("sentMessages"),
    recentMessages: t.relation("sentMessages", {
      query: {
        orderBy: { createdAt: "desc" },
        take: 5,
        where: {
          createdAt: { gt: new Date(Date.now() - 24 * 60 * 60_000) },
        },
      },
    }),

    advancedMessages: t.relation("sentMessages", {
      args: {
        after: t.arg({ type: "DateTime" }),
        before: t.arg({ type: "DateTime" }),

        read: t.arg.boolean(),
        hasReplies: t.arg.boolean(),

        sortBy: t.arg.string({ defaultValue: "createdAt" }),
        sortOrder: t.arg.string({ defaultValue: "desc" }),

        skip: t.arg.int({ defaultValue: 0 }),
        take: t.arg.int({ defaultValue: 20 }),
      },

      query: (args) => {
        const query: Record<string, any> = {
          orderBy: {},
          skip: args.skip,
          take: args.take,
          where: {},
        };

        // ── Sorting ──────────────────────────────────────
        if (args.sortBy && args.sortOrder) {
          query.orderBy[args.sortBy] = args.sortOrder;
        }

        // ── Date range ───────────────────────────────────
        if (args.after || args.before) {
          query.where.createdAt = {};

          if (args.after) {
            query.where.createdAt.gte = args.after;
          }

          if (args.before) {
            query.where.createdAt.lte = args.before;
          }
        }

        // ── Read status ──────────────────────────────────
        if (args.read !== undefined) {
          query.where.isRead = args.read;
        }

        // ── Has replies ──────────────────────────────────
        if (args.hasReplies !== undefined) {
          if (args.hasReplies) {
            query.where.replies = {
              some: {}, // Has at least one reply
            };
          } else {
            query.where.replies = {
              none: {}, // Has no replies
            };
          }
        }

        return query;
      },
    }),

    totalMessageCount: t.relationCount("sentMessages"),

    unreadMessageCount: t.relationCount("sentMessages", {
      where: {
        isRead: false,
      },
    }),

    todayMessageCount: t.relationCount("sentMessages", {
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),

    repliedMessageCount: t.relationCount("sentMessages", {
      where: {
        replies: {
          some: {}, // Has at least one reply
        },
      },
    }),

    messages: t.relation("sentMessages", {
      args: {
        limit: t.arg.int({ defaultValue: 10 }),
        oldestFirst: t.arg.boolean({ defaultValue: false }),
        unreadOnly: t.arg.boolean({ defaultValue: false }),
        search: t.arg.string(),
      },

      query: (args) => {
        return {
          orderBy: { createdAt: args.oldestFirst ? "asc" : "desc" },

          take: args.limit ?? undefined,

          where: {
            ...(args.unreadOnly && { isRead: false }),

            ...(args.search && {
              content: { contains: args.search, mode: "insensitive" },
            }),
          },
        };
      },
    }),

    // Check if this user follows another user
    isFollowing: t.boolean({
      args: { userId: t.arg.id({ required: true }) },
      select: (args) => ({
        following: {
          select: {
            followingId: true,
            followedById: true,
          },
          // Filter to only the user we're checking
          where: { followedById: args.userId },
          take: 1, // We only need to know if at least one exists
        },
      }),
      resolve: async (parent) => {
        return parent.following.length > 0;
      },
    }),

    // Check if another user follows this user
    isFollowed: t.boolean({
      args: { userId: t.arg.id({ required: true }) },
      select: (args) => ({
        followedBy: {
          select: {
            followingId: true,
            followedById: true,
          },
          where: { followingId: args.userId },
          take: 1,
        },
      }),
      resolve: async (parent) => {
        return parent.followedBy.length > 0;
      },
    }),

    followerCount: t.relationCount("followedBy", {
      description: "Total number of followers",
    }),

    followingCount: t.relationCount("following", {
      description: "Total number of users being followed",
    }),

    followingTest: t.relation("following"),

    receivedMessages: t.relation("receivedMessages", {
      query: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    }),
  }),
});

const messagesConnectionHelpers = prismaConnectionHelpers(builder, "Message", {
  cursor: "id",

  args: (t) => ({
    unreadOnly: t.boolean({ defaultValue: false }),
    search: t.string(),
  }),

  select: () => ({
    id: true,
    content: true,
    isRead: true,
  }),

  query: (args) => ({
    where: {
      ...(args.unreadOnly && { isRead: true }),
      ...(args.search && {
        content: {
          contains: args.search,
          mode: "insensitive" as const,
        },
      }),
    },
    orderBy: { createdAt: "desc" as const },
  }),
});

const followersConnectionHelpers = prismaConnectionHelpers(builder, "Follow", {
  cursor: "followingId_followedById",

  select(nodeSelection) {
    return {
      // Select the User node (the follower)
      followedBy: nodeSelection({}),

      followedById: true,
      followingId: true,
      createdAt: true,
    };
  },
  resolveNode: (follow) => follow.followedBy,
});

const followingConnectionHelpers = prismaConnectionHelpers(builder, "Follow", {
  cursor: "followingId_followedById",

  select(nodeSelection) {
    return {
      // Select the User node (who is being followed)
      following: nodeSelection(),
      followedById: true,
      followingId: true,
      createdAt: true,
    };
  },

  resolveNode: (follow) => follow.following,
});

const MessageEdge = builder.edgeObject({
  type: MessageNode,
  name: "MessageEdgeNew",

  fields: (t) => ({
    hasReplies: t.boolean({
      description: "Whether any message in this connection has replies",
      resolve: async (edge) => {
        const withReplies = await prisma.message.findFirst({
          where: {
            id: edge.node.id,
            replies: { some: {} },
          },
        });

        return !!withReplies;
      },
    }),
  }),
});

const MessageConnection = builder.connectionObject({
  type: MessageNode,
  name: "MessageConnection",

  fields: (t) => ({
    totalCount: t.int({
      description: "Total number of messages",
      resolve: (connection) => {
        const { totalCount } = connection as {
          totalCount?: number | (() => number | Promise<number>);
        };

        return typeof totalCount === "function" ? totalCount() : totalCount;
      },
    }),

    unreadCount: t.int({
      resolve: (connection) => {
        // Cast to the resolved type
        type ResolvedConnection = {
          edges: Array<{
            cursor: string;
            node: typeof MessageNode.$inferType;
          }>;
        };
        const conn = connection as unknown as ResolvedConnection;

        const unread = conn.edges.filter((edge) => !edge.node.isRead).length;

        return unread;
      },
    }),

    hasReplies: t.boolean({
      description: "Whether any message in this connection has replies",
      resolve: async (connection) => {
        type ResolvedConnection = {
          edges: Array<{
            cursor: string;
            node: typeof MessageNode.$inferType;
          }>;
        };
        const conn = connection as unknown as ResolvedConnection;

        const messageIds = conn.edges!.map((e) => e.node.id);

        const withReplies = await prisma.message.findFirst({
          where: {
            id: { in: messageIds },
            replies: { some: {} },
          },
        });

        return !!withReplies;
      },
    }),

    latestMessageData: t.field({
      type: "DateTime",
      nullable: true,
      resolve: (connection) => {
        type ResolvedConnection = {
          edges: Array<{
            cursor: string;
            node: typeof MessageNode.$inferType;
          }>;
        };
        const conn = connection as unknown as ResolvedConnection;

        if (conn.edges.length === 0) return null;

        const latest = conn.edges[0]?.node.createdAt;
        return latest;
      },
    }),
  }),
}, MessageEdge);

builder.prismaObjectFields(MessageNode, (t) => ({
  repliesConnectionSimple: t.relatedConnection("replies", {
    cursor: "id",

    args: {
      oldestFirst: t.arg.boolean({ defaultValue: true }),
    },

    query: (args) => ({
      orderBy: {
        createdAt: args.oldestFirst ? "asc" : "desc",
      },
    }),
  }),
}));

builder.prismaObjectFields(UserNode, (t) => ({
  sentMessagesConnection: t.relatedConnection(
    "sentMessages",
    {
      cursor: "id",
      totalCount: true,

      args: {
        unreadOnly: t.arg.boolean({ defaultValue: false }),
        search: t.arg.string(),
      },

      query: (args) => ({
        where: {
          ...(args.unreadOnly && { isRead: false }),
          ...(args.search && {
            content: {
              contains: args.search,
              mode: "insensitive" as const,
            },
          }),
        },
        orderBy: { createdAt: "desc" },
      }),
    },
    MessageConnection,
    MessageEdge
  ),

  receivedMessageConnection: t.relatedConnection(
    "receivedMessages",
    {
      cursor: "id",
      totalCount: true,

      args: {
        unreadOnly: t.arg.boolean({ defaultValue: false }),
      },

      query: (args) => ({
        where: {
          ...(args.unreadOnly && { isRead: false }),
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    },
    MessageConnection
  ),

  messagesConnection: t.connection(
    {
      type: MessageNode,

      args: messagesConnectionHelpers.getArgs(),

      select(args, ctx, nestedSelection) {
        return {
          sentMessages: messagesConnectionHelpers.getQuery(
            args,
            ctx,
            nestedSelection
          ),
        };
      },

      resolve: (user, args, ctx) => {
        const connection = messagesConnectionHelpers.resolve(
          user.sentMessages,
          args,
          ctx
        );
        console.log({ connection });
        return { ...connection };
      },
    },
    MessageConnection,
    MessageEdge
  ),

  // messagesConnection: t.relatedConnection("sentMessages", {
  //   cursor: "id",
  //   totalCount: true,
  //
  //   args: {
  //     unreadOnly: t.arg.boolean({ defaultValue: false }),
  //   },
  // }),

  followersConnection: t.connection(
    {
      type: UserNode,
      select: (args, ctx, nestedSelection) => {
        return {
          following: followersConnectionHelpers.getQuery(
            args,
            ctx,
            nestedSelection
          ),
        };
      },
      resolve: (user, args, ctx) => {
        console.log(user.following);
        return followersConnectionHelpers.resolve(user.following, args, ctx);
      },
    },
    {},
    {
      fields: (edge) => ({
        isMutual: edge.field({
          type: "Boolean",
          resolve: async (follow) => {
            const reverseFollow = await prisma.follow.findUnique({
              where: {
                followingId_followedById: {
                  followingId: follow.followedById,
                  followedById: follow.followingId,
                },
              },
              select: {
                followingId: true,
                followedById: true,
              },
            });

            return !!reverseFollow;
          },
        }),

        followSince: edge.field({
          type: "DateTime",
          resolve: async (follow) => {
            return follow.createdAt;
          },
        }),
      }),
    }
  ),

  // filteredFollowersConnection: t.connection({
  //   type: UserNode,
  //
  //   args: {
  //     sortRecent: t.arg.boolean(),
  //   },
  //
  //   select: (args, ctx, nestedSelection) => {
  //     return {
  //       followedBy: {
  //         ...followersConnectionHelpers.getQuery(args, ctx, nestedSelection),
  //         orderBy: args.sortRecent
  //           ? { createdAt: "desc" }
  //           : { createdAt: "asc" },
  //       },
  //     };
  //   },
  //   resolve: (user, args, ctx) => {
  //     console.log({ userFollowedBy: user.followedBy });
  //     return followersConnectionHelpers.resolve(user.followedBy, args, ctx);
  //   },
  // }),

  followingConnection: t.connection(
    {
      type: UserNode,

      args: {
        sortByRecent: t.arg.boolean({ defaultValue: true }),
        verified: t.arg.boolean(),
      },

      select: (args, ctx, nestedSelection) => {
        return {
          followedBy: {
            ...followingConnectionHelpers.getQuery(args, ctx, nestedSelection),

            orderBy: { createdAt: args.sortByRecent ? "desc" : "asc" },

            where:
              args.verified !== undefined
                ? {
                    following: {
                      username: { not: null },
                    },
                  }
                : undefined,
          },
        };
      },

      resolve: (user, args, ctx) => {
        return followingConnectionHelpers.resolve(user.followedBy, args, ctx);
      },
    },
    {},
    {
      fields: (edge) => ({
        followedSince: edge.field({
          type: "DateTime",
          resolve: (follow) => follow.createdAt,
        }),
      }),
    }
  ),

  // followers: t.prismaField({
  //   type: [UserNode],
  //   resolve: async (query, parent) => {
  //     console.log({ query });
  //     const follows = await prisma.follow.findMany({
  //       where: {
  //         followedById: parent.id,
  //       },
  //       select: {
  //         following: query,
  //       },
  //     });
  //
  //     return follows.map((f) => f.following);
  //   },
  // }),

  followers: t.field({
    type: [UserNode],
    select: (_args, _ctx, nestedSelection) => {
      return {
        followedBy: {
          select: {
            following: nestedSelection({}),
          },
        },
      };
    },
    resolve: async (parent) => {
      return parent.followedBy.map((f) => f.following);
    },
    description: "Users who follow this user",
  }),

  // following: t.field({
  //   type: [UserNode],
  //   description: "Users this user follows",
  //   select: (_args, _ctx, nestedSelection) => ({
  //     following: {
  //       select: {
  //         followedBy: nestedSelection({}),
  //       },
  //     },
  //   }),
  //   resolve: (parent) => parent.following.map((f) => f.followedBy),
  // }),

  following: t.prismaField({
    type: [UserNode],
    description: "Users this user follows",
    resolve: async (query, parent) => {
      const follows = await prisma.follow.findMany({
        where: { followingId: parent.id },
        select: {
          followedBy: query,
        },
      });
      return follows.map((f) => f.followedBy);
    },
  }),

  mutualFollowers: t.prismaField({
    type: [UserNode],
    select: {
      following: {
        select: {
          followedById: true,
        },
      },
    },
    resolve: async (query, parent, _args) => {
      // Step 1: Find all users THIS user follows
      const followingIds = parent.following.map((f) => f.followedById);

      // Step 2: Find which of those ALSO follow this user back
      const mutuals = await prisma.user.findMany({
        ...query,
        where: {
          id: { in: followingIds },
          followedBy: {
            some: {
              followingId: parent.id,
            },
          },
        },
      });

      return mutuals;
    },
  }),
}));

builder.queryFields((t) => ({
  messages: t.prismaField({
    type: [MessageNode],
    resolve: (query, _root) => {
      return prisma.message.findMany({
        ...query,
      });
    },
  }),
  users: t.prismaField({
    type: [UserNode],
    resolve: (query, _root) => {
      return prisma.user.findMany({
        ...query,
        orderBy: { createdAt: "desc" },
      });
    },
  }),

  user: t.prismaField({
    type: UserNode,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: (query, _root, args) => {
      return prisma.user.findUniqueOrThrow({
        ...query,
        where: {
          id: args.id,
        },
      });
    },
  }),

  message: t.prismaField({
    type: MessageNode,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: (query, _root, args) => {
      return prisma.message.findUniqueOrThrow({
        ...query,
        where: {
          id: args.id,
        },
      });
    },
  }),
}));

export const FollowResult = builder.objectRef<{
  success: boolean;
  message?: string;
  follow?: typeof FollowNode.$inferType;
}>("FollowResult");

FollowResult.implement({
  fields: (t) => ({
    success: t.exposeBoolean("success"),
    message: t.exposeString("message", { nullable: true }),
    follow: t.expose("follow", { type: FollowNode, nullable: true }),
  }),
});

builder.mutationField("followUser", (t) =>
  t.field({
    type: FollowResult,
    args: {
      userIdToFollow: t.arg.id({
        required: true,
        description: "User to follow",
      }),
      currentUserId: t.arg.id({ required: true, description: "Current User" }),
    },
    resolve: async (_root, args, context, info) => {
      if (args.userIdToFollow === args.currentUserId) {
        return { success: false, message: "You cannot follow yourself!" };
      }

      const followQuery = queryFromInfo({
        context,
        info,
        path: ["follow"],
      });

      try {
        const follow = await prisma.follow.create({
          ...followQuery,
          data: {
            followingId: args.currentUserId,
            followedById: args.userIdToFollow,
          },
        });

        return { success: true, follow, message: "Successfully followed user" };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          // P2002: Unique constraint violation (already following)
          if (error.code === "P2002") {
            return {
              success: false,
              message: "You are already following this user",
            };
          }
          // P2003: Foreign key constraint (user doesn't exist)
          if (error.code === "P2003") {
            return { success: false, message: "User not found" };
          }
        }
        throw error;
      }
    },
  })
);

builder.mutationField("unfollowUser", (t) =>
  t.field({
    type: FollowResult,
    args: {
      userIdToUnfollow: t.arg.id({
        required: true,
        description: "User to follow",
      }),
      currentUserId: t.arg.id({ required: true, description: "Current User" }),
    },
    resolve: async (_root, args) => {
      if (args.userIdToUnfollow === args.currentUserId) {
        return { success: false, message: "You cannot unfollow yourself!" };
      }

      try {
        await prisma.follow.delete({
          where: {
            followingId_followedById: {
              followingId: args.currentUserId,
              followedById: args.userIdToUnfollow,
            },
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          // P2025: Record not found (not following)
          if (error.code === "P2025") {
            return {
              success: false,
              message: "You are not following this user",
            };
          }
        }
        throw error;
      }

      return { success: true, message: "Successfully unfollowed user" };
    },
  })
);

export const CreateUserResult = builder.objectRef<{
  success: boolean;
  message?: string;
  user?: typeof UserNode.$inferType;
}>("CreateUserResult");

CreateUserResult.implement({
  fields: (t) => ({
    success: t.exposeBoolean("success"),
    message: t.exposeString("message", { nullable: true }),
    user: t.expose("user", { type: UserNode, nullable: true }),
  }),
});

builder.mutationField("createUser", (t) =>
  t.field({
    type: CreateUserResult,
    args: {
      email: t.arg.string({ required: true }),
      username: t.arg.string(),
      displayName: t.arg.string(),
    },

    resolve: async (_root, args, context, info) => {
      const optimizedQuery = queryFromInfo({
        context,
        info,
        // Tell it where to find the User selections in the query
        path: ["user"], // Matches the field name in CreateUserResult
      });

      try {
        const user = await prisma.user.create({
          ...optimizedQuery,
          data: {
            email: args.email,
            username: args.username,
            displayName: args.displayName,
          },
        });

        return { success: true, message: "User created successfully", user };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          // P2002: Unique constraint violation (email already exists)
          if (error.code === "P2002") {
            return {
              success: false,
              message: "A user with this email already exists.",
            };
          }
        }
        throw error;
      }
    },
  })
);

const SendMessageResult = builder.objectRef<{
  success: boolean;
  error?: string;
  message?: typeof MessageNode.$inferType;
}>("SendMessageResult");

SendMessageResult.implement({
  fields: (t) => ({
    success: t.exposeBoolean("success"),
    error: t.exposeString("error", { nullable: true }),
    message: t.expose("message", {
      type: MessageNode,
      nullable: true,
    }),
  }),
});

builder.mutationField("sendMessage", (t) =>
  t.field({
    type: SendMessageResult,
    args: {
      content: t.arg.string({ required: true }),
      receiverId: t.arg.id({ required: true }),
      senderId: t.arg.id({ required: true }),
      replyToId: t.arg.id(),
    },
    resolve: async (_root, args, context, info) => {
      const optimizedQuery = queryFromInfo({
        context,
        info,
        path: ["message"],
      });

      try {
        const message = await prisma.message.create({
          ...optimizedQuery,
          data: {
            content: args.content,
            senderId: args.senderId,
            receiverId: args.receiverId,
            replyToId: args.replyToId,
          },
        });

        return { message, success: true };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          // P2003: Foreign key constraint violation
          if (error.code === "P2003") {
            const field = error.meta?.field_name;

            if (field === "senderId" || field === "receiverId") {
              return {
                error: "Sender or receiver not found",
                success: false,
              };
            }

            if (field === "replyToId") {
              return {
                error: "Reply message not found",
                success: false,
              };
            }

            return {
              error: "Invalid reference",
              success: false,
            };
          }
        }
        throw error;
      }
    },
  })
);
