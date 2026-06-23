<script setup lang="ts">
import type { ManagedUser } from '~/types/user-management'
import type { UserRole } from '~/types/auth'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Usuarios' })

const { user } = useAuth()
const toast = useToast()
const search = ref('')
const debouncedSearch = ref('')
const selectedUser = ref<ManagedUser | null>(null)
const editOpen = ref(false)
const saving = ref(false)
const togglingId = ref('')
const form = reactive({
  fullName: '',
  email: '',
  phone: '',
  role: 'WORKER' as UserRole,
  active: true,
  password: ''
})
let searchTimer: ReturnType<typeof setTimeout> | undefined

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

const { data: users, status, error, refresh } = useFetch<ManagedUser[]>('/api/users', {
  query: { search: debouncedSearch },
  default: () => [],
  lazy: true,
  server: false,
  watch: [debouncedSearch]
})
const isLoading = computed(() => status.value === 'pending' && !users.value.length)
const isRefreshing = computed(() => status.value === 'pending' && users.value.length > 0)

watch(search, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    debouncedSearch.value = value.trim()
  }, 250)
})

onBeforeUnmount(() => clearTimeout(searchTimer))
onMounted(() => {
  if (user.value && !['SUPERADMIN', 'ADMIN'].includes(user.value.role)) {
    void navigateTo('/dashboard/ventas')
  }
})

function openEdit(managedUser: ManagedUser) {
  selectedUser.value = managedUser
  form.fullName = managedUser.fullName
  form.email = managedUser.email
  form.phone = managedUser.phone
  form.role = managedUser.role
  form.active = managedUser.active
  form.password = ''
  editOpen.value = true
}

