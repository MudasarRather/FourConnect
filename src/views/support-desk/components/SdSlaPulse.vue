<template>
  <!-- ══ SLA Frontier — the SLA view's cinematic read of the team's clocks ══
       A radial compliance reactor + segmented state meters, an animated linear
       FRONTIER rail (breach zone → NOW gate → safe horizon) that plots every
       at-risk ticket by time-to-breach with a rich hover tooltip, and a live
       countdown ledger. -->
  <div class="sf">
    <!-- ── reactor + state meters ── -->
    <section class="sf-band">
      <div class="sf-gauge sd-card" :class="compTone" :style="{ '--sd-p': (compliancePct * 3.6) + 'deg' }">
        <span class="g-grain" aria-hidden="true" />
        <div class="g-ring">
          <span class="g-sweep" aria-hidden="true" />
          <div class="g-core">
            <span class="g-val"><SdCountUp :value="compliancePct" /><i>%</i></span>
            <span class="g-cap">SLA compliance</span>
          </div>
        </div>
        <div class="g-foot">
          <ShieldCheck :size="13" /> <b>{{ withinCount }}</b> of <b>{{ clockCount }}</b> clocks healthy
        </div>
      </div>

      <div class="sf-states">
        <button v-for="s in states" :key="s.key" class="sf-state sd-card" :class="[s.key, { on: filter === s.key }]"
          :style="{ '--ac': s.color }" @click="filter = filter === s.key ? null : s.key">
          <span class="st-sheen" aria-hidden="true" />
          <span class="st-head">
            <span class="st-ico"><component :is="s.icon" :size="17" /></span>
            <span v-if="s.key === 'over' && breachedCount" class="st-live"><i /> live</span>
          </span>
          <span class="st-val"><SdCountUp :value="s.value" /></span>
          <span class="st-label">{{ s.label }}</span>
          <span class="st-meter">
            <i v-for="seg in 14" :key="seg" class="seg" :class="{ lit: seg <= s.litSegs }" />
          </span>
        </button>
      </div>
    </section>

    <!-- ── the SLA frontier rail (signature) ── -->
    <section class="sf-frontier sd-card">
      <header class="fr-head">
        <h3><Crosshair :size="15" /> SLA frontier <span v-if="plotted.length" class="fr-n sd-mono">{{ plotted.length }}</span></h3>
        <div class="fr-key">
          <span class="fk over"><i /> breached</span>
          <span class="fk soon"><i /> approaching</span>
          <span class="fk safe"><i /> within SLA</span>
        </div>
      </header>
      <div class="fr-rail" :class="{ still: reduced }">
        <span class="fr-zone z-over" /><span class="fr-zone z-soon" /><span class="fr-zone z-safe" />
        <span class="fr-flow" aria-hidden="true" />
        <span class="fr-now"><i class="fr-now-line" /><span class="fr-now-tag sd-mono">NOW</span></span>
        <button v-for="tk in plotted" :key="tk.id" type="button" class="fr-blip" :class="[tk.zone, { active: hovered && hovered.id === tk.id }]"
          :style="{ left: tk.pos + '%', top: `calc(50% + ${tk.vy}px)`, '--bc': tk.col, '--d': tk.delay + 's' }"
          @mouseenter="showTip(tk, $event)" @focus="showTip(tk, $event)" @mouseleave="hideTip" @blur="hideTip"
          @click="$emit('open', tk.id)">
          <span class="fr-dot" /><span class="fr-stem" />
        </button>
        <div class="fr-axis sd-mono"><span>overdue</span><span>2h</span><span>12h</span><span>24h</span><span>48h+</span></div>
        <p v-if="!plotted.length" class="fr-empty">{{ loading ? 'Reading SLA clocks…' : 'Every clock is comfortably within SLA — the frontier is clear.' }}</p>
      </div>
    </section>

    <!-- ── live countdown ledger ── -->
    <section class="sd-card sf-ledger">
      <header class="lg-head">
        <h3><Activity :size="15" /> Countdown ledger <span class="lg-count sd-mono">{{ rows.length }}</span></h3>
        <div class="lg-head-r">
          <span v-if="filter" class="lg-filter" @click="filter = null">{{ filterLabel }} <X :size="11" /></span>
          <span class="lg-live"><i /> live</span>
        </div>
      </header>
      <div v-if="rows.length" class="lg-rows">
        <div class="lg-row lg-row--head">
          <span>Ticket</span><span>Status</span><span>Customer</span><span>Agent</span><span>SLA clock</span><span class="ta-r">Remaining</span>
        </div>
        <button v-for="(t, i) in rows" :key="t.id" class="lg-row" :class="rstate(t)" :style="{ '--pc': priColor(t.priority), '--i': i }" @click="$emit('open', t.id)">
          <span class="lg-tk">
            <span class="lg-spine" />
            <span class="lg-tk-top">
              <b class="sd-mono">{{ t.ticket_number }}</b>
              <em v-if="priorityP(t.priority)" class="lg-pcode" :style="{ '--p2': priColor(t.priority) }">{{ priorityP(t.priority) }}</em>
              <i v-if="t.is_escalated" class="lg-esc" title="Escalated"><Flame :size="10" /></i>
            </span>
            <small>{{ t.subject }}</small>
          </span>
          <span class="lg-status"><span class="lg-stpill" :style="{ '--stc': statusColor(t.status) }"><i />{{ statusLabel(t.status) }}</span></span>
          <span class="lg-cust" :title="t.organization_name || t.contact_name || 'Internal'">{{ t.organization_name || t.contact_name || 'Internal' }}</span>
          <span class="lg-ag" :class="{ unassigned: !t.assigned_agent_name }" :title="t.assigned_agent_name || 'Unassigned'">{{ t.assigned_agent_name || 'Unassigned' }}</span>
          <span class="lg-sla">
            <span class="lg-track" :class="rstate(t)">
              <i class="lg-fill" :style="{ width: barPct(t) + '%' }"><b class="lg-comet" /></i>
            </span>
            <span class="lg-sla-meta"><b>{{ Math.round(cons(t) * 100) }}%</b><em>{{ clockKind(t) }}</em></span>
          </span>
          <span class="lg-rem ta-r" :class="rstate(t)">
            <span class="lg-rem-t"><Timer :size="12" />{{ remain(t) }}</span>
            <small class="lg-due">{{ fmtDue(t) }}</small>
          </span>
        </button>
      </div>
      <p v-else class="lg-empty">{{ loading ? 'Reading SLA clocks…' : 'No tickets are approaching or past their SLA. The basin is calm.' }}</p>
    </section>

    <!-- ── frontier hover tooltip (teleported, animated) ── -->
    <Teleport to="body">
      <Presence>
        <Motion v-if="hovered" class="fr-tip sd-grain" :style="tipStyle" :class="hovered.zone"
          :initial="{ opacity: 0, y: 8, scale: 0.94 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 6, scale: 0.96 }" :transition="{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }">
          <span class="tip-aura" aria-hidden="true" />
          <header class="tip-head">
            <em v-if="priorityP(hovered.priority)" class="tip-p" :style="{ '--p2': priColor(hovered.priority) }">{{ priorityP(hovered.priority) }}</em>
            <b class="sd-mono">{{ hovered.ticket_number }}</b>
            <span class="tip-zone" :class="hovered.zone">{{ hovered.zone === 'over' ? 'Breached' : hovered.zone === 'soon' ? 'Approaching' : 'Within SLA' }}</span>
          </header>
          <p class="tip-subj">{{ hovered.subject }}</p>
          <div class="tip-meta">
            <span><i class="tip-dot" :style="{ background: statusColor(hovered.status) }" /> {{ statusLabel(hovered.status) }}</span>
            <span><Building2 :size="11" /> {{ hovered.organization_name || hovered.contact_name || 'Internal' }}</span>
            <span><UserRound :size="11" /> {{ hovered.assigned_agent_name || 'Unassigned' }}</span>
          </div>
          <div class="tip-track" :class="hovered.zone"><i :style="{ width: barPct(hovered) + '%' }" /></div>
          <div class="tip-foot">
            <span class="tip-clock sd-mono">{{ clockKind(hovered) }} · {{ Math.round(cons(hovered) * 100) }}%</span>
            <span class="tip-eta" :class="hovered.zone"><Timer :size="12" /> {{ hovered.etaLabel }}</span>
          </div>
          <span class="tip-cta">Click to open →</span>
        </Motion>
      </Presence>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { Activity, Timer, ShieldCheck, AlarmClock, Siren, Crosshair, Flame, X, Building2, UserRound } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'
