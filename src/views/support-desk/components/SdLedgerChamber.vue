<template>
  <div class="lc">
    <!-- ambient chamber mist -->
    <span class="lc-mist" aria-hidden="true" />

    <!-- ═══ instrument bar — slim console strip (the hero above owns the headline) ═══ -->
    <header class="lc-bar">
      <span class="lc-bar-sig sd-mono" title="Every audited config mutation on the desk leaves a track in the chamber — newest detections first.">
        <Atom :size="12" /> THE CLOUD CHAMBER
      </span>
      <span class="lc-bar-note sd-mono">CONFIG MUTATIONS · NEWEST FIRST · RULES KEEP FULL VERSION HISTORY</span>
      <span class="lc-sp" />
      <span class="lc-bar-tele sd-mono" aria-label="Ledger telemetry">
        <em><b><SdCountUp :value="total" /></b> DETECTIONS</em>
        <em class="pg"><b>{{ page }}<i>/</i>{{ pages }}</b> FRAME</em>
      </span>
    </header>

    <!-- ═══ detector channels (entity filters) ═══ -->
    <div class="lc-channels" role="tablist" aria-label="Entity channels">
      <button v-for="(f, i) in FILTERS" :key="f.value" class="lc-ch sd-mono" :style="{ '--i': i, '--cc': f.color }"
        :class="{ on: entity === f.value }" role="tab" :aria-selected="entity === f.value"
        @click="$emit('filter', f.value)">
        <i class="lc-ch-dot" aria-hidden="true" />{{ f.label }}
      </button>
    </div>

    <!-- ═══ the beamline — this frame's detections on a live wire ═══ -->
    <div v-if="view.length" class="lc-beam" aria-hidden="true">
      <span class="lc-beam-wire" />
      <span class="lc-beam-pulse" />
      <button v-for="e in view" :key="'b' + e.id" class="lc-blip" :style="{ left: e.beamX + '%', '--bc': e.color }"
        :class="{ lit: hoverId === e.id }" :title="e.title"
        @mouseenter="hoverId = e.id" @mouseleave="hoverId = null" @click="jumpTo(e.id)" />
      <span class="lc-beam-cap sd-mono new">NEWEST</span>
      <span class="lc-beam-cap sd-mono old">OLDEST</span>
    </div>

    <!-- ═══ detections ═══ -->
    <div class="lc-feed" :class="{ charging: busy }">
      <span v-if="busy" class="lc-scan" aria-hidden="true" />

      <article v-for="(e, i) in view" :key="e.id" :ref="el => setRowEl(e.id, el)" class="lc-det"
        :style="{ '--i': i, '--cc': e.color }" :class="{ lit: hoverId === e.id, open: openId === e.id, flash: flashId === e.id }"
        @mouseenter="hoverId = e.id" @mouseleave="hoverId = null">
        <!-- collision burst signature -->
        <button class="lc-burst" :title="expandable(e) ? 'Open the detection record' : e.title" @click="toggleOpen(e)">
          <svg viewBox="0 0 44 44" aria-hidden="true">
            <path v-for="(t, ti) in e.tracks" :key="ti" :d="t.d" class="lc-track" pathLength="100"
              :style="{ stroke: e.color, opacity: t.o, '--td': (i * 0.06 + ti * 0.09) + 's' }" />
            <circle cx="22" cy="22" r="2.4" class="lc-burst-core" :style="{ fill: e.color }" />
            <circle v-if="e.op === 'created'" cx="22" cy="22" r="6" class="lc-burst-ring" :style="{ stroke: e.color }" />
          </svg>
        </button>

        <div class="lc-det-body">
          <div class="lc-det-h">
            <span class="lc-stamp sd-mono" :class="e.tone">{{ e.stamp }}</span>
            <b class="lc-det-title">{{ e.title }}</b>
          </div>
          <span class="lc-det-sub sd-mono">
            <em class="lc-actor">{{ e.actor }}</em> · {{ e.when }} · <i class="lc-ent" :style="{ color: e.color }">{{ e.entityLabel.toUpperCase() }}</i>
          </span>
          <div v-if="e.fields.length" class="lc-sig">
            <span class="lc-sig-lb sd-mono">Δ</span>
            <span v-for="f in e.fields.slice(0, 5)" :key="f" class="lc-sig-chip sd-mono">{{ f }}</span>
            <span v-if="e.fields.length > 5" class="lc-sig-chip more sd-mono">+{{ e.fields.length - 5 }}</span>
          </div>
        </div>

        <div class="lc-det-acts">
          <Motion v-if="e.hasHistory" as="button" class="lc-hist sd-mono" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.95 }"
            title="Replay this rule's version history" @click="$emit('history', e.entityId, e.name)">
            <History :size="11" /> REPLAY
          </Motion>
          <button v-if="expandable(e)" class="lc-x" :class="{ open: openId === e.id }" :title="openId === e.id ? 'Seal the record' : 'Open the detection record'"
            @click="toggleOpen(e)"><ChevronDown :size="13" /></button>
        </div>

        <!-- the detection record (expand) -->
        <div class="lc-rec" :class="{ open: openId === e.id }">
          <div class="lc-rec-in">
            <div class="lc-rec-grid sd-mono">
              <span class="k">DETECTION</span><span class="v">{{ e.action }}</span>
              <span class="k">ENTITY</span><span class="v">{{ e.entityId }}</span>
              <template v-if="e.ip"><span class="k">ORIGIN IP</span><span class="v">{{ e.ip }}</span></template>
              <template v-if="e.ua"><span class="k">INSTRUMENT</span><span class="v ua">{{ e.ua }}</span></template>
              <template v-for="(v, k) in e.extra" :key="k">
                <span class="k">{{ String(k).toUpperCase() }}</span><span class="v">{{ v }}</span>
              </template>
            </div>
          </div>
        </div>
      </article>

      <!-- quiet chamber -->
      <div v-if="!view.length && !busy" class="lc-quiet">
        <span class="lc-quiet-core" aria-hidden="true"><span class="q1" /><span class="q2" /><span class="q3" /></span>
        <p class="sd-mono">THE CHAMBER IS QUIET</p>
        <span>{{ entity ? 'No detections on this channel yet — flip back to ALL or mutate something.' : 'Nothing recorded yet — every lane, rule, skill, SLA and setting change lands here from now on.' }}</span>
      </div>
    </div>

    <!-- ═══ film advance — the pager ═══ -->
    <footer v-if="pages > 1" class="lc-film">
      <Motion as="button" class="lc-adv sd-mono" :disabled="page <= 1 || busy"
        :while-hover="page > 1 && !busy ? { x: -2 } : {}" :while-tap="page > 1 && !busy ? { scale: 0.94 } : {}"
        @click="$emit('page', page - 1)"><ChevronLeft :size="13" /> NEWER</Motion>

      <div class="lc-frames" role="navigation" aria-label="Ledger pages">
        <template v-for="(fr, fi) in frames" :key="fi + '-' + fr">
          <span v-if="fr === '…'" class="lc-gap sd-mono" aria-hidden="true">··</span>
          <button v-else class="lc-frame sd-mono" :class="{ on: fr === page }" :disabled="busy"
            :aria-current="fr === page ? 'page' : undefined" @click="$emit('page', fr)">
            <span class="lc-frame-holes" aria-hidden="true"><i /><i /></span>
            {{ fr }}
            <span class="lc-frame-holes low" aria-hidden="true"><i /><i /></span>
          </button>
        </template>
      </div>

      <Motion as="button" class="lc-adv sd-mono" :disabled="page >= pages || busy"
        :while-hover="page < pages && !busy ? { x: 2 } : {}" :while-tap="page < pages && !busy ? { scale: 0.94 } : {}"
        @click="$emit('page', page + 1)">OLDER <ChevronRight :size="13" /></Motion>

      <span class="lc-film-read sd-mono">FRAME {{ page }} / {{ pages }} · <b>{{ total }}</b> DETECTIONS · 10 PER FRAME</span>
    </footer>
  </div>
