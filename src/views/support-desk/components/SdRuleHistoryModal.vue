<template>
  <SdModalShell :open="open" eyebrow="VERSION HISTORY" :title="name ? `The rewind deck — ${name}` : 'The rewind deck'"
    width="640px" @close="$emit('close')">
    <div class="rw">
      <!-- decommissioned banner — history outlives the rule -->
      <Motion v-if="!ruleLive && !busy && revisions.length" as="div" class="rw-tomb"
        :initial="{ opacity: 0, y: -8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4 }">
        <OctagonAlert :size="12" />
        <span>This rule was <b>decommissioned</b> — the deck is read-only, but any cut can be
          <b>recreated as a fresh rule</b> at the end of the chain.</span>
      </Motion>

      <div v-if="busy" class="rw-load sd-mono"><Loader :size="14" class="rw-spin" /> REWINDING THE TAPE…</div>

      <div v-else-if="revisions.length" class="rw-deck">
        <span class="rw-spine" aria-hidden="true" />
        <article v-for="(r, i) in deck" :key="r.id" class="rw-cut" :class="[r.action, { open: expanded === r.id }]"
          :style="{ '--i': i }">
          <!-- version puck on the spine -->
          <button class="rw-puck sd-mono" :class="r.action" :title="expanded === r.id ? 'Collapse' : 'Inspect this cut'"
            @click="expanded = expanded === r.id ? '' : r.id">v{{ r.version }}</button>

          <div class="rw-cut-body">
            <header class="rw-cut-h" @click="expanded = expanded === r.id ? '' : r.id">
              <b class="rw-verb" :class="r.action">{{ r.verb }}</b>
              <span v-if="i === 0" class="rw-head sd-mono" :title="ruleLive ? 'This cut is the live config' : 'The final cut before decommission'">
                {{ ruleLive ? 'CURRENT CONFIG' : 'FINAL CUT' }}</span>
              <span class="rw-sp" />
              <span class="rw-meta sd-mono">{{ r.changed_by_name || 'system' }} · {{ ago(r.created_at) }}</span>
              <ChevronDown :size="13" class="rw-chev" :class="{ flip: expanded === r.id }" />
            </header>

            <!-- what changed in this cut -->
            <div v-if="r.diffs.length" class="rw-diffs">
              <span v-for="(d, di) in r.diffs" :key="di" class="rw-diff sd-mono" :style="{ '--d': di }">
                <b>{{ d.label }}</b>
                <template v-if="d.from !== undefined"><s>{{ d.from }}</s><i>→</i><em>{{ d.to }}</em></template>
                <em v-else>{{ d.to }}</em>
              </span>
            </div>
            <span v-else-if="r.action === 'created'" class="rw-diff lone sd-mono"><b>INITIAL CUT</b><em>the rule as first forged</em></span>
            <span v-else-if="r.action === 'deleted'" class="rw-diff lone halt sd-mono"><b>DECOMMISSIONED</b><em>pulled off the line</em></span>

            <!-- expanded: the full config plate -->
            <div class="rw-plate-wrap" :class="{ open: expanded === r.id }">
              <div class="rw-plate">
                <div class="rw-tags sd-mono">
                  <span class="rw-tag">{{ (r.snapshot.trigger || 'on_create') === 'time_based' ? `BURN · T+${fmtMins(r.snapshot.time_threshold_mins)}` : 'INTERCEPT GATE' }}</span>
                  <span class="rw-tag" :class="r.snapshot.is_active === false ? '' : 'go'">{{ r.snapshot.is_active === false ? 'PARKED' : 'LIVE' }}</span>
                  <span v-if="r.snapshot.stop_processing" class="rw-tag halt">SEALS CHAIN</span>
                  <span class="rw-tag dim">SLOT {{ (r.snapshot.order_index ?? 0) + 1 }}</span>
                </div>
                <div class="rw-logic">
                  <span class="rw-kw sd-mono">WHEN</span>
                  <span v-if="!(r.snapshot.conditions || []).length" class="rw-chip dim">every ticket</span>
                  <template v-for="(c, ci) in r.snapshot.conditions || []" :key="'c' + ci">
                    <span v-if="ci" class="rw-op sd-mono">{{ r.snapshot.match_type === 'any' ? 'OR' : 'AND' }}</span>
                    <span class="rw-chip"><b>{{ resolveCond(c).f }}</b><i>{{ resolveCond(c).o }}</i><em v-if="resolveCond(c).v">{{ resolveCond(c).v }}</em></span>
                  </template>
                  <span class="rw-kw then sd-mono"><Zap :size="9" /> THEN</span>
                  <span v-for="(a, ai) in r.snapshot.actions || []" :key="'a' + ai" class="rw-chip act">
                    <b>{{ resolveAct(a).label }}</b><em v-if="resolveAct(a).value">→ {{ resolveAct(a).value }}</em>
                  </span>
                </div>
                <p v-if="r.snapshot.description" class="rw-desc">“{{ r.snapshot.description }}”</p>
                <details class="rw-raw">
                  <summary class="sd-mono">RAW SNAPSHOT</summary>
                  <pre class="sd-mono">{{ JSON.stringify(r.snapshot, null, 2) }}</pre>
                </details>

                <!-- the workflow: bring this cut back -->
                <div v-if="i > 0 || !ruleLive" class="rw-restore">
                  <template v-if="ruleLive">
                    <button v-if="armId !== r.id" class="rw-btn" :disabled="restoring" @click.stop="armId = r.id">
                      <RotateCcw :size="12" /> Restore v{{ r.version }}
                    </button>
                    <Motion v-else as="button" class="rw-btn arm" :disabled="restoring" :initial="{ scale: 0.94 }"
                      :animate="{ scale: 1 }" :while-tap="{ scale: 0.96 }" @click.stop="$emit('restore', r.snapshot)">
                      <Loader v-if="restoring" :size="12" class="rw-spin" /><RotateCcw v-else :size="12" />
                      Confirm — restore as a new cut (v{{ headVersion + 1 }})
                    </Motion>
                    <span class="rw-restore-note sd-mono">NON-DESTRUCTIVE · CHAIN POSITION KEPT · LANDS IN THE LEDGER</span>
                  </template>
                  <template v-else>
                    <button v-if="armId !== r.id" class="rw-btn" :disabled="restoring" @click.stop="armId = r.id">
                      <Copy :size="12" /> Recreate from v{{ r.version }}
                    </button>
                    <Motion v-else as="button" class="rw-btn arm" :disabled="restoring" :initial="{ scale: 0.94 }"
                      :animate="{ scale: 1 }" :while-tap="{ scale: 0.96 }" @click.stop="$emit('recreate', r.snapshot)">
                      <Loader v-if="restoring" :size="12" class="rw-spin" /><Copy v-else :size="12" />
                      Confirm — forge a fresh rule from this cut
                    </Motion>
                    <span class="rw-restore-note sd-mono">NEW RULE · JOINS THE END OF THE CHAIN · PARKED COPIES STAY PARKED</span>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>

      <p v-else class="rw-none">No revisions recorded yet — history starts with the next edit.</p>
    </div>

    <template #footer>
      <span class="rw-foot-note sd-mono">{{ revisions.length }} CUT{{ revisions.length === 1 ? '' : 'S' }} ON THE REEL</span>
      <span style="flex:1" />
      <button class="rw-btn plain" @click="$emit('close')">Close</button>
    </template>
  </SdModalShell>
