import { Prisma } from '@prisma/client'
import { requireRole, userManagementRoles } from '../../utils'
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
 creditPendingTotal: Prisma.Decimal | null
 creditPaidTotal: Prisma.Decimal | null
}

type CreditCollectionReportRow = {
 period: Date
 creditCollectedCashTotal: Prisma.Decimal | null
 creditCollectedCardTotal: Prisma.Decimal | null
 creditCollectedTransferTotal: Prisma.Decimal | null
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
 COALESCE(SUM(total) FILTER (WHERE "canceledAt" IS NULL AND "paymentMethod" = 'CREDIT'), 0) AS "creditTotal",
 COALESCE(SUM(total) FILTER (WHERE "canceledAt" IS NULL AND "paymentMethod" = 'CREDIT' AND "creditPaidAt" IS NULL), 0) AS "creditPendingTotal",
 COALESCE(SUM(total) FILTER (WHERE "canceledAt" IS NULL AND "paymentMethod" = 'CREDIT' AND "creditPaidAt" IS NOT NULL), 0) AS "creditPaidTotal"
 FROM "Sale"
 WHERE "createdAt" BETWEEN ${startDate} AND ${endDate}
 GROUP BY period
 ORDER BY period ASC
 `

 const creditCollectionPeriodExpression = groupBy === 'year'
 ? Prisma.sql`date_trunc('year', "creditPaidAt")`
 : groupBy === 'month'
 ? Prisma.sql`date_trunc('month', "creditPaidAt")`
 : Prisma.sql`date_trunc('day', "creditPaidAt")`

 const creditCollectionRows = await prisma.$queryRaw<CreditCollectionReportRow[]>`
 SELECT
 ${creditCollectionPeriodExpression} AS period,
 COALESCE(SUM(COALESCE("paymentTotal", total)) FILTER (WHERE "creditPaymentMethod" = 'CASH'), 0) AS "creditCollectedCashTotal",
 COALESCE(SUM(COALESCE("paymentTotal", total)) FILTER (WHERE "creditPaymentMethod" = 'CARD'), 0) AS "creditCollectedCardTotal",
 COALESCE(SUM(COALESCE("paymentTotal", total)) FILTER (WHERE "creditPaymentMethod" = 'TRANSFER'), 0) AS "creditCollectedTransferTotal"
 FROM "Sale"
 WHERE "paymentMethod" = 'CREDIT'
 AND "canceledAt" IS NULL
 AND "creditPaidAt" IS NOT NULL
 AND "creditPaidAt" BETWEEN ${startDate} AND ${endDate}
 GROUP BY period
 ORDER BY period ASC
 `

 const collectionMap = new Map(creditCollectionRows.map(row => [row.period.toISOString(), row]))

 const items = rows.map((row) => {
 const grossTotal = decimalToNumber(row.grossTotal)
 const salesCount = Number(row.salesCount)
 const collections = collectionMap.get(row.period.toISOString())
 const creditCollectedCashTotal = decimalToNumber(collections?.creditCollectedCashTotal ?? null)
 const creditCollectedCardTotal = decimalToNumber(collections?.creditCollectedCardTotal ?? null)
 const creditCollectedTransferTotal = decimalToNumber(collections?.creditCollectedTransferTotal ?? null)

 return {
 period: row.period.toISOString(),
 salesCount,
 canceledCount: Number(row.canceledCount),
 grossTotal,
 cashTotal: decimalToNumber(row.cashTotal),
 cardTotal: decimalToNumber(row.cardTotal),
 transferTotal: decimalToNumber(row.transferTotal),
 creditTotal: decimalToNumber(row.creditTotal),
 creditPendingTotal: decimalToNumber(row.creditPendingTotal),
 creditPaidTotal: decimalToNumber(row.creditPaidTotal),
 creditCollectedCashTotal,
 creditCollectedCardTotal,
 creditCollectedTransferTotal,
 creditCollectedTotal: creditCollectedCashTotal + creditCollectedCardTotal + creditCollectedTransferTotal,
 averageTicket: salesCount > 0 ? grossTotal / salesCount : 0
 }
 })

 for (const row of creditCollectionRows) {
 const period = row.period.toISOString()
 if (items.some(item => item.period === period)) continue

 const creditCollectedCashTotal = decimalToNumber(row.creditCollectedCashTotal)
 const creditCollectedCardTotal = decimalToNumber(row.creditCollectedCardTotal)
 const creditCollectedTransferTotal = decimalToNumber(row.creditCollectedTransferTotal)

 items.push({
 period,
 salesCount: 0,
 canceledCount: 0,
 grossTotal: 0,
 cashTotal: 0,
 cardTotal: 0,
 transferTotal: 0,
 creditTotal: 0,
 creditPendingTotal: 0,
 creditPaidTotal: 0,
 creditCollectedCashTotal,
 creditCollectedCardTotal,
 creditCollectedTransferTotal,
 creditCollectedTotal: creditCollectedCashTotal + creditCollectedCardTotal + creditCollectedTransferTotal,
 averageTicket: 0
 })
 }

 items.sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime())

 const summary = items.reduce((totals, item) => ({
 salesCount: totals.salesCount + item.salesCount,
 canceledCount: totals.canceledCount + item.canceledCount,
 grossTotal: totals.grossTotal + item.grossTotal,
 cashTotal: totals.cashTotal + item.cashTotal,
 cardTotal: totals.cardTotal + item.cardTotal,
 transferTotal: totals.transferTotal + item.transferTotal,
 creditTotal: totals.creditTotal + item.creditTotal,
 creditPendingTotal: totals.creditPendingTotal + item.creditPendingTotal,
 creditPaidTotal: totals.creditPaidTotal + item.creditPaidTotal,
 creditCollectedCashTotal: totals.creditCollectedCashTotal + item.creditCollectedCashTotal,
 creditCollectedCardTotal: totals.creditCollectedCardTotal + item.creditCollectedCardTotal,
 creditCollectedTransferTotal: totals.creditCollectedTransferTotal + item.creditCollectedTransferTotal,
 creditCollectedTotal: totals.creditCollectedTotal + item.creditCollectedTotal
 }), {
 salesCount: 0,
 canceledCount: 0,
 grossTotal: 0,
 cashTotal: 0,
 cardTotal: 0,
 transferTotal: 0,
 creditTotal: 0,
 creditPendingTotal: 0,
 creditPaidTotal: 0,
 creditCollectedCashTotal: 0,
 creditCollectedCardTotal: 0,
 creditCollectedTransferTotal: 0,
 creditCollectedTotal: 0
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
