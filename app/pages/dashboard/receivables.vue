<script setup lang="ts">
import type { PaymentMethod, SalesHistoryResponse, SaleTicket } from '~/types'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Cuentas por cobrar' })

const page = ref(1)
const limit = ref(10)
const statusFilter = ref<'pending' | 'paid' | 'all'>('pending')
const selectedSale = ref<SaleTicket | null>(null)
const payModalOpen = ref(false)
const paying = ref(false)
const payError = ref('')
const paymentMethod = ref<Exclude<PaymentMethod, 'CREDIT'>>('CASH')
const cashReceived = ref('')
const toast = useToast()
const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const dateTime = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' })

const statusOptions = [
 { label: 'Pendientes', value: 'pending' },
 { label: 'Pagadas', value: 'paid' },
 { label: 'Todas', value: 'all' }
]
const limitOptions = [
 { label: '10', value: 10 },
 { label: '20', value: 20 },
 { label: '50', value: 50 }
]
const paymentMethodOptions: Array<{ label: string, value: Exclude<PaymentMethod, 'CREDIT'> }> = [
 { label: 'Efectivo', value: 'CASH' },
 { label: 'Tarjeta', value: 'CARD' },
 { label: 'Transferencia', value: 'TRANSFER' }
]

const data = ref<SalesHistoryResponse>({ items: [], total: 0, page: 1, limit: 10, pageCount: 1 })
const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const error = ref('')
const hasCachedPage = ref(false)
const cacheKey = computed(() => `abr_receivables_${statusFilter.value}_${page.value}_${limit.value}`)

const isLoading = computed(() => status.value === 'pending' && !data.value.items.length)
const isRefreshing = computed(() => status.value === 'pending' && data.value.items.length > 0 && !hasCachedPage.value)
const pageStart = computed(() => data.value.total ? (data.value.page - 1) * data.value.limit + 1 : 0)
const pageEnd = computed(() => Math.min(data.value.page * data.value.limit, data.value.total))
const pendingTotal = computed(() => data.value.items
 .filter(sale => !sale.creditPaidAt)
 .reduce((sum, sale) => sum + sale.paymentTotal, 0))
const selectedPaymentTotal = computed(() => selectedSale.value?.paymentTotal ?? 0)
const payableTotal = computed(() => shouldRoundPaymentMethod(paymentMethod.value) ? roundPayableTotal(selectedPaymentTotal.value) : selectedPaymentTotal.value)
const cashReceivedAmount = computed(() => Number(cashReceived.value))
const cashReceivedIsInsufficient = computed(() => paymentMethod.value === 'CASH' && (!Number.isFinite(cashReceivedAmount.value) || cashReceivedAmount.value < payableTotal.value))
const changeDue = computed(() => paymentMethod.value === 'CASH' && Number.isFinite(cashReceivedAmount.value) ? Math.max(cashReceivedAmount.value - payableTotal.value, 0) : 0)

watch([statusFilter, limit], () => {
 page.value = 1
})

