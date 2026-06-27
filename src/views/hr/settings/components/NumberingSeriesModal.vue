<template>
  <SetModal :open="open" :title="isEdit ? 'Edit numbering series' : 'Configure numbering'"
    :subtitle="moduleMeta?.label" :icon="Hash" accent-color="var(--set-ember)" :width="920"
    :mode="isEdit ? 'edit' : 'create'" @close="$emit('close')">
    <div class="nsm">
      <!-- live minted-plate preview -->
      <div class="nsm-stage">
        <span class="nsm-stage-grid" aria-hidden="true" />
        <div class="nsm-plate" :class="{ ready }">
          <span class="nsm-plate-stamp" :class="{ ready }">{{ ready ? 'READY' : 'DRAFT' }}</span>
          <span class="nsm-plate-lab">Next identifier preview</span>
          <b class="nsm-plate-id set-mono" :key="livePreview">{{ livePreview }}</b>
          <div class="nsm-anatomy">
            <Motion v-for="(t, i) in anatomy" :key="t.key" as="span" class="nsm-tok" :class="{ on: t.on }"
              :animate="{ opacity: t.on ? 1 : 0.4, y: 0 }" :initial="{ opacity: 0, y: 6 }"
              :transition="{ duration: 0.3, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }">
              <i>{{ t.label }}</i><b v-if="t.on && t.value">{{ t.value }}</b>
            </Motion>
          </div>
          <span class="nsm-plate-foot"><component :is="down.icon || Hash" :size="11" /> Mints IDs for {{ down.label }}</span>
        </div>
      </div>

      <!-- format -->
      <div class="nsm-sect">
        <span class="nsm-sect-lab"><Type :size="12" /> Format</span>
        <div class="nsm-grid">
          <label class="nsm-field"><span class="nsm-lab">Prefix</span>
            <HrInput v-model="form.prefix" mono placeholder="EMP" :maxlength="20" />
          </label>
          <label class="nsm-field"><span class="nsm-lab">Separator</span>
            <SetSelect v-model="form.separator" :options="SEPARATORS" accent-color="var(--set-ember)" placeholder="None" />
          </label>
          <label class="nsm-field"><span class="nsm-lab">Suffix</span>
            <HrInput v-model="form.suffix" mono placeholder="(optional)" :maxlength="20" />
          </label>
        </div>
      </div>

      <!-- counter -->
      <div class="nsm-sect">
        <span class="nsm-sect-lab"><Binary :size="12" /> Counter</span>
        <div class="nsm-grid">
          <div class="nsm-field"><span class="nsm-lab">Counter width <i class="nsm-hint">zero-pad</i></span>
            <div class="nsm-step">
              <button type="button" @click="bump('padding', -1, 0, 10)"><Minus :size="14" /></button>
              <b>{{ form.padding }}</b>
              <button type="button" @click="bump('padding', 1, 0, 10)"><Plus :size="14" /></button>
            </div>
          </div>
          <div class="nsm-field"><span class="nsm-lab">Start counter <i class="nsm-hint">last issued</i></span>
            <div class="nsm-step wide">
              <button type="button" @click="bump('current_number', -1, 0, 9999999)"><Minus :size="14" /></button>
              <b>{{ form.current_number }}</b>
              <button type="button" @click="bump('current_number', 1, 0, 9999999)"><Plus :size="14" /></button>
            </div>
          </div>
        </div>
      </div>

      <!-- date tokens + reset -->
      <div class="nsm-sect">
        <span class="nsm-sect-lab"><CalendarDays :size="12" /> Date tokens & reset</span>
        <div class="nsm-toggles">
          <button type="button" class="nsm-toggle" :class="{ on: form.include_year }" @click="form.include_year = !form.include_year">
            <span class="nsm-knob" /> Include year
          </button>
          <button type="button" class="nsm-toggle" :class="{ on: form.include_month }" @click="form.include_month = !form.include_month">
            <span class="nsm-knob" /> Include month
          </button>
        </div>
        <label class="nsm-field"><span class="nsm-lab">Reset policy</span>
          <SetSelect v-model="form.financial_year_reset" :options="RESET" accent-color="var(--set-ember)" />
        </label>
      </div>

      <!-- active -->
      <div class="nsm-active" :class="{ on: form.is_active }">
        <div class="nsm-active-txt">
          <component :is="form.is_active ? Power : PowerOff" :size="15" />
          <div>
            <b>{{ form.is_active ? 'Active — minting from this series' : 'Paused — falls back to built-in auto-ID' }}</b>
            <span>{{ form.is_active ? 'New records in this module take their ID from this format.' : 'The series is kept, but IDs use the legacy sequence until re-activated.' }}</span>
          </div>
        </div>
        <button type="button" class="nsm-toggle" :class="{ on: form.is_active }" @click="form.is_active = !form.is_active"><span class="nsm-knob" /></button>
      </div>
    </div>

    <template #aside>
      <SetWorkflowRail accent="var(--set-ember)" :icon="Hash" title="How identifiers are minted"
        :summary="summary" :steps="STEPS" :affects="affects"
        :note="isEdit ? 'Changing the format or counter never renumbers existing records — only IDs issued from now on follow the new pattern.' : ''"
        :actor="actor" :mode="isEdit ? 'edit' : 'create'" />
    </template>

    <template #footer>
      <button class="set-btn set-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="set-btn set-btn-primary" :class="{ disabled: saving }"
        :whileHover="saving ? {} : { y: -2, scale: 1.02 }" :whileTap="saving ? {} : { scale: 0.97 }" :disabled="saving" @click="submit">
        <Loader v-if="saving" :size="14" class="set-spin" /><Check v-else :size="14" />
        {{ isEdit ? 'Save series' : 'Configure series' }}
      </Motion>
    </template>
  </SetModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { Hash, Type, Binary, CalendarDays, Plus, Minus, Check, Loader, Power, PowerOff, RotateCcw } from 'lucide-vue-next'
