import { PrismaClient } from "@/lib/prisma/client";

export const prisma = new PrismaClient({
  log: ["info"],
});
