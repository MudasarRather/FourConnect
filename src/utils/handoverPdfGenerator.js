import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * NANO HANDOVER PRO ENGINE
 * Exact design replication: Yellow top bar, FourconnectPRO header,
 * black PROJECT HANDOVER badge, flowing continuous layout, yellow
 * section borders, yellow table headers, signature boxes.
 */
export const generateHandoverPdf = (data) => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.width   // 210
  const H = doc.internal.pageSize.height  // 297
  const M = 22   // Left/right margin
  const CW = W - 2 * M
  const CONTENT_TOP = 55 // Below repeating header

  // ── COLORS ──
  const AMBER = [245, 180, 0]
  const AMBER_DARK = [218, 160, 0]
  const BLACK = [0, 0, 0]
  const DARK = [30, 30, 30]
  const GRAY = [120, 120, 120]
  const LIGHT_GRAY = [200, 200, 200]
  const WHITE = [255, 255, 255]
  const RED = [220, 40, 40]
  const GREEN_DARK = [40, 100, 40]
  const BLUE_LOGO = [37, 99, 235] // Modern Blue for Fourreck
  const BLUE_DARK = [30, 60, 120]

  let totalPages = 0 // Will be set after all content is added

  const formatDate = (d) => {
    if (!d) return '—'
    const dt = new Date(d)
    return `${dt.getDate()}/${dt.getMonth() + 1}/${dt.getFullYear()}`
  }
  const formatNum = (n) => n != null ? Number(n).toLocaleString('en-IN') : '0'

  // ── REPEATING PAGE HEADER ──
  const drawPageHeader = () => {
    // Yellow top bar
    doc.setFillColor(...AMBER); doc.rect(0, 0, W, 8, 'F')
    // Amber gradient edge
    doc.setFillColor(...AMBER_DARK); doc.rect(0, 7, W, 1, 'F')
    
    // Fourreck Logo
    const lx = M, ly = 16
    // Draw the Icon (Blue Rectangle with white bars)
    doc.setFillColor(...BLUE_LOGO); doc.roundedRect(lx, ly, 10, 6, 1, 1, 'F')
    doc.setDrawColor(...WHITE); doc.setLineWidth(0.6)
    doc.line(lx + 2, ly + 2, lx + 8, ly + 2) // Long bar
    doc.line(lx + 5, ly + 4, lx + 8, ly + 4) // Short bar
    
    // Brand text
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLUE_LOGO)
    doc.text('FOURRECK', lx + 14, ly + 5.5)

    // Black "PROJECT HANDOVER" badge
    const bw = 65, bh = 12, bx = W - M - bw, by = ly - 1
    doc.setFillColor(...BLACK); doc.roundedRect(bx, by, bw, bh, 2, 2, 'F')
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...WHITE)
    doc.text('PROJECT HANDOVER', bx + bw / 2, by + bh / 2 + 1, { align: 'center' })

    // Thin line separator
    doc.setDrawColor(...LIGHT_GRAY); doc.setLineWidth(0.3)
    doc.line(M, 35, W - M, 35)
  }

  // ── FOOTER (will draw after all pages are done for total page count) ──
  const drawFooter = (pageNum) => {
    // Small blue rect bottom left
    doc.setFillColor(...BLUE_DARK); doc.rect(M, H - 12, 18, 3, 'F')
    // Footer text
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY)
    doc.text(`powered by Fourconnect  |  Page ${pageNum} of ${totalPages}`, W - M, H - 10, { align: 'right' })
  }

  // ── SECTION TITLE WITH YELLOW LEFT BAR ──
  const drawSectionTitle = (y, num, title) => {
    // Yellow vertical bar
    doc.setFillColor(...AMBER); doc.rect(M, y, 4, 12, 'F')
    // Title text
    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
    doc.text(`${num}. ${title.toUpperCase()}`, M + 8, y + 9)
    // Underline
    doc.setDrawColor(...BLACK); doc.setLineWidth(0.3)
    doc.line(M + 8, y + 13, M + 8 + doc.getTextWidth(`${num}. ${title.toUpperCase()}`), y + 13)
    return y + 22
  }

  // ── CHECK IF NEED NEW PAGE, returning new Y ──
  const checkPage = (y, needed = 30) => {
    if (y + needed > H - 20) {
      doc.addPage()
      drawPageHeader()
      return CONTENT_TOP
    }
    return y
  }

  // ── PARAGRAPH TEXT ──
  const drawParagraph = (y, text, maxW) => {
    doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
    const lines = doc.splitTextToSize(String(text || '—'), maxW || CW)
    for (let i = 0; i < lines.length; i++) {
      y = checkPage(y, 6)
      doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
      doc.text(lines[i], M, y)
      y += 5
    }
    return y + 3
  }

  // ── BULLET POINT ──
  const drawBullet = (y, text) => {
    y = checkPage(y, 8)
    doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
    doc.text('•', M + 6, y)
    const lines = doc.splitTextToSize(String(text), CW - 12)
    doc.text(lines, M + 12, y, { lineHeightFactor: 1.5 })
    return y + lines.length * 5 + 3
  }

  // ── KEY-VALUE INLINE ──
  const drawKV = (y, label, value) => {
    y = checkPage(y, 8)
    doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
    const labelText = `${label}: `
    doc.text(labelText, M, y)
    
    const labelW = doc.getTextWidth(labelText)
    const valX = M + labelW + 2
    const maxValW = CW - labelW - 2
    
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
    const valStr = String(value || '—')
    const lines = doc.splitTextToSize(valStr, maxValW)
    
    lines.forEach((line, i) => {
      if (i > 0) y = checkPage(y + 5, 5)
      doc.text(line, valX, y)
    })
    
    return y + 6
  }

  // ── RENDER TABLE WITH YELLOW HEADERS (continuous flow) ──
  const drawTable = (y, head, body, colStyles = {}) => {
    // Ensure table starts below header boundary
    const startY = Math.max(y, CONTENT_TOP)
    y = checkPage(startY, 30)
    
    // Explicitly reset char space and font to prevent messy spacing issues
    doc.setCharSpace(0)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M, top: CONTENT_TOP },
      theme: 'plain',
      styles: { 
        fontSize: 9, 
        textColor: DARK, 
        cellPadding: { top: 2, bottom: 2, left: 2, right: 2 }, 
        overflow: 'linebreak', 
        lineWidth: 0.2, 
        lineColor: [220, 220, 220],
        halign: 'left' 
      },
      headStyles: { fillColor: AMBER, textColor: BLACK, fontStyle: 'bold', fontSize: 8.5, lineWidth: 0.3, lineColor: AMBER_DARK, halign: 'left' },
      bodyStyles: { fillColor: WHITE, halign: 'left', fontStyle: 'normal' },
      alternateRowStyles: { fillColor: [252, 252, 250] },
      columnStyles: colStyles,
      head,
      body,
      didParseCell: (data) => {
        // Force left alignment on every single cell to prevent justification bugs
        if (data.cell.styles.halign !== 'left') {
           data.cell.styles.halign = 'left';
        }
      },
      didDrawPage: (hookData) => {
        // On page breaks from autoTable, redraw the header
        if (hookData.pageNumber > 1 || doc.internal.getCurrentPageInfo().pageNumber > 1) {
          drawPageHeader()
        }
      }
    })
    return doc.lastAutoTable.finalY + 12
  }

  // ═══════════════════════════════════════════════════════════════════
  // BUILD THE DOCUMENT (Continuous Flow)
  // ═══════════════════════════════════════════════════════════════════

  drawPageHeader()
  let y = CONTENT_TOP

  // ── 1. PROJECT OVERVIEW ──
  y = drawSectionTitle(y, 1, 'Project Overview')
  y = drawKV(y, 'Project Name', data.project_name)
  y = drawKV(y, 'Project Code', data.project_code)
  y = drawKV(y, 'Project Manager', data.project_manager)
  y = drawKV(y, 'Department', data.department)
  y = drawKV(y, 'Start Date', formatDate(data.start_date))
  y = drawKV(y, 'Completion Date', formatDate(data.completion_date))
  y = drawKV(y, 'Client Organization', data.client_organization)
  if (data.project_summary) {
    y += 3
    doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK); doc.text('Executive Summary:', M, y); y += 6
    y = drawParagraph(y, data.project_summary)
  }
  y += 5

  // ── 2. TECHNICAL ARCHITECTURE ──
  if (data.tech_stack_backend || data.tech_stack_frontend || data.architecture_description) {
    y = checkPage(y, 50)
    y = drawSectionTitle(y, 2, 'Technical Architecture')
    y = drawKV(y, 'Backend Stack', data.tech_stack_backend)
    y = drawKV(y, 'Frontend Stack', data.tech_stack_frontend)
    y = drawKV(y, 'Database Engine', data.tech_stack_database)
    if (data.architecture_description) {
      y += 2
      doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK); doc.text('Architecture Notes:', M, y); y += 6
      y = drawParagraph(y, data.architecture_description)
    }
    y += 5
  }

  // ── 3. DELIVERED MODULES ──
  if (data.modules?.length) {
    y = checkPage(y, 40)
    y = drawSectionTitle(y, 3, 'Delivered Modules')
    
    // Sanitize modules text to prevent "messy" justification issues with special chars
    const sanitizedModules = data.modules.map(m => {
      const moduleName = String(m.module_name || '-').replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim()
      const date = formatDate(m.delivery_date)
      const status = String(m.status || '-').replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim()
      
      // Ultra-aggressive sanitization: Keep ONLY standard ASCII. 
      // This removes invisible characters, non-breaking spaces, or zero-width spaces 
      // that confuse jsPDF's word-breaking engine and cause letter-spacing glitches.
      let notes = String(m.description || m.module_name || '-')
      notes = notes.replace(/[^\x20-\x7E]/g, ' ') // Replace non-ASCII with space
      notes = notes.replace(/\s+/g, ' ') // Collapse multiple spaces
      notes = notes.trim()
      
      return [moduleName, date, status, notes]
    })

    y = drawTable(y,
      [['Module Component', 'Delivery Date', 'Status', 'Closing Notes']],
      sanitizedModules,
      {
        0: { cellWidth: 40, halign: 'left' },
        1: { cellWidth: 35, halign: 'left' },
        2: { cellWidth: 25, halign: 'left' },
        3: { cellWidth: 65, halign: 'left' } 
      }
    )
  }

  // ── 4. STAKEHOLDERS ──
  if (data.stakeholders?.length) {
    y = checkPage(y, 40)
    y = drawSectionTitle(y, 4, 'Stakeholder Directory')
    y = drawTable(y,
      [['Name', 'Role', 'Organization', 'Email']],
      data.stakeholders.map(s => [s.name || '—', s.role || '—', s.organization || '—', s.email || '—'])
    )
  }

  // ── 5. INFRASTRUCTURE & HARDWARE ──
  if (data.servers?.length || data.assets?.length) {
    y = checkPage(y, 40)
    y = drawSectionTitle(y, 5, 'Infrastructure & Hardware')

    if (data.servers?.length) {
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK); doc.text('Server Topologies', M, y); y += 6
      y = drawTable(y,
        [['Server Name', 'IP Address', 'Role / Purpose', 'OS / Hosting', 'Location']],
        data.servers.map(s => [s.server_name || '—', s.ip_address || '—', s.role || s.purpose || '—', `${s.os || '—'} (${s.hosting_type || '—'})`, s.location || '—'])
      )
    }

    if (data.assets?.length) {
      y = checkPage(y, 30)
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK); doc.text('Physical Assets', M, y); y += 6
      y = drawTable(y,
        [['Asset Name', 'Model & Serial', 'Qty', 'Assignment Location']],
        data.assets.map(a => [
          a.asset_name || '—',
          `${a.model || '—'}\nSN: ${a.serial_number || '—'}`,
          String(a.quantity || 1),
          `${a.location || a.assignment_location || '—'}${a.assigned_to ? '\nAssigned: ' + a.assigned_to : ''}`
        ]),
        { 2: { cellWidth: 30, halign: 'center' } }
      )
    }
  }

  // ── 6. SYSTEM CREDENTIALS ──
  if (data.credentials?.length) {
    y = checkPage(y, 40)
    y = drawSectionTitle(y, 6, 'System Credentials')
    y = drawParagraph(y, 'The following system credentials have been securely provisioned to the authorized personnel. Passwords are intentionally omitted from this document.')
    y = drawTable(y,
      [['Target System', 'Username / ID', 'Password', 'Access Level', 'Securely Delivered To']],
      data.credentials.map(c => [
        c.system || '—', 
        c.username || '—', 
        c.password || '********',
        c.access_level || '—', 
        c.delivered_to || '—'
      ])
    )
  }

  // ── 7. SECURITY, BACKUP & MAINTENANCE ──
  if (data.backup_frequency || data.monitoring_tools || data.maintenance_schedule) {
    y = checkPage(y, 50)
    y = drawSectionTitle(y, 7, 'Security, Backup & Maintenance')

    // Bordered box with bullet points
    const boxStartY = y
    const bullets = []
    if (data.backup_frequency) bullets.push(`DR / Backup Protocol: ${data.backup_frequency}${data.backup_type ? ' + ' + data.backup_type : ''}`)
    if (data.monitoring_tools) bullets.push(`Monitoring & Alerting: ${data.monitoring_tools}`)
    if (data.maintenance_schedule) bullets.push(`Standard Maintenance Window: ${data.maintenance_schedule}`)
    if (data.patch_management) bullets.push(`Patch Management Cycle: ${data.patch_management}`)

    const boxH = bullets.length * 7 + 12
    y = checkPage(y, boxH + 5)
    doc.setDrawColor(...LIGHT_GRAY); doc.setLineWidth(0.5)
    doc.rect(M, y, CW, boxH, 'S')
    y += 6
    bullets.forEach(b => {
      doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
      doc.text(`• ${b}`, M + 6, y); y += 7
    })
    y += 10
  }

  // ── 8. REFERENCES & DOCUMENTATION ──
  if (data.documents?.length) {
    y = checkPage(y, 40)
    y = drawSectionTitle(y, 8, 'References & Documentation')
    y = drawTable(y,
      [['Document Reference Name', 'Doc Type', 'Version', 'URI Link']],
      data.documents.map(d => [d.document_name || '—', d.doc_type || '—', d.version || '—', d.uri || d.url || '—'])
    )
  }

  // ── 9. TRAINING & KNOWLEDGE TRANSFER ──
  if (data.training?.length) {
    y = checkPage(y, 40)
    y = drawSectionTitle(y, 9, 'Training & Knowledge Transfer')
    y = drawTable(y,
      [['Training Topic', 'Trainer', 'Date Handled', 'Status', 'Session Participants']],
      data.training.map(t => [t.topic || '—', t.trainer || '—', formatDate(t.training_date), t.completion_status || '—', String(t.participants || t.attendees || '—')])
    )
  }

  // ── 10. FINANCIAL HANDOVER CLOSURE ──
  if (data.total_project_value || data.financial_invoices?.length) {
    y = checkPage(y, 70)
    y = drawSectionTitle(y, 10, 'Financial Handover Closure')

    // Yellow financial summary card
    const cardH = 28
    y = checkPage(y, cardH + 10)
    doc.setFillColor(...AMBER); doc.roundedRect(M, y, CW, cardH, 3, 3, 'F')

    const tw = CW / 3
    const pending = data.pending_amount != null ? data.pending_amount : ((data.total_project_value || 0) - (data.amount_received || 0))

    ;[
      ['TOTAL PROJECT VALUE', data.total_project_value, BLACK],
      ['CAPITAL RECEIVED', data.amount_received, BLACK],
      ['PENDING AMOUNT', pending, RED]
    ].forEach(([label, val, color], i) => {
      const fx = M + i * tw + 10
      doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
      doc.text(label, fx, y + 8)
      doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(...color)
      doc.text(`${data.currency || 'INR'} ${formatNum(val)}`, fx, y + 18)
    })
    y += cardH + 10

    // Invoice Ledger
    if (data.financial_invoices?.length) {
      y = checkPage(y, 30)
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK); doc.text('Invoice Ledger', M, y); y += 6
      y = drawTable(y,
        [['Invoice Number', 'Generated Date', 'Gross Amount', 'Status']],
        data.financial_invoices.map(inv => [
          inv.invoice_no || '—',
          formatDate(inv.invoice_date),
          `${data.currency || 'INR'} ${formatNum(inv.amount)}`,
          inv.status || '—'
        ])
      )
    }
  }

  // ── 11. POST GO-LIVE SUPPORT OPERATIONS ──
  if (data.support_level || data.support_start_date || data.sla_notes) {
    y = checkPage(y, 40)
    y = drawSectionTitle(y, 11, 'Post Go-Live Support Operations')
    if (data.support_level) y = drawBullet(y, `Tier Support Level: ${data.support_level}`)
    if (data.support_start_date) y = drawBullet(y, `Commencement Date: ${formatDate(data.support_start_date)}`)
    if (data.support_end_date) y = drawBullet(y, `Term Expiration Date: ${formatDate(data.support_end_date)}`)
    if (data.sla_notes) y = drawBullet(y, data.sla_notes)
    y += 5
  }

  // ── 12. KNOWN RESIDUAL RISKS & OPEN LOGS ──
  if (data.issues?.length) {
    y = checkPage(y, 40)
    y = drawSectionTitle(y, 12, 'Known Residual Risks & Open Logs')
    y = drawTable(y,
      [['Issue / Risk Title', 'Impact Level', 'Classification', 'Resolution Owner']],
      data.issues.map(iss => [iss.issue_desc || '—', iss.impact || '—', iss.issue_type || '—', iss.owner || '—'])
    )
  }

  // ── 13. EXECUTIVE DIGITAL EXECUTION ──
  if (data.approvals?.length) {
    y = checkPage(y, 60)
    y = drawSectionTitle(y, 13, 'Executive Digital Execution')
    y = drawParagraph(y, 'This protocol document has been mutually executed by the stakeholders listed below. The signatures serve as verifiable binding acceptance of all parameters, scope limits, infrastructure validations, and residual issues stated within.')
    y += 5

    // Signature boxes
    y = checkPage(y, 50)
    const boxW = (CW - 10) / 2
    data.approvals.forEach((a, i) => {
      const bx = M + (i % 2) * (boxW + 10)
      if (i > 0 && i % 2 === 0) y += 35 // New row
      const by = y

      y = checkPage(by, 35)
      doc.setDrawColor(...LIGHT_GRAY); doc.setLineWidth(0.5)
      doc.rect(bx, by, boxW, 30, 'S')

      // Party label
      const partyLabel = a.party ? a.party.toUpperCase() : (i === 0 ? 'COMPANY DIRECTOR' : 'CLIENT REPRESENTATIVE')
      doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GRAY)
      doc.text(partyLabel, bx + 6, by + 8)

      // Name
      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
      doc.text(a.name || '—', bx + 6, by + 15)

      // Designation
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY)
      doc.text(a.designation || '—', bx + 6, by + 20)

      // Status
      if (a.has_signed) {
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GREEN_DARK)
        doc.text('[ ] D I G I T A L L Y   V E R I F I E D', bx + 6, by + 27)
      } else {
        doc.setFontSize(7); doc.setFont('helvetica', 'italic'); doc.setTextColor(...GRAY)
        doc.text('PENDING FORMAL SIGNATURE', bx + 6, by + 27)
      }
    })
    // If odd number of approvals, still need to advance y past the last row
    y += 35
  }

  // ══════════════════════════════════════════════
  // POST-PROCESS: Draw headers & footers on all pages
  // ══════════════════════════════════════════════
  totalPages = doc.internal.getNumberOfPages()

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    // Redraw header on every page (autoTable pages may have been added)
    drawPageHeader()
    drawFooter(i)
  }

  // Save
  doc.save(`HANDOVER_${(data.project_code || 'DOC').replace(/[^a-zA-Z0-9-]/g, '_')}_${Date.now()}.pdf`)
}
