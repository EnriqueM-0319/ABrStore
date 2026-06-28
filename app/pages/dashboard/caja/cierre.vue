<script setup lang="ts">
import type { CashRegisterCloseResult, CashRegisterSummary } from '~/types/cash-register'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Cierre de caja' })

const form = reactive({ closingAmount: '', notes: '' })
const closing = ref(false)
const formError = ref('')
const closeResult = ref<CashRegisterCloseResult | null>(null)
const toast = useToast()
const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const dateTime = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' })

const { cashSession, status: cashStatus, init: initCashSession, refresh: refreshCash, clearSession } = useCurrentCashSession()

onMounted(() => initCashSession())

const { data: summary, status: summaryStatus, error: summaryError, refresh: refreshSummary } = useFetch<CashRegisterSummary | null>('/api/cash-register/summary', {
  default: () => null,
  lazy: true,
  server: false
})

const isLoading = computed(() => cashStatus.value === 'pending' || summaryStatus.value === 'pending')
const countedAmount = computed(() => Number(form.closingAmount))
const expectedAmount = computed(() => summary.value?.expectedAmount ?? 0)
const previewDifference = computed(() => Number.isFinite(countedAmount.value) ? countedAmount.value - expectedAmount.value : 0)

function differenceColor(value: number) {
  if (value === 0) return 'text-emerald-700'
  return value > 0 ? 'text-sky-700' : 'text-red-700'
}

async function refreshAll() {
  await Promise.all([refreshCash({ force: true }), refreshSummary()])
}

