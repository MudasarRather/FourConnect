<template>
  <SetModal :open="open" :title="`Delete ${target?.name || 'location'}`" subtitle="Organization · Geography"
    :icon="Trash2" accent-color="var(--set-conflict)" :width="layout === 'cols' ? 800 : 720" mode="delete" @close="$emit('close')">
    <div class="ld" :class="layout">
      <!-- ░░ DOSSIER (the location's own info — left when few fields, bottom when many) ░░ -->
      <section class="ld-info" :class="{ pulled: loading }">
        <span class="ld-info-grid" aria-hidden="true" />
        <div class="ld-pinwrap">
          <span class="ld-ripple" aria-hidden="true" />
          <span class="ld-pin" :style="{ '--c': type.color }">
            <component :is="type.icon" :size="18" />
          </span>
        </div>
        <div class="ld-info-id">
          <span class="ld-info-eyebrow" :style="{ color: type.color }">{{ type.label }}</span>
          <b>{{ target?.name || '—' }}</b>
          <span class="ld-info-stamp">Pending removal</span>
        </div>

        <div class="ld-fields">
          <div v-for="f in fields" :key="f.k" class="ld-field">
            <span class="ld-field-lab"><component :is="f.icon" :size="11" /> {{ f.lab }}</span>
            <b :class="{ mono: f.mono }">{{ f.val }}</b>
          </div>
        </div>

        <div v-if="clock" class="ld-clock">
          <Clock3 :size="12" /><b class="set-mono">{{ clock.label }}</b><span>local · {{ offLabel }}</span>
        </div>
      </section>

      <!-- ░░ ACTION (impact + reason + acknowledgement) ░░ -->
      <section class="ld-action">
        <div class="ld-checks">
          <span class="ld-checks-lab">Impact check</span>

          <Motion as="div" class="ld-check" :data-state="headcount > 0 ? 'warn' : 'pass'"
            :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.06 }">
            <span class="ld-check-ic"><component :is="headcount > 0 ? Users : CheckCircle2" :size="15" /></span>
            <div class="ld-check-body">
              <b>{{ headcount > 0 ? `${headcount} employee${headcount === 1 ? '' : 's'} based here` : 'No employees based here' }}</b>
              <span>{{ headcount > 0 ? 'They keep this location id — their attendance geo-fence stops resolving until you reassign them.' : 'No employee records anchor to this office.' }}</span>
            </div>
            <button v-if="headcount > 0" class="ld-check-go" @click="$emit('view-people', target)">Reassign <ArrowRight :size="12" /></button>
          </Motion>

          <Motion as="div" class="ld-check" data-state="info"
            :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.12 }">
            <span class="ld-check-ic"><Network :size="15" /></span>
            <div class="ld-check-body">
              <b>Downstream anchors come loose</b>
              <span>Attendance geo-fences, shift calendars, per-location holidays and travel from/to that point at this office stay in place but lose their anchor.</span>
            </div>
          </Motion>

          <Motion as="div" class="ld-check" data-state="info"
            :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.18 }">
            <span class="ld-check-ic"><Archive :size="15" /></span>
            <div class="ld-check-body">
              <b>Soft-delete · reversible</b>
              <span>The office is tombstoned (hidden from every picker) but retained — a super admin can restore it from the recovery view.</span>
            </div>
          </Motion>
        </div>

        <div class="ld-reason">
          <span class="ld-reason-lab">Reason for removal <i>*</i></span>
          <div class="ld-presets">
            <button v-for="p in PRESETS" :key="p" type="button" class="ld-preset" :class="{ on: reason === p }" @click="reason = p">{{ p }}</button>
          </div>
          <textarea v-model="reason" rows="2" class="ld-textarea" placeholder="Recorded in the audit ledger — e.g. office permanently closed and staff relocated to HQ…" />
        </div>

        <Motion v-if="headcount > 0" as="label" class="ld-ack"
          :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="{ duration: 0.3 }">
          <input type="checkbox" v-model="acked" />
          <span><ShieldAlert :size="13" /> I understand {{ headcount }} employee record{{ headcount === 1 ? '' : 's' }} will be left pointing at a removed office until reassigned.</span>
        </Motion>
      </section>
    </div>

    <!-- process strip (full width, always at the bottom) -->
    <div class="ld-process">
      <span class="ld-process-lab"><Workflow :size="12" /> What happens</span>
      <div class="ld-steps">
        <div v-for="(s, i) in STEPS" :key="i" class="ld-step"><span class="ld-step-n">{{ i + 1 }}</span><div><b>{{ s.t }}</b><span>{{ s.d }}</span></div></div>
      </div>
    </div>

    <template #footer>
      <span class="ld-foot-actor"><span class="ld-foot-av">{{ initials }}</span> Removing as {{ name }}</span>
      <span class="ld-foot-sp" />
      <button class="set-btn set-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="set-btn ld-confirm" :class="{ disabled: blocked || loading }"
        :whileHover="(blocked || loading) ? {} : { y: -2, scale: 1.02 }" :whileTap="(blocked || loading) ? {} : { scale: 0.97 }"
        :disabled="blocked || loading" @click="confirm">
        <Loader v-if="loading" :size="14" class="set-spin" /><Trash2 v-else :size="14" />
        {{ loading ? 'Removing…' : (blocked ? blockedLabel : 'Delete location') }}
      </Motion>
    </template>
  </SetModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { Trash2, Loader, Clock3, Users, CheckCircle2, Network, Archive, ShieldAlert, ArrowRight, Workflow,
  Building2, GitBranch, Wifi, Briefcase, Hash, MapPin, Globe2, CalendarOff } from 'lucide-vue-next'
