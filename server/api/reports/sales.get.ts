import { Prisma } from '@prisma/client'
import { requireRole } from '../../utils/auth'
import { userManagementRoles } from '../../utils/users'
import prisma from '../../../lib/prisma'

const groupOptions = ['day', 'month', 'year'] as const

type SalesReportRow = {
  period: Date
  salesCount: bigint
  canceledCount: bigint
  grossTotal: Prisma.Decimal | null
  cashTotal: Prisma.Decimal | null
  cardTotal: Prisma.Decimal | null
  transferTotal: Prisma.Decimal | null
  creditTotal: Prisma.Decimal | null
}

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getCurrentWeekRange() {
  const now = new Date()
  const day = now.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const start = new Date(now)
  start.setDate(now.getDate() + mondayOffset)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

function parseStartDate(value: unknown, fallback: Date) {
  if (typeof value !== 'string' || !value) return fallback
  const date = new Date(`${value}T00:00:00.000`)
  return Number.isNaN(date.getTime()) ? fallback : date
}

function parseEndDate(value: unknown, fallback: Date) {
  if (typeof value !== 'string' || !value) return fallback
  const date = new Date(`${value}T23:59:59.999`)
  return Number.isNaN(date.getTime()) ? fallback : date
}

function decimalToNumber(value: Prisma.Decimal | null) {
  return value?.toNumber() ?? 0
}

export default defineEventHandler(async (event) => {
  await requireRole(event, userManagementRoles)

  const query = getQuery(event)
  const requestedGroup = typeof query.groupBy === 'string' ? query.groupBy : 'day'
  const groupBy = groupOptions.includes(requestedGroup as typeof groupOptions[number])
    ? requestedGroup as typeof groupOptions[number]
    : 'day'
  const defaultRange = getCurrentWeekRange()
  const startDate = parseStartDate(query.startDate, defaultRange.start)
  const endDate = parseEndDate(query.endDate, defaultRange.end)
  const periodExpression = groupBy === 'year'
    ? Prisma.sql`date_trunc('year', "createdAt")`
    : groupBy === 'month'
      ? Prisma.sql`date_trunc('month', "createdAt")`
      : Prisma.sql`date_trunc('day', "createdAt")`

  const rows = await prisma.$queryRaw<SalesReportRow[]>`
    SELECT
      ${periodExpression} AS period,
      COUNT(*) FILTER (WHERE "canceledAt" IS NULL) AS "salesCount",
      COUNT(*) FILTER (WHERE "canceledAt" IS NOT NULL) AS "canceledCount",
      COALESCE(SUM(COALESCE("paymentTotal", total)) FILTER (WHERE "canceledAt" IS NULL), 0) AS "grossTotal",
      COALESCE(SUM(COALESCE("paymentTotal", total)) FILTER (WHERE "canceledAt" IS NULL AND "paymentMethod" = 'CASH'), 0) AS "cashTotal",
      COALESCE(SUM(COALESCE("paymentTotal", total)) FILTER (WHERE "canceledAt" IS NULL AND "paymentMethod" = 'CARD'), 0) AS "cardTotal",
      COALESCE(SUM(total) FILTER (WHERE "canceledAt" IS NULL AND "paymentMethod" = 'TRANSFER'), 0) AS "transferTotal",
      COALESCE(SUM(total) FILTER (WHERE "canceledAt" IS NULL AND "paymentMethod" = 'CREDIT'), 0) AS "creditTotal"
    FROM "Sale"
    WHERE "createdAt" BETWEEN ${startDate} AND ${endDate}
    GROUP BY period
    ORDER BY period ASC
  `

  const items = rows.map((row) => {
    const grossTotal = decimalToNumber(row.grossTotal)
    const salesCount = Number(row.salesCount)

    return {
      period: row.period.toISOString(),
      salesCount,
      canceledCount: Number(row.canceledCount),
      grossTotal,
      cashTotal: decimalToNumber(row.cashTotal),
      cardTotal: decimalToNumber(row.cardTotal),
      transferTotal: decimalToNumber(row.transferTotal),
      creditTotal: decimalToNumber(row.creditTotal),
      averageTicket: salesCount > 0 ? grossTotal / salesCount : 0
    }
  })

  const summary = items.reduce((totals, item) => ({
    salesCount: totals.salesCount + item.salesCount,
    canceledCount: totals.canceledCount + item.canceledCount,
    grossTotal: totals.grossTotal + item.grossTotal,
    cashTotal: totals.cashTotal + item.cashTotal,
    cardTotal: totals.cardTotal + item.cardTotal,
    transferTotal: totals.transferTotal + item.transferTotal,
    creditTotal: totals.creditTotal + item.creditTotal
  }), {
    salesCount: 0,
    canceledCount: 0,
    grossTotal: 0,
    cashTotal: 0,
    cardTotal: 0,
    transferTotal: 0,
    creditTotal: 0
  })

  return {
    groupBy,
    startDate: toDateInput(startDate),
    endDate: toDateInput(endDate),
    summary: {
      ...summary,
      averageTicket: summary.salesCount > 0 ? summary.grossTotal / summary.salesCount : 0
    },
    items
  }
})
