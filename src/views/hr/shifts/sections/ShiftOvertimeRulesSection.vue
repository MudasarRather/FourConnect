<template>
  <section class="otr" :class="{ capped: resolved.capped }">
    <!-- ════════════════════ ENGINE HEADER ════════════════════ -->
    <Motion as="header" class="engine" :initial="{ opacity: 0, y: -14 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: EASE }">
      <span class="eng-scan" aria-hidden="true" />
      <span class="eng-grid" aria-hidden="true" />

      <!-- live multiplier core -->
      <div class="eng-core" aria-hidden="true">
        <span class="core-ring r1" /><span class="core-ring r2" /><span class="core-ring r3" />
        <span class="core-orbit"><i class="orbit-spark" /></span>
        <span class="core-glyph">×</span>
      </div>

      <div class="eng-id">
        <span class="eyebrow"><span class="eyebrow-dot" /> Compensation engine · live</span>
        <h2 class="eng-title">Overtime Rules<span class="title-sweep" aria-hidden="true" /></h2>
        <p>The rate card for overtime pay. Each rule scores a <b>(type, hours)</b> pair — the highest-priority active rule wins, applies its multiplier and caps payable hours. Payroll consumes this exactly.</p>
      </div>

      <div class="eng-side">
        <div class="eng-readbar">
          <span class="erb"><b><ShiftCountUp :value="activeCount" /></b><small>active</small></span>
          <span class="erb-div" />
          <span class="erb"><b><ShiftCountUp :value="topMultiplier" :decimals="2" suffix="×" /></b><small>peak rate</small></span>
          <span class="erb-div" />
          <span class="erb"><b><ShiftCountUp :value="typesCovered" />/4</b><small>types</small></span>
        </div>
        <div class="eng-actions">
          <button class="btn-primary" v-magnetic="{ strength: 0.22 }" @click="openCreate"><Plus :size="15" /><span>New rule</span></button>
          <button class="btn-ghost" :class="{ spin: loading }" title="Refresh" @click="reload"><RefreshCw :size="15" /></button>
        </div>
      </div>
    </Motion>

    <!-- ════════════════════ RESOLVER STAGE (centerpiece) ════════════════════ -->
    <Motion as="div" class="stage" :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, delay: 0.08, ease: EASE }">
      <span class="stage-aurora" aria-hidden="true" />

      <!-- LEFT — mission console -->
      <div class="console">
        <div class="cns-eyebrow"><Calculator :size="13" /> Payout resolver</div>
        <p class="cns-hint">A what-if simulator. Pick an OT type and drag the hours — it shows the multiplier, cap and pay your rules would apply. This is exactly what payroll computes for an approved OT request.</p>

        <!-- type selector -->
        <div class="type-pills" role="tablist">
          <button v-for="t in OT_TYPES" :key="t.key" class="tp" :class="{ on: calc.ot_type === t.key }"
            :style="{ '--c': t.color }" role="tab" :aria-selected="calc.ot_type === t.key" @click="calc.ot_type = t.key">
            <span class="tp-dot" /><span class="tp-lbl">{{ t.label }}</span>
          </button>
        </div>

        <!-- hours rail -->
        <div class="rail-block">
          <div class="rail-top">
            <span class="rail-label">OT hours worked</span>
            <span class="rail-val">{{ fmtNum(calc.hours) }}h</span>
          </div>
          <div class="rail" :style="{ '--pct': railPct + '%' }">
            <span class="rail-fill" />
            <span class="rail-thumb"><i /></span>
            <input class="rail-input" type="range" min="0" :max="axisMax" step="0.5" v-model.number="calc.hours"
              aria-label="Overtime hours" />
            <span v-if="resolved.cap != null" class="rail-cap" :style="{ left: capPct + '%' }" :title="`Cap ${resolved.cap}h`">
              <i /><small>cap</small>
            </span>
          </div>
          <div class="rail-ruler"><span v-for="n in rulerTicks" :key="n">{{ n }}h</span></div>
        </div>

        <!-- resolved readout -->
        <div class="readout" :class="{ matched: resolved.matched, capped: resolved.capped }">
          <span class="rd-print" aria-hidden="true" />
          <div class="rd-mult">
            <div class="rd-mult-num">
              <ShiftCountUp :value="resolved.multiplier" :decimals="2" :duration="500" /><span class="rd-x">×</span>
            </div>
            <div class="rd-mult-cap">
              <span class="rd-rule" :title="resolved.matched ? resolved.rule.name : ''">
                <component :is="resolved.matched ? Zap : Slash" :size="11" />
                {{ resolved.matched ? resolved.rule.name : 'No rule — pays 1× (no premium)' }}
              </span>
            </div>
          </div>
          <div class="rd-rows">
            <div class="rd-row"><span>Requested</span><b>{{ fmtNum(resolved.requested) }}h</b></div>
            <div class="rd-row"><span>Payable</span><b :class="{ hot: resolved.capped }">{{ fmtNum(resolved.payable) }}h</b></div>
            <div class="rd-row total"><span>Pay units</span><b>{{ (resolved.payable * resolved.multiplier).toFixed(2) }}</b></div>
          </div>
          <div class="rd-tags">
            <ShiftStatusPill v-if="resolved.capped" tone="alert"><AlertTriangle :size="10" /> Capped</ShiftStatusPill>
            <ShiftStatusPill v-if="resolved.matched && resolved.approval" tone="gold"><ShieldCheck :size="10" /> Approval</ShiftStatusPill>
            <ShiftStatusPill v-if="resolved.matched" tone="neutral">priority {{ resolved.rule.priority }}</ShiftStatusPill>
          </div>
        </div>
      </div>

      <!-- RIGHT — payout curve -->
      <div class="curve-wrap">
        <div class="curve-head">
          <span class="ch-title">Payout curve</span>
          <span class="ch-legend">
            <i v-for="t in OT_TYPES" :key="t.key" class="lg" :class="{ on: calc.ot_type === t.key }" :style="{ '--c': t.color }">
              <em /></i>
            <span class="lg-note">vs <b>1×</b> baseline</span>
          </span>
        </div>

        <svg class="curve" :viewBox="`0 0 ${VB.w} ${VB.h}`" preserveAspectRatio="none" role="img" aria-label="Overtime payout curve">
          <defs>
            <linearGradient :id="`${uid}-fill`" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" :stop-color="selectedColor" stop-opacity="0.34" />
              <stop offset="100%" :stop-color="selectedColor" stop-opacity="0" />
            </linearGradient>
            <linearGradient :id="`${uid}-line`" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="var(--shift-amber-bright)" />
              <stop offset="100%" :stop-color="selectedColor" />
            </linearGradient>
          </defs>

          <!-- gridlines -->
          <g class="grid">
            <line v-for="gx in 4" :key="'gx'+gx" :x1="VB.x0 + (gx/4)*(VB.x1-VB.x0)" :y1="VB.y1"
              :x2="VB.x0 + (gx/4)*(VB.x1-VB.x0)" :y2="VB.y0" />
            <line v-for="gy in 3" :key="'gy'+gy" :x1="VB.x0" :y1="VB.y1 + (gy/4)*(VB.y0-VB.y1)"
              :x2="VB.x1" :y2="VB.y1 + (gy/4)*(VB.y0-VB.y1)" />
          </g>
          <!-- axes -->
          <line class="axis" :x1="VB.x0" :y1="VB.y0" :x2="VB.x1" :y2="VB.y0" />
          <line class="axis" :x1="VB.x0" :y1="VB.y1" :x2="VB.x0" :y2="VB.y0" />

          <!-- 1× baseline -->
          <path class="baseline" :d="baselineD" />

          <!-- ghost curves (other types) -->
          <path v-for="g in ghostCurves" :key="'g'+g.key" class="ghost" :d="g.d" :style="{ stroke: g.color }" />

          <!-- area fill + main line for selected type -->
          <path class="area" :d="areaD" :fill="`url(#${uid}-fill)`" />
          <path class="mainline" :d="lineD" :stroke="`url(#${uid}-line)`" />
          <path class="flux" :d="lineD" :stroke="selectedColor" />

          <!-- cap ceiling -->
          <template v-if="resolved.cap != null && resolved.cap <= axisMax">
            <line class="cap-v" :x1="mapX(resolved.cap)" :y1="VB.y0" :x2="mapX(resolved.cap)" :y2="mapY(resolved.cap * resolved.multiplier)" />
            <line class="cap-h" :x1="VB.x0" :y1="mapY(resolved.cap * resolved.multiplier)" :x2="VB.x1" :y2="mapY(resolved.cap * resolved.multiplier)" />
            <text class="cap-lbl" :x="mapX(resolved.cap) + 4" :y="VB.y1 + 9">CAP {{ resolved.cap }}h</text>
          </template>

          <!-- playhead -->
          <line class="ph-line" :x1="ph.x" :y1="VB.y1" :x2="ph.x" :y2="VB.y0" />
          <circle class="ph-halo" :cx="ph.x" :cy="ph.y" r="7" :class="{ hot: resolved.capped }" />
          <circle class="ph-dot" :cx="ph.x" :cy="ph.y" r="3.4" :class="{ hot: resolved.capped }" />

          <!-- x ticks -->
          <g class="ticks">
            <text v-for="tk in xTicks" :key="'xt'+tk.v" :x="mapX(tk.v)" :y="VB.y0 + 14" text-anchor="middle">{{ tk.label }}</text>
          </g>
        </svg>
        <div class="curve-axislabels"><span>OT HOURS →</span><span>PAYABLE ×RATE ↑</span></div>
      </div>
    </Motion>

    <!-- ════════════════════ RESOLVER LANES ════════════════════ -->
    <div class="lanes-head">
      <span class="lh-title">Rules by type</span>
      <span class="lh-sub">Within a type the <b>highest priority</b> wins — lower rules wait in standby.</span>
    </div>
    <div class="lanes">
      <Motion v-for="(lane, li) in lanes" :key="lane.key" as="div" class="lane" :style="{ '--c': lane.color }"
        :initial="{ opacity: 0, y: 22 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.5, delay: 0.06 * li, ease: EASE }">
        <header class="lane-head">
          <span class="lane-name"><span class="lane-dot" />{{ lane.label }}</span>
          <span class="lane-count">{{ lane.rules.length }}</span>
        </header>

        <div v-if="lane.rules.length" class="lane-stack">
          <article v-for="(r, ri) in lane.rules" :key="r.id" class="rchip"
            :class="{ active: r.id === lane.winnerId, off: r.is_active === false }"
            v-tilt="{ max: 4, scale: 1.01, perspective: 900 }">
            <span class="rchip-ring" aria-hidden="true" />
            <header class="rchip-top">
              <span class="rchip-badge" v-if="r.id === lane.winnerId"><Zap :size="9" /> resolves</span>
              <span class="rchip-badge standby" v-else-if="r.is_active === false"><Power :size="9" /> off</span>
              <span class="rchip-badge standby" v-else>standby</span>
              <span class="rchip-prio">P{{ r.priority }}</span>
            </header>
            <div class="rchip-mult"><b>{{ fmtMult(r.multiplier) }}</b><span>×</span></div>
            <h4 class="rchip-name">{{ r.name }}</h4>
            <div class="rchip-meta">
              <span><Timer :size="11" />after {{ fmtNum(r.threshold_hours) }}h</span>
              <span v-if="r.max_ot_hours"><AlertTriangle :size="11" />cap {{ fmtNum(r.max_ot_hours) }}h</span>
              <span v-else><Infinity :size="11" />uncapped</span>
            </div>
            <p v-if="r.description" class="rchip-desc">{{ r.description }}</p>
            <footer class="rchip-foot">
              <ShiftStatusPill v-if="r.approval_required" tone="gold"><ShieldCheck :size="9" /> approval</ShiftStatusPill>
              <span class="rchip-actions">
                <button title="Edit" @click="openEdit(r)"><Pencil :size="12" /></button>
                <button class="danger" title="Delete" @click="del(r)"><Trash2 :size="12" /></button>
              </span>
            </footer>
          </article>
        </div>

        <button v-else class="lane-empty" @click="openCreate(lane.key)">
          <span class="le-x">1×</span>
          <span class="le-txt">No rule — pays base rate.<br><b>Add a {{ lane.label.toLowerCase() }} rule</b></span>
          <Plus :size="14" />
        </button>
      </Motion>
    </div>

    <!-- ════════════════════ OT PIPELINE (cross-module connection) ════════════════════ -->
    <Motion as="div" class="pipe" :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, delay: 0.12, ease: EASE }">
      <div class="pipe-head">
        <span class="ph-eyebrow"><GitBranch :size="13" /> How overtime flows</span>
        <p>Rules here only set the <b>rate</b>. Hours are detected &amp; approved in Attendance, then paid in Payroll. Everything below is one connected pipeline.</p>
      </div>
      <div class="pipe-flow">
        <template v-for="(node, ni) in pipeline" :key="node.key">
          <component :is="node.to ? 'button' : 'div'" class="pnode" :class="{ here: node.here, link: node.to }"
            :data-tone="node.tone" @click="node.to && go(node.to)">
            <span class="pn-ic"><component :is="node.icon" :size="15" /></span>
            <span class="pn-txt"><b>{{ node.title }}</b><small>{{ node.sub }}</small></span>
            <ArrowUpRight v-if="node.to" :size="12" class="pn-arr" />
            <span v-if="node.here" class="pn-here">you are here</span>
          </component>
          <span v-if="ni < pipeline.length - 1" class="pconn" aria-hidden="true"><i class="spark" /></span>
        </template>
      </div>
    </Motion>

    <ShiftOvertimeRuleModal :open="showModal" :rule="editTarget" :preset-type="presetType" @close="showModal = false" @saved="reload" />
    <ShiftOvertimeRuleDeleteModal :open="!!deleteTarget" :rule="deleteTarget" :rules="rules" :busy="deleting"
      @close="deleteTarget = null" @confirm="confirmDelete" />
  </section>
