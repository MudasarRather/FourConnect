<template>
  <Motion
    as="section" class="smh" ref="heroRef"
    :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }"
    @mousemove="onMove" @mouseleave="resetMove"
  >
    <!-- ambient layer -->
    <div class="smh-atm" aria-hidden="true">
      <span class="orb a1" :style="orbStyle(1)" />
      <span class="orb a2" :style="orbStyle(0.6)" />
      <span class="orb a3" :style="orbStyle(0.3)" />
      <span class="orb a4" :style="orbStyle(-0.4)" />
      <span class="smh-grain" />
      <span class="smh-grid" />
      <svg class="smh-mesh" viewBox="0 0 1200 400" preserveAspectRatio="none">
        <path class="mesh-line" d="M-50,330 C300,250 520,360 760,250 C980,150 1100,230 1260,150" />
        <path class="mesh-line m2" d="M-50,250 C260,180 480,300 720,190 C940,90 1120,180 1260,90" />
        <path class="mesh-line m3" d="M-50,380 C320,320 560,400 820,310 C1020,240 1160,300 1260,230" />
      </svg>
    </div>

    <div class="smh-row">
      <!-- LEFT — lead -->
      <div class="smh-lead">
        <Motion
          as="span" class="smh-eyebrow sd-mono"
          :initial="{ y: -10, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
          :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }"
        >
          <span class="eb-glyph"><span class="eb-ring" /><span class="eb-core" /></span>
          {{ roleEyebrow }}
          <span class="eb-sep" />
          <span class="eb-live"><i class="eb-dot" /> LIVE</span>
        </Motion>

        <h1 class="smh-title">
          <Motion as="span" class="ht-line"
            :initial="{ y: 26, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
            :transition="{ duration: 0.7, delay: 0.06, ease: [0.16, 1, 0.3, 1] }">{{ titleLead }}</Motion>
          <Motion as="span" class="ht-line grad"
            :initial="{ y: 26, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
            :transition="{ duration: 0.7, delay: 0.13, ease: [0.16, 1, 0.3, 1] }">{{ titleAccent }}</Motion>
        </h1>

        <Motion as="p" class="smh-sub"
          :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
          :transition="{ duration: 0.6, delay: 0.24 }">{{ sub }}</Motion>

        <!-- CTA row -->
        <Motion as="div" class="smh-cta"
          :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.5, delay: 0.3 }">
          <Motion as="button" type="button" class="sbtn primary"
            :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('new')">
            <Plus :size="15" /> {{ caps.isAgent ? 'New ticket' : 'Raise a ticket' }}
          </Motion>
          <Motion as="button" type="button" class="sbtn ghost icon" :class="{ spinning: loading }"
            :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }" title="Refresh" @click="$emit('refresh')">
            <RefreshCw :size="15" />
          </Motion>
          <Motion as="button" type="button" class="sbtn ghost" :class="{ on: advCount > 0 }"
            :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="$emit('filters')">
            <SlidersHorizontal :size="15" /> Filters
            <span v-if="advCount" class="cta-badge">{{ advCount }}</span>
          </Motion>
          <Motion v-if="caps.isManager" as="button" type="button" class="sbtn ghost"
            :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="$emit('team')">
            <Users :size="15" /> Team
          </Motion>
        </Motion>

        <!-- live ticker + workload -->
        <Motion as="div" class="smh-ticker"
          :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
          :transition="{ duration: 0.6, delay: 0.42 }">
          <span class="tk-wl" :style="{ '--wl': workloadPct }">
            <svg viewBox="0 0 36 36" class="tk-wl-svg">
              <circle class="tk-wl-bg" cx="18" cy="18" r="15" />
              <circle class="tk-wl-fg" cx="18" cy="18" r="15"
                :stroke-dasharray="WL_CIRC" :stroke-dashoffset="wlOffset" />
            </svg>
            <span class="tk-wl-n">{{ workloadPct }}</span>
          </span>
          <span class="tk-body">
            <b>{{ workloadLabel }}</b> workload
            <i class="tk-flow" />
          </span>
          <span class="tk-div" />
          <span class="tk-meta">{{ activeCount }} active · {{ stats.resolved_today || 0 }} resolved today</span>
        </Motion>
      </div>

      <!-- RIGHT — the Live Deck (signature instrument) -->
      <Motion as="div" class="smh-deck-wrap"
        :initial="{ opacity: 0, scale: 0.88 }" :animate="{ opacity: 1, scale: 1 }"
        :transition="{ duration: 0.8, delay: 0.18, ease: [0.16, 1, 0.3, 1] }">
        <div class="deck-stage" :style="deckTilt">
          <p class="deck-eyebrow sd-mono"><Layers :size="11" /> LIVE DECK · {{ deck.length ? 'most urgent' : 'all clear' }}</p>

          <div class="deck" :class="{ empty: !deck.length }">
            <template v-if="deck.length">
              <button
                v-for="(t, i) in deck" :key="t.id" type="button"
                class="dcard" :class="{ breach: t._breach }"
                :style="cardStyle(i, deck.length, t)"
                @click="$emit('open', t.id)"
              >
                <span class="dc-spine" :style="{ background: priColor(t.priority) }" />
                <span class="dc-glow" />
                <div class="dc-top">
                  <span class="dc-no sd-mono">{{ t.ticket_number }}</span>
                  <span class="dc-ring" :style="{ '--p': t._cons, '--rc': t._breach ? 'var(--sd-danger)' : priColor(t.priority) }">
                    <i class="dc-ring-t sd-mono">{{ t._left }}</i>
                  </span>
                </div>
                <p class="dc-subj">{{ t.subject }}</p>
                <div class="dc-foot">
                  <span class="dc-pri" :style="{ '--pc': priColor(t.priority) }"><i />{{ priLabel(t.priority) }}</span>
                  <span class="dc-st" :style="{ color: statusColor(t.status) }">{{ statusLabel(t.status) }}</span>
                </div>
              </button>
            </template>
            <template v-else>
              <div v-for="n in 3" :key="n" class="dcard ghost" :style="ghostStyle(n - 1)">
                <span class="dc-spine" />
                <div class="dc-top"><span class="dc-no sd-mono">SD-——————</span><span class="dc-ring ph" /></div>
                <p class="dc-subj ph"></p>
                <div class="dc-foot"><span class="dc-pri ph" /><span class="dc-st ph" /></div>
              </div>
              <div class="deck-clear"><ShieldCheck :size="18" /> Nothing on fire — you're all caught up.</div>
            </template>
          </div>
        </div>
      </Motion>
    </div>

    <!-- TELEMETRY LENSES -->
    <div class="smh-lenses">
      <Motion
        as="button" v-for="(l, i) in lenses" :key="l.key" type="button"
        class="lens" :class="{ on: activeLens === l.key }" :style="{ '--lc': l.color }"
        :initial="{ opacity: 0, y: 18, filter: 'blur(7px)' }"
        :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
        :transition="{ duration: 0.5, delay: 0.34 + i * 0.06, ease: [0.16, 1, 0.3, 1] }"
        :whileHover="{ y: -3 }" :whileTap="{ scale: 0.97 }"
        @click="$emit('pick', l.key)"
      >
        <span class="lens-ic"><component :is="l.icon" :size="15" /></span>
        <span class="lens-body">
          <span class="lens-n"><SdCountUp :value="l.value" /></span>
          <span class="lens-lbl">{{ l.label }}</span>
        </span>
        <span class="lens-bar" />
      </Motion>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import {
  Plus, RefreshCw, SlidersHorizontal, Users, Layers, ShieldCheck,
  Activity, AlertOctagon, Hourglass, Timer, CircleCheck, Flame,
} from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'
import { useGreeting } from '@/composables/useGreeting'
import { priorityColor, statusColor as stColor, priorityLabel, statusLabel as stLabel } from '@/composables/useSupportDesk'

