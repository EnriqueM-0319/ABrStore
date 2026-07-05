import { cashRegisterSessionFields, graphqlRequest } from '../../utils'

const openCashRegisterMutation = `#graphql
 mutation OpenCashRegister($input: OpenCashRegisterInput!) {
  openCashRegister(input: $input) {
   ${cashRegisterSessionFields}
  }
 }
`

export default defineEventHandler(async (event) => {
 const body = await readBody(event)
 const openingAmount = Number(body.openingAmount)
 const notes = String(body.notes || '').trim() || null
 const data = await graphqlRequest<{ openCashRegister: unknown }>(event, openCashRegisterMutation, {
  input: { openingAmount, notes }
 })

 return data.openCashRegister
})
