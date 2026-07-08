<template>
  <Motion as="section" class="rrl" :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
    <div class="rrl-head">
      <span class="rrl-eyebrow sd-mono"><TimerOff :size="13" /> RETENTION WATCH</span>
      <span class="rrl-sub">Records burning toward purge eligibility — restore them, shield them, or let the clock run.
        Purging is never automatic: a superuser must act.</span>
    </div>

    <div class="rrl-row">
      <Motion v-for="(t, i) in tickets" :key="t.id" as="article" class="rrl-cap"
        :class="{ eligible: state(t) === 'eligible', soon: state(t) === 'soon' }"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.06 + i * 0.05, ease: [0.16, 1, 0.3, 1] }"
        @click="$emit('open', t.id)">
        <div class="cap-top">
          <span class="cap-no sd-mono">{{ t.ticket_number }}</span>
          <span class="cap-state sd-mono" :class="state(t)">
            <template v-if="state(t) === 'eligible'">ELIGIBLE</template>
            <template v-else>{{ countdown(t) }}</template>
          </span>
        </div>
        <p class="cap-subj">{{ t.subject }}</p>
        <!-- the burn-down fuse plate: how much of the retention window has burned -->
        <div class="cap-fuse" :title="`Retention: ${retentionDays} days from archive`">
          <i class="fuse-burn" :style="{ width: burnPct(t) + '%' }" />
          <i class="fuse-spark" :style="{ left: burnPct(t) + '%' }" aria-hidden="true" />
        </div>
        <div class="cap-meta sd-mono">
          SHELVED {{ agoLabel(t.archived_at) }} · {{ reasonShort(t) }}
        </div>
        <div class="cap-actions" @click.stop>
          <button class="cap-btn restore" title="Pull it back into circulation" @click="$emit('restore', t)">
            <ArchiveRestore :size="12" /> Restore
          </button>
          <button v-if="agent" class="cap-btn hold" :title="t.legal_hold ? 'Release the legal hold (superuser)' : 'Shield it — suspend retention under legal hold'"
            @click="$emit('hold', t)">
            <Scale :size="12" />
          </button>
          <button v-if="superuser && state(t) === 'eligible'" class="cap-btn danger" title="Permanently destroy (superuser)"
            @click="$emit('purge', t)">
            <Flame :size="12" />
          </button>
        </div>
      </Motion>
    </div>
  </Motion>
</template>

<script setup>
/* SdRetentionRail — "Retention watch": purge-eligible ∪ expiring tombstones as
   horizontal BURN-DOWN FUSE PLATES (deliberately ≠ AutoCloseRail's seal rings and
   TippingPoint's orbit countdowns — this rail counts down to the desk's only
   destructive act). Ember = the burn, gold = a shield, emerald = the way back. */
import { ArchiveRestore, Scale, TimerOff, Flame } from 'lucide-vue-next'
import { Motion } from 'motion-v'
import { archiveReasonOf, archiveReasonShort } from '@/composables/useSupportDesk'

const props = defineProps({
  tickets: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  reduced: { type: Boolean, default: false },
  agent: { type: Boolean, default: false },
  superuser: { type: Boolean, default: false },
  retentionDays: { type: Number, default: 180 },
})
defineEmits(['open', 'restore', 'hold', 'purge'])

const ep = (v) => (v ? new Date(v).getTime() : 0)
const purgeEpoch = (t) => ep(t.purge_eligible_at) || (ep(t.archived_at) ? ep(t.archived_at) + props.retentionDays * 86400000 : 0)
const state = (t) => {
  const e = purgeEpoch(t)
  if (!e) return 'ok'
  const rem = e - props.now
  if (rem <= 0) return 'eligible'
  return rem < 7 * 86400000 ? 'soon' : 'ok'
}
const burnPct = (t) => {
  const e = purgeEpoch(t); if (!e) return 0
  const start = e - props.retentionDays * 86400000
  return Math.min(100, Math.max(0, ((props.now - start) / (e - start)) * 100))
}
const countdown = (t) => {
  const rem = Math.max(0, purgeEpoch(t) - props.now)
  const d = Math.floor(rem / 86400000)
  if (d >= 1) return `${d}d ${Math.floor((rem % 86400000) / 3600000)}h`
  const h = Math.floor(rem / 3600000)
  if (h >= 1) return `${h}h ${Math.floor((rem % 3600000) / 60000)}m`
  const m = Math.floor(rem / 60000)
  return `${m}:${String(Math.floor((rem % 60000) / 1000)).padStart(2, '0')}`
}
const agoLabel = (iso) => {
  if (!iso) return '—'
  const dd = Math.floor((props.now - ep(iso)) / 86400000)
  return dd >= 1 ? `${dd}D AGO` : 'TODAY'
}
const reasonShort = (t) => archiveReasonShort(archiveReasonOf(t))
</script>

