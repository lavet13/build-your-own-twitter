import { prisma } from "@/db";
import { debugUserPermissions, debugAdminGrants } from "./seed-permissions";
import { printPermissions } from "./permission-definitions";

/**
 * Debug script to inspect permissions
 *
 * Usage:
 *   tsx prisma/seed/debug-permissions.ts --user alice
 *   tsx prisma/seed/debug-permissions.ts --admin Admin
 *   tsx prisma/seed/debug-permissions.ts --all
 *   tsx prisma/seed/debug-permissions.ts --registry
 *   tsx prisma/seed/debug-permissions.ts --stats
 */

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0];
  const value = args[1];

  console.log("\n🔍 Permission Debug Tool");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  switch (mode) {
    case "--user": {
      // Debug specific user by username
      if (!value) {
        console.log("❌ Please provide a username");
        console.log("   Usage: tsx debug-permissions.ts --user alice");
        break;
      }

      const user = await prisma.user.findFirst({
        where: {
          username: {
            equals: value,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      if (!user) {
        console.log(`❌ User "${value}" not found`);
        break;
      }

      await debugUserPermissions(user.id);
      break;
    }

    case "--admin": {
      if (!value) {
        console.log("❌ Please provide an admin username");
        console.log("   Usage: tsx debug-permissions.ts --admin Admin");
        break;
      }

      const admin = await prisma.user.findFirst({
        where: {
          username: {
            equals: value,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      if (!admin) {
        console.log(`❌ Admin "${value}" not found`);
        break;
      }

      await debugAdminGrants(admin.id);
      break;
    }

    case "--all": {
      const users = await prisma.user.findMany({
        orderBy: {
          username: "asc",
        },
      });

      console.log(`Found ${users.length} users:\n`);

      for (const u of users) {
        await debugUserPermissions(u.id);
      }
      break;
    }

    case "--registry": {
      printPermissions();
      break;
    }

    case "--stats": {
      const stats = await getPermissionStats();
      console.log("📊 Permission Statistics\n");

      console.log("Roles:");
      stats.roles.forEach((r) => {
        console.log(
          `  ${r.name}: ${r.userCount} users, ${r.permissionCount} permissions`
        );
      });

      console.log(`\nDirect Permissions:`);
      console.log(`  Active grants: ${stats.directPermissions.active}`);
      console.log(`  Revoked grants: ${stats.directPermissions.revoked}`);

      if (stats.directPermissions.byAdmin.length > 0) {
        console.log(`\nGrants by Admin:`);
        stats.directPermissions.byAdmin.forEach((admin) => {
          console.log(`  ${admin.name}: ${admin.count} grants`);
        });
      }

      console.log(`\nTotal Permissions: ${stats.totalPermissions}`);
      console.log(`Active Permissions: ${stats.activePermissions}`);

      break;
    }

    case "--help":
    default: {
      console.log("Available commands:\n");
      console.log(
        "  --user <username>    Show permissions for a specific user"
      );
      console.log(
        "  --admin <username>   Show permissions granted by an admin"
      );
      console.log("  --all                Show permissions for all users");
      console.log("  --registry           Show all available permissions");
      console.log("  --stats              Show permission statistics");
      console.log("  --help               Show this help message");
      console.log("\nExamples:");
      console.log("  tsx prisma/seed/debug-permissions.ts --user alice");
      console.log("  tsx prisma/seed/debug-permissions.ts --admin Admin");
      console.log("  tsx prisma/seed/debug-permissions.ts --all");
      console.log("  tsx prisma/seed/debug-permissions.ts --registry");
      break;
    }
  }
}

async function getPermissionStats() {
  const roles = await prisma.role.findMany({
    include: {
      _count: {
        select: {
          users: true,
          permissions: true,
        },
      },
    },
  });

  const directPermissions = await prisma.userPermission.groupBy({
    by: ["grantedById"],
    _count: true,
  });
  console.log({ directPermissions });

  const active = directPermissions
    .filter((dp) => dp.grantedById !== null)
    .reduce((sum, dp) => (sum += dp._count), 0);
  const revoked =
    directPermissions.find((dp) => dp.grantedById === null)?._count || 0;

  // Get admin names for grants
  const adminIds = directPermissions
    .filter((dp) => dp.grantedById !== null)
    .map((dp) => dp.grantedById as string);

  const admins = await prisma.user.findMany({
    where: {
      id: { in: adminIds },
    },
    select: {
      id: true,
      username: true,
      email: true,
      _count: {
        select: {
          permissionsGranted: true,
        },
      },
    },
  });

  const totalPermissions = await prisma.permission.count();
  const activePermissions = await prisma.permission.count({
    where: { isActive: true },
  });

  return {
    roles: roles.map((r) => ({
      name: r.name,
      userCount: r._count.users,
      permissionCount: r._count.permissions,
    })),
    directPermissions: {
      active,
      revoked,
      byAdmin: admins.map((admin) => ({
        name: admin.username || admin.email,
        count: admin._count.permissionsGranted,
      })),
    },
    totalPermissions,
    activePermissions,
  };
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