import SetModal from './SetModal.vue'
import { useActor, actorName, actorInitials } from '../composables/useActor'
import { useNow, tzLocal, tzOffsetMinutes, offsetLabel, weeklyOffSummary, normalizeWeeklyOff } from '../composables/useLocationClock'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  target: { type: Object, default: null },
  headcount: { type: Number, default: 0 },
})
const emit = defineEmits(['close', 'confirm', 'view-people'])

const actor = useActor()
const now = useNow()
const name = computed(() => actorName(actor.value))
const initials = computed(() => actorInitials(actor.value))

const reason = ref('')
const acked = ref(false)
watch(() => props.open, (v) => { if (v) { reason.value = ''; acked.value = false } })

const PRESETS = ['Office permanently closed', 'Relocated / merged into another site', 'Duplicate entry', 'Lease ended', 'Created in error']
const STEPS = [
  { t: 'Reason logged', d: 'Your note is sealed into the settings audit ledger.' },
  { t: 'Soft-delete', d: 'is_deleted flips — the office leaves every picker.' },
  { t: 'No hard guard', d: 'References are not auto-reassigned; do that first.' },
  { t: 'Reversible', d: 'A super admin can restore it later.' },
]

const TYPE = {
  HQ: { label: 'Headquarters', color: 'var(--set-gold)', icon: Building2 },
  BRANCH: { label: 'Branch', color: 'var(--set-orange)', icon: GitBranch },
  REMOTE: { label: 'Remote', color: 'var(--set-ok)', icon: Wifi },
  CLIENT_SITE: { label: 'Client site', color: 'var(--set-deep)', icon: Briefcase },
}
const type = computed(() => TYPE[props.target?.type] || TYPE.HQ)

const clock = computed(() => tzLocal(props.target?.timezone, now.value))
const offLabel = computed(() => offsetLabel(tzOffsetMinutes(props.target?.timezone, now.value)))

// dossier fields — only the populated ones; the COUNT drives the layout
const fields = computed(() => {
  const t = props.target || {}
  const out = []
  if (t.code) out.push({ k: 'code', lab: 'Code', icon: Hash, val: t.code, mono: true })
  const place = [t.city, t.state, t.country].filter(Boolean).join(', ')
  if (place) out.push({ k: 'place', lab: 'Location', icon: MapPin, val: place })
  if (t.timezone) out.push({ k: 'tz', lab: 'Timezone', icon: Globe2, val: t.timezone, mono: true })
  const w = normalizeWeeklyOff(t.weekly_off_pattern)
  if (w.days.length || w.alternate_saturdays) out.push({ k: 'woff', lab: 'Weekly off', icon: CalendarOff, val: weeklyOffSummary(t.weekly_off_pattern) })
  if (t.address) out.push({ k: 'addr', lab: 'Address', icon: MapPin, val: t.address })
  return out
})
// More than 3 populated detail fields → the dossier needs room → drop to the bottom.
const layout = computed(() => (fields.value.length > 3 ? 'stacked' : 'cols'))

const blocked = computed(() => !reason.value.trim() || (props.headcount > 0 && !acked.value))
const blockedLabel = computed(() => (!reason.value.trim() ? 'Add a reason' : 'Acknowledge to delete'))
const confirm = () => { if (!blocked.value && !props.loading) emit('confirm', reason.value.trim()) }
</script>

