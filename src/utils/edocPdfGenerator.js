// ════════════════════════════════════════════════════════════════════════════
// Corporate-grade HR PDF generators (Apple / Google / Microsoft tier polish).
//
// Each letter type has its OWN dedicated multi-page generator with a distinct
// visual identity — cover page, structured schedules, legal clauses, schedules
// of compensation, and a signature page. The free-form template `body` is an
// OPTIONAL inserted paragraph; the canonical structure is always emitted.
//
// Implemented letter types:
//   1. Experience Letter   (4-6 pp · classic gold-foil certificate)
//   2. Relieving Letter    (5-8 pp · editorial minimal)
//   3. Confirmation Letter (4-6 pp · celebratory emerald-gold)
//   4. Appointment Letter  (8-12 pp · premium gold-on-black cover + schedules)
//   5. Offer Letter        (7-10 pp · luxury cover + total rewards)
//   6. Salary Certificate  (3-5 pp · bank-grade tabular)
//   7. NDA                 (8-12 pp · legal serif, "CONFIDENTIAL" watermark)
// ════════════════════════════════════════════════════════════════════════════
import { jsPDF } from 'jspdf'

// ─── Brand palette ───────────────────────────────────────────────────────────
const GOLD       = [245, 158, 11]
const GOLD_SOFT  = [254, 243, 199]
const AMBER      = [217, 119, 6]
const AMBER_DEEP = [180, 83, 9]
const INK        = [26, 20, 16]
const SLATE      = [55, 65, 81]
const MUTE       = [120, 108, 92]
const HAIR       = [230, 225, 215]
const PAPER      = [255, 252, 245]
const EMERALD    = [5, 150, 105]
const EMERALD_SOFT = [220, 252, 231]
const NAVY       = [30, 41, 59]
const RUBY       = [185, 28, 28]
const RUBY_SOFT  = [254, 226, 226]

const COMPANY = {
  name: 'Fourreck',
  legal: 'Fourreck Technologies Pvt. Ltd.',
  tagline: 'Human Resources',
  address1: '4th Floor, Innovation Tower',
  address2: 'Hyderabad, Telangana 500032, India',
  cin: 'CIN: U72200TG2020PTC123456',
  pan: 'PAN: ABCFR1234X',
  gst: 'GSTIN: 36ABCFR1234X1ZK',
  email: 'hr@fourreck.com',
  web: 'fourreck.com',
}

// ─── Public utility helpers ──────────────────────────────────────────────────

export function renderTemplate(body = '', vars = {}) {
  const map = {}
  for (const [k, v] of Object.entries(vars)) map[k.toLowerCase().trim()] = v ?? ''
  return String(body).replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key) => {
    const v = map[key.toLowerCase().trim()]
    return v === undefined ? '' : String(v)
  })
}

export function docToFile(doc, filename = 'document.pdf') {
  const blob = doc.output('blob')
  return new File([blob], filename, { type: 'application/pdf' })
}

// ─── Layout primitives ───────────────────────────────────────────────────────

const MARGIN = 54
const BODY_SIZE = 10.5
const BODY_LH = 1.65
const PARA_GAP = 12
const PAGE_W = 595.28
const PAGE_H = 841.89
const HEADER_BOTTOM = 90        // y where body begins on a body page (was 70)

/**
 * Check whether a string looks like real prose vs concatenated placeholder
 * garbage (e.g. "Razeya28/5/2026Fourreck190Tech LeadProduct"). We require:
 *   - at least one whitespace
 *   - at least 30 visible chars
 *   - at least 4 word-like tokens separated by spaces.
 * Anything else is treated as junk and silently dropped.
 */
function isProse(s) {
  if (!s) return false
  const t = String(s).trim()
  if (t.length < 30) return false
  const tokens = t.split(/\s+/).filter(Boolean)
  if (tokens.length < 4) return false
  // Reject runs that are mostly digits + slashes (date concatenation tell)
  const digitRatio = (t.match(/[\d/]/g) || []).length / t.length
  if (digitRatio > 0.4) return false
  return true
}

const fmtDate = (d) => {
  if (!d) return ''
  const dt = (d instanceof Date) ? d : new Date(d)
  if (Number.isNaN(dt.getTime())) return ''
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
}

const inr = (n) => {
  const x = Number(n)
  if (!Number.isFinite(x) || x === 0) return '—'
  return `INR ${x.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

const inrPlain = (n) => {
  const x = Number(n)
  if (!Number.isFinite(x)) return ''
  return x.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function refNumber(prefix, employeeCode) {
  const y = new Date().getFullYear()
  const m = String(new Date().getMonth() + 1).padStart(2, '0')
  const code = (employeeCode || 'XXXX').toString().toUpperCase().replace(/\s+/g, '')
  const tail = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}/${y}${m}/${code}/${tail}`
}

const firstName = (n) => String(n || 'Employee').split(' ')[0]
const honor = (gender, options = ['Mr', 'Ms']) => gender === 'Female' ? 'Ms.' : gender === 'Male' ? 'Mr.' : ''
const pronoun = (gender, kind = 'subject') => {
  const map = {
    Male:   { subject: 'he',  possessive: 'his',  reflexive: 'himself' },
    Female: { subject: 'she', possessive: 'her',  reflexive: 'herself' },
  }
  return map[gender]?.[kind] || (kind === 'possessive' ? 'their' : 'they')
}

// ─── Shared visual helpers ───────────────────────────────────────────────────

function drawGoldBand(doc, y = 0, h = 7) {
  doc.setFillColor(...GOLD); doc.rect(0, y, PAGE_W, h, 'F')
  doc.setFillColor(...AMBER); doc.rect(0, y + h, PAGE_W, 1.5, 'F')
}

function drawBottomBand(doc) {
  doc.setFillColor(...GOLD); doc.rect(0, PAGE_H - 4, PAGE_W, 4, 'F')
}

function drawCornerMark(doc, x = PAGE_W - 26, y = 22) {
  doc.setDrawColor(...GOLD); doc.setLineWidth(1.2)
  doc.line(x, y, x + 14, y)
  doc.line(x + 14, y, x + 14, y + 14)
}

function watermark(doc, text = 'CONFIDENTIAL') {
  // Diagonal page watermark — useful for NDA cover & body pages.
  doc.saveGraphicsState?.()
  doc.setTextColor(245, 230, 200)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(80)
  doc.text(text, PAGE_W / 2, PAGE_H / 2, { align: 'center', angle: 35, baseline: 'middle' })
  doc.restoreGraphicsState?.()
}

/** Compact header on every body page (after the cover). */
function pageHeader(doc, { title, refNo, issueDate, palette = 'gold' }) {
  drawGoldBand(doc, 0, 7)
  if (palette === 'navy') { doc.setFillColor(...NAVY); doc.rect(0, 7, PAGE_W, 1.5, 'F') }
  if (palette === 'emerald') { doc.setFillColor(...EMERALD); doc.rect(0, 7, PAGE_W, 1.5, 'F') }
  if (palette === 'ruby') { doc.setFillColor(...RUBY); doc.rect(0, 7, PAGE_W, 1.5, 'F') }

  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
  doc.text(COMPANY.name, MARGIN, 32)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTE)
  doc.text(title.toUpperCase(), PAGE_W - MARGIN, 28, { align: 'right' })
  doc.text(`Ref: ${refNo}  ·  ${fmtDate(issueDate || new Date())}`, PAGE_W - MARGIN, 39, { align: 'right' })
  doc.setDrawColor(...HAIR); doc.setLineWidth(0.7)
  doc.line(MARGIN, 48, PAGE_W - MARGIN, 48)
  return HEADER_BOTTOM
}

/** Footer applied to every page after the doc is fully built. */
function footerOnAllPages(doc, { palette = 'gold', includeFirst = false } = {}) {
  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    if (!includeFirst && p === 1) continue   // cover pages handle their own footer
    doc.setPage(p)
    doc.setDrawColor(...HAIR); doc.setLineWidth(0.7)
    doc.line(MARGIN, PAGE_H - 56, PAGE_W - MARGIN, PAGE_H - 56)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTE)
    doc.text(`${COMPANY.legal}  ·  ${COMPANY.address1}, ${COMPANY.address2}  ·  ${COMPANY.web}`, MARGIN, PAGE_H - 42)
    doc.text(`Page ${p} of ${total}`, PAGE_W - MARGIN, PAGE_H - 42, { align: 'right' })
    doc.setFontSize(7); doc.setTextColor(180, 170, 150)
    doc.text(`${COMPANY.cin}  ·  ${COMPANY.gst}`, MARGIN, PAGE_H - 30)
    doc.text('System-generated document. No physical signature required.', PAGE_W - MARGIN, PAGE_H - 30, { align: 'right' })

    const c = palette === 'navy' ? NAVY : palette === 'emerald' ? EMERALD : palette === 'ruby' ? RUBY : GOLD
    doc.setFillColor(...c); doc.rect(0, PAGE_H - 4, PAGE_W, 4, 'F')
  }
}

/** Recipient header block (ADDRESSED TO + name + meta + address). */
function recipientBlock(doc, y, employee, style = 'gold') {
  const accent = style === 'navy' ? NAVY : style === 'emerald' ? EMERALD : style === 'ruby' ? RUBY : AMBER
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...accent)
  doc.text('ADDRESSED TO', MARGIN, y); y += 14
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...INK)
  doc.text(employee.name || 'Employee', MARGIN, y); y += 16
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...SLATE)
  const sub = [employee.code, employee.designation, employee.department].filter(Boolean).join('  ·  ')
  if (sub) { doc.text(sub, MARGIN, y); y += 14 }
  if (employee.currentAddress || employee.permanentAddress) {
    doc.setFontSize(9.5); doc.setTextColor(...MUTE)
    const addr = String(employee.currentAddress || employee.permanentAddress)
    const addrLines = doc.splitTextToSize(addr, PAGE_W / 2)
    for (const ln of addrLines) { doc.text(ln, MARGIN, y); y += 12 }
  }
  if (employee.email) {
    doc.setFontSize(9.5); doc.setTextColor(...MUTE)
    doc.text(employee.email, MARGIN, y); y += 12
  }
  return y + 8
}

/** Section heading. label is required. style controls accent palette. */
function sectionHeading(doc, y, label, style = 'gold') {
  // Add visible breathing room ABOVE every section heading.
  y += 14
  const color = style === 'navy' ? NAVY : style === 'emerald' ? EMERALD : style === 'ruby' ? RUBY : AMBER
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...color)
  doc.text(label.toUpperCase(), MARGIN, y)
  doc.setDrawColor(...color); doc.setLineWidth(1.4)
  doc.line(MARGIN, y + 5, MARGIN + 34, y + 5)
  return y + 24
}

/** Sub-heading inside a section, more compact. */
function subHeading(doc, y, label) {
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...INK)
  doc.text(label, MARGIN, y)
  return y + 14
}

/** A numbered clause heading like "1. INTRODUCTION". */
function clauseHeading(doc, y, n, label, style = 'gold') {
  y += 14
  const color = style === 'navy' ? NAVY : style === 'emerald' ? EMERALD : style === 'ruby' ? RUBY : AMBER
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...color)
  doc.text(String(n).padStart(2, '0'), MARGIN, y)
  doc.setTextColor(...INK)
  doc.text(label.toUpperCase(), MARGIN + 26, y)
  doc.setDrawColor(...color); doc.setLineWidth(0.6)
  doc.line(MARGIN + 26, y + 4, PAGE_W - MARGIN, y + 4)
  return y + 22
}

/**
 * Tokenise text containing **bold** spans into segments.
 * "I am **John Doe** of **Foo Co.**" → [
 *   {text:"I am ", bold:false},
 *   {text:"John Doe", bold:true},
 *   {text:" of ", bold:false},
 *   {text:"Foo Co.", bold:true},
 * ]
 */
function tokenizeRich(text) {
  const out = []
  const re = /\*\*([^*]+)\*\*/g
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), bold: false })
    out.push({ text: m[1], bold: true })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last), bold: false })
  return out.length ? out : [{ text: text, bold: false }]
}

/**
 * Word-wrap a rich-text token stream into visual lines that fit within `width`.
 * Each output line is an array of {text, bold} segments.
 */
function wrapRich(doc, tokens, width, size) {
  const lines = [[]]
  const measure = (str, bold) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    return doc.getTextWidth(str)
  }
  let curW = 0
  for (const tok of tokens) {
    // Split token's text into words, preserving the spaces between them.
    const parts = tok.text.split(/(\s+)/) // odd indices are whitespace
    for (const p of parts) {
      if (!p) continue
      const w = measure(p, tok.bold)
      if (curW + w > width && /^\S/.test(p) && lines[lines.length - 1].length) {
        // soft-break before this word
        lines.push([])
        curW = 0
        if (/^\s+$/.test(p)) continue   // skip leading whitespace on new line
      }
      lines[lines.length - 1].push({ text: p, bold: tok.bold, width: w })
      curW += w
    }
  }
  // Strip trailing whitespace segments at end-of-line
  return lines.map(line => {
    while (line.length && /^\s+$/.test(line[line.length - 1].text)) line.pop()
    return line
  })
}

