<template>
  <section v-if="tickets.length" class="acr sd-card" aria-label="Auto-close rail — resolved tickets nearing the seal">
    <div class="acr-head">
      <span class="acr-eyebrow sd-mono"><Timer :size="13" /> AUTO-CLOSE RAIL — THE SEAL IS TICKING</span>
      <span class="acr-count sd-mono">{{ tickets.length }} ON THE SHELF</span>
    </div>
    <div class="acr-track">
      <Motion v-for="(t, i) in tickets" :key="t.id" as="article" class="acr-cap" :class="ringState(t)"
        :initial="{ opacity: 0, x: 18 }" :animate="{ opacity: 1, x: 0 }"
        :transition="{ duration: 0.4, delay: Math.min(i * 0.06, 0.5), ease: [0.16, 1, 0.3, 1] }"
        :while-hover="reduced ? undefined : { y: -3 }"
        :title="t.subject">
        <!-- countdown ring: fraction of the reopen window left before the sweep seals it -->
        <button class="acr-ring" :title="'Open ' + t.ticket_number" @click="$emit('open', t.id)">
          <svg viewBox="0 0 44 44" aria-hidden="true">
            <circle class="rg-track" cx="22" cy="22" r="19" />
            <circle class="rg-arc" cx="22" cy="22" r="19"
              :stroke-dasharray="CIRC" :stroke-dashoffset="CIRC * (1 - fracLeft(t))" />
          </svg>
          <span class="rg-val sd-mono">{{ leftShort(t) }}</span>
        </button>
        <div class="acr-body">
          <button class="acr-no sd-mono" @click="$emit('open', t.id)">{{ t.ticket_number }}</button>
          <div class="acr-subj">{{ t.subject }}</div>
          <div class="acr-meta sd-mono">
            <span v-if="t.csat_score" class="m-csat"><Star :size="9" /> {{ t.csat_score }}/5</span>
            <span v-else class="m-unrated">UNRATED</span>
            <span class="m-owner" :class="{ none: !ownerOf(t) }">{{ ownerOf(t) || 'UNOWNED' }}</span>
          </div>
        </div>
        <div class="acr-acts">
          <button class="acr-btn seal" title="Verified — close it now" @click.stop="$emit('close-now', t)"><BadgeCheck :size="12" /> Close</button>
          <button class="acr-btn back" title="The fix didn't hold — send it back" @click.stop="$emit('reopen', t)"><RotateCcw :size="12" /></button>
        </div>
      </Motion>
    </div>
  </section>
</template>

<script setup>
/* SdAutoCloseRail — the Resolved desk's pre-close shelf: every ticket still inside its
   auto-close/reopen window rides here, soonest seal first. The SVG countdown ring drains
   as the 3-day window burns; amber = inside the window, warning = <24h, ember = past due
   (the sweep will take it). Actions: verify & close now, or send a failed fix back.
   Deliberately distinct from SdChronicRail's cycle dots and SdTippingPoint's SLA rings —
   this rail counts down to a POSITIVE event (the archive), not a breach. */
import { Motion } from 'motion-v'
import { Timer, Star, BadgeCheck, RotateCcw } from 'lucide-vue-next'
import { SUPPORT_AUTOCLOSE_DAYS } from '@/composables/useSupportDesk'

const props = defineProps({
  tickets: { type: Array, default: () => [] },   // pre-filtered: status=resolved, sorted by auto_close_at asc
  now: { type: Number, default: () => Date.now() },
  reduced: { type: Boolean, default: false },
})
defineEmits(['open', 'close-now', 'reopen'])

const CIRC = 2 * Math.PI * 19
const WINDOW_MS = SUPPORT_AUTOCLOSE_DAYS * 86400000
const closeAt = (t) => {
  if (t.auto_close_at) return new Date(t.auto_close_at).getTime()
  return t.resolved_at ? new Date(t.resolved_at).getTime() + WINDOW_MS : 0
}
const msLeft = (t) => closeAt(t) - props.now
const fracLeft = (t) => Math.min(1, Math.max(0, msLeft(t) / WINDOW_MS))
const leftShort = (t) => {
  const ms = msLeft(t)
  if (ms <= 0) return 'DUE'
  const m = Math.floor(ms / 60000)
  if (m < 60) return `${m}m`
  if (m < 1440) return `${Math.floor(m / 60)}h`
  return `${Math.floor(m / 1440)}d${Math.floor((m % 1440) / 60)}h`
}
const ringState = (t) => {
  const ms = msLeft(t)
  return ms <= 0 ? 'over' : ms <= 86400000 ? 'soon' : ''
}
const ownerOf = (t) => t.resolved_by_name || t.assigned_agent_name || ''
</script>