const props = defineProps({
  panel: { type: String, default: 'employee' },
  caps: { type: Object, default: () => ({ isAgent: false, isManager: false, isAdmin: false }) },
  me: { type: Object, default: () => ({ name: '' }) },
  tickets: { type: Array, default: () => [] },
  stats: { type: Object, default: () => ({}) },
  activeLens: { type: String, default: 'all' },
  advCount: { type: Number, default: 0 },
  now: { type: Number, default: () => Date.now() },
  loading: { type: Boolean, default: false },
})
defineEmits(['pick', 'new', 'refresh', 'filters', 'team', 'open'])

const priColor = (v) => priorityColor(v)
const priLabel = (v) => priorityLabel(v)
const statusColor = (v) => stColor(v)
const statusLabel = (v) => stLabel(v)

/* ── pointer parallax ── */
const heroRef = ref(null)
const mx = ref(0)
const my = ref(0)
const onMove = (e) => {
  const r = heroRef.value?.$el?.getBoundingClientRect?.() || heroRef.value?.getBoundingClientRect?.()
  if (!r) return
  mx.value = ((e.clientX - r.left) / r.width - 0.5) * 2
  my.value = ((e.clientY - r.top) / r.height - 0.5) * 2
}
const resetMove = () => { mx.value = 0; my.value = 0 }
const orbStyle = (d) => ({ transform: `translate3d(${(mx.value * d * 20).toFixed(1)}px, ${(my.value * d * 16).toFixed(1)}px, 0)` })
const deckTilt = computed(() => ({
  transform: `perspective(1100px) rotateX(${(my.value * -5).toFixed(2)}deg) rotateY(${(mx.value * 7).toFixed(2)}deg)`,
}))

