import type { AuthUser, UserRole } from '~/types/auth'

export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)

  async function loadUser() {
    const requestFetch = useRequestFetch()
    user.value = await requestFetch<AuthUser>('/api/auth/me')
    return user.value
  }

  function hasRole(...roles: UserRole[]) {
    return Boolean(user.value && roles.includes(user.value.role))
  }

  function clearUser() {
    user.value = null
  }

  return { user, loadUser, hasRole, clearUser }
}
