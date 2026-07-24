<template>
  <!-- SdRcaWorkbench — "THE FRAME INSPECTOR" (STACK DESCENT body): the selected
       trace's bench on --sd-rca-bench (dark BOTH themes). Returned filings surface
       the reviewer's exception plate with an unmissable RE-FILE arrow; the five
       whys render as descending luminous stack frames ending in the glowing ROOT
       frame; corrective/preventive ship as patch hunks; factors as locals-in-scope
       chips. Verbs: FILE/RE-FILE/REVISE · OPEN INCIDENT · PROBLEM WORKBENCH · KEDB. -->
  <aside class="rwb" aria-label="Frame inspector">
    <template v-if="ticket">
      <header class="rwb-head">
        <span class="bid sd-mono">{{ ticket.ticket_number }}</span>
        <SdIncSevBadge :sev="ticket.sev" />
        <SdRcaStatusStamp :row="ticket" :inherited="!!ticket.inherited" />
        <span v-if="ticket.is_major_incident" class="mi-chip sd-mono">MI</span>
      </header>
      <h3 class="rwb-subject">{{ ticket.subject }}</h3>
      <div class="rwb-stamps sd-mono">
        <span v-if="ticket.rca_filed_at">FILED <b>{{ ticket.rca_filed_by_name || '—' }}</b> · {{ dt(ticket.rca_filed_at) }}</span>
        <span v-if="ticket.rca_reviewed_at">RULED <b>{{ ticket.rca_reviewed_by_name || '—' }}</b> · {{ dt(ticket.rca_reviewed_at) }}</span>
        <span v-if="!ticket.rca_filed_at">TERMINAL {{ dt(ticket.resolved_at || ticket.closed_at) }} · <b>{{ owedAge }}</b> ON THE CLOCK</span>
      </div>

      <!-- ═ RETURNED · the reviewer's exception plate — the respond-to-return loop ═ -->
      <Transition name="rwb-rise">
        <div v-if="status === 'returned'" class="ret-plate" role="alert">
          <div class="rp-title sd-mono">⚠ REVIEWER EXCEPTION — RETURNED WITH NOTE</div>
          <p class="rp-body">{{ ticket.rca_review_note || 'The reviewer returned this filing for rework.' }}</p>
          <div class="rp-who sd-mono">— {{ ticket.rca_reviewed_by_name || 'reviewer' }}<template v-if="ticket.rca_reviewed_at"> · {{ dt(ticket.rca_reviewed_at) }}</template></div>
          <button class="rp-refile" @click="emit('file')">
            <RotateCcw :size="12" /> RE-FILE THE TEARDOWN <span class="rp-arrow" aria-hidden="true">⟶</span>
          </button>
        </div>
      </Transition>
      <Transition name="rwb-rise">
        <div v-if="status === 'stale'" class="stale-plate" role="alert">
          <div class="sp-title sd-mono">⌛ INVALIDATED BY REOPEN</div>
          <p class="sp-body">The record reopened after this story was filed — the stack no longer matches the trace. Re-file it.</p>
          <button class="rp-refile amber" @click="emit('file')">
            <RotateCcw :size="12" /> RE-FILE FOR REVIEW <span class="rp-arrow" aria-hidden="true">⟶</span>
          </button>
        </div>
      </Transition>

      <!-- ═ root-cause category · the register bank (A1) — set in the console ═ -->
      <h4 class="zone sd-mono">ROOT-CAUSE CATEGORY <span class="aux">SELECT ONE REGISTER</span></h4>
      <div class="cat-chips">
        <button v-for="c in ROOT_CAUSES" :key="c.value" type="button" class="cat-chip sd-mono"
          :class="{ on: ticket.rca_category === c.value }"
          :title="ticket.rca_category === c.value ? 'The filed register' : 'Open the console to set it'"
          @click="emit('file')">{{ c.label.toUpperCase() }}</button>
      </div>

      <!-- ═ summary · what broke, plain language ═ -->
      <h4 class="zone sd-mono">SUMMARY <span class="aux">WHAT BROKE · PLAIN LANGUAGE</span></h4>
      <p class="rwb-summary field" :class="{ ghost: !summary }">
        {{ summary || 'Unwritten — draft the plain-language failure narrative in the console before descending the stack.' }}</p>

      <!-- ═ 5-whys chain · descending frames mirroring the exploded stack ═ -->
      <h4 class="zone sd-mono">5-WHYS CHAIN <span class="aux">MIRRORS THE STACK ABOVE</span></h4>
      <div class="stack" :class="{ ghosted: !hasWhys }">
        <div v-for="(f, i) in frames" :key="`fr-${i}`" class="frame"
          :class="{ root: f.root, ghost: f.ghost }" :style="{ '--depth': i, '--i': i }">
          <span class="f-gut sd-mono">{{ ln(i) }}<i class="f-bp" :class="{ hot: f.root }" /></span>
          <div class="f-card">
            <div class="f-top">
              <span class="f-idx sd-mono">#{{ i }}</span>
              <span class="f-sig sd-mono">{{ f.sig }}</span>
              <span class="f-tag sd-mono">{{ f.tag }}</span>
            </div>
            <p class="f-why">{{ f.text }}</p>
            <span v-if="f.root && ticket.rca_category" class="f-cat sd-mono">ROOT REGISTER · {{ catLabel }}</span>
          </div>
        </div>
      </div>

      <!-- ═ contributing factors · locals in scope ═ -->
      <h4 class="zone sd-mono">CONTRIBUTING FACTORS <span class="aux">LOCALS IN SCOPE</span></h4>
      <div class="facs">
        <div v-for="(f, i) in factors" :key="`fa-${i}`" class="fac-ln">
          <span class="fk sd-mono">[{{ f.tag }}]</span><span class="ft sd-mono">{{ f.text }}</span>
        </div>
        <button type="button" class="fac-ln fac-add sd-mono" @click="emit('file')">+ PUSH FACTOR ONTO STACK</button>
      </div>

      <!-- ═ patch hunks · corrective now, preventive forever ═ -->
      <template v-if="correctiveLines.length">
        <h4 class="zone sd-mono">CORRECTIVE PATCH <span class="aux">FIX IT NOW</span></h4>
        <div class="patch">
          <div class="p-h sd-mono">@@ corrective — apply now @@</div>
          <div v-for="(l, i) in correctiveLines" :key="`c-${i}`" class="p-ln add sd-mono">
            <span class="g">+{{ i + 1 }}</span><span class="t">{{ l }}</span>
          </div>
        </div>
      </template>
      <template v-if="preventiveLines.length">
        <h4 class="zone sd-mono">PREVENTIVE PATCH <span class="aux">NEVER AGAIN</span></h4>
        <div class="patch">
          <div class="p-h sd-mono">@@ preventive — never again @@</div>
          <div v-for="(l, i) in preventiveLines" :key="`p-${i}`" class="p-ln add sd-mono">
            <span class="g">+{{ i + 1 }}</span><span class="t">{{ l }}</span>
          </div>
        </div>
      </template>

      <!-- ═ verbs · resolve the stack ═ -->
      <div class="rwb-verbs">
        <Motion v-if="canFile" as="button" class="vb primary" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }"
          @click="emit('file')"><Hammer :size="12" /> {{ fileLabel }}</Motion>
        <span v-else class="vb readonly sd-mono"
          title="This ticket is assigned to another agent — only they, the team lead, or an admin can file its RCA.">
          <Lock :size="12" /> READ-ONLY · NOT YOUR DESK</span>
        <Motion as="button" class="vb" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }"
          @click="emit('open')"><ArrowUpRight :size="12" /> OPEN INCIDENT</Motion>
        <Motion as="button" class="vb" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }"
          @click="emit('go')"><GitBranch :size="12" /> PROBLEM WORKBENCH</Motion>
        <Motion v-if="hasSummary" as="button" class="vb kedb" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }"
          @click="emit('promote')"><Layers :size="12" /> PROMOTE TO SYMBOL DB · KEDB</Motion>
        <span v-if="ticket.linked_problem_id" class="prob-chip sd-mono"><GitBranch :size="9" /> PROBLEM-LINKED</span>
      </div>

      <!-- ═ precedent slot ═ -->
      <div class="rwb-prec"><slot name="precedent" /></div>
    </template>

    <!-- idle bench -->
    <div v-else class="rwb-idle">
      <span class="idle-glyph sd-mono">[ ]</span>
      <b class="sd-mono">NO FRAME UNDER THE LOUPE</b>
      <p>Pick a trace from the buffer to seat it on the bench.</p>
      <div class="idle-keys sd-mono">
        <span><b>↑↓</b> SELECT</span><span><b>↵</b> OPEN</span><span><b>F</b> FILE</span><span><b>/</b> SEARCH</span>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Hammer, ArrowUpRight, GitBranch, Layers, RotateCcw, Lock } from 'lucide-vue-next'
