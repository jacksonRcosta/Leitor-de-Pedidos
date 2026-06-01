// ── Exportadores ──────────────────────────────────────────────────────────────

function saveBlob(content, name, mime) {
  const url = URL.createObjectURL(new Blob(['\uFEFF' + content], { type: mime }))
  Object.assign(document.createElement('a'), { href: url, download: name }).click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// CSV separado por ponto-e-vírgula (padrão pt-BR)
export function downloadCSV(pedido, suffix) {
  const header = 'CODIGO_BARRAS;QUANTIDADE;PRECO_VENDA;DESCONTO'
  const rows = pedido.items
    .map(i => `${i.codigoBarras};${i.quantidade};${i.precoCompra};${i.desconto}`)
    .join('\n')
  saveBlob(`${header}\n${rows}`, `pedido_${suffix}.csv`, 'text/csv;charset=utf-8;')
}

// XLS como CSV separado por TAB — o Excel abre sem alertas e reconhece como planilha
// É o único formato que garante extensão .xls sem biblioteca binária externa
export function downloadXLS(pedido, suffix) {
  const lines = []

  // Cabeçalho com CNPJ
  lines.push(`CNPJ\t${pedido.cnpj || ''}`)
  lines.push('') // linha em branco

  // Cabeçalho da tabela
  lines.push('CODIGO_BARRAS\tQUANTIDADE\tPRECO_VENDA\tDESCONTO')

  // Dados
  for (const i of pedido.items) {
    lines.push([
      i.codigoBarras,
      i.quantidade,
      i.precoCompra.replace(',', '.'),
      i.desconto.replace(',', '.'),
    ].join('\t'))
  }

  saveBlob(lines.join('\n'), `pedido_${suffix}.xls`, 'application/vnd.ms-excel;charset=utf-8;')
}
