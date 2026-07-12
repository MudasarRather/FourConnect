<template>
  <section ref="rootEl" class="ewh" :class="{ reduced }" @pointermove="onMove" @pointerleave="onLeave">
    <!-- cork wall backdrop + desk-lamp spotlight -->
    <div class="ewh-cork" aria-hidden="true" />
    <div class="ewh-lamp" aria-hidden="true" />
    <div class="ewh-vignette" aria-hidden="true" />

    <div class="ewh-grid">
      <!-- ═══ lead ═══ -->
      <div class="ewh-lead">
        <span class="ewh-eyebrow sd-mono"><Fingerprint :size="12" /> L3 · ENGINEERING — THE EVIDENCE WALL</span>
        <h2 class="ewh-title">Read the strings.<br /><b>Close the case.</b></h2>
        <p class="ewh-sub">Escalations arrive with a dossier. Pin them, string them to the suspect problem,
          record the root cause — and retire it to the case archive so it never comes back.</p>

        <div class="ewh-ctas">
          <Motion as="button" class="ewh-btn primary" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
            :disabled="loading || stats.no_queues || meAway"
            :title="meAway ? 'You are set Away — go Available to take a case' : 'Claim the next case per serve order'"
            @click="$emit('serve')">
            <Play :size="13" /> {{ playing ? 'Next case' : 'Take the next case' }} <kbd>S</kbd>
          </Motion>
          <Motion as="button" class="ewh-btn" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }" @click="$emit('unowned')">
            <HandHelping :size="13" /> Unowned <kbd>U</kbd>
          </Motion>
          <Motion as="button" class="ewh-btn" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }" @click="$emit('refresh')">
            <RefreshCw :size="13" :class="{ spin: loading }" /> Refresh <kbd>R</kbd>
          </Motion>
        </div>

        <!-- duty plate -->
        <div class="ewh-duty">
          <span class="ewh-duty-lbl sd-mono">ON THE CASE AS</span>
          <div class="ewh-duty-seg" role="tablist" aria-label="My availability">
            <button v-for="s in DUTY" :key="s.key" class="ewh-duty-b" :class="{ on: myStatus === s.key }"
              role="tab" :aria-selected="myStatus === s.key" :title="s.blurb" @click="$emit('status', s.key)">
              <i :style="{ background: s.color }" />{{ s.label }}
            </button>
          </div>
        </div>

        <!-- case-room readouts -->
        <div class="ewh-reads sd-mono">
          <span :class="{ hot: (stats.missing_rca || 0) > 0 }" title="Breached tickets on this tier with no root-cause record yet">
            RCA DEBT <b>{{ stats.missing_rca ?? 0 }}</b></span>
          <span title="Problems still being worked, desk-wide">CASE FILES <b>{{ stats.problems_open ?? 0 }}</b></span>
          <span class="kedb" title="Known errors with a documented workaround — the case archive" @click="$emit('kedb')">
            KNOWN ERRORS <b>{{ stats.known_errors ?? 0 }}</b></span>
          <span :class="{ hot: breachLeftMs !== null && breachLeftMs < 3600000 }" title="Soonest resolution deadline on workable tickets">
            NEXT BREACH <b>{{ breachLeft }}</b></span>
          <span title="At the current resolve pace, minutes to drain the workable queue">
            DRAIN <b>{{ drainEta }}</b></span>
        </div>
      </div>

      <!-- ═══ the wall ═══ -->
      <div ref="wallEl" class="ewh-wall" aria-label="Evidence wall — live tickets strung to their problem records">
        <svg class="ewh-strings" :width="wallW" :height="wallH" aria-hidden="true">
          <path v-for="(s, i) in strings" :key="'s' + i" class="ewh-string" :style="{ '--sd': i * 0.18 + 's' }" :d="s" />
          <path v-for="(s, i) in strings" :key="'p' + i" class="ewh-string-pulse" :style="{ '--sd': i * 0.5 + 's' }" :d="s" />
        </svg>

        <!-- pinned evidence (tickets) -->
        <button v-for="(t, i) in pinned" :key="t.id" class="ewh-evd" :style="evdStyle(t, i)"
          :title="`${t.ticket_number} — open the case file`" @click="$emit('open', t)">
          <i class="ewh-pin" :data-tid="t.id" :class="{ linked: !!t.linked_problem_id }" />
          <span class="ewh-evd-no sd-mono">{{ t.ticket_number }}<em v-if="t.is_major_incident" class="mi">MI</em></span>
          <span class="ewh-evd-subj">{{ t.subject }}</span>
          <span class="ewh-evd-mt sd-mono">
            <b :class="slaTone(t)">{{ slaShort(t) }}</b>
            <em v-if="(t.viewing || []).length" class="ghost"><Eye :size="8" /> {{ t.viewing.length }}</em>
            <em v-else>{{ t.assigned_agent_name ? initials(t.assigned_agent_name) : 'UNOWNED' }}</em>
          </span>
          <i v-if="breached(t)" class="ewh-evd-edge" />
        </button>

        <!-- suspects (problems) -->
        <button v-for="(p, i) in suspects" :key="p.id" class="ewh-prb" :style="prbStyle(p, i)"
          :title="`${p.problem_number || 'Problem'} — jump to the case file`" @click="$emit('problem', p)">
          <i class="ewh-pin brass" :data-pid="p.id" />
          <span class="ewh-evd-no sd-mono">{{ p.problem_number || 'PROBLEM' }}</span>
          <span class="ewh-evd-subj">{{ p.title }}</span>
          <span class="ewh-evd-mt sd-mono"><em>{{ (p.linked_ticket_ids || []).length }} STRUNG · {{ statusLabel(p.status) }}</em></span>
          <span v-if="p.status === 'known_error' || p.workaround_published" class="ewh-stamp">KNOWN ERROR</span>
        </button>

        <p v-if="!pinned.length && !loading" class="ewh-wall-empty sd-mono">THE WALL IS CLEAR — NO OPEN CASES ON THIS LENS</p>
        <span class="ewh-plate sd-mono">CASE ROOM · L3 <b>{{ tierHealth }}</b></span>
      </div>
    </div>

    <!-- ═══ lens strip ═══ -->
    <div class="ewh-lenses" role="tablist" aria-label="Board lenses">
      <Motion v-for="(l, i) in lenses" :key="l.key" as="button" class="ewh-lens"
        :class="{ on: activeLens === l.key, stat: l.stat }" role="tab" :aria-selected="activeLens === l.key"
        :style="{ '--lc': l.color }" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.35, delay: 0.05 + i * 0.05, ease: [0.16, 1, 0.3, 1] }"
        :while-hover="l.stat ? {} : { y: -2 }" :while-tap="l.stat ? {} : { scale: 0.97 }" @click="$emit('pick', l)">
        <component :is="l.icon" :size="13" class="ewh-lens-ic" />
        <b class="sd-mono"><SdCountUp :value="l.value || 0" /></b>
        <span>{{ l.label }}</span>
        <i class="ewh-lens-bar" />
      </Motion>
    </div>
  </section>