import SdIncSevBadge from './SdIncSevBadge.vue'
import SdRcaStatusStamp from './SdRcaStatusStamp.vue'
import { rcaStatusOf, ROOT_CAUSES } from '@/composables/useSupportDesk'

const props = defineProps({
  ticket: { type: Object, default: null },
  now: { type: Number, default: () => Date.now() },
})
const emit = defineEmits(['file', 'open', 'go', 'promote'])

const status = computed(() => (props.ticket ? rcaStatusOf(props.ticket) : 'owed'))
/* server-computed owner-tier gate (mirrors POST /rca); undefined ⇒ allowed (no regression) */
const canFile = computed(() => props.ticket?.can_file !== false)
const catLabel = computed(() => (props.ticket?.rca_category || '').replace(/_/g, ' ').toUpperCase())
const summary = computed(() => (props.ticket?.rca_summary_preview || props.ticket?.rca_summary || '').trim())
const hasSummary = computed(() => !!summary.value)
/* factors render as locals-in-scope rows; a leading "[TAG]" in the saved string
   becomes the register key, anything else files under [LOCAL] */
const factors = computed(() => (Array.isArray(props.ticket?.rca_factors) ? props.ticket.rca_factors : [])
  .map((f) => String(f).trim()).filter(Boolean)
  .map((f) => {
    const m = f.match(/^\[([^\]]{1,18})\]\s*(.*)$/)
    return m && m[2] ? { tag: m[1].toUpperCase(), text: m[2] } : { tag: 'LOCAL', text: f }
  }))