</template>

<script setup>
/*
  SdLedgerChamber — "THE CLOUD CHAMBER", the config-audit ledger as a particle
  detector. Every audited mutation (support.{entity}.{op} from write_audit) is a
  DETECTION: a seeded collision-burst SVG (tracks curve differently per event id,
  colored by entity channel), an op stamp (LAID / TUNED / STRUCK / RESEQUENCED /
  REASSIGNED / BACKFILL), actor + clock, and Δ-field signature chips. This frame's
  ten events also ride the BEAMLINE — blips spaced by real timestamp, hover-synced
  both ways, click warps to the row. Rows expand into the detection record
  (action, entity id, origin IP + instrument captured by the audit writer, any
  extra details). Pagination is the FILM ADVANCE: sprocket-holed frame chips with
  a windowed 1 ·· 4 5 6 ·· 12 strip, NEWER/OLDER, 10 per frame, a charging scan
  sweeps the feed while a frame loads.
  Presentational only — items/total/page/busy come in, filter/page/history events
  go out; the section owns the fetch. Distinct from every sibling (DAG hero,
  gauntlet corridor, cadence field, daywheel, and the asset module's equalizer
  Forensic Ledger) — the desk's only detector metaphor.
*/
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import {
  Atom, History, ChevronDown, ChevronLeft, ChevronRight,
} from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  items: { type: Array, default: () => [] },   // raw ConfigLedgerEntry rows (one frame)
  total: { type: Number, default: 0 },
  page: { type: Number, default: 1 },
  limit: { type: Number, default: 10 },
  entity: { type: String, default: '' },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['filter', 'page', 'history'])

