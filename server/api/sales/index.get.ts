import { graphqlRequest, saleFields } from '../../utils'

const salesQuery = `#graphql
 query Sales($page: Float, $limit: Float, $startDate: String, $endDate: String, $folio: Float) {
  sales(page: $page, limit: $limit, startDate: $startDate, endDate: $endDate, folio: $folio) {
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
 const data = await graphqlRequest<{ sales: unknown }>(event, salesQuery, {
  page: Number(query.page) || undefined,
  limit: Number(query.limit) || undefined,
  startDate: typeof query.startDate === 'string' ? query.startDate : undefined,
  endDate: typeof query.endDate === 'string' ? query.endDate : undefined,
  folio: Number(query.folio) || undefined
 })
 return data.sales
})
