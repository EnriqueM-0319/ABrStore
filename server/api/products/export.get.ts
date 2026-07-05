import { graphqlRequest, productFields } from '../../utils'
import type { Product } from '../../../app/types'

const inventoryExportQuery = `#graphql
 query InventoryExport($lowStock: Boolean) {
  inventory(lowStock: $lowStock, page: 1, limit: 50) {
   items { ${productFields} }
  }
 }
`

const manageProductsExportQuery = `#graphql
 query ManageProductsExport {
  manageProducts {
   ${productFields}
  }
 }
`

const exportScopes = ['all', 'low-stock', 'selected'] as const

function csvCell(value: unknown) {
 const text = String(value ?? '')
 return `"${text.replaceAll('"', '""')}"`
}

function normalizeIds(value: unknown) {
 if (Array.isArray(value)) return value.flatMap(normalizeIds)
 if (typeof value !== 'string') return []
 return value.split(',').map(id => id.trim()).filter(Boolean)
}

export default defineEventHandler(async (event) => {
 const query = getQuery(event)
 const requestedScope = typeof query.scope === 'string' ? query.scope : 'all'
 const scope = exportScopes.includes(requestedScope as typeof exportScopes[number])
  ? requestedScope as typeof exportScopes[number]
  : 'all'
 const ids = [...new Set(normalizeIds(query.ids))]

 if (scope === 'selected' && !ids.length) {
  throw createError({ statusCode: 400, message: 'Selecciona al menos un producto para exportar.' })
 }

 const data = scope === 'low-stock'
  ? await graphqlRequest<{ inventory: { items: Product[] } }>(event, inventoryExportQuery, { lowStock: true })
  : await graphqlRequest<{ manageProducts: Product[] }>(event, manageProductsExportQuery)

 const products = (scope === 'low-stock' ? data.inventory.items : data.manageProducts)
  .filter(product => scope !== 'selected' || ids.includes(product.id))

 const headers = ['SKU', 'Producto', 'Descripción', 'Unidad', 'Existencia', 'Costo unitario', 'Precio público']
 const rows = products.map(product => [
  `="${product.sku.replaceAll('"', '""')}"`,
  product.name,
  product.description ?? '',
  product.unit === 'KILOGRAM' ? 'Kilo' : 'Pieza',
  product.stock,
  product.costPrice ?? '',
  product.price
 ])

 const csv = [
  headers.map(csvCell).join(','),
  ...rows.map(row => row.map(csvCell).join(','))
 ].join('\n')

 const fileName = `productos-${scope}-${new Date().toISOString().slice(0, 10)}.csv`
 setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
 setHeader(event, 'Content-Disposition', `attachment; filename="${fileName}"`)

 return `\uFEFF${csv}`
})
