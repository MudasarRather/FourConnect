<template>
  <section class="cll sd-card">
    <div v-if="loading" class="cll-loading sd-mono">READING THE LEDGER…</div>
    <div v-else-if="!tickets.length" class="cll-empty">
      <ScrollText :size="26" />
      <b>Nothing on this page of the ledger</b>
      <span>Clear the refinement — the archive keeps every sealed record.</span>
    </div>

    <Motion v-for="(t, i) in tickets" :key="String(t.id)" as="article" class="cll-row"
      :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.38, delay: Math.min(i * 0.04, 0.5), ease: [0.16, 1, 0.3, 1] }"
      @click="$emit('open', t.id)">
      <!-- the seal -->
      <button class="cll-seal" :class="'ps-' + srcOf(t)" :title="'Closure certificate — ' + srcLabel(t)"
        @click.stop="$emit('certificate', t)">
        <component :is="srcIcon(t)" :size="15" />
        <span class="cll-seal-ring" aria-hidden="true" />
      </button>

      <!-- the record -->
      <div class="cll-body">
        <div class="cll-top">
          <span class="cll-no sd-mono">{{ t.ticket_number }}</span>
          <span class="cll-subj">{{ t.subject }}</span>
          <span v-if="(t.reopened_count || 0) > 0" class="cll-exh sd-mono" title="This record has been exhumed before">
            <Shovel :size="10" /> ×{{ t.reopened_count }}
          </span>
          <span v-if="t.follow_up_of_number" class="cll-chain sd-mono" :title="'Follow-up of ' + t.follow_up_of_number">
            <Link2 :size="10" /> {{ t.follow_up_of_number }}
          </span>
        </div>
        <p class="cll-story">{{ story(t) }}</p>
        <div class="cll-meta sd-mono">
          <span class="cll-m"><i>SEALED</i>{{ ago(t.closed_at) }}</span>
          <span class="cll-m"><i>BY</i>{{ t.closed_by_name || 'System' }}</span>
          <span class="cll-m"><i>LIVED</i>{{ lifespan(t) }}</span>
          <span class="cll-m" :class="{ low: t.csat_score != null && t.csat_score <= 2 }">
            <i>VERDICT</i>
            <template v-if="t.csat_score != null"><Star :size="10" class="lit" /> {{ t.csat_score }}/5</template>
            <template v-else>unrated</template>
          </span>
          <span v-if="t.resolution_code" class="cll-m"><i>CODE</i>{{ t.resolution_code.replace(/_/g, ' ') }}</span>
        </div>
      </div>

      <ChevronRight :size="15" class="cll-go" />
    </Motion>
  </section>
</template>

<script setup>
/* SdClosureLedger — the Closed desk's LEDGER view: every record as one closure story
   (seal glyph = provenance, the resolution line, who sealed it, how long it lived, the
   customer's verdict, exhume + follow-up markers). Clicking a row opens the drawer;
   clicking the seal opens the closure certificate. */
import { Motion } from 'motion-v'
import { ScrollText, Star, Shovel, Link2, ChevronRight, Stamp, Timer, GitMerge, Undo2, BellOff } from 'lucide-vue-next'
import { closeSourceOf, closeSourceLabel } from '@/composables/useSupportDesk'

const props = defineProps({
  tickets: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  loading: { type: Boolean, default: false },
  reduced: { type: Boolean, default: false },
})
defineEmits(['open', 'certificate'])

const ICONS = { manual: Stamp, auto_sweep: Timer, merged: GitMerge, withdrawn: Undo2, no_response: BellOff }
const srcOf = (t) => closeSourceOf(t)
const srcIcon = (t) => ICONS[srcOf(t)] || Stamp
const srcLabel = (t) => closeSourceLabel(srcOf(t))

