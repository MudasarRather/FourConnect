<template>
  <div class="expenses-page">
    <!-- HEADER -->
    <header class="glass-header">
      <div class="header-content">
        <div class="header-left">
          <div class="header-icon-box"><Wallet :size="20" /></div>
          <div class="header-text">
            <label>Expense Management</label>
            <h1>All Expenses</h1>
          </div>
        </div>
        <div class="header-actions">
          <button class="action-btn outline" @click="fetchData"><RefreshCw :size="14" /> Refresh</button>
          <button class="action-btn primary" @click="$router.push(isAdmin ? '/admin/expenses/new' : '/user/expenses/new')">
            <Plus :size="14" /> New Expense
          </button>
        </div>
      </div>
      <!-- Tabs -->
      <div class="tabs-dock">
        <button v-for="tab in tabs" :key="tab.id" class="dock-item" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">
          <component :is="tab.icon" :size="15" />
          <span>{{ tab.label }}</span>
          <div class="active-indicator" v-if="activeTab === tab.id"></div>
        </button>
      </div>
    </header>

    <!-- DASHBOARD TAB -->
    <main class="main-canvas" v-if="activeTab === 'dashboard'">
      <!-- Summary Cards -->
      <section class="summary-cards">
        <div class="stat-card" v-for="(card, i) in summaryCards" :key="i" :style="{ animationDelay: i * 80 + 'ms' }">
          <div class="stat-icon" :style="{ background: card.bg }">
            <component :is="card.icon" :size="18" :style="{ color: card.color }" />
          </div>
          <div class="stat-body">
            <span class="stat-label">{{ card.label }}</span>
            <span class="stat-value">{{ card.value }}</span>
            <span class="stat-sub" v-if="card.sub">{{ card.sub }}</span>
          </div>
        </div>
      </section>

      <!-- Charts Row -->
      <section class="charts-row">
        <!-- Monthly Bar Chart -->
        <div class="glass-card chart-card">
          <div class="card-header">
            <h3><BarChart3 :size="16" /> Monthly Expenses</h3>
            <span v-if="monthlyTrend" class="badge" :style="{ color: monthlyTrend.isUp ? '#22c55e' : (monthlyTrend.percent === 0 ? '#a1a1aa' : '#ef4444') }">
              <TrendingUp v-if="monthlyTrend.isUp && monthlyTrend.percent > 0" :size="12" style="display:inline;margin-bottom:-2px;"/> 
              <TrendingDown v-else-if="!monthlyTrend.isUp" :size="12" style="display:inline;margin-bottom:-2px;"/> 
              {{ monthlyTrend.percent }}% {{ monthlyTrend.percent === 0 ? 'same as' : (monthlyTrend.isUp ? 'more than' : 'less than') }} last month
            </span>
          </div>
          <div class="geom-chart-container" style="height: 220px;">
             <!-- Y Axis Labels -->
            <div class="geom-y-axis">
              <span v-for="tick in [maxMonthly, maxMonthly * 0.66, maxMonthly * 0.33, 0]" :key="tick">{{ formatCurrency(tick, true).replace('₹', '') }}</span>
            </div>
            <!-- The Geometry Chart -->
            <div class="geom-svg-wrap">
               <!-- SVG overlapping rounded bars -->
               <svg viewBox="0 0 400 180" class="geom-svg" preserveAspectRatio="none" style="overflow: visible;">
                 <g v-for="(p, i) in chartPoints" :key="i" class="bar-group">
                    <!-- Background Placeholder Bar -->
                    <rect :x="p.x" y="0" width="34" height="150" rx="16" fill="rgba(255,255,255,0.04)" class="bg-bar" />
                    <!-- Colored Active Value Bar -->
                    <rect :x="p.x" :y="p.y" width="34" :height="150 - p.y" rx="16" fill="#eab308" class="val-bar" :style="{ animationDelay: i * 0.1 + 's' }" />
                    <!-- Invisible Hover Area -->
                    <rect :x="p.x" y="0" width="34" height="150" fill="transparent" class="hover-area" />
                 </g>
               </svg>
               <!-- X Axis Labels -->
               <div class="geom-x-axis" style="bottom:-10px;">
                 <span v-for="(p, i) in chartPoints" :key="i" :style="{ left: `calc(${ (p.x + 17) / 400 * 100}% - 12px)` }">{{ p.label }}</span>
               </div>
            </div>
          </div>
        </div>

        <!-- Category Donut -->
        <div class="glass-card chart-card">
          <div class="card-header">
            <h3><PieChart :size="16" /> Top Categories</h3>
          </div>
          <div class="donut-chart-container">
            <svg class="donut-svg" viewBox="0 0 120 120">
              <circle v-for="(seg, i) in donutSegments" :key="i"
                cx="60" cy="60" r="45"
                fill="none" :stroke="seg.color" stroke-width="14"
                :stroke-dasharray="seg.dash" :stroke-dashoffset="seg.offset"
                class="donut-segment"
                :style="{ animationDelay: i * 120 + 'ms' }"
              />
              <text x="60" y="56" text-anchor="middle" fill="white" font-size="14" font-weight="700">
                {{ summary.total_count || 0 }}
              </text>
              <text x="60" y="72" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="8">
                expenses
              </text>
            </svg>
            <div class="donut-legend">
              <div v-for="(cat, i) in topCategories" :key="i" class="legend-item">
                <span class="legend-dot" :style="{ background: catColors[i % catColors.length] }"></span>
                <span class="legend-label">{{ cat.category }}</span>
                <span class="legend-value">₹{{ cat.total.toLocaleString('en-IN') }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Status + Payment Method -->
      <section class="info-row">
        <div class="glass-card mini-card">
          <div class="card-header"><h3><CheckCircle :size="16" /> Status Breakdown</h3></div>
          <div class="status-bars">
            <div v-for="(count, status) in summary.statuses" :key="status" class="status-row">
              <span class="status-name">{{ status }}</span>
              <div class="status-bar-track">
                <div class="status-bar-fill" :style="{ width: statusPercent(count) + '%', background: statusColor(status) }"></div>
              </div>
              <span class="status-count">{{ count }}</span>
            </div>
          </div>
        </div>
        <div class="glass-card mini-card">
          <div class="card-header"><h3><CreditCard :size="16" /> Payment Methods</h3></div>
          <div class="status-bars">
            <div v-for="(amount, method) in summary.payment_methods" :key="method" class="status-row">
              <span class="status-name">{{ method }}</span>
              <div class="status-bar-track">
                <div class="status-bar-fill" :style="{ width: pmPercent(amount) + '%', background: methodColor(method) }"></div>
              </div>
              <span class="status-count">₹{{ Number(amount).toLocaleString('en-IN') }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Recent Expenses Section -->
      <section class="recent-expenses-section">
         <div class="glass-card recent-card">
            <div class="card-header">
               <h3><Clock :size="16" /> Recent Expenses</h3>
               <button class="view-all-btn" @click="activeTab = 'list'">View All <ChevronRight :size="14" /></button>
            </div>
            <div class="recent-list">
               <div v-for="(exp, i) in recentExpenses" :key="exp.id" class="recent-item" :style="{ animationDelay: i * 50 + 'ms' }" @click="openExpenseDetails(exp.id)">
                  <div class="r-icon-box"><RefreshCw :size="16" v-if="exp.expense_type === 'recurring'"/><FileText :size="16" v-else/></div>
                  <div class="r-info">
                     <span class="r-title">{{ exp.title }}</span>
                     <span class="r-meta">{{ exp.vendor_name || 'No Vendor' }} &bull; {{ formatDate(exp.expense_date) }} &bull; <span class="r-cat" :style="{ color: catColors[i % catColors.length] }">{{ exp.category }}</span></span>
                  </div>
                  <div class="r-amount-col">
                     <span class="r-amount font-mono">₹{{ Number(exp.total_after_tax || exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) }}</span>
                     <span class="r-status" :style="{ color: statusColor(getStatus(exp)) }">{{ getStatus(exp) }}</span>
                  </div>
               </div>
               <div v-if="recentExpenses.length === 0" class="empty-state">
                  <Wallet :size="32" /> <p>No recent expenses</p>
               </div>
            </div>
         </div>
      </section>
    </main>

    <!-- ALL EXPENSES TABLE TAB -->
    <main class="main-canvas" v-if="activeTab === 'list'">
      <div class="table-container-modern">
        <div class="header-actions-modern">
          <div class="title-group">
            <h3>Expense Records</h3>
            <p>Track all business expenses</p>
          </div>
          <div class="table-controls" style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
            <div class="search-box">
              <Search :size="14" />
              <input v-model="searchQuery" placeholder="Search expenses..." />
            </div>

            <!-- Type Filter -->
            <div style="width: 140px;">
              <CustomSelect 
                v-model="expenseTypeFilter" 
                :options="[
                  {label: 'All Types', value: ''},
                  {label: 'General', value: 'general'},
                  {label: 'Project', value: 'project'}
                ]"
                labelKey="label"
                valueKey="value"
                placeholder="All Types"
              />
            </div>

            <!-- Specific Project Filter -->
            <div v-if="expenseTypeFilter === 'project'" style="width: 180px;">
              <CustomSelect 
                v-model="selectedProjectId" 
                :options="[{label: 'All Projects', value: ''}, ...userProjects]"
                labelKey="label"
                valueKey="value"
                placeholder="Select Project"
              />
            </div>

            <!-- Status Filter -->
            <div style="width: 140px;">
              <CustomSelect 
                v-model="statusFilter" 
                :options="[
                  {label: 'All Status', value: ''},
                  {label: 'Submitted', value: 'submitted'},
                  {label: 'Approved', value: 'approved'}
                ]"
                labelKey="label"
                valueKey="value"
                placeholder="All Status"
              />
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
                <div class="col date">Date</div>
                <div class="col mode">Mode</div>
                <div class="col status">Status</div>
            </div>

            <div v-if="filteredExpenses.length === 0" class="empty-state" style="padding:60px 0;">
                <Wallet :size="48" class="empty-icon text-gray-500" />
                <h4 style="margin-top:16px;">No Expenses Found</h4>
                <p>Try adjusting your search or filters.</p>
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
                        <Clock v-else-if="getStatus(exp) === 'Submitted'" :size="10" />
                        <AlertCircle v-else :size="10" />
                        <span>{{ getStatus(exp) }}</span>
                     </div>
                </div>
            </div>
        </div>
      </div>
    </main>

    <!-- Drawer -->
    <ExpenseDetailsDrawer
       :is-open="!!selectedExpenseId"
       :expense="expenses.find(e => e.id === selectedExpenseId)"
       @close="selectedExpenseId = null"
       @edit="handleEditExpense"
       @deleted="fetchData"
       @approved="fetchData"
       @rejected="fetchData"
    />

    <!-- Edit Expense Modal -->
    <EditExpenseModal
       v-model="showEditModal"
       :expense="editingExpense"
       @updated="handleExpenseUpdated"
    />

    <!-- Loading -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import {
  Wallet, Plus, RefreshCw, BarChart3, PieChart, CheckCircle, CreditCard,
  FileText, Search, LayoutDashboard, List, IndianRupee, TrendingUp, TrendingDown, Clock, AlertCircle,
  ChevronRight, Paperclip, Check
} from 'lucide-vue-next'
import ExpenseDetailsDrawer from '../components/expenses/ExpenseDetailsDrawer.vue'
import EditExpenseModal from '../components/expenses/EditExpenseModal.vue'
import CustomSelect from '../components/ui/CustomSelect.vue'

