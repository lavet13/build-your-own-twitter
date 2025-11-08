import type { YogaInitialContext } from "graphql-yoga";
import { prisma } from "@/db.js";

export interface Context extends YogaInitialContext {
  prisma: typeof prisma;
}

export async function createContext(
  _initialContext: YogaInitialContext,
): Promise<Context> {
  return {
    prisma,
  } as Context;
}
