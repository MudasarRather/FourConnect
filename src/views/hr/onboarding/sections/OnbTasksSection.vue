<template>
  <section class="onb-ts">
    <Motion as="header" class="onb-section-banner ts-banner"
      :initial="{ opacity: 0, y: -10 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="onb-section-banner-glow" />
      <div class="onb-section-banner-text">
        <span class="onb-eyebrow"><span class="onb-eyebrow-dot" /> Ad-hoc joiner work · SLA tracked</span>
        <h2 class="onb-banner-title">
          <span class="id-title-word">Onboarding</span>
          <span class="banner-divider">·</span>
          <span class="id-title-word" style="animation-delay: 80ms">Tasks</span>
        </h2>
        <p class="onb-banner-sub">Free-form task engine for ad-hoc joiner work beyond the structured checklist. SLA-breached tasks flag in red.</p>
      </div>
      <div class="onb-banner-aside">
        <div class="onb-banner-stat">
          <span class="onb-banner-stat-value">{{ grouped.TODO.length + grouped.IN_PROGRESS.length }}</span>
          <span class="onb-banner-stat-label">Active</span>
        </div>
        <div class="onb-banner-stat">
          <span class="onb-banner-stat-value">{{ tasks.filter(isBreach).length }}</span>
          <span class="onb-banner-stat-label">Breached</span>
        </div>
        <div class="ts-banner-actions">
          <button class="onb-btn-ghost" @click="reload"><RefreshCw :size="13" />Refresh</button>
          <button class="onb-btn-primary" @click="openNew"><Plus :size="13" />New task</button>
        </div>
      </div>
    </Motion>

    <div class="kanban">
      <Motion v-for="(col, colIdx) in COLUMNS" :key="col.key" as="section" class="kb-col" :data-col="col.key"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, delay: 0.05 * colIdx, ease: [0.22, 1, 0.36, 1] }"
      >
        <header class="kb-col-head">
          <span class="kb-col-name">{{ col.label }}</span>
          <span class="kb-col-count">{{ grouped[col.key].length }}</span>
        </header>
        <ul class="kb-col-list">
          <Motion v-for="(t, i) in grouped[col.key]" :key="t.id" as="li" class="kb-tile" :class="{ 'is-breach': isBreach(t) }"
            :initial="{ opacity: 0, scale: 0.94 }" :animate="{ opacity: 1, scale: 1 }"
            :transition="{ duration: 0.3, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }"
            :whileHover="{ y: -3, transition: { duration: 0.18 } }"
          >
            <div class="kb-tile-top">
              <span class="kb-pri" :data-pri="t.priority">{{ t.priority }}</span>
              <button class="kb-advance" @click="advance(t)" title="Move forward"><ArrowRight :size="11" /></button>
            </div>
            <div class="kb-title">{{ t.title }}</div>
            <div class="kb-meta">
              <span>{{ t.assigned_to_name || 'Unassigned' }}</span>
              <span v-if="t.due_date" class="kb-due">{{ formatDate(t.due_date) }}</span>
            </div>
            <span v-if="isBreach(t)" class="kb-breach">SLA breach</span>
          </Motion>
          <li v-if="!grouped[col.key].length" class="kb-empty">Empty</li>
        </ul>
      </Motion>
    </div>

    <OnbModal :open="showNew" title="New task" subtitle="Add a task to a joiner's queue" :icon="ClipboardList" :width="600" @close="showNew = false">
      <div class="form-stack">
        <OnbProcessPicker v-model="form.process_id" label="Joiner" />
        <OnbField v-model="form.title" label="Title" placeholder="e.g. Schedule team intro lunch" required full />
        <OnbField v-model="form.description" type="textarea" label="Description" placeholder="Why this task is needed..." full />
        <div class="form-grid-2">
          <OnbField v-model="form.priority" type="select" label="Priority"
            :options="PRIORITIES.map(p => ({ value: p, label: p }))" />
          <OnbField v-model="form.category" type="select" label="Category"
            :options="['', ...CATS].map(c => ({ value: c, label: c || '— Any —' }))" />
          <OnbField v-model="form.due_date" type="date" label="Due date" />
          <OnbField v-model.number="form.sla_hours" type="number" label="SLA hours" placeholder="e.g. 24" />
        </div>
      </div>
      <template #footer>
        <button class="onb-btn-ghost" @click="showNew = false">Cancel</button>
        <button class="onb-btn-primary" :disabled="!form.process_id || !form.title" @click="create"><Plus :size="13" />Create task</button>
      </template>
    </OnbModal>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { RefreshCw, Plus, ArrowRight, ClipboardList } from 'lucide-vue-next'
import OnbProcessPicker from '../components/OnbProcessPicker.vue'
import OnbModal from '../components/OnbModal.vue'
import OnbField from '../components/OnbField.vue'
import { fetchTasks, createTask, patchTask } from '../composables/useOnbChecklist'
import { useToast } from 'vue-toastification'

defineEmits(['refresh-stats'])

const toast = useToast()
const PRIORITIES = ['LOW','MEDIUM','HIGH','URGENT']
const CATS = ['HR','IT','ADMIN','FINANCE','SECURITY','DEPARTMENT']
const COLUMNS = [
  { key: 'TODO',        label: 'To Do' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'BLOCKED',     label: 'Blocked' },
  { key: 'DONE',        label: 'Done' },
]
const ADVANCE = { TODO: 'IN_PROGRESS', IN_PROGRESS: 'DONE', BLOCKED: 'IN_PROGRESS', DONE: 'DONE' }