<style scoped>
.acr { padding: 14px 16px 15px; border-color: var(--sd-res-brd); }
.acr-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 11px; }
.acr-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 10px; font-weight: 800;
  letter-spacing: 0.2em; color: var(--sd-res-close); }
.acr-count { font-size: 10px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-text-dim); }

.acr-track { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: thin; }
.acr-cap { flex: 0 0 auto; width: 292px; display: flex; align-items: center; gap: 11px; text-align: left;
  padding: 11px 12px; border-radius: 14px; font-family: inherit; color: var(--sd-text);
  border: 1px solid var(--sd-res-brd); background: var(--sd-res-soft);
  transition: border-color 0.2s, box-shadow 0.2s; }
.acr-cap:hover { border-color: var(--sd-res-core); box-shadow: var(--sd-res-glow); }
.acr-cap.soon { border-color: color-mix(in srgb, var(--sd-warning) 55%, transparent); background: color-mix(in srgb, var(--sd-warning) 7%, transparent); }
.acr-cap.over { border-color: color-mix(in srgb, var(--sd-danger) 55%, transparent); background: color-mix(in srgb, var(--sd-danger) 7%, transparent); }

/* countdown ring */
.acr-ring { position: relative; flex-shrink: 0; width: 46px; height: 46px; padding: 0; border: none;
  background: none; cursor: pointer; display: grid; place-items: center; }
.acr-ring svg { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
.rg-track { fill: none; stroke: color-mix(in srgb, var(--sd-res-core) 18%, transparent); stroke-width: 3.4; }
.rg-arc { fill: none; stroke: var(--sd-res-close); stroke-width: 3.4; stroke-linecap: round;
  transition: stroke-dashoffset 0.9s var(--sd-spring); }
.acr-cap.soon .rg-arc { stroke: var(--sd-warning); }
.acr-cap.over .rg-arc { stroke: var(--sd-danger); animation: acr-ember 1.4s ease-in-out infinite; }
.rg-val { position: relative; font-size: 9px; font-weight: 800; letter-spacing: 0.02em; color: var(--sd-text); }

.acr-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.acr-no { align-self: flex-start; padding: 0; border: none; background: none; cursor: pointer;
  font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; color: var(--sd-res-hi); font-family: inherit; }
.acr-no:hover { text-decoration: underline; }
.acr-subj { font-size: 12px; font-weight: 650; line-height: 1.3; color: var(--sd-text);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.acr-meta { display: flex; flex-wrap: wrap; gap: 7px; align-items: center; font-size: 8.5px; font-weight: 800; letter-spacing: 0.08em; }
.m-csat { display: inline-flex; align-items: center; gap: 3px; color: var(--sd-res-brass); }
.m-unrated { color: var(--sd-text-dim); border: 1px dashed var(--sd-border-strong); border-radius: 999px; padding: 1px 6px; }
.m-owner { color: var(--sd-text-dim); }
.m-owner.none { color: var(--sd-warning); }

.acr-acts { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
.acr-btn { display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 6px 9px;
  border-radius: 9px; font-size: 10.5px; font-weight: 800; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text);
  transition: border-color 0.18s, transform 0.12s; }
.acr-btn:hover { transform: translateY(-1px); }
.acr-btn.seal { border-color: color-mix(in srgb, var(--sd-res-core) 55%, transparent); color: #052e1f;
  background: linear-gradient(135deg, #6ee7b7, var(--sd-res-core)); }
[data-theme="light"] .acr-btn.seal { color: #064e3b; }
.acr-btn.back:hover { border-color: var(--sd-res-risk); color: var(--sd-res-risk); }

@keyframes acr-ember { 0%, 100% { filter: drop-shadow(0 0 1px var(--sd-danger)); } 50% { filter: drop-shadow(0 0 5px var(--sd-danger)); } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .acr-cap.over .rg-arc { animation: none; }
}
</style>
