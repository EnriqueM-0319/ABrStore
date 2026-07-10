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

function stockLabel(product: Product) {
 return `${product.stock} ${product.unit === 'KILOGRAM' ? 'kg' : 'pzas'}`
}

function productRows(products: Product[]) {
 return products.map(product => [
  `="${product.sku.replaceAll('"', '""')}"`,
  product.name,
  product.description ?? '',
  product.unit === 'KILOGRAM' ? 'Kilo' : 'Pieza',
  product.stock,
  product.costPrice ?? '',
  product.price
 ])
}

function textTitle(scope: typeof exportScopes[number]) {
 if (scope === 'low-stock') return 'Checklist de productos con bajo stock'
 if (scope === 'selected') return 'Checklist de productos seleccionados'
 return 'Productos'
}

function checklistText(products: Product[], scope: typeof exportScopes[number]) {
 const date = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date())
 const lines = [
  textTitle(scope),
  `Generado: ${date}`,
  '',
  ...products.map(product => [
   `[ ] ${product.name}`,
   `    SKU: ${product.sku}`,
   `    Descripcion: ${product.description || 'Sin descripcion'}`,
   `    Existencia: ${stockLabel(product)}`,
   `    Precio publico: ${product.price}`,
   ''
  ].join('\n'))
 ]

 return lines.join('\n')
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
  .sort((first, second) => first.stock - second.stock || first.name.localeCompare(second.name) || first.sku.localeCompare(second.sku))

 if (scope === 'low-stock' || scope === 'selected') {
  const fileScope = scope === 'low-stock' ? 'bajo-stock' : 'seleccionados'
  const fileName = `productos-${fileScope}-${new Date().toISOString().slice(0, 10)}.txt`
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="${fileName}"`)

  return checklistText(products, scope)
 }

 const headers = ['SKU', 'Producto', 'Descripción', 'Unidad', 'Existencia', 'Costo unitario', 'Precio público']
 const rows = productRows(products)

 const csv = [
  headers.map(csvCell).join(','),
  ...rows.map(row => row.map(csvCell).join(','))
 ].join('\n')

 const fileName = `productos-${scope}-${new Date().toISOString().slice(0, 10)}.csv`
 setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
 setHeader(event, 'Content-Disposition', `attachment; filename="${fileName}"`)

 return `\uFEFF${csv}`
})