const splitLines = (v) => String(v || '').split(/\n+/).map((s) => s.trim()).filter(Boolean)
const correctiveLines = computed(() => splitLines(props.ticket?.rca_corrective))
const preventiveLines = computed(() => splitLines(props.ticket?.rca_preventive))

const whys = computed(() => (Array.isArray(props.ticket?.rca_five_whys) ? props.ticket.rca_five_whys : [])
  .map((w) => String(w).trim()).filter(Boolean))
const hasWhys = computed(() => whys.value.length > 0)
const slug = (s) => String(s || 'trace').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 34) || 'trace'
/* frame #0 = the symptom (subject); whys descend; the last why is the ROOT frame */
const frames = computed(() => {
  if (!props.ticket) return []
  const head = { tag: 'SYMPTOM', sig: `symptom :: ${slug(props.ticket.subject)}()`, text: props.ticket.subject, root: false, ghost: false }
  if (!hasWhys.value) {
    return [head,
      { tag: 'WHY 1', sig: 'why[1] :: ??? ()', text: 'Unsymbolicated — descend this frame in the console.', root: false, ghost: true },
      { tag: 'WHY 2', sig: 'why[2] :: ??? ()', text: 'Unsymbolicated — the trail goes dark here.', root: false, ghost: true },
      { tag: 'ROOT', sig: 'ROOT :: not_yet_located()', text: 'Root cause not yet located — file the teardown to resolve this stack.', root: true, ghost: true }]
  }
  return [head, ...whys.value.map((w, i) => {
    const root = i === whys.value.length - 1
    return { tag: root ? 'ROOT CAUSE' : `WHY ${i + 1}`,
      sig: root ? `ROOT :: ${slug(w)}()` : `why[${i + 1}] :: ${slug(w)}()`,
      text: w, root, ghost: false }
  })]
})
const ln = (i) => String(41 + i * 7).padStart(3, '0')