import { priorityColor, statusColor, statusLabel, priorityP } from '@/composables/useSupportDesk'

const props = defineProps({
  tickets: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  loading: { type: Boolean, default: false },
})
defineEmits(['open'])

const cinematicOn = () => typeof document !== 'undefined' && document.documentElement.getAttribute('data-cinematic') === 'on'
const reduced = ref(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !cinematicOn())

const filter = ref(null)
const filterLabel = computed(() => ({ within: 'Within SLA', soon: 'Approaching', over: 'Breached' }[filter.value] || ''))
const priColor = (v) => priorityColor(v)

const active = computed(() => props.tickets.filter(t => !['closed', 'resolved'].includes(t.status)))
const dueMs = (t) => { const d = t.resolution_due_at || t.response_due_at; return d ? new Date(d).getTime() : null }
const hasClock = (t) => dueMs(t) != null
const isBreached = (t) => t.sla_resolution_breached || t.sla_resolution_state === 'breached' || (dueMs(t) != null && props.now > dueMs(t))
const isSoon = (t) => !isBreached(t) && hasClock(t) && (t.sla_resolution_state === 'due-soon' || (dueMs(t) - props.now) < 7200000)

const clockCount = computed(() => active.value.filter(hasClock).length)
const breachedCount = computed(() => active.value.filter(isBreached).length)
const soonCount = computed(() => active.value.filter(isSoon).length)
const withinCount = computed(() => Math.max(0, clockCount.value - breachedCount.value - soonCount.value))
const compliancePct = computed(() => clockCount.value ? Math.round((withinCount.value / clockCount.value) * 100) : 100)
const compTone = computed(() => (compliancePct.value >= 85 ? 'ok' : compliancePct.value >= 60 ? 'warn' : 'bad'))

