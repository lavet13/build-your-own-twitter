// web/server/src/mocks/data.ts
import type { IUserAuthor, IPost } from "@/schema/user/schema";

// Create mock users
const alice: IUserAuthor = {
  id: "1",
  username: "alice",
  posts: [],
};

const bob: IUserAuthor = {
  id: "2",
  username: "bob",
  posts: [],
};

const charlie: IUserAuthor = {
  id: "3",
  username: "charlie",
  posts: [],
};

// Create mock posts
const post1: IPost = {
  id: "1",
  title: "Getting Started with GraphQL",
  content: "GraphQL is a query language for APIs...",
  author: alice,
  createdAt: new Date("2024-01-01"),
};

const post2: IPost = {
  id: "2",
  title: "Advanced TypeScript Tips",
  content: "Here are some advanced TypeScript techniques...",
  author: alice,
  createdAt: new Date("2024-01-01"),
};

const post3: IPost = {
  id: "3",
  title: "Building REST APIs",
  content: "REST is still widely used...",
  author: bob,
  createdAt: new Date("2024-01-01"),
};

const post4: IPost = {
  id: "4",
  title: "React Best Practices",
  content: "Follow these best practices for React...",
  author: charlie,
  createdAt: new Date("2024-01-02"),
};

// Complete the circular references
alice.posts = [post1, post2];
bob.posts = [post3];
charlie.posts = [post4];

// Export arrays
export const mockUsers: IUserAuthor[] = [alice, bob, charlie];
export const mockPosts: IPost[] = [post1, post2, post3, post4];
