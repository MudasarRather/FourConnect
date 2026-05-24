<template>
  <div class="expenses-page">
    <!-- HEADER -->
    <header class="glass-header">
      <div class="header-content">
        <div class="header-left">
          <div class="header-icon-box">
            <span class="pulse-ring" aria-hidden="true"></span>
            <Archive :size="20" />
          </div>
          <div class="header-text">
            <label>Expense Management</label>
            <h1>Archived Expenses</h1>
          </div>
        </div>
        <div class="header-actions">
          <button class="action-btn outline" @click="fetchData">
            <RefreshCw :size="14" class="refresh-icon" /> Refresh
          </button>
          <button class="action-btn outline">
            <Download :size="14" class="download-icon" /> Export
          </button>
        </div>
      </div>
    </header>

    <!-- MAIN CONTENT -->
    <main class="main-canvas">

      <!-- Archive Info Banner -->
      <div class="archive-banner">
        <div class="banner-icon">
          <span class="banner-pulse" aria-hidden="true"></span>
          <Info :size="16" />
        </div>
        <div class="banner-text">
          <span class="banner-title">Archive Policy</span>
          <span class="banner-desc">Expenses older than 1 year with approved status are automatically moved to the archive. Archived records are read-only and retained for audit compliance.</span>
        </div>
        <div class="banner-stat">
          <span class="stat-number">{{ filteredExpenses.length }}</span>
          <span class="stat-label-text">Records</span>
        </div>
      </div>

      <!-- Summary Chips -->
      <div class="summary-chips">
        <div class="chip">
          <Wallet :size="13" />
          <span>Total Archived: <strong>{{ formatCurrency(totalArchived) }}</strong></span>
        </div>
        <div class="chip">
          <Calendar :size="13" />
          <span>Oldest: <strong>{{ oldestDate }}</strong></span>
        </div>
        <div class="chip">
          <CheckCircle :size="13" />
          <span>All Approved</span>
        </div>
      </div>

      <!-- Table Section -->
      <div class="table-container-modern">
        <div class="header-actions-modern">
          <div class="title-group">
            <h3>Archive Records</h3>
            <p>Approved expenses older than 1 year</p>
          </div>
          <div class="table-controls" style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
            <div class="search-box">
              <Search :size="14" />
              <input v-model="searchQuery" placeholder="Search archived expenses..." />
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
                <div class="col attach"></div>
                <div class="col date">Expense Date</div>
                <div class="col archived-since">Archived Since</div>
                <div class="col status">Status</div>
            </div>

            <div v-if="filteredExpenses.length === 0" class="empty-state" style="padding:60px 0;">
                <Archive :size="48" class="empty-icon" />
                <h4 style="margin-top:16px;">No Archived Expenses</h4>
                <p>Expenses will appear here once they are older than 1 year and approved.</p>
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
                    <span class="v-name ellipsis">{{ exp.title }}</span>
                    <div class="sub-row">
                        <span class="v-ref">{{ exp.category }}</span>
                        <span v-if="exp.expense_type" class="pill type-pill">{{ exp.expense_type }}</span>
                    </div>
                </div>
                <div class="col amount font-mono">
                    {{ formatCurrency(exp.total_after_tax || exp.amount, exp.currency) }}
                </div>
                <div class="col vendor">
                    <span class="v-name vendor-name">{{ exp.vendor_name || '—' }}</span>
                </div>
                <div class="col attach attach-cell">
                    <Paperclip v-if="exp.attachments && exp.attachments.length" :size="14" class="attach-icon" />
                </div>
                <div class="col date">
                    {{ formatDate(exp.expense_date) }}
                </div>
                <div class="col archived-since">
                    <span class="archived-time">{{ getArchivedSince(exp.expense_date) }}</span>
                </div>
                <div class="col status">
                     <div class="status-badge compact approved">
                        <Check :size="10" />
                        <span>Approved</span>
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
  Archive, RefreshCw, Download, Search, Wallet, Calendar,
  CheckCircle, Info, Paperclip, Check, Clock
} from 'lucide-vue-next'
import ExpenseDetailsDrawer from '../components/expenses/ExpenseDetailsDrawer.vue'
import { API } from '@/utils/api'

const route = useRoute()
const isAdmin = computed(() => route.path.startsWith('/admin'))

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

