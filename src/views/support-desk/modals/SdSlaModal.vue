<template>
  <SdModalShell :open="open" :eyebrow="editing ? 'EDIT SLA PACKAGE' : 'NEW SLA PACKAGE'"
    :title="editing ? form.name || 'SLA package' : 'Add an SLA package'" width="720px" @close="$emit('close')">
    <form class="sd-form" @submit.prevent="submit">
      <div class="sd-grid2">
        <label class="sd-field"><span class="sd-label">Name <em>*</em></span>
          <input v-model="form.name" class="sd-input" placeholder="Premium 24x7" /></label>
        <div class="sd-checks">
          <label class="sd-check"><input type="checkbox" v-model="form.is_default" /> Default package</label>
          <label class="sd-check"><input type="checkbox" v-model="form.is_active" /> Active</label>
        </div>
      </div>
      <label class="sd-field"><span class="sd-label">Description</span>
        <textarea v-model="form.description" rows="2" class="sd-input" placeholder="When this SLA applies…" /></label>

      <div class="sd-section">
        <div class="sd-section-head">
          <span class="sd-section-title">Response / Resolution matrix</span>
          <span class="sd-section-hint">minutes</span>
        </div>
        <div class="sd-matrix">
          <div class="sd-matrix-head">
            <span>Priority</span>
            <span>Response</span>
            <span>Resolution</span>
          </div>
          <div v-for="p in PRIORITY_ORDER" :key="p.key" class="sd-matrix-row">
            <span class="sd-matrix-prio" :style="{ '--pc': `var(--sd-pri-${p.key})` }">
              <span class="sd-matrix-dot" />{{ p.label }}
            </span>
            <input
              type="number" min="0" step="1" class="sd-input sd-input-num"
              v-model.number="form.matrix[p.key].response_mins" placeholder="0"
            />
            <input
              type="number" min="0" step="1" class="sd-input sd-input-num"
              v-model.number="form.matrix[p.key].resolution_mins" placeholder="0"
            />
          </div>
        </div>
      </div>

      <div class="sd-section">
        <div class="sd-section-head">
          <span class="sd-section-title">Escalation ladder</span>
          <button type="button" class="sd-mini-btn" @click="addLevel"><Plus :size="13" /> Add level</button>
        </div>
        <div v-if="form.escalation_levels.length" class="sd-esc">
          <div class="sd-esc-head">
            <span>Level</span>
            <span>After (mins)</span>
            <span>Notify</span>
            <span />
          </div>
          <div v-for="(lvl, idx) in form.escalation_levels" :key="idx" class="sd-esc-row">
            <input type="number" min="0" step="1" class="sd-input sd-input-num" v-model.number="lvl.level" placeholder="1" />
            <input type="number" min="0" step="1" class="sd-input sd-input-num" v-model.number="lvl.after_mins" placeholder="60" />
            <input type="text" class="sd-input" v-model="lvl.notify" placeholder="Team lead / email" />
            <button type="button" class="sd-row-x" aria-label="Remove level" @click="removeLevel(idx)"><Trash2 :size="14" /></button>
          </div>
        </div>
        <p v-else class="sd-esc-empty">No escalation levels — add one to notify when an SLA is at risk.</p>
      </div>

      <p v-if="error" class="sd-form-error">{{ error }}</p>
    </form>
    <template #footer>
      <button v-if="editing" class="sd-btn sd-btn-danger" type="button" :disabled="saving" @click="remove">Delete</button>
      <span style="flex:1" />
      <button class="sd-btn" type="button" @click="$emit('close')">Cancel</button>
      <button class="sd-btn sd-btn-primary" type="button" :disabled="saving || !form.name.trim()" @click="submit">
        {{ saving ? 'Saving…' : (editing ? 'Save changes' : 'Create') }}
      </button>
    </template>
  </SdModalShell>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'
import SdModalShell from '../components/SdModalShell.vue'
import { createSlaPackage, updateSlaPackage, deleteSlaPackage } from '@/composables/useSupportDesk'

const props = defineProps({ open: Boolean, package: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])

