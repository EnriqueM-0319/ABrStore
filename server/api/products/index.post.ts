import { graphqlRequest, productFields } from '../../utils'

const createProductMutation = `#graphql
 mutation CreateProduct($input: ProductInput!) {
  createProduct(input: $input) {
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
 const body = await readBody(event)
 const data = await graphqlRequest<{ createProduct: unknown }>(event, createProductMutation, {
  input: normalizeProductInput(body)
 })
 return data.createProduct
})
