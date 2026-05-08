import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Helper to clean currency
const formatMoney = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount || 0)
}

const getExpenseStatus = (e) => {
    if (!e) return 'Draft'
    const s = e.expense_status
    const status = (s && typeof s === 'object' && s.value) ? s.value : (s || 'Draft')
    return status.charAt(0).toUpperCase() + status.slice(1)
}

export const generateExpenseReceipt = (expense, user = {}) => {
    const doc = new jsPDF()

    const colors = {
        primary: [24, 24, 27],       // Zinc 900
        secondary: [113, 113, 122],  // Zinc 500
        brand: [217, 119, 6],        // Amber 600 - subtle for expenses
        lightBg: [244, 244, 245],    // Zinc 100
        divider: [228, 228, 231],    // Zinc 200
        green: [22, 163, 74],
        red: [220, 38, 38],
        yellow: [217, 119, 6]
    }

    // --- 1. Header (Logo & Title) ---
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

    // 2. Top Right: Stroke (Opacity simulated)
    doc.setDrawColor(253, 224, 71) // Lighter Yellow
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
    doc.text('Fourconnect', logoX + 18, logoY + 8)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...colors.secondary)
    doc.text('Expense Management Division', logoX + 18, logoY + 13)

    // Right: Large Title
    doc.setFontSize(28)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...colors.brand) // using subtle amber
    doc.text('Expense Receipt', 190, 32, { align: 'right' })

    // --- 2. Top Meta Grid ---
    const metaY = 55
    doc.setFillColor(...colors.lightBg)
    doc.roundedRect(20, metaY, 170, 24, 2, 2, 'F')

    doc.setFontSize(8)
    doc.setTextColor(...colors.secondary)

    // Col 1
    doc.text('RECEIPT NO.', 25, metaY + 8)
    doc.text('DATE', 75, metaY + 8)
    doc.text('PAYMENT MODE', 115, metaY + 8)
    doc.text('STATUS', 155, metaY + 8)

    doc.setFontSize(10)
    doc.setTextColor(...colors.primary)
    doc.setFont('helvetica', 'bold')

    doc.text(`${(expense.id || 'N/A').substring(0, 8).toUpperCase()}`, 25, metaY + 16)
    doc.text(new Date(expense.expense_date || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), 75, metaY + 16)
    doc.text((expense.payment_method || 'Standard').toUpperCase(), 115, metaY + 16)

    const actualStatus = getExpenseStatus(expense)
    const slcc = actualStatus.toLowerCase()
    let statusColor = colors.secondary
    if (slcc === 'approved') statusColor = colors.green
    else if (slcc === 'rejected') statusColor = colors.red
    else statusColor = colors.yellow

    doc.setTextColor(...statusColor)
    doc.text(actualStatus.toUpperCase(), 155, metaY + 16)


    // --- 3. Structured Details Info ---
    const detailY = metaY + 35
    doc.setFontSize(12)
    doc.setTextColor(...colors.primary)
    doc.setFont('helvetica', 'bold')
    doc.text('Expense Details', 20, detailY)

    doc.setDrawColor(...colors.divider)
    doc.setLineWidth(0.2)
    doc.line(20, detailY + 3, 190, detailY + 3)

    let currentY = detailY + 12

    // Two column layout
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...colors.primary)
    doc.text('TITLE:', 20, currentY)
    doc.text('VENDOR:', 105, currentY)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...colors.secondary)
    doc.text(expense.title || 'Untitled', 40, currentY)
    doc.text(expense.vendor_name || 'N/A', 130, currentY)
    currentY += 8

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...colors.primary)
    doc.text('CATEGORY:', 20, currentY)
    doc.text('INVOICE NO:', 105, currentY)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...colors.secondary)
    doc.text(expense.category || 'N/A', 45, currentY)
    doc.text(expense.invoice_number || 'N/A', 130, currentY)
    currentY += 8

    if (expense.expense_type || expense.invoice_date) {
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...colors.primary)
        doc.text('TYPE:', 20, currentY)
        doc.text('INVOICE DATE:', 105, currentY)

        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...colors.secondary)
        doc.text(expense.expense_type || 'N/A', 35, currentY)
        doc.text(expense.invoice_date ? new Date(expense.invoice_date).toLocaleDateString() : 'N/A', 135, currentY)
        currentY += 8
    }

    currentY += 10

    // --- 4. Breakdowns ---
    const tableBody = []

    const currencyCode = (expense.currency || 'INR') === 'INR' ? 'Rs.' : (expense.currency || 'INR')

    tableBody.push(['Base Amount', `${currencyCode} ${formatMoney(expense.base_amount || expense.amount || 0, expense.currency)}`])

    if (expense.tax_applicable || expense.tax_amount > 0) {
        const taxLabel = expense.tax_type ? `${expense.tax_type} (${expense.tax_percentage || 0}%)` : 'Taxes / GST'
        tableBody.push([taxLabel, `+ ${currencyCode} ${formatMoney(expense.tax_amount || 0, expense.currency)}`])
    }

    // Allocations visually embedded if present
    if (expense.allocations && expense.allocations.length > 0) {
        expense.allocations.forEach(alloc => {
            tableBody.push([
                `Department Allocation: ${alloc.category} (${alloc.percentage}%)`,
                `${currencyCode} ${formatMoney(alloc.amount, expense.currency)}`
            ])
        })
    }

    autoTable(doc, {
        startY: currentY,
        head: [['DESCRIPTION', 'AMOUNT']],
        body: tableBody,
        theme: 'plain',
        headStyles: {
            fillColor: colors.lightBg,
            textColor: colors.secondary,
            fontSize: 8,
            fontStyle: 'bold',
            halign: 'left',
            cellPadding: 6
        },
        bodyStyles: {
            textColor: colors.primary,
            fontSize: 10,
            cellPadding: 6
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' }
        },
        alternateRowStyles: {
            fillColor: [252, 252, 253]
        },
        margin: { left: 20, right: 20 },
        drawCell: function (data) {
            if (data.section === 'head') {
                doc.setDrawColor(...colors.divider)
                doc.setLineWidth(0.5)
                doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height)
            }
            if (data.section === 'body') {
                doc.setDrawColor(...colors.divider)
                doc.setLineWidth(0.1)
                doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height)
            }
        }
    })

    const finalY = doc.lastAutoTable.finalY + 5

    // Total Background Box
    doc.setFillColor(...colors.lightBg)
    doc.rect(110, finalY, 80, 25, 'F')

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...colors.secondary)
    doc.text('TOTAL AMOUNT', 115, finalY + 10)

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...colors.primary)

    const totalAmount = expense.total_after_tax || expense.amount || 0
    doc.text(`${currencyCode} ${formatMoney(totalAmount, expense.currency)}`, 185, finalY + 18, { align: 'right' })

    // --- 5. Digital Signature ---
    let footerBaseY = finalY + 35

    // Notes
    if (expense.description || expense.notes) {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...colors.brand)
        doc.text('NOTES:', 20, footerBaseY)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...colors.secondary)

        let noteText = expense.description || expense.notes
        if (noteText.length > 100) noteText = noteText.substring(0, 100) + '...'
        doc.text(noteText, 20, footerBaseY + 6)

        footerBaseY += 20 // Push signature down if notes exist
    }

    const sigY = Math.max(footerBaseY, 230)

    doc.setFontSize(7)
    doc.setTextColor(...colors.secondary)
    doc.text('DIGITALLY AUTHORIZED BY', 20, sigY)

    // Name
    doc.setFontSize(10)
    doc.setTextColor(...colors.primary)
    doc.setFont('helvetica', 'bold')

    // Authorization Logic: >= 50,000 requires Admin
    const authAmount = expense.total_after_tax || expense.amount || 0;
    const currentUserName = expense.created_by?.full_name || expense.created_by?.name || user?.full_name || (user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'System User');
    let authorName = currentUserName;
    if (authAmount >= 50000) {
        authorName = 'Admin';
    }

    doc.text(authorName, 20, sigY + 5)

    // "Encrypted" Hash look
    doc.setFont('courier', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    const fakeHash = `SIG_${(expense.id || 'EXP').substring(0, 8).toUpperCase()}_${new Date().getTime().toString(36).toUpperCase()}_SECURE`
    doc.text(fakeHash, 20, sigY + 10)

    const hashWidth = doc.getTextWidth(fakeHash)
    doc.setFillColor(...colors.brand)
    doc.circle(20 + hashWidth + 5, sigY + 8, 2, 'F')


    // --- 6. Footer ---
    const pageHeight = doc.internal.pageSize.height

    doc.setDrawColor(...colors.brand)
    doc.setLineWidth(0.5)
    doc.line(80, pageHeight - 15, 130, pageHeight - 15) // Small center line

    doc.setFontSize(7)
    doc.setTextColor(...colors.secondary)
    doc.setFont('helvetica', 'normal')

    const dateStr = new Date().toLocaleString()

    doc.text(`Recorded by ${currentUserName} - ${dateStr}`, 20, pageHeight - 10)
    doc.text('Powered by Fourreck', 105, pageHeight - 10, { align: 'center' })

    // Save PDF
    const safeExpName = (expense.title || 'Expense').replace(/[^a-z0-9]/gi, '_').toLowerCase()
    doc.save(`expense_receipt_${safeExpName}.pdf`)
}
