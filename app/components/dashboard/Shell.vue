<script setup lang="ts">
withDefaults(defineProps<{ eyebrow?: string; title?: string; hideHeader?: boolean }>(), {
 eyebrow: 'Panel de inventario',
 title: 'Resumen general',
 hideHeader: false
})
const mobileMenuOpen = ref(false)
const { user } = useAuth()
const { status: backendWarmupStatus, errorMessage: backendWarmupError, warmup: warmupBackend } = useBackendWarmup()
const initials = computed(() => user.value?.displayName.split(' ').filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase() || 'U')
const roleLabel = computed(() => {
 if (user.value?.role === 'SUPERADMIN') return 'Superadmin'
 if (user.value?.role === 'ADMIN') return 'Administrador'
 return 'Colaborador'
})

onMounted(() => {
 void warmupBackend()
})
</script>

<template>
 <a href="#main-content" class="skip-link">Saltar al contenido</a>
 <div class="flex min-h-screen bg-[#f7fafc] text-slate-950 dark:bg-slate-900 dark:text-slate-100">
 <aside class="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 lg:block">
 <DashboardSidebar />
 </aside>

 <USlideover v-model:open="mobileMenuOpen" side="left" title="Menú principal" description="Navegación de Abarrotes Alex" class="lg:hidden" :ui="{ content: 'max-w-[19rem]' }">
 <template #body><DashboardSidebar compact @navigate="mobileMenuOpen = false" /></template>
 </USlideover>

 <div class="min-w-0 flex-1">
 <header v-if="!hideHeader" class="sticky top-0 z-20 flex h-18 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 sm:px-6 lg:h-20 lg:px-8">
 <div class="flex min-w-0 items-center gap-3">
 <UButton class="lg:hidden" icon="i-lucide-menu" color="neutral" variant="ghost" aria-label="Abrir menú principal" @click="mobileMenuOpen = true" />
 <div class="min-w-0"><p class="hidden text-sm text-slate-500 dark:text-slate-400 sm:block">{{ eyebrow }}</p><h1 class="truncate text-lg font-bold tracking-tight sm:text-xl">{{ title }}</h1></div>
 </div>
 <div class="flex items-center gap-3">
 <UBadge :label="roleLabel" color="primary" variant="soft" class="hidden sm:inline-flex" />
 <ThemeToggle />
 <UAvatar :text="initials" size="md" class="bg-[#4f7896] text-white dark:bg-[#6f93ac] dark:text-slate-950 lg:hidden" />
 </div>
 </header>
 <div v-else class="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 lg:hidden">
 <UButton icon="i-lucide-menu" color="neutral" variant="ghost" aria-label="Abrir menú principal" @click="mobileMenuOpen = true" />
 </div>
 <main id="main-content" tabindex="-1">
 <div v-if="backendWarmupStatus === 'slow' || backendWarmupStatus === 'error'" class="px-4 pt-4 sm:px-6 lg:px-8">
 <UAlert
 v-if="backendWarmupStatus === 'slow'"
 class="mx-auto max-w-[1500px]"
 color="info"
 variant="soft"
 icon="i-lucide-loader-circle"
 title="Conectando con el servidor"
 description="El servidor puede estar despertando. Esto puede tardar unos segundos."
 />
 <UAlert
 v-else
 class="mx-auto max-w-[1500px]"
 color="warning"
 variant="soft"
 icon="i-lucide-wifi-off"
 title="No pudimos conectar con el servidor"
 :description="backendWarmupError"
 >
 <template #actions>
 <UButton label="Reintentar" color="warning" variant="soft" @click="warmupBackend(true)" />
 </template>
 </UAlert>
 </div>
 <slot />
 </main>
 </div>
 </div>
</template>
