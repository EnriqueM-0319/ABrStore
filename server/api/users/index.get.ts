import { graphqlRequest, userFields } from '../../utils'

const usersQuery = `#graphql
 query Users($search: String) {
  users(search: $search) {
   ${userFields}
  }
 }
`

export default defineEventHandler(async (event) => {
 const query = getQuery(event)
 const search = typeof query.search === 'string' ? query.search.trim().slice(0, 80) : ''
 const data = await graphqlRequest<{ users: unknown[] }>(event, usersQuery, { search })
 return data.users
})
