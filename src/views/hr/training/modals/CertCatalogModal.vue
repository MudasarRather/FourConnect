<template>
  <TrnModal :open="open" title="Certification catalog"
    subtitle="The master list of known credentials — reused when awarding to employees." :icon="Library" @close="$emit('close')">

    <div class="cm-wrap">
      <!-- ── composer ── -->
      <section class="cm-form">
        <header class="cm-form-head">
          <span class="cm-form-ic"><component :is="editingId ? Pencil : Plus" :size="14" /></span>
          <span class="cm-form-title">{{ editingId ? 'Edit credential' : 'New credential' }}</span>
          <span v-if="editingId" class="cm-form-tag">editing</span>
          <span class="cm-form-count trn-mono">{{ list.length }} in catalog</span>
        </header>

        <div class="cm-form-grid">
          <TrnField v-model="form.name" label="Name" required placeholder="e.g. PMP" class="cm-span2" />
          <TrnField v-model="form.code" label="Code" placeholder="optional" />
          <TrnSelect v-model="form.category" label="Category" :options="categoryOptions" placeholder="— uncategorised —" />
          <TrnField v-model="form.issuing_authority" label="Issuing authority" placeholder="e.g. PMI" class="cm-span2" />
          <label class="cm-validity">
            <span class="cm-validity-lab">Validity</span>
            <div class="cm-validity-ctrl" :class="{ filled: form.validity_months > 0 }">
              <button type="button" class="cm-step" :disabled="!(form.validity_months > 0)" @click="bumpValidity(-1)" aria-label="Decrease"><Minus :size="13" /></button>
              <input type="number" min="0" step="1" inputmode="numeric" :value="form.validity_months ?? ''"
                placeholder="e.g. 36" @input="onValidity($event)" />
              <span class="cm-validity-unit">mo</span>
              <button type="button" class="cm-step" @click="bumpValidity(1)" aria-label="Increase"><Plus :size="13" /></button>
            </div>
          </label>
          <TrnField v-model="form.description" label="Description" type="textarea" :rows="2" placeholder="optional" class="cm-span2" />
        </div>

        <div class="cm-form-foot">
          <span v-if="validityYears" class="cm-validity-hint"><Clock :size="12" /> {{ validityYears }} renewal cycle</span>
          <span v-else class="cm-validity-hint dim"><InfinityIcon :size="12" /> never expires</span>
          <div class="cm-form-actions">
            <button v-if="editingId" class="trn-btn trn-btn-ghost" @click="resetForm">Cancel edit</button>
            <Motion as="button" class="trn-btn trn-btn-primary" :disabled="!form.name || saving"
              :whileHover="!form.name || saving ? {} : { y: -2 }" :whileTap="{ scale: 0.97 }" @click="save">
              <Loader v-if="saving" :size="14" class="spin" />
              <component v-else :is="editingId ? Check : Plus" :size="14" />
              {{ editingId ? 'Save credential' : 'Add to catalog' }}
            </Motion>
          </div>
        </div>
      </section>

      <!-- ── list ── -->
      <div v-if="loading" class="cm-list">
        <div v-for="n in 4" :key="n" class="trn-skel" style="height: 56px; border-radius: 13px" />
      </div>

      <div v-else-if="!list.length" class="cm-blank">
        <span class="cm-blank-ic"><Library :size="20" /></span>
        <p>Empty catalog</p>
        <span>Add your first credential definition above so it can be awarded to employees.</span>
      </div>

      <ul v-else class="cm-list">
        <Motion v-for="(c, i) in list" :key="c.id" as="li" class="cm-row" :class="{ active: editingId === c.id }"
          :style="{ '--c': catColor(c.category) }"
          :initial="reduced ? false : { opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.34, delay: Math.min(i * 0.03, 0.25), ease: [0.16, 1, 0.3, 1] }"
          :whileHover="{ y: -2 }">
          <span class="cm-row-rail" aria-hidden="true" />
          <span class="cm-seal"><Award :size="16" /></span>
          <div class="cm-row-main">
            <span class="cm-row-name">{{ c.name }}<i v-if="c.code" class="cm-row-code trn-mono">{{ c.code }}</i></span>
            <span class="cm-row-meta">
              <span v-if="c.category" class="cm-tag cat"><span class="dot" />{{ prettyCat(c.category) }}</span>
              <span v-if="c.issuing_authority" class="cm-auth"><ShieldCheck :size="11" /> {{ c.issuing_authority }}</span>
              <span v-if="c.validity_months" class="cm-tag"><Clock :size="10" /> {{ c.validity_months }} mo</span>
              <span v-if="heldCount(c)" class="cm-tag ok"><Users :size="10" /> {{ heldCount(c) }} held</span>
            </span>
          </div>
          <div class="cm-row-acts">
            <Motion as="button" class="cm-icon" title="Edit" :whileTap="{ scale: 0.88 }" @click="startEdit(c)"><Pencil :size="14" /></Motion>
            <Motion as="button" class="cm-icon danger" title="Delete" :whileTap="{ scale: 0.88 }" @click="askDelete(c)"><Trash2 :size="14" /></Motion>
          </div>
        </Motion>
      </ul>
    </div>

    <template #footer>
      <button class="trn-btn trn-btn-primary" @click="$emit('close')">Done</button>
    </template>

    <!-- shared delete confirm -->
    <TrnDeleteModal
      :open="delOpen" title="Delete credential" :icon="Award"
      :item-name="delTarget?.name || ''" :item-meta="delMeta"
      :consequences="delConsequences" confirm-label="Delete credential" :loading="deleting"
      @close="delOpen = false" @confirm="confirmDelete" />
  </TrnModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { Library, Plus, Minus, Pencil, Trash2, Clock, Users, Loader, Check, Award, ShieldCheck, Infinity as InfinityIcon } from 'lucide-vue-next'
