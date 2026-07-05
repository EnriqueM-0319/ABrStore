<script setup lang="ts">
import type { HeldTicket } from '~/types'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Tickets guardados' })

const toast = useToast()
const selectedTicketId = ref<string | null>(null)
const deletingTicketId = ref<string | null>(null)
const recoveringTicketId = ref<string | null>(null)
const deleteError = ref('')

const { cashSession, status: cashStatus, init: initCashSession } = useCurrentCashSession()
const cashSessionId = computed(() => cashSession.value?.id ?? null)
const {
 tickets,
 status,
 error,
 isRefreshing,
 isInitialLoading,
 init,
 refresh,
 removeTicket,
 restoreTickets
} = useHeldTickets(cashSessionId)
const { setRecoveredTicket } = useRecoveredHeldTicket()

const selectedTicket = computed(() => {
 if (!tickets.value.length) return null
 return tickets.value.find(ticket => ticket.id === selectedTicketId.value) ?? tickets.value[0] ?? null
})

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const dateTime = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' })

onMounted(async () => {
 await initCashSession()
 await init()
})

watch(cashSessionId, () => {
 void init()
})

watch(tickets, (nextTickets) => {
 if (!nextTickets.length) {
 selectedTicketId.value = null
 return
 }
 if (!selectedTicketId.value || !nextTickets.some(ticket => ticket.id === selectedTicketId.value)) {
 selectedTicketId.value = nextTickets[0]?.id ?? null
 }
}, { immediate: true })

function shortTicketId(ticket: HeldTicket) {
 return ticket.id.slice(-6).toUpperCase()
}

function unitLabel(unit: HeldTicket['items'][number]['unit']) {
 return unit === 'KILOGRAM' ? 'kg' : 'pzas'
}

async function recoverTicket(ticket: HeldTicket) {
 if (recoveringTicketId.value) return

 const previousTickets = [...tickets.value]
 recoveringTicketId.value = ticket.id
 deleteError.value = ''
 removeTicket(ticket.id)

 try {
 await $fetch(`/api/heldTickets/${ticket.id}`, { method: 'DELETE' })
 setRecoveredTicket(ticket)
 toast.add({ title: 'Ticket recuperado', description: 'La venta quedó lista para continuar.', color: 'success', icon: 'i-lucide-rotate-ccw' })
 await navigateTo('/dashboard/sales')
 } catch (error: unknown) {
 restoreTickets(previousTickets)
 deleteError.value = getErrorMessage(error, 'No pudimos recuperar el ticket.')
 toast.add({ title: 'No se pudo recuperar', description: deleteError.value, color: 'error', icon: 'i-lucide-circle-alert' })
 } finally {
 recoveringTicketId.value = null
 }
}

async function deleteTicket(ticket: HeldTicket) {
 if (deletingTicketId.value) return

 const previousTickets = [...tickets.value]
 deletingTicketId.value = ticket.id
 deleteError.value = ''
 removeTicket(ticket.id)

 try {
 await $fetch(`/api/heldTickets/${ticket.id}`, { method: 'DELETE' })
 toast.add({ title: 'Ticket eliminado', description: `El ticket ${shortTicketId(ticket)} salió de la lista.`, color: 'success', icon: 'i-lucide-trash-2' })
 } catch (error: unknown) {
 restoreTickets(previousTickets)
 deleteError.value = getErrorMessage(error, 'No pudimos eliminar el ticket.')
 toast.add({ title: 'No se pudo eliminar', description: deleteError.value, color: 'error', icon: 'i-lucide-circle-alert' })
 } finally {
 deletingTicketId.value = null
 }
}
</script>

