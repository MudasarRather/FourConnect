<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" class="tmm-overlay" as="div"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.22 }" @mousedown.self="$emit('close')">
        <Motion class="tmm-panel" as="div" role="dialog" aria-modal="true"
          :initial="{ opacity: 0, y: 26, scale: 0.96, filter: 'blur(10px)' }"
          :animate="{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }"
          :exit="{ opacity: 0, y: 16, scale: 0.98, filter: 'blur(6px)' }"
          :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }" @mousedown.stop>

          <!-- header -->
          <header class="tmm-head">
            <span class="tmm-aura" aria-hidden="true" />
            <span class="tmm-ic"><Library :size="18" /></span>
            <div class="tmm-titles">
              <h3>{{ material ? 'Edit material' : 'New material' }}</h3>
              <p>A learning asset linked to a program — or a general resource.</p>
            </div>
            <button class="tmm-x" @click="$emit('close')" aria-label="Close"><X :size="18" /></button>
          </header>

          <div class="tmm-body">
            <!-- type picker -->
            <Motion as="div" class="tmm-block"
              :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }">
              <span class="tmm-lab">Asset type</span>
              <div class="tmm-types">
                <Motion v-for="(t, i) in MATERIAL_TYPES" :key="t" as="button" type="button" class="ttype" :class="{ on: form.material_type === t }"
                  :style="{ '--c': typeColor(t) }"
                  :initial="{ opacity: 0, y: 10, scale: 0.9 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
                  :transition="{ duration: 0.34, delay: 0.12 + i * 0.04, ease: [0.16, 1, 0.3, 1] }"
                  :whileHover="{ y: -3 }" :whileTap="{ scale: 0.93 }" @click="form.material_type = t">
                  <span class="tt-ic"><component :is="typeIcon(t)" :size="18" /></span>
                  <span class="tt-lab">{{ label(t) }}</span>
                  <span v-if="form.material_type === t" class="tt-check"><Check :size="11" /></span>
                </Motion>
              </div>
            </Motion>

            <div class="tmm-grid">
              <!-- form -->
              <Motion as="div" class="tmm-form"
                :initial="{ opacity: 0, x: -12 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.5, delay: 0.16, ease: [0.16, 1, 0.3, 1] }">
                <label class="fld">
                  <span class="fld-lab">Title <i>*</i></span>
                  <input v-model="form.title" class="fld-in" placeholder="e.g. Onboarding Handbook" />
                </label>

                <label class="fld">
                  <span class="fld-lab">Program</span>
                  <div class="fld-sel">
                    <BookOpen :size="14" />
                    <select v-model="form.program_id">
                      <option value="">General / none</option>
                      <option v-for="p in programs" :key="p.id" :value="p.id">{{ p.name }}</option>
                    </select>
                  </div>
                </label>

                <div class="fld">
                  <span class="fld-lab">Source</span>
                  <div class="src-seg" role="tablist">
                    <span class="src-glider" :style="{ transform: sourceMode === 'file' ? 'translateX(100%)' : 'translateX(0)' }" aria-hidden="true" />
                    <button type="button" class="src-opt" :class="{ on: sourceMode === 'link' }" @click="sourceMode = 'link'"><LinkIcon :size="14" /> External link</button>
                    <button type="button" class="src-opt" :class="{ on: sourceMode === 'file' }" @click="sourceMode = 'file'"><UploadCloud :size="14" /> Upload file</button>
                  </div>

                  <input v-if="sourceMode === 'link'" v-model="form.external_url" class="fld-in" placeholder="https://…" />

                  <template v-else>
                    <div class="up-zone" :class="{ drag: dragging, has: !!form.file_url, busy: uploading }"
                      @click="pick" @dragover.prevent="dragging = true" @dragleave.prevent="dragging = false" @drop.prevent="onDrop">
                      <input ref="fileInput" type="file" class="up-hidden" @change="onFile" />
                      <span class="up-prog" aria-hidden="true" />
                      <template v-if="uploading">
                        <Loader :size="18" class="spin" /><b>Uploading…</b>
                      </template>
                      <template v-else-if="form.file_url">
                        <span class="up-chip">
                          <FileCheck :size="15" />
                          <span class="up-name">{{ uploadedName || basename(form.file_url) }}</span>
                          <button type="button" class="up-rm" @click.stop="clearFile" aria-label="Remove file"><X :size="12" /></button>
                        </span>
                        <span class="up-hint">Click to replace</span>
                      </template>
                      <template v-else>
                        <span class="up-ic"><UploadCloud :size="22" /></span>
                        <b>Drop a file or click to browse</b>
                        <span class="up-hint">PDF · video · slide · image</span>
                      </template>
                    </div>
                    <input v-model="form.file_url" class="fld-in up-manual" placeholder="…or paste a file path / URL" />
                  </template>
                </div>

                <label class="fld">
                  <span class="fld-lab">Description</span>
                  <textarea v-model="form.description" class="fld-in" rows="3" placeholder="What's inside this asset?" />
                </label>

                <label class="fld fld-half">
                  <span class="fld-lab">Sort order</span>
                  <input v-model.number="form.sort_order" type="number" step="1" class="fld-in" placeholder="0" />
                </label>
              </Motion>

              <!-- live preview -->
              <Motion as="div" class="tmm-preview"
                :initial="{ opacity: 0, x: 12 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.5, delay: 0.22, ease: [0.16, 1, 0.3, 1] }">
                <span class="tmm-prev-lab">Live preview</span>
                <article class="prev-tile" :style="{ '--c': typeColor(form.material_type) }">
                  <div class="prev-cover">
                    <span class="prev-dots" aria-hidden="true" />
                    <component :is="typeIcon(form.material_type)" :size="58" class="prev-water" aria-hidden="true" />
                    <span v-if="form.material_type === 'VIDEO'" class="prev-play" aria-hidden="true"><Play :size="13" /></span>
                    <span class="prev-badge"><component :is="typeIcon(form.material_type)" :size="10" /> {{ label(form.material_type) }}</span>
                  </div>
                  <div class="prev-body">
                    <h4>{{ form.title || 'Untitled asset' }}</h4>
                    <span class="prev-prog"><BookOpen :size="10" /> {{ programName }}</span>
                    <p v-if="form.description">{{ form.description }}</p>
                    <span class="prev-link" :class="{ muted: !sourceValue }"><ExternalLink :size="11" /> {{ sourceValue || 'No link attached' }}</span>
                  </div>
                </article>
              </Motion>
            </div>
          </div>

          <footer class="tmm-foot">
            <button class="trn-btn trn-btn-ghost" @click="$emit('close')">Cancel</button>
            <button class="trn-btn trn-btn-primary" :disabled="!form.title || saving" @click="save">
              <Loader v-if="saving" :size="14" class="spin" />
              <Check v-else :size="14" />
              {{ material ? 'Save changes' : 'Create material' }}
            </button>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import axios from 'axios'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  Library, Loader, X, Check, BookOpen, ExternalLink, Play,
  FileText, Video, Link as LinkIcon, Presentation, HelpCircle, File, UploadCloud, FileCheck,
} from 'lucide-vue-next'
import { API, authHeader } from '@/utils/api'
import { MATERIAL_TYPES, createMaterial, patchMaterial } from '@/composables/useTraining'

