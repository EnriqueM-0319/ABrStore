import { graphqlRequest, productFields } from '../../utils'

const manageProductsQuery = `#graphql
 query ManageProducts {
  manageProducts {
   ${productFields}
  }
 }
`

export default defineEventHandler(async (event) => {
 const data = await graphqlRequest<{ manageProducts: unknown[] }>(event, manageProductsQuery)
 return data.manageProducts
})
