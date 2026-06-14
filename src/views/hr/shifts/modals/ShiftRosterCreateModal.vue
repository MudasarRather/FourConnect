<template>
  <Teleport to="body">
    <transition name="rc-modal" appear>
      <div v-if="open" class="rc-scrim" @click.self="onClose">
        <div class="rc-motes" aria-hidden="true">
          <span v-for="n in 14" :key="n" class="rc-mote" :style="moteStyle(n)" />
        </div>

        <Motion as="div" class="rc-modal" role="dialog" aria-modal="true"
          :initial="{ opacity: 0, y: 30, scale: 0.93, rotateX: -7 }"
          :animate="{ opacity: 1, y: 0, scale: 1, rotateX: 0 }"
          :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">

          <div class="rc-aurora" aria-hidden="true"><span class="orb a1" /><span class="orb a2" /><span class="orb a3" /></div>
          <div class="rc-grid" aria-hidden="true" />
          <div class="rc-scan" aria-hidden="true" />
          <span class="rc-edge" aria-hidden="true" />

          <header class="rc-head">
            <div class="rc-hrow">
              <div class="rc-icon"><CalendarRange :size="19" /><span class="ic-ring" /><span class="ic-glow" /></div>
              <div class="rc-htext">
                <span class="rc-eyebrow"><span class="eye-dot" /> ROSTER · WEEKLY MANPOWER PLAN</span>
                <h2>New weekly roster</h2>
                <p>Spin up a draft week — lay out who works which shift, then publish to write one-day assignments.</p>
              </div>
            </div>
            <button class="rc-close" @click="onClose" aria-label="Close"><X :size="16" /></button>
          </header>

          <div class="rc-body">
            <!-- WEEK -->
            <Motion as="section" class="rc-section"
              :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.1 }">
              <div class="rc-shead"><CalendarClock :size="12" /> Week starting <span class="rc-sub-note">snaps to Monday</span></div>
              <div class="rc-week-pick">
                <HrDatePicker v-model="pickedDate" :clearable="false" placeholder="Pick any day in the week" />
                <span class="rc-range"><b>{{ rangeLabel }}</b></span>
              </div>
              <div class="rc-strip">
                <Motion v-for="(d, i) in weekDays" :key="d.iso" as="div" class="rc-day" :class="{ wknd: d.weekday >= 5, today: d.isToday }"
                  :initial="{ opacity: 0, y: 10, scale: 0.9 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
                  :transition="{ duration: 0.4, delay: 0.18 + i * 0.04, ease: [0.16,1,0.3,1] }">
                  <span class="rcd-dow">{{ d.dow }}</span>
                  <span class="rcd-num">{{ d.num }}</span>
                  <span v-if="d.isToday" class="rcd-today">today</span>
                </Motion>
              </div>
            </Motion>

            <!-- START FROM -->
            <Motion as="section" class="rc-section"
              :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.16 }">
              <div class="rc-shead"><Sparkles :size="12" /> Start from</div>
              <div class="rc-seed">
                <Motion v-for="(o, oi) in seedOptions" :key="o.key" as="button" type="button"
                  class="seed-opt" :class="{ on: sourceMode === o.key }"
                  :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.3, delay: 0.2 + oi * 0.05 }"
                  :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="sourceMode = o.key">
                  <component :is="o.icon" :size="15" />
                  <b>{{ o.label }}</b>
                  <small>{{ o.hint }}</small>
                </Motion>
              </div>
              <transition name="rc-pick">
                <div v-if="sourceMode !== 'blank'" class="rc-field rc-seed-pick">
                  <span>{{ sourceMode === 'copy' ? 'Copy entries from' : 'Seed grid from rotation' }}</span>
                  <HrSelect v-if="sourceMode === 'copy'" :model-value="copyFromId" :options="copyOptions"
                    placeholder="Choose a roster…" @update:model-value="v => copyFromId = v" />
                  <HrSelect v-else :model-value="rotationId" :options="rotationOptions"
                    placeholder="Choose a rotation…" @update:model-value="v => rotationId = v" />
                  <span class="rc-seed-note" v-if="sourceMode === 'copy'">Members &amp; their shifts are remapped onto this week — edit freely before publishing.</span>
                  <span class="rc-seed-note" v-else>Rotation members are placed on the shift their cycle lands on for each day this week.</span>
                </div>
              </transition>
            </Motion>

            <!-- DETAILS -->
            <Motion as="section" class="rc-section"
              :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.22 }">
              <div class="rc-shead"><Tag :size="12" /> Details</div>
              <div class="rc-grid2">
                <label class="rc-field">
                  <span>Roster name</span>
                  <input v-model="form.name" class="rc-input" :placeholder="defaultName" />
                </label>
                <label class="rc-field">
                  <span>Department <em>optional</em></span>
                  <HrSelect :model-value="form.department_id" :options="deptOptions"
                    placeholder="All departments" @update:model-value="v => form.department_id = v" />
                </label>
              </div>
              <label class="rc-field">
                <span>Notes <em>optional</em></span>
                <textarea v-model.trim="form.notes" rows="2" maxlength="500" class="rc-textarea" placeholder="e.g. Festive-week coverage, extra night crew…" />
              </label>
            </Motion>

            <!-- HINT -->
            <Motion as="div" class="rc-hint"
              :initial="{ opacity: 0, scale: 0.97 }" :animate="{ opacity: 1, scale: 1 }" :transition="{ duration: 0.4, delay: 0.26 }">
              <Sparkles :size="14" />
              <span>Created as a <b>draft</b> — nothing is committed to attendance until you publish.</span>
            </Motion>
          </div>

          <footer class="rc-foot">
            <span class="rc-foot-ctx">{{ rangeLabel }}<template v-if="form.department_id"> · {{ deptName }}</template></span>
            <div class="rc-foot-actions">
              <button class="rc-btn ghost" @click="onClose" :disabled="saving">Cancel</button>
              <Motion as="button" class="rc-btn primary" :class="{ armed: !saving }" :disabled="saving"
                :whileHover="!saving ? { y: -2 } : {}" :whileTap="!saving ? { scale: 0.96 } : {}" @click="submit">
                <Loader2 v-if="saving" :size="15" class="spin" /><CalendarPlus v-else :size="15" />
                {{ saving ? 'Creating…' : 'Create draft roster' }}
                <span v-if="!saving" class="flare" aria-hidden="true" />
              </Motion>
            </div>
          </footer>
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  X, CalendarRange, CalendarClock, CalendarPlus, Tag, Building2, ChevronDown, Sparkles, Loader2,
  FilePlus2, Copy, RefreshCcw,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import HrSelect from '@/components/hr/forms/HrSelect.vue'