const PRIORITY_ORDER = [
  { key: 'critical', label: 'Critical' },
  { key: 'urgent', label: 'Urgent' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
]

// Sensible defaults seeded for a brand-new package.
const DEFAULT_MATRIX = {
  critical: { response_mins: 15, resolution_mins: 240 },
  urgent: { response_mins: 30, resolution_mins: 480 },
  high: { response_mins: 60, resolution_mins: 1440 },
  medium: { response_mins: 240, resolution_mins: 2880 },
  low: { response_mins: 480, resolution_mins: 4320 },
}

const saving = ref(false)
const error = ref('')
const editing = computed(() => !!props.package)

const blankMatrix = (src) => {
  const out = {}
  for (const p of PRIORITY_ORDER) {
    const cell = (src && src[p.key]) || {}
    out[p.key] = {
      response_mins: Number.isFinite(Number(cell.response_mins)) ? Number(cell.response_mins) : (DEFAULT_MATRIX[p.key].response_mins),
      resolution_mins: Number.isFinite(Number(cell.resolution_mins)) ? Number(cell.resolution_mins) : (DEFAULT_MATRIX[p.key].resolution_mins),
    }
  }
  return out
}

const blank = () => ({
  name: '', description: '', is_default: false, is_active: true,
  matrix: blankMatrix(null),
  escalation_levels: [],
})

const form = ref(blank())

watch(() => props.open, (v) => {
  if (!v) return
  error.value = ''
  if (props.package) {
    const src = props.package
    form.value = {
      name: src.name || '',
      description: src.description || '',
      is_default: !!src.is_default,
      is_active: src.is_active !== false,
      matrix: blankMatrix(src.matrix),
      escalation_levels: Array.isArray(src.escalation_levels)
        ? src.escalation_levels.map((l, i) => ({
            level: Number.isFinite(Number(l.level)) ? Number(l.level) : (i + 1),
            after_mins: Number.isFinite(Number(l.after_mins)) ? Number(l.after_mins) : 0,
            notify: l.notify ?? '',
          }))
        : [],
    }
  } else {
    form.value = blank()
  }
})

const addLevel = () => {
  const next = form.value.escalation_levels.length + 1
  form.value.escalation_levels.push({ level: next, after_mins: 60, notify: '' })
}
const removeLevel = (idx) => { form.value.escalation_levels.splice(idx, 1) }

const buildPayload = () => ({
  name: form.value.name.trim(),
  description: form.value.description,
  is_default: form.value.is_default,
  is_active: form.value.is_active,
  matrix: form.value.matrix,
  escalation_levels: form.value.escalation_levels.map(l => ({
    level: Number(l.level) || 0,
    after_mins: Number(l.after_mins) || 0,
    notify: l.notify || '',
  })),
})

const submit = async () => {
  if (!form.value.name.trim()) { error.value = 'Name is required.'; return }
  saving.value = true; error.value = ''
  try {
    const payload = buildPayload()
    if (editing.value) await updateSlaPackage(props.package.id, payload)
    else await createSlaPackage(payload)
    emit('saved')
  } catch (e) { error.value = e?.response?.data?.detail || 'Save failed.' }
  finally { saving.value = false }
}
const remove = async () => {
  saving.value = true; error.value = ''
  try { await deleteSlaPackage(props.package.id); emit('saved') }
  catch (e) { error.value = e?.response?.data?.detail || 'Delete failed.' }
  finally { saving.value = false }
}
</script>

<style scoped>
.sd-form { display: flex; flex-direction: column; gap: 14px; }
.sd-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; align-items: end; }
@media (max-width: 560px) { .sd-grid2 { grid-template-columns: 1fr; } }
.sd-field { display: flex; flex-direction: column; gap: 6px; }
.sd-label { font-size: 12px; font-weight: 600; color: var(--sd-text-secondary); }
.sd-label em { color: var(--sd-danger); font-style: normal; }
.sd-input { width: 100%; padding: 10px 13px; border-radius: 11px; font-size: 14px; font-family: inherit; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text); }
.sd-input:focus { outline: none; border-color: var(--sd-amber-border); box-shadow: 0 0 0 3px var(--sd-amber-soft); }
.sd-input-num { font-family: var(--sd-mono); }
.sd-checks { display: flex; flex-direction: column; gap: 9px; padding-bottom: 4px; }
.sd-check { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--sd-text-secondary); }
.sd-form-error { color: var(--sd-danger); font-size: 12.5px; margin: 0; }

.sd-section { display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 14px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.sd-section-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.sd-section-title { font-size: 13px; font-weight: 700; color: var(--sd-text); }
.sd-section-hint { font-family: var(--sd-mono); font-size: 10.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--sd-text-dim); }
.sd-mini-btn { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 8px; font-size: 11.5px; font-weight: 600; cursor: pointer; background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); color: var(--sd-amber); }

.sd-matrix { display: flex; flex-direction: column; gap: 7px; }
.sd-matrix-head, .sd-matrix-row { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 10px; align-items: center; }
.sd-matrix-head { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--sd-text-dim); padding: 0 2px; }
.sd-matrix-prio { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--pc); }
.sd-matrix-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--pc); box-shadow: 0 0 8px color-mix(in srgb, var(--pc) 55%, transparent); flex-shrink: 0; }

.sd-esc { display: flex; flex-direction: column; gap: 8px; }
.sd-esc-head, .sd-esc-row { display: grid; grid-template-columns: 0.7fr 0.9fr 1.6fr 36px; gap: 9px; align-items: center; }
.sd-esc-head { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--sd-text-dim); padding: 0 2px; }
.sd-row-x { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 9px; cursor: pointer; background: transparent; border: 1px solid var(--sd-border); color: var(--sd-text-muted); transition: all 0.2s var(--sd-spring); }
.sd-row-x:hover { color: var(--sd-danger); border-color: color-mix(in srgb, var(--sd-danger) 40%, transparent); background: var(--sd-danger-soft); }
.sd-esc-empty { font-size: 12.5px; color: var(--sd-text-muted); margin: 0; }

.sd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.sd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sd-btn-primary { border: none; background: var(--sd-grad-hero); color: #1a1206; }
[data-theme="light"] .sd-btn-primary { color: #fff8ec; }
.sd-btn-danger { color: var(--sd-danger); border-color: color-mix(in srgb, var(--sd-danger) 35%, transparent); }
</style>
