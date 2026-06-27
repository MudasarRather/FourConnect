<template>
  <div class="hrx">
    <!-- ════════════════════ CONSOLE HERO ════════════════════ -->
    <Motion as="section" class="hrx-hero hr-card"
      :initial="reduced ? false : { opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
      <span class="hr-grain" aria-hidden="true" />
      <span class="hr-blueprint" aria-hidden="true" />
      <span class="hrx-hero-glow" aria-hidden="true" />
      <span class="hrx-hero-ring" aria-hidden="true" />

      <div class="hrx-hero-top">
        <div class="hrx-lead">
          <span class="hrx-eyebrow">
            <span class="hrx-live"><span class="hrx-live-dot" /> LIVE</span>
            <Radio :size="13" /> WORKFORCE · MISSION CONTROL
          </span>
          <h1 class="hrx-title">
            {{ greeting }}<template v-if="adminName">, <span class="hrx-accent">{{ adminName }}</span></template>
          </h1>
          <p class="hrx-sub">{{ longDate }} · here's your entire workforce, at a glance.</p>

          <div class="hrx-cta">
            <Motion as="button" type="button" class="hrx-btn primary" @click="go('/admin/hr/employees/add')"
              :whileHover="reduced ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }">
              <Plus :size="16" /> Add Employee
            </Motion>
            <Motion as="button" type="button" class="hrx-btn steel" @click="go('/admin/hr/payroll/processing')"
              :whileHover="reduced ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }">
              <Play :size="15" /> Run Payroll
            </Motion>
            <Motion as="button" type="button" class="hrx-btn steel" @click="go('/admin/hr/leave/my-approvals')"
              :whileHover="reduced ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }">
              <Inbox :size="15" /> Approvals
              <span v-if="pendingTotal" class="hrx-btn-badge">{{ pendingTotal }}</span>
            </Motion>
            <Motion as="button" type="button" class="hrx-btn ghost" @click="go('/admin/hr/settings/dashboard')"
              :whileHover="reduced ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }">
              <Settings :size="15" /> Configure
            </Motion>
          </div>

          <div class="hrx-synced">
            <button class="hrx-refresh" type="button" :data-spin="loading" @click="loadAll" :disabled="loading">
              <RefreshCw :size="13" />
            </button>
            <span v-if="loading">Syncing workforce telemetry…</span>
            <span v-else-if="liveModules === 0">Couldn't reach HR services — click to retry.</span>
            <span v-else-if="liveModules < totalModules">{{ liveModules }}/{{ totalModules }} modules live · updated {{ syncedLabel }}</span>
            <span v-else>All systems live · updated {{ syncedLabel }}</span>
          </div>
        </div>

        <div class="hrx-clock-stage">
          <HrClock />
        </div>
      </div>

      <div class="hrx-helix-band">
        <span class="hrx-band-tag hr-mono" aria-hidden="true">LIFECYCLE&nbsp;FLOW</span>
        <WorkforceHelix :data="data" @go="go" />
      </div>
    </Motion>

    <!-- ════════════════════ TELEMETRY LENSES ════════════════════ -->
    <section class="hrx-lenses">
      <Motion v-for="(l, i) in lenses" :key="l.key" as="button" type="button" class="hrx-lens" :style="{ '--tone': l.color }"
        :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, delay: 0.08 + i * 0.06, ease: [0.16, 1, 0.3, 1] }"
        :whileHover="reduced ? {} : { y: -4 }" :whileTap="{ scale: 0.98 }" @click="go(l.target)">
        <span class="hrx-lens-top">
          <span class="hrx-lens-ic"><component :is="l.icon" :size="16" /></span>
          <ArrowUpRight :size="14" class="hrx-lens-go" />
        </span>
        <span class="hrx-lens-val">
          <template v-if="l.kind === 'num'"><HrCountUp :value="l.value" :start="!loading" />{{ l.suffix }}</template>
          <template v-else>{{ l.display }}</template>
        </span>
        <span class="hrx-lens-lab">{{ l.label }}</span>
        <span class="hrx-lens-sub">{{ l.sub }}</span>
        <span class="hrx-lens-bar" aria-hidden="true" />
      </Motion>
    </section>

    <!-- ════════════════════ COMMAND DECK ════════════════════ -->
    <section class="hrx-deck">
      <WorkforceStrata :data="data" @go="go" />
      <AttendancePulse :data="data" @go="go" />
      <ActionCenter :data="data" @go="go" />
    </section>

    <!-- ════════════════════ INSIGHT RAIL ════════════════════ -->
    <InsightRail :data="data" @go="go" />

    <!-- ════════════════════ MODULE LAUNCHPAD ════════════════════ -->
    <section class="hrx-launch">
      <header class="hrx-launch-head">
        <span class="hrx-launch-eyebrow"><LayoutGrid :size="14" /> Module Launchpad</span>
        <span class="hrx-launch-note">Jump into any HR domain</span>
      </header>
      <div class="hrx-launch-grid">
        <ModuleLaunchCard v-for="(m, i) in modules" :key="m.key" :mod="m" :index="i" @go="go" />
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { Motion } from 'motion-v'
import {
  Radio, Plus, Play, Inbox, Settings, RefreshCw, ArrowUpRight, LayoutGrid,
  Users, Fingerprint, UserPlus, Banknote, ShieldCheck,
  PackageCheck, CalendarOff, Clock, Target, Plane, Boxes, GraduationCap, Receipt, DoorOpen, FileText,
} from 'lucide-vue-next'
import { API } from '@/utils/api'
import { prefersReduced } from '@/composables/useShiftMotion'
import HrCountUp from '@/components/hr/HrCountUp.vue'
import HrClock from './dashboard/HrClock.vue'
import WorkforceHelix from './dashboard/WorkforceHelix.vue'
import WorkforceStrata from './dashboard/WorkforceStrata.vue'
import AttendancePulse from './dashboard/AttendancePulse.vue'
import ActionCenter from './dashboard/ActionCenter.vue'
import InsightRail from './dashboard/InsightRail.vue'
import ModuleLaunchCard from './dashboard/ModuleLaunchCard.vue'
import '@/styles/hr-theme.css'

