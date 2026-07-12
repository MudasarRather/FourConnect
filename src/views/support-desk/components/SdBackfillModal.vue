<template>
  <SdModalShell :open="open" eyebrow="ROUTE THE BACKLOG" title="The recovery sweep" width="660px" @close="$emit('close')">
    <div class="bf">
      <p class="bf-brief">
        <Route :size="13" /> Stranded tickets — live, but in <b>no lane</b> — run the exact chain a new ticket does:
        rules → category → their team's lane → the default lane, honouring capacity spills.
        <b>Route-only:</b> owners, priorities and SLA clocks are never touched, and a re-run can't double-place anything.
      </p>

      <!-- ═══ THE CHAIN — always visible, changes temperament per phase ═══ -->
      <div class="bf-chain" :class="phase">
        <div class="bf-pool" :class="{ empty: plan && !plan.scanned }">
          <span class="bf-pool-orb" aria-hidden="true"><i /><i /></span>
          <b class="sd-mono"><SdCountUp :value="plan ? plan.scanned : 0" /></b>
          <span class="sd-mono lb">STRANDED</span>
        </div>
        <div class="bf-stages">
          <div v-for="(s, i) in STAGES" :key="s.k" class="bf-stage"
            :class="{ dim: plan && !(activeVia[s.k] > 0), hot: phase === 'run' }" :style="{ '--i': i }">
            <span class="bf-wire" aria-hidden="true" />
            <span class="bf-stage-ic"><component :is="s.icon" :size="13" /></span>
            <b class="sd-mono"><SdCountUp :value="activeVia[s.k] || 0" /></b>
            <span class="sd-mono lb">{{ s.label }}</span>
            <i class="bf-bar" aria-hidden="true"><i :style="{ width: barW(s.k) }" /></i>
          </div>
        </div>
        <div class="bf-dest" :class="{ lit: (activeReport?.routed || 0) > 0 }">
          <span class="bf-dest-ic"><Inbox :size="15" /></span>
          <b class="sd-mono"><SdCountUp :value="activeReport ? activeReport.routed : 0" /></b>
          <span class="sd-mono lb">{{ phase === 'done' ? 'ROUTED' : 'WILL ROUTE' }}</span>
        </div>
        <span v-if="(activeReport?.overflowed || 0) > 0" class="bf-spill sd-mono"
          :title="`${activeReport.overflowed} landed on a full lane and spilled to its overflow`">
          <CornerDownRight :size="10" /> {{ activeReport.overflowed }} CAPACITY SPILL{{ activeReport.overflowed === 1 ? '' : 'S' }}
        </span>
        <!-- tracer packets riding the chain -->
        <template v-if="!reduced && phase !== 'plan'">
          <span class="bf-tracer" aria-hidden="true" />
          <span class="bf-tracer t2" aria-hidden="true" />
        </template>
        <span v-if="phase === 'scan'" class="bf-scanlb sd-mono">TRACING THE GRAPH — DRY RUN · NOTHING WRITES</span>
        <span v-else-if="phase === 'run'" class="bf-scanlb hot sd-mono">SWEEPING — STAMPING LANES ONTO THE BACKLOG</span>
      </div>

      <!-- ═══ PLAN · report ═══ -->
      <template v-if="phase === 'plan' && plan">
        <!-- all clear -->
        <div v-if="!plan.scanned" class="bf-clear">
          <span class="bf-clear-seal" aria-hidden="true"><Sparkles :size="16" /></span>
          <b>EVERY LIVE TICKET SITS IN A LANE</b>
          <span>Nothing predates the routing engine — there is no backlog to sweep.</span>
        </div>

        <template v-else>
          <div v-if="plan.remaining > 0" class="bf-note warn">
            <TriangleAlert :size="11" />
            <span><b>{{ plan.remaining }} more</b> stranded ticket{{ plan.remaining === 1 ? ' sits' : 's sit' }} beyond this
              sweep's {{ capLabel }} cap — after this run, sweep again to reach {{ plan.remaining === 1 ? 'it' : 'them' }}.</span>
          </div>

          <!-- the stranded ledger + FIX actions -->
          <div v-if="plan.unrouted?.length" class="bf-stuck">
            <header class="sd-mono"><OctagonAlert :size="11" /> {{ plan.unrouted_count }} CAN'T ROUTE — THE CHAIN HAS NO ANSWER FOR THEM</header>
            <div class="bf-fixes">
              <Motion v-for="(f, i) in fixes" :key="f.key" as="button" class="bf-fix"
                :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.35, delay: 0.08 + i * 0.06, ease: [0.16, 1, 0.3, 1] }"
                :while-hover="{ y: -2 }" :while-tap="{ scale: 0.96 }" :title="f.tip" @click="f.go()">
                <component :is="f.icon" :size="11" /> {{ f.label }}
                <b class="sd-mono">{{ f.count }}</b>
              </Motion>
            </div>
            <div class="bf-stuck-list">
              <div v-for="(u, i) in plan.unrouted.slice(0, 6)" :key="u.id" class="bf-stuck-row" :style="{ '--i': i }">
                <b class="sd-mono">{{ u.ticket_number }}</b>
                <span class="sub">{{ u.subject }}</span>
                <em class="sd-mono" :class="u.reason_code">{{ u.team_name ? `${u.team_name} · ` : '' }}{{ u.reason }}</em>
              </div>
              <p v-if="plan.unrouted.length > 6" class="bf-more sd-mono">… AND {{ plan.unrouted_count - 6 }} MORE WITH THE SAME REASONS</p>
            </div>
          </div>
        </template>
      </template>

      <!-- ═══ DONE · the seal ═══ -->
      <template v-else-if="phase === 'done' && result">
        <div class="bf-seal">
          <span class="bf-seal-ring" aria-hidden="true">
            <svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" /><path d="M12,20.5 L17.5,26 L28,14.5" /></svg>
          </span>
          <div class="bf-seal-b">
            <b>{{ result.routed }} ticket{{ result.routed === 1 ? '' : 's' }} swept into {{ lanesTouched }} lane{{ lanesTouched === 1 ? '' : 's' }}</b>
            <span class="sd-mono">EVERY PLACEMENT LOGGED ON THE TICKET · SWEEP AUDITED TO THE LEDGER</span>
          </div>
        </div>
        <div v-if="result.remaining > 0" class="bf-note warn">
          <TriangleAlert :size="11" />
          <span><b>{{ result.remaining }} still stranded beyond the cap</b> — run the sweep again to keep draining the backlog.</span>
        </div>
        <div v-if="result.unrouted_count > 0" class="bf-stuck">
          <header class="sd-mono"><OctagonAlert :size="11" /> {{ result.unrouted_count }} STILL CAN'T ROUTE — FIX THE MAP, THEN SWEEP AGAIN</header>
          <div class="bf-fixes">
            <Motion v-for="(f, i) in fixes" :key="f.key" as="button" class="bf-fix"
              :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.35, delay: 0.08 + i * 0.06, ease: [0.16, 1, 0.3, 1] }"
              :while-hover="{ y: -2 }" :while-tap="{ scale: 0.96 }" :title="f.tip" @click="f.go()">
              <component :is="f.icon" :size="11" /> {{ f.label }}
              <b class="sd-mono">{{ f.count }}</b>
            </Motion>
          </div>
        </div>
      </template>
    </div>

    <template #footer>
      <template v-if="phase === 'done'">
        <button class="qcf-btn" @click="$emit('close')">Close</button>
        <span style="flex:1" />
        <Motion v-if="result && result.remaining > 0" as="button" class="qcf-btn primary"
          :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }" @click="$emit('again')">
          <Route :size="13" /> Sweep again · {{ result.remaining }} left
        </Motion>
        <Motion v-else as="button" class="qcf-btn primary" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }"
          @click="$emit('close')"><Check :size="13" /> Done</Motion>
      </template>
      <template v-else>
        <button class="qcf-btn" :disabled="phase === 'run'" @click="$emit('close')">Cancel</button>
        <span style="flex:1" />
        <template v-if="phase === 'plan' && plan && plan.routed > 0">
          <button v-if="!armed" class="qcf-btn primary" @click="armed = true">
            <Route :size="13" /> Route {{ plan.routed }} ticket{{ plan.routed === 1 ? '' : 's' }}
          </button>
          <Motion v-else as="button" class="qcf-btn primary arm" :initial="{ scale: 0.92 }" :animate="{ scale: 1 }"
            :while-tap="{ scale: 0.96 }" @click="$emit('execute')">
            <Zap :size="13" /> Confirm — sweep {{ plan.routed }} into lanes
          </Motion>
        </template>
        <button v-else-if="phase === 'run'" class="qcf-btn primary" disabled>
          <Loader :size="13" class="bf-spin" /> Sweeping…
        </button>
      </template>
    </template>
  </SdModalShell>
