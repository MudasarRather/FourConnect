<template>
  <SetModal :open="open" :title="editTarget ? 'Edit location' : 'New work location'"
    subtitle="Organization · Geography" :icon="MapPin" accent-color="var(--set-ok)"
    :width="940" aside-placement="side" :mode="editTarget ? 'edit' : 'create'" @close="$emit('close')">
    <div class="lm">
      <!-- live "location pass" preview -->
      <Motion as="div" class="lm-pass" :data-ready="ready"
        :initial="{ opacity: 0, y: 12, scale: 0.98 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }">
        <span class="lm-pass-grid" aria-hidden="true" />
        <span class="lm-pass-aura" :style="{ '--c': typeMeta.color }" aria-hidden="true" />
        <span class="lm-pass-spine" :style="{ '--c': typeMeta.color }" aria-hidden="true" />
        <div class="lm-pass-l">
          <span class="lm-pass-ic" :style="{ '--c': typeMeta.color }"><component :is="typeMeta.icon" :size="18" /></span>
          <div class="lm-pass-id">
            <span class="lm-pass-eyebrow" :style="{ color: typeMeta.color }">{{ typeMeta.label }}</span>
            <b>{{ form.name || '— location name —' }}</b>
            <span class="lm-pass-place">{{ placePreview }}</span>
          </div>
        </div>
        <div class="lm-pass-r">
          <span class="lm-pass-stamp" :data-ready="ready">{{ ready ? 'Ready' : 'Draft' }}</span>
          <div v-if="clock" class="lm-pass-clock">
            <b class="set-mono">{{ clock.label }}</b>
            <span class="set-mono">{{ offLabel }}</span>
          </div>
          <span v-else-if="form.code" class="lm-pass-code set-mono"><Hash :size="9" />{{ form.code }}</span>
        </div>
      </Motion>

      <div class="lm-grid">
        <!-- name -->
        <Motion as="div" class="lm-f full" v-bind="fT(0)">
          <span class="lm-lab">Location name <i>*</i></span>
          <HrInput v-model="form.name" placeholder="e.g. Bengaluru Head Office" />
        </Motion>

        <!-- type segmented -->
        <Motion as="div" class="lm-f full" v-bind="fT(1)">
          <span class="lm-lab">Type</span>
          <div class="lm-seg">
            <button v-for="t in TYPES" :key="t.value" type="button" class="lm-seg-btn" :class="{ on: form.type === t.value }"
              :style="form.type === t.value ? { '--c': t.color } : {}" @click="form.type = t.value">
              <component :is="t.icon" :size="14" /> {{ t.label }}
            </button>
          </div>
        </Motion>

        <!-- code + city -->
        <Motion as="div" class="lm-f" v-bind="fT(2)">
          <span class="lm-lab">Code</span>
          <HrInput v-model="form.code" mono placeholder="e.g. HO" />
        </Motion>
        <Motion as="div" class="lm-f" v-bind="fT(3)">
          <span class="lm-lab">City</span>
          <HrInput v-model="form.city" placeholder="e.g. Bengaluru" />
        </Motion>

        <!-- state + country -->
        <Motion as="div" class="lm-f" v-bind="fT(4)">
          <span class="lm-lab">State</span>
          <HrInput v-model="form.state" placeholder="e.g. Karnataka" />
        </Motion>
        <Motion as="div" class="lm-f" v-bind="fT(5)">
          <span class="lm-lab">Country</span>
          <HrInput v-model="form.country" placeholder="e.g. India" />
        </Motion>

        <!-- timezone -->
        <Motion as="div" class="lm-f full" v-bind="fT(6)">
          <span class="lm-lab">Timezone <i class="hint">— powers attendance, shifts &amp; the world map</i></span>
          <div class="lm-tz">
            <div class="lm-tz-in" :class="tzState">
              <Clock3 :size="14" />
              <input v-model="form.timezone" placeholder="e.g. Asia/Kolkata" spellcheck="false" />
              <span v-if="form.timezone" class="lm-tz-verdict" :class="tzState">
                <template v-if="tzState === 'ok'"><CheckCircle2 :size="12" /> {{ clock ? clock.label : '' }} · {{ offLabel }}</template>
                <template v-else><AlertTriangle :size="12" /> Unrecognized</template>
              </span>
            </div>
            <div class="lm-tz-chips">
              <button v-for="p in TZ_PRESETS" :key="p.id" type="button" class="lm-tz-chip" :class="{ on: form.timezone === p.id }" @click="form.timezone = p.id">{{ p.label }}</button>
            </div>
          </div>
        </Motion>

        <!-- weekly off -->
        <Motion as="div" class="lm-f full" v-bind="fT(7)">
          <span class="lm-lab">Weekly off pattern <i class="hint">— drives shift calendars &amp; attendance</i></span>
          <div class="lm-week">
            <button v-for="d in WEEKDAYS" :key="d.code" type="button" class="lm-wday" :class="{ on: form.woffDays.includes(d.code) }"
              @click="toggleDay(d.code)" :title="d.full">
              <span class="lm-wday-s">{{ d.short }}</span>
              <span class="lm-wday-f">{{ d.code }}</span>
            </button>
            <label class="lm-altsat" :class="{ on: form.altSat }">
              <input type="checkbox" v-model="form.altSat" />
              <span>Alt&nbsp;Saturdays</span>
            </label>
          </div>
          <span class="lm-week-sum">{{ weekSummary }}</span>
        </Motion>

        <!-- address -->
        <Motion as="div" class="lm-f full" v-bind="fT(8)">
          <span class="lm-lab">Address</span>
          <textarea v-model="form.address" class="lm-textarea" rows="2" placeholder="Street address, landmark…" />
        </Motion>
      </div>
    </div>

    <template #aside>
      <SetWorkflowRail accent="var(--set-ok)" :icon="MapPin" title="The location lifecycle"
        :summary="summary" :steps="steps" :affects="affects" :actor="actor" :mode="editTarget ? 'edit' : 'create'" orientation="vertical" />
    </template>

    <template #footer>
      <button class="set-btn set-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="set-btn set-btn-primary lm-save" :class="{ disabled: !ready || saving }"
        :whileHover="(!ready || saving) ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
        :disabled="!ready || saving" @click="submit">
        <Loader v-if="saving" :size="14" class="set-spin" /><Check v-else :size="14" />
        {{ editTarget ? 'Save changes' : 'Create location' }}
      </Motion>
    </template>
  </SetModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { MapPin, Hash, Clock3, Check, Loader, CheckCircle2, AlertTriangle,
  Building2, GitBranch, Wifi, Briefcase, PencilLine, ShieldCheck, Database, Share2 } from 'lucide-vue-next'
