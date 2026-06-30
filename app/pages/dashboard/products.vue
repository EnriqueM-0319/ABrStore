<script setup lang="ts">
import type { Product } from '~/types'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Productos' })

const selectedProduct = ref<Product | null>(null)
const productModalOpen = ref(false)
const productToDelete = ref<Product | null>(null)
const deleteModalOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')
const selectedProductIds = ref<string[]>([])
const exporting = ref(false)
const toast = useToast()
const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const limitOptions = [{ label: '10 por página', value: 10 }, { label: '20 por página', value: 20 }, { label: '30 por página', value: 30 }, { label: '50 por página', value: 50 }]
const {
 search,
 debouncedSearch,
 lowStockOnly,
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
 loadInventory,
 goToPage,
 updateProductInPage,
 removeProductFromPage
} = useInventory()

const selectedProductsCount = computed(() => selectedProductIds.value.length)
const currentPageProductIds = computed(() => products.value.map(product => product.id))
const allCurrentPageSelected = computed(() => currentPageProductIds.value.length > 0 && currentPageProductIds.value.every(id => selectedProductIds.value.includes(id)))

function openCreateModal() {
 selectedProduct.value = null
 productModalOpen.value = true
}

function openEditModal(product: Product) {
 selectedProduct.value = product
 productModalOpen.value = true
}

function handleProductSaved(product: Product) {
 if (selectedProduct.value) updateProductInPage(product)
 else void loadInventory()
}

function askDeleteProduct(product: Product) {
 productToDelete.value = product
 deleteError.value = ''
 deleteModalOpen.value = true
}

function toggleProductSelection(productId: string, checked: boolean) {
 if (checked) {
 if (!selectedProductIds.value.includes(productId)) selectedProductIds.value = [...selectedProductIds.value, productId]
 return
 }

 selectedProductIds.value = selectedProductIds.value.filter(id => id !== productId)
}

function toggleCurrentPageSelection(checked: boolean) {
 if (checked) {
 selectedProductIds.value = [...new Set([...selectedProductIds.value, ...currentPageProductIds.value])]
 return
 }

 selectedProductIds.value = selectedProductIds.value.filter(id => !currentPageProductIds.value.includes(id))
}

async function exportProducts(scope: 'all' | 'low-stock' | 'selected') {
 if (scope === 'selected' && !selectedProductIds.value.length) {
 toast.add({ title: 'Selecciona productos', description: 'Marca al menos un producto para exportar.', color: 'warning', icon: 'i-lucide-circle-alert' })
 return
 }

 exporting.value = true

 try {
 const params = new URLSearchParams({ scope })
 if (scope === 'selected') params.set('ids', selectedProductIds.value.join(','))
 const response = await fetch(`/api/products/export?${params.toString()}`, { credentials: 'same-origin' })
 if (!response.ok) throw new Error(await response.text())

 const blob = await response.blob()
 const url = URL.createObjectURL(blob)
 const anchor = document.createElement('a')
 anchor.href = url
 anchor.download = `productos-${scope}-${new Date().toISOString().slice(0, 10)}.csv`
 document.body.append(anchor)
 anchor.click()
 anchor.remove()
 URL.revokeObjectURL(url)

 toast.add({ title: 'Exportación lista', description: 'Se descargó el archivo CSV de productos.', color: 'success', icon: 'i-lucide-download' })
 } catch (error: unknown) {
 toast.add({ title: 'No se pudo exportar', description: getErrorMessage(error, 'Intenta nuevamente.'), color: 'error', icon: 'i-lucide-circle-alert' })
 } finally {
 exporting.value = false
 }
}

async function permanentlyDeleteProduct() {
 if (!productToDelete.value) return

 deleting.value = true
 deleteError.value = ''

 try {
 const deletedProduct = productToDelete.value
 await $fetch(`/api/products/${deletedProduct.id}`, { method: 'DELETE', query: { permanent: true } })
 removeProductFromPage(deletedProduct.id)
 deleteModalOpen.value = false
 productToDelete.value = null
 toast.add({ title: 'Producto eliminado', description: `${deletedProduct.name} fue borrado de la base de datos.`, color: 'success', icon: 'i-lucide-trash-2' })
 } catch (error: unknown) {
 deleteError.value = getErrorMessage(error, 'No pudimos eliminar permanentemente el producto.')
 toast.add({ title: 'No se pudo eliminar', description: deleteError.value, color: 'error', icon: 'i-lucide-circle-alert' })
 } finally {
 deleting.value = false
 }
}
</script>

