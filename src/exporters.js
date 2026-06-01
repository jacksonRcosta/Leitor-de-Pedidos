// ── Exportadores ──────────────────────────────────────────────────────────────
// Gera CSV e XLS binário (BIFF8) reais, sem dependências externas.

function saveBlob(content, name, mime) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  Object.assign(document.createElement('a'), { href: url, download: name }).click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ── CSV (separador ponto-e-vírgula, padrão pt-BR) ─────────────────────────────
export function downloadCSV(pedido, suffix) {
  const header = 'CODIGO_BARRAS;QUANTIDADE;PRECO_VENDA;DESCONTO'
  const rows = pedido.items
    .map(i => `${i.codigoBarras};${i.quantidade};${i.precoCompra};${i.desconto}`)
    .join('\n')
  const content = '\uFEFF' + `${header}\n${rows}`
  saveBlob(content, `pedido_${suffix}.csv`, 'text/csv;charset=utf-8;')
}

// ── XLS binário BIFF8 (Excel 97-2003) — formato nativo real ───────────────────
// Constrói o arquivo byte a byte. O Excel abre sem qualquer alerta de formato.
function buildBIFF8(matrix) {
  const records = []

  // Cria um record BIFF: [tipo:2][tamanho:2][dados]
  const rec = (type, data) => {
    const buf = new Uint8Array(4 + data.length)
    const dv = new DataView(buf.buffer)
    dv.setUint16(0, type, true)
    dv.setUint16(2, data.length, true)
    buf.set(data, 4)
    records.push(buf)
  }

  const u8 = (arr) => Uint8Array.from(arr)

  // Converte string ASCII/latin1 em bytes
  const strBytes = (s) => {
    const out = []
    for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 0xff)
    return out
  }

  // --- Substream: Workbook Globals ---
  const bofGlobals = new Uint8Array(16)
  new DataView(bofGlobals.buffer).setUint16(0, 0x0600, true) // BIFF8
  new DataView(bofGlobals.buffer).setUint16(2, 0x0005, true) // globals
  rec(0x0809, bofGlobals)

  // BOUNDSHEET (posição do BOF da worksheet será preenchida depois)
  const sheetName = 'Pedido'
  const nameBytes = strBytes(sheetName)
  const bs = new Uint8Array(8 + nameBytes.length)
  const bsDv = new DataView(bs.buffer)
  bsDv.setUint32(0, 0, true)      // posição BOF (patch posterior)
  bs[4] = 0                        // visível
  bs[5] = 0                        // worksheet
  bs[6] = nameBytes.length         // tamanho do nome
  bs[7] = 0                        // 0 = string comprimida (1 byte/char)
  bs.set(nameBytes, 8)
  rec(0x0085, bs)
  const boundsheetIndex = records.length - 1

  // EOF dos globals
  rec(0x000A, u8([]))

  // Calcula posição onde começa o BOF da worksheet
  let pos = 0
  for (const r of records) pos += r.length

  // --- Substream: Worksheet ---
  const bofWS = new Uint8Array(16)
  new DataView(bofWS.buffer).setUint16(0, 0x0600, true)
  new DataView(bofWS.buffer).setUint16(2, 0x0010, true) // worksheet
  rec(0x0809, bofWS)

  // Corrige a posição no BOUNDSHEET (+4 = pula header do próprio record)
  new DataView(records[boundsheetIndex].buffer).setUint32(4, pos, true)

  // Escreve as células
  matrix.forEach((row, r) => {
    row.forEach((val, c) => {
      if (val === '' || val === null || val === undefined) return
      if (typeof val === 'number' && isFinite(val)) {
        // NUMBER record (0x0203)
        const d = new Uint8Array(14)
        const dv = new DataView(d.buffer)
        dv.setUint16(0, r, true)
        dv.setUint16(2, c, true)
        dv.setUint16(4, 0, true)        // formato
        dv.setFloat64(6, val, true)
        rec(0x0203, d)
      } else {
        // LABEL record (0x0204) — texto
        const s = String(val)
        const sb = strBytes(s)
        const d = new Uint8Array(9 + sb.length)
        const dv = new DataView(d.buffer)
        dv.setUint16(0, r, true)
        dv.setUint16(2, c, true)
        dv.setUint16(4, 0, true)        // formato
        dv.setUint16(6, s.length, true) // tamanho do texto
        d[8] = 0                         // 0 = comprimido
        d.set(sb, 9)
        rec(0x0204, d)
      }
    })
  })

  // EOF da worksheet
  rec(0x000A, u8([]))

  // Concatena todos os records
  let total = 0
  for (const r of records) total += r.length
  const result = new Uint8Array(total)
  let off = 0
  for (const r of records) { result.set(r, off); off += r.length }
  return result
}

export function downloadXLS(pedido, suffix) {
  const matrix = [
    ['CNPJ', pedido.cnpj || ''],
    [],
    ['CODIGO_BARRAS', 'QUANTIDADE', 'PRECO_VENDA', 'DESCONTO'],
    ...pedido.items.map(i => [
      i.codigoBarras,
      i.quantidade,
      parseFloat(i.precoCompra.replace(',', '.')),
      parseFloat(i.desconto.replace(',', '.')),
    ]),
  ]
  const bytes = buildBIFF8(matrix)
  saveBlob(bytes, `pedido_${suffix}.xls`, 'application/vnd.ms-excel')
}
