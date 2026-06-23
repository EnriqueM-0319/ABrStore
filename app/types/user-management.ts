import type { UserRole } from './auth'

export type ManagedUser = {
  id: string
  fullName: string
  email: string
  username: string | null
  phone: string
  role: UserRole
  active: boolean
}
