<template>
  <div class="expenses-page">
    <!-- HEADER -->
    <header class="glass-header">
      <span class="header-shimmer" aria-hidden="true"></span>
      <div class="header-content">
        <div class="header-left">
          <div class="header-icon-box danger">
            <span class="pulse-ring" aria-hidden="true"></span>
            <XSquare :size="20" class="danger-icon" />
          </div>
          <div class="header-text">
            <label>Expense Management</label>
            <h1>Rejected Expenses</h1>
          </div>
        </div>
        <div class="header-actions">
          <button class="action-btn outline" @click="fetchData">
            <RefreshCw :size="14" class="refresh-icon" /> Refresh
          </button>
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
                <div class="col reason reason-text">
                    {{ exp.rejection_reason || '—' }}
                </div>
                <div class="col attach attach-cell">
                    <Paperclip v-if="exp.attachments && exp.attachments.length" :size="14" class="attach-icon" />
                </div>
                <div class="col date">
                    {{ formatDate(exp.expense_date) }}
                </div>
                <div class="col mode mode-cell">
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
  position: relative;
  overflow: hidden;
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
/* Subtle gold sheen behind header content only (no box edge) */
.header-shimmer { display: none; }
@keyframes shimmerSweep {
  0%   { background-position: -120% 0; }
  100% { background-position: 220% 0; }
}

.header-content {
  height: 76px; display: flex; align-items: center; justify-content: space-between;
  position: relative;
}
.header-left { display: flex; align-items: center; gap: 14px; }
.header-icon-box {
  position: relative;
  width: 38px; height: 38px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: #fff;
  animation: iconFloat 4.5s ease-in-out infinite;
}
@keyframes iconFloat {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-2px); }
}
.header-icon-box.danger {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}
.danger-icon { position: relative; z-index: 2; }
.pulse-ring {
  position: absolute; inset: -2px;
  border-radius: 12px;
  border: 1.5px solid rgba(239, 68, 68, 0.55);
  animation: pulseRing 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
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
  -webkit-background-clip: text;
          background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: titleShine 8s linear infinite;
}
@keyframes titleShine {
  0%   { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}

.header-actions { display: flex; gap: 10px; }
.action-btn {
  position: relative;
  border: none; padding: 8px 16px; border-radius: 8px;
  font-size: 12px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; gap: 6px;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 0.25s ease,
              background 0.25s ease,
              color 0.25s ease,
              border-color 0.25s ease;
  overflow: hidden;
}
.action-btn.outline {
  background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7);
  border: 1px solid rgba(255,255,255,0.1);
}
.action-btn.outline:hover {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.18), rgba(217, 119, 6, 0.18));
  border-color: rgba(251, 191, 36, 0.45);
  color: #fde68a;
  transform: translateY(-1px);
  box-shadow: 0 8px 22px -8px rgba(251, 191, 36, 0.55);
}
.action-btn.outline:hover .refresh-icon { animation: refreshSpin 0.9s ease; }
@keyframes refreshSpin { to { transform: rotate(360deg); } }

/* ── Main Canvas ── */
.main-canvas { padding: 28px 40px; max-width: 1500px; margin: 0 auto; }