const fileLabel = computed(() => {
  const s = status.value
  if (s === 'returned' || s === 'stale') return '▶ REFILE — RESOLVE STACK'
  if (s === 'validated') return '✓ VALIDATED — REVISE FILING'
  if (s === 'filed') return '▶ REVISE FILED RCA'
  return '▶ RESOLVE STACK — FILE RCA'
})
const owedAge = computed(() => {
  const t = props.ticket
  if (!t) return '—'
  const stamp = t.resolved_at || t.closed_at
  const h = stamp ? Math.max(0, (props.now - Date.parse(stamp)) / 36e5) : (t.owed_age_hours ?? 0)
  if (h < 48) return `T+${Math.round(h)}h`
  return `T+${Math.floor(h / 24)}d ${String(Math.round(h % 24)).padStart(2, '0')}h`
})
const dt = (at) => (at ? new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
</script>

<style scoped>
/* dark bench in BOTH themes — stage-ink color family throughout */
.rwb { position: sticky; top: 78px; display: flex; flex-direction: column; gap: 12px;
  padding: 18px 20px 20px; border-radius: 16px;
  background: var(--sd-rca-bench); border: 1px solid color-mix(in srgb, var(--sd-rca-core) 18%, transparent);
  box-shadow: 0 24px 60px color-mix(in srgb, var(--sd-rca-stage) 45%, transparent); }

.rwb-head { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.bid { font-size: 15px; font-weight: 800; color: var(--sd-rca-core); letter-spacing: 0.04em; }
.mi-chip { font-size: 8px; font-weight: 800; letter-spacing: 0.16em; color: var(--sd-rca-defect);
  border: 1px solid color-mix(in srgb, var(--sd-rca-defect) 55%, transparent); border-radius: 4px;
  padding: 2px 6px; background: var(--sd-rca-defect-soft); }
.rwb-subject { margin: 0; font-size: 14.5px; font-weight: 700; line-height: 1.35;
  color: var(--sd-rca-stage-ink); }
.rwb-stamps { display: flex; gap: 14px; flex-wrap: wrap; font-size: 8.5px; letter-spacing: 0.12em;
  color: var(--sd-rca-stage-dim); }
.rwb-stamps b { color: var(--sd-rca-stage-ink); font-weight: 700; }

/* returned exception plate — red ink, unmissable */
.ret-plate { border: 1px solid color-mix(in srgb, var(--sd-rca-defect) 45%, transparent);
  border-left: 3px solid var(--sd-rca-defect); border-radius: 11px; padding: 13px 15px;
  background: color-mix(in srgb, var(--sd-rca-defect) 7%, transparent); }
.rp-title { font-size: 8.5px; font-weight: 800; letter-spacing: 0.26em; color: var(--sd-rca-defect); }
.rp-body { margin: 8px 0 0; font-size: 12.5px; line-height: 1.6; font-style: italic;
  color: color-mix(in srgb, var(--sd-rca-defect) 22%, var(--sd-rca-stage-ink)); }
.rp-who { margin-top: 7px; font-size: 9.5px; letter-spacing: 0.08em; color: var(--sd-rca-stage-dim); }
.rp-refile { display: inline-flex; align-items: center; gap: 8px; margin-top: 12px; padding: 9px 15px;
  border-radius: 9px; cursor: pointer; font-size: 10px; font-weight: 800; letter-spacing: 0.16em;
  font-family: var(--sd-mono); color: var(--sd-rca-defect);
  border: 1px solid color-mix(in srgb, var(--sd-rca-defect) 60%, transparent);
  background: var(--sd-rca-defect-soft); transition: transform 0.2s var(--sd-spring), box-shadow 0.2s; }
.rp-refile:hover { transform: translateY(-2px);
  box-shadow: 0 10px 26px color-mix(in srgb, var(--sd-rca-defect) 25%, transparent); }
.rp-arrow { font-size: 13px; animation: rwb-nudge 1.4s ease-in-out infinite; }
@keyframes rwb-nudge { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(4px); } }
.rp-refile.amber { color: var(--sd-rca-warn);
  border-color: color-mix(in srgb, var(--sd-rca-warn) 55%, transparent); background: var(--sd-rca-warn-soft); }
.rp-refile.amber:hover { box-shadow: 0 10px 26px color-mix(in srgb, var(--sd-rca-warn) 22%, transparent); }

/* stale plate — amber */
.stale-plate { border: 1px solid color-mix(in srgb, var(--sd-rca-warn) 45%, transparent);
  border-left: 3px solid var(--sd-rca-warn); border-radius: 11px; padding: 13px 15px;
  background: color-mix(in srgb, var(--sd-rca-warn) 7%, transparent); }
.sp-title { font-size: 8.5px; font-weight: 800; letter-spacing: 0.26em; color: var(--sd-rca-warn); }
.sp-body { margin: 8px 0 0; font-size: 12px; line-height: 1.55; color: var(--sd-rca-stage-ink); }
.rwb-rise-enter-active { transition: opacity 0.4s var(--sd-spring), transform 0.4s var(--sd-spring); }
.rwb-rise-enter-from { opacity: 0; transform: translateY(-8px); }
.rwb-rise-leave-active { transition: opacity 0.2s ease; }
.rwb-rise-leave-to { opacity: 0; }

/* zone titles */
.zone { display: flex; align-items: center; gap: 10px; margin: 8px 0 0; font-size: 8.5px;
  font-weight: 800; letter-spacing: 0.3em; color: var(--sd-rca-stage-dim); text-transform: uppercase; }
.zone::after { content: ""; flex: 1; height: 1px;
  background: color-mix(in srgb, var(--sd-rca-stage-ink) 8%, transparent); }
.zone .aux { font-size: 7.5px; letter-spacing: 0.12em; font-weight: 600;
  color: color-mix(in srgb, var(--sd-rca-stage-dim) 70%, transparent); }

/* THE STACK — descending luminous frames on the descent rail */
.stack { position: relative; display: flex; flex-direction: column; gap: 7px; padding-left: 2px; }
.stack::before { content: ""; position: absolute; left: 46px; top: 10px; bottom: 10px; width: 1px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--sd-rca-core) 6%, transparent),
    color-mix(in srgb, var(--sd-rca-core) 40%, transparent) 70%,
    color-mix(in srgb, var(--sd-rca-hi) 70%, transparent));
  box-shadow: 0 0 12px color-mix(in srgb, var(--sd-rca-core) 15%, transparent); }
