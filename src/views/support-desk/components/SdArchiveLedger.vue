<template>
  <div class="alg">
    <div v-if="loading && !tickets.length" class="alg-skels">
      <div v-for="n in 4" :key="n" class="alg-skel" />
    </div>

    <article v-for="(t, i) in tickets" :key="t.id" class="alg-card" :style="{ '--i': i, '--rt': tone(t) }"
      @click="$emit('open', t.id)">
      <span class="alg-spine" aria-hidden="true" />
      <div class="alg-main">
        <div class="alg-toprow">
          <span class="alg-no sd-mono">{{ t.ticket_number }}</span>
          <SdPill kind="status" :value="t.status" />
          <span class="alg-reason sd-mono" :title="reasonLabel(t)">{{ reasonShort(t) }}</span>
          <span v-if="t.legal_hold" class="alg-held sd-mono" title="Legal hold — retention suspended; only a superuser may release or restore">
            <Scale :size="10" /> HELD
          </span>
          <span v-else-if="state(t) === 'eligible'" class="alg-elig sd-mono" title="Past the retention window — a superuser may permanently purge it">
            <TimerOff :size="10" /> PURGE-ELIGIBLE
          </span>
        </div>
        <p class="alg-subj">{{ t.subject }}</p>
        <div class="alg-story sd-mono">
          <span>SHELVED <b>{{ agoLabel(t.archived_at) }}</b></span>
          <i class="alg-sep" aria-hidden="true" />
          <span>BY <b>{{ t.archived_by_name || 'System' }}</b></span>
          <i class="alg-sep" aria-hidden="true" />
          <span>DORMANT <b>{{ dormancy(t) }}</b></span>
          <i class="alg-sep" aria-hidden="true" />
          <span v-if="t.legal_hold">RETENTION <b class="hold">SUSPENDED ⚖</b></span>
          <span v-else-if="state(t) === 'eligible'">RETENTION <b class="purge">LAPSED</b></span>
          <span v-else>PURGE IN <b :class="{ purge: state(t) === 'soon' }">{{ purgeIn(t) }}</b></span>
        </div>
      </div>
      <div class="alg-actions" @click.stop>
        <button class="alg-btn restore" title="Pull this record back into circulation" @click="$emit('restore', t)">
          <ArchiveRestore :size="13" /> Restore
        </button>
        <button v-if="agent" class="alg-btn icon hold" :class="{ on: t.legal_hold }"
          :title="t.legal_hold ? 'Release the legal hold (superuser)' : 'Place a legal hold — suspend retention'"
          @click="$emit('hold', t)"><Scale :size="13" /></button>
        <button v-if="superuser && !t.legal_hold && state(t) === 'eligible'" class="alg-btn icon danger"
          title="Permanently destroy this record (superuser)" @click="$emit('purge', t)"><Flame :size="13" /></button>
      </div>
    </article>

    <div v-if="!loading && !tickets.length" class="alg-empty">
      <Archive :size="26" />
      <p>Nothing on this shelf</p>
      <span>Clear the refinement to see the whole archive.</span>
    </div>
  </div>
</template>

<script setup>
/* SdArchiveLedger — the LEDGER view: every tombstone as one storage story
   (was → why → who → how long asleep → what retention says). The recovery mirror of
   the Closed desk's closure ledger — emerald Restore instead of a brass certificate. */
import { Archive, ArchiveRestore, Scale, TimerOff, Flame } from 'lucide-vue-next'
import SdPill from './SdPill.vue'
import { archiveReasonOf, archiveReasonLabel, archiveReasonShort, archiveReasonTone, PURGE_RETENTION_DAYS } from '@/composables/useSupportDesk'

const props = defineProps({
  tickets: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  loading: { type: Boolean, default: false },
  reduced: { type: Boolean, default: false },
  agent: { type: Boolean, default: false },
  superuser: { type: Boolean, default: false },
})
defineEmits(['open', 'restore', 'hold', 'purge'])

const TONE_VAR = { core: 'var(--sd-arc-core)', bronze: 'var(--sd-arc-bronze)', deep: 'var(--sd-arc-deep)',
  hold: 'var(--sd-arc-hold)', purge: 'var(--sd-arc-purge)', restore: 'var(--sd-arc-restore)' }
const tone = (t) => TONE_VAR[archiveReasonTone(archiveReasonOf(t))] || TONE_VAR.core
const reasonShort = (t) => archiveReasonShort(archiveReasonOf(t))
const reasonLabel = (t) => archiveReasonLabel(archiveReasonOf(t))

