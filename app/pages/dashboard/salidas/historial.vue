<script setup lang="ts">
import type { StockExitPaginatedResponse } from '~/types/stock-exit'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Historial de salidas' })

const page = ref(1)
const limit = ref(10)
const dateTime = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
const limitOptions = [{ label: '10 por página', value: 10 }, { label: '20 por página', value: 20 }, { label: '50 por página', value: 50 }]

const exitsData = ref<StockExitPaginatedResponse>({ items: [], total: 0, page: 1, limit: 10, pageCount: 1 })
const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const error = ref('')
const hasCachedPage = ref(false)
const cacheKey = computed(() => `abr_stock_exits_${page.value}_${limit.value}`)

const exits = computed(() => exitsData.value.items)
const pageCount = computed(() => exitsData.value.pageCount)
const pageStart = computed(() => exitsData.value.total ? (exitsData.value.page - 1) * exitsData.value.limit + 1 : 0)
const pageEnd = computed(() => Math.min(exitsData.value.page * exitsData.value.limit, exitsData.value.total))
const isLoading = computed(() => status.value === 'pending' && !exits.value.length)
const isRefreshing = computed(() => status.value === 'pending' && exits.value.length > 0 && !hasCachedPage.value)

function emptyPage() {
  exitsData.value = { items: [], total: 0, page: page.value, limit: limit.value, pageCount: 1 }
}

function readCachedHistory() {
  hasCachedPage.value = false
  if (!import.meta.client) return false

  const cached = localStorage.getItem(cacheKey.value)
  if (!cached) {
    emptyPage()
    return false
  }

  try {
    exitsData.value = JSON.parse(cached) as StockExitPaginatedResponse
    hasCachedPage.value = true
    return true
  } catch {
    localStorage.removeItem(cacheKey.value)
    emptyPage()
    return false
  }
}

function writeCachedHistory(nextData: StockExitPaginatedResponse) {
  if (!import.meta.client) return
  localStorage.setItem(cacheKey.value, JSON.stringify(nextData))
}

async function refresh() {
  status.value = 'pending'
  error.value = ''

  try {
    const nextData = await $fetch<StockExitPaginatedResponse>('/api/stock-exits', {
      query: { page: page.value, limit: limit.value }
    })
    exitsData.value = nextData
    writeCachedHistory(nextData)
    hasCachedPage.value = false
    status.value = 'success'
  } catch (fetchError: unknown) {
    error.value = getErrorMessage(fetchError, 'No pudimos cargar las salidas.')
    status.value = 'error'
  }
}

onMounted(() => {
  readCachedHistory()
  void refresh()
})

watch([page, limit], () => {
  readCachedHistory()
  void refresh()
})

watch(limit, () => {
  page.value = 1
})

function goToPage(nextPage: number) {
  page.value = Math.min(Math.max(nextPage, 1), pageCount.value)
}
</script>

<template>
  <DashboardShell eyebrow="Inventario" title="Historial de salidas">
    <div class="mx-auto max-w-[1300px] p-4 sm:p-6 lg:p-8">
      <section aria-labelledby="exit-history-title" :aria-busy="isLoading || isRefreshing">
        <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="exit-history-title" class="text-xl font-bold">Salidas registradas</h2>
            <p class="mt-1 text-sm text-[#78827c]">Bajas por caducidad o daño con responsable y nota.</p>
          </div>
          <UButton to="/dashboard/salidas" label="Registrar salida" icon="i-lucide-package-minus" />
        </div>

        <UAlert v-if="error" class="mb-4" color="error" variant="soft" title="No pudimos cargar las salidas">
          <template #actions><UButton label="Reintentar" color="error" variant="soft" size="sm" @click="refresh()" /></template>
        </UAlert>
        <div v-if="isRefreshing" class="mb-3 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status" aria-live="polite">
          <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
          <span>Actualizando historial…</span>
        </div>

        <USkeleton v-if="isLoading" class="h-96 rounded-2xl" />
        <div v-else-if="!exits.length" class="rounded-2xl border border-dashed border-[#d8ddd9] bg-white p-12 text-center">
          <UIcon name="i-lucide-package-minus" class="mx-auto size-9 text-[#929d96]" />
          <h3 class="mt-4 font-semibold">Aún no hay salidas</h3>
          <p class="mt-1 text-sm text-[#7d8781]">Cuando registres una salida aparecerá aquí.</p>
        </div>

        <div v-else class="overflow-hidden rounded-2xl border border-[#e1e6e2] bg-white">
          <ul class="divide-y divide-[#edf0ed]" aria-label="Historial de salidas">
            <li v-for="stockExit in exits" :key="stockExit.id" class="p-4 sm:px-5">
              <div class="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2"><p class="truncate text-sm font-semibold">{{ stockExit.name }}</p><UBadge :label="stockExit.reason === 'EXPIRED' ? 'Caducidad' : 'Dañado'" :color="stockExit.reason === 'EXPIRED' ? 'warning' : 'error'" variant="soft" size="sm" /></div>
                  <p class="mt-1 text-xs text-[#7d8781]">{{ stockExit.quantity }} {{ stockExit.unit === 'KILOGRAM' ? 'kg' : 'pzas' }} · {{ stockExit.user.fullName }}</p>
                  <p v-if="stockExit.note" class="mt-2 text-xs text-[#69736d]">{{ stockExit.note }}</p>
                </div>
                <p class="whitespace-nowrap text-xs text-[#7d8781]">{{ dateTime.format(new Date(stockExit.createdAt)) }}</p>
              </div>
            </li>
          </ul>
          <div class="flex flex-col gap-3 border-t border-[#edf0ed] bg-[#fbfcfb] p-4 sm:flex-row sm:items-end sm:justify-between">
            <p class="text-sm text-[#7d8781]">Mostrando {{ pageStart }}-{{ pageEnd }} de {{ exitsData.total }} salidas</p>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
              <UFormField label="Mostrar" size="xs"><USelect v-model="limit" :items="limitOptions" value-key="value" label-key="label" class="w-full sm:w-44" /></UFormField>
              <nav class="flex items-center gap-2" aria-label="Paginación de salidas">
                <UButton label="Anterior" icon="i-lucide-chevron-left" variant="soft" color="neutral" :disabled="page <= 1 || isRefreshing" @click="goToPage(page - 1)" />
                <span class="min-w-24 text-center text-sm font-semibold">Página {{ page }} de {{ pageCount }}</span>
                <UButton label="Siguiente" trailing-icon="i-lucide-chevron-right" variant="soft" color="neutral" :disabled="page >= pageCount || isRefreshing" @click="goToPage(page + 1)" />
              </nav>
            </div>
          </div>
        </div>
      </section>
    </div>
  </DashboardShell>
</template>
