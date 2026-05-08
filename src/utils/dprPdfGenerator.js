import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * V4 DYNAMIC FUSION ENGINE (Polished)
 * Fixing text truncations, auto-pagination, and specific data inclusions.
 */
export const generateDprPdf = (data) => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.width
  const H = doc.internal.pageSize.height
  const M = 24 // Base Margin
  const CW = W - 2 * M

  // ---------------------------------------------------------------------------
  // 1. DYNAMIC COLOR GENERATOR (Vibrant Warm Hues: 0° - 55°)
  // ---------------------------------------------------------------------------
  let seed = 42
  const ss = (data.title || '') + (data.dpr_code || '') + (data.created_at || '1')
  for (let i = 0; i < ss.length; i++) seed = (seed * 31 + ss.charCodeAt(i)) & 0xFFFFFF
  const rng = () => { seed = (seed * 16807 + 12345) & 0x7FFFFFFF; return (seed & 0xFFFF) / 0xFFFF }

  const h2r = (h, s, l) => {
    h /= 360; s /= 100; l /= 100
    if (!s) { const v = Math.round(l * 255); return [v, v, v] }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q
    const f = (t) => { t = ((t % 1) + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p }
    return [Math.round(f(h + 1 / 3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1 / 3) * 255)]
  }

  const hue = rng() * 55 // Reds, Oranges, Ambers
  const A1 = h2r(hue, 85, 48)     // Primary vibrant (e.g., pure Red)
  const A2 = h2r(hue, 95, 35)     // Deep vibrant (for stripes/contrast)
  const Tint = h2r(hue, 30, 95)    // Almost white with warm tint
  
  const BG_DARK = [18, 18, 20]     // Deep off-black
  const SURF_DARK = [32, 32, 36]   // Elevated dark surface for cards
  const BG_LIGHT = [245, 245, 248] // Off-white
  const SURF_LIGHT = [255, 255, 255]
  
  const T_WHITE = [255, 255, 255]
  const T_DARK = [18, 18, 20]
  const T_GRAY = [160, 160, 165]
  
  const FR_LOGO = [108, 161, 58]

  // ---------------------------------------------------------------------------
  // 2. PREMIUM DRAWING UTILS (Stripes, Depth, Alignment)
  // ---------------------------------------------------------------------------
  const drawLogo = (x, y, s, logoColor) => {
    doc.setFillColor(...logoColor); doc.rect(x, y, s * 2.4, s * 1.1, 'F')
    doc.setFillColor(...BG_DARK) // Inner gaps match dark bg by default
    const gh = s * 1.1 * 0.08, gw = s * 2.4 * 0.5
    doc.rect(x + s * 2.4 * 0.45, y + s * 1.1 * 0.35, gw, gh, 'F')
    doc.rect(x + s * 2.4 * 0.45, y + s * 1.1 * 0.65, gw * 0.7, gh, 'F')
  }

  const drawStripes = (yOffset, totalH, direction = 'down', baseColor = A2) => {
    const stripes = 5; const sh = totalH / stripes
    doc.saveGraphicsState()
    for (let i = 0; i < stripes; i++) {
      const op = direction === 'down' ? (1 - i/stripes)*0.4 : ((i+1)/stripes)*0.4
      doc.setGState(new doc.GState({ opacity: op }))
      doc.setFillColor(...baseColor)
      doc.rect(0, yOffset + (i*sh), W, sh, 'F')
    }
    doc.restoreGraphicsState()
  }

  // Changed to NO LONGER clip lines. It returns all.
  const fitText = (text, maxWidth, font, size, weight) => {
    doc.setFont(font, weight); doc.setFontSize(size)
    const raw = String(text || '—')
    return doc.splitTextToSize(raw, maxWidth)
  }

  const footer = (mod, isDarkBg) => {
    doc.setFillColor(...(isDarkBg ? A1 : BG_DARK))
    doc.rect(0, H - 7, W, 7, 'F')
    doc.setFontSize(6); doc.setFont('helvetica', 'bold'); doc.setTextColor(...T_WHITE)
    doc.text(`FOURRECK ENTERPRISE DPR`, M, H - 2.5)
    doc.text(data.dpr_code || 'REPORT', W - M, H - 2.5, { align: 'right' })
    if (mod) doc.text(`MOD ${mod}`, W/2, H - 2.5, { align: 'center' })
  }

  // Render text and auto-paginate if it exceeds page height.
  // We need to pass down layout drawing functions so new pages look identical to their base.
  const renderTextMapWithPagination = (x, y, title, body, w, isDarkBg, heavy, customBackgroundFn) => {
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...A1)
    doc.text(title.toUpperCase(), x, y)
    
    let currentY = y + 6
    const lines = fitText(body, w, 'helvetica', heavy ? 12 : 10, heavy ? 'bold' : 'normal')
    doc.setTextColor(...(isDarkBg ? T_WHITE : T_DARK))
    
    const lineHeight = heavy ? 6 : 5.5
    for (let i = 0; i < lines.length; i++) {
      if (currentY > H - 25) { // Need new page
        doc.addPage()
        customBackgroundFn() // Redraw the background/layout aesthetics
        currentY = M + 20
        doc.setFont('helvetica', heavy ? 'bold' : 'normal')
        doc.setFontSize(heavy ? 12 : 10)
        doc.setTextColor(...(isDarkBg ? T_WHITE : T_DARK))
      }
      doc.text(lines[i], x, currentY)
      currentY += lineHeight
    }
    return currentY + 8 // Some padding after block
  }

  const wmText = (text, isLightBg) => {
    doc.saveGraphicsState()
    doc.setGState(new doc.GState({ opacity: isLightBg ? 0.04 : 0.02 }))
    doc.setFontSize(90); doc.setFont('helvetica', 'bold')
    doc.setTextColor(...(isLightBg ? T_DARK : T_WHITE))
    doc.text(text, W / 2, H / 2, { align: 'center', angle: -45 })
    doc.restoreGraphicsState()
  }

  // ---------------------------------------------------------------------------
  // 3. LIVE DASHBOARD COVER (Page 1) - High Contrast Dark Mode + Red Split
  // ---------------------------------------------------------------------------
  doc.setFillColor(...BG_DARK); doc.rect(0, 0, W, H, 'F')
  
  // Right red block for logo
  doc.setFillColor(...A1); doc.rect(W - W*0.35, 0, W*0.35, H, 'F')
  
  doc.setDrawColor(...T_GRAY); doc.setLineWidth(0.4); doc.line(M, 32, M+35, 32)
  drawLogo(M, 20, 5, FR_LOGO); doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...FR_LOGO); doc.text('FOURRECK', M + 17, 25)
  
  doc.setFontSize(38); doc.setTextColor(...T_WHITE)
  const hLines = doc.splitTextToSize((data.title || 'Enterprise Proposal').toUpperCase(), W*0.6)
  doc.text(hLines, M, 60, { lineHeightFactor: 1.1 })
  doc.setFillColor(...A1); doc.rect(M, 60 + hLines.length * 14 + 5, 45, 4, 'F') // Thick red line
  doc.setFontSize(10); doc.setTextColor(...T_GRAY); doc.text('DETAILED PROJECT REPORT', M, 60 + hLines.length * 14 + 18)

  const wY = 60 + hLines.length * 14 + 35, gW = (W*0.6 - M) / 2
  
  // Fix truncation for Timeline text
  let timelineText = `${data.overview?.start_date || 'N/A'} — ${data.overview?.end_date || 'N/A'}`
  doc.setFontSize(10); doc.setFont('helvetica', 'bold')
  if (doc.getTextWidth(timelineText) > gW - 16) {
    timelineText = `${data.overview?.start_date || 'N/A'}\nTO ${data.overview?.end_date || 'N/A'}`
  }

  const widgets = [
    { l: 'BUDGET', v: data.budget ? `${data.budget.currency||'INR'} ${data.budget.total_amount?.toLocaleString()||'0'}` : 'TBD' },
    { l: 'TIMELINE', v: timelineText },
    { l: 'STATUS', v: (data.status || 'Internal Review').toUpperCase() },
    { l: 'TEAM SIZE', v: data.team ? `${data.team.length} Members` : 'TBD' }
  ]
  widgets.forEach((w, i) => {
    const wx = M + (i % 2) * (gW + 10), wy = wY + Math.floor(i / 2) * 28
    doc.setFillColor(...SURF_DARK); doc.roundedRect(wx, wy, gW, 22, 3, 3, 'F')
    doc.setFillColor(...A1); doc.rect(wx, wy+2, 4, 18, 'F')
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...T_GRAY); doc.text(w.l, wx + 10, wy + 8)
    doc.setFontSize(10); doc.setTextColor(...A1); 
    doc.text(w.v, wx + 10, wy + 16, { lineHeightFactor: 1.2 }) // Handled explicitly so wrapping is safe
  })

  // Stripes on bottom part of dark bg
  drawStripes(H - 90, 90, 'down', A2)

  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...A1); doc.text('PREPARED FOR', M, H - 65)
  doc.setFontSize(14); doc.setTextColor(...T_WHITE)
  doc.text(doc.splitTextToSize((data.client?.client_name || 'Client Name').toUpperCase(), W*0.6)[0], M, H - 55)
  doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(...T_GRAY); doc.text(data.client?.organization || 'Government', M, H - 47)
  
  doc.setFontSize(8); doc.setTextColor(...T_GRAY); doc.text(new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase(), M, H - 35)
  doc.setFillColor(...SURF_DARK); doc.roundedRect(M, H - 28, 60, 16, 3, 3, 'F')
  doc.setFontSize(6); doc.setFont('helvetica', 'bold'); doc.setTextColor(...T_GRAY); doc.text('DOCUMENT ID', M + 8, H - 21)
  doc.setFontSize(11); doc.setTextColor(...A1); doc.text(data.dpr_code || 'DPR-000', M + 8, H - 14)
  footer()

  // ---------------------------------------------------------------------------
  // 4. BIG BOLD TABLE OF CONTENTS 
  // ---------------------------------------------------------------------------
  doc.addPage(); doc.setFillColor(...BG_LIGHT); doc.rect(0, 0, W, H, 'F')
  wmText('CONFIDENTIAL', true)
  doc.setFillColor(...Tint); doc.rect(0, 0, W, 45, 'F')
  doc.setFontSize(26); doc.setFont('helvetica', 'bold'); doc.setTextColor(...T_DARK); doc.text('TABLE OF CONTENTS', M, 30)
  doc.setDrawColor(...A1); doc.setLineWidth(1); doc.line(M, 38, M + 70, 38)
  
  const tocList = ['Project Overview', 'Stakeholder Analysis', 'Problem Statement', 'Strategic Objectives', 'Scope Boundaries', 'Technical Architecture', 'Implementation Mechanics', 'Milestones Blueprint', 'Assigned Taskforce', 'Financial Modeling', 'Risk Vector Mapping', 'System Compliance', 'Projection & Outcomes', 'Attachments', 'Approvals & Sign-off']
  let ty = 60
  tocList.forEach((item, i) => {
    doc.setFillColor(...A1); doc.roundedRect(M, ty-5, 14, 10, 2, 2, 'F')
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...T_WHITE); doc.text(String(i+1).padStart(2,'0'), M+4, ty+2)
    doc.setFontSize(12); doc.setFont('helvetica', 'normal'); doc.setTextColor(...T_DARK); doc.text(item, M + 24, ty+2.5)
    doc.setDrawColor(...T_GRAY); doc.setLineWidth(0.1); doc.saveGraphicsState(); doc.setGState(new doc.GState({ opacity: 0.3 }))
    doc.line(M+24, ty+5, M+24 + 100, ty+5); doc.restoreGraphicsState(); ty += 15
  })
  footer()

  // ---------------------------------------------------------------------------
  // 5. THE 15-LAYOUT ENGINE (Vibrant, Thick, Auto-Paginated)
  // ---------------------------------------------------------------------------

  const l_01_heroLeft = (n, t, b) => { 
    const drawBg = () => { doc.setFillColor(...BG_LIGHT); doc.rect(0, 0, W, H, 'F'); doc.setFillColor(...A1); doc.rect(0, 0, M*1.2, H, 'F'); footer(n) }
    doc.addPage(); drawBg(); doc.setFillColor(...FR_LOGO); doc.rect(M*1.5, M, 10, 5, 'F')
    doc.setFontSize(36); doc.setFont('helvetica', 'bold'); doc.setTextColor(...T_DARK); doc.text(t.toUpperCase(), M*1.6 + 15, 45, { maxWidth: CW - M })
    doc.setDrawColor(...A1); doc.setLineWidth(0.5); doc.line(M*1.6 + 15, 55, W-M, 55)
    let y = 70
    b.forEach(x => { y = renderTextMapWithPagination(M*1.6 + 15, y, x.label, x.value, W - (M*1.6 + 15) - M, false, false, drawBg) })
  }

  const l_02_massDark = (n, t, b) => { 
    const drawBg = () => { doc.setFillColor(...BG_DARK); doc.rect(0, 0, W, H, 'F'); drawStripes(H-80, 80, 'down', A2); footer(n, true) }
    doc.addPage(); drawBg()
    doc.setFontSize(32); doc.setFont('helvetica', 'bold'); doc.setTextColor(...T_WHITE); doc.text(t.toUpperCase(), M, 40)
    let y = 60
    b.forEach(x => {
      // For massDark we need block background calculation inside pagination which is complex.
      // So we will just use basic left-aligned text for the block to allow flow.
      doc.setFillColor(...A1); doc.rect(M, y, 3, 15, 'F') // Just an accent line now to allow pagination
      y = renderTextMapWithPagination(M+10, y, x.label, x.value, CW-16, true, false, drawBg) + 8
    })
  }

  const l_03_fullRedStripes = (n, t, b) => { 
    const drawBg = () => { doc.setFillColor(...A1); doc.rect(0, 0, W, H, 'F'); drawStripes(H-100, 100, 'up', A2); footer(n, true) }
    doc.addPage(); drawBg()
    doc.setFontSize(40); doc.setFont('helvetica', 'bold'); doc.setTextColor(...T_WHITE); doc.text(doc.splitTextToSize(t.toUpperCase(), CW), M, 60, { lineHeightFactor: 1.1 })
    doc.setDrawColor(...T_WHITE); doc.setLineWidth(1); doc.line(M, 80, M+60, 80)
    let y = 100
    b.forEach(x => { y = renderTextMapWithPagination(M, y, x.label, x.value, CW, true, true, drawBg) + 6 })
  }

  const tableDark = (n, t, head, bodyRows, isFinance = false) => { 
    doc.addPage(); doc.setFillColor(...BG_DARK); doc.rect(0, 0, W, H, 'F'); drawStripes(0, 50, 'down', A2)
    doc.setFontSize(30); doc.setFont('helvetica', 'bold'); doc.setTextColor(...T_WHITE); doc.text(t.toUpperCase(), M, 40)
    
    let yOffset = 50
    if (isFinance && data.budget) {
       doc.setFontSize(10); doc.setTextColor(...T_GRAY); doc.text('ESTIMATED TOTAL INVESTMENT:', M, 55)
       doc.setFontSize(24); doc.setTextColor(...A1); doc.text(`${data.budget.currency || 'INR'} ${data.budget.total_amount?.toLocaleString() || '0'}`, M, 65)
       yOffset = 75
    }

    autoTable(doc, { 
      theme: 'plain', margin: { left: M, right: M, top: yOffset }, headStyles: { fillColor: SURF_DARK, textColor: A1, fontStyle: 'bold' },
      bodyStyles: { fillColor: BG_DARK, textColor: T_WHITE, cellPadding: 5 }, alternateRowStyles: { fillColor: SURF_DARK }, head, body: bodyRows
    }); footer(n, true)
  }

  const l_05_halfSplit = (n, t, b) => { 
    const drawBg = () => { doc.setFillColor(...BG_DARK); doc.rect(0, 0, W*0.5, H, 'F'); doc.setFillColor(...A1); doc.rect(W*0.5, 0, W*0.5, H, 'F'); footer(n, true) }
    doc.addPage(); drawBg()
    // Reduced title font size to fix "SCOPE B OUNDARI ES" clipping!
    doc.setFontSize(28); doc.setFont('helvetica', 'bold'); doc.setTextColor(...T_WHITE); doc.text(doc.splitTextToSize(t.toUpperCase(), W*0.5 - 2*M), M, 60, { lineHeightFactor: 1.1 })
    doc.setFontSize(80); doc.setTextColor(...A2); doc.text(n, M, 140)
    let y = 60
    b.forEach(x => { y = renderTextMapWithPagination(W*0.5 + 10, y, x.label, x.value, W*0.5 - 20, true, false, drawBg) + 4 })
  }

  const l_06_solidLightGrid = (n, t, b) => { 
    const drawBg = () => { doc.setFillColor(...BG_LIGHT); doc.rect(0, 0, W, H, 'F'); doc.setFillColor(...A1); doc.rect(0, 0, W, 40, 'F'); footer(n) }
    doc.addPage(); drawBg()
    doc.setFontSize(26); doc.setFont('helvetica', 'bold'); doc.setTextColor(...T_WHITE); doc.text(t.toUpperCase(), M, 25)
    let y = 60; const boxW = (CW - 10)/2
    b.forEach((x, i) => {
      const bx = M + (i % 2) * (boxW + 10); const by = y + Math.floor(i / 2) * 60; if (by > H - 60) return
      doc.setFillColor(...SURF_LIGHT); doc.roundedRect(bx, by, boxW, 55, 3, 3, 'F')
      doc.setFillColor(...BG_DARK); doc.rect(bx, by, boxW, 5, 'F')
      // For grid layout, we won't paginate internally because it's a fixed box, we'll slice securely.
      const lines = fitText(x.value, boxW-16, 'helvetica', 10, 'normal', 8)
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...A1); doc.text(x.label.toUpperCase(), bx+8, by+15)
      doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...T_DARK); doc.text(lines, bx+8, by+21, { lineHeightFactor: 1.5 })
    })
  }

  const l_07_centerColumn = (n, t, b) => { 
    const drawBg = () => { doc.setFillColor(...SURF_LIGHT); doc.rect(0, 0, W, H, 'F'); wmText(`MODULE ${n}`, true); footer(n) }
    doc.addPage(); drawBg()
    doc.setFontSize(36); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BG_DARK); doc.text(t.toUpperCase(), W/2, 50, { align:'center' })
    doc.setFillColor(...A1); doc.rect(W/2 - 20, 60, 40, 2, 'F')
    let y = 80
    b.forEach(x => {
      // Manual pagination for centered text
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...A1); doc.text(`// ${x.label.toUpperCase()}`, W/2, y, { align:'center' })
      const lines = fitText(x.value, CW, 'helvetica', 11, 'normal')
      doc.setTextColor(...T_DARK); doc.setFont('helvetica', 'normal'); 
      let cY = y+7
      for (let i = 0; i < lines.length; i++) {
        if (cY > H-25) { doc.addPage(); drawBg(); cY = M+20; doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(...T_DARK); }
        doc.text(lines[i], W/2, cY, { align:'center' }); cY += 6
      }
      y = cY + 15
    })
  }

  const tableLight = (n, t, head, bodyRows) => { 
    doc.addPage(); doc.setFillColor(...BG_LIGHT); doc.rect(0, 0, W, H, 'F')
    doc.setFontSize(26); doc.setFont('helvetica', 'bold'); doc.setTextColor(...T_DARK); doc.text(t.toUpperCase(), M, 35)
    doc.setFillColor(...A1); doc.rect(M, 42, 50, 2, 'F')
    autoTable(doc, { 
      theme: 'plain', margin: { left: M, right: M, top: 55 }, styles: { cellPadding: 6 },
      headStyles: { fillColor: SURF_LIGHT, textColor: A1, fontStyle: 'bold', lineWidth: {bottom: 1}, lineColor: A1 },
      bodyStyles: { fillColor: BG_LIGHT, textColor: T_DARK }, alternateRowStyles: { fillColor: SURF_LIGHT }, head, body: bodyRows
    }); footer(n)
  }

  const l_09_invertedHero = (n, t, b) => { 
    const drawBg = () => { doc.setFillColor(...SURF_DARK); doc.rect(0, 0, W, H, 'F'); doc.setFillColor(...BG_DARK); doc.rect(0, 0, W*0.35, H, 'F'); footer(n, true) }
    doc.addPage(); drawBg()
    doc.setFontSize(44); doc.setFont('helvetica', 'bold'); doc.setTextColor(...A1)
    doc.text(doc.splitTextToSize(t.toUpperCase(), W*0.65 - M), W*0.35 + 10, 60, { lineHeightFactor: 1.1 })
    let y = 100
    b.forEach(x => { y = renderTextMapWithPagination(W*0.35 + 10, y, x.label, x.value, W*0.65 - M - 10, true, true, drawBg) + 8 })
  }

  const l_10_ribbonDeck = (n, t, b) => { 
    const drawBg = () => { doc.setFillColor(...BG_LIGHT); doc.rect(0, 0, W, H, 'F'); doc.setFillColor(...BG_DARK); doc.rect(M, 0, CW*0.8, H, 'F'); footer(n) }
    doc.addPage(); drawBg()
    doc.setFontSize(30); doc.setFont('helvetica', 'bold'); doc.setTextColor(...T_WHITE)
    doc.text(doc.splitTextToSize(t.toUpperCase(), CW*0.8 - 20), M+10, 50, { lineHeightFactor: 1.1 })
    let y = 80
    b.forEach(x => { y = renderTextMapWithPagination(M+10, y, x.label, x.value, CW*0.8 - 20, true, false, drawBg) + 8 })
  }

  const l_12_minimalBlock = (n, t, b) => { 
    const drawBg = () => { doc.setFillColor(...SURF_LIGHT); doc.rect(0, 0, W, H, 'F'); doc.setFillColor(...A1); doc.rect(0, 0, W, 25, 'F'); footer(n) }
    doc.addPage(); drawBg()
    doc.setFontSize(28); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BG_DARK); doc.text(t.toUpperCase(), M, 50)
    let y = 70
    b.forEach(x => { y = renderTextMapWithPagination(M, y, x.label, x.value, CW, false, false, drawBg) + 8 })
  }

  const l_13_bigDots = (n, t, b) => { 
    const drawBg = () => { 
      doc.setFillColor(...BG_DARK); doc.rect(0, 0, W, H, 'F')
      for(let i=0; i<3; i++) { doc.setFillColor(...SURF_DARK); doc.circle(W-20, 50+(i*40), 10, 'F') }
      footer(n, true) 
    }
    doc.addPage(); drawBg()
    doc.setFontSize(36); doc.setFont('helvetica', 'bold'); doc.setTextColor(...T_WHITE); doc.text(doc.splitTextToSize(t.toUpperCase(), CW-30), M, 60, { lineHeightFactor: 1.1 })
    doc.setFillColor(...A1); doc.rect(M, 80, 50, 4, 'F')
    let y = 100
    b.forEach(x => { y = renderTextMapWithPagination(M, y, x.label, x.value, CW-30, true, false, drawBg) + 10 })
  }

  // ---------------------------------------------------------------------------
  // 6. MAP SECTIONS 1-TO-1 TO PREVENT DUPLICATES
  // ---------------------------------------------------------------------------
  const bObj = (l, v) => ({ label: l, value: v })
  
  l_01_heroLeft('01', 'Project Overview', [
    bObj('Timeline Boundary', `${data.overview?.start_date||'N/A'} to ${data.overview?.end_date||'N/A'}`), bObj('Executive Description', data.overview?.description)
  ])

  l_02_massDark('02', 'Stakeholder Analysis', [
    bObj('Client Entity', data.client?.client_name), bObj('Organization', data.client?.organization),
    bObj('Contact Details', `E: ${data.client?.email||'—'} | P: ${data.client?.phone||'—'}`), bObj('Address Base', data.client?.address)
  ])

  l_03_fullRedStripes('03', 'Problem Statement', [
    bObj('Core Issue', data.problem_statement?.statement), bObj('Current System Challenges', data.problem_statement?.current_challenges),
    bObj('Impact Vectors', data.problem_statement?.impact_analysis)
  ])

  const obj = (data.objectives || []).map((o, i) => [String(i+1).padStart(2,'0'), o.title||'—', o.priority||'—', o.description||'—'])
  if (obj.length) tableDark('04', 'Strategic Objectives', [['#', 'Objective', 'Priority', 'Description']], obj)

  l_05_halfSplit('05', 'Scope Boundaries', [
    bObj('In-Scope Deliverables', data.scope?.in_scope), bObj('Out of Scope', data.scope?.out_of_scope),
    bObj('Key Assumptions', data.scope?.assumptions), bObj('Limiting Constraints', data.scope?.constraints)
  ])

  l_06_solidLightGrid('06', 'Technical Architecture', [
    bObj('Backend Matrix', data.architecture?.tech_stack?.backend), bObj('Frontend Interface', data.architecture?.tech_stack?.frontend),
    bObj('Data Layer', data.architecture?.tech_stack?.database), bObj('System Documentation', data.architecture?.description)
  ])

  l_07_centerColumn('07', 'Implementation Mechanics', [
    bObj('Chosen Methodology', data.implementation?.methodology), bObj('Delivery Phases', data.implementation?.phases), bObj('Rollout Strategy', data.implementation?.deployment_strategy)
  ])

  const msR = (data.milestones || []).map((m, i) => [String(i+1).padStart(2,'0'), m.title||'—', m.due_date||'TBD', m.deliverables||'—'])
  if (msR.length) tableLight('08', 'Milestones Blueprint', [['ID', 'Milestone Node', 'Target Date', 'Expected Output']], msR)

  const tmR = (data.team || []).map(t => [t.name||'—', t.role||'—', t.responsibility||'—'])
  if (tmR.length) tableLight('09', 'Assigned Taskforce', [['Personnel Name', 'Designation Role', 'Accountability']], tmR)

  const bR = (data.budget_items || []).map(bItem => [bItem.category||'—', bItem.description||'—', `${data.budget?.currency||'INR'} ${bItem.amount?.toLocaleString()||'0'}`])
  if (bR.length) tableDark('10', 'Financial Modeling', [['Ledger Category', 'Allocation Details', 'Projected Amount']], bR, true) // isFinance=true fixes estimated investment missing

  const rR = (data.risks || []).map(r => [r.risk_description||'—', r.impact||'—', r.mitigation_plan||'—'])
  if (rR.length) tableLight('11', 'Risk Vector Mapping', [['Risk Hypothesis', 'Business Impact Severity', 'Mitigation Mechanism']], rR)

  l_10_ribbonDeck('12', 'System Compliance', [
    bObj('Statutory Law & Logic', data.compliance?.legal_requirements), bObj('Industry Standard Benchmarks', data.compliance?.regulatory_standards),
    bObj('Cybersecurity Policies', data.compliance?.security_policies)
  ])

  l_13_bigDots('13', 'Projection & Outcomes', [
    bObj('Success Velocity (KPIs)', data.outcomes?.kpis), bObj('Tangible Physical ROI', data.outcomes?.tangible_benefits),
    bObj('Strategic Intangible Levers', data.outcomes?.intangible_benefits)
  ])

  // ---------------------------------------------------------------------------
  // 7. MASSIVE, BOLD CLOSING PAGE (Contact Us Style)
  // ---------------------------------------------------------------------------
  doc.addPage(); doc.setFillColor(...BG_DARK); doc.rect(0, 0, W, H, 'F'); drawStripes(0, 100, 'down', A2)
  drawLogo(W/2 - 6, H*0.2, 5, T_WHITE)
  doc.setFontSize(40); doc.setFont('helvetica', 'bold'); doc.setTextColor(...T_WHITE); doc.text('CONTACT US.', W/2, H*0.35, { align: 'center' })
  doc.setFillColor(...A1); doc.rect(W/2 - 40, H*0.4, 80, 2, 'F')

  let cy = H * 0.5
  const contactInfo = [
    { label: 'EMAIL', value: 'info@fourreck.com' },
    { label: 'PHONE', value: '+91-7006236475' },
    { label: 'WEBSITE', value: 'www.fourreck.com' },
    { label: 'ADDRESS', value: 'Karan Nagar, Srinagar, J&K, 190010, India' }
  ]

  contactInfo.forEach(c => {
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...A1)
    doc.text(c.label, W/2, cy, { align: 'center' })
    doc.setFontSize(14); doc.setFont('helvetica', 'normal'); doc.setTextColor(...T_WHITE)
    doc.text(c.value, W/2, cy + 8, { align: 'center' })
    cy += 22
  })

  doc.setFontSize(10); doc.setTextColor(...T_GRAY)
  doc.text(`CONFIDENTIAL  ·  ${new Date().getFullYear()}`, W/2, H*0.85, { align: 'center' })

  doc.save(`DPR_PROPOSAL_${(data.dpr_code || 'FR').replace(/[^a-zA-Z0-9-]/g, '_')}_${Date.now()}.pdf`)
}
