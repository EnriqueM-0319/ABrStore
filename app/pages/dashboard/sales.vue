<script setup lang="ts">
import type { CartItem, Product, PaymentMethod, SaleTicket, HeldTicket } from '~/types'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Nueva venta' })

const search = ref('')
const debouncedSearch = ref('')
const cart = ref<CartItem[]>([])
const quantityDrafts = ref<Record<string, string>>({})
const paymentMethod = ref<PaymentMethod>('CASH')
const cashReceived = ref('')
const creditCustomerName = ref('')
const creditNote = ref('')
const checkoutLoading = ref(false)
const holdingTicket = ref(false)
const scanningProduct = ref(false)
const heldTicketNote = ref('')
const checkoutError = ref('')
const heldTicketError = ref('')
const ticket = ref<SaleTicket | null>(null)
const ticketOpen = ref(false)
const productSearchInput = ref<{ $el?: HTMLElement } | null>(null)
const manualProductOpen = ref(false)
const manualProductForm = reactive({
 name: '',
 price: '',
 unit: 'PIECE' as Product['unit']
})
const toast = useToast()
let searchTimer: ReturnType<typeof setTimeout> | undefined

watch(search, (value) => {
 clearTimeout(searchTimer)
 searchTimer = setTimeout(() => {
 debouncedSearch.value = value.trim()
 }, 250)
})

const { data: products, status, error, refresh } = useFetch<Product[]>('/api/products', {
 query: { search: debouncedSearch },
 default: () => [],
 lazy: true,
 server: false,
 watch: [debouncedSearch]
})
const { cashSession, status: cashStatus, init: initCashSession, refresh: refreshCashSession } = useCurrentCashSession()
const cashSessionId = computed(() => cashSession.value?.id ?? null)
const {
 init: initHeldTickets,
 refresh: refreshHeldTickets,
 upsertTicket
} = useHeldTickets(cashSessionId)
const { consumeRecoveredTicket } = useRecoveredHeldTicket()

onBeforeUnmount(() => clearTimeout(searchTimer))
onMounted(async () => {
 await initCashSession()
 await initHeldTickets()
 applyRecoveredTicket()
 focusProductSearch()
})
watch(cashSessionId, () => {
 void initHeldTickets()
})
watch([manualProductOpen, ticketOpen], ([manualOpen, saleTicketOpen]) => {
 if (!manualOpen && !saleTicketOpen) focusProductSearch()
})

const itemCount = computed(() => cart.value.reduce((sum, item) => sum + item.quantity, 0))
const total = computed(() => cart.value.reduce((sum, item) => sum + item.price * item.quantity, 0))
const hasChargeableCart = computed(() => cart.value.length > 0 && cart.value.every(item => item.quantity > 0) && total.value > 0)
const paymentTotal = computed(() => shouldRoundPaymentMethod(paymentMethod.value) ? roundPayableTotal(total.value) : total.value)
const cashReceivedAmount = computed(() => Number(cashReceived.value))
const changeDue = computed(() => paymentMethod.value === 'CASH' && Number.isFinite(cashReceivedAmount.value) ? Math.max(cashReceivedAmount.value - paymentTotal.value, 0) : 0)
const cashReceivedIsInsufficient = computed(() => paymentMethod.value === 'CASH' && hasChargeableCart.value && (!Number.isFinite(cashReceivedAmount.value) || cashReceivedAmount.value < paymentTotal.value))
const creditCustomerIsMissing = computed(() => paymentMethod.value === 'CREDIT' && hasChargeableCart.value && creditCustomerName.value.trim().length < 2)
const isInitialSearchLoading = computed(() => status.value === 'pending' && Boolean(debouncedSearch.value) && !products.value.length)
const isSearching = computed(() => status.value === 'pending' && Boolean(debouncedSearch.value) && products.value.length > 0)
const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const dateTime = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
const cashIsLoading = computed(() => cashStatus.value === 'pending')
const checkoutLabel = computed(() => {
 if (cashIsLoading.value) return 'Verificando caja'
 if (cart.value.length && !hasChargeableCart.value) return 'Falta importe o cantidad'
 if (paymentMethod.value === 'CASH' && cashReceivedIsInsufficient.value) return 'Falta efectivo recibido'
 if (creditCustomerIsMissing.value) return 'Falta nombre de cliente'
 return cashSession.value ? 'Cobrar venta' : 'Iniciar caja para vender'
})
const paymentMethodOptions: Array<{ label: string, value: PaymentMethod }> = [
 { label: 'Efectivo', value: 'CASH' },
 { label: 'Tarjeta', value: 'CARD' },
 { label: 'Transferencia', value: 'TRANSFER' },
 { label: 'Fiado', value: 'CREDIT' }
]
const manualUnitOptions: Array<{ label: string, value: Product['unit'] }> = [
 { label: 'Pieza', value: 'PIECE' },
 { label: 'Kilo', value: 'KILOGRAM' }
]