</template>

<script setup>
/*
  SdRuleHistoryModal — "THE REWIND DECK", the rule version-history modal rebuilt
  as a playable timeline instead of a JSON dump:
    · a drawing spine with action-coloured version pucks (created/updated/deleted)
    · per-cut FIELD DIFFS computed against the previous snapshot — "THRESHOLD
      4h → 8h", "STATE LIVE → PARKED", "+1 CONDITION" — instead of raw JSON
    · each cut expands into a rendered config plate (WHEN/THEN chips resolved to
      live names via the section's resolvers; raw snapshot kept behind a toggle)
    · THE WORKFLOW: any older cut can be RESTORED (PATCH → lands as a NEW head
      revision, chain position kept, fully audited) — and when the rule itself
      was decommissioned, any cut can be RECREATED as a fresh rule. Both behind
      arm-to-confirm. History is no longer read-only.
*/
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  Loader, ChevronDown, Zap, RotateCcw, Copy, OctagonAlert,
} from 'lucide-vue-next'
import SdModalShell from './SdModalShell.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  name: { type: String, default: '' },
  busy: { type: Boolean, default: false },
  restoring: { type: Boolean, default: false },
  revisions: { type: Array, default: () => [] },        // newest first
  ruleLive: { type: Boolean, default: true },           // false once decommissioned
  resolveCond: { type: Function, default: (c) => ({ f: c.field, o: c.op, v: c.value }) },
  resolveAct: { type: Function, default: (a) => ({ label: a.type, value: a.value }) },
})
defineEmits(['close', 'restore', 'recreate'])

