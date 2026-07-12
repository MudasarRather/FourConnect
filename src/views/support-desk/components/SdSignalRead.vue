<template>
  <!-- SdSignalRead — "SIGNAL PRISM": the intake intelligence WOVEN INTO the form.
       The raw text beam enters a prism and splits into classified spectral bands —
       band length = live confidence. Three faces:
         · variant="live"   — full console inside the Describe step (predictions,
                              coaching, entities, duplicates, live KB)
         · variant="banner" — one-line recommendation strip inside Classify
         · variant="digest" — agreement digest inside Review
       Engine: analyseIntake() (deterministic, explainable — the LLM-swap seam). -->
  <section class="sig" :class="[variant, { engaged: read.engaged, scanning }]">

    <!-- ══ LIVE — the full woven console ══ -->
    <template v-if="variant === 'live'">
      <header class="sig-head">
        <span class="sig-prism" aria-hidden="true">
          <svg viewBox="0 0 120 44" class="sig-prism-svg">
            <line class="pz-beam" x1="0" y1="22" x2="44" y2="22" />
            <path class="pz-glass" d="M46,32 L60,10 L74,32 Z" />
            <line class="pz-band b1" x1="76" y1="14" :x2="76 + bandLen(read.type)" y2="14" />
            <line class="pz-band b2" x1="76" y1="21" :x2="76 + bandLen(read.priority)" y2="21" />
            <line class="pz-band b3" x1="76" y1="28" :x2="76 + bandLen(read.category)" y2="28" />
            <line class="pz-band b4" x1="76" y1="35" :x2="76 + (read.engaged ? 26 : 4)" y2="35" />
          </svg>
        </span>
        <div class="sig-head-txt">
          <b>Signal read <i class="sig-live" :class="{ on: read.engaged }" /></b>
          <i>{{ scanning ? 'Reading the signal…' : read.engaged ? headline : 'Start typing — the prism reads as you write.' }}</i>
        </div>
        <div class="sig-quality" :class="read.quality.level" :style="{ '--q': read.quality.pct }" :title="`Diagnosability ${read.quality.pct}%`">
          <span class="q-ring"><b>{{ read.quality.pct }}<i>%</i></b></span>
          <span class="q-lbl">signal<br />strength</span>
        </div>
        <Motion v-if="diffCount > 1" as="button" type="button" class="sig-applyall"
          :whileHover="{ y: -1, scale: 1.02 }" :whileTap="{ scale: 0.96 }" @click="applyAll">
          <Sparkles :size="12" /> Apply all · {{ diffCount }}
        </Motion>
      </header>

      <!-- prediction cells -->
      <div v-if="read.engaged" class="sig-cells">
        <button type="button" class="sig-cell" :class="{ diff: typeDiff }" :title="evidenceOf(read.type)" @click="typeDiff && apply({ ticket_type: read.type.value })">
          <span class="cell-ring" :style="ringStyle(read.type, 'var(--sd-amber)')"><Tag :size="12" /></span>
          <span class="cell-b"><i>Type</i><b>{{ read.type ? read.type.label : typeLabelOf(ticketType) }}</b></span>
          <span v-if="typeDiff" class="cell-apply">Apply</span>
          <span v-else-if="read.type" class="cell-ok"><Check :size="11" /></span>
        </button>
        <button type="button" class="sig-cell" :class="{ diff: priDiff }" :title="evidenceOf(read.priority)" @click="priDiff && apply({ priority: read.priority.value, impact: read.impact?.value, urgency: read.impact ? read.urgency?.value : undefined })">
          <span class="cell-ring" :style="ringStyle(read.priority, priColor(read.priority?.value || priority))"><Flag :size="12" /></span>
          <span class="cell-b"><i>Priority</i><b :style="{ color: priColor(read.priority?.value || priority) }">{{ priLabel(read.priority?.value || priority) }}<em v-if="read.impact && read.urgency" class="cell-mx"> · {{ cap(read.impact.value) }}×{{ cap(read.urgency.value) }}</em></b></span>
          <span v-if="priDiff" class="cell-apply">Apply</span>
          <span v-else-if="read.priority" class="cell-ok"><Check :size="11" /></span>
        </button>
        <button type="button" class="sig-cell" :class="{ diff: catDiff }" :title="evidenceOf(read.category)" @click="catDiff && apply({ category_id: read.category.id, subcategory_id: read.subcategory?.id })">
          <span class="cell-ring" :style="ringStyle(read.category, 'var(--sd-ember)')"><Layers :size="12" /></span>
          <span class="cell-b"><i>Category</i><b>{{ read.category ? read.category.name : '—' }}<em v-if="read.subcategory" class="cell-mx"> › {{ read.subcategory.name }}</em></b></span>
          <span v-if="catDiff" class="cell-apply">Apply</span>
          <span v-else-if="read.category" class="cell-ok"><Check :size="11" /></span>
        </button>
        <div class="sig-cell stat" :title="`Sentiment score ${read.sentiment.score.toFixed(1)}`">
          <span class="cell-face" :class="read.sentiment.tone">{{ read.sentiment.emoji }}</span>
          <span class="cell-b"><i>Sentiment</i><b :class="`snt-${read.sentiment.tone}`">{{ read.sentiment.label }}</b></span>
          <span class="cell-meter"><b :style="{ width: read.sentiment.pct + '%' }" :class="`snt-bg-${read.sentiment.tone}`" /></span>
        </div>
      </div>

      <!-- coaching + entities -->
      <div v-if="read.engaged && (read.quality.tips.length || entityChips.length)" class="sig-strip">
        <template v-if="read.quality.tips.length">
          <span class="strip-lbl"><Lightbulb :size="11" /> Stronger signal:</span>
          <button v-for="tip in read.quality.tips" :key="tip" type="button" class="strip-tip" @click="$emit('focus-desc')">{{ tip }}</button>
        </template>
        <span v-if="entityChips.length" class="strip-ents">
          <span v-for="e in entityChips" :key="e.k + e.v" class="strip-ent" :class="e.k"><component :is="e.icon" :size="10" /> {{ e.v }}</span>
        </span>
      </div>

      <!-- duplicates -->
      <Presence>
        <Motion v-if="read.duplicates.length" class="sig-lane warn" :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }">
          <span class="lane-lbl"><CopyCheck :size="11" /> Looks similar to</span>
          <button v-for="d in read.duplicates" :key="d.id" type="button" class="lane-card" @click="$emit('open', d.id)">
            <span class="lc-sim" :style="{ '--s': d.sim }">{{ Math.round(d.sim * 100) }}%</span>
            <span class="lc-b"><b>{{ d.subject }}</b><i class="sd-mono">{{ d.ticket_number }} · {{ statusLabel(d.status) }}</i></span>
            <ArrowUpRight :size="12" />
          </button>
        </Motion>
      </Presence>

      <!-- knowledge -->
      <Presence>
        <Motion v-if="articles.length" class="sig-lane" :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }">
          <span class="lane-lbl"><BookOpen :size="11" /> Known fixes</span>
          <button v-for="a in articles" :key="a.id" type="button" class="lane-card kb" @click="$emit('article', a)">
            <span class="lc-ic"><FileText :size="13" /></span>
            <span class="lc-b"><b>{{ a.title }}</b><i>{{ a.category_name || excerptOf(a) }}</i></span>
            <ArrowUpRight :size="12" />
          </button>
        </Motion>
      </Presence>
    </template>

    <!-- ══ BANNER — Classify-step recommendation strip ══ -->
    <template v-else-if="variant === 'banner'">
      <div v-if="read.engaged && (read.category || read.priority)" class="sig-banner">
        <span class="bn-orb"><BrainCircuit :size="14" /><span class="bn-ring" aria-hidden="true" /></span>
        <span class="bn-lead">Intelligence read<i>from your description</i></span>
        <button v-if="read.category" type="button" class="bn-chip" :class="{ on: !catDiff }" :title="evidenceOf(read.category)" @click="catDiff && apply({ category_id: read.category.id, subcategory_id: read.subcategory?.id })">
          <Layers :size="11" /> {{ read.category.name }}<em v-if="read.subcategory"> › {{ read.subcategory.name }}</em>
          <b class="bn-conf">{{ pct(read.category.confidence) }}</b>
          <span v-if="catDiff" class="bn-apply">Apply</span><Check v-else :size="11" class="bn-ok" />
        </button>
        <button v-if="read.impact && read.urgency" type="button" class="bn-chip" :class="{ on: !mxDiff }" :title="evidenceOf(read.priority)" @click="mxDiff && apply({ impact: read.impact.value, urgency: read.urgency.value, priority: read.priority?.value })">
          <Crosshair :size="11" /> {{ cap(read.impact.value) }} × {{ cap(read.urgency.value) }}
          <em v-if="read.priority" :style="{ color: priColor(read.priority.value) }"> ⇒ {{ priP(read.priority.value) }}</em>
          <span v-if="mxDiff" class="bn-apply">Apply</span><Check v-else :size="11" class="bn-ok" />
        </button>
      </div>
    </template>

    <!-- ══ DIGEST — Review-step agreement grid ══ -->
    <template v-else>
      <div v-if="read.engaged" class="sig-digest">
        <span class="dg-head"><BrainCircuit :size="12" /> Intelligence digest</span>
        <div class="dg-grid">
          <div class="dg-cell" :class="{ ok: !typeDiff }"><i>Type read</i><b>{{ read.type ? read.type.label : '—' }}</b><em>{{ typeDiff ? 'differs from your pick' : 'matches' }}</em></div>
          <div class="dg-cell" :class="{ ok: !catDiff }"><i>Category read</i><b>{{ read.category ? read.category.name : '—' }}</b><em>{{ catDiff ? 'differs from your pick' : 'matches' }}</em></div>
          <div class="dg-cell" :class="{ ok: !priDiff }"><i>Priority read</i><b :style="{ color: priColor(read.priority?.value || priority) }">{{ read.priority ? priLabel(read.priority.value) : '—' }}</b><em>{{ priDiff ? 'differs from your pick' : 'matches' }}</em></div>
          <div class="dg-cell" :class="read.quality.level"><i>Signal strength</i><b>{{ read.quality.pct }}%</b><em>{{ read.quality.level === 'strong' ? 'well described' : read.quality.level === 'fair' ? 'could be richer' : 'thin — agents may ask back' }}</em></div>
        </div>
        <p v-if="read.duplicates.length" class="dg-warn"><CopyCheck :size="11" /> {{ read.duplicates.length }} similar ticket{{ read.duplicates.length > 1 ? 's' : '' }} already open — consider checking before submitting.</p>
      </div>
    </template>
  </section>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  Sparkles, Tag, Flag, Layers, Check, Lightbulb, CopyCheck, BookOpen, FileText,
  ArrowUpRight, BrainCircuit, Crosshair, TerminalSquare, AppWindow, HardDrive, Users,
} from 'lucide-vue-next'
import { listMyKb, priorityColor, priorityLabel, priorityP, typeLabel as typeLabelOf, statusLabel } from '@/composables/useSupportDesk'
import { analyseIntake } from '../intakeEngine'