</template>

<script setup>
/* SdEvidenceHero — the L3 desk's signature instrument. A cork case-wall after dark:
   the top serve-order tickets pin up as manila evidence cards, red strings run from
   each linked ticket to its suspect (the Problem card), a desk-lamp spotlight follows
   the pointer, and the lens strip filters the board below. The stage stays NIGHT in
   both themes (light re-pins the --sd-l3-* night values on .ewh in the theme file). */
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import { Fingerprint, Play, RefreshCw, HandHelping, Eye } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'
import { AGENT_STATUS_META, PROBLEM_STATUSES } from '@/composables/useSupportDesk'

const props = defineProps({
  lenses: { type: Array, default: () => [] },
  activeLens: { type: String, default: 'all' },
  stats: { type: Object, default: () => ({}) },
  rows: { type: Array, default: () => [] },
  problems: { type: Array, default: () => [] },
  now: { type: Number, default: Date.now() },
  playing: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  reduced: { type: Boolean, default: false },
})
defineEmits(['pick', 'serve', 'unowned', 'refresh', 'status', 'open', 'problem', 'kedb'])

const DUTY = [
  { key: 'online', label: 'Available', color: AGENT_STATUS_META.online.color, blurb: AGENT_STATUS_META.online.blurb },
  { key: 'focus', label: 'Busy', color: AGENT_STATUS_META.focus.color, blurb: AGENT_STATUS_META.focus.blurb },
  { key: 'away', label: 'Away', color: AGENT_STATUS_META.away.color, blurb: AGENT_STATUS_META.away.blurb },
]
const myStatus = computed(() => props.stats.my_status || 'online')
const meAway = computed(() => ['away', 'offline'].includes(myStatus.value))
const tierHealth = computed(() => String(props.stats.health || 'green').toUpperCase())
const statusLabel = (v) => PROBLEM_STATUSES.find(s => s.value === v)?.label?.toUpperCase() || (v || '').toUpperCase()
const initials = (n) => (n || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

/* readouts */
const breachLeftMs = computed(() => {
  if (!props.stats.next_breach_at) return null
  return new Date(props.stats.next_breach_at).getTime() - props.now
})
const breachLeft = computed(() => {
  const ms = breachLeftMs.value
  if (ms === null) return '—'
  if (ms <= 0) return 'NOW'
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000)
  return h ? `${h}H ${String(m).padStart(2, '0')}M` : `${m}M`
})
const drainEta = computed(() => {
  const m = props.stats.drain_eta_mins
  if (!m && m !== 0) return '—'
  const h = Math.floor(m / 60)
  return h ? `${h}H ${Math.round(m % 60)}M` : `${Math.round(m)}M`
})