const pages = computed(() => Math.max(1, Math.ceil(props.total / props.limit)))

/* detector channels — colors match the desk's entity palette */
const FILTERS = [
  { value: '', label: 'ALL', color: 'var(--sd-qc-hi)' },
  { value: 'queue', label: 'LANES', color: 'var(--sd-qc-core)' },
  { value: 'rule', label: 'RULES', color: 'var(--sd-qc-hi)' },
  { value: 'skill', label: 'SKILLS', color: 'var(--sd-qc-go)' },
  { value: 'sla_package', label: 'SLA', color: 'var(--sd-qc-warn)' },
  { value: 'setting', label: 'SETTINGS', color: 'var(--sd-qc-spill)' },
]
const ENTITY_META = {
  'support.queue': { color: 'var(--sd-qc-core)', label: 'Lane' },
  'support.rule': { color: 'var(--sd-qc-hi)', label: 'Rule' },
  'support.skill': { color: 'var(--sd-qc-go)', label: 'Skill' },
  'support.sla_package': { color: 'var(--sd-qc-warn)', label: 'SLA policy' },
  'support.setting': { color: 'var(--sd-qc-spill)', label: 'Setting' },
}
const OPS = {
  created: { stamp: 'LAID', tone: 'go' },
  updated: { stamp: 'TUNED', tone: 'core' },
  deleted: { stamp: 'STRUCK', tone: 'halt' },
  reordered: { stamp: 'RESEQUENCED', tone: 'hi' },
  tickets_reassigned: { stamp: 'REASSIGNED', tone: 'spill' },
  route_backfill: { stamp: 'BACKFILL', tone: 'warn' },
}

