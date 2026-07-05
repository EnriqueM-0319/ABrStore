<script setup lang="ts">
type SalesReportGroup = 'day' | 'month' | 'year'

type SalesReportItem = {
 period: string
 salesCount: number
 canceledCount: number
 grossTotal: number
 cashTotal: number
 cardTotal: number
 transferTotal: number
 creditTotal: number
 creditPendingTotal: number
 creditPaidTotal: number
 creditCollectedCashTotal: number
 creditCollectedCardTotal: number
 creditCollectedTransferTotal: number
 creditCollectedTotal: number
 averageTicket: number
}

type SalesReportResponse = {
 groupBy: SalesReportGroup
 startDate: string
 endDate: string
 summary: Omit<SalesReportItem, 'period'>
 items: SalesReportItem[]
}

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Reporte de cobros de fiado' })

const { user } = useAuth()
const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const groupBy = ref<SalesReportGroup>('day')
const startDate = ref('')
const endDate = ref('')
const data = ref<SalesReportResponse>(getEmptyReport('day', '', ''))
const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const error = ref('')
const hasCachedReport = ref(false)

const groupOptions: Array<{ label: string, value: SalesReportGroup }> = [
 { label: 'Por día', value: 'day' },
 { label: 'Por mes', value: 'month' },
 { label: 'Por año', value: 'year' }
]

function getEmptyReport(selectedGroup: SalesReportGroup, selectedStartDate: string, selectedEndDate: string): SalesReportResponse {
 return {
 groupBy: selectedGroup,
 startDate: selectedStartDate,
 endDate: selectedEndDate,
 summary: {
 salesCount: 0,
 canceledCount: 0,
 grossTotal: 0,
 cashTotal: 0,
 cardTotal: 0,
 transferTotal: 0,
 creditTotal: 0,
 creditPendingTotal: 0,
 creditPaidTotal: 0,
 creditCollectedCashTotal: 0,
 creditCollectedCardTotal: 0,
 creditCollectedTransferTotal: 0,
 creditCollectedTotal: 0,
 averageTicket: 0
 },
 items: []
 }
}

function toDateInput(date: Date) {
 const year = date.getFullYear()
 const month = String(date.getMonth() + 1).padStart(2, '0')
 const day = String(date.getDate()).padStart(2, '0')
 return `${year}-${month}-${day}`
}

function setCurrentWeek() {
 const now = new Date()
 const day = now.getDay()
 const mondayOffset = day === 0 ? -6 : 1 - day
 const start = new Date(now)
 start.setDate(now.getDate() + mondayOffset)
 const end = new Date(start)
 end.setDate(start.getDate() + 6)
 startDate.value = toDateInput(start)
 endDate.value = toDateInput(end)
}

function setCurrentYear() {
 const now = new Date()
 startDate.value = `${now.getFullYear()}-01-01`
 endDate.value = `${now.getFullYear()}-12-31`
}

function setYearRange() {
 const now = new Date()
 startDate.value = `${now.getFullYear() - 4}-01-01`
 endDate.value = `${now.getFullYear()}-12-31`
}

setCurrentWeek()

const cacheKey = computed(() => `abr_sales_report_${groupBy.value}_${startDate.value || 'all'}_${endDate.value || 'all'}`)

function readCachedReport() {
 hasCachedReport.value = false
 if (!import.meta.client) return false

 const cached = localStorage.getItem(cacheKey.value)
 if (!cached) {
 data.value = getEmptyReport(groupBy.value, startDate.value, endDate.value)
 return false
 }

 try {
 data.value = JSON.parse(cached) as SalesReportResponse
 hasCachedReport.value = true
 return true
 } catch {
 localStorage.removeItem(cacheKey.value)
 data.value = getEmptyReport(groupBy.value, startDate.value, endDate.value)
 return false
 }
}

function writeCachedReport(nextData: SalesReportResponse) {
 if (!import.meta.client) return
 localStorage.setItem(cacheKey.value, JSON.stringify(nextData))
}

