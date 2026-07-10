import { getPositiveNumberQueryValue, getTrimmedQueryValue, graphqlRequest, productSalesReportFields } from '../../utils'

const productSalesReportQuery = `#graphql
 query ProductSalesReport($groupBy: String, $startDate: String, $endDate: String, $limit: Int) {
  productSalesReport(groupBy: $groupBy, startDate: $startDate, endDate: $endDate, limit: $limit) {
   ${productSalesReportFields}
  }
 }
`

export default defineEventHandler(async (event) => {
 setHeader(event, 'Cache-Control', 'no-store, max-age=0')
 const query = getQuery(event)
 const data = await graphqlRequest<{ productSalesReport: unknown }>(event, productSalesReportQuery, {
  groupBy: getTrimmedQueryValue(query.groupBy, 16),
  startDate: getTrimmedQueryValue(query.startDate, 10),
  endDate: getTrimmedQueryValue(query.endDate, 10),
  limit: getPositiveNumberQueryValue(query.limit)
 })
 return data.productSalesReport
})