.frame { display: flex; gap: 0; position: relative;
  animation: rwb-frame 0.55s var(--sd-spring) both; animation-delay: calc(var(--i) * 0.07s); }
@keyframes rwb-frame { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
.f-gut { width: 46px; flex: none; display: flex; align-items: center; justify-content: flex-end;
  gap: 7px; padding-right: 10px; font-size: 9.5px;
  color: color-mix(in srgb, var(--sd-rca-stage-dim) 65%, transparent); font-variant-numeric: tabular-nums; }
.f-bp { width: 8px; height: 8px; border-radius: 50%; flex: none;
  border: 1px solid color-mix(in srgb, var(--sd-rca-stage-ink) 16%, transparent); }
.f-bp.hot { background: var(--sd-rca-defect); border-color: var(--sd-rca-defect);
  box-shadow: 0 0 10px color-mix(in srgb, var(--sd-rca-defect) 60%, transparent); }
.f-card { flex: 1; min-width: 0; margin-left: calc(var(--depth) * 14px); border-radius: 9px;
  padding: 9px 13px 9px 12px;
  background: color-mix(in srgb, var(--sd-rca-stage-ink) 3%, transparent);
  border: 1px solid color-mix(in srgb, var(--sd-rca-stage-ink) 8%, transparent);
  border-left: 2px solid color-mix(in srgb, var(--sd-rca-core) 22%, transparent);
  transition: transform 0.22s var(--sd-spring), border-color 0.22s; }
.frame:hover .f-card { transform: translateX(4px); border-color: var(--sd-rca-brd); }
.f-top { display: flex; align-items: center; gap: 9px; min-width: 0; }
.f-idx { font-size: 9px; font-weight: 800; color: var(--sd-rca-deep); flex: none; }
.frame:not(.ghost) .f-idx { color: var(--sd-rca-core); }
.f-sig { font-size: 10.5px; font-weight: 600; color: var(--sd-rca-hi);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f-tag { margin-left: auto; flex: none; font-size: 7.5px; font-weight: 800; letter-spacing: 0.22em;
  color: var(--sd-rca-stage-dim); border: 1px solid color-mix(in srgb, var(--sd-rca-stage-ink) 10%, transparent);
  border-radius: 3px; padding: 2px 6px; }
.f-why { margin: 5px 0 0; font-size: 11.5px; line-height: 1.55; color: var(--sd-rca-stage-dim); }
.frame:not(.ghost) .f-why { color: var(--sd-rca-stage-ink); }
.frame.root .f-card { border: 1px solid color-mix(in srgb, var(--sd-rca-hi) 45%, transparent);
  border-left: 3px solid var(--sd-rca-core);
  background: linear-gradient(135deg, color-mix(in srgb, var(--sd-rca-core) 9%, transparent),
    color-mix(in srgb, var(--sd-rca-hi) 4%, transparent));
  animation: rwb-frame 0.55s var(--sd-spring) both, rwb-root 3.4s ease-in-out infinite;
  animation-delay: calc(var(--i) * 0.07s), 0.6s; }
@keyframes rwb-root {
  0%, 100% { box-shadow: 0 0 20px color-mix(in srgb, var(--sd-rca-core) 10%, transparent); }
  50% { box-shadow: 0 0 42px color-mix(in srgb, var(--sd-rca-core) 24%, transparent); } }
.frame.root .f-sig { color: var(--sd-rca-core); font-weight: 800; }
.frame.root .f-tag { color: var(--sd-rca-core); border-color: var(--sd-rca-brd); }
.frame.ghost .f-card { border-style: dashed; }
.frame.ghost .f-sig { color: color-mix(in srgb, var(--sd-rca-stage-dim) 80%, transparent); font-style: italic; }
.f-cat { display: inline-block; margin-top: 7px; font-size: 8.5px; font-weight: 800;
  letter-spacing: 0.2em; color: var(--sd-rca-core); border: 1px solid var(--sd-rca-brd);
  border-radius: 6px; padding: 3px 9px; background: var(--sd-rca-soft); }

/* root-cause register bank (A1 cat-chips) */
.cat-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.cat-chip { font-size: 9.5px; font-weight: 600; letter-spacing: 0.14em; cursor: pointer;
  padding: 7px 12px; border-radius: 6px; color: var(--sd-rca-stage-dim);
  border: 1px solid color-mix(in srgb, var(--sd-rca-stage-ink) 10%, transparent);
  background: color-mix(in srgb, var(--sd-rca-stage-ink) 3%, transparent);
  transition: color 0.2s, border-color 0.2s, transform 0.2s, box-shadow 0.2s; }
.cat-chip:hover { transform: translateY(-2px); color: var(--sd-rca-stage-ink);
  border-color: var(--sd-rca-brd); }
.cat-chip.on { color: var(--sd-rca-stage); background: var(--sd-rca-grad);
  border-color: transparent; font-weight: 800;
  box-shadow: 0 4px 16px color-mix(in srgb, var(--sd-rca-core) 25%, transparent); }

/* summary field plate */
.rwb-summary { margin: 0; font-size: 12px; line-height: 1.65; color: var(--sd-rca-stage-ink); }
.rwb-summary.field { padding: 11px 14px; border-radius: 9px;
  border: 1px solid color-mix(in srgb, var(--sd-rca-stage-ink) 8%, transparent);
  background: color-mix(in srgb, var(--sd-rca-stage) 65%, transparent); }
.rwb-summary.ghost { color: var(--sd-rca-stage-dim); font-style: italic;
  border-style: dashed; }

/* patch hunks */
.patch { border-radius: 9px; overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--sd-rca-stage-ink) 8%, transparent);
  background: color-mix(in srgb, var(--sd-rca-stage) 65%, transparent); }