import TrnModal from '../components/TrnModal.vue'
import TrnField from '../components/TrnField.vue'
import TrnSelect from '../components/TrnSelect.vue'
import TrnDeleteModal from '../components/TrnDeleteModal.vue'
import {
  SKILL_CATEGORIES, fetchCertifications, createCertification,
  patchCertification, deleteCertification,
} from '@/composables/useTraining'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['close', 'saved'])
const toast = useToast()
const reduced = prefersReduced()

const list = ref([])
const loading = ref(true)
const saving = ref(false)
const editingId = ref(null)

const blank = () => ({ name: '', code: '', category: '', issuing_authority: '', validity_months: null, description: '' })
const form = ref(blank())

const heldCount = (c) => c.held_count ?? c.employee_count ?? 0

const validityYears = computed(() => {
  const m = Number(form.value.validity_months) || 0
  if (!m) return ''
  if (m % 12 === 0) { const y = m / 12; return `${y}-year` }
  return `${m}-month`
})

// ── category dropdown (ultra-modern, with accent dots) ──
const CAT_VARS = {
  TECHNICAL: '--trn-amber-strong', FUNCTIONAL: '--trn-amber', BEHAVIORAL: '--trn-ember',
  DOMAIN: '--trn-orbit-far', LANGUAGE: '--trn-star', CERTIFICATION: '--trn-st-completed-hex',
  OTHER: '--trn-star-dim',
}
const catColor = (cat) => `var(${CAT_VARS[cat] || '--trn-amber'})`
const prettyCat = (cat) => String(cat || '').replace(/_/g, ' ').toLowerCase()
const categoryOptions = computed(() => [
  { value: '', label: '— uncategorised —' },
  ...SKILL_CATEGORIES.map(c => ({ value: c, label: prettyCat(c), dot: catColor(c) })),
])

// ── validity stepper ──
const onValidity = (e) => {
  const v = e.target.value
  form.value.validity_months = v === '' ? null : Math.max(0, Math.floor(Number(v) || 0))
}
const bumpValidity = (d) => {
  const next = Math.max(0, (Number(form.value.validity_months) || 0) + d)
  form.value.validity_months = next === 0 ? null : next
}