function addProduct(product: Product) {
 const existing = cart.value.find(item => item.id === product.id)
 if (existing) {
 if (existing.unit === 'PIECE') setQuantity(existing, existing.quantity + getQuantityStep(existing))
 clearProductSearch()
 return
 }
 const quantity = product.unit === 'KILOGRAM' ? 0 : 1
 cart.value.push({ ...product, quantity })
 quantityDrafts.value[product.id] = formatQuantityDraft({ ...product, quantity })
 clearProductSearch()
}

async function addScannedProduct() {
 const scannedCode = search.value.trim()
 if (!scannedCode || scanningProduct.value) return

 scanningProduct.value = true
 clearTimeout(searchTimer)
 debouncedSearch.value = scannedCode

 try {
 const normalizedCode = scannedCode.toUpperCase()
 const currentMatch = products.value.find(product => product.sku.toUpperCase() === normalizedCode)
 if (currentMatch) {
 addProduct(currentMatch)
 return
 }

 const matches = await $fetch<Product[]>('/api/products', {
 query: { search: scannedCode }
 })
 const exactMatch = matches.find(product => product.sku.toUpperCase() === normalizedCode)
 const productToAdd = exactMatch || (matches.length === 1 ? matches[0] : null)

 if (!productToAdd) {
 products.value = matches
 toast.add({ title: 'Producto no encontrado', description: `No encontramos un producto exacto para ${scannedCode}.`, color: 'warning', icon: 'i-lucide-scan-barcode' })
 return
 }

 addProduct(productToAdd)
 } catch (error: unknown) {
 toast.add({ title: 'No se pudo leer el código', description: getErrorMessage(error, 'Inténtalo de nuevo.'), color: 'error', icon: 'i-lucide-circle-alert' })
 } finally {
 scanningProduct.value = false
 }
}

function clearProductSearch() {
 clearTimeout(searchTimer)
 search.value = ''
 debouncedSearch.value = ''
 products.value = []
 focusProductSearch()
}

function focusProductSearch() {
 if (!import.meta.client || manualProductOpen.value || ticketOpen.value) return

 void nextTick(() => {
 const input = productSearchInput.value?.$el?.querySelector('input')
 input?.focus()
 })
}

function keepScannerFocus() {
 if (!import.meta.client) return

 window.setTimeout(() => {
 const activeElement = document.activeElement
 const shouldRecoverFocus = !activeElement || activeElement === document.body || activeElement.id === 'main-content'
 if (shouldRecoverFocus) focusProductSearch()
 }, 80)
}

function getQuantityStep(item: CartItem) {
 return item.unit === 'KILOGRAM' ? 0.001 : 1
}

function setQuantity(item: CartItem, quantity: number) {
 if (quantity <= 0) {
 cart.value = cart.value.filter(current => current.id !== item.id)
 const { [item.id]: _removedDraft, ...remainingDrafts } = quantityDrafts.value
 quantityDrafts.value = remainingDrafts
 return
 }
 const normalized = item.unit === 'KILOGRAM' ? Math.round(quantity * 1000) / 1000 : Math.round(quantity)
 item.quantity = Math.min(normalized, item.stock)
 quantityDrafts.value[item.id] = formatQuantityDraft(item)
}

function updateQuantity(item: CartItem, value: string | number) {
 quantityDrafts.value[item.id] = String(value)
 if (value === '') return

 const numericValue = Number(value)
 if (!Number.isFinite(numericValue) || numericValue <= 0) return

 if (item.unit === 'KILOGRAM') {
 const maxAmount = item.stock * item.price
 const amount = Math.min(numericValue, maxAmount)
 item.quantity = Math.min(Math.round((amount / item.price) * 1000) / 1000, item.stock)
 return
 }

 const normalized = Math.round(numericValue)
 item.quantity = Math.min(normalized, item.stock)
}

function commitQuantity(item: CartItem) {
 const draft = quantityDrafts.value[item.id]
 const numericValue = Number(draft)
 if (!draft || !Number.isFinite(numericValue) || numericValue <= 0) {
 quantityDrafts.value[item.id] = formatQuantityDraft(item)
 return
 }

 if (item.unit === 'KILOGRAM') {
 const maxAmount = item.stock * item.price
 const amount = Math.min(numericValue, maxAmount)
 item.quantity = Math.min(Math.round((amount / item.price) * 1000) / 1000, item.stock)
 quantityDrafts.value[item.id] = formatQuantityDraft(item)
 return
 }

 setQuantity(item, numericValue)
}

function formatQuantityDraft(item: CartItem) {
 if (item.unit === 'KILOGRAM') return item.quantity > 0 ? (item.price * item.quantity).toFixed(2) : ''
 return String(Math.round(item.quantity))
}

function clearCart() {
 cart.value = []
 quantityDrafts.value = {}
 focusProductSearch()
}

function removeCartItem(item: CartItem) {
 cart.value = cart.value.filter(current => current.id !== item.id)
 const { [item.id]: _removedDraft, ...remainingDrafts } = quantityDrafts.value
 quantityDrafts.value = remainingDrafts
 toast.add({
 title: 'Producto retirado',
 description: `${item.name} salió del ticket.`,
 color: 'neutral',
 icon: 'i-lucide-trash-2'
 })
 focusProductSearch()
}

