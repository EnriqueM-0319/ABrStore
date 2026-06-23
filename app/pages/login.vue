<script setup lang="ts">
useHead({ title: 'Acceso al sistema' })
const form = reactive({ username: '', password: '' })
const loading = ref(false)
const error = ref('')
const { loadUser } = useAuth()

async function submit() {
  error.value = ''; loading.value = true
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: form })
    await loadUser()
    await navigateTo('/dashboard/ventas')
  } catch (caughtError: unknown) {
    error.value = getErrorMessage(caughtError, 'No pudimos validar tus credenciales. Inténtalo de nuevo.')
  } finally { loading.value = false }
}
</script>

<template>
  <AuthShell eyebrow="Sistema de control ABR" title="Acceso operativo" description="Ingresa tus credenciales para continuar al panel de ventas, inventario y caja.">
    <form class="space-y-5" @submit.prevent="submit">
      <FormField v-model="form.username" name="username" label="Usuario asignado" placeholder="nombre.apellido" autocomplete="username" />
      <FormField v-model="form.password" name="password" label="Clave de acceso" type="password" placeholder="••••••••" autocomplete="current-password" />
      <UAlert v-if="error" color="error" variant="soft" icon="i-lucide-circle-alert" :description="error" role="alert" />
      <UButton type="submit" block size="xl" color="primary" :loading="loading" label="Entrar al sistema" class="rounded-xl" />
    </form>
    <p class="mt-7 text-center text-sm text-[#657069]">El acceso es exclusivo para personal autorizado. Si necesitas una cuenta, solicítala con administración.</p>
  </AuthShell>
</template>
