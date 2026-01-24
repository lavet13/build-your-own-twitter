export enum PermissionCategory {
  MESSAGE = "message",
  USER = "user",
  PROFILE = "profile",
  FOLLOW = "follow",
  SESSION = "session",
  ROLE = "role",
  PERMISSION = "permission",
}

export enum RoleName {
  ADMIN = "ADMIN",
  MODERATOR = "MODERATOR",
  USER = "USER",
}

export enum PermissionScope {
  OWN = "own",
  ANY = "any",
  PUBLIC = "public", // For public/unrestricted access
}

export type PermissionAction =
  | "read"
  | "send"
  | "delete"
  | "edit"
  | "view"
  | "ban"
  | "unban"
  | "list"
  | "create"
  | "mark_read"
  | "upload"
  | "grant"
  | "revoke";

export type SensitiveField = "email" | "password" | "ip_address";

export interface PermissionDefinition {
  name: string;
  category: PermissionCategory;
  description: string;
  scope: PermissionScope;
  sensitiveField?: SensitiveField; // for field-level permissions
}

// ==========================================
// PERMISSION BUILDER HELPERS
// ==========================================

function buildPermissionName(
  category: PermissionCategory,
  action: PermissionAction,
  scope?: PermissionScope
) {
  const parts: [PermissionCategory, PermissionAction, PermissionScope?] = [
    category,
    action,
  ];
  if (scope) {
    parts.push(scope);
  }
  return parts.join(":");
}

function createPermission(
  category: PermissionCategory,
  action: PermissionAction,
  scope: PermissionScope,
  description: string
): PermissionDefinition {
  return {
    name: buildPermissionName(category, action, scope),
    category,
    scope,
    description,
  };
}

/**
 * Create permission without scope (for CREATE actions)
 */
function createActionPermission(
  category: PermissionCategory,
  action: PermissionAction,
  description: string
): PermissionDefinition {
  return {
    name: `${category}:${action}`, // No scope assigned here
    category,
    scope: PermissionScope.OWN, // Stored as OWN but scope doesn't apply semantically
    description,
  };
}

/**
 * Create field-level permission (for sensitive fields)
 */
function createFieldPermission(
  category: PermissionCategory,
  action: PermissionAction,
  field: SensitiveField,
  scope: PermissionScope,
  description: string
): PermissionDefinition {
  return {
    name: `${category}:${action}:${field}`,
    category,
    scope,
    sensitiveField: field,
    description,
  };
}

function createResourcePermissions(
  category: PermissionCategory,
  action: PermissionAction,
  descriptions: {
    own: string;
    any: string;
  }
): PermissionDefinition[] {
  return [
    createPermission(category, action, PermissionScope.OWN, descriptions.own),
    createPermission(category, action, PermissionScope.ANY, descriptions.any),
  ];
}

/**
 * Create three-tier permissions (own, public, any)
 */
function createTieredPermissions(
  category: PermissionCategory,
  action: PermissionAction,
  descriptions: {
    own: string;
    public: string;
    any: string;
  }
): PermissionDefinition[] {
  return [
    createPermission(category, action, PermissionScope.OWN, descriptions.own),
    createPermission(
      category,
      action,
      PermissionScope.PUBLIC,
      descriptions.public
    ),
    createPermission(category, action, PermissionScope.ANY, descriptions.any),
  ];
}

const MESSAGE_PERMISSIONS: PermissionDefinition[] = [
  ...createResourcePermissions(PermissionCategory.MESSAGE, "read", {
    own: "Read own messages (sent or received)",
    any: "Read any message in the system",
  }),

  createActionPermission(
    PermissionCategory.MESSAGE,
    "send",
    "Send messages to other users (includes replies)"
  ),

  ...createResourcePermissions(PermissionCategory.MESSAGE, "delete", {
    own: "Delete own sent messages",
    any: "Delete any message in the system",
  }),

  ...createResourcePermissions(PermissionCategory.MESSAGE, "edit", {
    own: "Edit own sent messages",
    any: "Edit any message in the system",
  }),

  ...createResourcePermissions(PermissionCategory.MESSAGE, "mark_read", {
    own: "Mark own received messages as read",
    any: "Mark any message as read",
  }),
];

