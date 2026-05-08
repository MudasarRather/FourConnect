<template>
  <div class="expenses-page">
    <!-- HEADER -->
    <header class="glass-header">
      <div class="header-content">
        <div class="header-left">
          <div class="header-icon-box danger"><XSquare :size="20" class="danger-icon" /></div>
          <div class="header-text">
            <label>Expense Management</label>
            <h1>Rejected Expenses</h1>
          </div>
        </div>
        <div class="header-actions">
          <button class="action-btn outline" @click="fetchData"><RefreshCw :size="14" /> Refresh</button>
        </div>
      </div>
    </header>

    <!-- MAIN CONTENT -->
    <main class="main-canvas">

      <!-- Archive Info Banner -->
      <div class="archive-banner danger-banner">
        <div class="banner-icon"><AlertOctagon :size="16" /></div>
        <div class="banner-text">
          <span class="banner-title">Rejected Records</span>
          <span class="banner-desc">These expenses have been reviewed and rejected by an administrator. They are read-only and retained for your records. Check the expense details for the rejection reason.</span>
        </div>
        <div class="banner-stat">
          <span class="stat-number">{{ filteredExpenses.length }}</span>
          <span class="stat-label-text">Records</span>
        </div>
      </div>

      <!-- Table Section -->
      <div class="table-container-modern">
        <div class="header-actions-modern">
          <div class="title-group">
            <h3>Rejected Records</h3>
            <p>Expenses that were not approved</p>
          </div>
          <div class="table-controls" style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
            <div class="search-box">
              <Search :size="14" />
              <input v-model="searchQuery" placeholder="Search rejected expenses..." />
            </div>
          </div>
        </div>

        <!-- Modern Grid Table -->
        <div class="pm-table-modern glass-card" style="padding:0; overflow:hidden;">
            <div class="pm-row-modern header">
                <div class="col sn">S.N</div>
                <div class="col category">Expense Name</div>
                <div class="col amount">Amount</div>
                <div class="col vendor">Vendor Name</div>
                <div class="col reason">Reason</div>
                <div class="col attach"></div>
                <div class="col date">Expense Date</div>
                <div class="col mode">Mode</div>
                <div class="col status">Status</div>
            </div>

            <div v-if="filteredExpenses.length === 0" class="empty-state" style="padding:60px 0;">
                <XSquare :size="48" class="empty-icon" />
                <h4 style="margin-top:16px;">No Rejected Expenses</h4>
                <p>You have no rejected expenses at this time.</p>
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
                </div>
                <div class="col reason" style="color:#ef4444; font-size:12px; font-style:italic; max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    {{ exp.rejection_reason || '—' }}
                </div>
                <div class="col attach" style="display:flex; justify-content:center;">
                    <Paperclip v-if="exp.attachments && exp.attachments.length" :size="14" style="color:rgba(255,255,255,0.3);" />
                </div>
                <div class="col date" style="color:rgba(255,255,255,0.5); font-size:12px;">
                    {{ formatDate(exp.expense_date) }}
                </div>
                <div class="col mode" style="text-transform: capitalize; color:rgba(255,255,255,0.5); font-size:13px;">
                    {{ exp.payment_method }}
                </div>
                <div class="col status">
                     <div class="status-badge compact rejected">
                        <XSquare :size="10" />
                        <span>Rejected</span>
                     </div>
                </div>
            </div>
        </div>
      </div>
    </main>

    <!-- Drawer (read-only view) -->
    <ExpenseDetailsDrawer
       :is-open="!!selectedExpenseId"
       :expense="expenses.find(e => e.id === selectedExpenseId)"
       @close="selectedExpenseId = null"
       @deleted="fetchData"
       @approved="fetchData"
       @rejected="fetchData"
       :hide-user-delete="true"
    />

    <!-- Loading -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import {
  XSquare, RefreshCw, Search,
  AlertOctagon, Paperclip
} from 'lucide-vue-next'
import ExpenseDetailsDrawer from '../components/expenses/ExpenseDetailsDrawer.vue'

const route = useRoute()
const isAdmin = computed(() => route.path.startsWith('/admin'))
const API = 'http://localhost:8000/api'

const getHeaders = () => {
  const token = isAdmin.value ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')
  return { Authorization: `Bearer ${token}` }
}

const loading = ref(false)
const expenses = ref([])
const searchQuery = ref('')
const selectedExpenseId = ref(null)

const filteredExpenses = computed(() => {
  let list = expenses.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(e =>
      (e.title || '').toLowerCase().includes(q) ||
      (e.category || '').toLowerCase().includes(q) ||
      (e.vendor_name || '').toLowerCase().includes(q)
    )
  }
  return list
})

// Helpers
const formatCurrency = (v) => {
  if (!v) return '₹0'
  if (v >= 100000) return '₹' + (v / 100000).toFixed(1) + 'L'
  if (v >= 1000) return '₹' + (v / 1000).toFixed(0) + 'K'
  return '₹' + v.toFixed(0)
}

const formatDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// API fetch — gets rejected expenses
const fetchData = async () => {
  loading.value = true
  try {
    const h = getHeaders()
    const { data } = await axios.get(
      `${API}/expenses/?expense_status=rejected&limit=200`,
      { headers: h }
    )
    expenses.value = Array.isArray(data) ? data : []
  } catch (e) {
    console.warn('Failed to fetch rejected expenses', e)
    expenses.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped>
.expenses-page {
  min-height: 100vh;
  color: #f5f5f7;
}

/* ── Header ── */
.glass-header {
  position: sticky; top: 0; z-index: 50;
  background: rgba(9, 9, 11, 0.75);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding: 0 40px;
}
.header-content {
  height: 76px; display: flex; align-items: center; justify-content: space-between;
}
.header-left { display: flex; align-items: center; gap: 14px; }
.header-icon-box {
  width: 38px; height: 38px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: #fff;
}
.header-icon-box.danger {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}
.header-text { display: flex; flex-direction: column; gap: 1px; }
.header-text label {
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em;
  color: rgba(255,255,255,0.4); font-weight: 600;
}
.header-text h1 { font-size: 20px; font-weight: 700; margin: 0; }

.header-actions { display: flex; gap: 10px; }
.action-btn {
  border: none; padding: 8px 16px; border-radius: 8px;
  font-size: 12px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; gap: 6px;
  transition: all 0.2s ease;
}
.action-btn.outline {
  background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7);
  border: 1px solid rgba(255,255,255,0.1);
}
.action-btn.outline:hover { background: rgba(255,255,255,0.1); color: white; }

/* ── Main Canvas ── */
.main-canvas { padding: 28px 40px; max-width: 1500px; margin: 0 auto; }

/* ── Archive Banner ── */
.archive-banner {
  display: flex; align-items: center; gap: 16px;
  border-radius: 14px; padding: 18px 24px;
  margin-bottom: 20px;
  animation: cardEnter 0.5s ease both;
}
.archive-banner.danger-banner {
  background: rgba(239, 68, 68, 0.04);
  border: 1px solid rgba(239, 68, 68, 0.1);
}
.banner-icon {
  width: 36px; height: 36px; flex-shrink: 0;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
}
.danger-banner .banner-icon {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}
.banner-text { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.banner-title {
  font-size: 12px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.06em;
}
.danger-banner .banner-title { color: #ef4444; }

.banner-desc {
  font-size: 12.5px; color: rgba(255,255,255,0.5); line-height: 1.5;
}
.banner-stat {
  display: flex; flex-direction: column; align-items: center;
  padding: 10px 20px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px;
}
.stat-number {
  font-size: 22px; font-weight: 800; color: white;
  letter-spacing: -0.03em;
}
.stat-label-text {
  font-size: 10px; color: rgba(255,255,255,0.4);
  text-transform: uppercase; font-weight: 600; letter-spacing: 0.06em;
}

/* ── Glass Card ── */
.glass-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 16px; padding: 24px;
  animation: cardEnter 0.5s ease both;
}

/* ── Table ── */
.table-container-modern { display: flex; flex-direction: column; gap: 16px; animation: cardEnter 0.4s ease 0.15s both; }
.header-actions-modern { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; }
.title-group h3 { font-size: 18px; font-weight: 600; color: white; margin: 0; letter-spacing: -0.02em; }
.title-group p { font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 4px; }

.search-box {
  display: flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  padding: 6px 12px; border-radius: 8px;
}
.search-box input {
  background: transparent; border: none; outline: none; color: white;
  font-size: 12px; width: 200px;
}
.search-box input::placeholder { color: rgba(255,255,255,0.3); }

.pm-table-modern { display: flex; flex-direction: column; width: 100%; }
.pm-row-modern {
    display: grid; 
    grid-template-columns: 40px 1.5fr 110px 1fr 1.5fr 40px 100px 90px 110px;
    align-items: center; 
    padding: 12px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    transition: background 0.2s;
}
.pm-row-modern.header {
    padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); background: transparent;
    font-size: 11px; text-transform: uppercase; color: rgba(255,255,255,0.4); font-weight: 600; letter-spacing: 0.05em;
    padding-left: 12px; padding-right: 12px;
}
.pm-row-modern.item {
    font-size: 14px; border-radius: 0;
    cursor: pointer; animation: rowSlide 0.4s ease both;
    padding-left: 12px; padding-right: 12px;
}
.pm-row-modern.item:hover { background: rgba(255,255,255,0.03); }
.pm-row-modern.item:last-child { border-bottom: none; }

/* ── Status Badge ── */
.status-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 6px; border-radius: 4px;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05);
    font-size: 9px; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase;
}
.status-badge.compact { padding: 3px 8px; font-size: 10px; border-radius: 6px; }
.status-badge.rejected { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2); color: #ef4444; }

/* ── Grid Column Styles ── */
.col.vendor { display: flex; flex-direction: column; }
.v-name { font-size: 14px; font-weight: 600; color: #f5f5f7; }
.v-ref { font-size: 11px; color: rgba(255,255,255,0.4); font-family: 'SF Mono', monospace; text-transform: capitalize; margin-top:2px; }
.col.amount { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 14px; color: white; font-weight: 600; letter-spacing: -0.02em; }
.col.date { font-size: 13px; color: rgba(255,255,255,0.6); }
.pill { border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: capitalize; }

.empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; color: rgba(255,255,255,0.4); }
.empty-state .empty-icon { color: rgba(255,255,255,0.15); }

/* ── Loading ── */
.loading-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;
  z-index: 999;
}
.spinner {
  width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.1);
  border-top-color: #ef4444; border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

/* ── Animations ── */
@keyframes cardEnter {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes rowSlide {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Responsive ── */
@media (max-width: 1024px) {
  .glass-header, .main-canvas { padding-left: 20px; padding-right: 20px; }
  .archive-banner { flex-direction: column; align-items: flex-start; }
}
</style>