function applyRecoveredTicket() {
 const recoveredTicket = consumeRecoveredTicket()
 if (!recoveredTicket) return

 const recoveredItems = recoveredTicket.items.map((item) => {
 const product = item.product
 const cartItem: CartItem = product
 ? {
 id: product.id,
 sku: product.sku,
 name: product.name,
 description: product.description,
 price: product.price,
 stock: product.stock,
 unit: product.unit,
 active: product.active,
 quantity: item.quantity
 }
 : {
 id: `manual-${item.id}`,
 sku: item.sku,
 name: item.name,
 description: item.description || 'Venta sin código',
 price: item.unitPrice,
 stock: 1,
 unit: item.unit,
 active: true,
 quantity: item.quantity,
 isManual: true
 }

 return cartItem
 })

 cart.value = recoveredItems
 quantityDrafts.value = recoveredItems.reduce<Record<string, string>>((drafts, item) => {
 drafts[item.id] = formatQuantityDraft(item)
 return drafts
 }, {})
 paymentMethod.value = recoveredTicket.paymentMethod
 heldTicketNote.value = recoveredTicket.note || ''

 toast.add({
 title: 'Ticket cargado',
 description: 'Puedes continuar la venta desde el punto de venta.',
 color: 'success',
 icon: 'i-lucide-shopping-cart'
 })
 focusProductSearch()
}

function addManualProduct() {
 const name = manualProductForm.name.trim()
 const price = Number(manualProductForm.price)

 if (name.length < 2) {
 toast.add({ title: 'Agrega el nombre', description: 'Indica qué producto se está vendiendo sin código.', color: 'warning', icon: 'i-lucide-circle-alert' })
 return
 }
 if (!Number.isFinite(price) || price <= 0) {
 toast.add({ title: 'Precio inválido', description: 'El precio debe ser mayor a cero.', color: 'warning', icon: 'i-lucide-circle-alert' })
 return
 }

 const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
 const item: CartItem = {
 id,
 sku: 'SIN-CODIGO',
 name,
 description: 'Venta sin código',
 price: Math.round(price * 100) / 100,
 stock: 1,
 unit: manualProductForm.unit,
 active: true,
 quantity: 1,
 isManual: true
 }

 cart.value.push(item)
 quantityDrafts.value[id] = '1'
 manualProductForm.name = ''
 manualProductForm.price = ''
 manualProductForm.unit = 'PIECE'
 manualProductOpen.value = false
 toast.add({ title: 'Producto agregado', description: 'Se agregó como venta sin código al ticket.', color: 'success', icon: 'i-lucide-badge-plus' })
 focusProductSearch()
}

function getSaleRequestItems() {
 return cart.value.map(item => item.isManual
 ? {
 manual: true,
 name: item.name,
 price: item.price,
 unit: item.unit
 }
 : {
 productId: item.id,
 quantity: item.quantity
 })
}

function paymentMethodLabel(method: PaymentMethod) {
 const option = paymentMethodOptions.find(item => item.value === method)
 return option?.label ?? 'Efectivo'
}

function shouldRoundPaymentMethod(method: PaymentMethod) {
 return method === 'CASH' || method === 'CARD'
}

function roundPayableTotal(value: number) {
 const pesos = Math.floor(value)
 const cents = Math.round((value - pesos) * 100)
 if (cents < 50) return pesos
 if (cents === 50) return pesos + 0.5
 return pesos + 1
}

watch(paymentMethod, (method) => {
 if (method !== 'CASH') cashReceived.value = ''
 if (method !== 'CREDIT') {
 creditCustomerName.value = ''
 creditNote.value = ''
 }
})

async function checkoutSale() {
 if (!cashSession.value) {
 await navigateTo('/dashboard/cashRegister?section=start')
 return
 }
 if (!hasChargeableCart.value || checkoutLoading.value) {
 checkoutError.value = 'Agrega productos con importe o cantidad válida antes de cobrar.'
 return
 }
 if (cashReceivedIsInsufficient.value) {
 checkoutError.value = 'El efectivo recibido debe cubrir el total de la venta.'
 return
 }
 if (creditCustomerIsMissing.value) {
 checkoutError.value = 'Indica a quién pertenece la cuenta por cobrar.'
 return
 }

 checkoutLoading.value = true
 checkoutError.value = ''

 try {
 for (const item of cart.value) commitQuantity(item)
 const sale = await $fetch<SaleTicket>('/api/sales', {
 method: 'POST',
 body: {
 paymentMethod: paymentMethod.value,
 cashReceived: paymentMethod.value === 'CASH' ? cashReceivedAmount.value : null,
 creditCustomerName: paymentMethod.value === 'CREDIT' ? creditCustomerName.value : null,
 creditNote: paymentMethod.value === 'CREDIT' ? creditNote.value : null,
 items: getSaleRequestItems()
 }
 })

 ticket.value = sale
 ticketOpen.value = true
 clearCart()
 cashReceived.value = ''
 creditCustomerName.value = ''
 creditNote.value = ''
 await Promise.all([refresh(), refreshCashSession({ force: true }), refreshHeldTickets({ force: true })])
 } catch (error: unknown) {
 checkoutError.value = getErrorMessage(error, 'No pudimos cobrar la venta.')
 } finally {
 checkoutLoading.value = false
 }
}

