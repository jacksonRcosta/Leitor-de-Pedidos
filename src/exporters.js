export function toCSV(pedido) {
  const header = 'CODIGO_BARRAS;QUANTIDADE;PRECO_VENDA;DESCONTO'
  const rows = pedido.items
    .map(i => `${i.codigoBarras};${i.quantidade};${i.precoCompra};${i.desconto}`)
    .join('\n')
  return `${header}\n${rows}`
}

export function saveBlob(content, name, mime) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  Object.assign(document.createElement('a'), { href: url, download: name }).click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadCSV(pedido, suffix) {
  saveBlob(toCSV(pedido), `pedido_${suffix}.csv`, 'text/csv;charset=utf-8;')
}

// Gera XLS como HTML table — formato que o Excel 97-2003 abre nativamente (.xls)
// É o método mais confiável para forçar extensão .xls no browser sem depender
// de bookType do SheetJS, que em versões recentes sempre produz xlsx internamente.
export function downloadXLS(pedido, suffix) {
  const esc = (v) => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

  const metaRows = `
    <tr><td><b>CNPJ</b></td><td>${esc(pedido.cnpj)}</td></tr>
    <tr><td></td><td></td></tr>
  `
  const header = `<tr>
    <th>CODIGO_BARRAS</th>
    <th>QUANTIDADE</th>
    <th>PRECO_VENDA</th>
    <th>DESCONTO</th>
  </tr>`
  const dataRows = pedido.items.map(i => `<tr>
    <td>${esc(i.codigoBarras)}</td>
    <td>${esc(i.quantidade)}</td>
    <td>${esc(i.precoCompra.replace(',', '.'))}</td>
    <td>${esc(i.desconto.replace(',', '.'))}</td>
  </tr>`).join('')

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8"/>
      <!--[if gte mso 9]>
      <xml><x:ExcelWorkbook><x:ExcelWorksheets>
        <x:ExcelWorksheet><x:Name>Pedido</x:Name>
        <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets></x:ExcelWorkbook></xml>
      <![endif]-->
    </head>
    <body>
      <table border="1">
        ${metaRows}
        ${header}
        ${dataRows}
      </table>
    </body>
    </html>
  `

  saveBlob(html, `pedido_${suffix}.xls`, 'application/vnd.ms-excel;charset=utf-8;')
}
