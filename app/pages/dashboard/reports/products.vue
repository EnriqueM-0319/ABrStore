<script setup lang="ts">
type ProductReportGroup = 'day' | 'month' | 'year'

type ProductSalesReportItem = {
 productId: string | null
 sku: string
 name: string
 quantity: number
 total: number
 share: number
}

type ProductSalesPeriodReportItem = {
 period: string
 quantity: number
 total: number
}

type ProductSalesReportResponse = {
 groupBy: ProductReportGroup
 startDate: string
 endDate: string
 totalQuantity: number
 totalAmount: number
 topProduct: ProductSalesReportItem | null
 lowestProduct: ProductSalesReportItem | null
 items: ProductSalesReportItem[]
 periodItems: ProductSalesPeriodReportItem[]
}

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Reporte de producto' })

const { user } = useAuth()
const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const numberFormat = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 3 })
const groupBy = ref<ProductReportGroup>('day')
const limit = ref(5)
const startDate = ref('')
const endDate = ref('')
const data = ref<ProductSalesReportResponse>(getEmptyReport('day', '', ''))
const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const error = ref('')

const groupOptions: Array<{ label: string, value: ProductReportGroup }> = [
 { label: 'Por día', value: 'day' },
 { label: 'Por mes', value: 'month' },
 { label: 'Por año', value: 'year' }
]
const limitOptions = [
 { label: 'Top 5', value: 5 },
 { label: 'Top 10', value: 10 },
 { label: 'Top 20', value: 20 },
 { label: 'Top 50', value: 50 }
]
const chartColors = ['#2563eb', '#385872', '#0f766e', '#f59e0b', '#7c3aed', '#dc2626', '#0891b2', '#65a30d', '#be185d', '#64748b', '#ea580c', '#334155']

