// web/server/src/mocks/data.ts
import type { IUserAuthor, IPost } from "@/schema/user/schema";

// Create mock users
const alice: IUserAuthor = {
  id: "user-1",
  username: "alice",
  posts: [],
};

const bob: IUserAuthor = {
  id: "user-2",
  username: "bob",
  posts: [],
};

const charlie: IUserAuthor = {
  id: "user-3",
  username: "charlie",
  posts: [],
};

// Create mock posts
const post1: IPost = {
  id: "post-1",
  title: "Getting Started with GraphQL",
  content: "GraphQL is a query language for APIs...",
  author: alice,
};

const post2: IPost = {
  id: "post-2",
  title: "Advanced TypeScript Tips",
  content: "Here are some advanced TypeScript techniques...",
  author: alice,
};

const post3: IPost = {
  id: "post-3",
  title: "Building REST APIs",
  content: "REST is still widely used...",
  author: bob,
};

const post4: IPost = {
  id: "post-4",
  title: "React Best Practices",
  content: "Follow these best practices for React...",
  author: charlie,
};

// Complete the circular references
alice.posts = [post1, post2];
bob.posts = [post3];
charlie.posts = [post4];

// Export arrays
export const mockUsers: IUserAuthor[] = [alice, bob, charlie];
export const mockPosts: IPost[] = [post1, post2, post3, post4];
