import * as XLSX from 'xlsx'

export function toCSV(pedido) {
  const header = 'CODIGO_BARRAS;QUANTIDADE;PRECO_VENDA;DESCONTO'
  const rows = pedido.items
    .map(i => `${i.codigoBarras};${i.quantidade};${i.precoCompra};${i.desconto}`)
    .join('\n')
  return `${header}\n${rows}`
}

export function toXLS(pedido) {
  const data = [
    ['CNPJ', pedido.cnpj || ''],
    [],
    ['CODIGO_BARRAS', 'QUANTIDADE', 'PRECO_VENDA', 'DESCONTO'],
    ...pedido.items.map(i => [
      i.codigoBarras,
      i.quantidade,
      i.precoCompra.replace(',', '.'),
      i.desconto.replace(',', '.'),
    ]),
  ]
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 12 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Pedido')
  return wb
}

export function saveBlob(content, name, mime) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  Object.assign(document.createElement('a'), { href: url, download: name }).click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadCSV(pedido, suffix) {
  saveBlob(toCSV(pedido), `pedido_${suffix}.csv`, 'text/csv;charset=utf-8;')
}

export function downloadXLS(pedido, suffix) {
  XLSX.writeFile(toXLS(pedido), `pedido_${suffix}.xls`, { bookType: 'xls' })
}
