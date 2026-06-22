<template>
  <div class="tts-shell" :style="{ '--i': index }">
    <article ref="cardEl" class="tts" :class="{ urgent, busy, decided: !!decided, [decidedTone]: !!decided }">
      <span class="tts-glare" aria-hidden="true" />
      <span class="tts-spine" aria-hidden="true" />

      <!-- decided wash + ink stamp -->
      <Transition name="tts-stamp">
        <div v-if="decided" class="tts-decided" :style="{ '--c': decidedMeta.hex }" aria-hidden="true">
          <span class="tts-stamp-mark trv-mono">{{ decidedMeta.stamp }}</span>
        </div>
      </Transition>

      <!-- header -->
      <header class="tts-head">
        <div class="tts-id">
          <span class="tts-ref trv-mono">{{ req.travel_reference_number }}</span>
          <span class="tts-squad">
            <Gavel :size="11" /> Awaiting your clearance
          </span>
        </div>
        <div class="tts-tags">
          <span v-if="multiCity" class="tts-mc"><Route :size="11" /> {{ legs }} legs</span>
          <span v-if="urgent" class="tts-pri" :style="{ '--c': priColor }"><Flame :size="11" /> {{ req.priority }}</span>
          <span class="tts-wait trv-mono" :class="{ aging }"><Timer :size="11" /> {{ waitLabel }}</span>
        </div>
      </header>

      <!-- flight path -->
      <div class="tts-route">
        <div class="r-end">
          <span class="r-code trv-mono">{{ code(req.from_location) }}</span>
          <span class="r-place">{{ req.from_location }}</span>
          <span class="r-date trv-mono">{{ fmtDate(req.departure_date) }}</span>
        </div>
        <div class="r-arc">
          <svg viewBox="0 0 240 54" preserveAspectRatio="none" class="arc-svg">
            <path class="arc-track" d="M14,44 Q120,2 226,44" />
            <path class="arc-flow" d="M14,44 Q120,2 226,44" />
          </svg>
          <span class="r-plane"><Plane :size="15" /></span>
          <span class="r-days trv-mono">{{ req.num_days }}d</span>
        </div>
        <div class="r-end right">
          <span class="r-code trv-mono">{{ code(req.to_location) }}</span>
          <span class="r-place">{{ req.to_location }}</span>
          <span class="r-date trv-mono">{{ fmtDate(req.return_date) }}</span>
        </div>
      </div>

      <!-- multi-city hop chain (the from→to envelope above is misleading for multi-city) -->
      <div v-if="multiCity && mcSummary" class="tts-mcroute">
        <Route :size="12" />
        <span class="mcr-path trv-mono">{{ mcSummary }}</span>
      </div>

      <!-- traveller + cost -->
      <div class="tts-meta">
        <span class="m-emp"><span class="m-avatar">{{ initials }}</span>{{ req.employee_name || '—' }}</span>
        <span class="m-type">{{ req.travel_type || 'Official Tour' }}</span>
        <span class="m-cost trv-mono">{{ fmtINR(req.est_total_cost) }}</span>
      </div>

      <!-- inline cost-spread micro bar -->
      <div v-if="costSegs.length" class="tts-costbar">
        <span v-for="s in costSegs" :key="s.key" class="cb-seg" :style="{ width: s.pct + '%', background: s.hex }" :title="`${s.label}: ${fmtINR(s.val)}`" />
      </div>

      <!-- approval chain -->
      <ApprovalRunway :req="req" compact />

      <!-- where it goes after you -->
      <div class="tts-next">
        <component :is="nextStop.ico" :size="13" />
        <span>{{ nextStop.text }}</span>
      </div>

      <!-- expandable detail (built from the inline queue payload — no extra fetch) -->
      <div class="tts-more-wrap" :class="{ open }">
        <div class="tts-more">
          <div class="tts-more-inner">
            <p v-if="req.purpose" class="md-purpose">{{ req.purpose }}</p>

            <!-- multi-city route legs -->
            <div v-if="multiCity && legsList.length" class="md-legs">
              <span class="md-legs-head"><Route :size="12" /> Route · {{ legsList.length }} legs</span>
              <div v-for="(lg, i) in legsList" :key="i" class="md-leg">
                <span class="ml-ix trv-mono">{{ i + 1 }}</span>
                <span class="ml-route"><b class="trv-mono">{{ code(lg.from_location) }}</b> <component :is="legModeMeta(lg.mode).icon" :size="12" class="ml-mode" /> <b class="trv-mono">{{ code(lg.to_location) }}</b></span>
                <span class="ml-place">{{ lg.from_location }} → {{ lg.to_location }} · {{ legModeMeta(lg.mode).short }}</span>
                <span class="ml-date trv-mono">{{ fmtDate(lg.departure_date) }}</span>
              </div>
            </div>

            <div v-if="costSegs.length" class="md-legend">
              <span v-for="s in costSegs" :key="s.key + 'l'" class="md-cl"><i :style="{ background: s.hex }" />{{ s.label }} <b class="trv-mono">{{ fmtINR(s.val) }}</b></span>
            </div>

            <div v-if="logistics.length" class="md-chips">
              <span v-for="l in logistics" :key="l.key" class="md-chip"><component :is="l.icon" :size="12" /> {{ l.label }}</span>
            </div>

            <div class="md-facts">
              <div class="md-fact"><span>Department</span><b>{{ req.department || '—' }}</b></div>
              <div class="md-fact"><span>City tier</span><b>{{ cityMeta(req.to_city_category).label }}</b></div>
              <div v-if="req.project_name" class="md-fact"><span>Project</span><b>{{ req.project_name }}</b></div>
              <div v-if="req.cost_center" class="md-fact"><span>Cost center</span><b>{{ req.cost_center }}</b></div>
            </div>

            <div v-if="req.advance" class="md-line">
              <Coins :size="13" /> <span>Advance requested</span>
              <b class="trv-mono">{{ fmtINR(req.advance.approved_amount || req.advance.advance_amount) }}</b>
            </div>
            <div v-if="bookingCount" class="md-line">
              <Ticket :size="13" /> <span>{{ bookingCount }} booking{{ bookingCount === 1 ? '' : 's' }} attached</span>
              <b class="trv-mono">{{ fmtINR(bookedTotal) }}</b>
            </div>
          </div>
        </div>
      </div>

      <!-- actions -->
      <div class="tts-actions">
        <button class="mini ghost" @click="open = !open">
          <component :is="open ? ChevronUp : ChevronDown" :size="13" /> {{ open ? 'Hide' : 'Details' }}
        </button>
        <span class="tts-spacer" />
        <Motion as="button" class="mini ok" :disabled="busy"
          :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="$emit('approve', req)">
          <Loader2 v-if="busy" :size="13" class="spin" /><Check v-else :size="13" /> Approve
        </Motion>
        <Motion as="button" class="mini primary" :disabled="busy"
          :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="$emit('review', req)">
          <Gavel :size="13" /> Decide
        </Motion>
      </div>
    </article>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import {
  Plane, Gavel, Flame, Timer, Check, Loader2, ChevronDown, ChevronUp,
  Coins, Ticket, TrainFront, Hotel, Car, Wallet, ArrowRight, PlaneTakeoff, Route,
} from 'lucide-vue-next'
import ApprovalRunway from '../components/ApprovalRunway.vue'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import {
  fmtINR, fmtDate, airportCode, priorityMeta, cityMeta, runwayStateFor, isMultiCity, legCount,
  tripLegs, routeSummary, legModeMeta,
} from '@/composables/useTravel'