const props = defineProps({
  variant: { type: String, default: 'live' },            // live | banner | digest
  subject: { type: String, default: '' },
  description: { type: String, default: '' },
  ticketType: { type: String, default: 'incident' },
  priority: { type: String, default: 'medium' },
  impact: { type: String, default: '' },
  urgency: { type: String, default: '' },
  categoryId: { type: String, default: '' },
  subcategoryId: { type: String, default: '' },
  categories: { type: Array, default: () => [] },
  recentTickets: { type: Array, default: () => [] },
})
const emit = defineEmits(['apply', 'open', 'article', 'focus-desc'])

const priColor = (v) => priorityColor(v)
const priLabel = (v) => priorityLabel(v)
const priP = (v) => priorityP(v)
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')
const pct = (c) => `${Math.round((c || 0) * 100)}%`

/* the read — recomputed live from the engine */
const read = computed(() => analyseIntake({
  subject: props.subject, description: props.description,
  categories: props.categories, recentTickets: props.recentTickets,
}))
const headline = computed(() => {
  const r = read.value
  const bits = []
  if (r.type) bits.push(`${r.type.label.toLowerCase()} ${pct(r.type.confidence)}`)
  if (r.category) bits.push(r.category.name.toLowerCase())
  if (r.priority) bits.push(priLabel(r.priority.value).toLowerCase())
  return bits.length ? `Reads as ${bits.join(' · ')}` : 'Signal is thin — add a little more detail.'
})