import {
  createRoster, fetchDepartments, mondayOf, DOW_FULL, todayIso,
  fetchRosters, fetchRoster, fetchRotations, upsertRosterEntries,
} from '@/composables/useShifts'

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['close', 'created'])
const toast = useToast()

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const pickedDate = ref(todayIso())
const departments = ref([])
const saving = ref(false)
const form = reactive({ name: '', department_id: null, notes: '' })

// ── start-from ──
const sourceMode = ref('blank')     // 'blank' | 'copy' | 'rotation'
const copyFromId = ref(null)
const rotationId = ref(null)
const recentRosters = ref([])
const rotations = ref([])
const seedOptions = [
  { key: 'blank', label: 'Blank week', hint: 'Empty grid', icon: FilePlus2 },
  { key: 'copy', label: 'Copy a week', hint: 'Reuse a roster', icon: Copy },
  { key: 'rotation', label: 'From rotation', hint: 'Auto-fill cycle', icon: RefreshCcw },
]

const weekStart = computed(() => iso(mondayOf(new Date((pickedDate.value || todayIso()) + 'T00:00:00'))))
const weekDays = computed(() => {
  const start = new Date(weekStart.value + 'T00:00:00')
  const t = todayIso()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(d.getDate() + i)
    return { iso: iso(d), dow: DOW_FULL[i], num: d.getDate(), weekday: i, isToday: iso(d) === t }
  })
})
const fmt = (isoStr) => {
  const d = new Date(isoStr + 'T00:00:00')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
const rangeLabel = computed(() => `${fmt(weekDays.value[0].iso)} – ${fmt(weekDays.value[6].iso)}`)
const defaultName = computed(() => `Week of ${weekStart.value}`)
const deptName = computed(() => departments.value.find(d => d.id === form.department_id)?.name || '')

const rosterLabel = (r) => `${fmt(r.week_start)} — ${r.name || r.status || 'roster'}`

const copyOptions = computed(() => recentRosters.value.map(r => ({ value: r.id, label: rosterLabel(r) })))
const rotationOptions = computed(() => rotations.value.map(r => ({ value: r.id, label: `${r.name} · ${r.member_count ?? 0} members` })))
const deptOptions = computed(() => [{ value: null, label: 'All departments' }, ...departments.value.map(d => ({ value: d.id, label: d.name }))])

watch(() => props.open, async (o) => {
  if (!o) return
  pickedDate.value = todayIso()
  form.name = ''; form.department_id = null; form.notes = ''
  sourceMode.value = 'blank'; copyFromId.value = null; rotationId.value = null
  try { departments.value = await fetchDepartments() } catch { departments.value = [] }
  try { recentRosters.value = (await fetchRosters({ limit: 50 })).items || [] } catch { recentRosters.value = [] }
  try { rotations.value = (await fetchRotations({ limit: 50 })).items || [] } catch { rotations.value = [] }
})

// Remap a source roster's entries onto the new week (shift each day by the
// whole-week offset between the two week-starts).
const buildCopyEntries = async (sourceId, targetWeekStart) => {
  try {
    const src = await fetchRoster(sourceId)
    if (!src?.week_start) return []
    const offset = Math.round((new Date(targetWeekStart + 'T00:00:00') - new Date(src.week_start + 'T00:00:00')) / 86400000)
    return (src.entries || []).map(e => {
      const d = new Date(e.day + 'T00:00:00'); d.setDate(d.getDate() + offset)
      return { employee_id: e.employee_id, day: iso(d), shift_id: e.shift_id || null }
    })
  } catch { return [] }
}

// Project a rotation's cycle onto the week: for each member + day, resolve the
// step that's active that day (anchor + period math, phase-staggered).
const buildRotationEntries = (rotId, weekStartIso) => {
  const rot = rotations.value.find(r => r.id === rotId)
  const steps = rot?.steps || []
  const members = rot?.members || []
  if (!steps.length || !members.length) return []
  const n = steps.length
  const period = rot.frequency_days || 7
  const anchor = new Date((rot.anchor_date || todayIso()) + 'T00:00:00')
  const ws = new Date(weekStartIso + 'T00:00:00')
  const out = []
  for (const m of members) {
    const p = m.phase_offset || 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(ws); d.setDate(d.getDate() + i)
      const gweek = Math.floor((d - anchor) / 86400000 / period)
      const idx = (((gweek + p) % n) + n) % n
      out.push({ employee_id: m.employee_id, day: iso(d), shift_id: steps[idx].shift_id || null })
    }
  }
  return out
}

