import { graphqlRequest, saleFields } from '../../../utils'

const cancelSaleMutation = `#graphql
 mutation CancelSale($id: String!, $reason: String!) {
  cancelSale(id: $id, reason: $reason) {
   ${saleFields}
  }
 }
`

export default defineEventHandler(async (event) => {
 const id = getRouterParam(event, 'id')
 if (!id) throw createError({ statusCode: 400, message: 'Ticket inválido.' })
 const body = await readBody(event)
 const data = await graphqlRequest<{ cancelSale: unknown }>(event, cancelSaleMutation, {
  id,
  reason: String(body.reason || '').trim()
 })
 return data.cancelSale
})