/* ── role-adaptive copy ── */
// Greeting is anchored to the user's WORK-LOCATION timezone (never the device clock) and
// reads "Good evening" at/after midnight — never "Good morning" at night. See useGreeting.
const { greeting } = useGreeting()
const firstName = computed(() => (props.me?.name || '').trim().split(/\s+/)[0] || '')
const roleEyebrow = computed(() => props.caps.isAgent
  ? 'SUPPORT DESK · AGENT WORKBENCH'
  : (props.caps.isManager ? 'SUPPORT · TEAM & MY REQUESTS' : 'SUPPORT · MY REQUESTS'))
const titleLead = computed(() => `${greeting.value}${firstName.value ? ',' : ''}`)
const titleAccent = computed(() => firstName.value || (props.caps.isAgent ? 'Agent' : 'there'))
const sub = computed(() => props.caps.isAgent
  ? 'Tickets in your queue — triage, resolve, and keep every SLA in the green.'
  : (props.caps.isManager
    ? 'Your requests and your team’s — assign, track and resolve from one console.'
    : 'Every ticket you’ve raised, tracked to resolution in real time.'))

/* ── SLA math (live) ── */
const isTerminal = (t) => ['resolved', 'closed'].includes(t.status)
const consumption = (t) => {
  const created = t.created_at ? new Date(t.created_at).getTime() : null
  const due = t.resolution_due_at ? new Date(t.resolution_due_at).getTime() : null
  if (created && due && due > created) return Math.min(1.25, Math.max(0, (props.now - created) / (due - created)))
  if (created) return Math.min(1, (props.now - created) / (48 * 3600 * 1000))
  return 0
}
const leftLabel = (t) => {
  const due = t.resolution_due_at ? new Date(t.resolution_due_at).getTime() : null
  if (!due) return '∞'
  const diff = due - props.now
  const abs = Math.abs(diff)
  const h = Math.floor(abs / 3600000)
  const m = Math.floor((abs % 3600000) / 60000)
  const s = h >= 48 ? `${Math.floor(h / 24)}d` : h >= 1 ? `${h}h` : `${m}m`
  return diff < 0 ? `-${s}` : s
}

/* ── deck = top-5 most urgent active tickets ── */
const deck = computed(() => {
  const active = (props.tickets || []).filter(t => !isTerminal(t))
  const decorated = active.map(t => {
    const cons = consumption(t)
    return { ...t, _cons: Math.min(1, cons), _breach: !!t.sla_resolution_breached || cons >= 1, _left: leftLabel(t) }
  })
  decorated.sort((a, b) => b._cons - a._cons)
  return decorated.slice(0, 5)
})