import SetModal from './SetModal.vue'
import SetSelect from './SetSelect.vue'
import SetWorkflowRail from './SetWorkflowRail.vue'
import HrInput from '@/components/hr/forms/HrInput.vue'
import { useActor } from '../composables/useActor'
import { fmtPreview, tokenAnatomy, downstreamOf } from '../composables/numberingFormat'

const props = defineProps({
  open: { type: Boolean, default: false },
  editTarget: { type: Object, default: null },     // existing series row or null
  moduleMeta: { type: Object, default: null },     // { module, label, sample_prefix }
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'save'])

const actor = useActor()
const isEdit = computed(() => !!props.editTarget)

const SEPARATORS = [
  { value: '', label: 'None', hint: 'EMP20260001' },
  { value: '-', label: 'Hyphen', hint: 'EMP-2026-0001' },
  { value: '/', label: 'Slash', hint: 'EMP/2026/0001' },
  { value: '.', label: 'Dot', hint: 'EMP.2026.0001' },
  { value: '_', label: 'Underscore', hint: 'EMP_2026_0001' },
]
const RESET = [
  { value: false, label: 'Never resets', icon: Hash, hint: 'The counter only ever climbs' },
  { value: true, label: 'Resets every financial year', icon: RotateCcw, hint: 'Restarts at 1 each April (India FY)' },
]
const STEPS = [
  { icon: Type, title: 'Compose', text: 'Tokens assemble in order — prefix → year → month → counter → suffix — joined by your separator.' },
  { icon: Binary, title: 'Pad', text: 'The running counter is zero-padded to the chosen width, so 7 at width 4 prints as 0007.' },
  { icon: RotateCcw, title: 'Reset', text: 'Optionally restart the counter every financial year to keep IDs year-scoped.' },
  { icon: Hash, title: 'Issue', text: 'Each new record is stamped with the next ID, replacing the built-in auto-ID for this module.' },
]

const blank = () => ({
  prefix: props.moduleMeta?.sample_prefix || '', separator: '', suffix: '',
  padding: 4, current_number: 0, include_year: false, include_month: false,
  financial_year_reset: false, is_active: true,
})
const form = ref(blank())