const ago = (iso) => {
  if (!iso) return '—'
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
const clock = (iso) => {
  try {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      .format(new Date(iso))
  } catch { return '' }
}

/* seeded collision tracks — the same event always draws the same burst */
const seedOf = (id) => {
  let h = 0
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}
const burstTracks = (id) => {
  const seed = seedOf(id)
  const n = 4 + (seed % 3)
  return Array.from({ length: n }, (_, i) => {
    const s = (seed >> (i * 4)) & 255
    const a = ((i / n) * 360 + (s % 40)) * (Math.PI / 180)
    const len = 13 + (s % 8)
    const bend = ((s % 11) - 5) * 0.9
    const mx = 22 + Math.cos(a) * (len * 0.55) + Math.cos(a + Math.PI / 2) * bend
    const my = 22 + Math.sin(a) * (len * 0.55) + Math.sin(a + Math.PI / 2) * bend
    const ex = 22 + Math.cos(a) * len
    const ey = 22 + Math.sin(a) * len
    return { d: `M 22 22 Q ${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`, o: 0.45 + ((s % 5) * 0.11) }
  })
}

const HOUSE_KEYS = new Set(['name', 'key', 'fields', 'ip', 'user_agent', 'routed'])
const view = computed(() => {
  const rows = props.items
  const times = rows.map(e => new Date(e.created_at).getTime()).filter(t => !Number.isNaN(t))
  const tMax = times.length ? Math.max(...times) : 1
  const tMin = times.length ? Math.min(...times) : 0
  const span = tMax - tMin
  /* a frame of near-simultaneous events would pile every blip on one spot —
     fall back to even spacing under a one-minute spread */
  const evenly = span < 60000
  return rows.map((e, i) => {
    const meta = ENTITY_META[e.entity_type] || { color: 'var(--sd-qc-spill)', label: 'Config' }
    const op = String(e.action || '').split('.').pop()
    const opMeta = OPS[op] || { stamp: op.toUpperCase().slice(0, 12), tone: 'spill' }
    const d = e.details || {}
    const what = d.name || d.key || meta.label
    let title = `${meta.label} “${what}”`
    if (op === 'reordered') title = 'Rule chain resequenced'
    else if (op === 'route_backfill') title = `Backlog routed — ${d.routed ?? '?'} ticket(s)`
    else if (op === 'tickets_reassigned') title = `Tickets reassigned off “${what}”`
    const t = new Date(e.created_at).getTime()
    const extra = {}
    for (const [k, v] of Object.entries(d)) {
      if (HOUSE_KEYS.has(k) || v == null || typeof v === 'object') continue
      extra[k] = String(v).slice(0, 120)
    }
    return {
      id: e.id, action: e.action, entityId: e.entity_id, name: d.name || '',
      color: meta.color, entityLabel: meta.label,
      op, stamp: opMeta.stamp, tone: opMeta.tone, title,
      actor: e.actor_name || 'system', when: `${clock(e.created_at)} · ${ago(e.created_at)}`,
      fields: Array.isArray(d.fields) ? d.fields : [],
      ip: d.ip || '', ua: d.user_agent || '', extra,
      hasHistory: e.entity_type === 'support.rule' && op !== 'reordered',
      tracks: burstTracks(e.id),
      /* beam position: newest left, oldest right, spaced by real timestamps */
      beamX: Number.isNaN(t) || evenly
        ? (i / Math.max(rows.length - 1, 1)) * 92 + 4
        : 4 + ((tMax - t) / span) * 92,
    }
  })
})

/* hover + warp sync between the beamline and the feed */
const hoverId = ref(null)
const openId = ref(null)
const flashId = ref(null)
const rowEls = {}
const setRowEl = (id, el) => { if (el) rowEls[String(id)] = el; else delete rowEls[String(id)] }
const jumpTo = (id) => {
  const el = rowEls[String(id)]
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  flashId.value = id
  setTimeout(() => { if (flashId.value === id) flashId.value = null }, 900)
}
const expandable = (e) => !!(e.ip || e.ua || Object.keys(e.extra).length || e.fields.length || e.entityId)
const toggleOpen = (e) => { if (expandable(e)) openId.value = openId.value === e.id ? null : e.id }

/* windowed frame strip: 1 ·· p-1 p p+1 ·· N */
const frames = computed(() => {
  const n = pages.value, p = props.page
  if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1)
  const out = [1]
  if (p > 3) out.push('…')
  for (let k = Math.max(2, p - 1); k <= Math.min(n - 1, p + 1); k++) out.push(k)
  if (p < n - 2) out.push('…')
  out.push(n)
  return out
})
</script>

<style scoped>
/* ═══ shell — theme-aware instrument bay (the hero above owns the dark void) ═══ */
.lc {
  position: relative; overflow: hidden; isolation: isolate;
  border: 1px solid var(--sd-border); border-radius: 18px;
  background: linear-gradient(180deg, var(--sd-qc-soft), transparent 130px), var(--sd-surface-elevated);
  padding: 0 18px 16px;
}
.lc-sp { flex: 1; }
.lc-mist {
  position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.5;
  background:
    radial-gradient(46% 30% at 18% 22%, color-mix(in srgb, var(--sd-qc-core) 6%, transparent), transparent 70%),
    radial-gradient(40% 26% at 84% 64%, color-mix(in srgb, var(--sd-qc-core) 5%, transparent), transparent 70%);
}