async function refresh(background = false) {
 if (!startDate.value || !endDate.value) return

 if (!background) {
 const hasCache = readCachedReport()
 if (hasCache) {
 void refresh(true)
 return
 }
 }

 status.value = 'pending'
 error.value = ''

 try {
 const nextData = await $fetch<SalesReportResponse>('/api/reports/sales', {
 query: {
 groupBy: groupBy.value,
 startDate: startDate.value,
 endDate: endDate.value
 }
 })
 data.value = nextData
 writeCachedReport(nextData)
 hasCachedReport.value = false
 status.value = 'success'
 } catch (err: unknown) {
 error.value = getErrorMessage(err, 'No pudimos cargar el reporte.')
 status.value = 'error'
 }
}

const isLoading = computed(() => status.value === 'pending' && !data.value.items.length)
const isRefreshing = computed(() => status.value === 'pending' && data.value.items.length > 0 && !hasCachedReport.value)
const chartItems = computed(() => fillChartPeriods())
const collectionChartSeries = [
 { key: 'creditCollectedCashTotal', label: 'Cobro efectivo', color: 'bg-sky-600', textColor: 'text-sky-700' },
 { key: 'creditCollectedCardTotal', label: 'Cobro tarjeta', color: 'bg-[#385872]', textColor: 'text-[#385872]' },
 { key: 'creditCollectedTransferTotal', label: 'Cobro transferencia', color: 'bg-sky-500', textColor: 'text-sky-700' }
] as const
const maxCollectionTotal = computed(() => Math.max(
 ...chartItems.value.flatMap(item => collectionChartSeries.map(series => item[series.key])),
 1
))

onMounted(() => {
 if (user.value && !['SUPERADMIN', 'ADMIN'].includes(user.value.role)) {
 void navigateTo('/dashboard/sales')
 return
 }

 void refresh()
})

watch(groupBy, (nextGroup) => {
 if (nextGroup === 'day') setCurrentWeek()
 if (nextGroup === 'month') setCurrentYear()
 if (nextGroup === 'year') setYearRange()
})

watch([groupBy, startDate, endDate], () => {
 void refresh()
})

function formatPeriod(value: string) {
 const date = new Date(value)
 if (groupBy.value === 'year') return new Intl.DateTimeFormat('es-MX', { year: 'numeric' }).format(date)
 if (groupBy.value === 'month') return new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(date)
 return new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: '2-digit', month: 'short' }).format(date)
}

function formatXAxisLabel(value: string) {
 const date = new Date(value)
 if (groupBy.value === 'year') return new Intl.DateTimeFormat('es-MX', { year: 'numeric' }).format(date)
 if (groupBy.value === 'month') return new Intl.DateTimeFormat('es-MX', { month: 'short' }).format(date)
 return new Intl.DateTimeFormat('es-MX', { weekday: 'short' }).format(date)
}