/**
 * Render paragraphs that support inline **bold** markers.
 *   paragraphs(doc, y, [
 *     `Dear **${name}**, your offer for **${role}** is enclosed.`,
 *     `Annual CTC: **${inr(ctc)}**.`,
 *   ])
 *
 * Each ¶ wraps to the body width, supports page-breaks, and renders bold
 * segments using the helvetica-bold font.
 */
function paragraphs(doc, y, paras, opts = {}) {
  const size = opts.size || BODY_SIZE
  const color = opts.color || INK
  const indent = opts.indent || 0
  const lineHeight = size * BODY_LH
  const maxW = PAGE_W - MARGIN * 2 - indent
  doc.setTextColor(...color)
  for (const para of paras) {
    if (!para) continue
    const tokens = tokenizeRich(String(para))
    const lines = wrapRich(doc, tokens, maxW, size)
    for (const line of lines) {
      if (y > PAGE_H - 90) { doc.addPage(); y = HEADER_BOTTOM }
      let x = MARGIN + indent
      for (const seg of line) {
        doc.setFont('helvetica', seg.bold ? 'bold' : 'normal')
        doc.setFontSize(size)
        doc.setTextColor(...color)
        doc.text(seg.text, x, y)
        x += seg.width
      }
      y += lineHeight
    }
    y += PARA_GAP
  }
  return y
}

/** Bullet list with a gold square mark. */
function bullets(doc, y, items, opts = {}) {
  const size = opts.size || BODY_SIZE
  const color = opts.color || INK
  for (const item of items) {
    if (!item) continue
    if (y > PAGE_H - 90) { doc.addPage(); y = 70 }
    doc.setFillColor(...(opts.markColor || GOLD))
    doc.rect(MARGIN, y - 4, 4, 4, 'F')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(size); doc.setTextColor(...color)
    const lines = doc.splitTextToSize(String(item), PAGE_W - MARGIN * 2 - 14)
    for (let i = 0; i < lines.length; i++) {
      doc.text(lines[i], MARGIN + 12, y)
      y += size * BODY_LH
    }
    y += 2
  }
  return y + 6
}

/** Key-value details table; first col=key, second col=value. */
function keyValueTable(doc, y, title, rows, opts = {}) {
  const style = opts.style || 'gold'
  const headBg = style === 'navy' ? [241, 245, 249] : style === 'emerald' ? EMERALD_SOFT : GOLD_SOFT
  const headBorder = style === 'navy' ? NAVY : style === 'emerald' ? EMERALD : GOLD
  const headText = style === 'navy' ? NAVY : style === 'emerald' ? EMERALD : AMBER
  const tableW = PAGE_W - MARGIN * 2
  if (y > PAGE_H - 200) { doc.addPage(); y = 70 }
  if (title) y = sectionHeading(doc, y, title, style)

  doc.setFillColor(...headBg)
  doc.rect(MARGIN, y, tableW, 22, 'F')
  doc.setDrawColor(...headBorder); doc.setLineWidth(0.6)
  doc.rect(MARGIN, y, tableW, 22, 'S')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...headText)
  doc.text('PARTICULARS', MARGIN + 10, y + 14)
  doc.text('DETAILS', MARGIN + tableW / 2 + 10, y + 14)
  y += 22

  const rowH = 20
  const bodyStart = y
  doc.setDrawColor(...HAIR); doc.setLineWidth(0.5)
  for (let i = 0; i < rows.length; i++) {
    const [k, v] = rows[i]
    if (y + rowH > PAGE_H - 70) { doc.addPage(); y = 70 }
    if (i % 2 === 0) { doc.setFillColor(...PAPER); doc.rect(MARGIN, y, tableW, rowH, 'F') }
    doc.line(MARGIN, y + rowH, MARGIN + tableW, y + rowH)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...SLATE)
    doc.text(String(k || ''), MARGIN + 10, y + 13)
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...INK)
    doc.text(String(v == null || v === '' ? '—' : v), MARGIN + tableW / 2 + 10, y + 13)
    y += rowH
  }
  doc.setDrawColor(...HAIR); doc.setLineWidth(0.6)
  doc.rect(MARGIN, bodyStart, tableW, y - bodyStart, 'S')
  return y + 12
}

/** Currency-aligned 2-col table with optional total row. */
function moneyTable(doc, y, title, rows, totalLabel, totalValue, opts = {}) {
  const style = opts.style || 'gold'
  const headBg = style === 'emerald' ? EMERALD_SOFT : style === 'navy' ? [241, 245, 249] : GOLD_SOFT
  const accent = style === 'emerald' ? EMERALD : style === 'navy' ? NAVY : GOLD
  const accentText = style === 'emerald' ? EMERALD : style === 'navy' ? NAVY : AMBER
  const tableW = PAGE_W - MARGIN * 2
  if (y > PAGE_H - 220) { doc.addPage(); y = 70 }
  if (title) y = sectionHeading(doc, y, title, style)

  doc.setFillColor(...headBg)
  doc.rect(MARGIN, y, tableW, 22, 'F')
  doc.setDrawColor(...accent); doc.setLineWidth(0.6)
  doc.rect(MARGIN, y, tableW, 22, 'S')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...accentText)
  doc.text('COMPONENT', MARGIN + 12, y + 14)
  doc.text('AMOUNT (INR)', MARGIN + tableW - 12, y + 14, { align: 'right' })
  y += 22
  const bodyStart = y
  const rowH = 22
  for (let i = 0; i < rows.length; i++) {
    const [k, v, note] = rows[i]
    if (y + rowH > PAGE_H - 70) { doc.addPage(); y = 70 }
    if (i % 2 === 0) { doc.setFillColor(...PAPER); doc.rect(MARGIN, y, tableW, rowH, 'F') }
    doc.setDrawColor(...HAIR); doc.setLineWidth(0.5)
    doc.line(MARGIN, y + rowH, MARGIN + tableW, y + rowH)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...SLATE)
    doc.text(String(k), MARGIN + 12, y + 13)
    if (note) {
      doc.setFontSize(7.5); doc.setTextColor(...MUTE)
      doc.text(String(note), MARGIN + 12, y + 20)
    }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...INK)
    const valStr = (typeof v === 'number' || (typeof v === 'string' && /^[\d-]/.test(v.trim()))) ? inr(v) : String(v)
    doc.text(valStr, MARGIN + tableW - 12, y + 13, { align: 'right' })
    y += rowH
  }
  doc.setDrawColor(...accent); doc.setLineWidth(0.6)
  doc.rect(MARGIN, bodyStart, tableW, y - bodyStart, 'S')
  if (totalLabel != null) {
    doc.setFillColor(...accent); doc.rect(MARGIN, y, tableW, 26, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...INK)
    doc.text(totalLabel.toUpperCase(), MARGIN + 12, y + 17)
    doc.text(inr(totalValue), MARGIN + tableW - 12, y + 17, { align: 'right' })
    y += 26
  }
  return y + 12
}

/** Generic 3-column schedule (e.g. Component | Monthly | Annual). */
function scheduleTable(doc, y, title, headers, rows, opts = {}) {
  const style = opts.style || 'gold'
  const headBg = style === 'emerald' ? EMERALD_SOFT : style === 'navy' ? [241, 245, 249] : GOLD_SOFT
  const accent = style === 'emerald' ? EMERALD : style === 'navy' ? NAVY : GOLD
  const accentText = style === 'emerald' ? EMERALD : style === 'navy' ? NAVY : AMBER
  const tableW = PAGE_W - MARGIN * 2
  const cols = headers.length
  const colW = tableW / cols
  if (y > PAGE_H - 240) { doc.addPage(); y = 70 }
  if (title) y = sectionHeading(doc, y, title, style)

  doc.setFillColor(...headBg)
  doc.rect(MARGIN, y, tableW, 22, 'F')
  doc.setDrawColor(...accent); doc.setLineWidth(0.6)
  doc.rect(MARGIN, y, tableW, 22, 'S')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...accentText)
  for (let c = 0; c < cols; c++) {
    const align = c === 0 ? 'left' : 'right'
    const x = c === 0 ? MARGIN + 12 : MARGIN + (c + 1) * colW - 12
    doc.text(String(headers[c]).toUpperCase(), x, y + 14, { align })
  }
  y += 22
  const bodyStart = y
  const rowH = 22
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (y + rowH > PAGE_H - 70) { doc.addPage(); y = 70 }
    const isTotal = !!row.__total
    if (isTotal) { doc.setFillColor(...accent); doc.rect(MARGIN, y, tableW, rowH, 'F') }
    else if (i % 2 === 0) { doc.setFillColor(...PAPER); doc.rect(MARGIN, y, tableW, rowH, 'F') }
    doc.setDrawColor(...HAIR); doc.setLineWidth(0.5)
    doc.line(MARGIN, y + rowH, MARGIN + tableW, y + rowH)
    for (let c = 0; c < cols; c++) {
      const cell = row.cells ? row.cells[c] : row[c]
      const isMoney = c > 0 && (typeof cell === 'number')
      doc.setFont('helvetica', isTotal || c === 0 ? 'bold' : 'normal')
      doc.setFontSize(9.5); doc.setTextColor(...(isTotal ? INK : c === 0 ? SLATE : INK))
      const align = c === 0 ? 'left' : 'right'
      const x = c === 0 ? MARGIN + 12 : MARGIN + (c + 1) * colW - 12
      const text = cell == null || cell === '' ? '—' : (isMoney ? inrPlain(cell) : String(cell))
      doc.text(text, x, y + 14, { align })
    }
    y += rowH
  }
  doc.setDrawColor(...accent); doc.setLineWidth(0.6)
  doc.rect(MARGIN, bodyStart, tableW, y - bodyStart, 'S')
  return y + 12
}

/** Authorised signatory block + circular HR seal. */
function signatureBlock(doc, y, opts = {}) {
  if (y > PAGE_H - 180) { doc.addPage(); y = 80 }
  y += 28
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...INK)
  doc.text(opts.salutation || 'Yours sincerely,', MARGIN, y)
  y += 60
  doc.setDrawColor(...INK); doc.setLineWidth(0.9)
  doc.line(MARGIN, y, MARGIN + 180, y)
  y += 14
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...INK)
  doc.text(opts.title || 'Authorised Signatory', MARGIN, y)
  y += 13
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTE)
  doc.text(`${COMPANY.name}  ·  Human Resources`, MARGIN, y)
  // HR seal (decorative)
  const sx = PAGE_W - MARGIN - 60
  const sy = y - 30
  doc.setDrawColor(...GOLD); doc.setLineWidth(1.4)
  doc.circle(sx, sy, 28, 'S')
  doc.setLineDashPattern([2, 2], 0)
  doc.circle(sx, sy, 22, 'S')
  doc.setLineDashPattern([], 0)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...AMBER)
  doc.text(COMPANY.name.toUpperCase(), sx, sy - 3, { align: 'center' })
  doc.setFontSize(6.5); doc.setTextColor(...MUTE)
  doc.text(opts.sealText || 'HR · VERIFIED', sx, sy + 6, { align: 'center' })
  return y
}

/** Counter-signature dual block (employee + employer). */
function dualSignature(doc, y, employee) {
  if (y > PAGE_H - 220) { doc.addPage(); y = 80 }
  y += 30
  const colW = (PAGE_W - MARGIN * 2 - 40) / 2
  // Left: Employer
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...AMBER)
  doc.text('FOR THE COMPANY', MARGIN, y)
  y += 50
  doc.setDrawColor(...INK); doc.setLineWidth(0.9)
  doc.line(MARGIN, y, MARGIN + colW, y)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...INK)
  doc.text('Authorised Signatory', MARGIN, y + 14)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTE)
  doc.text(COMPANY.legal, MARGIN, y + 26)
  doc.text(`Place: Hyderabad  ·  Date: ${fmtDate(new Date())}`, MARGIN, y + 38)
  // Right: Employee
  const x2 = MARGIN + colW + 40
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...AMBER)
  doc.text('ACCEPTED & AGREED', x2, y - 50)
  doc.setDrawColor(...INK); doc.setLineWidth(0.9)
  doc.line(x2, y, x2 + colW, y)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...INK)
  doc.text(employee.name || 'Employee', x2, y + 14)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTE)
  doc.text(`${employee.code || ''}${employee.code ? '  ·  ' : ''}Employee`, x2, y + 26)
  doc.text(`Place: _______________  ·  Date: ____________`, x2, y + 38)
  return y + 60
}

/** Decorative "TO WHOM IT MAY CONCERN" header. */
function tomicHeader(doc, y) {
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...INK)
  doc.text('TO WHOM IT MAY CONCERN', PAGE_W / 2, y, { align: 'center' })
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.8)
  const lineW = 60
  doc.line(PAGE_W / 2 - lineW - 8, y + 5, PAGE_W / 2 - 8, y + 5)
  doc.line(PAGE_W / 2 + 8, y + 5, PAGE_W / 2 + lineW + 8, y + 5)
  doc.setFillColor(...GOLD)
  doc.triangle(PAGE_W / 2 - 4, y + 5, PAGE_W / 2 + 4, y + 5, PAGE_W / 2, y + 1, 'F')
  doc.triangle(PAGE_W / 2 - 4, y + 5, PAGE_W / 2 + 4, y + 5, PAGE_W / 2, y + 9, 'F')
  return y + 26
}

