<script setup lang="ts">
withDefaults(defineProps<{ eyebrow?: string; title?: string }>(), {
  eyebrow: 'Panel de inventario',
  title: 'Resumen general'
})
const mobileMenuOpen = ref(false)
const { user } = useAuth()
const initials = computed(() => user.value?.fullName.split(' ').filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase() || 'U')
const roleLabel = computed(() => {
  if (user.value?.role === 'SUPERADMIN') return 'Superadmin'
  if (user.value?.role === 'ADMIN') return 'Administrador'
  return 'Colaborador'
})
</script>

<template>
  <a href="#main-content" class="skip-link">Saltar al contenido</a>
  <div class="flex min-h-screen bg-[#f6f7f5] text-[#202b25]">
    <aside class="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-[#e5e8e5] lg:block">
      <DashboardSidebar />
    </aside>

    <USlideover v-model:open="mobileMenuOpen" side="left" title="Menú principal" description="Navegación de ABR Store" class="lg:hidden" :ui="{ content: 'max-w-[19rem]' }">
      <template #body><DashboardSidebar compact @navigate="mobileMenuOpen = false" /></template>
    </USlideover>

    <div class="min-w-0 flex-1">
      <header class="sticky top-0 z-20 flex h-18 items-center justify-between border-b border-[#e5e8e5] bg-white/95 px-4 backdrop-blur sm:px-6 lg:h-20 lg:px-8">
        <div class="flex min-w-0 items-center gap-3">
          <UButton class="lg:hidden" icon="i-lucide-menu" color="neutral" variant="ghost" aria-label="Abrir menú principal" @click="mobileMenuOpen = true" />
          <div class="min-w-0"><p class="hidden text-sm text-[#78827c] sm:block">{{ eyebrow }}</p><h1 class="truncate text-lg font-bold tracking-tight sm:text-xl">{{ title }}</h1></div>
        </div>
        <div class="flex items-center gap-3">
          <UBadge :label="roleLabel" color="primary" variant="soft" class="hidden sm:inline-flex" />
          <UAvatar :text="initials" size="md" class="bg-[#1f4937] text-white lg:hidden" />
        </div>
      </header>
      <main id="main-content" tabindex="-1"><slot /></main>
    </div>
  </div>
</template>