watch(() => props.open, (v) => {
  if (!v) return
  const t = props.editTarget
  form.value = t
    ? {
        prefix: t.prefix || '', separator: t.separator || '', suffix: t.suffix || '',
        padding: t.padding ?? 4, current_number: t.current_number ?? 0,
        include_year: !!t.include_year, include_month: !!t.include_month,
        financial_year_reset: !!t.financial_year_reset, is_active: t.is_active !== false,
      }
    : blank()
})

function bump(key, delta, min, max) {
  const v = (Number(form.value[key]) || 0) + delta
  form.value[key] = Math.min(max, Math.max(min, v))
}

const livePreview = computed(() => fmtPreview(form.value, (Number(form.value.current_number) || 0) + 1))
const anatomy = computed(() => tokenAnatomy(form.value))
const ready = computed(() => !!form.value.prefix || form.value.include_year || form.value.include_month || !!form.value.suffix)
const down = computed(() => downstreamOf(props.moduleMeta?.module || ''))
const affects = computed(() => (down.value.key ? [{ icon: down.value.icon, label: down.value.label }] : []))
const summary = computed(() => `A numbering series defines the auto-generated identifier for ${props.moduleMeta?.label || 'this module'} — its prefix, date tokens, counter width and reset policy.`)

function submit() {
  if (props.saving) return
  emit('save', {
    module: props.moduleMeta?.module,
    prefix: form.value.prefix || '',
    separator: form.value.separator || '',
    suffix: form.value.suffix || '',
    padding: Number(form.value.padding) || 0,
    current_number: Number(form.value.current_number) || 0,
    include_year: !!form.value.include_year,
    include_month: !!form.value.include_month,
    financial_year_reset: !!form.value.financial_year_reset,
    is_active: !!form.value.is_active,
  })
}
</script>

<style scoped>
.nsm { display: flex; flex-direction: column; gap: 16px; }

/* live plate */
.nsm-stage { position: relative; overflow: hidden; padding: 18px; border-radius: 16px;
  background: linear-gradient(150deg, color-mix(in srgb, var(--set-ember) 12%, var(--set-panel)), var(--set-panel));
  border: 1px solid color-mix(in srgb, var(--set-ember) 26%, transparent); }