</template>

<script>
let _otrUid = 0
</script>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  Timer, Plus, RefreshCw, Calculator, ShieldCheck, Pencil, Trash2,
  Zap, Slash, AlertTriangle, Power, Infinity, GitBranch, ArrowUpRight,
  ClipboardCheck, UserCheck, SlidersHorizontal, Wallet,
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import ShiftOvertimeRuleModal from '../modals/ShiftOvertimeRuleModal.vue'
import ShiftOvertimeRuleDeleteModal from '../modals/ShiftOvertimeRuleDeleteModal.vue'
import ShiftStatusPill from '../components/ShiftStatusPill.vue'
import ShiftCountUp from '../components/ShiftCountUp.vue'
import { OT_TYPES, otTypeMeta, fetchOvertimeRules, deleteOvertimeRule } from '@/composables/useShifts'

const EASE = [0.16, 1, 0.3, 1]
const uid = `otr-${_otrUid++}`
const toast = useToast()
const router = useRouter()

const rules = ref([])
const loading = ref(false)
const showModal = ref(false)
const editTarget = ref(null)
const presetType = ref(null)
const deleteTarget = ref(null)
const deleting = ref(false)
const calc = reactive({ ot_type: 'WEEKDAY', hours: 3 })

/* ── data ────────────────────────────────────────────────────────────────── */
const reload = async () => {
  loading.value = true
  try { const d = await fetchOvertimeRules({ limit: 100 }); rules.value = d.items || [] }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load rules') }
  finally { loading.value = false }
}
onMounted(reload)