const states = computed(() => {
  const mx = Math.max(1, withinCount.value, soonCount.value, breachedCount.value)
  const seg = (v) => Math.max(v > 0 ? 1 : 0, Math.round((v / mx) * 14))
  return [
    { key: 'within', label: 'Within SLA', value: withinCount.value, color: 'var(--sd-success)', icon: ShieldCheck, litSegs: seg(withinCount.value) },
    { key: 'soon', label: 'Approaching breach', value: soonCount.value, color: 'var(--sd-warning)', icon: AlarmClock, litSegs: seg(soonCount.value) },
    { key: 'over', label: 'Breached', value: breachedCount.value, color: 'var(--sd-danger)', icon: Siren, litSegs: seg(breachedCount.value) },
  ]
})

/* consumption 0..1 for bar + remaining */
const cons = (t) => {
  const created = t.created_at ? new Date(t.created_at).getTime() : null
  const due = dueMs(t)
  if (created && due && due > created) return Math.min(1, Math.max(0, (props.now - created) / (due - created)))
  return isBreached(t) ? 1 : 0.5
}
const barPct = (t) => Math.max(3, Math.min(100, Math.round(cons(t) * 100)))
const rstate = (t) => isBreached(t) ? 'over' : isSoon(t) ? 'soon' : 'ok'
// Which clock is the live one — the response clock until first reply lands, else resolution.
const clockKind = (t) => (!t.first_responded_at && t.response_due_at && !t.sla_response_breached) ? 'response' : 'resolution'

