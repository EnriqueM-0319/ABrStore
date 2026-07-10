import type { SaleTicket } from '../types'

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const dateTime = new Intl.DateTimeFormat('es-MX', {
 dateStyle: 'medium',
 timeStyle: 'short',
 timeZone: 'America/Cancun'
})

const paymentMethodLabels: Record<SaleTicket['paymentMethod'], string> = {
 CASH: 'Efectivo',
 CARD: 'Tarjeta',
 TRANSFER: 'Transferencia',
 CREDIT: 'Fiado'
}

function shouldRoundPaymentMethod(method: SaleTicket['paymentMethod']) {
 return method === 'CASH' || method === 'CARD'
}

function escapeHtml(value: unknown) {
 return String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')
}

export function printSaleTicket(sale: SaleTicket) {
 if (!import.meta.client) return false

 const printWindow = window.open('', '_blank', 'width=380,height=640')
 if (!printWindow) return false

 const items = sale.items.map(item => `
  <tr>
   <td>
    <strong>${escapeHtml(item.name)}</strong>
    <span>${escapeHtml(item.sku)} · ${item.quantity} ${item.unit === 'KILOGRAM' ? 'kg' : 'pzas'} x ${currency.format(item.unitPrice)}</span>
   </td>
   <td>${currency.format(item.lineTotal)}</td>
  </tr>
 `).join('')
 const roundedPayment = shouldRoundPaymentMethod(sale.paymentMethod) && sale.paymentTotal !== sale.total
 const cashDetails = shouldRoundPaymentMethod(sale.paymentMethod)
  ? `
   <div class="line"><span>Total a cobrar</span><strong>${currency.format(sale.paymentTotal)}</strong></div>
   ${sale.paymentMethod === 'CASH' ? `<div class="line"><span>Recibido</span><strong>${currency.format(sale.cashReceived ?? 0)}</strong></div>` : ''}
   ${sale.paymentMethod === 'CASH' ? `<div class="line"><span>Cambio</span><strong>${currency.format(sale.changeDue ?? 0)}</strong></div>` : ''}
  `
  : ''

 printWindow.document.write(`<!doctype html>
<html lang="es">
<head>
 <meta charset="utf-8">
 <title>Ticket #${sale.folio}</title>
 <style>
  @page { size: auto; margin: 0; }
  * { box-sizing: border-box; }
  body {
   width: 100%;
   max-width: 80mm;
   margin: 0;
   padding: 3mm;
   color: #000;
   background: #fff;
   font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
   font-size: 10px;
   line-height: 1.25;
  }
  h1, h2, p { margin: 0; }
  h1 { font-size: 14px; text-align: center; }
  h2 { margin-top: 2mm; font-size: 12px; text-align: center; }
  .center { text-align: center; }
  .muted { margin-top: 1mm; font-size: 9px; }
  .divider { margin: 2mm 0; border-top: 1px dashed #000; }
  .line { display: flex; justify-content: space-between; gap: 2mm; margin-top: 1mm; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1.2mm 0; vertical-align: top; }
  td:first-child { width: 70%; }
  td:last-child { width: 30%; text-align: right; white-space: nowrap; }
  td span { display: block; margin-top: .5mm; font-size: 9px; }
  .total { font-size: 13px; font-weight: 800; }
  .footer { margin-top: 3mm; text-align: center; font-size: 9px; }
 </style>
</head>
<body>
 <h1>Abarrotes Alex</h1>
 <h2>Ticket #${sale.folio}</h2>
 <p class="center muted">${escapeHtml(dateTime.format(new Date(sale.createdAt)))}</p>
 <div class="divider"></div>
 <p>Pago: ${escapeHtml(paymentMethodLabels[sale.paymentMethod])}</p>
 ${sale.cashSession ? `<p>Caja: ${escapeHtml(sale.cashSession.id.slice(-6).toUpperCase())}</p>` : ''}
 ${sale.creditCustomerName ? `<p>Cliente: ${escapeHtml(sale.creditCustomerName)}</p>` : ''}
 <div class="divider"></div>
 <table>${items}</table>
 <div class="divider"></div>
 <div class="line"><span>Articulos</span><strong>${sale.itemCount}</strong></div>
 <div class="line total"><span>${roundedPayment ? 'Subtotal' : 'Total'}</span><strong>${currency.format(sale.total)}</strong></div>
 ${cashDetails}
 <p class="footer">Gracias por su compra</p>
</body>
</html>`)
 printWindow.document.close()
 printWindow.focus()
 window.setTimeout(() => {
  printWindow.print()
 }, 150)
 return true
}
