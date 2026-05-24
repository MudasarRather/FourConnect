<template>
  <div class="void-page-root">
    <div class="void-container">
      
      <!-- LEFT PANE: Overview (Sticky) -->
      <aside class="overview-panel" ref="panelRef" @mousemove="handleMouseMove" @mouseenter="isHovering = true" @mouseleave="handleMouseLeave">
        <div class="overview-glass-card" :style="panelStyle">
          <header class="overview-header" :style="{ transform: `translateY(${Math.min(scrollY * 0.15, 60)}px)`, opacity: 1 - Math.min(scrollY * 0.003, 0.5) }">
            <div class="header-icon-box" :style="{ transform: `translateZ(40px) scale(${1 + Math.min(scrollY*0.001, 0.1)})` }">
               <RotateCcw :size="20" stroke-width="1.5" />
            </div>
            <div class="header-titles" :style="{ transform: `translateZ(20px)` }">
               <label>Expense Management</label>
               <h1>Reversal Ledger</h1>
            </div>
          </header>

          <p class="overview-desc" :style="{ transform: `translateZ(10px)` }">A unified timeline of all adjusted, voided, and reversed expense transactions across your account.</p>

          <div class="stats-showcase" :style="{ transform: `translateZ(25px)` }">
            <div class="main-stat">
              <span class="stat-value font-mono">₹{{ formatCompact(stats.totalReversed) }}</span>
              <span class="stat-label">Total Volume Reversed</span>
            </div>

            <div class="breakdown-bars">
               <div class="bar-group">
                  <div class="bar-info"><span>Full Reversals</span> <span>{{ stats.fullCount }}</span></div>
                  <div class="bar-track">
                     <div class="bar-fill full" :style="{ width: stats.totalCount ? (stats.fullCount / stats.totalCount * 100) + '%' : '0%' }"></div>
                  </div>
               </div>
               <div class="bar-group">
                  <div class="bar-info"><span>Partial Reversals</span> <span>{{ stats.partialCount }}</span></div>
                  <div class="bar-track">
                     <div class="bar-fill partial" :style="{ width: stats.totalCount ? (stats.partialCount / stats.totalCount * 100) + '%' : '0%' }"></div>
                  </div>
               </div>
            </div>
          </div>

          <div class="filters-section">
            <div class="search-box">
               <Search :size="16" />
               <input v-model="searchQuery" placeholder="Search vendor, category, reason..." />
            </div>
            
            <div class="pill-group">
               <button class="pill" :class="{ active: typeFilter === '' }" @click="typeFilter = ''">All</button>
               <button class="pill full" :class="{ active: typeFilter === 'FULL' }" @click="typeFilter = 'FULL'">Full Only</button>
               <button class="pill partial" :class="{ active: typeFilter === 'PARTIAL' }" @click="typeFilter = 'PARTIAL'">Partial Only</button>
            </div>
          </div>
        </div>
      </aside>

      <!-- RIGHT PANE: The Timeline Feed -->
      <main class="ledger-feed">
         <div v-if="loading" class="feed-state">
            <Loader2 class="spin" :size="32" />
         </div>
         <div v-else-if="filteredExpenses.length === 0" class="feed-state">
            <div class="empty-icon"><RotateCcw :size="48" stroke-width="1" /></div>
            <p>No reversal records match your criteria.</p>
         </div>
         <div v-else class="feed-list">
            <div 
              v-for="(exp, i) in paginatedExpenses" 
              :key="exp.id"
              class="feed-item glass-row"
              :style="{ animationDelay: `${i * 0.05}s` }"
              @click="selectedExpenseId = exp.id"
            >
               <div class="feed-item-indicator" :class="(exp.reversal_type || 'FULL').toLowerCase()"></div>
               
               <div class="feed-main">
                  <h3 class="feed-title">{{ exp.title?.replace('REVERSAL: ', '') }}</h3>
                  <div class="feed-meta">
                     <span class="meta-tag">{{ exp.category }}</span>
                     <span class="meta-dot">•</span>
                     <span>{{ exp.vendor_name || 'No Vendor' }}</span>
                  </div>
               </div>

               <div class="feed-reason">
                  <p class="reason-text">{{ exp.reversal_reason || exp.notes || 'No reason provided' }}</p>
                  <span class="reason-date">{{ formatDate(exp.reversal_date || exp.created_at) }}</span>
               </div>

               <div class="feed-financials">
                  <span class="feed-amount font-mono">-₹{{ Math.abs(Number(exp.reversed_amount || exp.amount)).toLocaleString('en-IN', {minimumFractionDigits:2}) }}</span>
                  <span class="feed-badge" :class="(exp.reversal_type || 'FULL').toLowerCase()">{{ exp.reversal_type || 'FULL' }}</span>
               </div>
            </div>
         </div>
         
         <div v-if="totalPages >= 1 && filteredExpenses.length > 0" class="pagination-bar">
            <button class="page-nav" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)">
               <ChevronLeft :size="16" />
            </button>
            <div class="page-pills">
               <button 
                  v-for="p in totalPages" 
                  :key="p" 
                  class="page-pill" 
                  :class="{ active: currentPage === p }"
                  @click="goToPage(p)"
               >
                  {{ p }}
               </button>
            </div>
            <button class="page-nav" :disabled="currentPage === totalPages" @click="goToPage(currentPage + 1)">
               <ChevronRight :size="16" />
            </button>
         </div>
         
         <div v-else-if="filteredExpenses.length > 0" class="end-of-feed">
             <div class="end-dot"></div>
             <span>End of Ledger</span>
         </div>
      </main>
    </div>

    <!-- Drawer keeps exact original props/events -->
    <ExpenseDetailsDrawer
       :is-open="!!selectedExpenseId"
       :expense="expenses.find(e => e.id === selectedExpenseId)"
       @close="selectedExpenseId = null"
       @deleted="fetchData"
       @approved="fetchData"
       @rejected="fetchData"
       :hide-user-delete="true"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { RotateCcw, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-vue-next'
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
const typeFilter = ref('')
const selectedExpenseId = ref(null)

// Animations: Scroll & Hover 3D Tilt
const panelRef = ref(null)
const scrollY = ref(0)
const isHovering = ref(false)
const mousePos = ref({ x: 0, y: 0 })

const handleScroll = () => {
  scrollY.value = window.scrollY
}

const handleMouseMove = (e) => {
  if (!panelRef.value) return
  const rect = panelRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  // Map coordinates to -1 (left/top) to +1 (right/bottom)
  mousePos.value = {
    x: (x / rect.width) * 2 - 1,
    y: (y / rect.height) * 2 - 1
  }
}

const handleMouseLeave = () => {
  isHovering.value = false
  mousePos.value = { x: 0, y: 0 }
}

const panelStyle = computed(() => {
  if (isHovering.value) {
    const rotateX = -mousePos.value.y * 6 // max 6 deg tilt
    const rotateY = mousePos.value.x * 6
    return {
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
      transition: 'transform 0.1s ease-out, box-shadow 0.1s ease-out, border-color 0.1s ease-out',
      boxShadow: `0 30px 60px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.06)`,
      borderColor: 'rgba(255,255,255,0.15)',
      transformStyle: 'preserve-3d'
    }
  }
  return {
    transform: `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`,
    transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
    transformStyle: 'preserve-3d'
  }
})

// Stats Calculation
const stats = computed(() => {
  const all = expenses.value
  return {
    totalCount: all.length,
    fullCount: all.filter(e => e.reversal_type === 'FULL').length,
    partialCount: all.filter(e => e.reversal_type === 'PARTIAL').length,
    pendingCount: all.filter(e => e.expense_status === 'pending_reversal').length,
    totalReversed: all.reduce((s, e) => s + Math.abs(Number(e.reversed_amount || e.amount || 0)), 0),
  }
})

// Filter Engine
const filteredExpenses = computed(() => {
  let list = expenses.value
  if (typeFilter.value) {
    list = list.filter(e => e.reversal_type === typeFilter.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(e =>
      (e.title || '').toLowerCase().includes(q) ||
      (e.category || '').toLowerCase().includes(q) ||
      (e.vendor_name || '').toLowerCase().includes(q) ||
      (e.reversal_reason || '').toLowerCase().includes(q)
    )
  }
  return list
})

// Pagination Engine
const currentPage = ref(1)
const itemsPerPage = ref(5)

const totalPages = computed(() => Math.ceil(filteredExpenses.value.length / itemsPerPage.value) || 1)

const paginatedExpenses = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredExpenses.value.slice(start, end)
})