const router = useRouter()
const reduced = prefersReduced()
const go = (path) => { if (path) router.push(path) }

// ── live data, fanned out across every HR module ──
const ENDPOINTS = {
  core: '/hr/dashboard-stats',
  attendance: '/hr/attendance/dashboard/stats',
  leave: '/hr/leaves/stats',
  recruitment: '/hr/recruitment/dashboard',
  onboarding: '/hr/onboarding/dashboard/stats',
  shifts: '/hr/shifts/dashboard',
  payroll: '/hr/payroll/dashboard',
  performance: '/hr/performance/stats',
  exit: '/hr/exit/dashboard',
  assets: '/hr/assets/stats',
  travel: '/hr/travel/stats',
  reimbursements: '/hr/reimbursements/stats',
  training: '/hr/training/stats',
}
const data = reactive(Object.fromEntries(Object.keys(ENDPOINTS).map((k) => [k, {}])))
const loading = ref(true)
const liveModules = ref(0)
const totalModules = Object.keys(ENDPOINTS).length
const synced = ref(null)
const adminName = ref('')
let refreshTimer = null

// Fan out across modules with a small concurrency pool — the backend runs on a
// single pooled connection (StaticPool), so bursting all 13 at once risks lock
// contention/timeouts. Each result lands as it resolves, so the UI fills in
// progressively. On failure we KEEP the previous value (don't wipe to 0).
async function loadAll() {
  loading.value = true
  const token = localStorage.getItem('admin_token')
  const headers = { Authorization: `Bearer ${token}` }
  const keys = Object.keys(ENDPOINTS)
  let ok = 0
  let idx = 0
  const worker = async () => {
    while (idx < keys.length) {
      const k = keys[idx++]
      try {
        const res = await axios.get(`${API}${ENDPOINTS[k]}`, { headers, timeout: 15000 })
        data[k] = res.data || {}
        ok++
      } catch { /* keep prior data for this module */ }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, keys.length) }, worker))
  liveModules.value = ok
  loading.value = false
  synced.value = new Date()
}