/* ═══ instrument bar ═══ */
.lc-bar {
  position: relative; z-index: 2; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  margin: 0 -18px 14px; padding: 11px 18px;
  border-bottom: 1px solid var(--sd-border);
  background: linear-gradient(90deg, var(--sd-qc-soft), transparent 60%);
}
.lc-bar-sig {
  display: inline-flex; align-items: center; gap: 7px; cursor: help;
  font-size: 10px; font-weight: 900; letter-spacing: 0.22em; color: var(--sd-qc-core);
}
.lc-bar-note { font-size: 8.5px; letter-spacing: 0.14em; color: var(--sd-text-muted); }
.lc-bar-tele { display: inline-flex; align-items: center; gap: 14px; }
.lc-bar-tele em { font-style: normal; font-size: 8.5px; letter-spacing: 0.14em; color: var(--sd-text-muted); }
.lc-bar-tele em b { font-size: 13px; letter-spacing: 0; color: var(--sd-qc-hi); margin-right: 3px; }
.lc-bar-tele em b i { font-style: normal; color: var(--sd-text-dim); font-size: 10px; }
.lc-bar-tele em.pg b { color: var(--sd-qc-core); }

/* ═══ detector channels ═══ */
.lc-channels { position: relative; z-index: 1; display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 12px; }
.lc-ch {
  display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 999px;
  font-size: 8.5px; font-weight: 900; letter-spacing: 0.16em; cursor: pointer; font-family: inherit;
  color: var(--sd-text-muted); background: transparent; border: 1px solid var(--sd-border);
  animation: lc-ch-in 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: calc(var(--i, 0) * 0.05s);
  transition: color 0.2s, border-color 0.2s, background 0.2s, transform 0.2s, box-shadow 0.2s;
}
@keyframes lc-ch-in { from { opacity: 0; transform: translateY(-6px); } }
.lc-ch:hover { transform: translateY(-1px); }
.lc-ch-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--cc); opacity: 0.55; transition: opacity 0.2s, box-shadow 0.2s; }
.lc-ch.on {
  color: var(--sd-text); border-color: color-mix(in srgb, var(--cc) 55%, transparent);
  background: color-mix(in srgb, var(--cc) 10%, transparent);
  box-shadow: 0 0 14px color-mix(in srgb, var(--cc) 18%, transparent);
}
.lc-ch.on .lc-ch-dot { opacity: 1; box-shadow: 0 0 8px var(--cc); }

/* ═══ the beamline ═══ */
.lc-beam { position: relative; z-index: 1; height: 34px; margin: 0 6px 10px; }
.lc-beam-wire {
  position: absolute; left: 0; right: 0; top: 50%; height: 2px; margin-top: -1px; border-radius: 2px;
  background: repeating-linear-gradient(90deg, color-mix(in srgb, var(--sd-qc-core) 45%, transparent) 0 6px, transparent 6px 12px);
  animation: lc-wire-flow 1.3s linear infinite;
}
@keyframes lc-wire-flow { to { background-position: 12px 0; } }
.lc-beam-pulse {
  position: absolute; left: 0; right: 0; top: 50%; height: 2px; margin-top: -1px; pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--sd-qc-hi) 50%, transparent);
  background-size: 90px 100%; background-repeat: no-repeat;
  animation: lc-pulse-run 4.5s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
}
@keyframes lc-pulse-run { 0% { background-position: -90px 0; } 70%, 100% { background-position: calc(100% + 90px) 0; } }
.lc-blip {
  position: absolute; top: 50%; width: 11px; height: 11px; margin: -5.5px 0 0 -5.5px; border-radius: 50%;
  cursor: pointer; padding: 0; border: 2px solid var(--bc); background: var(--sd-surface-elevated);
  box-shadow: 0 0 8px color-mix(in srgb, var(--bc) 45%, transparent);
  animation: lc-blip-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  transition: transform 0.2s, box-shadow 0.2s;
}
@keyframes lc-blip-in { from { transform: scale(0); } }
.lc-blip:hover, .lc-blip.lit { transform: scale(1.5); box-shadow: 0 0 14px var(--bc); background: var(--bc); }
.lc-beam-cap { position: absolute; top: -3px; font-size: 6.5px; font-weight: 900; letter-spacing: 0.18em; color: var(--sd-text-dim); }
.lc-beam-cap.new { left: 0; } .lc-beam-cap.old { right: 0; }

