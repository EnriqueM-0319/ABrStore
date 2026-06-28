<script setup lang="ts">
import type { SaleTicket, SaleTicketItem, SalesHistoryResponse } from '~/types/sale'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Historial de ventas' })

const page = ref(1)
const limit = ref(10)
const startDate = ref('')
const endDate = ref('')
const folioSearch = ref('')
const selectedSale = ref<SaleTicket | null>(null)
const detailOpen = ref(false)
const cancelReason = ref('')
const cancelling = ref(false)
const cancelError = ref('')
const itemCancelOpen = ref(false)
const selectedItemToCancel = ref<SaleTicketItem | null>(null)
const itemCancelReason = ref('')
const itemCancelling = ref(false)
const itemCancelError = ref('')
const toast = useToast()
const limitOptions = [{ label: '10 por página', value: 10 }, { label: '20 por página', value: 20 }, { label: '50 por página', value: 50 }]
const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const dateTime = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
const paymentMethodLabels = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  CREDIT: 'Fiado'
} as const

function shouldRoundPaymentMethod(method: SaleTicket['paymentMethod']) {
  return method === 'CASH' || method === 'CARD'
}

const data = ref<SalesHistoryResponse>({ items: [], total: 0, page: 1, limit: 10, pageCount: 1 })
const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const error = ref('')
const hasCachedPage = ref(false)

const normalizedFolioSearch = computed(() => folioSearch.value.trim())
const cacheKey = computed(() => `abr_sales_history_${page.value}_${limit.value}_${startDate.value || 'all'}_${endDate.value || 'all'}_${normalizedFolioSearch.value || 'all'}`)

const sales = computed(() => data.value.items)
const pageCount = computed(() => data.value.pageCount)
const pageStart = computed(() => data.value.total ? (data.value.page - 1) * data.value.limit + 1 : 0)
const pageEnd = computed(() => Math.min(data.value.page * data.value.limit, data.value.total))
const isLoading = computed(() => status.value === 'pending' && !sales.value.length)
const isRefreshing = computed(() => status.value === 'pending' && sales.value.length > 0 && !hasCachedPage.value)

function readCachedHistory() {
  hasCachedPage.value = false
  if (!import.meta.client) return false

  const cached = localStorage.getItem(cacheKey.value)
  if (!cached) {
    data.value = { items: [], total: 0, page: page.value, limit: limit.value, pageCount: 1 }
    return false
  }

  try {
    data.value = JSON.parse(cached) as SalesHistoryResponse
    hasCachedPage.value = true
    return true
  } catch {
    localStorage.removeItem(cacheKey.value)
    data.value = { items: [], total: 0, page: page.value, limit: limit.value, pageCount: 1 }
    return false
  }
}

function writeCachedHistory(nextData: SalesHistoryResponse) {
  if (!import.meta.client) return
  localStorage.setItem(cacheKey.value, JSON.stringify(nextData))
}

async function refresh() {
  status.value = 'pending'
  error.value = ''

  try {
    const nextData = await $fetch<SalesHistoryResponse>('/api/sales', {
      query: {
        page: page.value,
        limit: limit.value,
        startDate: startDate.value || undefined,
        endDate: endDate.value || undefined,
        folio: normalizedFolioSearch.value || undefined
      }
    })
    data.value = nextData
    writeCachedHistory(nextData)
    hasCachedPage.value = false
    status.value = 'success'
  } catch (fetchError: unknown) {
    error.value = getErrorMessage(fetchError, 'No pudimos cargar el historial.')
    status.value = 'error'
  }
}

onMounted(() => {
  readCachedHistory()
  void refresh()
})

watch([page, limit, startDate, endDate, normalizedFolioSearch], () => {
  readCachedHistory()
  void refresh()
})

watch([limit, startDate, endDate, normalizedFolioSearch], () => {
  page.value = 1
})

function clearFilters() {
  startDate.value = ''
  endDate.value = ''
  folioSearch.value = ''
}

