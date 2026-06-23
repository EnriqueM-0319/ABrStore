<script setup lang="ts">
import type { Product } from '~/types/product'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Productos' })

const form = reactive({ sku: '', name: '', description: '', costPrice: '', profitMargin: '30', price: '', unit: 'PIECE' as Product['unit'], stock: '' })
const autoPrice = ref(true)
const saving = ref(false)
const formError = ref('')
const success = ref('')
const lastCreatedProduct = ref<Product | null>(null)
const toast = useToast()
const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const unitOptions = [{ label: 'Por pieza', value: 'PIECE' }, { label: 'Por kilogramo', value: 'KILOGRAM' }]

watch([() => form.costPrice, () => form.profitMargin, autoPrice], () => {
  if (!autoPrice.value) return
  const cost = Number(form.costPrice)
  const margin = Number(form.profitMargin)
  form.price = calculatePublicPriceFromMargin(cost, margin)
})

function setManualPrice(value: string | number) {
  form.price = String(value)
  autoPrice.value = false
  const cost = Number(form.costPrice)
  const publicPrice = Number(form.price)
  const margin = calculateMarginFromPublicPrice(cost, publicPrice)
  if (margin) form.profitMargin = margin
}

async function saveProduct() {
  formError.value = ''
  success.value = ''
  saving.value = true
  try {
    const product = await $fetch<Product>('/api/products', { method: 'POST', body: form })
    lastCreatedProduct.value = product
    Object.assign(form, { sku: '', name: '', description: '', costPrice: '', profitMargin: '30', price: '', unit: 'PIECE', stock: '' })
    autoPrice.value = true
    success.value = 'Producto registrado. Ya está disponible en el punto de venta.'
    toast.add({ title: 'Producto registrado', description: `${product.name} ya está disponible para vender.`, color: 'success', icon: 'i-lucide-circle-check' })
  } catch (error: unknown) {
    formError.value = getErrorMessage(error, 'No pudimos registrar el producto.')
    toast.add({ title: 'No se pudo registrar', description: formError.value, color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <DashboardShell eyebrow="Catálogo" title="Productos">
    <div class="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <div class="grid items-start gap-6 xl:grid-cols-[minmax(20rem,.75fr)_minmax(0,1fr)]">
        <UCard :ui="{ root: 'rounded-2xl ring-[#dfe5e0]', header: 'p-5 sm:px-6', body: 'p-5 sm:px-6' }">
          <template #header><h2 class="text-lg font-bold">Añadir producto</h2><p class="mt-1 text-sm text-[#77827b]">Completa los datos para agregarlo al inventario.</p></template>
          <form class="space-y-4" @submit.prevent="saveProduct">
            <FormField v-model="form.sku" name="sku" label="Código SKU" placeholder="Ej. CAM-001" autocomplete="off" />
            <FormField v-model="form.name" name="name" label="Nombre del producto" placeholder="Ej. Camiseta básica" autocomplete="off" />
            <UFormField label="Descripción" name="description">
              <UTextarea v-model="form.description" placeholder="Detalles breves del producto" :rows="3" class="w-full" :maxlength="300" />
            </UFormField>
            <div class="grid grid-cols-2 gap-3">
              <FormField v-model="form.costPrice" name="costPrice" label="Costo unitario" type="number" placeholder="0.00" autocomplete="off" />
              <FormField v-model="form.profitMargin" name="profitMargin" label="Ganancia (%)" type="number" placeholder="30" autocomplete="off" />
            </div>
            <div class="rounded-xl border border-[#e2e7e3] bg-[#f8faf8] p-4">
              <div class="mb-3 flex items-center justify-between gap-3"><div><p class="text-sm font-semibold">Calcular precio automáticamente</p><p class="text-xs text-[#78827c]">Costo ÷ porcentaje restante</p></div><USwitch v-model="autoPrice" aria-label="Calcular precio al público automáticamente" /></div>
              <UFormField label="Precio al público" name="price" required><UInput :model-value="form.price" type="number" inputmode="decimal" placeholder="0.00" size="xl" class="w-full" @update:model-value="setManualPrice" /></UFormField>
            </div>
            <div class="grid grid-cols-2 gap-3"><UFormField label="Unidad de venta" name="unit" required><USelect v-model="form.unit" :items="unitOptions" value-key="value" label-key="label" size="xl" class="w-full" /></UFormField><FormField v-model="form.stock" name="stock" label="Existencias iniciales" type="number" placeholder="0" autocomplete="off" min="0" :step="form.unit === 'PIECE' ? '1' : '0.001'" /></div>
            <ActionFeedback v-if="formError" :message="formError" type="error" @dismiss="formError = ''" />
            <ActionFeedback v-if="success" :message="success" @dismiss="success = ''" />
            <UButton type="submit" block size="xl" icon="i-lucide-package-plus" label="Guardar producto" :loading="saving" class="rounded-xl" />
          </form>
        </UCard>

        <section aria-labelledby="last-product-title">
          <div class="mb-4 flex items-end justify-between"><div><h2 id="last-product-title" class="text-xl font-bold">Último producto creado</h2><p class="mt-1 text-sm text-[#77827b]">Aquí verás solo la confirmación del producto más reciente.</p></div><UButton to="/dashboard/ventas" label="Ir a vender" icon="i-lucide-shopping-cart" variant="soft" /></div>
          <div v-if="!lastCreatedProduct" class="rounded-2xl border border-dashed border-[#d8ddd9] bg-white p-10 text-center">
            <UIcon name="i-lucide-package-plus" class="mx-auto size-9 text-[#929d96]" />
            <h3 class="mt-4 font-semibold">Aún no has creado producto en esta sesión</h3>
            <p class="mx-auto mt-1 max-w-sm text-sm text-[#7d8781]">Al guardar uno, aparecerá aquí sin cargar todo el catálogo. Para modificar o eliminar productos usa Inventario.</p>
            <UButton to="/dashboard/inventario" label="Abrir inventario" icon="i-lucide-warehouse" variant="soft" class="mt-5" />
          </div>
          <UCard v-else :ui="{ root: 'rounded-2xl ring-[#dfe5e0]', body: 'p-5 sm:p-6' }">
            <div class="flex flex-col gap-5 sm:flex-row sm:items-start">
              <span class="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#edf3ef] text-[#2b6049]"><UIcon name="i-lucide-package-check" class="size-7" /></span>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2"><h3 class="truncate text-lg font-bold">{{ lastCreatedProduct.name }}</h3><UBadge :label="lastCreatedProduct.sku" color="neutral" variant="soft" /></div>
                <p class="mt-2 text-sm text-[#7d8781]">{{ lastCreatedProduct.description || 'Sin descripción' }}</p>
                <div class="mt-5 grid gap-3 sm:grid-cols-3">
                  <div class="rounded-xl bg-[#f7faf8] p-3"><p class="text-xs text-[#77827b]">Precio público</p><p class="mt-1 font-bold">{{ currency.format(lastCreatedProduct.price) }}</p></div>
                  <div class="rounded-xl bg-[#f7faf8] p-3"><p class="text-xs text-[#77827b]">Existencias</p><p class="mt-1 font-bold">{{ lastCreatedProduct.stock }} {{ lastCreatedProduct.unit === 'KILOGRAM' ? 'kg' : 'pzas' }}</p></div>
                  <div class="rounded-xl bg-[#f7faf8] p-3"><p class="text-xs text-[#77827b]">Venta</p><p class="mt-1 font-bold">{{ lastCreatedProduct.unit === 'KILOGRAM' ? 'Por kg' : 'Por pieza' }}</p></div>
                </div>
              </div>
            </div>
          </UCard>
        </section>
      </div>
    </div>
  </DashboardShell>
</template>
