import { prisma } from "@/db";
import type { Prisma } from "@/lib/prisma/client";
import { parseArgs } from "node:util";

const users: Prisma.UserCreateInput[] = [
  { username: "Alice", email: "alice@prisma.io" },
  {
    username: "Nilu",
    email: "nilu@prisma.io",
  },
];

async function main() {
  const {
    values: { environment },
  } = parseArgs({
    options: {
      environment: { type: "string" },
    },
  });

  switch (environment) {
    case "development":
      console.log("------Start seeding(OMAYGOT)------");
      for (const u of users) {
        const user = await prisma.user.create({
          data: u,
        });
        console.log(`Created user with id: ${user.id}`);
      }
      console.log("------Seeding finished. Sigh...------");
      break;
    case "test":
      console.log("No testing implemented yet.");
      break;
    default:
      console.log("Did nothing.");
      break;
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