.patch .p-h { font-size: 8.5px; font-weight: 800; letter-spacing: 0.22em; color: var(--sd-rca-stage-dim);
  padding: 7px 13px; border-bottom: 1px solid color-mix(in srgb, var(--sd-rca-stage-ink) 8%, transparent);
  background: color-mix(in srgb, var(--sd-rca-core) 3%, transparent); }
.p-ln { display: flex; gap: 11px; font-size: 11px; line-height: 1.9; padding: 0 13px; }
.p-ln .g { color: color-mix(in srgb, var(--sd-rca-stage-dim) 65%, transparent); width: 22px;
  flex: none; text-align: right; user-select: none; }
.p-ln.add { background: color-mix(in srgb, var(--sd-rca-core) 5%, transparent); }
.p-ln.add .t { color: var(--sd-rca-hi); }

/* factors — locals in scope, one register row each (A1 fac-ln) */
.facs { display: flex; flex-direction: column; gap: 7px; }
.fac-ln { display: flex; gap: 10px; align-items: baseline; text-align: left;
  padding: 8px 12px; border-radius: 7px;
  border: 1px solid color-mix(in srgb, var(--sd-rca-stage-ink) 10%, transparent);
  background: color-mix(in srgb, var(--sd-rca-stage-ink) 3%, transparent);
  transition: transform 0.2s, border-color 0.2s; }