const remain = (t) => {
  const d = dueMs(t); if (d == null) return '—'
  const ms = d - props.now, abs = Math.abs(ms)
  const m = Math.floor(abs / 60000)
  const lbl = m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`
  return ms < 0 ? `${lbl} over` : lbl
}
const fmtDue = (t) => {
  const d = dueMs(t); if (d == null) return ''
  const dt = new Date(d), nd = new Date(props.now)
  const time = dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  if (dt.toDateString() === nd.toDateString()) return `due ${time}`
  return `${dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${time}`
}

/* ── frontier plot: position by time-to-breach (+ vertical fan so clustered blips don't stack) ── */
const plotted = computed(() => {
  const list = active.value.filter(hasClock).filter(t => isBreached(t) || isSoon(t) || (dueMs(t) - props.now) < 48 * 3600000)
  return list.slice(0, 48).map((t, i) => {
    const ms = dueMs(t) - props.now
    const h = ms / 3600000
    let pos, zone
    if (ms < 0) { zone = 'over'; pos = Math.max(2, 13 - Math.min(11, Math.abs(h) / 6 * 11)) }
    else if (h < 2) { zone = 'soon'; pos = 14 + (h / 2) * 17 }
    else { zone = 'safe'; pos = 32 + Math.min(1, (h - 2) / 46) * 64 }
    return {
      ...t, pos, zone, col: zone === 'over' ? 'var(--sd-danger)' : priorityColor(t.priority),
      etaLabel: ms < 0 ? `${remain(t)}` : `${remain(t)} left`,
      delay: ((i % 8) * 0.12).toFixed(2), vy: ((i % 3) - 1) * 16,
    }
  })
})

const rows = computed(() => {
  let r = active.value.filter(t => hasClock(t) && (isBreached(t) || isSoon(t)))
  if (filter.value === 'within') r = active.value.filter(t => hasClock(t) && rstate(t) === 'ok')
  else if (filter.value === 'soon') r = active.value.filter(t => isSoon(t))
  else if (filter.value === 'over') r = active.value.filter(t => isBreached(t))
  return [...r].sort((a, b) => (dueMs(a) - props.now) - (dueMs(b) - props.now)).slice(0, 60)
})

/* ── frontier hover tooltip (teleported; positioned off the blip's rect) ── */
const hovered = ref(null)
const tipStyle = ref({})
const positionTip = (r) => {
  const w = 256, approxH = 188
  const left = Math.max(10, Math.min(window.innerWidth - w - 10, r.left + r.width / 2 - w / 2))
  if (r.top < approxH + 28) tipStyle.value = { left: left + 'px', top: (r.bottom + 12) + 'px', width: w + 'px' }
  else tipStyle.value = { left: left + 'px', bottom: (window.innerHeight - r.top + 12) + 'px', width: w + 'px' }
}
const showTip = (tk, e) => { hovered.value = tk; positionTip(e.currentTarget.getBoundingClientRect()) }
const hideTip = () => { hovered.value = null }
const onScroll = () => { if (hovered.value) hideTip() }
onMounted(() => window.addEventListener('scroll', onScroll, true))
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll, true))
</script>

<style scoped>
.sf { display: flex; flex-direction: column; gap: 14px; }

/* ── reactor + states band ── */
.sf-band { display: grid; grid-template-columns: 252px 1fr; gap: 14px; }

.sf-gauge { position: relative; overflow: hidden; padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 14px;
  --gc: var(--sd-success); }
.sf-gauge.ok { --gc: var(--sd-success); } .sf-gauge.warn { --gc: var(--sd-warning); } .sf-gauge.bad { --gc: var(--sd-danger); }
.g-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--gc) 14%, transparent) 1px, transparent 0); background-size: 16px 16px; }
.g-ring { position: relative; width: 148px; height: 148px; border-radius: 50%; display: grid; place-items: center;
  background: conic-gradient(var(--gc) var(--sd-p, 0deg), color-mix(in srgb, var(--sd-text-dim) 22%, transparent) 0);
  transition: --sd-p 0.9s var(--sd-spring); box-shadow: 0 0 30px color-mix(in srgb, var(--gc) 26%, transparent); }
.g-ring::after { content: ""; position: absolute; inset: 11px; border-radius: 50%; background: var(--sd-surface-elevated);
  box-shadow: inset 0 0 24px color-mix(in srgb, var(--gc) 22%, transparent); }
.g-sweep { position: absolute; inset: -2px; border-radius: 50%; pointer-events: none;
  background: conic-gradient(from 0deg, transparent 0 78%, color-mix(in srgb, var(--gc) 55%, transparent) 92%, transparent 100%);
  -webkit-mask: radial-gradient(closest-side, transparent 68%, #000 70%); mask: radial-gradient(closest-side, transparent 68%, #000 70%);
  animation: sf-rotate 4.5s linear infinite; }
.g-core { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; }
.g-val { font-size: 34px; font-weight: 850; color: var(--sd-text); letter-spacing: -0.03em; line-height: 1; }
.g-val i { font-size: 16px; font-style: normal; color: var(--sd-text-muted); }
.g-cap { font-size: 9.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--sd-text-muted); margin-top: 5px; }
.g-foot { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--sd-text-secondary); }
.g-foot svg { color: var(--gc); } .g-foot b { color: var(--sd-text); font-weight: 800; }

.sf-states { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.sf-state { position: relative; overflow: hidden; padding: 16px; display: flex; flex-direction: column; gap: 5px; text-align: left; cursor: pointer;
  transition: transform 0.2s var(--sd-spring), border-color 0.2s, box-shadow 0.2s; }
.sf-state:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--ac) 40%, var(--sd-border-strong)); }
.sf-state.on { border-color: var(--ac); box-shadow: 0 0 0 1px var(--ac), var(--sd-card-shadow); }
.st-sheen { position: absolute; top: 0; left: 0; width: 40%; height: 100%; pointer-events: none; opacity: 0;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ac) 16%, transparent), transparent); transform: translateX(-130%) skewX(-18deg); }
.sf-state:hover .st-sheen { opacity: 1; animation: sf-sheen 0.9s var(--sd-ease); }
.st-head { display: flex; align-items: center; justify-content: space-between; }
.st-ico { width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center; color: var(--ac); background: color-mix(in srgb, var(--ac) 14%, transparent); }
.st-live { display: inline-flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--sd-danger); }
.st-live i { width: 6px; height: 6px; border-radius: 50%; background: var(--sd-danger); animation: sf-pulse 1.6s ease-in-out infinite; }
.st-val { font-size: 32px; font-weight: 850; color: var(--sd-text); letter-spacing: -0.02em; margin-top: 6px; line-height: 1; }
.st-label { font-size: 12px; color: var(--sd-text-muted); }
.st-meter { display: flex; gap: 2.5px; margin-top: 9px; }
.st-meter .seg { flex: 1; height: 5px; border-radius: 2px; background: color-mix(in srgb, var(--sd-text-dim) 18%, transparent); transition: background 0.5s var(--sd-spring), box-shadow 0.5s; }
.st-meter .seg.lit { background: var(--ac); box-shadow: 0 0 7px color-mix(in srgb, var(--ac) 60%, transparent); }

/* ── frontier ── */
.sf-frontier { padding: 16px 18px 14px; }
.fr-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.fr-head h3 { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--sd-text); margin: 0; }
.fr-head h3 svg { color: var(--sd-amber); }
.fr-n { font-size: 11px; font-weight: 800; padding: 1px 8px; border-radius: 999px; background: var(--sd-amber-soft); color: var(--sd-amber); }
.fr-key { display: inline-flex; gap: 13px; }
.fk { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 600; color: var(--sd-text-muted); }
.fk i { width: 8px; height: 8px; border-radius: 50%; }
.fk.over i { background: var(--sd-danger); box-shadow: 0 0 7px var(--sd-danger); }
.fk.soon i { background: var(--sd-warning); box-shadow: 0 0 7px var(--sd-warning); }
.fk.safe i { background: var(--sd-success); box-shadow: 0 0 7px var(--sd-success); }

.fr-rail { position: relative; height: 92px; border-radius: 14px; overflow: hidden;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.fr-zone { position: absolute; top: 0; bottom: 0; }
.fr-zone.z-over { left: 0; width: 14%; background: linear-gradient(90deg, color-mix(in srgb, var(--sd-danger) 22%, transparent), color-mix(in srgb, var(--sd-danger) 7%, transparent)); }
.fr-zone.z-soon { left: 14%; width: 18%; background: color-mix(in srgb, var(--sd-warning) 9%, transparent); }
.fr-zone.z-safe { left: 32%; right: 0; background: linear-gradient(90deg, color-mix(in srgb, var(--sd-success) 7%, transparent), transparent 70%); }
.fr-flow { position: absolute; left: 0; right: 0; top: 50%; height: 2px; transform: translateY(-50%);
  background: linear-gradient(90deg, var(--sd-danger), var(--sd-warning) 24%, var(--sd-success) 55%, color-mix(in srgb, var(--sd-success) 30%, transparent));
  opacity: 0.5; -webkit-mask: linear-gradient(90deg, #000, #000 60%, transparent); mask: linear-gradient(90deg, #000, #000 60%, transparent); }
.fr-now { position: absolute; left: 14%; top: 0; bottom: 0; }
.fr-now-line { position: absolute; top: 8px; bottom: 22px; left: 0; width: 2px; background: var(--sd-text-secondary); opacity: 0.5;
  box-shadow: 0 0 10px var(--sd-text-secondary); }
.fr-now-tag { position: absolute; top: 0; left: 4px; font-size: 8px; font-weight: 800; letter-spacing: 0.12em; color: var(--sd-text-secondary); }

.fr-blip { position: absolute; transform: translate(-50%, -50%); width: 18px; height: 44px; cursor: pointer; background: none; border: none; padding: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 2; transition: transform 0.2s var(--sd-spring); }
.fr-blip.active { z-index: 4; }
.fr-dot { width: 11px; height: 11px; border-radius: 50%; background: var(--bc); box-shadow: 0 0 10px var(--bc), 0 0 0 3px color-mix(in srgb, var(--bc) 20%, transparent);
  transition: transform 0.2s var(--sd-spring), box-shadow 0.2s; }
.fr-blip:hover .fr-dot, .fr-blip.active .fr-dot { transform: scale(1.55); box-shadow: 0 0 16px var(--bc), 0 0 0 5px color-mix(in srgb, var(--bc) 26%, transparent); }
.fr-stem { position: absolute; top: 50%; width: 1px; height: 16px; background: color-mix(in srgb, var(--bc) 40%, transparent); }
.fr-blip.over .fr-dot { animation: sf-blip-pulse 1.4s ease-in-out infinite; animation-delay: var(--d); }
.fr-axis { position: absolute; left: 0; right: 0; bottom: 5px; display: flex; justify-content: space-between; padding: 0 10px;
  font-size: 8px; color: var(--sd-text-dim); pointer-events: none; }
.fr-empty { position: absolute; inset: 0; display: grid; place-items: center; margin: 0; font-size: 12.5px; color: var(--sd-text-muted); padding: 0 16px; text-align: center; }

/* ── ledger ── */
.sf-ledger { padding: 16px 18px; }
.lg-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 10px; }
.lg-head h3 { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--sd-text); margin: 0; }
.lg-head h3 svg { color: var(--sd-amber); }
.lg-count { font-size: 11px; font-weight: 800; padding: 1px 8px; border-radius: 999px; background: var(--sd-amber-soft); color: var(--sd-amber); }
.lg-head-r { display: inline-flex; align-items: center; gap: 10px; }
.lg-filter { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; cursor: pointer; padding: 3px 9px; border-radius: 999px;
  color: var(--sd-amber); background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); }
.lg-filter:hover { color: var(--sd-text); }
.lg-live { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--sd-danger); }
.lg-live i { width: 7px; height: 7px; border-radius: 50%; background: var(--sd-danger); animation: sf-pulse 1.6s ease-in-out infinite; }
.lg-rows { display: flex; flex-direction: column; }
.lg-row { display: grid; grid-template-columns: minmax(190px, 1.4fr) 104px minmax(108px, 1fr) minmax(96px, 1fr) 152px 120px; align-items: center; gap: 12px;
  padding: 11px 12px; border-radius: 12px; text-align: left; cursor: pointer; background: transparent; border: 1px solid transparent;
  transition: background 0.18s, border-color 0.18s, transform 0.18s var(--sd-spring); }
.lg-row:not(.lg-row--head) { animation: lg-deal 0.42s var(--sd-spring) both; animation-delay: calc(var(--i, 0) * 0.035s); }
.lg-row:not(.lg-row--head):hover { background: var(--sd-surface-glass); border-color: var(--sd-border-strong); transform: translateX(2px); }
.lg-row--head { cursor: default; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--sd-text-dim); padding-bottom: 6px; }
/* over/soon = a SUBTLE left-edge tint that fades out (no full-row flood — keeps text + bars readable) */
.lg-row.over { background: linear-gradient(90deg, color-mix(in srgb, var(--sd-danger) 13%, transparent), transparent 58%); }
.lg-row.over:hover { background: linear-gradient(90deg, color-mix(in srgb, var(--sd-danger) 18%, transparent), var(--sd-surface-glass) 70%); }
.lg-row.soon { background: linear-gradient(90deg, color-mix(in srgb, var(--sd-warning) 10%, transparent), transparent 55%); }
.lg-row.soon:hover { background: linear-gradient(90deg, color-mix(in srgb, var(--sd-warning) 15%, transparent), var(--sd-surface-glass) 70%); }

.lg-tk { position: relative; display: flex; flex-direction: column; gap: 3px; min-width: 0; padding-left: 12px; }
.lg-spine { position: absolute; left: 0; top: 1px; bottom: 1px; width: 3px; border-radius: 2px; background: var(--pc); }
.lg-row.over .lg-spine { background: var(--sd-danger); box-shadow: 0 0 8px color-mix(in srgb, var(--sd-danger) 70%, transparent); }
.lg-tk-top { display: inline-flex; align-items: center; gap: 7px; }
.lg-tk-top b { font-size: 12px; color: var(--sd-amber); }
.lg-pcode { font-style: normal; font-size: 9px; font-weight: 800; letter-spacing: 0.04em; padding: 1px 5px; border-radius: 5px;
  color: var(--p2); background: color-mix(in srgb, var(--p2) 15%, transparent); border: 1px solid color-mix(in srgb, var(--p2) 35%, transparent); }
.lg-esc { display: grid; place-items: center; color: var(--sd-st-escalated); }
.lg-tk small { font-size: 12.5px; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.lg-status { min-width: 0; }
.lg-stpill { display: inline-flex; align-items: center; gap: 5px; max-width: 100%; font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: 999px;
  color: var(--stc); background: color-mix(in srgb, var(--stc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--stc) 30%, transparent);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lg-stpill i { width: 5px; height: 5px; border-radius: 50%; background: var(--stc); flex-shrink: 0; }

.lg-cust, .lg-ag { font-size: 12px; color: var(--sd-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lg-ag.unassigned { color: var(--sd-text-dim); font-style: italic; }

/* SLA consumption bar (replaces the tiny ring — reads at row scale + no color clash) */
.lg-sla { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.lg-track { position: relative; height: 7px; border-radius: 999px; overflow: hidden; background: color-mix(in srgb, var(--sd-text-dim) 20%, transparent); --tc: var(--sd-success); }
.lg-track.soon { --tc: var(--sd-warning); } .lg-track.over { --tc: var(--sd-danger); }
.lg-fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 999px; min-width: 4px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--tc) 55%, transparent), var(--tc)); box-shadow: 0 0 8px color-mix(in srgb, var(--tc) 45%, transparent);
  transition: width 0.7s var(--sd-spring); }
.lg-comet { position: absolute; right: -1px; top: 50%; transform: translateY(-50%); width: 6px; height: 6px; border-radius: 50%; background: var(--tc); box-shadow: 0 0 9px var(--tc); }
.lg-track.over .lg-comet { animation: sf-pulse 1.1s ease-in-out infinite; }
.lg-sla-meta { display: inline-flex; align-items: baseline; gap: 6px; font-size: 10px; }
.lg-sla-meta b { font-family: var(--sd-mono); font-weight: 800; color: var(--sd-text-secondary); }
.lg-sla-meta em { font-style: normal; font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--sd-text-dim); }

.lg-rem { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.lg-rem-t { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 800; color: var(--sd-text-secondary); font-variant-numeric: tabular-nums; }
.lg-rem.soon .lg-rem-t { color: var(--sd-warning); } .lg-rem.over .lg-rem-t { color: var(--sd-danger); }
.lg-due { font-size: 9.5px; color: var(--sd-text-dim); font-family: var(--sd-mono); white-space: nowrap; }
.ta-r { text-align: right; justify-self: end; }
.lg-empty { text-align: center; color: var(--sd-text-dim); font-size: 13px; padding: 28px; margin: 0; }

/* ── frontier hover tooltip ── */
.fr-tip { position: fixed; z-index: 6200; padding: 13px 14px; border-radius: 16px; pointer-events: none; overflow: hidden;
  background: var(--sd-surface-elevated); border: 1px solid var(--sd-border-strong); box-shadow: var(--sd-shadow-hover);
  backdrop-filter: blur(22px) saturate(160%); -webkit-backdrop-filter: blur(22px) saturate(160%); }
.fr-tip.over { border-color: color-mix(in srgb, var(--sd-danger) 40%, var(--sd-border-strong)); }
.fr-tip.soon { border-color: color-mix(in srgb, var(--sd-warning) 38%, var(--sd-border-strong)); }
.tip-aura { position: absolute; top: -40px; right: -30px; width: 130px; height: 130px; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, var(--sd-amber-soft), transparent 68%); filter: blur(16px); }
.fr-tip.over .tip-aura { background: radial-gradient(circle, color-mix(in srgb, var(--sd-danger) 22%, transparent), transparent 68%); }
.fr-tip.soon .tip-aura { background: radial-gradient(circle, color-mix(in srgb, var(--sd-warning) 22%, transparent), transparent 68%); }
.tip-head { position: relative; display: flex; align-items: center; gap: 8px; }
.tip-p { font-style: normal; font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 5px; color: var(--p2);
  background: color-mix(in srgb, var(--p2) 16%, transparent); border: 1px solid color-mix(in srgb, var(--p2) 38%, transparent); }
.tip-head b { font-family: var(--sd-mono); font-size: 11.5px; font-weight: 700; color: var(--sd-amber); }
.tip-zone { margin-left: auto; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; padding: 2px 7px; border-radius: 999px; }
.tip-zone.over { color: var(--sd-danger); background: var(--sd-danger-soft); }
.tip-zone.soon { color: var(--sd-warning); background: var(--sd-warning-soft); }
.tip-zone.safe { color: var(--sd-success); background: var(--sd-success-soft); }
.tip-subj { position: relative; margin: 9px 0 10px; font-size: 13px; font-weight: 650; line-height: 1.35; color: var(--sd-text);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.tip-meta { position: relative; display: flex; flex-direction: column; gap: 5px; margin-bottom: 11px; }
.tip-meta span { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--sd-text-secondary); }
.tip-meta svg { color: var(--sd-text-muted); flex-shrink: 0; }
.tip-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.tip-track { position: relative; height: 6px; border-radius: 999px; overflow: hidden; margin-bottom: 9px;
  background: color-mix(in srgb, var(--sd-text-dim) 22%, transparent); --tc: var(--sd-success); }
.tip-track.soon { --tc: var(--sd-warning); } .tip-track.over { --tc: var(--sd-danger); }
.tip-track i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 999px; background: var(--tc); box-shadow: 0 0 8px color-mix(in srgb, var(--tc) 50%, transparent); }
.tip-foot { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.tip-clock { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--sd-text-dim); }
.tip-eta { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 800; color: var(--sd-text); }
.tip-eta.over { color: var(--sd-danger); } .tip-eta.soon { color: var(--sd-warning); } .tip-eta.safe { color: var(--sd-success); }
.tip-cta { position: relative; display: block; margin-top: 9px; padding-top: 9px; border-top: 1px solid var(--sd-border); font-size: 10px; font-weight: 700; color: var(--sd-amber); text-align: center; }

@keyframes sf-rotate { to { transform: rotate(360deg); } }
@keyframes sf-sheen { 0% { transform: translateX(-130%) skewX(-18deg); } 100% { transform: translateX(260%) skewX(-18deg); } }
@keyframes sf-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
@keyframes sf-blip-pulse { 0%, 100% { transform: scale(1); box-shadow: 0 0 10px var(--bc), 0 0 0 3px color-mix(in srgb, var(--bc) 20%, transparent); }
  50% { transform: scale(1.18); box-shadow: 0 0 16px var(--bc), 0 0 0 6px color-mix(in srgb, var(--bc) 0%, transparent); } }
@keyframes lg-deal { from { opacity: 0; transform: translateY(9px); } to { opacity: 1; transform: none; } }

@media (max-width: 1100px) {
  .lg-row { grid-template-columns: minmax(170px, 1.4fr) minmax(100px, 1fr) 150px 120px; }
  .lg-status, .lg-cust,
  .lg-row--head span:nth-child(2), .lg-row--head span:nth-child(3) { display: none; }
}
@media (max-width: 900px) { .sf-band { grid-template-columns: 1fr; } .sf-states { grid-template-columns: 1fr; } }
@media (max-width: 720px) {
  .lg-row { grid-template-columns: 1fr 120px; }
  .lg-ag, .lg-sla,
  .lg-row--head span:nth-child(4), .lg-row--head span:nth-child(5) { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .g-sweep,
  html:not([data-cinematic="on"]) .st-live i,
  html:not([data-cinematic="on"]) .lg-live i,
  html:not([data-cinematic="on"]) .lg-row:not(.lg-row--head),
  html:not([data-cinematic="on"]) .lg-track.over .lg-comet,
  html:not([data-cinematic="on"]) .fr-blip.over .fr-dot { animation: none; }
  html:not([data-cinematic="on"]) .g-ring,
  html:not([data-cinematic="on"]) .lg-fill { transition: none; }
}
</style>