/* SLA chips */
const breached = (t) => (t.sla_resolution_state || t.sla_response_state) === 'breached'
const slaShort = (t) => {
  const st = t.sla_resolution_state || t.sla_response_state
  return st === 'breached' ? 'BREACHED' : st === 'due-soon' ? 'DUE SOON' : 'ON CLOCK'
}
const slaTone = (t) => {
  const st = t.sla_resolution_state || t.sla_response_state
  return st === 'breached' ? 'bad' : st === 'due-soon' ? 'warn' : 'ok'
}

/* ── the wall: pinned tickets + suspect problems + strings ── */
const pinned = computed(() => props.rows.slice(0, 6))
const suspects = computed(() => {
  // problems referenced by the pinned tickets first, then the busiest open case files
  const refIds = new Set(pinned.value.map(t => String(t.linked_problem_id || '')).filter(Boolean))
  const ranked = [...props.problems].sort((a, b) =>
    (refIds.has(String(b.id)) - refIds.has(String(a.id)))
    || ((b.linked_ticket_ids || []).length - (a.linked_ticket_ids || []).length))
  return ranked.slice(0, 2)
})

/* deterministic pin slots (percent coords) + seeded jitter so the wall never jumps */
const T_SLOTS = [[3, 6], [36, 2], [69, 7], [3, 56], [36, 66], [69, 58]]
const seed = (id, m) => {
  let h = 0
  const s = String(id)
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % m
}
const evdStyle = (t, i) => {
  const [x, y] = T_SLOTS[i % T_SLOTS.length]
  const r = (seed(t.id, 50) / 10 - 2.5).toFixed(2)
  return { left: x + '%', top: y + '%', '--r': r + 'deg', '--i': i }
}
const prbStyle = (p, i) => {
  const x = suspects.value.length === 1 ? 38 : (i === 0 ? 24 : 52)
  const r = (seed(p.id, 30) / 10 - 1.5).toFixed(2)
  return { left: x + '%', top: '30%', '--r': r + 'deg', '--i': pinned.value.length + i }
}

