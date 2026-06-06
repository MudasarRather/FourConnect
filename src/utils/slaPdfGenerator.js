import { jsPDF } from 'jspdf'

export const generateSlaPdf = (data, user = {}) => {
  const doc = new jsPDF()

  // --- BRAND COLORS (Warm Palette) ---
  const colors = {
    primary: [40, 40, 40],       // Soft Black
    secondary: [110, 110, 110],  // Grey
    brand: [245, 158, 11],       // Gold/Amber (#F59E0B)
    accent: [251, 146, 60],      // Orange (#FB923C)
    danger: [239, 68, 68],       // Red (#EF4444)
    bgLight: [252, 252, 252],    // Off-white for tables
    border: [230, 230, 230]      // Divider lines
  }

  // --- PDF SETTINGS ---
  doc.setProperties({
    title: data.title || 'Service Level Agreement',
    subject: data.description || '',
    author: data.provider_name || 'Service Provider',
    creator: 'Fourreck SLA Engine'
  })

  let yPos = 20
  const leftMargin = 20
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  const contentWidth = pageWidth - leftMargin * 2

  // --- PAGINATION HELPER ---
  const checkPageBreak = (needed = 20) => {
    if (yPos + needed > pageHeight - 25) {
      doc.addPage()
      yPos = 20
      drawHeader() // Redraw logo & title on new pages
      return true
    }
    return false
  }

  // --- LOGO & HEADER HELPER ---
  const drawHeader = () => {
    // 1. Draw Fourreck Logo (Matching Handover Document)
    const lx = leftMargin
    const ly = yPos
    const BLUE_LOGO = [37, 99, 235]
    
    // Draw the Icon (Blue Rectangle with white bars)
    doc.setFillColor(...BLUE_LOGO)
    doc.roundedRect(lx, ly, 10, 6, 1, 1, 'F')
    doc.setDrawColor(255, 255, 255)
    doc.setLineWidth(0.6)
    doc.line(lx + 2, ly + 2, lx + 8, ly + 2) // Long bar
    doc.line(lx + 5, ly + 4, lx + 8, ly + 4) // Short bar
    
    // Brand Name
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLUE_LOGO)
    doc.text('FOURRECK', lx + 14, ly + 5.5)

    // 2. Document Title Ribbon
    doc.setFillColor(...colors.accent)
    doc.rect(pageWidth - 70, yPos - 5, 70, 18, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(255, 255, 255)
    doc.text('SERVICE LEVEL AGREEMENT', pageWidth - 10, yPos + 6, { align: 'right' })

    yPos += 25
  }

  // --- TYPOGRAPHY HELPERS ---
  const addSectionHeader = (title) => {
    checkPageBreak(25)
    yPos += 5

    // High-end Apple/Corporate aesthetic vertical pill marker
    doc.setFillColor(...colors.brand)
    doc.roundedRect(leftMargin, yPos - 3.5, 3, 5, 1.5, 1.5, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...colors.primary)
    doc.text(title.toUpperCase(), leftMargin + 8, yPos + 1)

    // Underline
    doc.setDrawColor(...colors.border)
    doc.setLineWidth(0.2)
    doc.line(leftMargin + 8, yPos + 5, pageWidth - leftMargin, yPos + 5)

    yPos += 14
  }

  const LINE_H = 4.5
  const addParagraph = (text) => {
    if (!text) return
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...colors.secondary)

    // Split by explicit newlines to preserve user's paragraphs
    const paragraphs = text.split(/\r?\n/)

    let blankRun = 0
    paragraphs.forEach(para => {
      const pText = para.trim()
      if (!pText) {
         // Collapse runs of blank lines so a pasted clause with many empty lines
         // can't open a large vertical gap; one blank line of spacing, max.
         if (blankRun === 0) yPos += 3
         blankRun++
         return
      }
      blankRun = 0

      // Detect if it's a bullet point or numbered list
      const isListItem = /^[•\-\*]\s|^[A-Za-z0-9]+\.\s/i.test(pText)
      const renderX = isListItem ? leftMargin + 5 : leftMargin
      const renderWidth = isListItem ? contentWidth - 5 : contentWidth

      // Render LINE BY LINE so a long paragraph FLOWS onto the next page (filling
      // the current one) instead of jumping wholesale and leaving a big blank gap.
      const lines = doc.splitTextToSize(pText, renderWidth)
      lines.forEach((ln, i) => {
        checkPageBreak(LINE_H + 2)
        const isLast = i === lines.length - 1
        if (!isListItem && !isLast) {
          // Justify every line except the paragraph's last (a short last line
          // stretched to full width looks broken).
          doc.text(ln, renderX, yPos, { maxWidth: renderWidth, align: 'justify' })
        } else {
          doc.text(ln, renderX, yPos)
        }
        yPos += LINE_H
      })
      yPos += 3
    })
  }

  // --- ELEGANT MULTILINE TABLE RENDERER ---
  const drawTable = (headers, rows, colWidths) => {
    const rowHeight = 8
    const cellPadding = 3
    const tableWidth = colWidths.reduce((a, b) => a + b, 0)

    checkPageBreak(rowHeight * 2 + 10)
    let xPos = leftMargin

    // Header Row (Dark Amber)
    doc.setFillColor(...colors.accent)
    doc.rect(xPos, yPos - 5, tableWidth, rowHeight, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    headers.forEach((h, i) => {
      doc.text(h, xPos + cellPadding, yPos)
      xPos += colWidths[i]
    })
    yPos += rowHeight

    // Body Rows
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...colors.primary)

    rows.forEach((row, rowIdx) => {
      // Calculate max lines for this row
      let maxLines = 1
      const rowLines = row.map((cell, i) => {
        // Fix messy Indian Rupee symbols breaking jsPDF rendering
        const cellText = String(cell || '—').replace(/₹|Rs\.?/g, 'INR ')
        const lines = doc.splitTextToSize(cellText, colWidths[i] - cellPadding * 2)
        if (lines.length > maxLines) maxLines = lines.length
        return lines
      })

      const currentRowHeight = (maxLines * 4) + (cellPadding * 2) - 2
      checkPageBreak(currentRowHeight + 5)

      // RESTORE TEXT PROPERTIES: Page break might have called drawHeader and changed colors!
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...colors.primary)

      xPos = leftMargin

      // Alternating very light grey background
      if (rowIdx % 2 === 0) {
        doc.setFillColor(...colors.bgLight)
        doc.rect(xPos, yPos - cellPadding - 1, tableWidth, currentRowHeight, 'F')
      }

      // Subtle border for rows
      doc.setDrawColor(...colors.border)
      doc.rect(xPos, yPos - cellPadding - 1, tableWidth, currentRowHeight, 'S')

      rowLines.forEach((lines, i) => {
        doc.text(lines, xPos + cellPadding, yPos)
        xPos += colWidths[i]
      })
      yPos += currentRowHeight
    })

    yPos += 5
  }


  // ==========================================
  // DOCUMENT CONSTRUCTION
  // ==========================================

  drawHeader()

  // --- META INFO BOX ---
  doc.setDrawColor(...colors.brand)
  doc.setLineWidth(0.5)
  // Expand height to fit project
  doc.roundedRect(leftMargin, yPos, contentWidth, 32, 2, 2, 'S')

  yPos += 6
  doc.setFontSize(7)
  doc.setTextColor(...colors.secondary)
  doc.text('AGREEMENT REF', leftMargin + 5, yPos)
  doc.text('STATUS', leftMargin + 60, yPos)
  doc.text('EFFECTIVE DATE', leftMargin + 110, yPos)

  yPos += 5
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...colors.primary)
  doc.text(data.contract_reference || 'TBD', leftMargin + 5, yPos)
  doc.text(data.status?.toUpperCase() || 'DRAFT', leftMargin + 60, yPos)
  doc.text(data.start_date ? new Date(data.start_date).toLocaleDateString() : 'TBD', leftMargin + 110, yPos)

  yPos += 7
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...colors.secondary)
  doc.text('TARGET PROJECT', leftMargin + 5, yPos)

  yPos += 5
  // Highlight box for Project
  // IMPORTANT: Set font BEFORE splitting text so the engine calculates widths correctly
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  
  const projectTitleLines = doc.splitTextToSize(data.title || 'Master Agreement Details', contentWidth - 16)
  const titleHeight = projectTitleLines.length * 4.5
  
  doc.setFillColor(254, 252, 232) // Very light warm yellow 
  doc.roundedRect(leftMargin + 5, yPos - 3.5, contentWidth - 10, titleHeight + 2, 1, 1, 'F')

  doc.setTextColor(...colors.accent)
  doc.text(projectTitleLines, leftMargin + 8, yPos + 1)

  yPos += titleHeight + 2
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...colors.secondary)
  doc.text(`Version: ${data.version || '1.0'} | Renewal: ${data.renewal_type || 'Manual'}`, leftMargin + 5, yPos)
  yPos += 12


  // --- 1. PARTIES ---
  addSectionHeader('1. Participating Entities')

  const boxWidth = (contentWidth / 2) - 5
  const clientX = leftMargin + (contentWidth / 2) + 5

  // Calculate dynamic heights for boxes
  const provAddrLines = doc.splitTextToSize(data.provider_address || 'Address not provided', boxWidth - 10)
  const clientAddrLines = doc.splitTextToSize(data.client_address || 'Address not provided', boxWidth - 10)
  const maxAddrLines = Math.max(provAddrLines.length, clientAddrLines.length)
  const boxHeight = 24 + (maxAddrLines * 4)

  // Provider Box
  doc.setFillColor(...colors.bgLight)
  doc.setDrawColor(...colors.border)
  doc.roundedRect(leftMargin, yPos, boxWidth, boxHeight, 2, 2, 'FD')

  // Client Box
  doc.roundedRect(clientX, yPos, boxWidth, boxHeight, 2, 2, 'FD')

  yPos += 7
  doc.setFontSize(7)
  doc.setTextColor(...colors.accent)
  doc.setFont('helvetica', 'bold')
  doc.text('SERVICE PROVIDER', leftMargin + 5, yPos)
  doc.text('CLIENT', clientX + 5, yPos)

  yPos += 6
  doc.setFontSize(10)
  doc.setTextColor(...colors.primary)
  doc.text(data.provider_name || 'N/A', leftMargin + 5, yPos)
  doc.text(data.client_organization_name || 'N/A', clientX + 5, yPos)

  yPos += 5
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...colors.secondary)
  doc.text(provAddrLines, leftMargin + 5, yPos)
  doc.text(clientAddrLines, clientX + 5, yPos)

  yPos += (maxAddrLines * 4) + 2
  doc.setFontSize(8)
  if (data.provider_registration_number) doc.text(`Reg No: ${data.provider_registration_number}`, leftMargin + 5, yPos)
  else if (data.provider_tax_id) doc.text(`Tax ID/GST: ${data.provider_tax_id}`, leftMargin + 5, yPos)

  if (data.client_contact_person) doc.text(`Contact: ${data.client_contact_person}`, clientX + 5, yPos)

  yPos += 12


  // --- 2. OVERVIEW ---
  addSectionHeader('2. Agreement Overview')
  addParagraph(data.description)
  yPos += 2


  // --- 3. SERVICES ---
  if (data.services && data.services.length > 0) {
    addSectionHeader('3. Service Scope & Commitments')
    const svcColWidths = [45, 30, contentWidth - 75]
    drawTable(['Service Name', 'Category', 'Description'], data.services.map(s => [s.service_name, s.service_category, s.description]), svcColWidths)

    // Metrics for each service
    data.services.forEach(svc => {
      if (svc.metrics && svc.metrics.length > 0) {
        checkPageBreak(30)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...colors.accent)
        doc.text(`Metrics for: ${svc.service_name}`, leftMargin, yPos)
        yPos += 6

        const metricColWidths = [25, 25, 25, 30, contentWidth - 105]
        drawTable(
          ['Priority', 'Response', 'Resolution', 'Uptime Target', 'Measurement Tool'],
          svc.metrics.map(m => [m.priority_level, m.response_time, m.resolution_time, m.uptime_commitment, m.measurement_method]),
          metricColWidths
        )
      }
    })
  }

  // --- 4. SUPPORT & ESCALATION ---
  if (data.escalations && data.escalations.length > 0) {
    addSectionHeader('4. Support Matrix')
    const gs = data.escalations[0]

    // Support Availability Tag
    doc.setFillColor(...colors.brand)
    doc.roundedRect(leftMargin, yPos, 60, 10, 2, 2, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(`Availability: ${gs.support_availability || 'Standard'}`, leftMargin + 5, yPos + 6)

    if (gs.support_availability !== '24x7') {
      doc.setTextColor(...colors.secondary)
      doc.text(`Hours: ${gs.support_start_time || '09:00'} - ${gs.support_end_time || '17:00'} (${gs.timezone || 'UTC'})`, leftMargin + 65, yPos + 6)
    }
    yPos += 16

    const escColWidths = [20, 30, 35, 50, contentWidth - 135]
    drawTable(
      ['Tier', 'Role', 'Contact Person', 'Direct Contact', 'Max Response'],
      data.escalations.map(e => [e.level, e.role, e.contact_person, `${e.phone || ''} | ${e.email || ''}`, e.response_time]),
      escColWidths
    )
  }

  // --- 5. MONITORING & REPORTING (Step 6) ---
  if (data.monitoring_tools || data.monitoring_dashboard_url || data.reporting_frequency) {
    addSectionHeader('5. Monitoring & Reporting')
    let monStr = ''
    if (data.monitoring_tools && data.monitoring_tools.length > 0) monStr += `• Primary Measurement Tools: ${data.monitoring_tools.join(', ')}\n`
    if (data.monitoring_dashboard_url) monStr += `• Dashboard URL: ${data.monitoring_dashboard_url}\n`
    if (data.reporting_frequency) monStr += `• Review Frequency: ${data.reporting_frequency}\n`
    if (data.report_delivery_method) monStr += `• Delivery Method: ${data.report_delivery_method}\n`
    if (data.alert_notification_email) monStr += `• Automated Alerts: ${data.alert_notification_email}\n`

    // Aesthetic Box
    doc.setFillColor(...colors.bgLight)
    doc.setDrawColor(...colors.border)
    doc.roundedRect(leftMargin, yPos, contentWidth, 30, 2, 2, 'FD')
    yPos += 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...colors.secondary)
    const lines = doc.splitTextToSize(monStr, contentWidth - 10)
    doc.text(lines, leftMargin + 5, yPos)
    yPos += Math.max(lines.length * 4.5 + 8, 30)
  }

  // --- 6. SECURITY & COMPLIANCE (Step 7) ---
  addSectionHeader('6. Security & Compliance')

  const secLines = []
  if (data.compliance_standards && data.compliance_standards.length > 0) secLines.push(`• Standards: ${data.compliance_standards.join(', ')}`)
  if (data.security_measures && data.security_measures.length > 0) secLines.push(`• Security Protocols: ${data.security_measures.join(', ')}`)
  if (data.data_retention_policy) secLines.push(`• Retention Policy: ${data.data_retention_policy}`)
  if (data.incident_reporting_time) secLines.push(`• Incident Reporting Window: ${data.incident_reporting_time}`)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...colors.secondary)

  secLines.forEach(line => {
    const splitLines = doc.splitTextToSize(line, contentWidth - 5)
    checkPageBreak(splitLines.length * 4.5 + 4)
    doc.text(splitLines, leftMargin, yPos)
    yPos += splitLines.length * 4.5 + 2
  })
  yPos += 4


  // --- 7. COMMERCIALS & PENALTIES (Step 8) ---
  addSectionHeader('7. Commercials & Penalties')

  // Value & Payment
  if (data.agreement_value) {
    checkPageBreak(30)

    // Highly Prominent Financial Box Apple/Corporate Style
    doc.setFillColor(254, 252, 232) // Very light warm yellow box
    doc.setDrawColor(...colors.brand)
    doc.roundedRect(leftMargin, yPos, contentWidth, 26, 3, 3, 'FD')

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...colors.primary)
    doc.text('FINANCIAL AGREEMENT & BILLING', leftMargin + 8, yPos + 8)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...colors.accent) // Vivid Orange
    // Formatting numbers cleanly
    const formattedVal = Number(data.agreement_value).toLocaleString('en-IN')
    const currency = data.currency || 'INR'
    const freq = data.billing_frequency ? `(${data.billing_frequency})` : ''
    doc.text(`${currency} ${formattedVal} ${freq}`, leftMargin + 8, yPos + 18)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...colors.secondary)
    doc.text(`Payment Method: ${data.payment_method || 'N/A'}`, leftMargin + 8, yPos + 24)
    yPos += 35
  }

  if (data.penalties && data.penalties.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...colors.primary)
    doc.text('Service Credits & Breach Penalties', leftMargin, yPos)
    yPos += 10 // FIXED: Increased padding so text doesn't overlap table header

    // Fixed Column Widths mapping perfectly to contentWidth (170)
    const penColWidths = [45, 25, 40, contentWidth - 110]
    drawTable(
      ['Breach / Violation', 'Action Applied', 'Penalty Multiplier', 'Hard Limit'],
      data.penalties.map(p => [p.sla_violation, p.penalty_type, p.penalty_value, p.maximum_limit]),
      penColWidths
    )
  }

  // --- 8. LEGAL TERMS (Step 9) ---
  if (data.liability_limit || data.termination_conditions || data.force_majeure_clause || data.confidentiality_clause || data.intellectual_property_clause) {
    addSectionHeader('8. Legal & Terms')

    const printLegalBlock = (title, content) => {
      if (!content) return
      checkPageBreak(15)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...colors.primary)
      doc.text(title, leftMargin, yPos)
      yPos += 5

      addParagraph(content)
      yPos += 1 // Adding small padding after legal block
    }

    printLegalBlock('Limitation of Liability:', data.liability_limit)
    printLegalBlock('Termination Conditions:', data.termination_conditions)
    printLegalBlock('Confidentiality Clause (NDA override):', data.confidentiality_clause)
    printLegalBlock('Intellectual Property:', data.intellectual_property_clause)
    printLegalBlock('Force Majeure:', data.force_majeure_clause)
  }

  // --- 9. DIGITAL EXECUTION ---
  if (data.signatories && data.signatories.length > 0) {
    // Reserve room for the WHOLE section (header + intro + both signature blocks)
    // so it never splits, leaving the signatures orphaned on a near-empty page.
    checkPageBreak(72)
    addSectionHeader('9. Digital Execution Authorization')

    addParagraph("This agreement has been digitally authorized. The signatures below serve as binding acceptance of all terms, conditions, and service levels outlined in this document.")
    yPos += 10

    const sigWidth = 80
    data.signatories.slice(0, 2).forEach((sig, idx) => {
      const currentX = idx === 0 ? leftMargin : pageWidth - sigWidth - leftMargin

      doc.setFontSize(7)
      doc.setTextColor(...colors.secondary)
      doc.setFont('helvetica', 'normal')
      doc.text(`AUTHORIZED FOR: ${sig.party?.toUpperCase() || ''}`, currentX, yPos)

      // Name
      doc.setFontSize(10)
      doc.setTextColor(...colors.primary)
      doc.setFont('helvetica', 'bold')
      doc.text(sig.name || 'Signatory Name', currentX, yPos + 5)

      // Title
      doc.setFontSize(8)
      doc.setTextColor(...colors.brand)
      doc.text(sig.designation || 'Title', currentX, yPos + 9)

      // Signature Area Logic
      if (sig.party && sig.party.toLowerCase().includes('client')) {
         // Client: Placeholder for direct signature
         doc.setFontSize(8)
         doc.setTextColor(150, 150, 150)
         doc.setFont('helvetica', 'italic')
         doc.text("[ TO BE EXECUTED BY CLIENT ]", currentX, yPos + 16)
      } else {
         // "Encrypted" Hash look representing digital sign
         doc.setFont('courier', 'normal')
         doc.setFontSize(7)
         doc.setTextColor(150, 150, 150)
         const fakeHash = `SIGNED_SLA_${new Date().getTime().toString(36).toUpperCase()}_KEY_${idx + 1}`
         doc.text(fakeHash, currentX, yPos + 16)

         // Verified Badge Dot
         const hashWidth = doc.getTextWidth(fakeHash)
         doc.setFillColor(34, 197, 94) // Green success dot
         doc.circle(currentX + hashWidth + 4, yPos + 14, 1.5, 'F')
      }

      // Timestamp
      doc.setFont('helvetica', 'normal')
      doc.text(`Date Executed: _____________________`, currentX, yPos + 22)
    })
    yPos += 30
  }

  // ==========================================
  // FOOTER INJECTION (on all pages)
  // ==========================================
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)

    doc.setDrawColor(...colors.brand)
    doc.setLineWidth(0.5)
    doc.line(80, pageHeight - 15, 130, pageHeight - 15) // Small center line

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...colors.secondary)
    doc.text(`Fourreck SLA Engine | Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
  }

  // Download
  const filename = `SLA_${data.client_organization_name || 'Agreement'}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename.replace(/\s+/g, '_'))
}