const onClose = () => { if (!saving.value) emit('close') }
const submit = async () => {
  if (saving.value) return
  if (sourceMode.value === 'copy' && !copyFromId.value) { toast.warning('Pick a roster to copy from'); return }
  if (sourceMode.value === 'rotation' && !rotationId.value) { toast.warning('Pick a rotation to seed from'); return }
  saving.value = true
  try {
    const r = await createRoster({
      week_start: weekStart.value,
      name: form.name.trim() || defaultName.value,
      department_id: form.department_id || null,
      notes: form.notes || null,
    })
    let seeded = []
    if (sourceMode.value === 'copy') seeded = await buildCopyEntries(copyFromId.value, weekStart.value)
    else if (sourceMode.value === 'rotation') seeded = buildRotationEntries(rotationId.value, weekStart.value)
    if (seeded.length) {
      try { await upsertRosterEntries(r.id, seeded) }
      catch { toast.warning('Roster created, but seeding the grid failed — you can build it manually') }
    }
    toast.success(seeded.length ? `Draft roster created · ${seeded.length} cells seeded` : 'Draft roster created')
    emit('created', r)
    emit('close')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not create roster')
  } finally { saving.value = false }
}

const moteStyle = (n) => {
  const x = (n * 47) % 100, y = (n * 83) % 100
  const dur = 7 + ((n * 3) % 8), delay = (n % 6) * 0.5, size = 2 + (n % 3)
  return { left: `${x}%`, top: `${y}%`, width: `${size}px`, height: `${size}px`, animationDuration: `${dur}s`, animationDelay: `${delay}s` }
}
</script>