const props = defineProps({
  open: { type: Boolean, default: false },
  material: { type: Object, default: null },
  programs: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'saved'])
const toast = useToast()
const saving = ref(false)
const sourceMode = ref('link')

// file upload state
const fileInput = ref(null)
const dragging = ref(false)
const uploading = ref(false)
const uploadedName = ref('')
const basename = (u) => (u || '').split('/').pop() || ''

const TYPE_ICONS = { DOCUMENT: FileText, VIDEO: Video, LINK: LinkIcon, SLIDE: Presentation, QUIZ: HelpCircle, OTHER: File }
const typeIcon = (t) => TYPE_ICONS[t] || File
const TYPE_COLORS = {
  DOCUMENT: 'var(--trn-amber)', VIDEO: 'var(--trn-ember)', LINK: 'var(--trn-amber-strong)',
  SLIDE: 'var(--trn-type-department)', QUIZ: 'var(--trn-type-safety)', OTHER: 'var(--trn-star-dim)',
}
const typeColor = (t) => TYPE_COLORS[t] || 'var(--trn-amber)'
const label = (t) => (t || 'OTHER').charAt(0) + (t || 'OTHER').slice(1).toLowerCase()

const blank = () => ({ title: '', material_type: 'DOCUMENT', program_id: '', external_url: '', file_url: '', description: '', sort_order: 0 })
const form = ref(blank())

