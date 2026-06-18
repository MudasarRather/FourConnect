<template>
  <div class="trn-dash">
    <!-- HERO: spatial observatory deck -->
    <section class="td-hero" ref="heroRef">
      <div class="td-hero-canvas" aria-hidden="true">
        <TrnHero3DCanvas :reduced="reduced" :light="isLight" :status-counts="statusCounts" />
      </div>
      <div class="td-glow td-glow-a" aria-hidden="true" />
      <div class="td-glow td-glow-b" aria-hidden="true" />
      <div class="td-grain trn-grain" aria-hidden="true" />
      <div class="td-spot trn-spotlight" aria-hidden="true" />
      <div class="td-veil" aria-hidden="true" />

      <div class="td-stage">
        <!-- eyebrow -->
        <div class="td-pl" style="--depth: 7">
          <Motion as="span" class="td-eyebrow"
            :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
            <span class="td-eyebrow-dot" /> <Telescope :size="12" /> Learning Observatory · LTCMS
          </Motion>
        </div>

        <!-- headline -->
        <div class="td-pl td-head-pl" style="--depth: 13">
          <h1 class="td-title">
            <Motion as="span" class="tl-line"
              :initial="{ opacity: 0, y: 30, filter: 'blur(16px)' }" :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
              :transition="{ duration: 0.9, delay: 0.06, ease: [0.16, 1, 0.3, 1] }">The observatory for</Motion>
            <Motion as="span" class="tl-line"
              :initial="{ opacity: 0, y: 30, filter: 'blur(16px)' }" :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
              :transition="{ duration: 0.9, delay: 0.17, ease: [0.16, 1, 0.3, 1] }"><span class="grad">human potential.</span></Motion>
          </h1>
          <Motion as="p" class="td-sub"
            :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }">
            Every program, competency and certification — orbiting one luminous record of how your people grow.
          </Motion>
        </div>

        <!-- mission deck -->
        <div class="td-pl" style="--depth: 22">
          <Motion as="div" class="td-deck"
            :initial="{ opacity: 0, y: 28, filter: 'blur(10px)' }" :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
            :transition="{ duration: 0.8, delay: 0.42, ease: [0.16, 1, 0.3, 1] }">
            <div class="td-lens td-lens-hero">
              <TrnProgressOrbit :pct="completionPct" :size="90" :stroke="6" color="var(--trn-amber)" label="completion" />
            </div>
            <div class="td-lenses">
              <button class="td-lens td-lens-stat" type="button" @click="$emit('go','enrollment')">
                <span class="tls-head"><span class="tls-dot" style="--c: var(--trn-st-completed)" /> Trained</span>
                <span class="tls-val"><TrnCountUp :value="s.employees_trained || 0" /></span>
                <svg class="tls-spark" viewBox="0 0 100 26" preserveAspectRatio="none"><polyline :points="spark(9)" /></svg>
              </button>
              <button class="td-lens td-lens-stat" type="button" @click="$emit('go','programs')">
                <span class="tls-head"><span class="tls-dot" style="--c: var(--trn-amber)" /> Programs</span>
                <span class="tls-val"><TrnCountUp :value="s.total_programs || 0" /></span>
                <svg class="tls-spark" viewBox="0 0 100 26" preserveAspectRatio="none"><polyline :points="spark(4)" /></svg>
              </button>
              <button class="td-lens td-lens-stat" type="button" @click="$emit('go','certifications')">
                <span class="tls-head"><span class="tls-dot" style="--c: var(--trn-ember)" /> Certs</span>
                <span class="tls-val"><TrnCountUp :value="s.certs_active || 0" /></span>
                <svg class="tls-spark" viewBox="0 0 100 26" preserveAspectRatio="none"><polyline :points="spark(7)" /></svg>
              </button>
            </div>
            <div class="td-cta">
              <button class="td-btn td-btn-primary" type="button" @click="$emit('go', 'programs')">
                <BookOpen :size="16" /> <span>Manage programs</span>
              </button>
              <button class="td-btn td-btn-ghost" type="button" @click="$emit('go', 'skill-matrix')">
                <Grid3x3 :size="16" /> <span>Skill matrix</span>
              </button>
            </div>
          </Motion>
        </div>
      </div>
    </section>

    <!-- KPI tiles -->
    <section class="td-kpis">
      <TrnStarTile :index="0" eyebrow="Active Programs" :value="s.total_programs" :icon="BookOpen" accent="amber" :seed="3" clickable @go="$emit('go','programs')" />
      <TrnStarTile :index="1" eyebrow="Employees Trained" :value="s.employees_trained" :icon="UsersRound" accent="gold" :seed="9" clickable @go="$emit('go','enrollment')" />
      <TrnStarTile :index="2" eyebrow="In Progress" :value="s.active_assignments" :icon="Loader" accent="amber" :seed="5" :hint="`${s.upcoming_trainings||0} due in 30d`" clickable @go="$emit('go','enrollment')" />
      <TrnStarTile :index="3" eyebrow="Overdue" :value="s.overdue_count" :icon="AlarmClock" :accent="(s.overdue_count||0) > 0 ? 'red' : 'grey'" :seed="2" clickable @go="$emit('go','enrollment')" />
      <TrnStarTile :index="4" eyebrow="Certs Active" :value="s.certs_active" :icon="Award" accent="emerald" :seed="7" clickable @go="$emit('go','certifications')" />
      <TrnStarTile :index="5" eyebrow="Expiring (90d)" :value="s.certs_expiring_90" :icon="CalendarClock" :accent="(s.certs_expiring_90||0)>0 ? 'orange':'grey'" :seed="11" :badge="(s.certs_expired||0) > 0 ? `${s.certs_expired} expired` : ''" clickable @go="$emit('go','certification-expiry')" />
      <TrnStarTile :index="6" eyebrow="Skill Gaps" :value="s.skill_gap_count" :icon="Grid3x3" accent="orange" :seed="6" clickable @go="$emit('go','skill-matrix')" />
      <TrnStarTile :index="7" eyebrow="Pending Requests" :value="s.pending_requests" :icon="Inbox" accent="amber" :seed="4" clickable @go="$emit('go','requests')" />
    </section>

    <!-- section label -->
    <Motion as="div" class="td-deck-label"
      :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
      <span class="tdl-line" /><span class="tdl-text">OBSERVATORY DECK</span><span class="tdl-line" />
    </Motion>

    <!-- cinematic bento of bespoke animated widgets -->
    <section class="td-bento">
      <article class="trn-card td-w td-w-mom" v-reveal="{ y: 28, delay: 0 }">
        <header class="tw-head">
          <div class="tw-title"><span class="tw-eyebrow">TELEMETRY</span><h3>Training momentum</h3></div>
          <div class="tw-legend">
            <span class="lg comp">Completions</span><span class="lg hour">Hours</span>
          </div>
        </header>
        <div class="tw-body"><TrnMomentumStrip :data="s.monthly || []" /></div>
      </article>

      <article class="trn-card td-w td-w-gauge" v-reveal="{ y: 28, delay: 0.08 }">
        <header class="tw-head"><div class="tw-title"><span class="tw-eyebrow">READINESS</span><h3>Mission readiness</h3></div></header>
        <div class="tw-body"><TrnRadialGauge :rings="readinessRings" :center="{ value: completionPct, label: 'completion', suffix: '%' }" /></div>
      </article>

      <article class="trn-card td-w" v-reveal="{ y: 28, delay: 0.14 }">
        <header class="tw-head"><div class="tw-title"><span class="tw-eyebrow">PEOPLE</span><h3>Enrollment mix</h3></div></header>
        <div class="tw-body"><TrnSegmentBar :segments="enrollmentSegs" /></div>
      </article>

      <article class="trn-card td-w" v-reveal="{ y: 28, delay: 0.2 }">
        <header class="tw-head"><div class="tw-title"><span class="tw-eyebrow">CREDENTIALS</span><h3>Certification status</h3></div></header>
        <div class="tw-body"><TrnSegmentBar :segments="certSegs" /></div>
      </article>

      <article class="trn-card td-w td-w-gaps" v-reveal="{ y: 28, delay: 0 }">
        <header class="tw-head">
          <div class="tw-title"><span class="tw-eyebrow">COMPETENCY</span><h3>Top skill gaps</h3></div>
          <span class="tw-sub">avg gap across the matrix</span>
        </header>
        <div class="tw-body"><TrnGapMeters :items="s.top_skill_gaps || []" /></div>
      </article>

      <article class="trn-card td-w td-w-comp" v-reveal="{ y: 28, delay: 0.08 }">
        <header class="tw-head"><div class="tw-title"><span class="tw-eyebrow">COMPLIANCE</span><h3>On track</h3></div></header>
        <div class="tw-body tw-comp-body">
          <TrnProgressOrbit :pct="s.compliance_rate || 0" :size="120" :stroke="9" color="var(--trn-st-completed-hex)" label="on track" />
          <div class="tw-comp-meta">
            <p>{{ Math.round(s.compliance_rate || 0) }}% of mandatory training is on schedule.</p>
            <button class="tw-link" type="button" @click="$emit('go','compliance')">Open compliance →</button>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { Motion } from 'motion-v'
