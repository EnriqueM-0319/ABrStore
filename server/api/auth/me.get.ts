import { graphqlRequest } from '../../utils'

const meQuery = `#graphql
 query Me {
  me {
   fullName
   role
  }
 }
`

export default defineEventHandler(async (event) => {
 const data = await graphqlRequest<{ me: { fullName: string, role: string } | null }>(event, meQuery)
 if (!data.me) return null

 return {
  displayName: data.me.fullName,
  role: data.me.role
 }
})
