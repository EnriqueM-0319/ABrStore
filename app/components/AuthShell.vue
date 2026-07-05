<script setup lang="ts">
defineProps<{ eyebrow: string; title: string; description: string }>()
</script>

<template>
 <a href="#auth-form" class="skip-link">Saltar al formulario</a>
 <main class="min-h-screen bg-[#f7fafc] dark:bg-slate-900 lg:grid lg:grid-cols-[1.08fr_.92fr]">
 <section class="relative hidden min-h-screen overflow-hidden bg-slate-800 p-12 text-white lg:flex lg:flex-col lg:justify-between">
 <img
 src="~/assets/images/login-abarrotes-alex.jpg"
 alt=""
 class="absolute inset-0 size-full object-cover"
 aria-hidden="true"
 >
 <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,.9),rgba(56,88,114,.68),rgba(79,120,150,.20))]" />
 <div class="absolute inset-x-0 bottom-0 h-44 bg-[linear-gradient(0deg,rgba(15,23,42,.86),transparent)]" />
 <div class="relative flex items-center gap-3">
 <span class="grid size-11 place-items-center rounded-xl bg-white text-sm font-black text-[#4f7896]">AA</span>
 <span class="text-xl font-bold tracking-tight">Abarrotes Alex</span>
 </div>
 <div class="relative max-w-xl">
 <p class="mb-5 text-sm font-semibold uppercase tracking-[.22em] text-[#d8e7f1]">Inventario claro. Caja al día.</p>
 <h2 class="text-5xl font-semibold leading-[1.08]">Control diario para anaqueles, ventas y existencias.</h2>
 <p class="mt-6 max-w-md text-lg leading-8 text-white/70">Consulta productos, registra movimientos y mantén el abarrotes ordenado desde un panel rápido y confiable.</p>
 </div>
 <p class="relative text-sm text-white/50">© {{ new Date().getFullYear() }} Abarrotes Alex</p>
 </section>

 <section class="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-16 xl:px-24">
 <div class="flex items-center justify-between lg:justify-end"><BrandMark class="lg:hidden" /><ThemeToggle /></div>
 <div class="flex flex-1 items-center justify-center py-10">
 <div id="auth-form" class="auth-card w-full max-w-md" tabindex="-1">
 <p class="text-xs font-bold uppercase tracking-[.2em] text-[#4f7896] dark:text-[#b8cad8]">{{ eyebrow }}</p>
 <h1 class="mt-3 text-4xl font-semibold text-slate-950 dark:text-white">{{ title }}</h1>
 <p class="mt-3 leading-7 text-slate-600 dark:text-slate-300">{{ description }}</p>
 <div class="mt-8"><slot /></div>
 </div>
 </div>
 </section>
 </main>
</template>
