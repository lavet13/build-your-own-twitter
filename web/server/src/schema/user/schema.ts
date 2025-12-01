import { builder } from "@/builder";

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

interface IUserAuthor {
  id: string;
  username: string;
  posts?: IPost[];
}

const UserAuthorRef = builder.objectRef<IUserAuthor>("UserAuthor");

UserAuthorRef.implement({
  fields: (t) => ({
    id: t.exposeID("id"),
    username: t.exposeString("username"),
    posts: t.field({
      type: [PostRef],
      resolve: (user) => user.posts,
    }),
  }),
});

interface IPost {
  id: string;
  title: string;
  content: string;
  author?: IUserAuthor;
}

const PostRef = builder.objectRef<IPost>("Post");

PostRef.implement({
  fields: (t) => ({
    id: t.exposeID("id"),
    title: t.exposeString("title"),
    content: t.exposeString("content"),
    author: t.field({
      type: UserAuthorRef,
      resolve: (post) => post.author,
    }),
  }),
});

builder.queryFields((t) => ({
  user: t.field({
    type: UserAuthorRef,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: (_root, _args, _ctx) => {
      throw new Error("Real Prisma resolver not implemented yet");

      // Later, this would be:
      // return await ctx.prisma.user.findUnique({
      //   where: { id: args.id },
      //   include: { posts: true },
      // });
    },
  }),

  users: t.field({
    type: [UserAuthorRef],
    resolve: (_root, _args, _ctx) => {
      throw new Error("Real Prisma resolver not implemented yet");

      // Later:
      // return await ctx.prisma.user.findMany({
      //   include: { posts: true },
      // });
    },
  }),

  post: t.field({
    type: PostRef,
    nullable: true,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_root, _args, _ctx) => {
      throw new Error("Real Prisma resolver not implemented yet");

      // Later:
      // return await ctx.prisma.post.findUnique({
      //   where: { id: args.id },
      //   include: { author: true },
      // });
    },
  }),

  posts: t.field({
    type: [PostRef],
    resolve: (_root, _args, _ctx) => {
      throw new Error("Real Prisma resolver not implemented yet");
      // Later:
      // return await ctx.prisma.post.findMany({
      //   include: { author: true },
      // });
    },
  }),
}));

export { UserAuthorRef, PostRef };
export type { IPost, IUserAuthor };
