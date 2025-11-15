import { PrismaClient } from "../generated/client/client";

export const prisma = new PrismaClient({
  log: ["info"],
});
