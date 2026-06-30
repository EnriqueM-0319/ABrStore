import { graphqlRequest, userFields } from '../../utils'

const updateUserMutation = `#graphql
 mutation UpdateUser($id: String!, $input: UpdateUserInput!) {
  updateUser(id: $id, input: $input) {
   ${userFields}
  }
 }
`

export default defineEventHandler(async (event) => {
 const id = getRouterParam(event, 'id')
 if (!id) throw createError({ statusCode: 400, message: 'Usuario inválido.' })
 const body = await readBody(event)
 const data = await graphqlRequest<{ updateUser: unknown }>(event, updateUserMutation, {
  id,
  input: {
   fullName: String(body.fullName || '').trim(),
   email: String(body.email || '').trim().toLowerCase(),
   phone: String(body.phone || '').trim(),
   role: body.role || undefined,
   password: body.password || undefined,
   active: typeof body.active === 'boolean' ? body.active : undefined
  }
 })
 return data.updateUser
})
