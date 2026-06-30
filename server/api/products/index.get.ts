import { graphqlRequest, productFields } from '../../utils'

const productsQuery = `#graphql
 query Products($search: String) {
  products(search: $search) {
   ${productFields}
  }
 }
`

export default defineEventHandler(async (event) => {
 const query = getQuery(event)
 const search = typeof query.search === 'string' ? query.search.trim().slice(0, 80) : ''
 const data = await graphqlRequest<{ products: unknown[] }>(event, productsQuery, { search })
 return data.products
})
