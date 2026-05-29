<template>
  <div class="edoc-section dash">
    <div class="bento">
      <!-- ░ ESTATE — gold hero ░ -->
      <Motion as="div" class="cell estate" v-bind="reveal(0)">
        <div class="estate-mesh" aria-hidden="true" />
        <div class="estate-sheen" aria-hidden="true" />
        <div class="estate-top">
          <span class="estate-eyebrow"><Files :size="13" /> Document Estate</span>
          <span class="estate-live"><span class="live-dot" /> Live · {{ d.uploaded_this_month || 0 }} this month</span>
        </div>
        <div class="estate-main">
          <div>
            <div class="estate-num"><EdocCountUp :value="d.total_documents || 0" comma /></div>
            <div class="estate-unit">documents under management</div>
            <div class="estate-chips">
              <span class="echip ok"><i /> {{ vs.VERIFIED }} verified</span>
              <span class="echip warn"><i /> {{ vs.PENDING }} pending</span>
              <span class="echip danger"><i /> {{ vs.EXPIRED }} expired</span>
            </div>
          </div>
          <div class="ring">
            <svg viewBox="0 0 128 128">
              <circle class="ring-bg" cx="64" cy="64" r="54" />
              <circle class="ring-fg" cx="64" cy="64" r="54" :style="ringStyle" />
            </svg>
            <div class="ring-label"><b><EdocCountUp :value="verifiedPct" />%</b><span>verified</span></div>
          </div>
        </div>
      </Motion>

      <!-- ░ VERIFICATION — black card ░ -->
      <Motion as="div" class="cell verify" v-bind="reveal(1)">
        <div class="verify-glow" aria-hidden="true" />
        <div class="verify-top">
          <span class="v-eyebrow"><ScanLine :size="13" /> Verification</span>
          <button class="v-cta edoc-press" @click="$emit('go','verification')">Queue <ArrowUpRight :size="13" /></button>
        </div>
        <div class="verify-body">
          <div class="v-ring">
            <svg viewBox="0 0 116 116">
              <circle class="vr-bg" cx="58" cy="58" r="48" />
              <circle class="vr-fg" cx="58" cy="58" r="48" :style="vRingStyle" />
            </svg>
            <div class="v-ring-center"><b><EdocCountUp :value="d.pending_verification || 0" /></b><span>in queue</span></div>
          </div>
          <div class="v-bars">
            <div v-for="(s, i) in vSegs" :key="s.key" class="vbar">
              <span class="vbar-k">{{ s.label }}</span>
              <span class="vbar-track">
                <Motion as="span" class="vbar-fill" :style="{ background: s.color, boxShadow: `0 0 10px ${s.color}` }"
                  :initial="{ width: '0%' }" :animate="{ width: segPct(s.value) + '%' }"
                  :transition="{ duration: 0.85, delay: 0.3 + i * 0.08, ease: EASE }" />
              </span>
              <span class="vbar-v">{{ s.value }}</span>
            </div>
          </div>
        </div>
      </Motion>

      <!-- ░ TILES ░ -->
      <Motion v-for="(t, i) in tiles" :key="t.key" as="button" type="button"
        class="cell tile edoc-card is-hoverable edoc-press" :class="t.tone" v-bind="reveal(2 + i * 0.5)"
        :whileHover="{ y: -4 }" @click="t.go && $emit('go', t.go)">
        <span class="tile-orb" :style="{ '--c': t.color }"><component :is="t.icon" :size="16" /></span>
        <div class="tile-num" :style="{ color: t.alert && t.value ? t.color : '' }"><EdocCountUp :value="t.value" /></div>
        <span class="tile-label">{{ t.label }}</span>
        <span class="tile-spark" :style="{ '--c': t.color }">
          <Motion v-for="b in 7" :key="b" as="i" :initial="{ scaleY: 0 }" :animate="{ scaleY: 1 }"
            :transition="{ duration: 0.5, delay: 0.3 + b * 0.04, ease: EASE }" :style="{ height: bar(t.seed, b) + '%' }" />
        </span>
      </Motion>

      <!-- ░ CATEGORY — donut ░ -->
      <Motion as="div" class="cell panel edoc-card" v-bind="reveal(6)">
        <div class="panel-head"><span class="p-eyebrow"><Layers :size="13" /> Category mix</span></div>
        <div class="cat-wrap">
          <EdocDonut :points="catPoints" />
          <div class="cat-legend">
            <div v-for="(c, i) in catPoints" :key="c.key" class="cleg">
              <span class="cdot" :style="{ background: donutPalette[i % donutPalette.length] }" />
              <span class="cleg-k">{{ c.label }}</span>
              <span class="cleg-v edoc-mono">{{ c.value }}</span>
            </div>
            <div v-if="!catPoints.length" class="mini-empty">No documents yet</div>
          </div>
        </div>
      </Motion>

      <!-- ░ EXPIRY TIMELINE — bars ░ -->
      <Motion as="div" class="cell panel wide edoc-card" v-bind="reveal(7)">
        <div class="panel-head">
          <span class="p-eyebrow"><CalendarClock :size="13" /> Expiry timeline</span>
          <span class="p-meta">{{ d.expiring_soon || 0 }} within 90d</span>
        </div>
        <div class="tl">
          <div v-for="(p, i) in expiryPts" :key="p.label" class="tl-col">
            <span class="tl-val">{{ p.value }}</span>
            <span class="tl-track">
              <Motion as="span" class="tl-bar" :style="{ background: expiryColors[i] }"
                :initial="{ height: '0%' }" :animate="{ height: tlHeight(p.value) + '%' }"
                :transition="{ duration: 0.8, delay: 0.25 + i * 0.1, ease: EASE }" />
            </span>
            <span class="tl-label">{{ p.label }}</span>
          </div>
        </div>
      </Motion>

      <!-- ░ DEPT GAPS ░ -->
      <Motion as="div" class="cell panel edoc-card" v-bind="reveal(8)">
        <div class="panel-head"><span class="p-eyebrow"><FileX2 :size="13" /> Dept. gaps</span></div>
        <div v-if="deptRows.length" class="dept-list">
          <div v-for="(r, i) in deptRows" :key="r.label" class="dept-row">
            <span class="dept-k">{{ r.label }}</span>
            <span class="dept-track"><Motion as="span" class="dept-fill" :initial="{ width:'0%' }" :animate="{ width: r.pct + '%' }" :transition="{ duration:0.8, delay:0.2+i*0.07, ease: EASE }" /></span>
            <span class="dept-v edoc-mono">{{ r.value }}</span>
          </div>
        </div>
        <div v-else class="all-clear"><CheckCircle2 :size="24" /><span>All mandatory<br/>docs present</span></div>
      </Motion>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  Files, ScanLine, ArrowUpRight, Layers, CalendarClock, FileX2, CheckCircle2,
  CalendarClock as ExIcon, ShieldAlert, FileSignature, Archive,
} from 'lucide-vue-next'
import EdocCountUp from '../components/EdocCountUp.vue'
import EdocDonut from '../components/EdocDonut.vue'

