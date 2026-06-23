export type Product = {
  id: string
  sku: string
  name: string
  description: string | null
  costPrice?: number
  profitMargin?: number
  price: number
  stock: number
  unit: 'PIECE' | 'KILOGRAM'
  active?: boolean
}

export type CartItem = Product & {
  quantity: number
}

export type InventoryPaginatedResponse = {
  items: Product[]
  total: number
  page: number
  limit: number
  pageCount: number
}