.fac-ln:hover { transform: translateX(4px); border-color: var(--sd-rca-brd); }
.fac-ln .fk { flex: none; font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
  color: color-mix(in srgb, var(--sd-rca-stage-dim) 80%, transparent); }
.fac-ln .ft { font-size: 11px; font-weight: 600; line-height: 1.5; color: var(--sd-rca-stage-ink); }
.fac-add { justify-content: center; cursor: pointer; border-style: dashed;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.16em; color: var(--sd-rca-stage-dim); }
.fac-add:hover { transform: none; color: var(--sd-rca-core); border-color: var(--sd-rca-brd); }

/* verbs */
.rwb-verbs { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; padding-top: 6px;
  border-top: 1px solid color-mix(in srgb, var(--sd-rca-stage-ink) 8%, transparent); margin-top: 4px; }
.vb { display: inline-flex; align-items: center; gap: 6px; padding: 10px 15px; border-radius: 9px;
  cursor: pointer; font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em;
  font-family: var(--sd-mono); color: var(--sd-rca-stage-dim); background: transparent;
  border: 1px solid color-mix(in srgb, var(--sd-rca-stage-ink) 15%, transparent); }
.vb:hover { color: var(--sd-rca-stage-ink); border-color: var(--sd-rca-brd); }
.vb.primary { color: var(--sd-rca-stage); background: var(--sd-rca-grad); border-color: transparent;
  box-shadow: 0 8px 26px color-mix(in srgb, var(--sd-rca-core) 25%, transparent); }
.vb.primary:hover { color: var(--sd-rca-stage); }
.vb.kedb { margin-left: auto; color: var(--sd-rca-core); border-color: var(--sd-rca-brd);
  background: var(--sd-rca-soft); }
.vb.kedb:hover { background: color-mix(in srgb, var(--sd-rca-core) 14%, transparent);
  color: var(--sd-rca-hi); }
.vb.readonly { cursor: default; color: var(--sd-rca-stage-dim); opacity: 0.72;
  border-style: dashed; background: transparent; }
.prob-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 8.5px; font-weight: 800;
  letter-spacing: 0.14em; color: var(--sd-rca-hi); border: 1px solid var(--sd-rca-brd);
  border-radius: 999px; padding: 5px 11px; background: var(--sd-rca-soft); }

.rwb-prec { margin-top: 2px; }

/* idle bench */
.rwb-idle { display: flex; flex-direction: column; align-items: center; gap: 9px;
  padding: 52px 20px; text-align: center; }
.idle-glyph { font-size: 26px; font-weight: 200; letter-spacing: 0.2em;
  color: color-mix(in srgb, var(--sd-rca-stage-dim) 55%, transparent); }
.rwb-idle b { font-size: 10px; letter-spacing: 0.3em; color: var(--sd-rca-stage-dim); }
.rwb-idle p { margin: 0; font-size: 12px; color: var(--sd-rca-stage-dim); }
.idle-keys { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; margin-top: 8px;
  font-size: 8.5px; letter-spacing: 0.14em;
  color: color-mix(in srgb, var(--sd-rca-stage-dim) 75%, transparent); }
.idle-keys b { color: var(--sd-rca-core); }

@media (max-width: 980px) { .rwb { position: relative; top: 0; } }

/* ═════ LIGHT THEME OVERRIDES ═════
   The bench is dark in BOTH themes; theme-light-rescue.css's
   `[class*="page"] h3/h4 { color: var(--text-primary) }` catch-all (0,3,1)
   would ink these invisible on the dark bench — re-pin them. */
[data-theme="light"] .rwb .zone { color: var(--sd-rca-stage-dim) !important; }
[data-theme="light"] .rwb .rwb-subject { color: var(--sd-rca-stage-ink) !important; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .frame,
  html:not([data-cinematic="on"]) .frame.root,
  html:not([data-cinematic="on"]) .rp-arrow { animation: none !important; }
  html:not([data-cinematic="on"]) .rwb-rise-enter-active { transition: none !important; }
}
</style>