import {
  Telescope, BookOpen, Grid3x3, UsersRound, Award, CalendarClock,
  AlarmClock, Inbox, Loader,
} from 'lucide-vue-next'
import TrnHero3DCanvas from '../components/TrnHero3DCanvas.vue'
import TrnStarTile from '../components/TrnStarTile.vue'
import TrnProgressOrbit from '../components/TrnProgressOrbit.vue'
import TrnCountUp from '../components/TrnCountUp.vue'
import TrnMomentumStrip from '../components/TrnMomentumStrip.vue'
import TrnRadialGauge from '../components/TrnRadialGauge.vue'
import TrnGapMeters from '../components/TrnGapMeters.vue'
import TrnSegmentBar from '../components/TrnSegmentBar.vue'
import { prefersReduced, seededWave } from '@/composables/useShiftMotion'

const props = defineProps({
  stats: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
})
defineEmits(['go', 'refresh'])

const s = computed(() => props.stats || {})
const reduced = prefersReduced()

// tiny sparkline path for the stat-lenses (deterministic shape per seed)
const spark = (seed) => {
  const w = seededWave(seed, 12)
  return w.map((v, i) => `${((i / 11) * 100).toFixed(1)},${(24 - v * 20).toFixed(1)}`).join(' ')
}

// ── spatial pointer: drives glare (--mx/--my/--spot) + depth parallax (--px/--py) ──
const heroRef = ref(null)
let cleanupPointer = null
onMounted(() => {
  const el = heroRef.value
  if (!el || reduced) return
  let raf = null, pend = null
  const flush = () => {
    raf = null; if (!pend) return
    el.style.setProperty('--mx', pend.mx.toFixed(3))
    el.style.setProperty('--my', pend.my.toFixed(3))
    el.style.setProperty('--px', ((pend.mx - 0.5) * 2).toFixed(3))
    el.style.setProperty('--py', ((pend.my - 0.5) * 2).toFixed(3))
  }
  const onMove = (e) => {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) return
    pend = {
      mx: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      my: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    }
    if (!raf) raf = requestAnimationFrame(flush)
  }
  const onEnter = () => el.style.setProperty('--spot', '1')
  const onLeave = () => {
    el.style.setProperty('--spot', '0')
    el.style.setProperty('--px', '0'); el.style.setProperty('--py', '0')
  }
  el.addEventListener('pointermove', onMove, { passive: true })
  el.addEventListener('pointerenter', onEnter, { passive: true })
  el.addEventListener('pointerleave', onLeave, { passive: true })
  cleanupPointer = () => {
    if (raf) cancelAnimationFrame(raf)
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerenter', onEnter)
    el.removeEventListener('pointerleave', onLeave)
  }
})