function getEmptyReport(selectedGroup: ProductReportGroup, selectedStartDate: string, selectedEndDate: string): ProductSalesReportResponse {
 return {
 groupBy: selectedGroup,
 startDate: selectedStartDate,
 endDate: selectedEndDate,
 totalQuantity: 0,
 totalAmount: 0,
 topProduct: null,
 lowestProduct: null,
 items: [],
 periodItems: []
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

function setCurrentMonth() {
 const now = new Date()
 const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
 const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
 startDate.value = toDateInput(firstDay)
 endDate.value = toDateInput(lastDay)
}

setCurrentWeek()

const isLoading = computed(() => status.value === 'pending' && !data.value.items.length)
const isRefreshing = computed(() => status.value === 'pending' && data.value.items.length > 0)
const chartItems = computed(() => data.value.items.filter(item => item.quantity > 0))
const maxChartQuantity = computed(() => Math.max(...chartItems.value.map(item => item.quantity), 1))
const chartHeight = 360
const chartPadding = { top: 26, right: 28, bottom: 76, left: 70 }
const chartGuides = [0, 0.25, 0.5, 0.75, 1]
const comboChartWidth = computed(() => Math.max(900, chartItems.value.length * 90 + chartPadding.left + chartPadding.right))
const chartPlotHeight = computed(() => chartHeight - chartPadding.top - chartPadding.bottom)
const chartPlotWidth = computed(() => comboChartWidth.value - chartPadding.left - chartPadding.right)
const chartBandWidth = computed(() => chartPlotWidth.value / Math.max(chartItems.value.length, 1))
const chartBarWidth = computed(() => Math.min(34, chartBandWidth.value * 0.54))
const quantityLinePoints = computed(() => chartItems.value.map((item, index) => `${chartX(index)},${chartQuantityY(item.quantity)}`).join(' '))

function chartX(index: number) {
 return chartPadding.left + chartBandWidth.value * index + chartBandWidth.value / 2
}

function chartQuantityY(quantity: number) {
 return chartPadding.top + chartPlotHeight.value * (1 - quantity / maxChartQuantity.value)
}

function chartGuideY(value: number) {
 return chartPadding.top + chartPlotHeight.value * (1 - value)
}

function shortProductName(name: string) {
 return name.length > 16 ? `${name.slice(0, 15)}...` : name
}

async function refresh() {
 if (!startDate.value || !endDate.value) return

 status.value = 'pending'
 error.value = ''

 try {
 const nextData = await $fetch<ProductSalesReportResponse>('/api/reports/products', {
 query: {
 groupBy: groupBy.value,
 limit: limit.value,
 startDate: startDate.value,
 endDate: endDate.value,
 _ts: Date.now()
 }
 })
 data.value = nextData
 status.value = 'success'
 } catch (err: unknown) {
 error.value = getErrorMessage(err, 'No pudimos cargar el reporte de productos.')
 status.value = 'error'
 }
}

onMounted(() => {
 if (user.value && !['SUPERADMIN', 'ADMIN'].includes(user.value.role)) {
 void navigateTo('/dashboard/sales')
 return
 }

 void refresh()
})

watch(groupBy, (nextGroup) => {
 if (nextGroup === 'day') setCurrentWeek()
 if (nextGroup === 'month') setCurrentMonth()
 if (nextGroup === 'year') setCurrentYear()
})

watch([groupBy, limit, startDate, endDate], () => {
 void refresh()
})
</script>

<template>
 <DashboardShell eyebrow="Administración" title="Reporte de producto">
 <div class="mx-auto max-w-[1320px] p-4 sm:p-5 lg:p-6">
 <div class="mb-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
 <h2 class="text-lg font-bold">Productos vendidos</h2>
 <div class="flex flex-wrap gap-2">
 <UButton to="/dashboard/products" label="Ver productos" icon="i-lucide-package" color="neutral" variant="soft" />
 <UButton label="Semana actual" icon="i-lucide-calendar-days" color="neutral" variant="soft" @click="setCurrentWeek" />
 <UButton label="Actualizar" icon="i-lucide-refresh-cw" color="neutral" variant="soft" :loading="status === 'pending'" @click="refresh()" />
 </div>
 </div>

 <UCard class="mb-4" :ui="{ root: 'rounded-lg ring-[#dde3de]', body: 'p-3' }">
 <div class="grid gap-3 lg:grid-cols-[1fr_12rem_1fr_1fr] lg:items-end">
 <UFormField label="Agrupar" name="products-report-group">
 <USelect v-model="groupBy" :items="groupOptions" value-key="value" label-key="label" class="w-full" />
 </UFormField>
 <UFormField label="Mostrar" name="products-report-limit">
 <USelect v-model="limit" :items="limitOptions" value-key="value" label-key="label" class="w-full" />
 </UFormField>
 <UFormField label="Desde" name="products-report-start">
 <UInput v-model="startDate" type="date" class="w-full" />
 </UFormField>
 <UFormField label="Hasta" name="products-report-end">
 <UInput v-model="endDate" type="date" class="w-full" />
 </UFormField>
 </div>
 </UCard>

 <UAlert v-if="error" class="mb-4" color="error" variant="soft" icon="i-lucide-circle-alert" title="No pudimos cargar el reporte">
 <template #actions>
 <UButton label="Reintentar" color="error" variant="soft" @click="refresh()" />
 </template>
 </UAlert>

 <UAlert v-if="isRefreshing" class="mb-4" color="neutral" variant="soft" icon="i-lucide-refresh-cw" title="Actualizando reporte" />

 <div v-if="isLoading" class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
 <USkeleton v-for="item in 4" :key="item" class="h-24 rounded-lg" />
 </div>

 <template v-else>
 <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
 <UCard :ui="{ root: 'rounded-lg ring-[#dde3de]', body: 'p-4' }">
 <p class="text-xs font-medium text-[#64748b]">Total vendido</p>
 <p class="mt-1 text-2xl font-black text-[#456a88]">{{ currency.format(data.totalAmount) }}</p>
 </UCard>
 <UCard :ui="{ root: 'rounded-lg ring-[#dde3de]', body: 'p-4' }">
 <p class="text-xs font-medium text-[#64748b]">Unidades vendidas</p>
 <p class="mt-1 text-2xl font-black text-[#385872]">{{ numberFormat.format(data.totalQuantity) }}</p>
 </UCard>
 <UCard :ui="{ root: 'rounded-lg ring-sky-100 bg-sky-50/70', body: 'p-4' }">
 <p class="text-xs font-medium text-sky-800">Más vendido</p>
 <p class="mt-1 truncate text-lg font-black text-sky-950">{{ data.topProduct?.name || 'Sin datos' }}</p>
 <p v-if="data.topProduct" class="mt-1 text-xs text-sky-800">{{ numberFormat.format(data.topProduct.quantity) }} unid. · {{ data.topProduct.share.toFixed(1) }}%</p>
 </UCard>
 <UCard :ui="{ root: 'rounded-lg ring-amber-100 bg-amber-50/70', body: 'p-4' }">
 <p class="text-xs font-medium text-amber-800">Menos vendido</p>
 <p class="mt-1 truncate text-lg font-black text-amber-950">{{ data.lowestProduct?.name || 'Sin datos' }}</p>
 <p v-if="data.lowestProduct" class="mt-1 text-xs text-amber-800">{{ numberFormat.format(data.lowestProduct.quantity) }} unid. · {{ data.lowestProduct.share.toFixed(1) }}%</p>
 </UCard>
 </div>

 <div class="mt-4">
 <UCard :ui="{ root: 'rounded-lg ring-[#dde3de]', header: 'p-4', body: 'p-4' }">
 <template #header>
 <div>
 <h3 class="font-bold">Productos por unidades vendidas</h3>
 <p class="text-sm text-[#64748b]">{{ data.startDate }} al {{ data.endDate }}</p>
 </div>
 </template>

 <div v-if="!chartItems.length" class="p-8 text-center">
 <UIcon name="i-lucide-chart-no-axes-column" class="mx-auto size-7 text-[#94a3b8]" aria-hidden="true" />
 <h4 class="mt-2 font-bold">No hay productos vendidos</h4>
 </div>

 <div v-else class="space-y-3">
 <div class="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#475569]">
 <span class="inline-flex items-center gap-1.5"><span class="h-3 w-4 rounded-sm bg-[#2563eb]" />Unidades vendidas</span>
 <span class="inline-flex items-center gap-1.5"><span class="h-0.5 w-5 rounded-full bg-[#0f766e]" />Tendencia de unidades</span>
 </div>
 <div class="overflow-x-auto rounded-lg border border-[#e2e8f0] bg-[#f8fafc]">
 <svg
 class="block min-h-[360px]"
 :style="{ width: `${comboChartWidth}px` }"
 :viewBox="`0 0 ${comboChartWidth} ${chartHeight}`"
 role="img"
 aria-label="Histograma de productos con linea de unidades vendidas"
 >
 <g>
 <line :x1="chartPadding.left" :x2="comboChartWidth - chartPadding.right" :y1="chartHeight - chartPadding.bottom" :y2="chartHeight - chartPadding.bottom" stroke="#cbd5e1" stroke-width="1" />
 <line :x1="chartPadding.left" :x2="chartPadding.left" :y1="chartPadding.top" :y2="chartHeight - chartPadding.bottom" stroke="#cbd5e1" stroke-width="1" />
 <g v-for="guide in chartGuides" :key="guide">
 <line :x1="chartPadding.left" :x2="comboChartWidth - chartPadding.right" :y1="chartGuideY(guide)" :y2="chartGuideY(guide)" stroke="#e2e8f0" stroke-width="1" />
 <text x="10" :y="chartGuideY(guide) + 4" fill="#64748b" font-size="11">{{ numberFormat.format(maxChartQuantity * guide) }}</text>
 </g>
 </g>

 <g v-for="(item, index) in chartItems" :key="`${item.sku}-${item.productId || item.name}-${index}`">
 <rect
 :x="chartX(index) - chartBarWidth / 2"
 :y="chartQuantityY(item.quantity)"
 :width="chartBarWidth"
 :height="chartHeight - chartPadding.bottom - chartQuantityY(item.quantity)"
 :fill="chartColors[index % chartColors.length]"
 rx="4"
 >
 <title>{{ item.name }} · {{ numberFormat.format(item.quantity) }} unid. · {{ currency.format(item.total) }}</title>
 </rect>
 <text
 :x="chartX(index)"
 :y="chartHeight - chartPadding.bottom + 18"
 fill="#334155"
 font-size="11"
 text-anchor="end"
 :transform="`rotate(-35 ${chartX(index)} ${chartHeight - chartPadding.bottom + 18})`"
 >
 {{ shortProductName(item.name) }}
 </text>
 </g>

 <polyline
 :points="quantityLinePoints"
 fill="none"
 stroke="#0f766e"
 stroke-width="3"
 stroke-linecap="round"
 stroke-linejoin="round"
 />
 <g v-for="(item, index) in chartItems" :key="`${item.sku}-${item.productId || item.name}-point-${index}`">
 <circle :cx="chartX(index)" :cy="chartQuantityY(item.quantity)" r="4" fill="#ffffff" stroke="#0f766e" stroke-width="3">
 <title>{{ item.name }} · {{ numberFormat.format(item.quantity) }} unid.</title>
 </circle>
 </g>
 </svg>
 </div>
 <p class="text-xs text-[#64748b]">Barras: unidades vendidas por producto. Linea: tendencia usando la misma escala de unidades del eje Y.</p>
 </div>
 </UCard>

 </div>
 </template>
 </div>
 </DashboardShell>
</template>
