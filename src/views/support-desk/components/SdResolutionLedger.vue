<template>
  <div class="rsl">
    <div v-if="loading && !tickets.length" class="rsl-empty sd-mono">READING THE LEDGER…</div>
    <div v-else-if="!tickets.length" class="rsl-empty sd-mono">NOTHING ON THIS PAGE OF THE LEDGER.</div>
    <div v-else class="rsl-grid">
      <Motion v-for="(t, i) in tickets" :key="t.id" as="article" class="rsl-card" :class="{ bounced: (t.reopened_count || 0) > 0 }"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: Math.min(i * 0.045, 0.5), ease: [0.16, 1, 0.3, 1] }"
        :while-hover="reduced ? undefined : { y: -3 }">
        <!-- header: number · priority · rating -->
        <header class="rc-head">
          <button class="rc-no sd-mono" @click="$emit('open', t.id)">{{ t.ticket_number }}</button>
          <span class="rc-pri sd-mono" :style="{ color: priColor(t.priority) }">{{ (t.priority || '').toUpperCase() }}</span>
          <span class="rc-stars" :class="{ none: !t.csat_score, low: t.csat_score && t.csat_score <= 2 }" aria-label="Customer rating">
            <template v-if="t.csat_score"><Star v-for="n in 5" :key="n" :size="11" :class="{ lit: t.csat_score >= n }" /></template>
            <i v-else class="sd-mono">UNRATED</i>
          </span>
        </header>

        <button class="rc-subj" @click="$emit('open', t.id)">{{ t.subject }}</button>

        <!-- the resolution story -->
        <div class="rc-story">
          <div class="rc-code-row">
            <span class="rc-code sd-mono"><CircleCheck :size="11" /> {{ codeOf(t) }}</span>
            <span v-if="t.resolution_category" class="rc-cause sd-mono">{{ t.resolution_category.replace(/_/g, ' ').toUpperCase() }}</span>
            <span v-if="(t.reopened_count || 0) > 0" class="rc-bounce sd-mono" :title="`Bounced ${t.reopened_count}× before this fix held`">
              <RotateCcw :size="10" /> ×{{ t.reopened_count }}
            </span>
          </div>
          <p class="rc-summary">{{ t.resolution_summary || 'No summary recorded on this fix.' }}</p>
        </div>

        <!-- footer telemetry -->
        <footer class="rc-foot sd-mono">
          <span class="f-by" :title="'Resolved by ' + (byOf(t) || '—')"><UserCheck :size="10" /> {{ byOf(t) || '—' }}</span>
          <span class="f-ttr" title="Time to resolve"><Timer :size="10" /> {{ ttrOf(t) }}</span>
          <span class="f-at">{{ ago(t.resolved_at) }} AGO</span>
          <span v-if="t.status === 'resolved' && t.auto_close_at" class="f-close" :class="closeState(t)">
            SEALS {{ closesIn(t) }}
          </span>
          <span v-else-if="t.status === 'closed'" class="f-sealed"><Archive :size="10" /> SEALED</span>
        </footer>
      </Motion>
    </div>
  </div>
</template>

<script setup>
/* SdResolutionLedger — the Resolved desk's bespoke view: one "resolution story" card per
   ticket (fix code → root cause → summary → resolver → speed → the live seal countdown).
   The desk's answer to the Reopened desk's SdReopenLoop — that view reads a FAILURE
   story, this one reads the record of what worked. */
import { Motion } from 'motion-v'
import { Star, CircleCheck, RotateCcw, UserCheck, Timer, Archive } from 'lucide-vue-next'

const props = defineProps({
  tickets: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  loading: { type: Boolean, default: false },
  reduced: { type: Boolean, default: false },
})
defineEmits(['open'])