// theme reactivity for the 3D canvas
const themeRef = ref(document.documentElement.getAttribute('data-theme') || 'dark')
let obs = null
onMounted(() => {
  obs = new MutationObserver(() => { themeRef.value = document.documentElement.getAttribute('data-theme') || 'dark' })
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
})
onUnmounted(() => { obs?.disconnect(); cleanupPointer?.() })
const isLight = computed(() => themeRef.value === 'light')

const completionPct = computed(() => Math.round(s.value.completion_rate || 0))

const statusCounts = computed(() => {
  const map = {}
  for (const row of (s.value.by_status || [])) map[row.status] = row.count
  return map
})

// ── bespoke-widget data (CSS-var colors → theme-reactive automatically) ──
const STATUS_VARS = {
  NOT_STARTED: '--trn-st-not-started-hex', IN_PROGRESS: '--trn-st-in-progress-hex',
  COMPLETED: '--trn-st-completed-hex', FAILED: '--trn-st-failed-hex', WAIVED: '--trn-st-waived-hex',
}
const CERT_VARS = {
  ACTIVE: '--trn-cert-active', EXPIRING_SOON: '--trn-cert-expiring', EXPIRED: '--trn-cert-expired',
  REVOKED: '--trn-cert-revoked', PENDING_RENEWAL: '--trn-cert-pending',
}
const prettify = (k) => (k || '').replace(/_/g, ' ').toLowerCase()

