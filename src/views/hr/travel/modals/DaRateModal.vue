<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" as="div" class="dr-ov" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.24 }" @click.self="$emit('close')">
        <Motion as="div" class="dr" :initial="{ opacity: 0, y: 20, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 14, scale: 0.97 }" :transition="{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }">
          <span class="dr-aura" aria-hidden="true" />
          <header class="dr-head">
            <div>
              <span class="dr-eyebrow"><Calculator :size="12" /> DA matrix · {{ form.id ? 'amend' : 'add rate' }}</span>
              <h3>{{ form.id ? 'Edit DA rate' : 'Add DA rate' }}</h3>
            </div>
            <button class="dr-x" @click="$emit('close')"><X :size="18" /></button>
          </header>

          <div class="dr-body">
            <!-- live rate token -->
            <div class="token" :style="{ '--c': cityMeta(form.city_category).hex }">
              <span class="tk-tier"><span class="tk-dot" /> {{ cityMeta(form.city_category).label }}</span>
              <span class="tk-rate trv-mono">{{ fmtINR(form.daily_rate || 0) }}<em>/day</em></span>
              <span class="tk-grade">{{ gradeLabel }}</span>
            </div>

            <div class="grid2">
              <div class="fld"><label>Grade band</label><TrvSelect v-model="form.grade_id" :options="gradeOpts" placeholder="All grades" /></div>
              <div class="fld"><label>City tier</label><TrvSelect v-model="form.city_category" :options="cityOpts" /></div>
            </div>
            <div class="fld"><label>Daily rate (₹)</label>
              <div class="inp-money"><span>₹</span><input v-model.number="form.daily_rate" type="number" min="0" class="inp bare" placeholder="0" /></div>
            </div>
          </div>

          <footer class="dr-foot">
            <button v-if="form.id" class="btn del" :class="{ armed: confirmDel }" @click="onDelete">
              <Trash2 :size="14" /> {{ confirmDel ? 'Confirm delete?' : 'Delete' }}
            </button>
            <span class="dr-spacer" />
            <button class="btn ghost" @click="$emit('close')">Cancel</button>
            <Motion as="button" class="btn primary" :disabled="busy || !form.city_category" :whileHover="!busy ? { y: -2 } : {}" :whileTap="!busy ? { scale: 0.97 } : {}" @click="save">
              <Loader2 v-if="busy" :size="15" class="spin" /><Check v-else :size="15" /> Save rate
            </Motion>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { Calculator, X, Trash2, Check, Loader2 } from 'lucide-vue-next'
import TrvSelect from '../components/TrvSelect.vue'
import { useToast } from 'vue-toastification'
import { fmtINR, errText, createDaRate, updateDaRate, deleteDaRate, cityMeta, CITY_CATEGORIES } from '@/composables/useTravel'

const props = defineProps({ open: Boolean, rate: { type: Object, default: null }, grades: { type: Array, default: () => [] } })
const emit = defineEmits(['close', 'saved'])
const toast = useToast()

const form = reactive({ id: null, grade_id: null, city_category: 'METRO', daily_rate: 0 })
const busy = ref(false)
const confirmDel = ref(false)

const gradeOpts = computed(() => [{ value: null, label: 'All grades (default)' }, ...props.grades.map(g => ({ value: g.id, label: g.name }))])
const cityOpts = CITY_CATEGORIES.map(c => ({ value: c.key, label: c.label, dot: c.hex }))
const gradeLabel = computed(() => form.grade_id ? (props.grades.find(g => g.id === form.grade_id)?.name || 'Grade') : 'All grades')

watch(() => props.open, (o) => {
  if (!o) return
  confirmDel.value = false
  const r = props.rate || {}
  Object.assign(form, { id: r.id || null, grade_id: r.grade_id || null, city_category: r.city_category || 'METRO', daily_rate: r.daily_rate != null ? Number(r.daily_rate) : 0 })
})

