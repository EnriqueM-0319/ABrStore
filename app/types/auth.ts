export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'WORKER'

export type AuthUser = {
  id: string
  fullName: string
  email: string
  username: string | null
  phone: string
  role: UserRole
  active: boolean
}