/* ── client-side resolver (mirrors GET /overtime-rules/resolve) ───────────── */
const activeRulesFor = (type) => rules.value
  .filter(r => r.is_active !== false && r.ot_type === type)
  .slice()
  .sort((a, b) => (Number(b.priority) || 0) - (Number(a.priority) || 0)
    || (new Date(b.created_at || 0) - new Date(a.created_at || 0)))

const allRulesFor = (type) => rules.value
  .filter(r => r.ot_type === type)
  .slice()
  .sort((a, b) => {
    // active first, then by priority, then newest
    if ((a.is_active === false) !== (b.is_active === false)) return a.is_active === false ? 1 : -1
    return (Number(b.priority) || 0) - (Number(a.priority) || 0) || (new Date(b.created_at || 0) - new Date(a.created_at || 0))
  })

const resolveLocal = (type, hours) => {
  const h = Math.max(0, Number(hours) || 0)
  const rule = activeRulesFor(type)[0]
  if (!rule) return { matched: false, rule: null, multiplier: 1, requested: h, payable: h, capped: false, cap: null, approval: false }
  const cap = (rule.max_ot_hours != null && rule.max_ot_hours !== '') ? Number(rule.max_ot_hours) : null
  const payable = cap != null ? Math.min(h, cap) : h
  return {
    matched: true, rule, multiplier: Number(rule.multiplier) || 1,
    requested: h, payable, capped: cap != null && h > cap, cap, approval: !!rule.approval_required,
  }
}
const resolved = computed(() => resolveLocal(calc.ot_type, calc.hours))

/* ── header stats ────────────────────────────────────────────────────────── */
const activeCount = computed(() => rules.value.filter(r => r.is_active !== false).length)
const topMultiplier = computed(() => rules.value.reduce((m, r) => Math.max(m, Number(r.multiplier) || 0), 0))
const typesCovered = computed(() => OT_TYPES.filter(t => activeRulesFor(t.key).length).length)
const selectedColor = computed(() => otTypeMeta(calc.ot_type).color)

