<template>
  <AssetModal :open="open" title="Log damage" subtitle="Open an incident ticket and route the asset into triage"
    :icon="ShieldAlert" :width="600" @close="$emit('close')">
    <div class="ld" :style="{ '--sev': sev.color }">
      <!-- live impact preview -->
      <Motion as="div" class="ld-preview" :initial="secIn" :animate="secOn" :transition="secT(0)">
        <span class="ld-pv-grid" aria-hidden="true" />
        <div class="ld-pv-head">
          <span class="ld-pv-medal"><component :is="sev.icon" :size="17" /></span>
          <div class="ld-pv-id">
            <span class="ld-pv-code as-mono">{{ picked ? picked.asset_code : 'No asset selected' }}</span>
            <span class="ld-pv-sev">{{ sev.label }} impact · {{ Math.round(sev.amp * 100) }}%</span>
          </div>
          <span class="ld-pv-pill"><Activity :size="12" /> Triage preview</span>
        </div>
        <div class="ld-pv-mon">
          <svg viewBox="0 0 540 46" preserveAspectRatio="none">
            <polyline class="ld-pv-ghost" :points="ecg" />
            <Presence><polyline :key="form.severity" class="ld-pv-line" :points="ecg" /></Presence>
          </svg>
          <span v-if="!reduced" class="ld-pv-sweep" aria-hidden="true" />
        </div>
      </Motion>

      <!-- asset -->
      <Motion as="section" class="ld-sec" :initial="secIn" :animate="secOn" :transition="secT(1)">
        <header class="ld-sec-h"><span class="ld-sec-ic"><PackageSearch :size="13" /></span> Affected asset</header>
        <AssetPicker v-model="picked" label="" placeholder="Search asset by code / serial…" required />
      </Motion>

      <!-- severity impact selector -->
      <Motion as="section" class="ld-sec" :initial="secIn" :animate="secOn" :transition="secT(2)">
        <header class="ld-sec-h"><span class="ld-sec-ic"><Gauge :size="13" /></span> Impact severity</header>
        <div class="ld-sev" :style="{ '--idx': sevIdx }">
          <span class="ld-sev-ind" aria-hidden="true" />
          <button v-for="s in SEVERITIES" :key="s" type="button" class="ld-sev-opt" :class="{ on: form.severity === s }"
            :style="{ '--oc': sevMeta(s).color }" @click="form.severity = s">
            <component :is="sevMeta(s).icon" :size="15" />
            <span>{{ sevMeta(s).label }}</span>
          </button>
        </div>
      </Motion>

      <!-- details -->
      <Motion as="section" class="ld-sec" :initial="secIn" :animate="secOn" :transition="secT(3)">
        <header class="ld-sec-h"><span class="ld-sec-ic"><ClipboardList :size="13" /></span> Incident details</header>
        <input v-model="form.title" class="ld-input" placeholder="Short title — e.g. Cracked screen" />
        <textarea v-model="form.description" class="ld-textarea" rows="3" placeholder="What happened? Describe the damage…" />
      </Motion>

      <!-- cost & liability -->
      <Motion as="section" class="ld-sec" :initial="secIn" :animate="secOn" :transition="secT(4)">
        <header class="ld-sec-h"><span class="ld-sec-ic"><CircleDollarSign :size="13" /></span> Cost &amp; liability</header>
        <div class="ld-grid2">
          <div class="ld-money">
            <span class="ld-money-cur">₹</span>
            <input v-model="form.recovery_amount" type="number" min="0" step="100" class="ld-money-in" placeholder="Recoverable amount" />
          </div>
          <button type="button" class="ld-toggle" :class="{ on: form.liable_employee }" @click="form.liable_employee = !form.liable_employee">
            <span class="ld-toggle-track"><span class="ld-toggle-knob" /></span>
            <span class="ld-toggle-lab">Employee liable</span>
          </button>
        </div>
      </Motion>

      <!-- evidence -->
      <Motion as="section" class="ld-sec" :initial="secIn" :animate="secOn" :transition="secT(5)">
        <header class="ld-sec-h"><span class="ld-sec-ic"><ImagePlus :size="13" /></span> Evidence</header>
        <div class="ld-photos">
          <Motion v-for="(p, i) in form.attachments" :key="p" as="div" class="ld-thumb"
            :initial="{ opacity: 0, scale: 0.8 }" :animate="{ opacity: 1, scale: 1 }" :transition="{ duration: 0.3 }">
            <img :src="urlFor(p)" alt="evidence" />
            <button type="button" class="ld-thumb-x" @click="form.attachments.splice(i, 1)"><X :size="11" /></button>
          </Motion>
          <label class="ld-upload" :class="{ busy: uploading }">
            <Loader v-if="uploading" :size="17" class="spin" /><ImagePlus v-else :size="17" />
            <input type="file" accept="image/*" hidden @change="onFile" :disabled="uploading" />
          </label>
        </div>
      </Motion>
    </div>

    <template #footer>
      <button class="as-btn as-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="as-btn as-btn-danger" :class="{ disabled: !canSubmit || saving }"
        :whileHover="(!canSubmit || saving) ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" :disabled="!canSubmit || saving" @click="submit">
        <Loader v-if="saving" :size="14" class="spin" /><ShieldAlert v-else :size="14" /> Log incident
      </Motion>
    </template>
  </AssetModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  ShieldAlert, Activity, PackageSearch, Gauge, ClipboardList, CircleDollarSign,
  ImagePlus, X, Loader,
} from 'lucide-vue-next'
import AssetModal from '../components/AssetModal.vue'
import AssetPicker from '../components/AssetPicker.vue'
import { API, API_BASE, authHeader } from '@/utils/api'
import { createDamage, errText } from '@/composables/useAssets'
import { sevMeta, SEVERITIES, ecgPoints } from '../components/dmgMeta.js'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['close', 'created'])
const toast = useToast()
const reduced = prefersReduced()

