import type { Prisma } from '@prisma/client'

export function roundPayableTotal(total: Prisma.Decimal) {
  const pesos = total.floor()
  const cents = total.sub(pesos).mul(100).toNumber()

  if (cents < 50) return pesos.toDecimalPlaces(2)
  if (cents === 50) return pesos.add(0.5).toDecimalPlaces(2)

  return pesos.add(1).toDecimalPlaces(2)
}

export function shouldRoundPaymentMethod(paymentMethod: string) {
  return paymentMethod === 'CASH' || paymentMethod === 'CARD'
}

export const roundCashPaymentTotal = roundPayableTotal