</template>

<script setup>
/*
  SdBackfillModal — "THE RECOVERY SWEEP", the Route-the-backlog modal rebuilt as a
  four-phase instrument. One persistent CHAIN diagram (stranded pool → RULES →
  CATEGORY → TEAM LANE → DEFAULT → lanes) changes temperament per phase:
    scan — tracer packets ride the chain while the dry run reports
    plan — per-stage counts + proportional bars, the BEYOND-CAP warning the old
           modal silently dropped, and a stranded ledger whose reasons carry FIX
           actions (lay a lane for that team / lay a default lane / open rules)
    run  — the chain runs hot while the real sweep writes (min-duration paced)
    done — self-drawing seal + ACTUAL results, "sweep again" while remaining > 0
  Arm-to-execute two-step guards the bulk write. All data flows via props; the
  section owns the API calls (house pattern).
*/
import { ref, computed, watch, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  Route, Inbox, Zap, Users, Check, Loader, Sparkles, TriangleAlert,
  OctagonAlert, CornerDownRight, GitBranch, FolderTree, Home,
} from 'lucide-vue-next'
import SdModalShell from './SdModalShell.vue'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  scanning: { type: Boolean, default: false },
  running: { type: Boolean, default: false },
  plan: { type: Object, default: null },     // dry-run report
  result: { type: Object, default: null },   // execute report
})
const emit = defineEmits(['close', 'execute', 'again', 'fix-lane', 'fix-rules'])

