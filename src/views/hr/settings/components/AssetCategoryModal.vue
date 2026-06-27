<template>
  <SetModal :open="open" :title="editTarget ? 'Edit asset class' : 'New asset class'"
    subtitle="Modules · Assets" :icon="Boxes" accent-color="var(--set-ember)"
    :width="940" aside-placement="side" :mode="editTarget ? 'edit' : 'create'" @close="$emit('close')">
    <div class="acm">
      <!-- live lifespan preview -->
      <Motion as="div" class="acm-pv" :data-ready="ready" :class="{ perm: isPermanent }"
        :style="{ '--fill': pvFill, '--cad': pvCad + 's' }"
        :initial="{ opacity: 0, y: 12, scale: 0.98 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }">
        <span class="acm-pv-grid" aria-hidden="true" />
        <span class="acm-pv-aura" aria-hidden="true" />

        <!-- mini column -->
        <div class="acm-pv-col">
          <span class="acm-pv-cap"><Infinity v-if="isPermanent" :size="11" /></span>
          <span class="acm-pv-cyl">
            <span v-if="!isPermanent" class="acm-pv-stream" />
            <span class="acm-pv-fluid"><span class="acm-pv-men" /></span>
          </span>
        </div>

        <div class="acm-pv-id">
          <span class="acm-pv-eyebrow">{{ isPermanent ? 'Permanent class' : 'Depreciating class' }}</span>
          <b>{{ form.name || '— class name —' }}</b>
          <span class="set-mono acm-pv-code"><Hash :size="9" />{{ form.code || 'CODE' }}<i v-if="parentName"> · under {{ parentName }}</i></span>
          <div class="acm-pv-chips">
            <span class="acm-pv-chip"><component :is="isPermanent ? Infinity : CalendarClock" :size="9" />{{ lifeChip }}</span>
            <span class="acm-pv-chip"><TrendingDown :size="9" />{{ methodChip }}</span>
            <span class="acm-pv-chip"><Tag :size="9" />{{ typesChip }}</span>
          </div>
        </div>
        <span class="acm-pv-stamp" :data-ready="ready">{{ ready ? 'Ready' : 'Draft' }}</span>
      </Motion>

      <!-- fields -->
      <div class="acm-grid">
        <Motion as="div" class="acm-f" :initial="fI" :animate="fA" :transition="fT(0)">
          <span class="acm-lab">Class name <i>*</i></span>
          <HrInput v-model="form.name" placeholder="e.g. Laptops" />
        </Motion>
        <Motion as="div" class="acm-f" :initial="fI" :animate="fA" :transition="fT(1)">
          <span class="acm-lab">Code <i>*</i></span>
          <HrInput v-model="form.code" mono placeholder="e.g. LAP" />
        </Motion>

        <Motion as="div" class="acm-f full" :initial="fI" :animate="fA" :transition="fT(2)">
          <span class="acm-lab">Parent class <i class="opt">— optional, nests into a tree</i></span>
          <SetSelect v-model="form.parent_category_id" :options="parentOptions" accent-color="var(--set-ember)"
            placeholder="No parent (top-level class)" />
          <span v-if="!hasOtherClasses" class="acm-note">
            <Info :size="11" />
            <span class="acm-note-tx">No other classes yet — create another class first, then come back to nest this one under it. Any class can be a parent.</span>
          </span>
        </Motion>

        <Motion as="div" class="acm-f full" :initial="fI" :animate="fA" :transition="fT(3)">
          <span class="acm-lab">Asset types in this class <i class="opt">— optional · empty = any type</i></span>
          <div class="acm-types">
            <button v-for="t in TYPE_CHIPS" :key="t.value" type="button" class="acm-type"
              :class="{ on: isTypeOn(t.value) }" @click="toggleType(t.value)">
              {{ t.label }}<Check v-if="isTypeOn(t.value)" :size="12" class="acm-type-check" />
            </button>
          </div>
          <span class="acm-note">
            <Info :size="11" />
            <span class="acm-note-tx" v-if="allowedCount">When registering, the Type list is <b>filtered to these {{ allowedCount }}</b> (with a "show all" escape). The first one is the default pre-fill.</span>
            <span class="acm-note-tx" v-else>Leave empty and this class accepts <b>any</b> type — nothing is pre-selected or filtered.</span>
          </span>
        </Motion>
        <Motion as="div" class="acm-f" :initial="fI" :animate="fA" :transition="fT(4)">
          <span class="acm-lab">Depreciation method</span>
          <div class="acm-seg">
            <button v-for="o in METHOD_OPTS" :key="o.value" type="button" class="acm-seg-btn"
              :class="{ on: form.depreciation_method === o.value }" @click="setMethod(o.value)">
              <component :is="o.icon" :size="13" />{{ o.label }}
            </button>
          </div>
        </Motion>

        <Motion as="div" class="acm-f" :initial="fI" :animate="fA" :transition="fT(5)">
          <span class="acm-lab">Useful life <i v-if="!isPermanent" class="opt">— months</i></span>
          <div class="acm-step" :class="{ disabled: isPermanent }">
            <button type="button" class="acm-step-btn" :disabled="isPermanent || life <= 0" @click="bump(-6)"><Minus :size="14" /></button>
            <div class="acm-step-val">
              <template v-if="isPermanent"><span class="acm-step-perm"><Infinity :size="14" /> Permanent</span></template>
              <template v-else-if="life > 0"><b>{{ life }}</b><em>mo · {{ (life / 12).toFixed(life % 12 ? 1 : 0) }}y</em></template>
              <template v-else><span class="acm-step-empty">not set</span></template>
            </div>
            <button type="button" class="acm-step-btn" :disabled="isPermanent" @click="bump(6)"><Plus :size="14" /></button>
          </div>
        </Motion>
        <Motion as="div" class="acm-f full" :initial="fI" :animate="fA" :transition="fT(6)">
          <span class="acm-lab">Status</span>
          <div class="acm-seg">
            <button type="button" class="acm-seg-btn" :class="{ on: form.is_active === true }" @click="form.is_active = true">
              <Power :size="13" />Active
            </button>
            <button type="button" class="acm-seg-btn" :class="{ on: form.is_active === false }" @click="form.is_active = false">
              <PowerOff :size="13" />Inactive
            </button>
          </div>
        </Motion>

        <Motion as="div" class="acm-f full" :initial="fI" :animate="fA" :transition="fT(7)">
          <span class="acm-lab">Description</span>
          <textarea v-model="form.description" class="acm-textarea" rows="2" placeholder="What belongs in this asset class?" />
        </Motion>
      </div>
    </div>

    <template #aside>
      <SetWorkflowRail accent="var(--set-ember)" :icon="Boxes" title="The asset-class lifecycle"
        :summary="summary" :steps="steps" :affects="affects" :actor="actor"
        :mode="editTarget ? 'edit' : 'create'" orientation="vertical" />
    </template>

    <template #footer>
      <button class="set-btn set-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="set-btn set-btn-primary" :class="{ disabled: !ready || saving }"
        :whileHover="(!ready || saving) ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
        :disabled="!ready || saving" @click="submit">
        <Loader v-if="saving" :size="14" class="set-spin" /><Check v-else :size="14" />
        {{ editTarget ? 'Save changes' : 'Create class' }}
      </Motion>
    </template>
  </SetModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  Boxes, Hash, Infinity, CalendarClock, TrendingDown, Tag, Power, PowerOff,
  Minus, Plus, Check, Loader, Layers, ShieldCheck, Database, Share2, Info,
} from 'lucide-vue-next'
import SetModal from './SetModal.vue'
import SetWorkflowRail from './SetWorkflowRail.vue'
import SetSelect from './SetSelect.vue'
import HrInput from '@/components/hr/forms/HrInput.vue'
import { MODULES } from './connectivity'
import { useActor } from '../composables/useActor'
import { ASSET_TYPES, titleCase, fetchAssetTypes } from '@/composables/useAssets'