function readCachedReceivables() {
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

function writeCachedReceivables(nextData: SalesHistoryResponse) {
 if (!import.meta.client) return
 localStorage.setItem(cacheKey.value, JSON.stringify(nextData))
}

async function refresh() {
 status.value = 'pending'
 error.value = ''

 try {
 const nextData = await $fetch<SalesHistoryResponse>('/api/receivables', {
 query: {
 page: page.value,
 limit: limit.value,
 status: statusFilter.value
 }
 })
 data.value = nextData
 writeCachedReceivables(nextData)
 hasCachedPage.value = false
 status.value = 'success'
 } catch (fetchError: unknown) {
 error.value = getErrorMessage(fetchError, 'No pudimos cargar las cuentas por cobrar.')
 status.value = 'error'
 }
}

onMounted(() => {
 readCachedReceivables()
 void refresh()
})

watch([page, limit, statusFilter], () => {
 readCachedReceivables()
 void refresh()
})

function paymentLabel(method: PaymentMethod | null) {
 if (method === 'CARD') return 'Tarjeta'
 if (method === 'TRANSFER') return 'Transferencia'
 if (method === 'CREDIT') return 'Fiado'
 return 'Efectivo'
}

function goToPage(nextPage: number) {
 page.value = Math.min(Math.max(nextPage, 1), data.value.pageCount)
}

function openPayModal(sale: SaleTicket) {
 selectedSale.value = sale
 paymentMethod.value = 'CASH'
 cashReceived.value = ''
 payError.value = ''
 payModalOpen.value = true
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

async function markAsPaid() {
 if (!selectedSale.value || paying.value) return
 if (cashReceivedIsInsufficient.value) {
 payError.value = `Ingresa al menos ${currency.format(payableTotal.value)} para registrar el pago en efectivo.`
 return
 }

 paying.value = true
 payError.value = ''

 try {
 await $fetch<SaleTicket>(`/api/receivables/${selectedSale.value.id}/pay`, {
 method: 'POST',
 body: {
 paymentMethod: paymentMethod.value,
 cashReceived: paymentMethod.value === 'CASH' ? cashReceivedAmount.value : null
 }
 })
 toast.add({
 title: 'Cuenta pagada',
 description: `Ticket #${selectedSale.value.folio} marcado como pagado.`,
 color: 'success',
 icon: 'i-lucide-circle-check'
 })
 payModalOpen.value = false
 selectedSale.value = null
 cashReceived.value = ''
 await refresh()
 } catch (error: unknown) {
 payError.value = getErrorMessage(error, 'No pudimos marcar la cuenta como pagada.')
 toast.add({ title: 'No se pudo actualizar', description: payError.value, color: 'error', icon: 'i-lucide-circle-alert' })
 } finally {
 paying.value = false
 }
}

watch(paymentMethod, (method) => {
 if (method !== 'CASH') cashReceived.value = ''
})
</script>

<template>
 <DashboardShell eyebrow="Ventas" title="Cuentas por cobrar">
 <div class="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
 <div class="mb-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
 <div>
 <h2 class="text-xl font-bold">Ventas fiadas</h2>
 <p class="mt-1 text-sm text-[#78827c]">Consulta ventas pendientes de pago y márcalas como pagadas cuando el cliente liquide.</p>
 </div>
 <div class="grid gap-3">
 <UFormField label="Estado">
 <USelect v-model="statusFilter" :items="statusOptions" value-key="value" label-key="label" class="w-full sm:w-44" />
 </UFormField>
 </div>
 </div>

 <UAlert
 v-if="isRefreshing"
 class="mb-4"
 color="neutral"
 variant="soft"
 icon="i-lucide-refresh-cw"
 title="Actualizando cuentas"
 description="Estamos consultando cambios recientes."
 />

 <UAlert v-if="error" class="mb-4" color="error" variant="soft" icon="i-lucide-circle-alert" title="No pudimos cargar las cuentas">
 <template #actions>
 <UButton label="Reintentar" color="error" variant="soft" @click="refresh()" />
 </template>
 </UAlert>

 <div class="mb-4 grid gap-4 md:grid-cols-3">
 <UCard :ui="{ root: 'rounded-2xl ring-[#dde3de]', body: 'p-5' }">
 <p class="text-sm text-[#78827c]">Registros encontrados</p>
 <p class="mt-2 text-3xl font-black text-[#1f4937]">{{ data.total }}</p>
 </UCard>
 <UCard :ui="{ root: 'rounded-2xl ring-amber-200 bg-amber-50/70', body: 'p-5' }">
 <p class="text-sm text-amber-800">Pendiente visible</p>
 <p class="mt-2 text-3xl font-black text-amber-950">{{ currency.format(pendingTotal) }}</p>
 </UCard>
 <UCard :ui="{ root: 'rounded-2xl ring-[#dde3de]', body: 'p-5' }">
 <p class="text-sm text-[#78827c]">Página</p>
 <p class="mt-2 text-3xl font-black text-[#1f4937]">{{ data.page }} / {{ data.pageCount }}</p>
 </UCard>
 </div>

 <div v-if="isLoading" class="grid gap-3">
 <USkeleton v-for="item in 5" :key="item" class="h-24 rounded-2xl" />
 </div>

 <div v-else-if="!data.items.length" class="rounded-2xl border border-dashed border-[#d8ddd9] bg-white p-10 text-center">
 <UIcon name="i-lucide-hand-coins" class="mx-auto size-9 text-[#9aa49e]" aria-hidden="true" />
 <h3 class="mt-3 font-bold">No hay cuentas por cobrar</h3>
 <p class="mt-1 text-sm text-[#78827c]">Cuando cobres una venta como fiado aparecerá en este apartado.</p>
 </div>

 <div v-else class="overflow-hidden rounded-2xl border border-[#dfe5e0] bg-white">
 <ul class="divide-y divide-[#edf0ed]" aria-label="Lista de cuentas por cobrar">
 <li v-for="sale in data.items" :key="sale.id" class="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
 <div class="min-w-0">
 <div class="flex flex-wrap items-center gap-2">
 <h3 class="font-bold">Ticket #{{ sale.folio }}</h3>
 <UBadge :label="sale.creditPaidAt ? 'Pagada' : 'Pendiente'" :color="sale.creditPaidAt ? 'success' : 'warning'" variant="soft" />
 <UBadge :label="paymentLabel(sale.creditPaymentMethod || sale.paymentMethod)" color="neutral" variant="soft" />
 </div>
 <p class="mt-1 text-base font-semibold text-[#1f4937]">{{ sale.creditCustomerName || 'Cliente sin nombre' }}</p>
 <p class="mt-1 text-sm text-[#78827c]">
 {{ dateTime.format(new Date(sale.createdAt)) }} · Vendió {{ sale.seller.fullName }} · {{ sale.itemCount }} artículos
 </p>
 <p v-if="sale.creditNote" class="mt-1 text-sm text-[#68746d]">{{ sale.creditNote }}</p>
 <p v-if="sale.creditPaidAt" class="mt-1 text-xs text-emerald-700">
 Pagada el {{ dateTime.format(new Date(sale.creditPaidAt)) }} por {{ sale.creditPaidBy?.fullName || 'usuario del sistema' }}.
 </p>
 </div>
 <div class="flex flex-wrap items-center justify-between gap-3 lg:justify-end">
 <p class="text-right text-2xl font-black tracking-[-.04em] text-[#233071]">{{ currency.format(sale.paymentTotal) }}</p>
 <UButton
 v-if="!sale.creditPaidAt"
 label="Marcar pagada"
 icon="i-lucide-check"
 color="primary"
 @click="openPayModal(sale)"
 />
 </div>
 </li>
 </ul>
 </div>

 <div v-if="!isLoading && data.total" class="mt-5 flex flex-col gap-4 rounded-2xl border border-[#edf0ed] bg-white p-4 lg:flex-row lg:items-end lg:justify-between">
 <p class="text-sm text-[#7d8781]" role="status" aria-live="polite">
 Mostrando {{ pageStart }}-{{ pageEnd }} de {{ data.total }} cuentas
 </p>
 <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
 <UFormField label="Mostrar" name="receivables-limit" size="xs">
 <USelect v-model="limit" :items="limitOptions" value-key="value" label-key="label" aria-label="Cuentas por página" class="w-full sm:w-32" />
 </UFormField>
 <nav class="flex items-center justify-center gap-2" aria-label="Paginación de cuentas por cobrar">
 <UButton type="button" icon="i-lucide-chevron-left" label="Anterior" color="neutral" variant="soft" :disabled="page <= 1 || isRefreshing" @click="goToPage(page - 1)" />
 <span class="min-w-24 text-center text-sm font-semibold text-[#536057]">Página {{ page }} de {{ data.pageCount }}</span>
 <UButton type="button" trailing-icon="i-lucide-chevron-right" label="Siguiente" color="neutral" variant="soft" :disabled="page >= data.pageCount || isRefreshing" @click="goToPage(page + 1)" />
 </nav>
 </div>
 </div>

 <UModal v-model:open="payModalOpen" title="Marcar cuenta como pagada" description="Selecciona cómo liquidó el cliente esta venta fiada.">
 <template #body>
 <div v-if="selectedSale" class="space-y-4">
 <div class="rounded-2xl bg-[#f7faf8] p-4">
 <p class="text-sm text-[#78827c]">Ticket #{{ selectedSale.folio }}</p>
 <p class="mt-1 font-bold text-[#1f4937]">{{ selectedSale.creditCustomerName || 'Cliente sin nombre' }}</p>
 <p v-if="selectedSale.creditNote" class="mt-1 text-sm text-[#68746d]">{{ selectedSale.creditNote }}</p>
 <p class="mt-1 text-3xl font-black text-[#233071]">{{ currency.format(payableTotal) }}</p>
 <p v-if="shouldRoundPaymentMethod(paymentMethod) && payableTotal !== selectedPaymentTotal" class="mt-1 text-xs text-[#68746d]">
 Subtotal {{ currency.format(selectedPaymentTotal) }} · ajuste por redondeo {{ currency.format(payableTotal - selectedPaymentTotal) }}
 </p>
 </div>
 <UFormField label="Forma de pago" required>
 <USelect v-model="paymentMethod" :items="paymentMethodOptions" value-key="value" label-key="label" class="w-full" />
 </UFormField>
 <div v-if="paymentMethod === 'CASH'" class="space-y-3">
 <UFormField label="Efectivo recibido" required>
 <UInput
 v-model="cashReceived"
 type="number"
 inputmode="decimal"
 min="0"
 step="0.01"
 placeholder="0.00"
 class="w-full"
 aria-label="Efectivo recibido para pagar cuenta por cobrar"
 />
 </UFormField>
 <div class="grid gap-2 sm:grid-cols-2">
 <div class="rounded-xl border border-emerald-100 bg-emerald-50/80 p-3">
 <p class="text-xs font-semibold uppercase tracking-wide text-emerald-800">Total a cobrar</p>
 <p class="mt-1 text-xl font-black text-emerald-950">{{ currency.format(payableTotal) }}</p>
 </div>
 <div class="rounded-xl border border-orange-100 bg-orange-50/80 p-3">
 <p class="text-xs font-semibold uppercase tracking-wide text-orange-800">Cambio</p>
 <p class="mt-1 text-xl font-black text-orange-800">{{ currency.format(changeDue) }}</p>
 </div>
 </div>
 <p v-if="cashReceivedIsInsufficient" class="text-xs text-amber-700">
 Ingresa al menos {{ currency.format(payableTotal) }} para registrar el pago en efectivo.
 </p>
 <UAlert
 color="info"
 variant="soft"
 icon="i-lucide-info"
 title="Pago en efectivo"
 description="Se registrará como entrada de efectivo en la caja abierta actual."
 />
 </div>
 <ActionFeedback v-if="payError" :message="payError" type="error" @dismiss="payError = ''" />
 </div>
 </template>
 <template #footer>
 <div class="flex w-full justify-end gap-2">
 <UButton label="Cancelar" color="neutral" variant="ghost" @click="payModalOpen = false" />
 <UButton label="Confirmar pago" icon="i-lucide-check" :loading="paying" :disabled="cashReceivedIsInsufficient" @click="markAsPaid" />
 </div>
 </template>
 </UModal>
 </div>
 </DashboardShell>
</template>
