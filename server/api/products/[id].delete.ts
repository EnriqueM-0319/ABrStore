import { graphqlRequest } from '../../utils'

const deleteProductMutation = `#graphql
 mutation DeleteProduct($id: String!, $permanent: Boolean) {
  deleteProduct(id: $id, permanent: $permanent) {
   ok
  }
 }
`

export default defineEventHandler(async (event) => {
 const query = getQuery(event)
 const id = getRouterParam(event, 'id')
 if (!id) throw createError({ statusCode: 400, message: 'Producto inválido.' })
 const data = await graphqlRequest<{ deleteProduct: { ok: boolean } }>(event, deleteProductMutation, {
  id,
  permanent: query.permanent === 'true'
 })
 return data.deleteProduct
})
