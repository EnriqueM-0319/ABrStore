<script setup lang="ts">
defineProps<{ compact?: boolean }>()
defineEmits<{ navigate: [] }>()

const route = useRoute()
const { user, clearUser } = useAuth()
const items = [
 { label: 'Punto de venta', icon: 'i-lucide-monitor-up', to: '/dashboard/sales', enabled: true },
 { label: 'Tickets guardados', icon: 'i-lucide-bookmark', to: '/dashboard/heldTickets', enabled: true }
]
const salesItems = [
 { label: 'Historial de ventas', icon: 'i-lucide-receipt-text', to: '/dashboard/salesHistory' },
 { label: 'Cuentas por cobrar', icon: 'i-lucide-hand-coins', to: '/dashboard/receivables' }
]
const adminItems = [
 { label: 'Usuarios', icon: 'i-lucide-users', to: '/dashboard/users', enabled: true },
 { label: 'Registrar usuario', icon: 'i-lucide-user-plus', to: '/register', enabled: true }
]
const reportItems = [
 { label: 'Reporte de ventas', icon: 'i-lucide-chart-column', to: '/dashboard/reports/sales' },
 { label: 'Cobros de fiado', icon: 'i-lucide-hand-coins', to: '/dashboard/reports/creditCollections' },
 { label: 'Reporte de producto', icon: 'i-lucide-chart-bar-big', to: '/dashboard/reports/products' }
]
const inventoryItems = [
 { label: 'Productos', icon: 'i-lucide-package', to: '/dashboard/products' },
 { label: 'Registrar salida', icon: 'i-lucide-package-minus', to: '/dashboard/stockExits' },
 { label: 'Historial de salidas', icon: 'i-lucide-list', to: '/dashboard/stockExits/history' }
]
const cashItems = [
 { label: 'Inicio del día', icon: 'i-lucide-sunrise', to: '/dashboard/cashRegister?section=start' },
 { label: 'Movimientos', icon: 'i-lucide-wallet-cards', to: '/dashboard/cashRegister?section=movements' },
 { label: 'Cierre de caja', icon: 'i-lucide-calculator', to: '/dashboard/cashRegister?section=close' }
]
const inventoryOpen = ref(['/dashboard/inventory', '/dashboard/products'].includes(route.path) || route.path.startsWith('/dashboard/stockExits'))
const salesOpen = ref(['/dashboard/salesHistory', '/dashboard/receivables'].includes(route.path))
const cashOpen = ref(route.path.startsWith('/dashboard/cashRegister'))
const reportsOpen = ref(route.path.startsWith('/dashboard/reports'))
const canManageUsers = computed(() => ['SUPERADMIN', 'ADMIN'].includes(user.value?.role || ''))

watch(() => route.path, (path) => {
 if (['/dashboard/inventory', '/dashboard/products'].includes(path) || path.startsWith('/dashboard/stockExits')) inventoryOpen.value = true
 if (['/dashboard/salesHistory', '/dashboard/receivables'].includes(path)) salesOpen.value = true
 if (path.startsWith('/dashboard/cashRegister')) cashOpen.value = true
 if (path.startsWith('/dashboard/reports')) reportsOpen.value = true
})

const initials = computed(() => user.value?.fullName.split(' ').filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase() || 'U')
const roleLabel = computed(() => {
 if (user.value?.role === 'SUPERADMIN') return 'Superadmin'
 if (user.value?.role === 'ADMIN') return 'Administrador'
 return 'Colaborador'
})

function isCashSectionActive(to: string) {
 if (route.path === '/dashboard/cashRegister' && !route.query.section && to.endsWith('section=start')) return true
 return route.fullPath === to
}

async function logout() {
 await $fetch('/api/auth/logout', { method: 'POST' })
 clearUser()
 await navigateTo('/login')
}
</script>