import SetModal from './SetModal.vue'
import SetWorkflowRail from './SetWorkflowRail.vue'
import HrInput from '@/components/hr/forms/HrInput.vue'
import { MODULES } from './connectivity'
import { useActor } from '../composables/useActor'
import { useNow, tzLocal, tzOffsetMinutes, offsetLabel, isValidTz, WEEKDAYS, TZ_PRESETS, normalizeWeeklyOff, weeklyOffSummary } from '../composables/useLocationClock'

const props = defineProps({
  open: { type: Boolean, default: false },
  editTarget: { type: Object, default: null },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'save'])

const actor = useActor()
const now = useNow()

const TYPES = [
  { value: 'HQ', label: 'HQ', color: 'var(--set-gold)', icon: Building2 },
  { value: 'BRANCH', label: 'Branch', color: 'var(--set-orange)', icon: GitBranch },
  { value: 'REMOTE', label: 'Remote', color: 'var(--set-ok)', icon: Wifi },
  { value: 'CLIENT_SITE', label: 'Client', color: 'var(--set-deep)', icon: Briefcase },
]
const typeMeta = computed(() => TYPES.find((t) => t.value === form.value.type) || TYPES[0])

const blank = () => ({ name: '', code: '', type: 'HQ', city: '', state: '', country: '', timezone: '', address: '', woffDays: [], altSat: false })
const form = ref(blank())

watch(() => props.open, (v) => {
  if (!v) return
  if (props.editTarget) {
    const t = props.editTarget
    const w = normalizeWeeklyOff(t.weekly_off_pattern)
    form.value = {
      name: t.name || '', code: t.code || '', type: t.type || 'HQ',
      city: t.city || '', state: t.state || '', country: t.country || '',
      timezone: t.timezone || '', address: t.address || '',
      woffDays: [...w.days], altSat: w.alternate_saturdays,
    }
  } else { form.value = blank() }
}, { immediate: true })

const toggleDay = (code) => {
  const i = form.value.woffDays.indexOf(code)
  if (i >= 0) form.value.woffDays.splice(i, 1)
  else form.value.woffDays.push(code)
}

const fT = (i) => ({
  initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: 0.05 + i * 0.05, ease: [0.16, 1, 0.3, 1] },
})

const ready = computed(() => String(form.value.name || '').trim() !== '')
const tzState = computed(() => (!form.value.timezone ? 'idle' : isValidTz(form.value.timezone) ? 'ok' : 'bad'))
const clock = computed(() => (tzState.value === 'ok' ? tzLocal(form.value.timezone, now.value) : null))
const offLabel = computed(() => (tzState.value === 'ok' ? offsetLabel(tzOffsetMinutes(form.value.timezone, now.value)) : ''))
const placePreview = computed(() => [form.value.city, form.value.state, form.value.country].filter(Boolean).join(', ') || 'Work location')
const weekSummary = computed(() => weeklyOffSummary({ days: form.value.woffDays, alternate_saturdays: form.value.altSat }))