<style scoped>
.ld { display: grid; gap: 16px; }
.ld.cols { grid-template-columns: 286px minmax(0, 1fr); align-items: start; }
.ld.stacked { display: flex; flex-direction: column; }
.ld.stacked .ld-action { order: 1; }
.ld.stacked .ld-info { order: 2; }

/* ── dossier ── */
.ld-info { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 16px;
  border-radius: 16px; background: var(--set-panel); border: 1px solid color-mix(in srgb, var(--set-conflict) 20%, transparent);
  transition: filter 0.6s var(--set-spring), opacity 0.6s; }
.ld-info.pulled { filter: grayscale(0.5) brightness(0.85); }
.ld-info-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(color-mix(in srgb, var(--set-conflict) 7%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--set-conflict) 7%, transparent) 1px, transparent 1px);
  background-size: 22px 22px; mask-image: radial-gradient(120% 100% at 0% 0%, #000 14%, transparent 76%); -webkit-mask-image: radial-gradient(120% 100% at 0% 0%, #000 14%, transparent 76%); }
.ld-pinwrap { position: relative; align-self: flex-start; }
.ld-pin { position: relative; z-index: 1; display: grid; place-items: center; width: 46px; height: 46px; border-radius: 14px; color: var(--c);
  background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent);
  transition: transform 0.6s var(--set-spring); }
.ld-info.pulled .ld-pin { transform: translateY(-14px) rotate(-12deg) scale(0.94); }
.ld-ripple { position: absolute; left: 50%; bottom: -2px; width: 8px; height: 8px; border-radius: 50%; transform: translateX(-50%);
  border: 1px solid color-mix(in srgb, var(--set-conflict) 50%, transparent); opacity: 0; }
.ld-info.pulled .ld-ripple { animation: ld-ripple 0.7s ease-out forwards; }
@keyframes ld-ripple { 0% { width: 8px; height: 8px; opacity: 0.8; } 100% { width: 70px; height: 70px; opacity: 0; } }
.ld-info-id { position: relative; display: flex; flex-direction: column; gap: 2px; }
.ld-info-eyebrow { font-size: 8.5px; font-weight: 850; letter-spacing: 0.1em; text-transform: uppercase; }
.ld-info-id b { font-size: 16px; font-weight: 850; color: var(--set-text); }
.ld-info-stamp { align-self: flex-start; margin-top: 3px; font-size: 8.5px; font-weight: 850; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 3px 9px; border-radius: 999px; color: var(--set-conflict); background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 28%, transparent); }
.ld-fields { position: relative; display: grid; gap: 9px; }
.ld.stacked .ld-fields { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
.ld-field { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ld-field-lab { display: inline-flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--set-text-dim); }
.ld-field-lab :deep(svg) { color: var(--set-text-muted); }
.ld-field b { font-size: 12.5px; font-weight: 700; color: var(--set-text-secondary); word-break: break-word; }
.ld-field b.mono { font-family: var(--set-mono); }
.ld-clock { position: relative; display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; padding: 6px 11px; border-radius: 10px;
  background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.ld-clock :deep(svg) { color: var(--set-gold); }
.ld-clock b { font-size: 13px; font-weight: 800; color: var(--set-gold); }
.ld-clock span { font-size: 9.5px; color: var(--set-text-muted); }

/* ── action ── */
.ld-action { display: flex; flex-direction: column; gap: 13px; min-width: 0; }
.ld-checks { display: flex; flex-direction: column; gap: 8px; }
.ld-checks-lab { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-dim); }
.ld-check { display: flex; align-items: flex-start; gap: 10px; padding: 11px 12px; border-radius: 12px;
  background: var(--set-surface); border: 1px solid var(--set-border); border-left: 3px solid var(--set-unset); }
.ld-check[data-state="pass"] { border-left-color: var(--set-ok); }
.ld-check[data-state="warn"] { border-left-color: var(--set-partial); background: color-mix(in srgb, var(--set-partial) 6%, var(--set-surface)); }
.ld-check[data-state="info"] { border-left-color: var(--set-gold); }
.ld-check-ic { flex-shrink: 0; margin-top: 1px; }
.ld-check[data-state="pass"] .ld-check-ic :deep(svg) { color: var(--set-ok); }
.ld-check[data-state="warn"] .ld-check-ic :deep(svg) { color: var(--set-partial); }
.ld-check[data-state="info"] .ld-check-ic :deep(svg) { color: var(--set-gold); }
.ld-check-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ld-check-body b { font-size: 12.5px; font-weight: 750; color: var(--set-text); }
.ld-check-body span { font-size: 11px; line-height: 1.45; color: var(--set-text-muted); }
.ld-check-go { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; align-self: center; padding: 6px 10px; border-radius: 9px; cursor: pointer;
  font: inherit; font-size: 11px; font-weight: 700; color: var(--set-partial); background: var(--set-partial-soft); border: 1px solid color-mix(in srgb, var(--set-partial) 32%, transparent); transition: all 0.2s; }
.ld-check-go:hover { background: color-mix(in srgb, var(--set-partial) 18%, transparent); }

.ld-reason { display: flex; flex-direction: column; gap: 8px; }
.ld-reason-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-dim); }
.ld-reason-lab i { color: var(--set-conflict); font-style: normal; margin-left: 2px; }
.ld-presets { display: flex; flex-wrap: wrap; gap: 6px; }
.ld-preset { padding: 5px 11px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 10.5px; font-weight: 600;
  color: var(--set-text-muted); background: var(--set-surface); border: 1px solid var(--set-border); transition: all 0.18s; }
