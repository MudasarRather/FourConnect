<template>
  <div class="ledger-tab">
     <div class="header-actions-modern">
        <div class="title-group">
            <h3>Project Ledger</h3>
            <p>Track all expenses associated with this project</p>
        </div>
        <button class="export-btn-modern" @click="handleExport">
            <Download :size="14"/> 
            <span>Export CSV</span>
        </button>
     </div>

     <div class="pm-table-modern glass-card" style="padding:0; overflow:hidden; margin-top: 24px;">
        <div class="pm-row-modern header">
            <div class="col sn">S.N</div>
            <div class="col category">Expense Name</div>
            <div class="col amount">Amount</div>
            <div class="col vendor">Vendor / Ref</div>
            <div class="col attach"></div>
            <div class="col date">Date</div>
            <div class="col mode">Mode</div>
            <div class="col status">Status</div>
        </div>

        <div v-if="loading" class="empty-state" style="padding: 60px 0;">
             <Loader2 class="spin empty-icon" :size="32" />
             <h4 style="margin-top:16px;">Loading expenses...</h4>
        </div>
        <div v-else-if="filteredExpenses.length === 0" class="empty-state" style="padding:60px 0;">
            <BookOpen :size="48" class="empty-icon text-gray-500" />
            <h4 style="margin-top:16px;">No Expenses Recorded</h4>
            <p>Submit an expense against this project to see it here.</p>
        </div>

        <div 
            v-for="(exp, i) in filteredExpenses" 
            :key="exp.id" 
            class="pm-row-modern item"
            :style="{ animationDelay: i * 40 + 'ms' }"
            @click="selectedExpenseId = exp.id"
        >
            <div class="col sn">{{ i + 1 }}.</div>
            <div class="col category">
                <span class="v-name" style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block;">{{ exp.title }}</span>
                <div style="display:flex; gap:6px; margin-top:4px; align-items:center;">
                    <span class="v-ref" style="text-transform: capitalize; color:rgba(255,255,255,0.4); font-size:11px;">{{ exp.category }}</span>
                    <span class="pill" v-if="exp.expense_type" :style="{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', padding:'2px 6px', fontSize:'9px', borderRadius:'4px', letterSpacing:'0.02em', textTransform:'uppercase' }">{{ exp.expense_type }}</span>
                </div>
            </div>
            <div class="col amount font-mono">
                {{ formatCurrency(exp.total_after_tax || exp.amount, exp.currency) }}
            </div>
            <div class="col vendor">
                <span class="v-name" style="color:rgba(255,255,255,0.85); font-weight:500;">{{ exp.vendor_name || '—' }}</span>
                <span class="v-ref">{{ exp.invoice_number || '—' }}</span>
            </div>
            <div class="col attach" style="display:flex; justify-content:center;">
                <Paperclip v-if="exp.attachments && exp.attachments.length" :size="14" style="color:rgba(255,255,255,0.3);" />
            </div>
            <div class="col date" style="color:rgba(255,255,255,0.5); font-size:12px;">
                {{ formatDate(exp.expense_date) }}
            </div>
            <div class="col mode">
                <span class="pill" :style="{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', padding:'4px 8px', borderRadius:'6px', textTransform:'capitalize' }">{{ exp.payment_method || 'Standard' }}</span>
            </div>
            <div class="col status">
                 <div class="status-badge compact" :class="getStatus(exp).toLowerCase().replace(' ', '-')">
                    <Check v-if="getStatus(exp) === 'Approved'" :size="10" />
                    <Clock v-else-if="getStatus(exp) === 'Submitted' || getStatus(exp) === 'Pending'" :size="10" />
                    <AlertCircle v-else :size="10" />
                    <span>{{ getStatus(exp) }}</span>
                 </div>
            </div>
        </div>
     </div>

     <!-- Drawer: Read-only in Ledger tab -->
     <ExpenseDetailsDrawer
        :is-open="!!selectedExpenseId"
        :expense="expenses.find(e => e.id === selectedExpenseId)"
        @close="selectedExpenseId = null"
        @deleted="fetchData"
        @approved="fetchData"
        @rejected="fetchData"
        :view-only="true"
        :hide-user-delete="true"
     />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'