const cardStyle = (i, n) => {
  const mid = (n - 1) / 2
  const off = i - mid
  // Fan offset lives in CSS vars (not a baked transform) so :hover can add scale while
  // KEEPING the card in its fan slot — lifting it out from under the cursor caused the
  // hover state to toggle and flicker when cards overlapped.
  return {
    '--i': i,
    '--rot': `${(off * 7).toFixed(2)}deg`,
    '--tx': `${(off * 30).toFixed(0)}px`,
    '--ty': `${(Math.abs(off) * 9).toFixed(0)}px`,
    zIndex: 20 - Math.round(Math.abs(off) * 2),
  }
}
const ghostStyle = (i) => {
  const off = i - 1
  return { transform: `rotate(${off * 6}deg) translateX(${off * 26}px) translateY(${Math.abs(off) * 8}px)`, zIndex: 10 - Math.abs(off) }
}

/* ── workload ── */
const WL_CIRC = 2 * Math.PI * 15
const workloadPct = computed(() => Math.max(0, Math.min(100, Math.round(props.stats?.workload_score || 0))))
const wlOffset = computed(() => WL_CIRC - (workloadPct.value / 100) * WL_CIRC)
const workloadLabel = computed(() => {
  const w = workloadPct.value
  return w >= 80 ? 'Heavy' : w >= 50 ? 'Busy' : w >= 20 ? 'Balanced' : 'Light'
})

/* ── lens counts (mirror the orchestrator predicates) ── */
const slaState = (t) => (t.sla_resolution_breached ? 'breached' : t.sla_resolution_state || (isTerminal(t) ? 'met' : 'ok'))
const cnt = (fn) => (props.tickets || []).filter(fn).length
const activeCount = computed(() => cnt(t => !isTerminal(t)))
const lenses = computed(() => [
  { key: 'open', label: 'Open', icon: Activity, color: 'var(--sd-st-progress)', value: cnt(t => ['open', 'in_progress'].includes(t.status)) },
  { key: 'critical', label: 'Critical', icon: AlertOctagon, color: 'var(--sd-pri-critical)', value: cnt(t => t.priority === 'critical' && !isTerminal(t)) },
  { key: 'pending', label: 'Pending', icon: Hourglass, color: 'var(--sd-st-pending)', value: cnt(t => ['pending_customer', 'pending_vendor', 'on_hold'].includes(t.status)) },
  { key: 'risk', label: 'SLA risk', icon: Timer, color: 'var(--sd-warning)', value: cnt(t => slaState(t) === 'due-soon') },
  { key: 'overdue', label: 'Overdue', icon: Flame, color: 'var(--sd-danger)', value: cnt(t => !isTerminal(t) && t.resolution_due_at && new Date(t.resolution_due_at).getTime() < props.now) },
  { key: 'resolved', label: 'Resolved', icon: CircleCheck, color: 'var(--sd-success)', value: cnt(isTerminal) },
])
</script>

<style scoped>
.smh { position: relative; overflow: hidden; border-radius: 24px; padding: 30px 30px 22px;
  background: var(--sd-grad-hero), var(--sd-panel);
  background-blend-mode: overlay, normal;
  border: 1px solid var(--sd-border-strong); box-shadow: var(--sd-shadow); isolation: isolate; }
.smh::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(8,10,12,0.86), rgba(10,12,14,0.78)); z-index: -1; }
[data-theme="light"] .smh::before { background: linear-gradient(135deg, rgba(255,251,245,0.82), rgba(255,248,238,0.7)); }

