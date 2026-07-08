<template>
  <section v-if="tickets.length" class="crl sd-card" aria-label="Chronic riders — tickets reopened two or more times">
    <div class="crl-head">
      <span class="crl-eyebrow sd-mono"><History :size="13" /> CHRONIC RAIL — STUCK ON THE LOOP</span>
      <span class="crl-count sd-mono">{{ tickets.length }} RIDER{{ tickets.length === 1 ? '' : 'S' }} ≥2×</span>
    </div>
    <div class="crl-track">
      <Motion v-for="(t, i) in tickets" :key="t.id" as="button" class="crl-cap"
        :initial="{ opacity: 0, x: 18 }" :animate="{ opacity: 1, x: 0 }"
        :transition="{ duration: 0.4, delay: Math.min(i * 0.06, 0.5), ease: [0.16, 1, 0.3, 1] }"
        :while-hover="reduced ? undefined : { y: -3 }" :while-tap="{ scale: 0.98 }"
        :title="t.subject" @click="$emit('open', t.id)">
        <div class="cap-top">
          <span class="cap-no sd-mono">{{ t.ticket_number }}</span>
          <span class="cap-pri sd-mono" :style="{ color: priColor(t.priority) }">{{ (t.priority || '').toUpperCase() }}</span>
        </div>
        <div class="cap-subj">{{ t.subject }}</div>
        <div class="cap-cycles" aria-hidden="true">
          <i v-for="n in Math.min(t.reopened_count || 0, 6)" :key="n" class="cyc" :class="{ live: n === Math.min(t.reopened_count || 0, 6) }" />
          <b class="sd-mono">×{{ t.reopened_count }}</b>
        </div>
        <div class="cap-meta sd-mono">
          <span class="m-src">{{ reopenSourceLabel(t.reopen_source).toUpperCase() }}</span>
          <span v-if="t.reopen_reason_code" class="m-code">{{ reopenReasonShort(t.reopen_reason_code) }}</span>
          <span class="m-age" :class="{ none: !t.assigned_agent_name }">{{ cycleAge(t) }}</span>
        </div>
      </Motion>
    </div>
  </section>
</template>

<script setup>
/* SdChronicRail — the Reopened desk's repeat-offender strip: every ticket with >=2
   reopen cycles rides here as a capsule (cycle dots, kick-back source, coded verdict on
   the last failed fix, live cycle age). Click → the ticket console. Deliberately distinct
   from SdTippingPoint's countdown rings and SdAtRiskRail's fuses — this rail is about
   RECURRENCE, not deadlines. */
import { Motion } from 'motion-v'
import { History } from 'lucide-vue-next'
import { reopenSourceLabel, reopenReasonShort } from '@/composables/useSupportDesk'

const props = defineProps({
  tickets: { type: Array, default: () => [] },   // pre-filtered: reopened_count >= threshold
  now: { type: Number, default: () => Date.now() },
  reduced: { type: Boolean, default: false },
})
defineEmits(['open'])

const PRI_COLOR = { critical: 'var(--sd-pri-critical)', urgent: 'var(--sd-pri-urgent)', high: 'var(--sd-pri-high)', medium: 'var(--sd-pri-medium)', low: 'var(--sd-pri-low)' }
const priColor = (p) => PRI_COLOR[p] || 'var(--sd-text-muted)'
const cycleAge = (t) => {
  const at = t.last_reopened_at ? new Date(t.last_reopened_at).getTime() : 0
  if (!at) return '—'
  const m = Math.max(0, Math.floor((props.now - at) / 60000))
  return m < 60 ? `${m}m ON CYCLE` : m < 1440 ? `${Math.floor(m / 60)}h ON CYCLE` : `${Math.floor(m / 1440)}d ON CYCLE`
}
</script>

<style scoped>
.crl { padding: 14px 16px 15px; border-color: var(--sd-rop-brd); }
.crl-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 11px; }
.crl-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 10px; font-weight: 800;
  letter-spacing: 0.2em; color: var(--sd-rop-core); }
.crl-count { font-size: 10px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-text-dim); }

.crl-track { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: thin; }
.crl-cap { flex: 0 0 auto; width: 250px; display: flex; flex-direction: column; gap: 7px; text-align: left;
  padding: 12px 14px; border-radius: 14px; cursor: pointer; font-family: inherit; color: var(--sd-text);
  border: 1px solid var(--sd-rop-brd); background: var(--sd-rop-soft);
  transition: border-color 0.2s, box-shadow 0.2s; }
.crl-cap:hover { border-color: var(--sd-rop-core); box-shadow: var(--sd-rop-glow); }

.cap-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.cap-no { font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; color: var(--sd-rop-hi); }
.cap-pri { font-size: 9px; font-weight: 800; letter-spacing: 0.12em; }
.cap-subj { font-size: 12.5px; font-weight: 650; line-height: 1.35; color: var(--sd-text);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 34px; }

.cap-cycles { display: flex; align-items: center; gap: 5px; }
.cap-cycles .cyc { width: 8px; height: 8px; border-radius: 50%; background: var(--sd-rop-core); opacity: 0.35; }
.cap-cycles .cyc.live { opacity: 1; box-shadow: 0 0 8px var(--sd-rop-core); animation: crl-ping 1.8s ease-out infinite; }
.cap-cycles b { margin-left: 2px; font-size: 11px; font-weight: 800; color: var(--sd-rop-core); }

.cap-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em; }
.m-src { padding: 2px 7px; border-radius: 999px; color: var(--sd-rop-band);
  border: 1px solid color-mix(in srgb, var(--sd-rop-band) 45%, transparent); background: var(--sd-rop-band-soft); }
.m-code { padding: 2px 7px; border-radius: 999px; color: var(--sd-rop-hi);
  border: 1px solid color-mix(in srgb, var(--sd-rop-core) 45%, transparent); background: var(--sd-rop-soft); }
.m-age { margin-left: auto; color: var(--sd-text-dim); }
.m-age.none { color: var(--sd-warning); }

@keyframes crl-ping { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-rop-core) 55%, transparent); } 100% { box-shadow: 0 0 0 8px transparent; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .cap-cycles .cyc.live { animation: none; }
}
</style>
