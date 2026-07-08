<template>
  <section class="rd">
    <header class="rd-h">
      <div>
        <p class="rd-eyebrow"><UsersRound :size="12" /> CREW · LIVE LOAD</p>
        <p class="rd-sub">Click a teammate to focus the queue on them · drop a ticket on a tile to hand it off.</p>
      </div>
      <button v-if="activeAgent" class="rd-clear" @click="$emit('pick', null)"><X :size="12" /> Clear focus</button>
    </header>

    <div v-if="loading && !roster.length" class="rd-grid">
      <div v-for="n in 4" :key="'sk' + n" class="rd-tile skel"><span class="rd-skel-bar" /></div>
    </div>
    <div v-else-if="roster.length" class="rd-grid">
      <div v-for="(a, i) in roster" :key="String(a.agent_id)" class="rd-shell" :style="{ '--i': i }">
        <button class="rd-tile" :class="[toneOf(a), { on: String(activeAgent) === String(a.agent_id), droppable: dragOver === String(a.agent_id) }]"
          @click="$emit('pick', String(a.agent_id))"
          @pointermove="spot($event)"
          @dragover.prevent="dragOver = String(a.agent_id)"
          @dragleave="dragOver === String(a.agent_id) && (dragOver = null)"
          @drop.prevent="onDrop($event, a)">
          <span class="rd-glare" aria-hidden="true" />
          <!-- identity row -->
          <div class="rd-id">
            <span class="rd-ring" :style="{ '--p': ringPct(a) + '%' }">
              <i class="rd-ava">{{ ini(a.name) }}</i>
              <em v-if="a.on_shift != null" class="rd-shift" :class="{ off: !a.on_shift }"
                :title="a.on_shift ? 'Inside team business hours' : 'Outside team business hours'" />
            </span>
            <span class="rd-who">
              <b class="rd-name">{{ a.name || 'Member' }} <Crown v-if="a.is_lead" :size="11" class="rd-crown" /></b>
              <i class="rd-role">{{ roleLabel(a) }}</i>
            </span>
            <span class="rd-open sd-mono" :title="`${a.open} active ticket(s)`">{{ a.open }}</span>
          </div>
          <!-- strain pips -->
          <div class="rd-pips">
            <span v-if="a.breaching" class="rd-pip strain" :title="`${a.breaching} breaching SLA`"><Flame :size="10" />{{ a.breaching }}</span>
            <span v-if="a.critical" class="rd-pip crit" :title="`${a.critical} critical`"><Siren :size="10" />{{ a.critical }}</span>
            <span v-if="a.due_soon" class="rd-pip due" :title="`${a.due_soon} due within 4h`"><Timer :size="10" />{{ a.due_soon }}</span>
            <span v-if="a.idle" class="rd-pip idle" :title="`${a.idle} idle >24h`"><MoonStar :size="10" />{{ a.idle }}</span>
            <span v-if="!a.breaching && !a.critical && !a.due_soon && !a.idle" class="rd-pip sync"><Check :size="10" /> in sync</span>
          </div>
          <!-- aging micro-bars -->
          <div class="rd-aging" title="Active tickets by age: <1d · 1–3d · 3–7d · >7d">
            <span v-for="(b, k) in agingOf(a)" :key="k" class="rd-age" :class="k"
              :style="{ height: (10 + b.pct * 22) + 'px', opacity: b.n ? 1 : 0.25 }">
              <i class="sd-mono">{{ b.n || '' }}</i>
            </span>
          </div>
          <!-- week line -->
          <div class="rd-week sd-mono">
            <span><CircleCheck :size="10" /> {{ a.resolved_7d || 0 }} shipped · 7d</span>
            <span v-if="a.csat_avg != null" class="rd-csat"><Star :size="10" /> {{ a.csat_avg }}</span>
          </div>
        </button>
      </div>
    </div>
    <div v-else class="rd-empty">
      <UsersRound :size="22" /><p>No crew on this roster yet.</p>
    </div>
  </section>
</template>

<script setup>
/* SdRosterDeck — the Squad Command crew rail. One tile per roster member: conic load
   ring, strain pips (breach/critical/due/idle), aging micro-bars, shift dot, weekly
   shipped count. Click = focus the queue on that agent; drop a dragged ticket row on a
   tile = open the handoff console pre-aimed at them. Accent = --sd-team-*. */