const ep = (v) => (v ? new Date(v).getTime() : 0)
const purgeEpoch = (t) => ep(t.purge_eligible_at) || (ep(t.archived_at) ? ep(t.archived_at) + PURGE_RETENTION_DAYS * 86400000 : 0)
const state = (t) => {
  if (t.legal_hold) return 'held'
  const e = purgeEpoch(t); if (!e) return 'ok'
  const rem = e - props.now
  if (rem <= 0) return 'eligible'
  return rem < 7 * 86400000 ? 'soon' : 'ok'
}
const purgeIn = (t) => {
  const rem = Math.max(0, purgeEpoch(t) - props.now)
  const d = Math.floor(rem / 86400000)
  return d >= 1 ? `${d}D` : `${Math.max(1, Math.floor(rem / 3600000))}H`
}
const dormancy = (t) => {
  if (!t.archived_at) return '—'
  const m = Math.floor((props.now - ep(t.archived_at)) / 60000)
  if (m < 60) return `${m}M`
  if (m < 1440) return `${Math.floor(m / 60)}H`
  return `${Math.floor(m / 1440)}D`
}
const agoLabel = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
}
</script>

<style scoped>
.alg { display: flex; flex-direction: column; gap: 9px; }
.alg-card { position: relative; display: flex; align-items: center; gap: 14px; padding: 13px 16px 13px 20px;
  border-radius: 14px; cursor: pointer; border: 1px solid var(--sd-border-strong); background: var(--sd-surface);
  overflow: hidden; transition: border-color 0.2s, transform 0.15s;
  animation: alg-deal 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: calc(var(--i) * 0.045s); }
.alg-card:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--rt) 55%, transparent); }
.alg-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--rt); opacity: 0.8; }

.alg-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.alg-toprow { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.alg-no { font-size: 11px; font-weight: 800; color: var(--sd-arc-core); }
.alg-reason { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 6px;
  font-size: 9px; font-weight: 800; letter-spacing: 0.07em;
  color: var(--rt); background: color-mix(in srgb, var(--rt) 13%, transparent);
  border: 1px solid color-mix(in srgb, var(--rt) 45%, transparent); }
.alg-held { display: inline-flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 800;
  letter-spacing: 0.08em; color: var(--sd-arc-hold); }
.alg-elig { display: inline-flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 800;
  letter-spacing: 0.08em; color: var(--sd-arc-purge); }
.alg-subj { margin: 0; font-size: 13.5px; font-weight: 700; color: var(--sd-text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.alg-story { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 9.5px;
  letter-spacing: 0.08em; color: var(--sd-text-dim); }
.alg-story b { color: var(--sd-text-muted); font-weight: 700; }
.alg-story b.hold { color: var(--sd-arc-hold); }
.alg-story b.purge { color: var(--sd-arc-purge); }
.alg-sep { width: 14px; height: 1px; background: var(--sd-arc-brd); }

.alg-actions { display: flex; align-items: center; gap: 7px; flex: none; }
.alg-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 10px;
  font-size: 11.5px; font-weight: 800; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: transparent; color: var(--sd-text-muted);
  transition: border-color 0.18s, background 0.18s, transform 0.14s; }
.alg-btn:hover { transform: translateY(-1px); }
.alg-btn.icon { padding: 7px 9px; }
.alg-btn.restore { border-color: color-mix(in srgb, var(--sd-arc-restore) 55%, transparent);
  color: var(--sd-arc-restore); background: var(--sd-arc-restore-soft); }
.alg-btn.hold { color: var(--sd-arc-hold); }
.alg-btn.hold.on { border-color: var(--sd-arc-hold); background: var(--sd-arc-hold-soft); }
.alg-btn.danger { color: var(--sd-arc-purge); border-color: color-mix(in srgb, var(--sd-arc-purge) 50%, transparent); }
.alg-btn.danger:hover { background: var(--sd-arc-purge-soft); }

.alg-skels { display: flex; flex-direction: column; gap: 9px; }
.alg-skel { height: 76px; border-radius: 14px; background: var(--sd-surface); border: 1px solid var(--sd-border);
  animation: alg-pulse 1.4s ease-in-out infinite; }
.alg-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 44px 0;
  color: var(--sd-text-dim); }
.alg-empty p { margin: 0; font-size: 14px; font-weight: 700; color: var(--sd-text-muted); }
.alg-empty span { font-size: 12px; }

@keyframes alg-deal { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes alg-pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }

@media (max-width: 760px) {
  .alg-card { flex-direction: column; align-items: stretch; }
  .alg-actions { justify-content: flex-end; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .alg-card { animation: none; }
}
</style>
