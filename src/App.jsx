import { useState, useRef, useCallback } from 'react'
import { parsePDF } from './pdfParser'
import { downloadCSV, downloadXLS } from './exporters'

const BLUE  = '#1e3a8a'
const BLUE2 = '#2563eb'
const LBLUE = '#eff6ff'

// ── Ícone de upload ───────────────────────────────────────────────────────────
function UploadIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
      stroke={BLUE2} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  )
}

// ── Ícone de download ─────────────────────────────────────────────────────────
function DlIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function App() {
  const [pedidos, setPedidos]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [idx, setIdx]           = useState(0)
  const [drag, setDrag]         = useState(false)
  const fileRef = useRef()

  const processPDF = useCallback(async (file) => {
    setLoading(true)
    setError(null)
    try {
      const list = await parsePDF(file)
      if (!list.length) {
        setError('Nenhum item encontrado. Verifique se o PDF contém texto selecionável.')
        return
      }
      setPedidos(list)
      setIdx(0)
    } catch (e) {
      setError('Erro ao processar o PDF: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const pick = (files) => {
    const f = Array.from(files).find(
      f => f.name.endsWith('.pdf') || f.type === 'application/pdf'
    )
    if (f) processPDF(f)
    else setError('Selecione um arquivo PDF válido.')
  }

  const cur     = pedidos[idx]
  const totalUn = cur ? cur.items.reduce((s, i) => s + i.quantidade, 0) : 0
  const suf     = cur ? (cur.numeroPedido || idx + 1) : ''

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Segoe UI, system-ui, sans-serif', fontSize: 14 }}>

      {/* ── Topbar ── */}
      <header style={{
        background: BLUE, height: 58, display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: 14, boxShadow: '0 2px 8px rgba(0,0,0,.2)',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <div style={{
          width: 34, height: 34, background: BLUE2, borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
        }}>📦</div>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: -.2 }}>
            Leitor de Pedidos
          </div>
          <div style={{ color: 'rgba(255,255,255,.45)', fontSize: 10, letterSpacing: .5 }}>
            ASA BRANCA INDUSTRIAL
          </div>
        </div>
        {pedidos.length > 0 && (
          <button
            onClick={() => { setPedidos([]); setError(null); setIdx(0) }}
            style={{
              marginLeft: 'auto', padding: '7px 16px',
              background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)',
              color: '#fff', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 500,
            }}
          >
            ↩ Novo arquivo
          </button>
        )}
      </header>

      <main style={{ maxWidth: 1060, margin: '0 auto', padding: '28px 20px' }}>

        {/* ── Erro ── */}
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
            padding: '12px 16px', color: '#dc2626', fontSize: 13, marginBottom: 20,
          }}>
            ⚠ {error}
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div style={{
            background: '#fff', borderRadius: 12, padding: 52,
            textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,.07)',
          }}>
            <div style={{
              width: 38, height: 38, border: '3px solid #dbeafe',
              borderTopColor: BLUE2, borderRadius: '50%',
              animation: 'spin .8s linear infinite', margin: '0 auto 16px',
            }} />
            <div style={{ color: '#64748b' }}>Processando PDF...</div>
          </div>
        )}

        {/* ── Upload ── */}
        {!loading && pedidos.length === 0 && (
          <div
            onClick={() => fileRef.current.click()}
            onDragOver={e => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files) }}
            style={{
              background: drag ? LBLUE : '#fff',
              border: `2px dashed ${drag ? BLUE2 : '#cbd5e1'}`,
              borderRadius: 12, padding: '72px 32px', textAlign: 'center',
              cursor: 'pointer', transition: 'all .2s',
              boxShadow: '0 1px 4px rgba(0,0,0,.06)',
            }}
          >
            <UploadIcon />
            <div style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', marginTop: 14, marginBottom: 8 }}>
              Carregar PDF do Pedido de Compra
            </div>
            <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 22 }}>
              Arraste o arquivo ou toque para selecionar · Suporta múltiplos pedidos
            </div>
            <div style={{
              display: 'inline-block', background: BLUE2, color: '#fff',
              borderRadius: 8, padding: '11px 28px', fontSize: 13, fontWeight: 600,
            }}>
              Selecionar Arquivo PDF
            </div>
            <input
              ref={fileRef} type="file" accept=".pdf"
              style={{ display: 'none' }}
              onChange={e => pick(e.target.files)}
            />
          </div>
        )}

        {/* ── Resultado ── */}
        {!loading && pedidos.length > 0 && cur && (
          <>
            {/* Cards de métricas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 22 }}>
              {[
                { label: 'SKUs',            value: cur.items.length,                   sub: `Pedido #${cur.numeroPedido || '—'}`, bg: BLUE2 },
                { label: 'Total Unidades',  value: totalUn.toLocaleString('pt-BR'),    sub: `Data: ${cur.dataCompra || '—'}`,      bg: '#0369a1' },
                { label: 'CNPJ',            value: cur.cnpj || '—',                   sub: (cur.razaoSocial || '').slice(0, 34),  bg: BLUE },
              ].map(c => (
                <div key={c.label} style={{
                  background: c.bg, borderRadius: 12, padding: '18px 20px',
                  color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,.13)',
                }}>
                  <div style={{ fontSize: 10, opacity: .75, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>
                    {c.label}
                  </div>
                  <div style={{ fontSize: c.label === 'CNPJ' ? 14 : 26, fontWeight: 800, letterSpacing: -.5, marginBottom: 6, lineHeight: 1.1 }}>
                    {c.value}
                  </div>
                  <div style={{ fontSize: 11, opacity: .6 }}>{c.sub}</div>
                </div>
              ))}
            </div>

            {/* Card da tabela */}
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.07)', overflow: 'hidden' }}>

              {/* Header */}
              <div style={{
                padding: '16px 22px', borderBottom: '1px solid #f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 10,
              }}>
                <div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Itens do Pedido</span>
                  <span style={{
                    marginLeft: 10, background: LBLUE, color: BLUE2,
                    fontSize: 11, fontWeight: 600, padding: '3px 12px', borderRadius: 20,
                  }}>
                    #{cur.numeroPedido}
                  </span>
                </div>
                {/* Tabs múltiplos pedidos */}
                {pedidos.length > 1 && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {pedidos.map((p, i) => (
                      <button key={i} onClick={() => setIdx(i)} style={{
                        padding: '5px 14px', borderRadius: 20, border: 'none',
                        background: idx === i ? BLUE2 : '#f1f5f9',
                        color: idx === i ? '#fff' : '#64748b',
                        fontWeight: 600, fontSize: 12, cursor: 'pointer',
                      }}>
                        #{p.numeroPedido || i + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Botões de download */}
              <div style={{
                padding: '12px 22px', borderBottom: '1px solid #f1f5f9',
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#fafcff', flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>Exportar:</span>

                <button
                  onClick={() => downloadCSV(cur, suf)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '9px 20px', background: '#0284c7', color: '#fff',
                    borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <DlIcon /> CSV
                </button>

                <button
                  onClick={() => downloadXLS(cur, suf)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '9px 20px', background: '#16a34a', color: '#fff',
                    borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <DlIcon /> XLS
                </button>

                <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8' }}>
                  {cur.items.length} itens · {totalUn} unidades
                </span>
              </div>

              {/* Cabeçalho tabela */}
              <div style={{
                display: 'grid', gridTemplateColumns: '150px 1fr 70px 105px 90px',
                background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
              }}>
                {[['Cód. Barras', 'left'], ['Descrição', 'left'], ['Qtde', 'right'], ['Preço Venda', 'right'], ['Desconto', 'right']].map(([h, a]) => (
                  <div key={h} style={{
                    padding: '11px 16px', fontSize: 11, color: '#64748b',
                    fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, textAlign: a,
                  }}>{h}</div>
                ))}
              </div>

              {/* Corpo tabela */}
              <div style={{ maxHeight: 430, overflowY: 'auto' }}>
                {cur.items.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'grid', gridTemplateColumns: '150px 1fr 70px 105px 90px',
                      borderBottom: '1px solid #f1f5f9',
                      background: i % 2 !== 0 ? '#fafafa' : '#fff',
                      transition: 'background .1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = LBLUE}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 !== 0 ? '#fafafa' : '#fff'}
                  >
                    <div style={{ padding: '10px 16px', fontFamily: 'monospace', color: BLUE2, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                      {item.codigoBarras}
                    </div>
                    <div style={{ padding: '10px 16px', color: '#374151', fontSize: 12, display: 'flex', alignItems: 'center' }}>
                      {(item.descricao || '—').slice(0, 50)}
                    </div>
                    <div style={{ padding: '10px 16px', fontWeight: 700, color: '#1e293b', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      {item.quantidade}
                    </div>
                    <div style={{ padding: '10px 16px', color: '#166534', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      R$ {item.precoCompra}
                    </div>
                    <div style={{ padding: '10px 16px', color: '#94a3b8', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      {item.desconto}
                    </div>
                  </div>
                ))}
              </div>

              {/* Rodapé */}
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 70px 105px 90px', background: BLUE }}>
                <div style={{ padding: '12px 16px', color: 'rgba(255,255,255,.65)', fontSize: 12, fontWeight: 600, gridColumn: '1/3' }}>
                  Total Geral
                </div>
                <div style={{ padding: '12px 16px', color: '#fff', fontWeight: 800, fontSize: 13, textAlign: 'right' }}>
                  {totalUn}
                </div>
                <div /><div />
              </div>
            </div>
          </>
        )}
      </main>

      {/* Animação do spinner */}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
