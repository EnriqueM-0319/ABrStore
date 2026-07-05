import { graphqlRequest, saleFields } from '../../utils'

const createSaleMutation = `#graphql
 mutation CreateSale($input: CreateSaleInput!) {
  createSale(input: $input) {
   ${saleFields}
  }
 }
`

export default defineEventHandler(async (event) => {
 const body = await readBody(event)
 const data = await graphqlRequest<{ createSale: unknown }>(event, createSaleMutation, {
  input: {
   items: Array.isArray(body.items) ? body.items : [],
   paymentMethod: body.paymentMethod || 'CASH',
   cashReceived: Number(body.cashReceived) || undefined,
   creditCustomerName: body.creditCustomerName || undefined,
   creditNote: body.creditNote || undefined
  }
 })
 return data.createSale
})
