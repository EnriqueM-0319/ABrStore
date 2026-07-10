import { cashRegisterSessionFields, cashRegisterSummaryFields, graphqlRequest } from '../../utils'

const closeCashRegisterMutation = `#graphql
 mutation CloseCashRegister($input: CloseCashRegisterInput!) {
  closeCashRegister(input: $input) {
   session { ${cashRegisterSessionFields} }
   summary { ${cashRegisterSummaryFields} }
  }
 }
`

export default defineEventHandler(async (event) => {
 setHeader(event, 'Cache-Control', 'no-store, max-age=0')
 const body = await readBody(event)
 const closingAmount = Number(body.closingAmount)
 const notes = String(body.notes || '').trim() || null
 const data = await graphqlRequest<{ closeCashRegister: unknown }>(event, closeCashRegisterMutation, {
  input: { closingAmount, notes }
 })

 return data.closeCashRegister
})