import { ref, computed } from 'vue'
import { UsersRound, Crown, Flame, Siren, Timer, MoonStar, Check, CircleCheck, Star, X } from 'lucide-vue-next'

const props = defineProps({
  roster: { type: Array, default: () => [] },     // TeamRosterEntry[]
  activeAgent: { type: [String, null], default: null },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['pick', 'drop'])

const dragOver = ref(null)
const maxOpen = computed(() => Math.max(1, ...props.roster.map(a => a.open || 0)))
const ringPct = (a) => Math.min(100, Math.round(100 * (a.open || 0) / maxOpen.value))
const ini = (n) => (n || '·').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
const roleLabel = (a) => a.role === 'lead' ? 'Team lead' : a.role === 'collaborator' ? 'Collaborator' : 'Agent'
const toneOf = (a) => {
  if ((a.breaching || 0) > 0) return 'strain'
  if ((a.open || 0) >= Math.max(4, maxOpen.value * 0.75)) return 'busy'
  return 'sync'
}
const agingOf = (a) => {
  const raw = { d1: a.aging_1d || 0, d3: a.aging_3d || 0, d7: a.aging_7d || 0, d7p: a.aging_7plus || 0 }
  const mx = Math.max(1, raw.d1, raw.d3, raw.d7, raw.d7p)
  const out = {}
  for (const k of Object.keys(raw)) out[k] = { n: raw[k], pct: raw[k] / mx }
  return out
}
const spot = (e) => {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', ((e.clientX - r.left) / r.width).toFixed(3))
  el.style.setProperty('--my', ((e.clientY - r.top) / r.height).toFixed(3))
}
const onDrop = (e, a) => {
  dragOver.value = null
  const id = e.dataTransfer?.getData('text/ticket-id')
  if (id) emit('drop', { ticketId: id, agentId: String(a.agent_id) })
}
</script>

<style scoped>
.rd { display: flex; flex-direction: column; gap: 10px; }
.rd-h { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; }
.rd-eyebrow { display: inline-flex; align-items: center; gap: 7px; margin: 0 0 3px; font-family: var(--sd-mono);
  font-size: 10px; font-weight: 800; letter-spacing: 0.2em; color: var(--sd-team-core); }
.rd-sub { margin: 0; font-size: 11.5px; color: var(--sd-text-muted); }
.rd-clear { display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 999px; cursor: pointer;
  font-size: 11px; font-weight: 700; font-family: inherit; color: var(--sd-team-core);
  background: var(--sd-team-soft); border: 1px solid var(--sd-team-brd); }

.rd-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(228px, 1fr)); gap: 10px; }
.rd-shell { animation: sd-deal 0.45s var(--sd-spring) backwards; animation-delay: calc(var(--i) * 0.05s); }
.rd-tile { position: relative; overflow: hidden; width: 100%; display: flex; flex-direction: column; gap: 9px; text-align: left;
  padding: 13px 14px; border-radius: 16px; cursor: pointer; font-family: inherit; color: var(--sd-text);
  background: var(--sd-surface); border: 1px solid var(--sd-border);
  transition: transform 0.22s var(--sd-spring), border-color 0.2s, box-shadow 0.25s; }
.rd-tile:hover { border-color: var(--sd-team-brd);
  transform: perspective(900px) rotateX(calc((var(--my, 0.5) - 0.5) * -5deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 7deg)) translateY(-2px); }
.rd-glare { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.25s;
  background: radial-gradient(340px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), var(--sd-team-hi-soft), transparent 62%); }
.rd-tile:hover .rd-glare { opacity: 1; }
.rd-tile.on { border-color: var(--sd-team-core); box-shadow: 0 0 0 1px var(--sd-team-core), var(--sd-team-glow); }
.rd-tile.droppable { border-color: var(--sd-team-sync); box-shadow: 0 0 0 1px var(--sd-team-sync), 0 0 24px var(--sd-team-sync-soft); }
.rd-tile.strain { border-left: 3px solid var(--sd-team-strain); }
.rd-tile.busy { border-left: 3px solid var(--sd-team-core); }
.rd-tile.sync { border-left: 3px solid color-mix(in srgb, var(--sd-team-sync) 65%, transparent); }

