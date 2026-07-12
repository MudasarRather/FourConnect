<template>
  <div class="ecd">
    <div v-if="rows.length" class="ecd-grid">
      <div v-for="(t, i) in rows" :key="t.id" class="ecd-shell" :style="{ '--i': i, '--r': rot(t) }">
        <button class="ecd-card" :class="{ sel: selected.includes(t.id), cur: cursor === i, breach: breached(t) }"
          @click="$emit('open', t)">
          <i class="ecd-pin" :class="{ linked: !!t.linked_problem_id }" />
          <span class="ecd-tape" aria-hidden="true" />

          <span class="ecd-top">
            <b class="ecd-no sd-mono">{{ t.ticket_number }}</b>
            <SdPill kind="priority" :value="t.priority" />
            <span class="ecd-check" :class="{ on: selected.includes(t.id) }" role="checkbox"
              :aria-checked="selected.includes(t.id)" title="Select for bulk actions"
              @click.stop="$emit('toggle', t.id)"><Check :size="10" /></span>
          </span>

          <span class="ecd-subj">{{ t.subject }}</span>

          <span class="ecd-badges">
            <em v-if="t.is_major_incident" class="mi sd-mono">MI</em>
            <em v-if="t.linked_problem_id" class="prb sd-mono" title="Strung to a problem record"><Fingerprint :size="8" /> PRB</em>
            <em v-if="t.linked_change_id" class="chg sd-mono" title="Permanent fix on a change request"><GitPullRequest :size="8" /> CHG</em>
            <em v-if="t.swarming" class="swm sd-mono"><Users :size="8" /> SWARM</em>
            <em v-if="t.watching" class="wch sd-mono"><Eye :size="8" /> WATCHING</em>
            <em v-if="(t.viewing || []).length" class="ghz sd-mono" :title="'Being viewed by ' + t.viewing.join(', ')">
              <Eye :size="8" /> VIEWED</em>
            <em v-if="(t.reopened_count || 0) > 0" class="rop sd-mono">REOPENED ×{{ t.reopened_count }}</em>
            <em v-if="t.is_escalated" class="esc sd-mono">ESC L{{ t.escalation_level }}</em>
          </span>

          <span class="ecd-foot sd-mono">
            <em class="ecd-owner" :class="{ un: !t.assigned_agent_name }">{{ t.assigned_agent_name ? mono(t.assigned_agent_name) : 'UNOWNED' }}</em>
            <em class="ecd-status">{{ statusLabel(t.status) }}</em>
            <em class="ecd-sla" :class="slaTone(t)">{{ slaText(t) }}</em>
          </span>
          <span class="ecd-slabar" aria-hidden="true"><i :class="slaTone(t)" :style="{ width: slaPct(t) }" /></span>

          <span v-if="breached(t)" class="ecd-stamp sd-mono">SLA BREACHED</span>
        </button>
      </div>
    </div>

    <div v-else-if="!loading" class="ecd-empty">
      <component :is="emptyIcon" :size="26" />
      <h4>{{ empty.title }}</h4>
      <p>{{ empty.blurb }}</p>
    </div>
    <div v-else class="ecd-loading sd-mono">PULLING THE CASE FILES…</div>
  </div>
</template>

<script setup>
/* SdEvidenceCards — the L3 board as pinned evidence polaroids: manila cards (paper-cream
   in BOTH themes, like a card under a desk lamp), red pin, slight seeded rotation that
   straightens on hover, breach = red edge + angled stamp, problem/change/swarm badges. */
import { Check, Fingerprint, GitPullRequest, Users, Eye } from 'lucide-vue-next'
import SdPill from './SdPill.vue'
import { TICKET_STATUSES } from '@/composables/useSupportDesk'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  selected: { type: Array, default: () => [] },
  now: { type: Number, default: Date.now() },
  loading: { type: Boolean, default: false },
  empty: { type: Object, default: () => ({ title: 'Board clear', blurb: '' }) },
  emptyIcon: { type: [Object, Function], default: null },
  cursor: { type: Number, default: -1 },
})
defineEmits(['open', 'toggle'])

const rot = (t) => {
  let h = 0
  const s = String(t.id)
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return ((h % 30) / 10 - 1.5).toFixed(2) + 'deg'
}
const mono = (n) => (n || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
const statusLabel = (v) => (TICKET_STATUSES.find(s => s.value === v)?.label || v || '').toUpperCase()

const breached = (t) => (t.sla_resolution_state || t.sla_response_state) === 'breached'
const slaTone = (t) => {
  const st = t.sla_resolution_state || t.sla_response_state
  return st === 'breached' ? 'bad' : st === 'due-soon' ? 'warn' : 'ok'
}
const slaText = (t) => {
  const due = t.resolution_due_at
  if (!due) return 'NO SLA'
  const ms = new Date(due).getTime() - props.now
  const a = Math.abs(ms)
  const h = Math.floor(a / 3600000), m = Math.floor((a % 3600000) / 60000)
  const txt = h ? `${h}H${String(m).padStart(2, '0')}` : `${m}M`
  return ms < 0 ? `-${txt}` : txt
}
const slaPct = (t) => {
  // remaining share of the response→resolution window, clamped
  const due = t.resolution_due_at ? new Date(t.resolution_due_at).getTime() : null
  const born = t.created_at ? new Date(t.created_at).getTime() : null
  if (!due || !born || due <= born) return '100%'
  return Math.max(0, Math.min(1, (due - props.now) / (due - born))) * 100 + '%'
}
</script>

<style scoped>
.ecd-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(248px, 1fr)); gap: 13px; }
.ecd-shell { animation: sd-deal 0.45s var(--sd-spring, cubic-bezier(0.16, 1, 0.3, 1)) both;
  animation-delay: calc(var(--i) * 0.04s); }