<template>
 <div class="flex h-full flex-col bg-white px-4 py-6">
 <div class="px-2"><BrandMark /></div>
 <nav class="mt-10 flex-1 space-y-1" aria-label="Navegación principal">
 <template v-for="item in items" :key="item.label">
 <NuxtLink
 :to="item.enabled ? item.to : route.fullPath"
 class="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition"
 :class="item.enabled && route.path === item.to ? 'bg-[#eaf2ed] text-[#1f4937]' : 'text-[#69736d] hover:bg-[#f5f6f4]'"
 :aria-current="item.enabled && route.path === item.to ? 'page' : undefined"
 :aria-disabled="!item.enabled" @click="$emit('navigate')"
 >
 <UIcon :name="item.icon" class="size-5 shrink-0" aria-hidden="true" />
 <span>{{ item.label }}</span>
 <UBadge v-if="!item.enabled" label="Pronto" color="neutral" variant="soft" size="sm" class="ml-auto" />
 </NuxtLink>
 </template>
 <div>
 <button
 type="button"
 class="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition"
 :class="['/dashboard/salesHistory', '/dashboard/receivables'].includes(route.path) ? 'bg-[#eaf2ed] text-[#1f4937]' : 'text-[#69736d] hover:bg-[#f5f6f4]'"
 :aria-expanded="salesOpen"
 aria-controls="sales-submenu"
 @click="salesOpen = !salesOpen"
 >
 <UIcon name="i-lucide-chart-no-axes-combined" class="size-5 shrink-0" aria-hidden="true" />
 <span>Ventas</span>
 <UIcon name="i-lucide-chevron-down" class="ml-auto size-4 transition-transform" :class="salesOpen ? 'rotate-180' : ''" aria-hidden="true" />
 </button>
 <div v-if="salesOpen" id="sales-submenu" class="mt-1 space-y-1 pl-4">
 <NuxtLink
 v-for="child in salesItems" :key="child.to" :to="child.to"
 class="flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition"
 :class="route.path === child.to ? 'bg-[#f0f6f2] text-[#1f4937]' : 'text-[#69736d] hover:bg-[#f5f6f4]'"
 :aria-current="route.path === child.to ? 'page' : undefined"
 @click="$emit('navigate')"
 >
 <UIcon :name="child.icon" class="size-4 shrink-0" aria-hidden="true" />
 <span>{{ child.label }}</span>
 </NuxtLink>
 </div>
 </div>
 <div>
 <button
 type="button"
 class="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition"
 :class="['/dashboard/inventory', '/dashboard/products'].includes(route.path) || route.path.startsWith('/dashboard/stockExits') ? 'bg-[#eaf2ed] text-[#1f4937]' : 'text-[#69736d] hover:bg-[#f5f6f4]'"
 :aria-expanded="inventoryOpen"
 aria-controls="inventory-submenu"
 @click="inventoryOpen = !inventoryOpen"
 >
 <UIcon name="i-lucide-warehouse" class="size-5 shrink-0" aria-hidden="true" />
 <span>Inventario</span>
 <UIcon name="i-lucide-chevron-down" class="ml-auto size-4 transition-transform" :class="inventoryOpen ? 'rotate-180' : ''" aria-hidden="true" />
 </button>
 <div v-if="inventoryOpen" id="inventory-submenu" class="mt-1 space-y-1 pl-4">
 <NuxtLink
 v-for="child in inventoryItems" :key="child.to" :to="child.to"
 class="flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition"
 :class="route.path === child.to ? 'bg-[#f0f6f2] text-[#1f4937]' : 'text-[#69736d] hover:bg-[#f5f6f4]'"
 :aria-current="route.path === child.to ? 'page' : undefined"
 @click="$emit('navigate')"
 >
 <UIcon :name="child.icon" class="size-4 shrink-0" aria-hidden="true" />
 <span>{{ child.label }}</span>
 </NuxtLink>
 </div>
 </div>
 <div>
 <button
 type="button"
 class="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition"
 :class="route.path.startsWith('/dashboard/cashRegister') ? 'bg-[#eaf2ed] text-[#1f4937]' : 'text-[#69736d] hover:bg-[#f5f6f4]'"
 :aria-expanded="cashOpen"
 aria-controls="cash-submenu"
 @click="cashOpen = !cashOpen"
 >
 <UIcon name="ph:cash-register" class="size-5 shrink-0" aria-hidden="true" />
 <span>Caja</span>
 <UIcon name="i-lucide-chevron-down" class="ml-auto size-4 transition-transform" :class="cashOpen ? 'rotate-180' : ''" aria-hidden="true" />
 </button>
 <div v-if="cashOpen" id="cash-submenu" class="mt-1 space-y-1 pl-4">
 <NuxtLink
 v-for="child in cashItems" :key="child.to" :to="child.to"
 class="flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition"
 :class="isCashSectionActive(child.to) ? 'bg-[#f0f6f2] text-[#1f4937]' : 'text-[#69736d] hover:bg-[#f5f6f4]'"
 :aria-current="isCashSectionActive(child.to) ? 'page' : undefined"
 @click="$emit('navigate')"
 >
 <UIcon :name="child.icon" class="size-4 shrink-0" aria-hidden="true" />
 <span>{{ child.label }}</span>
 </NuxtLink>
 </div>
 </div>
 <div v-if="canManageUsers" class="py-3">
 <div class="mb-2 px-3 text-[11px] font-bold uppercase tracking-[.16em] text-[#9aa49e]">Administración</div>
 <NuxtLink
 v-for="item in adminItems" :key="item.to" :to="item.to"
 class="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition"
 :class="route.path === item.to ? 'bg-[#eaf2ed] text-[#1f4937]' : 'text-[#69736d] hover:bg-[#f5f6f4]'"
 :aria-current="route.path === item.to ? 'page' : undefined"
 @click="$emit('navigate')"
 >
 <UIcon :name="item.icon" class="size-5 shrink-0" aria-hidden="true" />
 <span>{{ item.label }}</span>
 </NuxtLink>
 <div class="mt-1">
 <button
 type="button"
 class="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition"
 :class="route.path.startsWith('/dashboard/reports') ? 'bg-[#eaf2ed] text-[#1f4937]' : 'text-[#69736d] hover:bg-[#f5f6f4]'"
 :aria-expanded="reportsOpen"
 aria-controls="reports-submenu"
 @click="reportsOpen = !reportsOpen"
 >
 <UIcon name="i-lucide-file-chart-column" class="size-5 shrink-0" aria-hidden="true" />
 <span>Reportes</span>
 <UIcon name="i-lucide-chevron-down" class="ml-auto size-4 transition-transform" :class="reportsOpen ? 'rotate-180' : ''" aria-hidden="true" />
 </button>
 <div v-if="reportsOpen" id="reports-submenu" class="mt-1 space-y-1 pl-4">
 <NuxtLink
 v-for="child in reportItems" :key="child.to" :to="child.to"
 class="flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition"
 :class="route.path === child.to ? 'bg-[#f0f6f2] text-[#1f4937]' : 'text-[#69736d] hover:bg-[#f5f6f4]'"
 :aria-current="route.path === child.to ? 'page' : undefined"
 @click="$emit('navigate')"
 >
 <UIcon :name="child.icon" class="size-4 shrink-0" aria-hidden="true" />
 <span>{{ child.label }}</span>
 </NuxtLink>
 </div>
 </div>
 </div>
 </nav>
 <div class="border-t border-[#edf0ed] pt-4">
 <div class="flex items-center gap-3 px-2">
 <UAvatar :text="initials" size="md" class="bg-[#1f4937] text-white" />
 <div class="min-w-0 flex-1">
 <p class="truncate text-sm font-semibold text-[#26322c]">{{ user?.fullName }}</p>
 <p class="text-xs text-[#7a847e]">{{ roleLabel }}</p>
 </div>
 <UTooltip text="Cerrar sesión">
 <UButton icon="i-lucide-log-out" color="neutral" variant="ghost" aria-label="Cerrar sesión" @click="logout" />
 </UTooltip>
 </div>
 </div>
 </div>
</template>