<style scoped>
.rc-scrim {
  position: fixed; inset: 0; z-index: 1200; display: flex; align-items: center; justify-content: center; padding: 26px;
  background: radial-gradient(70% 60% at 50% 35%, rgba(251, 146, 60, 0.16), transparent 65%), radial-gradient(90% 90% at 50% 50%, rgba(6, 7, 10, 0.62), rgba(2, 3, 5, 0.78));
  backdrop-filter: blur(16px) saturate(150%); -webkit-backdrop-filter: blur(16px) saturate(150%); perspective: 1500px; overflow-y: auto;
}
.rc-motes { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.rc-mote { position: absolute; border-radius: 50%; background: radial-gradient(circle, rgba(251, 191, 36, 0.9), rgba(251, 191, 36, 0)); box-shadow: 0 0 10px rgba(251, 191, 36, 0.5); opacity: 0.6; animation: rc-float linear infinite; }
@keyframes rc-float { 0% { transform: translate3d(0, 18vh, 0) scale(0.6); opacity: 0; } 15% { opacity: 0.6; } 85% { opacity: 0.6; } 100% { transform: translate3d(36px, -116vh, 0) scale(1.2); opacity: 0; } }

.rc-modal {
  position: relative; width: 640px; max-width: calc(100vw - 32px); max-height: calc(100vh - 52px);
  display: flex; flex-direction: column; border-radius: 24px; overflow: hidden; isolation: isolate;
  background: radial-gradient(120% 80% at 0% 0%, rgba(251, 191, 36, 0.08), transparent 55%), radial-gradient(90% 70% at 100% 100%, rgba(234, 88, 12, 0.08), transparent 60%), linear-gradient(180deg, rgba(18, 20, 24, 0.92), rgba(12, 13, 16, 0.94));
  border: 1px solid var(--shift-border);
  box-shadow: 0 60px 120px -40px rgba(0,0,0,0.92), 0 0 0 1px rgba(251, 191, 36, 0.05), 0 0 100px -16px rgba(251, 146, 60, 0.22);
}
.rc-aurora { position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.rc-aurora .orb { position: absolute; border-radius: 50%; filter: blur(72px); opacity: 0.5; }
.rc-aurora .a1 { width: 320px; height: 320px; top: -120px; right: -100px; background: radial-gradient(circle, rgba(251, 191, 36, 0.5), transparent 70%); animation: rc-orb-a 19s ease-in-out infinite; }
.rc-aurora .a2 { width: 280px; height: 280px; bottom: -110px; left: -80px; background: radial-gradient(circle, rgba(234, 88, 12, 0.42), transparent 70%); animation: rc-orb-b 23s ease-in-out infinite; }
.rc-aurora .a3 { width: 200px; height: 200px; top: 45%; right: -60px; background: radial-gradient(circle, rgba(245, 158, 11, 0.32), transparent 70%); animation: rc-orb-c 27s ease-in-out infinite; }
@keyframes rc-orb-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-26px,36px) scale(1.08); } }
@keyframes rc-orb-b { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(32px,-22px) scale(1.1); } }
@keyframes rc-orb-c { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-14px,16px) scale(0.94); } }
.rc-grid { position: absolute; inset: 0; pointer-events: none; z-index: 0; background-image: radial-gradient(var(--shift-grid-line) 1px, transparent 1px); background-size: 22px 22px; opacity: 0.5; mask-image: linear-gradient(180deg, rgba(0,0,0,0.4), transparent 80%); }
.rc-scan { position: absolute; inset: 0; pointer-events: none; z-index: 1; overflow: hidden; }
.rc-scan::after { content: ''; position: absolute; left: 0; right: 0; height: 90px; background: linear-gradient(180deg, transparent, rgba(251, 191, 36, 0.14), transparent); filter: blur(6px); transform: translateY(-100%); animation: rc-sweep 1.8s 0.25s cubic-bezier(0.16,1,0.3,1) forwards; }
@keyframes rc-sweep { to { transform: translateY(100vh); opacity: 0; } }
.rc-edge { position: absolute; top: 0; left: 0; right: 0; height: 2px; z-index: 4; background: var(--shift-grad-cta); }

