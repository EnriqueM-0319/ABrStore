import { getPositiveNumberQueryValue, getTrimmedQueryValue, graphqlRequest, saleFields } from '../../utils'

const receivablesQuery = `#graphql
 query Receivables($status: String, $page: Float, $limit: Float, $search: String) {
  receivables(status: $status, page: $page, limit: $limit, search: $search) {
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
  status: getTrimmedQueryValue(query.status, 24),
  page: getPositiveNumberQueryValue(query.page),
  limit: getPositiveNumberQueryValue(query.limit),
  search: getTrimmedQueryValue(query.search, 80)
 })
 return data.receivables
})