// Admin identity: authoritative source is /auth/me with the ADMIN token.
// `admin_user` is the nav's localStorage cache (the user-panel `user` key is a
// different person — that was the "Razeya" bug).
async function hydrateIdentity() {
  try {
    const c = JSON.parse(localStorage.getItem('admin_user') || 'null')
    if (c?.full_name) adminName.value = String(c.full_name).split(' ')[0]
  } catch { /* ignore */ }
  try {
    const token = localStorage.getItem('admin_token')
    if (!token) return
    const r = await axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` }, timeout: 12000 })
    const fn = r.data?.full_name
    if (fn) adminName.value = String(fn).split(' ')[0]
  } catch { /* ignore */ }
}

const onVisible = () => { if (document.visibilityState === 'visible') loadAll() }
onMounted(() => {
  window.scrollTo({ top: 0 })
  loadAll()
  hydrateIdentity()
  refreshTimer = setInterval(() => { if (document.visibilityState === 'visible') loadAll() }, 60000)
  document.addEventListener('visibilitychange', onVisible)
})
onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  document.removeEventListener('visibilitychange', onVisible)
})

// ── derived helpers ──
const n = (v) => Number(v) || 0
const money = (v) => {
  const x = Number(v) || 0
  if (x >= 1e7) return `₹${(x / 1e7).toFixed(2)}Cr`
  if (x >= 1e5) return `₹${(x / 1e5).toFixed(2)}L`
  if (x >= 1e3) return `₹${(x / 1e3).toFixed(1)}K`
  return `₹${x.toLocaleString()}`
}
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  return 'Good evening'
})
const longDate = computed(() => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }))
const syncedLabel = computed(() => synced.value ? synced.value.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '')

const core = computed(() => data.core || {})
const att = computed(() => data.attendance || {})
const rec = computed(() => data.recruitment?.stats || data.recruitment || {})
const pay = computed(() => data.payroll || {})
const tn = computed(() => data.training || {})
const exk = computed(() => data.exit?.kpis || data.exit || {})

const presentRate = computed(() => {
  const hc = n(att.value.headcount) || n(core.value.active_employees)
  return hc ? Math.round((n(att.value.present_today) / hc) * 100) : 0
})

const pendingQueues = computed(() => {
  const lv = data.leave || {}, tr = data.travel || {}, rb = data.reimbursements || {}
  const ob = data.onboarding || {}, pf = data.performance || {}
  return [
    n(lv.pending_manager) + n(lv.pending_hr) + n(lv.pending),
    n(pay.value.pending_approvals),
    n(rb.pending_approval),
    n(tr.pending) + n(tr.pending_approvals),
    n(rec.value.offers_pending) + n(rec.value.pending_interviews),
    n(ob.pending_documents),
    n(pf.overdue),
    n(exk.value.pending_clearances) + n(exk.value.pending_settlements),
    n(tn.value.overdue_count) + n(tn.value.certs_expiring_30),
  ]
})
const pendingTotal = computed(() => pendingQueues.value.reduce((a, b) => a + b, 0))
const queueCount = computed(() => pendingQueues.value.filter((v) => v > 0).length)

// ── telemetry lenses ──
const lenses = computed(() => [
  { key: 'head', kind: 'num', icon: Users, value: n(core.value.total_employees), suffix: '', label: 'Total Headcount',
    sub: `+${n(core.value.recent_hires_30d)} hired · 30d`, color: 'var(--hr-active)', target: '/admin/hr/employees/all' },
  { key: 'present', kind: 'num', icon: Fingerprint, value: presentRate.value, suffix: '%', label: 'Present Today',
    sub: `${n(att.value.present_today)} of ${n(att.value.headcount) || n(core.value.active_employees)} in`, color: 'var(--hr-accent-gold)', target: '/admin/hr/attendance/dashboard' },
  { key: 'pending', kind: 'num', icon: Inbox, value: pendingTotal.value, suffix: '', label: 'Pending Approvals',
    sub: `across ${queueCount.value} queue${queueCount.value === 1 ? '' : 's'}`, color: 'var(--hr-notice)', target: '/admin/hr/leave/my-approvals' },
  { key: 'roles', kind: 'num', icon: UserPlus, value: n(rec.value.open_positions), suffix: '', label: 'Open Roles',
    sub: `${n(rec.value.candidates_in_pipeline)} in pipeline`, color: 'var(--hr-orange)', target: '/admin/hr/recruitment/positions' },
  { key: 'payroll', kind: 'text', icon: Banknote, display: money(pay.value.current_net), label: 'Monthly Payroll',
    sub: `${n(pay.value.employees_on_payroll)} on payroll`, color: 'var(--hr-active)', target: '/admin/hr/payroll/dashboard' },
  { key: 'compliance', kind: 'num', icon: ShieldCheck, value: Math.round(n(tn.value.compliance_rate)), suffix: '%', label: 'Training Compliance',
    sub: `${n(tn.value.certs_expiring_30)} certs expiring`, color: 'var(--hr-accent-gold)', target: '/admin/hr/training/compliance' },
])

// ── module launchpad ──
const C = { gold: 'var(--hr-accent-gold)', orange: 'var(--hr-orange)', emerald: 'var(--hr-active)', exited: 'var(--hr-exited)', steel: 'var(--hr-inactive)' }
const modules = computed(() => {
  const sh = data.shifts?.kpis || data.shifts || {}
  const pf = data.performance || {}
  const tr = data.travel || {}
  const as = data.assets || {}
  const rb = data.reimbursements || {}
  const lv = data.leave || {}
  const ob = data.onboarding || {}
  return [
    { key: 'employees', name: 'Employees', tagline: 'Directory, lifecycle & records', icon: Users, color: C.emerald,
      stat: n(core.value.active_employees).toLocaleString(), statLabel: 'active staff', target: '/admin/hr/employees/all' },
    { key: 'recruitment', name: 'Recruitment', tagline: 'Requisitions to offers', icon: UserPlus, color: C.gold,
      stat: String(n(rec.value.open_positions)), statLabel: 'open roles', target: '/admin/hr/recruitment/dashboard' },
    { key: 'onboarding', name: 'Onboarding', tagline: 'New-hire launch sequence', icon: PackageCheck, color: C.orange,
      stat: String(n(ob.pending_joinings)), statLabel: 'joining', target: '/admin/hr/onboarding/dashboard' },
    { key: 'attendance', name: 'Attendance', tagline: 'Daily presence & corrections', icon: Fingerprint, color: C.emerald,
      stat: presentRate.value + '%', statLabel: 'present today', target: '/admin/hr/attendance/dashboard' },
    { key: 'leave', name: 'Leave', tagline: 'Time-off & approval chains', icon: CalendarOff, color: C.gold,
      stat: String(n(lv.on_leave_today)), statLabel: 'on leave', target: '/admin/hr/leave/dashboard' },
    { key: 'shifts', name: 'Shifts', tagline: 'Rosters & coverage', icon: Clock, color: C.orange,
      stat: String(n(sh.active_shifts)), statLabel: 'active shifts', target: '/admin/hr/shifts/dashboard' },
    { key: 'payroll', name: 'Payroll', tagline: 'Compensation & payslips', icon: Banknote, color: C.emerald,
      stat: money(pay.value.current_net), statLabel: 'monthly net', target: '/admin/hr/payroll/dashboard' },
    { key: 'performance', name: 'Performance', tagline: 'Reviews, goals & calibration', icon: Target, color: C.gold,
      stat: String(n(pf.in_self) + n(pf.in_manager)), statLabel: 'in review', target: '/admin/hr/performance/dashboard' },
    { key: 'travel', name: 'Travel', tagline: 'Trips, DA & settlements', icon: Plane, color: C.orange,
      stat: String(n(tr.active) + n(tr.pending) + n(tr.active_tours)), statLabel: 'trips active', target: '/admin/hr/travel/dashboard' },
    { key: 'assets', name: 'Assets', tagline: 'Allocation & lifecycle', icon: Boxes, color: C.gold,
      stat: n(as.allocated).toLocaleString(), statLabel: 'allocated', target: '/admin/hr/assets/dashboard' },
    { key: 'training', name: 'Training', tagline: 'Skills, certs & compliance', icon: GraduationCap, color: C.emerald,
      stat: Math.round(n(tn.value.compliance_rate)) + '%', statLabel: 'compliant', target: '/admin/hr/training/dashboard' },
    { key: 'reimburse', name: 'Reimbursements', tagline: 'Claims & settlement', icon: Receipt, color: C.orange,
      stat: String(n(rb.pending_approval)), statLabel: 'to approve', target: '/admin/hr/reimbursements/dashboard' },
    { key: 'exit', name: 'Exit', tagline: 'Offboarding & F&F', icon: DoorOpen, color: C.exited,
      stat: String(n(exk.value.serving_notice ?? core.value.upcoming_exits_30d)), statLabel: 'serving notice', target: '/admin/hr/exit/dashboard' },
    { key: 'documents', name: 'Documents', tagline: 'Employee document vault', icon: FileText, color: C.steel,
      stat: 'Vault', statLabel: 'open records', target: '/admin/hr/employee-documents/dashboard' },
    { key: 'settings', name: 'Settings', tagline: 'Masters & configuration', icon: Settings, color: C.steel,
      stat: 'Config', statLabel: 'org policy', target: '/admin/hr/settings/dashboard' },
  ]
})
</script>

<style scoped>
.hrx {
  position: relative;
  isolation: isolate;
  padding: 6px 32px 48px;
  max-width: 1480px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
  color: var(--hr-text);
}
.hrx::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 440px; pointer-events: none; z-index: 0;
  background: radial-gradient(70% 100% at 50% -10%, color-mix(in srgb, var(--hr-orange) 10%, transparent), transparent 70%); }
.hrx > * { position: relative; z-index: 1; }

/* ── hero ── */
.hrx-hero { overflow: hidden; padding: 34px 36px 26px; min-height: 420px; display: flex; flex-direction: column; }
.hrx-hero-glow { position: absolute; inset: 0; pointer-events: none; background: var(--hr-gradient-warm-glow); opacity: 0.8; }
.hrx-hero-ring { position: absolute; top: -180px; right: -140px; width: 480px; height: 480px; pointer-events: none; border-radius: 50%;
  border: 1px solid var(--hr-border-warm); opacity: 0.4;
  background: conic-gradient(from 0deg, transparent, color-mix(in srgb, var(--hr-accent-gold) 12%, transparent), transparent 60%);
  animation: hrx-spin 80s linear infinite; }
@keyframes hrx-spin { to { transform: rotate(360deg); } }

.hrx-hero-top { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 30px; align-items: center; }
.hrx-clock-stage { position: relative; display: flex; align-items: center; justify-content: center; padding: 0 6px; }
@media (max-width: 1080px) { .hrx-hero-top { grid-template-columns: 1fr; } .hrx-clock-stage { display: none; } }

.hrx-lead { display: flex; flex-direction: column; gap: 13px; }
.hrx-eyebrow { display: inline-flex; align-items: center; gap: 9px; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--hr-text-muted); }
.hrx-eyebrow :deep(svg) { color: var(--hr-accent-gold); }
.hrx-live { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 999px; font-size: 10px; letter-spacing: 0.12em;
  color: var(--hr-active); background: var(--hr-active-soft); border: 1px solid color-mix(in srgb, var(--hr-active) 30%, transparent); }
.hrx-live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--hr-active); animation: hrx-blink 1.8s ease-in-out infinite; }
@keyframes hrx-blink { 0%, 100% { opacity: 1; box-shadow: 0 0 0 0 color-mix(in srgb, var(--hr-active) 60%, transparent); } 50% { opacity: 0.5; box-shadow: 0 0 0 5px transparent; } }

.hrx-title { font-size: clamp(34px, 4.6vw, 56px); font-weight: 850; letter-spacing: -0.03em; line-height: 1.0; color: var(--hr-text); }
.hrx-accent { background: var(--hr-gradient-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.hrx-sub { font-size: 14px; color: var(--hr-text-muted); }

.hrx-cta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 4px; }
.hrx-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; border: 1px solid transparent; transition: filter 0.2s, border-color 0.2s, background 0.2s; }
.hrx-btn.primary { color: #1a1208; background: var(--hr-gradient-hero); box-shadow: var(--hr-accent-gold-glow); }
.hrx-btn.primary:hover { filter: brightness(1.06); }
.hrx-btn.steel { color: var(--hr-text); background: var(--hr-surface-elevated); border-color: var(--hr-border-strong); }
.hrx-btn.steel:hover { border-color: var(--hr-accent-gold-border); }
.hrx-btn.ghost { color: var(--hr-text-secondary); background: transparent; border-color: var(--hr-border); }
.hrx-btn.ghost:hover { color: var(--hr-text); border-color: var(--hr-border-strong); }
.hrx-btn-badge { display: inline-grid; place-items: center; min-width: 19px; height: 19px; padding: 0 5px; border-radius: 999px; font-size: 10.5px; font-weight: 800; color: #1a1208; background: var(--hr-accent-gold); }

.hrx-synced { display: flex; align-items: center; gap: 8px; margin-top: 6px; font-size: 11px; color: var(--hr-text-dim); }
.hrx-refresh { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; color: var(--hr-text-muted); background: var(--hr-input-bg); border: 1px solid var(--hr-border); cursor: pointer; transition: color 0.2s, border-color 0.2s; }
.hrx-refresh:hover:not(:disabled) { color: var(--hr-accent-gold); border-color: var(--hr-accent-gold-border); }
.hrx-refresh[data-spin="true"] :deep(svg) { animation: hrx-spin 0.9s linear infinite; }

/* helix as a full-width lifecycle ribbon at the foot of the hero */
.hrx-helix-band { position: relative; margin-top: auto; padding-top: 16px; min-height: 200px; border-top: 1px solid var(--hr-border); }
.hrx-band-tag { position: absolute; top: 16px; left: 2px; font-size: 9px; letter-spacing: 0.22em; color: var(--hr-text-dim); opacity: 0.6; z-index: 2; }
@media (max-width: 1080px) { .hrx-helix-band { min-height: 172px; } }

/* ── lenses ── */
.hrx-lenses { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; }
@media (max-width: 1200px) { .hrx-lenses { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 640px) { .hrx-lenses { grid-template-columns: repeat(2, 1fr); } }
.hrx-lens { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 3px; padding: 15px 16px 17px; border-radius: 16px; cursor: pointer; text-align: left; font: inherit;
  background: var(--hr-surface); border: 1px solid var(--hr-border); transition: border-color 0.25s, box-shadow 0.25s; }
.hrx-lens:hover { border-color: color-mix(in srgb, var(--tone) 42%, transparent); box-shadow: 0 14px 30px -20px color-mix(in srgb, var(--tone) 70%, transparent); }
.hrx-lens-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.hrx-lens-ic { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; color: var(--tone); background: color-mix(in srgb, var(--tone) 14%, transparent); }
.hrx-lens-go { color: var(--hr-text-dim); transition: color 0.25s, transform 0.25s var(--hr-spring); }
.hrx-lens:hover .hrx-lens-go { color: var(--tone); transform: translate(2px, -2px); }
.hrx-lens-val { font-size: 28px; font-weight: 850; color: var(--hr-text); letter-spacing: -0.02em; line-height: 1.05; }
.hrx-lens-lab { font-size: 11.5px; font-weight: 700; color: var(--hr-text-secondary); }
.hrx-lens-sub { font-size: 10.5px; color: var(--hr-text-dim); }
.hrx-lens-bar { position: absolute; left: 0; bottom: 0; height: 3px; width: 100%; transform: scaleX(0.25); transform-origin: left; background: var(--tone); opacity: 0.5; transition: transform 0.35s var(--hr-spring), opacity 0.25s; }
.hrx-lens:hover .hrx-lens-bar { transform: scaleX(1); opacity: 0.95; }

/* ── command deck ── */
.hrx-deck { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; align-items: stretch; }
@media (max-width: 1100px) { .hrx-deck { grid-template-columns: 1fr 1fr; } .hrx-deck > :last-child { grid-column: 1 / -1; } }
@media (max-width: 720px) { .hrx-deck { grid-template-columns: 1fr; } .hrx-deck > :last-child { grid-column: auto; } }

/* ── launchpad ── */
.hrx-launch { display: flex; flex-direction: column; gap: 14px; }
.hrx-launch-head { display: flex; align-items: baseline; gap: 12px; padding: 0 2px; }
.hrx-launch-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--hr-text-secondary); }
.hrx-launch-eyebrow :deep(svg) { color: var(--hr-accent-gold); }
.hrx-launch-note { font-size: 12px; color: var(--hr-text-dim); }
.hrx-launch-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(216px, 1fr)); gap: 14px; }
@media (max-width: 520px) { .hrx-launch-grid { grid-template-columns: 1fr 1fr; } }

@media (prefers-reduced-motion: reduce) {
  .hrx-hero-ring, .hrx-live-dot, .hrx-refresh[data-spin="true"] :deep(svg) { animation: none !important; }
}
</style>
