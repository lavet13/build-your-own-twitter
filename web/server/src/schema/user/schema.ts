import { builder } from "@/builder";
import { mockPosts, mockUsers } from "@/mocks/data";
import {
  decodeGlobalID,
  encodeGlobalID,
  resolveArrayConnection,
  resolveCursorConnection,
  resolveOffsetConnection,
  type ResolveCursorConnectionArgs,
} from "@pothos/plugin-relay";

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

function loadPostById(id: string) {
  return mockPosts.find((post) => post.id === id) ?? null;
}

function loadUserById(id: string) {
  return mockUsers.find((user) => user.id === id) ?? null;
}

interface IUserAuthor {
  id: string;
  username: string;
  posts?: IPost[];
}

const UserAuthorRef = builder.objectRef<IUserAuthor>("UserAuthor");

builder.node(UserAuthorRef, {
  id: { resolve: (user) => user.id },
  loadOne: (id) => {
    console.log("UserNode", id);
    return loadUserById(id);
  },
  fields: (t) => ({
    username: t.exposeString("username"),
    posts: t.expose("posts", { type: [PostRef] }),

    postsConnection: t.connection({
      type: PostRef,
      resolve: (user, args) => {
        const userPosts = user.posts ?? [];
        return resolveArrayConnection({ args }, userPosts);
      },
    }),
  }),
});

interface IPost {
  id: string;
  title: string;
  content: string;
  author?: IUserAuthor;
  createdAt: Date;
}

const PostRef = builder.objectRef<IPost>("Post");

builder.node(PostRef, {
  id: { resolve: (post) => post.id },
  loadOne: (id) => {
    console.log("PostNode", id);
    return loadPostById(id);
  },
  fields: (t) => ({
    title: t.exposeString("title"),
    content: t.exposeString("content"),
    author: t.expose("author", { type: UserAuthorRef }),
    createdAt: t.expose("createdAt", { type: "DateTime" }),
  }),
});

const PostsConnection = builder.connectionObject(
  {
    type: PostRef,
    name: "PostsConnection",
  },
  {
    name: "PostsEdge",
  }
);

builder.objectField(PostsConnection, "totalCount", (t) =>
  t.int({
    resolve: (connection) => {
      return (connection as any).totalCount || 0;
    },
  })
);

function parseCompositeCursor(cursor: string): { date: Date; id: string } {
  const SEPARATOR_SYMBOL = "|";
  const [dateStr, id] = cursor.split(SEPARATOR_SYMBOL);

  return {
    date: new Date(dateStr!),
    id: id!,
  };
}