/* strings: quadratic sag from each linked ticket pin to its problem pin (px space) */
const rootEl = ref(null)
const wallEl = ref(null)
const wallW = ref(0)
const wallH = ref(0)
const strings = ref([])
const drawStrings = () => {
  const wall = wallEl.value
  if (!wall) { strings.value = []; return }
  const R = wall.getBoundingClientRect()
  wallW.value = R.width
  wallH.value = R.height
  const pinAt = (el) => {
    const B = el.getBoundingClientRect()
    return [B.left + B.width / 2 - R.left, B.top + B.height / 2 - R.top]
  }
  const prbPins = {}
  wall.querySelectorAll('.ewh-pin[data-pid]').forEach(el => { prbPins[el.dataset.pid] = pinAt(el) })
  const out = []
  wall.querySelectorAll('.ewh-pin[data-tid]').forEach(el => {
    const t = pinned.value.find(x => String(x.id) === String(el.dataset.tid))
    const target = t && t.linked_problem_id ? prbPins[String(t.linked_problem_id)] : null
    if (!target) return
    const [x1, y1] = pinAt(el)
    const [x2, y2] = target
    const mx = (x1 + x2) / 2
    const my = Math.max(y1, y2) + 34   // twine sag
    out.push(`M${x1.toFixed(1)} ${y1.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`)
  })
  strings.value = out
}
let ro = null
watch([pinned, suspects], () => nextTick(drawStrings), { deep: true })
onMounted(() => {
  nextTick(drawStrings)
  ro = new ResizeObserver(() => drawStrings())
  if (wallEl.value) ro.observe(wallEl.value)
})
onBeforeUnmount(() => { if (ro) ro.disconnect() })

/* desk-lamp spotlight */
const onMove = (ev) => {
  const el = rootEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', ((ev.clientX - r.left) / r.width).toFixed(3))
  el.style.setProperty('--my', ((ev.clientY - r.top) / r.height).toFixed(3))
}
const onLeave = () => {
  const el = rootEl.value
  if (el) { el.style.setProperty('--mx', '0.72'); el.style.setProperty('--my', '0.35') }
}
</script>

<style scoped>
.ewh { position: relative; border-radius: 20px; overflow: hidden; isolation: isolate;
  border: 1px solid var(--sd-l3-brd); background: var(--sd-l3-deep-bg); color: var(--sd-l3-chalk);
  box-shadow: 0 30px 70px -42px rgba(0, 0, 0, 0.7); }

