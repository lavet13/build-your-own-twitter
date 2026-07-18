import { prisma } from "@/db";
import {
  DIRECT_PERMISSIONS,
  getAllPermissionNames,
  getPermissionByScope,
  PermissionScope,
  RoleName,
  ROLES,
} from "./permission-definitions";
import type { Prisma } from "@/lib/prisma/client";

/**
 * Seed all permissions defined in permission-definitions.ts
 */
export async function seedPermissions() {
  console.log("🔑 Seeding permissions...");

  for (const permDef of DIRECT_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: permDef.name },
      update: {
        description: permDef.description,
        isActive: true,
      },
      create: {
        name: permDef.name,
        description: permDef.description,
        isActive: true,
      },
    });
    console.log(`Permission ${permDef.name} was added`);
  }

  console.log(`✅ Seeded ${DIRECT_PERMISSIONS.length} permissions`);

  // Show breakdown by scope
  const ownCount = getPermissionByScope(PermissionScope.OWN).length;
  const publicCount = getPermissionByScope(PermissionScope.PUBLIC).length;
  const anyCount = getPermissionByScope(PermissionScope.ANY).length;

  console.log(`  - Own scope: ${ownCount}`);
  console.log(`  - Public scope: ${publicCount}`);
  console.log(`  - Any scope: ${anyCount}`);
}

/**
 * Seed all roles and their permissions
 */
export async function seedRoles() {
  console.log("👥 Seeding roles...");

  for (const roleDef of ROLES) {
    // Create or update the role
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      select: {
        id: true,
        name: true,
      },
      update: {
        description: roleDef.description,
      },
      create: {
        name: roleDef.name,
        description: roleDef.description,
      },
    });

    // Determine which permissions this role should have
    let permissionNames: string[];

    if (roleDef.permissions === "*") {
      // Admin gets all permissions
      permissionNames = getAllPermissionNames();
    } else {
      permissionNames = roleDef.permissions;
    }

    // Get all permission IDs
    const permissions = await prisma.permission.findMany({
      where: {
        name: {
          in: permissionNames,
        },
      },
      select: {
        id: true,
      },
    });

    // Clear existing role permissions
    await prisma.rolePermission.deleteMany({
      where: {
        roleId: role.id,
      },
    });

    // Create new role permissions
    const rolePermissions = permissions.map((p) => ({
      roleId: role.id,
      permissionId: p.id,
    }));

    await prisma.rolePermission.createMany({
      data: rolePermissions,
      skipDuplicates: true,
    });

    console.log(
      `  ✅ Role "${role.name}" with ${permissions.length} permissions`
    );
  }

  console.log(`✅ Seeded ${ROLES.length} roles`);
}

/**
 * Grant specific permissions directly to a user
 * @param userId - User ID
 * @param permissionNames - Array of permission names to grant
 * @param grantedBy - Optional: Admin user ID who granted the permission
 * */
export async function grantUserPermissions(
  userId: string,
  permissionNames: string[],
  grantedById?: string
) {
  const permissions = await prisma.permission.findMany({
    where: {
      name: { in: permissionNames },
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (permissions.length === 0) {
    console.warn(
      `⚠️  No valid permissions found for: ${permissionNames.join(", ")}`
    );
    return;
  }

  const userPermissions: Prisma.UserPermissionModel[] = permissions.map(
    (p) => ({
      userId,
      permissionId: p.id,
      status: "ACTIVE",
      grantedById: grantedById ?? null,
      grantedAt: new Date(),
    })
  );

  for (const up of userPermissions) {
    await prisma.userPermission.upsert({
      create: up,
      update: up,
      where: {
        userId_permissionId: {
          userId: up.userId,
          permissionId: up.permissionId,
        },
      },
    });
  }

  console.log(
    `  ✅ Granted ${permissions.length} direct permissions to user ${userId}`
  );
}

/**
 * Revoke specific permissions from a user
 * Sets grantedBy to null to indicate revocation
 * */
export async function revokeUserPermissions(
  userId: string,
  permissionNames: string[]
) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      username: true,
      displayName: true,
    },
  });

  if (!user) {
    throw new Error(`User with ${userId} ID not found`);
  }

  const permissions = await prisma.permission.findMany({
    where: { name: { in: permissionNames } },
    select: {
      id: true,
    },
  });

  await prisma.userPermission.updateMany({
    where: {
      userId,
      permissionId: { in: permissions.map((p) => p.id) },
    },
    data: {
      status: "REVOKED",
    },
  });

  console.log(
    `  ✅ Revoked ${permissions.length} permissions from user ${user.displayName || user.username}(${userId})`
  );
}

/**
 * Assign a role to a user
 * */
