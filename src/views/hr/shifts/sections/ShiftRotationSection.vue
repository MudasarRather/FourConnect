<template>
  <section class="rot">
    <Motion as="header" class="rot-banner" :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5 }">
      <span class="banner-glow" />
      <div class="banner-text">
        <span class="eyebrow"><RefreshCcw :size="12" /> Cyclic schedules</span>
        <h2>Shift Rotation</h2>
        <p>Define an ordered cycle of shifts (or OFF blocks) and the members it covers. Advancing a rotation schedules the next step for every member automatically.</p>
      </div>
      <div class="banner-actions">
        <button class="btn-primary" @click="openCreate"><Plus :size="14" />New rotation</button>
        <button class="btn-ghost" @click="reload" :class="{ spin: loading }"><RefreshCw :size="14" /></button>
      </div>
    </Motion>

    <div class="grid">
      <Motion v-for="(r, i) in rotations" :key="r.id" as="article" class="rot-card"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.05 * i }">
        <header class="rc-head">
          <div>
            <h3>{{ r.name }}</h3>
            <span class="rc-cycle">{{ cycleLabel(r) }} · {{ r.frequency_days }}d step</span>
          </div>
          <ShiftStatusPill :tone="r.is_active ? 'ok' : 'neutral'">{{ r.is_active ? 'Active' : 'Paused' }}</ShiftStatusPill>
        </header>

        <!-- step ring -->
        <div class="rc-ring">
          <div class="ring-orbit">
            <span v-for="(s, si) in r.steps" :key="si" class="orbit-dot"
              :class="{ current: (r.current_step_index % (r.steps.length || 1)) === si, off: !s.shift_id }"
              :style="dotStyle(si, r.steps.length)" :title="`${si+1}. ${stepLabel(s)}`" />
            <span class="ring-core">{{ (r.current_step_index % (r.steps.length || 1)) + 1 }}<small>/{{ r.steps.length }}</small></span>
          </div>
          <div class="rc-steps">
            <span v-for="(s, si) in r.steps" :key="si" class="step-pill" :class="{ current: (r.current_step_index % (r.steps.length || 1)) === si }">
              <b>{{ si + 1 }}</b> {{ stepLabel(s) }}
            </span>
          </div>
        </div>

        <div class="rc-meta">
          <span><Users :size="11" />{{ r.member_count }} member{{ r.member_count === 1 ? '' : 's' }}</span>
          <span><Clock :size="11" />{{ r.last_advanced_on ? `Advanced ${r.last_advanced_on}` : 'Never advanced' }}</span>
        </div>

        <div class="rc-actions">
          <button class="ra-advance" @click="advance(r)" :disabled="advancing === r.id">
            <Loader2 v-if="advancing === r.id" :size="13" class="spin" /><FastForward v-else :size="13" />
            Advance
          </button>
          <button class="ra-ghost" @click="openEdit(r)"><Pencil :size="13" /></button>
          <button class="ra-ghost danger" @click="confirmDelete(r)"><Trash2 :size="13" /></button>
        </div>
      </Motion>

      <ShiftEmptyState v-if="!loading && !rotations.length" :icon="RefreshCcw"
        title="No rotations yet"
        sub="Build a cyclic pattern — e.g. Week 1 Morning → Week 2 Evening → Week 3 Night → Off — and advance it to schedule your team.">
        <template #actions><button class="btn-primary" @click="openCreate"><Plus :size="14" />Create rotation</button></template>
      </ShiftEmptyState>
    </div>

    <ShiftRotationModal :open="showModal" :rotation="editTarget" :shifts="shifts" @close="showModal = false" @saved="onSaved" />
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { RefreshCcw, RefreshCw, Plus, Pencil, Trash2, Users, Clock, FastForward, Loader2 } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ShiftRotationModal from '../modals/ShiftRotationModal.vue'
import ShiftStatusPill from '../components/ShiftStatusPill.vue'
import ShiftEmptyState from '../components/ShiftEmptyState.vue'
import { fetchRotations, fetchShifts, advanceRotation, deleteRotation } from '@/composables/useShifts'

const emit = defineEmits(['refresh-stats'])
const toast = useToast()

const rotations = ref([])
const shifts = ref([])
const loading = ref(false)
const advancing = ref(null)
const showModal = ref(false)
const editTarget = ref(null)

const CYCLE = { WEEKLY: 'Weekly', BIWEEKLY: 'Biweekly', MONTHLY: 'Monthly', CUSTOM: 'Custom' }
const cycleLabel = (r) => CYCLE[r.cycle] || r.cycle
const stepLabel = (s) => s.label || s.shift_name || 'OFF'

const dotStyle = (i, total) => {
  const ang = (i / (total || 1)) * Math.PI * 2 - Math.PI / 2
  const R = 34
  return { left: `calc(50% + ${(R * Math.cos(ang)).toFixed(1)}px)`, top: `calc(50% + ${(R * Math.sin(ang)).toFixed(1)}px)` }
}