async function holdCurrentTicket() {
 if (!cashSession.value) {
 await navigateTo('/dashboard/cashRegister?section=start')
 return
 }
 if (!hasChargeableCart.value || holdingTicket.value) return

 holdingTicket.value = true
 heldTicketError.value = ''

 try {
 for (const item of cart.value) commitQuantity(item)
 const ticket = await $fetch<HeldTicket>('/api/heldTickets', {
 method: 'POST',
 body: {
 note: heldTicketNote.value,
 paymentMethod: paymentMethod.value,
 items: getSaleRequestItems()
 }
 })
 clearCart()
 cashReceived.value = ''
 heldTicketNote.value = ''
 upsertTicket(ticket)
 toast.add({ title: 'Ticket guardado', description: `${ticket.items.length} partidas quedaron en espera.`, color: 'success', icon: 'i-lucide-bookmark-plus' })
 void refreshHeldTickets({ force: true })
 } catch (error: unknown) {
 heldTicketError.value = getErrorMessage(error, 'No pudimos guardar el ticket.')
 toast.add({ title: 'No se pudo guardar', description: heldTicketError.value, color: 'error', icon: 'i-lucide-circle-alert' })
 } finally {
 holdingTicket.value = false
 }
}

</script>

<template>
 <DashboardShell eyebrow="Punto de venta" title="Nueva venta" hide-header>
 <div class="mx-auto max-w-[1600px] p-3 sm:p-4">
 <div class="grid gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(21rem,.55fr)]">
 <section aria-labelledby="catalog-title">
 <div class="mb-2 flex items-end justify-between gap-3">
 <div>
 <h2 id="catalog-title" class="text-lg font-bold tracking-tight">Buscar productos</h2>
 <p class="mt-0.5 text-xs text-[#758079]">Escanea código de barras o busca por nombre/SKU.</p>
 </div>
 </div>

 <div class="relative z-30">
 <UInput
 ref="productSearchInput"
 v-model="search" icon="i-lucide-search" size="lg" color="neutral" variant="outline"
 placeholder="Escanea o escribe un producto…" aria-label="Escanear o buscar productos" autocomplete="off" class="w-full"
 :ui="{ base: 'rounded-xl bg-white text-slate-950 dark:bg-slate-800 dark:text-slate-100' }"
 :loading="scanningProduct"
 @keydown.enter.prevent="addScannedProduct"
 @blur="keepScannerFocus"
 >
 <template v-if="search" #trailing>
 <UButton icon="i-lucide-x" color="neutral" variant="link" size="sm" aria-label="Limpiar búsqueda" @click="clearProductSearch" />
 </template>
 </UInput>

 <div
 v-if="debouncedSearch || isInitialSearchLoading || isSearching || error"
 class="absolute left-0 right-0 top-full mt-2 max-h-[18rem] overflow-y-auto rounded-2xl bg-white text-slate-950 shadow-2xl ring-1 ring-[#c7dbe8] dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600"
 aria-live="polite"
 :aria-busy="isInitialSearchLoading || isSearching"
 >
 <div v-if="isSearching" class="m-2 flex items-center gap-2 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" role="status" aria-live="polite">
 <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" aria-hidden="true" />
 <span>Buscando productos…</span>
 </div>
 <div v-if="isInitialSearchLoading" class="grid gap-2 p-2">
 <USkeleton v-for="item in 3" :key="item" class="h-12 rounded-xl" />
 </div>
 <UAlert v-else-if="error" class="m-2" color="error" variant="soft" icon="i-lucide-circle-alert" title="No pudimos cargar los productos" description="Revisa tu conexión e inténtalo nuevamente.">
 <template #actions><UButton label="Reintentar" color="error" variant="soft" size="sm" @click="refresh()" /></template>
 </UAlert>
 <div v-else-if="!products.length" class="px-5 py-8 text-center">
 <span class="mx-auto grid size-10 place-items-center rounded-xl bg-[#eef2ef] text-[#68766e] dark:bg-slate-700 dark:text-slate-300"><UIcon name="i-lucide-package-search" class="size-5" aria-hidden="true" /></span>
 <h3 class="mt-3 text-sm font-semibold">No encontramos coincidencias</h3>
 <p class="mx-auto mt-1 max-w-sm text-xs text-[#64748b] dark:text-slate-300">Prueba con otro nombre o SKU.</p>
 </div>
 <ul v-else class="divide-y divide-[#d8e7f1] dark:divide-slate-600" aria-label="Resultados de búsqueda de productos">
 <li v-for="product in products" :key="product.id">
 <button
 type="button"
 class="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-[#f1f6fa] focus-visible:bg-[#d8e7f1] dark:hover:bg-slate-700 dark:focus-visible:bg-slate-700"
 :aria-label="`Agregar ${product.name} a la venta`"
 @click="addProduct(product)"
 >
 <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-[#f1f6fa] text-[#456a88] dark:bg-slate-700 dark:text-[#c8d6df]">
 <UIcon name="i-lucide-package-plus" class="size-4" aria-hidden="true" />
 </span>
 <span class="min-w-0 flex-1">
 <span class="block truncate text-sm font-semibold text-slate-950 dark:text-slate-100">{{ product.name }}</span>
 <span class="mt-1 block truncate text-xs text-[#64748b] dark:text-slate-300">{{ product.sku }} · {{ product.stock }} {{ product.unit === 'KILOGRAM' ? 'kg' : 'pzas' }} disponibles</span>
 </span>
 <span class="shrink-0 text-right">
 <span class="block text-sm font-bold text-[#456a88] dark:text-[#c8d6df]">{{ currency.format(product.price) }}</span>
 <span class="mt-1 block text-[11px] text-[#64748b] dark:text-slate-300">{{ product.unit === 'KILOGRAM' ? 'por kg' : 'por pza' }}</span>
 </span>
 </button>
 </li>
 </ul>
 </div>
 </div>

 <UCard class="mt-3" :ui="{ root: 'rounded-2xl ring-[#dde3de]', header: 'px-4 py-2.5 sm:px-4', body: 'p-0' }">
 <template #header>
 <div class="flex items-center justify-between gap-4">
 <div>
 <h2 id="sale-detail-title" class="text-sm font-bold">Detalle de venta</h2>
 <p class="text-xs text-[#64748b] dark:text-slate-300">{{ itemCount }} {{ itemCount === 1 ? 'artículo' : 'artículos' }}</p>
 </div>
 <div class="flex items-center gap-1.5">
 <UButton label="Venta sin código" icon="i-lucide-badge-plus" color="primary" variant="soft" size="xs" @click="manualProductOpen = true" />
 <UButton v-if="cart.length" label="Vaciar" color="neutral" variant="ghost" size="xs" @click="clearCart" />
 </div>
 </div>
 </template>

 <div v-if="!cart.length" class="px-6 py-14 text-center">
 <UIcon name="i-lucide-shopping-basket" class="mx-auto size-8 text-[#a0aaa4]" aria-hidden="true" />
 <p class="mt-3 text-sm font-semibold">Tu venta está vacía</p>
 <p class="mt-1 text-sm text-[#64748b] dark:text-slate-300">Escanea o busca productos para agregarlos al ticket.</p>
 </div>
 <div v-else>
 <div class="w-full overflow-hidden">
 <div class="grid grid-cols-[3.75rem_minmax(0,1fr)_4.25rem_6rem_5.25rem_2rem] gap-1.5 border-b border-[#d7ddd8] bg-[#f0f5f2] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#5d6a62] dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 2xl:grid-cols-[5rem_minmax(0,1fr)_5rem_6.75rem_6rem_2.25rem]">
 <span>Código</span>
 <span>Producto</span>
 <span class="text-right">Precio</span>
 <span class="text-center">Cant./$</span>
 <span class="text-right">Importe</span>
 <span class="sr-only">Quitar</span>
 </div>
 <ul class="max-h-[calc(100vh-12.5rem)] divide-y divide-[#e7ece8] overflow-y-auto dark:divide-slate-600" aria-label="Productos en la venta">
 <li
 v-for="item in cart"
 :key="item.id"
 class="grid grid-cols-[3.75rem_minmax(0,1fr)_4.25rem_6rem_5.25rem_2rem] items-center gap-1.5 px-2.5 py-1.5 text-xs odd:bg-white even:bg-[#f8fbf9] dark:odd:bg-slate-800 dark:even:bg-slate-700 2xl:grid-cols-[5rem_minmax(0,1fr)_5rem_6.75rem_6rem_2.25rem]"
 >
 <span class="truncate text-xs text-[#617068] dark:text-slate-300">{{ item.sku }}</span>
 <span class="min-w-0">
 <span class="block truncate font-semibold leading-tight text-[#0f172a] dark:text-slate-100">{{ item.name }}</span>
 <span class="block truncate text-[10px] leading-tight text-[#64748b] dark:text-slate-300">
 {{ item.description || 'Sin descripción' }} · {{ item.isManual ? 'No afecta inventario' : `Exist. ${item.stock} ${item.unit === 'KILOGRAM' ? 'kg' : 'pzas'}` }}
 </span>
 </span>
 <span class="text-right text-[11px] font-semibold text-[#475569] dark:text-slate-200">{{ currency.format(item.price) }}</span>
 <span class="flex items-center justify-center gap-0.5">
 <UButton v-if="item.unit === 'PIECE' && !item.isManual" icon="i-lucide-minus" color="neutral" variant="ghost" size="xs" :aria-label="`Quitar cantidad de ${item.name}`" @click="setQuantity(item, item.quantity - getQuantityStep(item))" />
 <UBadge v-if="item.isManual" label="Manual" color="neutral" variant="soft" size="sm" />
 <UInput
 v-else
 :model-value="quantityDrafts[item.id] ?? formatQuantityDraft(item)"
 type="number"
 inputmode="decimal"
 :min="item.unit === 'KILOGRAM' ? 0.01 : getQuantityStep(item)"
 :max="item.unit === 'KILOGRAM' ? item.stock * item.price : item.stock"
 :step="item.unit === 'KILOGRAM' ? 0.01 : getQuantityStep(item)"
 :placeholder="item.unit === 'KILOGRAM' ? '$' : '0'"
 :aria-label="item.unit === 'KILOGRAM' ? `Importe en pesos de ${item.name}` : `Cantidad de ${item.name}`"
 class="w-16"
 size="xs"
 :ui="{ base: 'px-1 text-center' }"
 @update:model-value="updateQuantity(item, $event)"
 @blur="commitQuantity(item)"
 />
 <UButton v-if="!item.isManual && item.unit === 'PIECE'" icon="i-lucide-plus" color="neutral" variant="ghost" size="xs" :disabled="item.quantity >= item.stock" :aria-label="`Agregar cantidad de ${item.name}`" @click="setQuantity(item, item.quantity + getQuantityStep(item))" />
 </span>
 <span class="text-right">
 <span class="block text-xs font-bold text-sky-700 dark:text-[#c8d6df]">{{ currency.format(item.price * item.quantity) }}</span>
 <span v-if="item.unit === 'KILOGRAM' && item.quantity > 0" class="block text-[10px] leading-tight text-[#64748b] dark:text-slate-300">{{ item.quantity }} kg</span>
 </span>
 <UTooltip text="Quitar producto">
 <UButton
 icon="i-lucide-trash-2"
 color="error"
 variant="ghost"
 size="xs"
 :aria-label="`Quitar ${item.name} del ticket`"
 @click="removeCartItem(item)"
 />
 </UTooltip>
 </li>
 </ul>
 </div>
 </div>
 </UCard>
 </section>

 <aside aria-labelledby="checkout-title" class="xl:sticky xl:top-4 xl:self-start">
 <UCard :ui="{ root: 'rounded-2xl ring-[#dde3de]', body: 'p-4 sm:p-5' }">
 <div class="mb-3">
 <h2 id="checkout-title" class="font-bold">Cobro</h2>
 <p class="mt-1 text-sm text-[#64748b]">Resumen y forma de pago de la venta.</p>
 </div>
 <ActionFeedback v-if="checkoutError" class="mb-3" :message="checkoutError" type="error" @dismiss="checkoutError = ''" />
 <ActionFeedback v-if="heldTicketError" class="mb-3" :message="heldTicketError" type="error" @dismiss="heldTicketError = ''" />
 <div class="rounded-xl border border-[#cdd9d2] bg-[#f1f6fa] p-3">
 <div>
 <p class="text-xs font-bold uppercase tracking-[.14em] text-[#456052]">{{ shouldRoundPaymentMethod(paymentMethod) ? 'Total a cobrar' : 'Total' }}</p>
 <p class="mt-1 max-w-full break-words text-right font-mono text-[clamp(2rem,3.8vw,3rem)] font-black leading-none tracking-[-.06em] text-[#385872] tabular-nums">
 {{ currency.format(paymentTotal) }}
 </p>
 </div>
 <div class="mt-2 grid grid-cols-2 gap-2 border-t border-[#d9e5dd] pt-2">
 <div class="min-w-0 rounded-lg border border-sky-100 bg-sky-50/90 px-2.5 py-2">
 <span class="block text-[11px] font-semibold uppercase tracking-wide text-sky-800">Subtotal</span>
 <span class="mt-0.5 block max-w-full truncate text-right font-mono text-[clamp(.95rem,2.2vw,1.125rem)] font-black leading-tight text-sky-900 tabular-nums">{{ currency.format(total) }}</span>
 </div>
 <div class="min-w-0 rounded-lg border px-2.5 py-2" :class="cashReceivedIsInsufficient ? 'border-amber-200 bg-amber-50/95' : 'border-orange-200 bg-orange-50/95'">
 <span class="block text-[11px] font-semibold uppercase tracking-wide" :class="cashReceivedIsInsufficient ? 'text-amber-800' : 'text-orange-800'">Cambio</span>
 <span class="mt-0.5 block max-w-full truncate text-right font-mono text-[clamp(.95rem,2.2vw,1.125rem)] font-black leading-tight tabular-nums" :class="cashReceivedIsInsufficient ? 'text-amber-800' : 'text-orange-700'">{{ currency.format(changeDue) }}</span>
 </div>
 </div>
 <div v-if="shouldRoundPaymentMethod(paymentMethod) && paymentTotal !== total" class="mt-2 flex items-center justify-between">
 <p class="text-xs text-[#64748b]">Ajuste por redondeo</p>
 <p class="text-sm font-semibold text-[#475569]">{{ currency.format(paymentTotal - total) }}</p>
 </div>
 </div>
 <div v-if="paymentMethod === 'CASH'" class="mt-3">
 <UFormField label="Efectivo recibido" name="cashReceived" required>
 <UInput
 v-model="cashReceived"
 type="number"
 inputmode="decimal"
 min="0"
 step="0.01"
 placeholder="0.00"
 class="w-full"
 aria-label="Efectivo recibido del cliente"
 />
 </UFormField>
 <p v-if="cashReceivedIsInsufficient && cart.length" class="mt-2 text-xs text-amber-700">Ingresa al menos {{ currency.format(paymentTotal) }} para cobrar en efectivo.</p>
 </div>
 <div v-if="paymentMethod === 'CREDIT'" class="mt-3 space-y-3">
 <UFormField label="Nombre de cliente" name="creditCustomerName" required>
 <UInput
 v-model="creditCustomerName"
 placeholder="Ej. Juan Pérez"
 maxlength="100"
 autocomplete="off"
 class="w-full"
 aria-label="Nombre del cliente de la cuenta por cobrar"
 />
 </UFormField>
 <UFormField label="Descripción o nota" name="creditNote">
 <UTextarea
 v-model="creditNote"
 :rows="2"
 maxlength="180"
 placeholder="Ej. Paga el viernes, referencia del pedido…"
 class="w-full"
 aria-label="Descripción de la cuenta por cobrar"
 />
 </UFormField>
 <p v-if="creditCustomerIsMissing && cart.length" class="text-xs text-amber-700">Indica a quién pertenece esta cuenta por cobrar.</p>
 </div>
 <div v-if="cart.length" class="mt-3 grid grid-cols-[1fr_auto] gap-2">
 <UInput v-model="heldTicketNote" placeholder="Nota para guardar…" maxlength="120" class="w-full" aria-label="Nota para guardar ticket en espera" />
 <UButton
 icon="i-lucide-bookmark-plus"
 color="neutral"
 variant="soft"
 aria-label="Guardar ticket en espera"
 :disabled="!cashSession || holdingTicket"
 :loading="holdingTicket"
 @click="holdCurrentTicket"
 />
 </div>
 <UFormField label="Forma de pago" name="paymentMethod" class="mt-3">
 <USelect
 v-model="paymentMethod"
 :items="paymentMethodOptions"
 value-key="value"
 label-key="label"
 aria-label="Forma de pago de la venta"
 class="w-full"
 />
 </UFormField>
 <UButton
 block size="xl"
 :icon="cashSession ? 'i-lucide-credit-card' : 'i-lucide-sunrise'"
 :label="checkoutLabel"
 class="mt-3 rounded-xl font-black"
 :disabled="cashIsLoading || (Boolean(cashSession) && (!hasChargeableCart || cashReceivedIsInsufficient || creditCustomerIsMissing))"
 :loading="checkoutLoading || cashIsLoading"
 @click="cashSession ? checkoutSale() : navigateTo('/dashboard/cashRegister?section=start')"
 />
 <UAlert
 v-if="!cashIsLoading && !cashSession"
 class="mt-4"
 color="warning"
 variant="soft"
 icon="i-lucide-sunrise"
 title="Caja sin iniciar"
 description="Para vender primero inicia el día desde el módulo de caja."
 >
 <template #actions>
 <UButton to="/dashboard/cashRegister?section=start" label="Ir a iniciar día" color="warning" variant="soft" size="sm" />
 </template>
 </UAlert>
 </UCard>
 </aside>
 </div>

 <UModal v-model:open="manualProductOpen" title="Venta sin código" description="Agrega una partida solo para este ticket. No se guardará en inventario.">
 <template #body>
 <form class="space-y-4" @submit.prevent="addManualProduct">
 <UFormField label="¿Qué es?" name="manualName" required>
 <UInput
 v-model="manualProductForm.name"
 placeholder="Ej. Producto varios"
 autocomplete="off"
 class="w-full"
 aria-label="Nombre del producto sin código"
 />
 </UFormField>
 <UFormField label="Precio" name="manualPrice" required>
 <UInput
 v-model="manualProductForm.price"
 type="number"
 inputmode="decimal"
 min="0.01"
 step="0.01"
 placeholder="0.00"
 class="w-full"
 aria-label="Precio del producto sin código"
 />
 </UFormField>
 <UFormField label="Tipo de venta" name="manualUnit" required>
 <USelect
 v-model="manualProductForm.unit"
 :items="manualUnitOptions"
 value-key="value"
 label-key="label"
 class="w-full"
 aria-label="Tipo de venta sin código"
 />
 </UFormField>
 <p class="rounded-xl bg-[#f7fafc] px-3 py-2 text-xs text-[#475569]">
 Esta partida aparecerá en el ticket como “SIN-CODIGO” y no descontará inventario.
 </p>
 </form>
 </template>
 <template #footer>
 <div class="flex w-full justify-end gap-2">
 <UButton label="Cancelar" color="neutral" variant="ghost" @click="manualProductOpen = false" />
 <UButton label="Agregar al ticket" icon="i-lucide-plus" @click="addManualProduct" />
 </div>
 </template>
 </UModal>

 <USlideover v-model:open="ticketOpen" title="Ticket de venta" description="Comprobante detallado de la operación">
 <template #body>
 <div v-if="ticket" class="space-y-5">
 <div class="rounded-2xl border border-[#d8e7f1] bg-white p-5 dark:border-slate-600 dark:bg-slate-800">
 <div class="flex items-start justify-between gap-4">
 <div>
 <p class="text-xs uppercase tracking-[.18em] text-[#64748b] dark:text-slate-300">ABR Store</p>
 <h3 class="mt-1 text-xl font-bold">Ticket #{{ ticket.folio }}</h3>
 <p class="mt-1 text-sm text-[#64748b] dark:text-slate-300">{{ dateTime.format(new Date(ticket.createdAt)) }}</p>
 </div>
 <UBadge label="Pagado" color="success" variant="soft" />
 </div>
 <div class="mt-4 rounded-xl bg-[#f7fafc] p-3 text-sm dark:bg-slate-700">
 <p class="font-semibold">Vendedor</p>
 <p class="mt-1 text-[#475569] dark:text-slate-200">{{ ticket.seller.fullName }}</p>
 <p class="text-xs text-[#64748b] dark:text-slate-300">{{ ticket.seller.email }}</p>
 </div>
 <p class="mt-3 text-xs text-[#64748b] dark:text-slate-300">Forma de pago: {{ paymentMethodLabel(ticket.paymentMethod) }}</p>
 <div v-if="shouldRoundPaymentMethod(ticket.paymentMethod)" class="mt-3 grid gap-1 rounded-xl bg-[#f7fafc] p-3 text-xs text-[#475569] dark:bg-slate-700 dark:text-slate-200">
 <p>Total a cobrar: <span class="font-semibold">{{ currency.format(ticket.paymentTotal) }}</span></p>
 <p v-if="ticket.paymentMethod === 'CASH'">Recibido: <span class="font-semibold">{{ currency.format(ticket.cashReceived ?? 0) }}</span></p>
 <p v-if="ticket.paymentMethod === 'CASH'">Cambio: <span class="font-semibold">{{ currency.format(ticket.changeDue ?? 0) }}</span></p>
 </div>
 <p v-if="ticket.cashSession" class="mt-3 text-xs text-[#64748b] dark:text-slate-300">Caja: {{ ticket.cashSession.id.slice(-6).toUpperCase() }}</p>
 </div>

 <div class="overflow-hidden rounded-2xl border border-[#d8e7f1] bg-white dark:border-slate-600 dark:bg-slate-800">
 <ul class="divide-y divide-[#d8e7f1] dark:divide-slate-600" aria-label="Productos vendidos">
 <li v-for="item in ticket.items" :key="item.id" class="p-4">
 <div class="flex justify-between gap-4">
 <div class="min-w-0">
 <p class="truncate text-sm font-semibold">{{ item.name }}</p>
 <p class="mt-1 text-xs text-[#64748b] dark:text-slate-300">{{ item.sku }} · {{ item.quantity }} {{ item.unit === 'KILOGRAM' ? 'kg' : 'pzas' }} × {{ currency.format(item.unitPrice) }}</p>
 </div>
 <p class="whitespace-nowrap text-sm font-bold">{{ currency.format(item.lineTotal) }}</p>
 </div>
 </li>
 </ul>
 <div class="border-t border-[#d8e7f1] bg-[#f7fafc] p-4 dark:border-slate-600 dark:bg-slate-700">
 <div class="flex items-center justify-between">
 <p class="text-sm text-[#64748b] dark:text-slate-300">Artículos</p>
 <p class="font-semibold">{{ ticket.itemCount }}</p>
 </div>
 <div class="mt-3 flex items-end justify-between">
 <p class="text-lg font-bold">{{ shouldRoundPaymentMethod(ticket.paymentMethod) ? 'Subtotal' : 'Total' }}</p>
 <p class="text-3xl font-bold tracking-[-.04em] text-[#456a88] dark:text-[#c8d6df]">{{ currency.format(ticket.total) }}</p>
 </div>
 <div v-if="shouldRoundPaymentMethod(ticket.paymentMethod) && ticket.paymentTotal !== ticket.total" class="mt-3 flex items-center justify-between">
 <p class="text-sm text-[#64748b] dark:text-slate-300">Total cobrado</p>
 <p class="text-xl font-bold text-[#456a88] dark:text-[#c8d6df]">{{ currency.format(ticket.paymentTotal) }}</p>
 </div>
 </div>
 </div>

 <div class="grid gap-2 sm:grid-cols-2">
 <UButton block label="Nueva venta" icon="i-lucide-plus" @click="ticketOpen = false" />
 <UButton block label="Ver historial" icon="i-lucide-receipt-text" variant="soft" to="/dashboard/salesHistory" />
 </div>
 </div>
 </template>
 </USlideover>
 </div>
 </DashboardShell>
</template>