const totalArchived = computed(() => {
  return expenses.value.reduce((sum, e) => sum + (e.total_after_tax || e.amount || 0), 0)
})

const oldestDate = computed(() => {
  if (!expenses.value.length) return '—'
  const dates = expenses.value.map(e => new Date(e.expense_date)).sort((a, b) => a - b)
  return dates[0].toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
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

const getArchivedSince = (dateStr) => {
  if (!dateStr) return '—'
  const then = new Date(dateStr)
  const now = new Date()
  const diffMs = now - then
  const months = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44))
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12

  if (years > 0 && remainingMonths > 0) return `${years}y ${remainingMonths}mo ago`
  if (years > 0) return `${years}y ago`
  if (remainingMonths > 0) return `${remainingMonths}mo ago`
  return 'Recently'
}

// Check if an expense date is older than 1 year
const isOlderThanOneYear = (dateStr) => {
  if (!dateStr) return false
  const expDate = new Date(dateStr)
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  return expDate < oneYearAgo
}

// API fetch — gets approved expenses, then filters client-side for 1+ year old
const fetchData = async () => {
  loading.value = true
  try {
    const h = getHeaders()
    const { data } = await axios.get(
      `${API}/expenses/?expense_status=approved&limit=200`,
      { headers: h }
    )
    expenses.value = (Array.isArray(data) ? data : []).filter(e =>
      isOlderThanOneYear(e.expense_date)
    )
  } catch (e) {
    console.warn('Failed to fetch archived expenses', e)
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
  position: relative;
}
.glass-header, .main-canvas { position: relative; z-index: 1; }

/* ── Header (transparent in both themes — sits on page background) ── */
.glass-header {
  position: sticky; top: 0; z-index: 50;
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border-bottom: none;
  padding: 0 40px;
  overflow: hidden;
}

.header-content {
  height: 76px; display: flex; align-items: center; justify-content: space-between;
  position: relative;
}
.header-left { display: flex; align-items: center; gap: 14px; }

.header-icon-box {
  position: relative;
  width: 38px; height: 38px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: #fbbf24;
  animation: iconFloat 4.5s ease-in-out infinite;
}
@keyframes iconFloat {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-2px); }
}
.pulse-ring {
  position: absolute; inset: -2px;
  border-radius: 12px;
  border: 1.5px solid rgba(251, 191, 36, 0.55);
  animation: pulseRing 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  pointer-events: none;
}
@keyframes pulseRing {
  0%   { transform: scale(1);    opacity: 0.7; }
  70%  { transform: scale(1.45); opacity: 0; }
  100% { transform: scale(1.45); opacity: 0; }
}

.header-text { display: flex; flex-direction: column; gap: 1px; }
.header-text label {
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em;
  color: rgba(255,255,255,0.4); font-weight: 600;
}
.header-text h1 {
  font-size: 20px; font-weight: 700; margin: 0;
  background: linear-gradient(135deg, #ffffff 0%, #fbbf24 50%, #f59e0b 100%);
  background-size: 200% 100%;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: titleShine 8s linear infinite;
}
@keyframes titleShine {
  0%   { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}

.header-actions { display: flex; gap: 10px; }
.action-btn {
  position: relative; overflow: hidden;
  border: none; padding: 8px 16px; border-radius: 8px;
  font-size: 12px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; gap: 6px;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 0.25s ease,
              background 0.25s ease,
              color 0.25s ease,
              border-color 0.25s ease;
}
.action-btn.outline {
  background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.75);
  border: 1px solid rgba(255,255,255,0.1);
}
.action-btn.outline:hover {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.20), rgba(217, 119, 6, 0.18));
  border-color: rgba(251, 191, 36, 0.50);
  color: #fde68a;
  transform: translateY(-1px);
  box-shadow: 0 8px 22px -8px rgba(251, 191, 36, 0.55);
}
.action-btn.outline:hover .refresh-icon { animation: spinIcon 0.9s ease; }
.action-btn.outline:hover .download-icon { animation: bounceY 0.6s ease; }
@keyframes spinIcon { to { transform: rotate(360deg); } }
@keyframes bounceY {
  0%, 100% { transform: translateY(0); }
  40%      { transform: translateY(3px); }
  70%      { transform: translateY(-2px); }
}

/* ── Main Canvas ── */
.main-canvas { padding: 28px 40px; max-width: 1500px; margin: 0 auto; }