.ecd-card { position: relative; display: flex; flex-direction: column; gap: 7px; width: 100%;
  padding: 13px 13px 11px; border: none; border-radius: 5px; cursor: pointer; text-align: left;
  font-family: inherit; color: var(--sd-l3-card-ink);
  background: linear-gradient(175deg, var(--sd-l3-card), var(--sd-l3-card-deep));
  box-shadow: 0 8px 20px -8px rgba(0, 0, 0, 0.45); transform: rotate(var(--r, 0deg));
  transition: transform 0.22s var(--sd-spring, ease), box-shadow 0.22s; overflow: hidden; }
.ecd-card:hover { transform: rotate(0deg) translateY(-4px);
  box-shadow: 0 18px 32px -12px rgba(0, 0, 0, 0.5), 0 0 20px color-mix(in srgb, var(--sd-l3-core) 30%, transparent); }
.ecd-card.cur { outline: 2px solid var(--sd-l3-core); outline-offset: 2px; }
.ecd-card.sel { outline: 2px solid var(--sd-l3-core); outline-offset: 2px;
  box-shadow: 0 8px 20px -8px rgba(0, 0, 0, 0.45), 0 0 0 4px var(--sd-l3-soft); }
.ecd-card.breach::after { content: ""; position: absolute; inset: 0; pointer-events: none; border-radius: 5px;
  border: 2px solid rgba(185, 28, 28, 0.5); animation: ecd-edge 2.4s ease-in-out infinite; }
@keyframes ecd-edge { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }

.ecd-pin { position: absolute; top: -5px; left: 50%; width: 12px; height: 12px; border-radius: 50%;
  transform: translateX(-50%); z-index: 2;
  background: radial-gradient(circle at 35% 30%, #fca5a5, #b91c1c 70%); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5); }
.ecd-pin.linked { background: radial-gradient(circle at 35% 30%, #fde68a, #8a5f14 72%); }
.ecd-tape { position: absolute; top: 0; right: 18px; width: 34px; height: 12px;
  background: rgba(255, 255, 255, 0.26); transform: rotate(4deg); border-radius: 2px; }

.ecd-top { display: flex; align-items: center; gap: 8px; }
.ecd-no { font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; color: #92600e; }
.ecd-check { display: grid; place-items: center; width: 17px; height: 17px; margin-left: auto; border-radius: 5px;
  border: 1.5px solid #a08a5c; color: transparent; transition: all 0.15s; }
.ecd-check.on { background: #92600e; border-color: #92600e; color: #f7efd9; }
.ecd-subj { font-size: 12.5px; font-weight: 700; line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.6em; }
.ecd-badges { display: flex; gap: 5px; flex-wrap: wrap; min-height: 15px; }
.ecd-badges em { display: inline-flex; align-items: center; gap: 3px; font-style: normal; padding: 2px 5px;
  border-radius: 4px; font-size: 7px; font-weight: 800; letter-spacing: 0.1em;
  border: 1px solid currentColor; color: var(--sd-l3-card-dim); }
.ecd-badges .mi { color: #b91c1c; } .ecd-badges .prb { color: #92600e; }
.ecd-badges .chg { color: #6f4a10; } .ecd-badges .swm { color: #1d6b4e; }
.ecd-badges .wch, .ecd-badges .ghz { color: #7c6a49; } .ecd-badges .rop, .ecd-badges .esc { color: #b45309; }
.ecd-foot { display: flex; align-items: center; gap: 9px; font-size: 8px; letter-spacing: 0.08em;
  color: var(--sd-l3-card-dim); }
.ecd-foot em { font-style: normal; }
.ecd-owner { display: grid; place-items: center; min-width: 24px; height: 18px; padding: 0 4px; border-radius: 5px;
  background: rgba(51, 38, 15, 0.12); font-weight: 800; }
.ecd-owner.un { background: transparent; border: 1px dashed #a08a5c; }
.ecd-sla { margin-left: auto; font-weight: 800; }
.ecd-sla.bad { color: #b91c1c; } .ecd-sla.warn { color: #b45309; } .ecd-sla.ok { color: #3f6212; }
.ecd-slabar { display: block; height: 3px; border-radius: 2px; background: rgba(51, 38, 15, 0.14); overflow: hidden; }
.ecd-slabar i { display: block; height: 100%; border-radius: 2px; transition: width 0.6s; }
.ecd-slabar .ok { background: #3f6212; } .ecd-slabar .warn { background: #b45309; } .ecd-slabar .bad { background: #b91c1c; }
.ecd-stamp { position: absolute; right: 9px; top: 34px; padding: 2px 6px; border-radius: 3px;
  font-size: 7.5px; font-weight: 800; letter-spacing: 0.18em; color: #b91c1c; border: 1.5px solid #b91c1c;
  transform: rotate(-8deg); opacity: 0.85; }

.ecd-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 46px 20px;
  border: 1px dashed var(--sd-border-strong); border-radius: 16px; color: var(--sd-text-dim); text-align: center; }
.ecd-empty h4 { margin: 0; font-size: 14px; color: var(--sd-text-secondary); }
.ecd-empty p { margin: 0; font-size: 12px; max-width: 46ch; line-height: 1.6; }
.ecd-loading { padding: 40px; text-align: center; font-size: 10px; letter-spacing: 0.2em; color: var(--sd-text-dim);
  animation: ecd-blink 1.2s infinite; }
@keyframes ecd-blink { 50% { opacity: 0.4; } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .ecd-shell { animation: none; }
  html:not([data-cinematic="on"]) .ecd-card.breach::after { animation: none; }
}
</style>