const STAGES = [
  { k: 'rule', icon: GitBranch, label: 'RULES' },
  { k: 'category', icon: FolderTree, label: 'CATEGORY' },
  { k: 'team_lane', icon: Users, label: 'TEAM LANE' },
  { k: 'default_queue', icon: Home, label: 'DEFAULT' },
]
const capLabel = '1,000-ticket'

const phase = computed(() => {
  if (props.running) return 'run'
  if (props.result) return 'done'
  if (props.plan) return 'plan'
  return 'scan'
})
const activeReport = computed(() => (phase.value === 'done' ? props.result : props.plan))
const activeVia = computed(() => activeReport.value?.via || {})
const barW = (k) => {
  const r = activeReport.value
  if (!r || !r.routed) return '0%'
  return `${Math.round(((r.via?.[k] || 0) / r.routed) * 100)}%`
}
const lanesTouched = computed(() =>
  Object.values(props.result?.via || {}).filter(n => n > 0).length || 1)

/* arm-to-execute resets whenever the report changes or the modal reopens */
const armed = ref(false)
watch([() => props.open, () => props.plan, () => props.result], () => { armed.value = false })

/* FIX actions grouped from the stranded ledger's reason codes */
const fixes = computed(() => {
  const rows = (phase.value === 'done' ? props.result?.unrouted : props.plan?.unrouted) || []
  const out = []
  const teams = new Map()
  rows.forEach((u) => {
    if (u.reason_code === 'team_no_lane' && u.team_id && !teams.has(u.team_id)) {
      teams.set(u.team_id, { name: u.team_name || 'team', n: 0 })
    }
    if (u.reason_code === 'team_no_lane' && u.team_id) teams.get(u.team_id).n += 1
  })
  ;[...teams.entries()].slice(0, 3).forEach(([id, t]) => out.push({
    key: 'lane:' + id, icon: Inbox, label: `Lay a lane for ${t.name}`, count: t.n,
    tip: `${t.n} stranded ticket${t.n === 1 ? '' : 's'} belong${t.n === 1 ? 's' : ''} to ${t.name}, which owns no lane`,
    go: () => emit('fix-lane', { teamId: id }),
  }))
  const noDef = rows.filter(u => u.reason_code === 'no_default').length
  if (noDef) out.push({
    key: 'default', icon: Home, label: 'Lay a default lane', count: noDef,
    tip: 'Teamless tickets fall to the default lane — the desk has none',
    go: () => emit('fix-lane', { makeDefault: true }),
  })
  if (rows.length) out.push({
    key: 'rules', icon: GitBranch, label: 'Open routing rules', count: rows.length,
    tip: 'A first-match rule can capture any of these explicitly',
    go: () => emit('fix-rules'),
  })
  return out
})