.rc-head { position: relative; z-index: 3; display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 22px 24px 14px; }
.rc-hrow { display: flex; align-items: center; gap: 13px; }
.rc-icon { position: relative; display: grid; place-items: center; width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0; background: linear-gradient(135deg, rgba(251, 191, 36, 0.22), rgba(234, 88, 12, 0.18)); border: 1px solid var(--shift-border); color: var(--shift-amber); box-shadow: 0 10px 28px -12px rgba(251, 146, 60, 0.6); }
.ic-ring { position: absolute; inset: -5px; border-radius: 18px; pointer-events: none; background: conic-gradient(from 0deg, transparent, var(--shift-amber), transparent 28%, transparent 55%, var(--shift-ember), transparent 82%); -webkit-mask: radial-gradient(transparent 56%, #000 58%); mask: radial-gradient(transparent 56%, #000 58%); animation: rc-ring 6s linear infinite; opacity: 0.8; }
@keyframes rc-ring { to { transform: rotate(360deg); } }
.ic-glow { position: absolute; inset: -16px; border-radius: 28px; pointer-events: none; z-index: -1; background: radial-gradient(circle, rgba(251, 146, 60, 0.3), transparent 65%); animation: rc-glow 3.6s ease-in-out infinite; }
@keyframes rc-glow { 0%,100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.14); } }
.rc-htext h2 { margin: 4px 0 2px; font-size: 21px; font-weight: 800; letter-spacing: -0.02em; color: var(--shift-text); line-height: 1.1; }
.rc-htext p { margin: 0; font-size: 12px; color: var(--shift-text-muted); }
.rc-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 9px; font-weight: 700; letter-spacing: 0.14em; color: var(--shift-amber-strong); }
.eye-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--shift-ok); box-shadow: 0 0 8px var(--shift-ok); animation: rc-eye 1.6s ease-in-out infinite; }
@keyframes rc-eye { 0%,100% { opacity: 0.7; transform: scale(1); } 50% { opacity: 1; transform: scale(1.4); } }
.rc-close { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0; cursor: pointer; background: rgba(255,255,255,0.05); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); transition: transform .35s var(--shift-spring), background .25s, color .25s; }
.rc-close:hover { transform: rotate(90deg); background: rgba(255,255,255,0.1); color: var(--shift-text); }

.rc-body { position: relative; z-index: 3; flex: 1; min-height: 0; overflow-y: auto; padding: 6px 24px 20px; display: flex; flex-direction: column; gap: 16px;
  scrollbar-width: thin; scrollbar-color: rgba(251,191,36,0.25) transparent; }
.rc-body::-webkit-scrollbar { width: 6px; } .rc-body::-webkit-scrollbar-thumb { background: linear-gradient(180deg, rgba(251,191,36,0.3), rgba(234,88,12,0.4)); border-radius: 3px; }
.rc-section { display: flex; flex-direction: column; gap: 11px; }
.rc-shead { display: flex; align-items: center; gap: 7px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--shift-text-muted); }
.rc-shead svg { color: var(--shift-amber); }
.rc-sub-note { margin-left: 6px; font-size: 9px; font-weight: 600; letter-spacing: 0; text-transform: none; color: var(--shift-text-dim); }

