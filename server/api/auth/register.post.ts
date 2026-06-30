import { graphqlRequest, userFields } from '../../utils'

const registerMutation = `#graphql
 mutation RegisterUser($input: RegisterUserInput!) {
  registerUser(input: $input) {
   ${userFields}
  }
 }
`

export default defineEventHandler(async (event) => {
 const body = await readBody(event)
 const fullName = String(body.fullName || '').trim()
 const email = String(body.email || '').trim().toLowerCase()
 const password = String(body.password || '')
 const phone = String(body.phone || '').trim()
 const requestedRole = String(body.role || 'WORKER').toUpperCase()
 const role = ['WORKER', 'ADMIN', 'SUPERADMIN'].includes(requestedRole) ? requestedRole : 'WORKER'
 const data = await graphqlRequest<{ registerUser: unknown }>(event, registerMutation, {
  input: { fullName, email, password, phone, role }
 })

 return data.registerUser
})
