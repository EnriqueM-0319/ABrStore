export function calculatePublicPriceFromMargin(cost: number, marginPercent: number) {
 if (!Number.isFinite(cost) || !Number.isFinite(marginPercent) || cost < 0 || marginPercent < 0 || marginPercent >= 100) return ''

 return (cost / (1 - marginPercent / 100)).toFixed(2)
}

export function calculateMarginFromPublicPrice(cost: number, publicPrice: number) {
 if (!Number.isFinite(cost) || !Number.isFinite(publicPrice) || cost <= 0 || publicPrice <= 0) return ''

 return ((1 - cost / publicPrice) * 100).toFixed(2)
}
