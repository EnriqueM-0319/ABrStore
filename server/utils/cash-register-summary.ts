import type { Prisma, PrismaClient } from '@prisma/client'

type CashRegisterSummaryClient = Prisma.TransactionClient | PrismaClient

function decimalToNumber(value: Prisma.Decimal | null | undefined) {
  return value?.toNumber() ?? 0
}

export async function getCashRegisterSummary(client: CashRegisterSummaryClient, cashSessionId: string, openingAmount: Prisma.Decimal) {
  const [cashSales, cashSalesCount, cardSales, transferSales, cashIn, adjustment, supplierPayment, withdrawal, expense] = await Promise.all([
    client.sale.findMany({
      where: { cashSessionId, paymentMethod: 'CASH', canceledAt: null },
      select: { total: true, paymentTotal: true }
    }),
    client.sale.count({
      where: { cashSessionId, paymentMethod: 'CASH', canceledAt: null }
    }),
    client.sale.aggregate({
      where: { cashSessionId, paymentMethod: 'CARD', canceledAt: null },
      _sum: { total: true }
    }),
    client.sale.aggregate({
      where: { cashSessionId, paymentMethod: 'TRANSFER', canceledAt: null },
      _sum: { total: true }
    }),
    client.cashMovement.aggregate({
      where: { cashSessionId, type: 'CASH_IN' },
      _sum: { amount: true }
    }),
    client.cashMovement.aggregate({
      where: { cashSessionId, type: 'ADJUSTMENT' },
      _sum: { amount: true }
    }),
    client.cashMovement.aggregate({
      where: { cashSessionId, type: 'SUPPLIER_PAYMENT' },
      _sum: { amount: true }
    }),
    client.cashMovement.aggregate({
      where: { cashSessionId, type: 'WITHDRAWAL' },
      _sum: { amount: true }
    }),
    client.cashMovement.aggregate({
      where: { cashSessionId, type: 'EXPENSE' },
      _sum: { amount: true }
    })
  ])

  const cashSalesTotal = cashSales.reduce((sum, sale) => sum + (sale.paymentTotal ?? sale.total).toNumber(), 0)
  const cardSalesTotal = decimalToNumber(cardSales._sum.total)
  const transferSalesTotal = decimalToNumber(transferSales._sum.total)
  const cashInTotal = decimalToNumber(cashIn._sum.amount)
  const adjustmentTotal = decimalToNumber(adjustment._sum.amount)
  const supplierPaymentTotal = decimalToNumber(supplierPayment._sum.amount)
  const withdrawalTotal = decimalToNumber(withdrawal._sum.amount)
  const expenseTotal = decimalToNumber(expense._sum.amount)
  const cashOutTotal = supplierPaymentTotal + withdrawalTotal + expenseTotal
  const expectedAmount = openingAmount
    .add(cashSalesTotal)
    .add(cashInTotal)
    .add(adjustmentTotal)
    .sub(cashOutTotal)
    .toDecimalPlaces(2)

  return {
    openingAmount: openingAmount.toNumber(),
    cashSalesTotal,
    cashSalesCount,
    cardSalesTotal,
    transferSalesTotal,
    nonCashSalesTotal: cardSalesTotal + transferSalesTotal,
    cashInTotal,
    adjustmentTotal,
    supplierPaymentTotal,
    withdrawalTotal,
    expenseTotal,
    cashOutTotal,
    expectedAmount: expectedAmount.toNumber()
  }
}
