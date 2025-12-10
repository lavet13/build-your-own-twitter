import { prisma } from "@/db";
import type { Prisma } from "@/lib/prisma/client";
import { parseArgs } from "node:util";

const users: Prisma.UserCreateInput[] = [
  { username: "Alice", email: "alice@prisma.io" },
  {
    username: "Nilu",
    email: "nilu@prisma.io",
  },
  { username: "Bob", email: "bob@prisma.io", displayName: "Bob Smith" },
];

const aliceMessages = [
  "Hey Nilu! How are you doing?",
  "Did you see the latest updates on the project?",
  "Let's catch up sometime this week!",
  "Thanks for your help with the GraphQL schema yesterday!",
  "Looking forward to our meeting on Friday.",
];

const niluMessages = [
  "Hi Alice! I'm doing great, thanks for asking!",
  "Can you review this PR when you get a chance?",
  "Great work on the new features!",
  "I have a question about the Prisma relations.",
  "See you at the meeting tomorrow!",
];

const bobMessages = [
  "Hello everyone! Just joined the team.",
  "Can someone help me set up my development environment?",
  "Thanks for the warm welcome!",
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
    case "development": {
      console.log("------Start seeding(OMAYGOT)------");

      const deleteMessages = prisma.message.deleteMany();
      const deleteFollows = prisma.follow.deleteMany();
      const deleteProfiles = prisma.profile.deleteMany();
      const deleteUsers = prisma.user.deleteMany();

      await prisma.$transaction([
        deleteMessages,
        deleteUsers,
        deleteFollows,
        deleteProfiles,
      ]);

      console.log("Cleared existing data");

      const createdUsers: Prisma.UserModel[] = [];
      for (const u of users) {
        const user = await prisma.user.create({
          data: u,
        });
        createdUsers.push(user);
        console.log(`Created user with id: ${user.id} (${user.username})`);
      }

      for (const user of createdUsers) {
        await prisma.profile.create({
          data: {
            userId: user.id,
            avatar: `https://avatar.iran.liara.run/username?username=${user.displayName}`,
          },
        });
        console.log(`Created profile for ${user.username}`);
      }

      if (createdUsers.length >= 3) {
        const [alice, nilu, bob] = createdUsers;

        // Create follow relationships
        // Alice follows Nilu and Bob
        await prisma.follow.create({
          data: {
            followingId: alice!.id,
            followedById: nilu!.id,
          },
        });
        console.log(`${alice?.username} follows ${nilu?.username}`);

        await prisma.follow.create({
          data: {
            followingId: alice!.id,
            followedById: bob!.id,
          },
        });
        console.log(`${alice?.username} follows ${bob?.username}`);

        // Nilu follows Alice
        await prisma.follow.create({
          data: {
            followingId: nilu!.id,
            followedById: alice!.id,
          },
        });
        console.log(`${nilu?.username} follows ${alice?.username}`);

        // Bob follows Alice and Nilu
        await prisma.follow.create({
          data: {
            followingId: bob!.id,
            followedById: alice!.id,
          },
        });
        console.log(`${bob?.username} follows ${alice?.username}`);

        await prisma.follow.create({
          data: {
            followingId: bob!.id,
            followedById: nilu!.id,
          },
        });
        console.log(`${bob?.username} follows ${nilu?.username}`);

        const aliceToNileMessages: string[] = [];
        for (let i = 0; i < aliceMessages.length; i++) {
          const message = await prisma.message.create({
            data: {
              content: aliceMessages[i] ?? "",
              senderId: alice!.id,
              receiverId: nilu!.id,
              isRead: i < 2,
              readAt: i < 2 ? new Date(Date.now() - (5 - i) * 60_000) : null,
            },
          });
          aliceToNileMessages.push(message.id);
          console.log(
            `Created message from ${alice?.username} to ${nilu?.username}: "${aliceMessages[i]?.substring(0, 30)}..."`
          );
        }

        for (let i = 0; i < niluMessages.length; i++) {
          await prisma.message.create({
            data: {
              content: niluMessages[i] ?? "",
              senderId: nilu!.id,
              receiverId: alice!.id,
              isRead: i < 3,
              readAt: i < 3 ? new Date(Date.now() - (5 - i) * 60_000) : null,
            },
          });
          console.log(
            `Created message from ${nilu?.username} to ${alice?.username}: "${niluMessages[i]?.substring(0, 30)}..."`
          );
        }

        // Create a reply thread
        // Nilu replies to Alice's question about the project
        const replyToProjectUpdate = await prisma.message.create({
          data: {
            content:
              "Yes! The new Prisma features look amazing. I especially love the improved relations API.",
            senderId: nilu!.id,
            receiverId: alice!.id,
            replyToId: aliceToNileMessages[1],
            isRead: true,
            readAt: new Date(Date.now() - 3 * 60_000),
          },
        });

        console.log(
          `Created reply from ${nilu?.username} to ${alice?.username}'s message about project update`
        );

        // Alice replies to Nilu's reply
        await prisma.message.create({
          data: {
            content:
              "Right? The type safety improvements are game-changing for our codebase!",
            senderId: alice!.id,
            receiverId: nilu!.id,
            replyToId: replyToProjectUpdate.id,
            isRead: true,
            readAt: new Date(Date.now() - 2 * 60_000),
          },
        });
        console.log(
          `Created nested reply from ${alice?.username} to Nilu's reply`
        );

        // Bob sends messages to Alice
        for (let i = 0; i < bobMessages.length; i++) {
          await prisma.message.create({
            data: {
              content: bobMessages[i] ?? "",
              senderId: bob!.id,
              receiverId: alice!.id,
              isRead: i === 0,
              readAt: i === 0 ? new Date(Date.now() - 10 * 60_000) : null,
            },
          });
          console.log(
            `Created message from ${bob?.username} to ${alice?.username}: "${bobMessages[i]?.substring(0, 30)}..."`
          );
        }

        // Alice welcomes Bob
        const welcomeMessage = await prisma.message.create({
          data: {
            content: "Welcome to the team, Bob! Happy to have you here.",
            senderId: alice!.id,
            receiverId: bob!.id,
            isRead: true,
            readAt: new Date(Date.now() - 8 * 60_000),
          },
        });
        console.log(
          `Created welcome message from ${alice?.username} to ${bob?.username}`
        );

        // Bob replies to Alice's welcome
        await prisma.message.create({
          data: {
            content: "Thank you! Looking forward to working with everyone.",
            senderId: bob!.id,
            receiverId: alice!.id,
            replyToId: welcomeMessage.id,
            isRead: true,
            readAt: new Date(Date.now() - 7 * 60_000),
          },
        });
        console.log(`Created reply from ${bob?.username} to Alice's welcome`);

        // Nilu helps Bob
        await prisma.message.create({
          data: {
            content:
              "Hey Bob! I can help you with the setup. Let me send you the onboarding doc.",
            senderId: nilu!.id,
            receiverId: bob!.id,
            isRead: true,
          },
        });
        console.log(
          `Created message from ${nilu?.username} to ${bob?.username}`
        );
      }

      const userCount = await prisma.user.count();
      const profileCount = await prisma.profile.count();
      const messageCount = await prisma.message.count();
      const followCount = await prisma.follow.count();
      const replyCount = await prisma.message.count({
        where: {
          replyToId: { not: null },
        },
      });

      console.log("\n------Seeding Summary------");
      console.log(`Users created: ${userCount}`);
      console.log(`Profiles created: ${profileCount}`);
      console.log(`Messages created: ${messageCount}`);
      console.log(`  - Replies: ${replyCount}`);
      console.log(`Follow relationships: ${followCount}`);
      console.log("------Seeding finished. Sigh...------");
      break;
    }
    case "test": {
      console.log("No testing implemented yet.");
      break;
    }
    default: {
      console.log("Did nothing.");
      break;
    }
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
