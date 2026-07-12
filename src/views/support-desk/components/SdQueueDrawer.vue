<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="queueId" as="div" class="qd-veil" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }" :transition="{ duration: 0.25 }" @click.self="$emit('close')">
        <Motion as="aside" class="qd" :style="{ '--tc': accent }"
          :initial="{ x: 60, opacity: 0 }" :animate="{ x: 0, opacity: 1 }" :exit="{ x: 60, opacity: 0 }"
          :transition="{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }"
          role="dialog" aria-modal="true" :aria-label="`Queue ${stats?.name || ''} details`"
          @mousedown.stop @click.stop>
          <span class="qd-spine" aria-hidden="true" />

          <!-- header -->
          <header class="qd-head">
            <div class="qd-lamp" :class="`h-${card.health || 'green'}`" aria-hidden="true" />
            <div class="qd-id">
              <p class="qd-eyebrow sd-mono">LANE FILE<template v-if="card.tier"> · L{{ card.tier }}</template><template v-if="card.is_default"> · DEFAULT</template></p>
              <h3 class="qd-name">{{ stats?.name || '…' }}</h3>
              <p class="qd-team">{{ card.team_name || 'No crew assigned' }}
                <span v-if="card.coverage_open === true" class="ok">· on shift</span>
                <span v-else-if="card.coverage_open === false" class="dim">· off hours</span>
              </p>
            </div>
            <button class="qd-x" aria-label="Close" @click="$emit('close')"><X :size="16" /></button>
          </header>

          <div v-if="loading" class="qd-skel">
            <span v-for="i in 6" :key="i" class="qd-skel-row" :style="{ '--i': i }" />
          </div>

          <div v-else-if="stats" class="qd-body">
            <!-- headline gauge strip -->
            <div class="qd-kpis">
              <div v-for="k in kpis" :key="k.label" class="qd-kpi" :style="{ '--kc': k.color }">
                <b>{{ k.value }}</b><i>{{ k.label }}</i>
              </div>
            </div>

            <!-- vitals: age of open work + crew load (Vitals Bay telemetry) -->
            <div v-if="ageTotal" class="qd-vitals">
              <div class="qd-age" :title="ageTitle">
                <span v-for="s in ageSegs" :key="s.key" class="qd-age-seg" :class="s.key"
                  :style="{ flexGrow: s.n || 0.001 }">{{ s.n || '' }}</span>
              </div>
              <div v-if="card.load_pct != null" class="qd-loadrow sd-mono">
                <span class="qd-load-track"><span class="qd-load-fill" :class="{ hot: card.load_pct >= 100 }"
                  :style="{ width: Math.min(100, card.load_pct) + '%' }" /></span>
                <span :class="{ bad: card.load_pct >= 100 }">CREW LOAD {{ Math.round(card.load_pct) }}%</span>
                <span v-if="card.drain_eta_mins != null" class="dim">· DRAIN {{ fmtEta(card.drain_eta_mins) }}</span>
                <span v-if="card.reopens_range" class="warn">· ↺ {{ card.reopens_range }} REOPENS</span>
              </div>
            </div>

            <!-- routing surface -->
            <section class="qd-sec">
              <h4 class="qd-sec-t"><GitBranch :size="13" /> Routing surface</h4>
              <div class="qd-routing sd-mono">
                <span class="qd-chip method">{{ methodLabel }}</span>
                <span class="qd-chip">{{ serveLabel }}</span>
                <span class="qd-chip">drain {{ card.queue_priority }}</span>
                <span v-if="card.auto_assign" class="qd-chip on">auto-assign</span>
              </div>
              <div v-if="stats.categories?.length" class="qd-chips">
                <span v-for="c in stats.categories" :key="c.id" class="qd-chip cat">{{ c.name }}</span>
              </div>
              <div v-if="stats.skills?.length" class="qd-chips">
                <span v-for="s in stats.skills" :key="s.id" class="qd-chip skill" :style="{ '--sc': s.color || 'var(--sd-qs-core)' }">
                  <Sparkles :size="10" /> {{ s.name }} · {{ s.agent_count }}
                </span>
              </div>
              <ul v-if="stats.rules?.length" class="qd-rules">
                <li v-for="r in stats.rules" :key="r.id">
                  <span class="qd-rule-order sd-mono">#{{ r.order_index }}</span>
                  <span class="qd-rule-name">{{ r.name }}</span>
                  <span class="qd-rule-runs sd-mono">×{{ r.run_count }}</span>
                </li>
              </ul>
              <p v-else class="qd-none">No routing rules target this lane — it fills via category routing{{ card.is_default ? ' + the default fallback' : '' }}.</p>
            </section>

            <!-- mix bars -->
            <section class="qd-sec">
              <h4 class="qd-sec-t"><BarChart3 :size="13" /> Live mix</h4>
              <div v-for="row in mixRows" :key="row.key" class="qd-mix">
                <span class="qd-mix-lb sd-mono">{{ row.label }}</span>
                <span class="qd-mix-track">
                  <span v-for="seg in row.segs" :key="seg.key" class="qd-mix-seg" :style="{ width: seg.pct + '%', background: seg.color }" :title="`${seg.key}: ${seg.n}`" />
                </span>
              </div>
            </section>

            <!-- crew load -->
            <section class="qd-sec">
              <h4 class="qd-sec-t"><Users :size="13" /> Crew load</h4>
              <ul v-if="stats.load?.length" class="qd-crew">
                <li v-for="m in stats.load" :key="m.user_id">
                  <span class="qd-crew-dot" :style="{ background: statusColorOf(m.status) }" :title="m.status" />
                  <span class="qd-crew-name">{{ m.name || 'Agent' }}</span>
                  <span class="qd-crew-bar"><span :style="{ width: crewPct(m) + '%' }" /></span>
                  <b class="qd-crew-n sd-mono">{{ m.open_count }}</b>
                </li>
              </ul>
              <p v-else class="qd-none">No crew — tickets wait here until an agent claims them.</p>
            </section>

            <!-- recent activity -->
            <section class="qd-sec">
              <h4 class="qd-sec-t"><Activity :size="13" /> Recent lane activity</h4>
              <ul v-if="stats.recent_activity?.length" class="qd-feed">
                <li v-for="(a, i) in stats.recent_activity" :key="i">
                  <span class="qd-feed-no sd-mono">{{ a.ticket_number }}</span>
                  <span class="qd-feed-act">{{ prettyAction(a.action) }}</span>
                  <span class="qd-feed-by">{{ a.actor || 'System' }}</span>
                  <span class="qd-feed-at sd-mono">{{ ago(a.at) }}</span>
                </li>
              </ul>
              <p v-else class="qd-none">Quiet lane — no recent activity.</p>
            </section>
          </div>

          <!-- footer actions -->
          <footer class="qd-foot">
            <Motion v-if="card.tier" as="button" class="qd-btn primary" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
              @click="$emit('work', card)">
              <Play :size="14" /> Work this lane
            </Motion>
            <Motion v-if="isAdmin" as="button" class="qd-btn ghost" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }"
              @click="$emit('config', card)">
              <SlidersHorizontal :size="14" /> Edit in Tower
            </Motion>
            <button class="qd-btn ghost" @click="$emit('close')">Close</button>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