<template>
 <DashboardShell eyebrow="Punto de venta" title="Tickets guardados">
 <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
 <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
 <div>
 <h2 class="text-xl font-bold tracking-tight">Ventas en espera</h2>
 <p class="mt-1 text-sm text-[#64748b]">Revisa, recupera o elimina tickets pendientes de la caja actual.</p>
 </div>
 <UButton
 label="Actualizar"
 icon="i-lucide-refresh-cw"
 color="neutral"
 variant="soft"
 :loading="status === 'pending'"
 @click="refresh({ force: true })"
 />
 </div>

 <UAlert
 v-if="!cashStatus || cashStatus === 'pending'"
 color="neutral"
 variant="soft"
 icon="i-lucide-loader-circle"
 title="Verificando caja"
 description="Estamos revisando si hay una caja abierta."
 />
 <UAlert
 v-else-if="!cashSession"
 color="warning"
 variant="soft"
 icon="i-lucide-sunrise"
 title="Caja sin iniciar"
 description="Inicia el día para consultar tickets guardados."
 >
 <template #actions>
 <UButton to="/dashboard/cashRegister?section=start" label="Ir a iniciar día" color="warning" variant="soft" size="sm" />
 </template>
 </UAlert>

 <template v-else>
 <ActionFeedback v-if="deleteError" class="mb-4" :message="deleteError" type="error" @dismiss="deleteError = ''" />
 <UAlert
 v-if="isRefreshing"
 class="mb-4"
 color="primary"
 variant="soft"
 icon="i-lucide-loader-circle"
 title="Actualizando tickets"
 description="Mostramos lo guardado y revisamos cambios en segundo plano."
 />
 <UAlert
 v-if="error && !tickets.length"
 class="mb-4"
 color="error"
 variant="soft"
 icon="i-lucide-circle-alert"
 title="No pudimos cargar los tickets"
 :description="error"
 >
 <template #actions>
 <UButton label="Reintentar" color="error" variant="soft" size="sm" @click="refresh({ force: true })" />
 </template>
 </UAlert>

 <div v-if="isInitialLoading" class="grid gap-4 lg:grid-cols-[minmax(18rem,.42fr)_minmax(0,1fr)]">
 <div class="space-y-3">
 <USkeleton v-for="item in 4" :key="item" class="h-28 rounded-2xl" />
 </div>
 <USkeleton class="h-[28rem] rounded-2xl" />
 </div>

 <UCard v-else-if="!tickets.length" :ui="{ root: 'rounded-2xl ring-[#dde3de]' }">
 <div class="py-16 text-center">
 <span class="mx-auto grid size-14 place-items-center rounded-2xl bg-[#f1f6fa] text-[#456a88]">
 <UIcon name="i-lucide-bookmark-check" class="size-7" aria-hidden="true" />
 </span>
 <h3 class="mt-4 text-lg font-bold">No hay tickets guardados</h3>
 <p class="mx-auto mt-2 max-w-md text-sm text-[#64748b]">Cuando guardes una venta desde punto de venta, aparecerá aquí para recuperarla después.</p>
 <UButton class="mt-5" to="/dashboard/sales" label="Ir a punto de venta" icon="i-lucide-monitor-up" />
 </div>
 </UCard>

 <div v-else class="grid gap-4 lg:grid-cols-[minmax(18rem,.42fr)_minmax(0,1fr)]">
 <section aria-label="Lista de tickets guardados" class="space-y-3">
 <button
 v-for="ticket in tickets"
 :key="ticket.id"
 type="button"
 class="w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-[#b9c8bf] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
 :class="selectedTicket?.id === ticket.id ? 'border-[#456a88] ring-1 ring-[#456a88]' : 'border-[#dde3de]'"
 :aria-current="selectedTicket?.id === ticket.id ? 'true' : undefined"
 @click="selectedTicketId = ticket.id"
 >
 <div class="flex items-start justify-between gap-3">
 <div class="min-w-0">
 <p class="text-xs font-bold uppercase tracking-[.16em] text-[#64748b]">Ticket {{ shortTicketId(ticket) }}</p>
 <h3 class="mt-1 truncate text-base font-bold">{{ ticket.note || 'Sin nota' }}</h3>
 <p class="mt-1 text-xs text-[#64748b]">{{ dateTime.format(new Date(ticket.updatedAt)) }}</p>
 </div>
 <p class="shrink-0 text-lg font-black text-[#456a88]">{{ currency.format(ticket.total) }}</p>
 </div>
 <div class="mt-3 flex items-center justify-between gap-2 text-xs text-[#475569]">
 <span>{{ ticket.itemCount }} {{ ticket.itemCount === 1 ? 'artículo' : 'artículos' }}</span>
 <span>{{ ticket.createdBy.fullName }}</span>
 </div>
 </button>
 </section>

 <section aria-labelledby="ticket-detail-title">
 <UCard v-if="selectedTicket" :ui="{ root: 'rounded-2xl ring-[#dde3de]', header: 'px-4 py-4 sm:px-5', body: 'p-0', footer: 'px-4 py-4 sm:px-5' }">
 <template #header>
 <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
 <div>
 <p class="text-xs font-bold uppercase tracking-[.18em] text-[#64748b]">Ticket {{ shortTicketId(selectedTicket) }}</p>
 <h2 id="ticket-detail-title" class="mt-1 text-xl font-bold">{{ selectedTicket.note || 'Ticket guardado' }}</h2>
 <p class="mt-1 text-sm text-[#64748b]">Guardado por {{ selectedTicket.createdBy.fullName }} · {{ dateTime.format(new Date(selectedTicket.createdAt)) }}</p>
 </div>
 <UBadge label="En espera" color="primary" variant="soft" />
 </div>
 </template>

 <div class="overflow-hidden">
 <div class="grid grid-cols-[5rem_minmax(0,1fr)_5.5rem_5rem_6rem] gap-2 border-b border-[#d7ddd8] bg-[#f0f5f2] px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-[#5d6a62]">
 <span>Código</span>
 <span>Producto</span>
 <span class="text-right">Precio</span>
 <span class="text-center">Cant.</span>
 <span class="text-right">Importe</span>
 </div>
 <ul class="divide-y divide-[#d8e7f1]" aria-label="Productos del ticket guardado">
 <li
 v-for="item in selectedTicket.items"
 :key="item.id"
 class="grid grid-cols-[5rem_minmax(0,1fr)_5.5rem_5rem_6rem] items-center gap-2 px-4 py-3 text-sm odd:bg-white even:bg-[#f8fbf9]"
 >
 <span class="truncate text-xs text-[#617068]">{{ item.sku }}</span>
 <span class="min-w-0">
 <span class="block truncate font-semibold">{{ item.name }}</span>
 <span class="block truncate text-xs text-[#64748b]">{{ item.description || 'Sin descripción' }}</span>
 </span>
 <span class="text-right text-xs font-semibold">{{ currency.format(item.unitPrice) }}</span>
 <span class="text-center text-xs">{{ item.quantity }} {{ unitLabel(item.unit) }}</span>
 <span class="text-right text-sm font-bold text-sky-700">{{ currency.format(item.lineTotal) }}</span>
 </li>
 </ul>
 </div>

 <template #footer>
 <div class="space-y-4">
 <div class="flex items-center justify-between rounded-2xl bg-[#f1f6fa] px-4 py-3">
 <div>
 <p class="text-xs font-bold uppercase tracking-[.14em] text-[#456052]">Total pendiente</p>
 <p class="text-sm text-[#64748b]">{{ selectedTicket.itemCount }} {{ selectedTicket.itemCount === 1 ? 'artículo' : 'artículos' }}</p>
 </div>
 <p class="text-3xl font-black tracking-[-.04em] text-[#385872]">{{ currency.format(selectedTicket.total) }}</p>
 </div>
 <div class="grid gap-2 sm:grid-cols-3">
 <UButton
 class="sm:col-span-2"
 block
 size="lg"
 label="Recuperar ticket"
 icon="i-lucide-rotate-ccw"
 :loading="recoveringTicketId === selectedTicket.id"
 :disabled="Boolean(deletingTicketId)"
 @click="recoverTicket(selectedTicket)"
 />
 <UButton
 block
 size="lg"
 label="Eliminar"
 icon="i-lucide-trash-2"
 color="error"
 variant="soft"
 :loading="deletingTicketId === selectedTicket.id"
 :disabled="Boolean(recoveringTicketId)"
 @click="deleteTicket(selectedTicket)"
 />
 </div>
 <UButton block label="Regresar a punto de venta" icon="i-lucide-monitor-up" color="neutral" variant="ghost" to="/dashboard/sales" />
 </div>
 </template>
 </UCard>
 </section>
 </div>
 </template>
 </div>
 </DashboardShell>
</template>
