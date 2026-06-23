import type { Prisma } from '@prisma/client'

export function roundCashPaymentTotal(total: Prisma.Decimal) {
  const pesos = total.floor()
  const cents = total.sub(pesos).mul(100).toNumber()

  if (cents < 50) return pesos.toDecimalPlaces(2)
  if (cents <= 60) return pesos.add(0.5).toDecimalPlaces(2)

  return pesos.add(1).toDecimalPlaces(2)
}
