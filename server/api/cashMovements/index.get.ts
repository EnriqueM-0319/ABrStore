import { cashMovementFields, graphqlRequest } from '../../utils'

const cashMovementsQuery = `#graphql
 query CashMovements($currentOnly: Boolean, $page: Float, $limit: Float) {
  cashMovements(currentOnly: $currentOnly, page: $page, limit: $limit) {
   items { ${cashMovementFields} }
   total
   page
   limit
   pageCount
  }
 }
`

export default defineEventHandler(async (event) => {
 const query = getQuery(event)
 const data = await graphqlRequest<{ cashMovements: unknown }>(event, cashMovementsQuery, {
  currentOnly: query.currentOnly !== 'false',
  page: Number(query.page) || undefined,
  limit: Number(query.limit) || undefined
 })
 return data.cashMovements
})
