<script setup lang="ts">
import type { Product } from '~/types/product'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Productos' })

const selectedProduct = ref<Product | null>(null)
const productModalOpen = ref(false)
const productToDelete = ref<Product | null>(null)
const deleteModalOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')
const toast = useToast()
const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const limitOptions = [{ label: '10 por página', value: 10 }, { label: '20 por página', value: 20 }, { label: '30 por página', value: 30 }, { label: '50 por página', value: 50 }]
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
  loadInventory,
  goToPage,
  updateProductInPage,
  removeProductFromPage
} = useInventory()

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
                  <span class="grid size-10 shrink-0 place-items-center rounded-xl" :class="product.active ? 'bg-[#eaf2ed] text-[#286047]' : 'bg-stone-100 text-stone-400'">
                    <UIcon name="i-lucide-package" class="size-5" aria-hidden="true" />
                  </span>
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <h3 class="truncate text-sm font-semibold">{{ product.name }}</h3>
                      <UBadge :label="product.active ? 'Activo' : 'Inactivo'" :color="product.active ? 'success' : 'neutral'" variant="soft" size="sm" />
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