/* diffs (what Apply would change) */
const typeDiff = computed(() => !!read.value.type && read.value.type.value !== props.ticketType)
const priDiff = computed(() => !!read.value.priority && read.value.priority.value !== props.priority)
const catDiff = computed(() => !!read.value.category && String(read.value.category.id) !== String(props.categoryId))
const mxDiff = computed(() => !!read.value.impact && !!read.value.urgency && (read.value.impact.value !== props.impact || read.value.urgency.value !== props.urgency))
const diffCount = computed(() => [typeDiff.value, priDiff.value, catDiff.value].filter(Boolean).length)

const apply = (patch) => emit('apply', patch)
const applyAll = () => {
  const r = read.value; const patch = {}
  if (typeDiff.value) patch.ticket_type = r.type.value
  if (catDiff.value) { patch.category_id = r.category.id; if (r.subcategory) patch.subcategory_id = r.subcategory.id }
  if (priDiff.value) { patch.priority = r.priority.value; if (r.impact) patch.impact = r.impact.value; if (r.urgency) patch.urgency = r.urgency.value }
  emit('apply', patch)
}
const evidenceOf = (x) => (x?.evidence?.length ? `Why: ${x.evidence.join(' · ')} — confidence ${pct(x.confidence)}` : '')

/* prism band lengths (SVG px) from confidence */
const bandLen = (x) => 4 + Math.round((x?.confidence || 0) * 38)