const load = async () => {
  loading.value = true
  try { list.value = await fetchCertifications() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load catalog') }
  finally { loading.value = false }
}

watch(() => props.open, (o) => {
  if (o) { resetForm(); load() }
})

const resetForm = () => { form.value = blank(); editingId.value = null }

const startEdit = (c) => {
  editingId.value = c.id
  form.value = {
    name: c.name || '', code: c.code || '', category: c.category || '',
    issuing_authority: c.issuing_authority || '',
    validity_months: c.validity_months ?? null, description: c.description || '',
  }
}

const save = async () => {
  if (!form.value.name || saving.value) return
  saving.value = true
  try {
    const payload = { ...form.value }
    if (!payload.code) delete payload.code
    if (!payload.category) delete payload.category
    if (!payload.issuing_authority) delete payload.issuing_authority
    if (payload.validity_months == null) delete payload.validity_months
    if (!payload.description) delete payload.description
    if (editingId.value) {
      await patchCertification(editingId.value, payload)
      toast.success('Credential updated')
    } else {
      await createCertification(payload)
      toast.success('Added to catalog')
    }
    resetForm()
    await load()
    emit('saved')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not save certification')
  } finally {
    saving.value = false
  }
}

// ── delete (shared TrnDeleteModal — no native confirm) ──
const delOpen = ref(false)
const delTarget = ref(null)
const deleting = ref(false)
const delMeta = computed(() => {
  const c = delTarget.value
  if (!c) return ''
  return [prettyCat(c.category), c.issuing_authority].filter(Boolean).join(' · ')
})
const delConsequences = computed(() => {
  const held = delTarget.value ? heldCount(delTarget.value) : 0
  const out = ['Removes this credential from the catalog']
  out.push(held
    ? `${held} awarded credential${held === 1 ? '' : 's'} stay intact — only the template is removed`
    : 'It can no longer be picked when awarding credentials')
  return out
})
const askDelete = (c) => {
  delTarget.value = c
  delOpen.value = true
}
const confirmDelete = async () => {
  const c = delTarget.value
  if (!c) return
  deleting.value = true
  try {
    await deleteCertification(c.id)
    toast.success('Removed from catalog')
    if (editingId.value === c.id) resetForm()
    delOpen.value = false
    await load()
    emit('saved')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not delete certification')
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.cm-wrap { display: flex; flex-direction: column; gap: 14px; }

/* ── composer ── */
.cm-form { padding: 15px 16px; border-radius: 16px; border: 1px solid var(--trn-border-soft);
  background: var(--trn-surf-card); box-shadow: var(--trn-card-shadow); display: flex; flex-direction: column; gap: 13px; }
.cm-form-head { display: flex; align-items: center; gap: 9px; }
.cm-form-ic { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px; flex-shrink: 0;
  color: var(--trn-amber-strong); background: color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.cm-form-title { font-size: 13px; font-weight: 700; color: var(--trn-text); }
.cm-form-tag { font-family: var(--trn-mono); font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px;
  color: var(--trn-amber-strong); background: color-mix(in srgb, var(--trn-amber) 12%, transparent); border: 1px solid color-mix(in srgb, var(--trn-amber) 28%, transparent); }
.cm-form-count { margin-left: auto; font-size: 10.5px; color: var(--trn-text-dim); }

.cm-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.cm-span2 { grid-column: span 2; }

/* validity stepper */
.cm-validity { display: flex; flex-direction: column; gap: 6px; }
.cm-validity-lab { font-size: 12px; font-weight: 600; color: var(--trn-text-secondary); }
.cm-validity-ctrl { display: flex; align-items: center; gap: 2px; padding: 3px; border-radius: 11px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); transition: border-color 0.2s, box-shadow 0.2s; }
.cm-validity-ctrl:focus-within { border-color: color-mix(in srgb, var(--trn-amber) 55%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.cm-validity-ctrl input { flex: 1; min-width: 0; border: 0; background: transparent; font: inherit; font-size: 13.5px; font-family: var(--trn-mono);
  color: var(--trn-text); padding: 6px 2px; text-align: center; -moz-appearance: textfield; }
.cm-validity-ctrl input::-webkit-outer-spin-button, .cm-validity-ctrl input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.cm-validity-ctrl input::placeholder { font-family: inherit; color: var(--trn-text-dim); }
.cm-validity-unit { font-size: 11px; color: var(--trn-text-dim); padding-right: 2px; }
.cm-step { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0; cursor: pointer;
  border: 1px solid var(--trn-border-soft); background: var(--trn-surface-elevated); color: var(--trn-text-muted); transition: all 0.2s; }
.cm-step:hover:not(:disabled) { color: var(--trn-amber-strong); border-color: color-mix(in srgb, var(--trn-amber) 38%, transparent); }
.cm-step:disabled { opacity: 0.4; cursor: not-allowed; }

.cm-form-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.cm-validity-hint { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 600; color: var(--trn-amber-strong); }
.cm-validity-hint.dim { color: var(--trn-text-dim); font-weight: 500; }
.cm-validity-hint :deep(svg) { flex-shrink: 0; }
.cm-form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-left: auto; }
.spin { animation: trn-orbit-spin 0.9s linear infinite; }

/* ── list rows ── */
.cm-list { list-style: none; margin: 0; padding: 2px; display: flex; flex-direction: column; gap: 9px; max-height: 320px; overflow-y: auto; }
.cm-row { position: relative; overflow: hidden; display: flex; align-items: center; gap: 12px; padding: 10px 13px 10px 16px; border-radius: 13px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-surface);
  transition: border-color 0.25s var(--trn-spring), background 0.25s, box-shadow 0.25s; }
.cm-row:hover { border-color: color-mix(in srgb, var(--c) 42%, transparent); box-shadow: var(--trn-card-shadow); }
.cm-row.active { border-color: color-mix(in srgb, var(--trn-amber) 48%, transparent); background: color-mix(in srgb, var(--trn-amber) 9%, transparent); }
.cm-row-rail { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--c); opacity: 0.55;
  transition: opacity 0.25s, width 0.25s var(--trn-spring), box-shadow 0.25s; }
.cm-row:hover .cm-row-rail { opacity: 1; width: 4px; box-shadow: 0 0 14px -1px var(--c); }

.cm-seal { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; flex-shrink: 0;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 28%, transparent); }

.cm-row-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.cm-row-name { font-size: 13px; font-weight: 700; color: var(--trn-text); display: flex; align-items: center; gap: 7px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cm-row-code { font-size: 10px; font-style: normal; color: var(--trn-text-dim); padding: 1px 6px; border-radius: 6px;
  background: var(--trn-surface-elevated); flex-shrink: 0; }
.cm-row-meta { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 11px; color: var(--trn-text-muted); }
.cm-auth { display: inline-flex; align-items: center; gap: 4px; }
.cm-auth :deep(svg) { color: var(--c); flex-shrink: 0; }
.cm-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 600; padding: 2px 8px; border-radius: 999px;
  color: var(--trn-text-muted); background: var(--trn-surface-elevated); border: 1px solid var(--trn-border-soft); white-space: nowrap; }
.cm-tag.cat { color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); border-color: color-mix(in srgb, var(--c) 30%, transparent); text-transform: capitalize; }
.cm-tag.cat .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--c); box-shadow: 0 0 6px var(--c); }
.cm-tag.ok { color: var(--trn-st-completed); background: var(--trn-cert-active-soft); border-color: color-mix(in srgb, var(--trn-st-completed) 28%, transparent); }