const props = defineProps({
  open: { type: Boolean, default: false },
  editTarget: { type: Object, default: null },
  categories: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'save'])

const actor = useActor()
const METHOD_OPTS = [
  { value: 'STRAIGHT_LINE', label: 'Straight-line', icon: TrendingDown },
  { value: 'NONE', label: 'Permanent', icon: Infinity },
]

const blank = () => ({
  name: '', code: '', parent_category_id: '', allowed_asset_types: [],
  depreciation_method: 'STRAIGHT_LINE', useful_life_months: 36, is_active: true, description: '',
})
const form = ref(blank())

watch(() => props.open, (v) => {
  if (!v) return
  loadAssetTypes()
  if (props.editTarget) {
    const t = props.editTarget
    form.value = {
      name: t.name || '', code: t.code || '', parent_category_id: t.parent_category_id || '',
      allowed_asset_types: Array.isArray(t.allowed_asset_types) ? [...t.allowed_asset_types] : [],
      depreciation_method: t.depreciation_method || (t.useful_life_months ? 'STRAIGHT_LINE' : 'NONE'),
      useful_life_months: t.useful_life_months ?? null, is_active: t.is_active !== false, description: t.description || '',
    }
  } else {
    form.value = blank()
  }
}, { immediate: true })

const isPermanent = computed(() => form.value.depreciation_method === 'NONE')
const life = computed(() => Number(form.value.useful_life_months || 0))