const affects = ['attendance', 'shifts', 'travel'].map((s) => MODULES[s]).filter(Boolean).map((m) => ({ icon: m.icon, label: m.label }))
const summary = computed(() => props.editTarget
  ? 'Edits ripple live to every record pointing at this office — no downstream re-save needed.'
  : 'A work location anchors where people clock in, which holidays apply, and where travel begins and ends.')
const steps = computed(() => props.editTarget
  ? [
    { icon: PencilLine, title: 'Adjust', text: 'Update the office details — its id is preserved so employee links stay intact.' },
    { icon: ShieldCheck, title: 'Validate', text: 'Name uniqueness is re-checked; the timezone is verified against the IANA database.' },
    { icon: Database, title: 'Update', text: 'Rewritten in place and sealed into the settings audit ledger.' },
    { icon: Share2, title: 'Reflect', text: 'Attendance geo-fences, shift calendars and travel pickers read the new values instantly.' },
  ]
  : [
    { icon: PencilLine, title: 'Define', text: 'Name the office, pick its type, and set a timezone so attendance can localise clock-ins.' },
    { icon: ShieldCheck, title: 'Validate', text: 'The name must be unique; the timezone is verified live as you type.' },
    { icon: Database, title: 'Register', text: 'It joins the location registry and the creation is written to the audit ledger.' },
    { icon: Share2, title: 'Propagate', text: 'It becomes selectable across employees, attendance, shifts and travel at once.' },
  ])

const submit = () => {
  if (!ready.value || props.saving) return
  const f = form.value
  const empty = (v) => (v == null || String(v).trim() === '' ? null : String(v).trim())
  const days = WEEKDAYS.map((w) => w.code).filter((c) => f.woffDays.includes(c))
  const woff = (days.length || f.altSat) ? { days, alternate_saturdays: !!f.altSat } : null
  emit('save', {
    name: f.name.trim(), code: empty(f.code), type: f.type,
    city: empty(f.city), state: empty(f.state), country: empty(f.country),
    timezone: empty(f.timezone), address: empty(f.address), weekly_off_pattern: woff,
  })
}
</script>

<style scoped>
.lm { display: flex; flex-direction: column; gap: 16px; }

/* location pass */
.lm-pass { position: relative; overflow: hidden; display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 15px 16px; border-radius: 15px; background: var(--set-panel); border: 1px solid var(--set-border); transition: border-color 0.3s, box-shadow 0.3s; }
.lm-pass[data-ready="true"] { border-color: color-mix(in srgb, var(--set-ok) 38%, transparent); box-shadow: 0 0 28px -12px color-mix(in srgb, var(--set-ok) 60%, transparent); }
.lm-pass-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(color-mix(in srgb, var(--set-ok) 7%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--set-ok) 7%, transparent) 1px, transparent 1px);
  background-size: 22px 22px; mask-image: radial-gradient(110% 100% at 100% 0%, #000 18%, transparent 78%); -webkit-mask-image: radial-gradient(110% 100% at 100% 0%, #000 18%, transparent 78%); }
.lm-pass-aura { position: absolute; inset: -50% 30% auto -10%; height: 80%; background: radial-gradient(circle, color-mix(in srgb, var(--c) 24%, transparent), transparent 70%); filter: blur(22px); pointer-events: none; }
.lm-pass-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: linear-gradient(180deg, var(--c), color-mix(in srgb, var(--c) 30%, transparent)); box-shadow: 0 0 14px -2px var(--c); }
.lm-pass-l { position: relative; display: flex; align-items: center; gap: 12px; min-width: 0; }
.lm-pass-ic { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0; color: var(--c);
  background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 28%, transparent); }
.lm-pass-id { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.lm-pass-eyebrow { font-size: 8.5px; font-weight: 850; letter-spacing: 0.1em; text-transform: uppercase; }
.lm-pass-id b { font-size: 16px; font-weight: 850; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 30ch; }
.lm-pass-place { font-size: 11px; color: var(--set-text-muted); }
.lm-pass-r { position: relative; display: flex; flex-direction: column; align-items: flex-end; gap: 5px; flex-shrink: 0; }
.lm-pass-stamp { font-size: 9px; font-weight: 850; letter-spacing: 0.08em; text-transform: uppercase; padding: 3px 9px; border-radius: 999px;
  color: var(--set-unset); background: var(--set-unset-soft); border: 1px solid var(--set-border); }
.lm-pass-stamp[data-ready="true"] { color: var(--set-ok); background: var(--set-ok-soft); border-color: color-mix(in srgb, var(--set-ok) 36%, transparent); }
.lm-pass-clock { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.1; }
.lm-pass-clock b { font-size: 17px; font-weight: 850; color: var(--set-gold); }
.lm-pass-clock span { font-size: 9px; color: var(--set-text-muted); }
.lm-pass-code { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; color: var(--set-text-muted); }

/* fields */
.lm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
.lm-f { display: flex; flex-direction: column; gap: 6px; }
.lm-f.full { grid-column: 1 / -1; }
.lm-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-dim); }
.lm-lab i { color: var(--set-conflict); font-style: normal; margin-left: 2px; }
.lm-lab i.hint { color: var(--set-text-dim); text-transform: none; letter-spacing: 0; font-weight: 600; margin-left: 4px; }

