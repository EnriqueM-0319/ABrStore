import { graphqlRequest } from '../../utils'

const logoutMutation = `#graphql
 mutation Logout {
  logout {
   ok
  }
 }
`

export default defineEventHandler((event) => {
 return graphqlRequest<{ logout: { ok: boolean } }>(event, logoutMutation).then(data => data.logout)
})
