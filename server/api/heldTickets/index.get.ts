import { graphqlRequest, heldTicketFields } from '../../utils'

const heldTicketsQuery = `#graphql
 query HeldTickets {
  heldTickets {
   ${heldTicketFields}
  }
 }
`

export default defineEventHandler(async (event) => {
 const data = await graphqlRequest<{ heldTickets: unknown[] }>(event, heldTicketsQuery)
 return data.heldTickets
})
