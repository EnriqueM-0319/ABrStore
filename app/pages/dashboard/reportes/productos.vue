<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Reporte de producto' })

const { user } = useAuth()

onMounted(() => {
  if (user.value && !['SUPERADMIN', 'ADMIN'].includes(user.value.role)) {
    void navigateTo('/dashboard/ventas')
  }
})
</script>

<template>
  <DashboardShell eyebrow="Administración" title="Reporte de producto">
    <div class="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <div class="grid gap-5 lg:grid-cols-[1fr_.8fr]">
        <UCard :ui="{ root: 'rounded-2xl ring-[#dde3de]', body: 'p-6' }">
          <div class="flex items-start gap-4">
            <span class="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#eaf2ed] text-[#286047]">
              <UIcon name="i-lucide-chart-bar-big" class="size-6" aria-hidden="true" />
            </span>
            <div>
              <h2 class="text-xl font-bold">Productos e inventario</h2>
              <p class="mt-2 text-sm leading-6 text-[#68746d]">
                Este reporte concentrará productos con bajo stock, existencias actuales, precios y movimientos relevantes del inventario.
              </p>
              <div class="mt-5 flex flex-wrap gap-2">
                <UButton to="/dashboard/productos" label="Ver productos" icon="i-lucide-package" />
                <UButton to="/dashboard/salidas/historial" label="Historial de salidas" icon="i-lucide-list" color="neutral" variant="soft" />
              </div>
            </div>
          </div>
        </UCard>

        <UCard :ui="{ root: 'rounded-2xl ring-[#dde3de]', body: 'p-6' }">
          <h3 class="font-bold">Próximas métricas</h3>
          <ul class="mt-4 space-y-3 text-sm text-[#68746d]">
            <li class="flex gap-2"><UIcon name="i-lucide-check" class="mt-0.5 size-4 text-emerald-700" /> Productos con existencias bajas.</li>
            <li class="flex gap-2"><UIcon name="i-lucide-check" class="mt-0.5 size-4 text-emerald-700" /> Productos más vendidos.</li>
            <li class="flex gap-2"><UIcon name="i-lucide-check" class="mt-0.5 size-4 text-emerald-700" /> Salidas por caducidad o daño.</li>
          </ul>
        </UCard>
      </div>
    </div>
  </DashboardShell>
</template>
