import { graphqlRequest, stockExitFields } from '../../utils'

const createStockExitMutation = `#graphql
 mutation CreateStockExit($productId: String!, $quantity: Float!, $reason: StockExitReason!, $note: String) {
  createStockExit(productId: $productId, quantity: $quantity, reason: $reason, note: $note) {
   ${stockExitFields}
  }
 }
`

export default defineEventHandler(async (event) => {
 const body = await readBody(event)
 const data = await graphqlRequest<{ createStockExit: unknown }>(event, createStockExitMutation, {
  productId: String(body.productId || ''),
  quantity: Number(body.quantity),
  reason: body.reason,
  note: String(body.note || '').trim() || null
 })
 return data.createStockExit
})