const PRI_COLOR = { critical: 'var(--sd-pri-critical)', urgent: 'var(--sd-pri-urgent)', high: 'var(--sd-pri-high)', medium: 'var(--sd-pri-medium)', low: 'var(--sd-pri-low)' }
const priColor = (p) => PRI_COLOR[p] || 'var(--sd-text-muted)'
const codeOf = (t) => (t.resolution_code || 'uncoded').replace(/_/g, ' ').toUpperCase()
const byOf = (t) => t.resolved_by_name || t.assigned_agent_name || ''
const ep = (v) => (v ? new Date(v).getTime() : 0)
const ttrOf = (t) => {
  const a = ep(t.created_at), b = ep(t.resolved_at)
  if (!a || !b || b <= a) return '—'
  const m = Math.floor((b - a - (t.sla_paused_ms || 0)) / 60000)
  if (m < 60) return `${Math.max(1, m)}m`
  if (m < 1440) return `${(m / 60).toFixed(1)}h`
  return `${(m / 1440).toFixed(1)}d`
}
const ago = (iso) => {
  if (!iso) return '—'
  const s = Math.floor((props.now - new Date(iso).getTime()) / 1000)
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}M`
  if (s < 86400) return `${Math.floor(s / 3600)}H`
  return `${Math.floor(s / 86400)}D`
}
const closeMs = (t) => ep(t.auto_close_at) - props.now
const closesIn = (t) => {
  const ms = closeMs(t)
  if (ms <= 0) return 'NOW'
  const m = Math.floor(ms / 60000)
  if (m < 60) return `IN ${m}M`
  if (m < 1440) return `IN ${Math.floor(m / 60)}H`
  return `IN ${Math.floor(m / 1440)}D ${Math.floor((m % 1440) / 60)}H`
}
const closeState = (t) => {
  const ms = closeMs(t)
  return ms <= 0 ? 'over' : ms <= 86400000 ? 'soon' : ''
}
</script>

<style scoped>
.rsl-empty { padding: 48px 0; text-align: center; font-size: 11px; font-weight: 800; letter-spacing: 0.2em; color: var(--sd-text-dim); }
.rsl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }

.rsl-card { display: flex; flex-direction: column; gap: 9px; padding: 14px 15px; border-radius: 16px;
  border: 1px solid var(--sd-res-brd); background: var(--sd-surface);
  transition: border-color 0.2s, box-shadow 0.2s; position: relative; overflow: hidden; }
.rsl-card::before { content: ""; position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--sd-res-hi), var(--sd-res-deep)); opacity: 0.8; }
.rsl-card.bounced::before { background: linear-gradient(180deg, var(--sd-res-risk), var(--sd-res-deep)); }
.rsl-card:hover { border-color: var(--sd-res-core); box-shadow: var(--sd-res-glow); }

.rc-head { display: flex; align-items: center; gap: 10px; }
.rc-no { padding: 0; border: none; background: none; cursor: pointer; font-family: inherit;
  font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; color: var(--sd-res-hi); }
.rc-no:hover { text-decoration: underline; }
.rc-pri { font-size: 9px; font-weight: 800; letter-spacing: 0.12em; }
.rc-stars { margin-left: auto; display: inline-flex; align-items: center; gap: 1.5px; color: var(--sd-border-strong); }
.rc-stars .lit { color: var(--sd-res-brass); fill: var(--sd-res-brass); }
.rc-stars.low .lit { color: var(--sd-res-risk); fill: var(--sd-res-risk); }
.rc-stars.none i { font-style: normal; font-size: 8px; font-weight: 800; letter-spacing: 0.12em; color: var(--sd-text-dim);
  border: 1px dashed var(--sd-border-strong); border-radius: 999px; padding: 2px 7px; }

.rc-subj { padding: 0; border: none; background: none; cursor: pointer; text-align: left; font-family: inherit;
  font-size: 13.5px; font-weight: 700; line-height: 1.35; color: var(--sd-text);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 36px; }
.rc-subj:hover { color: var(--sd-res-core); }

.rc-story { display: flex; flex-direction: column; gap: 6px; padding: 9px 11px; border-radius: 11px;
  border: 1px solid var(--sd-border); background: var(--sd-res-soft); }
.rc-code-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.rc-code { display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 999px;
  font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em; color: var(--sd-res-core);
  border: 1px solid color-mix(in srgb, var(--sd-res-core) 45%, transparent); background: var(--sd-res-soft); }
.rc-cause { padding: 2px 8px; border-radius: 999px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em;
  color: var(--sd-res-brass); border: 1px solid color-mix(in srgb, var(--sd-res-brass) 45%, transparent);
  background: var(--sd-res-brass-soft); }
.rc-bounce { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px;
  font-size: 8.5px; font-weight: 800; color: var(--sd-res-risk);
  border: 1px solid color-mix(in srgb, var(--sd-res-risk) 45%, transparent); background: var(--sd-res-risk-soft); }
.rc-summary { margin: 0; font-size: 12px; line-height: 1.5; color: var(--sd-text-secondary);
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

.rc-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.08em; }
.f-by, .f-ttr { display: inline-flex; align-items: center; gap: 4px; color: var(--sd-text-muted); max-width: 130px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f-at { color: var(--sd-text-dim); }
.f-close { margin-left: auto; color: var(--sd-res-close); }
.f-close.soon { color: var(--sd-warning); }
.f-close.over { color: var(--sd-danger); }
.f-sealed { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; color: var(--sd-text-dim); }
</style>
