// ── Carrega pdf.js via CDN (evita bundle grande) ─────────────────────────────
const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
const WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

async function loadPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib
  await new Promise((ok, err) => {
    const s = document.createElement('script')
    s.src = PDFJS_URL
    s.onload = ok
    s.onerror = err
    document.head.appendChild(s)
  })
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL
  return window.pdfjsLib
}

// ── Reconstrução de linhas por coordenada Y ───────────────────────────────────
function groupByRows(items, tol = 3) {
  const rows = []
  for (const item of items) {
    const x = item.transform[4]
    const y = item.transform[5]
    const str = item.str.trim()
    if (!str) continue
    const row = rows.find(r => Math.abs(r.y - y) <= tol)
    if (row) row.tokens.push({ x, str })
    else rows.push({ y, tokens: [{ x, str }] })
  }
  rows.sort((a, b) => b.y - a.y)
  rows.forEach(r => r.tokens.sort((a, b) => a.x - b.x))
  return rows
}

// ── Parser de tokens por linha ────────────────────────────────────────────────
function parseRowTokens(tokens) {
  const expanded = []
  for (const t of tokens.map(t => t.str)) {
    const m = t.match(/^[A-Za-z]+(\d{12,14})$/)
    expanded.push(m ? m[1] : t)
  }

  const res = {}
  for (let i = 0; i < expanded.length; i++) {
    const tok = expanded[i].trim()
    if (!res.codigo && /^\d{6}$/.test(tok)) { res.codigo = tok; continue }
    if (!res.emb && /^(?:UN|CX|TP|KT|FL)\/\d+$/.test(tok)) { res.emb = tok; continue }
    if (!res.extCode && /^0{6}\d{6}$/.test(tok)) { res.extCode = tok; continue }
    if (!res.barcode && /^\d{12,14}$/.test(tok) && !tok.startsWith('000000')) {
      res.barcode = tok.length > 13 ? tok.slice(-13) : tok
      continue
    }
    if (!res.qty && res.extCode && /^\d{1,4}$/.test(tok)) { res.qty = parseInt(tok, 10); continue }
    if (!res.price && res.qty !== undefined && /^\d+,\d{2}$/.test(tok)) { res.price = tok; continue }
    if (res.price && !res.desconto && /^\d+,\d{2}$/.test(tok)) { res.desconto = tok; continue }
  }

  if (res.codigo) {
    const si = expanded.indexOf(res.codigo)
    const ei = res.barcode
      ? expanded.findIndex((t, i) => i > si && (t === res.barcode || /^(?:UN|CX|TP|KT|FL)\/\d+$/.test(t)))
      : expanded.findIndex((t, i) => i > si && /^(?:UN|CX|TP|KT|FL)\/\d+$/.test(t))
    if (si >= 0 && ei > si + 1)
      res.descricao = expanded.slice(si + 1, ei).join(' ').trim()
  }

  return res
}

function parseItemsFromRows(rows) {
  const items = []
  for (const row of rows) {
    const r = parseRowTokens(row.tokens)
    if (r.codigo && r.barcode && r.qty !== undefined && r.price) {
      items.push({
        codigo: r.codigo,
        descricao: r.descricao || '',
        codigoBarras: r.barcode,
        quantidade: r.qty,
        precoCompra: r.price,
        desconto: r.desconto || '0,00',
      })
    }
  }
  return items
}

function extractFromRows(rows, re) {
  for (const row of rows) {
    const m = row.tokens.map(t => t.str).join(' ').match(re)
    if (m) return m[1].trim()
  }
  return null
}

function extractCNPJ(rows) {
  for (const row of rows) {
    const ms = [
      ...row.tokens
        .map(t => t.str)
        .join(' ')
        .matchAll(/CNPJ[:\s]*([0-9]{2}[\.\s]?[0-9]{3}[\.\s]?[0-9]{3}[\/\s]?[0-9]{4}[-\s]?[0-9]{2})/gi),
    ]
    if (ms.length) return ms[0][1].replace(/\D/g, '')
  }
  return null
}

// ── Exportação principal ──────────────────────────────────────────────────────
export async function parsePDF(file) {
  const pdfjsLib = await loadPdfJs()
  const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise

  const allPedidos = []
  let cur = null
  let curRows = []

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    const rows = groupByRows(content.items)

    for (const row of rows) {
      const line = row.tokens.map(t => t.str).join(' ')
      if (/N[°º]\s*PEDIDO/i.test(line)) {
        if (cur) { cur.rows = curRows; allPedidos.push(cur) }
        cur = {}
        curRows = []
      }
      if (cur) curRows.push(row)
    }
  }
  if (cur) { cur.rows = curRows; allPedidos.push(cur) }

  return allPedidos
    .map(pd => ({
      cnpj: extractCNPJ(pd.rows),
      razaoSocial: extractFromRows(pd.rows, /RAZ[ÃA]O\s+SOCIAL[:\s]*(.+)/i),
      numeroPedido: extractFromRows(pd.rows, /N[°º]\s*PEDIDO[:\s]*(\d+)/i),
      dataCompra: extractFromRows(pd.rows, /DATA\s+COMPRA[:\s]*([\d\/]+)/i),
      items: parseItemsFromRows(pd.rows),
    }))
    .filter(p => p.items.length > 0)
}
