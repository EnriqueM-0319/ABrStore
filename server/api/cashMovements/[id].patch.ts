import { cashMovementFields, graphqlRequest } from '../../utils'

const updateCashMovementMutation = `#graphql
 mutation UpdateCashMovement($id: String!, $input: UpdateCashMovementInput!) {
  updateCashMovement(id: $id, input: $input) {
   ${cashMovementFields}
  }
 }
`

export default defineEventHandler(async (event) => {
 const id = getRouterParam(event, 'id') || ''
 const body = await readBody(event)
 const amount = Number(body.amount)
 const data = await graphqlRequest<{ updateCashMovement: unknown }>(event, updateCashMovementMutation, {
  id,
  input: { amount }
 })

 return data.updateCashMovement
})
