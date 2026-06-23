<script setup lang="ts">
import type { Product } from '~/types/product'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Inventario' })

const selected = ref<Product | null>(null)
const saving = ref(false)
const actionError = ref('')
const notice = ref('')
const editForm = reactive({ sku: '', name: '', description: '', costPrice: '', profitMargin: '', price: '', unit: 'PIECE' as Product['unit'], stock: '', active: true })
const autoPrice = ref(false)
const {
  search,
  debouncedSearch,
  products,
  page,
  limit,
  total,
  pageCount,
  pageStart,
  pageEnd,
  inventoryError,
  isInitialLoading,
  isRefreshing,
  activeCount,
  units,
  lowStock,
  loadInventory,
  goToPage,
  updateProductInPage,
  removeProductFromPage
} = useInventory()
const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const unitOptions = [{ label: 'Por pieza', value: 'PIECE' }, { label: 'Por kilogramo', value: 'KILOGRAM' }]
const limitOptions = [{ label: '10 por página', value: 10 }, { label: '20 por página', value: 20 }, { label: '30 por página', value: 30 }, { label: '50 por página', value: 50 }]
const confirmPermanentDelete = ref(false)
const toast = useToast()

const filteredProducts = computed(() => products.value)

function selectProduct(product: Product) {
  selected.value = product
  actionError.value = ''
  notice.value = ''
  Object.assign(editForm, {
    sku: product.sku,
    name: product.name,
    description: product.description || '',
    costPrice: String(product.costPrice || 0),
    profitMargin: String(product.profitMargin || 0),
    price: String(product.price),
    unit: product.unit,
    stock: String(product.stock),
    active: Boolean(product.active)
  })
  autoPrice.value = false
  confirmPermanentDelete.value = false
}

watch([() => editForm.costPrice, () => editForm.profitMargin, autoPrice], () => {
  if (!autoPrice.value) return
  const cost = Number(editForm.costPrice)
  const margin = Number(editForm.profitMargin)
  editForm.price = calculatePublicPriceFromMargin(cost, margin)
})

function setManualEditPrice(value: string | number) {
  editForm.price = String(value)
  autoPrice.value = false
  const cost = Number(editForm.costPrice)
  const publicPrice = Number(editForm.price)
  const margin = calculateMarginFromPublicPrice(cost, publicPrice)
  if (margin) editForm.profitMargin = margin
}

async function saveChanges() {
  if (!selected.value) return
  saving.value = true
  actionError.value = ''
  notice.value = ''
  try {
    const updatedProduct = await $fetch<Product>(`/api/products/${selected.value.id}`, { method: 'PATCH', body: editForm })
    updateProductInPage(updatedProduct)
    selectProduct(updatedProduct)
    notice.value = 'Cambios guardados correctamente.'
    toast.add({ title: 'Producto actualizado', description: notice.value, color: 'success', icon: 'i-lucide-circle-check' })
  } catch (error: unknown) {
    actionError.value = getErrorMessage(error, 'No pudimos actualizar el producto.')
    toast.add({ title: 'No se pudo actualizar', description: actionError.value, color: 'error', icon: 'i-lucide-circle-alert' })
  } finally { saving.value = false }
}

async function deactivateProduct() {
  if (!selected.value) return
  saving.value = true
  actionError.value = ''
  try {
    await $fetch(`/api/products/${selected.value.id}`, { method: 'DELETE' })
    const updatedProduct = { ...selected.value, active: false }
    updateProductInPage(updatedProduct)
    selectProduct(updatedProduct)
    notice.value = 'Producto desactivado. Ya no aparecerá en ventas.'
    toast.add({ title: 'Producto desactivado', description: notice.value, color: 'success', icon: 'i-lucide-archive' })
  } catch (error: unknown) {
    actionError.value = getErrorMessage(error, 'No pudimos desactivar el producto.')
    toast.add({ title: 'No se pudo desactivar', description: actionError.value, color: 'error', icon: 'i-lucide-circle-alert' })
  } finally { saving.value = false }
}

async function restoreProduct() {
  editForm.active = true
  await saveChanges()
  notice.value = 'Producto restaurado y disponible para ventas.'
}

async function permanentlyDeleteProduct() {
  if (!selected.value) return
  saving.value = true
  actionError.value = ''
  try {
    const deletedProductName = selected.value.name
    await $fetch(`/api/products/${selected.value.id}`, { method: 'DELETE', query: { permanent: true } })
    removeProductFromPage(selected.value.id)
    selected.value = null
    confirmPermanentDelete.value = false
    notice.value = 'Producto eliminado permanentemente.'
    toast.add({ title: 'Producto eliminado', description: `${deletedProductName} fue borrado de la base de datos.`, color: 'success', icon: 'i-lucide-trash-2' })
  } catch (error: unknown) {
    actionError.value = getErrorMessage(error, 'No pudimos eliminar permanentemente el producto.')
    toast.add({ title: 'No se pudo eliminar', description: actionError.value, color: 'error', icon: 'i-lucide-circle-alert' })
  } finally { saving.value = false }
}
</script>