const reload = async () => {
  loading.value = true
  try {
    const [rot, sh] = await Promise.all([fetchRotations({ limit: 100 }), fetchShifts({ limit: 100 })])
    rotations.value = rot.items || []
    shifts.value = sh.items || []
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load rotations') }
  finally { loading.value = false }
}
onMounted(reload)

const openCreate = () => { editTarget.value = null; showModal.value = true }
const openEdit = (r) => { editTarget.value = r; showModal.value = true }
const onSaved = async () => { await reload(); emit('refresh-stats') }

const advance = async (r) => {
  if (advancing.value) return
  advancing.value = r.id
  try {
    const res = await advanceRotation(r.id)
    toast.success(`Advanced to step ${res.advanced_to_step + 1} · ${res.assignments_written} scheduled (${res.window_from} → ${res.window_to})`)
    await reload(); emit('refresh-stats')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not advance rotation') }
  finally { advancing.value = null }
}

const confirmDelete = async (r) => {
  if (!window.confirm(`Delete rotation "${r.name}"? Existing assignments stay intact.`)) return
  try {
    await deleteRotation(r.id)
    toast.success('Rotation deleted')
    await reload()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not delete') }
}
</script>

<style scoped>
.rot { display: flex; flex-direction: column; gap: 18px; }
.rot-banner { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 20px 24px; border-radius: 20px; overflow: hidden; background: var(--shift-surface); border: 1px solid var(--shift-border); }
.banner-glow { position: absolute; inset: 0; background: var(--shift-grad-hero); pointer-events: none; }
.banner-text { position: relative; z-index: 1; max-width: 640px; }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--shift-amber-strong); }
.banner-text h2 { margin: 6px 0 4px; font-size: 22px; font-weight: 800; color: var(--shift-text); letter-spacing: -0.02em; }
.banner-text p { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--shift-text-muted); }
.banner-actions { position: relative; z-index: 1; display: flex; gap: 8px; flex-shrink: 0; }
.btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; border-radius: 10px; border: none; cursor: pointer; background: var(--shift-grad-cta); color: #1f1408; font-weight: 700; font-size: 13px; }
.btn-ghost { display: inline-flex; align-items: center; gap: 6px; padding: 9px 13px; border-radius: 10px; cursor: pointer; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); font-weight: 600; font-size: 13px; }
.btn-ghost.spin :deep(svg) { animation: shift-spin 0.85s linear infinite; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
.rot-card { display: flex; flex-direction: column; gap: 14px; padding: 18px; border-radius: 18px; background: var(--shift-surface); border: 1px solid var(--shift-border-soft); }
.rc-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.rc-head h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--shift-text); }
.rc-cycle { font-family: var(--shift-mono); font-size: 10.5px; color: var(--shift-text-muted); }

.rc-ring { display: flex; align-items: center; gap: 16px; }
.ring-orbit { position: relative; width: 92px; height: 92px; flex-shrink: 0; }
.orbit-dot { position: absolute; width: 11px; height: 11px; border-radius: 50%; transform: translate(-50%, -50%); background: var(--shift-amber); border: 2px solid var(--shift-canvas); }
.orbit-dot.off { background: var(--shift-text-dim); }
.orbit-dot.current { box-shadow: 0 0 0 4px rgba(251,191,36,0.25); animation: shift-ring-pulse 2.2s ease-in-out infinite; }
.ring-core { position: absolute; inset: 26px; border-radius: 50%; display: grid; place-items: center; font-family: var(--shift-mono); font-size: 16px; font-weight: 800; color: var(--shift-amber);
  background: radial-gradient(circle, rgba(251,191,36,0.16), transparent 70%); border: 1px solid var(--shift-border); }
.ring-core small { font-size: 9px; color: var(--shift-text-dim); }
.rc-steps { display: flex; flex-wrap: wrap; gap: 5px; }
.step-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--shift-text-muted); background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); padding: 3px 8px; border-radius: 999px; }
.step-pill b { font-family: var(--shift-mono); color: var(--shift-amber); }
.step-pill.current { border-color: var(--shift-amber); color: var(--shift-text); }

.rc-meta { display: flex; gap: 14px; }
.rc-meta span { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--shift-text-muted); }
.rc-meta svg { color: var(--shift-amber); }
.rc-actions { display: flex; gap: 8px; margin-top: auto; }
.ra-advance { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 9px; border-radius: 10px; cursor: pointer; border: none; background: var(--shift-grad-cta); color: #1f1408; font-weight: 700; font-size: 12.5px; }
.ra-advance:disabled { opacity: 0.6; }
.ra-ghost { width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--shift-border-soft); background: var(--shift-surface-2); color: var(--shift-text-muted); cursor: pointer; display: grid; place-items: center; }
.ra-ghost:hover { color: var(--shift-amber); border-color: var(--shift-border); }
.ra-ghost.danger:hover { color: var(--shift-alert); border-color: var(--shift-alert-soft); }
.spin :deep(svg), .spin { animation: shift-spin 0.85s linear infinite; }
</style>