const enrollmentSegs = computed(() => (s.value.by_status || []).map(r => ({
  label: prettify(r.status), value: Number(r.count) || 0, color: `var(${STATUS_VARS[r.status] || '--trn-amber'})`,
})))

const certSegs = computed(() => (s.value.cert_status || []).map(r => ({
  label: prettify(r.status), value: Number(r.count) || 0, color: `var(${CERT_VARS[r.status] || '--trn-amber'})`,
})))

const completedShare = computed(() => {
  const rows = s.value.by_status || []
  const total = rows.reduce((a, r) => a + (Number(r.count) || 0), 0)
  if (!total) return 0
  const done = Number((rows.find(r => r.status === 'COMPLETED') || {}).count) || 0
  return Math.round((done / total) * 100)
})

const readinessRings = computed(() => [
  { label: 'Completion', value: completionPct.value, color: 'var(--trn-amber)' },
  { label: 'Compliance', value: Math.round(s.value.compliance_rate || 0), color: 'var(--trn-st-completed)' },
  { label: 'Completed share', value: completedShare.value, color: 'var(--trn-ember)' },
])
</script>

<style scoped>
.trn-dash { display: flex; flex-direction: column; gap: 16px; }

/* ════════ HERO — spatial observatory deck ════════ */
.td-hero { position: relative; overflow: hidden; border-radius: 28px; min-height: 480px;
  background: var(--trn-dome); border: 1px solid var(--trn-border-soft); box-shadow: var(--trn-card-shadow);
  padding: 34px 38px; display: flex; flex-direction: column; }
.td-hero::before { content: ''; position: absolute; inset: 0; background: var(--trn-grad-hero); z-index: 0; }
.td-hero-canvas { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; opacity: 0.96; }

/* drifting ambient glow blobs */
.td-glow { position: absolute; z-index: 0; border-radius: 50%; pointer-events: none; filter: blur(50px); opacity: 0.55; }
.td-glow-a { width: 360px; height: 360px; top: -120px; left: -90px; background: radial-gradient(circle, rgba(251,191,36,0.28), transparent 70%); animation: td-glow-float 16s ease-in-out infinite; }
.td-glow-b { width: 420px; height: 420px; bottom: -160px; right: -110px; background: radial-gradient(circle, rgba(234,88,12,0.22), transparent 70%); animation: td-glow-float 21s ease-in-out infinite reverse; }

.td-grain { z-index: 1; }
.td-spot { z-index: 1; }
/* legibility veil — fade left for the headline, fade bottom for the deck */
.td-veil { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    linear-gradient(100deg, var(--trn-canvas) 2%, color-mix(in srgb, var(--trn-canvas) 52%, transparent) 30%, transparent 58%),
    linear-gradient(0deg, var(--trn-canvas) 0%, color-mix(in srgb, var(--trn-canvas) 42%, transparent) 20%, transparent 46%); }

.td-stage { position: relative; z-index: 2; display: flex; flex-direction: column; flex: 1; gap: 18px; }
.td-stage > .td-pl:nth-child(2) { margin-top: auto; }  /* push headline+deck toward the lower half */

/* parallax depth wrappers */
.td-pl { transform: translate3d(calc(var(--px, 0) * var(--depth) * -0.5px), calc(var(--py, 0) * var(--depth) * -0.4px), 0);
  transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1); will-change: transform; }

/* eyebrow */
.td-eyebrow { display: inline-flex; align-items: center; gap: 7px; padding: 6px 13px; border-radius: 999px;
  background: color-mix(in srgb, var(--trn-amber) 11%, transparent); border: 1px solid var(--trn-border-strong);
  font-family: var(--trn-mono); font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--trn-amber-strong);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
.td-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--trn-amber); box-shadow: 0 0 8px var(--trn-amber); animation: trn-pulse-dot 2.4s ease-out infinite; }

