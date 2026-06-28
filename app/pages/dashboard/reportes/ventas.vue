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
useHead({ title: 'Reporte de ventas' })

const { user } = useAuth()
const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const numberFormat = new Intl.NumberFormat('es-MX')
const groupBy = ref<SalesReportGroup>('day')
const startDate = ref('')
const endDate = ref('')

const groupOptions: Array<{ label: string, value: SalesReportGroup }> = [
  { label: 'Por día', value: 'day' },
  { label: 'Por mes', value: 'month' },
  { label: 'Por año', value: 'year' }
]

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10)
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

setCurrentWeek()

const { data, status, error, refresh } = useFetch<SalesReportResponse>('/api/reports/sales', {
  query: { groupBy, startDate, endDate },
  default: () => ({
    groupBy: 'day',
    startDate: startDate.value,
    endDate: endDate.value,
    summary: {
      salesCount: 0,
      canceledCount: 0,
      grossTotal: 0,
      cashTotal: 0,
      cardTotal: 0,
      transferTotal: 0,
      creditTotal: 0,
      averageTicket: 0
    },
    items: []
  }),
  lazy: true,
  server: false,
  watch: [groupBy, startDate, endDate]
})

const isLoading = computed(() => status.value === 'pending' && !data.value.items.length)
const isRefreshing = computed(() => status.value === 'pending' && data.value.items.length > 0)
const chartItems = computed(() => fillChartPeriods())
const chartSeries = [
  { key: 'cashTotal', label: 'Efectivo', color: 'bg-emerald-600', textColor: 'text-emerald-700' },
  { key: 'cardTotal', label: 'Tarjeta', color: 'bg-[#233071]', textColor: 'text-[#233071]' },
  { key: 'creditTotal', label: 'Fiado', color: 'bg-amber-500', textColor: 'text-amber-700' }
] as const
const maxPeriodTotal = computed(() => Math.max(
  ...chartItems.value.flatMap(item => chartSeries.map(series => item[series.key])),
  1
))