import { Download, Check, Clock, AlertCircle, Paperclip, Loader2, BookOpen } from 'lucide-vue-next'
import ExpenseDetailsDrawer from '../expenses/ExpenseDetailsDrawer.vue'

const props = defineProps({ projectId: String, token: String, project: Object })

const expenses = ref([])
const loading = ref(false)
const selectedExpenseId = ref(null)

const fetchData = async () => {
   if (!props.projectId) return
   loading.value = true
   try {
      const res = await axios.get(`http://localhost:8000/api/expenses/?limit=500`, {
         headers: { Authorization: `Bearer ${props.token}` }
      })
      // Only keep expenses related to this project
      expenses.value = res.data.filter(e => e.project_id === props.projectId)
   } catch (e) {
      console.error('Failed to fetch project expenses', e)
      expenses.value = []
   } finally {
      loading.value = false
   }
}

const filteredExpenses = computed(() => {
    // We can add search/filter logic here later if needed, but for now just return them
    return [...expenses.value].sort((a,b) => new Date(b.created_at || b.expense_date) - new Date(a.created_at || a.expense_date))
})

const getStatus = (e) => {
  const s = e.expense_status
  return (s && typeof s === 'object' && s.value) ? s.value : (s || 'Draft')
}

const formatCurrency = (v, curr = 'INR') => {
  if (!v) v = 0
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: curr }).format(v)
}

const formatDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const handleExport = () => {
    // Generate CSV
    const headers = ['S.N', 'Expense Name', 'Category', 'Amount', 'Currency', 'Vendor', 'Date', 'Status']
    const rows = filteredExpenses.value.map((p, i) => [
        i + 1,
        p.title,
        p.category,
        p.total_after_tax || p.amount,
        p.currency,
        p.vendor_name,
        formatDate(p.expense_date),
        getStatus(p)
    ])
    
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ledger-expenses-${props.projectId}.csv`
    a.click()
}

watch(() => props.projectId, () => {
    fetchData()
})

onMounted(() => {
    fetchData()
})
</script>

<style scoped>
.ledger-tab { animation: fadeIn 0.4s ease-out; }

/* Header & Export */
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

/* Grid Table Modern */
.pm-table-modern { 
    display: flex; flex-direction: column; width: 100%; 
    border: 1px solid rgba(255,255,255,0.08); 
    border-radius: 12px; 
    background: rgba(10,10,10,0.6);
}

.pm-row-modern {
    display: grid; 
    grid-template-columns: 50px 1.5fr 1fr 1fr 40px 100px 100px 100px;
    align-items: center; 
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    transition: background 0.2s;
}

.pm-row-modern.header {
    padding-bottom: 12px; padding-top: 16px; border-bottom: 1px solid rgba(255,255,255,0.1);
    font-size: 11px; text-transform: uppercase; color: rgba(255,255,255,0.4); font-weight: 600; letter-spacing: 0.05em;
    background: rgba(0,0,0,0.2);
}

.pm-row-modern.item { cursor: pointer; }
.pm-row-modern.item:hover { background: rgba(255,255,255,0.03); }
.pm-row-modern.item:last-child { border-bottom: none; }

/* Columns formatting */
.col.sn { color: rgba(255,255,255,0.4); font-size: 12px; font-weight: 600; }
.v-name { font-size: 14px; font-weight: 500; color: #f5f5f7; }
.v-ref { font-size: 11px; color: rgba(255,255,255,0.4); font-family: 'SF Mono', monospace; }

.col.amount { font-family: 'SF Mono', monospace; font-size: 14px; color: white; font-weight: 600; }
.col.date { font-size: 13px; color: rgba(255,255,255,0.6); }

.pill { 
    background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px;
    font-size: 11px; color: rgba(255,255,255,0.7);
}

.status-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 8px; border-radius: 4px; 
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05);
    font-size: 10px; font-weight: 600; letter-spacing: 0.02em;
    text-transform: uppercase;
}
.status-badge.compact { padding: 2px 6px; font-size: 9px; }
.status-badge.approved, .status-badge.completed { background: rgba(74, 222, 128, 0.1); border-color: rgba(74, 222, 128, 0.2); color: #4ade80; }
.status-badge.submitted, .status-badge.pending { background: rgba(251, 191, 36, 0.1); border-color: rgba(251, 191, 36, 0.2); color: #fbbf24; }
.status-badge.rejected, .status-badge.failed, .status-badge.void, .status-badge.reversed { background: rgba(248, 113, 113, 0.1); border-color: rgba(248, 113, 113, 0.2); color: #f87171; }
.status-badge.draft { background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.2); color: rgba(255,255,255,0.8); }

/* Setup for Empty States / Spinners */
.empty-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    color: rgba(255,255,255,0.4);
}
.empty-icon { margin-bottom: 16px; opacity: 0.2; }
.empty-state h4 { font-size: 16px; font-weight: 600; color: #f5f5f7; margin-bottom: 6px; }
.empty-state p { font-size: 13px; color: rgba(255,255,255,0.5); }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

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
[data-theme="light"] .pm-table-modern {
  background: rgba(255, 250, 240, 0.55);
  border: 1px solid rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .pm-row-modern {
  border-bottom: 1px solid rgba(40, 25, 10, 0.08);
}
[data-theme="light"] .pm-row-modern.header {
  background: rgba(217, 119, 6, 0.08);
  border-bottom: 1px solid rgba(40, 25, 10, 0.16);
  color: #b45309;
  font-weight: 700;
}
[data-theme="light"] .pm-row-modern.item:hover {
  background: rgba(217, 119, 6, 0.06);
}
[data-theme="light"] .col.sn { color: #92400e; }
[data-theme="light"] .v-name { color: #1a1410 !important; }
[data-theme="light"] .v-ref { color: #92400e !important; }
[data-theme="light"] .col.amount { color: #1a1410; }
[data-theme="light"] .col.date { color: #6b5840 !important; }
[data-theme="light"] .pill {
  background: rgba(217, 119, 6, 0.12) !important;
  color: #92400e !important;
}
[data-theme="light"] .col.attach svg { color: #b45309 !important; }
[data-theme="light"] .status-badge {
  background: rgba(255, 250, 240, 0.55);
  border: 1px solid rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .status-badge.approved,
[data-theme="light"] .status-badge.completed {
  background: rgba(5, 150, 105, 0.12);
  border-color: rgba(5, 150, 105, 0.30);
  color: #047857;
}
[data-theme="light"] .status-badge.submitted,
[data-theme="light"] .status-badge.pending {
  background: rgba(217, 119, 6, 0.12);
  border-color: rgba(217, 119, 6, 0.30);
  color: #b45309;
}
[data-theme="light"] .status-badge.rejected,
[data-theme="light"] .status-badge.failed,
[data-theme="light"] .status-badge.void,
[data-theme="light"] .status-badge.reversed {
  background: rgba(220, 38, 38, 0.10);
  border-color: rgba(220, 38, 38, 0.30);
  color: #b91c1c;
}
[data-theme="light"] .status-badge.draft {
  background: rgba(40, 25, 10, 0.06);
  border-color: rgba(40, 25, 10, 0.16);
  color: #6b5840;
}
[data-theme="light"] .empty-state { color: #92400e; }
[data-theme="light"] .empty-icon { color: #b45309; opacity: 0.5; }
[data-theme="light"] .empty-state h4 { color: #1a1410; }
[data-theme="light"] .empty-state p { color: #92400e; }
</style>