/* headline */
.td-head-pl { margin: 14px 0 4px; }
.td-title { margin: 0; font-size: clamp(34px, 4.6vw, 54px); line-height: 1.0; font-weight: 850; letter-spacing: -0.04em; color: var(--trn-text); }
.tl-line { display: block; }
.td-title .grad { background: linear-gradient(108deg, #fbbf24 0%, #fde68a 38%, #fb923c 72%, #fbbf24 100%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  background-size: 240% auto; animation: trn-sheen 5.5s linear infinite; }
.td-sub { margin: 18px 0 0; max-width: 484px; font-size: 14.5px; line-height: 1.62; color: var(--trn-text-secondary); }

/* mission deck — acrylic instrument bar */
.td-deck { display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
  margin-top: 22px; padding: 16px 18px; border-radius: 20px; border: 1px solid var(--trn-border-strong);
  background: color-mix(in srgb, var(--trn-surface-elevated) 74%, transparent);
  backdrop-filter: blur(22px) saturate(160%); -webkit-backdrop-filter: blur(22px) saturate(160%);
  box-shadow: 0 24px 56px -30px rgba(0,0,0,0.72), inset 0 1px 0 rgba(253,230,138,0.08); }

.td-lens { position: relative; border: 0; background: transparent; }
.td-lens-hero { flex-shrink: 0; display: grid; place-items: center; padding-right: 6px; }
.td-lens-hero::after { content: ''; position: absolute; right: -10px; top: 12%; bottom: 12%; width: 1px;
  background: linear-gradient(180deg, transparent, var(--trn-border-strong), transparent); }

.td-lenses { display: flex; gap: 10px; flex: 1; flex-wrap: wrap; min-width: 0; }
.td-lens-stat { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; cursor: pointer;
  padding: 9px 13px; border-radius: 14px; border: 1px solid transparent; min-width: 96px;
  transition: transform 0.26s var(--trn-spring), border-color 0.26s, background 0.26s; }
.td-lens-stat:hover { transform: translateY(-3px); border-color: var(--trn-border-strong);
  background: color-mix(in srgb, var(--trn-amber) 8%, transparent); }
.tls-head { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--trn-text-dim); }
.tls-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--c); box-shadow: 0 0 7px var(--c); }
.tls-val { font-family: var(--trn-mono); font-size: 27px; font-weight: 800; line-height: 1; color: var(--trn-text); }
.td-lens-stat:hover .tls-val { color: var(--trn-amber-strong); }
.tls-spark { width: 100%; height: 18px; overflow: visible; }
.tls-spark polyline { fill: none; stroke: var(--trn-amber); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
  opacity: 0.55; filter: drop-shadow(0 0 4px var(--trn-dome-glow)); transition: opacity 0.26s, stroke 0.26s; }
.td-lens-stat:hover .tls-spark polyline { opacity: 1; stroke: var(--trn-amber-bright); }

/* premium CTAs */
.td-cta { display: flex; gap: 11px; flex-wrap: wrap; margin-left: auto; }
.td-btn { position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 8px;
  font-size: 13.5px; font-weight: 650; padding: 11px 19px; border-radius: 13px; cursor: pointer; white-space: nowrap;
  border: 1px solid transparent; transition: box-shadow 0.3s var(--trn-spring), border-color 0.3s; }
.td-btn-primary { color: #1c1206; background: var(--hr-gradient-hero); box-shadow: 0 10px 26px -10px rgba(251,146,60,0.62), inset 0 1px 0 rgba(255,255,255,0.35); }
.td-btn-primary:hover { box-shadow: 0 16px 34px -10px rgba(251,146,60,0.78), inset 0 1px 0 rgba(255,255,255,0.45); }
/* sheen sweep */
.td-btn-primary::after { content: ''; position: absolute; top: 0; bottom: 0; left: -60%; width: 45%;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,0.5), transparent); transform: skewX(-18deg); opacity: 0; }
.td-btn-primary:hover::after { animation: td-sheen-sweep 0.9s ease; }
.td-btn-ghost { color: var(--trn-text-secondary); background: color-mix(in srgb, var(--trn-surface-elevated) 60%, transparent);
  border-color: var(--trn-border-strong); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
.td-btn-ghost:hover { color: var(--trn-text); border-color: var(--trn-amber-strong); }

/* ════════ KPI tiles ════════ */
.td-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }

/* ════════ section label ════════ */
.td-deck-label { display: flex; align-items: center; gap: 14px; margin: 6px 2px 0; }
.tdl-line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, var(--trn-border-strong), transparent); }
.tdl-text { font-family: var(--trn-mono); font-size: 10px; letter-spacing: 0.3em; color: var(--trn-text-dim); white-space: nowrap; }

/* ════════ cinematic bento ════════ */
.td-bento { display: grid; grid-template-columns: repeat(4, 1fr); grid-auto-rows: minmax(176px, auto); gap: 14px; }
.td-w { position: relative; overflow: hidden; padding: 18px 20px; display: flex; flex-direction: column; gap: 14px;
  transition: box-shadow 0.4s var(--trn-spring), border-color 0.4s; }