const route = useRoute()
const router = useRouter()
const isAdmin = computed(() => route.path.startsWith('/admin'))
const API = 'http://localhost:8000/api'

const getHeaders = () => {
  const token = isAdmin.value ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')
  return { Authorization: `Bearer ${token}` }
}

const activeTab = ref('dashboard')
const loading = ref(false)
const expenses = ref([])
const summary = ref({ total_amount: 0, total_count: 0, monthly: [], categories: [], statuses: {}, payment_methods: {} })
const searchQuery = ref('')
const statusFilter = ref('')
const expenseTypeFilter = ref('')
const selectedProjectId = ref('')
const userProjects = ref([])
const selectedExpenseId = ref(null)

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'list', label: 'All Expenses', icon: List },
]

// Exclusive Orange, Amber, and warm gray palette (20 shades represented)
const catColors = ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#d97706', '#b45309', '#ea580c', '#c2410c']
const pmColors = ['#f59e0b', '#d97706', '#92400e', '#fcd34d']

// Computed
const summaryCards = computed(() => [
  { label: 'Total Expenses', value: '₹' + Number(summary.value.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }), sub: `${summary.value.total_count} records`, icon: IndianRupee, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { label: 'This Month', value: '₹' + Number(currentMonthTotal.value).toLocaleString('en-IN', { minimumFractionDigits: 2 }), sub: `${currentMonthCount.value} expenses`, icon: TrendingUp, color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  { label: 'Pending', value: String(summary.value.statuses?.submitted || summary.value.statuses?.pending || 0), sub: 'awaiting approval', icon: Clock, color: '#fcd34d', bg: 'rgba(252,211,77,0.12)' },
  { label: 'Approved', value: String(summary.value.statuses?.approved || 0), sub: 'expenses cleared', icon: CheckCircle, color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
])

const currentMonthTotal = computed(() => {
  const now = new Date()
  const m = summary.value.monthly.find(x => x.month === now.getMonth() + 1 && x.year === now.getFullYear())
  return m ? m.total : 0
})
const currentMonthCount = computed(() => {
  const now = new Date()
  const m = summary.value.monthly.find(x => x.month === now.getMonth() + 1 && x.year === now.getFullYear())
  return m ? m.count : 0
})

const monthlyData = computed(() => summary.value.monthly || [])
const topCategories = computed(() => (summary.value.categories || []).slice(0, 6))

const maxMonthly = computed(() => Math.max(...monthlyData.value.map(m => m.total), 1))

// Geometry Scaled Bars
const chartPoints = computed(() => {
  const pts = []
  const maxW = 360; const h = 150
  const data = monthlyData.value
  if(data.length === 0) return []
  const max = maxMonthly.value
  const step = data.length > 1 ? maxW / (data.length - 1) : maxW
  data.forEach((d, i) => {
     pts.push({
        x: i * step + 16,
        y: h - (d.total / max) * h,
        val: d.total,
        label: monthName(d.month)
     })
  })
  return pts
})

const donutSegments = computed(() => {
  const total = topCategories.value.reduce((s, c) => s + c.total, 0) || 1
  const circumference = 2 * Math.PI * 45
  let offset = 0
  return topCategories.value.map((cat, i) => {
    const pct = cat.total / total
    // Add a slight gap between drawn segments artificially
    const drawDash = Math.max(0, (pct * circumference) - 4)
    const emptyDash = circumference - drawDash
    const dash = `${drawDash} ${emptyDash}`
    const seg = { color: catColors[i % catColors.length], dash, offset: -offset }
    offset += pct * circumference
    return seg
  })
})

const monthlyTrend = computed(() => {
  if (!summary.value?.monthly_expenses || summary.value.monthly_expenses.length < 2) return null
  
  const sorted = [...summary.value.monthly_expenses].sort((a,b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.month - b.month
  })
  
  const current = sorted[sorted.length - 1]
  const previous = sorted[sorted.length - 2]
  
  if (previous.total === 0) {
    if (current.total === 0) return { percent: 0, isUp: true }
    return { percent: 100, isUp: true } // Technically infinite growth, capping at 100% for display
  }
  
  const calc = ((current.total - previous.total) / previous.total) * 100
  return {
    percent: Math.round(Math.abs(calc)),
    isUp: calc >= 0
  }
})

const filteredExpenses = computed(() => {
  let list = expenses.value
  
  // Status Filter
  if (statusFilter.value) {
    list = list.filter(e => getStatus(e) === statusFilter.value)
  }

  // Type Filter (General vs Project)
  if (expenseTypeFilter.value === 'general') {
    list = list.filter(e => !e.project_id)
  } else if (expenseTypeFilter.value === 'project') {
    list = list.filter(e => !!e.project_id)
    // Specific Project Filter
    if (selectedProjectId.value) {
      list = list.filter(e => e.project_id === selectedProjectId.value)
    }
  }

  // Search Filter
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(e => (e.title || '').toLowerCase().includes(q) || (e.category || '').toLowerCase().includes(q) || (e.vendor_name || '').toLowerCase().includes(q))
  }
  return list
})

const recentExpenses = computed(() => {
  return [...expenses.value].sort((a,b) => new Date(b.created_at || b.expense_date) - new Date(a.created_at || a.expense_date)).slice(0, 10)
})

const openExpenseDetails = (id) => {
   // Emit event or handle opening details drawer (stub for now, will connect to list tab drawer)
   selectedExpenseId.value = id
}

// Helpers
const monthName = (m) => ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m] || ''
const formatCurrency = (v, short) => {
  if (v >= 100000) return '₹' + (v / 100000).toFixed(1) + 'L'
  if (v >= 1000) return '₹' + (v / 1000).toFixed(0) + 'K'
  return '₹' + v.toFixed(0)
}
const formatDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
const getStatus = (e) => {
  const s = e.expense_status
  return (s && typeof s === 'object' && s.value) ? s.value : (s || 'draft')
}
const getPayment = (e) => {
  const p = e.payment_method
  return (p && typeof p === 'object' && p.value) ? p.value : (p || '—')
}
const statusPercent = (count) => Math.min((count / Math.max(summary.value.total_count, 1)) * 100, 100)
const pmPercent = (amount) => Math.min((amount / Math.max(summary.value.total_amount, 1)) * 100, 100)
const statusColor = (s) => {
   const st = String(s).toLowerCase()
   if (st === 'approved') return '#fbbf24' // Amber
   if (st === 'submitted' || st === 'pending') return '#fcd34d' // Lighter yellow
   if (st === 'rejected') return '#ef4444' // Red (keeping standard semantic red)
   return '#a1a1aa' // Draft/gray
}
const methodColor = (m) => {
   const i = Object.keys(summary.value.payment_methods || {}).indexOf(m)
   return pmColors[i % pmColors.length] || pmColors[0]
}
// Edit Expense Modal
const showEditModal = ref(false)
const editingExpense = ref(null)

