export enum PermissionCategory {
  MESSAGE = "message",
  USER = "user",
  FOLLOW = "follow",
}

export enum RoleName {
  ADMIN = "ADMIN",
  MODERATOR = "MODERATOR",
  USER = "USER",
}

export enum PermissionScope {
  OWN = "own",
  ANY = "any",
}

export interface PermissionDefinition {
  name: string;
  category: PermissionCategory;
  description: string;
  scope: PermissionScope;
}

export const DIRECT_PERMISSIONS: PermissionDefinition[] = [
  // ==========================================
  // MESSAGE DIRECT_PERMISSIONS
  // ==========================================
  {
    name: "message:read:own",
    category: PermissionCategory.MESSAGE,
    scope: PermissionScope.OWN,
    description: "Read own messages (sent or received)",
  },
  {
    name: "message:read:any",
    category: PermissionCategory.MESSAGE,
    scope: PermissionScope.ANY,
    description: "Read any message in the system",
  },
  {
    name: "message:send",
    category: PermissionCategory.MESSAGE,
    scope: PermissionScope.OWN,
    description: "Send messages to other users",
  },
  {
    name: "message:delete:own",
    category: PermissionCategory.MESSAGE,
    scope: PermissionScope.OWN,
    description: "Delete own sent messages",
  },
  {
    name: "message:delete:any",
    category: PermissionCategory.MESSAGE,
    scope: PermissionScope.ANY,
    description: "Delete any message in the system",
  },
  {
    name: "message:edit:own",
    category: PermissionCategory.MESSAGE,
    scope: PermissionScope.OWN,
    description: "Edit own sent messages",
  },

  // ==========================================
  // USER DIRECT_PERMISSIONS
  // ==========================================
  {
    name: "user:view:own",
    category: PermissionCategory.USER,
    scope: PermissionScope.OWN,
    description: "View own profile",
  },
  {
    name: "user:view:any",
    category: PermissionCategory.USER,
    scope: PermissionScope.ANY,
    description: "View any user profile",
  },
  {
    name: "user:view:email",
    category: PermissionCategory.USER,
    scope: PermissionScope.ANY,
    description: "View user email addresses",
  },
  {
    name: "user:edit:own",
    category: PermissionCategory.USER,
    scope: PermissionScope.OWN,
    description: "Edit own profile",
  },
  {
    name: "user:edit:any",
    category: PermissionCategory.USER,
    scope: PermissionScope.ANY,
    description: "Edit any user profile",
  },
  {
    name: "user:delete:own",
    category: PermissionCategory.USER,
    scope: PermissionScope.OWN,
    description: "Delete own account",
  },
  {
    name: "user:delete:any",
    category: PermissionCategory.USER,
    scope: PermissionScope.ANY,
    description: "Delete any user account",
  },
  {
    name: "user:ban",
    category: PermissionCategory.USER,
    scope: PermissionScope.ANY,
    description: "Ban users from the platform",
  },
  {
    name: "user:follow",
    category: PermissionCategory.USER,
    scope: PermissionScope.OWN,
    description: "Follow other users",
  },
];

// ==========================================
// ROLE DEFINITIONS
// ==========================================

export interface RoleDefinition {
  name: RoleName;
  description: string;
  permissions: string[] | "*"; // Permission names or '*' for all
}

export const ROLES: RoleDefinition[] = [
  {
    name: RoleName.USER,
    description: "Regular user with basic permissions",
    permissions: [
      // Users can manage their own content
      "message:read:own",
      "message:send",
      "message:delete:own",
      "message:edit:own",

      "user:view:own",
      "user:view:any", // Can view other profiles
      "user:edit:own",
      "user:delete:own",
      "user:follow",
    ],
  },
  {
    name: RoleName.ADMIN,
    description: "System administrator with full permissions",
    permissions: "*", // Special marker for "all permissions"
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
