<template>
  <div class="fb">
    <!-- boot shimmer -->
    <div v-if="loading && !teams.length" class="fb-grid" aria-hidden="true">
      <div v-for="i in 6" :key="i" class="fb-skel" :style="{ '--i': i }">
        <span class="sk-line w40" /><span class="sk-line w70" /><span class="sk-ring" /><span class="sk-line w90" />
      </div>
    </div>

    <div v-else class="fb-grid">
      <div v-for="(t, i) in teams" :key="t.id" class="fb-shell"
        :class="{ dim: !matches(t), off: !t.is_active }" :style="{ '--i': i, '--tc': t.color || 'var(--sd-team-core)' }">
        <div class="fb-card" :class="{ on: activeTeam === t.id }" role="button" tabindex="0"
          :aria-label="`Open ${t.name}`"
          @pointermove="tilt($event)" @pointerleave="untilt($event)"
          @click="$emit('open', t)" @keydown.enter="$emit('open', t)">
          <span class="fb-spine" aria-hidden="true" />
          <span class="fb-glare" aria-hidden="true" />

          <!-- header -->
          <div class="fb-head">
            <div class="fb-idw">
              <span class="fb-name">{{ t.name }}</span>
              <span v-if="t.code" class="fb-code sd-mono">{{ t.code }}</span>
              <span v-if="!t.is_active" class="fb-inactive">INACTIVE</span>
            </div>
            <button class="fb-edit" title="Edit team" @click.stop="$emit('edit', t)"><Pencil :size="12" /></button>
          </div>
          <p class="fb-lead"><Crown :size="11" /> {{ t.lead_name || 'No lead' }}
            <span v-if="t.auto_assign" class="fb-auto"><Zap :size="10" /> {{ t.assignment_method === 'load_balanced' ? 'load-balanced' : 'round-robin' }}</span>
          </p>

          <!-- instruments row: load ring · coverage clock · flow spark -->
          <div class="fb-instruments">
            <div class="fb-ringw" :title="`${t.open} active of ~${capacity(t)} comfortable capacity`">
              <svg viewBox="0 0 64 64" class="fb-ring" aria-hidden="true">
                <circle class="rg-track" cx="32" cy="32" r="26" />
                <circle class="rg-fill" cx="32" cy="32" r="26"
                  :style="{ stroke: ringColor(t), strokeDashoffset: ringOffset(t) }" />
              </svg>
              <span class="fb-ring-val sd-mono">{{ t.open }}</span>
              <span class="fb-ring-lb">ACTIVE</span>
            </div>

            <div class="fb-clockw" :title="coverageTitle(t)">
              <svg viewBox="0 0 40 40" class="fb-clock" aria-hidden="true">
                <circle class="ck-face" cx="20" cy="20" r="16" />
                <path v-if="hoursArc(t)" class="ck-arc" :d="hoursArc(t)" />
                <line class="ck-hand" x1="20" y1="20" :x2="handX(t)" :y2="handY(t)" />
                <circle class="ck-pin" cx="20" cy="20" r="1.8" />
              </svg>
              <span class="fb-cov" :class="covClass(t)">
                <MoonStar v-if="t.coverage_open === false" :size="9" />
                {{ t.coverage_open === true ? 'ON SHIFT' : t.coverage_open === false ? 'OFF SHIFT' : '24×7' }}
              </span>
            </div>

            <div class="fb-sparkw" title="7-day inflow (gold) vs resolved (green)">
              <svg viewBox="0 0 100 30" class="fb-spark" preserveAspectRatio="none" aria-hidden="true">
                <polygon class="sp-area" :points="areaPts(t)" />
                <polyline class="sp-in" :points="linePts(t, 'inflow')" />
                <polyline class="sp-out" :points="linePts(t, 'outflow')" />
              </svg>
              <span class="fb-spark-lb sd-mono">{{ t.resolved_7d ?? 0 }} shipped · 7d</span>
            </div>
          </div>

          <!-- roster strip -->
          <div class="fb-roster">
            <span v-for="m in (t.members || []).slice(0, 5)" :key="m.id" class="fb-ava" :title="m.name">{{ initials(m.name) }}</span>
            <span v-if="(t.members || []).length > 5" class="fb-ava more">+{{ t.members.length - 5 }}</span>
            <span class="fb-crew sd-mono">{{ t.agent_count ?? 0 }} agent{{ (t.agent_count ?? 0) === 1 ? '' : 's' }}</span>
            <span v-if="t.escalated_in" class="fb-escin" title="Active tickets escalated INTO this team"><Flame :size="10" /> {{ t.escalated_in }} in</span>
          </div>

          <!-- telemetry chips -->
          <div class="fb-chips">
            <span class="fb-chip" :class="{ zero: !t.unassigned }" style="--cc: var(--sd-team-core)"><Inbox :size="10" /> {{ t.unassigned }} unowned</span>
            <span class="fb-chip" :class="{ zero: !t.breached }" style="--cc: var(--sd-team-strain)"><Siren :size="10" /> {{ t.breached }} breached</span>
            <span class="fb-chip" :class="{ zero: !t.due_soon }" style="--cc: var(--sd-team-hi)"><Timer :size="10" /> {{ t.due_soon }} due 4h</span>
            <span class="fb-chip" :class="{ zero: !t.idle }" style="--cc: var(--sd-team-idle)"><Hourglass :size="10" /> {{ t.idle }} idle</span>
          </div>

          <!-- footer readouts -->
          <div class="fb-foot sd-mono">
            <span><i>MTTR</i><b>{{ fmtMin(t.mttr_p50_7d) }}</b></span>
            <span><i>1st REPLY</i><b>{{ fmtMin(t.frt_p50_7d) }}</b></span>
            <span><i>CSAT 30D</i><b :class="{ sync: (t.csat_30d ?? 0) >= 4 }">{{ t.csat_30d != null ? t.csat_30d.toFixed(1) : '—' }}</b></span>
            <span><i>LOAD</i><b>{{ t.load_min ?? 0 }}–{{ t.load_max ?? 0 }}</b></span>
          </div>

          <!-- orphan warning ribbon -->
          <p v-if="!t.agent_count" class="fb-orphan"><AlertTriangle :size="11" />
            No assignable agents — new tickets will strand in this queue.</p>
        </div>
      </div>

      <!-- ghost "raise a crew" card keeps the grid alive -->
      <button class="fb-new" :style="{ '--i': teams.length }" @click="$emit('new')">
        <Plus :size="18" /> <span>Raise a crew</span>
      </button>
    </div>
  </div>
