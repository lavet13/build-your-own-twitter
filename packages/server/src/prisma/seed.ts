import { prisma } from "@/db";
import type { Prisma } from "@/lib/prisma/client";
import { parseArgs } from "node:util";
import { RoleName } from "@/prisma/permission-definitions";
import { grantUserPermissions, seedAllPermissions } from "@/prisma/seed-permissions";

const basicRoleUser: Prisma.RoleCreateNestedOneWithoutUsersInput = {
  connect: {
    name: RoleName.USER,
  },
};

const users: Prisma.UserCreateInput[] = [
  {
    username: "Alice",
    email: "alice@prisma.io",
    password: "password",
    role: basicRoleUser,
  },
  {
    username: "Nilu",
    email: "nilu@prisma.io",
    password: "password",
    role: basicRoleUser,
  },
  {
    username: "Bob",
    email: "bob@prisma.io",
    displayName: "Bob Smith",
    password: "password",
    role: basicRoleUser,
  },
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

      // ================================
      // Step 1: Seed Permissions & Roles
      // ================================
      await seedAllPermissions();

      // ================================
      // Step 2: Clear existing data
      // ================================
      const deleteMessages = prisma.message.deleteMany();
      const deleteFollows = prisma.follow.deleteMany();
      const deleteProfiles = prisma.profile.deleteMany();
      const deleteSessions = prisma.session.deleteMany();
      const deleteUsers = prisma.user.deleteMany();

      await prisma.$transaction([
        deleteMessages,
        deleteSessions,
        deleteUsers,
        deleteFollows,
        deleteProfiles,
      ]);

      console.log("Cleared existing data");

      // ================================
      // Step 3: Create users with roles
      // ================================
      const createdUsers: Prisma.UserModel[] = [];
      for (const u of users) {
        const user = await prisma.user.create({
          data: u,
        });
        createdUsers.push(user);
        console.log(`Created user with id: ${user.id} (${user.username})`);
      }

      // ================================
      // Step 4: Create an Admin user
      // ================================
      const adminUser = await prisma.user.create({
        data: {
          username: "Admin",
          email: "admin@prisma.io",
          displayName: "System Administrator",
          password: "admin123",
          role: {
            connect: {
              name: RoleName.ADMIN,
            },
          },
        },
      });
      createdUsers.push(adminUser);
      console.log(`✨ Created ADMIN user: ${adminUser.username}`);

      // ==================================================
      // Step 5: Grant direct permissions to specific users
      // ==================================================
      //
      // She can delete any message and view emails

      const [alice] = createdUsers;
      if (alice) {
        await grantUserPermissions(
          alice.id,
          [
            "message:delete:any", // Can delete any message
            "user:view:email", // Can view user emails
          ],
          adminUser.id
        );
        console.log(`  ⭐ Granted moderator permissions to ${alice.username}`);
      }

      const nilu = createdUsers[1];
      if (nilu) {
        await grantUserPermissions(nilu.id, ["profile:view:any"], adminUser.id);
        console.log(
          `  ⭐ Granted profile admin permissions to ${nilu.username}`
        );
      }

      // ================================
      // Step 6: Create profiles
      // ================================

      for (const user of createdUsers) {
        await prisma.profile.create({
          data: {
            userId: user.id,
            avatar: `https://avatar.iran.liara.run/username?username=${user.username?.toLowerCase()}`,
          },
        });
        console.log(`Created profile for ${user.username}`);
      }

      // ==============================================
      // Step 7: Create follow relationships & messages
      // ==============================================
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
      const roleCount = await prisma.role.count();
      const permissionCount = await prisma.permission.count();
      const profileCount = await prisma.profile.count();
      const messageCount = await prisma.message.count();
      const followCount = await prisma.follow.count();
      const replyCount = await prisma.message.count({
        where: {
          replyToId: { not: null },
        },
      });
      const directPermissionCount = await prisma.userPermission.count({
        where: {
          grantedById: {
            not: null,
          },
        },
      });

      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📊 Seeding Summary");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`\n🔐 Authorization:`);
      console.log(`  Roles: ${roleCount}`);
      console.log(`  Permissions: ${permissionCount}`);
      console.log(`  Direct permission grants: ${directPermissionCount}`);
      console.log(`\n👥 Users:`);
      console.log(`  Total users: ${userCount}`);
      console.log(`  - Regular users: ${userCount - 1}`);
      console.log(`  - Admin users: 1`);
      console.log(`  Profiles: ${profileCount}`);
      console.log(`\n💬 Content:`);
      console.log(`  Messages: ${messageCount}`);
      console.log(`  - Replies: ${replyCount}`);
      console.log(`  Follow relationships: ${followCount}`);

      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🎉 Seeding Complete!");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      console.log("\n💡 Debug Tip:");
      console.log("   To inspect user permissions, use:");
      console.log(
        "   import { debugUserPermissions } from './seed-permissions';"
      );
      console.log(`   await debugUserPermissions('${alice?.id}');\n`);

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
