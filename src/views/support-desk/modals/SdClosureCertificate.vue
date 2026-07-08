<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open && ticket" class="cc-veil" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.22 }" @mousedown.stop @click.self="$emit('close')">
        <Motion class="cc-card" :initial="{ opacity: 0, y: 30, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 16, scale: 0.97 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">

          <!-- ── the seal header ── -->
          <header class="cc-head">
            <Motion class="cc-stamp" :class="'ps-' + src" :initial="{ scale: 2.2, opacity: 0, rotate: -18 }"
              :animate="{ scale: 1, opacity: 1, rotate: -8 }" :transition="{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }">
              <component :is="srcIcon" :size="20" />
              <span class="cc-stamp-ring" aria-hidden="true" />
            </Motion>
            <div class="cc-head-body">
              <span class="cc-eyebrow sd-mono">CLOSURE CERTIFICATE · RECORD OF THE ARCHIVE</span>
              <h3 class="cc-no sd-mono">{{ ticket.ticket_number }}</h3>
              <p class="cc-subj">{{ ticket.subject }}</p>
            </div>
            <button class="cc-x" title="Close" @click="$emit('close')"><X :size="16" /></button>
          </header>

          <div class="cc-scroll">
            <!-- ── the seal itself ── -->
            <section class="cc-sec">
              <div class="cc-sec-h sd-mono"><Stamp :size="12" /> THE SEAL</div>
              <div class="cc-kv-grid sd-mono">
                <div class="cc-kv"><i>PROVENANCE</i><b :class="'tx-' + src">{{ srcLabel }}</b></div>
                <div class="cc-kv"><i>SEALED</i><b>{{ fmtDate(ticket.closed_at) }}</b></div>
                <div class="cc-kv"><i>SEALED BY</i><b>{{ ticket.closed_by_name || 'System (sweep)' }}</b></div>
                <div class="cc-kv"><i>LIFESPAN</i><b>{{ lifespan }}</b></div>
              </div>
            </section>

            <!-- ── the resolution (renders per provenance) ── -->
            <section class="cc-sec">
              <div class="cc-sec-h sd-mono"><CircleCheck :size="12" /> THE RESOLUTION</div>
              <div v-if="src === 'merged'" class="cc-res merged">
                <p>This record is a <b>duplicate tombstone</b> — it was closed by merge. The resolution
                lives on the master record below.</p>
                <SdMergeChain v-if="chain" :chain="chain" :current-number="ticket.ticket_number" @open="(id) => $emit('open', id)" />
                <p v-else class="cc-dim sd-mono">TRACING THE LINEAGE…</p>
              </div>
              <div v-else-if="src === 'withdrawn'" class="cc-res">
                <span class="cc-code sd-mono">WITHDRAWN BY THE REQUESTER</span>
                <p>{{ ticket.resolution_summary || 'The requester cancelled this ticket before a fix was needed.' }}</p>
              </div>
              <div v-else-if="src === 'no_response'" class="cc-res">
                <span class="cc-code sd-mono">CLOSED FOR NO RESPONSE</span>
                <p>{{ ticket.resolution_summary || 'The requester went quiet past the inactivity window; the desk resolved and the sweep sealed it.' }}</p>
              </div>
              <div v-else class="cc-res">
                <div class="cc-res-row sd-mono">
                  <span class="cc-code">{{ (ticket.resolution_code || 'uncoded').replace(/_/g, ' ').toUpperCase() }}</span>
                  <span v-if="ticket.resolution_category" class="cc-cause">ROOT CAUSE · {{ ticket.resolution_category.replace(/_/g, ' ').toUpperCase() }}</span>
                </div>
                <p>{{ ticket.resolution_summary || 'No resolution summary was recorded on this fix.' }}</p>
                <span class="cc-dim sd-mono" v-if="ticket.resolved_by_name">FIX RECORDED BY {{ ticket.resolved_by_name.toUpperCase() }}<template v-if="ticket.resolved_at"> · {{ fmtDate(ticket.resolved_at) }}</template></span>
              </div>
            </section>

            <!-- ── the verdict ── -->
            <section class="cc-sec">
              <div class="cc-sec-h sd-mono"><Star :size="12" /> THE CUSTOMER'S VERDICT</div>
              <div v-if="ticket.csat_score != null" class="cc-verdict" :class="{ low: ticket.csat_score <= 2 }">
                <span class="cc-stars" aria-label="`Rated ${ticket.csat_score} of 5`">
                  <Star v-for="s in 5" :key="s" :size="16" :class="{ lit: s <= ticket.csat_score }" />
                </span>
                <b class="sd-mono">{{ ticket.csat_score }}/5</b>
                <p v-if="ticket.csat_comment" class="cc-quote">“{{ ticket.csat_comment }}”</p>
              </div>
              <p v-else class="cc-dim">No rating was collected before the seal — the verdict of record is silence.</p>
            </section>

            <!-- ── forensics: SLA outcome + exhume history ── -->
            <section class="cc-sec">
              <div class="cc-sec-h sd-mono"><FileSearch :size="12" /> FORENSICS</div>
              <div class="cc-chips">
                <span class="cc-chip" :class="ticket.sla_response_breached ? 'bad' : 'good'">
                  {{ ticket.sla_response_breached ? 'Response SLA breached' : 'Response SLA met' }}
                </span>
                <span class="cc-chip" :class="ticket.sla_resolution_breached ? 'bad' : 'good'">
                  {{ ticket.sla_resolution_breached ? 'Resolution SLA breached' : 'Resolution SLA met' }}
                </span>
                <span v-if="(ticket.time_spent_minutes || 0) > 0" class="cc-chip">{{ ticket.time_spent_minutes }}m logged</span>
                <span v-if="ticket.is_major_incident" class="cc-chip bad">Major incident</span>
              </div>
              <div v-if="(ticket.reopened_count || 0) > 0" class="cc-exhume">
                <div class="cc-ex-h sd-mono"><Shovel :size="11" /> EXHUMED ×{{ ticket.reopened_count }}</div>
                <p v-if="ticket.prev_resolution_summary" class="cc-ex-prev">
                  A previous fix failed<template v-if="ticket.prev_resolution_code"> ({{ ticket.prev_resolution_code.replace(/_/g, ' ') }})</template>:
                  “{{ ticket.prev_resolution_summary }}”
                </p>
                <span v-if="ticket.reopen_reason" class="cc-dim sd-mono">LAST VERDICT · {{ ticket.reopen_reason }}</span>
              </div>
            </section>

            <!-- ── the chain: follow-ups + knowledge ── -->
            <section v-if="ticket.follow_up_of_number || followUps.length || kbArticleId" class="cc-sec">
              <div class="cc-sec-h sd-mono"><Link2 :size="12" /> THE CHAIN</div>
              <div class="cc-chain">
                <button v-if="ticket.follow_up_of_number" class="cc-chain-node" @click="$emit('open', ticket.follow_up_of_id)">
                  <CornerLeftUp :size="12" /> Follow-up of <b class="sd-mono">{{ ticket.follow_up_of_number }}</b>
                </button>
                <button v-for="fu in followUps" :key="String(fu.id)" class="cc-chain-node" @click="$emit('open', fu.id)">
                  <CornerDownRight :size="12" /> Continued in <b class="sd-mono">{{ fu.ticket_number }}</b>
                  <span class="cc-chain-st sd-mono" :class="fu.status">{{ (fu.status || '').replace(/_/g, ' ') }}</span>
                </button>
                <span v-if="kbArticleId" class="cc-chain-node kb">
                  <BookOpenCheck :size="12" /> Harvested into the knowledge base
                </span>
              </div>
            </section>
          </div>

          <!-- ── gated footer — the ONLY mutation affordances on a sealed record ── -->
          <footer v-if="agent" class="cc-foot">
            <span class="cc-foot-note sd-mono">SEALED RECORDS ARE READ-ONLY · THESE ACTIONS ARE ON THE RECORD</span>
            <div class="cc-foot-btns">
              <Motion as="button" class="cc-btn" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }"
                :disabled="src === 'merged'" :title="src === 'merged' ? 'Follow up the master record instead' : 'Continue this story in a fresh, linked ticket'"
                @click="$emit('followup', ticket)">
                <Link2 :size="13" /> Follow-up
              </Motion>
              <Motion v-if="promotable" as="button" class="cc-btn seal" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }"
                title="Harvest this fix into a draft knowledge article" @click="$emit('promote', ticket)">
                <BookMarked :size="13" /> Promote to KB
              </Motion>
              <Motion as="button" class="cc-btn risk" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }"
                title="Agent-only: exhume this record — reopens the case with a fresh SLA" @click="$emit('reopen', ticket)">
                <Shovel :size="13" /> Reopen
              </Motion>
            </div>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