/* confidence ring style (conic) */
const ringStyle = (x, color) => ({ '--rc': color, '--deg': `${Math.round((x?.confidence || 0) * 360)}deg` })

/* entity chips */
const entityChips = computed(() => {
  const e = read.value.entities; const out = []
  for (const c of e.codes) out.push({ k: 'code', v: c, icon: TerminalSquare })
  for (const a of e.apps) out.push({ k: 'app', v: a, icon: AppWindow })
  for (const d of e.devices) out.push({ k: 'dev', v: d, icon: HardDrive })
  if (e.affected != null) out.push({ k: 'aff', v: `${e.affected} users`, icon: Users })
  return out.slice(0, 6)
})

/* live KB (debounced real search) — live variant only */
const articles = ref([])
const scanning = ref(false)
let kbTimer = null
const excerptOf = (a) => ((a.body || a.content || '').replace(/<[^>]+>/g, '').slice(0, 64) || '')
const runKb = () => {
  const q = read.value.kbQuery
  if (props.variant !== 'live' || q.length < 3) { articles.value = []; return }
  listMyKb({ q, limit: 3 })
    .then(res => { articles.value = (Array.isArray(res) ? res : res?.items || []).slice(0, 3) })
    .catch(() => { articles.value = [] })
}
watch(() => [props.subject, props.description], () => {
  if (props.variant !== 'live') return
  if (!read.value.engaged) { articles.value = []; scanning.value = false; return }
  scanning.value = true
  clearTimeout(kbTimer)
  kbTimer = setTimeout(() => { runKb(); scanning.value = false }, 550)
}, { immediate: true })
onBeforeUnmount(() => clearTimeout(kbTimer))
</script>

<style scoped>
.sig { position: relative; border-radius: 16px; }

/* ══ LIVE console ══ */
.sig.live { padding: 0; border: 1px solid var(--sd-border); background: linear-gradient(180deg, var(--sd-surface-glass), var(--sd-surface)); overflow: hidden; }
.sig.live::before { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: 0.35; background-image: radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 3px 3px; }
.sig.live.scanning::after { content: ""; position: absolute; inset: 0 0 auto; height: 2px; background: linear-gradient(90deg, transparent, var(--sd-amber), var(--sd-ember), transparent); background-size: 200% 100%; animation: sd-rail-flow 1.3s linear infinite; }