const expanded = ref('')
const armId = ref('')
watch(() => [props.open, props.revisions], () => { expanded.value = ''; armId.value = '' })
watch(expanded, () => { armId.value = '' })

const headVersion = computed(() => props.revisions[0]?.version || 0)

const fmtMins = (m) => (m == null || m === '' ? '—' : m < 60 ? `${m}m` : m < 1440 ? `${Math.round((m / 60) * 10) / 10}h` : `${Math.round((m / 1440) * 10) / 10}d`)
const trunc = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s))
const ago = (iso) => {
  if (!iso) return ''
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

/* field-level diff between a cut and the one before it */
const SCALARS = [
  ['name', 'NAME', (v) => trunc(v ?? '—', 22)],
  ['trigger', 'KIND', (v) => ((v || 'on_create') === 'time_based' ? 'BURN' : 'GATE')],
  ['time_threshold_mins', 'THRESHOLD', (v) => (v == null ? '—' : `T+${fmtMins(v)}`)],
  ['match_type', 'MATCH', (v) => ((v || 'all') === 'any' ? 'ANY' : 'ALL')],
  ['stop_processing', 'ON MATCH', (v) => (v ? 'SEALS' : 'PASSES')],
  ['is_active', 'STATE', (v) => (v === false ? 'PARKED' : 'LIVE')],
  ['order_index', 'SLOT', (v) => `#${(v ?? 0) + 1}`],
  ['description', 'NOTE', (v) => (v ? `“${trunc(v, 20)}”` : '—')],
]
const diffOf = (cur, prev) => {
  if (!prev) return []
  const out = []
  for (const [k, label, fmt] of SCALARS) {
    const a = prev[k]; const b = cur[k]
    if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)) out.push({ label, from: fmt(a), to: fmt(b) })
  }
  for (const [k, label] of [['conditions', 'CONDITIONS'], ['actions', 'ACTIONS']]) {
    const a = prev[k] || []; const b = cur[k] || []
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      out.push(a.length !== b.length
        ? { label, from: `${a.length}`, to: `${b.length}` }
        : { label, to: 'REWORKED' })
    }
  }
  return out
}
const deck = computed(() => props.revisions.map((r, i) => ({
  ...r,
  verb: r.action === 'created' ? 'Forged' : r.action === 'deleted' ? 'Decommissioned' : 'Recut',
  diffs: r.action === 'created' ? [] : diffOf(r.snapshot || {}, props.revisions[i + 1]?.snapshot),
})))
</script>

<style scoped>
.rw { display: flex; flex-direction: column; gap: 12px;
  --rw-ink: var(--sd-text); --rw-dim: var(--sd-text-muted); --rw-core: var(--sd-qc-core);
  --rw-brd: var(--sd-qc-brd); --rw-soft: var(--sd-qc-soft);
  --rw-go: var(--sd-qc-go); --rw-warn: var(--sd-qc-warn); --rw-halt: var(--sd-qc-halt); }

.rw-tomb { display: flex; gap: 8px; align-items: flex-start; padding: 9px 12px; border-radius: 10px;
  font-size: 11px; line-height: 1.5; color: var(--sd-text-secondary);
  border: 1px dashed color-mix(in srgb, var(--rw-halt) 40%, transparent);
  background: color-mix(in srgb, var(--rw-halt) 6%, transparent); }
.rw-tomb svg { color: var(--rw-halt); flex-shrink: 0; margin-top: 1px; }
.rw-tomb b { color: var(--rw-ink); }

.rw-load { display: flex; align-items: center; gap: 8px; justify-content: center; padding: 28px 0;
  font-size: 9px; letter-spacing: 0.16em; color: var(--rw-dim); }
.rw-spin { animation: rw-rot 0.8s linear infinite; }
@keyframes rw-rot { to { transform: rotate(360deg); } }
.rw-none { margin: 0; padding: 22px 0; text-align: center; font-size: 12px; color: var(--rw-dim); }