/** A clean paragraph card (gold-soft background) for emphasis quotes. */
function calloutBox(doc, y, text, opts = {}) {
  const tone = opts.tone || 'gold'
  const bg = tone === 'emerald' ? EMERALD_SOFT : tone === 'ruby' ? RUBY_SOFT : GOLD_SOFT
  const bd = tone === 'emerald' ? EMERALD : tone === 'ruby' ? RUBY : GOLD
  const w = PAGE_W - MARGIN * 2
  doc.setFont('helvetica', 'italic'); doc.setFontSize(10); doc.setTextColor(...INK)
  const lines = doc.splitTextToSize(text, w - 24)
  const h = lines.length * (10 * BODY_LH) + 18
  if (y + h > PAGE_H - 80) { doc.addPage(); y = 70 }
  doc.setFillColor(...bg); doc.roundedRect(MARGIN, y, w, h, 4, 4, 'F')
  doc.setDrawColor(...bd); doc.setLineWidth(0.6)
  doc.roundedRect(MARGIN, y, w, h, 4, 4, 'S')
  // Left rail
  doc.setFillColor(...bd); doc.rect(MARGIN, y, 3, h, 'F')
  let ty = y + 14
  for (const ln of lines) { doc.text(ln, MARGIN + 14, ty); ty += 10 * BODY_LH }
  return y + h + 10
}

// ─── COVER PAGE BUILDERS (distinct per letter type) ─────────────────────────

/** Premium gold-foil cover (used by Experience + Salary Certificate). */
function coverGold(doc, { title, subtitle, employee, refNo, issueDate }) {
  // Background wash
  doc.setFillColor(255, 252, 245)
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F')
  drawGoldBand(doc, 0, 10)

  // Twin gold rules on each margin
  doc.setDrawColor(...GOLD); doc.setLineWidth(2)
  doc.line(36, 30, 36, PAGE_H - 30)
  doc.line(PAGE_W - 36, 30, PAGE_W - 36, PAGE_H - 30)
  doc.setLineWidth(0.5)
  doc.line(42, 36, 42, PAGE_H - 36)
  doc.line(PAGE_W - 42, 36, PAGE_W - 42, PAGE_H - 36)

  // Inner card
  const cx = PAGE_W / 2
  doc.setDrawColor(...GOLD); doc.setLineWidth(1.2)
  doc.roundedRect(80, 180, PAGE_W - 160, 380, 6, 6, 'S')

  // Company crest
  doc.setFillColor(...GOLD)
  doc.circle(cx, 230, 26, 'F')
  doc.setFillColor(...PAPER)
  doc.circle(cx, 230, 19, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...AMBER)
  doc.text('F', cx, 235, { align: 'center' })

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTE)
  doc.text(COMPANY.legal.toUpperCase(), cx, 272, { align: 'center' })

  // Auto-fit the title — shrink font size until it fits the inner card width.
  const titleText = title.toUpperCase()
  const titleMaxW = PAGE_W - 160 - 40   // inner card width minus padding
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...INK)
  let titleSize = 34
  doc.setFontSize(titleSize)
  while (doc.getTextWidth(titleText) + (titleText.length * 1.5) > titleMaxW && titleSize > 18) {
    titleSize -= 1
    doc.setFontSize(titleSize)
  }
  doc.text(titleText, cx, 320, { align: 'center', charSpace: 1.5 })
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.8)
  doc.line(cx - 50, 330, cx + 50, 330)
  if (subtitle) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(...MUTE)
    doc.text(subtitle, cx, 352, { align: 'center' })
  }

  // Issued to
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...AMBER)
  doc.text('ISSUED IN THE NAME OF', cx, 410, { align: 'center' })
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(...INK)
  doc.text(employee.name || 'Employee', cx, 438, { align: 'center' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...SLATE)
  const sub = [employee.code, employee.designation, employee.department].filter(Boolean).join('  ·  ')
  if (sub) doc.text(sub, cx, 458, { align: 'center' })

  // Meta block
  doc.setDrawColor(...HAIR); doc.setLineWidth(0.6)
  doc.line(120, 510, PAGE_W - 120, 510)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...AMBER)
  doc.text('REFERENCE NO.', 140, 530)
  doc.text('DATE OF ISSUE', PAGE_W - 140, 530, { align: 'right' })
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...INK)
  doc.text(refNo, 140, 545)
  doc.text(fmtDate(issueDate || new Date()), PAGE_W - 140, 545, { align: 'right' })

  // Bottom legend
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTE)
  doc.text(`This is an official document of ${COMPANY.legal}.`, cx, PAGE_H - 60, { align: 'center' })
  doc.text('Forgery or unauthorised reproduction is a punishable offence.', cx, PAGE_H - 48, { align: 'center' })
  drawBottomBand(doc)
}

/** Editorial minimal cover (Relieving Letter). */
function coverEditorial(doc, { title, subtitle, employee, refNo, issueDate }) {
  doc.setFillColor(252, 250, 247); doc.rect(0, 0, PAGE_W, PAGE_H, 'F')
  // Tiny brand mark top-left
  doc.setFillColor(...INK); doc.rect(MARGIN, MARGIN, 18, 18, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...PAPER)
  doc.text('F', MARGIN + 9, MARGIN + 12, { align: 'center' })
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...INK)
  doc.text(COMPANY.name, MARGIN + 26, MARGIN + 12)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTE)
  doc.text(COMPANY.legal.toUpperCase(), MARGIN + 26, MARGIN + 22)

  // Right-aligned vertical type label
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...AMBER)
  doc.text('OFFICIAL DOCUMENT', PAGE_W - MARGIN, MARGIN + 12, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTE)
  doc.text(`Ref: ${refNo}  ·  ${fmtDate(issueDate || new Date())}`, PAGE_W - MARGIN, MARGIN + 22, { align: 'right' })

  // Huge editorial title — auto-fit each line.
  const w0 = title.split(' ')[0].toUpperCase()
  const w1 = (title.split(' ').slice(1).join(' ') || '').toUpperCase()
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...INK)
  const maxTW = PAGE_W - MARGIN * 2
  let tsize = 56
  doc.setFontSize(tsize)
  while ((doc.getTextWidth(w0) > maxTW || (w1 && doc.getTextWidth(w1) > maxTW)) && tsize > 24) {
    tsize -= 2
    doc.setFontSize(tsize)
  }
  doc.text(w0, MARGIN, 280)
  if (w1) doc.text(w1, MARGIN, 280 + tsize + 4)
  // Long gold underline
  doc.setDrawColor(...GOLD); doc.setLineWidth(3)
  doc.line(MARGIN, 360, MARGIN + 220, 360)

  if (subtitle) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(12); doc.setTextColor(...SLATE)
    doc.text(subtitle, MARGIN, 388)
  }

  // Big employee name
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...AMBER)
  doc.text('ISSUED TO', MARGIN, 470)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(24); doc.setTextColor(...INK)
  doc.text(employee.name || 'Employee', MARGIN, 498)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...SLATE)
  const sub = [employee.code, employee.designation, employee.department].filter(Boolean).join('  ·  ')
  if (sub) doc.text(sub, MARGIN, 516)

  // Decorative grid lines bottom-right
  const gx = PAGE_W - MARGIN - 90
  for (let i = 0; i < 8; i++) {
    doc.setDrawColor(...GOLD); doc.setLineWidth(0.4)
    doc.line(gx + i * 11, PAGE_H - 200, gx + i * 11, PAGE_H - 100)
  }

  // Footer band
  doc.setDrawColor(...HAIR); doc.setLineWidth(0.7)
  doc.line(MARGIN, PAGE_H - 70, PAGE_W - MARGIN, PAGE_H - 70)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTE)
  doc.text(`${COMPANY.address1}, ${COMPANY.address2}  ·  ${COMPANY.email}  ·  ${COMPANY.web}`, MARGIN, PAGE_H - 56)
  doc.text('Page 1', PAGE_W - MARGIN, PAGE_H - 56, { align: 'right' })
}

/** Celebratory emerald-gold cover (Confirmation Letter). */
function coverEmerald(doc, { title, subtitle, employee, refNo, issueDate }) {
  doc.setFillColor(247, 254, 248); doc.rect(0, 0, PAGE_W, PAGE_H, 'F')
  doc.setFillColor(...EMERALD); doc.rect(0, 0, PAGE_W, 14, 'F')
  doc.setFillColor(...GOLD); doc.rect(0, 14, PAGE_W, 3, 'F')

  // Wreath laurels
  doc.setDrawColor(...EMERALD); doc.setLineWidth(2)
  const cx = PAGE_W / 2
  for (let i = -45; i <= 45; i += 10) {
    const rad = (i * Math.PI) / 180
    const x = cx + Math.cos(rad) * 90
    const y = 220 + Math.sin(rad) * 60
    doc.circle(x, y, 4, 'S')
  }
  // Centre seal
  doc.setFillColor(...GOLD); doc.circle(cx, 230, 32, 'F')
  doc.setFillColor(255, 252, 245); doc.circle(cx, 230, 24, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...EMERALD)
  doc.text('CONFIRMED', cx, 234, { align: 'center' })

  doc.setFont('helvetica', 'bold'); doc.setFontSize(34); doc.setTextColor(...INK)
  doc.text(title.toUpperCase(), cx, 320, { align: 'center', charSpace: 1.2 })
  doc.setDrawColor(...EMERALD); doc.setLineWidth(0.8)
  doc.line(cx - 50, 330, cx + 50, 330)

  if (subtitle) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(...SLATE)
    doc.text(subtitle, cx, 350, { align: 'center' })
  }

  // Issued to
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...EMERALD)
  doc.text('CONGRATULATIONS,', cx, 410, { align: 'center' })
  doc.setFont('helvetica', 'bold'); doc.setFontSize(28); doc.setTextColor(...INK)
  doc.text(employee.name || 'Employee', cx, 444, { align: 'center' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...SLATE)
  const sub = [employee.code, employee.designation, employee.department].filter(Boolean).join('  ·  ')
  if (sub) doc.text(sub, cx, 462, { align: 'center' })

  // Ref + date strip
  doc.setDrawColor(...HAIR); doc.setLineWidth(0.6)
  doc.line(120, 510, PAGE_W - 120, 510)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...EMERALD)
  doc.text('REFERENCE', 140, 530); doc.text('DATE OF ISSUE', PAGE_W - 140, 530, { align: 'right' })
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...INK)
  doc.text(refNo, 140, 545)
  doc.text(fmtDate(issueDate || new Date()), PAGE_W - 140, 545, { align: 'right' })

  doc.setFont('helvetica', 'italic'); doc.setFontSize(10); doc.setTextColor(...MUTE)
  doc.text('A milestone worth celebrating.', cx, 600, { align: 'center' })

  doc.setFillColor(...EMERALD); doc.rect(0, PAGE_H - 14, PAGE_W, 14, 'F')
  doc.setFillColor(...GOLD); doc.rect(0, PAGE_H - 17, PAGE_W, 3, 'F')
}

/** Premium dark cover (Appointment Letter). */
function coverDark(doc, { title, subtitle, employee, refNo, issueDate }) {
  // Full dark background
  doc.setFillColor(...INK); doc.rect(0, 0, PAGE_W, PAGE_H, 'F')
  doc.setFillColor(...GOLD); doc.rect(0, 0, PAGE_W, 14, 'F')
  doc.setFillColor(...AMBER); doc.rect(0, 14, PAGE_W, 1.5, 'F')

  // Brand wordmark
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(...GOLD)
  doc.text(COMPANY.name.toUpperCase(), MARGIN, 60)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(255, 240, 200)
  doc.text(COMPANY.legal.toUpperCase(), MARGIN, 76)

  // Gold deco grid
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.4)
  for (let i = 0; i < 12; i++) {
    doc.line(PAGE_W - MARGIN - 110 + i * 10, 60, PAGE_W - MARGIN - 110 + i * 10, 78)
  }

  // Massive type
  doc.setFont('helvetica', 'bold'); doc.setFontSize(52); doc.setTextColor(...PAPER)
  doc.text(title.toUpperCase(), MARGIN, 280)
  doc.setDrawColor(...GOLD); doc.setLineWidth(3)
  doc.line(MARGIN, 300, MARGIN + 110, 300)

  if (subtitle) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(14); doc.setTextColor(255, 230, 180)
    const sub = doc.splitTextToSize(subtitle, PAGE_W - MARGIN * 2 - 40)
    let sy = 330
    for (const ln of sub) { doc.text(ln, MARGIN, sy); sy += 18 }
  }

  // Recipient card on dark
  doc.setFillColor(40, 32, 24)
  doc.roundedRect(MARGIN, 460, PAGE_W - MARGIN * 2, 110, 4, 4, 'F')
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.6)
  doc.roundedRect(MARGIN, 460, PAGE_W - MARGIN * 2, 110, 4, 4, 'S')
  doc.setFillColor(...GOLD); doc.rect(MARGIN, 460, 4, 110, 'F')
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GOLD)
  doc.text('THIS LETTER IS ADDRESSED TO', MARGIN + 18, 482)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(...PAPER)
  doc.text(employee.name || 'Candidate', MARGIN + 18, 508)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(255, 230, 180)
  const sub = [employee.code, employee.designation, employee.department].filter(Boolean).join('  ·  ')
  if (sub) doc.text(sub, MARGIN + 18, 526)
  if (employee.email) doc.text(employee.email, MARGIN + 18, 540)

  // Bottom meta bar
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.6)
  doc.line(MARGIN, PAGE_H - 90, PAGE_W - MARGIN, PAGE_H - 90)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GOLD)
  doc.text('REFERENCE', MARGIN, PAGE_H - 70)
  doc.text('DATE OF ISSUE', PAGE_W / 2, PAGE_H - 70, { align: 'center' })
  doc.text('VALIDITY', PAGE_W - MARGIN, PAGE_H - 70, { align: 'right' })
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...PAPER)
  doc.text(refNo, MARGIN, PAGE_H - 54)
  doc.text(fmtDate(issueDate || new Date()), PAGE_W / 2, PAGE_H - 54, { align: 'center' })
  doc.text('Until counter-signed', PAGE_W - MARGIN, PAGE_H - 54, { align: 'right' })

  doc.setFillColor(...GOLD); doc.rect(0, PAGE_H - 4, PAGE_W, 4, 'F')
}

