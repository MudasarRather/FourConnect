<template>
  <SdModalShell :open="open" :eyebrow="editing ? 'EDIT RULE' : 'NEW RULE'"
    :title="editing ? form.name || 'Automation rule' : 'Create an automation rule'" width="720px" @close="$emit('close')">
    <form class="sd-form" @submit.prevent="submit">
      <div class="sd-grid2">
        <label class="sd-field"><span class="sd-label">Name <em>*</em></span>
          <input v-model="form.name" class="sd-input" placeholder="Auto-assign critical tickets" /></label>
        <label class="sd-field"><span class="sd-label">Order</span>
          <input v-model.number="form.order_index" type="number" min="0" class="sd-input" /></label>
      </div>
      <label class="sd-field"><span class="sd-label">Description</span>
        <textarea v-model="form.description" rows="2" class="sd-input" placeholder="What this rule does…" /></label>
      <div class="sd-grid2">
        <div class="sd-field">
          <span class="sd-label">Match</span>
          <SdSelect v-model="form.match_type" :options="matchOpts" placeholder="All conditions" />
        </div>
        <label class="sd-check sd-check-inline"><input type="checkbox" v-model="form.is_active" /> Active</label>
      </div>

      <!-- CONDITIONS builder -->
      <div class="sd-builder">
        <div class="sd-builder-head">
          <span class="sd-builder-title">Conditions</span>
          <button type="button" class="sd-mini-btn" @click="addCondition"><Plus :size="13" /> Add condition</button>
        </div>
        <div v-if="form.conditions.length" class="sd-builder-rows">
          <div v-for="(c, i) in form.conditions" :key="`cond-${i}`" class="sd-builder-row">
            <SdSelect v-model="c.field" :options="fieldOpts" placeholder="Field" class="sd-bcell sd-bcell-field" />
            <SdSelect v-model="c.op" :options="opOpts" placeholder="Op" class="sd-bcell sd-bcell-op" />
            <input v-model="c.value" class="sd-input sd-bcell sd-bcell-val" placeholder="Value" />
            <button type="button" class="sd-row-x" aria-label="Remove condition" @click="removeCondition(i)"><X :size="14" /></button>
          </div>
        </div>
        <p v-else class="sd-builder-empty">No conditions — rule will match every ticket.</p>
      </div>

      <!-- ACTIONS builder -->
      <div class="sd-builder">
        <div class="sd-builder-head">
          <span class="sd-builder-title">Actions</span>
          <button type="button" class="sd-mini-btn" @click="addAction"><Plus :size="13" /> Add action</button>
        </div>
        <div v-if="form.actions.length" class="sd-builder-rows">
          <div v-for="(a, i) in form.actions" :key="`act-${i}`" class="sd-builder-row">
            <SdSelect v-model="a.type" :options="actionOpts" placeholder="Action" class="sd-bcell sd-bcell-field" />
            <input v-model="a.value" class="sd-input sd-bcell sd-bcell-val" placeholder="Value" />
            <button type="button" class="sd-row-x" aria-label="Remove action" @click="removeAction(i)"><X :size="14" /></button>
          </div>
        </div>
        <p v-else class="sd-builder-empty">No actions configured yet.</p>
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
import { X, Plus } from 'lucide-vue-next'
import SdModalShell from '../components/SdModalShell.vue'
import SdSelect from '../components/SdSelect.vue'
import {
  createAutomationRule, updateAutomationRule, deleteAutomationRule,
} from '@/composables/useSupportDesk'

const props = defineProps({ open: Boolean, rule: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])

const saving = ref(false)
const error = ref('')
const editing = computed(() => !!props.rule)

const matchOpts = [
  { value: 'all', label: 'All conditions (AND)' },
  { value: 'any', label: 'Any condition (OR)' },
]
const fieldOpts = [
  { value: 'priority', label: 'Priority' },
  { value: 'category', label: 'Category' },
  { value: 'organization', label: 'Organization' },
  { value: 'ticket_type', label: 'Ticket type' },
  { value: 'source', label: 'Source' },
  { value: 'subject_contains', label: 'Subject contains' },
]
const opOpts = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'not equals' },
  { value: 'contains', label: 'contains' },
]
const actionOpts = [
  { value: 'assign_team', label: 'Assign team' },
  { value: 'assign_agent', label: 'Assign agent' },
  { value: 'set_priority', label: 'Set priority' },
  { value: 'escalate', label: 'Escalate' },
  { value: 'notify', label: 'Notify' },
]

const blank = () => ({
  name: '', description: '', match_type: 'all', order_index: 0, is_active: true,
  conditions: [], actions: [],
})
const form = ref(blank())

