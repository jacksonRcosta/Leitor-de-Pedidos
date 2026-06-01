// ── Exportadores ──────────────────────────────────────────────────────────────
// Gera CSV e XLS binário (BIFF8) no layout de importação de pedido de venda.
//
// Layout esperado pelo sistema de importação:
//   Linha 0: "cnpj" | <valor do cnpj>
//   Linha 1 (cabeçalho): codproduto | codembalagem | quantidade | descricao | emba |
//                        qtUnit | precoVenda | preço emba | preço emba st |
//                        preço unit | preço tot | preco tot ion | preco tot ion st
//   Linha 2+: somente colunas "codembalagem" (código de barras) e "quantidade"

const HEADER = [
  'codproduto', 'codembalagem', 'quantidade', 'descricao', 'emba',
  'qtUnit', 'precoVenda', 'preço emba', 'preço emba st',
  'preço unit', 'preço tot', 'preco tot ion', 'preco tot ion st',
]

function saveBlob(content, name, mime) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  Object.assign(document.createElement('a'), { href: url, download: name }).click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Monta a matriz no layout de importação
function buildMatrix(pedido) {
  const matrix = [
    ['cnpj', pedido.cnpj || ''],
    HEADER,
    ...pedido.items.map(i => [
      '',                  // codproduto (vazio)
      i.codigoBarras,      // codembalagem
      i.quantidade,        // quantidade
      '', '', '', '', '', '', '', '', '', '', // demais campos vazios
    ]),
  ]
  return matrix
}

// ── CSV ───────────────────────────────────────────────────────────────────────
export function downloadCSV(pedido, suffix) {
  const matrix = buildMatrix(pedido)
  const content = '\uFEFF' + matrix.map(row => row.join(';')).join('\n')
  saveBlob(content, `pedido_${suffix}.csv`, 'text/csv;charset=utf-8;')
}

// ── XLS binário BIFF8 (Excel 97-2003) ─────────────────────────────────────────
function buildBIFF8(matrix) {
  const records = []

  const rec = (type, data) => {
    const buf = new Uint8Array(4 + data.length)
    const dv = new DataView(buf.buffer)
    dv.setUint16(0, type, true)
    dv.setUint16(2, data.length, true)
    buf.set(data, 4)
    records.push(buf)
  }
  const u8 = (arr) => Uint8Array.from(arr)
  const strBytes = (s) => { const o = []; for (let i = 0; i < s.length; i++) o.push(s.charCodeAt(i) & 0xff); return o }

  // BOF globals
  const bofG = new Uint8Array(16)
  new DataView(bofG.buffer).setUint16(0, 0x0600, true)
  new DataView(bofG.buffer).setUint16(2, 0x0005, true)
  rec(0x0809, bofG)

  // BOUNDSHEET
  const nb = strBytes('Pedido')
  const bs = new Uint8Array(8 + nb.length)
  new DataView(bs.buffer).setUint32(0, 0, true)
  bs[4] = 0; bs[5] = 0; bs[6] = nb.length; bs[7] = 0; bs.set(nb, 8)
  rec(0x0085, bs)
  const bi = records.length - 1

  rec(0x000A, u8([])) // EOF globals

  let pos = 0
  for (const r of records) pos += r.length

  // BOF worksheet
  const bofW = new Uint8Array(16)
  new DataView(bofW.buffer).setUint16(0, 0x0600, true)
  new DataView(bofW.buffer).setUint16(2, 0x0010, true)
  rec(0x0809, bofW)
  new DataView(records[bi].buffer).setUint32(4, pos, true)

  // Células
  matrix.forEach((row, r) => row.forEach((val, c) => {
    if (val === '' || val === null || val === undefined) return
    if (typeof val === 'number' && isFinite(val)) {
      const d = new Uint8Array(14)
      const dv = new DataView(d.buffer)
      dv.setUint16(0, r, true); dv.setUint16(2, c, true); dv.setUint16(4, 0, true)
      dv.setFloat64(6, val, true)
      rec(0x0203, d) // NUMBER
    } else {
      const s = String(val)
      const sb = strBytes(s)
      const d = new Uint8Array(9 + sb.length)
      const dv = new DataView(d.buffer)
      dv.setUint16(0, r, true); dv.setUint16(2, c, true); dv.setUint16(4, 0, true)
      dv.setUint16(6, s.length, true); d[8] = 0; d.set(sb, 9)
      rec(0x0204, d) // LABEL
    }
  }))

  rec(0x000A, u8([])) // EOF worksheet

  let total = 0
  for (const r of records) total += r.length
  const out = new Uint8Array(total)
  let off = 0
  for (const r of records) { out.set(r, off); off += r.length }
  return out
}

export function downloadXLS(pedido, suffix) {
  const matrix = buildMatrix(pedido)
  saveBlob(buildBIFF8(matrix), `pedido_${suffix}.xls`, 'application/vnd.ms-excel')
}