/* SdQueueDrawer — the LANE FILE: one queue's deep drill (headline gauges, routing
   surface, live status/priority mix, crew load with availability dots, recent lane
   activity). Teleported + @mousedown.stop so ancestor click-outside directives can't
   eat interactions (the teleported-popover rule). Fetches /queues/{id}/stats itself. */
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  X, Play, SlidersHorizontal, Users, Activity, GitBranch, BarChart3, Sparkles,
} from 'lucide-vue-next'
import {
  queueStats, priorityColor, statusColor, AGENT_STATUS_META, SERVE_ORDERS,
} from '@/composables/useSupportDesk'

const props = defineProps({
  queueId: { type: String, default: null },
  isAdmin: { type: Boolean, default: false },
})
defineEmits(['close', 'work', 'config'])

const stats = ref(null)
const loading = ref(false)
watch(() => props.queueId, async (id) => {
  stats.value = null
  if (!id) return
  loading.value = true
  try { stats.value = await queueStats(id) } catch { stats.value = null } finally { loading.value = false }
}, { immediate: true })

const card = computed(() => stats.value?.card || {})
const accent = computed(() => card.value.color || (card.value.tier ? `var(--sd-qs-t${card.value.tier})` : 'var(--sd-qs-core)'))

const kpis = computed(() => ([
  { label: 'OPEN', value: card.value.open ?? 0, color: 'var(--sd-qs-core)' },
  { label: 'UNOWNED', value: card.value.unassigned ?? 0, color: 'var(--sd-qs-warn)' },
  { label: 'BREACHED', value: card.value.breached ?? 0, color: 'var(--sd-qs-halt)' },
  { label: 'SLA 7D', value: card.value.sla_attainment_7d != null ? `${card.value.sla_attainment_7d}%` : '—', color: 'var(--sd-qs-go)' },
  { label: 'WAIT', value: fmtWait(card.value.avg_wait_mins), color: 'var(--sd-qs-rail)' },
]))

