export default defineNuxtRouteMiddleware(async () => {
 const { user, loadUser } = useAuth()
 if (user.value) return

 try {
 await loadUser()
 } catch {
 return navigateTo('/login')
 }
})