export async function assignUserRole(
  userId: string,
  roleName: RoleName
): Promise<void> {
  const role = await prisma.role.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
    },
  });

  if (!role) {
    throw new Error(`Role ${roleName} not found`);
  }

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      roleId: role.id,
    },
  });

  console.log(`  ✅ Assigned role "${roleName}" to user ${userId}`);
}

/**
 * Complete permission seeding workflow
 * */
export async function seedAllPermissions() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🚀 Starting Permission Seeding");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await seedPermissions();
  await seedRoles();

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✨ Permission Seeding Complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

/**
 * Get all permissions granted by a specific admin
 */
export async function getPermissionsGrantedBy(adminId: string) {
  const permissions = await prisma.userPermission.findMany({
    where: {
      grantedById: adminId,
    },
    select: {
      // the user itself
      user: {
        select: {
          username: true,
          email: true,
        },
      },
      // the permissions admin has granted
      permission: {
        select: {
          name: true,
          description: true,
        },
      },
      // the admin who granted this permission
      grantedBy: {
        select: {
          username: true,
          email: true,
        },
      },
    },
  });

  return permissions;
}

/**
 * Display all permissions granted by an admin
 * */
export async function debugAdminGrants(adminId: string): Promise<void> {
  const admin = await prisma.user.findUnique({
    where: {
      id: adminId,
    },
    select: {
      username: true,
      email: true,
      permissionsGranted: {
        select: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          permission: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!admin) {
    throw new Error(`❌ Admin with ${adminId} ID not found`);
  }

  const adminName = admin.username || admin.email;

  console.log(`\n 👨Admin: ${adminName}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Granted ${admin.permissionsGranted.length} permissions:\n`);

  // Group by user
  const byUser = new Map<string, typeof admin.permissionsGranted>();

  admin.permissionsGranted.forEach((grant) => {
    const userId = grant.user.id;
    if (!byUser.has(userId)) {
      byUser.set(userId, []);
    }
    byUser.get(userId)!.push(grant);
  });

  byUser.forEach((grants) => {
    const user = grants[0]!.user;
    const userName = user.username || user.email;
    console.log(`  📌 ${userName}:`);
    grants.forEach((g) => {
      console.log(`     ✓ ${g.permission.name}`);
    });
    console.log();
  });
}

/**
 * Display user permissions in a readable format
 * */
export async function debugUserPermissions(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      username: true,
      email: true,
      role: {
        select: {
          name: true,
          permissions: {
            select: {
              grantedAt: true,
              permission: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
      directPermissions: {
        where: {
          status: "ACTIVE", // Only active permissions
        },
        select: {
          permission: {
            select: {
              name: true,
            },
          },
          grantedBy: {
            select: {
              username: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error(`❌ User with ${userId} ID not found`);
  }

  console.log(`\n👤 ${user.username || user.email}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Role: ${user.role.name}`);

  console.log(`\n📦 Role Permissions (${user.role.permissions.length}):`);

  // Group by scope for readability
  const rolePerms = user.role.permissions.map((rp) => ({
    ...rp.permission,
    grantedAt: rp.grantedAt,
  }));
  const ownPerms = rolePerms.filter((p) => p.name.includes(":own"));
  const publicPerms = rolePerms.filter((p) => p.name.includes(":public"));
  const anyPerms = rolePerms.filter((p) => p.name.includes(":any"));
  const otherPerms = rolePerms.filter(
    (p) =>
      !p.name.includes(":own") &&
      !p.name.includes(":public") &&
      !p.name.includes(":any")
  );

  const printPermission = (permission: { name: string; grantedAt: Date }) => {
    console.log(
      `    ✓ ${permission.name}; Granted At: ${permission.grantedAt}`
    );
  };

  if (ownPerms.length > 0) {
    console.log(`  Own (${ownPerms.length})`);
    ownPerms.forEach(printPermission);
  }

  if (publicPerms.length > 0) {
    console.log(`  Public (${publicPerms.length}):`);
    publicPerms.forEach(printPermission);
  }

  if (anyPerms.length > 0) {
    console.log(`  Any (${anyPerms.length}):`);
    anyPerms.forEach(printPermission);
  }

  if (otherPerms.length > 0) {
    console.log(`  Other (${otherPerms.length}):`);
    otherPerms.forEach(printPermission);
  }

  if (user.directPermissions.length > 0) {
    console.log(`\n ⭐ Direct Permissions (${user.directPermissions.length}):`);
    user.directPermissions.forEach((up) => {
      const grantedByName = up.grantedBy
        ? up.grantedBy.username || up.grantedBy.email.split("@")[0]
        : "System";
      console.log(`  ✓ ${up.permission.name} (granted by ${grantedByName})`);
    });
  } else {
    console.log(`\n⭐ Direct Permissions: None`);
  }

  console.log();
}