/* ── chart geometry ──────────────────────────────────────────────────────── */
const VB = { w: 360, h: 210, x0: 32, x1: 346, y0: 182, y1: 16 }
const axisMax = computed(() => {
  const caps = rules.value.map(r => (r.max_ot_hours != null ? Number(r.max_ot_hours) : 0))
  const maxCap = Math.max(0, 0, ...caps)
  return Math.max(12, Math.ceil((maxCap * 1.5) / 2) * 2)
})
const payAt = (type, x) => { const r = resolveLocal(type, x); return r.payable * r.multiplier }
const yMax = computed(() => {
  const vals = OT_TYPES.map(t => payAt(t.key, axisMax.value))
  return Math.max(1, ...vals) * 1.08
})
const mapX = (x) => VB.x0 + (Math.min(x, axisMax.value) / axisMax.value) * (VB.x1 - VB.x0)
const mapY = (y) => VB.y0 - (Math.min(y, yMax.value) / yMax.value) * (VB.y0 - VB.y1)

// points for a type's payout line across the full domain
const ptsFor = (type) => {
  const r0 = resolveLocal(type, axisMax.value)
  const mult = r0.multiplier
  const cap = r0.cap
  const pts = [[0, 0]]
  if (r0.matched && cap != null && cap < axisMax.value) {
    pts.push([cap, cap * mult]); pts.push([axisMax.value, cap * mult])
  } else {
    pts.push([axisMax.value, axisMax.value * mult])
  }
  return pts
}
const toPathD = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'} ${mapX(p[0]).toFixed(1)} ${mapY(p[1]).toFixed(1)}`).join(' ')

const lineD = computed(() => toPathD(ptsFor(calc.ot_type)))
const areaD = computed(() => `${lineD.value} L ${mapX(axisMax.value).toFixed(1)} ${mapY(0).toFixed(1)} L ${mapX(0).toFixed(1)} ${mapY(0).toFixed(1)} Z`)
const baselineD = computed(() => toPathD([[0, 0], [axisMax.value, axisMax.value]]))
const ghostCurves = computed(() => OT_TYPES.filter(t => t.key !== calc.ot_type && activeRulesFor(t.key).length)
  .map(t => ({ key: t.key, color: t.color, d: toPathD(ptsFor(t.key)) })))

const ph = computed(() => {
  const r = resolved.value
  const x = Math.min(Number(calc.hours) || 0, axisMax.value)
  return { x: mapX(x), y: mapY(r.payable * r.multiplier) }
})
const xTicks = computed(() => {
  const m = axisMax.value
  return [0, m / 4, m / 2, (3 * m) / 4, m].map(v => ({ v, label: `${Math.round(v)}` }))
})

/* ── rail (slider) helpers ───────────────────────────────────────────────── */
const railPct = computed(() => Math.min(100, (Number(calc.hours) || 0) / axisMax.value * 100))
const capPct = computed(() => resolved.value.cap != null ? Math.min(100, resolved.value.cap / axisMax.value * 100) : 0)
const rulerTicks = computed(() => {
  const m = axisMax.value
  return [0, Math.round(m / 2), m]
})

/* ── lanes ───────────────────────────────────────────────────────────────── */
const lanes = computed(() => OT_TYPES.map(t => ({
  key: t.key, label: t.label, color: t.color,
  rules: allRulesFor(t.key),
  winnerId: activeRulesFor(t.key)[0]?.id || null,
})))

/* ── pipeline (cross-module workflow) ────────────────────────────────────── */
const pipeline = [
  { key: 'detect', title: 'Detect', sub: 'Attendance rollup flags OT', icon: ClipboardCheck, tone: 'gold', to: '/admin/hr/attendance/overtime' },
  { key: 'approve', title: 'Approve', sub: 'Manager OK in Attendance', icon: UserCheck, tone: 'gold', to: '/admin/hr/attendance/overtime' },
  { key: 'rate', title: 'Set rate', sub: 'Overtime Rules (here)', icon: SlidersHorizontal, tone: 'amber', here: true },
  { key: 'pay', title: 'Pay out', sub: 'Payroll applies the rate', icon: Wallet, tone: 'ok', to: '/admin/hr/payroll/dashboard' },
]
const go = (path) => router.push(path)

/* ── format helpers ──────────────────────────────────────────────────────── */
const fmtMult = (m) => (Number(m) || 0).toFixed(2).replace(/\.?0+$/, s => s.includes('.') ? '' : s)
const fmtNum = (n) => { const v = Number(n) || 0; return Number.isInteger(v) ? String(v) : v.toFixed(1) }

