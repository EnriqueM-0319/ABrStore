import type { SessionUser, UserRole } from '~/types'

export function useAuth() {
 const user = useState<SessionUser | null>('auth-user', () => null)

 async function loadUser() {
 const requestFetch = useRequestFetch()
 user.value = await requestFetch<SessionUser | null>('/api/auth/me')
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
