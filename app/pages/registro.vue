<script setup lang="ts">
import type { AuthUser, UserRole } from '~/types/auth'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Registrar usuario' })

const form = reactive<{ fullName: string, email: string, password: string, phone: string, role: UserRole }>({
  fullName: '',
  email: '',
  password: '',
  phone: '',
  role: 'WORKER'
})
const loading = ref(false)
const error = ref('')
const createdUser = ref<AuthUser | null>(null)
const { user } = useAuth()
const roleLabels: Record<UserRole, string> = {
  SUPERADMIN: 'Superadmin',
  ADMIN: 'Administrador',
  WORKER: 'Colaborador'
}
const roleOptions = computed(() => {
  if (user.value?.role === 'SUPERADMIN') {
    return [
      { label: 'Colaborador', value: 'WORKER' },
      { label: 'Administrador', value: 'ADMIN' },
      { label: 'Superadmin', value: 'SUPERADMIN' }
    ]
  }

  return [{ label: 'Colaborador', value: 'WORKER' }]
})

watch(roleOptions, (options) => {
  if (!options.some(option => option.value === form.role)) form.role = 'WORKER'
}, { immediate: true })

onMounted(() => {
  if (user.value && !['SUPERADMIN', 'ADMIN'].includes(user.value.role)) {
    void navigateTo('/dashboard/ventas')
  }
})

async function submit() {
  error.value = ''
  createdUser.value = null
  loading.value = true
  try {
    createdUser.value = await $fetch<AuthUser>('/api/auth/register', { method: 'POST', body: form })
    form.fullName = ''
    form.email = ''
    form.password = ''
    form.phone = ''
    form.role = 'WORKER'
  } catch (caughtError: unknown) {
    error.value = getErrorMessage(caughtError, 'No pudimos registrar el usuario. Inténtalo de nuevo.')
  } finally { loading.value = false }
}
</script>

<template>
  <DashboardShell eyebrow="Usuarios" title="Registrar usuario">
    <div class="mx-auto grid max-w-5xl gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:p-8">
      <UCard :ui="{ root: 'rounded-2xl ring-[#dde3de]', body: 'p-5 sm:p-6' }">
        <template #header>
          <div>
            <h2 class="text-lg font-bold">Nuevo acceso al sistema</h2>
            <p class="mt-1 text-sm text-[#7d8781]">El usuario iniciará sesión con el nombre generado, no con su correo.</p>
          </div>
        </template>
    <form class="space-y-4" @submit.prevent="submit">
      <FormField v-model="form.fullName" name="fullName" label="Nombre completo" placeholder="Tu nombre y apellido" autocomplete="name" />
      <FormField v-model="form.email" name="email" label="Correo electrónico" type="email" placeholder="tu@correo.com" autocomplete="email" />
      <FormField v-model="form.password" name="password" label="Contraseña" type="password" placeholder="Mínimo 8 caracteres" autocomplete="new-password" />
      <FormField v-model="form.phone" name="phone" label="Número de teléfono" type="tel" placeholder="+52 999 000 0000" autocomplete="tel" />
      <UFormField label="Rol del usuario" name="role">
        <USelect
          v-model="form.role"
          :items="roleOptions"
          value-key="value"
          label-key="label"
          class="w-full"
          aria-label="Rol del usuario"
        />
      </UFormField>
      <UAlert v-if="error" color="error" variant="soft" icon="i-lucide-circle-alert" :description="error" role="alert" />
      <UAlert
        v-if="createdUser"
        color="success"
        variant="soft"
        icon="i-lucide-user-check"
        title="Usuario registrado"
        :description="`Entrégale este usuario: ${createdUser.username || 'pendiente'}`"
        role="status"
      />
      <UButton type="submit" block size="xl" color="primary" :loading="loading" label="Registrar usuario" class="mt-2 rounded-xl" />
    </form>
      </UCard>

      <aside class="space-y-4">
        <UCard :ui="{ root: 'rounded-2xl ring-[#dde3de]', body: 'p-5' }">
          <h3 class="font-bold">Permisos actuales</h3>
          <ul class="mt-4 space-y-3 text-sm text-[#68746d]">
            <li><span class="font-semibold text-[#26322c]">Superadmin:</span> podrá administrar accesos avanzados y futuras pantallas restringidas.</li>
            <li><span class="font-semibold text-[#26322c]">Administrador:</span> puede registrar colaboradores y operar el sistema.</li>
            <li><span class="font-semibold text-[#26322c]">Colaborador:</span> puede vender y operar módulos permitidos.</li>
          </ul>
        </UCard>
        <UCard v-if="createdUser" :ui="{ root: 'rounded-2xl ring-emerald-200 bg-emerald-50', body: 'p-5' }">
          <p class="text-sm font-semibold text-emerald-900">Datos para entregar</p>
          <p class="mt-3 text-2xl font-bold tracking-tight text-emerald-950">{{ createdUser.username }}</p>
          <p class="mt-1 text-sm text-emerald-800">{{ createdUser.fullName }} · {{ roleLabels[createdUser.role] }}</p>
        </UCard>
      </aside>
    </div>
  </DashboardShell>
</template>