<style scoped>
.rrl { display: flex; flex-direction: column; gap: 12px; padding: 15px 17px; border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--sd-arc-purge) 30%, var(--sd-border));
  background: linear-gradient(160deg, var(--sd-arc-purge-soft), transparent 40%), var(--sd-panel); }
.rrl-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 12px; }
.rrl-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 800;
  letter-spacing: 0.2em; color: var(--sd-arc-purge); }
.rrl-sub { font-size: 11.5px; color: var(--sd-text-dim); max-width: 72ch; }

.rrl-row { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(230px, 1fr); gap: 10px;
  overflow-x: auto; padding-bottom: 4px; scrollbar-width: thin; }
.rrl-cap { position: relative; display: flex; flex-direction: column; gap: 7px; padding: 11px 13px;
  border-radius: 14px; cursor: pointer; border: 1px solid var(--sd-border-strong);
  background: var(--sd-surface); transition: border-color 0.2s, transform 0.15s; }
.rrl-cap:hover { transform: translateY(-2px); border-color: var(--sd-arc-bronze); }
.rrl-cap.soon { border-color: color-mix(in srgb, var(--sd-arc-purge) 55%, transparent); }
.rrl-cap.eligible { border-color: var(--sd-arc-purge);
  box-shadow: 0 0 18px -8px var(--sd-arc-purge); }
.rrl-cap.soon .cap-state { animation: rrl-throb 1.6s ease-in-out infinite; }

.cap-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.cap-no { font-size: 10.5px; font-weight: 800; color: var(--sd-arc-core); }
.cap-state { font-size: 10.5px; font-weight: 800; letter-spacing: 0.05em; font-variant-numeric: tabular-nums; color: var(--sd-text-muted); }
.cap-state.soon, .cap-state.eligible { color: var(--sd-arc-purge); }
.cap-subj { margin: 0; font-size: 12px; font-weight: 650; line-height: 1.35; color: var(--sd-text);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.6em; }

/* the fuse plate */
.cap-fuse { position: relative; height: 7px; border-radius: 4px; overflow: visible;
  background: var(--sd-arc-deep-soft); }
.fuse-burn { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 4px;
  background: linear-gradient(90deg, var(--sd-arc-bronze), var(--sd-arc-purge)); }
.fuse-spark { position: absolute; top: 50%; width: 9px; height: 9px; margin-left: -5px; border-radius: 50%;
  transform: translateY(-50%); background: var(--sd-arc-purge);
  box-shadow: 0 0 8px var(--sd-arc-purge); animation: rrl-spark 1.1s ease-in-out infinite; }

.cap-meta { font-size: 8.5px; letter-spacing: 0.1em; color: var(--sd-text-dim); }
.cap-actions { display: flex; gap: 6px; }
.cap-btn { display: inline-flex; align-items: center; gap: 5px; padding: 5px 9px; border-radius: 8px;
  font-size: 10.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: transparent; color: var(--sd-text-muted);
  transition: border-color 0.18s, color 0.18s; }
.cap-btn.restore { border-color: color-mix(in srgb, var(--sd-arc-restore) 50%, transparent); color: var(--sd-arc-restore); }
.cap-btn.restore:hover { background: var(--sd-arc-restore-soft); }
.cap-btn.hold { color: var(--sd-arc-hold); border-color: color-mix(in srgb, var(--sd-arc-hold) 50%, transparent); }
.cap-btn.hold:hover { background: var(--sd-arc-hold-soft); }
.cap-btn.danger { color: var(--sd-arc-purge); border-color: color-mix(in srgb, var(--sd-arc-purge) 50%, transparent); }
.cap-btn.danger:hover { background: var(--sd-arc-purge-soft); }

@keyframes rrl-throb { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
@keyframes rrl-spark { 0%, 100% { box-shadow: 0 0 5px var(--sd-arc-purge); } 50% { box-shadow: 0 0 12px var(--sd-arc-purge); } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .fuse-spark,
  html:not([data-cinematic="on"]) .rrl-cap.soon .cap-state { animation: none; }
}
</style>