function getPeriodKey(date: Date) {
 if (groupBy.value === 'year') return String(date.getFullYear())
 if (groupBy.value === 'month') return `${date.getFullYear()}-${date.getMonth()}`
 return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function getEmptyPeriod(date: Date): SalesReportItem {
 return {
 period: date.toISOString(),
 salesCount: 0,
 canceledCount: 0,
 grossTotal: 0,
 cashTotal: 0,
 cardTotal: 0,
 transferTotal: 0,
 creditTotal: 0,
 creditPendingTotal: 0,
 creditPaidTotal: 0,
 creditCollectedCashTotal: 0,
 creditCollectedCardTotal: 0,
 creditCollectedTransferTotal: 0,
 creditCollectedTotal: 0,
 averageTicket: 0
 }
}

function fillChartPeriods() {
 const start = new Date(`${data.value.startDate || startDate.value}T00:00:00`)
 const end = new Date(`${data.value.endDate || endDate.value}T00:00:00`)
 if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return data.value.items

 const itemMap = new Map(data.value.items.map(item => [getPeriodKey(new Date(item.period)), item]))
 const periods: SalesReportItem[] = []
 const cursor = new Date(start)

 if (groupBy.value === 'year') {
 cursor.setMonth(0, 1)
 const lastYear = end.getFullYear()
 while (cursor.getFullYear() <= lastYear) {
 periods.push(itemMap.get(getPeriodKey(cursor)) ?? getEmptyPeriod(cursor))
 cursor.setFullYear(cursor.getFullYear() + 1)
 }
 return periods
 }

 if (groupBy.value === 'month') {
 cursor.setDate(1)
 const last = new Date(end.getFullYear(), end.getMonth(), 1)
 while (cursor <= last) {
 periods.push(itemMap.get(getPeriodKey(cursor)) ?? getEmptyPeriod(cursor))
 cursor.setMonth(cursor.getMonth() + 1)
 }
 return periods
 }

 while (cursor <= end) {
 periods.push(itemMap.get(getPeriodKey(cursor)) ?? getEmptyPeriod(cursor))
 cursor.setDate(cursor.getDate() + 1)
 }

 return periods
}

function collectionBarHeight(total: number) {
 return `${Math.max((total / maxCollectionTotal.value) * 100, total > 0 ? 8 : 0)}%`
}
</script>

<template>
 <DashboardShell eyebrow="Administración" title="Reporte de cobros de fiado">
 <div class="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
 <div class="mb-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
 <div>
 <h2 class="text-xl font-bold">Cobros de cuentas fiadas</h2>
 <p class="mt-1 text-sm text-[#64748b]">Analiza cuándo entró realmente el dinero de cuentas por cobrar, separado por forma de pago.</p>
 </div>
 <div class="flex flex-wrap gap-2">
 <UButton to="/dashboard/reports/sales" label="Ver ventas originadas" icon="i-lucide-chart-column" color="neutral" variant="soft" />
 <UButton label="Semana actual" icon="i-lucide-calendar-days" color="neutral" variant="soft" @click="setCurrentWeek" />
 <UButton label="Actualizar" icon="i-lucide-refresh-cw" color="neutral" variant="soft" :loading="status === 'pending'" @click="refresh()" />
 </div>
 </div>

 <UCard class="mb-5" :ui="{ root: 'rounded-2xl ring-[#dde3de]', body: 'p-4' }">
 <div class="grid gap-3 lg:grid-cols-[1fr_1fr_1fr] lg:items-end">
 <UFormField label="Agrupar ventas" name="sales-report-group">
 <USelect v-model="groupBy" :items="groupOptions" value-key="value" label-key="label" class="w-full" />
 </UFormField>
 <UFormField label="Desde" name="sales-report-start">
 <UInput v-model="startDate" type="date" class="w-full" />
 </UFormField>
 <UFormField label="Hasta" name="sales-report-end">
 <UInput v-model="endDate" type="date" class="w-full" />
 </UFormField>
 </div>
 </UCard>

 <UAlert v-if="error" class="mb-5" color="error" variant="soft" icon="i-lucide-circle-alert" title="No pudimos cargar el reporte">
 <template #actions>
 <UButton label="Reintentar" color="error" variant="soft" @click="refresh()" />
 </template>
 </UAlert>

 <UAlert
 v-if="isRefreshing"
 class="mb-5"
 color="neutral"
 variant="soft"
 icon="i-lucide-refresh-cw"
 title="Actualizando reporte"
 description="Mostramos los datos actuales mientras consultamos cambios."
 />

 <div v-if="isLoading" class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
 <USkeleton v-for="item in 4" :key="item" class="h-32 rounded-2xl" />
 </div>

 <template v-else>
 <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
 <UAlert color="success" variant="soft" icon="i-lucide-banknote" title="Cobro fiado efectivo" :description="currency.format(data.summary.creditCollectedCashTotal)" />
 <UAlert color="neutral" variant="soft" icon="i-lucide-credit-card" title="Cobro fiado tarjeta" :description="currency.format(data.summary.creditCollectedCardTotal)" />
 <UAlert color="neutral" variant="soft" icon="i-lucide-send" title="Cobro fiado transferencia" :description="currency.format(data.summary.creditCollectedTransferTotal)" />
 <UAlert color="primary" variant="soft" icon="i-lucide-circle-dollar-sign" title="Fiado cobrado total" :description="currency.format(data.summary.creditCollectedTotal)" />
 </div>

 <UCard class="mt-5" :ui="{ root: 'rounded-2xl ring-[#dde3de]', header: 'p-5', body: 'p-5' }">
 <template #header>
 <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <h3 class="font-bold">Gráfica de cobros de fiado</h3>
 <p class="text-sm text-[#64748b]">{{ data.startDate }} al {{ data.endDate }}</p>
 </div>
 <UBadge :label="groupOptions.find(option => option.value === groupBy)?.label" color="primary" variant="soft" />
 </div>
 </template>

 <div v-if="!data.summary.creditCollectedTotal" class="p-10 text-center">
 <UIcon name="i-lucide-chart-no-axes-combined" class="mx-auto size-9 text-[#94a3b8]" aria-hidden="true" />
 <h4 class="mt-3 font-bold">No hay cobros de fiado en este rango</h4>
 <p class="mt-1 text-sm text-[#64748b]">Cambia las fechas o vuelve cuando existan cuentas liquidadas.</p>
 </div>

 <div v-else class="overflow-x-auto">
 <div class="min-w-[42rem]">
 <div class="mb-3">
 <h4 class="font-semibold text-[#0f172a]">Cobros de fiado</h4>
 <p class="text-xs text-[#64748b]">Muestra cuándo entró realmente el dinero de cuentas fiadas, separado por forma de cobro.</p>
 </div>
 <div class="mb-3 flex items-center justify-between text-xs text-[#64748b]">
 <div class="flex flex-wrap items-center gap-3">
 <span
 v-for="series in collectionChartSeries"
 :key="series.key"
 class="inline-flex items-center gap-1.5"
 :class="series.textColor"
 >
 <span class="size-2.5 rounded-full" :class="series.color" aria-hidden="true" />
 {{ series.label }}
 </span>
 </div>
 <span>Máximo: {{ currency.format(maxCollectionTotal) }}</span>
 </div>
 <div class="flex h-72 items-end gap-3 border-b border-l border-[#c7dbe8] px-3 pt-4" aria-label="Gráfica de barras de cobros de fiado por periodo y forma de pago">
 <div
 v-for="item in chartItems"
 :key="item.period"
 class="flex h-full min-w-16 flex-1 flex-col items-center justify-end gap-2"
 :title="`${formatPeriod(item.period)} · Cobro efectivo ${currency.format(item.creditCollectedCashTotal)} · Cobro tarjeta ${currency.format(item.creditCollectedCardTotal)} · Cobro transferencia ${currency.format(item.creditCollectedTransferTotal)}`"
 >
 <span class="max-w-24 truncate text-xs font-semibold text-[#456a88]">{{ item.creditCollectedTotal ? currency.format(item.creditCollectedTotal) : '' }}</span>
 <div class="flex h-56 w-full items-end justify-center gap-1.5">
 <div
 v-for="series in collectionChartSeries"
 :key="series.key"
 class="w-full max-w-4 rounded-t-lg transition-all"
 :class="item[series.key] ? `${series.color} shadow-sm` : 'bg-[#e7ece8]'"
 :style="{ height: collectionBarHeight(item[series.key]) }"
 role="img"
 :aria-label="`${formatPeriod(item.period)} · ${series.label}: ${currency.format(item[series.key])}`"
 />
 </div>
 <span class="w-full truncate text-center text-xs font-medium capitalize text-[#475569]">{{ formatXAxisLabel(item.period) }}</span>
 </div>
 </div>
 <div class="mt-2 text-center text-xs font-semibold uppercase tracking-[.14em] text-[#94a3b8]">
 {{ groupBy === 'day' ? 'Días de la semana' : groupBy === 'month' ? 'Meses' : 'Años' }}
 </div>
 </div>
 </div>
 </UCard>
 </template>
 </div>
 </DashboardShell>
</template>
