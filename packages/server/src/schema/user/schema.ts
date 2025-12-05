import { builder } from "@/builder";
import { prisma } from "@/db";

export const UserNode = builder.prismaNode("User", {
  id: { field: "id" },
  fields: (t) => ({
    email: t.exposeString("email", { nullable: false }),
    username: t.exposeString("username"),
    createdAt: t.expose("createdAt", { type: "DateTime" }),

    displayName: t.string({
      resolve: (user) => user.username || user.email.split("@")[0],
    }),
  }),
});

builder.queryFields((t) => ({
  users: t.prismaField({
    type: ["User"],
    resolve: (query, _root) => {
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