// ==========================================
// USER PERMISSIONS
// ==========================================
const USER_PERMISSIONS: PermissionDefinition[] = [
  // Three-tier view permissions
  ...createTieredPermissions(PermissionCategory.USER, "view", {
    own: "View own full profile (including private data)",
    public: "View any user's public profile (username, avatar, bio)",
    any: "View any user's full profile (including sensitive fields)",
  }),

  createActionPermission(
    PermissionCategory.USER,
    "list",
    "List and search users"
  ),

  // Field-level permissions for sensitive data
  createFieldPermission(
    PermissionCategory.USER,
    "view",
    "email",
    PermissionScope.ANY,
    "View any user's email address"
  ),

  ...createResourcePermissions(PermissionCategory.USER, "edit", {
    own: "Edit own profile",
    any: "Edit any user profile",
  }),

  ...createResourcePermissions(PermissionCategory.USER, "delete", {
    own: "Delete own account",
    any: "Delete any user account",
  }),

  createActionPermission(
    PermissionCategory.USER,
    "create",
    "Create new user accounts"
  ),

  createActionPermission(
    PermissionCategory.USER,
    "ban",
    "Ban users from the platform"
  ),

  createActionPermission(
    PermissionCategory.USER,
    "unban",
    "Unban users from the platform"
  ),
];

// ==========================================
// PROFILE PERMISSIONS
// ==========================================
const PROFILE_PERMISSIONS: PermissionDefinition[] = [
  ...createTieredPermissions(PermissionCategory.PROFILE, "view", {
    own: "View own profile details",
    public: "View any user's public profile (avatar, bio)",
    any: "View any user's profile details",
  }),

  ...createResourcePermissions(PermissionCategory.PROFILE, "edit", {
    own: "Edit own profile details",
    any: "Edit any user's profile details",
  }),

  createActionPermission(
    PermissionCategory.PROFILE,
    "upload",
    "Upload profile avatar"
  ),
];

// ==========================================
// FOLLOW PERMISSIONS
// ==========================================
const FOLLOW_PERMISSIONS: PermissionDefinition[] = [
  createActionPermission(
    PermissionCategory.FOLLOW,
    "create",
    "Follow other users"
  ),

  ...createResourcePermissions(PermissionCategory.FOLLOW, "delete", {
    own: "Unfollow users you follow",
    any: "Remove any follow relationship",
  }),

  ...createTieredPermissions(PermissionCategory.FOLLOW, "view", {
    own: "View your own follow relationships",
    public: "View any user's public follow lists",
    any: "View any user's follow relationships (including hidden)",
  }),
];

// ==========================================
// SESSION PERMISSIONS
// ==========================================
const SESSION_PERMISSIONS: PermissionDefinition[] = [
  ...createResourcePermissions(PermissionCategory.SESSION, "view", {
    own: "View own active sessions",
    any: "View any user's active sessions",
  }),

  ...createResourcePermissions(PermissionCategory.SESSION, "delete", {
    own: "Revoke own sessions (logout)",
    any: "Revoke any user's sessions",
  }),
];

// ==========================================
// ROLE & PERMISSION ADMIN
// ==========================================
const ROLE_PERMISSIONS: PermissionDefinition[] = [
  createActionPermission(
    PermissionCategory.ROLE,
    "view",
    "View roles and their permissions"
  ),

  createActionPermission(PermissionCategory.ROLE, "create", "Create new roles"),

  createActionPermission(
    PermissionCategory.ROLE,
    "edit",
    "Edit existing roles"
  ),

  createActionPermission(PermissionCategory.ROLE, "delete", "Delete roles"),
];

const PERMISSION_ADMIN: PermissionDefinition[] = [
  createActionPermission(
    PermissionCategory.PERMISSION,
    "grant",
    "Grant permissions to users"
  ),

  createActionPermission(
    PermissionCategory.PERMISSION,
    "revoke",
    "Revoke permissions from users"
  ),
];

// ==========================================
// COMBINED PERMISSIONS
// ==========================================
export const DIRECT_PERMISSIONS: PermissionDefinition[] = [
  ...MESSAGE_PERMISSIONS,
  ...USER_PERMISSIONS,
  ...PROFILE_PERMISSIONS,
  ...FOLLOW_PERMISSIONS,
  ...SESSION_PERMISSIONS,
  ...ROLE_PERMISSIONS,
  ...PERMISSION_ADMIN,
];

// ==========================================
// HELPER TO GET PERMISSIONS BY PATTERN
// ==========================================
function getPermissionsByPattern(pattern: {
  category?: PermissionCategory;
  action?: PermissionAction;
  scope?: PermissionScope;
}): string[] {
  return DIRECT_PERMISSIONS.filter((perm) => {
    if (pattern.category && perm.category !== pattern.category) return false;
    if (pattern.scope && perm.scope !== pattern.scope) return false;
    if (pattern.action && !perm.name.includes(`:${pattern.action}:`))
      return false;
    return true;
  }).map((perm) => perm.name);
}

// ==========================================
// ROLE DEFINITIONS
// ==========================================

export interface RoleDefinition {
  name: RoleName;
  description: string;
  permissions: string[] | "*"; // Permission names or '*' for all
}