const programName = computed(() => {
  const p = props.programs.find(x => x.id === form.value.program_id)
  return p ? p.name : 'General'
})
const sourceValue = computed(() => (sourceMode.value === 'file' ? form.value.file_url : form.value.external_url) || '')

watch(() => props.open, (o) => {
  if (!o) return
  if (props.material) {
    form.value = {
      title: props.material.title || '',
      material_type: props.material.material_type || 'DOCUMENT',
      program_id: props.material.program_id || '',
      external_url: props.material.external_url || '',
      file_url: props.material.file_url || '',
      description: props.material.description || '',
      sort_order: props.material.sort_order ?? 0,
    }
    sourceMode.value = (!props.material.external_url && props.material.file_url) ? 'file' : 'link'
  } else {
    form.value = blank()
    sourceMode.value = 'link'
  }
  uploadedName.value = form.value.file_url ? basename(form.value.file_url) : ''
  dragging.value = false
  uploading.value = false
  document.body.style.overflow = 'hidden'
}, { immediate: true })

watch(() => props.open, (o) => { if (!o) document.body.style.overflow = '' })
onBeforeUnmount(() => { document.body.style.overflow = '' })

const onKey = (e) => { if (e.key === 'Escape' && props.open) emit('close') }
if (typeof window !== 'undefined') window.addEventListener('keydown', onKey)
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const pick = () => { if (!uploading.value) fileInput.value?.click() }
const onFile = (e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); if (e.target) e.target.value = '' }
const onDrop = (e) => { dragging.value = false; const f = e.dataTransfer?.files?.[0]; if (f) uploadFile(f) }
const clearFile = () => { form.value.file_url = ''; uploadedName.value = '' }
const uploadFile = async (file) => {
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await axios.post(`${API}/uploads/file`, fd, { headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' } })
    const url = res.data?.url || res.data?.file_url || ''
    if (!url) throw new Error('no-url')
    form.value.file_url = url
    uploadedName.value = file.name
    toast.success('File uploaded')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Upload failed — try again')
  } finally {
    uploading.value = false
  }
}

const save = async () => {
  if (!form.value.title) return
  saving.value = true
  try {
    const payload = { ...form.value }
    if (!payload.program_id) payload.program_id = null
    if (!payload.external_url) delete payload.external_url
    if (!payload.file_url) delete payload.file_url
    if (!payload.description) delete payload.description
    if (payload.sort_order == null || payload.sort_order === '') payload.sort_order = 0
    if (props.material) await patchMaterial(props.material.id, payload)
    else await createMaterial(payload)
    toast.success(props.material ? 'Material updated' : 'Material created')
    emit('saved')
    emit('close')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not save material')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.tmm-overlay { position: fixed; inset: 0; z-index: 1400; display: grid; place-items: center; padding: 24px;
  background: rgba(6, 5, 4, 0.62); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
[data-theme="light"] .tmm-overlay { background: rgba(60, 40, 15, 0.3); }

.tmm-panel { width: 100%; max-width: 840px; max-height: 92vh; overflow: hidden; display: flex; flex-direction: column;
  background: var(--trn-glass-deep); backdrop-filter: var(--trn-glass-blur); -webkit-backdrop-filter: var(--trn-glass-blur);
  border: 1px solid var(--trn-border-strong); border-radius: 24px; box-shadow: var(--trn-glass-shadow); }

/* header */
.tmm-head { position: relative; overflow: hidden; display: flex; align-items: center; gap: 12px; padding: 20px 22px 16px; border-bottom: 1px solid var(--trn-border-soft); }
.tmm-aura { position: absolute; top: -60px; left: -30px; width: 220px; height: 160px; pointer-events: none; border-radius: 50%;
  background: radial-gradient(circle, var(--trn-dome-glow), transparent 70%); animation: tmm-aura 6s ease-in-out infinite; }
.tmm-ic { position: relative; display: inline-flex; width: 38px; height: 38px; border-radius: 12px; align-items: center; justify-content: center;
  color: var(--trn-amber); background: linear-gradient(150deg, color-mix(in srgb, var(--trn-amber) 28%, transparent), color-mix(in srgb, var(--trn-amber) 8%, transparent));
  border: 1px solid color-mix(in srgb, var(--trn-amber) 32%, transparent); box-shadow: inset 0 1px 0 rgba(255,255,255,0.14); }
.tmm-titles { position: relative; flex: 1; min-width: 0; }
.tmm-titles h3 { margin: 0; font-size: 18px; font-weight: 800; letter-spacing: -0.02em; color: var(--trn-text); }
.tmm-titles p { margin: 2px 0 0; font-size: 12px; color: var(--trn-text-muted); }
.tmm-x { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 10px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-surface); color: var(--trn-text-muted); cursor: pointer; transition: all 0.2s; }
.tmm-x:hover { color: var(--trn-text); background: var(--trn-surface-elevated); transform: rotate(90deg); }

/* body */
.tmm-body { padding: 18px 22px 4px; overflow-y: auto; }
.tmm-block { margin-bottom: 18px; }
.tmm-lab, .tmm-prev-lab { display: block; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--trn-text-dim); margin-bottom: 10px; }

/* type picker */
.tmm-types { display: grid; grid-template-columns: repeat(6, 1fr); gap: 9px; }
.ttype { position: relative; display: flex; flex-direction: column; align-items: center; gap: 7px; padding: 12px 6px; border-radius: 14px; cursor: pointer;
  border: 1px solid var(--trn-border-soft); background: var(--trn-surface); color: var(--trn-text-muted); transition: color 0.25s, background 0.25s, border-color 0.25s, box-shadow 0.25s; }
.ttype:hover { color: var(--trn-text); border-color: color-mix(in srgb, var(--c) 40%, transparent); }
.ttype.on { color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent);
  border-color: color-mix(in srgb, var(--c) 45%, transparent); box-shadow: 0 0 20px -6px var(--c), inset 0 1px 0 rgba(255,255,255,0.1); }
