import type { CashRegisterSession } from '~/types'

const CACHE_KEY = 'abr_current_cash_session'
const CACHE_TTL_MS = 30_000

type CachedCashSession = {
 savedAt: number
 session: CashRegisterSession | null
}

export function useCurrentCashSession() {
 const cashSession = useState<CashRegisterSession | null>('current-cash-session', () => null)
 const status = useState<'idle' | 'pending' | 'success' | 'error'>('current-cash-session-status', () => 'idle')
 const error = useState<string>('current-cash-session-error', () => '')
 const lastFetchedAt = useState<number>('current-cash-session-last-fetched-at', () => 0)

 function writeCache(session: CashRegisterSession | null) {
 if (!import.meta.client) return
 const payload: CachedCashSession = { savedAt: Date.now(), session }
 localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
 lastFetchedAt.value = payload.savedAt
 }

 function readCache() {
 if (!import.meta.client) return false
 const cached = localStorage.getItem(CACHE_KEY)
 if (!cached) return false

 try {
 const payload = JSON.parse(cached) as CachedCashSession
 cashSession.value = payload.session
 lastFetchedAt.value = payload.savedAt
 return true
 } catch {
 localStorage.removeItem(CACHE_KEY)
 return false
 }
 }

 async function refresh(options: { force?: boolean } = {}) {
 const now = Date.now()
 if (!options.force && lastFetchedAt.value && now - lastFetchedAt.value < CACHE_TTL_MS) return cashSession.value

 if (!cashSession.value) status.value = 'pending'
 error.value = ''

 try {
 const session = await $fetch<CashRegisterSession | null>('/api/cashRegister/current')
 cashSession.value = session
 writeCache(session)
 status.value = 'success'
 return session
 } catch (fetchError: unknown) {
 error.value = getErrorMessage(fetchError, 'No pudimos verificar la caja actual.')
 status.value = 'error'
 return cashSession.value
 }
 }

 function setSession(session: CashRegisterSession | null) {
 cashSession.value = session
 status.value = 'success'
 writeCache(session)
 }

 function clearSession() {
 setSession(null)
 }

 function init() {
 const hasCache = readCache()
 if (!hasCache) void refresh({ force: true })
 else void refresh()
 }

 return {
 cashSession,
 status,
 error,
 init,
 refresh,
 setSession,
 clearSession
 }
}