/** Luxury cover (Offer Letter). */
function coverLuxury(doc, { title, subtitle, employee, refNo, issueDate }) {
  doc.setFillColor(255, 252, 246); doc.rect(0, 0, PAGE_W, PAGE_H, 'F')
  drawGoldBand(doc, 0, 10)
  // Side gold rules
  doc.setDrawColor(...GOLD); doc.setLineWidth(2)
  doc.line(28, 30, 28, PAGE_H - 30)

  // Brand identity strip
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...INK)
  doc.text(COMPANY.name, MARGIN, 50)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTE)
  doc.text(COMPANY.legal.toUpperCase(), MARGIN, 62)

  // Ribbon top-right
  doc.setFillColor(...GOLD_SOFT)
  doc.roundedRect(PAGE_W - MARGIN - 160, 42, 160, 30, 3, 3, 'F')
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.6)
  doc.roundedRect(PAGE_W - MARGIN - 160, 42, 160, 30, 3, 3, 'S')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...AMBER)
  doc.text('CONFIDENTIAL OFFER', PAGE_W - MARGIN - 80, 60, { align: 'center' })

  // Hero title
  const cx = PAGE_W / 2
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(...AMBER)
  doc.text('WELCOME TO', cx, 220, { align: 'center', charSpace: 4 })
  doc.setFont('helvetica', 'bold'); doc.setFontSize(60); doc.setTextColor(...INK)
  doc.text(COMPANY.name.toUpperCase(), cx, 268, { align: 'center', charSpace: 2 })
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.7)
  doc.line(cx - 90, 290, cx + 90, 290)
  doc.setFont('helvetica', 'italic'); doc.setFontSize(13); doc.setTextColor(...SLATE)
  doc.text('Where craftsmanship meets ambition.', cx, 312, { align: 'center' })

  // Document type
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(...AMBER)
  doc.text(title.toUpperCase(), cx, 380, { align: 'center', charSpace: 1.5 })

  // Recipient
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTE)
  doc.text('PRESENTED EXCLUSIVELY TO', cx, 430, { align: 'center', charSpace: 1.5 })
  doc.setFont('helvetica', 'bold'); doc.setFontSize(28); doc.setTextColor(...INK)
  doc.text(employee.name || 'Candidate', cx, 462, { align: 'center' })
  if (employee.designation) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(12); doc.setTextColor(...SLATE)
    doc.text(`FOR THE ROLE OF`, cx, 484, { align: 'center', charSpace: 2 })
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...AMBER)
    doc.text(employee.designation, cx, 502, { align: 'center' })
  }

  // Meta footer card
  doc.setFillColor(...PAPER)
  doc.roundedRect(MARGIN + 40, 580, PAGE_W - MARGIN * 2 - 80, 88, 4, 4, 'F')
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.6)
  doc.roundedRect(MARGIN + 40, 580, PAGE_W - MARGIN * 2 - 80, 88, 4, 4, 'S')
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...AMBER)
  doc.text('REFERENCE', MARGIN + 60, 604)
  doc.text('DATE OF ISSUE', cx, 604, { align: 'center' })
  doc.text('SIGNATORY', PAGE_W - MARGIN - 60, 604, { align: 'right' })
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...INK)
  doc.text(refNo, MARGIN + 60, 622)
  doc.text(fmtDate(issueDate || new Date()), cx, 622, { align: 'center' })
  doc.text('Head of People', PAGE_W - MARGIN - 60, 622, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTE)
  doc.text('A formal, time-bound proposition of employment.', cx, 650, { align: 'center' })

  drawBottomBand(doc)
}

/** Confidential/legal cover (NDA). */
function coverConfidential(doc, { title, subtitle, employee, refNo, issueDate, companyName, companyAddr }) {
  const coLegal = companyName || COMPANY.legal
  const coAddr  = companyAddr || `${COMPANY.address1}, ${COMPANY.address2}`
  doc.setFillColor(...PAPER); doc.rect(0, 0, PAGE_W, PAGE_H, 'F')
  // Ruby strap
  doc.setFillColor(...RUBY); doc.rect(0, 0, PAGE_W, 14, 'F')
  doc.setFillColor(...INK); doc.rect(0, 14, PAGE_W, 2, 'F')

  // Side stamp
  doc.setDrawColor(...RUBY); doc.setLineWidth(2)
  doc.rect(MARGIN, 56, 60, 60, 'S')
  doc.setLineDashPattern([2, 2], 0)
  doc.rect(MARGIN + 4, 60, 52, 52, 'S')
  doc.setLineDashPattern([], 0)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...RUBY)
  doc.text('LEGAL', MARGIN + 30, 80, { align: 'center' })
  doc.text('CONFIDENTIAL', MARGIN + 30, 90, { align: 'center' })
  doc.setFontSize(6); doc.setTextColor(...MUTE)
  doc.text('CLASS A · INTERNAL', MARGIN + 30, 102, { align: 'center' })

  // Brand
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...INK)
  doc.text(coLegal, MARGIN + 80, 72)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTE)
  // Wrap the address so multi-line user input renders cleanly in the header.
  const addrLines = doc.splitTextToSize(coAddr, PAGE_W - (MARGIN + 80) - MARGIN)
  let ay = 86
  for (let i = 0; i < Math.min(addrLines.length, 2); i++) { doc.text(addrLines[i], MARGIN + 80, ay); ay += 10 }
  doc.text(`${COMPANY.cin}  ·  ${COMPANY.email}`, MARGIN + 80, Math.max(98, ay + 2))

  // Hero
  const cx = PAGE_W / 2
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...RUBY)
  doc.text('LEGAL INSTRUMENT', cx, 200, { align: 'center', charSpace: 4 })
  doc.setFont('helvetica', 'bold'); doc.setFontSize(40); doc.setTextColor(...INK)
  doc.text('NON-DISCLOSURE', cx, 250, { align: 'center', charSpace: 1.5 })
  doc.text('AGREEMENT', cx, 296, { align: 'center', charSpace: 1.5 })
  doc.setDrawColor(...RUBY); doc.setLineWidth(2)
  doc.line(cx - 120, 314, cx + 120, 314)
  doc.setFont('helvetica', 'italic'); doc.setFontSize(11); doc.setTextColor(...SLATE)
  doc.text('Mutual covenant of confidentiality between the parties named below.', cx, 336, { align: 'center' })

  // Parties block
  const blockY = 396
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...AMBER)
  doc.text('DISCLOSING PARTY', MARGIN, blockY)
  doc.text('RECEIVING PARTY', PAGE_W - MARGIN, blockY, { align: 'right' })
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...INK)
  doc.text(coLegal, MARGIN, blockY + 22)
  doc.text(employee.name || 'Recipient', PAGE_W - MARGIN, blockY + 22, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTE)
  doc.text('a company incorporated under', MARGIN, blockY + 38)
  doc.text('the laws of India', MARGIN, blockY + 50)
  if (employee.code) doc.text(`Employee Code: ${employee.code}`, PAGE_W - MARGIN, blockY + 38, { align: 'right' })
  if (employee.designation) doc.text(employee.designation, PAGE_W - MARGIN, blockY + 50, { align: 'right' })

  // Meta strip
  doc.setDrawColor(...HAIR); doc.setLineWidth(0.6)
  doc.line(MARGIN, blockY + 92, PAGE_W - MARGIN, blockY + 92)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...RUBY)
  doc.text('DOCUMENT ID', MARGIN, blockY + 110)
  doc.text('EXECUTED ON', PAGE_W - MARGIN, blockY + 110, { align: 'right' })
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...INK)
  doc.text(refNo, MARGIN, blockY + 128)
  doc.text(fmtDate(issueDate || new Date()), PAGE_W - MARGIN, blockY + 128, { align: 'right' })

  // Notice
  doc.setFillColor(...RUBY_SOFT)
  doc.roundedRect(MARGIN, PAGE_H - 130, PAGE_W - MARGIN * 2, 60, 4, 4, 'F')
  doc.setDrawColor(...RUBY); doc.setLineWidth(0.6)
  doc.roundedRect(MARGIN, PAGE_H - 130, PAGE_W - MARGIN * 2, 60, 4, 4, 'S')
  doc.setFillColor(...RUBY); doc.rect(MARGIN, PAGE_H - 130, 4, 60, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...RUBY)
  doc.text('NOTICE', MARGIN + 14, PAGE_H - 113)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...INK)
  const notice = doc.splitTextToSize(
    'This document contains terms that bind both parties. It should be reviewed in full prior to execution. Each party affirms by their signature that they have read, understood and agreed to all provisions herein.',
    PAGE_W - MARGIN * 2 - 28,
  )
  let ny = PAGE_H - 100
  for (const ln of notice) { doc.text(ln, MARGIN + 14, ny); ny += 11 }

  doc.setFillColor(...RUBY); doc.rect(0, PAGE_H - 4, PAGE_W, 4, 'F')
}

// ─── Indian salary structure helpers ────────────────────────────────────────

/**
 * Derive a typical Indian salary structure from an annual CTC.
 * Components: Basic (50%), HRA (40% of Basic), Special Allowance (residual),
 *             Employer PF (12% of Basic capped at 21,600/yr), Gratuity (4.81% Basic),
 *             Employee PF deduction (12% of Basic, mirror), Professional Tax (₹2,500/yr).
 *
 * Returned values are ANNUAL unless explicitly noted.
 */
