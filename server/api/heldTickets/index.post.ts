import { graphqlRequest, heldTicketFields } from '../../utils'

type HeldTicketRequestItem = {
 productId?: unknown
 quantity?: unknown
 manual?: unknown
 name?: unknown
 price?: unknown
 unit?: unknown
}

const createHeldTicketMutation = `#graphql
 mutation CreateHeldTicket($input: CreateSaleInput!, $note: String) {
  createHeldTicket(input: $input, note: $note) {
   ${heldTicketFields}
  }
 }
`

export default defineEventHandler(async (event) => {
 const body = await readBody(event)
 const items = Array.isArray(body.items) ? body.items as HeldTicketRequestItem[] : []
 const note = String(body.note || '').trim().slice(0, 120) || null
 const requestedPaymentMethod = typeof body.paymentMethod === 'string' ? body.paymentMethod : ''
 const paymentMethod = ['CASH', 'CARD', 'TRANSFER'].includes(requestedPaymentMethod) ? requestedPaymentMethod : 'CASH'

 const requestedItems = items.map(item => ({
 productId: String(item.productId || ''),
 quantity: Number(item.quantity),
 manual: item.manual === true,
 name: String(item.name || '').trim().slice(0, 80),
 price: Number(item.price),
 unit: item.unit === 'KILOGRAM' ? 'KILOGRAM' as const : 'PIECE' as const
 }))

 const data = await graphqlRequest<{ createHeldTicket: unknown }>(event, createHeldTicketMutation, {
  input: { items: requestedItems, paymentMethod },
  note
 })
 return data.createHeldTicket
})