</template>

<script setup>
/* SdTeamFleetBoard — the Team Command fleet: one cinematic card per team (load ring,
   business-hours coverage clock, 7-day flow spark, roster strip, guard ribbons), with
   pointer tilt + spotlight glare on the INNER node (entrance transform stays on the
   shell — the two never share a node). Lens filtering dims non-matching cards instead
   of unmounting them, so the fleet keeps its shape. */
import { Crown, Pencil, Zap, Inbox, Siren, Timer, Hourglass, Flame, MoonStar, AlertTriangle, Plus } from 'lucide-vue-next'

const props = defineProps({
  teams: { type: Array, default: () => [] },          // overview cards (+ merged members[])
  lens: { type: String, default: 'fleet' },
  activeTeam: { type: String, default: null },
  loading: { type: Boolean, default: false },
  now: { type: Number, default: () => Date.now() },
  reduced: { type: Boolean, default: false },
})
defineEmits(['open', 'edit', 'new'])

/* ── lens matching (dims, never unmounts) ── */
const matches = (t) => {
  switch (props.lens) {
    case 'unassigned': return (t.unassigned || 0) > 0
    case 'breached': return (t.breached || 0) > 0
    case 'due_soon': return (t.due_soon || 0) > 0
    case 'idle': return (t.idle || 0) > 0
    case 'uncovered': return t.coverage_open === false && (t.open || 0) > 0
    case 'orphaned': return !(t.agent_count || 0)
    default: return true
  }
}

