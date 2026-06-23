<script setup lang="ts">
import type { CashRegisterSession } from '~/types/cash-register'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Inicio del día' })

const form = reactive({ openingAmount: '', notes: '' })
const opening = ref(false)
const formError = ref('')
const toast = useToast()
const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const dateTime = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
const { cashSession, status, init, refresh, setSession } = useCurrentCashSession()

const isLoading = computed(() => status.value === 'pending')

onMounted(init)

async function openCashRegister() {
  opening.value = true
  formError.value = ''

  try {
    const session = await $fetch<CashRegisterSession>('/api/cash-register/open', {
      method: 'POST',
      body: {
        openingAmount: Number(form.openingAmount),
        notes: form.notes
      }
    })
    setSession(session)
    Object.assign(form, { openingAmount: '', notes: '' })
    toast.add({
      title: 'Día iniciado',
      description: `Caja inicial: ${currency.format(session.openingAmount)}.`,
      color: 'success',
      icon: 'i-lucide-sunrise'
    })
  } catch (error: unknown) {
    formError.value = getErrorMessage(error, 'No pudimos iniciar el día.')
    toast.add({ title: 'No se pudo iniciar', description: formError.value, color: 'error', icon: 'i-lucide-circle-alert' })
    await refresh({ force: true })
  } finally {
    opening.value = false
  }
}
</script>

<template>
  <DashboardShell eyebrow="Caja" title="Inicio del día">
    <div class="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <div class="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,.7fr)]">
        <section aria-labelledby="cash-start-title">
          <UCard :ui="{ root: 'rounded-2xl ring-[#dde3de]', body: 'p-6 sm:p-8' }">
            <div class="flex flex-col gap-5 sm:flex-row sm:items-start">
              <span class="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#eaf2ed] text-[#286047]">
                <UIcon name="i-lucide-sunrise" class="size-7" aria-hidden="true" />
              </span>
              <div>
                <h2 id="cash-start-title" class="text-2xl font-bold tracking-[-.03em]">Iniciar caja antes de vender</h2>
                <p class="mt-2 max-w-2xl text-sm leading-6 text-[#69736d]">
                  Este módulo abre el turno del día con un fondo inicial. Mientras no exista una caja abierta, el punto de venta permitirá buscar productos, pero no permitirá cobrar.
                </p>
                <div class="mt-5 grid gap-3 sm:grid-cols-3">
                  <div class="rounded-2xl bg-[#f7faf8] p-4">
                    <p class="text-xs uppercase tracking-[.16em] text-[#7d8781]">Paso 1</p>
                    <p class="mt-2 text-sm font-semibold">Cuenta el fondo</p>
                  </div>
                  <div class="rounded-2xl bg-[#f7faf8] p-4">
                    <p class="text-xs uppercase tracking-[.16em] text-[#7d8781]">Paso 2</p>
                    <p class="mt-2 text-sm font-semibold">Registra caja inicial</p>
                  </div>
                  <div class="rounded-2xl bg-[#f7faf8] p-4">
                    <p class="text-xs uppercase tracking-[.16em] text-[#7d8781]">Paso 3</p>
                    <p class="mt-2 text-sm font-semibold">Comienza a vender</p>
                  </div>
                </div>
              </div>
            </div>
          </UCard>
        </section>

        <aside aria-labelledby="cash-status-title" class="lg:sticky lg:top-28">
          <UCard :ui="{ root: 'rounded-2xl ring-[#dde3de]', header: 'p-5 sm:px-6', body: 'p-5 sm:px-6' }">
            <template #header>
              <h2 id="cash-status-title" class="font-bold">Estado de caja</h2>
              <p class="mt-1 text-sm text-[#78827c]">Solo puede existir una caja abierta a la vez.</p>
            </template>

            <UAlert v-if="isLoading" color="neutral" variant="soft" icon="i-lucide-loader-circle" title="Verificando caja actual" />

            <div v-else-if="cashSession" class="space-y-5">
              <UAlert color="success" variant="soft" icon="i-lucide-circle-check" title="Caja abierta" description="El punto de venta ya está habilitado para cobrar." />
              <div class="rounded-2xl bg-[#f7faf8] p-4">
                <p class="text-sm text-[#748078]">Caja inicial</p>
                <p class="mt-1 text-3xl font-bold tracking-[-.04em] text-[#1f4937]">{{ currency.format(cashSession.openingAmount) }}</p>
                <p class="mt-3 text-xs text-[#7d8781]">Responsable: {{ cashSession.openedBy.fullName }}</p>
                <p class="text-xs text-[#7d8781]">Inicio: {{ dateTime.format(new Date(cashSession.openedAt)) }}</p>
              </div>
              <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <UButton to="/dashboard/ventas" block label="Ir a vender" icon="i-lucide-shopping-cart" />
                <UButton to="/dashboard/caja/cierre" block label="Cerrar caja" icon="i-lucide-calculator" variant="soft" />
              </div>
            </div>

            <form v-else class="space-y-4" @submit.prevent="openCashRegister">
              <UAlert color="warning" variant="soft" icon="i-lucide-triangle-alert" title="Día sin iniciar" description="Registra la caja inicial para habilitar las ventas." />
              <UFormField label="Caja inicial" name="openingAmount" required>
                <UInput v-model="form.openingAmount" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0.00" class="w-full" />
              </UFormField>
              <UFormField label="Nota opcional" name="notes">
                <UTextarea v-model="form.notes" :rows="3" placeholder="Ej. Fondo entregado por encargado…" class="w-full" />
              </UFormField>
              <ActionFeedback v-if="formError" :message="formError" type="error" @dismiss="formError = ''" />
              <UButton type="submit" block size="xl" label="Iniciar día" icon="i-lucide-sunrise" :loading="opening" />
            </form>
          </UCard>
        </aside>
      </div>
    </div>
  </DashboardShell>
</template>