const saving = ref(false)
const uploading = ref(false)
const picked = ref(null)
const blank = () => ({ severity: 'MINOR', title: '', description: '', recovery_amount: '', liable_employee: false, attachments: [] })
const form = ref(blank())
watch(() => props.open, (o) => { if (o) { form.value = blank(); picked.value = null } })

const secIn = { opacity: 0, y: 14 }
const secOn = { opacity: 1, y: 0 }
const secT = (i) => ({ duration: 0.42, delay: 0.05 + i * 0.06, ease: [0.16, 1, 0.3, 1] })

const sev = computed(() => sevMeta(form.value.severity))
const sevIdx = computed(() => Math.max(0, SEVERITIES.indexOf(form.value.severity)))
const ecg = computed(() => ecgPoints(540, 46, 3, sev.value.amp))
const canSubmit = computed(() => !!picked.value && !!form.value.description.trim())

const urlFor = (p) => (p?.startsWith?.('http') ? p : `${API_BASE}/${p}`)

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
  if (!canSubmit.value) return
  saving.value = true
  try {
    await createDamage({
      asset_id: picked.value.id,
      severity: form.value.severity,
      title: form.value.title || null,
      description: form.value.description,
      recovery_amount: form.value.recovery_amount ? Number(form.value.recovery_amount) : null,
      liable_employee: form.value.liable_employee,
      attachments: form.value.attachments,
    })
    toast.success('Damage incident logged')
    emit('created')
    emit('close')
  } catch (e) {
    toast.error(errText(e, 'Failed to log damage'))
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.ld { display: flex; flex-direction: column; gap: 15px; }

/* live impact preview */
.ld-preview { position: relative; overflow: hidden; padding: 13px 15px; border-radius: 16px; background: var(--as-surf-card);
  border: 1px solid color-mix(in srgb, var(--sev) 26%, var(--as-border-soft)); box-shadow: var(--as-card-shadow); transition: border-color 0.3s; }
.ld-pv-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(color-mix(in srgb, var(--sev) 14%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--sev) 14%, transparent) 1px, transparent 1px);
  background-size: 22px 22px; mask-image: radial-gradient(120% 100% at 90% 0%, #000, transparent 72%); -webkit-mask-image: radial-gradient(120% 100% at 90% 0%, #000, transparent 72%); }
.ld-pv-head { position: relative; display: flex; align-items: center; gap: 11px; }
.ld-pv-medal { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; color: var(--sev);
  background: color-mix(in srgb, var(--sev) 15%, transparent); border: 1px solid color-mix(in srgb, var(--sev) 36%, transparent); transition: all 0.3s; }
.ld-pv-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ld-pv-code { font-size: 14px; font-weight: 850; color: var(--as-text); }
.ld-pv-sev { font-size: 11.5px; font-weight: 600; color: var(--sev); transition: color 0.3s; }
.ld-pv-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-dim);
  padding: 4px 9px; border-radius: 999px; background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.ld-pv-mon { position: relative; height: 46px; margin-top: 9px; overflow: hidden; }
.ld-pv-mon svg { width: 100%; height: 100%; display: block; overflow: visible; }
.ld-pv-ghost { fill: none; stroke: var(--sev); stroke-width: 1.2; opacity: 0.16; }
.ld-pv-line { fill: none; stroke: var(--sev); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round;
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--sev) 55%, transparent)); stroke-dasharray: 2000; stroke-dashoffset: 2000; animation: ld-draw 1.2s cubic-bezier(0.16,1,0.3,1) forwards; }
.ld-pv-sweep { position: absolute; top: 0; bottom: 0; width: 56px; pointer-events: none; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--sev) 24%, transparent), transparent); animation: ld-sweep 3s linear infinite; }

/* sections */
.ld-sec { display: flex; flex-direction: column; gap: 9px; }
.ld-sec-h { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--as-text-dim); }
.ld-sec-ic { display: grid; place-items: center; width: 23px; height: 23px; border-radius: 7px; color: var(--as-al-damaged);
  background: color-mix(in srgb, var(--as-al-damaged) 12%, transparent); border: 1px solid color-mix(in srgb, var(--as-al-damaged) 24%, transparent); }

