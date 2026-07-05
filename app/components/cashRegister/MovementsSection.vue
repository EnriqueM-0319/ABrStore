<script setup lang="ts">
import type { CashMovement, CashMovementPaginatedResponse, CashMovementType } from '~/types'

const form = reactive({ type: 'SUPPLIER_PAYMENT' as CashMovementType, amount: '', description: '' })
const saving = ref(false)
const formError = ref('')
const lastMovement = ref<CashMovement | null>(null)
const page = ref(1)
const limit = ref(10)
const toast = useToast()
const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const dateTime = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
const movementOptions = [
 { label: 'Pago a proveedor', value: 'SUPPLIER_PAYMENT' },
 { label: 'Retiro de efectivo', value: 'WITHDRAWAL' },
 { label: 'Gasto operativo', value: 'EXPENSE' },
 { label: 'Entrada de efectivo', value: 'CASH_IN' },
 { label: 'Ajuste', value: 'ADJUSTMENT' }
]
const limitOptions = [{ label: '10 por página', value: 10 }, { label: '20 por página', value: 20 }, { label: '50 por página', value: 50 }]

const { cashSession, status: cashStatus, init: initCashSession, refresh: refreshCash } = useCurrentCashSession()

onMounted(() => initCashSession())

const { data, status, error, refresh } = useFetch<CashMovementPaginatedResponse>('/api/cashMovements', {
 query: { page, limit },
 default: () => ({ items: [], total: 0, page: 1, limit: 10, pageCount: 1 }),
 lazy: true,
 server: false,
 watch: [page, limit]
})

const movements = computed(() => data.value.items)
const pageCount = computed(() => data.value.pageCount)
const pageStart = computed(() => data.value.total ? (data.value.page - 1) * data.value.limit + 1 : 0)
const pageEnd = computed(() => Math.min(data.value.page * data.value.limit, data.value.total))
const isLoading = computed(() => status.value === 'pending' && !movements.value.length)
const isRefreshing = computed(() => status.value === 'pending' && movements.value.length > 0)

watch(limit, () => {
 page.value = 1
})

function movementLabel(type: CashMovementType) {
 return movementOptions.find(option => option.value === type)?.label || type
}

function movementColor(type: CashMovementType) {
 return type === 'CASH_IN' ? 'success' : type === 'ADJUSTMENT' ? 'warning' : 'error'
}

function goToPage(nextPage: number) {
 page.value = Math.min(Math.max(nextPage, 1), pageCount.value)
}

async function saveMovement() {
 saving.value = true
 formError.value = ''
 try {
 const movement = await $fetch<CashMovement>('/api/cashMovements', {
 method: 'POST',
 body: {
 type: form.type,
 amount: Number(form.amount),
 description: form.description
 }
 })
 lastMovement.value = movement
 toast.add({ title: 'Movimiento registrado', description: `${movementLabel(movement.type)} por ${currency.format(movement.amount)}.`, color: 'success', icon: 'i-lucide-wallet-cards' })
 Object.assign(form, { type: 'SUPPLIER_PAYMENT', amount: '', description: '' })
 await Promise.all([refresh(), refreshCash({ force: true })])
 } catch (error: unknown) {
 formError.value = getErrorMessage(error, 'No pudimos registrar el movimiento.')
 toast.add({ title: 'No se pudo registrar', description: formError.value, color: 'error', icon: 'i-lucide-circle-alert' })
 } finally {
 saving.value = false
 }
}
</script>

