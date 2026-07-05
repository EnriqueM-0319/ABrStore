import { graphqlRequest } from '../../utils'

const deleteHeldTicketMutation = `#graphql
 mutation DeleteHeldTicket($id: String!) {
  deleteHeldTicket(id: $id) {
   ok
  }
 }
`

export default defineEventHandler(async (event) => {
 const id = getRouterParam(event, 'id')
 if (!id) throw createError({ statusCode: 400, message: 'Ticket inválido.' })
 const data = await graphqlRequest<{ deleteHeldTicket: { ok: boolean } }>(event, deleteHeldTicketMutation, { id })
 return data.deleteHeldTicket
})