/* ── CRUD ────────────────────────────────────────────────────────────────── */
const openCreate = (type) => { editTarget.value = null; presetType.value = typeof type === 'string' ? type : null; showModal.value = true }
const openEdit = (r) => { editTarget.value = r; presetType.value = null; showModal.value = true }
const del = (r) => { deleteTarget.value = r }
const confirmDelete = async (reason) => {
  const r = deleteTarget.value
  if (!r) return
  deleting.value = true
  try {
    await deleteOvertimeRule(r.id, reason)
    toast.success(`Rule "${r.name}" deleted`)
    deleteTarget.value = null
    await reload()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not delete') }
  finally { deleting.value = false }
}

// keep the slider in range when caps change the axis
watch(axisMax, (m) => { if (calc.hours > m) calc.hours = m })
</script>

<style scoped>
.otr { display: flex; flex-direction: column; gap: 18px; }

/* ════════════════════ ENGINE HEADER ════════════════════ */
.engine {
  position: relative; overflow: hidden; display: grid;
  grid-template-columns: auto 1fr auto; align-items: center; gap: 22px;
  padding: 20px 24px; border-radius: 24px;
  background: var(--shift-surface); border: 1px solid var(--shift-border);
  backdrop-filter: var(--shift-glass-blur); -webkit-backdrop-filter: var(--shift-glass-blur);
}
.eng-scan { position: absolute; left: 0; right: 0; top: 0; height: 36%; pointer-events: none; z-index: 0;
  background: linear-gradient(180deg, rgba(253,230,138,0.09), transparent); animation: shift-scanline 7s ease-in-out infinite; }
.eng-grid { position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0.5;
  background-image: linear-gradient(var(--shift-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--shift-grid-line) 1px, transparent 1px);
  background-size: 38px 38px; mask-image: radial-gradient(120% 90% at 30% 0%, #000 30%, transparent 75%);
  -webkit-mask-image: radial-gradient(120% 90% at 30% 0%, #000 30%, transparent 75%); animation: shift-grid-pan 24s linear infinite; }
.engine > *:not(.eng-scan):not(.eng-grid) { position: relative; z-index: 1; }

/* live multiplier core */
.eng-core { position: relative; width: 66px; height: 66px; display: grid; place-items: center; flex-shrink: 0; }
.core-ring { position: absolute; border-radius: 50%; border: 1.4px dashed; }
.core-ring.r1 { inset: 0; border-color: rgba(251,191,36,0.55); animation: shift-spin 9s linear infinite; }
.core-ring.r2 { inset: 9px; border-color: rgba(251,146,60,0.45); border-style: solid; animation: shift-spin 6s linear infinite reverse; }
.core-ring.r3 { inset: 18px; border-color: rgba(234,88,12,0.4); border-style: dotted; animation: shift-spin 4s linear infinite; }
.core-orbit { position: absolute; inset: -2px; animation: shift-spin 3.4s linear infinite; }
.orbit-spark { position: absolute; top: -1px; left: 50%; width: 6px; height: 6px; margin-left: -3px; border-radius: 50%;
  background: var(--shift-amber-bright); box-shadow: 0 0 8px 2px var(--shift-amber); }
.core-glyph { font-family: var(--shift-mono); font-size: 22px; font-weight: 900; color: var(--shift-amber-bright);
  text-shadow: 0 0 14px rgba(251,191,36,0.7); animation: core-throb 3s ease-in-out infinite; }
@keyframes core-throb { 0%,100% { transform: scale(1); opacity: 0.92; } 50% { transform: scale(1.12); opacity: 1; } }

.eng-id { min-width: 0; }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--shift-amber-strong); }
.eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--shift-ok); animation: shift-ring-pulse 2.4s ease-out infinite; }
.eng-title { position: relative; display: inline-block; margin: 7px 0 6px; font-size: 25px; font-weight: 800; letter-spacing: -0.025em; color: var(--shift-text); }
.title-sweep { position: absolute; left: 0; bottom: -3px; height: 2px; width: 100%; border-radius: 2px;
  background: linear-gradient(90deg, transparent, var(--shift-amber), var(--shift-ember), transparent); background-size: 220% 100%; animation: title-shimmer 4.5s ease-in-out infinite; }
@keyframes title-shimmer { 0%,100% { background-position: 200% 0; opacity: 0.55; } 50% { background-position: -40% 0; opacity: 1; } }
.eng-id p { margin: 0; font-size: 12.5px; line-height: 1.6; color: var(--shift-text-muted); max-width: 620px; }
.eng-id p b { color: var(--shift-text-2); font-weight: 700; }

.eng-side { display: flex; flex-direction: column; align-items: flex-end; gap: 12px; flex-shrink: 0; }
.eng-readbar { display: inline-flex; align-items: center; gap: 12px; padding: 8px 14px; border-radius: 14px;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.erb { display: flex; flex-direction: column; align-items: center; line-height: 1.05; }
.erb b { font-family: var(--shift-mono); font-size: 16px; font-weight: 800; color: var(--shift-text); }
.erb small { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--shift-text-muted); margin-top: 2px; }
.erb-div { width: 1px; height: 22px; background: var(--shift-border-soft); }
.eng-actions { display: flex; gap: 8px; }
.btn-primary { display: inline-flex; align-items: center; gap: 7px; padding: 10px 17px; border-radius: 12px; border: none; cursor: pointer;
  background: var(--shift-grad-cta); color: #1f1408; font-weight: 700; font-size: 13px; box-shadow: 0 10px 26px -10px rgba(245,158,11,0.7); transition: box-shadow 0.25s, transform 0.2s; }
.btn-primary:hover { box-shadow: 0 14px 34px -10px rgba(245,158,11,0.9); }
.btn-ghost { display: inline-flex; align-items: center; gap: 6px; padding: 10px 12px; border-radius: 12px; cursor: pointer;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); font-weight: 600; font-size: 13px; transition: 0.2s; }
.btn-ghost:hover { color: var(--shift-text); border-color: var(--shift-border); }
.btn-ghost.spin :deep(svg) { animation: shift-spin 0.85s linear infinite; }

/* ════════════════════ RESOLVER STAGE ════════════════════ */
.stage { position: relative; overflow: hidden; display: grid; grid-template-columns: 340px 1fr; gap: 18px;
  padding: 20px; border-radius: 22px; background: var(--shift-surface); border: 1px solid var(--shift-border-soft); }
.stage-aurora { position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background: radial-gradient(90% 130% at 100% 0%, rgba(251,146,60,0.08), transparent 58%), var(--shift-grad-hero); background-size: 180% 180%; animation: hr-aurora 18s ease-in-out infinite; }
.stage > *:not(.stage-aurora) { position: relative; z-index: 1; }

