import { builder } from "@/builder";
import { prisma } from "@/db";

export const MessageNode = builder.prismaNode("Message", {
  id: { field: "id" },
  fields: (t) => ({
    content: t.exposeString("content"),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    isRead: t.exposeBoolean("isRead"),
    readAt: t.expose("readAt", { type: "DateTime", nullable: true }),

    sender: t.relation("sender"),
    receiver: t.relation("receiver"),
  }),
});

export const UserNode = builder.prismaNode("User", {
  id: { field: "id" },
  fields: (t) => ({
    email: t.exposeString("email", { nullable: false }),
    username: t.exposeString("username"),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
    displayName: t.exposeString("displayName", { nullable: true }),

    name: t.string({
      resolve: (user) =>
        user.displayName || user.username || user.email.split("@")[0],
    }),

    sentMessages: t.relation("sentMessages", {
      args: {
        limit: t.arg.int({ defaultValue: 20 }),
        unreadOnly: t.arg.boolean(),
      },

      query: (args) => {
        console.log({ args });
        return {
          where: args.unreadOnly ? { isRead: false } : undefined,
          take: args.limit ?? undefined,
          orderBy: { createdAt: "desc" },
        };
      },
    }),

    receivedMessages: t.relation("receivedMessages", {
      query: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    }),
  }),
});

builder.queryFields((t) => ({
  users: t.prismaField({
    type: ["User"],
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
    type: "User",
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
}));
