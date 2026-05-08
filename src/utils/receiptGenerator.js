import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Helper to clean currency
const formatMoney = (amount, currency = 'USD') => {
    // Force standard formatting to avoid symbol issues
    return new Intl.NumberFormat('en-IN', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount)
}

export const generatePaymentReceipt = (payment, project, milestones = [], user = {}) => {
    const doc = new jsPDF()

    const colors = {
        primary: [40, 40, 40],       // #282828 (Soft Black)
        secondary: [100, 100, 100],  // #646464 (Grey)
        brand: [245, 158, 11],       // #F59E0B (Amber/Gold)
        lightBg: [250, 250, 250],
        divider: [230, 230, 230]
    }

    // --- 1. Header (Logo & Title) ---

    // LOGO - Drawing the Fourconnect Geometric Logo
    // Based on Logo.vue: Top-Left (Stroke), Top-Right (Stroke Opacity), Bot-Left (Stroke Opacity), Bot-Right (Fill)
    // ViewBox 40x40. We scale to size ~12x12.

    const logoSize = 12
    const logoX = 20
    const logoY = 20
    const gap = 0.5
    const boxSize = (logoSize / 2) - gap
    const radius = 1

    doc.setDrawColor(...colors.brand)
    doc.setFillColor(...colors.brand)
    doc.setLineWidth(0.8)

    // 1. Top Left: Stroke
    doc.roundedRect(logoX, logoY, boxSize, boxSize, radius, radius, 'S')

    // 2. Top Right: Stroke (Opacity simulated by thinner line or lighter color? jsPDF doesn't do stroke opacity easily)
    // We'll use a lighter color for the "opacity" effect
    doc.setDrawColor(251, 191, 36) // Lighter Amber
    doc.roundedRect(logoX + boxSize + (gap * 2), logoY, boxSize, boxSize, radius, radius, 'S')

    // 3. Bottom Left: Stroke (Lighter)
    doc.roundedRect(logoX, logoY + boxSize + (gap * 2), boxSize, boxSize, radius, radius, 'S')

    // 4. Bottom Right: Fill (Brand Color)
    doc.setFillColor(...colors.brand)
    doc.roundedRect(logoX + boxSize + (gap * 2), logoY + boxSize + (gap * 2), boxSize, boxSize, radius, radius, 'F')

    // Brand Name
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...colors.primary)
    doc.text('Fourconnect', logoX + 16, logoY + 8)


    // Title
    doc.setFontSize(20) // Slightly smaller for elegance
    doc.setTextColor(...colors.primary)
    doc.text('PAYMENT RECEIPT', 190, 28, { align: 'right' })

    // --- 2. Meta Data Bar ---
    const metaY = 45
    doc.setFontSize(8) // Smaller metadata labels
    doc.setTextColor(...colors.secondary)

    // Row 1: Receipt No | Date | Status
    doc.text(`RECEIPT NO`, 20, metaY)
    doc.text(`DATE`, 70, metaY)
    doc.text(`STATUS`, 140, metaY)

    doc.setFontSize(10)
    doc.setTextColor(...colors.primary)
    doc.setFont('helvetica', 'bold')

    doc.text(`#${payment.payment_id || 'UNKNOWN'}`, 20, metaY + 5)
    doc.text(new Date(payment.payment_date).toLocaleDateString(), 70, metaY + 5)

    // Status with Color
    let statusColor = [100, 100, 100]
    if (payment.status === 'Completed' || payment.status === 'Received') statusColor = [22, 163, 74] // Green
    else if (payment.status === 'Pending' || payment.status === 'In Transit') statusColor = [202, 138, 4] // Gold
    else if (payment.status === 'Failed') statusColor = [220, 38, 38] // Red

    doc.setTextColor(...statusColor)
    doc.text(payment.status?.toUpperCase(), 140, metaY + 5)


    // --- 3. Bill To / From ---
    doc.setDrawColor(...colors.divider)
    doc.setLineWidth(0.1)
    doc.line(20, metaY + 12, 190, metaY + 12)

    const addrY = metaY + 22

    // From (Project)
    doc.setFontSize(7)
    doc.setTextColor(...colors.secondary)
    doc.setFont('helvetica', 'normal')
    doc.text('PROJECT DETAILS', 20, addrY)

    doc.setFontSize(10)
    doc.setTextColor(...colors.primary)
    doc.setFont('helvetica', 'bold')
    doc.text(project?.name || 'Unknown Project', 20, addrY + 5)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...colors.secondary)
    doc.text(project?.code || '', 20, addrY + 9)

    // To (Vendor)
    doc.setFontSize(7)
    doc.setTextColor(...colors.secondary)
    doc.text('PAYMENT TO', 110, addrY)

    doc.setFontSize(10)
    doc.setTextColor(...colors.primary)
    doc.setFont('helvetica', 'bold')
    doc.text(payment.vendor_name || '', 110, addrY + 5)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...colors.secondary)
    if (payment.contract_work_order_no) doc.text(`WO: ${payment.contract_work_order_no}`, 110, addrY + 9)
    else doc.text(`Transaction ID: ${payment.id?.substring(0, 8)}`, 110, addrY + 9)

    if (payment.invoice_number) doc.text(`Inv: ${payment.invoice_number} (${payment.invoice_date || 'No Date'})`, 110, addrY + 13)


    // --- 4. Financial Table ---
    const currencyCode = payment.currency || 'INR'

    const tableBody = []

    // Milestones
    const relatedMilestones = milestones.filter(m => payment.milestone_ids?.includes(m.id))

    if (relatedMilestones.length > 0) {
        relatedMilestones.forEach(m => {
            const amount = m.budget_amount_converted || m.budget_amount || 0
            tableBody.push([
                `Milestone: ${m.name}`,
                `${currencyCode} ${formatMoney(amount)}`
            ])
        })
    } else {
        tableBody.push([
            payment.payment_category || 'General Payment',
            `${currencyCode} ${formatMoney(payment.amount_paid)}`
        ])
    }

    // Tax
    const taxAmount = Number(payment.tax_amount)
    if (taxAmount > 0) {
        tableBody.push([
            `Tax: ${payment.tax_type || ''} (${payment.gst_percent}%)`,
            `${currencyCode} ${formatMoney(taxAmount)}`
        ])
    }

    // Deductions
    // Deductions
    const gross = Number(payment.invoice_amount_gross || 0)

    // Calculate TDS Amount from Percent
    const tdsPercent = Number(payment.tds_percent || 0)
    const tdsAmount = tdsPercent > 0 ? (gross * tdsPercent / 100) : 0

    // Calculate Retention Amount
    const retentionAmount = Number(payment.retention_amount || 0)

    // Calculate Other Deductions Amount from Percent (since DB stores it as %)
    const otherPercent = Number(payment.other_deductions || 0)
    const otherDeductionsAmount = otherPercent > 0 ? (gross * otherPercent / 100) : 0

    if (tdsAmount > 0) tableBody.push(['Less: TDS Deduction', `(${currencyCode} ${formatMoney(tdsAmount)})`])
    if (retentionAmount > 0) tableBody.push(['Less: Retention', `(${currencyCode} ${formatMoney(retentionAmount)})`])
    if (otherDeductionsAmount > 0) tableBody.push([`Less: Other (${payment.other_deductions_desc || ''})`, `(${currencyCode} ${formatMoney(otherDeductionsAmount)})`])


    autoTable(doc, {
        startY: addrY + 25,
        head: [['DESCRIPTION', 'AMOUNT']],
        body: tableBody,
        theme: 'grid', // Clean grid
        styles: {
            font: 'helvetica',
            fontSize: 9, // Smaller elegant font
            cellPadding: 6,
            lineColor: [245, 158, 11], // Brand Orange #F59E0B
            lineWidth: 0.2,
            textColor: colors.primary,
            valign: 'middle'
        },
        headStyles: {
            fillColor: [252, 252, 252],
            textColor: colors.secondary,
            fontSize: 8,
            fontStyle: 'bold',
            halign: 'left',
            cellPadding: 8
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' }
        },
        foot: [['TOTAL PAID', `${currencyCode} ${formatMoney(payment.net_receivable_amount)}`]],
        footStyles: {
            fillColor: colors.brand,
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'right',
            cellPadding: 8
        }
    })

    // --- 5. Payment Details (Cards) ---
    const finalY = doc.lastAutoTable.finalY + 15

    // Background Box
    doc.setDrawColor(...colors.divider)
    doc.roundedRect(20, finalY, 170, 30, 2, 2, 'S') // Stroke only for elegance

    doc.setFontSize(7)
    doc.setTextColor(...colors.secondary)
    doc.text('PAYMENT METHOD', 30, finalY + 8)
    doc.text('REFERENCE / UTR', 100, finalY + 8)

    doc.setFontSize(9)
    doc.setTextColor(...colors.primary)
    doc.setFont('helvetica', 'bold')

    doc.text(payment.payment_mode || 'Unknown', 30, finalY + 14)
    // Bank logic
    let bankDetail = payment.bank_name || ''
    if (payment.account_number) bankDetail += ` •••• ${payment.account_number.slice(-4)}`

    // Append Cheque No if exists
    if (payment.cheque_no) {
        if (bankDetail) bankDetail += ` | Cheque: ${payment.cheque_no}`
        else bankDetail = `Cheque No: ${payment.cheque_no}`
    }

    if (bankDetail) {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(bankDetail, 30, finalY + 20)
    }

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(payment.utr_transaction_ref || payment.transaction_ref || '—', 100, finalY + 14)


    // --- 6. Digital Signature ---
    const sigY = finalY + 45

    doc.setFontSize(7)
    doc.setTextColor(...colors.secondary)
    doc.text('DIGITALLY AUTHORIZED BY', 20, sigY)

    // Name
    doc.setFontSize(10)
    doc.setTextColor(...colors.primary)
    doc.setFont('helvetica', 'bold')
    const authorName = payment.created_by?.full_name || (user.first_name ? `${user.first_name} ${user.last_name || ''}` : 'System Admin')
    doc.text(authorName, 20, sigY + 5)

    // "Encrypted" Hash look
    doc.setFont('courier', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    const fakeHash = `SIG_${payment.id.substring(0, 8).toUpperCase()}_${new Date().getTime().toString(36).toUpperCase()}_SECURE`
    doc.text(fakeHash, 20, sigY + 10)

    // Icon placeholder (Verified Badge)
    const hashWidth = doc.getTextWidth(fakeHash)
    doc.setFillColor(...colors.brand)
    doc.circle(20 + hashWidth + 5, sigY + 8, 2, 'F')


    // --- 7. Footer ---
    const pageHeight = doc.internal.pageSize.height

    doc.setDrawColor(...colors.brand)
    doc.setLineWidth(0.5)
    doc.line(80, pageHeight - 15, 130, pageHeight - 15) // Small center line

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...colors.secondary)
    doc.text('Powered by Fourreck', 105, pageHeight - 10, { align: 'center' })

    doc.save(`Receipt-${payment.payment_id}.pdf`)
}