/* ── Archive Banner ── */
.archive-banner {
  position: relative; overflow: hidden;
  display: flex; align-items: center; gap: 16px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.06), rgba(217, 119, 6, 0.05));
  border: 1px solid rgba(245, 158, 11, 0.18);
  border-radius: 14px; padding: 18px 24px;
  margin-bottom: 20px;
  animation: cardEnter 0.5s ease both;
}
.archive-banner::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(
    120deg,
    transparent 0%,
    rgba(251, 191, 36, 0.10) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: shimmerSweep 9s linear infinite;
  pointer-events: none;
}
@keyframes shimmerSweep {
  0%   { background-position: -120% 0; }
  100% { background-position: 220% 0; }
}
.banner-icon {
  position: relative;
  width: 36px; height: 36px; flex-shrink: 0;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.12);
  display: flex; align-items: center; justify-content: center;
  color: #fbbf24;
  animation: iconFloat 4.5s ease-in-out infinite;
}
.banner-pulse {
  position: absolute; inset: 0;
  border-radius: 10px;
  box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.45);
  animation: bannerPulse 2.6s ease-in-out infinite;
  pointer-events: none;
}
@keyframes bannerPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.40); }
  50%      { box-shadow: 0 0 0 9px rgba(251, 191, 36, 0); }
}
.banner-text { flex: 1; display: flex; flex-direction: column; gap: 3px; position: relative; }
.banner-title {
  font-size: 12px; font-weight: 700; color: #fbbf24;
  text-transform: uppercase; letter-spacing: 0.06em;
}
.banner-desc {
  font-size: 12.5px; color: rgba(255,255,255,0.5); line-height: 1.5;
}
.banner-stat {
  position: relative;
  display: flex; flex-direction: column; align-items: center;
  padding: 10px 20px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.banner-stat:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 26px -10px rgba(251, 191, 36, 0.5);
}
.stat-number {
  font-size: 22px; font-weight: 800; color: white;
  letter-spacing: -0.03em;
}
.stat-label-text {
  font-size: 10px; color: rgba(255,255,255,0.4);
  text-transform: uppercase; font-weight: 600; letter-spacing: 0.06em;
}

/* ── Summary Chips ── */
.summary-chips {
  display: flex; gap: 10px; margin-bottom: 24px; flex-wrap: wrap;
  animation: cardEnter 0.5s ease 0.1s both;
}
.chip {
  display: flex; align-items: center; gap: 7px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 20px; padding: 7px 16px;
  font-size: 12px; color: rgba(255,255,255,0.65);
  transition: transform 0.25s ease, box-shadow 0.25s ease,
              background 0.25s ease, border-color 0.25s ease;
}
.chip:hover {
  background: rgba(251, 191, 36, 0.08);
  border-color: rgba(251, 191, 36, 0.30);
  transform: translateY(-2px);
  box-shadow: 0 8px 22px -10px rgba(251, 191, 36, 0.40);
}
.chip strong { color: white; font-weight: 600; }
.chip svg { color: #fbbf24; }

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
  transition: border-color 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
}
.search-box:focus-within {
  border-color: rgba(251, 191, 36, 0.55);
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.12);
}
.search-box input {
  background: transparent; border: none; outline: none; color: white;
  font-size: 12px; width: 200px;
}
.search-box input::placeholder { color: rgba(255,255,255,0.3); }