const save = async () => {
  busy.value = true
  try {
    const body = { grade_id: form.grade_id, city_category: form.city_category, daily_rate: Number(form.daily_rate) || 0 }
    if (form.id) await updateDaRate(form.id, body); else await createDaRate(body)
    toast.success('DA rate saved'); emit('saved'); emit('close')
  } catch (e) { toast.error(errText(e, 'Could not save rate')) } finally { busy.value = false }
}
const onDelete = async () => {
  if (!confirmDel.value) { confirmDel.value = true; return }
  busy.value = true
  try { await deleteDaRate(form.id); toast.success('DA rate removed'); emit('saved'); emit('close') }
  catch (e) { toast.error(errText(e, 'Could not delete rate')) } finally { busy.value = false; confirmDel.value = false }
}
</script>

<style scoped>
.dr-ov { position: fixed; inset: 0; z-index: 1445; display: grid; place-items: center; padding: 18px; background: rgba(6,5,4,0.64); backdrop-filter: blur(9px); }
.dr { position: relative; width: min(430px, 96vw); overflow: hidden; display: flex; flex-direction: column; border-radius: 20px; background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); box-shadow: var(--trv-shadow); }
.dr-aura { position: absolute; inset: -50% 30% 60% -20%; pointer-events: none; background: radial-gradient(55% 70% at 30% 0%, rgba(251,191,36,0.15), transparent 70%); animation: trv-aura-drift 10s ease-in-out infinite; }
.dr-head { position: relative; display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 12px; }
.dr-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trv-amber); }
.dr-head h3 { font-size: 17px; font-weight: 850; margin: 5px 0 0; color: var(--trv-text); }
.dr-x { background: var(--trv-panel); border: 1px solid var(--trv-border); border-radius: 9px; padding: 6px; color: var(--trv-text-dim); cursor: pointer; }
.dr-body { position: relative; padding: 6px 18px 14px; display: flex; flex-direction: column; gap: 13px; }
.token { position: relative; display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 14px; background: linear-gradient(180deg, var(--trv-flap), color-mix(in srgb, var(--trv-flap) 84%, #000)); border: 1px solid color-mix(in srgb, var(--c) 32%, var(--trv-border-strong)); }
.tk-tier { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 700; color: var(--c); }
.tk-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--c); box-shadow: 0 0 7px var(--c); }
.tk-rate { font-size: 24px; font-weight: 850; color: var(--trv-amber-bright); margin-left: auto; }
.tk-rate em { font-size: 11px; font-style: normal; color: var(--trv-text-dim); font-weight: 600; }
.tk-grade { position: absolute; left: 16px; bottom: 7px; font-size: 9.5px; color: var(--trv-text-dim); }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.fld label { display: block; font-size: 11px; font-weight: 650; color: var(--trv-text-muted); margin-bottom: 6px; }
.inp { width: 100%; font-size: 13px; font-family: inherit; color: var(--trv-text); }
.inp-money { display: flex; align-items: center; gap: 6px; padding: 0 12px; border-radius: 10px; background: rgba(0,0,0,0.3); border: 1px solid var(--trv-border); }
.inp-money span { color: var(--trv-text-muted); font-weight: 700; }
.inp.bare { background: none; border: none; padding: 10px 0; }
.dr-foot { display: flex; align-items: center; gap: 10px; padding: 13px 18px; border-top: 1px solid var(--trv-border); }
.dr-spacer { flex: 1; }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.btn.del { background: transparent; border-color: rgba(239,68,68,0.3); color: var(--trv-st-rejected); padding: 10px 13px; }
.btn.del.armed { background: var(--trv-st-rejected); color: #fff; }
.btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.spin { animation: dr-spin 0.8s linear infinite; }
@keyframes dr-spin { to { transform: rotate(360deg); } }
[data-theme="light"] .dr-ov { background: rgba(60,40,15,0.32); }
[data-theme="light"] .inp-money { background: rgba(255,250,240,0.72); }
[data-theme="light"] .token { background: linear-gradient(180deg, #2a2620, #1f1c16); }
@media (prefers-reduced-motion: reduce) { .dr-aura { animation: none; } .spin { animation: none; } }
</style>
