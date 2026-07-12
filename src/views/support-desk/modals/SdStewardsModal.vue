<template>
  <SdModalShell :open="open" eyebrow="PIT WALL · GOVERNANCE" title="Stewards' report" width="620px" @close="$emit('close')">
    <div class="stw">
      <p class="stw-hint">Every skip is a recorded decision — reason-coded, timeline-noted, out of that agent's rotation
        for the day. This is the last 7 days across your visible lanes.</p>

      <div v-if="loading" class="stw-empty sd-mono">PULLING TELEMETRY…</div>
      <template v-else>
        <div class="stw-strip sd-mono">
          <span class="stw-total"><i>SKIPS · 7 DAYS</i><b>{{ report.total ?? 0 }}</b></span>
          <span v-for="(n, code) in report.by_reason || {}" :key="code" class="stw-reason">
            <i class="stw-dot" />{{ reasonLabel(code) }} <b>{{ n }}</b>
          </span>
        </div>

        <div v-if="(report.by_agent || []).length" class="stw-agents">
          <h4 class="stw-h sd-mono">BY DRIVER</h4>
          <div v-for="a in report.by_agent" :key="a.user_id" class="stw-agent">
            <span class="stw-agent-name">{{ a.name || 'Agent' }}</span>
            <span class="stw-bar" aria-hidden="true">
              <Motion as="i" :initial="{ scaleX: 0 }" :animate="{ scaleX: Math.min(1, (a.count || 0) / maxAgent) }"
                :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }" />
            </span>
            <b class="sd-mono" :class="{ hot: (a.count || 0) > 3 }">{{ a.count }}</b>
          </div>
        </div>

        <div v-if="(report.recent || []).length" class="stw-recent">
          <h4 class="stw-h sd-mono">RECENT DECISIONS</h4>
          <div v-for="(r, i) in report.recent.slice(0, 8)" :key="i" class="stw-row">
            <span class="stw-row-no sd-mono">{{ r.ticket_number || '—' }}</span>
            <span class="stw-row-who">{{ r.user_name || 'Agent' }}</span>
            <span class="stw-row-why sd-mono">{{ reasonLabel(r.reason_code) }}</span>
            <span class="stw-row-note" :title="r.note || ''">{{ r.note || '' }}</span>
          </div>
        </div>

        <div v-if="!(report.total > 0)" class="stw-empty sd-mono">CLEAN RACE — NO SKIPS ON RECORD</div>
      </template>
    </div>
    <template #footer>
      <button class="stw-btn" @click="$emit('close')">Close</button>
    </template>
  </SdModalShell>
</template>

<script setup>
/* SdStewardsModal — first consumer of GET /tickets/skip-report: the skip-governance
   audit (totals, by-driver bars, reason mix, recent decisions), team-sealed
   server-side. Opened from the Pit Wall hero's scroll button. */
import { ref, watch, computed } from 'vue'
import { Motion } from 'motion-v'
import SdModalShell from '../components/SdModalShell.vue'
import { fetchSkipReport, SKIP_REASONS } from '@/composables/useSupportDesk'

const props = defineProps({ open: { type: Boolean, default: false } })
defineEmits(['close'])

const report = ref({})
const loading = ref(false)
const maxAgent = computed(() => Math.max(1, ...(report.value.by_agent || []).map(a => a.count || 0)))
const reasonLabel = (code) => SKIP_REASONS.find(r => r.value === code)?.label || code || '—'

watch(() => props.open, async (v) => {
  if (!v) return
  loading.value = true
  try { report.value = await fetchSkipReport({ days: 7 }) || {} }
  catch { report.value = {} }
  finally { loading.value = false }
})
</script>

<style scoped>
.stw { display: flex; flex-direction: column; gap: 14px; }
.stw-hint { margin: 0; font-size: 11.5px; line-height: 1.5; color: var(--sd-text-muted); }

.stw-strip { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 11px 13px;
  border-radius: 12px; border: 1px dashed var(--sd-border-strong);
  background: color-mix(in srgb, var(--sd-qs-core) 5%, transparent); }
.stw-total { display: flex; flex-direction: column; gap: 2px; padding-right: 14px;
  border-right: 1px dashed var(--sd-border); }
.stw-total i { font-style: normal; font-size: 8.5px; font-weight: 800; letter-spacing: 0.18em; color: var(--sd-text-dim); }
.stw-total b { font-size: 18px; font-weight: 800; color: var(--sd-qs-core); font-variant-numeric: tabular-nums; }
.stw-reason { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700;
  color: var(--sd-text-secondary); }
.stw-reason b { color: var(--sd-text); }
.stw-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sd-qs-warn); }

.stw-h { margin: 0 0 8px; font-size: 9px; font-weight: 800; letter-spacing: 0.2em; color: var(--sd-text-dim); }
.stw-agents { display: flex; flex-direction: column; }
.stw-agent { display: grid; grid-template-columns: minmax(90px, 160px) 1fr 30px; align-items: center; gap: 10px;
  padding: 5px 0; }
.stw-agent-name { font-size: 12px; font-weight: 600; color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stw-bar { height: 7px; border-radius: 4px; overflow: hidden; background: color-mix(in srgb, var(--sd-text) 8%, transparent); }
.stw-bar i { display: block; height: 100%; border-radius: 4px; transform-origin: left;
  background: linear-gradient(90deg, var(--sd-qs-core), var(--sd-qs-warn)); }
.stw-agent b { font-size: 11px; font-weight: 800; text-align: right; color: var(--sd-text-secondary); }
.stw-agent b.hot { color: var(--sd-qs-halt); }

.stw-recent { display: flex; flex-direction: column; }
.stw-row { display: grid; grid-template-columns: 76px minmax(70px, 120px) minmax(90px, 140px) 1fr; gap: 10px;
  align-items: baseline; padding: 6px 0; border-bottom: 1px dashed var(--sd-border); }
.stw-row:last-child { border-bottom: none; }
.stw-row-no { font-size: 10px; font-weight: 800; color: var(--sd-qs-core); }
.stw-row-who { font-size: 11.5px; font-weight: 600; color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stw-row-why { font-size: 10px; font-weight: 700; color: var(--sd-qs-warn); }
.stw-row-note { font-size: 11px; color: var(--sd-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.stw-empty { padding: 18px 0; text-align: center; font-size: 10px; letter-spacing: 0.18em; color: var(--sd-text-dim); }
.stw-btn { padding: 8px 16px; border-radius: 11px; font-size: 12px; font-weight: 700; cursor: pointer;
  font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text-secondary); }
.stw-btn:hover { color: var(--sd-text); }
</style>