const reduced = ref(false)
onMounted(() => {
  try {
    const cine = document.documentElement.getAttribute('data-cinematic') === 'on'
    reduced.value = !cine && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch { reduced.value = false }
})
</script>

<style scoped>
.bf { display: flex; flex-direction: column; gap: 14px;
  --bf-core: var(--sd-qc-core); --bf-hi: var(--sd-qc-hi); --bf-ink: var(--sd-text);
  --bf-dim: var(--sd-text-muted); --bf-brd: var(--sd-qc-brd); --bf-soft: var(--sd-qc-soft);
  --bf-go: var(--sd-qc-go); --bf-warn: var(--sd-qc-warn); --bf-halt: var(--sd-qc-halt); }
.bf-brief { margin: 0; display: flex; gap: 8px; align-items: flex-start; font-size: 11.5px;
  line-height: 1.55; color: var(--sd-text-secondary); }
.bf-brief svg { flex-shrink: 0; margin-top: 2px; color: var(--bf-core); }
.bf-brief b { color: var(--bf-ink); }

/* ═══ THE CHAIN ═══ */
.bf-chain {
  position: relative; display: grid; grid-template-columns: 86px 1fr 92px; gap: 12px;
  align-items: center; padding: 18px 14px 22px; border-radius: 14px; overflow: hidden;
  background: var(--sd-surface); border: 1px solid var(--sd-border);
}
.bf-chain::before { content: ''; position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background: radial-gradient(60% 80% at 8% 50%, color-mix(in srgb, var(--bf-core) 8%, transparent), transparent 70%); }

.bf-pool, .bf-dest { display: flex; flex-direction: column; align-items: center; gap: 3px; }
.bf-pool b, .bf-dest b { font-size: 17px; color: var(--bf-ink); }
.bf-pool .lb, .bf-dest .lb, .bf-stage .lb { font-size: 7px; letter-spacing: 0.16em; color: var(--bf-dim); }
.bf-pool-orb { position: relative; width: 34px; height: 34px; margin-bottom: 3px; }
.bf-pool-orb::before { content: ''; position: absolute; inset: 9px; border-radius: 50%;
  background: var(--bf-soft); border: 1.5px dashed var(--bf-brd); animation: bf-breathe 2.8s ease-in-out infinite; }
.bf-pool-orb i { position: absolute; inset: 0; border-radius: 50%; border: 1px solid var(--bf-brd);
  opacity: 0; animation: bf-emit 2.8s ease-out infinite; }
.bf-pool-orb i + i { animation-delay: 1.4s; }
@keyframes bf-emit { 0% { transform: scale(0.4); opacity: 0.8; } 100% { transform: scale(1.1); opacity: 0; } }
@keyframes bf-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
.bf-pool.empty .bf-pool-orb::before { animation: none; opacity: 0.4; }
.bf-pool.empty .bf-pool-orb i { animation: none; }

.bf-stages { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; min-width: 0; }
.bf-stage { position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 9px 6px 8px; border-radius: 11px; background: var(--sd-surface-elevated);
  border: 1px solid var(--sd-border); transition: opacity 0.3s, border-color 0.3s;
  animation: bf-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: calc(0.06s + var(--i) * 0.07s); }
@keyframes bf-in { from { opacity: 0; transform: translateY(10px) scale(0.94); } to { opacity: 1; transform: none; } }
.bf-stage.dim { opacity: 0.45; }
.bf-stage.hot { border-color: var(--bf-brd); }
.bf-stage-ic { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 9px;
  color: var(--bf-core); background: var(--bf-soft); border: 1px solid var(--bf-brd); }
.bf-stage b { font-size: 13px; color: var(--bf-ink); }
.bf-wire { position: absolute; top: 50%; left: -9px; width: 9px; height: 2px;
  background: repeating-linear-gradient(90deg, color-mix(in srgb, var(--bf-core) 55%, transparent) 0 4px, transparent 4px 8px);
  background-size: 8px 2px; animation: bf-flow 0.8s linear infinite; }
@keyframes bf-flow { to { background-position: 8px 0; } }
.bf-bar { display: block; width: 100%; height: 3px; border-radius: 3px; margin-top: 2px;
  background: color-mix(in srgb, var(--bf-ink) 8%, transparent); overflow: hidden; }
.bf-bar i { display: block; height: 100%; border-radius: inherit;
  background: linear-gradient(90deg, var(--bf-core), var(--bf-hi));
  transition: width 0.9s cubic-bezier(0.16, 1, 0.3, 1); }

.bf-dest-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px;
  margin-bottom: 3px; color: var(--bf-dim); border: 1.5px dashed var(--sd-border-strong);
  transition: color 0.3s, border-color 0.3s, box-shadow 0.3s; }