export function deriveSalaryStructure(annualCtc = 0) {
  const ctc = Number(annualCtc) || 0
  if (ctc <= 0) return null
  const basic = Math.round(ctc * 0.50)
  const hra = Math.round(basic * 0.40)
  const ePfEmployer = Math.min(Math.round(basic * 0.12), 21600)
  const gratuity = Math.round(basic * 0.0481)
  const fixedAllowances = Math.max(0, ctc - (basic + hra + ePfEmployer + gratuity))
  const special = Math.round(fixedAllowances * 0.7)
  const conveyance = Math.min(19200, Math.round(fixedAllowances * 0.1))
  const medical = Math.min(15000, Math.round(fixedAllowances * 0.08))
  const lta = Math.min(50000, Math.round(fixedAllowances * 0.07))
  const telephone = Math.min(18000, Math.round(fixedAllowances * 0.03))
  const food = Math.min(26400, Math.round(fixedAllowances * 0.02))

  const gross = basic + hra + special + conveyance + medical + lta + telephone + food
  const ePfEmployee = ePfEmployer
  const profTax = 2500
  const netAnnual = gross - ePfEmployee - profTax
  return {
    annualCtc: ctc,
    basic, hra, special, conveyance, medical, lta, telephone, food,
    gross, employerPf: ePfEmployer, gratuity,
    employeePf: ePfEmployee, profTax,
    netAnnual,
    monthly: {
      basic: Math.round(basic / 12),
      hra: Math.round(hra / 12),
      special: Math.round(special / 12),
      conveyance: Math.round(conveyance / 12),
      medical: Math.round(medical / 12),
      lta: Math.round(lta / 12),
      telephone: Math.round(telephone / 12),
      food: Math.round(food / 12),
      gross: Math.round(gross / 12),
      employerPf: Math.round(ePfEmployer / 12),
      gratuity: Math.round(gratuity / 12),
      employeePf: Math.round(ePfEmployee / 12),
      profTax: Math.round(profTax / 12),
      net: Math.round(netAnnual / 12),
    },
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 1. EXPERIENCE LETTER  ·  classic gold-foil certificate (4-6 pages)
// ════════════════════════════════════════════════════════════════════════════

export function generateExperienceLetterPdf({ employee = {}, extraBody = '', issueDate, lastWorkingDate } = {}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const refNo = refNumber('FRR/EXP', employee.code)
  const meta = { title: 'Experience Letter', refNo, issueDate, palette: 'gold' }

  // Cover
  coverGold(doc, { title: 'Experience Certificate', subtitle: 'Certified statement of employment & service', employee, refNo, issueDate })

  // Body page — certification
  doc.addPage()
  let y = pageHeader(doc, meta)
  y = tomicHeader(doc, y) + 8
  y = paragraphs(doc, y, [
    `This is to certify that **${employee.name || 'the employee'}** (Employee ID: **${employee.code || '—'}**) has been a valued member of **${COMPANY.legal}** (hereinafter, "the Company"), having served in the capacity of **${employee.designation || '—'}** within the **${employee.department || '—'}** department from **${fmtDate(employee.joiningDate) || '—'}**${lastWorkingDate ? ` until **${fmtDate(lastWorkingDate)}**` : ' till date'}.`,
    `Over the course of this tenure, ${firstName(employee.name)} has consistently demonstrated a high level of commitment, technical competence, professional conduct, and the ability to work effectively in collaborative environments. ${pronoun(employee.gender, 'possessive').charAt(0).toUpperCase() + pronoun(employee.gender, 'possessive').slice(1)} contributions have been well regarded by peers, leadership and stakeholders alike.`,
    `Throughout the engagement, ${firstName(employee.name)} adhered to the Company's policies, code of conduct and confidentiality commitments, and consistently upheld the standards of integrity expected of every member of our organisation.`,
  ])

  y = sectionHeading(doc, y, 'Key Responsibilities Discharged')
  y = bullets(doc, y, [
    `Delivery of assigned engagements in the ${employee.department || 'core business'} function in line with quality, timeline, and budget commitments.`,
    `Cross-functional collaboration with internal teams and external stakeholders, with regular reporting and clear documentation.`,
    `Adherence to the Company's information-security, confidentiality and ethical conduct standards as set out in the Employee Handbook.`,
    `Mentoring of junior colleagues and active participation in team-development initiatives where applicable.`,
    `Periodic performance review participation and the agreement of personal development goals.`,
  ])
  if (isProse(extraBody)) y = paragraphs(doc, y, [extraBody])

  // Tenure & status page
  doc.addPage(); y = pageHeader(doc, meta)
  y = keyValueTable(doc, y, 'Employment Snapshot', [
    ['Employee Name', employee.name || '—'],
    ['Employee ID', employee.code || '—'],
    ['Designation', employee.designation || '—'],
    ['Department', employee.department || '—'],
    ['Employment Type', (employee.employmentType || 'Full-time').replace(/_/g, ' ')],
    ['Date of Joining', fmtDate(employee.joiningDate) || '—'],
    ['Last Working Day', fmtDate(lastWorkingDate) || 'Currently Employed'],
    ['Work Location', employee.workLocation || COMPANY.address1],
    ['Reporting Manager', employee.reportingManager || '—'],
  ])

  y = sectionHeading(doc, y, 'Conduct & Integrity')
  y = paragraphs(doc, y, [
    `During ${pronoun(employee.gender, 'possessive')} tenure with the Company, ${firstName(employee.name)} was found to be honest, diligent and professional in conduct. No disciplinary proceedings have been initiated, and all obligations under the employment terms have been duly discharged.`,
    `Confidentiality and intellectual-property undertakings provided by ${firstName(employee.name)} continue to survive the period of employment in accordance with the executed employment agreement.`,
  ])

  // Acknowledgement & signature page
  doc.addPage(); y = pageHeader(doc, meta)
  y = calloutBox(doc, y, `We hereby certify that the foregoing particulars are true and accurate to the best of our knowledge. ${COMPANY.legal} wishes ${firstName(employee.name)} the very best in all future professional endeavours.`)
  y = sectionHeading(doc, y, 'Verification')
  y = paragraphs(doc, y, [
    `This experience certificate is digitally generated and bears the seal of the Human Resources function of ${COMPANY.legal}. For verification or any clarification on the contents of this letter, please write to ${COMPANY.email} quoting the reference number printed on the cover page.`,
  ])
  signatureBlock(doc, y, { title: 'Head of People', sealText: 'HR · VERIFIED' })

  footerOnAllPages(doc, { palette: 'gold' })
  return doc
}

// ════════════════════════════════════════════════════════════════════════════
// 2. RELIEVING LETTER  ·  editorial minimal (5-8 pages)
// ════════════════════════════════════════════════════════════════════════════

export function generateRelievingLetterPdf({ employee = {}, resignationDate, lastWorkingDate, issueDate, extraBody = '' } = {}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const refNo = refNumber('FRR/REL', employee.code)
  const meta = { title: 'Relieving Letter', refNo, issueDate, palette: 'gold' }

  // Cover
  coverEditorial(doc, { title: 'Relieving Letter', subtitle: 'Formal acknowledgement of separation and full & final settlement.', employee, refNo, issueDate })

  // Page 2 — addressed letter
  doc.addPage(); let y = pageHeader(doc, meta)
  // Addressed-to block at top with proper breathing room
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...AMBER)
  doc.text('ADDRESSED TO', MARGIN, y); y += 14
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...INK)
  doc.text(employee.name || 'Employee', MARGIN, y); y += 16
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...SLATE)
  const addrSub = [employee.code, employee.designation, employee.department].filter(Boolean).join('  ·  ')
  if (addrSub) { doc.text(addrSub, MARGIN, y); y += 14 }
  if (employee.currentAddress || employee.permanentAddress) {
    doc.setFontSize(9.5); doc.setTextColor(...MUTE)
    const addr = String(employee.currentAddress || employee.permanentAddress)
    const addrLines = doc.splitTextToSize(addr, PAGE_W / 2)
    for (const ln of addrLines) { doc.text(ln, MARGIN, y); y += 12 }
  }
  if (employee.email) {
    doc.setFontSize(9.5); doc.setTextColor(...MUTE)
    doc.text(employee.email, MARGIN, y); y += 12
  }
  y += 18  // visible gap before salutation
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(...INK)
  doc.text(`Dear ${firstName(employee.name)},`, MARGIN, y); y += 24
  y = paragraphs(doc, y, [
    `This letter is issued with reference to your resignation dated **${fmtDate(resignationDate) || '—'}** from the position of **${employee.designation || '—'}** in the **${employee.department || '—'}** department of **${COMPANY.legal}**.`,
    `We hereby confirm that you have been relieved of your duties and responsibilities at ${COMPANY.legal} with effect from the close of business hours on **${fmtDate(lastWorkingDate) || '—'}**. Your association with the Company stands amicably concluded as of the said date.`,
    `Your full and final settlement, including any pending salary, encashment of accrued and unutilised leave, statutory dues, and any other reimbursements, has been processed in accordance with the Company's policies. A formal settlement statement is available on request from the Payroll team.`,
  ])

  // Page 3 — separation summary
  y = keyValueTable(doc, y, 'Separation Summary', [
    ['Employee Name', employee.name || '—'],
    ['Employee ID', employee.code || '—'],
    ['Designation', employee.designation || '—'],
    ['Department', employee.department || '—'],
    ['Date of Joining', fmtDate(employee.joiningDate) || '—'],
    ['Resignation Submitted', fmtDate(resignationDate) || '—'],
    ['Last Working Day', fmtDate(lastWorkingDate) || '—'],
    ['Reason for Separation', employee.exitReason || 'Voluntary resignation'],
    ['Settlement Status', 'Cleared in full'],
  ])

  // Page 4 — clearances + obligations
  doc.addPage(); y = pageHeader(doc, meta)
  y = sectionHeading(doc, y, 'Departmental Clearances')
  y = bullets(doc, y, [
    `Information Technology — Company laptop, peripherals, software licences and access credentials returned.`,
    `Administration & Facilities — Access card, identity card, parking pass and any allocated workplace assets returned.`,
    `Library & Knowledge — Books, training materials, internal publications returned where applicable.`,
    `Finance & Reimbursements — Pending claims either submitted or formally waived.`,
    `Human Resources — Exit interview completed and documents acknowledged.`,
  ])
  y = sectionHeading(doc, y, 'Surviving Obligations')
  y = paragraphs(doc, y, [
    `Notwithstanding the cessation of employment, the following obligations from your employment agreement continue to apply: (a) confidentiality and non-disclosure of Company information; (b) protection of intellectual property and trade secrets; (c) non-solicitation of clients and employees for the duration stipulated in the contract; and (d) such other covenants as expressly survive termination.`,
  ])
  y = calloutBox(doc, y, `By accepting this letter, you acknowledge that all obligations of confidentiality, intellectual-property assignment and non-solicitation set out in your employment agreement continue to bind you beyond your last working day.`, { tone: 'gold' })
  if (isProse(extraBody)) y = paragraphs(doc, y, [extraBody])

  // Page 5 — gratitude + verification + signature
  doc.addPage(); y = pageHeader(doc, meta)
  y = paragraphs(doc, y, [
    `${COMPANY.legal} extends its sincere appreciation for the contributions you have made during your tenure with us. We hope your experience here has been rewarding and value-adding, and we wish you continued success, fulfilment and growth in your future career.`,
    `Should any prospective employer wish to verify your service particulars, kindly direct them to our HR helpline at ${COMPANY.email}, quoting the reference number printed on this letter.`,
  ])
  signatureBlock(doc, y, { title: 'Head of People', sealText: 'HR · CLEARED' })

  footerOnAllPages(doc, { palette: 'gold' })
  return doc
}

// ════════════════════════════════════════════════════════════════════════════
// 3. CONFIRMATION LETTER  ·  celebratory emerald-gold (4-6 pages)
// ════════════════════════════════════════════════════════════════════════════

export function generateConfirmationLetterPdf({ employee = {}, confirmationDate, probationMonths, issueDate, extraBody = '' } = {}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const refNo = refNumber('FRR/CONF', employee.code)
  const meta = { title: 'Confirmation Letter', refNo, issueDate, palette: 'emerald' }

  // Cover
  coverEmerald(doc, { title: 'Confirmation of Employment', subtitle: 'A formal acknowledgement of successful probation completion.', employee, refNo, issueDate })

  // Page 2 — congratulations
  doc.addPage(); let y = pageHeader(doc, meta)
  y = recipientBlock(doc, y, employee, 'emerald')
  y += 12
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(...INK)
  doc.text(`Dear ${firstName(employee.name)},`, MARGIN, y); y += 24
  y = paragraphs(doc, y, [
    `It gives us great pleasure to confirm your appointment with **${COMPANY.legal}** as **${employee.designation || '—'}** in the **${employee.department || '—'}** department, with effect from **${fmtDate(confirmationDate) || fmtDate(new Date())}**.`,
    `This confirmation follows the successful completion of your probationary period${probationMonths ? ` of **${probationMonths} months**` : ''}, and is in recognition of the quality of work, conduct and commitment you have demonstrated during the said period. Your manager and the Human Resources function have reviewed your performance, and we are pleased to advance your engagement from probationary to confirmed status.`,
  ])
  y = calloutBox(doc, y, `Congratulations, ${firstName(employee.name)}. You are now a confirmed and permanent member of ${COMPANY.legal}. We look forward to a long and rewarding journey together.`, { tone: 'emerald' })

  // Page 3 — what changes
  doc.addPage(); y = pageHeader(doc, meta)
  y = sectionHeading(doc, y, 'What Changes With Confirmation', 'emerald')
  y = bullets(doc, y, [
    `Your status changes from "Probationary" to "Confirmed / Permanent" with effect from the confirmation date noted on the cover page.`,
    `You become eligible to participate in the Company's full benefits programme, including statutory contributions, group health insurance, gratuity entitlements and any applicable performance bonuses, as per the Employee Handbook.`,
    `Your notice period for separation is updated from the probationary notice (typically 30 days) to the standard confirmed-employee notice (typically 60-90 days), as set out in your appointment letter.`,
    `Your eligibility for participation in the annual performance review and merit-increment cycle now commences.`,
    `You become eligible to access internal mobility opportunities subject to the timelines defined under the Internal Job Posting policy.`,
  ], { markColor: EMERALD })

  y = sectionHeading(doc, y, 'What Remains Unchanged', 'emerald')
  y = paragraphs(doc, y, [
    `All other terms and conditions of your employment — including but not limited to your role, reporting structure, base compensation, leave entitlements and applicable Company policies — shall continue to apply as previously communicated, except where modified in writing by an authorised representative of the Company.`,
  ])

  // Page 4 — details + signature
  doc.addPage(); y = pageHeader(doc, meta)
  y = keyValueTable(doc, y, 'Confirmation Particulars', [
    ['Employee Name', employee.name || '—'],
    ['Employee ID', employee.code || '—'],
    ['Designation', employee.designation || '—'],
    ['Department', employee.department || '—'],
    ['Date of Joining', fmtDate(employee.joiningDate) || '—'],
    ['Probation Period', probationMonths ? `${probationMonths} months` : '6 months'],
    ['Confirmation Date', fmtDate(confirmationDate) || fmtDate(new Date())],
    ['Employment Status', 'Confirmed / Permanent'],
    ['Notice Period (Post-Confirmation)', `${employee.noticePeriodDays || 60} days`],
  ], { style: 'emerald' })

  if (isProse(extraBody)) y = paragraphs(doc, y, [extraBody])
  y = paragraphs(doc, y, [
    `We take this opportunity to thank you for your contributions thus far, and to wish you continued growth, learning and success at ${COMPANY.name}.`,
  ])
  signatureBlock(doc, y, { title: 'Head of People', sealText: 'CONFIRMED' })

  footerOnAllPages(doc, { palette: 'emerald' })
  return doc
}

