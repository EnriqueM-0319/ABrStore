<script setup lang="ts">
import type { CartItem, Product } from '~/types/product'
import type { PaymentMethod, SaleTicket } from '~/types/sale'
import type { HeldTicket } from '~/types/held-ticket'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Nueva venta' })

const search = ref('')
const debouncedSearch = ref('')
const cart = ref<CartItem[]>([])
const quantityDrafts = ref<Record<string, string>>({})
const paymentMethod = ref<PaymentMethod>('CASH')
const cashReceived = ref('')
const checkoutLoading = ref(false)
const holdingTicket = ref(false)
const heldTicketNote = ref('')
const checkoutError = ref('')
const heldTicketError = ref('')
const ticket = ref<SaleTicket | null>(null)
const ticketOpen = ref(false)
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
  tickets: heldTickets,
  isInitialLoading: heldTicketsAreInitiallyLoading,
  isRefreshing: heldTicketsAreRefreshing,
  init: initHeldTickets,
  refresh: refreshHeldTickets,
  upsertTicket,
  removeTicket,
  restoreTickets
} = useHeldTickets(cashSessionId)

onBeforeUnmount(() => clearTimeout(searchTimer))
onMounted(async () => {
  await initCashSession()
  await initHeldTickets()
})
watch(cashSessionId, () => {
  void initHeldTickets()
})

const itemCount = computed(() => cart.value.reduce((sum, item) => sum + item.quantity, 0))
const total = computed(() => cart.value.reduce((sum, item) => sum + item.price * item.quantity, 0))
const paymentTotal = computed(() => paymentMethod.value === 'CASH' ? roundCashPaymentTotal(total.value) : total.value)
const cashReceivedAmount = computed(() => Number(cashReceived.value))
const changeDue = computed(() => paymentMethod.value === 'CASH' && Number.isFinite(cashReceivedAmount.value) ? Math.max(cashReceivedAmount.value - paymentTotal.value, 0) : 0)
const cashReceivedIsInsufficient = computed(() => paymentMethod.value === 'CASH' && (!Number.isFinite(cashReceivedAmount.value) || cashReceivedAmount.value < paymentTotal.value))
const isInitialSearchLoading = computed(() => status.value === 'pending' && Boolean(debouncedSearch.value) && !products.value.length)
const isSearching = computed(() => status.value === 'pending' && Boolean(debouncedSearch.value) && products.value.length > 0)
const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const dateTime = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
const cashIsLoading = computed(() => cashStatus.value === 'pending')
const checkoutLabel = computed(() => {
  if (cashIsLoading.value) return 'Verificando caja'
  if (paymentMethod.value === 'CASH' && cashReceivedIsInsufficient.value && cart.value.length) return 'Falta efectivo recibido'
  return cashSession.value ? 'Cobrar venta' : 'Iniciar caja para vender'
})
const paymentMethodOptions: Array<{ label: string, value: PaymentMethod }> = [
  { label: 'Efectivo', value: 'CASH' },
  { label: 'Tarjeta', value: 'CARD' },
  { label: 'Transferencia', value: 'TRANSFER' }
]

function addProduct(product: Product) {
  const existing = cart.value.find(item => item.id === product.id)
  if (existing) {
    setQuantity(existing, existing.quantity + getQuantityStep(existing))
    clearProductSearch()
    return
  }
  const quantity = product.unit === 'KILOGRAM' ? Math.min(0.1, product.stock) : 1
  cart.value.push({ ...product, quantity })
  quantityDrafts.value[product.id] = formatQuantityDraft({ ...product, quantity })
  clearProductSearch()
}

function clearProductSearch() {
  clearTimeout(searchTimer)
  search.value = ''
  debouncedSearch.value = ''
  products.value = []
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

  const quantity = Number(value)
  if (!Number.isFinite(quantity) || quantity <= 0) return

  const normalized = item.unit === 'KILOGRAM' ? Math.round(quantity * 1000) / 1000 : Math.round(quantity)
  item.quantity = Math.min(normalized, item.stock)
}

function commitQuantity(item: CartItem) {
  const draft = quantityDrafts.value[item.id]
  const quantity = Number(draft)
  if (!draft || !Number.isFinite(quantity) || quantity <= 0) {
    quantityDrafts.value[item.id] = formatQuantityDraft(item)
    return
  }
  setQuantity(item, quantity)
}

