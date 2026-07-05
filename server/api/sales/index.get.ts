import { getPositiveNumberQueryValue, getTrimmedQueryValue, graphqlRequest, saleFields } from '../../utils'

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
  page: getPositiveNumberQueryValue(query.page),
  limit: getPositiveNumberQueryValue(query.limit),
  startDate: getTrimmedQueryValue(query.startDate, 10),
  endDate: getTrimmedQueryValue(query.endDate, 10),
  folio: getPositiveNumberQueryValue(query.folio)
 })
 return data.sales
})