<template>
 <div class="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
 <UAlert v-if="cashStatus === 'pending'" class="mb-5" color="neutral" variant="soft" icon="i-lucide-loader-circle" title="Consultando caja abierta" />
 <UAlert v-else-if="!cashSession" class="mb-5" color="warning" variant="soft" icon="i-lucide-cash" title="No hay caja abierta" description="Abre caja desde el punto de venta para registrar movimientos.">
 <template #actions><UButton to="/dashboard/sales" label="Ir a punto de venta" color="warning" variant="soft" /></template>
 </UAlert>
 <UAlert v-else class="mb-5" color="success" variant="soft" icon="i-lucide-cash" title="Caja abierta" :description="`Fondo inicial: ${currency.format(cashSession.openingAmount)} · Responsable: ${cashSession.openedBy.fullName}`" />

 <div class="grid items-start gap-5 xl:grid-cols-[minmax(22rem,.65fr)_minmax(0,1.35fr)]">
 <UCard :ui="{ root: 'rounded-2xl ring-[#dde3de]', header: 'p-5 sm:px-6', body: 'p-5 sm:px-6' }">
 <template #header>
 <h2 class="font-bold">Registrar movimiento</h2>
 <p class="mt-1 text-sm text-[#64748b]">Pagos a proveedores, gastos, retiros, entradas o ajustes.</p>
 </template>

 <form class="space-y-4" @submit.prevent="saveMovement">
 <UFormField label="Tipo" name="type" required>
 <USelect v-model="form.type" :items="movementOptions" value-key="value" label-key="label" class="w-full" />
 </UFormField>
 <UFormField label="Monto" name="amount" required>
 <UInput v-model="form.amount" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0.00" class="w-full" />
 </UFormField>
 <UFormField label="Descripción" name="description" required>
 <UTextarea v-model="form.description" :rows="4" placeholder="Ej. Pago proveedor refrescos, retiro para cambio…" class="w-full" />
 </UFormField>
 <ActionFeedback v-if="formError" :message="formError" type="error" @dismiss="formError = ''" />
 <ActionFeedback v-if="lastMovement" :message="`Último movimiento: ${movementLabel(lastMovement.type)} por ${currency.format(lastMovement.amount)}.`" @dismiss="lastMovement = null" />
 <UButton type="submit" block label="Guardar movimiento" icon="i-lucide-wallet-cards" :loading="saving" :disabled="!cashSession" />
 </form>
 </UCard>

 <section aria-labelledby="cash-movement-history" :aria-busy="isLoading || isRefreshing">
 <div class="mb-4">
 <h2 id="cash-movement-history" class="text-xl font-bold">Movimientos de la caja actual</h2>
 <p class="mt-1 text-sm text-[#64748b]">Estos importes se contemplarán en el cierre de caja.</p>
 </div>

 <UAlert v-if="error" class="mb-4" color="error" variant="soft" title="No pudimos cargar movimientos">
 <template #actions><UButton label="Reintentar" color="error" variant="soft" size="sm" @click="refresh()" /></template>
 </UAlert>
 <div v-if="isRefreshing" class="mb-3 flex items-center gap-2 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-slate-600" role="status" aria-live="polite">
 <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
 <span>Actualizando movimientos…</span>
 </div>
 <USkeleton v-if="isLoading" class="h-96 rounded-2xl" />
 <div v-else-if="!movements.length" class="rounded-2xl border border-dashed border-[#c7dbe8] bg-white p-12 text-center">
 <UIcon name="i-lucide-wallet-cards" class="mx-auto size-9 text-[#94a3b8]" />
 <h3 class="mt-4 font-semibold">Sin movimientos</h3>
 <p class="mt-1 text-sm text-[#64748b]">Los movimientos de la caja abierta aparecerán aquí.</p>
 </div>
 <div v-else class="overflow-hidden rounded-2xl border border-[#d8e7f1] bg-white">
 <ul class="divide-y divide-[#d8e7f1]">
 <li v-for="movement in movements" :key="movement.id" class="p-4 sm:px-5">
 <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
 <div class="min-w-0">
 <div class="flex flex-wrap items-center gap-2">
 <p class="font-semibold">{{ movement.description }}</p>
 <UBadge :label="movementLabel(movement.type)" :color="movementColor(movement.type)" variant="soft" size="sm" />
 </div>
 <p class="mt-1 text-xs text-[#64748b]">{{ movement.createdBy.fullName }} · {{ dateTime.format(new Date(movement.createdAt)) }}</p>
 </div>
 <p class="whitespace-nowrap text-lg font-bold" :class="movement.type === 'CASH_IN' ? 'text-sky-700' : 'text-red-700'">{{ currency.format(movement.amount) }}</p>
 </div>
 </li>
 </ul>
 <div class="flex flex-col gap-3 border-t border-[#d8e7f1] bg-[#f7fafc] p-4 sm:flex-row sm:items-end sm:justify-between">
 <p class="text-sm text-[#64748b]">Mostrando {{ pageStart }}-{{ pageEnd }} de {{ data.total }} movimientos</p>
 <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
 <UFormField label="Mostrar" size="xs"><USelect v-model="limit" :items="limitOptions" value-key="value" label-key="label" class="w-full sm:w-44" /></UFormField>
 <nav class="flex items-center gap-2" aria-label="Paginación de movimientos">
 <UButton label="Anterior" icon="i-lucide-chevron-left" variant="soft" color="neutral" :disabled="page <= 1 || isRefreshing" @click="goToPage(page - 1)" />
 <span class="min-w-24 text-center text-sm font-semibold">Página {{ page }} de {{ pageCount }}</span>
 <UButton label="Siguiente" trailing-icon="i-lucide-chevron-right" variant="soft" color="neutral" :disabled="page >= pageCount || isRefreshing" @click="goToPage(page + 1)" />
 </nav>
 </div>
 </div>
 </div>
 </section>
 </div>
 </div>
</template>