/* ═══ the deck ═══ */
.rw-deck { position: relative; display: flex; flex-direction: column; gap: 10px; padding-left: 6px; }
.rw-spine { position: absolute; left: 22px; top: 14px; bottom: 14px; width: 2px;
  background: linear-gradient(180deg, var(--rw-core), color-mix(in srgb, var(--rw-core) 20%, transparent));
  transform-origin: top center; animation: rw-grow 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes rw-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }

.rw-cut { position: relative; display: flex; gap: 12px; align-items: flex-start;
  animation: rw-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: calc(0.08s + var(--i) * 0.07s); }
@keyframes rw-in { from { opacity: 0; transform: translateX(-14px); } to { opacity: 1; transform: none; } }

.rw-puck { position: relative; z-index: 1; display: grid; place-items: center; width: 34px; height: 34px;
  border-radius: 50%; flex-shrink: 0; font-size: 9.5px; font-weight: 800; cursor: pointer;
  font-family: inherit; color: var(--rw-core); background: var(--sd-surface-elevated);
  border: 2px solid var(--rw-brd); transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s; }
.rw-puck:hover { transform: scale(1.12); box-shadow: 0 0 14px color-mix(in srgb, var(--rw-core) 35%, transparent); }
.rw-puck.created { color: var(--rw-go); border-color: color-mix(in srgb, var(--rw-go) 55%, transparent); }
.rw-puck.deleted { color: var(--rw-halt); border-color: color-mix(in srgb, var(--rw-halt) 55%, transparent); }

.rw-cut-body { flex: 1; min-width: 0; border-radius: 13px; overflow: hidden;
  background: var(--sd-surface-elevated); border: 1px solid var(--sd-border);
  transition: border-color 0.25s, box-shadow 0.25s; }
.rw-cut:hover .rw-cut-body, .rw-cut.open .rw-cut-body { border-color: var(--rw-brd); }
.rw-cut.open .rw-cut-body { box-shadow: var(--sd-qc-glow); }

.rw-cut-h { display: flex; align-items: center; gap: 9px; padding: 10px 12px; cursor: pointer; min-width: 0; }
.rw-sp { flex: 1; }
.rw-verb { font-size: 12.5px; color: var(--rw-ink); }
.rw-verb.created { color: var(--rw-go); }
.rw-verb.deleted { color: var(--rw-halt); }
.rw-head { font-size: 7px; font-weight: 800; letter-spacing: 0.14em; padding: 2px 7px; border-radius: 5px;
  color: var(--rw-core); border: 1px solid var(--rw-brd); background: var(--rw-soft);
  animation: rw-headpulse 2.6s ease-in-out infinite; }
@keyframes rw-headpulse { 0%, 100% { box-shadow: 0 0 0 0 transparent; } 50% { box-shadow: 0 0 10px color-mix(in srgb, var(--sd-qc-core) 30%, transparent); } }
.rw-meta { font-size: 9px; color: var(--rw-dim); white-space: nowrap; }
.rw-chev { color: var(--rw-dim); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); flex-shrink: 0; }
.rw-chev.flip { transform: rotate(180deg); }

/* diff chips */
.rw-diffs { display: flex; flex-wrap: wrap; gap: 5px; padding: 0 12px 10px; }
.rw-diff { display: inline-flex; align-items: baseline; gap: 5px; padding: 3px 8px; border-radius: 7px;
  font-size: 9px; letter-spacing: 0.04em; background: color-mix(in srgb, var(--rw-ink) 4%, transparent);
  border: 1px solid color-mix(in srgb, var(--rw-ink) 12%, transparent);
  animation: rw-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: calc(0.15s + var(--d, 0) * 0.05s); }
.rw-diff b { font-weight: 800; color: var(--rw-dim); letter-spacing: 0.1em; font-size: 7.5px; }
.rw-diff s { color: var(--rw-dim); text-decoration-color: color-mix(in srgb, var(--rw-halt) 60%, transparent); }
.rw-diff i { font-style: normal; color: var(--rw-core); }
.rw-diff em { font-style: normal; font-weight: 700; color: var(--rw-ink); }
.rw-diff.lone { margin: 0 12px 10px; }
.rw-diff.lone em { font-weight: 500; color: var(--rw-dim); }
.rw-diff.halt b { color: var(--rw-halt); }

