import { graphqlRequest, stockExitFields } from '../../utils'

const stockExitsQuery = `#graphql
 query StockExits($page: Float, $limit: Float) {
  stockExits(page: $page, limit: $limit) {
   items { ${stockExitFields} }
   total
   page
   limit
   pageCount
  }
 }
`

export default defineEventHandler(async (event) => {
 const query = getQuery(event)
 const data = await graphqlRequest<{ stockExits: unknown }>(event, stockExitsQuery, {
  page: Number(query.page) || undefined,
  limit: Number(query.limit) || undefined
 })
 return data.stockExits
})