const EASE = [0.16, 1, 0.3, 1]
const props = defineProps({ data: { type: Object, default: null }, loading: { type: Boolean, default: false } })
defineEmits(['go'])

const d = computed(() => props.data || {})
const reveal = (i) => ({
  initial: { opacity: 0, y: 20, filter: 'blur(7px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.55, delay: i * 0.07, ease: EASE },
})

const vs = computed(() => {
  const m = { VERIFIED: 0, PENDING: 0, REJECTED: 0, RESUBMIT_REQUIRED: 0, EXPIRED: 0 }
  for (const p of (d.value.verification_status || [])) m[p.key] = p.value
  return m
})
const total = computed(() => d.value.total_documents || 0)
const verifiedPct = computed(() => total.value ? Math.round((vs.value.VERIFIED / total.value) * 100) : 0)
const segPct = (v) => { const t = Object.values(vs.value).reduce((a, b) => a + b, 0) || 1; return Math.round((v / t) * 100) }

const CIRC = 2 * Math.PI * 54
const VCIRC = 2 * Math.PI * 48
const mounted = ref(false)
const ringStyle = computed(() => ({ strokeDasharray: CIRC, strokeDashoffset: mounted.value ? CIRC * (1 - verifiedPct.value / 100) : CIRC }))
const vRingStyle = computed(() => ({ strokeDasharray: VCIRC, strokeDashoffset: mounted.value ? VCIRC * (1 - verifiedPct.value / 100) : VCIRC }))
onMounted(() => requestAnimationFrame(() => { mounted.value = true }))

const vSegs = computed(() => [
  { key: 'VERIFIED', label: 'Verified', color: '#34d399', value: vs.value.VERIFIED },
  { key: 'PENDING', label: 'Pending', color: '#fbbf24', value: vs.value.PENDING },
  { key: 'RESUBMIT_REQUIRED', label: 'Resubmit', color: '#fb923c', value: vs.value.RESUBMIT_REQUIRED },
  { key: 'REJECTED', label: 'Rejected', color: '#f87171', value: vs.value.REJECTED },
  { key: 'EXPIRED', label: 'Expired', color: '#ef4444', value: vs.value.EXPIRED },
])

const tiles = computed(() => [
  { key: 'expiring', label: 'Expiring · 90d', value: d.value.expiring_soon || 0, icon: ExIcon, color: '#f59e0b', go: 'expiry', alert: true, seed: 3, tone: 'amber' },
  { key: 'compliance', label: 'Compliance pending', value: d.value.compliance_pending || 0, icon: ShieldAlert, color: '#fb923c', go: 'compliance', alert: true, seed: 7, tone: '' },
  { key: 'contracts', label: 'Contracts expiring', value: d.value.contract_expiry || 0, icon: FileSignature, color: '#fbbf24', go: 'contracts', alert: true, seed: 5, tone: '' },
  { key: 'archived', label: 'Archived', value: d.value.archived_documents || 0, icon: Archive, color: '#9ca3af', go: 'archive', seed: 9, tone: '' },
])

const donutPalette = ['#fbbf24', '#f59e0b', '#fb923c', '#ea580c', '#f97316', '#d97706', '#34d399', '#f87171', '#9ca3af']
const catPoints = computed(() => (d.value.category_distribution || []).filter(p => p.value > 0))

const expiryPts = computed(() => d.value.expiry_timeline || [])
const expiryColors = ['#ef4444', '#fb923c', '#f59e0b', '#fbbf24']
const expiryMax = computed(() => Math.max(...expiryPts.value.map(p => p.value), 1))
const tlHeight = (v) => Math.max(4, Math.round((v / expiryMax.value) * 100))

const deptRows = computed(() => {
  const rows = d.value.department_missing || []
  const max = Math.max(...rows.map(r => r.value), 1)
  return rows.slice(0, 6).map(r => ({ ...r, pct: Math.round((r.value / max) * 100) }))
})

const bar = (seed, i) => 28 + ((Math.sin(seed * 1.7 + i * 1.3) + 1) / 2) * 72
</script>

<style scoped>
.dash { gap: 0; }
.bento { display: grid; grid-template-columns: repeat(12, 1fr); grid-auto-rows: minmax(0, auto); gap: 16px; }
.cell { position: relative; border-radius: 22px; padding: 20px; display: flex; flex-direction: column; }
.estate { grid-column: span 7; }
.verify { grid-column: span 5; }
.tile { grid-column: span 3; }
/* Three panels share row 3 evenly: 4 + 4 + 4 = 12.
   Previously panel.wide was span 5 which forced Dept Gaps to wrap to a new row. */
.panel { grid-column: span 4; min-height: 240px; }
.panel.wide { grid-column: span 4; }

/* ESTATE — gold */
.estate {
  overflow: hidden; color: #2a1c08; min-height: 230px;
  background: linear-gradient(135deg, #fde68a 0%, #fbbf24 44%, #fb923c 100%);
  border: 1px solid rgba(251,191,36,0.5);
  box-shadow: 0 26px 54px -26px rgba(251,146,60,0.6);
}
.estate-mesh { position: absolute; inset: 0; pointer-events: none; opacity: 0.55;
  background: radial-gradient(60% 80% at 92% 6%, rgba(255,255,255,0.6), transparent 60%), radial-gradient(50% 70% at 6% 100%, rgba(234,88,12,0.4), transparent 60%); }
.estate-sheen { position: absolute; top: 0; bottom: 0; left: -40%; width: 40%; pointer-events: none;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,0.4), transparent); transform: skewX(-18deg);
  animation: estate-sheen 6s ease-in-out infinite; }