const tasks = ref([])
const showNew = ref(false)
const form = reactive({ process_id: '', title: '', description: '', priority: 'MEDIUM', category: '', due_date: '', sla_hours: null })

const reload = async () => {
  try { tasks.value = await fetchTasks() }
  catch (e) { toast.error('Could not load tasks') }
}
onMounted(reload)

const grouped = computed(() => {
  const g = { TODO: [], IN_PROGRESS: [], BLOCKED: [], DONE: [] }
  for (const t of tasks.value) if (g[t.status]) g[t.status].push(t)
  return g
})

const openNew = () => {
  Object.assign(form, { process_id: form.process_id, title: '', description: '', priority: 'MEDIUM', category: '', due_date: '', sla_hours: null })
  showNew.value = true
}

const create = async () => {
  try {
    const payload = { ...form }
    if (!payload.due_date) delete payload.due_date
    if (!payload.category) delete payload.category
    if (payload.sla_hours == null) delete payload.sla_hours
    await createTask(payload)
    showNew.value = false
    await reload()
    toast.success('Task created')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Create failed') }
}

const advance = async (t) => {
  try { await patchTask(t.id, { status: ADVANCE[t.status] || 'DONE' }); await reload() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Update failed') }
}

const isBreach = (t) => t.due_date && t.status !== 'DONE' && new Date(t.due_date) < new Date()
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''
</script>

<style scoped>
@import '../../../../styles/onboarding-theme.css';

.onb-ts { display: flex; flex-direction: column; gap: 16px; }

.ts-banner .banner-divider {
  display: inline-block; margin: 0 6px;
  color: var(--hr-text-dim); font-weight: 400;
  -webkit-text-fill-color: var(--hr-text-dim);
}
.ts-banner-actions { display: flex; gap: 8px; align-self: flex-end; }

.kanban { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
@media (max-width: 1100px) { .kanban { grid-template-columns: repeat(2, 1fr); } }

.kb-col {
  position: relative;
  background: var(--onb-glass);
  border: var(--onb-glass-stroke);
  border-radius: 20px;
  padding: 16px;
  display: flex; flex-direction: column; gap: 12px;
  min-height: 380px;
  backdrop-filter: var(--onb-glass-blur);
  -webkit-backdrop-filter: var(--onb-glass-blur);
  box-shadow: var(--onb-glass-shadow);
  isolation: isolate;
}
.kb-col::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(160deg, rgba(255,255,255,0.06), transparent 35%);
  pointer-events: none; z-index: -1;
}
.kb-col[data-col="DONE"]    { border-color: rgba(52, 211, 153, 0.22); }
.kb-col[data-col="BLOCKED"] { border-color: rgba(248, 113, 113, 0.22); }
.kb-col-head { display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.kb-col-name { font-size: 11px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--hr-text-muted); }
.kb-col[data-col="DONE"] .kb-col-name { color: #34d399; }
.kb-col[data-col="BLOCKED"] .kb-col-name { color: #f87171; }
.kb-col-count { font-size: 10.5px; font-weight: 700; font-variant-numeric: tabular-nums;
  padding: 1px 7px; background: rgba(255,255,255,0.05); border-radius: 999px; color: var(--hr-text-muted); }
.kb-col-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }

.kb-tile {
  position: relative;
  background: rgba(14, 11, 9, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 12px 14px;
  display: flex; flex-direction: column; gap: 8px;
  cursor: grab;
  backdrop-filter: blur(10px);
  transition: border-color .2s var(--hr-spring), transform .25s var(--hr-spring), box-shadow .25s var(--hr-spring);
}
.kb-tile:hover {
  border-color: var(--hr-accent-gold-border);
  transform: translateY(-2px);
  box-shadow: 0 14px 30px -16px rgba(251, 146, 60, 0.4);
}
.kb-tile.is-breach { border-color: rgba(248, 113, 113, 0.5); background: rgba(248, 113, 113, 0.06); }
.kb-tile-top { display: flex; align-items: center; justify-content: space-between; }
.kb-pri { font-size: 9px; font-weight: 700; letter-spacing: 0.5px; padding: 2px 6px; border-radius: 4px;
  background: rgba(255,255,255,0.05); color: var(--hr-text-muted); }
.kb-pri[data-pri="HIGH"]   { background: rgba(251, 146, 60, 0.18); color: #fb923c; }
.kb-pri[data-pri="URGENT"] { background: rgba(248, 113, 113, 0.18); color: #f87171; }
.kb-pri[data-pri="LOW"]    { background: rgba(156, 163, 175, 0.18); color: #9ca3af; }
.kb-advance {
  background: transparent; border: 1px solid var(--hr-border); color: var(--hr-text-muted);
  padding: 2px 7px; border-radius: 5px; cursor: pointer;
  transition: border-color .2s, color .2s;
}
.kb-advance:hover { border-color: var(--hr-accent-gold); color: var(--hr-accent-gold); }
.kb-title { font-size: 12.5px; font-weight: 600; color: var(--hr-text); }
.kb-meta { display: flex; gap: 6px; flex-wrap: wrap; font-size: 10px; color: var(--hr-text-muted); }
.kb-due { font-family: var(--hr-mono); }
.kb-breach {
  font-size: 8.5px; font-weight: 700; letter-spacing: 0.6px;
  padding: 2px 6px; border-radius: 4px;
  background: rgba(248, 113, 113, 0.18); color: #f87171; align-self: flex-start;
}
.kb-empty { font-size: 11px; color: var(--hr-text-dim); padding: 12px; text-align: center; border: 1px dashed var(--hr-border); border-radius: 10px; }

.form-stack { display: flex; flex-direction: column; gap: 14px; }
.form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
</style>