.rd-id { display: flex; align-items: center; gap: 10px; }
/* conic load ring — @property --sd-p lives in the theme file */
.rd-ring { position: relative; width: 42px; height: 42px; flex: 0 0 42px; border-radius: 50%; display: grid; place-items: center;
  background: conic-gradient(var(--sd-team-core) var(--p, 0%), var(--sd-team-deep-soft) 0); }
.rd-tile.strain .rd-ring { background: conic-gradient(var(--sd-team-strain) var(--p, 0%), var(--sd-team-deep-soft) 0); }
.rd-ava { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; font-style: normal;
  font-size: 11.5px; font-weight: 800; color: var(--sd-team-hi); background: var(--sd-team-deep-bg);
  border: 1px solid var(--sd-team-brd); }
[data-theme="light"] .rd-ava { color: #6d4a0a; background: #fdf6e5; }
.rd-shift { position: absolute; right: -1px; bottom: -1px; width: 11px; height: 11px; border-radius: 50%;
  background: var(--sd-team-sync); border: 2px solid var(--sd-surface); }
.rd-shift.off { background: var(--sd-team-idle); }
.rd-who { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.rd-name { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 750; color: var(--sd-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rd-crown { color: var(--sd-team-core); flex: 0 0 auto; }
.rd-role { font-style: normal; font-size: 10.5px; color: var(--sd-text-muted); }
.rd-open { font-size: 19px; font-weight: 800; color: var(--sd-team-core); font-variant-numeric: tabular-nums; }
.rd-tile.strain .rd-open { color: var(--sd-team-strain); }

.rd-pips { display: flex; flex-wrap: wrap; gap: 5px; }
.rd-pip { display: inline-flex; align-items: center; gap: 4px; padding: 2.5px 8px; border-radius: 999px;
  font-size: 10px; font-weight: 750; font-variant-numeric: tabular-nums; }
.rd-pip.strain { color: var(--sd-team-strain); background: var(--sd-team-strain-soft); border: 1px solid color-mix(in srgb, var(--sd-team-strain) 35%, transparent); }
.rd-pip.crit { color: var(--sd-pri-critical, #ef4444); background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); }
.rd-pip.due { color: var(--sd-team-core); background: var(--sd-team-soft); border: 1px solid var(--sd-team-brd); }
.rd-pip.idle { color: var(--sd-team-idle); background: var(--sd-team-idle-soft); border: 1px solid color-mix(in srgb, var(--sd-team-idle) 35%, transparent); }
.rd-pip.sync { color: var(--sd-team-sync); background: var(--sd-team-sync-soft); border: 1px solid color-mix(in srgb, var(--sd-team-sync) 35%, transparent); }

.rd-aging { display: flex; align-items: flex-end; gap: 5px; height: 34px; padding: 0 2px; }
.rd-age { position: relative; flex: 1; border-radius: 4px 4px 2px 2px; background: var(--sd-team-soft);
  border: 1px solid var(--sd-team-brd); transition: height 0.5s var(--sd-spring); }
.rd-age.d7 { background: color-mix(in srgb, var(--sd-team-core) 24%, transparent); }
.rd-age.d7p { background: var(--sd-team-strain-soft); border-color: color-mix(in srgb, var(--sd-team-strain) 40%, transparent); }
.rd-age i { position: absolute; top: -13px; left: 0; right: 0; text-align: center; font-style: normal;
  font-size: 8.5px; color: var(--sd-text-dim); }

.rd-week { display: flex; align-items: center; justify-content: space-between; font-size: 10.5px; color: var(--sd-text-muted); }
.rd-week span { display: inline-flex; align-items: center; gap: 5px; }
.rd-week :deep(svg) { color: var(--sd-team-sync); }
.rd-csat :deep(svg) { color: var(--sd-team-core); }

.rd-tile.skel { min-height: 128px; }
.rd-skel-bar { display: block; height: 100%; min-height: 100px; border-radius: 10px;
  background: linear-gradient(100deg, transparent 30%, var(--sd-team-soft) 50%, transparent 70%);
  background-size: 200% 100%; animation: rd-shimmer 1.4s linear infinite; }
@keyframes rd-shimmer { to { background-position: -200% 0; } }
.rd-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 26px;
  color: var(--sd-text-muted); border: 1px dashed var(--sd-border-strong); border-radius: 16px; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .rd-shell,
  html:not([data-cinematic="on"]) .rd-skel-bar { animation: none; }
  html:not([data-cinematic="on"]) .rd-tile:hover { transform: none; }
}
</style>
