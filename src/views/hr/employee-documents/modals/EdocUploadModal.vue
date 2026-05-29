<template>
  <EdocModal :open="open" title="Add Document" subtitle="Attach & file an employee document" :icon="FilePlus2" :width="600" @close="$emit('close')">
    <form class="up-form" @submit.prevent="submit">
      <div class="grid-2">
        <div class="field">
          <HrFieldLabel label="Employee" required />
          <HrSelect v-model="form.employee_id" :options="employeeOptions" :disabled="!!presetEmployeeId" placeholder="Select employee…" />
        </div>
        <div class="field">
          <HrFieldLabel label="Category" required />
          <HrSelect v-model="form.category" :options="categoryOptions" />
        </div>
      </div>

      <div class="grid-2">
        <div class="field">
          <HrFieldLabel label="Document Type" required />
          <HrSelect v-model="form.doc_type" :options="typeOptions" />
        </div>
        <div class="field">
          <HrFieldLabel label="Title" required />
          <HrInput v-model="form.title" placeholder="e.g. Aadhaar Card" />
        </div>
      </div>

      <div class="grid-2">
        <div class="field">
          <HrFieldLabel label="Document Number" />
          <HrInput v-model="form.document_number" placeholder="Optional" />
        </div>
        <div class="field">
          <HrFieldLabel label="Issued By" />
          <HrInput v-model="form.issued_by" placeholder="Optional" />
        </div>
      </div>

      <div class="grid-2">
        <div class="field">
          <HrFieldLabel label="Issue Date" />
          <HrDatePicker v-model="form.issue_date" />
        </div>
        <div class="field">
          <HrFieldLabel label="Expiry Date" />
          <HrDatePicker v-model="form.expiry_date" />
        </div>
      </div>

      <div class="field">
        <HrFieldLabel label="File" />
        <label
          class="dropzone" :class="{ 'is-drag': dragging, 'has-file': !!file }"
          @dragover.prevent="dragging = true" @dragleave.prevent="dragging = false" @drop.prevent="onDrop"
        >
          <input type="file" class="dz-input" :accept="ACCEPT" @change="onPick" />
          <span class="dz-mesh" aria-hidden="true" />
          <template v-if="!file">
            <UploadCloud :size="26" class="dz-ic" />
            <span class="dz-title">Drop a file or click to browse</span>
            <span class="dz-hint">PDF, JPG, PNG, WEBP, DOCX, XLSX · max 10MB</span>
          </template>
          <template v-else>
            <FileCheck2 :size="24" class="dz-ic ok" />
            <span class="dz-title">{{ file.name }}</span>
            <span class="dz-hint">{{ prettySize }} · click to replace</span>
          </template>
        </label>
      </div>
    </form>

    <template #footer>
      <button class="edoc-btn" @click="$emit('close')">Cancel</button>
      <div style="flex:1" />
      <Motion as="button" type="button" class="edoc-btn edoc-btn-primary"
        :class="{ 'is-loading': saving }" :whileHover="canSave ? { y: -2, scale: 1.02 } : {}"
        :whileTap="canSave ? { scale: 0.97 } : {}" :disabled="!canSave" @click="submit">
        <Loader2 v-if="saving" :size="15" class="spin" /><FilePlus2 v-else :size="15" />
        {{ saving ? 'Saving…' : 'Add Document' }}
      </Motion>
    </template>
  </EdocModal>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { FilePlus2, UploadCloud, FileCheck2, Loader2 } from 'lucide-vue-next'
import EdocModal from '../components/EdocModal.vue'
import HrFieldLabel from '@/components/hr/forms/HrFieldLabel.vue'
import HrInput from '@/components/hr/forms/HrInput.vue'
import HrSelect from '@/components/hr/forms/HrSelect.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import { useEmployeeDocuments, DOC_CATEGORIES, DOC_TYPES } from '@/composables/useEmployeeDocuments'
import { useEmployees } from '@/composables/useEmployees'
import { useToast } from '@/composables/useToast'

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx'
const props = defineProps({
  open: { type: Boolean, default: false },
  presetCategory: { type: String, default: null },
  presetEmployeeId: { type: String, default: null },
})
const emit = defineEmits(['close', 'created'])

const { success, error } = useToast()
const { create, uploadFile } = useEmployeeDocuments()
const emp = useEmployees()

const blank = () => ({
  employee_id: props.presetEmployeeId || '', category: props.presetCategory || 'KYC',
  doc_type: '', title: '', document_number: '', issued_by: '', issue_date: null, expiry_date: null,
})
const form = ref(blank())
const file = ref(null)
const dragging = ref(false)
const saving = ref(false)

const employeeOptions = computed(() => (emp.employees.value || []).map(e => ({
  label: `${e.employee_name || e.full_name || e.name || 'Employee'}${e.employee_code ? ` · ${e.employee_code}` : (e.employee_id ? ` · ${e.employee_id}` : '')}`,
  value: e.id,
})))
const categoryOptions = DOC_CATEGORIES.map(c => ({ label: c.label, value: c.key }))
const typeOptions = computed(() => (DOC_TYPES[form.value.category] || DOC_TYPES.OTHER).map(t => ({ label: t.replace(/_/g, ' '), value: t })))