.rc-week-pick { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.rc-range { font-size: 12.5px; color: var(--shift-text-muted); }
.rc-range b { font-family: var(--shift-mono); font-size: 13px; color: var(--shift-amber); }
.rc-strip { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
.rc-day { position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 10px 4px; border-radius: 12px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.rc-day.wknd { background: color-mix(in srgb, var(--shift-ember) 7%, var(--shift-surface-2)); }
.rc-day.today { border-color: var(--shift-amber); background: rgba(251,191,36,0.1); box-shadow: 0 6px 18px -10px var(--shift-amber); }
.rcd-dow { font-family: var(--shift-mono); font-size: 9px; text-transform: uppercase; color: var(--shift-text-dim); }
.rcd-num { font-size: 16px; font-weight: 800; color: var(--shift-text); }
.rcd-today { font-size: 7.5px; font-family: var(--shift-mono); text-transform: uppercase; letter-spacing: 0.05em; color: var(--shift-amber); }

.rc-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.rc-field { display: flex; flex-direction: column; gap: 5px; }
.rc-field > span { font-size: 11px; color: var(--shift-text-muted); }
.rc-field em { color: var(--shift-text-dim); font-style: normal; font-size: 10px; margin-left: 3px; }
.rc-input { background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); border-radius: 10px; padding: 9px 11px; color: var(--shift-text); font: inherit; font-size: 13px; transition: border-color .2s, box-shadow .2s; }
.rc-input:focus { outline: none; border-color: var(--shift-amber); box-shadow: 0 0 0 3px rgba(251,191,36,0.1); }
.rc-select-wrap { position: relative; display: flex; align-items: center; gap: 8px; padding: 0 11px; border-radius: 10px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); color: var(--shift-text-muted); }
.rc-select-wrap:focus-within { border-color: var(--shift-amber); }
.rc-select { flex: 1; appearance: none; background: transparent; border: 0; outline: none; padding: 9px 0; color: var(--shift-text); font: inherit; font-size: 13px; cursor: pointer; }
.rc-sel-caret { flex-shrink: 0; pointer-events: none; }
.rc-textarea { width: 100%; resize: vertical; min-height: 50px; padding: 10px 12px; border-radius: 11px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); color: var(--shift-text); font: inherit; font-size: 12.5px; line-height: 1.5; outline: none; transition: border-color .2s, box-shadow .2s; }
.rc-textarea:focus { border-color: var(--shift-amber); box-shadow: 0 0 0 3px rgba(251,191,36,0.1); }
.rc-textarea::placeholder, .rc-input::placeholder { color: var(--shift-text-dim); }

.rc-hint { display: flex; align-items: center; gap: 9px; padding: 11px 13px; border-radius: 12px; font-size: 12px; background: rgba(251,191,36,0.08); border: 1px solid var(--shift-border); color: var(--shift-text-2); }
.rc-hint svg { color: var(--shift-amber); flex-shrink: 0; }
.rc-hint b { color: var(--shift-amber); }

/* start-from */
.rc-seed { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
.seed-opt { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 11px 12px; border-radius: 13px; cursor: pointer; text-align: left;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); transition: border-color .2s, background .2s; }
.seed-opt svg { color: var(--shift-text-muted); transition: color .2s; margin-bottom: 3px; }
.seed-opt b { font-size: 12.5px; color: var(--shift-text); }
.seed-opt small { font-size: 9.5px; color: var(--shift-text-dim); font-family: var(--shift-mono); }
.seed-opt.on { border-color: var(--shift-amber); background: rgba(251,191,36,0.1); box-shadow: 0 6px 18px -12px var(--shift-amber); }
.seed-opt.on svg { color: var(--shift-amber); }
.rc-seed-pick { margin-top: 4px; }
.rc-seed-note { font-size: 10.5px; color: var(--shift-text-dim); line-height: 1.45; margin-top: 2px; }
.rc-pick-enter-active { transition: opacity .3s var(--shift-ease), transform .3s var(--shift-ease); }
.rc-pick-leave-active { transition: opacity .18s ease; }
.rc-pick-enter-from { opacity: 0; transform: translateY(-6px); }
.rc-pick-leave-to { opacity: 0; }
[data-theme="light"] .seed-opt.on { background: rgba(217,119,6,0.1); }