const mixRows = computed(() => {
  const mk = (key, label, counts, colorOf) => {
    const total = Object.values(counts || {}).reduce((a, b) => a + b, 0) || 1
    return {
      key, label,
      segs: Object.entries(counts || {}).map(([k, n]) => ({ key: k, n, pct: (n / total) * 100, color: colorOf(k) })),
    }
  }
  return [
    mk('status', 'STATUS', stats.value?.status_counts, statusColor),
    mk('priority', 'PRIORITY', stats.value?.priority_counts, priorityColor),
  ].filter(r => r.segs.length)
})

const crewMax = computed(() => Math.max(1, ...(stats.value?.load || []).map(m => m.open_count)))
const crewPct = (m) => Math.round((m.open_count / crewMax.value) * 100)
const statusColorOf = (s) => AGENT_STATUS_META[s]?.color || 'var(--sd-qs-go)'

const methodLabel = computed(() => ({ manual: 'manual pick-up', round_robin: 'round-robin', load_balanced: 'load-balanced' }[card.value.assignment_method] || 'manual'))
const serveLabel = computed(() => SERVE_ORDERS.find(s => s.value === card.value.serve_order)?.label?.toLowerCase() || 'priority, then age')

/* Vitals Bay telemetry rows (aging strip + crew load) — fed by the enriched card */
const AGE_LABELS = { lt_1h: '<1h', h1_4: '1–4h', h4_24: '4–24h', d1_3: '1–3d', gt_3d: '>3d' }
const ageSegs = computed(() => Object.keys(AGE_LABELS).map(k => ({ key: k, n: (card.value.aging || {})[k] || 0 })))
const ageTotal = computed(() => ageSegs.value.reduce((a, s) => a + s.n, 0))
const ageTitle = computed(() =>
  'Age of open work · ' + Object.entries(AGE_LABELS).map(([k, l]) => `${l}: ${(card.value.aging || {})[k] || 0}`).join(' · '))
const fmtEta = (m) => {
  if (m == null) return '—'
  if (m < 60) return `${Math.round(m)}m`
  const h = Math.floor(m / 60)
  return h < 48 ? `${h}h` : `${Math.round(h / 24)}d`
}

const prettyAction = (a) => String(a || '').replace(/_/g, ' ')
const fmtWait = (m) => (m == null ? '—' : m < 60 ? `${Math.round(m)}m` : `${(m / 60).toFixed(1)}h`)
const ago = (iso) => {
  if (!iso) return ''
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}
</script>

<style scoped>
.qd-veil { position: fixed; inset: 0; z-index: 5200; background: rgba(5, 4, 2, 0.55);
  backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }
[data-theme="light"] .qd-veil { background: rgba(40, 30, 10, 0.3); }

.qd { position: absolute; top: 0; right: 0; bottom: 0; width: min(460px, 94vw); display: flex; flex-direction: column;
  background: var(--sd-panel, var(--sd-surface)); border-left: 1px solid var(--sd-border-strong);
  box-shadow: -30px 0 70px -30px rgba(0, 0, 0, 0.6); }