.estate-top, .estate-main { position: relative; z-index: 2; }
.estate-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.estate-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
.estate-live { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; color: #5a3d10; }
.live-dot { width: 6px; height: 6px; border-radius: 50%; background: #16a34a; box-shadow: 0 0 8px #16a34a; animation: edoc-glow-breathe 2.4s ease-in-out infinite; }
.estate-main { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 16px; flex: 1; }
.estate-num { font-size: 60px; font-weight: 800; line-height: 0.9; letter-spacing: -0.04em; }
.estate-unit { font-size: 12.5px; font-weight: 700; opacity: 0.7; margin-top: 6px; }
.estate-chips { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 14px; }
.echip { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; background: rgba(42,28,8,0.1); }
.echip i { width: 6px; height: 6px; border-radius: 50%; }
.echip.ok i { background: #047857; } .echip.warn i { background: #92400e; } .echip.danger i { background: #b91c1c; }
.ring { position: relative; width: 128px; height: 128px; flex-shrink: 0; }
.ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.ring-bg { fill: none; stroke: rgba(42,28,8,0.16); stroke-width: 9; }
.ring-fg { fill: none; stroke: #1a1410; stroke-width: 9; stroke-linecap: round; transition: stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1); }
.ring-label { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.ring-label b { font-size: 24px; font-weight: 800; }
.ring-label span { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.7; }

/* VERIFICATION — black */
.verify {
  overflow: hidden; color: #f5f5f7; min-height: 230px;
  background: linear-gradient(155deg, #1a1820, #0c0b10);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 26px 54px -28px rgba(0,0,0,0.75);
}
.verify-glow { position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(50% 70% at 100% 0%, rgba(52,211,153,0.2), transparent 60%), radial-gradient(40% 60% at 0% 100%, rgba(251,146,60,0.16), transparent 60%); }
.verify-top, .verify-body { position: relative; z-index: 2; }
.verify-top { display: flex; align-items: center; justify-content: space-between; }
.v-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #34d399; }
.v-cta { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 700; color: #1a1410; cursor: pointer;
  padding: 6px 12px; border-radius: 999px; background: linear-gradient(100deg, #fbbf24, #f59e0b); border: none; box-shadow: 0 6px 16px -6px rgba(251,146,60,0.6); }
.verify-body { display: flex; align-items: center; gap: 18px; margin-top: 14px; flex: 1; }
.v-ring { position: relative; width: 116px; height: 116px; flex-shrink: 0; }
.v-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.vr-bg { fill: none; stroke: rgba(255,255,255,0.07); stroke-width: 8; }
.vr-fg { fill: none; stroke: #34d399; stroke-width: 8; stroke-linecap: round; filter: drop-shadow(0 0 7px rgba(52,211,153,0.85)); transition: stroke-dashoffset 1.3s cubic-bezier(0.22,1,0.36,1); }
.v-ring-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.v-ring-center b { font-size: 30px; font-weight: 800; line-height: 1; }
.v-ring-center span { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #8b8b93; }
.v-bars { flex: 1; display: flex; flex-direction: column; gap: 7px; }
.vbar { display: grid; grid-template-columns: 58px 1fr 22px; align-items: center; gap: 8px; }
.vbar-k { font-size: 10.5px; color: #9ca3af; }
.vbar-track { height: 6px; border-radius: 999px; background: rgba(255,255,255,0.06); overflow: hidden; }
.vbar-fill { display: block; height: 100%; border-radius: 999px; }
.vbar-v { font-size: 11px; font-weight: 700; text-align: right; color: #d4d4d8; }

/* TILES */
.tile { cursor: pointer; align-items: flex-start; gap: 8px; text-align: left; overflow: hidden; min-height: 150px; }
.tile.amber { background: linear-gradient(155deg, rgba(251,191,36,0.18), rgba(251,146,60,0.08)); border-color: var(--hr-accent-gold-border); }
.tile-orb { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 12px; color: var(--c); background: color-mix(in srgb, var(--c) 15%, transparent); box-shadow: 0 0 18px -5px var(--c); }
.tile-num { font-size: 34px; font-weight: 800; color: var(--hr-text); line-height: 1; letter-spacing: -0.02em; }
.tile-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; color: var(--hr-text-muted); }
.tile-spark { margin-top: auto; display: flex; align-items: flex-end; gap: 3px; height: 26px; width: 100%; }
.tile-spark i { flex: 1; background: linear-gradient(180deg, var(--c), transparent); border-radius: 2px; opacity: 0.5; transform-origin: bottom; }

/* PANELS */
.panel { gap: 12px; }
.panel-head { display: flex; align-items: center; justify-content: space-between; }
.p-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--hr-accent-gold); }
.p-meta { font-size: 10.5px; font-weight: 600; color: var(--hr-text-muted); }
.cat-wrap { flex: 1; display: grid; grid-template-columns: 132px 1fr; gap: 12px; align-items: center; }
.cat-legend { display: flex; flex-direction: column; gap: 5px; }
.cleg { display: flex; align-items: center; gap: 7px; font-size: 11.5px; }
.cdot { width: 8px; height: 8px; border-radius: 3px; flex-shrink: 0; }
.cleg-k { color: var(--hr-text-secondary); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cleg-v { color: var(--hr-text); font-weight: 700; }
.mini-empty { font-size: 12px; color: var(--hr-text-muted); }

.tl { flex: 1; display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; padding-top: 8px; }
.tl-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end; }
.tl-val { font-size: 14px; font-weight: 800; color: var(--hr-text); }
.tl-track { width: 100%; max-width: 46px; height: 110px; display: flex; align-items: flex-end; border-radius: 10px; background: rgba(255,255,255,0.04); overflow: hidden; }
.tl-bar { width: 100%; border-radius: 10px 10px 4px 4px; box-shadow: 0 0 16px -3px currentColor; }
.tl-label { font-size: 9.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; color: var(--hr-text-muted); text-align: center; }

.dept-list { display: flex; flex-direction: column; gap: 9px; }
.dept-row { display: grid; grid-template-columns: 74px 1fr 26px; align-items: center; gap: 9px; }
.dept-k { font-size: 11px; color: var(--hr-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dept-track { height: 8px; border-radius: 999px; background: rgba(255,255,255,0.05); overflow: hidden; }
.dept-fill { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #ef4444, #fb923c); box-shadow: 0 0 12px rgba(239,68,68,0.4); }
.dept-v { font-size: 11px; font-weight: 700; text-align: right; color: var(--hr-text); }
.all-clear { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--edoc-verified); font-size: 12px; text-align: center; }

@keyframes estate-sheen { 0%, 70% { transform: translateX(0) skewX(-18deg); } 100% { transform: translateX(420%) skewX(-18deg); } }

@media (max-width: 1100px) {
  .estate, .verify, .tile, .panel, .panel.wide { grid-column: span 12; }
}

[data-theme="light"] .tile-num { color: #1a1410; }
/* Verify cell — make it a luminous deep-cream card instead of staying near-black on light theme. */
[data-theme="light"] .verify {
  color: #1a1410;
  background:
    radial-gradient(60% 80% at 100% 0%, rgba(5,150,105,0.18), transparent 60%),
    radial-gradient(50% 70% at 0% 100%, rgba(234,88,12,0.16), transparent 60%),
    linear-gradient(155deg, rgba(255,250,240,0.95), rgba(255,240,210,0.92));
  border-color: rgba(180,83,9,0.22);
  box-shadow: 0 26px 54px -28px rgba(120,53,15,0.32), inset 0 1px 0 rgba(255,255,255,0.7);
}
[data-theme="light"] .verify-glow {
  background:
    radial-gradient(50% 70% at 100% 0%, rgba(5,150,105,0.24), transparent 60%),
    radial-gradient(40% 60% at 0% 100%, rgba(234,88,12,0.20), transparent 60%);
}
[data-theme="light"] .v-eyebrow { color: #047857; }
[data-theme="light"] .v-ring .vr-bg { stroke: rgba(120,53,15,0.12); }
[data-theme="light"] .v-ring-center b { color: #1a1410; }
[data-theme="light"] .v-ring-center span { color: #8a6f4b; }
[data-theme="light"] .v-bars .vbar-k { color: #6b5840; }
[data-theme="light"] .v-bars .vbar-track { background: rgba(120,53,15,0.08); }
[data-theme="light"] .v-bars .vbar-v { color: #1a1410; }
[data-theme="light"] .v-cta { color: #1a1410; }

[data-theme="light"] .tl-track, [data-theme="light"] .dept-track { background: rgba(40,25,10,0.07); }
[data-theme="light"] .cleg-k { color: #44362a; } [data-theme="light"] .cleg-v, [data-theme="light"] .tl-val, [data-theme="light"] .dept-v { color: #1a1410; }
[data-theme="light"] .tile.amber { background: linear-gradient(155deg, rgba(251,191,36,0.32), rgba(251,146,60,0.18)); }
[data-theme="light"] .tile-label { color: #8a6f4b; }
[data-theme="light"] .p-meta { color: #8a6f4b; }
[data-theme="light"] .estate-eyebrow { color: #5a3d10; }
</style>