function openDetail(sale: SaleTicket) {
  selectedSale.value = sale
  cancelReason.value = ''
  cancelError.value = ''
  selectedItemToCancel.value = null
  itemCancelReason.value = ''
  itemCancelError.value = ''
  detailOpen.value = true
}

function goToPage(nextPage: number) {
  page.value = Math.min(Math.max(nextPage, 1), pageCount.value)
}

async function cancelSale() {
  if (!selectedSale.value || cancelling.value) return

  cancelling.value = true
  cancelError.value = ''

  try {
    const canceledSale = await $fetch<SaleTicket>(`/api/sales/${selectedSale.value.id}/cancel`, {
      method: 'POST',
      body: { reason: cancelReason.value }
    })
    selectedSale.value = canceledSale
    cancelReason.value = ''
    toast.add({ title: 'Ticket cancelado', description: `Ticket #${canceledSale.folio} fue cancelado y el stock regresó al inventario.`, color: 'success', icon: 'i-lucide-ban' })
    await refresh()
  } catch (error: unknown) {
    cancelError.value = getErrorMessage(error, 'No pudimos cancelar el ticket.')
    toast.add({ title: 'No se pudo cancelar', description: cancelError.value, color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    cancelling.value = false
  }
}

function openItemCancel(item: SaleTicketItem) {
  selectedItemToCancel.value = item
  itemCancelReason.value = ''
  itemCancelError.value = ''
  itemCancelOpen.value = true
}

async function cancelSaleItem() {
  if (!selectedSale.value || !selectedItemToCancel.value || itemCancelling.value) return

  itemCancelling.value = true
  itemCancelError.value = ''

  try {
    const updatedSale = await $fetch<SaleTicket>(`/api/sales/${selectedSale.value.id}/items/${selectedItemToCancel.value.id}/cancel`, {
      method: 'POST',
      body: { reason: itemCancelReason.value }
    })
    selectedSale.value = updatedSale
    itemCancelOpen.value = false
    selectedItemToCancel.value = null
    itemCancelReason.value = ''
    toast.add({ title: 'Producto cancelado', description: 'La partida fue cancelada y el ticket se actualizó.', color: 'success', icon: 'i-lucide-undo-2' })
    await refresh()
  } catch (error: unknown) {
    itemCancelError.value = getErrorMessage(error, 'No pudimos cancelar la partida.')
    toast.add({ title: 'No se pudo cancelar', description: itemCancelError.value, color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    itemCancelling.value = false
  }
}
</script>

<template>
  <DashboardShell eyebrow="Ventas" title="Historial de ventas">
    <div class="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <section aria-labelledby="sales-history-title" :aria-busy="isLoading || isRefreshing">
        <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="sales-history-title" class="text-xl font-bold">Ventas registradas</h2>
            <p class="mt-1 text-sm text-[#78827c]">Consulta tickets, totales y el colaborador que realizó cada venta.</p>
          </div>
          <UButton to="/dashboard/ventas" label="Nueva venta" icon="i-lucide-shopping-cart" />
        </div>

        <UCard class="mb-4" :ui="{ root: 'rounded-2xl ring-[#dde3de]', body: 'p-4' }">
          <div class="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
            <UFormField label="Número de ticket" name="sales-folio">
              <UInput
                v-model="folioSearch"
                type="number"
                inputmode="numeric"
                min="1"
                placeholder="Ej. 125"
                class="w-full"
                aria-label="Buscar venta por número de ticket"
              />
            </UFormField>
            <UFormField label="Desde" name="sales-start-date">
              <UInput v-model="startDate" type="date" class="w-full" aria-label="Filtrar ventas desde fecha" />
            </UFormField>
            <UFormField label="Hasta" name="sales-end-date">
              <UInput v-model="endDate" type="date" class="w-full" aria-label="Filtrar ventas hasta fecha" />
            </UFormField>
            <UButton
              label="Limpiar filtros"
              icon="i-lucide-eraser"
              color="neutral"
              variant="soft"
              :disabled="!startDate && !endDate && !folioSearch"
              @click="clearFilters"
            />
          </div>
        </UCard>

        <UAlert v-if="error" class="mb-4" color="error" variant="soft" icon="i-lucide-circle-alert" title="No pudimos cargar el historial" description="Intenta nuevamente en unos segundos.">
          <template #actions><UButton label="Reintentar" color="error" variant="soft" size="sm" @click="refresh()" /></template>
        </UAlert>

        <div v-if="isRefreshing" class="mb-3 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status" aria-live="polite">
          <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" aria-hidden="true" />
          <span>Actualizando historial…</span>
        </div>

        <USkeleton v-if="isLoading" class="h-96 rounded-2xl" />
        <div v-else-if="!sales.length" class="rounded-2xl border border-dashed border-[#d8ddd9] bg-white p-12 text-center">
          <UIcon name="i-lucide-receipt-text" class="mx-auto size-9 text-[#929d96]" />
          <h3 class="mt-4 font-semibold">Aún no hay ventas</h3>
          <p class="mt-1 text-sm text-[#7d8781]">Cuando cobres una venta, aparecerá aquí con su ticket.</p>
        </div>

        <div v-else class="overflow-hidden rounded-2xl border border-[#e1e6e2] bg-white">
          <ul class="divide-y divide-[#edf0ed]" aria-label="Historial de ventas">
            <li v-for="sale in sales" :key="sale.id">
              <button class="flex w-full flex-col gap-3 p-4 text-left transition hover:bg-[#f7f9f7] focus-visible:bg-[#f2f6f3] sm:flex-row sm:items-center sm:justify-between sm:px-5" @click="openDetail(sale)">
                <span class="flex min-w-0 items-center gap-3">
                  <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eaf2ed] text-[#286047]"><UIcon name="i-lucide-receipt" class="size-5" /></span>
                  <span class="min-w-0">
                    <span class="flex flex-wrap items-center gap-2">
                      <span class="block font-semibold">Ticket #{{ sale.folio }}</span>
                      <UBadge v-if="sale.canceledAt" label="Cancelado" color="error" variant="soft" size="sm" />
                      <UBadge v-else-if="sale.canCancel" label="Caja actual" color="success" variant="soft" size="sm" />
                    </span>
                    <span class="mt-1 block text-xs text-[#7d8781]">{{ dateTime.format(new Date(sale.createdAt)) }} · {{ sale.seller.fullName }} · {{ paymentMethodLabels[sale.paymentMethod] }}</span>
                  </span>
                </span>
                <span class="flex items-center justify-between gap-4 sm:block sm:text-right">
                  <span class="block font-bold" :class="sale.canceledAt ? 'text-red-700 line-through' : 'text-[#1f4937]'">{{ currency.format(sale.paymentTotal) }}</span>
                  <span class="mt-1 block text-xs text-[#7d8781]">{{ sale.items.length }} partidas</span>
                </span>
              </button>
            </li>
          </ul>
          <div class="flex flex-col gap-4 border-t border-[#edf0ed] bg-[#fbfcfb] p-4 lg:flex-row lg:items-end lg:justify-between">
            <p class="text-sm text-[#7d8781]" role="status" aria-live="polite">Mostrando {{ pageStart }}-{{ pageEnd }} de {{ data.total }} ventas</p>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
              <UFormField label="Mostrar" name="sales-limit" size="xs">
                <USelect v-model="limit" :items="limitOptions" value-key="value" label-key="label" aria-label="Ventas por página" class="w-full sm:w-44" />
              </UFormField>
              <nav class="flex items-center justify-center gap-2" aria-label="Paginación de ventas">
                <UButton type="button" icon="i-lucide-chevron-left" label="Anterior" color="neutral" variant="soft" :disabled="page <= 1 || isRefreshing" @click="goToPage(page - 1)" />
                <span class="min-w-24 text-center text-sm font-semibold text-[#536057]">Página {{ page }} de {{ pageCount }}</span>
                <UButton type="button" trailing-icon="i-lucide-chevron-right" label="Siguiente" color="neutral" variant="soft" :disabled="page >= pageCount || isRefreshing" @click="goToPage(page + 1)" />
              </nav>
            </div>
          </div>
        </div>
      </section>

      <USlideover v-model:open="detailOpen" title="Ticket de venta" description="Detalle completo de la venta">
        <template #body>
          <div v-if="selectedSale" class="space-y-5">
            <div class="rounded-2xl border border-[#e1e6e2] bg-white p-5">
              <p class="text-xs uppercase tracking-[.18em] text-[#7d8781]">ABR Store</p>
              <div class="mt-1 flex flex-wrap items-center gap-2">
                <h3 class="text-xl font-bold">Ticket #{{ selectedSale.folio }}</h3>
                <UBadge v-if="selectedSale.canceledAt" label="Cancelado" color="error" variant="soft" />
                <UBadge v-else-if="selectedSale.canCancel" label="Cancelable" color="success" variant="soft" />
              </div>
              <p class="mt-1 text-sm text-[#7d8781]">{{ dateTime.format(new Date(selectedSale.createdAt)) }}</p>
              <UAlert
                v-if="selectedSale.canceledAt"
                class="mt-4"
                color="error"
                variant="soft"
                icon="i-lucide-ban"
                title="Ticket cancelado"
                :description="`Cancelado por ${selectedSale.canceledBy?.fullName || 'usuario'}${selectedSale.cancelReason ? ` · ${selectedSale.cancelReason}` : ''}`"
              />
              <p class="mt-2 text-xs text-[#7d8781]">Forma de pago: {{ paymentMethodLabels[selectedSale.paymentMethod] }}</p>
              <div v-if="shouldRoundPaymentMethod(selectedSale.paymentMethod)" class="mt-3 grid gap-1 rounded-xl bg-[#f7faf8] p-3 text-xs text-[#68746d]">
                <p>Total a cobrar: <span class="font-semibold">{{ currency.format(selectedSale.paymentTotal) }}</span></p>
                <p v-if="selectedSale.paymentMethod === 'CASH'">Recibido: <span class="font-semibold">{{ currency.format(selectedSale.cashReceived ?? 0) }}</span></p>
                <p v-if="selectedSale.paymentMethod === 'CASH'">Cambio: <span class="font-semibold">{{ currency.format(selectedSale.changeDue ?? 0) }}</span></p>
              </div>
              <div class="mt-4 rounded-xl bg-[#f7faf8] p-3 text-sm">
                <p class="font-semibold">Vendedor</p>
                <p class="mt-1 text-[#68746d]">{{ selectedSale.seller.fullName }}</p>
                <p class="text-xs text-[#89928d]">{{ selectedSale.seller.email }}</p>
              </div>
            </div>
            <div class="overflow-hidden rounded-2xl border border-[#e1e6e2] bg-white">
              <ul class="divide-y divide-[#edf0ed]">
                <li v-for="item in selectedSale.items" :key="item.id" class="p-4" :class="item.canceledAt ? 'bg-red-50/60' : ''">
                  <div class="flex justify-between gap-4">
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <p class="truncate text-sm font-semibold" :class="item.canceledAt ? 'text-red-800 line-through' : ''">{{ item.name }}</p>
                        <UBadge v-if="item.canceledAt" label="Cancelado" color="error" variant="soft" size="sm" />
                      </div>
                      <p class="mt-1 text-xs text-[#7d8781]">{{ item.sku }} · {{ item.quantity }} {{ item.unit === 'KILOGRAM' ? 'kg' : 'pzas' }} × {{ currency.format(item.unitPrice) }}</p>
                      <p v-if="item.cancelReason" class="mt-1 text-xs text-red-700">Motivo: {{ item.cancelReason }}</p>
                    </div>
                    <div class="shrink-0 text-right">
                      <p class="whitespace-nowrap text-sm font-bold" :class="item.canceledAt ? 'text-red-700 line-through' : ''">{{ currency.format(item.lineTotal) }}</p>
                      <UButton
                        v-if="selectedSale.canCancel && !item.canceledAt && !selectedSale.canceledAt"
                        label="Cancelar"
                        icon="i-lucide-undo-2"
                        color="error"
                        variant="ghost"
                        size="xs"
                        class="mt-2"
                        @click="openItemCancel(item)"
                      />
                    </div>
                  </div>
                </li>
              </ul>
              <div class="border-t border-[#edf0ed] bg-[#fbfcfb] p-4">
                <div class="flex items-end justify-between">
                  <p class="text-lg font-bold">{{ shouldRoundPaymentMethod(selectedSale.paymentMethod) ? 'Subtotal' : 'Total' }}</p>
                  <p class="text-3xl font-bold tracking-[-.04em] text-[#1f4937]">{{ currency.format(selectedSale.total) }}</p>
                </div>
                <div v-if="shouldRoundPaymentMethod(selectedSale.paymentMethod) && selectedSale.paymentTotal !== selectedSale.total" class="mt-3 flex items-center justify-between">
                  <p class="text-sm text-[#748078]">Total cobrado</p>
                  <p class="text-xl font-bold text-[#1f4937]">{{ currency.format(selectedSale.paymentTotal) }}</p>
                </div>
              </div>
            </div>

            <UCard v-if="!selectedSale.canceledAt" :ui="{ root: 'rounded-2xl ring-[#e1e6e2]', body: 'p-4' }">
              <div v-if="selectedSale.canCancel" class="space-y-3">
                <div>
                  <h4 class="font-bold text-red-950">Cancelar ticket</h4>
                  <p class="mt-1 text-sm text-[#7d8781]">Solo aplica para tickets de la caja abierta actual. Al cancelar, el stock regresa al inventario y la venta deja de contar en el corte.</p>
                </div>
                <UFormField label="Motivo" name="cancelReason" required>
                  <UTextarea v-model="cancelReason" :rows="3" placeholder="Ej. Cliente se arrepintió, error de captura…" class="w-full" />
                </UFormField>
                <ActionFeedback v-if="cancelError" :message="cancelError" type="error" @dismiss="cancelError = ''" />
                <UButton block label="Cancelar ticket" icon="i-lucide-ban" color="error" :loading="cancelling" @click="cancelSale" />
              </div>
              <UAlert v-else color="neutral" variant="soft" icon="i-lucide-lock" title="No se puede cancelar" description="Este ticket no pertenece a la caja abierta actual o la caja ya fue cerrada." />
            </UCard>
          </div>
        </template>
      </USlideover>

      <UModal v-model:open="itemCancelOpen" title="Cancelar producto" description="Cancela únicamente esta partida del ticket.">
        <template #body>
          <div class="space-y-4">
            <div v-if="selectedItemToCancel" class="rounded-xl bg-[#f7faf8] p-3 text-sm">
              <p class="font-semibold">{{ selectedItemToCancel.name }}</p>
              <p class="mt-1 text-xs text-[#7d8781]">
                {{ selectedItemToCancel.sku }} · {{ currency.format(selectedItemToCancel.lineTotal) }}
              </p>
            </div>
            <UFormField label="Motivo" name="itemCancelReason" required>
              <UTextarea v-model="itemCancelReason" :rows="3" placeholder="Ej. Cliente devolvió este producto, error de captura…" class="w-full" />
            </UFormField>
            <ActionFeedback v-if="itemCancelError" :message="itemCancelError" type="error" @dismiss="itemCancelError = ''" />
            <p class="text-xs text-[#7d8781]">
              Si el producto pertenece al inventario, su stock regresará automáticamente. El total del ticket se recalculará.
            </p>
          </div>
        </template>
        <template #footer>
          <div class="flex w-full justify-end gap-2">
            <UButton label="Cerrar" color="neutral" variant="ghost" @click="itemCancelOpen = false" />
            <UButton label="Cancelar producto" icon="i-lucide-undo-2" color="error" :loading="itemCancelling" @click="cancelSaleItem" />
          </div>
        </template>
      </UModal>
    </div>
  </DashboardShell>
</template>
