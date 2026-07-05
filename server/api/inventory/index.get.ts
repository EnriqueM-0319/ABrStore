import { graphqlRequest, productFields } from '../../utils'

const inventoryQuery = `#graphql
 query Inventory($search: String, $lowStock: Boolean, $page: Float, $limit: Float) {
  inventory(search: $search, lowStock: $lowStock, page: $page, limit: $limit) {
   items { ${productFields} }
   total
   page
   limit
   pageCount
  }
 }
`

export default defineEventHandler(async (event) => {
 const query = getQuery(event)
 const search = typeof query.search === 'string' ? query.search.trim().slice(0, 80) : ''
 const data = await graphqlRequest<{ inventory: unknown }>(event, inventoryQuery, {
  search,
  lowStock: query.lowStock === 'true',
  page: Number(query.page) || undefined,
  limit: Number(query.limit) || undefined
 })
 return data.inventory
})
