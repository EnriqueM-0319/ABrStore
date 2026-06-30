import { cashRegisterSessionFields, graphqlRequest } from '../../utils'

const currentCashRegisterQuery = `#graphql
 query CurrentCashRegister {
  currentCashRegister {
   ${cashRegisterSessionFields}
  }
 }
`

export default defineEventHandler(async (event) => {
 const data = await graphqlRequest<{ currentCashRegister: unknown | null }>(event, currentCashRegisterQuery)
 return data.currentCashRegister
})
