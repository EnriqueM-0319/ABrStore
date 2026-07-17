<script setup lang="ts">
const requestUrl = useRequestURL()
const description = 'Sistema de punto de venta, inventario y caja de Abarrotes Alex.'
const socialImage = new URL('/social/abr-store-system.png', requestUrl.origin).toString()

useHead({
 titleTemplate: (title) => title ? `${title} · Abarrotes Alex` : 'Abarrotes Alex',
 htmlAttrs: { lang: 'es' }
})

useSeoMeta({
 description,
 ogTitle: 'ABR Store · Abarrotes Alex',
 ogDescription: description,
 ogType: 'website',
 ogLocale: 'es_MX',
 ogSiteName: 'ABR Store',
 ogUrl: requestUrl.href,
 ogImage: socialImage,
 ogImageAlt: 'Vista del sistema de punto de venta e inventario ABR Store',
 ogImageWidth: 1200,
 ogImageHeight: 630,
 twitterCard: 'summary_large_image',
 twitterTitle: 'ABR Store · Abarrotes Alex',
 twitterDescription: description,
 twitterImage: socialImage,
 twitterImageAlt: 'Vista del sistema de punto de venta e inventario ABR Store'
})
</script>

<template>
 <UApp :toaster="{ position: 'top-right' }">
 <NuxtPage />
 </UApp>
</template>