/* ── Archive Banner ── */
.archive-banner {
  position: relative;
  display: flex; align-items: center; gap: 16px;
  border-radius: 14px; padding: 18px 24px;
  margin-bottom: 20px;
  animation: cardEnter 0.5s ease both;
  overflow: hidden;
}
.archive-banner::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(
    120deg,
    transparent 0%,
    rgba(251, 191, 36, 0.06) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: shimmerSweep 9s linear infinite;
  pointer-events: none;
}
.archive-banner.danger-banner {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.06), rgba(217, 119, 6, 0.05));
  border: 1px solid rgba(239, 68, 68, 0.18);
}
.banner-icon {
  position: relative;
  width: 36px; height: 36px; flex-shrink: 0;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  animation: iconFloat 4.5s ease-in-out infinite;
}
.danger-banner .banner-icon {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
  animation: iconFloat 4.5s ease-in-out infinite, bannerPulse 2.4s ease-in-out infinite;
}
@keyframes bannerPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.35); }
  50%      { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
}
.banner-text { flex: 1; display: flex; flex-direction: column; gap: 3px; position: relative; }
.banner-title {
  font-size: 12px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.06em;
}
.danger-banner .banner-title { color: #ef4444; }

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
    grid-template-columns: 40px 1.4fr 100px 0.9fr 1.3fr 32px 120px 80px 110px;
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
    font-size: 14px; border-radius: 0;
    cursor: pointer; animation: rowSlide 0.4s ease both;
    position: relative;
}
.pm-row-modern .col { min-width: 0; }
.pm-row-modern .col.date {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.pm-row-modern.item::before {
    content: '';
    position: absolute; left: 0; top: 50%; transform: translateY(-50%);
    width: 2px; height: 0;
    background: linear-gradient(180deg, #fbbf24, #d97706);
    transition: height 0.3s ease;
    border-radius: 2px;
}
.pm-row-modern.item:hover {
    background: linear-gradient(90deg, rgba(251, 191, 36, 0.04), rgba(217, 119, 6, 0.02));
    transform: translateX(2px);
}
.pm-row-modern.item:hover::before { height: 70%; }
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
.v-name.ellipsis { max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
.v-name.vendor-name { color: rgba(255,255,255,0.85); font-weight: 500; }
.v-ref { font-size: 11px; color: rgba(255,255,255,0.4); font-family: 'SF Mono', monospace; text-transform: capitalize; margin-top:2px; }
.sub-row { display: flex; gap: 6px; margin-top: 4px; align-items: center; }
.type-pill {
  background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7);
  padding: 2px 6px; font-size: 9px; border-radius: 4px;
  letter-spacing: 0.02em; text-transform: uppercase;
}
.col.amount { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 14px; color: white; font-weight: 600; letter-spacing: -0.02em; }
.col.date { font-size: 12px; color: rgba(255,255,255,0.5); }
.mode-cell { text-transform: capitalize; color: rgba(255,255,255,0.5); font-size: 13px; }
.reason-text {
  color: #ef4444; font-size: 12px; font-style: italic;
  max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
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

/* ═════════ LIGHT THEME OVERRIDES ═════════════════════════════════════════
   Cream background, warm gold/amber/orange accents, full-saturation red for
   the danger/rejection semantic. Header sits on the page background — no
   panel fill, no border — just the shimmer + content. */

[data-theme="light"] .expenses-page { color: var(--text-primary); }

/* Ambient orbs become warmer + a touch dimmer on cream */
[data-theme="light"] .orb-amber {
  background: radial-gradient(circle, #f59e0b 0%, transparent 70%);
}
[data-theme="light"] .orb-gold {
  background: radial-gradient(circle, #fbbf24 0%, transparent 70%);
}
[data-theme="light"] .orb-rose {
  background: radial-gradient(circle, #f87171 0%, transparent 70%);
}
[data-theme="light"] .orb { opacity: 0.18; filter: blur(90px); }

[data-theme="light"] .header-text label { color: #6b5840; }
[data-theme="light"] .header-text h1 {
  background: linear-gradient(135deg, #1a1410 0%, #d97706 50%, #b45309 100%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
          background-clip: text;
  -webkit-text-fill-color: transparent;
}

[data-theme="light"] .header-icon-box.danger {
  background: rgba(220, 38, 38, 0.10);
  border-color: rgba(220, 38, 38, 0.30);
  color: #dc2626;
}
[data-theme="light"] .pulse-ring {
  border-color: rgba(220, 38, 38, 0.55);
}

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

/* Banner */
[data-theme="light"] .archive-banner.danger-banner {
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.07), rgba(217, 119, 6, 0.06));
  border: 1px solid rgba(220, 38, 38, 0.22);
  box-shadow: 0 12px 28px -18px rgba(120, 30, 30, 0.25);
}
[data-theme="light"] .archive-banner::before {
  background: linear-gradient(
    120deg,
    transparent 0%,
    rgba(217, 119, 6, 0.10) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
}
[data-theme="light"] .danger-banner .banner-icon {
  background: rgba(220, 38, 38, 0.12);
  color: #b91c1c;
}
[data-theme="light"] .banner-title { color: #b91c1c; }
[data-theme="light"] .banner-desc { color: var(--text-secondary); }
[data-theme="light"] .banner-stat {
  background: rgba(255, 250, 240, 0.65);
  border-color: rgba(217, 119, 6, 0.22);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.7) inset;
}
[data-theme="light"] .banner-stat:hover {
  box-shadow: 0 10px 26px -10px rgba(217, 119, 6, 0.45);
}
[data-theme="light"] .stat-number { color: var(--text-primary); }
[data-theme="light"] .stat-label-text { color: #6b5840; }

/* Glass card (table shell) — cream, warm border, soft shadow */
[data-theme="light"] .glass-card {
  background: rgba(255, 250, 240, 0.65) !important;
  border: 1px solid rgba(217, 119, 6, 0.18) !important;
  box-shadow:
    0 12px 30px -16px rgba(120, 75, 20, 0.22),
    0 1px 0 rgba(255, 255, 255, 0.7) inset;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

[data-theme="light"] .title-group h3 { color: var(--text-primary); }
[data-theme="light"] .title-group p { color: var(--text-secondary); }

/* Search box — fully transparent on the cream page, just border + gold focus glow.
   `!important` defeats theme-light-rescue.css which paints .search-box input cream. */
[data-theme="light"] .search-box {
  background: transparent !important;
  border: 1px solid rgba(217, 119, 6, 0.25);
  box-shadow: none;
}
[data-theme="light"] .search-box:focus-within {
  border-color: #d97706;
  background: transparent !important;
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.18);
}
[data-theme="light"] .search-box input {
  background: transparent !important;
  border: none !important;
  color: var(--text-primary);
}
[data-theme="light"] .search-box input::placeholder { color: rgba(26, 20, 16, 0.42); }
[data-theme="light"] .search-box :deep(svg) { color: #b45309; }

/* Table rows — readable text on cream */
[data-theme="light"] .pm-row-modern {
  border-bottom: 1px solid rgba(217, 119, 6, 0.12);
}
[data-theme="light"] .pm-row-modern.header {
  color: #6b5840;
  border-bottom: 1px solid rgba(217, 119, 6, 0.22);
}
[data-theme="light"] .pm-row-modern.item:hover {
  background: linear-gradient(90deg, rgba(251, 191, 36, 0.10), rgba(217, 119, 6, 0.05));
}

[data-theme="light"] .v-name { color: var(--text-primary); }
[data-theme="light"] .v-name.vendor-name { color: var(--text-primary); }
[data-theme="light"] .v-ref { color: #8a6f4a; }
[data-theme="light"] .col.amount { color: var(--text-primary); }
[data-theme="light"] .col.date { color: var(--text-secondary); }
[data-theme="light"] .mode-cell { color: var(--text-secondary); }
[data-theme="light"] .attach-icon { color: #b45309; }
[data-theme="light"] .reason-text { color: #b91c1c; }
[data-theme="light"] .type-pill {
  background: rgba(217, 119, 6, 0.10);
  color: #92400e;
  border: 1px solid rgba(217, 119, 6, 0.20);
}

[data-theme="light"] .status-badge.rejected {
  background: rgba(220, 38, 38, 0.10);
  border-color: rgba(220, 38, 38, 0.28);
  color: #b91c1c;
}

[data-theme="light"] .empty-state { color: var(--text-secondary); }
[data-theme="light"] .empty-state .empty-icon { color: rgba(217, 119, 6, 0.35); }

[data-theme="light"] .loading-overlay { background: rgba(250, 247, 240, 0.55); }
[data-theme="light"] .spinner {
  border: 3px solid rgba(217, 119, 6, 0.15);
  border-top-color: #d97706;
}

/* Respect reduced-motion preference everywhere */
@media (prefers-reduced-motion: reduce) {
  .header-icon-box,
  .header-text h1,
  .danger-banner .banner-icon,
  .archive-banner::before,
  .pulse-ring,
  .pm-row-modern.item { animation: none !important; }
}
</style>