.ld-preset:hover { color: var(--set-text); border-color: var(--set-border-strong); }
.ld-preset.on { color: var(--set-conflict); background: var(--set-conflict-soft); border-color: color-mix(in srgb, var(--set-conflict) 36%, transparent); }
.ld-textarea { width: 100%; resize: vertical; min-height: 58px; padding: 11px 13px; border-radius: 11px; font: inherit; font-size: 13px;
  color: var(--hr-input-text); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s, background 0.2s; }
.ld-textarea:focus { outline: none; background: var(--hr-input-bg-focus); border-color: var(--hr-input-border-focus); }
.ld-textarea::placeholder { color: var(--hr-input-placeholder); }

.ld-ack { display: flex; align-items: center; gap: 9px; padding: 10px 12px; border-radius: 11px; cursor: pointer;
  background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 30%, transparent); }
.ld-ack input { width: 16px; height: 16px; accent-color: var(--set-conflict); cursor: pointer; flex-shrink: 0; }
.ld-ack span { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; line-height: 1.45; color: var(--set-text-secondary); }
.ld-ack span :deep(svg) { color: var(--set-conflict); flex-shrink: 0; }

/* process strip */
.ld-process { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--set-border); display: flex; flex-direction: column; gap: 10px; }
.ld-process-lab { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.ld-process-lab :deep(svg) { color: var(--set-conflict); }
.ld-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 9px; }
.ld-step { display: flex; align-items: flex-start; gap: 9px; padding: 10px 11px; border-radius: 11px; background: var(--set-surface); border: 1px solid var(--set-border);
  border-top: 2px solid color-mix(in srgb, var(--set-conflict) 50%, transparent); }
.ld-step-n { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 7px; flex-shrink: 0; font-size: 10px; font-weight: 850; color: var(--set-conflict);
  background: var(--set-surface-elevated); border: 1px solid color-mix(in srgb, var(--set-conflict) 36%, transparent); }
.ld-step div { display: flex; flex-direction: column; gap: 1px; }
.ld-step b { font-size: 11.5px; font-weight: 750; color: var(--set-text); }
.ld-step span { font-size: 10px; line-height: 1.4; color: var(--set-text-muted); }

/* footer */
.ld-foot-actor { display: inline-flex; align-items: center; gap: 7px; font-size: 10.5px; color: var(--set-text-muted); }
.ld-foot-av { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 7px; font-size: 9.5px; font-weight: 850; color: #1a1206; background: var(--set-grad-hero); }
.ld-foot-sp { flex: 1; }
.ld-confirm { color: #fff; background: linear-gradient(135deg, #f87171, #dc2626); border: none; box-shadow: 0 10px 24px -12px rgba(220,38,38,0.6); }
.ld-confirm:hover { color: #fff; }
.ld-confirm.disabled { background: var(--set-surface-elevated); color: var(--set-text-dim); box-shadow: none; }

@media (max-width: 720px) { .ld.cols { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) {
  .ld-info, .ld-pin { transition: none; }
  .ld-info.pulled .ld-pin { transform: none; }
  .ld-info.pulled .ld-ripple { animation: none; }
}
</style>