builder.queryFields((t) => ({
  postsConnectionWithCount: t.field({
    type: PostsConnection,
    args: {
      ...t.arg.connectionArgs(),
    },
    resolve: async (_parent, args) => {
      const connection = resolveArrayConnection({ args }, mockPosts);

      return { ...connection, totalCount: mockPosts.length };
    },
  }),
  postsConnectionOffset: t.connection({
    type: PostRef,
    resolve: async (_parent, args) => {
      return resolveOffsetConnection({ args }, ({ limit, offset }) => {
        return mockPosts.slice(offset, offset + limit);
      });
    },
  }),
  postsConnection: t.connection({
    type: PostRef,
    resolve: async (_parent, args) => {
      console.log({ args });
      return resolveArrayConnection({ args }, mockPosts);
    },
  }),

  /*
    ({ before, after, limit, inverted }) => {
      let whereClause = {};

      if (after) {
        const [afterDate, afterId] = after.split(':');
        whereClause = {
          OR: [
            { createdAt: { gt: new Date(afterDate) } },
            {
              createdAt: new Date(afterDate),
              id: { gt: afterId }
            }
          ]
        };
      }

      return prisma.post.findMany({
        where: whereClause,
        take: limit,
        orderBy: [
          { createdAt: inverted ? 'desc' : 'asc' },
          { id: inverted ? 'desc' : 'asc' }
        ]
      });
    }
 */

  postsCursorConnection: t.connection({
    type: PostRef,
    resolve: (_, args) => {
      return resolveCursorConnection(
        {
          args,
          toCursor: (post) => `${post.createdAt.toISOString()}|${post.id}`,
        },
        ({ before, after, limit, inverted }: ResolveCursorConnectionArgs) => {
          let filteredPosts = [...mockPosts];

          if (after) {
            const { id: afterId, date: afterDate } = parseCompositeCursor(after);

            filteredPosts = filteredPosts.filter((p) => {
              if (p.createdAt > afterDate) return true;

              if (p.createdAt.getTime() === afterDate.getTime()) {
                return p.id > afterId;
              }

              return false;
            });
            console.log(`  ➡️ After ${after}: ${filteredPosts.length} posts`);
          }

          if (before) {
            const { id: beforeId, date: beforeDate } = parseCompositeCursor(before);
            filteredPosts = filteredPosts.filter((p) => {
              if (p.createdAt < beforeDate) return true;

              if (p.createdAt.getTime() === beforeDate.getTime()) {
                return p.id < beforeId;
              }

              return false;
            });
            console.log(`  ⬅️ Before ${before}: ${filteredPosts.length} posts`);
          }

          filteredPosts.sort((a, b) => {
            const dateDiff = a.createdAt.getTime() - b.createdAt.getTime();
            if (dateDiff !== 0) {
              return inverted ? -dateDiff : dateDiff;
            }

            return inverted
              ? b.id.localeCompare(a.id)
              : a.id.localeCompare(b.id);
          });

          const result = filteredPosts.slice(0, limit);
          console.log(
            `  📦 Returning ${result.length} posts (limit: ${limit})`
          );

          return result;
        }
      );
    },
  }),

  usersConnection: t.connection({
    type: UserAuthorRef,
    resolve: async (_parent, args) => {
      return resolveArrayConnection({ args }, mockUsers);
    },
  }),

  fieldThatAcceptsGlobalID: t.globalIDList({
    nullable: true,
    args: {
      id: t.arg.globalID({
        for: [UserAuthorRef, PostRef],
        required: true,
      }),
      idList: t.arg.globalIDList(),
    },
    resolve(_parent, args) {
      console.log(decodeGlobalID(args.id.id));

      return [
        {
          id: args.id.id,
          type: args.id.typename,
        },
        ...(args.idList?.map(({ id, typename }) => ({ id, type: typename })) ??
          []),
      ];
    },
  }),

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

builder.relayMutationField(
  "createPost",
  {
    inputFields: (t) => ({
      title: t.string({ required: true }),
      content: t.string({ required: true }),
      authorId: t.globalID({ required: true }),
    }),
  },
  {
    nullable: false,
    resolve: async (_root, args) => {
      const {
        title,
        content,
        authorId: { id: authorId },
      } = args.input;

      const author = mockUsers.find((u) => u.id === authorId);
      if (!author) {
        throw new Error("Author not found");
      }

      const newPost: IPost = {
        id: `post-${mockPosts.length + 1}`,
        title,
        content,
        author,
        createdAt: new Date(),
      };

      mockPosts.push(newPost);
      (author.posts ?? []).push(newPost);

      return { post: newPost, success: true };
    },
  },
  {
    outputFields: (t) => ({
      post: t.field({
        type: PostRef,
        resolve: (result) => result.post,
      }),
      success: t.boolean({
        resolve: (result) => result.success,
      }),
    }),
  }
);

builder.relayMutationField(
  "updatePost",
  {
    inputFields: (t) => ({
      title: t.string(),
      content: t.string(),
      postId: t.globalID({ required: true }),
    }),
  },
  {
    resolve: async (_parent, args) => {
      const {
        title,
        content,
        postId: { id: postId },
      } = args.input;

      const postIndex = mockPosts.findIndex((p) => p.id === postId);
      if (postIndex === -1) {
        return { post: null, success: false };
      }

      if (title) mockPosts[postIndex]!.title = title;
      if (content) mockPosts[postIndex]!.content = content;

      return { post: mockPosts[postIndex], success: true };
    },
  },
  {
    outputFields: (t) => ({
      post: t.field({
        type: PostRef,
        resolve: (result) => result.post,
      }),
      success: t.boolean({
        resolve: (result) => result.success,
      }),
    }),
  }
);

builder.relayMutationField(
  "deletePost",
  {
    inputFields: (t) => ({
      id: t.globalID({ required: true }),
    }),
  },
  {
    resolve: async (_parent, args) => {
      const {
        id: { id },
      } = args.input;
      const index = mockPosts.findIndex((p) => p.id === id);

      if (index === -1) {
        return { deletedId: null, success: false };
      }

      const [deletedPost] = mockPosts.splice(index, 1);

      if (deletedPost?.author) {
        deletedPost.author.posts =
          deletedPost.author.posts?.filter((p) => p.id !== id) || [];
      }

      return { deletedId: encodeGlobalID(PostRef.name, id), success: true };
    },
  },
  {
    outputFields: (t) => ({
      deletedId: t.globalID({
        nullable: true,
        resolve: (result) => result.deletedId,
      }),
      success: t.boolean({
        resolve: (result) => result.success,
      }),
    }),
  }
);

export { UserAuthorRef, PostRef };
export type { IPost, IUserAuthor };