.sig-head { position: relative; display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-bottom: 1px solid var(--sd-border); }
.sig-prism { flex-shrink: 0; width: 108px; height: 40px; }
.sig-prism-svg { width: 100%; height: 100%; overflow: visible; }
.pz-beam { stroke: color-mix(in srgb, var(--sd-text-muted) 65%, transparent); stroke-width: 2; stroke-dasharray: 6 5; animation: pz-run 1.6s linear infinite; }
.sig.engaged .pz-beam { stroke: var(--sd-amber); }
.pz-glass { fill: color-mix(in srgb, var(--sd-amber) 10%, transparent); stroke: color-mix(in srgb, var(--sd-amber) 65%, transparent); stroke-width: 1.4; }
.sig.engaged .pz-glass { filter: drop-shadow(0 0 6px color-mix(in srgb, var(--sd-amber) 50%, transparent)); }
.pz-band { stroke-width: 3; stroke-linecap: round; transition: x2 0.6s var(--sd-spring); }
.pz-band.b1 { stroke: var(--sd-amber); } .pz-band.b2 { stroke: var(--sd-pri-urgent, #f97316); }
.pz-band.b3 { stroke: var(--sd-ember); } .pz-band.b4 { stroke: var(--sd-success); }
@keyframes pz-run { to { stroke-dashoffset: -22; } }

.sig-head-txt { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.sig-head-txt b { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 800; letter-spacing: 0.02em; text-transform: uppercase; color: var(--sd-text); }
.sig-live { width: 7px; height: 7px; border-radius: 50%; background: var(--sd-text-dim); transition: background 0.3s; }
.sig-live.on { background: var(--sd-success); box-shadow: 0 0 8px color-mix(in srgb, var(--sd-success) 70%, transparent); animation: sig-blink 2.2s ease-in-out infinite; }
.sig-head-txt i { font-style: normal; font-size: 11.5px; color: var(--sd-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
@keyframes sig-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }

.sig-quality { display: flex; align-items: center; gap: 7px; flex-shrink: 0; }
.q-ring { position: relative; display: grid; place-items: center; width: 38px; height: 38px; border-radius: 50%;
  background: conic-gradient(var(--sd-amber) calc(var(--q) * 1%), color-mix(in srgb, var(--sd-border-strong) 80%, transparent) 0); }
.sig-quality.strong .q-ring { background: conic-gradient(var(--sd-success) calc(var(--q) * 1%), color-mix(in srgb, var(--sd-border-strong) 80%, transparent) 0); }
.sig-quality.thin .q-ring { background: conic-gradient(var(--sd-pri-urgent, #f97316) calc(var(--q) * 1%), color-mix(in srgb, var(--sd-border-strong) 80%, transparent) 0); }
.q-ring::after { content: ""; position: absolute; inset: 3.5px; border-radius: 50%; background: var(--sd-surface); }
.q-ring b { position: relative; z-index: 1; font-family: var(--sd-mono); font-size: 10.5px; font-weight: 800; color: var(--sd-text); }
.q-ring b i { font-style: normal; font-size: 7.5px; color: var(--sd-text-muted); }
.q-lbl { font-family: var(--sd-mono); font-size: 8px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--sd-text-dim); line-height: 1.3; }

.sig-applyall { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 999px; border: none; cursor: pointer; font-family: inherit; font-size: 11px; font-weight: 800; color: #1a1206; background: var(--sd-grad-hero); box-shadow: 0 6px 18px rgba(251, 146, 60, 0.3); flex-shrink: 0; }
[data-theme="light"] .sig-applyall { color: #fff8ec; }

/* prediction cells */
.sig-cells { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; padding: 10px 12px; }
.sig-cell { position: relative; display: flex; align-items: center; gap: 10px; padding: 9px 11px; border-radius: 12px; text-align: left; cursor: default; font-family: inherit; background: var(--sd-surface); border: 1px solid var(--sd-border); transition: border-color 0.2s, transform 0.2s var(--sd-spring), box-shadow 0.2s; }
.sig-cell.diff { cursor: pointer; border-color: var(--sd-amber-border); }
.sig-cell.diff:hover { transform: translateY(-2px); box-shadow: 0 8px 20px color-mix(in srgb, var(--sd-amber) 16%, transparent); background: var(--sd-amber-soft); }
.cell-ring { position: relative; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; color: var(--rc, var(--sd-amber)); flex-shrink: 0;
  background: conic-gradient(var(--rc, var(--sd-amber)) var(--deg, 0deg), color-mix(in srgb, var(--sd-border-strong) 75%, transparent) 0); transition: background 0.5s; }
.cell-ring::after { content: ""; position: absolute; inset: 3px; border-radius: 50%; background: var(--sd-surface); }
.cell-ring svg { position: relative; z-index: 1; }
.cell-b { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.cell-b i { font-style: normal; font-size: 9px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--sd-text-dim); }
.cell-b b { font-size: 12.5px; font-weight: 750; color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cell-mx { font-style: normal; font-size: 10.5px; font-weight: 650; color: var(--sd-text-muted); }
.cell-apply { font-size: 9.5px; font-weight: 800; letter-spacing: 0.04em; color: #1a1206; background: var(--sd-grad-hero); padding: 3px 8px; border-radius: 7px; flex-shrink: 0; }
[data-theme="light"] .cell-apply { color: #fff8ec; }
.cell-ok { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 50%; color: var(--sd-success); background: var(--sd-success-soft); flex-shrink: 0; }
.cell-face { font-size: 21px; flex-shrink: 0; }
.cell-meter { position: absolute; left: 11px; right: 11px; bottom: 4px; height: 3px; border-radius: 999px; background: color-mix(in srgb, var(--sd-border-strong) 70%, transparent); overflow: hidden; }
.cell-meter b { position: absolute; inset: 0 auto 0 0; border-radius: inherit; transition: width 0.5s var(--sd-spring); }
.snt-critical { color: var(--sd-pri-critical); } .snt-negative { color: var(--sd-pri-urgent, #f97316); }
.snt-positive { color: var(--sd-success); } .snt-neutral { color: var(--sd-text-secondary); }
.snt-bg-critical { background: var(--sd-pri-critical); } .snt-bg-negative { background: var(--sd-pri-urgent, #f97316); }
.snt-bg-positive { background: var(--sd-success); } .snt-bg-neutral { background: var(--sd-steel, #9ca3af); }

/* coaching + entities strip */
.sig-strip { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 0 12px 10px; }
.strip-lbl { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; color: var(--sd-amber); }
.strip-tip { font-size: 10.5px; font-weight: 600; color: var(--sd-text-secondary); padding: 4px 10px; border-radius: 999px; cursor: pointer; font-family: inherit; background: var(--sd-surface); border: 1px dashed var(--sd-amber-border); transition: background 0.2s, transform 0.2s var(--sd-spring); }
.strip-tip:hover { background: var(--sd-amber-soft); transform: translateY(-1px); }
.strip-ents { display: inline-flex; flex-wrap: wrap; gap: 5px; margin-left: auto; }
.strip-ent { display: inline-flex; align-items: center; gap: 4px; font-family: var(--sd-mono); font-size: 9.5px; font-weight: 700; padding: 3px 8px; border-radius: 7px; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border); }
.strip-ent.code { color: var(--sd-pri-urgent, #f97316); border-color: color-mix(in srgb, var(--sd-pri-urgent, #f97316) 35%, transparent); }
.strip-ent.aff { color: var(--sd-amber); border-color: var(--sd-amber-border); }

/* duplicate / kb lanes */
.sig-lane { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; padding: 9px 12px; border-top: 1px dashed var(--sd-border); overflow: hidden; }
.sig-lane.warn { background: color-mix(in srgb, var(--sd-pri-urgent, #f97316) 5%, transparent); }
.lane-lbl { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--sd-text-muted); flex-shrink: 0; }
.sig-lane.warn .lane-lbl { color: var(--sd-pri-urgent, #f97316); }
.lane-card { display: inline-flex; align-items: center; gap: 8px; max-width: 320px; padding: 6px 9px; border-radius: 10px; cursor: pointer; font-family: inherit; text-align: left; background: var(--sd-surface); border: 1px solid var(--sd-border); transition: transform 0.16s var(--sd-spring), border-color 0.16s; }
.lane-card:hover { transform: translateY(-1px); border-color: var(--sd-amber-border); }
.sig-lane.warn .lane-card:hover { border-color: var(--sd-pri-urgent, #f97316); }
.lc-sim { display: grid; place-items: center; min-width: 34px; height: 26px; border-radius: 7px; font-family: var(--sd-mono); font-size: 10px; font-weight: 800; color: var(--sd-pri-urgent, #f97316); background: color-mix(in srgb, var(--sd-pri-urgent, #f97316) calc(8% + var(--s) * 18%), transparent); flex-shrink: 0; }
.lc-ic { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 7px; color: var(--sd-amber); background: var(--sd-amber-soft); flex-shrink: 0; }
.lc-b { display: flex; flex-direction: column; min-width: 0; }
.lc-b b { font-size: 11.5px; font-weight: 650; color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; }
.lc-b i { font-style: normal; font-size: 9.5px; color: var(--sd-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lane-card > svg { color: var(--sd-text-dim); flex-shrink: 0; }

/* ══ BANNER ══ */
.sig.banner { border: none; }
.sig-banner { display: flex; flex-wrap: wrap; align-items: center; gap: 9px; padding: 10px 13px; border-radius: 14px; background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); }
.bn-orb { position: relative; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 10px; color: var(--sd-amber); background: var(--sd-surface); border: 1px solid var(--sd-amber-border); flex-shrink: 0; }
.bn-ring { position: absolute; inset: -3px; border-radius: 12px; border: 1.5px solid transparent; border-top-color: var(--sd-amber); animation: sd-spin-slow 3.4s linear infinite; opacity: 0.65; }
.bn-lead { display: flex; flex-direction: column; font-size: 11.5px; font-weight: 800; color: var(--sd-text); }
.bn-lead i { font-style: normal; font-size: 9.5px; font-weight: 600; color: var(--sd-text-muted); }
.bn-chip { display: inline-flex; align-items: center; gap: 6px; padding: 7px 11px; border-radius: 999px; cursor: pointer; font-family: inherit; font-size: 11.5px; font-weight: 700; color: var(--sd-text); background: var(--sd-surface); border: 1px solid var(--sd-amber-border); transition: transform 0.18s var(--sd-spring), box-shadow 0.18s; }
.bn-chip:hover { transform: translateY(-1px); box-shadow: 0 6px 16px color-mix(in srgb, var(--sd-amber) 18%, transparent); }
.bn-chip.on { cursor: default; border-color: color-mix(in srgb, var(--sd-success) 40%, transparent); }
.bn-chip.on:hover { transform: none; box-shadow: none; }
.bn-chip em { font-style: normal; font-weight: 700; color: var(--sd-text-secondary); }
.bn-conf { font-family: var(--sd-mono); font-size: 9px; font-weight: 800; color: var(--sd-amber); padding: 1px 6px; border-radius: 6px; background: var(--sd-amber-soft); }
.bn-apply { font-size: 9px; font-weight: 800; color: #1a1206; background: var(--sd-grad-hero); padding: 2px 7px; border-radius: 6px; }
[data-theme="light"] .bn-apply { color: #fff8ec; }
.bn-ok { color: var(--sd-success); }

/* ══ DIGEST ══ */
.sig.digest { border: none; }
.sig-digest { display: flex; flex-direction: column; gap: 9px; padding: 12px 14px; border-radius: 14px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.dg-head { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--sd-text-muted); }
.dg-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; }
.dg-cell { display: flex; flex-direction: column; gap: 2px; padding: 9px 11px; border-radius: 11px; background: var(--sd-surface); border: 1px solid var(--sd-border); }
.dg-cell.ok { border-color: color-mix(in srgb, var(--sd-success) 32%, transparent); }
.dg-cell.thin { border-color: color-mix(in srgb, var(--sd-pri-urgent, #f97316) 35%, transparent); }
.dg-cell i { font-style: normal; font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--sd-text-dim); }
.dg-cell b { font-size: 13px; font-weight: 750; color: var(--sd-text); }
.dg-cell em { font-style: normal; font-size: 10px; color: var(--sd-text-muted); }
.dg-warn { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 11px; font-weight: 600; color: var(--sd-pri-urgent, #f97316); }

@media (max-width: 720px) { .sig-prism { display: none; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .pz-beam,
  html:not([data-cinematic="on"]) .sig-live.on,
  html:not([data-cinematic="on"]) .bn-ring,
  html:not([data-cinematic="on"]) .sig.live.scanning::after { animation: none; }
}
</style>