.qd-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--tc); opacity: 0.9; }

.qd-head { display: flex; align-items: flex-start; gap: 11px; padding: 18px 18px 14px; border-bottom: 1px solid var(--sd-border); }
.qd-lamp { width: 10px; height: 10px; margin-top: 6px; border-radius: 50%; background: var(--sd-qs-go); flex-shrink: 0; }
.qd-lamp.h-amber { background: var(--sd-qs-warn); }
.qd-lamp.h-red { background: var(--sd-qs-halt); animation: qd-lamp 1.3s ease-out infinite; }
.qd-id { flex: 1; min-width: 0; }
.qd-eyebrow { margin: 0; font-size: 9px; font-weight: 800; letter-spacing: 0.22em; color: var(--tc); }
.qd-name { margin: 3px 0 2px; font-size: 19px; font-weight: 800; letter-spacing: -0.01em; color: var(--sd-text); }
.qd-team { margin: 0; font-size: 11px; color: var(--sd-text-muted); }
.qd-team .ok { color: var(--sd-qs-go); }
.qd-team .dim { color: var(--sd-text-dim); }
.qd-x { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; cursor: pointer;
  border: 1px solid var(--sd-border); background: transparent; color: var(--sd-text-muted); }
.qd-x:hover { color: var(--sd-text); border-color: var(--sd-border-strong); }

.qd-skel { display: flex; flex-direction: column; gap: 10px; padding: 18px; }
.qd-skel-row { height: 42px; border-radius: 10px; background: color-mix(in srgb, var(--sd-qs-rail) 12%, transparent);
  animation: qd-shimmer 1.2s ease-in-out infinite; animation-delay: calc(var(--i) * 0.08s); }

.qd-body { flex: 1; overflow-y: auto; padding: 14px 18px; display: flex; flex-direction: column; gap: 16px; }

.qd-kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 7px; }
.qd-kpi { display: flex; flex-direction: column; gap: 2px; padding: 9px 8px; border-radius: 11px; text-align: center;
  border: 1px solid color-mix(in srgb, var(--kc) 30%, transparent); background: color-mix(in srgb, var(--kc) 8%, transparent); }
.qd-kpi b { font-size: 15px; font-weight: 800; color: var(--sd-text); font-variant-numeric: tabular-nums; }
.qd-kpi i { font-style: normal; font-size: 7.5px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-text-dim); }