async function saveUser() {
  if (!selectedUser.value || saving.value) return
  saving.value = true

  try {
    const updatedUser = await $fetch<ManagedUser>(`/api/users/${selectedUser.value.id}`, {
      method: 'PATCH',
      body: {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        role: form.role,
        active: form.active,
        password: form.password || undefined
      }
    })
    users.value = users.value.map(currentUser => currentUser.id === updatedUser.id ? updatedUser : currentUser)
    editOpen.value = false
    toast.add({ title: 'Usuario actualizado', description: `${updatedUser.fullName} quedó actualizado.`, color: 'success', icon: 'i-lucide-user-check' })
  } catch (caughtError: unknown) {
    toast.add({ title: 'No se pudo actualizar', description: getErrorMessage(caughtError, 'Inténtalo de nuevo.'), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    saving.value = false
  }
}

async function toggleUserStatus(managedUser: ManagedUser) {
  if (togglingId.value) return
  togglingId.value = managedUser.id
  const previousUsers = [...users.value]
  const nextActive = !managedUser.active
  users.value = users.value.map(currentUser => currentUser.id === managedUser.id ? { ...currentUser, active: nextActive } : currentUser)

  try {
    const updatedUser = managedUser.active
      ? await $fetch<ManagedUser>(`/api/users/${managedUser.id}`, { method: 'DELETE' })
      : await $fetch<ManagedUser>(`/api/users/${managedUser.id}`, {
          method: 'PATCH',
          body: {
            fullName: managedUser.fullName,
            email: managedUser.email,
            phone: managedUser.phone,
            role: managedUser.role,
            active: true
          }
        })
    users.value = users.value.map(currentUser => currentUser.id === updatedUser.id ? updatedUser : currentUser)
    toast.add({
      title: updatedUser.active ? 'Usuario activado' : 'Usuario desactivado',
      description: updatedUser.active ? `${managedUser.fullName} ya puede iniciar sesión.` : `${managedUser.fullName} ya no podrá iniciar sesión.`,
      color: 'success',
      icon: updatedUser.active ? 'i-lucide-user-check' : 'i-lucide-user-x'
    })
  } catch (caughtError: unknown) {
    users.value = previousUsers
    toast.add({ title: nextActive ? 'No se pudo activar' : 'No se pudo desactivar', description: getErrorMessage(caughtError, 'Inténtalo de nuevo.'), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    togglingId.value = ''
  }
}
</script>

<template>
  <DashboardShell eyebrow="Administración" title="Usuarios">
    <div class="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 class="text-xl font-bold tracking-tight">Usuarios del sistema</h2>
          <p class="mt-1 max-w-2xl text-sm text-[#7d8781]">
            {{ user?.role === 'SUPERADMIN' ? 'Puedes ver y administrar superadmins, administradores y colaboradores.' : 'Como administrador solo puedes ver y administrar colaboradores.' }}
          </p>
        </div>
        <UButton to="/registro" label="Registrar usuario" icon="i-lucide-user-plus" class="self-start rounded-xl lg:self-auto" />
      </div>

      <UCard :ui="{ root: 'rounded-2xl ring-[#dde3de]', body: 'p-4 sm:p-5' }">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Buscar por nombre, usuario, correo o teléfono…"
            autocomplete="off"
            class="w-full sm:max-w-md"
            aria-label="Buscar usuarios"
          />
          <UButton icon="i-lucide-refresh-cw" label="Actualizar" color="neutral" variant="soft" :loading="isRefreshing" @click="refresh()" />
        </div>

        <div class="mt-5" aria-live="polite" :aria-busy="isLoading || isRefreshing">
          <div v-if="isLoading" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <USkeleton v-for="item in 6" :key="item" class="h-44 rounded-2xl" />
          </div>
          <UAlert v-else-if="error" color="error" variant="soft" icon="i-lucide-circle-alert" title="No pudimos cargar usuarios" description="Revisa la conexión e inténtalo nuevamente.">
            <template #actions>
              <UButton label="Reintentar" color="error" variant="soft" size="sm" @click="refresh()" />
            </template>
          </UAlert>
          <div v-else-if="!users.length" class="rounded-2xl border border-dashed border-[#d8ddd9] bg-white px-6 py-14 text-center">
            <UIcon name="i-lucide-users" class="mx-auto size-8 text-[#a0aaa4]" aria-hidden="true" />
            <p class="mt-3 font-semibold">No hay usuarios para mostrar</p>
            <p class="mt-1 text-sm text-[#89928d]">Prueba con otra búsqueda o registra un usuario nuevo.</p>
          </div>
          <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <UCard v-for="managedUser in users" :key="managedUser.id" :ui="{ root: 'rounded-2xl ring-[#e4e8e4]', body: 'p-5' }">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <p class="truncate font-bold">{{ managedUser.fullName }}</p>
                  <p class="mt-1 text-sm text-[#68746d]">@{{ managedUser.username || 'sin.usuario' }}</p>
                </div>
                <UBadge :label="managedUser.active ? 'Activo' : 'Inactivo'" :color="managedUser.active ? 'success' : 'neutral'" variant="soft" />
              </div>
              <div class="mt-4 space-y-2 text-sm text-[#68746d]">
                <p class="truncate"><span class="font-semibold text-[#26322c]">Correo:</span> {{ managedUser.email }}</p>
                <p><span class="font-semibold text-[#26322c]">Teléfono:</span> {{ managedUser.phone }}</p>
                <p><span class="font-semibold text-[#26322c]">Rol:</span> {{ roleLabels[managedUser.role] }}</p>
              </div>
              <div class="mt-5 flex flex-col gap-2 sm:flex-row">
                <UButton label="Editar" icon="i-lucide-pencil" size="sm" class="flex-1 justify-center" @click="openEdit(managedUser)" />
                <UButton
                  :label="managedUser.active ? 'Desactivar' : 'Activar usuario'"
                  :icon="managedUser.active ? 'i-lucide-user-x' : 'i-lucide-user-check'"
                  size="sm"
                  :color="managedUser.active ? 'error' : 'success'"
                  variant="soft"
                  class="flex-1 justify-center"
                  :disabled="managedUser.id === user?.id"
                  :loading="togglingId === managedUser.id"
                  @click="toggleUserStatus(managedUser)"
                />
              </div>
            </UCard>
          </div>
        </div>
      </UCard>
    </div>

    <UModal v-model:open="editOpen" title="Editar usuario" description="Actualiza datos, rol o estado del acceso.">
      <template #body>
        <form class="space-y-4" @submit.prevent="saveUser">
          <FormField v-model="form.fullName" name="fullName" label="Nombre completo" autocomplete="name" />
          <FormField v-model="form.email" name="email" label="Correo electrónico" type="email" autocomplete="email" />
          <FormField v-model="form.phone" name="phone" label="Número de teléfono" type="tel" autocomplete="tel" />
          <UFormField label="Rol" name="role">
            <USelect v-model="form.role" :items="roleOptions" value-key="value" label-key="label" class="w-full" />
          </UFormField>
          <FormField v-model="form.password" name="password" label="Nueva contraseña opcional" type="password" placeholder="Dejar vacío para conservar" autocomplete="new-password" />
          <UFormField label="Usuario activo" name="active">
            <USwitch v-model="form.active" :disabled="selectedUser?.id === user?.id" />
          </UFormField>
        </form>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="Cancelar" color="neutral" variant="ghost" @click="editOpen = false" />
          <UButton label="Guardar cambios" icon="i-lucide-save" :loading="saving" @click="saveUser" />
        </div>
      </template>
    </UModal>
  </DashboardShell>
</template>