const canSave = computed(() => form.value.employee_id && form.value.category && form.value.doc_type && form.value.title && !saving.value)
const prettySize = computed(() => {
  const b = file.value?.size
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(2)} MB`
})

watch(() => form.value.doc_type, (t) => {
  if (t && !form.value.title) form.value.title = t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
})
watch(() => props.open, (v) => {
  if (v) { form.value = blank(); file.value = null; if (!emp.employees.value?.length) loadEmployees() }
})

const loadEmployees = async () => { emp.setFilters({ limit: 100 }); await emp.fetchList() }
const onPick = (e) => { const f = e.target.files?.[0]; if (f) file.value = f }
const onDrop = (e) => { dragging.value = false; const f = e.dataTransfer?.files?.[0]; if (f) file.value = f }

const submit = async () => {
  if (!canSave.value) return
  saving.value = true
  try {
    const payload = { ...form.value }
    // HrDatePicker emits '' when cleared — drop empties so Pydantic `date` doesn't reject them.
    for (const k of ['issue_date', 'expiry_date', 'document_number', 'issued_by']) {
      if (!payload[k]) delete payload[k]
    }
    const doc = await create(payload)
    if (file.value) await uploadFile(doc.id, file.value)
    success(`${doc.title} added`)
    emit('created', doc)
    emit('close')
  } catch (e) {
    error(e?.response?.data?.detail || 'Failed to add document')
  } finally { saving.value = false }
}

onMounted(() => { if (props.open) loadEmployees() })
</script>

<style scoped>
.up-form { display: flex; flex-direction: column; gap: 14px; }
.up-form > * { animation: edoc-rise-in 0.5s var(--edoc-ease) both; }
.up-form > *:nth-child(1) { animation-delay: 0.04s; }
.up-form > *:nth-child(2) { animation-delay: 0.10s; }
.up-form > *:nth-child(3) { animation-delay: 0.16s; }
.up-form > *:nth-child(4) { animation-delay: 0.22s; }
.up-form > *:nth-child(5) { animation-delay: 0.28s; }
@media (prefers-reduced-motion: reduce) { .up-form > * { animation: none; } }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 5px; }
.dropzone {
  position: relative; overflow: hidden; isolation: isolate;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 30px; text-align: center; cursor: pointer;
  border: 1.5px dashed var(--hr-border-strong); border-radius: 16px;
  background: rgba(255,255,255,0.02);
  transition: border-color 0.3s var(--edoc-spring), background 0.3s var(--edoc-spring), box-shadow 0.3s var(--edoc-spring), transform 0.3s var(--edoc-spring);
}
.dropzone::before {
  content: ''; position: absolute; inset: -1px; border-radius: inherit; padding: 1.5px;
  background: conic-gradient(from var(--a, 0deg), transparent, rgba(251,191,36,0.55), transparent 30%, transparent 70%, rgba(251,191,36,0.55), transparent);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  opacity: 0; transition: opacity 0.4s ease; animation: dz-beam 8s linear infinite;
  pointer-events: none; z-index: 1;
}
.dropzone:hover, .dropzone.is-drag { border-color: var(--hr-accent-gold); background: rgba(251,191,36,0.06); }
.dropzone:hover::before, .dropzone.is-drag::before { opacity: 1; }
.dropzone.is-drag { box-shadow: inset 0 0 0 1px rgba(251,191,36,0.45), 0 14px 32px -16px rgba(251,146,60,0.45); transform: scale(1.005); }
.dropzone.has-file { border-style: solid; border-color: var(--edoc-verified); background: rgba(52,211,153,0.06); }
.dropzone.has-file::before { background: conic-gradient(from var(--a, 0deg), transparent, rgba(52,211,153,0.55), transparent 30%, transparent 70%, rgba(52,211,153,0.55), transparent); opacity: 1; }
.dz-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; z-index: 5; }
.dz-mesh { position: absolute; inset: 0; pointer-events: none; opacity: 0;
  background: radial-gradient(60% 80% at 30% 20%, rgba(251,191,36,0.18), transparent 60%),
              radial-gradient(50% 70% at 75% 90%, rgba(251,146,60,0.15), transparent 60%);
  transition: opacity 0.4s ease; }
.dropzone:hover .dz-mesh, .dropzone.is-drag .dz-mesh { opacity: 1; }
.dz-ic { color: var(--hr-accent-gold); animation: dz-bob 4.4s cubic-bezier(0.45,0,0.55,1) infinite; transition: transform 0.3s var(--edoc-spring); }
.dz-ic.ok { color: var(--edoc-verified); animation: none; }
.dropzone.is-drag .dz-ic { transform: scale(1.12) translateY(-2px); }
.dz-title { font-size: 13.5px; font-weight: 700; color: var(--hr-text); position: relative; z-index: 2; }
.dz-hint { font-size: 11px; color: var(--hr-text-muted); position: relative; z-index: 2; }
@property --a { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
@keyframes dz-beam { to { --a: 360deg; } }
@keyframes dz-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
@media (prefers-reduced-motion: reduce) { .dropzone::before, .dz-ic { animation: none; } }
.spin { animation: edoc-ring-rotate 1s linear infinite; }
@media (max-width: 560px) { .grid-2 { grid-template-columns: 1fr; } }
[data-theme="light"] .dz-title { color: #1a1410; }
[data-theme="light"] .dropzone { background: rgba(255,250,240,0.5); }
</style>