async function closeCashRegister() {
  closing.value = true
  formError.value = ''

  try {
    const result = await $fetch<CashRegisterCloseResult>('/api/cash-register/close', {
      method: 'POST',
      body: {
        closingAmount: countedAmount.value,
        notes: form.notes
      }
    })
    closeResult.value = result
    Object.assign(form, { closingAmount: '', notes: '' })
    toast.add({
      title: 'Caja cerrada',
      description: `Diferencia: ${currency.format(result.session.difference ?? 0)}.`,
      color: result.session.difference === 0 ? 'success' : 'warning',
      icon: 'i-lucide-calculator'
    })
    clearSession()
    await refreshAll()
  } catch (error: unknown) {
    formError.value = getErrorMessage(error, 'No pudimos cerrar la caja.')
    toast.add({ title: 'No se pudo cerrar', description: formError.value, color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    closing.value = false
  }
}
</script>

<template>
  <DashboardShell eyebrow="Caja" title="Cierre de caja">
    <div class="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <UAlert v-if="isLoading" class="mb-5" color="neutral" variant="soft" icon="i-lucide-loader-circle" title="Calculando caja" description="Estamos consultando ventas en efectivo y movimientos de la caja abierta." />
      <UAlert v-else-if="summaryError" class="mb-5" color="error" variant="soft" icon="i-lucide-circle-alert" title="No pudimos calcular la caja">
        <template #actions><UButton label="Reintentar" color="error" variant="soft" @click="refreshAll" /></template>
      </UAlert>
      <UAlert v-else-if="!cashSession || !summary" class="mb-5" color="warning" variant="soft" icon="i-lucide-cash" title="No hay caja abierta" description="Inicia una nueva caja para comenzar el siguiente turno.">
        <template #actions><UButton to="/dashboard/caja/inicio" label="Ir a inicio del día" color="warning" variant="soft" /></template>
      </UAlert>

      <div v-else class="grid items-start gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,.75fr)]">
        <section aria-labelledby="cash-summary-title">
          <div class="mb-4">
            <h2 id="cash-summary-title" class="text-xl font-bold">Resumen para cierre</h2>
            <p class="mt-1 text-sm text-[#78827c]">Solo las ventas en efectivo afectan el efectivo esperado. Tarjeta y transferencia quedan como referencia del historial.</p>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <UCard :ui="{ root: 'rounded-2xl ring-[#dde3de]', body: 'p-5 sm:p-6' }">
              <p class="text-sm text-[#78827c]">Caja inicial</p>
              <p class="mt-2 text-3xl font-bold tracking-[-.04em] text-[#1f4937]">{{ currency.format(summary.openingAmount) }}</p>
              <p class="mt-2 text-xs text-[#7d8781]">Abierta por {{ cashSession.openedBy.fullName }} · {{ dateTime.format(new Date(cashSession.openedAt)) }}</p>
            </UCard>
            <UCard :ui="{ root: 'rounded-2xl ring-emerald-200 bg-emerald-50/70', body: 'p-5 sm:p-6' }">
              <p class="text-sm text-emerald-800">Efectivo esperado</p>
              <p class="mt-2 text-3xl font-bold tracking-[-.04em] text-emerald-950">{{ currency.format(summary.expectedAmount) }}</p>
              <p class="mt-2 text-xs text-emerald-800">Caja inicial + efectivo vendido + entradas - salidas.</p>
            </UCard>
          </div>

          <div class="mt-5 overflow-hidden rounded-2xl border border-[#e1e6e2] bg-white">
            <div class="border-b border-[#edf0ed] bg-[#fbfcfb] p-4 sm:px-5">
              <h3 class="font-bold">Desglose</h3>
            </div>
            <dl class="divide-y divide-[#edf0ed]">
              <div class="flex items-center justify-between gap-4 p-4 sm:px-5">
                <dt class="text-sm text-[#627068]">Ventas en efectivo <span class="text-xs text-[#8b948f]">({{ summary.cashSalesCount }} ventas)</span></dt>
                <dd class="font-bold text-emerald-700">+ {{ currency.format(summary.cashSalesTotal) }}</dd>
              </div>
              <div class="flex items-center justify-between gap-4 p-4 sm:px-5">
                <dt class="text-sm text-[#627068]">Entradas de efectivo</dt>
                <dd class="font-bold text-emerald-700">+ {{ currency.format(summary.cashInTotal) }}</dd>
              </div>
              <div class="flex items-center justify-between gap-4 p-4 sm:px-5">
                <dt class="text-sm text-[#627068]">Ajustes</dt>
                <dd class="font-bold text-amber-700">+ {{ currency.format(summary.adjustmentTotal) }}</dd>
              </div>
              <div class="flex items-center justify-between gap-4 p-4 sm:px-5">
                <dt class="text-sm text-[#627068]">Pagos a proveedores</dt>
                <dd class="font-bold text-red-700">- {{ currency.format(summary.supplierPaymentTotal) }}</dd>
              </div>
              <div class="flex items-center justify-between gap-4 p-4 sm:px-5">
                <dt class="text-sm text-[#627068]">Retiros de efectivo</dt>
                <dd class="font-bold text-red-700">- {{ currency.format(summary.withdrawalTotal) }}</dd>
              </div>
              <div class="flex items-center justify-between gap-4 p-4 sm:px-5">
                <dt class="text-sm text-[#627068]">Gastos operativos</dt>
                <dd class="font-bold text-red-700">- {{ currency.format(summary.expenseTotal) }}</dd>
              </div>
            </dl>
          </div>

          <div class="mt-5 grid gap-4 md:grid-cols-3">
            <UAlert color="neutral" variant="soft" icon="i-lucide-credit-card" title="Ventas con tarjeta" :description="currency.format(summary.cardSalesTotal)" />
            <UAlert color="neutral" variant="soft" icon="i-lucide-send" title="Ventas por transferencia" :description="currency.format(summary.transferSalesTotal)" />
            <UAlert color="neutral" variant="soft" icon="i-lucide-hand-coins" title="Ventas fiadas" :description="currency.format(summary.creditSalesTotal)" />
          </div>
        </section>

        <aside aria-labelledby="close-cash-title" class="xl:sticky xl:top-28">
          <UCard :ui="{ root: 'rounded-2xl ring-[#dde3de]', header: 'p-5 sm:px-6', body: 'p-5 sm:px-6' }">
            <template #header>
              <h2 id="close-cash-title" class="font-bold">Cerrar caja</h2>
              <p class="mt-1 text-sm text-[#78827c]">Captura cuánto efectivo contaste físicamente.</p>
            </template>

            <form class="space-y-4" @submit.prevent="closeCashRegister">
              <UFormField label="Efectivo contado" name="closingAmount" required>
                <UInput v-model="form.closingAmount" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0.00" class="w-full" />
              </UFormField>
              <div class="rounded-2xl bg-[#f7faf8] p-4">
                <div class="flex items-center justify-between">
                  <p class="text-sm text-[#748078]">Esperado</p>
                  <p class="font-bold">{{ currency.format(summary.expectedAmount) }}</p>
                </div>
                <div class="mt-3 flex items-center justify-between">
                  <p class="text-sm text-[#748078]">Diferencia previa</p>
                  <p class="text-xl font-bold" :class="differenceColor(previewDifference)">{{ currency.format(previewDifference) }}</p>
                </div>
              </div>
              <UFormField label="Nota de cierre" name="notes">
                <UTextarea v-model="form.notes" :rows="3" placeholder="Ej. Corte sin novedad, faltante revisado…" class="w-full" />
              </UFormField>
              <ActionFeedback v-if="formError" :message="formError" type="error" @dismiss="formError = ''" />
              <UButton type="submit" block size="xl" label="Cerrar caja" icon="i-lucide-lock-keyhole" color="primary" :loading="closing" />
            </form>
          </UCard>

          <UCard v-if="closeResult" class="mt-5" :ui="{ root: 'rounded-2xl ring-emerald-200 bg-emerald-50/70', body: 'p-5 sm:p-6' }">
            <h3 class="font-bold text-emerald-950">Último cierre realizado</h3>
            <p class="mt-2 text-sm text-emerald-800">Contado: {{ currency.format(closeResult.session.closingAmount ?? 0) }}</p>
            <p class="text-sm text-emerald-800">Esperado: {{ currency.format(closeResult.session.expectedAmount ?? 0) }}</p>
            <p class="text-sm font-bold" :class="differenceColor(closeResult.session.difference ?? 0)">Diferencia: {{ currency.format(closeResult.session.difference ?? 0) }}</p>
          </UCard>
        </aside>
      </div>
    </div>
  </DashboardShell>
</template>