/* console */
.console { display: flex; flex-direction: column; gap: 14px; }
.cns-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--shift-amber); }
.cns-hint { margin: -6px 0 0; font-size: 11px; line-height: 1.5; color: var(--shift-text-muted); }
.type-pills { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.tp { display: inline-flex; align-items: center; gap: 7px; padding: 8px 11px; border-radius: 11px; cursor: pointer;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-muted); font-size: 12px; font-weight: 600; transition: 0.2s; text-align: left; }
.tp-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c); flex-shrink: 0; box-shadow: 0 0 0 0 var(--c); transition: 0.2s; }
.tp-lbl { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tp:hover { color: var(--shift-text-2); border-color: var(--shift-border); }
.tp.on { color: var(--shift-text); border-color: color-mix(in srgb, var(--c) 55%, transparent); background: color-mix(in srgb, var(--c) 12%, var(--shift-surface-2)); }
.tp.on .tp-dot { box-shadow: 0 0 9px 1px var(--c); }

/* hours rail */
.rail-block { display: flex; flex-direction: column; gap: 7px; }
.rail-top { display: flex; align-items: baseline; justify-content: space-between; }
.rail-label { font-size: 11px; color: var(--shift-text-muted); }
.rail-val { font-family: var(--shift-mono); font-size: 17px; font-weight: 800; color: var(--shift-text); }
.rail { position: relative; height: 30px; display: flex; align-items: center; }
.rail::before { content: ''; position: absolute; left: 0; right: 0; height: 6px; border-radius: 999px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.rail-fill { position: absolute; left: 0; height: 6px; width: var(--pct); border-radius: 999px; background: var(--shift-grad-cta); box-shadow: 0 0 10px -1px rgba(245,158,11,0.6); transition: width 0.18s var(--shift-ease); }
.rail-thumb { position: absolute; left: var(--pct); top: 50%; transform: translate(-50%, -50%); width: 16px; height: 16px; border-radius: 50%;
  background: var(--shift-amber-bright); box-shadow: 0 0 0 3px color-mix(in srgb, var(--shift-amber) 30%, transparent), 0 4px 10px -2px rgba(0,0,0,0.5); transition: left 0.18s var(--shift-ease); pointer-events: none; }
.rail-thumb i { position: absolute; inset: 0; border-radius: 50%; animation: shift-ring-pulse 2s ease-out infinite; }
.rail-input { position: absolute; left: 0; right: 0; width: 100%; height: 30px; margin: 0; opacity: 0; cursor: pointer; }
.rail-cap { position: absolute; top: -3px; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; pointer-events: none; }
.rail-cap i { width: 2px; height: 14px; background: var(--shift-alert); border-radius: 2px; box-shadow: 0 0 6px var(--shift-alert); }
.rail-cap small { font-family: var(--shift-mono); font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--shift-alert); margin-top: 1px; }
.rail-ruler { display: flex; justify-content: space-between; }
.rail-ruler span { font-family: var(--shift-mono); font-size: 9px; color: var(--shift-text-dim); }

/* readout */
.readout { position: relative; overflow: hidden; margin-top: auto; display: flex; flex-direction: column; gap: 11px; padding: 14px 16px; border-radius: 16px;
  background: var(--shift-surface-2); border: 1px dashed var(--shift-border-soft); transition: border-color 0.3s; }
.readout.matched { border-style: solid; border-color: color-mix(in srgb, var(--shift-amber) 38%, transparent); }
.readout.capped { border-color: color-mix(in srgb, var(--shift-alert) 42%, transparent); }
.rd-print { position: absolute; left: 0; right: 0; top: 0; height: 2px; background: linear-gradient(90deg, transparent, var(--shift-amber), transparent); animation: rd-print 3.6s ease-in-out infinite; }
@keyframes rd-print { 0% { transform: translateY(0); opacity: 0; } 12% { opacity: 0.8; } 92% { opacity: 0.8; } 100% { transform: translateY(160px); opacity: 0; } }
.rd-mult { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.rd-mult-num { display: flex; align-items: baseline; font-family: var(--shift-mono); font-size: 34px; font-weight: 900; color: var(--shift-amber); line-height: 1; letter-spacing: -0.02em; }
.readout.capped .rd-mult-num { color: var(--shift-ember-strong); }
.rd-x { font-size: 18px; margin-left: 2px; opacity: 0.8; }
.rd-mult-cap { text-align: right; min-width: 0; }
.rd-rule { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--shift-text-2); max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rd-rule svg { color: var(--shift-amber); flex-shrink: 0; }
.rd-rows { display: flex; flex-direction: column; gap: 5px; }
.rd-row { display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: var(--shift-text-muted); }
.rd-row b { font-family: var(--shift-mono); color: var(--shift-text); font-weight: 700; }
.rd-row b.hot { color: var(--shift-alert); }
.rd-row.total { padding-top: 6px; border-top: 1px solid var(--shift-border-soft); }
.rd-row.total span { color: var(--shift-text-2); font-weight: 600; }
.rd-row.total b { color: var(--shift-amber); font-size: 14px; }
.rd-tags { display: flex; flex-wrap: wrap; gap: 6px; min-height: 4px; }

/* curve */
.curve-wrap { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.curve-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.ch-title { font-family: var(--shift-mono); font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--shift-text-2); }
.ch-legend { display: inline-flex; align-items: center; gap: 6px; }
.lg { width: 14px; height: 4px; border-radius: 2px; background: color-mix(in srgb, var(--c) 30%, transparent); position: relative; transition: 0.2s; }
.lg.on { background: var(--c); box-shadow: 0 0 7px -1px var(--c); }
.lg em { display: none; }
.lg-note { font-family: var(--shift-mono); font-size: 9.5px; color: var(--shift-text-dim); margin-left: 4px; }
.lg-note b { color: var(--shift-text-muted); }
.curve { width: 100%; height: auto; aspect-ratio: 360 / 210; display: block; }
.grid line { stroke: var(--shift-grid-line); stroke-width: 0.6; }
.axis { stroke: var(--shift-border-soft); stroke-width: 0.8; }
.baseline { fill: none; stroke: var(--shift-text-dim); stroke-width: 1; stroke-dasharray: 3 4; opacity: 0.55; }
.ghost { fill: none; stroke-width: 1.2; opacity: 0.16; stroke-linejoin: round; }
.area { opacity: 0; animation: area-in 0.9s var(--shift-ease) 0.25s forwards; }
@keyframes area-in { to { opacity: 1; } }
.mainline { fill: none; stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: 620; stroke-dashoffset: 620; animation: shift-draw 1.2s var(--shift-ease) forwards; }
.flux { fill: none; stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; opacity: 0.9;
  stroke-dasharray: 6 220; filter: drop-shadow(0 0 3px currentColor); animation: flux-run 2.6s linear infinite; }
@keyframes flux-run { from { stroke-dashoffset: 226; } to { stroke-dashoffset: 0; } }
.cap-v, .cap-h { stroke: var(--shift-alert); stroke-width: 1; stroke-dasharray: 2 3; opacity: 0.7; }
.cap-lbl { font-family: var(--shift-mono); font-size: 7px; fill: var(--shift-alert); letter-spacing: 0.04em; }
.ph-line { stroke: var(--shift-amber-bright); stroke-width: 1; stroke-dasharray: 2 3; opacity: 0.5; transition: x1 0.18s var(--shift-ease), x2 0.18s var(--shift-ease); }
.ph-halo { fill: none; stroke: var(--shift-amber); stroke-width: 1.2; opacity: 0.5; animation: ph-pulse 1.8s ease-out infinite; transition: cx 0.18s var(--shift-ease), cy 0.18s var(--shift-ease); }
.ph-halo.hot { stroke: var(--shift-alert); }
@keyframes ph-pulse { 0% { r: 5; opacity: 0.7; } 100% { r: 11; opacity: 0; } }
.ph-dot { fill: var(--shift-amber-bright); filter: drop-shadow(0 0 5px var(--shift-amber)); transition: cx 0.18s var(--shift-ease), cy 0.18s var(--shift-ease); }
.ph-dot.hot { fill: var(--shift-alert); filter: drop-shadow(0 0 5px var(--shift-alert)); }
.ticks text { font-family: var(--shift-mono); font-size: 7px; fill: var(--shift-text-dim); }
.curve-axislabels { display: flex; justify-content: space-between; }
.curve-axislabels span { font-family: var(--shift-mono); font-size: 8.5px; letter-spacing: 0.08em; color: var(--shift-text-dim); }

/* ════════════════════ LANES ════════════════════ */
.lanes-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; padding: 0 2px; }
.lh-title { font-size: 15px; font-weight: 800; color: var(--shift-text); letter-spacing: -0.01em; }
.lh-sub { font-size: 12px; color: var(--shift-text-muted); }
.lh-sub b { color: var(--shift-amber); }
.lanes { display: grid; grid-template-columns: repeat(4, 1fr); gap: 13px; }
.lane { display: flex; flex-direction: column; gap: 11px; padding: 14px; border-radius: 18px;
  background: var(--shift-surface); border: 1px solid var(--shift-border-soft); }
.lane-head { display: flex; align-items: center; justify-content: space-between; }
.lane-name { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 700; color: var(--shift-text); }
.lane-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--c); box-shadow: 0 0 8px -1px var(--c); }
.lane-count { font-family: var(--shift-mono); font-size: 11px; font-weight: 700; color: var(--shift-text-muted); padding: 2px 8px; border-radius: 999px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.lane-stack { display: flex; flex-direction: column; gap: 9px; }

.rchip { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 7px; padding: 12px; border-radius: 14px;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); transition: border-color 0.25s, transform 0.2s; }
.rchip-ring { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--c); opacity: 0.35; transition: opacity 0.25s; }
.rchip.active { border-color: color-mix(in srgb, var(--c) 50%, transparent); background: color-mix(in srgb, var(--c) 9%, var(--shift-surface-2)); }
.rchip.active .rchip-ring { opacity: 1; box-shadow: 0 0 12px 0 var(--c); animation: ring-flow 2.4s ease-in-out infinite; }
@keyframes ring-flow { 0%,100% { opacity: 0.7; } 50% { opacity: 1; } }
.rchip.off { opacity: 0.5; }
.rchip:hover { border-color: var(--shift-border); }
.rchip-top { display: flex; align-items: center; justify-content: space-between; }
.rchip-badge { display: inline-flex; align-items: center; gap: 4px; font-family: var(--shift-mono); font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em;
  padding: 2px 7px; border-radius: 999px; color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); border: 1px solid color-mix(in srgb, var(--c) 36%, transparent); }
