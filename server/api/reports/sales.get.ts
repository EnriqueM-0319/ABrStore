import { graphqlRequest, salesReportFields } from '../../utils'

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
  groupBy: typeof query.groupBy === 'string' ? query.groupBy : undefined,
  startDate: typeof query.startDate === 'string' ? query.startDate : undefined,
  endDate: typeof query.endDate === 'string' ? query.endDate : undefined
 })
 return data.salesReport
})