/* ambient */
.smh-atm { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.orb { position: absolute; border-radius: 50%; filter: blur(64px); will-change: transform; transition: transform 0.5s var(--sd-spring); }
.orb.a1 { width: 380px; height: 380px; top: -130px; left: -90px; background: radial-gradient(circle, rgba(251,191,36,0.4), transparent 65%); animation: smh-orb 22s ease-in-out infinite; }
.orb.a2 { width: 300px; height: 300px; top: -60px; right: 8%; background: radial-gradient(circle, rgba(251,146,60,0.34), transparent 66%); animation: smh-orb 27s ease-in-out infinite reverse; }
.orb.a3 { width: 240px; height: 240px; bottom: -120px; left: 28%; background: radial-gradient(circle, rgba(234,88,12,0.28), transparent 68%); animation: smh-orb 31s ease-in-out infinite; }
.orb.a4 { width: 320px; height: 320px; bottom: -150px; right: -90px; background: radial-gradient(circle, rgba(252,211,77,0.26), transparent 67%); animation: smh-orb 25s ease-in-out infinite reverse; }
.smh-grain { position: absolute; inset: 0; opacity: 0.05; mix-blend-mode: overlay;
  background-image: radial-gradient(rgba(251,191,36,0.5) 1px, transparent 1px), radial-gradient(rgba(234,88,12,0.4) 1px, transparent 1px);
  background-size: 5px 5px, 7px 7px; background-position: 0 0, 2px 3px; }
.smh-grid { position: absolute; inset: 0; opacity: 0.4;
  background-image: radial-gradient(rgba(251,191,36,0.06) 1px, transparent 1px); background-size: 26px 26px;
  -webkit-mask-image: linear-gradient(180deg, rgba(0,0,0,0.5), transparent 75%); mask-image: linear-gradient(180deg, rgba(0,0,0,0.5), transparent 75%); }
.smh-mesh { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.5; }
.mesh-line { fill: none; stroke: rgba(251,191,36,0.3); stroke-width: 1.4; stroke-dasharray: 6 11; animation: smh-mesh 26s linear infinite; }
.mesh-line.m2 { stroke: rgba(251,146,60,0.26); animation-duration: 32s; }
.mesh-line.m3 { stroke: rgba(234,88,12,0.2); animation-duration: 38s; }

.smh-row { position: relative; z-index: 1; display: grid; grid-template-columns: 1.25fr 1fr; gap: 28px; align-items: center; }

/* lead */
.smh-eyebrow { display: inline-flex; align-items: center; gap: 9px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.16em; color: var(--sd-amber); padding: 6px 13px; border-radius: 999px; background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); }
.eb-glyph { position: relative; width: 13px; height: 13px; }
.eb-ring { position: absolute; inset: 0; border-radius: 50%; border: 1.4px solid var(--sd-amber); border-top-color: transparent; animation: smh-spin 2.6s linear infinite; }
.eb-core { position: absolute; inset: 4px; border-radius: 50%; background: var(--sd-amber); animation: smh-pulse 2s ease-in-out infinite; }
.eb-sep { width: 1px; height: 11px; background: var(--sd-amber-border); }
.eb-live { display: inline-flex; align-items: center; gap: 5px; color: var(--sd-success); }
.eb-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sd-success); box-shadow: 0 0 8px var(--sd-success); animation: smh-pulse 1.6s ease-in-out infinite; }

.smh-title { margin: 14px 0 0; display: flex; flex-direction: column; line-height: 1.02; font-weight: 850; letter-spacing: -0.03em; font-size: clamp(30px, 4.4vw, 50px); }
.ht-line { color: var(--sd-text); }
.ht-line.grad { background: var(--sd-grad-hero); -webkit-background-clip: text; background-clip: text; color: transparent; }
.smh-sub { margin: 13px 0 0; font-size: 14.5px; line-height: 1.55; color: var(--sd-text-secondary); max-width: 44ch; }

