import { graphqlRequest } from '../../utils'

const healthQuery = `#graphql
 query BackendHealth {
  __typename
 }
`

export default defineEventHandler(async (event) => {
 const data = await graphqlRequest<{ __typename: string }>(event, healthQuery)
 return { ok: data.__typename === 'Query' }
})
