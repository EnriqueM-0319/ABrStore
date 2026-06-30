import { graphqlRequest, saleFields } from '../../../../../utils'

const cancelSaleItemMutation = `#graphql
 mutation CancelSaleItem($id: String!, $itemId: String!, $reason: String!) {
  cancelSaleItem(id: $id, itemId: $itemId, reason: $reason) {
   ${saleFields}
  }
 }
`

export default defineEventHandler(async (event) => {
 const id = getRouterParam(event, 'id')
 const itemId = getRouterParam(event, 'itemId')
 if (!id || !itemId) throw createError({ statusCode: 400, message: 'Partida inválida.' })
 const body = await readBody(event)
 const data = await graphqlRequest<{ cancelSaleItem: unknown }>(event, cancelSaleItemMutation, {
  id,
  itemId,
  reason: String(body.reason || '').trim()
 })
 return data.cancelSaleItem
})
