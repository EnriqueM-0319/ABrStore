import { cashRegisterSummaryFields, graphqlRequest } from '../../utils'

const cashRegisterSummaryQuery = `#graphql
 query CashRegisterSummary {
  cashRegisterSummary {
   ${cashRegisterSummaryFields}
  }
 }
`

export default defineEventHandler(async (event) => {
 setHeader(event, 'Cache-Control', 'no-store, max-age=0')
 const data = await graphqlRequest<{ cashRegisterSummary: unknown | null }>(event, cashRegisterSummaryQuery)
 return data.cashRegisterSummary
})
