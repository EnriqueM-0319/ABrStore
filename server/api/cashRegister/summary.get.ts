import { cashRegisterSummaryFields, graphqlRequest } from '../../utils'

const cashRegisterSummaryQuery = `#graphql
 query CashRegisterSummary {
  cashRegisterSummary {
   ${cashRegisterSummaryFields}
  }
 }
`

export default defineEventHandler(async (event) => {
 const data = await graphqlRequest<{ cashRegisterSummary: unknown | null }>(event, cashRegisterSummaryQuery)
 return data.cashRegisterSummary
})