/* backdrop: cork texture + lamp + vignette */
.ewh-cork { position: absolute; inset: 0; z-index: 0; opacity: 0.9; background:
  radial-gradient(1.5px 1.5px at 12% 28%, rgba(233, 221, 192, 0.05) 50%, transparent 51%),
  radial-gradient(1.5px 1.5px at 44% 68%, rgba(233, 221, 192, 0.04) 50%, transparent 51%),
  radial-gradient(1.5px 1.5px at 78% 18%, rgba(233, 221, 192, 0.05) 50%, transparent 51%),
  radial-gradient(1.5px 1.5px at 62% 84%, rgba(233, 221, 192, 0.04) 50%, transparent 51%),
  radial-gradient(120% 90% at 60% 0%, #1a1207 0%, var(--sd-l3-deep-bg) 58%, #0a0703 100%);
  background-size: 90px 90px, 110px 110px, 130px 130px, 100px 100px, 100% 100%; }
.ewh-lamp { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background: radial-gradient(340px circle at calc(var(--mx, 0.72) * 100%) calc(var(--my, 0.35) * 100%),
    rgba(240, 200, 120, 0.13), rgba(217, 164, 65, 0.05) 45%, transparent 72%);
  transition: background 0.12s linear; }
.ewh-vignette { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background: radial-gradient(140% 110% at 50% 40%, transparent 55%, rgba(0, 0, 0, 0.42) 100%); }

.ewh-grid { position: relative; z-index: 2; display: grid; grid-template-columns: minmax(300px, 0.85fr) 1.15fr;
  gap: 18px; padding: 22px 22px 10px; }
@media (max-width: 980px) { .ewh-grid { grid-template-columns: 1fr; } }

/* ── lead ── */
.ewh-lead { display: flex; flex-direction: column; gap: 13px; min-width: 0; }
.ewh-eyebrow { display: inline-flex; align-items: center; gap: 7px; align-self: flex-start;
  padding: 6px 11px; border-radius: 999px; font-size: 9px; font-weight: 800; letter-spacing: 0.18em;
  color: var(--sd-l3-core); border: 1px solid var(--sd-l3-brd); background: var(--sd-l3-soft); }
.ewh-title { margin: 0; font-size: clamp(22px, 2.6vw, 32px); line-height: 1.06; font-weight: 800;
  letter-spacing: -0.015em; color: var(--sd-l3-chalk); }
.ewh-title b { background: var(--sd-l3-grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
.ewh-sub { margin: 0; font-size: 12.5px; line-height: 1.6; color: color-mix(in srgb, var(--sd-l3-chalk) 68%, transparent); max-width: 52ch; }

.ewh-ctas { display: flex; gap: 8px; flex-wrap: wrap; }
.ewh-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 11px;
  font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-l3-brd); background: rgba(0, 0, 0, 0.28); color: var(--sd-l3-chalk); }
.ewh-btn.primary { border-color: transparent; background: var(--sd-l3-grad); color: #221604; box-shadow: var(--sd-l3-glow); }
.ewh-btn:disabled { opacity: 0.55; cursor: wait; }
.ewh-btn kbd { padding: 1px 5px; border-radius: 4px; font-size: 8.5px; font-weight: 800;
  border: 1px solid currentColor; opacity: 0.65; font-family: inherit; }
.ewh-btn .spin { animation: ewh-rot 0.9s linear infinite; }
@keyframes ewh-rot { to { transform: rotate(360deg); } }

.ewh-duty { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ewh-duty-lbl { font-size: 8.5px; letter-spacing: 0.2em; color: color-mix(in srgb, var(--sd-l3-chalk) 45%, transparent); }
.ewh-duty-seg { display: inline-flex; gap: 4px; padding: 4px; border-radius: 11px;
  border: 1px solid var(--sd-l3-brd); background: rgba(0, 0, 0, 0.3); }
.ewh-duty-b { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 8px;
  border: none; cursor: pointer; font-family: inherit; font-size: 10.5px; font-weight: 700;
  background: transparent; color: color-mix(in srgb, var(--sd-l3-chalk) 62%, transparent); }
.ewh-duty-b i { width: 7px; height: 7px; border-radius: 50%; }
.ewh-duty-b.on { background: var(--sd-l3-soft); color: var(--sd-l3-chalk); }

.ewh-reads { display: flex; gap: 7px; flex-wrap: wrap; font-size: 9px; letter-spacing: 0.1em; }
.ewh-reads span { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 8px;
  border: 1px dashed color-mix(in srgb, var(--sd-l3-chalk) 22%, transparent);
  color: color-mix(in srgb, var(--sd-l3-chalk) 58%, transparent); }
.ewh-reads b { color: var(--sd-l3-chalk); font-size: 11px; }
.ewh-reads .hot { border-color: color-mix(in srgb, var(--sd-l3-halt) 55%, transparent); color: var(--sd-l3-halt); }
.ewh-reads .hot b { color: var(--sd-l3-halt); }
.ewh-reads .kedb { cursor: pointer; }
.ewh-reads .kedb:hover { border-color: var(--sd-l3-core); color: var(--sd-l3-core); }

/* ── the wall ── */
.ewh-wall { position: relative; min-height: 330px; border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--sd-l3-chalk) 12%, transparent);
  background: rgba(0, 0, 0, 0.18); overflow: hidden; }
.ewh-strings { position: absolute; inset: 0; z-index: 1; pointer-events: none; }
.ewh-string { fill: none; stroke: var(--sd-l3-string); stroke-width: 1.6; opacity: 0.9;
  filter: drop-shadow(0 1px 2px rgba(224, 82, 79, 0.5));
  stroke-dasharray: 900; stroke-dashoffset: 900; animation: ewh-draw 1.1s ease forwards; animation-delay: var(--sd, 0s); }
@keyframes ewh-draw { to { stroke-dashoffset: 0; } }
.ewh-string-pulse { fill: none; stroke: #ffd9d8; stroke-width: 2; stroke-linecap: round;
  stroke-dasharray: 10 900; animation: ewh-pulse 3.6s linear infinite; animation-delay: var(--sd, 0s); opacity: 0.85; }
@keyframes ewh-pulse { from { stroke-dashoffset: 910; } to { stroke-dashoffset: 0; } }

.ewh-evd, .ewh-prb { position: absolute; z-index: 2; width: min(27%, 190px); text-align: left; cursor: pointer;
  font-family: inherit; border: none; border-radius: 4px; padding: 9px 10px 8px;
  background: linear-gradient(175deg, var(--sd-l3-card), var(--sd-l3-card-deep)); color: var(--sd-l3-card-ink);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.55); transform: rotate(var(--r, 0deg));
  animation: sd-deal 0.5s var(--sd-spring, cubic-bezier(0.16, 1, 0.3, 1)) both; animation-delay: calc(var(--i, 0) * 0.06s);
  transition: box-shadow 0.2s, transform 0.2s; overflow: hidden; }