.bf-dest.lit .bf-dest-ic { color: var(--bf-go); border-style: solid;
  border-color: color-mix(in srgb, var(--bf-go) 45%, transparent);
  box-shadow: 0 0 14px color-mix(in srgb, var(--bf-go) 30%, transparent); }
.bf-spill { position: absolute; right: 12px; bottom: 6px; display: inline-flex; align-items: center;
  gap: 4px; font-size: 8px; font-weight: 800; letter-spacing: 0.1em; color: var(--bf-warn); }

/* tracer packets — ride the whole chain during scan + run */
.bf-tracer { position: absolute; top: 50%; width: 8px; height: 8px; border-radius: 50%; z-index: 1;
  transform: translateY(-50%); background: var(--bf-hi);
  box-shadow: 0 0 10px color-mix(in srgb, var(--bf-core) 80%, transparent);
  animation: bf-trace 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
.bf-tracer.t2 { animation-delay: 1.1s; }
@keyframes bf-trace { 0% { left: 6%; opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } 100% { left: 92%; opacity: 0; } }
.bf-chain.run .bf-tracer { animation-duration: 0.9s; }
.bf-chain.run .bf-tracer.t2 { animation-delay: 0.45s; }
.bf-scanlb { position: absolute; left: 50%; bottom: 5px; transform: translateX(-50%);
  font-size: 7.5px; letter-spacing: 0.16em; color: var(--bf-dim); white-space: nowrap;
  animation: bf-blink 1.8s ease-in-out infinite; }
.bf-scanlb.hot { color: var(--bf-warn); }
@keyframes bf-blink { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }

/* ═══ notes / warnings ═══ */
.bf-note { display: flex; gap: 8px; align-items: flex-start; padding: 10px 12px; border-radius: 11px;
  font-size: 11.5px; line-height: 1.5; color: var(--sd-text-secondary);
  border: 1px solid var(--sd-border); background: var(--sd-surface-elevated); }
.bf-note b { color: var(--bf-ink); }
.bf-note.warn { border-color: color-mix(in srgb, var(--bf-warn) 40%, transparent);
  background: color-mix(in srgb, var(--bf-warn) 7%, transparent); }
.bf-note.warn svg { color: var(--bf-warn); flex-shrink: 0; margin-top: 2px; }

/* ═══ all clear ═══ */
.bf-clear { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center;
  padding: 22px 16px; border-radius: 13px; border: 1px dashed color-mix(in srgb, var(--bf-go) 40%, transparent); }
.bf-clear b { font-size: 12px; letter-spacing: 0.14em; color: var(--bf-go); }
.bf-clear > span { font-size: 11.5px; color: var(--bf-dim); }
.bf-clear-seal { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 50%;
  color: var(--bf-go); background: color-mix(in srgb, var(--bf-go) 10%, transparent);
  border: 1.5px solid color-mix(in srgb, var(--bf-go) 45%, transparent);
  animation: bf-breathe 2.8s ease-in-out infinite; }

/* ═══ stranded ledger + fixes ═══ */
.bf-stuck { display: flex; flex-direction: column; gap: 9px; padding: 12px 13px; border-radius: 13px;
  background: var(--sd-surface-elevated); border: 1px solid var(--sd-border); }
.bf-stuck header { display: inline-flex; align-items: center; gap: 6px; font-size: 9px; font-weight: 800;
  letter-spacing: 0.12em; color: var(--bf-halt); }
.bf-fixes { display: flex; flex-wrap: wrap; gap: 7px; }
.bf-fix { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 999px;
  font-size: 11px; font-weight: 700; font-family: inherit; cursor: pointer;
  color: var(--bf-core); background: var(--bf-soft); border: 1px solid var(--bf-brd); }
.bf-fix b { font-size: 9px; padding: 1px 6px; border-radius: 999px; color: var(--bf-ink);
  background: color-mix(in srgb, var(--bf-ink) 8%, transparent); }
.bf-stuck-list { display: flex; flex-direction: column; gap: 4px; }
.bf-stuck-row { display: flex; align-items: baseline; gap: 8px; min-width: 0; font-size: 11px;
  padding: 5px 8px; border-radius: 8px; background: color-mix(in srgb, var(--bf-ink) 3%, transparent);
  animation: bf-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: calc(0.1s + var(--i) * 0.05s); }
.bf-stuck-row b { font-size: 10px; color: var(--bf-core); flex-shrink: 0; }
.bf-stuck-row .sub { color: var(--sd-text-secondary); white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis; flex: 1; }
.bf-stuck-row em { font-style: normal; font-size: 8.5px; letter-spacing: 0.06em; flex-shrink: 0;
  padding: 2px 7px; border-radius: 5px; color: var(--bf-warn);
  border: 1px solid color-mix(in srgb, var(--bf-warn) 40%, transparent); }
.bf-stuck-row em.no_default { color: var(--bf-halt);
  border-color: color-mix(in srgb, var(--bf-halt) 40%, transparent); }
.bf-more { margin: 0; font-size: 8.5px; letter-spacing: 0.1em; color: var(--bf-dim); }

/* ═══ the done seal ═══ */
.bf-seal { display: flex; align-items: center; gap: 14px; padding: 14px; border-radius: 13px;
  border: 1px solid color-mix(in srgb, var(--bf-go) 40%, transparent);
  background: color-mix(in srgb, var(--bf-go) 6%, transparent); }
.bf-seal-ring { width: 44px; height: 44px; flex-shrink: 0; }
.bf-seal-ring svg { width: 100%; height: 100%; }
.bf-seal-ring circle { fill: none; stroke: var(--bf-go); stroke-width: 2.5; stroke-linecap: round;
  stroke-dasharray: 107; stroke-dashoffset: 107; transform: rotate(-90deg); transform-origin: center;
  animation: bf-draw 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards; }
.bf-seal-ring path { fill: none; stroke: var(--bf-go); stroke-width: 3.4; stroke-linecap: round;
  stroke-linejoin: round; stroke-dasharray: 26; stroke-dashoffset: 26;
  animation: bf-draw 0.45s cubic-bezier(0.16, 1, 0.3, 1) 0.65s forwards; }
@keyframes bf-draw { to { stroke-dashoffset: 0; } }
.bf-seal-b { display: flex; flex-direction: column; gap: 3px; }
.bf-seal-b b { font-size: 13.5px; color: var(--bf-ink); }
.bf-seal-b span { font-size: 8px; letter-spacing: 0.12em; color: var(--bf-dim); }

.bf-spin { animation: bf-rot 0.8s linear infinite; }
@keyframes bf-rot { to { transform: rotate(360deg); } }

/* footer buttons — the section's scoped .qcf-btn can't reach into this component,
   so the shared look is mirrored locally */
.qcf-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 8px 14px; border-radius: 11px; font-size: 12px; font-weight: 700; cursor: pointer;
  font-family: inherit; border: 1px solid var(--sd-border-strong);
  background: var(--sd-surface-elevated); color: var(--sd-text);
  transition: border-color 0.2s, transform 0.2s;
}
.qcf-btn:hover { border-color: var(--sd-qc-brd); }
.qcf-btn.primary { background: var(--sd-qc-grad); color: #241703; border-color: transparent; box-shadow: var(--sd-qc-glow); }
.qcf-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.qcf-btn.primary.arm { box-shadow: var(--sd-qc-glow), 0 0 0 3px color-mix(in srgb, var(--sd-qc-core) 25%, transparent); }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .bf-pool-orb::before,
  html:not([data-cinematic="on"]) .bf-pool-orb i,
  html:not([data-cinematic="on"]) .bf-wire,
  html:not([data-cinematic="on"]) .bf-scanlb,
  html:not([data-cinematic="on"]) .bf-clear-seal { animation: none; }
  html:not([data-cinematic="on"]) .bf-stage,
  html:not([data-cinematic="on"]) .bf-stuck-row { animation-duration: 0.01s; animation-delay: 0s; }
  html:not([data-cinematic="on"]) .bf-seal-ring circle,
  html:not([data-cinematic="on"]) .bf-seal-ring path { animation-duration: 0.01s; animation-delay: 0s; }
}
</style>