/* severity selector */
.ld-sev { position: relative; display: grid; grid-template-columns: repeat(4, 1fr); padding: 4px; border-radius: 13px; background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.ld-sev-ind { position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc((100% - 8px) / 4); border-radius: 10px;
  background: color-mix(in srgb, var(--sev) 16%, transparent); border: 1px solid color-mix(in srgb, var(--sev) 42%, transparent);
  transform: translateX(calc(var(--idx) * 100%)); transition: transform 0.42s var(--as-spring), background 0.3s, border-color 0.3s; }
.ld-sev-opt { position: relative; z-index: 1; display: inline-flex; flex-direction: column; align-items: center; gap: 4px; padding: 9px 4px; border: none; background: none;
  font: inherit; font-size: 10.5px; font-weight: 700; color: var(--as-text-muted); cursor: pointer; transition: color 0.25s; }
.ld-sev-opt.on { color: var(--oc); }

/* inputs */
.ld-input, .ld-textarea { width: 100%; box-sizing: border-box; font: inherit; font-size: 13.5px; color: var(--as-text);
  background: var(--as-surface); border: 1px solid var(--as-border-soft); border-radius: 11px; padding: 10px 12px; transition: border-color 0.2s, box-shadow 0.2s; }
.ld-textarea { resize: vertical; min-height: 64px; line-height: 1.5; }
.ld-input::placeholder, .ld-textarea::placeholder { color: var(--as-text-dim); }
.ld-input:focus, .ld-textarea:focus { outline: none; border-color: color-mix(in srgb, var(--as-al-damaged) 50%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--as-al-damaged) 11%, transparent); }

.ld-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }
@media (max-width: 520px) { .ld-grid2 { grid-template-columns: 1fr; } }
.ld-money { display: flex; align-items: center; gap: 7px; padding: 0 12px; border-radius: 11px; background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: border-color 0.2s, box-shadow 0.2s; }
.ld-money:focus-within { border-color: color-mix(in srgb, var(--as-amber) 50%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--as-amber) 11%, transparent); }
.ld-money-cur { font-size: 14px; font-weight: 800; color: var(--as-amber); }
.ld-money-in { flex: 1; min-width: 0; border: none; background: none; outline: none; font: inherit; font-size: 13.5px; color: var(--as-text); padding: 10px 0; }
.ld-money-in::placeholder { color: var(--as-text-dim); }

.ld-toggle { display: inline-flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 11px; cursor: pointer; font: inherit;
  background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: border-color 0.2s, background 0.2s; }
.ld-toggle.on { border-color: color-mix(in srgb, var(--as-al-lost) 36%, transparent); background: color-mix(in srgb, var(--as-al-lost) 8%, transparent); }
.ld-toggle-track { position: relative; width: 38px; height: 21px; border-radius: 999px; background: var(--as-border-strong); transition: background 0.3s; flex-shrink: 0; }
.ld-toggle.on .ld-toggle-track { background: var(--as-al-lost); }
.ld-toggle-knob { position: absolute; top: 2px; left: 2px; width: 17px; height: 17px; border-radius: 50%; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.3); transition: transform 0.3s var(--as-spring); }
.ld-toggle.on .ld-toggle-knob { transform: translateX(17px); }
.ld-toggle-lab { font-size: 12.5px; font-weight: 700; color: var(--as-text-secondary); }
.ld-toggle.on .ld-toggle-lab { color: var(--as-al-lost); }

/* evidence */
.ld-photos { display: flex; flex-wrap: wrap; gap: 8px; }
.ld-thumb { position: relative; width: 62px; height: 62px; border-radius: 12px; overflow: hidden; border: 1px solid var(--as-border-soft); }
.ld-thumb img { width: 100%; height: 100%; object-fit: cover; }
.ld-thumb-x { position: absolute; top: 3px; right: 3px; width: 18px; height: 18px; border-radius: 6px; display: grid; place-items: center; border: none; cursor: pointer; color: #fff; background: rgba(0,0,0,0.6); }
.ld-upload { display: grid; place-items: center; width: 62px; height: 62px; border-radius: 12px; cursor: pointer; color: var(--as-text-muted);
  background: var(--as-surface); border: 1.5px dashed var(--as-border-strong); transition: all 0.2s; }
.ld-upload:hover { color: var(--as-al-damaged); border-color: color-mix(in srgb, var(--as-al-damaged) 42%, transparent); }
.ld-upload.busy { opacity: 0.6; cursor: wait; }

.as-btn.disabled { opacity: 0.5; cursor: not-allowed; }
.spin { animation: as-spin 0.9s linear infinite; }

@keyframes ld-draw { to { stroke-dashoffset: 0; } }
@keyframes ld-sweep { 0% { left: -56px; } 100% { left: 100%; } }
@media (prefers-reduced-motion: reduce) {
  .ld-pv-line { animation: none; stroke-dashoffset: 0; } .ld-pv-sweep { animation: none; }
  .ld-sev-ind { transition: none; } .spin { animation: none; }
}
</style>