// ════════════════════════════════════════════════════════════════════════════
// 4. APPOINTMENT LETTER  ·  premium dark cover (8-12 pages)
// ════════════════════════════════════════════════════════════════════════════

export function generateAppointmentLetterPdf({ employee = {}, joiningDate, issueDate, ctc, probationMonths, noticePeriodDays, workLocation, reportingManager, extraBody = '' } = {}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const refNo = refNumber('FRR/APT', employee.code)
  const meta = { title: 'Appointment Letter', refNo, issueDate, palette: 'gold' }
  const join = joiningDate || employee.joiningDate
  const annual = Number(ctc || employee.annualCtc || 0)
  const sal = deriveSalaryStructure(annual)

  // Cover
  coverDark(doc, { title: 'Letter of Appointment', subtitle: 'A formal commitment of employment, terms and mutual obligations between the Company and the Appointee.', employee, refNo, issueDate })

  // Page 2 — Welcome + introduction
  doc.addPage(); let y = pageHeader(doc, meta)
  y = recipientBlock(doc, y, employee)
  y += 14
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(...INK)
  doc.text(`Dear ${firstName(employee.name)},`, MARGIN, y); y += 24
  y = paragraphs(doc, y, [
    `Welcome to **${COMPANY.legal}**. We are delighted to formally appoint you to the position of **${employee.designation || '—'}** in the **${employee.department || '—'}** department, with effect from **${fmtDate(join) || '—'}**.`,
    `This appointment is made in consideration of your skills, qualifications, and the discussions held during the selection process, and is subject to the terms and conditions set out in this letter and the documents referenced herein.`,
    `Please read this letter in its entirety. By signing the duplicate copy in the space provided at the end and returning it to the Human Resources function, you formally accept this offer of employment and agree to be bound by its terms.`,
  ])
  y = calloutBox(doc, y, `This letter, together with the Employee Handbook, the Confidentiality & Intellectual Property Agreement and the Code of Conduct, forms the complete agreement between you and ${COMPANY.legal} in respect of your employment.`)

  // Page 3 — Role & Reporting
  doc.addPage(); y = pageHeader(doc, meta)
  y = clauseHeading(doc, y, 1, 'Role, Reporting & Place of Work')
  y = paragraphs(doc, y, [
    `You will be designated as ${employee.designation || '—'} and will be placed in the ${employee.department || '—'} department. You will report functionally and administratively to ${reportingManager || employee.reportingManager || 'the Head of Department'}, or to such other person as the Company may designate from time to time.`,
    `Your primary place of work will be ${workLocation || employee.workLocation || COMPANY.address1}. However, you may be required to travel within or outside India, or to be relocated, in connection with the Company's business, at the Company's discretion.`,
    `Your role and responsibilities are dynamic and the Company reserves the right to assign you such duties, functions and responsibilities as it may deem fit, commensurate with your qualifications and experience. The Company may also, at its discretion, transfer you to any of its affiliates, branches or other locations, whether in India or abroad.`,
  ])
  y = clauseHeading(doc, y, 2, 'Working Hours')
  y = paragraphs(doc, y, [
    `Your standard working hours shall be 09:00 to 18:00 on each working day from Monday to Friday, with a one-hour break for lunch. Saturday and Sunday will be observed as weekly off days. You may be required to work additional hours, including on weekends and public holidays, as the exigencies of business may demand, without any additional compensation, as your compensation is structured on the basis of a fully-paid role.`,
  ])

  // Page 4 — Compensation (Indian structure)
  doc.addPage(); y = pageHeader(doc, meta)
  y = clauseHeading(doc, y, 3, 'Compensation')
  y = paragraphs(doc, y, [
    `Your annual cost-to-company is fixed at ${inr(annual)} (Indian Rupees only), payable in equal monthly instalments after applicable statutory deductions and any other deductions as required by law or as authorised by you.`,
    `The detailed structure of your compensation is set out in Schedule A below. All amounts are denominated in Indian Rupees (INR) and are inclusive of all applicable statutory contributions, allowances and benefits.`,
  ])
  if (sal) {
    y = scheduleTable(doc, y, 'Schedule A — Compensation Structure', ['Component', 'Monthly (INR)', 'Annual (INR)'], [
      ['Basic Salary', sal.monthly.basic, sal.basic],
      ['House Rent Allowance (HRA)', sal.monthly.hra, sal.hra],
      ['Special Allowance', sal.monthly.special, sal.special],
      ['Conveyance Allowance', sal.monthly.conveyance, sal.conveyance],
      ['Medical Allowance', sal.monthly.medical, sal.medical],
      ['Leave Travel Allowance (LTA)', sal.monthly.lta, sal.lta],
      ['Telephone / Internet Reimbursement', sal.monthly.telephone, sal.telephone],
      ['Meal Card / Food Allowance', sal.monthly.food, sal.food],
      { cells: ['Gross Monthly Salary (A)', sal.monthly.gross, sal.gross], __total: true },
      ['Employer PF Contribution', sal.monthly.employerPf, sal.employerPf],
      ['Gratuity (statutory accrual)', sal.monthly.gratuity, sal.gratuity],
      { cells: ['Total Annual CTC (A + Employer Contributions)', sal.monthly.gross + sal.monthly.employerPf + sal.monthly.gratuity, sal.annualCtc], __total: true },
    ])
    y = scheduleTable(doc, y, 'Schedule A.1 — Statutory & Other Deductions (Indicative)', ['Component', 'Monthly (INR)', 'Annual (INR)'], [
      ['Employee Provident Fund (PF)', sal.monthly.employeePf, sal.employeePf],
      ['Professional Tax', sal.monthly.profTax, sal.profTax],
      ['Income Tax (TDS, as applicable)', '— (per declaration)', '— (per declaration)'],
      { cells: ['Approximate Net Take-Home', sal.monthly.net, sal.netAnnual], __total: true },
    ])
  }

  // Page 5 — Probation + Notice
  doc.addPage(); y = pageHeader(doc, meta)
  y = clauseHeading(doc, y, 4, 'Probation')
  y = paragraphs(doc, y, [
    `You will be on probation for a period of ${probationMonths || 6} months from your date of joining. During the probation period, either party may terminate the employment by giving 30 days' written notice or salary in lieu thereof.`,
    `On successful completion of the probation period and on the basis of a satisfactory performance review, you will be confirmed in your position by way of a written confirmation letter. The Company reserves the right to extend the probation period at its sole discretion, in which case you will continue to be governed by the probationary terms during the extension.`,
  ])
  y = clauseHeading(doc, y, 5, 'Notice Period & Separation')
  y = paragraphs(doc, y, [
    `Post-confirmation, the notice period for termination of employment by either party will be ${noticePeriodDays || 60} days, in writing. The Company reserves the right to waive any portion of the notice or to require payment of salary in lieu of notice at its sole discretion.`,
    `Notwithstanding the above, the Company reserves the right to terminate this employment summarily without notice or payment in lieu thereof for cause, including but not limited to misconduct, breach of confidentiality, fraud, theft, insubordination, or any other action prejudicial to the interests of the Company.`,
  ])
  y = clauseHeading(doc, y, 6, 'Leave')
  y = paragraphs(doc, y, [
    `You will be entitled to the leaves as per the Company's Leave Policy, which presently includes Casual Leave, Sick Leave, Privilege/Earned Leave, Maternity Leave and Paternity Leave, and such other leaves as may be applicable from time to time. All leave is subject to prior approval of your reporting manager and the operational requirements of the team.`,
  ])

  // Page 6 — Confidentiality, IP, Non-compete
  doc.addPage(); y = pageHeader(doc, meta)
  y = clauseHeading(doc, y, 7, 'Confidentiality')
  y = paragraphs(doc, y, [
    `You shall not, during the course of your employment or at any time thereafter, divulge, communicate or use, directly or indirectly, any confidential information of the Company, its clients or affiliates, except as may be required in the proper performance of your duties. "Confidential Information" includes but is not limited to business plans, customer data, technical know-how, source code, marketing strategies, financial information and personnel records.`,
  ])
  y = clauseHeading(doc, y, 8, 'Intellectual Property')
  y = paragraphs(doc, y, [
    `All inventions, designs, software, documentation, processes, improvements, and creative works conceived, developed, or first reduced to practice by you, alone or with others, during the term of your employment, and arising out of your work for the Company or making use of Company resources, shall be the sole and exclusive property of the Company. You hereby assign all right, title, and interest in such works to the Company.`,
  ])
  y = clauseHeading(doc, y, 9, 'Non-Solicitation & Non-Compete')
  y = paragraphs(doc, y, [
    `For a period of 12 months following the cessation of your employment, you shall not directly or indirectly solicit or attempt to solicit any employee, consultant, customer, supplier, or business partner of the Company to terminate or alter their relationship with the Company.`,
  ])

  // Page 7 — Conduct, Background, General
  doc.addPage(); y = pageHeader(doc, meta)
  y = clauseHeading(doc, y, 10, 'Code of Conduct')
  y = paragraphs(doc, y, [
    `You shall conduct yourself with the highest standards of integrity, honesty, and professionalism. You will comply with all Company policies including the Code of Conduct, Anti-Harassment Policy, Anti-Bribery Policy, Information Security Policy, and the Policy on Prevention of Sexual Harassment (POSH), as amended from time to time.`,
  ])
  y = clauseHeading(doc, y, 11, 'Background Verification')
  y = paragraphs(doc, y, [
    `This appointment is contingent upon successful completion of background verification, reference checks, and the submission of all pre-employment documents listed in Schedule B. Any misrepresentation, suppression of facts, or discovery of adverse antecedents shall entitle the Company to withdraw this offer or terminate your employment without notice, at any stage.`,
  ])
  y = clauseHeading(doc, y, 12, 'General Provisions')
  y = paragraphs(doc, y, [
    `This appointment is governed by and shall be construed in accordance with the laws of India. The courts in Hyderabad shall have exclusive jurisdiction over any disputes arising out of or in connection with this letter or your employment.`,
    `Any modification of these terms must be in writing and signed by an authorised representative of the Company. The Company's failure to enforce any provision shall not be construed as a waiver thereof.`,
  ])

  // Page 8 — Schedule B documents + Acceptance
  doc.addPage(); y = pageHeader(doc, meta)
  y = sectionHeading(doc, y, 'Schedule B — Pre-Joining Documents Required')
  y = bullets(doc, y, [
    `Two recent passport-size photographs.`,
    `Copies of educational certificates from class X onwards, including final degree.`,
    `Copies of relieving letters and experience certificates from previous employers.`,
    `Latest three months' salary slips and last Form 16 (or equivalent salary record).`,
    `PAN card, Aadhaar card, and a cancelled cheque or first page of the bank passbook (for salary credit).`,
    `Address proof (passport / driving licence / utility bill not older than 3 months).`,
    `Universal Account Number (UAN) for Provident Fund continuity, if applicable.`,
  ])
  if (isProse(extraBody)) y = paragraphs(doc, y, [extraBody])

  y = sectionHeading(doc, y, 'Acceptance')
  y = paragraphs(doc, y, [
    `Please indicate your acceptance of this offer of appointment by signing the duplicate copy of this letter at the place provided below and returning it to the Human Resources function within 7 days of receipt. Your failure to communicate acceptance within this period shall entitle the Company to deem this offer withdrawn.`,
    `We look forward to welcoming you to ${COMPANY.name} and to a long, rewarding and mutually fulfilling association.`,
  ])
  dualSignature(doc, y, employee)

  footerOnAllPages(doc, { palette: 'gold' })
  return doc
}

// ════════════════════════════════════════════════════════════════════════════
// 5. OFFER LETTER  ·  luxury cover (7-10 pages)
// ════════════════════════════════════════════════════════════════════════════

