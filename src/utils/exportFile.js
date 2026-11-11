/* 真实文件导出工具：
 * 1) CSV（UTF-8 BOM，Excel/WPS 可直接打开）
 * 2) PDF（用 Canvas 渲染中文表格后嵌入图片，生成合法 PDF，不依赖第三方库）
 * 所有导出内容均来自当前本地 JSON 数据，不再使用"仅提示成功"的占位实现。
 */

function stamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
}

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const escapeCsv = (v) => {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** 导出 CSV：headers 为表头数组，rows 为二维数组 */
export function downloadCsv(name, headers, rows, extraLines = []) {
  const lines = [...extraLines.map((l) => escapeCsv(l)), headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))]
  const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  downloadBlob(`${name}_${stamp()}.csv`, blob)
}

/* ---------------- PDF（Canvas → JPEG → PDF） ---------------- */

const PAGE_ROWS = 30

function drawPage(title, meta, headers, rows) {
  const W = 1240
  const pad = 48
  const titleH = 54
  const metaH = 34
  const lineH = 36
  const headH = 44
  const H = pad + titleH + metaH + headH + rows.length * lineH + pad
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#1f2d24'
  ctx.font = '700 34px "Microsoft YaHei", "PingFang SC", sans-serif'
  ctx.fillText(title, pad, pad + 24)
  ctx.fillStyle = '#6b7380'
  ctx.font = '20px "Microsoft YaHei", "PingFang SC", sans-serif'
  ctx.fillText(meta, pad, pad + titleH + 8)

  const tableY = pad + titleH + metaH
  const colW = (W - pad * 2) / Math.max(1, headers.length)
  ctx.fillStyle = '#eef2ec'
  ctx.fillRect(pad, tableY, W - pad * 2, headH)
  ctx.fillStyle = '#2f4a38'
  ctx.font = '700 20px "Microsoft YaHei", "PingFang SC", sans-serif'
  headers.forEach((h, i) => {
    ctx.fillText(String(h), pad + i * colW + 10, tableY + 28, colW - 16)
  })

  ctx.font = '19px "Microsoft YaHei", "PingFang SC", sans-serif'
  rows.forEach((r, ri) => {
    const y = tableY + headH + ri * lineH
    if (ri % 2) {
      ctx.fillStyle = '#fafbfa'
      ctx.fillRect(pad, y, W - pad * 2, lineH)
    }
    ctx.fillStyle = '#3c4650'
    r.forEach((c, ci) => {
      ctx.fillText(String(c ?? ''), pad + ci * colW + 10, y + 25, colW - 16)
    })
    ctx.strokeStyle = '#e6e9e6'
    ctx.beginPath()
    ctx.moveTo(pad, y + lineH)
    ctx.lineTo(W - pad, y + lineH)
    ctx.stroke()
  })
  return { data: canvas.toDataURL('image/jpeg', 0.92), width: W, height: H }
}

function buildPdf(pages) {
  const enc = new TextEncoder()
  const chunks = []
  const offsets = []
  let total = 0
  const push = (part) => {
    const bytes = typeof part === 'string' ? enc.encode(part) : part
    chunks.push(bytes)
    total += bytes.length
  }
  const addObj = (num, dict, stream) => {
    offsets[num] = total
    push(`${num} 0 obj\n${dict}`)
    if (stream) {
      push('stream\n')
      push(stream)
      push('\nendstream')
    }
    push('\nendobj\n')
  }

  push('%PDF-1.4\n')
  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')
  addObj(1, '<< /Type /Catalog /Pages 2 0 R >>\n')
  addObj(2, `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\n`)

  pages.forEach((pg, i) => {
    const pageNum = 3 + i * 3
    const contentNum = pageNum + 1
    const imgNum = pageNum + 2
    const pdfW = 595
    const pdfH = Math.round((595 * pg.height) / pg.width)
    const content = `q\n${pdfW} 0 0 ${pdfH} 0 0 cm\n/Im0 Do\nQ\n`
    addObj(pageNum, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfW} ${pdfH}] /Resources << /XObject << /Im0 ${imgNum} 0 R >> >> /Contents ${contentNum} 0 R >>\n`)
    addObj(contentNum, `<< /Length ${content.length} >>\n`, content)

    const base64 = String(pg.data).split(',')[1] || ''
    const bin = atob(base64)
    const img = new Uint8Array(bin.length)
    for (let k = 0; k < bin.length; k++) img[k] = bin.charCodeAt(k)
    addObj(imgNum, `<< /Type /XObject /Subtype /Image /Width ${pg.width} /Height ${pg.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>\n`, img)
  })

  const count = 2 + pages.length * 3
  const xrefAt = total
  let xref = `xref\n0 ${count + 1}\n0000000000 65535 f \n`
  for (let i = 1; i <= count; i++) xref += `${String(offsets[i] || 0).padStart(10, '0')} 00000 n \n`
  push(xref)
  push(`trailer\n<< /Size ${count + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`)

  return new Blob(chunks, { type: 'application/pdf' })
}

/** 导出 PDF 报表：自动分页，中文通过 Canvas 渲染保证显示正确 */
export function downloadPdf(name, { title, meta = '', headers, rows }) {
  const pages = []
  for (let i = 0; i < rows.length; i += PAGE_ROWS) {
    const slice = rows.slice(i, i + PAGE_ROWS)
    const pageMeta = rows.length > PAGE_ROWS ? `${meta}（第 ${pages.length + 1} 页）` : meta
    pages.push(drawPage(title, pageMeta, headers, slice))
  }
  if (!pages.length) pages.push(drawPage(title, meta, headers, []))
  downloadBlob(`${name}_${stamp()}.pdf`, buildPdf(pages))
}