.lm-seg { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 7px; }
.lm-seg-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 6px; border-radius: 10px; cursor: pointer;
  font: inherit; font-size: 12px; font-weight: 700; color: var(--set-text-muted); background: var(--set-surface); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.lm-seg-btn :deep(svg) { color: var(--set-text-muted); transition: color 0.2s; }
.lm-seg-btn.on { color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent); border-color: color-mix(in srgb, var(--c) 38%, transparent); }
.lm-seg-btn.on :deep(svg) { color: var(--c); }
@media (max-width: 560px) { .lm-seg { grid-auto-flow: row; grid-template-columns: 1fr 1fr; } }

/* timezone */
.lm-tz { display: flex; flex-direction: column; gap: 8px; }
.lm-tz-in { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 11px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s; }
.lm-tz-in:focus-within { border-color: var(--hr-input-border-focus); }
.lm-tz-in.ok { border-color: color-mix(in srgb, var(--set-ok) 40%, transparent); }
.lm-tz-in.bad { border-color: color-mix(in srgb, var(--set-conflict) 40%, transparent); }
.lm-tz-in > :deep(svg) { color: var(--set-ok); flex-shrink: 0; }
.lm-tz-in input { flex: 1; min-width: 0; border: 0; background: none; outline: none; font: inherit; font-size: 13px; font-family: var(--set-mono); color: var(--hr-input-text); }
.lm-tz-verdict { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 700; white-space: nowrap; flex-shrink: 0; }
.lm-tz-verdict.ok { color: var(--set-ok); } .lm-tz-verdict.ok :deep(svg) { color: var(--set-ok); }
.lm-tz-verdict.bad { color: var(--set-conflict); } .lm-tz-verdict.bad :deep(svg) { color: var(--set-conflict); }
.lm-tz-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.lm-tz-chip { padding: 4px 10px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 10.5px; font-weight: 600;
  color: var(--set-text-muted); background: var(--set-surface); border: 1px solid var(--set-border); transition: all 0.18s; }
.lm-tz-chip:hover { color: var(--set-text); border-color: var(--set-border-strong); }
.lm-tz-chip.on { color: var(--set-ok); background: var(--set-ok-soft); border-color: color-mix(in srgb, var(--set-ok) 36%, transparent); }

/* weekly off */
.lm-week { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; }
.lm-wday { display: flex; flex-direction: column; align-items: center; gap: 1px; width: 46px; padding: 7px 4px; border-radius: 10px; cursor: pointer; font: inherit;
  color: var(--set-text-muted); background: var(--set-surface); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.lm-wday-s { font-size: 13px; font-weight: 850; }
.lm-wday-f { font-size: 7.5px; font-weight: 700; letter-spacing: 0.04em; opacity: 0.7; }
.lm-wday.on { color: var(--set-ok); background: var(--set-ok-soft); border-color: color-mix(in srgb, var(--set-ok) 40%, transparent); transform: translateY(-1px); }
.lm-altsat { display: inline-flex; align-items: center; gap: 7px; padding: 8px 12px; border-radius: 10px; cursor: pointer;
  color: var(--set-text-muted); background: var(--set-surface); border: 1px solid var(--set-border); font-size: 11.5px; font-weight: 700; transition: all 0.2s; }
.lm-altsat input { width: 15px; height: 15px; accent-color: var(--set-ok); cursor: pointer; }
.lm-altsat.on { color: var(--set-ok); border-color: color-mix(in srgb, var(--set-ok) 36%, transparent); }
.lm-week-sum { font-size: 10.5px; color: var(--set-text-muted); }

.lm-textarea { width: 100%; resize: vertical; min-height: 60px; padding: 10px 12px; border-radius: 10px; font: inherit; font-size: 13px;
  color: var(--hr-input-text); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s, background 0.2s; }
.lm-textarea:focus { outline: none; background: var(--hr-input-bg-focus); border-color: var(--hr-input-border-focus); }
.lm-textarea::placeholder { color: var(--hr-input-placeholder); }
</style>