const props = defineProps({
  req: { type: Object, required: true },
  index: { type: Number, default: 0 },
  busy: { type: Boolean, default: false },
  decided: { type: String, default: null },   // 'APPROVED' | 'RETURNED' | 'REJECTED' | null
})
defineEmits(['review', 'approve'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)

const open = ref(false)
const code = (l) => airportCode(l)
const urgent = computed(() => ['HIGH', 'URGENT'].includes(props.req.priority))
const priColor = computed(() => priorityMeta(props.req.priority).hex)
const multiCity = computed(() => isMultiCity(props.req))
const legs = computed(() => legCount(props.req))
const legsList = computed(() => (multiCity.value ? tripLegs(props.req) : []))
const mcSummary = computed(() => (multiCity.value ? routeSummary(props.req) : ''))
const initials = computed(() => (props.req.employee_name || '·').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase())

const hoursOld = computed(() => {
  const t = props.req.submitted_at || props.req.created_at
  if (!t) return 0
  const h = (Date.now() - new Date(t).getTime()) / 3.6e6
  return h > 0 ? h : 0
})
const aging = computed(() => hoursOld.value >= 48)
const waitLabel = computed(() => {
  const h = hoursOld.value
  if (h < 1) return 'just now'
  if (h < 24) return `${Math.floor(h)}h in queue`
  return `${Math.floor(h / 24)}d in queue`
})

const DECIDED = {
  APPROVED: { stamp: 'CLEARED', hex: '#34d399', tone: 'tone-ok' },
  RETURNED: { stamp: 'HELD', hex: '#f59e0b', tone: 'tone-hold' },
  REJECTED: { stamp: 'DENIED', hex: '#ef4444', tone: 'tone-deny' },
}
const decidedMeta = computed(() => DECIDED[props.decided] || DECIDED.APPROVED)
const decidedTone = computed(() => decidedMeta.value.tone)

const costSegs = computed(() => {
  const r = props.req
  const segs = [
    { key: 'travel', label: 'Travel', val: Number(r.est_travel_cost || 0), hex: '#fbbf24' },
    { key: 'hotel', label: 'Hotel', val: Number(r.est_accommodation_cost || 0), hex: '#fb923c' },
    { key: 'local', label: 'Local', val: Number(r.est_local_cost || 0), hex: '#f59e0b' },
    { key: 'food', label: 'Food', val: Number(r.est_food_cost || 0), hex: '#fcd34d' },
    { key: 'misc', label: 'Misc', val: Number(r.est_misc_cost || 0), hex: '#a3a3a3' },
  ].filter(s => s.val > 0)
  const total = segs.reduce((a, s) => a + s.val, 0) || 1
  return segs.map(s => ({ ...s, pct: (s.val / total) * 100 }))
})

const ALL_LOGISTICS = [
  { key: 'flight_required', label: 'Flight', icon: Plane },
  { key: 'train_required', label: 'Train', icon: TrainFront },
  { key: 'hotel_required', label: 'Hotel', icon: Hotel },
  { key: 'local_transport_required', label: 'Local', icon: Car },
  { key: 'advance_required', label: 'Advance', icon: Wallet },
]
const logistics = computed(() => ALL_LOGISTICS.filter(l => props.req[l.key]))
const bookingCount = computed(() => (props.req.bookings || []).length)
const bookedTotal = computed(() => (props.req.bookings || []).reduce((a, b) => a + Number(b.total_cost || 0), 0))

const nextStop = computed(() => {
  const steps = props.req.approval_steps || []
  const cur = Number(props.req.current_step || 0)
  const next = steps.slice(cur + 1).find(s => s.decision == null && s.approver_type)
  if (next) {
    const label = next.label || (runwayStateFor(props.req)[steps.indexOf(next)]?.typeLabel) || next.approver_type
    return { ico: ArrowRight, text: `After you, advances to ${label}` }
  }
  return { ico: PlaneTakeoff, text: 'You are the final gate — approval clears it for takeoff' }
})
</script>

<style scoped>
/* Entrance fade-in. The hidden start state is driven by the animation's fill-mode
   (not a standalone `opacity: 0`) and the timing function carries a literal fallback,
   so if travel-theme.css (which defines --trv-spring + the trv-deal keyframe) hasn't
   loaded yet — the lazy scoped @import races card mount — the card falls back to
   VISIBLE instead of being stranded invisible. */
.tts-shell { animation: trv-deal 0.5s var(--trv-spring, cubic-bezier(0.16, 1, 0.3, 1)) both; animation-delay: calc(var(--i) * 0.05s); }
.tts {
  position: relative; overflow: hidden; padding: 16px 18px 14px 22px; border-radius: 18px;
  background: var(--trv-surface); border: 1px solid var(--trv-amber-border);
  box-shadow: var(--trv-card-shadow);
  transition: transform 0.4s var(--trv-spring), box-shadow 0.4s var(--trv-spring), border-color 0.3s, opacity 0.3s;
  transform: perspective(1200px)
    rotateX(calc((var(--my, 0.5) - 0.5) * -5deg))
    rotateY(calc((var(--mx, 0.5) - 0.5) * 7deg));
}
.tts:hover {
  box-shadow: var(--trv-shadow-hover); border-color: var(--trv-amber);
  transform: perspective(1200px) rotateX(calc((var(--my, 0.5) - 0.5) * -5deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 7deg)) translateY(-3px);
}
.tts.busy { opacity: 0.7; }
.tts.decided { pointer-events: none; }
.tts-glare {
  position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 6;
  opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(380px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), rgba(251, 191, 36, 0.14), transparent 60%);
}
.tts-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--trv-grad-hero); box-shadow: 0 0 14px rgba(251, 191, 36, 0.5); }
.tts.urgent .tts-spine { background: linear-gradient(to bottom, var(--trv-st-rejected), var(--trv-ember)); }