const goToPage = (p) => {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

watch([searchQuery, typeFilter], () => {
  currentPage.value = 1
})

// Formatters
const formatCompact = (v) => {
  if (!v) return '0'
  if (v >= 100000) return (v / 100000).toFixed(2) + 'L'
  if (v >= 1000) return (v / 1000).toFixed(1) + 'K'
  return v.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

const formatDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Fetch Logic
const fetchData = async () => {
  loading.value = true
  try {
    const h = getHeaders()
    const { data } = await axios.get(`${API}/expenses/?expense_status=reversed&limit=200`, { headers: h })
    expenses.value = Array.isArray(data) ? data.filter(e => e.is_reversal === true) : []
  } catch (e) {
    console.warn('Failed to fetch reversed expenses', e)
    expenses.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
/* ── Variables & Typography ── */
.void-page-root {
  min-height: 100vh;
  background: transparent;
  color: #f5f5f7;
  position: relative;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
.font-mono { font-family: "SF Mono", "Fira Code", monospace; }

/* ── Container Layout ── */
.void-container {
  position: relative; z-index: 10;
  display: flex; gap: 40px;
  max-width: 1400px; margin: 0 auto;
  padding: 40px;
  align-items: flex-start;
}

/* ── LEFT PANE: Sticky Overview ── */
.overview-panel {
  flex: 0 0 380px; position: sticky; top: 40px;
  animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
  perspective: 1200px; /* Required for the 3D hover effect */
  z-index: 20;
}
.overview-glass-card {
  background: #0a0a0a;
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 20px 40px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.02);
  border-radius: 24px; padding: 32px;
  will-change: transform, box-shadow;
}

/* Header */
.overview-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
.header-icon-box {
  width: 44px; height: 44px; border-radius: 14px;
  background: linear-gradient(135deg, rgba(245,158,11,0.2), rgba(239,68,68,0.1));
  border: 1px solid rgba(245,158,11,0.2);
  display: flex; align-items: center; justify-content: center;
  color: #f59e0b; box-shadow: 0 8px 20px rgba(245,158,11,0.1);
}
.header-titles label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.4); font-weight: 600; display: block; margin-bottom: 2px;}
.header-titles h1 { font-size: 24px; font-weight: 700; color: #fff; margin: 0; letter-spacing: -0.02em; }
.overview-desc { font-size: 14px; color: rgba(255,255,255,0.5); line-height: 1.6; margin-bottom: 40px; }

/* Stats */
.stats-showcase { margin-bottom: 40px; }
.main-stat { display: flex; flex-direction: column; margin-bottom: 24px; }
.stat-value { font-size: 48px; font-weight: 700; color: #fff; letter-spacing: -0.04em; line-height: 1; margin-bottom: 8px; }
.stat-label { font-size: 13px; color: rgba(255,255,255,0.5); font-weight: 500; }

.breakdown-bars { display: flex; flex-direction: column; gap: 16px; }
.bar-group { display: flex; flex-direction: column; gap: 8px; }
.bar-info { display: flex; justify-content: space-between; font-size: 12px; color: rgba(255,255,255,0.7); font-weight: 500; }
.bar-track { height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 3px; transition: width 1s cubic-bezier(0.16, 1, 0.3, 1); }
.bar-fill.full { background: linear-gradient(90deg, #ef4444, #fca5a5); }
.bar-fill.partial { background: linear-gradient(90deg, #f59e0b, #fcd34d); }

/* Filters */
.filters-section { display: flex; flex-direction: column; gap: 20px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 32px; }
.search-box {
  display: flex; align-items: center; gap: 10px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  padding: 12px 16px; border-radius: 12px; transition: all 0.3s;
}
.search-box:focus-within { background: rgba(255,255,255,0.08); border-color: rgba(245,158,11,0.3); }
.search-box input { background: transparent; border: none; outline: none; color: white; font-size: 13px; width: 100%; }
.search-box input::placeholder { color: rgba(255,255,255,0.3); }

.pill-group { display: flex; gap: 8px; flex-wrap: wrap; }
.pill {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
  padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600;
  color: rgba(255,255,255,0.6); cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.pill:hover { background: rgba(255,255,255,0.08); color: white; transform: translateY(-1px); }
.pill.active { background: #fff; color: #000; border-color: #fff; }
.pill.full.active { background: #ef4444; color: white; border-color: #ef4444; }
.pill.partial.active { background: #f59e0b; color: white; border-color: #f59e0b; }

/* ── RIGHT PANE: Feed ── */
.ledger-feed { flex: 1; display: flex; flex-direction: column; min-width: 0; padding-top: 8px; }

.feed-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 400px; color: rgba(255,255,255,0.4); animation: fadeUp 0.6s both;
}
.empty-icon { opacity: 0.3; margin-bottom: 16px; }

.feed-list { display: flex; flex-direction: column; gap: 16px; }

/* Feed Item Row */
.glass-row {
  display: grid; grid-template-columns: 4px 1fr 1.5fr minmax(140px, auto); gap: 24px; align-items: center;
  background: #0a0a0a;
  border: 1px solid rgba(255,255,255,0.06);
  padding: 20px 24px 20px 0; border-radius: 16px;
  cursor: pointer; cursor: hand;
  animation: rowEnter 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative; overflow: hidden;
}
.glass-row:hover {
  background: #121212;
  border-color: rgba(255,255,255,0.12);
  transform: translateX(4px) scale(1.002);
  box-shadow: 0 12px 24px rgba(0,0,0,0.4), -8px 0 20px rgba(0,0,0,0.2);
}

.feed-item-indicator {
  height: 100%; width: 4px; border-radius: 0 4px 4px 0;
  background: rgba(255,255,255,0.1);
  transition: width 0.3s;
}
.glass-row:hover .feed-item-indicator { width: 6px; }
.feed-item-indicator.full { background: #ef4444; box-shadow: 0 0 10px rgba(239,68,68,0.5); }
.feed-item-indicator.partial { background: #f59e0b; box-shadow: 0 0 10px rgba(245,158,11,0.5); }

.feed-main { display: flex; flex-direction: column; gap: 6px; }
.feed-title { font-size: 15px; font-weight: 600; color: #fff; margin: 0; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px; }
.feed-meta { display: flex; align-items: center; gap: 8px; font-size: 12px; color: rgba(255,255,255,0.4); font-weight: 500; }
.meta-tag { background: rgba(255,255,255,0.06); padding: 2px 8px; border-radius: 6px; color: rgba(255,255,255,0.7); }

.feed-reason { display: flex; flex-direction: column; gap: 6px; }
.reason-text { font-size: 13px; color: rgba(255,255,255,0.6); margin: 0; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.reason-date { font-size: 11px; color: rgba(255,255,255,0.3); font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }

.feed-financials { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.feed-amount { font-size: 18px; font-weight: 700; color: #ef4444; letter-spacing: -0.02em; }
.feed-badge {
  padding: 4px 10px; border-radius: 8px; font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.feed-badge.full { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #ef4444; }
.feed-badge.partial { background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.2); color: #f59e0b; }

/* End Marker */
.end-of-feed {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  margin-top: 48px; padding-bottom: 40px; color: rgba(255,255,255,0.2); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;
}
.end-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.1); }

/* Pagination Controls */
.pagination-bar {
  display: flex; justify-content: center; align-items: center; gap: 16px;
  margin-top: 48px; padding-bottom: 40px;
}
.page-nav {
  width: 36px; height: 36px; border-radius: 50%;
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.6); cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.page-nav:hover:not(:disabled) {
  background: rgba(255,255,255,0.08); color: white; transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.4); border-color: rgba(255,255,255,0.15);
}
.page-nav:disabled { opacity: 0.2; cursor: not-allowed; }

.page-pills {
  display: flex; align-items: center; gap: 6px;
  background: #0a0a0a; border: 1px solid rgba(255,255,255,0.08);
  padding: 6px; border-radius: 24px;
}
.page-pill {
  width: 32px; height: 32px; border-radius: 50%;
  background: transparent; border: none;
  font-size: 13px; font-weight: 600; font-family: 'SF Mono', monospace;
  color: rgba(255,255,255,0.4); cursor: pointer; transition: all 0.3s;
  display: flex; align-items: center; justify-content: center;
}
.page-pill:hover:not(.active) { color: white; background: rgba(255,255,255,0.05); }
.page-pill.active {
  background: white; color: black;
  box-shadow: 0 4px 12px rgba(255,255,255,0.2);
}

/* Animations */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes rowEnter {
  from { opacity: 0; transform: translateY(15px) scale(0.99); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Responsive */
@media (max-width: 1100px) {
  .void-container { flex-direction: column; padding: 20px; }
  .overview-panel { flex: none; width: 100%; position: static; }
  .glass-row { grid-template-columns: 4px 1.5fr minmax(100px, auto); padding-right: 16px; gap: 16px; }
  .feed-reason { display: none; }
}

/* ═════════ LIGHT THEME OVERRIDES ═════════════════════════════════════════
   Warm cream surfaces, amber/gold/orange accents preserved. Red/teal stay
   as semantic accents (rejection / partial / pending). The brand palette
   — yellow, orange, golden, teal — is unchanged; only neutral surfaces
   and text colors invert for cream readability. */
[data-theme="light"] .void-page-root { color: var(--text-primary); }

/* ── Overview panel (left sticky card) ── */
[data-theme="light"] .overview-glass-card {
  background: rgba(255, 250, 240, 0.78);
  border: 1px solid rgba(217, 119, 6, 0.22);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  box-shadow:
    0 20px 50px -18px rgba(120, 75, 20, 0.28),
    inset 0 0 0 1px rgba(255, 255, 255, 0.55);
}

[data-theme="light"] .header-icon-box {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.28), rgba(220, 38, 38, 0.14));
  border-color: rgba(217, 119, 6, 0.40);
  color: #b45309;
  box-shadow: 0 8px 22px rgba(217, 119, 6, 0.22);
}
[data-theme="light"] .header-titles label { color: #6b5840; }
[data-theme="light"] .header-titles h1 {
  background: linear-gradient(135deg, #1a1410 30%, #b45309 100%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
[data-theme="light"] .overview-desc { color: #4a3a28; }

/* Stat showcase */
[data-theme="light"] .stat-value {
  background: linear-gradient(135deg, #92400e 20%, #d97706 80%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
[data-theme="light"] .stat-label { color: #6b5840; }

/* Bar info + tracks */
[data-theme="light"] .bar-info { color: var(--text-primary); font-weight: 600; }
[data-theme="light"] .bar-info span:last-child { color: #b45309; }
[data-theme="light"] .bar-track {
  background: rgba(40, 25, 10, 0.08);
  border: 1px solid rgba(217, 119, 6, 0.14);
}
/* bar fills (full=red, partial=amber) already warm — leave as-is */

/* Filters divider */
[data-theme="light"] .filters-section { border-top-color: rgba(217, 119, 6, 0.18); }

/* Search box — transparent on cream, warm border, gold focus glow.
   `!important` defeats theme-light-rescue.css which paints .search-box input cream. */
[data-theme="light"] .search-box {
  background: transparent !important;
  border: 1px solid rgba(217, 119, 6, 0.32);
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

/* Pill group — warm border, readable text on cream; active states keep brand palette */
[data-theme="light"] .pill {
  background: rgba(255, 250, 240, 0.55);
  border: 1px solid rgba(217, 119, 6, 0.28);
  color: #6b4f24;
}
[data-theme="light"] .pill:hover {
  background: rgba(217, 119, 6, 0.10);
  color: #92400e;
  border-color: rgba(217, 119, 6, 0.45);
}
[data-theme="light"] .pill.active {
  background: linear-gradient(135deg, #92400e, #b45309);
  color: #fff8e7;
  border-color: #92400e;
  box-shadow: 0 6px 16px rgba(180, 83, 9, 0.32);
}
[data-theme="light"] .pill.full.active {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: #fff;
  border-color: #b91c1c;
  box-shadow: 0 6px 16px rgba(220, 38, 38, 0.32);
}
[data-theme="light"] .pill.partial.active {
  background: linear-gradient(135deg, #d97706, #b45309);
  color: #fff;
  border-color: #b45309;
  box-shadow: 0 6px 16px rgba(217, 119, 6, 0.32);
}

/* ── Feed (right pane) ── */
[data-theme="light"] .feed-state { color: var(--text-secondary); }
[data-theme="light"] .empty-icon { color: rgba(217, 119, 6, 0.40); }

[data-theme="light"] .glass-row {
  background: rgba(255, 250, 240, 0.72);
  border: 1px solid rgba(217, 119, 6, 0.20);
  box-shadow:
    0 12px 28px -16px rgba(120, 75, 20, 0.22),
    inset 0 0 0 1px rgba(255, 255, 255, 0.55);
}
[data-theme="light"] .glass-row:hover {
  background: rgba(255, 250, 240, 0.92);
  border-color: rgba(217, 119, 6, 0.40);
  box-shadow:
    0 18px 36px -16px rgba(120, 75, 20, 0.32),
    -8px 0 20px rgba(217, 119, 6, 0.08);
}

/* Feed indicator — preserve EXACT dark-theme colors in light mode so the
   amber/red brand accents stay vivid against cream. The base (no .full/.partial)
   override has equal specificity to .full/.partial and appears later in the
   cascade, which would wash them out — so we re-state each variant explicitly. */
[data-theme="light"] .feed-item-indicator {
  background: rgba(217, 119, 6, 0.20);
}
[data-theme="light"] .feed-item-indicator.full {
  background: #ef4444;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
}
[data-theme="light"] .feed-item-indicator.partial {
  background: #f59e0b;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
}

[data-theme="light"] .feed-title { color: var(--text-primary); }
[data-theme="light"] .feed-meta { color: #6b5840; }
[data-theme="light"] .meta-tag {
  background: rgba(217, 119, 6, 0.10);
  color: #92400e;
  border: 1px solid rgba(217, 119, 6, 0.18);
}

[data-theme="light"] .reason-text { color: var(--text-secondary); }
[data-theme="light"] .reason-date { color: #92400e; }

[data-theme="light"] .feed-amount { color: #b91c1c; }
/* feed-badge.full / .partial already warm — leave */

/* End-of-feed marker */
[data-theme="light"] .end-of-feed { color: #92400e; }
[data-theme="light"] .end-dot { background: rgba(217, 119, 6, 0.30); }

/* ── Pagination ── */
[data-theme="light"] .page-nav {
  background: rgba(255, 250, 240, 0.65);
  border: 1px solid rgba(217, 119, 6, 0.28);
  color: #6b4f24;
}
[data-theme="light"] .page-nav:hover:not(:disabled) {
  background: rgba(217, 119, 6, 0.12);
  border-color: #d97706;
  color: #92400e;
  box-shadow: 0 6px 16px rgba(217, 119, 6, 0.22);
}
[data-theme="light"] .page-nav:disabled { opacity: 0.35; }

[data-theme="light"] .page-pills {
  background: rgba(255, 250, 240, 0.65);
  border: 1px solid rgba(217, 119, 6, 0.24);
}
[data-theme="light"] .page-pill { color: #8a6f4a; }
[data-theme="light"] .page-pill:hover:not(.active) {
  color: #92400e;
  background: rgba(217, 119, 6, 0.10);
}
[data-theme="light"] .page-pill.active {
  background: linear-gradient(135deg, #d97706, #b45309);
  color: #fff;
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.40);
}
</style>
