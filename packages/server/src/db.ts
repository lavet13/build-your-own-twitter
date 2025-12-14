import { PrismaClient } from "@/lib/prisma/client";

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["info", "query"] : undefined,
});