const setMethod = (m) => {
  form.value.depreciation_method = m
  if (m === 'NONE') form.value.useful_life_months = null
  else if (!form.value.useful_life_months) form.value.useful_life_months = 36
}
const bump = (d) => {
  if (isPermanent.value) return
  form.value.useful_life_months = Math.max(0, (Number(form.value.useful_life_months || 0)) + d)
}

const parentOptions = computed(() => [
  { value: '', label: 'No parent (top-level class)' },
  ...props.categories
    .filter((c) => !props.editTarget || c.id !== props.editTarget.id)
    .map((c) => ({ value: c.id, label: c.name, hint: c.code })),
])
// Chips come from the live asset-type catalog (built-ins + custom); fall back to
// the hard-coded enum until it loads.
const assetTypes = ref([])
async function loadAssetTypes() {
  try {
    const list = await fetchAssetTypes({ is_active: true })
    assetTypes.value = Array.isArray(list) ? list : []
  } catch { assetTypes.value = [] }
}
const TYPE_CHIPS = computed(() => assetTypes.value.length
  ? assetTypes.value.map((t) => ({ value: t.code, label: t.label }))
  : ASSET_TYPES.map((t) => ({ value: t, label: titleCase(t) })))
const allowedCount = computed(() => form.value.allowed_asset_types?.length || 0)
const isTypeOn = (v) => (form.value.allowed_asset_types || []).includes(v)
const toggleType = (v) => {
  const arr = form.value.allowed_asset_types || (form.value.allowed_asset_types = [])
  const i = arr.indexOf(v)
  if (i === -1) arr.push(v); else arr.splice(i, 1)
}
const parentName = computed(() => {
  const p = props.categories.find((c) => c.id === form.value.parent_category_id)
  return p ? p.name : ''
})
// Are there any OTHER classes that could serve as a parent? (a class can't parent itself)
const hasOtherClasses = computed(() => props.categories.some((c) => !props.editTarget || c.id !== props.editTarget.id))

// preview derivations
const pvFill = computed(() => {
  if (isPermanent.value) return 78
  const l = life.value
  return Math.round(Math.min(92, Math.max(30, 30 + (l / 72) * 60)))
})
const pvCad = computed(() => {
  if (isPermanent.value) return 4
  const l = life.value
  if (!l) return 4
  return Math.min(7, Math.max(1.3, l / 9))
})
const lifeChip = computed(() => isPermanent.value ? 'Permanent' : (life.value ? `${life.value} mo life` : 'No life set'))
const methodChip = computed(() => isPermanent.value ? 'No depreciation' : 'Straight-line')
const typesChip = computed(() => {
  const n = form.value.allowed_asset_types?.length || 0
  return n ? `${n} type${n > 1 ? 's' : ''}` : 'Any type'
})

const ready = computed(() => !!form.value.name.trim() && !!form.value.code.trim())

// workflow rail
const affects = computed(() => [MODULES.assets].filter(Boolean).map((m) => ({ icon: m.icon, label: m.label })))
const summary = 'An asset class groups equipment and sets how it depreciates. The Assets module reads it on every asset registration, valuation and report.'
const steps = computed(() => props.editTarget ? [
  { icon: Layers, title: 'Adjust', text: 'Update the class — assets already filed under it keep their link.' },
  { icon: TrendingDown, title: 'Re-base depreciation', text: 'Useful life + method feed straight-line book-value going forward.' },
  { icon: Database, title: 'Update', text: 'The taxonomy entry is rewritten in place.' },
  { icon: Share2, title: 'Reflect', text: 'Inventory, valuation and reports across Assets pick up the change live.' },
] : [
  { icon: Layers, title: 'Define', text: 'Name the class, give it a short code, and (optionally) nest it under a parent.' },
  { icon: TrendingDown, title: 'Set depreciation', text: 'Straight-line over a useful life, or mark it permanent (non-depreciating).' },
  { icon: Database, title: 'Register', text: 'It joins the asset taxonomy and becomes selectable when registering assets.' },
  { icon: Share2, title: 'Power Assets', text: 'Drives categorisation, book-value and the category-distribution report.' },
])