function formatQuantityDraft(item: CartItem) {
  return item.unit === 'KILOGRAM' ? String(Math.round(item.quantity * 1000) / 1000) : String(Math.round(item.quantity))
}

function paymentMethodLabel(method: PaymentMethod) {
  const option = paymentMethodOptions.find(item => item.value === method)
  return option?.label ?? 'Efectivo'
}

function roundCashPaymentTotal(value: number) {
  const pesos = Math.floor(value)
  const cents = Math.round((value - pesos) * 100)
  if (cents < 50) return pesos
  if (cents <= 60) return pesos + 0.5
  return pesos + 1
}

watch(paymentMethod, (method) => {
  if (method !== 'CASH') cashReceived.value = ''
})

async function checkoutSale() {
  if (!cashSession.value) {
    await navigateTo('/dashboard/caja/inicio')
    return
  }
  if (!cart.value.length || checkoutLoading.value) return
  if (cashReceivedIsInsufficient.value) {
    checkoutError.value = 'El efectivo recibido debe cubrir el total de la venta.'
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
        items: cart.value.map(item => ({ productId: item.id, quantity: item.quantity }))
      }
    })

    ticket.value = sale
    ticketOpen.value = true
    cart.value = []
    quantityDrafts.value = {}
    cashReceived.value = ''
    await Promise.all([refresh(), refreshCashSession({ force: true }), refreshHeldTickets({ force: true })])
  } catch (error: unknown) {
    checkoutError.value = getErrorMessage(error, 'No pudimos cobrar la venta.')
  } finally {
    checkoutLoading.value = false
  }
}

