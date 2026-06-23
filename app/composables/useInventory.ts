import type { InventoryPaginatedResponse, Product } from '~/types/product'

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 10

export function useInventory() {
  const search = ref('')
  const debouncedSearch = ref('')
  const products = ref<Product[]>([])
  const page = ref(DEFAULT_PAGE)
  const limit = ref(DEFAULT_LIMIT)
  const total = ref(0)
  const pageCount = ref(1)
  const loadingInitial = ref(true)
  const refreshing = ref(false)
  const hasCachedPage = ref(false)
  const inventoryError = ref('')
  let searchTimer: ReturnType<typeof setTimeout> | undefined
  let requestId = 0

  const isInitialLoading = computed(() => loadingInitial.value && !products.value.length)
  const isRefreshing = computed(() => refreshing.value && products.value.length > 0 && !hasCachedPage.value)
  const activeCount = computed(() => products.value.filter(product => product.active).length)
  const units = computed(() => products.value.filter(product => product.active).reduce((sum, product) => sum + product.stock, 0))
  const lowStock = computed(() => products.value.filter(product => product.active && product.stock <= 5).length)
  const pageStart = computed(() => total.value ? (page.value - 1) * limit.value + 1 : 0)
  const pageEnd = computed(() => Math.min(page.value * limit.value, total.value))
  const cacheKey = computed(() => `abr_inventory_${page.value}_${limit.value}_${debouncedSearch.value || 'all'}`)

  function emptyPage() {
    products.value = []
    total.value = 0
    pageCount.value = 1
  }

  function readCachedInventory() {
    hasCachedPage.value = false
    if (!import.meta.client) return false

    const cached = localStorage.getItem(cacheKey.value)
    if (!cached) {
      emptyPage()
      return false
    }

    try {
      const response = JSON.parse(cached) as InventoryPaginatedResponse
      products.value = response.items
      total.value = response.total
      page.value = response.page
      limit.value = response.limit
      pageCount.value = response.pageCount
      hasCachedPage.value = true
      return true
    } catch {
      localStorage.removeItem(cacheKey.value)
      emptyPage()
      return false
    }
  }

  function writeCachedInventory() {
    if (!import.meta.client) return
    localStorage.setItem(cacheKey.value, JSON.stringify({
      items: products.value,
      total: total.value,
      page: page.value,
      limit: limit.value,
      pageCount: pageCount.value
    }))
  }

  async function loadInventory() {
    const currentRequest = ++requestId
    inventoryError.value = ''

    if (!products.value.length) loadingInitial.value = true
    else refreshing.value = true

    try {
      const response = await $fetch<InventoryPaginatedResponse>('/api/inventory', {
        query: {
          search: debouncedSearch.value || undefined,
          page: page.value,
          limit: limit.value
        }
      })

      if (currentRequest !== requestId) return
      products.value = response.items
      total.value = response.total
      page.value = response.page
      limit.value = response.limit
      pageCount.value = response.pageCount
      writeCachedInventory()
      hasCachedPage.value = false
    } catch (error: unknown) {
      if (currentRequest !== requestId) return
      inventoryError.value = getErrorMessage(error, 'No pudimos cargar el inventario.')
    } finally {
      if (currentRequest === requestId) {
        loadingInitial.value = false
        refreshing.value = false
      }
    }
  }

  function goToPage(nextPage: number) {
    const normalizedPage = Math.min(Math.max(Math.trunc(nextPage), 1), pageCount.value)
    if (normalizedPage === page.value) return
    page.value = normalizedPage
  }

  function updateProductInPage(product: Product) {
    products.value = products.value.map(currentProduct => currentProduct.id === product.id ? product : currentProduct)
    writeCachedInventory()
  }

  function removeProductFromPage(productId: string) {
    products.value = products.value.filter(product => product.id !== productId)
    total.value = Math.max(total.value - 1, 0)
    pageCount.value = Math.max(Math.ceil(total.value / limit.value), 1)
    if (page.value > pageCount.value) page.value = pageCount.value
    writeCachedInventory()
  }

  function loadInventoryWithCache() {
    readCachedInventory()
    void loadInventory()
  }

  watch(search, (value) => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      debouncedSearch.value = value.trim()
      page.value = DEFAULT_PAGE
    }, 250)
  })

  watch(page, loadInventoryWithCache)
  watch(debouncedSearch, () => {
    if (page.value === DEFAULT_PAGE) loadInventoryWithCache()
    else page.value = DEFAULT_PAGE
  })
  watch(limit, () => {
    if (page.value === DEFAULT_PAGE) loadInventoryWithCache()
    else page.value = DEFAULT_PAGE
  })

  onMounted(loadInventoryWithCache)
  onBeforeUnmount(() => clearTimeout(searchTimer))

  return {
    search,
    debouncedSearch,
    products,
    page,
    limit,
    total,
    pageCount,
    pageStart,
    pageEnd,
    inventoryError,
    isInitialLoading,
    isRefreshing,
    activeCount,
    units,
    lowStock,
    loadInventory,
    goToPage,
    updateProductInPage,
    removeProductFromPage
  }
}