const fI = { opacity: 0, y: 10 }
const fA = { opacity: 1, y: 0 }
const fT = (i) => ({ duration: 0.4, delay: 0.05 + i * 0.05, ease: [0.16, 1, 0.3, 1] })

const submit = () => { if (ready.value && !props.saving) emit('save', { ...form.value }) }
</script>

<style scoped>
.acm { display: flex; flex-direction: column; gap: 16px; }

.acm-pv { position: relative; overflow: hidden; display: flex; align-items: center; gap: 14px; padding: 15px 16px;
  border-radius: 15px; background: var(--set-panel); border: 1px solid var(--set-border); transition: border-color 0.3s, box-shadow 0.3s; --acc: var(--set-ember); }
.acm-pv[data-ready="true"] { border-color: color-mix(in srgb, var(--acc) 40%, transparent); box-shadow: 0 0 26px -10px color-mix(in srgb, var(--acc) 60%, transparent); }
.acm-pv.perm { --acc: var(--set-ok); }
.acm-pv-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(color-mix(in srgb, var(--acc) 7%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--acc) 7%, transparent) 1px, transparent 1px);
  background-size: 22px 22px; mask-image: radial-gradient(110% 100% at 100% 0%, #000 18%, transparent 78%); -webkit-mask-image: radial-gradient(110% 100% at 100% 0%, #000 18%, transparent 78%); }
.acm-pv-aura { position: absolute; inset: -50% 30% auto -10%; height: 90%; background: radial-gradient(circle, color-mix(in srgb, var(--acc) 22%, transparent), transparent 70%); filter: blur(22px); pointer-events: none; }

.acm-pv-col { position: relative; display: flex; flex-direction: column; align-items: center; width: 30px; height: 58px; flex-shrink: 0; }
.acm-pv-cap { position: relative; width: 52%; height: 5px; border-radius: 3px 3px 0 0; background: linear-gradient(180deg, color-mix(in srgb, var(--acc) 55%, transparent), transparent); }
.acm-pv-cap :deep(svg) { position: absolute; left: 50%; top: -15px; transform: translateX(-50%); color: var(--set-ok); }
.acm-pv-cyl { position: relative; width: 24px; flex: 1; border-radius: 6px 6px 4px 4px; overflow: hidden; border: 1px solid var(--set-border-strong); border-top: 0;
  background: linear-gradient(90deg, rgba(255,255,255,0.05), rgba(0,0,0,0.12)); }
.acm-pv-fluid { position: absolute; left: 0; right: 0; bottom: 0; height: calc(var(--fill, 60) * 1%);
  background: linear-gradient(180deg, color-mix(in srgb, var(--acc) 78%, transparent), color-mix(in srgb, var(--acc) 40%, transparent)); transition: height 0.6s var(--set-spring); }
.acm-pv-men { position: absolute; left: -10%; right: -10%; top: -2px; height: 4px; border-radius: 50%; background: color-mix(in srgb, var(--acc) 70%, white 18%); box-shadow: 0 0 7px -1px var(--acc); animation: acm-rip 3.2s ease-in-out infinite; }
.acm-pv-stream { position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: 2px; height: calc((100 - var(--fill, 60)) * 1%); overflow: hidden;
  -webkit-mask-image: linear-gradient(180deg, transparent, #000 30%); mask-image: linear-gradient(180deg, transparent, #000 30%); }
.acm-pv-stream::after { content: ''; position: absolute; left: -1px; right: -1px; top: -40%; height: 40%;
  background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--acc) 90%, white 30%), transparent); animation: acm-meter var(--cad, 4s) linear infinite; }

