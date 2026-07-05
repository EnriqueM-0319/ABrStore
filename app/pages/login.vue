<script setup lang="ts">
useHead({ title: 'Acceso al sistema' })
const form = reactive({ username: '', password: '' })
const loading = ref(false)
const error = ref('')
const { loadUser } = useAuth()

async function submit() {
 error.value = ''; loading.value = true
 try {
 await $fetch('/api/auth/login', { method: 'POST', body: { username: form.username, password: form.password } })
 await loadUser()
 await navigateTo('/dashboard/sales')
 } catch (caughtError: unknown) {
 error.value = getErrorMessage(caughtError, 'No pudimos validar tus credenciales. Inténtalo de nuevo.')
 } finally {
 form.password = ''
 loading.value = false
 }
}
</script>

<template>
<AuthShell eyebrow="Sistema de inventario" title="Acceso Abarrotes Alex" description="Ingresa tus credenciales para consultar existencias, operar ventas y mantener la caja al día.">
 <form class="space-y-5" @submit.prevent="submit">
 <FormField v-model="form.username" name="username" label="Usuario asignado" placeholder="nombre.apellido" autocomplete="username" />
 <FormField v-model="form.password" name="password" label="Clave de acceso" type="password" placeholder="••••••••" autocomplete="current-password" />
 <UAlert v-if="error" color="error" variant="soft" icon="i-lucide-circle-alert" :description="error" role="alert" />
 <UButton type="submit" block size="xl" color="primary" :loading="loading" label="Entrar al sistema" class="rounded-xl" />
 </form>
 <p class="mt-7 text-center text-sm text-[#475569]">Acceso exclusivo para personal autorizado de Abarrotes Alex.</p>
</AuthShell>
</template>
