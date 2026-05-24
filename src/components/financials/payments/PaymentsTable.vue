<template>
  <div class="table-container-modern">
     <div class="header-actions-modern">
        <div class="title-group">
            <h3>Payment History</h3>
            <p>Track all transactions and invoices</p>
        </div>
        <button class="export-btn-modern" @click="$emit('export')">
            <Download :size="14"/> 
            <span>Export CSV</span>
        </button>
     </div>

     <!-- Table (Header) -->
     <div class="pm-table-modern">
        <div class="pm-row-modern header">
            <div class="col status">Status</div>
            <div class="col vendor">Vendor / Reference</div>
            <div class="col work-order">Work Order</div>
            <div class="col amount">Amount</div>
            <div class="col date">Date</div>
            <div class="col category">Project Type</div>
            <div class="col invoice">Invoice</div>
            <div class="col mode">Mode</div>
            <div class="col action"></div>
        </div>

        <!-- Empty State -->
        <div v-if="payments.length === 0" class="empty-state">
            <Receipt :size="48" class="empty-icon"/>
            <h4>No Payments Recorded</h4>
            <p>Record your first payment to track project expenses.</p>
        </div>

        <!-- Items -->
        <div 
            v-for="p in payments" 
            :key="p.id" 
            class="pm-row-modern item"
            @click="$emit('select', p.id)"
        >
            <!-- Status -->
            <div class="col status">
                 <div class="status-badge compact" :class="p.status?.toLowerCase().replace(' ', '-') || 'received'">
                    <Check v-if="p.status === 'Completed' || p.status === 'Received'" :size="10" />
                    <Clock v-else-if="p.status === 'Pending' || p.status === 'In Transit'" :size="10" />
                    <AlertCircle v-else :size="10" />
                    <span>{{ p.status }}</span>
                 </div>
            </div>

            <!-- Vendor -->
            <div class="col vendor">
                <span class="v-name">{{ p.vendor_name }}</span>
                <span class="v-ref">{{ p.payment_id || '—' }}</span>
            </div>

             <!-- Work Order -->
            <div class="col work-order">
                <span class="mono">{{ p.contract_work_order_no || '—' }}</span>
            </div>

            <!-- Amount -->
            <div class="col amount">
                {{ formatCurrency(p.net_receivable_amount || p.amount_paid, p.currency) }}
            </div>

            <!-- Date -->
            <div class="col date">
                {{ formatDate(p.payment_date) }}
            </div>

             <!-- Category -->
            <div class="col category">
                <span class="pill">{{ project?.project_type || '—' }}</span>
            </div>

            <!-- Invoice -->
             <div class="col invoice">
                <span class="mono">{{ p.invoice_number || '—' }}</span>
                <Paperclip v-if="p.attachments && p.attachments.length" :size="12" class="attach-icon" />
            </div>

            <!-- Mode -->
            <div class="col mode">
                 <div class="mode-icon" :title="p.payment_mode">
                    <component :is="getModeIcon(p.payment_mode)" :size="14" />
                 </div>
            </div>

             <!-- Action -->
            <div class="col action">
                <ChevronRight :size="16" class="arrow" />
            </div>
        </div>
     </div>
  </div>
</template>

<script setup>
import { Download, Check, Clock, X, Receipt, ChevronRight, Landmark, CreditCard, Wallet, Banknote, Paperclip, AlertCircle } from 'lucide-vue-next'

defineProps({ payments: Array, project: Object })
defineEmits(['export', 'select'])

const formatDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatCurrency = (amt, curr = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr }).format(amt || 0)
}

const getModeIcon = (mode) => {
    if (!mode) return Landmark
    const m = mode.toLowerCase()
    if (m.includes('card')) return CreditCard
    if (m.includes('pay') || m.includes('wallet')) return Wallet
    if (m.includes('cash')) return Banknote
    return Landmark
}
</script>

<style scoped>
/* Container */
.table-container-modern {
    display: flex; flex-direction: column; gap: 16px;
}

.header-actions-modern {
    display: flex; justify-content: space-between; align-items: flex-end;
}
.title-group h3 { font-size: 18px; font-weight: 600; color: white; margin: 0; letter-spacing: -0.02em; }
.title-group p { font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 4px; }

.export-btn-modern {
    display: flex; align-items: center; gap: 8px; padding: 8px 16px;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px; color: rgba(255,255,255,0.8); font-size: 12px; font-weight: 500;
    cursor: pointer; transition: all 0.2s;
}
.export-btn-modern:hover { background: rgba(255,255,255,0.1); color: white; }

/* Modern Grid Table */
.pm-table-modern { display: flex; flex-direction: column; width: 100%; }

.pm-row-modern {
    display: grid; 
    grid-template-columns: 100px 1.2fr 1fr 0.8fr 1fr 1fr 1fr 60px 40px;
    align-items: center; 
    padding: 12px 12px; /* reduced padding */
    border-bottom: 1px solid rgba(255,255,255,0.05);
    transition: background 0.2s;
}

.pm-row-modern.header {
    padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);
    font-size: 11px; text-transform: uppercase; color: rgba(255,255,255,0.4); font-weight: 600; letter-spacing: 0.05em;
}