.acm-pv-id { position: relative; flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.acm-pv-eyebrow { font-size: 8.5px; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase; color: color-mix(in srgb, var(--acc) 62%, var(--set-text-dim)); }
.acm-pv-id b { font-size: 15px; font-weight: 850; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.acm-pv-code { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; color: var(--set-text-muted); }
.acm-pv-code i { font-style: normal; }
.acm-pv-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 3px; }
.acm-pv-chip { display: inline-flex; align-items: center; gap: 3px; font-size: 9px; font-weight: 700; color: var(--set-text-secondary);
  padding: 2px 7px; border-radius: 7px; background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.acm-pv-chip :deep(svg) { color: var(--acc); }
.acm-pv-stamp { position: relative; align-self: flex-start; font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 3px 9px; border-radius: 999px; flex-shrink: 0; color: var(--set-unset); background: var(--set-unset-soft); border: 1px solid var(--set-border); }
.acm-pv-stamp[data-ready="true"] { color: var(--set-ok); background: var(--set-ok-soft); border-color: color-mix(in srgb, var(--set-ok) 36%, transparent); }

.acm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
@media (max-width: 560px) { .acm-grid { grid-template-columns: 1fr; } }
.acm-f { display: flex; flex-direction: column; gap: 6px; }
.acm-f.full { grid-column: 1 / -1; }
.acm-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-dim); }
.acm-lab i { color: var(--set-conflict); font-style: normal; margin-left: 2px; }
.acm-lab i.opt { color: var(--set-text-dim); text-transform: none; letter-spacing: 0; font-weight: 600; }
.acm-note { display: flex; align-items: flex-start; gap: 6px; margin-top: 2px; font-size: 10.5px; line-height: 1.5; color: var(--set-text-muted); }
.acm-note :deep(svg) { color: var(--set-ember); flex-shrink: 0; margin-top: 1.5px; }
.acm-note-tx { min-width: 0; }
.acm-note b { color: var(--set-text-secondary); font-weight: 800; }

.acm-types { display: flex; flex-wrap: wrap; gap: 7px; }
.acm-type { display: inline-flex; align-items: center; gap: 5px; padding: 7px 12px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 650;
  color: var(--set-text-muted); background: var(--set-surface); border: 1px solid var(--set-border); transition: all 0.18s var(--set-spring); }
.acm-type:hover { color: var(--set-text); border-color: var(--set-border-strong); transform: translateY(-1px); }
.acm-type.on { color: var(--set-ember); background: color-mix(in srgb, var(--set-ember) 13%, transparent); border-color: color-mix(in srgb, var(--set-ember) 38%, transparent); }
.acm-type-check { color: var(--set-ember); }

.acm-seg { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 7px; }
.acm-seg-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 6px; border-radius: 10px; cursor: pointer;
  font: inherit; font-size: 12px; font-weight: 700; color: var(--set-text-muted); background: var(--set-surface); border: 1px solid var(--set-border); transition: all 0.2s; }
.acm-seg-btn :deep(svg) { opacity: 0.8; }
.acm-seg-btn.on { color: var(--set-ember); background: color-mix(in srgb, var(--set-ember) 12%, transparent); border-color: color-mix(in srgb, var(--set-ember) 36%, transparent); }

.acm-step { display: flex; align-items: center; gap: 8px; padding: 5px; border-radius: 11px; background: var(--set-surface); border: 1px solid var(--set-border); }
.acm-step.disabled { opacity: 0.7; }
.acm-step-btn { width: 34px; height: 34px; border-radius: 9px; display: grid; place-items: center; cursor: pointer; flex-shrink: 0;
  color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.18s; }
.acm-step-btn:hover:not(:disabled) { color: var(--set-ember); border-color: color-mix(in srgb, var(--set-ember) 38%, transparent); transform: translateY(-1px); }
.acm-step-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.acm-step-val { flex: 1; display: flex; align-items: baseline; justify-content: center; gap: 6px; min-width: 0; }
.acm-step-val b { font-size: 19px; font-weight: 850; color: var(--set-text); font-variant-numeric: tabular-nums; }
.acm-step-val em { font-style: normal; font-size: 11px; color: var(--set-text-muted); }
.acm-step-empty { font-size: 12px; color: var(--set-text-dim); }
.acm-step-perm { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 800; color: var(--set-ok); }

.acm-textarea { width: 100%; resize: vertical; min-height: 60px; padding: 10px 12px; border-radius: 10px; font: inherit; font-size: 13px;
  color: var(--hr-input-text); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s, background 0.2s; }
.acm-textarea:focus { outline: none; background: var(--hr-input-bg-focus); border-color: var(--hr-input-border-focus); }
.acm-textarea::placeholder { color: var(--hr-input-placeholder); }

[data-theme="light"] .acm-pv-cyl { background: linear-gradient(90deg, rgba(40,25,10,0.05), rgba(40,25,10,0.08)); }

@keyframes acm-rip { 0%, 100% { transform: scaleX(1); opacity: 0.85; } 50% { transform: scaleX(0.9); opacity: 1; } }
@keyframes acm-meter { 0% { top: -40%; } 100% { top: 100%; } }
@media (prefers-reduced-motion: reduce) { .acm-pv-men, .acm-pv-stream::after { animation: none; } .acm-pv-fluid { transition: none; } }
</style>