/* ── load ring (SVG dash — transitions everywhere, no @property needed) ── */
const CIRC = 2 * Math.PI * 26
const capacity = (t) => Math.max((t.agent_count || 0) * 3, 1)
const ratio = (t) => Math.min((t.open || 0) / capacity(t), 1.25)
const ringOffset = (t) => Math.max(CIRC * (1 - ratio(t) / 1.25), 0)
const ringColor = (t) => {
  if (!t.agent_count) return 'var(--sd-team-idle)'
  const r = ratio(t)
  return r >= 1 ? 'var(--sd-team-strain)' : r >= 0.7 ? 'var(--sd-team-core)' : 'var(--sd-team-sync)'
}

/* ── coverage clock (24h dial: hours arc + now hand) ── */
const hhToFrac = (s) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(s || ''))
  return m ? (Number(m[1]) + Number(m[2]) / 60) / 24 : null
}
const polar = (frac, r) => {
  const a = frac * Math.PI * 2 - Math.PI / 2
  return [20 + Math.cos(a) * r, 20 + Math.sin(a) * r]
}
const hoursArc = (t) => {
  const s = hhToFrac(t.business_hours?.start), e = hhToFrac(t.business_hours?.end)
  if (s == null || e == null) return ''
  const [x1, y1] = polar(s, 16), [x2, y2] = polar(e, 16)
  const span = (e - s + 1) % 1
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A 16 16 0 ${span > 0.5 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}
const nowFrac = () => {
  const d = new Date(props.now)
  return (d.getHours() + d.getMinutes() / 60) / 24
}
const handX = () => polar(nowFrac(), 12)[0]
const handY = () => polar(nowFrac(), 12)[1]
const covClass = (t) => t.coverage_open === true ? 'on' : t.coverage_open === false ? 'offed' : ''
const coverageTitle = (t) => {
  const bh = t.business_hours || {}
  return bh.start ? `Business hours ${bh.start}–${bh.end} ${bh.tz || ''}` : 'No business hours set — treated as always on'
}

/* ── 7-day flow spark ── */
const maxFlow = (t) => Math.max(1, ...(t.flow || []).map(b => Math.max(b.inflow || 0, b.outflow || 0)))
const linePts = (t, key) => {
  const f = t.flow || []
  if (!f.length) return '0,28 100,28'
  const mx = maxFlow(t)
  return f.map((b, i) => `${(i / Math.max(f.length - 1, 1)) * 96 + 2},${28 - ((b[key] || 0) / mx) * 24}`).join(' ')
}
const areaPts = (t) => `2,28 ${linePts(t, 'inflow')} 98,28`

/* ── pointer tilt + spotlight (inner node only; entrance lives on the shell) ── */
const tilt = (e) => {
  if (props.reduced || e.pointerType === 'touch') return
  const el = e.currentTarget, r = el.getBoundingClientRect()
  const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height
  el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 4}deg) rotateY(${(px - 0.5) * 5}deg)`
  el.style.setProperty('--mx', `${px * 100}%`)
  el.style.setProperty('--my', `${py * 100}%`)
}
const untilt = (e) => { e.currentTarget.style.transform = '' }

const initials = (n) => (n || 'M').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
const fmtMin = (m) => {
  if (m == null) return '—'
  if (m < 60) return `${Math.round(m)}m`
  if (m < 1440) return `${(m / 60).toFixed(1)}h`
  return `${(m / 1440).toFixed(1)}d`
}
</script>

<style scoped>
.fb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 13px; }

/* entrance on the SHELL (deal-in), tilt on the CARD — never the same node */
.fb-shell { animation: sd-deal 0.5s var(--sd-spring) backwards; animation-delay: calc(var(--i) * 0.05s);
  transition: opacity 0.3s, filter 0.3s; }
.fb-shell.dim { opacity: 0.34; filter: saturate(0.35); }
.fb-shell.off .fb-card { border-style: dashed; }
.fb-card { position: relative; overflow: hidden; height: 100%; display: flex; flex-direction: column; gap: 10px;
  padding: 15px 16px 13px; border-radius: 17px; cursor: pointer;
  border: 1px solid var(--sd-border); background: var(--sd-surface);
  transition: transform 0.25s var(--sd-spring), border-color 0.2s, box-shadow 0.25s; will-change: transform; }
.fb-card:hover { border-color: color-mix(in srgb, var(--tc) 50%, transparent); box-shadow: var(--sd-card-shadow); }
.fb-card.on { border-color: var(--tc); box-shadow: 0 0 0 1px var(--tc); }
.fb-card:focus-visible { outline: 2px solid var(--tc); outline-offset: 2px; }
.fb-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--tc); }
.fb-glare { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.25s;
  background: radial-gradient(360px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, var(--tc) 10%, transparent), transparent 65%); }
.fb-card:hover .fb-glare { opacity: 1; }

.fb-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.fb-idw { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px; min-width: 0; }
.fb-name { font-size: 15px; font-weight: 800; color: var(--sd-text); }
.fb-code { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; color: var(--tc);
  padding: 1px 7px; border-radius: 999px; background: color-mix(in srgb, var(--tc) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--tc) 30%, transparent); }
.fb-inactive { font-size: 9px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-team-idle);
  padding: 2px 7px; border-radius: 999px; border: 1px dashed var(--sd-team-idle); }
.fb-edit { width: 25px; height: 25px; flex: 0 0 25px; display: grid; place-items: center; border-radius: 8px; cursor: pointer;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border); color: var(--sd-text-muted); transition: all 0.15s; }
.fb-edit:hover { color: var(--tc); border-color: color-mix(in srgb, var(--tc) 45%, transparent); }
.fb-lead { display: flex; align-items: center; gap: 6px; margin: -4px 0 0; font-size: 11.5px; color: var(--sd-text-muted); }
.fb-lead :deep(svg) { color: var(--sd-team-core); }
.fb-auto { display: inline-flex; align-items: center; gap: 4px; margin-left: 6px; font-size: 9.5px; font-weight: 700;
  color: var(--sd-team-sync); padding: 1px 8px; border-radius: 999px; background: var(--sd-team-sync-soft);
  border: 1px solid color-mix(in srgb, var(--sd-team-sync) 30%, transparent); }

/* instruments */
.fb-instruments { display: flex; align-items: center; gap: 14px; }
.fb-ringw { position: relative; width: 64px; height: 64px; flex: 0 0 64px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
.fb-ring { position: absolute; inset: 0; transform: rotate(-90deg); }
.rg-track { fill: none; stroke: var(--sd-border); stroke-width: 5; }
.rg-fill { fill: none; stroke-width: 5; stroke-linecap: round; stroke-dasharray: 163.36;
  transition: stroke-dashoffset 0.9s var(--sd-ease), stroke 0.4s; }
.fb-ring-val { font-size: 15px; font-weight: 800; color: var(--sd-text); line-height: 1; }
.fb-ring-lb { font-size: 6.5px; font-weight: 800; letter-spacing: 0.1em; color: var(--sd-text-dim);
  line-height: 1; white-space: nowrap; }
.fb-clockw { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 0 0 auto; }
.fb-clock { width: 40px; height: 40px; }
.ck-face { fill: none; stroke: var(--sd-border); stroke-width: 1.6; stroke-dasharray: 2 3; }
.ck-arc { fill: none; stroke: var(--sd-team-core); stroke-width: 3; stroke-linecap: round; opacity: 0.85; }
.ck-hand { stroke: var(--sd-text-secondary); stroke-width: 1.6; stroke-linecap: round; }
.ck-pin { fill: var(--sd-team-core); }
.fb-cov { display: inline-flex; align-items: center; gap: 4px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em;
  color: var(--sd-team-sync); }
.fb-cov.offed { color: var(--sd-team-idle); }
.fb-sparkw { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.fb-spark { width: 100%; height: 30px; }
.sp-area { fill: color-mix(in srgb, var(--sd-team-core) 10%, transparent); stroke: none; }
.sp-in { fill: none; stroke: var(--sd-team-core); stroke-width: 1.6; stroke-linejoin: round; }
.sp-out { fill: none; stroke: var(--sd-team-sync); stroke-width: 1.6; stroke-linejoin: round; stroke-dasharray: 3 2; }
.fb-spark-lb { font-size: 9.5px; color: var(--sd-text-dim); }

/* roster */
.fb-roster { display: flex; align-items: center; gap: 5px; }
.fb-ava { width: 22px; height: 22px; display: grid; place-items: center; border-radius: 50%;
  font-size: 8.5px; font-weight: 800; color: var(--sd-team-deep); background: var(--sd-team-soft);
  border: 1px solid var(--sd-team-brd); margin-right: -7px; }
.fb-ava.more { background: var(--sd-surface-glass); color: var(--sd-text-muted); border-color: var(--sd-border-strong); }
.fb-crew { margin-left: 13px; font-size: 10.5px; color: var(--sd-text-muted); }
.fb-escin { display: inline-flex; align-items: center; gap: 4px; margin-left: auto; font-size: 10px; font-weight: 700;
  color: var(--sd-team-strain); padding: 2px 8px; border-radius: 999px; background: var(--sd-team-strain-soft);
  border: 1px solid color-mix(in srgb, var(--sd-team-strain) 30%, transparent); }

/* chips */
.fb-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.fb-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; padding: 3px 9px;
  border-radius: 999px; color: var(--cc); background: color-mix(in srgb, var(--cc) 11%, transparent);
  border: 1px solid color-mix(in srgb, var(--cc) 28%, transparent); }
.fb-chip.zero { opacity: 0.38; filter: saturate(0.4); }

/* footer readouts */
.fb-foot { display: flex; flex-wrap: wrap; gap: 14px; margin-top: auto; padding-top: 9px; border-top: 1px solid var(--sd-border); }
.fb-foot span { display: flex; flex-direction: column; gap: 1px; }
.fb-foot i { font-style: normal; font-size: 8px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-text-dim); }
.fb-foot b { font-size: 12.5px; font-weight: 800; color: var(--sd-text); }
.fb-foot b.sync { color: var(--sd-team-sync); }

.fb-orphan { display: flex; align-items: center; gap: 7px; margin: 0; padding: 7px 10px; border-radius: 10px;
  font-size: 11px; font-weight: 650; color: var(--sd-team-strain);
  background: var(--sd-team-strain-soft); border: 1px dashed color-mix(in srgb, var(--sd-team-strain) 45%, transparent); }

/* ghost new-team card */
.fb-new { display: flex; align-items: center; justify-content: center; gap: 9px; min-height: 140px; border-radius: 17px;
  cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 700; color: var(--sd-text-muted);
  border: 1.5px dashed var(--sd-border-strong); background: transparent; transition: all 0.2s;
  animation: sd-deal 0.5s var(--sd-spring) backwards; animation-delay: calc(var(--i) * 0.05s); }
.fb-new:hover { color: var(--sd-team-core); border-color: var(--sd-team-brd); background: var(--sd-team-soft); }

/* skeletons */
.fb-skel { display: flex; flex-direction: column; gap: 12px; padding: 16px; border-radius: 17px; min-height: 230px;
  border: 1px solid var(--sd-border); background: var(--sd-surface);
  animation: sd-deal 0.5s var(--sd-spring) backwards; animation-delay: calc(var(--i) * 0.05s); }
.sk-line, .sk-ring { border-radius: 8px; background: linear-gradient(90deg, var(--sd-surface-glass) 25%, var(--sd-border) 50%, var(--sd-surface-glass) 75%);
  background-size: 200% 100%; animation: fb-shimmer 1.4s linear infinite; }
.sk-line { height: 13px; } .sk-line.w40 { width: 40%; } .sk-line.w70 { width: 70%; } .sk-line.w90 { width: 90%; }
.sk-ring { width: 60px; height: 60px; border-radius: 50%; }
@keyframes fb-shimmer { to { background-position: -200% 0; } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .fb-shell,
  html:not([data-cinematic="on"]) .fb-new,
  html:not([data-cinematic="on"]) .fb-skel,
  html:not([data-cinematic="on"]) .sk-line,
  html:not([data-cinematic="on"]) .sk-ring { animation: none; }
  html:not([data-cinematic="on"]) .fb-card { transition: none; }
}
</style>