onMounted(() => {
  if (user.value && !['SUPERADMIN', 'ADMIN'].includes(user.value.role)) {
    void navigateTo('/dashboard/ventas')
  }
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

function chartBarHeight(total: number) {
  return `${Math.max((total / maxPeriodTotal.value) * 100, total > 0 ? 8 : 0)}%`
}
</script>

<template>
  <DashboardShell eyebrow="Administración" title="Reporte de ventas">
    <div class="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <div class="mb-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <h2 class="text-xl font-bold">Métricas de ventas</h2>
          <p class="mt-1 text-sm text-[#78827c]">Analiza ventas por día, mes o año. Por defecto se muestra la semana actual agrupada por día.</p>
        </div>
        <div class="flex flex-wrap gap-2">
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
          <UCard :ui="{ root: 'rounded-2xl ring-[#dde3de]', body: 'p-5' }">
            <p class="text-sm text-[#78827c]">Venta total</p>
            <p class="mt-2 text-3xl font-black tracking-[-.04em] text-[#1f4937]">{{ currency.format(data.summary.grossTotal) }}</p>
          </UCard>
          <UCard :ui="{ root: 'rounded-2xl ring-[#dde3de]', body: 'p-5' }">
            <p class="text-sm text-[#78827c]">Tickets vendidos</p>
            <p class="mt-2 text-3xl font-black tracking-[-.04em] text-[#233071]">{{ numberFormat.format(data.summary.salesCount) }}</p>
          </UCard>
          <UCard :ui="{ root: 'rounded-2xl ring-[#dde3de]', body: 'p-5' }">
            <p class="text-sm text-[#78827c]">Ticket promedio</p>
            <p class="mt-2 text-3xl font-black tracking-[-.04em] text-[#1f4937]">{{ currency.format(data.summary.averageTicket) }}</p>
          </UCard>
          <UCard :ui="{ root: 'rounded-2xl ring-red-100 bg-red-50/60', body: 'p-5' }">
            <p class="text-sm text-red-800">Cancelados</p>
            <p class="mt-2 text-3xl font-black tracking-[-.04em] text-red-900">{{ numberFormat.format(data.summary.canceledCount) }}</p>
          </UCard>
        </div>

        <div class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <UAlert color="success" variant="soft" icon="i-lucide-banknote" title="Efectivo" :description="currency.format(data.summary.cashTotal)" />
          <UAlert color="neutral" variant="soft" icon="i-lucide-credit-card" title="Tarjeta" :description="currency.format(data.summary.cardTotal)" />
          <UAlert color="neutral" variant="soft" icon="i-lucide-send" title="Transferencia" :description="currency.format(data.summary.transferTotal)" />
          <UAlert color="warning" variant="soft" icon="i-lucide-hand-coins" title="Fiado" :description="currency.format(data.summary.creditTotal)" />
        </div>

        <UCard class="mt-5" :ui="{ root: 'rounded-2xl ring-[#dde3de]', header: 'p-5', body: 'p-5' }">
          <template #header>
            <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 class="font-bold">Gráfica de ventas</h3>
                <p class="text-sm text-[#78827c]">{{ data.startDate }} al {{ data.endDate }}</p>
              </div>
              <UBadge :label="groupOptions.find(option => option.value === groupBy)?.label" color="primary" variant="soft" />
            </div>
          </template>

          <div v-if="!data.items.length" class="p-10 text-center">
            <UIcon name="i-lucide-chart-no-axes-combined" class="mx-auto size-9 text-[#9aa49e]" aria-hidden="true" />
            <h4 class="mt-3 font-bold">No hay ventas en este rango</h4>
            <p class="mt-1 text-sm text-[#78827c]">Cambia las fechas o vuelve cuando existan ventas registradas.</p>
          </div>

          <div v-else class="overflow-x-auto">
            <div class="min-w-[42rem]">
              <div class="mb-3 flex items-center justify-between text-xs text-[#7d8781]">
                <div class="flex flex-wrap items-center gap-3">
                  <span
                    v-for="series in chartSeries"
                    :key="series.key"
                    class="inline-flex items-center gap-1.5"
                    :class="series.textColor"
                  >
                    <span class="size-2.5 rounded-full" :class="series.color" aria-hidden="true" />
                    {{ series.label }}
                  </span>
                </div>
                <span>Máximo: {{ currency.format(maxPeriodTotal) }}</span>
              </div>
              <div class="flex h-72 items-end gap-3 border-b border-l border-[#dce3dd] px-3 pt-4" aria-label="Gráfica de barras de ventas por periodo y forma de pago">
                <div
                  v-for="item in chartItems"
                  :key="item.period"
                  class="flex h-full min-w-16 flex-1 flex-col items-center justify-end gap-2"
                  :title="`${formatPeriod(item.period)} · Efectivo ${currency.format(item.cashTotal)} · Tarjeta ${currency.format(item.cardTotal)} · Fiado ${currency.format(item.creditTotal)}`"
                >
                  <span class="max-w-24 truncate text-xs font-semibold text-[#1f4937]">{{ item.grossTotal ? currency.format(item.grossTotal) : '' }}</span>
                  <div class="flex h-56 w-full items-end justify-center gap-1.5">
                    <div
                      v-for="series in chartSeries"
                      :key="series.key"
                      class="w-full max-w-4 rounded-t-lg transition-all"
                      :class="item[series.key] ? `${series.color} shadow-sm` : 'bg-[#e7ece8]'"
                      :style="{ height: chartBarHeight(item[series.key]) }"
                      role="img"
                      :aria-label="`${formatPeriod(item.period)} · ${series.label}: ${currency.format(item[series.key])}`"
                    />
                  </div>
                  <span class="w-full truncate text-center text-xs font-medium capitalize text-[#68746d]">{{ formatXAxisLabel(item.period) }}</span>
                </div>
              </div>
              <div class="mt-2 text-center text-xs font-semibold uppercase tracking-[.14em] text-[#8b958f]">
                {{ groupBy === 'day' ? 'Días de la semana' : groupBy === 'month' ? 'Meses' : 'Años' }}
              </div>
            </div>
          </div>
        </UCard>
      </template>
    </div>
  </DashboardShell>
</template>