export function generateOfferLetterPdf({ employee = {}, designation, department, joiningDate, ctc, monthlyGross, issueDate, expiryDate, workLocation, reportingManager, extraBody = '' } = {}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const refNo = refNumber('FRR/OFR', employee.code)
  const meta = { title: 'Offer Letter', refNo, issueDate, palette: 'gold' }
  const eff = { ...employee, designation: designation || employee.designation, department: department || employee.department }
  const annual = Number(ctc || employee.annualCtc || 0)
  const sal = deriveSalaryStructure(annual)

  // Cover
  coverLuxury(doc, { title: 'Offer of Employment', employee: eff, refNo, issueDate })

  // Page 2 — Greeting
  doc.addPage(); let y = pageHeader(doc, meta)
  y = recipientBlock(doc, y, eff)
  y += 14
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(...INK)
  doc.text(`Dear ${firstName(employee.name)},`, MARGIN, y); y += 24
  y = paragraphs(doc, y, [
    `On behalf of **${COMPANY.legal}** (hereinafter, "the Company"), I am delighted to extend to you an offer of full-time employment for the position of **${eff.designation || '—'}** within the **${eff.department || '—'}** function.`,
    `Your candidacy, the conversations we have shared, and your professional record have been carefully evaluated by the leadership of the Company. We believe that your skills, ambition and integrity will be a powerful addition to our team, and we are committed to supporting you in building a long, distinguished and impactful career with us.`,
    `This letter sets out the principal terms of the offer. A formal Appointment Letter, containing the full terms and conditions of employment, will be issued to you on your first day with the Company.`,
  ])
  y = calloutBox(doc, y, `Proposed Date of Joining: ${fmtDate(joiningDate) || '—'}. Please confirm your availability or propose an alternative date in writing to Human Resources.`)

  // Page 3 — Compensation summary (Indian breakdown)
  doc.addPage(); y = pageHeader(doc, meta)
  y = clauseHeading(doc, y, 1, 'Total Rewards & Compensation')
  y = paragraphs(doc, y, [
    `In recognition of the role and the value you will bring, we are pleased to offer you an annual Cost-to-Company (CTC) of ${inr(annual)} (Indian Rupees only). Your compensation has been structured in line with the Company's policies and prevailing statutory norms.`,
  ])
  if (sal) {
    y = scheduleTable(doc, y, 'Schedule A — Annual Compensation Breakdown', ['Component', 'Monthly (INR)', 'Annual (INR)'], [
      ['Basic Salary', sal.monthly.basic, sal.basic],
      ['House Rent Allowance', sal.monthly.hra, sal.hra],
      ['Special Allowance', sal.monthly.special, sal.special],
      ['Conveyance', sal.monthly.conveyance, sal.conveyance],
      ['Medical Allowance', sal.monthly.medical, sal.medical],
      ['Leave Travel Allowance', sal.monthly.lta, sal.lta],
      ['Telephone / Internet', sal.monthly.telephone, sal.telephone],
      ['Meal Allowance', sal.monthly.food, sal.food],
      { cells: ['Gross Monthly Salary', sal.monthly.gross, sal.gross], __total: true },
      ['Employer PF Contribution', sal.monthly.employerPf, sal.employerPf],
      ['Gratuity (statutory accrual)', sal.monthly.gratuity, sal.gratuity],
      { cells: ['TOTAL ANNUAL CTC', sal.monthly.gross + sal.monthly.employerPf + sal.monthly.gratuity, sal.annualCtc], __total: true },
    ])
  }

  // Page 4 — Benefits & perks
  doc.addPage(); y = pageHeader(doc, meta)
  y = clauseHeading(doc, y, 2, 'Benefits, Perks & Wellbeing')
  y = bullets(doc, y, [
    `Group Health Insurance covering you, your spouse, two children and dependent parents.`,
    `Group Term Life Insurance and Personal Accident Insurance of three (3) times your annual CTC.`,
    `Statutory contributions to the Employees' Provident Fund Organisation (EPFO).`,
    `Gratuity in accordance with the Payment of Gratuity Act, 1972.`,
    `Annual performance-linked bonus on confirmation, subject to individual and Company performance.`,
    `Wellness leave (up to 6 days a year) and mental-health support programmes, in addition to standard leave entitlement.`,
    `Continuous learning budget, internal certifications, and access to curated online learning libraries.`,
    `Flexible working arrangements as per the Company's hybrid-work policy, where the role permits.`,
  ])

  // Page 5 — Joining process
  doc.addPage(); y = pageHeader(doc, meta)
  y = clauseHeading(doc, y, 3, 'Joining Process & Onboarding')
  y = paragraphs(doc, y, [
    `Subject to your acceptance of this offer, the Human Resources function will share a detailed pre-joining checklist, including the list of pre-employment documents required, background verification consent forms, and onboarding logistics. A dedicated buddy and onboarding plan will be assigned to you from day one to ensure a smooth and supportive transition.`,
  ])
  y = sectionHeading(doc, y, 'Pre-Joining Document Checklist')
  y = bullets(doc, y, [
    `Two passport-size photographs (recent).`,
    `Photocopy of PAN card and Aadhaar card.`,
    `Photocopy of educational certificates (class X onwards, including degree).`,
    `Photocopy of experience and relieving letters from previous employers.`,
    `Last three months' payslips and last Form 16 / equivalent salary record.`,
    `Cancelled cheque or front page of bank passbook (for salary credit).`,
    `Address proof (passport, driving licence or recent utility bill).`,
    `Universal Account Number (UAN) for PF continuity, if applicable.`,
  ])

  // Page 6 — Confidentiality / IP / Non-compete summary
  doc.addPage(); y = pageHeader(doc, meta)
  y = clauseHeading(doc, y, 4, 'Confidentiality, Intellectual Property & Non-Solicitation')
  y = paragraphs(doc, y, [
    `As a condition of this offer, you will be required to execute the Company's standard Confidentiality and Intellectual Property Assignment Agreement, and to comply with its Code of Conduct, Information Security Policy, Policy on Prevention of Sexual Harassment, Anti-Bribery and Anti-Corruption Policy, and all other policies as may be amended from time to time.`,
    `All inventions, designs, processes, software, documentation, improvements, and creative works conceived, developed, or first reduced to practice by you, alone or with others, during the term of your employment shall be the sole and exclusive property of the Company.`,
    `For a period of twelve (12) months following the cessation of your employment, you agree not to directly or indirectly solicit any employee, consultant, customer, or business partner of the Company to terminate or alter their relationship with the Company.`,
  ])

  // Page 7 — Background verification + Conditions
  doc.addPage(); y = pageHeader(doc, meta)
  y = clauseHeading(doc, y, 5, 'Conditions of Employment')
  y = paragraphs(doc, y, [
    `This offer is contingent upon the successful completion of background verification, reference checks, education and employment verification, and the submission of all pre-employment documentation. Any material misrepresentation, suppression of facts, or discovery of adverse antecedents shall entitle the Company to withdraw this offer at any time without liability, including after your joining.`,
    `You confirm that you are not bound by any non-compete, exclusivity, confidentiality, or restrictive covenant with any current or former employer that would prevent you from accepting this offer or performing the duties contemplated herein.`,
    `This offer is also contingent upon medical fitness, where applicable.`,
  ])
  y = clauseHeading(doc, y, 6, 'Validity & Acceptance')
  y = paragraphs(doc, y, [
    `This offer remains valid until ${bold(fmtDate(expiryDate)) || 'the agreed acceptance date'}. Please indicate your acceptance by countersigning this letter and returning a signed scanned copy to ${COMPANY.email} on or before the said date. Should you have any questions, our team will be happy to clarify.`,
  ])
  if (isProse(extraBody)) y = paragraphs(doc, y, [extraBody])
  y = paragraphs(doc, y, [
    `On behalf of ${COMPANY.legal}, we look forward to welcoming you and to building something extraordinary together.`,
  ])
  dualSignature(doc, y, employee)

  footerOnAllPages(doc, { palette: 'gold' })
  return doc
}

// ════════════════════════════════════════════════════════════════════════════
// 6. SALARY CERTIFICATE  ·  bank-grade tabular (3-5 pages)
// ════════════════════════════════════════════════════════════════════════════

export function generateSalaryCertificatePdf({ employee = {}, annualCtc = 0, monthlyGross = 0, basic = 0, hra = 0, allowances = 0, deductions = 0, tax = 0, issueDate, purpose = 'general purposes' } = {}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const refNo = refNumber('FRR/SAL', employee.code)
  const meta = { title: 'Salary Certificate', refNo, issueDate, palette: 'navy' }

  const annual = Number(annualCtc || employee.annualCtc || 0)
  const sal = deriveSalaryStructure(annual)

  // Cover
  coverGold(doc, { title: 'Salary Certificate', subtitle: 'Authenticated statement of employment & compensation', employee, refNo, issueDate })

  // Page 2 — certification
  doc.addPage(); let y = pageHeader(doc, meta)
  y = tomicHeader(doc, y) + 6
  y = paragraphs(doc, y, [
    `This is to certify that ${employee.name || 'the employee'} (Employee ID: ${employee.code || '—'}) is presently employed with ${COMPANY.legal} as ${employee.designation || '—'} in the ${employee.department || '—'} department since ${fmtDate(employee.joiningDate) || '—'}.`,
    `${firstName(employee.name)} is presently drawing an annual cost-to-company of ${inr(annual)}, structured as detailed in Schedule A below. This certificate is being issued at the request of the above-named employee for ${purpose}.`,
  ])

  // Page 3 — Compensation table
  if (sal) {
    y = scheduleTable(doc, y, 'Schedule A — Salary Structure', ['Component', 'Monthly (INR)', 'Annual (INR)'], [
      ['Basic Salary', sal.monthly.basic, sal.basic],
      ['House Rent Allowance', sal.monthly.hra, sal.hra],
      ['Special Allowance', sal.monthly.special, sal.special],
      ['Conveyance', sal.monthly.conveyance, sal.conveyance],
      ['Medical', sal.monthly.medical, sal.medical],
      ['Leave Travel Allowance', sal.monthly.lta, sal.lta],
      ['Telephone / Internet', sal.monthly.telephone, sal.telephone],
      ['Meal Allowance', sal.monthly.food, sal.food],
      { cells: ['Gross Salary', sal.monthly.gross, sal.gross], __total: true },
    ])
    y = scheduleTable(doc, y, 'Schedule B — Statutory Deductions', ['Component', 'Monthly (INR)', 'Annual (INR)'], [
      ['Employee Provident Fund', sal.monthly.employeePf, sal.employeePf],
      ['Professional Tax', sal.monthly.profTax, sal.profTax],
      ['Income Tax (TDS, as applicable)', '—', '—'],
      { cells: ['Net Take-Home (indicative)', sal.monthly.net, sal.netAnnual], __total: true },
    ], { style: 'emerald' })
  }

  // Page 4 — Auth + signature
  doc.addPage(); y = pageHeader(doc, meta)
  y = paragraphs(doc, y, [
    `The above particulars are extracted from the official records of ${COMPANY.legal} and are accurate as on the date of issue. This certificate is issued in good faith for the purpose stated above and is intended for legitimate use only.`,
    `It is not to be reproduced, transferred or used for any purpose other than the one specified, without the prior written consent of ${COMPANY.legal}.`,
  ])
  y = calloutBox(doc, y, `For verification of this certificate, please contact ${COMPANY.email} quoting reference number ${refNo}.`, { tone: 'gold' })
  signatureBlock(doc, y, { title: 'Head of Payroll · HR', sealText: 'PAYROLL · VERIFIED' })

  footerOnAllPages(doc, { palette: 'navy' })
  return doc
}

// ════════════════════════════════════════════════════════════════════════════
// 7. NON-DISCLOSURE AGREEMENT (NDA)  ·  legal serif, watermark (8-12 pages)
// ════════════════════════════════════════════════════════════════════════════