.smh-cta { display: flex; flex-wrap: wrap; align-items: center; gap: 9px; margin-top: 20px; }
.sbtn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; border: 1px solid transparent; }
.sbtn.primary { color: #1a1206; background: var(--sd-grad-hero); box-shadow: 0 10px 26px rgba(251,146,60,0.32); }
[data-theme="light"] .sbtn.primary { color: #fff8ec; }
.sbtn.ghost { color: var(--sd-text-secondary); background: var(--sd-surface); border-color: var(--sd-border-strong); }
.sbtn.ghost:hover, .sbtn.ghost.on { color: var(--sd-text); border-color: var(--sd-amber-border); }
.sbtn.icon { padding: 10px 12px; }
.sbtn.spinning svg { animation: smh-spin 1s linear infinite; }
.cta-badge { display: inline-grid; place-items: center; min-width: 17px; height: 17px; padding: 0 4px; border-radius: 999px; font-size: 10px; font-weight: 800; color: #1a1206; background: var(--sd-amber); }
[data-theme="light"] .cta-badge { color: #fff8ec; }

.smh-ticker { display: inline-flex; align-items: center; gap: 12px; margin-top: 20px; padding: 9px 15px 9px 9px; border-radius: 999px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); width: fit-content; }
.tk-wl { position: relative; width: 36px; height: 36px; display: grid; place-items: center; }
.tk-wl-svg { position: absolute; inset: 0; transform: rotate(-90deg); }
.tk-wl-bg { fill: none; stroke: var(--sd-border-strong); stroke-width: 3; }
.tk-wl-fg { fill: none; stroke: var(--sd-amber); stroke-width: 3; stroke-linecap: round; transition: stroke-dashoffset 1s var(--sd-spring); }
.tk-wl-n { font-family: var(--sd-mono); font-size: 11px; font-weight: 800; color: var(--sd-text); }
.tk-body { position: relative; font-size: 12.5px; color: var(--sd-text-muted); overflow: hidden; }
.tk-body b { color: var(--sd-text); font-weight: 700; }
.tk-flow { position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(251,191,36,0.18), transparent); transform: translateX(-100%); animation: smh-flow 4s ease-in-out infinite; }
.tk-div { width: 1px; height: 16px; background: var(--sd-border-strong); }
.tk-meta { font-family: var(--sd-mono); font-size: 11px; color: var(--sd-text-dim); }

/* live deck */
.smh-deck-wrap { display: flex; justify-content: center; }
.deck-stage { position: relative; width: 100%; max-width: 360px; transition: transform 0.4s var(--sd-spring); transform-style: preserve-3d; }
.deck-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.14em; color: var(--sd-text-muted); margin: 0 0 14px; }
.deck { position: relative; height: 196px; display: flex; align-items: flex-end; justify-content: center; }
.deck.empty { align-items: center; }
.dcard { position: absolute; bottom: 0; width: 190px; min-height: 138px; padding: 14px 15px; border-radius: 16px; cursor: pointer; text-align: left; font-family: inherit;
  background: linear-gradient(165deg, var(--sd-surface-elevated), var(--sd-panel)); border: 1px solid var(--sd-border-strong);
  box-shadow: 0 14px 34px rgba(0,0,0,0.45); transform-origin: bottom center; overflow: hidden;
  transform: rotate(var(--rot, 0deg)) translateX(var(--tx, 0px)) translateY(var(--ty, 0px));
  transition: transform 0.34s var(--sd-spring), box-shadow 0.34s, border-color 0.2s; animation: smh-float 6s ease-in-out infinite; animation-delay: calc(var(--i, 0) * -1.3s); }
/* Scale IN PLACE from the bottom edge (origin bottom center) — the card grows upward, its
   footprint never shifts off the pointer, so hover can't toggle/flicker. Pause the float bob
   while hovered so it doesn't fight the lift. */
.dcard:hover { transform: rotate(var(--rot, 0deg)) translateX(var(--tx, 0px)) translateY(var(--ty, 0px)) scale(1.06) !important; z-index: 40 !important; box-shadow: 0 26px 60px rgba(0,0,0,0.6), var(--sd-glow); border-color: var(--sd-amber-border); animation-play-state: paused; }
.dcard.breach { border-color: color-mix(in srgb, var(--sd-danger) 45%, transparent); }
.dc-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }
.dc-glow { position: absolute; inset: 0; opacity: 0; background: var(--sd-grad-card); transition: opacity 0.3s; }
.dcard:hover .dc-glow { opacity: 1; }
.dc-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
.dc-no { font-size: 10.5px; font-weight: 700; color: var(--sd-amber); }
.dc-ring { position: relative; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0;
  background: conic-gradient(var(--rc) calc(var(--p, 0) * 360deg), var(--sd-border-strong) 0); }