.tt-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px;
  background: color-mix(in srgb, var(--c) 14%, transparent); transition: transform 0.3s var(--trn-spring); }
.ttype.on .tt-ic { transform: scale(1.1); background: color-mix(in srgb, var(--c) 22%, transparent); }
.tt-lab { font-size: 10.5px; font-weight: 600; }
.tt-check { position: absolute; top: 7px; right: 7px; display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%; color: #1c1206; background: var(--c); }

/* form / preview grid */
.tmm-grid { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 22px; align-items: start; }
.tmm-form { display: flex; flex-direction: column; gap: 14px; }
.fld { display: flex; flex-direction: column; gap: 6px; }
.fld-half { max-width: 160px; }
.fld-lab { font-size: 12px; font-weight: 600; color: var(--trn-text-secondary); }
.fld-lab i { color: var(--trn-st-failed); font-style: normal; margin-left: 2px; }
.fld-in { width: 100%; font: inherit; font-size: 13.5px; color: var(--trn-text); background: var(--trn-surface);
  border: 1px solid var(--trn-border-soft); border-radius: 11px; padding: 10px 12px; transition: border-color 0.2s, box-shadow 0.2s; }
.fld-in:focus { outline: none; border-color: color-mix(in srgb, var(--trn-amber) 55%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--trn-amber) 14%, transparent); }
textarea.fld-in { resize: vertical; min-height: 70px; }
.fld-sel { display: flex; align-items: center; gap: 8px; padding: 0 12px; border-radius: 11px; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); color: var(--trn-text-muted);
  transition: border-color 0.2s, box-shadow 0.2s; }