/* expanded config plate */
.rw-plate-wrap { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.45s cubic-bezier(0.16, 1, 0.3, 1); }
.rw-plate-wrap.open { grid-template-rows: 1fr; }
.rw-plate { overflow: hidden; display: flex; flex-direction: column; gap: 9px;
  padding: 0 12px; border-top: 0 solid transparent; }
.rw-plate-wrap.open .rw-plate { padding: 11px 12px 12px; border-top: 1px dashed color-mix(in srgb, var(--rw-core) 20%, transparent); }
.rw-tags { display: flex; flex-wrap: wrap; gap: 5px; }
.rw-tag { font-size: 7.5px; font-weight: 800; letter-spacing: 0.12em; padding: 2px 7px; border-radius: 5px;
  color: var(--rw-core); border: 1px solid var(--rw-brd); }
.rw-tag.go { color: var(--rw-go); border-color: color-mix(in srgb, var(--rw-go) 45%, transparent); }
.rw-tag.halt { color: var(--rw-halt); border-color: color-mix(in srgb, var(--rw-halt) 45%, transparent); }
.rw-tag.dim { color: var(--rw-dim); border-color: color-mix(in srgb, var(--rw-ink) 16%, transparent); }
.rw-logic { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.rw-kw { font-size: 8px; font-weight: 800; letter-spacing: 0.16em; color: var(--rw-dim); }
.rw-kw.then { display: inline-flex; align-items: center; gap: 3px; color: var(--rw-warn); }
.rw-op { font-size: 7.5px; font-weight: 800; color: var(--rw-dim); opacity: 0.8; }
.rw-chip { display: inline-flex; align-items: baseline; gap: 5px; padding: 3.5px 9px; border-radius: 8px;
  font-size: 10.5px; background: color-mix(in srgb, var(--rw-ink) 4%, transparent);
  border: 1px solid color-mix(in srgb, var(--rw-ink) 12%, transparent); }
.rw-chip b { font-weight: 700; color: var(--rw-ink); }
.rw-chip i { font-style: normal; font-size: 9px; color: var(--rw-dim); }
.rw-chip em { font-style: normal; font-weight: 700; color: var(--rw-core); }
.rw-chip.act { border-color: color-mix(in srgb, var(--rw-warn) 35%, transparent);
  background: color-mix(in srgb, var(--rw-warn) 8%, transparent); }
.rw-chip.dim { opacity: 0.7; font-style: italic; }
.rw-desc { margin: 0; font-size: 11px; line-height: 1.5; color: var(--sd-text-secondary); }
.rw-raw summary { font-size: 8px; letter-spacing: 0.14em; color: var(--rw-dim); cursor: pointer; }
.rw-raw pre { margin: 6px 0 0; padding: 9px 11px; border-radius: 9px; font-size: 9.5px; line-height: 1.5;
  overflow-x: auto; max-height: 180px; color: var(--sd-text-secondary);
  background: var(--sd-surface); border: 1px solid var(--sd-border); }

/* restore / recreate */
.rw-restore { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.rw-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 10px;
  font-size: 11.5px; font-weight: 800; font-family: inherit; cursor: pointer;
  color: var(--rw-core); background: var(--rw-soft); border: 1px solid var(--rw-brd);
  transition: transform 0.2s, box-shadow 0.2s; }
.rw-btn:hover:not(:disabled) { transform: translateY(-1px);
  box-shadow: 0 0 12px color-mix(in srgb, var(--rw-core) 25%, transparent); }
.rw-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.rw-btn.arm { box-shadow: 0 0 0 3px color-mix(in srgb, var(--rw-core) 22%, transparent); }
.rw-btn.plain { color: var(--rw-ink); background: var(--sd-surface-elevated);
  border-color: var(--sd-border-strong); font-weight: 700; }
.rw-restore-note { font-size: 7px; letter-spacing: 0.12em; color: var(--rw-dim); }
.rw-foot-note { font-size: 8px; letter-spacing: 0.14em; color: var(--rw-dim); align-self: center; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .rw-spine,
  html:not([data-cinematic="on"]) .rw-head { animation: none; }
  html:not([data-cinematic="on"]) .rw-cut,
  html:not([data-cinematic="on"]) .rw-diff { animation-duration: 0.01s; animation-delay: 0s; }
  html:not([data-cinematic="on"]) .rw-plate-wrap { transition-duration: 0.01s; }
}
</style>