/* decided wash + stamp */
.tts-decided {
  position: absolute; inset: 0; z-index: 7; display: grid; place-items: center; border-radius: inherit;
  background: color-mix(in srgb, var(--c) 16%, var(--trv-surface-glass));
  backdrop-filter: blur(2px);
}
.tts-stamp-mark {
  font-size: 30px; font-weight: 850; letter-spacing: 0.1em; color: var(--c); text-transform: uppercase;
  padding: 6px 18px; border: 3px solid var(--c); border-radius: 10px; transform: rotate(-13deg);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--c) 30%, transparent) inset, 0 8px 30px -8px var(--c);
}
.tts-stamp-enter-active { transition: opacity 0.3s ease; }
.tts-stamp-enter-active .tts-stamp-mark { animation: tts-press 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
.tts-stamp-enter-from { opacity: 0; }
@keyframes tts-press { 0% { transform: rotate(-30deg) scale(1.7); opacity: 0; } 100% { transform: rotate(-13deg) scale(1); opacity: 1; } }
.tts.tone-ok { border-color: color-mix(in srgb, #34d399 50%, transparent); }
.tts.tone-hold { border-color: color-mix(in srgb, #f59e0b 50%, transparent); }
.tts.tone-deny { border-color: color-mix(in srgb, #ef4444 50%, transparent); }

/* header */
.tts-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.tts-id { display: flex; flex-direction: column; gap: 5px; }
.tts-ref { font-size: 12px; font-weight: 700; color: var(--trv-amber-bright); }
.tts-squad { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 750; letter-spacing: 0.04em; text-transform: uppercase; padding: 3px 8px; border-radius: 999px; width: fit-content; color: var(--trv-amber); background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.tts-tags { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
.tts-pri { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 750; color: var(--c); padding: 3px 8px; border-radius: 999px; background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 32%, transparent); }
.tts-wait { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; color: var(--trv-text-dim); }
.tts-wait.aging { color: var(--trv-st-returned); font-weight: 700; }
.tts-mc { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; color: var(--trv-ember); padding: 3px 8px; border-radius: 999px; background: color-mix(in srgb, var(--trv-ember) 14%, transparent); border: 1px solid color-mix(in srgb, var(--trv-ember) 30%, transparent); }

/* route */
.tts-route { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px; margin: 14px 0 12px; }
.r-end { display: flex; flex-direction: column; gap: 1px; } .r-end.right { align-items: flex-end; text-align: right; }
.r-code { font-size: 22px; font-weight: 850; color: var(--trv-text); line-height: 1; }
.r-place { font-size: 10px; color: var(--trv-text-muted); max-width: 92px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.r-date { font-size: 9.5px; color: var(--trv-text-dim); }
.r-arc { position: relative; height: 46px; }
.arc-svg { width: 100%; height: 100%; overflow: visible; }
.arc-track { fill: none; stroke: var(--trv-border-strong); stroke-width: 1.5; stroke-dasharray: 3 5; }
.arc-flow { fill: none; stroke: var(--trv-amber); stroke-width: 1.6; stroke-dasharray: 5 9; stroke-linecap: round; opacity: 0.85; animation: tts-flow 1.4s linear infinite; }
@keyframes tts-flow { to { stroke-dashoffset: -28; } }
.r-plane { position: absolute; left: 50%; top: -2px; transform: translateX(-50%); color: var(--trv-amber-bright); filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.6)); }
.r-days { position: absolute; left: 50%; bottom: -2px; transform: translateX(-50%); font-size: 9.5px; color: var(--trv-text-muted); background: var(--trv-surface); padding: 0 5px; border-radius: 4px; }

/* multi-city hop chain */
.tts-mcroute { display: flex; align-items: center; gap: 7px; margin: -4px 0 12px; padding: 6px 10px; border-radius: 9px; background: color-mix(in srgb, var(--trv-ember) 9%, transparent); border: 1px solid color-mix(in srgb, var(--trv-ember) 22%, transparent); }
.tts-mcroute svg { color: var(--trv-ember); flex-shrink: 0; }
.mcr-path { font-size: 11.5px; font-weight: 700; letter-spacing: 0.02em; color: var(--trv-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }

/* multi-city legs (expanded detail) */
.md-legs { display: flex; flex-direction: column; gap: 7px; }
.md-legs-head { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 750; letter-spacing: 0.06em; text-transform: uppercase; color: var(--trv-ember); }
.md-leg { display: grid; grid-template-columns: 22px auto 1fr auto; align-items: center; gap: 9px; padding: 7px 10px; border-radius: 10px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.ml-ix { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; font-size: 10px; font-weight: 800; color: #1a1205; background: var(--trv-grad-hero); }
.ml-route { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: var(--trv-text); }
.ml-route .ml-mode { color: var(--trv-amber); }
.ml-place { font-size: 10.5px; color: var(--trv-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.ml-date { font-size: 10.5px; color: var(--trv-text-secondary); white-space: nowrap; }

/* meta */
.tts-meta { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-top: 1px solid var(--trv-border); border-bottom: 1px solid var(--trv-border); }
.m-emp { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 650; color: var(--trv-text-secondary); min-width: 0; }
.m-emp { overflow: hidden; }
.m-avatar { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; font-size: 9px; font-weight: 800; color: #1a1205; background: var(--trv-grad-hero); flex-shrink: 0; }
.m-type { font-size: 11px; color: var(--trv-text-muted); padding: 2px 8px; border-radius: 6px; background: var(--trv-panel); white-space: nowrap; }
.m-cost { margin-left: auto; font-size: 14px; font-weight: 800; color: var(--trv-amber); }

/* cost micro bar */
.tts-costbar { display: flex; height: 5px; border-radius: 999px; overflow: hidden; background: var(--trv-steel-soft); margin: 10px 0 4px; }
.cb-seg { height: 100%; }

/* next stop */
.tts-next { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 600; color: var(--trv-text-muted); margin: 8px 0 2px; padding: 7px 10px; border-radius: 9px; background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.tts-next svg { color: var(--trv-amber); flex-shrink: 0; }

/* expandable detail */
.tts-more-wrap { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.4s var(--trv-spring); }
.tts-more-wrap.open { grid-template-rows: 1fr; }
.tts-more { overflow: hidden; }
.tts-more-inner { display: flex; flex-direction: column; gap: 10px; padding-top: 12px; }
.md-purpose { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--trv-text-secondary); }
.md-legend { display: flex; flex-wrap: wrap; gap: 7px 14px; }
.md-cl { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--trv-text-muted); }
.md-cl i { width: 8px; height: 8px; border-radius: 2px; } .md-cl b { color: var(--trv-text-secondary); }
.md-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.md-chip { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 8px; font-size: 11px; color: var(--trv-amber); background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.md-facts { display: grid; grid-template-columns: 1fr 1fr; gap: 9px 14px; }
.md-fact { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.md-fact span { font-size: 9px; letter-spacing: 0.07em; text-transform: uppercase; color: var(--trv-text-dim); }
.md-fact b { font-size: 12px; color: var(--trv-text-secondary); font-weight: 650; word-break: break-word; }
.md-line { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--trv-text-secondary); padding: 8px 10px; border-radius: 9px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.md-line svg { color: var(--trv-amber); } .md-line b { margin-left: auto; color: var(--trv-text); }

/* actions */
.tts-actions { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
.tts-spacer { flex: 1; }
.mini { display: inline-flex; align-items: center; gap: 5px; padding: 7px 13px; border-radius: 9px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.mini:disabled { opacity: 0.55; cursor: default; }
.mini.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.mini.ghost:hover { color: var(--trv-text); border-color: var(--trv-text-dim); }
.mini.ok { background: var(--trv-st-approved-soft); color: var(--trv-st-approved); border-color: color-mix(in srgb, var(--trv-st-approved) 34%, transparent); }
.mini.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .tts-shell { animation: none; opacity: 1; }
  .tts { transform: none; } .tts:hover { transform: translateY(-3px); }
  .arc-flow { animation: none; }
  .tts-stamp-enter-active .tts-stamp-mark { animation: none; }
}
@media (max-width: 560px) {
  .r-place { max-width: 64px; }
  .md-facts { grid-template-columns: 1fr; }
  .md-leg { grid-template-columns: 22px auto 1fr; }
  .md-leg .ml-place { display: none; }
}
</style>