.fld-sel:focus-within { border-color: color-mix(in srgb, var(--trn-amber) 55%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.fld-sel select { flex: 1; border: 0; background: transparent; padding: 10px 0; color: var(--trn-text); font: inherit; font-size: 13.5px; cursor: pointer; }
.fld-sel select:focus { outline: none; }

/* source segmented */
.src-seg { position: relative; display: grid; grid-template-columns: 1fr 1fr; padding: 3px; border-radius: 11px; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.src-glider { position: absolute; top: 3px; left: 3px; width: calc(50% - 3px); bottom: 3px; border-radius: 8px;
  background: color-mix(in srgb, var(--trn-amber) 20%, transparent); border: 1px solid color-mix(in srgb, var(--trn-amber) 36%, transparent);
  transition: transform 0.32s var(--trn-spring); }
.src-opt { position: relative; z-index: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 6px; border: 0; background: transparent;
  font: inherit; font-size: 12px; font-weight: 600; color: var(--trn-text-muted); cursor: pointer; transition: color 0.25s; border-radius: 8px; }
.src-opt.on { color: var(--trn-amber); }

/* upload zone */
.up-zone { position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px;
  min-height: 102px; padding: 16px; border-radius: 13px; cursor: pointer; text-align: center;
  border: 1.5px dashed var(--trn-border-strong); background: var(--trn-surface); color: var(--trn-text-muted);
  transition: border-color 0.25s, background 0.25s, box-shadow 0.25s; }
.up-zone:hover { border-color: color-mix(in srgb, var(--trn-amber) 50%, transparent); color: var(--trn-text-secondary); }
.up-zone.drag { border-color: var(--trn-amber); background: color-mix(in srgb, var(--trn-amber) 10%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.up-zone.has { border-style: solid; border-color: color-mix(in srgb, var(--trn-st-completed) 38%, transparent); }
.up-zone b { font-size: 12.5px; font-weight: 650; color: var(--trn-text); }
.up-hidden { display: none; }
.up-ic { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 13px; color: var(--trn-amber);
  background: color-mix(in srgb, var(--trn-amber) 14%, transparent); border: 1px solid color-mix(in srgb, var(--trn-amber) 28%, transparent);
  transition: transform 0.3s var(--trn-spring); }
.up-zone:hover .up-ic { transform: translateY(-3px); }
.up-zone.drag .up-ic { animation: up-bounce 0.9s ease-in-out infinite; }
.up-hint { font-size: 10.5px; color: var(--trn-text-dim); }
.up-chip { display: inline-flex; align-items: center; gap: 8px; max-width: 100%; padding: 7px 8px 7px 11px; border-radius: 999px;
  color: var(--trn-st-completed); background: color-mix(in srgb, var(--trn-st-completed) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--trn-st-completed) 30%, transparent); }
.up-name { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 190px; }
.up-rm { display: inline-grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; border: 0; cursor: pointer;
  color: var(--trn-st-failed); background: rgba(248,113,113,0.16); transition: background 0.2s; flex-shrink: 0; }
.up-rm:hover { background: rgba(248,113,113,0.3); }
.up-prog { position: absolute; left: 0; bottom: 0; height: 3px; width: 38%; border-radius: 999px; opacity: 0;
  background: linear-gradient(90deg, transparent, var(--trn-amber), transparent); }
.up-zone.busy .up-prog { opacity: 1; animation: up-prog 1.1s ease-in-out infinite; }
.up-manual { margin-top: 9px; font-size: 12px; opacity: 0.85; }

/* preview */
.tmm-preview { position: sticky; top: 0; }
.prev-tile { overflow: hidden; border-radius: 16px; border: 1px solid color-mix(in srgb, var(--c) 30%, var(--trn-border-soft));
  background: var(--trn-surf-card); box-shadow: var(--trn-card-shadow); }
.prev-cover { position: relative; height: 92px; overflow: hidden; display: grid; place-items: center;
  background: linear-gradient(140deg, color-mix(in srgb, var(--c) 34%, var(--trn-surface)), color-mix(in srgb, var(--c) 7%, var(--trn-surface))); transition: background 0.5s ease; }
.prev-dots { position: absolute; inset: 0; opacity: 0.5; background-image: radial-gradient(color-mix(in srgb, var(--c) 26%, transparent) 1px, transparent 1px); background-size: 12px 12px;
  mask-image: linear-gradient(180deg, #000, transparent); -webkit-mask-image: linear-gradient(180deg, #000, transparent); }
.prev-water { position: absolute; right: -8px; bottom: -14px; color: var(--c); opacity: 0.24; transition: color 0.5s ease; }
.prev-play { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; color: #1c1206; background: var(--c);
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--c) 55%, transparent); animation: mt-play-pulse 2.4s ease-out infinite; }
.prev-play :deep(svg) { margin-left: 2px; }
.prev-badge { position: absolute; top: 10px; left: 11px; display: inline-flex; align-items: center; gap: 5px; font-family: var(--trn-mono); font-size: 9px; font-weight: 700; padding: 3px 8px; border-radius: 999px;
  color: var(--c); background: color-mix(in srgb, var(--trn-canvas) 55%, transparent); border: 1px solid color-mix(in srgb, var(--c) 36%, transparent); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.prev-body { padding: 13px 14px; display: flex; flex-direction: column; gap: 7px; }
.prev-body h4 { margin: 0; font-size: 14px; font-weight: 700; color: var(--trn-text); line-height: 1.3;
  display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word; }
.prev-prog { display: inline-flex; align-items: center; gap: 5px; align-self: flex-start; font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 999px;
  color: var(--trn-text-muted); background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.prev-body p { margin: 0; font-size: 11.5px; color: var(--trn-text-dim); line-height: 1.5;
  display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.prev-link { display: inline-flex; align-items: center; gap: 5px; font-family: var(--trn-mono); font-size: 10px; color: var(--trn-amber-strong);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.prev-link.muted { color: var(--trn-text-dim); }

/* footer */
.tmm-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 15px 22px; border-top: 1px solid var(--trn-border-soft); }
.spin { animation: trn-orbit-spin 0.9s linear infinite; }

@keyframes tmm-aura { 0%, 100% { opacity: 0.6; transform: translate(0, 0) scale(1); } 50% { opacity: 1; transform: translate(18px, 8px) scale(1.15); } }
@keyframes up-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
@keyframes up-prog { 0% { transform: translateX(-120%); } 100% { transform: translateX(360%); } }

@media (prefers-reduced-motion: reduce) {
  .tmm-aura, .prev-play, .up-zone.drag .up-ic, .up-zone.busy .up-prog { animation: none; }
  .tmm-x:hover { transform: none; }
}
@media (max-width: 680px) {
  .tmm-types { grid-template-columns: repeat(3, 1fr); }
  .tmm-grid { grid-template-columns: 1fr; }
  .tmm-preview { position: static; }
}
</style>
