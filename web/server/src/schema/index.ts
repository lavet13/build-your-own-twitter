import { builder } from "@/builder";

/**
 * Import all feature modules
 *
 * These imports register types, queries, and mutations with the builder.
 * They do NOT export values - import directly from feature files if needed.
 */

import "./user";
import { mockResolvers } from "@/mocks/resolvers";

/**
 * Build and export the final schema
 * This is the ONLY export from this file
 */
const prodSchema = builder.toSchema();

const testSchema = builder.toSchema({
  mocks: mockResolvers,
});

export const schema =
  process.env.NODE_ENV === "development" ? testSchema : prodSchema;
