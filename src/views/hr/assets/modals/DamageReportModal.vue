<template>
  <AssetModal :open="open" :title="`Report damage · ${alloc?.asset_code || ''}`"
    subtitle="Tell HR what happened — attach a photo if you can" :icon="ShieldAlert" :width="520" @close="$emit('close')">
    <div class="dr-stack" v-if="alloc">
      <div class="dr-sev">
        <span class="af-lab">Severity</span>
        <div class="dr-sev-opts">
          <button v-for="s in SEVERITIES" :key="s" type="button" class="dr-sev-opt" :class="{ on: form.severity === s }" @click="form.severity = s">
            {{ label(s) }}
          </button>
        </div>
      </div>
      <AssetField v-model="form.title" label="Title" placeholder="e.g. Cracked screen" />
      <AssetField v-model="form.description" type="textarea" label="What happened" required full placeholder="Describe the damage…" />

      <div class="dr-photos">
        <span class="af-lab">Photos</span>
        <div class="dr-photo-row">
          <div v-for="(p, i) in form.attachments" :key="i" class="dr-thumb">
            <img :src="urlFor(p)" alt="evidence" />
            <button type="button" class="dr-thumb-x" @click="form.attachments.splice(i, 1)"><X :size="11" /></button>
          </div>
          <label class="dr-upload" :class="{ busy: uploading }">
            <Loader v-if="uploading" :size="16" class="spin" /><ImagePlus v-else :size="16" />
            <input type="file" accept="image/*" hidden @change="onFile" :disabled="uploading" />
          </label>
        </div>
      </div>
    </div>
    <template #footer>
      <button class="as-btn as-btn-ghost" @click="$emit('close')">Cancel</button>
      <button class="as-btn as-btn-danger" :disabled="!form.description || saving" @click="submit">
        <Loader v-if="saving" :size="14" class="spin" /><ShieldAlert v-else :size="14" /> Report damage
      </button>
    </template>
  </AssetModal>
</template>

<script setup>
import { ref, watch } from 'vue'
import axios from 'axios'
import { useToast } from 'vue-toastification'
import { ShieldAlert, Loader, ImagePlus, X } from 'lucide-vue-next'
import { API, API_BASE, authHeader } from '@/utils/api'
import AssetModal from '../components/AssetModal.vue'
import AssetField from '../components/AssetField.vue'
import { reportMyDamage, SEVERITIES, errText } from '@/composables/useAssets'

const props = defineProps({
  open: { type: Boolean, default: false },
  alloc: { type: Object, default: null },
})
const emit = defineEmits(['close', 'reported'])
const toast = useToast()

const saving = ref(false)
const uploading = ref(false)
const blank = () => ({ severity: 'MINOR', title: '', description: '', attachments: [] })
const form = ref(blank())
watch(() => props.open, (o) => { if (o) form.value = blank() })

const label = (s) => ({ MINOR: 'Minor', MODERATE: 'Moderate', MAJOR: 'Major', TOTAL_LOSS: 'Total loss' }[s] || s)
const urlFor = (p) => p.startsWith('http') ? p : `${API_BASE}/${p}`

async function onFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await axios.post(`${API}/uploads/file`, fd, { headers: { ...authHeader() } })
    if (data?.file_path) form.value.attachments.push(data.file_path)
  } catch (err) {
    toast.error(errText(err, 'Upload failed (max 5MB image)'))
  } finally {
    uploading.value = false
    e.target.value = ''
  }
}

async function submit() {
  if (!props.alloc || !form.value.description) return
  saving.value = true
  try {
    await reportMyDamage(props.alloc.id, {
      severity: form.value.severity, title: form.value.title || null,
      description: form.value.description, attachments: form.value.attachments,
    })
    toast.success('Damage reported to HR')
    emit('reported')
    emit('close')
  } catch (e) {
    toast.error(errText(e, 'Failed to report damage'))
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.dr-stack { display: flex; flex-direction: column; gap: 14px; }
.af-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-dim); }
.dr-sev { display: flex; flex-direction: column; gap: 7px; }
.dr-sev-opts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }
.dr-sev-opt { padding: 9px 6px; border-radius: 10px; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 600;
  color: var(--as-text-muted); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: all 0.2s; }
.dr-sev-opt.on { color: var(--as-al-damaged); background: var(--as-al-damaged-soft); border-color: color-mix(in srgb, var(--as-al-damaged) 36%, transparent); }
.dr-photos { display: flex; flex-direction: column; gap: 7px; }
.dr-photo-row { display: flex; flex-wrap: wrap; gap: 8px; }
.dr-thumb { position: relative; width: 60px; height: 60px; border-radius: 11px; overflow: hidden; border: 1px solid var(--as-border-soft); }
.dr-thumb img { width: 100%; height: 100%; object-fit: cover; }
.dr-thumb-x { position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; border-radius: 6px; display: grid; place-items: center;
  border: none; cursor: pointer; color: #fff; background: rgba(0,0,0,0.6); }
.dr-upload { display: grid; place-items: center; width: 60px; height: 60px; border-radius: 11px; cursor: pointer; color: var(--as-text-muted);
  background: var(--as-surface); border: 1.5px dashed var(--as-border-strong); transition: all 0.2s; }
.dr-upload:hover { color: var(--as-amber); border-color: color-mix(in srgb, var(--as-amber) 40%, transparent); }
.dr-upload.busy { opacity: 0.6; cursor: wait; }
.spin { animation: as-spin 0.9s linear infinite; }
</style>
