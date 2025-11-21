import { prisma } from "@/db";
import type { Prisma } from "generated/client/client";

const users: Prisma.UserCreateInput[] = [
  { username: "Alice", email: "alice@prisma.io" },
  {
    username: "Nilu",
    email: "nilu@prisma.io",
  },
];

async function main() {
  console.log("--Start seeding(OMAYGOT)--");
  for (const u of users) {
    const user = await prisma.user.create({
      data: u,
    });
    console.log(`Created user with id: ${user.id}`);
  }
  console.log("--Seeding finished. Sigh...");
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
