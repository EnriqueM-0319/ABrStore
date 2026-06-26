<script setup lang="ts">
import type { Product } from '~/types/product'

const props = defineProps<{
  product?: Product | null
}>()

const emit = defineEmits<{
  saved: [product: Product]
  deactivated: [product: Product]
}>()

const open = defineModel<boolean>('open', { default: false })
const form = reactive({ sku: '', name: '', description: '', costPrice: '', profitMargin: '30', price: '', unit: 'PIECE' as Product['unit'], stock: '', active: true })
const autoPrice = ref(true)
const saving = ref(false)
const actionError = ref('')
const notice = ref('')
const toast = useToast()
const unitOptions = [{ label: 'Por pieza', value: 'PIECE' }, { label: 'Por kilogramo', value: 'KILOGRAM' }]
const isEditing = computed(() => Boolean(props.product?.id))
const title = computed(() => isEditing.value ? 'Editar producto' : 'Agregar producto')
const description = computed(() => isEditing.value ? 'Actualiza los datos del producto seleccionado.' : 'Registra un producto nuevo en el inventario.')

function resetForm() {
  Object.assign(form, {
    sku: props.product?.sku ?? '',
    name: props.product?.name ?? '',
    description: props.product?.description ?? '',
    costPrice: String(props.product?.costPrice ?? ''),
    profitMargin: String(props.product?.profitMargin ?? 30),
    price: String(props.product?.price ?? ''),
    unit: props.product?.unit ?? 'PIECE',
    stock: String(props.product?.stock ?? ''),
    active: props.product?.active ?? true
  })
  autoPrice.value = !isEditing.value
  actionError.value = ''
  notice.value = ''
}

watch(() => props.product, resetForm, { immediate: true })
watch(open, (isOpen) => {
  if (isOpen) resetForm()
})

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
  saving.value = true
  actionError.value = ''
  notice.value = ''

  try {
    const product = isEditing.value && props.product
      ? await $fetch<Product>(`/api/products/${props.product.id}`, { method: 'PATCH', body: form })
      : await $fetch<Product>('/api/products', { method: 'POST', body: form })

    emit('saved', product)
    notice.value = isEditing.value ? 'Producto actualizado correctamente.' : 'Producto registrado correctamente.'
    toast.add({ title: isEditing.value ? 'Producto actualizado' : 'Producto registrado', description: `${product.name} quedó guardado.`, color: 'success', icon: 'i-lucide-circle-check' })
    open.value = false
  } catch (error: unknown) {
    actionError.value = getErrorMessage(error, isEditing.value ? 'No pudimos actualizar el producto.' : 'No pudimos registrar el producto.')
    toast.add({ title: 'No se pudo guardar', description: actionError.value, color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    saving.value = false
  }
}

async function toggleActiveProduct() {
  if (!props.product) return

  saving.value = true
  actionError.value = ''

  try {
    const updatedProduct = props.product.active
      ? await $fetch<Product>(`/api/products/${props.product.id}`, { method: 'PATCH', body: { ...form, active: false } })
      : await $fetch<Product>(`/api/products/${props.product.id}`, { method: 'PATCH', body: { ...form, active: true } })

    emit('deactivated', updatedProduct)
    toast.add({ title: updatedProduct.active ? 'Producto activado' : 'Producto desactivado', description: updatedProduct.active ? 'Ya está disponible para ventas.' : 'Ya no aparecerá en ventas.', color: 'success', icon: updatedProduct.active ? 'i-lucide-archive-restore' : 'i-lucide-archive' })
    open.value = false
  } catch (error: unknown) {
    actionError.value = getErrorMessage(error, 'No pudimos cambiar el estado del producto.')
    toast.add({ title: 'No se pudo cambiar el estado', description: actionError.value, color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="title" :description="description">
    <template #body>
      <form class="space-y-4" @submit.prevent="saveProduct">
        <FormField v-model="form.sku" name="product-sku" label="Código SKU" placeholder="Ej. ABR-001" autocomplete="off" />
        <FormField v-model="form.name" name="product-name" label="Nombre del producto" placeholder="Ej. Arroz 1kg" autocomplete="off" />
        <UFormField label="Descripción" name="product-description">
          <UTextarea v-model="form.description" placeholder="Detalles breves del producto" :rows="3" class="w-full" :maxlength="300" />
        </UFormField>
        <div class="grid grid-cols-2 gap-3">
          <FormField v-model="form.costPrice" name="product-cost" label="Costo unitario" type="number" placeholder="0.00" autocomplete="off" />
          <FormField v-model="form.profitMargin" name="product-margin" label="Ganancia (%)" type="number" placeholder="30" autocomplete="off" />
        </div>
        <div class="rounded-xl border border-[#e2e7e3] bg-[#f8faf8] p-4">
          <div class="mb-3 flex items-center justify-between gap-3">
            <div>
              <p class="text-sm font-semibold">Calcular precio automáticamente</p>
              <p class="text-xs text-[#78827c]">Costo ÷ porcentaje restante</p>
            </div>
            <USwitch v-model="autoPrice" aria-label="Calcular precio al público automáticamente" />
          </div>
          <UFormField label="Precio al público" name="product-price" required>
            <UInput :model-value="form.price" type="number" inputmode="decimal" placeholder="0.00" size="xl" class="w-full" @update:model-value="setManualPrice" />
          </UFormField>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <UFormField label="Unidad de venta" name="product-unit" required>
            <USelect v-model="form.unit" :items="unitOptions" value-key="value" label-key="label" size="xl" class="w-full" />
          </UFormField>
          <FormField v-model="form.stock" name="product-stock" label="Existencias" type="number" placeholder="0" autocomplete="off" min="0" :step="form.unit === 'PIECE' ? '1' : '0.001'" />
        </div>
        <ActionFeedback v-if="actionError" :message="actionError" type="error" @dismiss="actionError = ''" />
        <ActionFeedback v-if="notice" :message="notice" @dismiss="notice = ''" />
      </form>
    </template>

    <template #footer>
      <div class="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
        <UButton
          v-if="isEditing"
          :label="product?.active ? 'Desactivar producto' : 'Activar producto'"
          :icon="product?.active ? 'i-lucide-archive' : 'i-lucide-archive-restore'"
          :color="product?.active ? 'error' : 'primary'"
          variant="soft"
          :loading="saving"
          @click="toggleActiveProduct"
        />
        <span v-else />
        <div class="flex justify-end gap-2">
          <UButton :label="isEditing ? 'Guardar cambios' : 'Guardar producto'" icon="i-lucide-save" :loading="saving" @click="saveProduct" />
        </div>
      </div>
    </template>
  </UModal>
</template>
