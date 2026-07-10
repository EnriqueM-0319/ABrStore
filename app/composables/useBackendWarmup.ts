type BackendWarmupStatus = 'idle' | 'checking' | 'slow' | 'ready' | 'error'

const WARMUP_CACHE_MS = 5 * 60 * 1000
const SLOW_NOTICE_MS = 2500
const HEALTH_TIMEOUT_MS = 20000

export function useBackendWarmup() {
 const status = useState<BackendWarmupStatus>('backend-warmup-status', () => 'idle')
 const lastCheckedAt = useState<number>('backend-warmup-last-checked-at', () => 0)
 const errorMessage = useState('backend-warmup-error-message', () => '')

 async function warmup(force = false) {
 if (!import.meta.client) return
 const now = Date.now()
 if (!force && status.value === 'ready' && now - lastCheckedAt.value < WARMUP_CACHE_MS) return
 if (status.value === 'checking' || status.value === 'slow') return

 status.value = 'checking'
 errorMessage.value = ''

 const slowTimer = window.setTimeout(() => {
 if (status.value === 'checking') status.value = 'slow'
 }, SLOW_NOTICE_MS)

 try {
 await $fetch('/api/backend/health', { timeout: HEALTH_TIMEOUT_MS })
 lastCheckedAt.value = Date.now()
 status.value = 'ready'
 } catch (error: unknown) {
 errorMessage.value = getErrorMessage(error, 'No pudimos conectar con el servidor. Intenta nuevamente en unos segundos.')
 status.value = 'error'
 } finally {
 window.clearTimeout(slowTimer)
 }
 }

 return {
 status,
 errorMessage,
 warmup
 }
}
