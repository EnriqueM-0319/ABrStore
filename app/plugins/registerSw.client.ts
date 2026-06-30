export default defineNuxtPlugin(() => {
 if (!('serviceWorker' in navigator)) return

 window.addEventListener('load', () => {
 navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
 console.warn('No se pudo registrar el service worker.', error)
 })
 })
})