const normRows = (arr, keys) => (Array.isArray(arr) ? arr.map(r => {
  const out = {}
  keys.forEach(k => { out[k] = r?.[k] ?? '' })
  return out
}) : [])

watch(() => props.open, (v) => {
  if (v) {
    error.value = ''
    if (props.rule) {
      const r = props.rule
      form.value = {
        ...blank(),
        ...r,
        order_index: r.order_index ?? 0,
        conditions: normRows(r.conditions, ['field', 'op', 'value']),
        actions: normRows(r.actions, ['type', 'value']),
      }
    } else {
      form.value = blank()
    }
  }
})

const addCondition = () => form.value.conditions.push({ field: 'priority', op: 'eq', value: '' })
const removeCondition = (i) => form.value.conditions.splice(i, 1)
const addAction = () => form.value.actions.push({ type: 'assign_team', value: '' })
const removeAction = (i) => form.value.actions.splice(i, 1)

const submit = async () => {
  if (!form.value.name.trim()) { error.value = 'Name is required.'; return }
  saving.value = true; error.value = ''
  try {
    const payload = {
      name: form.value.name,
      description: form.value.description,
      match_type: form.value.match_type,
      order_index: Number(form.value.order_index) || 0,
      is_active: form.value.is_active,
      conditions: form.value.conditions,
      actions: form.value.actions,
    }
    if (editing.value) await updateAutomationRule(props.rule.id, payload)
    else await createAutomationRule(payload)
    emit('saved')
  } catch (e) { error.value = e?.response?.data?.detail || 'Save failed.' }
  finally { saving.value = false }
}
const remove = async () => {
  saving.value = true; error.value = ''
  try { await deleteAutomationRule(props.rule.id); emit('saved') }
  catch (e) { error.value = e?.response?.data?.detail || 'Delete failed.' }
  finally { saving.value = false }
}
</script>

<style scoped>
.sd-form { display: flex; flex-direction: column; gap: 13px; }
.sd-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
@media (max-width: 520px) { .sd-grid2 { grid-template-columns: 1fr; } }
.sd-field { display: flex; flex-direction: column; gap: 6px; }
.sd-label { font-size: 12px; font-weight: 600; color: var(--sd-text-secondary); }
.sd-label em { color: var(--sd-danger); font-style: normal; }
.sd-input { width: 100%; padding: 10px 13px; border-radius: 11px; font-size: 14px; font-family: inherit; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text); }
.sd-input:focus { outline: none; border-color: var(--sd-amber-border); box-shadow: 0 0 0 3px var(--sd-amber-soft); }
.sd-check { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--sd-text-secondary); }
.sd-check-inline { align-self: end; padding-bottom: 11px; }
.sd-form-error { color: var(--sd-danger); font-size: 12.5px; margin: 0; }

.sd-builder { display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 14px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.sd-builder-head { display: flex; align-items: center; justify-content: space-between; }
.sd-builder-title { font-size: 12.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--sd-text-secondary); }
.sd-mini-btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 9px; font-size: 12px; font-weight: 600; cursor: pointer; background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); color: var(--sd-amber); }
.sd-mini-btn:hover { background: color-mix(in srgb, var(--sd-amber) 20%, transparent); }
.sd-builder-rows { display: flex; flex-direction: column; gap: 9px; }
.sd-builder-row { display: flex; align-items: center; gap: 9px; }
.sd-bcell-field { flex: 1.3; min-width: 0; }
.sd-bcell-op { flex: 1; min-width: 0; }
.sd-bcell-val { flex: 1.6; min-width: 0; }
.sd-row-x { flex-shrink: 0; width: 32px; height: 32px; display: grid; place-items: center; border-radius: 9px; cursor: pointer; background: transparent; border: 1px solid var(--sd-border); color: var(--sd-text-muted); transition: all 0.2s var(--sd-spring); }
.sd-row-x:hover { color: var(--sd-danger); border-color: color-mix(in srgb, var(--sd-danger) 35%, transparent); background: var(--sd-danger-soft); }
.sd-builder-empty { font-size: 12px; color: var(--sd-text-dim); margin: 0; }
@media (max-width: 520px) { .sd-builder-row { flex-wrap: wrap; } }

.sd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.sd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sd-btn-primary { border: none; background: var(--sd-grad-hero); color: #1a1206; }
[data-theme="light"] .sd-btn-primary { color: #fff8ec; }
.sd-btn-danger { color: var(--sd-danger); border-color: color-mix(in srgb, var(--sd-danger) 35%, transparent); }
</style>
