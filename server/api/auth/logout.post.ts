export default defineEventHandler((event) => {
  deleteCookie(event, 'abr_session', { path: '/' })
  return { ok: true }
})