export const USER_ROLE_PERMISSIONS = [
  // All "own" scope permissions for basic resources
  ...getPermissionsByPattern({
    category: PermissionCategory.MESSAGE,
    scope: PermissionScope.OWN,
  }),
  ...getPermissionsByPattern({
    category: PermissionCategory.USER,
    scope: PermissionScope.OWN,
  }),
  ...getPermissionsByPattern({
    category: PermissionCategory.PROFILE,
    scope: PermissionScope.OWN,
  }),
  ...getPermissionsByPattern({
    category: PermissionCategory.FOLLOW,
    scope: PermissionScope.OWN,
  }),
  ...getPermissionsByPattern({
    category: PermissionCategory.SESSION,
    scope: PermissionScope.OWN,
  }),

  // CREATE actions (no scope)
  buildPermissionName(PermissionCategory.MESSAGE, "send"),
  buildPermissionName(PermissionCategory.FOLLOW, "create"),
  buildPermissionName(PermissionCategory.PROFILE, "upload"),

  // Can view others' public info
  buildPermissionName(PermissionCategory.USER, "view", PermissionScope.PUBLIC),
  buildPermissionName(
    PermissionCategory.PROFILE,
    "view",
    PermissionScope.PUBLIC
  ),
  buildPermissionName(
    PermissionCategory.FOLLOW,
    "view",
    PermissionScope.PUBLIC
  ),

  // Can list users
  buildPermissionName(PermissionCategory.USER, "list"),
];

const MODERATOR_ROLE_PERMISSIONS = [
  ...USER_ROLE_PERMISSIONS,

  // Content moderation
  buildPermissionName(
    PermissionCategory.MESSAGE,
    "delete",
    PermissionScope.ANY
  ),
  buildPermissionName(PermissionCategory.MESSAGE, "edit", PermissionScope.ANY),
  buildPermissionName(PermissionCategory.MESSAGE, "read", PermissionScope.ANY),

  // User moderation - full profile access
  buildPermissionName(PermissionCategory.USER, "ban"),
  buildPermissionName(PermissionCategory.USER, "unban"),
  buildPermissionName(PermissionCategory.USER, "view", PermissionScope.ANY),
  `${PermissionCategory.USER}:view:email`,
];

export const ROLES: RoleDefinition[] = [
  {
    name: RoleName.USER,
    description: "Regular user with basic permissions",
    permissions: USER_ROLE_PERMISSIONS,
  },
  {
    name: RoleName.MODERATOR,
    description: "Moderator with content management permissions",
    permissions: MODERATOR_ROLE_PERMISSIONS,
  },
  {
    name: RoleName.ADMIN,
    description: "System administrator with full permissions",
    permissions: "*",
  },
];

// ==========================================
// Helper Functions
// ==========================================

/**
 * Get all permission names
 */
export function getAllPermissionNames(): string[] {
  return DIRECT_PERMISSIONS.map((p) => p.name);
}

export function getPermissionsByCategory(
  category: PermissionCategory
): PermissionDefinition[] {
  return DIRECT_PERMISSIONS.filter((p) => p.category === category);
}

export function getPermissionByScope(
  scope: PermissionScope
): PermissionDefinition[] {
  return DIRECT_PERMISSIONS.filter((p) => p.scope === scope);
}

export function permissionExists(permissionName: string): boolean {
  return DIRECT_PERMISSIONS.some((p) => p.name === permissionName);
}

export function getRolePermissions(roleName: RoleName): string[] {
  const role = ROLES.find((r) => r.name === roleName);
  if (!role) return [];

  if (role.permissions === "*") {
    return getAllPermissionNames();
  }

  return role.permissions;
}

export function printPermissions(): void {
  console.log("\n📋 Permission Registry:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  for (const category of Object.values(PermissionCategory)) {
    const perms = getPermissionsByCategory(category);
    if (perms.length === 0) continue;

    console.log(`${category.toUpperCase()} (${perms.length}):`);
    perms.forEach((p) => {
      console.log(`  • ${p.name}`);
      console.log(`    ${p.description}`);
    });
    console.log();
  }

  console.log("👥 Role Permissions:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  for (const role of ROLES) {
    const perms = getRolePermissions(role.name);
    console.log(`${role.name} (${perms.length} permissions):`);
    console.log(`  ${role.description}`);
    perms.slice(0, 5).forEach((p) => console.log(`  • ${p}`));
    if (perms.length > 5) {
      console.log(`  ... and ${perms.length - 5} more`);
    }
    console.log();
  }

  console.log("\n📊 Summary:");
  console.log(`Total permissions: ${DIRECT_PERMISSIONS.length}`);
  console.log(`Total roles: ${ROLES.length}`);
}
