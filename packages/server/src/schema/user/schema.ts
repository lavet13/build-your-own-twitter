import { builder } from "@/builder";
import { prisma } from "@/db";
import { queryFromInfo } from "@pothos/plugin-prisma";

export const FollowNode = builder.prismaNode("Follow", {
  id: { field: "followingId_followedById" },

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
      resolve: async (follow) => {
        const reverseFollow = await prisma.follow.findUnique({
          where: {
            followingId_followedById: {
              followingId: follow.followedById,
              followedById: follow.followingId,
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

        console.log(query);
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
      resolve: async (parent, args) => {
        const follow = await prisma.follow.findUnique({
          select: {
            followingId: true,
            followedById: true,
          },
          where: {
            followingId_followedById: {
              followingId: parent.id, // This user following
              followedById: args.userId, // The other user
            },
          },
        });

        return !!follow;
      },
    }),

    // Check if another user follows this user
    isFollowed: t.boolean({
      args: { userId: t.arg.id({ required: true }) },
      resolve: async (parent, args) => {
        const follow = await prisma.follow.findUnique({
          select: {
            followingId: true,
            followedById: true,
          },
          where: {
            followingId_followedById: {
              followingId: args.userId,
              followedById: parent.id,
            },
          },
        });

        return !!follow;
      },
    }),

    followerCount: t.relationCount("followedBy", {
      description: "Total number of followers",
    }),

    followingCount: t.relationCount("following", {
      description: "Total number of users being followed",
    }),

    receivedMessages: t.relation("receivedMessages", {
      query: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    }),
  }),
});

builder.prismaObjectFields(UserNode, (t) => ({
  followers: t.field({
    type: [UserNode],
    resolve: async (parent, _args, context, info) => {
      const userQuery = queryFromInfo({
        context,
        info,
      });

      const follows = await prisma.follow.findMany({
        where: { followedById: parent.id },
        select: { following: userQuery },
      });

      return follows.map((f) => f.following);
    },
    description: "Users who follow this user",
  }),

  following: t.field({
    type: [UserNode],
    resolve: async (parent, _args, context, info) => {
      const userQuery = queryFromInfo({
        context,
        info,
      });

      const follows = await prisma.follow.findMany({
        where: { followingId: parent.id },
        include: { followedBy: userQuery },
      });

      return follows.map((f) => f.followedBy);
    },
    description: "Users this user follows",
  }),

  mutualFollowers: t.field({
    type: [UserNode],
    resolve: async (parent, _args, context, info) => {
      // Step 1: Find all users THIS user follows
      const following = await prisma.follow.findMany({
        where: { followingId: parent.id },
        select: { followedById: true },
      });

      const followingIds = following.map((f) => f.followedById);

      const userQuery = queryFromInfo({
        context,
        info,
      });

      // Step 2: Find which of those ALSO follow this user back
      const mutuals = await prisma.user.findMany({
        ...userQuery,
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
      console.log({
        query,
        include: query.include,
      });
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

      const existingFollow = await prisma.follow.findUnique({
        ...followQuery,
        where: {
          followingId_followedById: {
            followingId: args.currentUserId,
            followedById: args.userIdToFollow,
          },
        },
      });

      if (existingFollow) {
        return {
          success: false,
          message: "You are already following the user",
        };
      }

      const follow = await prisma.follow.create({
        ...followQuery,
        data: {
          followingId: args.currentUserId,
          followedById: args.userIdToFollow,
        },
      });

      return { success: true, follow, message: "Successfully followed user" };
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
    resolve: async (_root, args, context, info) => {
      if (args.userIdToUnfollow === args.currentUserId) {
        return { success: false, message: "You cannot unfollow yourself!" };
      }

      const followQuery = queryFromInfo({
        context,
        info,
        path: ["follow"],
      });

      const existingFollow = await prisma.follow.findUnique({
        ...followQuery,
        where: {
          followingId_followedById: {
            followingId: args.currentUserId,
            followedById: args.userIdToUnfollow,
          },
        },
      });

      if (!existingFollow) {
        return {
          success: false,
          message: "You are not following this user",
        };
      }

      await prisma.follow.delete({
        where: {
          followingId_followedById: {
            followingId: args.currentUserId,
            followedById: args.userIdToUnfollow,
          },
        },
      });

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
      const existingUser = await prisma.user.findUnique({
        select: { id: true },
        where: { email: args.email },
      });

      if (existingUser) {
        return {
          success: false,
          message: "Пользователь с таким E-mail существует",
        };
      }

      const optimizedQuery = queryFromInfo({
        context,
        info,
        // Tell it where to find the User selections in the query
        path: ["user"], // Matches the field name in CreateUserResult
      });

      console.log("OptimizedQuery:", optimizedQuery);

      const user = await prisma.user.create({
        ...optimizedQuery,
        data: {
          email: args.email,
          username: args.username,
          displayName: args.displayName,
        },
      });
      console.log("user:", user);

      return { success: true, message: "User created successfully", user };
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
      const [sender, receiver] = await Promise.all([
        prisma.user.findUnique({
          where: { id: args.senderId },
          select: { id: true },
        }),
        prisma.user.findUnique({
          where: { id: args.receiverId },
          select: { id: true },
        }),
      ]);

      if (!sender || !receiver) {
        return { error: "Sender or receiver not found", success: false };
      }

      const optimizedQuery = queryFromInfo({
        context,
        info,
        path: ["message"],
      });

      console.log("OptimizedQuery:", optimizedQuery);

      const message = await prisma.message.create({
        ...optimizedQuery,
        data: {
          content: args.content,
          senderId: args.senderId,
          receiverId: args.receiverId,
          replyToId: args.replyToId,
        },
      });
      console.log("message:", message);

      return { message, success: true };
    },
  })
);
