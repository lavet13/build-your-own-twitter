import { mockUsers, mockPosts } from "./data";

export const mockResolvers = {
  Query: {
    user: (_parent: unknown, args: { id?: string }) => {
      return mockUsers.find((u) => u.id === args.id) ?? null;
    },
    users: () => {
      return mockUsers;
    },
    post: (_parent: unknown, args: { id?: string }) => {
      return mockPosts.find((p) => p.id === args.id) ?? null;
    },
    posts: () => {
      return mockPosts;
    },
  },
  // You can also mock mutations, subscriptions, etc.
  // Mutation: {
  //   createPost: (_parent: unknown, args: { title: string; content: string; authorId: string }) => {
  //     const newPost = {
  //       id: `post-${mockPosts.length + 1}`,
  //       title: args.title,
  //       content: args.content,
  //       author: mockUsers.find(u => u.id === args.authorId) ?? null,
  //     };
  //     mockPosts.push(newPost);
  //     return newPost;
  //   },
  // },
};
