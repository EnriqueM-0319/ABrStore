import type { MaybeRefOrGetter } from 'vue'
import type { HeldTicket } from '~/types'

type HeldTicketsStatus = 'idle' | 'pending' | 'success' | 'error'

type CachedHeldTickets = {
 tickets: HeldTicket[]
 cachedAt: number
}

const cacheTtl = 30_000

function getCacheKey(cashSessionId: string) {
 return `abr_held_tickets_${cashSessionId}`
}

function readCachedHeldTickets(cashSessionId: string) {
 if (!import.meta.client) return null

 try {
 const rawCache = localStorage.getItem(getCacheKey(cashSessionId))
 if (!rawCache) return null
 return JSON.parse(rawCache) as CachedHeldTickets
 } catch {
 return null
 }
}

function writeCachedHeldTickets(cashSessionId: string, tickets: HeldTicket[]) {
 if (!import.meta.client) return

 localStorage.setItem(getCacheKey(cashSessionId), JSON.stringify({
 tickets,
 cachedAt: Date.now()
 } satisfies CachedHeldTickets))
}

export function useHeldTickets(cashSessionId: MaybeRefOrGetter<string | null | undefined>) {
 const tickets = useState<HeldTicket[]>('held-tickets:list', () => [])
 const status = useState<HeldTicketsStatus>('held-tickets:status', () => 'idle')
 const error = useState<string | null>('held-tickets:error', () => null)
 const activeCashSessionId = useState<string | null>('held-tickets:cash-session-id', () => null)
 const lastFetchedAt = useState<number>('held-tickets:last-fetched-at', () => 0)

 const isRefreshing = computed(() => status.value === 'pending' && tickets.value.length > 0)
 const isInitialLoading = computed(() => status.value === 'pending' && !tickets.value.length)

 function getSessionId() {
 return toValue(cashSessionId) || null
 }

 function getCachedTicketsAge() {
 return Date.now() - lastFetchedAt.value
 }

 function setTickets(nextTickets: HeldTicket[]) {
 const sessionId = getSessionId()
 tickets.value = nextTickets
 activeCashSessionId.value = sessionId
 lastFetchedAt.value = Date.now()
 if (sessionId) writeCachedHeldTickets(sessionId, nextTickets)
 }

 function removeTicket(ticketId: string) {
 setTickets(tickets.value.filter(ticket => ticket.id !== ticketId))
 }

 function upsertTicket(ticket: HeldTicket) {
 const nextTickets = [
 ticket,
 ...tickets.value.filter(currentTicket => currentTicket.id !== ticket.id)
 ].sort((firstTicket, secondTicket) => new Date(secondTicket.updatedAt).getTime() - new Date(firstTicket.updatedAt).getTime())

 setTickets(nextTickets)
 }

 function restoreTickets(previousTickets: HeldTicket[]) {
 setTickets(previousTickets)
 }

 async function refresh(options: { force?: boolean } = {}) {
 const sessionId = getSessionId()

 if (!sessionId) {
 tickets.value = []
 activeCashSessionId.value = null
 lastFetchedAt.value = 0
 status.value = 'success'
 error.value = null
 return []
 }

 if (activeCashSessionId.value !== sessionId) {
 const cached = readCachedHeldTickets(sessionId)
 tickets.value = cached?.tickets ?? []
 activeCashSessionId.value = sessionId
 lastFetchedAt.value = cached?.cachedAt ?? 0
 }

 const hasFreshCache = tickets.value.length > 0 && Date.now() - lastFetchedAt.value < cacheTtl
 if (!options.force && hasFreshCache) {
 status.value = 'success'
 return tickets.value
 }

 status.value = 'pending'
 error.value = null

 try {
 const freshTickets = await $fetch<HeldTicket[]>('/api/heldTickets')
 setTickets(freshTickets)
 status.value = 'success'
 return freshTickets
 } catch (fetchError: unknown) {
 status.value = 'error'
 error.value = getErrorMessage(fetchError, 'No pudimos cargar los tickets en espera.')
 return tickets.value
 }
 }

 function init() {
 const sessionId = getSessionId()

 if (!sessionId) {
 tickets.value = []
 activeCashSessionId.value = null
 lastFetchedAt.value = 0
 status.value = 'success'
 error.value = null
 return Promise.resolve([])
 }

 if (activeCashSessionId.value !== sessionId) {
 const cached = readCachedHeldTickets(sessionId)
 tickets.value = cached?.tickets ?? []
 activeCashSessionId.value = sessionId
 lastFetchedAt.value = cached?.cachedAt ?? 0
 }

 if (tickets.value.length && getCachedTicketsAge() < cacheTtl) {
 void refresh({ force: true })
 return Promise.resolve(tickets.value)
 }

 return refresh({ force: true })
 }

 return {
 tickets,
 status,
 error,
 isRefreshing,
 isInitialLoading,
 init,
 refresh,
 setTickets,
 upsertTicket,
 removeTicket,
 restoreTickets
 }
}
