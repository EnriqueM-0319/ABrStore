import { getTrimmedQueryValue, graphqlRequest, salesReportFields } from '../../utils'

const salesReportQuery = `#graphql
 query SalesReport($groupBy: String, $startDate: String, $endDate: String) {
  salesReport(groupBy: $groupBy, startDate: $startDate, endDate: $endDate) {
   ${salesReportFields}
  }
 }
`

export default defineEventHandler(async (event) => {
 const query = getQuery(event)
 const data = await graphqlRequest<{ salesReport: unknown }>(event, salesReportQuery, {
  groupBy: getTrimmedQueryValue(query.groupBy, 16),
  startDate: getTrimmedQueryValue(query.startDate, 10),
  endDate: getTrimmedQueryValue(query.endDate, 10)
 })
 return data.salesReport
})
