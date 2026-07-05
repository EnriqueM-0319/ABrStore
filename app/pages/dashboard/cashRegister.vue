<script setup lang="ts">
import CloseSection from '~/components/cashRegister/CloseSection.vue'
import MovementsSection from '~/components/cashRegister/MovementsSection.vue'
import StartSection from '~/components/cashRegister/StartSection.vue'

type CashRegisterSection = 'start' | 'movements' | 'close'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Caja' })

const route = useRoute()

const sectionOptions: Array<{
 label: string
 value: CashRegisterSection
 icon: string
 description: string
}> = [
 { label: 'Inicio del día', value: 'start', icon: 'i-lucide-sunrise', description: 'Abre caja para comenzar ventas.' },
 { label: 'Movimientos', value: 'movements', icon: 'i-lucide-wallet-cards', description: 'Registra entradas, gastos o pagos.' },
 { label: 'Cierre de caja', value: 'close', icon: 'i-lucide-calculator', description: 'Calcula y cierra el turno.' }
]

const currentSection = computed<CashRegisterSection>(() => {
 const requestedSection = route.query.section
 return sectionOptions.some(option => option.value === requestedSection)
 ? requestedSection as CashRegisterSection
 : 'start'
})

const currentTitle = computed(() => sectionOptions.find(option => option.value === currentSection.value)?.label ?? 'Caja')
const currentDescription = computed(() => sectionOptions.find(option => option.value === currentSection.value)?.description ?? 'Administra la caja.')

function sectionTo(section: CashRegisterSection) {
 return { path: '/dashboard/cashRegister', query: { section } }
}
</script>

<template>
 <DashboardShell eyebrow="Caja" :title="currentTitle">
 <div class="border-b border-[#dde3de] bg-white/70 px-4 py-4 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80 sm:px-6 lg:px-8">
 <div class="mx-auto flex max-w-[1500px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
 <p class="text-sm text-[#64748b] dark:text-slate-300">{{ currentDescription }}</p>
 <nav class="flex flex-wrap gap-2" aria-label="Secciones de caja">
 <UButton
 v-for="option in sectionOptions"
 :key="option.value"
 :to="sectionTo(option.value)"
 :label="option.label"
 :icon="option.icon"
 :color="currentSection === option.value ? 'primary' : 'neutral'"
 :variant="currentSection === option.value ? 'solid' : 'soft'"
 class="rounded-xl"
 />
 </nav>
 </div>
 </div>

 <StartSection v-if="currentSection === 'start'" />
 <MovementsSection v-else-if="currentSection === 'movements'" />
 <CloseSection v-else />
 </DashboardShell>
</template>
