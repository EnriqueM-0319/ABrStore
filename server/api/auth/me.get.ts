import { graphqlRequest } from '../../utils'

const meQuery = `#graphql
 query Me {
  me {
   id
   fullName
   email
   username
   phone
   role
   active
  }
 }
`

export default defineEventHandler(async (event) => {
 const data = await graphqlRequest<{ me: unknown }>(event, meQuery)
 return data.me
})