.ewh-evd:hover, .ewh-prb:hover { transform: rotate(var(--r, 0deg)) translateY(-3px) scale(1.02);
  box-shadow: 0 16px 30px rgba(0, 0, 0, 0.6), 0 0 18px rgba(217, 164, 65, 0.22); }
.ewh-prb { z-index: 3; width: min(30%, 210px);
  background: linear-gradient(175deg, #f3d98b, #e0b74a); border: 1px solid rgba(138, 95, 20, 0.5);
  animation: sd-deal 0.5s var(--sd-spring, cubic-bezier(0.16, 1, 0.3, 1)) both, ewh-suspect 4.2s ease-in-out infinite;
  animation-delay: calc(var(--i, 0) * 0.06s), 1s; }
@keyframes ewh-suspect { 0%, 100% { box-shadow: 0 10px 22px rgba(0, 0, 0, 0.55); }
  50% { box-shadow: 0 10px 22px rgba(0, 0, 0, 0.55), 0 0 26px 3px rgba(240, 200, 120, 0.3); } }
.ewh-pin { position: absolute; top: -6px; left: 50%; width: 12px; height: 12px; border-radius: 50%;
  transform: translateX(-50%); z-index: 4;
  background: radial-gradient(circle at 35% 30%, #fca5a5, #b91c1c 70%); box-shadow: 0 2px 5px rgba(0, 0, 0, 0.6); }
.ewh-pin.linked { animation: ewh-pin-pulse 3s ease-in-out infinite; }
.ewh-pin.brass { background: radial-gradient(circle at 35% 30%, #fde68a, #8a5f14 72%); }
@keyframes ewh-pin-pulse { 0%, 100% { box-shadow: 0 2px 5px rgba(0, 0, 0, 0.6); }
  50% { box-shadow: 0 2px 5px rgba(0, 0, 0, 0.6), 0 0 10px 3px rgba(224, 82, 79, 0.4); } }
.ewh-evd-no { display: flex; align-items: center; gap: 6px; font-size: 9px; font-weight: 800;
  letter-spacing: 0.08em; color: #92600e; }
.ewh-evd-no .mi { font-style: normal; padding: 1px 4px; border-radius: 3px; font-size: 7px; letter-spacing: 0.12em;
  color: #b91c1c; border: 1px solid #b91c1c; }
.ewh-evd-subj { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  margin: 4px 0 5px; font-size: 10.5px; font-weight: 700; line-height: 1.35; color: var(--sd-l3-card-ink); }
.ewh-evd-mt { display: flex; align-items: center; gap: 7px; font-size: 7.5px; letter-spacing: 0.1em;
  color: var(--sd-l3-card-dim); }
.ewh-evd-mt em { font-style: normal; display: inline-flex; align-items: center; gap: 3px; }
.ewh-evd-mt .ghost { color: #92600e; }
.ewh-evd-mt .bad { color: #b91c1c; } .ewh-evd-mt .warn { color: #b45309; } .ewh-evd-mt .ok { color: #3f6212; }
.ewh-evd-edge { position: absolute; inset: 0; pointer-events: none; border: 2px solid rgba(185, 28, 28, 0.55);
  border-radius: 4px; animation: ewh-edge 2.4s ease-in-out infinite; }
@keyframes ewh-edge { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }
.ewh-stamp { position: absolute; right: 7px; bottom: 6px; padding: 2px 5px; border-radius: 3px;
  font-family: "Cascadia Mono", Consolas, ui-monospace, monospace; font-size: 7px; font-weight: 800;
  letter-spacing: 0.16em; color: #b91c1c; border: 1.5px solid #b91c1c; transform: rotate(-7deg); }
.ewh-wall-empty { position: absolute; inset: 0; display: grid; place-items: center; margin: 0;
  font-size: 10px; letter-spacing: 0.2em; color: color-mix(in srgb, var(--sd-l3-chalk) 40%, transparent); }
.ewh-plate { position: absolute; right: 10px; bottom: 8px; z-index: 4; padding: 5px 9px; border-radius: 7px;
  font-size: 8px; letter-spacing: 0.16em; color: color-mix(in srgb, var(--sd-l3-chalk) 55%, transparent);
  border: 1px solid color-mix(in srgb, var(--sd-l3-chalk) 16%, transparent); background: rgba(0, 0, 0, 0.4); }
.ewh-plate b { color: var(--sd-l3-go); }

/* ── lenses ── */
.ewh-lenses { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
  gap: 7px; padding: 12px 22px 18px; }
.ewh-lens { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
  padding: 9px 11px 11px; border-radius: 12px; cursor: pointer; font-family: inherit; overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--sd-l3-chalk) 13%, transparent); background: rgba(0, 0, 0, 0.26);
  color: color-mix(in srgb, var(--sd-l3-chalk) 66%, transparent); text-align: left; }
.ewh-lens b { font-size: 17px; font-weight: 800; color: var(--sd-l3-chalk); }
.ewh-lens span { font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
.ewh-lens-ic { position: absolute; top: 9px; right: 9px; color: var(--lc, var(--sd-l3-core)); opacity: 0.8; }
.ewh-lens-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--lc, var(--sd-l3-core));
  transform: scaleX(0); transform-origin: left; transition: transform 0.25s; }
.ewh-lens.on { border-color: var(--lc, var(--sd-l3-core)); color: var(--sd-l3-chalk);
  background: color-mix(in srgb, var(--lc, var(--sd-l3-core)) 12%, rgba(0, 0, 0, 0.26)); }
.ewh-lens.on .ewh-lens-bar { transform: scaleX(1); }
.ewh-lens.stat { cursor: default; }

/* reduced motion: the wall reads as a still photograph */
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .ewh-string { animation: none; stroke-dashoffset: 0; }
  html:not([data-cinematic="on"]) .ewh-string-pulse,
  html:not([data-cinematic="on"]) .ewh-pin.linked,
  html:not([data-cinematic="on"]) .ewh-evd-edge,
  html:not([data-cinematic="on"]) .ewh-prb { animation: none; }
  html:not([data-cinematic="on"]) .ewh-evd { animation: none; }
}
.ewh.reduced .ewh-string { animation: none; stroke-dashoffset: 0; }
.ewh.reduced .ewh-string-pulse, .ewh.reduced .ewh-pin.linked,
.ewh.reduced .ewh-evd-edge { animation: none; }
</style>