/* SdClosureCertificate — the read-only integrity record of ONE sealed ticket: provenance
   stamp, per-source resolution rendering (merge tombstones show the lineage instead of a
   summary), the customer's verdict, SLA forensics + exhume history, and the follow-up /
   knowledge chain. ZERO mutation except the explicitly gated footer (agents only) —
   actions are emitted up to the section, which owns the flows. */
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  X, Stamp, Timer, GitMerge, Undo2, BellOff, CircleCheck, Star, FileSearch, Shovel,
  Link2, CornerLeftUp, CornerDownRight, BookMarked, BookOpenCheck,
} from 'lucide-vue-next'
import SdMergeChain from '../components/SdMergeChain.vue'
import { closeSourceOf, closeSourceLabel, fetchMergeChain, listTickets } from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  ticket: { type: Object, default: null },
  agent: { type: Boolean, default: false },
})
defineEmits(['close', 'open', 'reopen', 'followup', 'promote'])

const chain = ref(null)
const followUps = ref([])

const src = computed(() => closeSourceOf(props.ticket))
const srcLabel = computed(() => closeSourceLabel(src.value))
const ICONS = { manual: Stamp, auto_sweep: Timer, merged: GitMerge, withdrawn: Undo2, no_response: BellOff }
const srcIcon = computed(() => ICONS[src.value] || Stamp)
const kbArticleId = computed(() => (props.ticket?.links || {}).kb_article_id || null)
const promotable = computed(() => !kbArticleId.value && src.value !== 'merged'
  && !!(props.ticket?.resolution_summary || '').trim()
  && ['solved', 'workaround', 'known_error', 'configuration'].includes(props.ticket?.resolution_code))