.rc-foot { position: relative; z-index: 3; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 13px 24px; border-top: 1px solid var(--shift-border-soft); background: rgba(12,13,16,0.5); }
.rc-foot-ctx { font-size: 11px; font-family: var(--shift-mono); color: var(--shift-text-dim); }
.rc-foot-actions { display: flex; gap: 9px; }
.rc-btn { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 40px; padding: 0 17px; border-radius: 11px; cursor: pointer; font-size: 13px; font-weight: 700; overflow: hidden; transition: transform .2s, background .25s, color .25s, box-shadow .25s; }
.rc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.rc-btn.ghost { background: rgba(255,255,255,0.04); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); }
.rc-btn.ghost:hover:not(:disabled) { background: rgba(255,255,255,0.08); color: var(--shift-text); }
.rc-btn.primary { background: var(--shift-grad-cta); border: none; color: #1f1408; }
.rc-btn.primary.armed { box-shadow: 0 10px 26px -10px rgba(251, 146, 60, 0.6); }
.flare { position: absolute; inset: 0; background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%); transform: translateX(-120%); animation: rc-flare 2.6s linear infinite; pointer-events: none; }
@keyframes rc-flare { 0% { transform: translateX(-120%); } 55%,100% { transform: translateX(160%); } }
.spin :deep(svg), .spin { animation: shift-spin 0.9s linear infinite; }

.rc-modal-enter-active { transition: opacity .4s var(--shift-ease); }
.rc-modal-leave-active { transition: opacity .3s ease; }
.rc-modal-enter-from, .rc-modal-leave-to { opacity: 0; }
.rc-modal-leave-active .rc-modal { transition: transform .3s var(--shift-ease), opacity .3s; }
.rc-modal-leave-to .rc-modal { transform: translateY(14px) scale(0.97); opacity: 0; }

@media (max-width: 640px) { .rc-modal { width: 100%; } .rc-grid2 { grid-template-columns: 1fr; } .rc-strip { grid-template-columns: repeat(4, 1fr); } }
@media (prefers-reduced-motion: reduce) { .rc-mote, .rc-aurora .orb, .rc-scan::after, .ic-ring, .ic-glow, .flare { animation: none; } }

/* light */
[data-theme="light"] .rc-scrim { background: radial-gradient(70% 60% at 50% 35%, rgba(251, 146, 60, 0.16), transparent 65%), radial-gradient(90% 90% at 50% 50%, rgba(40, 30, 18, 0.22), rgba(30, 22, 14, 0.34)); }
[data-theme="light"] .rc-modal {
  background: radial-gradient(120% 80% at 0% 0%, rgba(251, 191, 36, 0.16), transparent 55%), radial-gradient(90% 70% at 100% 100%, rgba(234, 88, 12, 0.12), transparent 60%), rgba(255, 251, 245, 0.96);
  border-color: var(--shift-border); box-shadow: 0 60px 120px -40px rgba(40, 25, 10, 0.32), 0 0 0 1px rgba(217, 119, 6, 0.1), 0 0 90px -16px rgba(251, 146, 60, 0.2);
}
[data-theme="light"] .rc-aurora .orb { opacity: 0.3; }
[data-theme="light"] .rc-grid { opacity: 0.35; }
[data-theme="light"] .rc-close { background: rgba(40,25,10,0.05); }
[data-theme="light"] .rc-close:hover { background: rgba(40,25,10,0.1); }
[data-theme="light"] .rc-foot { background: rgba(252, 245, 232, 0.6); }
[data-theme="light"] .rc-btn.ghost { background: rgba(40,25,10,0.04); color: var(--shift-text-2); }
[data-theme="light"] .rc-btn.ghost:hover:not(:disabled) { background: rgba(40,25,10,0.09); color: var(--shift-text); }
[data-theme="light"] .rc-input:focus, [data-theme="light"] .rc-textarea:focus { box-shadow: 0 0 0 3px rgba(217,119,6,0.12); }
</style>