async function holdCurrentTicket() {
  if (!cashSession.value) {
    await navigateTo('/dashboard/caja/inicio')
    return
  }
  if (!cart.value.length || holdingTicket.value) return

  holdingTicket.value = true
  heldTicketError.value = ''

  try {
    for (const item of cart.value) commitQuantity(item)
    const ticket = await $fetch<HeldTicket>('/api/held-tickets', {
      method: 'POST',
      body: {
        note: heldTicketNote.value,
        paymentMethod: paymentMethod.value,
        items: cart.value.map(item => ({ productId: item.id, quantity: item.quantity }))
      }
    })
    cart.value = []
    quantityDrafts.value = {}
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

async function resumeHeldTicket(ticket: HeldTicket) {
  const resumableItems = ticket.items
    .filter(item => item.product?.active && item.product.stock > 0)
    .map(item => {
      const product = item.product as NonNullable<typeof item.product>
      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        unit: product.unit,
        price: product.price,
        stock: product.stock,
        active: product.active,
        quantity: Math.min(item.quantity, product.stock)
      } satisfies CartItem
    })

  if (!resumableItems.length) {
    toast.add({ title: 'No se puede recuperar', description: 'Los productos del ticket ya no están disponibles.', color: 'warning', icon: 'i-lucide-triangle-alert' })
    return
  }

  cart.value = resumableItems
  quantityDrafts.value = Object.fromEntries(resumableItems.map(item => [item.id, formatQuantityDraft(item)]))
  paymentMethod.value = ticket.paymentMethod
  cashReceived.value = ''
  toast.add({ title: 'Ticket recuperado', description: 'La venta volvió al punto de venta.', color: 'success', icon: 'i-lucide-rotate-ccw' })
  await discardHeldTicket(ticket, false)
}

async function discardHeldTicket(ticket: HeldTicket, notify = true) {
  const previousTickets = [...heldTickets.value]
  removeTicket(ticket.id)

  try {
    await $fetch(`/api/held-tickets/${ticket.id}`, { method: 'DELETE' })
    void refreshHeldTickets({ force: true })
    if (notify) toast.add({ title: 'Ticket descartado', description: 'Se eliminó de la lista de espera.', color: 'success', icon: 'i-lucide-trash-2' })
  } catch (error: unknown) {
    restoreTickets(previousTickets)
    const message = getErrorMessage(error, 'No pudimos descartar el ticket.')
    toast.add({ title: 'No se pudo descartar', description: message, color: 'error', icon: 'i-lucide-circle-alert' })
  }
}

</script>

<template>
  <DashboardShell eyebrow="Punto de venta" title="Nueva venta">
    <div class="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <div class="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(22rem,.6fr)]">
        <section aria-labelledby="catalog-title">
          <div class="mb-5">
            <h2 id="catalog-title" class="text-xl font-bold tracking-tight">Buscar productos</h2>
            <p class="mt-1 text-sm text-[#758079]">Busca por nombre, descripción o código SKU.</p>
          </div>

          <UInput
            v-model="search" icon="i-lucide-search" size="xl" color="neutral" variant="outline"
            placeholder="Buscar un producto…" aria-label="Buscar productos" autocomplete="off" class="w-full"
            :ui="{ base: 'rounded-xl bg-white' }"
          >
            <template v-if="search" #trailing>
              <UButton icon="i-lucide-x" color="neutral" variant="link" size="sm" aria-label="Limpiar búsqueda" @click="search = ''" />
            </template>
          </UInput>

          <section class="mt-5" aria-labelledby="held-tickets-title">
            <div class="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 id="held-tickets-title" class="font-bold">Tickets en espera</h3>
                <p class="text-sm text-[#7d8781]">Recupera ventas guardadas de la caja actual.</p>
              </div>
              <UButton icon="i-lucide-refresh-cw" label="Actualizar" color="neutral" variant="soft" size="sm" :loading="heldTicketsAreRefreshing" @click="refreshHeldTickets({ force: true })" />
            </div>
            <div v-if="heldTicketsAreInitiallyLoading" class="grid gap-3 sm:grid-cols-2">
              <USkeleton v-for="item in 2" :key="item" class="h-24 rounded-2xl" />
            </div>
            <UAlert v-else-if="!cashSession" color="warning" variant="soft" icon="i-lucide-sunrise" title="Inicia caja para usar tickets en espera" description="Los tickets guardados se ligan a la caja abierta actual." />
            <div v-else>
              <div v-if="heldTicketsAreRefreshing" class="mb-3 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status" aria-live="polite">
                <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" aria-hidden="true" />
                <span>Actualizando tickets guardados…</span>
              </div>
              <div v-if="heldTickets.length" class="grid gap-3 sm:grid-cols-2">
                <UCard v-for="heldTicket in heldTickets" :key="heldTicket.id" :ui="{ root: 'rounded-2xl ring-[#e4e8e4]', body: 'p-4' }">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="truncate font-semibold">{{ heldTicket.note || `Ticket guardado ${heldTicket.id.slice(-5).toUpperCase()}` }}</p>
                      <p class="mt-1 text-xs text-[#7d8781]">{{ heldTicket.items.length }} partidas · {{ dateTime.format(new Date(heldTicket.updatedAt)) }}</p>
                    </div>
                    <p class="shrink-0 font-bold text-[#1f4937]">{{ currency.format(heldTicket.total) }}</p>
                  </div>
                  <div class="mt-4 flex flex-col gap-2 sm:flex-row">
                    <UButton label="Recuperar" icon="i-lucide-rotate-ccw" size="sm" class="flex-1 justify-center" @click="resumeHeldTicket(heldTicket)" />
                    <UButton label="Descartar" icon="i-lucide-trash-2" size="sm" color="error" variant="soft" class="flex-1 justify-center" @click="discardHeldTicket(heldTicket)" />
                  </div>
                </UCard>
              </div>
              <div v-else class="rounded-2xl border border-dashed border-[#d8ddd9] bg-white p-5 text-sm text-[#7d8781]">
                No hay tickets en espera.
              </div>
            </div>
          </section>

          <div class="mt-5" aria-live="polite" :aria-busy="isInitialSearchLoading || isSearching">
            <div v-if="isSearching" class="mb-3 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status" aria-live="polite">
              <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" aria-hidden="true" />
              <span>Buscando productos…</span>
            </div>
            <div v-if="isInitialSearchLoading" class="grid gap-4 sm:grid-cols-2">
              <USkeleton v-for="item in 4" :key="item" class="h-44 rounded-2xl" />
            </div>
            <UAlert v-else-if="error" color="error" variant="soft" icon="i-lucide-circle-alert" title="No pudimos cargar los productos" description="Revisa tu conexión e inténtalo nuevamente.">
              <template #actions><UButton label="Reintentar" color="error" variant="soft" size="sm" @click="refresh()" /></template>
            </UAlert>
            <div v-else-if="!products.length && !debouncedSearch" />
            <div v-else-if="!products.length" class="rounded-2xl border border-dashed border-[#d8ddd9] bg-white px-6 py-16 text-center">
              <span class="mx-auto grid size-14 place-items-center rounded-2xl bg-[#eef2ef] text-[#68766e]"><UIcon name="i-lucide-package-search" class="size-7" aria-hidden="true" /></span>
              <h3 class="mt-4 font-semibold">No encontramos coincidencias</h3>
              <p class="mx-auto mt-1 max-w-sm text-sm text-[#7d8781]">Prueba con otro nombre, descripción o SKU.</p>
            </div>
            <div v-else class="grid gap-4 sm:grid-cols-2">
              <UCard v-for="product in products" :key="product.id" :ui="{ root: 'rounded-2xl ring-[#e4e8e4]', body: 'p-5 sm:p-5' }">
                <div class="flex items-start justify-between gap-4"><div class="min-w-0"><UBadge :label="product.sku" color="neutral" variant="soft" size="sm" /><h3 class="mt-3 truncate font-semibold">{{ product.name }}</h3><p class="mt-1 line-clamp-2 min-h-10 text-sm text-[#7a847e]">{{ product.description || 'Sin descripción' }}</p></div><span class="whitespace-nowrap text-lg font-bold text-[#1f4937]">{{ currency.format(product.price) }}</span></div>
                <div class="mt-5 flex items-center justify-between"><span class="text-xs text-[#7a847e]">{{ product.stock }} {{ product.unit === 'KILOGRAM' ? 'kg' : 'pzas' }} disponibles</span><UButton label="Agregar" icon="i-lucide-plus" color="primary" variant="soft" @click="addProduct(product)" /></div>
              </UCard>
            </div>
          </div>
        </section>

        <aside aria-labelledby="sale-detail-title" class="xl:sticky xl:top-28 xl:self-start">
          <UCard :ui="{ root: 'rounded-2xl ring-[#dde3de]', header: 'p-5 sm:px-6', body: 'p-0', footer: 'p-5 sm:px-6' }">
            <template #header>
              <div class="flex items-center justify-between"><div><h2 id="sale-detail-title" class="font-bold">Detalle de venta</h2><p class="mt-1 text-sm text-[#7a847e]">{{ itemCount }} {{ itemCount === 1 ? 'artículo' : 'artículos' }}</p></div><UButton v-if="cart.length" label="Vaciar" color="neutral" variant="ghost" size="sm" @click="cart = []" /></div>
            </template>

            <div v-if="!cart.length" class="px-6 py-14 text-center"><UIcon name="i-lucide-shopping-basket" class="mx-auto size-8 text-[#a0aaa4]" aria-hidden="true" /><p class="mt-3 text-sm font-semibold">Tu venta está vacía</p><p class="mt-1 text-sm text-[#89928d]">Agrega productos desde el catálogo.</p></div>
            <ul v-else class="max-h-[52vh] divide-y divide-[#edf0ed] overflow-y-auto" aria-label="Productos en la venta">
              <li v-for="item in cart" :key="item.id" class="p-5 sm:px-6">
                <div class="flex justify-between gap-4"><div class="min-w-0"><p class="truncate text-sm font-semibold">{{ item.name }}</p><p class="mt-1 text-xs text-[#7d8781]">{{ item.description || item.sku }}</p></div><p class="whitespace-nowrap text-sm font-bold">{{ currency.format(item.price * item.quantity) }}</p></div>
                <div class="mt-4 grid gap-3">
                  <div class="flex items-center justify-between gap-3">
                    <p class="text-xs text-[#7d8781]">{{ currency.format(item.price) }} / {{ item.unit === 'KILOGRAM' ? 'kg' : 'pza' }}</p>
                    <p class="text-xs text-[#7d8781]">Máx. {{ item.stock }} {{ item.unit === 'KILOGRAM' ? 'kg' : 'pzas' }}</p>
                  </div>
                  <div class="flex items-end gap-2" :aria-label="`Cantidad de ${item.name}`">
                    <UButton icon="i-lucide-minus" color="neutral" variant="soft" size="sm" :aria-label="`Quitar cantidad de ${item.name}`" @click="setQuantity(item, item.quantity - getQuantityStep(item))" />
                    <UFormField :label="item.unit === 'KILOGRAM' ? 'Peso en kg' : 'Cantidad'" class="min-w-0 flex-1">
                      <UInput
                        :model-value="quantityDrafts[item.id] ?? formatQuantityDraft(item)"
                        type="number"
                        inputmode="decimal"
                        :min="getQuantityStep(item)"
                        :max="item.stock"
                        :step="getQuantityStep(item)"
                        :aria-label="item.unit === 'KILOGRAM' ? `Peso en kilogramos de ${item.name}` : `Cantidad de ${item.name}`"
                        class="w-full"
                        @update:model-value="updateQuantity(item, $event)"
                        @blur="commitQuantity(item)"
                      >
                        <template #trailing>
                          <span class="text-xs text-[#7d8781]">{{ item.unit === 'KILOGRAM' ? 'kg' : 'pzas' }}</span>
                        </template>
                      </UInput>
                    </UFormField>
                    <UButton icon="i-lucide-plus" color="neutral" variant="soft" size="sm" :disabled="item.quantity >= item.stock" :aria-label="`Agregar cantidad de ${item.name}`" @click="setQuantity(item, item.quantity + getQuantityStep(item))" />
                  </div>
                </div>
              </li>
            </ul>

            <template #footer>
              <ActionFeedback v-if="checkoutError" class="mb-4" :message="checkoutError" type="error" @dismiss="checkoutError = ''" />
              <ActionFeedback v-if="heldTicketError" class="mb-4" :message="heldTicketError" type="error" @dismiss="heldTicketError = ''" />
              <UFormField label="Forma de pago" name="paymentMethod" class="mb-4">
                <USelect
                  v-model="paymentMethod"
                  :items="paymentMethodOptions"
                  value-key="value"
                  label-key="label"
                  aria-label="Forma de pago de la venta"
                  class="w-full"
                />
              </UFormField>
              <div v-if="paymentMethod === 'CASH'" class="mb-4 grid gap-3 rounded-2xl bg-[#f7faf8] p-4">
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
                <div class="flex items-center justify-between gap-4">
                  <p class="text-sm text-[#748078]">Cambio</p>
                  <p class="text-2xl font-bold tracking-[-.04em]" :class="cashReceivedIsInsufficient ? 'text-amber-700' : 'text-emerald-700'">{{ currency.format(changeDue) }}</p>
                </div>
                <div class="flex items-center justify-between gap-4 border-t border-[#e2e8e3] pt-3">
                  <p class="text-sm text-[#748078]">Total a cobrar</p>
                  <p class="text-lg font-bold text-[#1f4937]">{{ currency.format(paymentTotal) }}</p>
                </div>
                <p v-if="cashReceivedIsInsufficient && cart.length" class="text-xs text-amber-700">Ingresa al menos {{ currency.format(paymentTotal) }} para cobrar en efectivo.</p>
              </div>
              <div class="flex items-end justify-between"><div><p class="text-sm text-[#748078]">Total</p><p class="text-xs text-[#929a95]">Impuestos incluidos</p></div><p class="text-3xl font-bold tracking-[-.04em] text-[#1f4937]">{{ currency.format(total) }}</p></div>
              <p v-if="paymentMethod === 'CASH' && paymentTotal !== total" class="mt-2 text-right text-xs text-[#7d8781]">Redondeo en efectivo: {{ currency.format(paymentTotal) }}</p>
              <UFormField v-if="cart.length" label="Nota para guardar" name="heldTicketNote" class="mt-4">
                <UInput v-model="heldTicketNote" placeholder="Ej. Cliente de camisa azul…" maxlength="120" class="w-full" />
              </UFormField>
              <UButton
                v-if="cart.length"
                block
                icon="i-lucide-bookmark-plus"
                label="Guardar ticket en espera"
                color="neutral"
                variant="soft"
                class="mt-3 rounded-xl"
                :disabled="!cashSession || holdingTicket"
                :loading="holdingTicket"
                @click="holdCurrentTicket"
              />
              <UButton
                block size="xl"
                :icon="cashSession ? 'i-lucide-credit-card' : 'i-lucide-sunrise'"
                :label="checkoutLabel"
                class="mt-5 rounded-xl"
                :disabled="cashIsLoading || (Boolean(cashSession) && (!cart.length || cashReceivedIsInsufficient))"
                :loading="checkoutLoading || cashIsLoading"
                @click="cashSession ? checkoutSale() : navigateTo('/dashboard/caja/inicio')"
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
                  <UButton to="/dashboard/caja/inicio" label="Ir a iniciar día" color="warning" variant="soft" size="sm" />
                </template>
              </UAlert>
            </template>
          </UCard>
        </aside>
      </div>

      <USlideover v-model:open="ticketOpen" title="Ticket de venta" description="Comprobante detallado de la operación">
        <template #body>
          <div v-if="ticket" class="space-y-5">
            <div class="rounded-2xl border border-[#e1e6e2] bg-white p-5">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-xs uppercase tracking-[.18em] text-[#7d8781]">ABR Store</p>
                  <h3 class="mt-1 text-xl font-bold">Ticket #{{ ticket.folio }}</h3>
                  <p class="mt-1 text-sm text-[#7d8781]">{{ dateTime.format(new Date(ticket.createdAt)) }}</p>
                </div>
                <UBadge label="Pagado" color="success" variant="soft" />
              </div>
              <div class="mt-4 rounded-xl bg-[#f7faf8] p-3 text-sm">
                <p class="font-semibold">Vendedor</p>
                <p class="mt-1 text-[#68746d]">{{ ticket.seller.fullName }}</p>
                <p class="text-xs text-[#89928d]">{{ ticket.seller.email }}</p>
              </div>
              <p class="mt-3 text-xs text-[#7d8781]">Forma de pago: {{ paymentMethodLabel(ticket.paymentMethod) }}</p>
              <div v-if="ticket.paymentMethod === 'CASH'" class="mt-3 grid gap-1 rounded-xl bg-[#f7faf8] p-3 text-xs text-[#68746d]">
                <p>Total a cobrar: <span class="font-semibold">{{ currency.format(ticket.paymentTotal) }}</span></p>
                <p>Recibido: <span class="font-semibold">{{ currency.format(ticket.cashReceived ?? 0) }}</span></p>
                <p>Cambio: <span class="font-semibold">{{ currency.format(ticket.changeDue ?? 0) }}</span></p>
              </div>
              <p v-if="ticket.cashSession" class="mt-3 text-xs text-[#7d8781]">Caja: {{ ticket.cashSession.id.slice(-6).toUpperCase() }}</p>
            </div>

            <div class="overflow-hidden rounded-2xl border border-[#e1e6e2] bg-white">
              <ul class="divide-y divide-[#edf0ed]" aria-label="Productos vendidos">
                <li v-for="item in ticket.items" :key="item.id" class="p-4">
                  <div class="flex justify-between gap-4">
                    <div class="min-w-0">
                      <p class="truncate text-sm font-semibold">{{ item.name }}</p>
                      <p class="mt-1 text-xs text-[#7d8781]">{{ item.sku }} · {{ item.quantity }} {{ item.unit === 'KILOGRAM' ? 'kg' : 'pzas' }} × {{ currency.format(item.unitPrice) }}</p>
                    </div>
                    <p class="whitespace-nowrap text-sm font-bold">{{ currency.format(item.lineTotal) }}</p>
                  </div>
                </li>
              </ul>
              <div class="border-t border-[#edf0ed] bg-[#fbfcfb] p-4">
                <div class="flex items-center justify-between">
                  <p class="text-sm text-[#748078]">Artículos</p>
                  <p class="font-semibold">{{ ticket.itemCount }}</p>
                </div>
                <div class="mt-3 flex items-end justify-between">
                  <p class="text-lg font-bold">{{ ticket.paymentMethod === 'CASH' ? 'Subtotal' : 'Total' }}</p>
                  <p class="text-3xl font-bold tracking-[-.04em] text-[#1f4937]">{{ currency.format(ticket.total) }}</p>
                </div>
                <div v-if="ticket.paymentMethod === 'CASH' && ticket.paymentTotal !== ticket.total" class="mt-3 flex items-center justify-between">
                  <p class="text-sm text-[#748078]">Total cobrado</p>
                  <p class="text-xl font-bold text-[#1f4937]">{{ currency.format(ticket.paymentTotal) }}</p>
                </div>
              </div>
            </div>

            <div class="grid gap-2 sm:grid-cols-2">
              <UButton block label="Nueva venta" icon="i-lucide-plus" @click="ticketOpen = false" />
              <UButton block label="Ver historial" icon="i-lucide-receipt-text" variant="soft" to="/dashboard/historial" />
            </div>
          </div>
        </template>
      </USlideover>
    </div>
  </DashboardShell>
</template>