.pm-row-modern.item { cursor: pointer; border-radius: 0; }
.pm-row-modern.item:hover { background: rgba(255,255,255,0.03); }
.pm-row-modern.item:last-child { border-bottom: none; }

/* Columns */
.status-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 8px; border-radius: 4px; /* More rectangular/compact */
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05);
    font-size: 10px; font-weight: 600; letter-spacing: 0.02em;
    text-transform: uppercase;
}
.status-badge.compact {
    padding: 2px 6px; font-size: 9px;
}
.status-badge.completed, .status-badge.received { background: rgba(74, 222, 128, 0.1); border-color: rgba(74, 222, 128, 0.2); color: #4ade80; }
.status-badge.pending { background: rgba(251, 191, 36, 0.1); border-color: rgba(251, 191, 36, 0.2); color: #fbbf24; }
.status-badge.failed { background: rgba(248, 113, 113, 0.1); border-color: rgba(248, 113, 113, 0.2); color: #f87171; }

.col.vendor { display: flex; flex-direction: column; }
.v-name { font-size: 14px; font-weight: 500; color: #f5f5f7; }
.v-ref { font-size: 11px; color: rgba(255,255,255,0.4); font-family: 'SF Mono', monospace; }

.col.amount { font-family: 'SF Mono', monospace; font-size: 14px; color: white; font-weight: 600; }
.col.date { font-size: 13px; color: rgba(255,255,255,0.6); }

.pill { 
    background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px;
    font-size: 11px; color: rgba(255,255,255,0.7);
}

.col.invoice { display: flex; align-items: center; gap: 6px; }
.mono { font-family: 'SF Mono', monospace; font-size: 11px; color: rgba(255,255,255,0.5); }
.attach-icon { color: #8b5cf6; }

.mode-icon { color: rgba(255,255,255,0.4); display: flex; justify-content: center; }

.arrow { color: rgba(255,255,255,0.2); transition: transform 0.2s; }
.pm-row-modern.item:hover .arrow { transform: translateX(2px); color: rgba(255,255,255,0.6); }

/* Empty State */
.empty-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 80px 0; color: rgba(255,255,255,0.4);
    background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px dashed rgba(255,255,255,0.1);
}
.empty-icon { margin-bottom: 16px; opacity: 0.1; }
.empty-state h4 { font-size: 16px; font-weight: 600; color: #f5f5f7; margin-bottom: 6px; }
.empty-state p { font-size: 13px; color: rgba(255,255,255,0.5); }

/* ═════════════════════════════════════════════════════════
   LIGHT THEME OVERRIDES
   ═════════════════════════════════════════════════════════ */
[data-theme="light"] .title-group h3 { color: #1a1410; }
[data-theme="light"] .title-group p { color: #6b5840; }
[data-theme="light"] .export-btn-modern {
  background: rgba(255, 250, 240, 0.55);
  border: 1px solid rgba(217, 119, 6, 0.30);
  color: #92400e;
}
[data-theme="light"] .export-btn-modern:hover {
  background: rgba(217, 119, 6, 0.12);
  color: #1a1410;
}
[data-theme="light"] .pm-row-modern {
  border-bottom: 1px solid rgba(40, 25, 10, 0.08);
}
[data-theme="light"] .pm-row-modern.header {
  border-bottom: 1px solid rgba(40, 25, 10, 0.16);
  color: #b45309;
  font-weight: 700;
}
[data-theme="light"] .pm-row-modern.item:hover {
  background: rgba(217, 119, 6, 0.06);
}
[data-theme="light"] .status-badge {
  background: rgba(255, 250, 240, 0.55);
  border: 1px solid rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .status-badge.completed,
[data-theme="light"] .status-badge.received {
  background: rgba(5, 150, 105, 0.12);
  border-color: rgba(5, 150, 105, 0.30);
  color: #047857;
}
[data-theme="light"] .status-badge.pending {
  background: rgba(217, 119, 6, 0.12);
  border-color: rgba(217, 119, 6, 0.30);
  color: #b45309;
}
[data-theme="light"] .status-badge.failed {
  background: rgba(220, 38, 38, 0.10);
  border-color: rgba(220, 38, 38, 0.30);
  color: #b91c1c;
}
[data-theme="light"] .v-name { color: #1a1410; }
[data-theme="light"] .v-ref { color: #92400e; }
[data-theme="light"] .col.amount { color: #1a1410; }
[data-theme="light"] .col.date { color: #6b5840; }
[data-theme="light"] .pill {
  background: rgba(217, 119, 6, 0.12);
  color: #92400e;
}
[data-theme="light"] .mono { color: #6b5840; }
[data-theme="light"] .attach-icon { color: #b45309; }
[data-theme="light"] .mode-icon { color: #b45309; }
[data-theme="light"] .arrow { color: #92400e; opacity: 0.6; }
[data-theme="light"] .pm-row-modern.item:hover .arrow { color: #b45309; opacity: 1; }
[data-theme="light"] .empty-state {
  color: #92400e;
  background: rgba(255, 250, 240, 0.55);
  border: 1px dashed rgba(217, 119, 6, 0.30);
}
[data-theme="light"] .empty-icon { color: #b45309; opacity: 0.4; }
[data-theme="light"] .empty-state h4 { color: #1a1410; }
[data-theme="light"] .empty-state p { color: #92400e; }
</style>