/* vitals rows (aging strip + crew load) */
.qd-vitals { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
.qd-age { display: flex; gap: 2px; height: 15px; }
.qd-age-seg { display: grid; place-items: center; min-width: 4px; border-radius: 3px; overflow: hidden;
  flex-basis: 0; font-size: 7.5px; font-weight: 800; color: #241703; }
.qd-age-seg.lt_1h { background: #ffe9bb; }
.qd-age-seg.h1_4 { background: #ffd98a; }
.qd-age-seg.h4_24 { background: #f2b64d; }
.qd-age-seg.d1_3 { background: #d99a2b; }
.qd-age-seg.gt_3d { background: var(--sd-qv-halt); color: #2b0508; }
.qd-loadrow { display: flex; align-items: center; gap: 7px; font-size: 8.5px; letter-spacing: 0.1em;
  color: var(--sd-text-dim); }
.qd-load-track { flex: 1; height: 5px; border-radius: 4px; overflow: hidden;
  background: color-mix(in srgb, var(--sd-qs-rail) 22%, transparent); }
.qd-load-fill { display: block; height: 100%; border-radius: 4px;
  background: linear-gradient(90deg, var(--sd-qv-core), var(--sd-qv-go)); }
.qd-load-fill.hot { background: linear-gradient(90deg, var(--sd-qv-warn), var(--sd-qv-halt)); }
.qd-loadrow .bad { color: var(--sd-qv-halt); font-weight: 800; }
.qd-loadrow .warn { color: var(--sd-qv-warn); font-weight: 800; }
.qd-loadrow .dim { color: var(--sd-text-dim); }

.qd-sec { display: flex; flex-direction: column; gap: 8px; }
.qd-sec-t { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 11px; font-weight: 800;
  letter-spacing: 0.08em; text-transform: uppercase; color: var(--sd-text-secondary); }
.qd-none { margin: 0; font-size: 11px; color: var(--sd-text-dim); }

.qd-routing, .qd-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.qd-chip { padding: 4px 9px; border-radius: 8px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.05em;
  border: 1px solid var(--sd-border); color: var(--sd-text-muted); }
.qd-chip.method { color: var(--tc); border-color: color-mix(in srgb, var(--tc) 40%, transparent); }
.qd-chip.on { color: var(--sd-qs-go); border-color: color-mix(in srgb, var(--sd-qs-go) 40%, transparent); }
.qd-chip.cat { background: color-mix(in srgb, var(--sd-qs-core) 8%, transparent); }
.qd-chip.skill { display: inline-flex; align-items: center; gap: 4px; color: var(--sc); border-color: color-mix(in srgb, var(--sc) 40%, transparent); }

.qd-rules { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
.qd-rules li { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 9px;
  border: 1px solid var(--sd-border); background: color-mix(in srgb, var(--sd-qs-core) 4%, transparent); }
.qd-rule-order { font-size: 9px; font-weight: 800; color: var(--tc); }
.qd-rule-name { flex: 1; font-size: 11.5px; font-weight: 600; color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.qd-rule-runs { font-size: 9px; color: var(--sd-text-dim); }

.qd-mix { display: grid; grid-template-columns: 62px 1fr; align-items: center; gap: 9px; }
.qd-mix-lb { font-size: 8.5px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-text-dim); }
.qd-mix-track { display: flex; height: 9px; border-radius: 6px; overflow: hidden; background: color-mix(in srgb, var(--sd-qs-rail) 14%, transparent); }
.qd-mix-seg { display: block; height: 100%; min-width: 2px; transition: width 0.5s var(--sd-spring); }

.qd-crew { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.qd-crew li { display: grid; grid-template-columns: 10px minmax(90px, 130px) 1fr 26px; align-items: center; gap: 9px; }
.qd-crew-dot { width: 8px; height: 8px; border-radius: 50%; }
.qd-crew-name { font-size: 11.5px; font-weight: 600; color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.qd-crew-bar { height: 5px; border-radius: 4px; overflow: hidden; background: color-mix(in srgb, var(--sd-qs-rail) 14%, transparent); }
.qd-crew-bar span { display: block; height: 100%; border-radius: 4px; background: var(--tc); transition: width 0.5s var(--sd-spring); }
.qd-crew-n { font-size: 11px; font-weight: 800; color: var(--sd-text-secondary); text-align: right; }

.qd-feed { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
.qd-feed li { display: grid; grid-template-columns: 74px 1fr auto 30px; gap: 8px; align-items: baseline;
  padding: 6px 9px; border-radius: 8px; border: 1px dashed var(--sd-border); }
.qd-feed-no { font-size: 9.5px; font-weight: 800; color: var(--tc); }
.qd-feed-act { font-size: 11px; color: var(--sd-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.qd-feed-by { font-size: 10px; color: var(--sd-text-dim); }
.qd-feed-at { font-size: 9px; color: var(--sd-text-dim); text-align: right; }

.qd-foot { display: flex; gap: 8px; padding: 13px 18px; border-top: 1px solid var(--sd-border); }
.qd-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 11px;
  font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border); background: transparent; color: var(--sd-text-secondary); }
.qd-btn.primary { border-color: transparent; color: #241703; background: linear-gradient(135deg, #ffd98a, var(--sd-qs-core)); }
.qd-btn.ghost:hover { border-color: var(--sd-border-strong); color: var(--sd-text); }
.qd-btn:last-child { margin-left: auto; }

@keyframes qd-lamp { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-qs-halt) 55%, transparent); } 100% { box-shadow: 0 0 0 9px transparent; } }
@keyframes qd-shimmer { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .qd-lamp.h-red, html:not([data-cinematic="on"]) .qd-skel-row { animation: none; }
}
</style>