.rchip-badge.standby { color: var(--shift-text-dim); background: rgba(148,163,184,0.10); border-color: var(--shift-border-soft); }
.rchip-prio { font-family: var(--shift-mono); font-size: 9px; color: var(--shift-text-dim); }
.rchip-mult { display: flex; align-items: baseline; gap: 2px; font-family: var(--shift-mono); }
.rchip-mult b { font-size: 26px; font-weight: 900; color: var(--shift-text); letter-spacing: -0.02em; }
.rchip.active .rchip-mult b { color: var(--c); }
.rchip-mult span { font-size: 14px; color: var(--shift-text-muted); }
.rchip-name { margin: 0; font-size: 12.5px; font-weight: 700; color: var(--shift-text); line-height: 1.3; }
.rchip-meta { display: flex; flex-wrap: wrap; gap: 9px; }
.rchip-meta span { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; color: var(--shift-text-muted); }
.rchip-meta svg { color: var(--c); opacity: 0.85; }
.rchip-desc { margin: 0; font-size: 10.5px; color: var(--shift-text-muted); line-height: 1.45; }
.rchip-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 2px; }
.rchip-actions { display: flex; gap: 5px; opacity: 0.45; transition: opacity 0.2s; }
.rchip:hover .rchip-actions { opacity: 1; }
.rchip-actions button { width: 26px; height: 26px; border-radius: 8px; border: 1px solid var(--shift-border-soft); background: var(--shift-surface); color: var(--shift-text-muted); cursor: pointer; display: grid; place-items: center; transition: 0.18s; }
.rchip-actions button:hover { color: var(--shift-amber); border-color: var(--shift-border); transform: translateY(-1px); }
.rchip-actions button.danger:hover { color: var(--shift-alert); border-color: var(--shift-alert-soft); }