<template>
 <DashboardShell eyebrow="Inventario" title="Productos">
 <div class="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
 <section aria-labelledby="products-title" :aria-busy="isInitialLoading || isRefreshing">
 <div class="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
 <div>
 <h2 id="products-title" class="text-xl font-bold">Productos registrados</h2>
 <p class="mt-1 text-sm text-[#78827c]">Busca, agrega, edita o elimina productos desde un solo lugar.</p>
 </div>
 <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
 <UInput v-model="search" icon="i-lucide-search" placeholder="Buscar por nombre o SKU" aria-label="Buscar productos" class="w-full sm:w-80" />
 <UButton label="Agregar producto" icon="i-lucide-package-plus" @click="openCreateModal" />
 </div>
 </div>

 <div class="mb-4 flex flex-col gap-3 rounded-2xl border border-[#e1e6e2] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <p class="text-sm font-semibold text-[#26322c]">Filtros de inventario</p>
 <p class="mt-1 text-xs text-[#7d8781]">Identifica rápido qué productos necesitan reposición.</p>
 </div>
 <div class="flex flex-wrap items-center gap-3">
 <USwitch
 v-model="lowStockOnly"
 label="Mostrar solo existencias bajas"
 color="warning"
 aria-label="Filtrar productos con existencias bajas"
 />
 <UBadge
 :label="lowStockOnly ? '≤ 5 activos' : 'Filtro apagado'"
 :color="lowStockOnly ? 'warning' : 'neutral'"
 variant="soft"
 />
 </div>
 </div>

 <div class="mb-4 flex flex-col gap-3 rounded-2xl border border-[#e1e6e2] bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
 <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
 <label class="inline-flex items-center gap-2 text-sm font-medium text-[#26322c]">
 <input
 type="checkbox"
 class="size-4 rounded border-[#cdd6d0] text-emerald-700 focus:ring-emerald-600"
 :checked="allCurrentPageSelected"
 :disabled="!products.length"
 aria-label="Seleccionar productos visibles"
 @change="toggleCurrentPageSelection(($event.target as HTMLInputElement).checked)"
 >
 Seleccionar visibles
 </label>
 <span class="text-sm text-[#7d8781]">{{ selectedProductsCount }} seleccionados</span>
 </div>
 <div class="grid gap-2 sm:grid-cols-3">
 <UButton label="Exportar seleccionados" icon="i-lucide-list-checks" color="neutral" variant="soft" :loading="exporting" :disabled="!selectedProductsCount" @click="exportProducts('selected')" />
 <UButton label="Exportar bajo stock" icon="i-lucide-triangle-alert" color="warning" variant="soft" :loading="exporting" @click="exportProducts('low-stock')" />
 <UButton label="Exportar todos" icon="i-lucide-download" color="primary" variant="soft" :loading="exporting" @click="exportProducts('all')" />
 </div>
 </div>

 <UAlert v-if="inventoryError" class="mb-3" color="error" variant="soft" icon="i-lucide-circle-alert" title="No pudimos cargar productos" :description="inventoryError">
 <template #actions>
 <UButton label="Reintentar" color="error" variant="soft" size="sm" @click="loadInventory()" />
 </template>
 </UAlert>

 <div v-if="isRefreshing" class="mb-3 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status" aria-live="polite">
 <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" aria-hidden="true" />
 <span>{{ debouncedSearch ? 'Buscando productos…' : 'Actualizando productos…' }}</span>
 </div>

 <USkeleton v-if="isInitialLoading" class="h-96 rounded-2xl" />
 <div v-else-if="!products.length" class="rounded-2xl border border-dashed border-[#d8ddd9] bg-white p-12 text-center">
 <UIcon name="i-lucide-package-search" class="mx-auto size-8 text-[#929d96]" />
 <h3 class="mt-4 font-semibold">No hay productos que mostrar</h3>
 <p class="mx-auto mt-1 max-w-sm text-sm text-[#7d8781]">Agrega un producto o intenta con otra búsqueda.</p>
 <UButton label="Agregar producto" icon="i-lucide-package-plus" class="mt-5" @click="openCreateModal" />
 </div>

 <div v-else class="overflow-hidden rounded-2xl border border-[#e1e6e2] bg-white">
 <ul class="divide-y divide-[#edf0ed]" aria-label="Productos registrados">
 <li v-for="product in products" :key="product.id" class="p-4 sm:px-5">
 <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
 <div class="flex min-w-0 items-start gap-3">
 <input
 type="checkbox"
 class="mt-3 size-4 shrink-0 rounded border-[#cdd6d0] text-emerald-700 focus:ring-emerald-600"
 :checked="selectedProductIds.includes(product.id)"
 :aria-label="`Seleccionar ${product.name}`"
 @change="toggleProductSelection(product.id, ($event.target as HTMLInputElement).checked)"
 >
 <span class="grid size-10 shrink-0 place-items-center rounded-xl" :class="product.active ? 'bg-[#eaf2ed] text-[#286047]' : 'bg-stone-100 text-stone-400'">
 <UIcon name="i-lucide-package" class="size-5" aria-hidden="true" />
 </span>
 <div class="min-w-0">
 <div class="flex flex-wrap items-center gap-2">
 <h3 class="truncate text-sm font-semibold">{{ product.name }}</h3>
 <UBadge :label="product.active ? 'Activo' : 'Inactivo'" :color="product.active ? 'success' : 'neutral'" variant="soft" size="sm" />
 <UBadge v-if="product.active && product.stock <= 5" label="Bajo stock" color="warning" variant="soft" size="sm" />
 <UBadge :label="product.sku" color="neutral" variant="soft" size="sm" />
 </div>
 <p class="mt-1 line-clamp-1 text-xs text-[#7d8781]">{{ product.description || 'Sin descripción' }}</p>
 </div>
 </div>

 <div class="grid gap-3 sm:grid-cols-3 lg:min-w-[28rem] lg:items-center">
 <div>
 <p class="text-[11px] uppercase tracking-wide text-[#8b958f]">Precio</p>
 <p class="text-sm font-bold text-[#1f4937]">{{ currency.format(product.price) }} / {{ product.unit === 'KILOGRAM' ? 'kg' : 'pza' }}</p>
 </div>
 <div>
 <p class="text-[11px] uppercase tracking-wide text-[#8b958f]">Existencias</p>
 <p class="text-sm font-semibold" :class="product.stock <= 5 && product.active ? 'text-amber-600' : 'text-[#536057]'">{{ product.stock }} {{ product.unit === 'KILOGRAM' ? 'kg' : 'pzas' }}</p>
 </div>
 <div class="flex gap-2 sm:justify-end">
 <UButton label="Editar" icon="i-lucide-pencil" size="sm" variant="soft" @click="openEditModal(product)" />
 <UButton label="Eliminar" icon="i-lucide-trash-2" size="sm" color="error" variant="soft" @click="askDeleteProduct(product)" />
 </div>
 </div>
 </div>
 </li>
 </ul>

 <div class="flex flex-col gap-4 border-t border-[#edf0ed] bg-[#fbfcfb] p-4 lg:flex-row lg:items-end lg:justify-between">
 <p class="text-sm text-[#7d8781]" role="status" aria-live="polite">
 Mostrando {{ pageStart }}-{{ pageEnd }} de {{ total }} productos
 </p>
 <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
 <UFormField label="Mostrar" name="products-limit" size="xs">
 <USelect v-model="limit" :items="limitOptions" value-key="value" label-key="label" aria-label="Productos por página" class="w-full sm:w-44" />
 </UFormField>
 <nav class="flex items-center justify-center gap-2" aria-label="Paginación de productos">
 <UButton type="button" icon="i-lucide-chevron-left" label="Anterior" color="neutral" variant="soft" :disabled="page <= 1 || isRefreshing" @click="goToPage(page - 1)" />
 <span class="min-w-24 text-center text-sm font-semibold text-[#536057]">Página {{ page }} de {{ pageCount }}</span>
 <UButton type="button" trailing-icon="i-lucide-chevron-right" label="Siguiente" color="neutral" variant="soft" :disabled="page >= pageCount || isRefreshing" @click="goToPage(page + 1)" />
 </nav>
 </div>
 </div>
 </div>
 </section>

 <ProductsProductFormModal
 v-model:open="productModalOpen"
 :product="selectedProduct"
 @saved="handleProductSaved"
 @deactivated="updateProductInPage"
 />

 <UModal v-model:open="deleteModalOpen" title="Eliminar producto" description="Esta acción borra el producto de la base de datos.">
 <template #body>
 <div class="space-y-4">
 <p class="text-sm text-[#68746d]">
 ¿Seguro que deseas eliminar permanentemente <span class="font-semibold text-[#202b25]">{{ productToDelete?.name }}</span>?
 </p>
 <UAlert color="error" variant="soft" icon="i-lucide-triangle-alert" title="No se puede deshacer" description="Si solo quieres ocultarlo de ventas, usa Desactivar producto desde Editar." />
 <ActionFeedback v-if="deleteError" :message="deleteError" type="error" @dismiss="deleteError = ''" />
 </div>
 </template>
 <template #footer>
 <div class="flex w-full justify-end gap-2">
 <UButton label="Cancelar" color="neutral" variant="ghost" @click="deleteModalOpen = false" />
 <UButton label="Sí, eliminar" icon="i-lucide-trash-2" color="error" :loading="deleting" @click="permanentlyDeleteProduct" />
 </div>
 </template>
 </UModal>
 </div>
 </DashboardShell>
</template>