.nsm-stage-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(color-mix(in srgb, var(--set-ember) 8%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--set-ember) 8%, transparent) 1px, transparent 1px);
  background-size: 22px 22px; mask-image: radial-gradient(120% 100% at 100% 0%, #000 16%, transparent 78%);
  -webkit-mask-image: radial-gradient(120% 100% at 100% 0%, #000 16%, transparent 78%); }
.nsm-plate { position: relative; display: flex; flex-direction: column; gap: 8px; }
.nsm-plate-stamp { position: absolute; top: -4px; right: 0; font-size: 9px; font-weight: 900; letter-spacing: 0.18em; padding: 4px 10px;
  border-radius: 7px; transform: rotate(4deg); color: var(--set-unset); border: 2px solid color-mix(in srgb, var(--set-unset) 40%, transparent);
  transition: all 0.4s var(--set-spring); }
.nsm-plate-stamp.ready { color: var(--set-ok); border-color: color-mix(in srgb, var(--set-ok) 55%, transparent); transform: rotate(-3deg) scale(1.04); }
.nsm-plate-lab { font-size: 9px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--set-text-dim); }
.nsm-plate-id { font-size: 30px; font-weight: 850; letter-spacing: 0.08em; color: var(--set-ember); word-break: break-all;
  text-shadow: 0 0 22px color-mix(in srgb, var(--set-ember) 28%, transparent); animation: nsm-pop 0.35s var(--set-spring); }
@keyframes nsm-pop { from { opacity: 0.4; transform: translateY(4px); } to { opacity: 1; transform: none; } }
.nsm-anatomy { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
.nsm-tok { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 7px;
  background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.nsm-tok i { font-style: normal; font-family: var(--set-mono); font-size: 8.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--set-text-dim); }
.nsm-tok.on { border-color: color-mix(in srgb, var(--set-ember) 30%, transparent); }
.nsm-tok.on i { color: var(--set-ember); }
.nsm-tok b { font-family: var(--set-mono); font-size: 11px; font-weight: 800; color: var(--set-text); }
.nsm-plate-foot { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; color: var(--set-text-muted); margin-top: 2px; }
.nsm-plate-foot :deep(svg) { color: var(--set-ember); }

/* sections */
.nsm-sect { display: flex; flex-direction: column; gap: 10px; }
.nsm-sect-lab { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.nsm-sect-lab :deep(svg) { color: var(--set-ember); }
.nsm-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.nsm-field { display: flex; flex-direction: column; gap: 6px; }
.nsm-lab { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--set-text-dim); }
.nsm-hint { font-style: normal; font-size: 9px; font-weight: 600; letter-spacing: 0; text-transform: none; color: var(--set-text-dim); opacity: 0.8; }

.nsm-step { display: inline-flex; align-items: center; border-radius: 11px; overflow: hidden; border: 1px solid var(--hr-input-border); background: var(--hr-input-bg); height: var(--hr-input-height, 42px); }
.nsm-step button { width: 42px; height: 100%; border: 0; background: transparent; color: var(--set-text-muted); cursor: pointer; display: grid; place-items: center; transition: background 0.2s, color 0.2s; }
.nsm-step button:hover { background: color-mix(in srgb, var(--set-ember) 14%, transparent); color: var(--set-ember); }
.nsm-step b { flex: 1; min-width: 48px; text-align: center; font-family: var(--set-mono); font-size: 15px; font-weight: 800; color: var(--set-text); }

.nsm-toggles { display: flex; flex-wrap: wrap; gap: 8px; }
.nsm-toggle { display: inline-flex; align-items: center; gap: 9px; padding: 8px 13px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 600;
  color: var(--set-text-muted); background: var(--set-surface); border: 1px solid var(--set-border); transition: all 0.25s var(--set-spring); }
.nsm-knob { position: relative; width: 30px; height: 17px; border-radius: 999px; background: var(--set-unset-soft); border: 1px solid var(--set-border); transition: all 0.25s var(--set-spring); flex-shrink: 0; }
.nsm-knob::after { content: ''; position: absolute; top: 1px; left: 1px; width: 13px; height: 13px; border-radius: 50%; background: var(--set-unset); transition: all 0.25s var(--set-spring); }
.nsm-toggle.on { color: var(--set-ember); background: color-mix(in srgb, var(--set-ember) 12%, transparent); border-color: color-mix(in srgb, var(--set-ember) 34%, transparent); }
.nsm-toggle.on .nsm-knob { background: color-mix(in srgb, var(--set-ember) 30%, transparent); border-color: color-mix(in srgb, var(--set-ember) 40%, transparent); }
.nsm-toggle.on .nsm-knob::after { left: 14px; background: var(--set-ember); box-shadow: 0 0 8px var(--set-ember); }

.nsm-active { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 13px 15px; border-radius: 14px;
  background: var(--set-panel); border: 1px solid var(--set-border); transition: border-color 0.3s; }
.nsm-active.on { border-color: color-mix(in srgb, var(--set-ok) 30%, transparent); }
.nsm-active-txt { display: flex; align-items: flex-start; gap: 10px; min-width: 0; }
.nsm-active-txt > :deep(svg) { color: var(--set-unset); flex-shrink: 0; margin-top: 1px; }
.nsm-active.on .nsm-active-txt > :deep(svg) { color: var(--set-ok); }
.nsm-active-txt b { display: block; font-size: 12.5px; font-weight: 750; color: var(--set-text); }
.nsm-active-txt span { font-size: 11px; line-height: 1.4; color: var(--set-text-muted); }
.nsm-active .nsm-toggle { padding: 0; width: auto; background: transparent; border: 0; }
.nsm-active .nsm-knob { width: 38px; height: 21px; }
.nsm-active .nsm-knob::after { width: 17px; height: 17px; }
.nsm-active .nsm-toggle.on .nsm-knob { background: var(--set-ok-soft); border-color: color-mix(in srgb, var(--set-ok) 40%, transparent); }
.nsm-active .nsm-toggle.on .nsm-knob::after { left: 18px; background: var(--set-ok); box-shadow: 0 0 8px var(--set-ok); }

@media (prefers-reduced-motion: reduce) { .nsm-plate-id { animation: none; } }
</style>