.lane-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px 12px; border-radius: 14px; cursor: pointer;
  background: rgba(148,163,184,0.05); border: 1px dashed var(--shift-border-soft); color: var(--shift-text-muted); transition: 0.22s; text-align: center; }
.lane-empty:hover { border-color: color-mix(in srgb, var(--c) 45%, transparent); color: var(--shift-text-2); background: color-mix(in srgb, var(--c) 7%, transparent); }
.le-x { font-family: var(--shift-mono); font-size: 22px; font-weight: 900; color: var(--shift-text-dim); }
.le-txt { font-size: 10.5px; line-height: 1.45; }
.le-txt b { color: var(--c); }

/* ════════════════════ PIPELINE ════════════════════ */
.pipe { position: relative; overflow: hidden; padding: 18px 20px; border-radius: 22px;
  background: var(--shift-surface); border: 1px solid var(--shift-border-soft); }
.pipe-head { margin-bottom: 14px; }
.ph-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--shift-amber); }
.pipe-head p { margin: 6px 0 0; font-size: 12px; line-height: 1.55; color: var(--shift-text-muted); max-width: 720px; }
.pipe-head p b { color: var(--shift-text-2); font-weight: 700; }
.pipe-flow { display: flex; align-items: stretch; gap: 0; flex-wrap: wrap; }
.pnode { position: relative; display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 14px; flex: 1 1 0; min-width: 160px;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); text-align: left; transition: 0.22s; }
.pnode.link { cursor: pointer; }
.pnode.link:hover { border-color: var(--shift-border); transform: translateY(-2px); }
.pnode.here { border-color: color-mix(in srgb, var(--shift-amber) 55%, transparent); background: color-mix(in srgb, var(--shift-amber) 11%, var(--shift-surface-2)); box-shadow: 0 0 0 1px color-mix(in srgb, var(--shift-amber) 25%, transparent); }
.pn-ic { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0;
  background: rgba(251,191,36,0.12); color: var(--shift-amber); border: 1px solid color-mix(in srgb, var(--shift-amber) 26%, transparent); }
.pnode[data-tone="ok"] .pn-ic { background: var(--shift-ok-soft); color: var(--shift-ok); border-color: color-mix(in srgb, var(--shift-ok) 30%, transparent); }
.pn-txt { display: flex; flex-direction: column; min-width: 0; }
.pn-txt b { font-size: 13px; font-weight: 700; color: var(--shift-text); }
.pn-txt small { font-size: 10.5px; color: var(--shift-text-muted); }
.pn-arr { margin-left: auto; opacity: 0.4; transition: 0.2s; flex-shrink: 0; }
.pnode.link:hover .pn-arr { opacity: 1; transform: translate(2px, -2px); }
.pn-here { position: absolute; top: -8px; right: 10px; font-family: var(--shift-mono); font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em;
  padding: 2px 7px; border-radius: 999px; color: #1f1408; background: var(--shift-grad-cta); }
.pconn { position: relative; flex: 0 0 30px; align-self: center; height: 2px; background: var(--shift-border-soft); overflow: visible; }
.spark { position: absolute; top: 50%; left: 0; width: 6px; height: 6px; margin-top: -3px; border-radius: 50%; background: var(--shift-amber); box-shadow: 0 0 7px 1px var(--shift-amber); animation: spark-run 2.2s linear infinite; }
@keyframes spark-run { 0% { left: 0; opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } 100% { left: 30px; opacity: 0; } }

/* ════════════════════ RESPONSIVE ════════════════════ */
@media (max-width: 1100px) {
  .stage { grid-template-columns: 1fr; }
  .lanes { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 920px) {
  .engine { grid-template-columns: auto 1fr; }
  .eng-side { grid-column: 1 / -1; flex-direction: row; align-items: center; justify-content: space-between; }
}
@media (max-width: 700px) {
  .engine { grid-template-columns: 1fr; text-align: center; }
  .eng-core { justify-self: center; }
  .eyebrow, .eng-readbar { justify-content: center; }
  .eng-side { flex-direction: column; align-items: stretch; }
  .lanes { grid-template-columns: 1fr; }
  .pconn { display: none; }
  .pnode { flex-basis: 100%; }
}

/* ════════════════════ LIGHT THEME OVERRIDES ════════════════════ */
[data-theme="light"] .eng-scan { background: linear-gradient(180deg, rgba(217,119,6,0.08), transparent); }
[data-theme="light"] .core-glyph { text-shadow: 0 0 10px rgba(217,119,6,0.4); }
[data-theme="light"] .btn-primary { color: #2a1a05; }
[data-theme="light"] .rchip.active { background: color-mix(in srgb, var(--c) 12%, var(--shift-surface-2)); }
[data-theme="light"] .lane-empty { background: rgba(40,32,20,0.04); }
[data-theme="light"] .baseline { opacity: 0.7; }
[data-theme="light"] .ghost { opacity: 0.22; }
[data-theme="light"] .pn-here { color: #2a1a05; }

@media (prefers-reduced-motion: reduce) {
  .eng-scan, .eng-grid, .core-ring, .core-orbit, .core-glyph, .title-sweep, .stage-aurora,
  .rail-thumb i, .rd-print, .flux, .ph-halo, .rchip.active .rchip-ring, .spark { animation: none !important; }
  .mainline { stroke-dasharray: none; stroke-dashoffset: 0; }
  .area { opacity: 1; }
  .ph-halo { display: none; }
}
</style>