/* ═══ detections feed ═══ */
.lc-feed { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 8px; min-height: 120px; }
.lc-feed.charging { opacity: 0.55; pointer-events: none; }
.lc-scan {
  position: absolute; inset: 0; z-index: 3; pointer-events: none; border-radius: 12px; overflow: hidden;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--sd-qc-core) 12%, transparent) 50%, transparent);
  background-size: 160px 100%; background-repeat: no-repeat;
  animation: lc-scan-run 1s linear infinite;
}
@keyframes lc-scan-run { 0% { background-position: -160px 0; } 100% { background-position: calc(100% + 160px) 0; } }

.lc-det {
  position: relative; display: grid; grid-template-columns: 46px minmax(0, 1fr) auto; align-items: center;
  gap: 4px 10px; padding: 8px 12px 8px 8px; border-radius: 13px;
  border: 1px solid var(--sd-border); background: var(--sd-surface-elevated);
  animation: lc-det-in 0.55s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: calc(var(--i, 0) * 0.055s);
  transition: border-color 0.25s, box-shadow 0.25s, transform 0.25s;
}
@keyframes lc-det-in { from { opacity: 0; transform: translateY(12px); } }
.lc-det:hover, .lc-det.lit { border-color: color-mix(in srgb, var(--cc) 45%, transparent); transform: translateY(-1px); }
.lc-det.flash { box-shadow: 0 0 0 2px color-mix(in srgb, var(--cc) 60%, transparent), 0 0 22px color-mix(in srgb, var(--cc) 30%, transparent); }
.lc-det.open { border-color: color-mix(in srgb, var(--cc) 45%, transparent); }

.lc-burst {
  width: 44px; height: 44px; padding: 0; cursor: pointer; border: none; background: transparent;
  display: grid; place-items: center;
}
.lc-burst svg { width: 44px; height: 44px; display: block; }
.lc-track {
  fill: none; stroke-width: 1.5; stroke-linecap: round;
  stroke-dasharray: 100; stroke-dashoffset: 100;
  animation: lc-track-draw 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: var(--td, 0s);
}
@keyframes lc-track-draw { to { stroke-dashoffset: 0; } }
.lc-det:hover .lc-track { filter: drop-shadow(0 0 3px currentColor); }
.lc-burst-core { animation: lc-core-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both; animation-delay: calc(var(--i, 0) * 0.055s); }
@keyframes lc-core-pop { from { transform: scale(0); transform-origin: 22px 22px; } }
.lc-burst-ring { fill: none; stroke-width: 1; opacity: 0; animation: lc-ring-emit 2.8s ease-out infinite; animation-delay: 0.6s; }
@keyframes lc-ring-emit { 0% { transform: scale(0.4); transform-origin: 22px 22px; opacity: 0.8; } 60%, 100% { transform: scale(2.6); opacity: 0; } }