/* hover uses shadow/border/glow (not transform) — v-reveal leaves an inline transform on the card */
.td-w:hover { box-shadow: var(--trn-card-shadow-hover); border-color: color-mix(in srgb, var(--trn-amber) 26%, transparent); }
.td-w::after { content: ''; position: absolute; top: -50%; right: -30%; width: 200px; height: 200px; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, var(--trn-dome-glow), transparent 68%); opacity: 0; transition: opacity 0.4s; }
.td-w:hover::after { opacity: 1; }
.td-w-mom { grid-column: span 2; grid-row: span 2; }
.td-w-gauge { grid-column: span 1; grid-row: span 2; }
.td-w-gaps { grid-column: span 2; }
.td-w-comp { grid-column: span 2; }

.tw-head { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.tw-title { display: flex; flex-direction: column; gap: 3px; }
.tw-eyebrow { font-family: var(--trn-mono); font-size: 8.5px; letter-spacing: 0.18em; color: var(--trn-amber-strong); }
.tw-title h3 { margin: 0; font-size: 15px; font-weight: 750; letter-spacing: -0.01em; color: var(--trn-text); }
.tw-sub { font-size: 10.5px; color: var(--trn-text-dim); white-space: nowrap; }
.tw-body { position: relative; z-index: 1; flex: 1; min-height: 0; display: flex; }
.tw-body > * { flex: 1; min-width: 0; }

.tw-legend { display: flex; gap: 13px; align-items: center; }
.tw-legend .lg { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; color: var(--trn-text-muted); white-space: nowrap; }
.tw-legend .lg::before { content: ''; width: 9px; height: 9px; border-radius: 3px; }
.tw-legend .comp::before { background: var(--trn-st-completed); box-shadow: 0 0 7px var(--trn-st-completed); }
.tw-legend .hour::before { background: var(--trn-ember); box-shadow: 0 0 7px var(--trn-ember); }

.tw-comp-body { align-items: center; gap: 22px; }
.tw-comp-body > :first-child { flex: 0 0 auto; }
.tw-comp-meta { display: flex; flex-direction: column; gap: 14px; }
.tw-comp-meta p { margin: 0; font-size: 13px; line-height: 1.55; color: var(--trn-text-secondary); }
.tw-link { align-self: flex-start; border: 0; background: transparent; cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 650;
  color: var(--trn-amber-strong); padding: 4px 0; transition: transform 0.22s var(--trn-spring), color 0.2s; }
.tw-link:hover { color: var(--trn-amber-bright); transform: translateX(4px); }

/* ════════ keyframes ════════ */
@keyframes td-glow-float { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(34px, 26px) scale(1.12); } }
@keyframes td-sheen-sweep { 0% { left: -60%; opacity: 0; } 12% { opacity: 1; } 100% { left: 120%; opacity: 0; } }

@media (max-width: 1100px) {
  .td-kpis, .td-bento { grid-template-columns: repeat(2, 1fr); }
  .td-w-mom, .td-w-gauge, .td-w-gaps, .td-w-comp { grid-column: span 2; grid-row: span 1; }
  .td-cta { margin-left: 0; }
}
@media (max-width: 720px) {
  .td-hero { min-height: 0; padding: 26px 22px; }
  .td-hero-canvas { opacity: 0.55; }
  .td-veil { background:
    linear-gradient(0deg, var(--trn-canvas) 6%, color-mix(in srgb, var(--trn-canvas) 55%, transparent) 32%, transparent 62%),
    linear-gradient(100deg, var(--trn-canvas) 6%, transparent 72%); }
  .td-stage > .td-pl:nth-child(2) { margin-top: 18px; }
  .td-deck { gap: 14px; }
  .td-lenses { gap: 8px; }
  .td-cta { margin-left: 0; width: 100%; }
  .td-btn { flex: 1; justify-content: center; }
  .td-kpis, .td-bento { grid-template-columns: 1fr; }
  .td-w, .td-w-mom, .td-w-gauge, .td-w-gaps, .td-w-comp { grid-column: span 1; grid-row: auto; }
  .tw-comp-body { flex-direction: column; align-items: flex-start; }
}
@media (prefers-reduced-motion: reduce) {
  .td-title .grad, .td-glow, .td-eyebrow-dot { animation: none; }
  .td-pl { transition: none; transform: none; }
  .td-btn-primary:hover::after { animation: none; }
}
</style>