const lifespan = computed(() => {
  const t = props.ticket
  if (!t?.closed_at || !t?.created_at) return '—'
  const ms = Math.max(0, new Date(t.closed_at).getTime() - new Date(t.created_at).getTime() - (t.sla_paused_ms || 0))
  const m = Math.floor(ms / 60000)
  if (m < 60) return `${m}m`
  if (m < 1440) return `${Math.floor(m / 60)}h ${m % 60}m`
  return `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`
})
const fmtDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('en', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/* lazy loads on open: merge lineage (agents; tombstones + masters) + follow-up children */
watch(() => [props.open, props.ticket?.id], async ([open]) => {
  chain.value = null
  followUps.value = []
  if (!open || !props.ticket || !props.agent) return
  const id = props.ticket.id
  try { chain.value = await fetchMergeChain(id) } catch { chain.value = { masters: [], duplicates: [] } }
  try {
    const r = await listTickets({ follow_up_of: id, limit: 20 })
    followUps.value = r.items || []
  } catch { followUps.value = [] }
}, { immediate: true })
</script>

<style scoped>
.cc-veil { position: fixed; inset: 0; z-index: 2200; display: grid; place-items: center; padding: 4vh 16px;
  background: rgba(5, 6, 9, 0.66); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
[data-theme="light"] .cc-veil { background: rgba(30, 25, 15, 0.4); }

.cc-card { display: flex; flex-direction: column; width: min(620px, 100%); max-height: 92vh; border-radius: 20px;
  border: 1px solid var(--sd-cls-brd); background: var(--sd-panel); box-shadow: var(--sd-shadow); overflow: hidden; }

.cc-head { position: relative; display: flex; align-items: center; gap: 15px; padding: 18px 20px 15px;
  border-bottom: 1px solid var(--sd-border); background: linear-gradient(180deg, var(--sd-cls-soft), transparent); }
.cc-stamp { position: relative; flex-shrink: 0; display: grid; place-items: center; width: 52px; height: 52px; border-radius: 50%;
  border: 2px solid var(--sd-cls-brd); background: var(--sd-cls-soft); color: var(--sd-cls-frost); }
.cc-stamp.ps-manual { color: var(--sd-cls-seal); border-color: color-mix(in srgb, var(--sd-cls-seal) 55%, transparent); background: var(--sd-cls-seal-soft); box-shadow: 0 0 22px -6px var(--sd-cls-seal); }
.cc-stamp.ps-no_response { color: var(--sd-warning); }
.cc-stamp.ps-withdrawn { color: var(--sd-text-muted); }
.cc-stamp-ring { position: absolute; inset: -6px; border-radius: 50%; border: 1px dashed color-mix(in srgb, currentColor 40%, transparent); }
.cc-head-body { flex: 1; min-width: 0; }
.cc-eyebrow { font-size: 9px; font-weight: 800; letter-spacing: 0.2em; color: var(--sd-cls-frost); }
.cc-no { margin: 4px 0 2px; font-size: 19px; font-weight: 800; color: var(--sd-text); }
.cc-subj { margin: 0; font-size: 12.5px; color: var(--sd-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cc-x { position: absolute; top: 14px; right: 14px; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px;
  border: 1px solid var(--sd-border); background: transparent; color: var(--sd-text-muted); cursor: pointer; }
.cc-x:hover { color: var(--sd-danger); border-color: var(--sd-danger); }

.cc-scroll { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; padding: 16px 20px; }
.cc-sec { display: flex; flex-direction: column; gap: 9px; }
.cc-sec-h { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.18em; color: var(--sd-cls-frost); }

.cc-kv-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; }
.cc-kv { display: flex; flex-direction: column; gap: 3px; padding: 9px 11px; border-radius: 11px; border: 1px solid var(--sd-border); background: var(--sd-surface-glass); }
.cc-kv i { font-style: normal; font-size: 8.5px; font-weight: 800; letter-spacing: 0.16em; color: var(--sd-text-dim); }
.cc-kv b { font-size: 12px; font-weight: 700; color: var(--sd-text); }
.tx-manual { color: var(--sd-cls-seal); }
.tx-auto_sweep { color: var(--sd-cls-frost); }
.tx-no_response { color: var(--sd-warning); }
.tx-withdrawn { color: var(--sd-text-muted); }

.cc-res { display: flex; flex-direction: column; gap: 7px; padding: 12px 14px; border-radius: 12px;
  border: 1px solid var(--sd-border); background: var(--sd-surface-glass); }
.cc-res p { margin: 0; font-size: 13px; line-height: 1.55; color: var(--sd-text); }
.cc-res-row { display: flex; gap: 10px; flex-wrap: wrap; }
.cc-code { font-size: 10px; font-weight: 800; letter-spacing: 0.1em; color: var(--sd-cls-seal); }
.cc-cause { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; color: var(--sd-text-dim); }
.cc-dim { font-size: 10px; color: var(--sd-text-dim); }

.cc-verdict { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 12px 14px; border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--sd-cls-seal) 35%, transparent); background: var(--sd-cls-seal-soft); }
.cc-verdict.low { border-color: color-mix(in srgb, var(--sd-cls-risk) 40%, transparent); background: var(--sd-cls-risk-soft); }
.cc-stars { display: inline-flex; gap: 3px; color: var(--sd-text-dim); }
.cc-stars .lit { color: var(--sd-cls-seal); fill: var(--sd-cls-seal); }
.cc-verdict.low .cc-stars .lit { color: var(--sd-cls-risk); fill: var(--sd-cls-risk); }
.cc-verdict b { font-size: 14px; }
.cc-quote { margin: 0; flex-basis: 100%; font-size: 12.5px; font-style: italic; color: var(--sd-text-muted); }

.cc-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.cc-chip { padding: 4px 10px; border-radius: 999px; font-size: 10.5px; font-weight: 700;
  border: 1px solid var(--sd-border); color: var(--sd-text-muted); }
.cc-chip.good { border-color: color-mix(in srgb, var(--sd-success, #34d399) 45%, transparent); color: var(--sd-success, #34d399); }
.cc-chip.bad { border-color: color-mix(in srgb, var(--sd-danger, #ef4444) 45%, transparent); color: var(--sd-danger, #ef4444); }

.cc-exhume { display: flex; flex-direction: column; gap: 6px; padding: 11px 13px; border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--sd-cls-risk) 35%, transparent); background: var(--sd-cls-risk-soft); }
.cc-ex-h { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-cls-risk); }
.cc-ex-prev { margin: 0; font-size: 12px; line-height: 1.5; color: var(--sd-text-muted); }

.cc-chain { display: flex; flex-direction: column; gap: 6px; }
.cc-chain-node { display: inline-flex; align-items: center; gap: 8px; padding: 8px 11px; border-radius: 11px; font-family: inherit;
  border: 1px solid var(--sd-border); background: var(--sd-surface-glass); color: var(--sd-text-muted); font-size: 12px; cursor: pointer;
  transition: border-color 0.18s; text-align: left; }
.cc-chain-node:hover { border-color: var(--sd-cls-seal); color: var(--sd-text); }
.cc-chain-node.kb { cursor: default; color: var(--sd-cls-seal); border-color: color-mix(in srgb, var(--sd-cls-seal) 40%, transparent); }
.cc-chain-node b { color: var(--sd-text); }
.cc-chain-st { margin-left: auto; font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--sd-text-dim); }

.cc-foot { display: flex; flex-direction: column; gap: 9px; padding: 13px 20px 16px; border-top: 1px solid var(--sd-border);
  background: var(--sd-surface-glass); }
.cc-foot-note { font-size: 8.5px; font-weight: 800; letter-spacing: 0.16em; color: var(--sd-text-dim); }
.cc-foot-btns { display: flex; flex-wrap: wrap; gap: 8px; }
.cc-btn { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 11px; font-size: 12px; font-weight: 700;
  cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.cc-btn:hover { border-color: var(--sd-cls-core); }
.cc-btn.seal { border-color: color-mix(in srgb, var(--sd-cls-seal) 55%, transparent); color: var(--sd-cls-seal); background: var(--sd-cls-seal-soft); }
.cc-btn.risk { border-color: color-mix(in srgb, var(--sd-cls-risk) 45%, transparent); color: var(--sd-cls-risk); }
.cc-btn:disabled { opacity: 0.45; cursor: not-allowed; }

@media (max-width: 560px) { .cc-kv-grid { grid-template-columns: 1fr 1fr; } }
</style>
