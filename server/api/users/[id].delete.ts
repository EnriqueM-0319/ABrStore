import { graphqlRequest, userFields } from '../../utils'

const deactivateUserMutation = `#graphql
 mutation DeactivateUser($id: String!) {
  deactivateUser(id: $id) {
   ${userFields}
  }
 }
`

export default defineEventHandler(async (event) => {
 const id = getRouterParam(event, 'id')
 if (!id) throw createError({ statusCode: 400, message: 'Usuario inválido.' })
 const data = await graphqlRequest<{ deactivateUser: unknown }>(event, deactivateUserMutation, { id })
 return data.deactivateUser
})