export function generateNdaPdf({ employee = {}, issueDate, term = 3, extraBody = '', companyName, companyAddress, recipientAddress, executionCity = 'Hyderabad', governingLaw = 'Hyderabad, Telangana, India' } = {}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const refNo = refNumber('FRR/NDA', employee.code)
  const meta = { title: 'Non-Disclosure Agreement', refNo, issueDate, palette: 'ruby' }

  // Resolve party identity + addresses — explicit override > employee record > placeholder.
  const coName = (companyName && String(companyName).trim()) || COMPANY.legal
  const companyAddr = (companyAddress && String(companyAddress).trim()) || `${COMPANY.address1}, ${COMPANY.address2}`
  const recipientAddr = recipientAddress || employee.currentAddress || employee.permanentAddress || '[Recipient address as recorded with the Company]'

  // Cover
  coverConfidential(doc, { title: 'Non-Disclosure Agreement', employee, refNo, issueDate, companyName: coName, companyAddr })

  // Page 2 — Recitals
  doc.addPage(); let y = pageHeader(doc, meta)
  watermark(doc, 'CONFIDENTIAL')
  y = sectionHeading(doc, y, 'Recitals', 'ruby')
  y = paragraphs(doc, y, [
    `This Non-Disclosure Agreement ("Agreement") is made and entered into at **${executionCity}**, on **${fmtDate(issueDate || new Date())}** (the "Effective Date").`,
    `BY AND BETWEEN:`,
    `**${coName}**, a company incorporated under the Companies Act, 2013, having its registered office at **${companyAddr}** (hereinafter referred to as the "Company" or the "Disclosing Party", which expression shall, unless repugnant to the context, mean and include its successors and permitted assigns), of the FIRST PART;`,
    `AND`,
    `**${employee.name || 'the Recipient'}**${employee.code ? ` (Employee Code: **${employee.code}**)` : ''}, an individual resident in India, residing at **${recipientAddr}** (hereinafter referred to as the "Recipient" or the "Receiving Party", which expression shall, unless repugnant to the context, mean and include their heirs, executors and administrators), of the OTHER PART.`,
    `WHEREAS, the Disclosing Party is engaged in the business of designing, developing, marketing and providing technology products and services;`,
    `AND WHEREAS, the Receiving Party will, in connection with their employment, engagement or association with the Company, have access to certain Confidential Information of the Disclosing Party;`,
    `NOW, THEREFORE, in consideration of the mutual covenants set out herein, the Parties agree as follows:`,
  ])

  // Page 3 — Definitions
  doc.addPage(); y = pageHeader(doc, meta); watermark(doc, 'CONFIDENTIAL')
  y = clauseHeading(doc, y, 1, 'Definitions', 'ruby')
  y = paragraphs(doc, y, [
    `In this Agreement, unless the context otherwise requires, the following terms shall have the meanings set forth below:`,
    `"Confidential Information" means any and all information disclosed by the Disclosing Party to the Receiving Party, in any form whatsoever — oral, written, electronic, visual, graphic or otherwise — and identified as confidential at the time of disclosure or by the nature of which a reasonable person would understand to be confidential, including without limitation: (i) trade secrets, know-how, processes, formulae, techniques, designs, drawings, software (source and object code), algorithms and inventions; (ii) business, financial, marketing, sales and operational information; (iii) customer, supplier, employee and vendor lists; (iv) strategic plans, forecasts and projections; (v) proprietary research, analyses and reports; and (vi) any third-party confidential information that the Disclosing Party is obligated to keep confidential.`,
    `"Permitted Purpose" means the performance by the Receiving Party of the duties associated with their employment, engagement or association with the Disclosing Party.`,
    `"Representative" means, in respect of either Party, that Party's directors, officers, employees, agents, advisors, consultants and other representatives.`,
  ])

  // Page 4 — Obligations
  doc.addPage(); y = pageHeader(doc, meta); watermark(doc, 'CONFIDENTIAL')
  y = clauseHeading(doc, y, 2, 'Obligations of the Receiving Party', 'ruby')
  y = paragraphs(doc, y, [
    `2.1  The Receiving Party undertakes to hold all Confidential Information in strict confidence and to use the same solely for the Permitted Purpose, and not for any other purpose, whether for the benefit of the Receiving Party or any third party.`,
    `2.2  The Receiving Party shall protect the Confidential Information with the same degree of care that they exercise with respect to their own confidential information of similar nature, but in no event with less than reasonable care.`,
    `2.3  The Receiving Party shall not, without the prior written consent of the Disclosing Party, disclose any Confidential Information to any third party, including, but not limited to, friends, relatives, or current or prospective employers.`,
    `2.4  Disclosure within the Disclosing Party's organisation shall be limited to those Representatives of the Disclosing Party who have a need to know the Confidential Information for the Permitted Purpose and who are bound by confidentiality obligations no less restrictive than those contained in this Agreement.`,
    `2.5  The Receiving Party shall promptly notify the Disclosing Party of any unauthorised disclosure or use of the Confidential Information of which the Receiving Party becomes aware.`,
  ])

  // Page 5 — Exceptions + permitted disclosure
  doc.addPage(); y = pageHeader(doc, meta); watermark(doc, 'CONFIDENTIAL')
  y = clauseHeading(doc, y, 3, 'Exceptions to Confidentiality', 'ruby')
  y = paragraphs(doc, y, [
    `The obligations set out in this Agreement shall not apply to information which the Receiving Party can demonstrate, by competent written evidence, was: (a) in the public domain at the time of disclosure or has subsequently entered the public domain other than as a result of any act or omission of the Receiving Party; (b) lawfully in the possession of the Receiving Party prior to disclosure by the Disclosing Party and not subject to any obligation of confidentiality; (c) independently developed by the Receiving Party without use of or reference to the Confidential Information; or (d) lawfully received from a third party without restriction on disclosure.`,
  ])
  y = clauseHeading(doc, y, 4, 'Compelled Disclosure', 'ruby')
  y = paragraphs(doc, y, [
    `In the event the Receiving Party is required by law, regulation, court order, or any governmental, regulatory, or judicial authority to disclose any of the Confidential Information, the Receiving Party shall, to the extent permitted, promptly notify the Disclosing Party and shall co-operate, at the Disclosing Party's expense, in seeking a protective order or other appropriate remedy.`,
  ])

  // Page 6 — Term, return, IP, no-license
  doc.addPage(); y = pageHeader(doc, meta); watermark(doc, 'CONFIDENTIAL')
  y = clauseHeading(doc, y, 5, 'Term and Survival', 'ruby')
  y = paragraphs(doc, y, [
    `5.1  This Agreement shall be effective from the Effective Date and shall continue in force for a period of ${term} years from the date of termination of the Receiving Party's employment, engagement or association with the Disclosing Party, after which it shall stand terminated; provided, however, that obligations relating to trade secrets shall survive indefinitely.`,
    `5.2  The obligations of confidentiality contained in this Agreement shall survive any termination of this Agreement for the period set out in clause 5.1.`,
  ])
  y = clauseHeading(doc, y, 6, 'Return of Materials', 'ruby')
  y = paragraphs(doc, y, [
    `Upon the request of the Disclosing Party or upon the termination of the Receiving Party's employment, engagement or association with the Disclosing Party, whichever is earlier, the Receiving Party shall promptly return or, at the option of the Disclosing Party, destroy all Confidential Information, including all copies, extracts and reproductions thereof, in any form, and certify in writing to the Disclosing Party that the same has been done.`,
  ])
  y = clauseHeading(doc, y, 7, 'No Licence', 'ruby')
  y = paragraphs(doc, y, [
    `Nothing in this Agreement shall be construed as granting to the Receiving Party, expressly, by implication, estoppel or otherwise, any licence or right under any patent, trademark, copyright or other intellectual property right of the Disclosing Party. All Confidential Information shall remain the sole and exclusive property of the Disclosing Party.`,
  ])

  // Page 7 — Remedies, IP, indemnity
  doc.addPage(); y = pageHeader(doc, meta); watermark(doc, 'CONFIDENTIAL')
  y = clauseHeading(doc, y, 8, 'Intellectual Property', 'ruby')
  y = paragraphs(doc, y, [
    `The Receiving Party acknowledges that all intellectual property rights — including but not limited to copyrights, patents, trademarks, trade secrets and any related right — in any work, invention, design, software, documentation, process, improvement, derivative work or other creation conceived, developed, or first reduced to practice by the Receiving Party in the course of their employment with the Company, or making use of the Confidential Information, shall vest exclusively in the Company. The Receiving Party hereby irrevocably and unconditionally assigns to the Company all such intellectual property rights.`,
  ])
  y = clauseHeading(doc, y, 9, 'Remedies & Equitable Relief', 'ruby')
  y = paragraphs(doc, y, [
    `The Receiving Party acknowledges that any breach of this Agreement may cause irreparable harm to the Disclosing Party for which monetary damages may be inadequate. The Receiving Party accordingly agrees that the Disclosing Party shall be entitled to seek, in addition to any other remedy available at law or in equity, specific performance and injunctive or other equitable relief from a court of competent jurisdiction, without the necessity of proving actual damages or posting any bond.`,
  ])
  y = clauseHeading(doc, y, 10, 'Indemnity', 'ruby')
  y = paragraphs(doc, y, [
    `The Receiving Party shall indemnify and hold the Disclosing Party harmless from and against any and all losses, damages, liabilities, costs and expenses (including reasonable legal fees) suffered or incurred by the Disclosing Party arising out of or in connection with any breach of this Agreement by the Receiving Party.`,
  ])

  // Page 8 — General + governing law + dispute resolution + counterparts
  doc.addPage(); y = pageHeader(doc, meta); watermark(doc, 'CONFIDENTIAL')
  y = clauseHeading(doc, y, 11, 'Governing Law & Jurisdiction', 'ruby')
  y = paragraphs(doc, y, [
    `This Agreement shall be governed by and construed in accordance with the laws of India. The courts in **${governingLaw}** shall have exclusive jurisdiction over any dispute, controversy or claim arising out of, or in connection with, this Agreement or its subject matter.`,
  ])
  y = clauseHeading(doc, y, 12, 'Dispute Resolution', 'ruby')
  y = paragraphs(doc, y, [
    `The Parties shall endeavour to resolve any dispute arising out of or in connection with this Agreement through good-faith negotiations. If the dispute is not resolved within thirty (30) days, the matter shall be referred to arbitration under the Arbitration and Conciliation Act, 1996, before a sole arbitrator appointed by the Disclosing Party. The seat and venue of arbitration shall be **${executionCity}**. The language of arbitration shall be English. The award of the arbitrator shall be final and binding on the Parties.`,
  ])
  y = clauseHeading(doc, y, 13, 'General', 'ruby')
  y = paragraphs(doc, y, [
    `13.1  This Agreement constitutes the entire understanding between the Parties with respect to its subject matter and supersedes all prior oral and written agreements.`,
    `13.2  No modification or waiver of any term of this Agreement shall be effective unless in writing and signed by both Parties.`,
    `13.3  If any provision of this Agreement is held to be unenforceable, the remaining provisions shall continue in full force and effect.`,
    `13.4  This Agreement may be executed in one or more counterparts, each of which shall be deemed an original and all of which together shall constitute one and the same instrument. Electronic and scanned signatures shall be treated as originals for all purposes.`,
  ])
  if (isProse(extraBody)) y = paragraphs(doc, y, [extraBody])

  // Page 9 — Execution / Signatures
  doc.addPage(); y = pageHeader(doc, meta); watermark(doc, 'CONFIDENTIAL')
  y = sectionHeading(doc, y, 'Execution', 'ruby')
  y = paragraphs(doc, y, [
    `IN WITNESS WHEREOF the Parties hereto have set their hands to this Non-Disclosure Agreement on the day, month and year first written above.`,
  ])
  dualSignature(doc, y, employee)

  footerOnAllPages(doc, { palette: 'ruby' })
  return doc
}

// ════════════════════════════════════════════════════════════════════════════
// Dispatcher
// ════════════════════════════════════════════════════════════════════════════

export function generateLetterByType(templateType, { employee = {}, extraBody = '', issueDate, ...extras } = {}) {
  switch (templateType) {
    case 'EXPERIENCE_LETTER':
      return generateExperienceLetterPdf({ employee, extraBody, issueDate, lastWorkingDate: extras.lastWorkingDate || employee.lastWorkingDate })
    case 'RELIEVING_LETTER':
      return generateRelievingLetterPdf({ employee, extraBody, issueDate, resignationDate: extras.resignationDate, lastWorkingDate: extras.lastWorkingDate || employee.lastWorkingDate })
    case 'CONFIRMATION_LETTER':
      return generateConfirmationLetterPdf({ employee, extraBody, issueDate, confirmationDate: extras.confirmationDate || employee.confirmationDate, probationMonths: extras.probationMonths || employee.probationMonths })
    case 'APPOINTMENT_LETTER':
      return generateAppointmentLetterPdf({ employee, extraBody, issueDate, joiningDate: extras.joiningDate || employee.joiningDate, ctc: extras.ctc || employee.annualCtc, probationMonths: extras.probationMonths || employee.probationMonths, noticePeriodDays: extras.noticePeriodDays || employee.noticePeriodDays, workLocation: extras.workLocation || employee.workLocation, reportingManager: extras.reportingManager || employee.reportingManager })
    case 'OFFER_LETTER':
      return generateOfferLetterPdf({ employee, extraBody, issueDate, designation: extras.designation || employee.designation, department: extras.department || employee.department, joiningDate: extras.joiningDate || employee.joiningDate, ctc: extras.ctc || employee.annualCtc, monthlyGross: extras.monthlyGross || employee.monthlyGross, expiryDate: extras.expiryDate, workLocation: extras.workLocation || employee.workLocation, reportingManager: extras.reportingManager || employee.reportingManager })
    case 'SALARY_CERTIFICATE':
      return generateSalaryCertificatePdf({ employee, issueDate, annualCtc: extras.annualCtc || employee.annualCtc, monthlyGross: extras.monthlyGross || employee.monthlyGross, basic: extras.basic, hra: extras.hra, allowances: extras.allowances, deductions: extras.deductions, tax: extras.tax, purpose: extras.purpose })
    case 'NDA':
      return generateNdaPdf({ employee, extraBody, issueDate, term: extras.term, companyName: extras.companyName, companyAddress: extras.companyAddress, recipientAddress: extras.recipientAddress, executionCity: extras.executionCity, governingLaw: extras.governingLaw })
    default:
      return generateLetterPdf({ title: 'Letter', bodyText: extraBody || '', employeeName: employee.name, employeeCode: employee.code, issueDate })
  }
}

// ─── Legacy fallback (kept so any older import keeps working) ────────────────
export function generateLetterPdf({ title = 'Letter', bodyText = '', employeeName = '', employeeCode = '', issueDate } = {}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const refNo = refNumber('FRR/LTR', employeeCode)
  coverGold(doc, { title, employee: { name: employeeName, code: employeeCode }, refNo, issueDate })
  doc.addPage(); let y = pageHeader(doc, { title, refNo, issueDate })
  if (bodyText) y = paragraphs(doc, y, [bodyText])
  signatureBlock(doc, y)
  footerOnAllPages(doc)
  return doc
}

// Inline emphasis marker — jsPDF cannot do mid-string bold, so we return value
// transparently. Used for readability of the source code.
function bold(s) { return s == null ? '' : String(s) }
