import { graphqlRequest, productFields } from '../../utils'

const updateProductMutation = `#graphql
 mutation UpdateProduct($id: String!, $input: ProductInput!) {
  updateProduct(id: $id, input: $input) {
   ${productFields}
  }
 }
`

function normalizeProductInput(body: Record<string, unknown>) {
 return {
  sku: String(body.sku || '').trim().toUpperCase(),
  name: String(body.name || '').trim(),
  description: String(body.description || '').trim() || null,
  costPrice: Number(body.costPrice),
  profitMargin: Number(body.profitMargin),
  price: Number(body.price),
  unit: body.unit === 'KILOGRAM' ? 'KILOGRAM' : 'PIECE',
  stock: Number(body.stock),
  active: typeof body.active === 'boolean' ? body.active : undefined
 }
}

export default defineEventHandler(async (event) => {
 const id = getRouterParam(event, 'id')
 if (!id) throw createError({ statusCode: 400, message: 'Producto inválido.' })
 const body = await readBody(event)
 const data = await graphqlRequest<{ updateProduct: unknown }>(event, updateProductMutation, {
  id,
  input: normalizeProductInput(body)
 })
 return data.updateProduct
})