.pm-table-modern { display: flex; flex-direction: column; width: 100%; }
.pm-row-modern {
    display: grid;
    grid-template-columns: 40px 1.4fr 100px 1.1fr 32px 115px 130px 110px;
    column-gap: 16px;
    align-items: center;
    padding: 12px 18px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    transition: background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
}
.pm-row-modern.header {
    padding-top: 14px; padding-bottom: 14px;
    border-bottom: 1px solid rgba(255,255,255,0.1); background: transparent;
    font-size: 11px; text-transform: uppercase; color: rgba(255,255,255,0.4); font-weight: 600; letter-spacing: 0.05em;
}
.pm-row-modern.item {
    font-size: 14px;
    cursor: pointer; animation: rowSlide 0.4s ease both;
    position: relative;
}
.pm-row-modern .col { min-width: 0; }
.pm-row-modern .col.date { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pm-row-modern.item::before {
    content: '';
    position: absolute; left: 0; top: 50%; transform: translateY(-50%);
    width: 2px; height: 0;
    background: linear-gradient(180deg, #fbbf24, #d97706);
    transition: height 0.3s ease;
    border-radius: 2px;
}
.pm-row-modern.item:hover {
    background: linear-gradient(90deg, rgba(251, 191, 36, 0.05), rgba(217, 119, 6, 0.02));
    transform: translateX(2px);
}
.pm-row-modern.item:hover::before { height: 70%; }
.pm-row-modern.item:last-child { border-bottom: none; }

/* ── Archived Since Column ── */
.archived-time {
  font-size: 12px; color: rgba(255,255,255,0.45);
  font-weight: 500; font-style: italic;
}

/* ── Status Badge ── */
.status-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 6px; border-radius: 4px;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05);
    font-size: 9px; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase;
}
.status-badge.compact { padding: 3px 8px; font-size: 10px; border-radius: 6px; }
.status-badge.approved { background: rgba(245, 158, 11, 0.10); border-color: rgba(245, 158, 11, 0.25); color: #fbbf24; }

/* ── Grid Column Styles ── */
.col.vendor { display: flex; flex-direction: column; }
.v-name { font-size: 14px; font-weight: 600; color: #f5f5f7; }
.v-name.ellipsis { max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
.v-name.vendor-name { color: rgba(255,255,255,0.85); font-weight: 500; }
.v-ref { font-size: 11px; color: rgba(255,255,255,0.4); font-family: 'SF Mono', monospace; text-transform: capitalize; }
.sub-row { display: flex; gap: 6px; margin-top: 4px; align-items: center; }
.type-pill {
  background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7);
  padding: 2px 6px; font-size: 9px; border-radius: 4px;
  letter-spacing: 0.02em; text-transform: uppercase;
}
.col.amount { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 14px; color: white; font-weight: 600; letter-spacing: -0.02em; }
.col.date { font-size: 12px; color: rgba(255,255,255,0.5); }
.attach-cell { display: flex; justify-content: center; }
.attach-icon { color: rgba(255,255,255,0.3); }
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
  border-top-color: #fbbf24; border-radius: 50%;
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
  .summary-chips { gap: 8px; }
}

/* ═════════ LIGHT THEME OVERRIDES ═════════════════════════════════════════
   Brand palette preserved: yellow / orange / golden / teal. Cream cards with
   warm amber accents. Status badges stay vivid amber for "archived/approved".
   Header sits transparent on the page (no panel). */
[data-theme="light"] .expenses-page { color: var(--text-primary); }

/* Header */
[data-theme="light"] .header-text label { color: #6b5840; }
[data-theme="light"] .header-text h1 {
  background: linear-gradient(135deg, #1a1410 0%, #d97706 50%, #b45309 100%);
  background-size: 200% 100%;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
[data-theme="light"] .header-icon-box {
  background: rgba(217, 119, 6, 0.12);
  border-color: rgba(217, 119, 6, 0.35);
  color: #b45309;
}
[data-theme="light"] .pulse-ring { border-color: rgba(217, 119, 6, 0.55); }

[data-theme="light"] .action-btn.outline {
  background: rgba(255, 250, 240, 0.7);
  color: var(--text-primary);
  border: 1px solid rgba(217, 119, 6, 0.28);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.6) inset;
}
[data-theme="light"] .action-btn.outline:hover {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.35), rgba(217, 119, 6, 0.30));
  border-color: rgba(217, 119, 6, 0.55);
  color: #7c2d12;
  box-shadow: 0 10px 26px -10px rgba(217, 119, 6, 0.55);
}

/* Archive banner */
[data-theme="light"] .archive-banner {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.10), rgba(217, 119, 6, 0.08));
  border: 1px solid rgba(217, 119, 6, 0.30);
  box-shadow: 0 12px 28px -18px rgba(180, 110, 30, 0.30);
}
[data-theme="light"] .archive-banner::before {
  background: linear-gradient(
    120deg,
    transparent 0%,
    rgba(217, 119, 6, 0.16) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
}
[data-theme="light"] .banner-icon {
  background: rgba(217, 119, 6, 0.14);
  color: #b45309;
}
[data-theme="light"] .banner-pulse {
  box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.45);
}
[data-theme="light"] .banner-title { color: #b45309; }
[data-theme="light"] .banner-desc { color: var(--text-secondary); }
[data-theme="light"] .banner-stat {
  background: rgba(255, 250, 240, 0.65);
  border-color: rgba(217, 119, 6, 0.24);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.7) inset;
}
[data-theme="light"] .banner-stat:hover {
  box-shadow: 0 10px 26px -10px rgba(217, 119, 6, 0.50);
}
[data-theme="light"] .stat-number { color: var(--text-primary); }
[data-theme="light"] .stat-label-text { color: #6b5840; }

/* Summary chips — readable text, amber icons */
[data-theme="light"] .chip {
  background: rgba(255, 250, 240, 0.65);
  border: 1px solid rgba(217, 119, 6, 0.24);
  color: var(--text-primary);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.6) inset;
}
[data-theme="light"] .chip:hover {
  background: rgba(217, 119, 6, 0.12);
  border-color: rgba(217, 119, 6, 0.45);
  box-shadow: 0 8px 22px -10px rgba(217, 119, 6, 0.45);
}
[data-theme="light"] .chip strong { color: var(--text-primary); }
[data-theme="light"] .chip :deep(svg) { color: #b45309; }

/* Glass card (table shell) — cream surface with warm border */
[data-theme="light"] .glass-card {
  background: rgba(255, 250, 240, 0.65) !important;
  border: 1px solid rgba(217, 119, 6, 0.20) !important;
  box-shadow:
    0 12px 30px -16px rgba(180, 110, 30, 0.22),
    0 1px 0 rgba(255, 255, 255, 0.7) inset;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

[data-theme="light"] .title-group h3 { color: var(--text-primary); }
[data-theme="light"] .title-group p { color: var(--text-secondary); }

/* Search box — transparent on cream, warm border, gold focus.
   `!important` defeats theme-light-rescue.css which paints .search-box input cream. */
[data-theme="light"] .search-box {
  background: transparent !important;
  border: 1px solid rgba(217, 119, 6, 0.30);
  box-shadow: none;
}
[data-theme="light"] .search-box:focus-within {
  background: transparent !important;
  border-color: #d97706;
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.18);
}
[data-theme="light"] .search-box input {
  background: transparent !important;
  border: none !important;
  color: var(--text-primary) !important;
}
[data-theme="light"] .search-box input::placeholder { color: rgba(26, 20, 16, 0.42); }
[data-theme="light"] .search-box :deep(svg) { color: #b45309; }

/* Table rows */
[data-theme="light"] .pm-row-modern {
  border-bottom: 1px solid rgba(217, 119, 6, 0.14);
}
[data-theme="light"] .pm-row-modern.header {
  color: #6b5840;
  border-bottom: 1px solid rgba(217, 119, 6, 0.24);
}
[data-theme="light"] .pm-row-modern.item:hover {
  background: linear-gradient(90deg, rgba(251, 191, 36, 0.12), rgba(217, 119, 6, 0.05));
}

[data-theme="light"] .v-name { color: var(--text-primary); }
[data-theme="light"] .v-name.vendor-name { color: var(--text-primary); }
[data-theme="light"] .v-ref { color: #8a6f4a; }
[data-theme="light"] .col.amount { color: var(--text-primary); }
[data-theme="light"] .col.date { color: var(--text-secondary); }
[data-theme="light"] .attach-icon { color: #b45309; }
[data-theme="light"] .archived-time { color: #92400e; }
[data-theme="light"] .type-pill {
  background: rgba(217, 119, 6, 0.10);
  color: #92400e;
  border: 1px solid rgba(217, 119, 6, 0.20);
}

/* Approved status badge — deeper amber on cream for readability */
[data-theme="light"] .status-badge.approved {
  background: rgba(217, 119, 6, 0.12);
  border-color: rgba(217, 119, 6, 0.32);
  color: #92400e;
}

[data-theme="light"] .empty-state { color: var(--text-secondary); }
[data-theme="light"] .empty-state .empty-icon { color: rgba(217, 119, 6, 0.35); }

[data-theme="light"] .loading-overlay { background: rgba(250, 247, 240, 0.55); }
[data-theme="light"] .spinner {
  border: 3px solid rgba(217, 119, 6, 0.15);
  border-top-color: #d97706;
}

/* Respect reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .header-icon-box,
  .header-text h1,
  .banner-icon,
  .archive-banner::before,
  .pulse-ring,
  .banner-pulse,
  .pm-row-modern.item { animation: none !important; }
}
</style>