.lc-det-body { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.lc-det-h { display: flex; align-items: center; gap: 8px; min-width: 0; }
.lc-stamp {
  flex-shrink: 0; font-size: 7px; font-weight: 900; letter-spacing: 0.18em; padding: 2.5px 7px; border-radius: 5px;
}
.lc-stamp.go { color: var(--sd-qc-go); background: var(--sd-qc-go-soft); border: 1px solid color-mix(in srgb, var(--sd-qc-go) 40%, transparent); }
.lc-stamp.core { color: var(--sd-qc-core); background: var(--sd-qc-soft); border: 1px solid var(--sd-qc-brd); }
.lc-stamp.hi { color: var(--sd-qc-hi); background: var(--sd-qc-hi-soft); border: 1px solid color-mix(in srgb, var(--sd-qc-hi) 40%, transparent); }
.lc-stamp.halt { color: var(--sd-qc-halt); background: var(--sd-qc-halt-soft); border: 1px solid color-mix(in srgb, var(--sd-qc-halt) 40%, transparent); }
.lc-stamp.warn { color: var(--sd-qc-warn); background: var(--sd-qc-warn-soft); border: 1px solid color-mix(in srgb, var(--sd-qc-warn) 40%, transparent); }
.lc-stamp.spill { color: var(--sd-qc-spill); background: var(--sd-qc-spill-soft); border: 1px solid color-mix(in srgb, var(--sd-qc-spill) 40%, transparent); }
.lc-det-title { font-size: 12.5px; font-weight: 700; color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lc-det-sub { font-size: 9.5px; letter-spacing: 0.06em; color: var(--sd-text-muted); }
.lc-det-sub .lc-actor { font-style: normal; color: var(--sd-text-secondary); font-weight: 700; }
.lc-det-sub .lc-ent { font-style: normal; font-size: 8px; font-weight: 900; letter-spacing: 0.14em; }

.lc-sig { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
.lc-sig-lb { font-size: 9px; font-weight: 900; color: var(--sd-qc-core); }
.lc-sig-chip {
  font-size: 8px; font-weight: 700; letter-spacing: 0.08em; padding: 1.5px 7px; border-radius: 999px;
  color: var(--sd-text-secondary); background: color-mix(in srgb, var(--sd-text-dim) 12%, transparent);
  border: 1px solid var(--sd-border);
}
.lc-sig-chip.more { color: var(--sd-qc-hi); border-color: var(--sd-qc-brd); }

.lc-det-acts { display: flex; align-items: center; gap: 6px; }
.lc-hist {
  display: inline-flex; align-items: center; gap: 5px; cursor: pointer; font-family: inherit;
  font-size: 8px; font-weight: 900; letter-spacing: 0.14em; padding: 6px 10px; border-radius: 8px;
  color: var(--sd-qc-core); background: var(--sd-qc-soft); border: 1px solid var(--sd-qc-brd);
}
.lc-x {
  display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; cursor: pointer;
  color: var(--sd-text-dim); background: transparent; border: 1px solid var(--sd-border);
  transition: color 0.2s, border-color 0.2s, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.lc-x:hover { color: var(--sd-qc-core); border-color: var(--sd-qc-brd); }
.lc-x.open { transform: rotate(180deg); color: var(--sd-qc-core); border-color: var(--sd-qc-brd); }

/* the detection record — grid-rows collapse */
.lc-rec {
  grid-column: 1 / -1; display: grid; grid-template-rows: 0fr; opacity: 0;
  transition: grid-template-rows 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s;
}
.lc-rec.open { grid-template-rows: 1fr; opacity: 1; }
.lc-rec-in { overflow: hidden; }
.lc-rec-grid {
  display: grid; grid-template-columns: 92px minmax(0, 1fr); gap: 4px 12px;
  margin: 6px 4px 2px 46px; padding: 9px 12px; border-radius: 10px;
  border: 1px dashed color-mix(in srgb, var(--cc) 35%, transparent);
  background: color-mix(in srgb, var(--cc) 4%, transparent);
}
.lc-rec-grid .k { font-size: 7px; font-weight: 900; letter-spacing: 0.16em; color: var(--sd-text-muted); align-self: center; }
.lc-rec-grid .v { font-size: 9.5px; color: var(--sd-text-secondary); word-break: break-all; }
.lc-rec-grid .v.ua { font-size: 8.5px; color: var(--sd-text-muted); }

/* ═══ quiet chamber ═══ */
.lc-quiet {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 40px 20px 36px; text-align: center; border-radius: 14px;
  border: 1px dashed var(--sd-qc-brd);
  background: radial-gradient(90% 120% at 50% 0%, var(--sd-qc-soft), transparent 55%);
}
.lc-quiet p { margin: 0; font-size: 10.5px; font-weight: 900; letter-spacing: 0.24em; color: var(--sd-qc-core); }
.lc-quiet > span { font-size: 11.5px; color: var(--sd-text-muted); max-width: 440px; line-height: 1.6; }
.lc-quiet-core { position: relative; width: 46px; height: 46px; display: grid; place-items: center; margin-bottom: 4px; }
.lc-quiet-core span {
  position: absolute; inset: 0; border-radius: 50%;
  border: 1.5px solid color-mix(in srgb, var(--sd-qc-core) 55%, transparent);
  animation: lc-quiet-emit 3.4s ease-out infinite;
}
.lc-quiet-core .q2 { animation-delay: 1.15s; }
.lc-quiet-core .q3 { animation-delay: 2.3s; }
@keyframes lc-quiet-emit { from { transform: scale(0.35); opacity: 0.9; } to { transform: scale(1.7); opacity: 0; } }

/* ═══ film advance ═══ */
.lc-film {
  position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap;
  margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--sd-border);
}
.lc-adv {
  display: inline-flex; align-items: center; gap: 5px; cursor: pointer; font-family: inherit;
  font-size: 8.5px; font-weight: 900; letter-spacing: 0.16em; padding: 7px 12px; border-radius: 10px;
  color: var(--sd-qc-core); background: var(--sd-qc-soft); border: 1px solid var(--sd-qc-brd);
  transition: box-shadow 0.2s;
}
.lc-adv:hover:not(:disabled) { box-shadow: var(--sd-qc-glow); }
.lc-adv:disabled { opacity: 0.35; cursor: not-allowed; }
.lc-frames { display: inline-flex; align-items: center; gap: 5px; }
.lc-gap { font-size: 10px; color: var(--sd-text-dim); letter-spacing: 0.1em; padding: 0 2px; }
.lc-frame {
  position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
  min-width: 32px; height: 34px; padding: 0 7px; border-radius: 7px; cursor: pointer; font-family: inherit;
  font-size: 10.5px; font-weight: 800; letter-spacing: 0.04em;
  color: var(--sd-text-muted); background: color-mix(in srgb, var(--sd-text-dim) 8%, transparent);
  border: 1px solid var(--sd-border);
  transition: color 0.25s, background 0.25s, border-color 0.25s, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s;
}
.lc-frame:hover:not(:disabled):not(.on) { transform: translateY(-2px); color: var(--sd-text); border-color: var(--sd-qc-brd); }
.lc-frame.on {
  color: #241703; background: var(--sd-qc-grad); border-color: transparent;
  transform: translateY(-2px) scale(1.08);
  box-shadow: var(--sd-qc-glow);
}
.lc-frame:disabled { cursor: wait; }
.lc-frame-holes { display: flex; gap: 8px; }
.lc-frame-holes i { width: 3px; height: 3px; border-radius: 50%; background: currentColor; opacity: 0.35; }
.lc-frame.on .lc-frame-holes i { opacity: 0.55; }
.lc-film-read { flex-basis: 100%; text-align: center; font-size: 7.5px; letter-spacing: 0.18em; color: var(--sd-text-dim); }
.lc-film-read b { color: var(--sd-qc-hi); font-size: 9px; }

/* ═══ responsive ═══ */
@media (max-width: 700px) {
  .lc-det { grid-template-columns: 40px minmax(0, 1fr); }
  .lc-det-acts { grid-column: 2; justify-self: end; }
  .lc-rec-grid { margin-left: 0; grid-template-columns: 80px minmax(0, 1fr); }
  .lc-beam { display: none; }
}

/* ═══ reduced motion — ambient loops off unless cinematic mode forces them on ═══ */
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .lc-ch,
  html:not([data-cinematic="on"]) .lc-beam-wire,
  html:not([data-cinematic="on"]) .lc-blip,
  html:not([data-cinematic="on"]) .lc-det,
  html:not([data-cinematic="on"]) .lc-burst-core,
  html:not([data-cinematic="on"]) .lc-quiet-core span,
  html:not([data-cinematic="on"]) .lc-scan { animation: none; }
  html:not([data-cinematic="on"]) .lc-track { animation: none; stroke-dashoffset: 0; }
  html:not([data-cinematic="on"]) .lc-beam-pulse,
  html:not([data-cinematic="on"]) .lc-burst-ring { animation: none; opacity: 0; }
  html:not([data-cinematic="on"]) .lc-det:hover, html:not([data-cinematic="on"]) .lc-frame.on { transform: none; }
  html:not([data-cinematic="on"]) .lc-rec { transition: none; }
}

/* ═══ light theme — deepen what reads too pale on cream ═══ */
[data-theme="light"] .lc { background: linear-gradient(180deg, var(--sd-qc-soft), transparent 130px), var(--sd-surface-elevated); }
[data-theme="light"] .lc-det, [data-theme="light"] .lc-frame { box-shadow: 0 2px 8px rgba(60, 42, 8, 0.04); }
[data-theme="light"] .lc-frame.on { box-shadow: var(--sd-qc-glow); }
[data-theme="light"] .lc-sig-chip { background: rgba(60, 45, 20, 0.06); }
</style>