<template>
  <DashboardShell eyebrow="Control de existencias" title="Inventario">
    <div class="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <section class="grid gap-3 sm:grid-cols-3" aria-label="Resumen del inventario">
        <UCard :ui="{ root: 'rounded-2xl', body: 'p-4 sm:p-5' }"><p class="text-sm text-[#78827c]">Activos en página</p><p class="mt-1 text-2xl font-bold">{{ activeCount }}</p></UCard>
        <UCard :ui="{ root: 'rounded-2xl', body: 'p-4 sm:p-5' }"><p class="text-sm text-[#78827c]">Existencias en página</p><p class="mt-1 text-2xl font-bold">{{ units }}</p></UCard>
        <UCard :ui="{ root: 'rounded-2xl', body: 'p-4 sm:p-5' }"><p class="text-sm text-[#78827c]">Stock bajo en página</p><p class="mt-1 text-2xl font-bold" :class="lowStock ? 'text-amber-600' : ''">{{ lowStock }}</p></UCard>
      </section>
      <ActionFeedback v-if="notice && !selected" class="mt-4" :message="notice" @dismiss="notice = ''" />

      <div class="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(21rem,.75fr)]">
        <section aria-labelledby="inventory-list-title" :aria-busy="isInitialLoading || isRefreshing">
          <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 id="inventory-list-title" class="text-xl font-bold">Productos del inventario</h2>
              <p class="mt-1 text-sm text-[#78827c]">Selecciona uno para modificarlo. Por defecto se muestran 10 por página.</p>
            </div>
            <UInput v-model="search" icon="i-lucide-search" placeholder="Buscar por nombre o SKU" aria-label="Buscar en inventario" class="w-full lg:w-80" />
          </div>
          <UAlert v-if="inventoryError" class="mb-3" color="error" variant="soft" icon="i-lucide-circle-alert" title="No pudimos cargar el inventario" :description="inventoryError">
            <template #actions><UButton label="Reintentar" color="error" variant="soft" size="sm" @click="loadInventory()" /></template>
          </UAlert>
          <div v-if="isRefreshing" class="mb-3 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status" aria-live="polite">
            <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" aria-hidden="true" />
            <span>{{ debouncedSearch ? 'Buscando productos…' : 'Actualizando inventario…' }}</span>
          </div>
          <USkeleton v-if="isInitialLoading" class="h-72 rounded-2xl" />
          <div v-else-if="!filteredProducts.length" class="rounded-2xl border border-dashed border-[#d8ddd9] bg-white p-12 text-center"><UIcon name="i-lucide-package-search" class="mx-auto size-8 text-[#929d96]" /><p class="mt-3 font-semibold">No hay productos que mostrar</p></div>
          <div v-else class="overflow-hidden rounded-2xl border border-[#e1e6e2] bg-white">
            <ul class="divide-y divide-[#edf0ed]" aria-label="Productos del inventario">
              <li v-for="product in filteredProducts" :key="product.id">
                <button class="flex w-full items-center gap-3 p-4 text-left transition hover:bg-[#f7f9f7] focus-visible:bg-[#f2f6f3] sm:px-5" :class="selected?.id === product.id ? 'bg-[#edf4ef]' : ''" @click="selectProduct(product)">
                  <span class="grid size-10 shrink-0 place-items-center rounded-xl" :class="product.active ? 'bg-[#eaf2ed] text-[#286047]' : 'bg-stone-100 text-stone-400'"><UIcon name="i-lucide-package" class="size-5" /></span>
                  <span class="min-w-0 flex-1"><span class="flex items-center gap-2"><span class="truncate text-sm font-semibold">{{ product.name }}</span><UBadge :label="product.active ? 'Activo' : 'Inactivo'" :color="product.active ? 'success' : 'neutral'" variant="soft" size="sm" /></span><span class="mt-1 block truncate text-xs text-[#7d8781]">{{ product.sku }} · {{ product.description || 'Sin descripción' }}</span></span>
                  <span class="hidden text-right sm:block"><span class="block text-sm font-semibold">{{ currency.format(product.price) }} / {{ product.unit === 'KILOGRAM' ? 'kg' : 'pza' }}</span><span class="mt-1 block text-xs" :class="product.stock <= 5 && product.active ? 'text-amber-600' : 'text-[#7d8781]'">{{ product.stock }} {{ product.unit === 'KILOGRAM' ? 'kg' : 'pzas' }}</span></span>
                  <UIcon name="i-lucide-chevron-right" class="size-4 shrink-0 text-[#9aa39d]" />
                </button>
              </li>
            </ul>
            <div class="flex flex-col gap-4 border-t border-[#edf0ed] bg-[#fbfcfb] p-4 lg:flex-row lg:items-end lg:justify-between">
              <p class="text-sm text-[#7d8781]" role="status" aria-live="polite">
                Mostrando {{ pageStart }}-{{ pageEnd }} de {{ total }} productos
              </p>
              <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
                <UFormField label="Mostrar" name="inventory-limit" size="xs">
                  <USelect v-model="limit" :items="limitOptions" value-key="value" label-key="label" aria-label="Productos por página" class="w-full sm:w-44" />
                </UFormField>
                <nav class="flex items-center justify-center gap-2" aria-label="Paginación del inventario">
                  <UButton type="button" icon="i-lucide-chevron-left" label="Anterior" color="neutral" variant="soft" :disabled="page <= 1 || isRefreshing" @click="goToPage(page - 1)" />
                  <span class="min-w-24 text-center text-sm font-semibold text-[#536057]">Página {{ page }} de {{ pageCount }}</span>
                  <UButton type="button" trailing-icon="i-lucide-chevron-right" label="Siguiente" color="neutral" variant="soft" :disabled="page >= pageCount || isRefreshing" @click="goToPage(page + 1)" />
                </nav>
              </div>
            </div>
          </div>
        </section>

        <aside class="xl:sticky xl:top-28" aria-labelledby="edit-product-title">
          <UCard :ui="{ root: 'rounded-2xl', header: 'p-5 sm:px-6', body: 'p-5 sm:px-6' }">
            <template #header><h2 id="edit-product-title" class="font-bold">Editar producto</h2><p class="mt-1 text-sm text-[#78827c]">{{ selected ? selected.name : 'Selecciona un producto del listado.' }}</p></template>
            <div v-if="!selected" class="py-12 text-center"><UIcon name="i-lucide-mouse-pointer-click" class="mx-auto size-8 text-[#9ca69f]" /><p class="mt-3 text-sm text-[#7d8781]">Los datos aparecerán aquí.</p></div>
            <form v-else class="space-y-4" @submit.prevent="saveChanges">
              <FormField v-model="editForm.sku" name="edit-sku" label="Código SKU" autocomplete="off" />
              <FormField v-model="editForm.name" name="edit-name" label="Nombre" autocomplete="off" />
              <UFormField label="Descripción"><UTextarea v-model="editForm.description" :rows="3" class="w-full" /></UFormField>
              <div class="grid grid-cols-2 gap-3"><FormField v-model="editForm.costPrice" name="edit-cost" label="Costo unitario" type="number" autocomplete="off" /><FormField v-model="editForm.profitMargin" name="edit-margin" label="Ganancia (%)" type="number" autocomplete="off" /></div>
              <div class="rounded-xl border border-[#e2e7e3] bg-[#f8faf8] p-4"><div class="mb-3 flex items-center justify-between gap-3"><p class="text-sm font-semibold">Cálculo automático</p><USwitch v-model="autoPrice" aria-label="Calcular precio al público automáticamente" /></div><UFormField label="Precio al público" required><UInput :model-value="editForm.price" type="number" inputmode="decimal" size="xl" class="w-full" @update:model-value="setManualEditPrice" /></UFormField></div>
              <div class="grid grid-cols-2 gap-3"><UFormField label="Unidad de venta" required><USelect v-model="editForm.unit" :items="unitOptions" value-key="value" label-key="label" size="xl" class="w-full" /></UFormField><FormField v-model="editForm.stock" name="edit-stock" label="Existencias" type="number" autocomplete="off" min="0" :step="editForm.unit === 'PIECE' ? '1' : '0.001'" /></div>
              <ActionFeedback v-if="actionError" :message="actionError" type="error" @dismiss="actionError = ''" />
              <ActionFeedback v-if="notice" :message="notice" @dismiss="notice = ''" />
              <div class="flex flex-col gap-2 sm:flex-row">
                <UButton v-if="selected.active" type="submit" label="Guardar cambios" icon="i-lucide-save" :loading="saving" class="flex-1 justify-center" />
                <UButton v-if="selected.active" type="button" label="Desactivar" icon="i-lucide-archive" color="error" variant="soft" :loading="saving" @click="deactivateProduct" />
                <UButton v-else type="button" block label="Restaurar producto" icon="i-lucide-archive-restore" color="primary" :loading="saving" @click="restoreProduct" />
              </div>
              <div class="border-t border-[#ecefec] pt-4">
                <UButton v-if="!confirmPermanentDelete" type="button" block label="Eliminar permanentemente" icon="i-lucide-trash-2" color="error" variant="ghost" @click="confirmPermanentDelete = true" />
                <div v-else class="rounded-xl bg-red-50 p-4"><p class="text-sm font-semibold text-red-800">Esta acción no se puede deshacer</p><p class="mt-1 text-xs text-red-700">El producto será borrado completamente de la base de datos.</p><div class="mt-3 flex gap-2"><UButton type="button" label="Cancelar" color="neutral" variant="soft" size="sm" @click="confirmPermanentDelete = false" /><UButton type="button" label="Sí, eliminar" color="error" size="sm" :loading="saving" @click="permanentlyDeleteProduct" /></div></div>
              </div>
            </form>
          </UCard>
        </aside>
      </div>
    </div>
  </DashboardShell>
</template>
