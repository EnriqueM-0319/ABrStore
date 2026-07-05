import { graphqlRequest, saleFields } from '../../../utils'

const payReceivableMutation = `#graphql
 mutation PayReceivable($id: String!, $paymentMethod: PaymentMethod, $cashReceived: Float) {
  payReceivable(id: $id, paymentMethod: $paymentMethod, cashReceived: $cashReceived) {
   ${saleFields}
  }
 }
`

export default defineEventHandler(async (event) => {
 const id = getRouterParam(event, 'id')
 if (!id) throw createError({ statusCode: 400, message: 'Cuenta inválida.' })
 const body = await readBody(event)
 const data = await graphqlRequest<{ payReceivable: unknown }>(event, payReceivableMutation, {
  id,
  paymentMethod: body.paymentMethod || 'CASH',
  cashReceived: Number(body.cashReceived) || undefined
 })
 return data.payReceivable
})
