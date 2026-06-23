import { requireUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  return requireUser(event)
})