.cm-row-acts { display: flex; gap: 5px; flex-shrink: 0; opacity: 0.55; transform: translateX(5px);
  transition: opacity 0.28s var(--trn-spring), transform 0.28s var(--trn-spring); }
.cm-row:hover .cm-row-acts { opacity: 1; transform: none; }
.cm-icon { display: inline-flex; align-items: center; justify-content: center; width: 31px; height: 31px; border-radius: 9px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-surface); color: var(--trn-text-muted); cursor: pointer;
  transition: color 0.2s, background 0.2s, border-color 0.2s; }
.cm-icon:hover { color: var(--trn-text); background: var(--trn-surface-elevated); border-color: color-mix(in srgb, var(--trn-amber) 35%, transparent); }
.cm-icon.danger:hover { color: var(--trn-st-failed); background: var(--trn-st-failed-soft); border-color: color-mix(in srgb, var(--trn-st-failed) 36%, transparent); }

/* ── empty ── */
.cm-blank { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; padding: 30px 18px;
  border: 1.5px dashed var(--trn-border-strong); border-radius: 16px; background: var(--trn-surface); }
.cm-blank-ic { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 14px; margin-bottom: 4px;
  color: var(--trn-amber-strong); background: color-mix(in srgb, var(--trn-amber) 12%, transparent); }
.cm-blank p { margin: 0; font-size: 13.5px; font-weight: 700; color: var(--trn-text); }
.cm-blank span { font-size: 11.5px; color: var(--trn-text-muted); max-width: 280px; line-height: 1.5; }

@media (max-width: 520px) {
  .cm-form-grid { grid-template-columns: 1fr; }
  .cm-span2 { grid-column: span 1; }
  .cm-row-acts { opacity: 1; transform: none; }
}
</style>