.dc-ring::after { content: ''; position: absolute; inset: 3px; border-radius: 50%; background: var(--sd-panel); }
.dc-ring-t { position: relative; z-index: 1; font-size: 9px; font-weight: 800; color: var(--sd-text-secondary); }
.dc-ring.ph { background: var(--sd-border-strong); }
.dc-subj { margin: 0; font-size: 13px; font-weight: 650; color: var(--sd-text); line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.dc-foot { display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-top: 11px; }
.dc-pri { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; color: var(--pc); }
.dc-pri i { width: 6px; height: 6px; border-radius: 50%; background: var(--pc); box-shadow: 0 0 6px var(--pc); }
.dc-st { font-size: 10px; font-weight: 600; }
.dcard.ghost { cursor: default; animation: none; opacity: 0.55; }
.dcard.ghost:hover { transform: none !important; box-shadow: 0 14px 34px rgba(0,0,0,0.45); border-color: var(--sd-border-strong); }
.dc-subj.ph, .dc-pri.ph, .dc-st.ph { background: var(--sd-border-strong); border-radius: 5px; color: transparent; }
.dc-subj.ph { height: 30px; width: 80%; }
.dc-pri.ph { height: 10px; width: 40px; }
.dc-st.ph { height: 10px; width: 34px; }
.deck-clear { position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: var(--sd-success); white-space: nowrap; }

/* lenses */
.smh-lenses { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-top: 24px; }
.lens { display: flex; align-items: center; gap: 11px; padding: 12px 14px; border-radius: 15px; cursor: pointer; font-family: inherit; text-align: left;
  background: var(--sd-surface); border: 1px solid var(--sd-border); position: relative; overflow: hidden; transition: border-color 0.2s, background 0.2s; }
.lens:hover { border-color: color-mix(in srgb, var(--lc) 45%, transparent); }
.lens.on { background: color-mix(in srgb, var(--lc) 12%, transparent); border-color: color-mix(in srgb, var(--lc) 50%, transparent); }
.lens-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; color: var(--lc); background: color-mix(in srgb, var(--lc) 14%, transparent); flex-shrink: 0; }
.lens-body { display: flex; flex-direction: column; min-width: 0; }
.lens-n { font-size: 21px; font-weight: 850; color: var(--sd-text); letter-spacing: -0.02em; line-height: 1; }
.lens-lbl { font-size: 11px; font-weight: 600; color: var(--sd-text-muted); margin-top: 3px; }
.lens-bar { position: absolute; left: 0; bottom: 0; height: 2.5px; width: 100%; transform: scaleX(0); transform-origin: left; background: var(--lc); transition: transform 0.3s var(--sd-spring); }
.lens.on .lens-bar, .lens:hover .lens-bar { transform: scaleX(1); }

@keyframes smh-orb { 0%, 100% { translate: 0 0; } 50% { translate: 24px -18px; } }
@keyframes smh-mesh { to { stroke-dashoffset: -200; } }
@keyframes smh-spin { to { transform: rotate(360deg); } }
@keyframes smh-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.55; transform: scale(0.82); } }
@keyframes smh-float { 0%, 100% { translate: 0 0; } 50% { translate: 0 -7px; } }
@keyframes smh-flow { 0% { transform: translateX(-100%); } 60%, 100% { transform: translateX(100%); } }

@media (max-width: 1080px) {
  .smh-row { grid-template-columns: 1fr; }
  .smh-deck-wrap { order: -1; }
  .smh-lenses { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 560px) { .smh-lenses { grid-template-columns: repeat(2, 1fr); } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .orb,
  html:not([data-cinematic="on"]) .mesh-line,
  html:not([data-cinematic="on"]) .eb-ring,
  html:not([data-cinematic="on"]) .eb-core,
  html:not([data-cinematic="on"]) .eb-dot,
  html:not([data-cinematic="on"]) .tk-flow,
  html:not([data-cinematic="on"]) .dcard,
  html:not([data-cinematic="on"]) .sbtn.spinning svg { animation: none !important; }
}
</style>
