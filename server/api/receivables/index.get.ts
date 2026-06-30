import { graphqlRequest, saleFields } from '../../utils'

const receivablesQuery = `#graphql
 query Receivables($status: String, $page: Float, $limit: Float) {
  receivables(status: $status, page: $page, limit: $limit) {
   items { ${saleFields} }
   total
   page
   limit
   pageCount
  }
 }
`

export default defineEventHandler(async (event) => {
 const query = getQuery(event)
 const data = await graphqlRequest<{ receivables: unknown }>(event, receivablesQuery, {
  status: typeof query.status === 'string' ? query.status : undefined,
  page: Number(query.page) || undefined,
  limit: Number(query.limit) || undefined
 })
 return data.receivables
})