const story = (t) => {
  const src = srcOf(t)
  if (src === 'merged') return `Duplicate — folded into its master record${t.links?.merged_into ? '' : ''}. The full story lives there.`
  if (src === 'withdrawn') return t.resolution_summary || 'Withdrawn by the requester before a fix was needed.'
  if (src === 'no_response') return t.resolution_summary || 'The requester went quiet — resolved for no response, then sealed by the sweep.'
  return t.resolution_summary || 'No resolution summary was recorded on this fix.'
}
const ago = (iso) => {
  if (!iso) return '—'
  const s = Math.floor((props.now - new Date(iso).getTime()) / 1000)
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
const lifespan = (t) => {
  if (!t.closed_at || !t.created_at) return '—'
  const ms = Math.max(0, new Date(t.closed_at).getTime() - new Date(t.created_at).getTime() - (t.sla_paused_ms || 0))
  const m = Math.floor(ms / 60000)
  if (m < 60) return `${m}m`
  if (m < 1440) return `${Math.floor(m / 60)}h`
  return `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`
}
</script>

<style scoped>
.cll { display: flex; flex-direction: column; gap: 8px; padding: 12px; border-color: var(--sd-cls-brd); }
.cll-loading { padding: 34px; text-align: center; font-size: 11px; letter-spacing: 0.2em; color: var(--sd-text-dim); }
.cll-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 40px 16px; color: var(--sd-text-dim); }
.cll-empty b { color: var(--sd-text-muted); font-size: 14px; }
.cll-empty span { font-size: 12px; }

.cll-row { position: relative; display: flex; align-items: flex-start; gap: 13px; padding: 13px 15px; border-radius: 14px;
  border: 1px solid var(--sd-border); background: var(--sd-surface-glass); cursor: pointer;
  transition: border-color 0.2s, transform 0.16s, box-shadow 0.2s; }
.cll-row:hover { border-color: var(--sd-cls-brd); transform: translateY(-2px); box-shadow: 0 12px 30px -18px rgba(0, 0, 0, 0.6); }

.cll-seal { position: relative; flex-shrink: 0; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%;
  border: 1px solid var(--sd-cls-brd); background: var(--sd-cls-soft); color: var(--sd-cls-frost); cursor: pointer; font-family: inherit;
  transition: transform 0.16s, border-color 0.18s; }
.cll-seal:hover { transform: scale(1.1) rotate(-6deg); border-color: var(--sd-cls-seal); }
.cll-seal.ps-manual { color: var(--sd-cls-seal); border-color: color-mix(in srgb, var(--sd-cls-seal) 45%, transparent); background: var(--sd-cls-seal-soft); }
.cll-seal.ps-no_response { color: var(--sd-warning); }
.cll-seal.ps-withdrawn { color: var(--sd-text-muted); }
.cll-seal.ps-merged { color: var(--sd-cls-deep); }
.cll-seal-ring { position: absolute; inset: -4px; border-radius: 50%; border: 1px dashed color-mix(in srgb, currentColor 35%, transparent); }

.cll-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.cll-top { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.cll-no { font-size: 11px; font-weight: 800; color: var(--sd-cls-hi); }
[data-theme="light"] .cll-no { color: var(--sd-cls-deep); }
.cll-subj { font-size: 13.5px; font-weight: 700; color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cll-exh { display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 999px; font-size: 9px; font-weight: 800;
  color: var(--sd-cls-risk); border: 1px solid color-mix(in srgb, var(--sd-cls-risk) 45%, transparent); background: var(--sd-cls-risk-soft); }
.cll-chain { display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 999px; font-size: 9px; font-weight: 800;
  color: var(--sd-cls-seal); border: 1px solid color-mix(in srgb, var(--sd-cls-seal) 40%, transparent); background: var(--sd-cls-seal-soft); }
.cll-story { margin: 0; font-size: 12px; line-height: 1.5; color: var(--sd-text-muted);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.cll-meta { display: flex; flex-wrap: wrap; gap: 14px; }
.cll-m { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; color: var(--sd-text-muted); }
.cll-m i { font-style: normal; font-size: 8.5px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-text-dim); }
.cll-m .lit { color: var(--sd-cls-seal); }
.cll-m.low { color: var(--sd-cls-risk); }
.cll-m.low .lit { color: var(--sd-cls-risk); }
.cll-go { flex-shrink: 0; align-self: center; color: var(--sd-text-dim); transition: transform 0.16s, color 0.16s; }
.cll-row:hover .cll-go { transform: translateX(3px); color: var(--sd-cls-seal); }
</style>