const handleEditExpense = (expense) => {
    editingExpense.value = expense
    selectedExpenseId.value = null // close drawer
    showEditModal.value = true
}

const handleExpenseUpdated = () => {
    showEditModal.value = false
    editingExpense.value = null
    fetchData()
}

// API
const handleExpenseDeleted = (deletedId) => {
    selectedExpenseId.value = null
    fetchData()
}

const handleExpenseApproved = (approvedId) => {
    selectedExpenseId.value = null
    fetchData() 
}

const fetchData = async () => {
  loading.value = true
  try {
    const h = getHeaders()
    const [sumRes, expRes] = await Promise.all([
      axios.get(`${API}/expenses/summary`, { headers: h }),
      axios.get(`${API}/expenses/`, { headers: h }),
    ])
    summary.value = sumRes.data
    expenses.value = expRes.data
  } catch (e) {
    console.error('Failed to fetch expenses', e)
  }

  try {
    const { data } = await axios.get(`${API}/projects?limit=100`, { headers: getHeaders() })
    // Only include projects where user is owner, admin, or has 'accepted' membership
    const validProjects = (data.items || []).filter(p => 
      ['owner', 'admin', 'accepted'].includes(p.current_user_membership_status)
    )
    userProjects.value = validProjects.map(p => ({ label: p.name, value: p.id }))
  } catch (e) {
    console.error('Failed to load projects:', e)
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
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; /* White icon requested */
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
.action-btn.primary {
  background: #eab308; color: black;
}
.action-btn.primary:hover { background: #facc15; transform: translateY(-1px); }

/* ── Tabs ── */
.tabs-dock { display: flex; gap: 24px; margin-top: 2px; }
.dock-item {
  background: transparent; border: none; padding: 12px 2px;
  color: rgba(255,255,255,0.45); font-size: 13px; font-weight: 500;
  cursor: pointer; position: relative; display: flex; align-items: center; gap: 7px;
  transition: color 0.2s;
}
.dock-item:hover { color: rgba(255,255,255,0.8); }
.dock-item.active { color: white; font-weight: 600; }
.active-indicator {
  position: absolute; bottom: -1px; left: 0; width: 100%; height: 2px;
  background: #f59e0b; border-radius: 2px 2px 0 0;
}

/* ── Main Canvas ── */
.main-canvas { padding: 28px 40px; max-width: 1500px; margin: 0 auto; }

/* ── Summary Cards ── */
.summary-cards {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;
}
.stat-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px; padding: 20px;
  display: flex; align-items: flex-start; gap: 14px;
  animation: cardEnter 0.5s ease both;
  transition: border-color 0.2s;
}
.stat-card:hover { border-color: rgba(255,255,255,0.14); }
.stat-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.stat-body { display: flex; flex-direction: column; gap: 2px; }
.stat-label { font-size: 11px; color: rgba(255,255,255,0.45); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
.stat-value { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
.stat-sub { font-size: 11px; color: rgba(255,255,255,0.35); }

/* ── Glass Card ── */
.glass-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 16px; padding: 24px;
  animation: cardEnter 0.5s ease both;
}
.card-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 20px;
}
.card-header h3 {
  font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px;
  color: rgba(255,255,255,0.85); margin: 0;
}
.badge {
  font-size: 10px; padding: 3px 10px; border-radius: 20px;
  background: rgba(139,92,246,0.12); color: #a78bfa; font-weight: 600;
}

/* ── Spline Chart ── */
.geom-chart-container { display: flex; height: 220px; gap: 12px; position: relative; }
.geom-y-axis {
  display: flex; flex-direction: column; justify-content: space-between;
  font-size: 10px; color: rgba(255,255,255,0.3); width: 40px; text-align: right;
  padding-bottom: 30px; font-family: 'SF Mono', monospace;
}
.geom-svg-wrap { flex: 1; position: relative; height: 100%; }
.geom-svg { width: 100%; height: calc(100% - 30px); overflow: visible; }
.val-bar { opacity: 0; animation: scale-up-bar 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; transform-origin: bottom; transition: fill 0.2s; }
.bar-group { cursor: pointer; transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
.hover-area { cursor: pointer; }
.bar-group:hover .val-bar { fill: #fde047; } /* Brighter yellow on hover */
.bar-group:hover { transform: translateY(-4px); }

.geom-x-axis { position: absolute; bottom: 0; left: 0; width: 100%; height: 24px; }
.geom-x-axis span { position: absolute; font-size: 11px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }

@keyframes scale-up-bar { from { transform: scaleY(0); opacity: 0; } to { transform: scaleY(1); opacity: 1; } }

/* ── Donut Chart ── */
.charts-row { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; margin-bottom: 24px; }
.donut-chart-container { display: flex; align-items: center; gap: 28px; }
.donut-svg { width: 140px; height: 140px; flex-shrink: 0; transform: rotate(-90deg); }
.donut-segment {
  animation: donutDraw 0.8s ease both;
  transition: opacity 0.3s, stroke-width 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  stroke-linecap: round;
  cursor: pointer;
  transform-origin: 60px 60px;
}
.donut-segment:hover {
  stroke-width: 18px; /* Expand stroke directly */
  opacity: 0.9;
}
.donut-svg text { transform: rotate(90deg); transform-origin: 60px 60px; }
.donut-legend { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.legend-label { flex: 1; color: rgba(255,255,255,0.65); text-transform: capitalize; }
.legend-value { font-weight: 600; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 11px; }

/* ── Recent Expenses ── */
.recent-expenses-section { margin-bottom: 24px; }
.recent-card { padding: 0; overflow: hidden; }
.recent-card .card-header { padding: 20px 24px; margin: 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
.view-all-btn { 
  background: transparent; border: none; font-size: 12px; color: #f59e0b; font-weight: 600;
  display: flex; align-items: center; gap: 4px; cursor: pointer; transition: color 0.2s;
}
.view-all-btn:hover { color: #fbbf24; }
.recent-list { display: flex; flex-direction: column; }
.recent-item {
  display: grid; grid-template-columns: 40px 1fr auto; gap: 16px; align-items: center;
  padding: 16px 24px; border-bottom: 1px solid rgba(255,255,255,0.04);
  cursor: pointer; transition: background 0.15s;
  animation: cardEnter 0.4s ease both;
}
.recent-item:last-child { border-bottom: none; }
.recent-item:hover { background: rgba(255,255,255,0.03); }
.r-icon-box {
  width: 40px; height: 40px; border-radius: 10px;
  background: rgba(245,158,11,0.1); color: #f59e0b;
  display: flex; align-items: center; justify-content: center;
}
.r-info { display: flex; flex-direction: column; gap: 2px; }
.r-title { font-size: 14px; font-weight: 600; color: white; }
.r-meta { font-size: 12px; color: rgba(255,255,255,0.4); }
.r-cat { font-weight: 500; }
.r-amount-col { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.r-amount { font-size: 15px; font-weight: 700; color: white; letter-spacing: -0.02em; }
.r-status { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }


/* ── Info Row ── */
.info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
.mini-card { padding: 20px; }
.status-bars { display: flex; flex-direction: column; gap: 10px; }
.status-row { display: flex; align-items: center; gap: 10px; }
.status-name { width: 70px; font-size: 11px; color: rgba(255,255,255,0.5); text-transform: capitalize; font-weight: 500; }
.status-bar-track { flex: 1; height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden; }
.status-bar-fill { height: 100%; border-radius: 3px; transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
.status-count { font-size: 12px; font-weight: 600; width: 60px; text-align: right; color: rgba(255,255,255,0.7); }

/* ── Table ── */
.table-card { padding: 0; overflow: hidden; }
.table-header { padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.table-controls { display: flex; gap: 10px; }
.search-box {
  display: flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  padding: 6px 12px; border-radius: 8px;
}
.search-box input {
  background: transparent; border: none; outline: none; color: white;
  font-size: 12px; width: 160px;
}
.search-box input::placeholder { color: rgba(255,255,255,0.3); }
.filter-select {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.7); padding: 6px 12px; border-radius: 8px;
  font-size: 12px; outline: none; cursor: pointer;
}
.filter-select option { background: #18181b; color: white; }

/* ── Modern Table Layout ── */
.table-container-modern { display: flex; flex-direction: column; gap: 16px; animation: cardEnter 0.4s ease both; }
.header-actions-modern { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; }
.title-group h3 { font-size: 18px; font-weight: 600; color: white; margin: 0; letter-spacing: -0.02em; }
.title-group p { font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 4px; }

.pm-table-modern { display: flex; flex-direction: column; width: 100%; }
.pm-row-modern {
    display: grid; 
    grid-template-columns: 50px 1.5fr 110px 1.2fr 40px 100px 90px 120px;
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

/* Grid Columns */
.status-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 6px; border-radius: 4px; /* More rectangular */
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05);
    font-size: 9px; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase;
}
.status-badge.compact { padding: 3px 8px; font-size: 10px; border-radius: 6px; }
.status-badge.approved { background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.2); color: #fbbf24; } /* Amber */
.status-badge.submitted, .status-badge.pending { background: rgba(252, 211, 77, 0.1); border-color: rgba(252, 211, 77, 0.2); color: #fcd34d; } /* Yellow */
.status-badge.rejected { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2); color: #f87171; }
.status-badge.draft { background: rgba(161, 161, 170, 0.1); border-color: rgba(161, 161, 170, 0.2); color: #a1a1aa; }

.col.vendor { display: flex; flex-direction: column; }
.v-name { font-size: 14px; font-weight: 600; color: #f5f5f7; }
.v-ref { font-size: 11px; color: rgba(255,255,255,0.4); font-family: 'SF Mono', monospace; text-transform: capitalize; margin-top:2px; }

.col.amount { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 14px; color: white; font-weight: 600; letter-spacing: -0.02em; }
.col.date { font-size: 13px; color: rgba(255,255,255,0.6); }

.pill { border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
.col.invoice { display: flex; align-items: center; gap: 6px; }
.mono { font-family: 'SF Mono', monospace; font-size: 12px; color: rgba(255,255,255,0.5); font-weight: 600; }
.attach-icon { color: #f59e0b; }
.arrow { color: rgba(255,255,255,0.2); transition: transform 0.2s; }
.pm-row-modern.item:hover .arrow { transform: translateX(3px); color: rgba(255,255,255,0.6); }

.empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; color: rgba(255,255,255,0.4); }

/* ── Loading ── */
.loading-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;
  z-index: 999;
}
.spinner {
  width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.1);
  border-top-color: #8b5cf6; border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

/* ── Animations ── */
@keyframes cardEnter {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes barGrow {
  from { opacity: 0; transform: scaleY(0); }
  to { opacity: 1; transform: scaleY(1); }
}
@keyframes donutDraw {
  from { stroke-dasharray: 0 283; }
}
@keyframes rowSlide {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Responsive ── */
@media (max-width: 1024px) {
  .summary-cards { grid-template-columns: repeat(2, 1fr); }
  .charts-row, .info-row { grid-template-columns: 1fr; }
  .glass-header, .main-canvas { padding-left: 20px; padding-right: 20px; }
}
</style>
