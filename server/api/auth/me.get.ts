import { requireUser } from '../../utils'

export default defineEventHandler(async (event) => {
 return requireUser(event)
})
