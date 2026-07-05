import { cashMovementFields, graphqlRequest } from '../../utils'

const createCashMovementMutation = `#graphql
 mutation CreateCashMovement($input: CreateCashMovementInput!) {
  createCashMovement(input: $input) {
   ${cashMovementFields}
  }
 }
`

export default defineEventHandler(async (event) => {
 const body = await readBody(event)
 const type = String(body.type || '')
 const amount = Number(body.amount)
 const description = String(body.description || '').trim()
 const data = await graphqlRequest<{ createCashMovement: unknown }>(event, createCashMovementMutation, {
  input: { type, amount, description }
 })

 return data.createCashMovement
})
