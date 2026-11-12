// Roles map to permissions. Code checks permissions, never role names, so a role's
// powers can change in one place.
export const ROLES = ['admin', 'manager', 'user'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'orders:use',
  'users:read',
  'users:invite',
  'users:edit',
  'users:suspend',
  'users:role',
  'users:delete',
  'users:reset_password',
  'audit:read',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  user: ['orders:use'],
  manager: ['orders:use', 'users:read', 'users:invite', 'users:edit', 'users:reset_password'],
  admin: [...PERMISSIONS],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
