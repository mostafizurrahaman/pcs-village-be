// Auth Status
export const AuthStatus = {
  ACTIVE: 'active', // can use the system
  PENDING: 'pending', // signup completed, waiting for next step
  IN_REVIEW: 'in_review', // admin/manual verification in progress
  BLOCKED: 'blocked', // admin restricted
  DELETED: 'deleted', // soft-deleted (no login)
} as const

export const AuthStatusValues = Object.values(AuthStatus)

export type TAuthStatus = (typeof AuthStatus)[keyof typeof AuthStatus]

// Auth Roles:
export const AuthRoles = {
  SUPER_ADMIN: 'superadmin',
  ADMIN: 'admin',
  USER: 'user',
}

export const AuthRolesValues = Object.values(AuthRoles)

export type TAuthRole = (typeof AuthRoles)[keyof typeof AuthRoles]

export const authProvider = {
  EMAIL: 'email',
  GOOGLE: 'google',
  APPLE: 'apple',
} as const

export const authProviderValues = Object.values(authProvider)

export type TAuthProvider = (typeof authProvider)[keyof typeof authProvider]
