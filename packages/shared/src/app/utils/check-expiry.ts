export const checkExpiry = (expiresAt: Date): boolean => {
  return expiresAt.getTime() < Date.now()
}
