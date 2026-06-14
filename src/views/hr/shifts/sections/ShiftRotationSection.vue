<template>
  <section class="rot">
    <!-- ════════ COMMAND CONSOLE ════════ -->
    <Motion as="header" class="console" :initial="{ opacity: 0, y: -14 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: [0.16,1,0.3,1] }">
      <span class="console-aurora" aria-hidden="true" />
      <span class="console-scan" aria-hidden="true" />
      <span class="console-grid" aria-hidden="true" />

      <div class="console-top">
        <div class="console-id">
          <span class="eyebrow"><RefreshCcw :size="12" class="eye-spin" /> Cyclic schedules · automated</span>
          <h2 class="console-title">Shift Rotation<span class="title-sweep" aria-hidden="true" /></h2>
          <p>Define an ordered cycle of shifts (or OFF blocks) and the members it covers. Advancing a rotation schedules the next step for every member automatically.</p>
        </div>
        <div class="console-side">
          <div class="console-actions">
            <button class="btn-primary" v-magnetic="{ strength: 0.25 }" @click="openCreate"><Plus :size="15" /><span>New rotation</span></button>
            <button class="btn-ghost" :class="{ spin: loading }" title="Refresh" @click="reload"><RefreshCw :size="15" /></button>
          </div>
        </div>
      </div>

      <div class="kpi-ribbon">
        <Motion v-for="(k, i) in kpis" :key="k.key" as="div" class="kpi" :data-tone="k.tone"
          :initial="{ opacity: 0, y: 16, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.5, delay: 0.12 + i * 0.07, ease: [0.16,1,0.3,1] }" :whileHover="{ y: -3 }">
          <span class="kpi-spark" aria-hidden="true" />
          <div class="kpi-ico"><component :is="k.icon" :size="16" /></div>
          <div class="kpi-body">
            <div class="kpi-val"><ShiftCountUp :value="k.value" :decimals="k.decimals || 0" :suffix="k.suffix || ''" /></div>
            <div class="kpi-label">{{ k.label }}</div>
          </div>
        </Motion>
      </div>
    </Motion>

    <!-- ════════ SKELETON ════════ -->
    <div v-if="loading && !rotations.length" class="grid">
      <div v-for="n in 4" :key="n" class="sk-card" />
    </div>

    <!-- ════════ ROTATION CARDS ════════ -->
    <div v-else class="grid">
      <Motion v-for="(r, i) in rotations" :key="r.id" as="div" class="card-wrap"
        :initial="{ opacity: 0, y: 22 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.05 * i, ease: [0.16,1,0.3,1] }">
        <article class="rot-card" v-tilt="{ max: 5, scale: 1.012, perspective: 1100 }" @mousemove="onCardMove">
          <span class="rc-ring-glow" aria-hidden="true" />
          <span class="rc-spot" aria-hidden="true" />

          <header class="rc-head" data-tilt-depth="12">
            <div class="rc-id">
              <h3>{{ r.name }}</h3>
              <span class="rc-cycle"><span class="rc-code" v-if="r.code">{{ r.code }}</span>{{ cycleLabel(r) }} · {{ r.frequency_days }}d step</span>
            </div>
            <ShiftStatusPill :tone="r.is_active ? 'ok' : 'neutral'">{{ r.is_active ? 'Active' : 'Paused' }}</ShiftStatusPill>
          </header>

          <!-- cinematic orbit -->
          <div class="rc-orbit-wrap" data-tilt-depth="22">
            <div class="rc-orbit">
              <span class="orbit-sweep" aria-hidden="true" />
              <span class="orbit-track" aria-hidden="true" />
              <span v-for="(s, si) in r.steps" :key="si" class="orbit-dot"
                :class="{ current: curIdx(r) === si, off: !s.shift_id }"
                :style="dotStyle(si, r.steps.length)" :title="`${si+1}. ${stepLabel(s)}`" />
              <span class="ring-core">
                <ShiftCountUp :value="curIdx(r) + 1" :duration="600" /><small>/{{ r.steps.length }}</small>
                <em>STEP</em>
              </span>
            </div>
          </div>

          <!-- sequence strip -->
          <div class="rc-seq" data-tilt-depth="10">
            <div class="seq-track">
              <span class="seq-fill" :style="{ width: seqPct(r) + '%' }" />
            </div>
            <div class="seq-chips">
              <span v-for="(s, si) in r.steps" :key="si" class="seq-chip" :class="{ current: curIdx(r) === si, off: !s.shift_id }">
                <b>{{ si + 1 }}</b><span class="seq-lbl">{{ stepLabel(s) }}</span>
              </span>
            </div>
          </div>

          <div class="rc-meta" data-tilt-depth="6">
            <span><Users :size="12" />{{ r.member_count }} member{{ r.member_count === 1 ? '' : 's' }}</span>
            <span><Clock :size="12" />{{ r.last_advanced_on ? `Advanced ${r.last_advanced_on}` : 'Never advanced' }}</span>
          </div>

          <div class="rc-actions" data-tilt-depth="4">
            <button class="ra-advance" @click="advance(r)" :disabled="advancing === r.id">
              <Loader2 v-if="advancing === r.id" :size="14" class="spin" /><FastForward v-else :size="14" />
              <span>{{ advancing === r.id ? 'Advancing…' : 'Advance cycle' }}</span>
            </button>
            <button class="ra-ghost" title="Edit" @click="openEdit(r)"><Pencil :size="14" /></button>
            <button class="ra-ghost danger" title="Delete" @click="askDelete(r)"><Trash2 :size="14" /></button>
          </div>
        </article>
      </Motion>

      <ShiftEmptyState v-if="!loading && !rotations.length" :icon="RefreshCcw"
        title="No rotations yet"
        sub="Build a cyclic pattern — e.g. Week 1 Morning → Week 2 Evening → Week 3 Night → Off — and advance it to schedule your team.">
        <template #actions><button class="btn-primary" @click="openCreate"><Plus :size="14" />Create rotation</button></template>
      </ShiftEmptyState>
    </div>

    <ShiftRotationModal :open="showModal" :rotation="editTarget" :shifts="shifts" @close="showModal = false" @saved="onSaved" />

    <OnbModal :open="!!deleteTarget" title="Delete rotation?" :icon="AlertTriangle" :width="520" @close="closeDelete">
      <div class="del-flow" v-if="deleteTarget">
        <p class="del-lead">
          You're about to remove the rotation <b>{{ deleteTarget.name }}</b><span v-if="deleteTarget.code"> · <span class="del-mono">{{ deleteTarget.code }}</span></span>.
          The cyclic pattern and its member list are deleted and it stops scheduling new shifts. This is recorded in the audit trail.
        </p>

        <!-- impact -->
        <div class="del-impact">
          <div class="di-stat"><span class="di-ic"><Users :size="15" /></span><div class="di-body"><b><ShiftCountUp :value="impact.member_count" :duration="500" /></b><small>members ride this</small></div></div>
          <div class="di-stat"><span class="di-ic warn"><CalendarClock :size="15" /></span><div class="di-body"><b><ShiftCountUp :value="impact.future_assignments" :duration="500" /></b><small>upcoming shifts scheduled</small></div></div>
          <div class="di-stat"><span class="di-ic" :class="{ ok: deleteTarget.is_active }"><Activity :size="15" /></span><div class="di-body"><b>{{ deleteTarget.is_active ? 'Active' : 'Paused' }}</b><small>current status</small></div></div>
        </div>
        <div v-if="impactLoading" class="del-loading"><Loader2 :size="13" class="spin" /> Checking impact…</div>

        <!-- decision: what happens to already-scheduled shifts -->
        <div class="del-choice" v-if="impact.future_assignments > 0">
          <span class="dc-head">What happens to the {{ impact.future_assignments }} upcoming shift{{ impact.future_assignments === 1 ? '' : 's' }} this rotation already scheduled?</span>
          <label class="dc-opt" :class="{ on: revokeChoice === 'keep' }">
            <input type="radio" value="keep" v-model="revokeChoice" />
            <span class="dc-radio" />
            <span class="dc-txt"><b>Keep them <em>recommended</em></b><small>Members keep shifts already on their calendar — only the rotation stops generating new ones.</small></span>
          </label>
          <label class="dc-opt danger" :class="{ on: revokeChoice === 'revoke' }">
            <input type="radio" value="revoke" v-model="revokeChoice" />
            <span class="dc-radio" />
            <span class="dc-txt"><b>Cancel upcoming shifts</b><small>Also remove the {{ impact.future_assignments }} not-yet-started shift assignment{{ impact.future_assignments === 1 ? '' : 's' }} this rotation created.</small></span>
          </label>
        </div>

        <!-- type-to-confirm friction (only when there's real impact) -->
        <div class="del-confirm" v-if="needsConfirm">
          <span class="dc-label">Type <b class="del-mono">{{ confirmToken }}</b> to confirm</span>
          <input v-model="confirmText" class="del-input" :class="{ ok: confirmMatches }" :placeholder="confirmToken" autocomplete="off" spellcheck="false" @keyup.enter="confirmMatches && confirmDelete()" />
        </div>
      </div>

      <template #footer>
        <button class="btn-ghost solid" :disabled="deleting || pausing" @click="closeDelete">Cancel</button>
        <button v-if="deleteTarget?.is_active" class="btn-pause" :disabled="pausing || deleting" @click="pauseRotation">
          <Loader2 v-if="pausing" :size="14" class="spin" /><PauseCircle v-else :size="14" /> Pause instead
        </button>
        <button class="btn-danger" :disabled="!canDelete || deleting" @click="confirmDelete">
          <Loader2 v-if="deleting" :size="14" class="spin" /><Trash2 v-else :size="14" /> {{ deleteBtnLabel }}
        </button>
      </template>
    </OnbModal>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  RefreshCcw, RefreshCw, Plus, Pencil, Trash2, Users, Clock, FastForward, Loader2,
  Layers, Activity, UsersRound, CalendarClock, AlertTriangle, PauseCircle,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ShiftRotationModal from '../modals/ShiftRotationModal.vue'
import ShiftStatusPill from '../components/ShiftStatusPill.vue'
import ShiftEmptyState from '../components/ShiftEmptyState.vue'
import ShiftCountUp from '../components/ShiftCountUp.vue'
import OnbModal from '../../onboarding/components/OnbModal.vue'
import { fetchRotations, fetchShifts, advanceRotation, deleteRotation, updateRotation, fetchRotationImpact } from '@/composables/useShifts'

const emit = defineEmits(['refresh-stats'])
const toast = useToast()

const rotations = ref([])
const shifts = ref([])
const loading = ref(false)
const advancing = ref(null)
const showModal = ref(false)
const editTarget = ref(null)
const deleteTarget = ref(null)
const deleting = ref(false)
const pausing = ref(false)
const impact = reactive({ member_count: 0, future_assignments: 0 })
const impactLoading = ref(false)
const revokeChoice = ref('keep')
const confirmText = ref('')

const CYCLE = { WEEKLY: 'Weekly', BIWEEKLY: 'Biweekly', MONTHLY: 'Monthly', CUSTOM: 'Custom' }
const cycleLabel = (r) => CYCLE[r.cycle] || r.cycle
const stepLabel = (s) => s.label || s.shift_name || 'OFF'
const curIdx = (r) => (r.current_step_index || 0) % (r.steps.length || 1)
const seqPct = (r) => r.steps.length ? ((curIdx(r) + 1) / r.steps.length) * 100 : 0

const dotStyle = (i, total) => {
  const ang = (i / (total || 1)) * Math.PI * 2 - Math.PI / 2
  const R = 42
  return { left: `calc(50% + ${(R * Math.cos(ang)).toFixed(1)}px)`, top: `calc(50% + ${(R * Math.sin(ang)).toFixed(1)}px)` }
}

/* ── KPIs ── */
const activeCount = computed(() => rotations.value.filter(r => r.is_active).length)
const membersCovered = computed(() => rotations.value.reduce((a, r) => a + (r.member_count || 0), 0))
const avgStep = computed(() => {
  if (!rotations.value.length) return 0
  return +(rotations.value.reduce((a, r) => a + (r.frequency_days || 0), 0) / rotations.value.length).toFixed(1)
})
const kpis = computed(() => [
  { key: 'rot', label: 'Rotations', value: rotations.value.length, icon: Layers, tone: 'gold' },
  { key: 'act', label: 'Active cycles', value: activeCount.value, icon: Activity, tone: 'ok' },
  { key: 'mem', label: 'Members covered', value: membersCovered.value, icon: UsersRound, tone: 'gold' },
  { key: 'avg', label: 'Avg step', value: avgStep.value, decimals: 1, suffix: 'd', icon: CalendarClock, tone: 'ember' },
])

const onCardMove = (e) => {
  const el = e.currentTarget, r = el.getBoundingClientRect()
  el.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%')
  el.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%')
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

const confirmToken = computed(() => deleteTarget.value?.code || deleteTarget.value?.name || '')
const needsConfirm = computed(() => impact.member_count > 0 || impact.future_assignments > 0)
const confirmMatches = computed(() => confirmText.value.trim() === confirmToken.value.trim() && !!confirmToken.value)
const canDelete = computed(() => !needsConfirm.value || confirmMatches.value)
const deleteBtnLabel = computed(() =>
  revokeChoice.value === 'revoke' && impact.future_assignments > 0
    ? `Delete + cancel ${impact.future_assignments}` : 'Delete rotation')

const askDelete = async (r) => {
  deleteTarget.value = r
  revokeChoice.value = 'keep'
  confirmText.value = ''
  impact.member_count = r.member_count || 0
  impact.future_assignments = 0
  impactLoading.value = true
  try {
    const d = await fetchRotationImpact(r.id)
    impact.member_count = d.member_count ?? impact.member_count
    impact.future_assignments = d.future_assignments ?? 0
  } catch { /* fall back to row's member_count */ }
  finally { impactLoading.value = false }
}
const closeDelete = () => { if (deleting.value || pausing.value) return; deleteTarget.value = null }

const pauseRotation = async () => {
  if (!deleteTarget.value) return
  pausing.value = true
  try {
    await updateRotation(deleteTarget.value.id, { is_active: false })
    toast.success(`Rotation "${deleteTarget.value.name}" paused — schedule kept, no new shifts generated`)
    deleteTarget.value = null
    await reload(); emit('refresh-stats')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not pause rotation') }
  finally { pausing.value = false }
}

const confirmDelete = async () => {
  if (!deleteTarget.value || !canDelete.value) return
  deleting.value = true
  try {
    const res = await deleteRotation(deleteTarget.value.id, { revokeFuture: revokeChoice.value === 'revoke' })
    const n = res?.future_assignments_revoked || 0
    toast.success(`Rotation deleted${n ? ` · ${n} upcoming shift${n === 1 ? '' : 's'} cancelled` : ' · scheduled shifts kept'}`)
    deleteTarget.value = null
    await reload(); emit('refresh-stats')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not delete') }
  finally { deleting.value = false }
}
</script>

<style scoped>
.rot { display: flex; flex-direction: column; gap: 20px; }

/* ════════ CONSOLE ════════ */
.console { position: relative; overflow: hidden; padding: 22px 26px 20px; border-radius: 24px;
  background: var(--shift-surface); border: 1px solid var(--shift-border); backdrop-filter: var(--shift-glass-blur); -webkit-backdrop-filter: var(--shift-glass-blur); }
.console-aurora { position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background: var(--shift-grad-hero), radial-gradient(80% 120% at 100% 0%, rgba(251,146,60,0.10), transparent 60%); background-size: 200% 200%; animation: hr-aurora 16s ease-in-out infinite; }
.console-scan { position: absolute; left: 0; right: 0; top: 0; height: 32%; pointer-events: none; z-index: 1;
  background: linear-gradient(180deg, rgba(253,230,138,0.10), transparent); animation: shift-scanline 7s ease-in-out infinite; }
.console-grid { position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0.5;
  background-image: linear-gradient(var(--shift-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--shift-grid-line) 1px, transparent 1px);
  background-size: 40px 40px; mask-image: radial-gradient(120% 90% at 50% 0%, #000 30%, transparent 75%); -webkit-mask-image: radial-gradient(120% 90% at 50% 0%, #000 30%, transparent 75%); animation: shift-grid-pan 24s linear infinite; }
.console-top { position: relative; z-index: 2; display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
.console-id { max-width: 640px; }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--shift-amber-strong); }
.eye-spin { animation: shift-spin 4s linear infinite; }
.console-title { position: relative; display: inline-block; margin: 8px 0 6px; font-size: 26px; font-weight: 800; letter-spacing: -0.025em; color: var(--shift-text); }
.title-sweep { position: absolute; left: 0; bottom: -3px; height: 2px; width: 100%; background: linear-gradient(90deg, transparent, var(--shift-amber), var(--shift-ember), transparent); background-size: 220% 100%; border-radius: 2px; animation: title-shimmer 4.5s ease-in-out infinite; }
@keyframes title-shimmer { 0%,100% { background-position: 200% 0; opacity: 0.55; } 50% { background-position: -40% 0; opacity: 1; } }
.console-id p { margin: 0; font-size: 12.5px; line-height: 1.6; color: var(--shift-text-muted); }
.console-side { display: flex; align-items: flex-start; gap: 12px; flex-shrink: 0; }
.console-actions { display: flex; gap: 8px; }

.btn-primary { display: inline-flex; align-items: center; gap: 7px; padding: 10px 17px; border-radius: 12px; border: none; cursor: pointer; background: var(--shift-grad-cta); color: #1f1408; font-weight: 700; font-size: 13px; box-shadow: 0 10px 26px -10px rgba(245,158,11,0.75); transition: box-shadow 0.25s; }
.btn-primary:hover { box-shadow: 0 14px 34px -10px rgba(245,158,11,0.9); }
.btn-ghost { display: inline-flex; align-items: center; gap: 6px; padding: 10px 12px; border-radius: 12px; cursor: pointer; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); font-weight: 600; font-size: 13px; transition: 0.2s; }
.btn-ghost.solid { padding: 9px 16px; }
.btn-ghost:hover { color: var(--shift-text); border-color: var(--shift-border); }
.btn-ghost.spin :deep(svg) { animation: shift-spin 0.85s linear infinite; }
.btn-danger { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 11px; border: none; cursor: pointer; background: var(--shift-alert); color: #fff; font-weight: 700; font-size: 13px; box-shadow: 0 8px 20px -10px var(--shift-alert); }
.btn-danger:disabled { opacity: 0.6; }

.kpi-ribbon { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 20px; }
.kpi { position: relative; overflow: hidden; display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 16px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); transition: border-color 0.25s; }
.kpi:hover { border-color: var(--shift-border); }
.kpi-spark { position: absolute; right: -30%; top: -60%; width: 80%; height: 220%; pointer-events: none; background: radial-gradient(circle, color-mix(in srgb, var(--tone-c) 24%, transparent), transparent 65%); opacity: 0.5; }
.kpi[data-tone="gold"]  { --tone-c: var(--shift-amber); }
.kpi[data-tone="ok"]    { --tone-c: var(--shift-ok); }
.kpi[data-tone="ember"] { --tone-c: var(--shift-ember); }
.kpi-ico { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; background: color-mix(in srgb, var(--tone-c) 14%, transparent); color: var(--tone-c); border: 1px solid color-mix(in srgb, var(--tone-c) 26%, transparent); }
.kpi-val { font-size: 22px; font-weight: 800; color: var(--shift-text); line-height: 1.1; letter-spacing: -0.02em; }
.kpi-label { margin-top: 2px; font-size: 10.5px; font-family: var(--shift-mono); text-transform: uppercase; letter-spacing: 0.07em; color: var(--shift-text-muted); }

/* ════════ GRID ════════ */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
.sk-card { height: 320px; border-radius: 20px; background: linear-gradient(100deg, var(--shift-surface), var(--shift-surface-2), var(--shift-surface)); background-size: 200% 100%; animation: shift-shimmer 1.4s linear infinite; }
@keyframes shift-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.card-wrap { perspective: 1100px; will-change: transform, opacity; }

/* ════════ ROTATION CARD ════════ */
.rot-card { position: relative; display: flex; flex-direction: column; gap: 14px; padding: 18px; border-radius: 20px;
  background: var(--shift-surface); border: 1px solid var(--shift-border-soft); transform-style: preserve-3d; overflow: hidden; }
@property --rc-a { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
.rc-ring-glow { position: absolute; inset: 0; border-radius: inherit; padding: 1px; pointer-events: none; z-index: 0; opacity: 0;
  background: conic-gradient(from var(--rc-a), transparent 0deg, var(--shift-amber) 90deg, transparent 200deg, var(--shift-ember) 320deg, transparent 360deg);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude;
  transition: opacity 0.35s; animation: rc-rot 6s linear infinite; }
@keyframes rc-rot { to { --rc-a: 360deg; } }
.rot-card:hover .rc-ring-glow { opacity: 0.6; }
.rc-spot { position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0; transition: opacity 0.3s; background: radial-gradient(380px circle at var(--mx,50%) var(--my,50%), rgba(251,191,36,0.14), transparent 60%); }
.rot-card:hover .rc-spot { opacity: 1; }
.rot-card > *:not(.rc-ring-glow):not(.rc-spot) { position: relative; z-index: 1; }

.rc-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.rc-head h3 { margin: 0; font-size: 16px; font-weight: 700; color: var(--shift-text); letter-spacing: -0.01em; }
.rc-cycle { display: inline-flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 10.5px; color: var(--shift-text-muted); margin-top: 3px; }
.rc-code { padding: 2px 7px; border-radius: 6px; background: rgba(251,191,36,0.12); border: 1px solid rgba(251,191,36,0.26); color: var(--shift-amber); font-weight: 700; }

/* orbit */
.rc-orbit-wrap { display: grid; place-items: center; padding: 6px 0; }
.rc-orbit { position: relative; width: 116px; height: 116px; }
.orbit-track { position: absolute; inset: 16px; border-radius: 50%; border: 1px dashed var(--shift-border); }
.orbit-sweep { position: absolute; inset: 16px; border-radius: 50%; pointer-events: none;
  background: conic-gradient(from 0deg, transparent 0deg, transparent 280deg, color-mix(in srgb, var(--shift-amber) 50%, transparent) 350deg, var(--shift-amber-bright) 360deg);
  mask: radial-gradient(circle, transparent 38%, #000 40%); -webkit-mask: radial-gradient(circle, transparent 38%, #000 40%);
  animation: orbit-spin 5s linear infinite; }
@keyframes orbit-spin { to { transform: rotate(360deg); } }
.orbit-dot { position: absolute; width: 12px; height: 12px; border-radius: 50%; transform: translate(-50%, -50%); background: var(--shift-amber); border: 2px solid var(--shift-surface); box-shadow: 0 0 8px -2px var(--shift-amber); z-index: 2; }
.orbit-dot.off { background: var(--shift-text-dim); box-shadow: none; }
.orbit-dot.current { background: var(--shift-amber-bright); box-shadow: 0 0 0 4px rgba(251,191,36,0.22), 0 0 12px var(--shift-amber); animation: shift-ring-pulse 2.2s ease-in-out infinite; z-index: 3; }
.ring-core { position: absolute; inset: 30px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0;
  font-family: var(--shift-mono); font-size: 20px; font-weight: 800; color: var(--shift-amber); background: radial-gradient(circle, rgba(251,191,36,0.14), transparent 72%); border: 1px solid var(--shift-border); z-index: 1; }
.ring-core small { font-size: 10px; color: var(--shift-text-dim); }
.ring-core em { font-style: normal; font-size: 7px; letter-spacing: 0.16em; color: var(--shift-text-dim); margin-top: 2px; }

/* sequence strip */
.rc-seq { display: flex; flex-direction: column; gap: 8px; }
.seq-track { height: 4px; border-radius: 999px; background: var(--shift-border-soft); overflow: hidden; }
.seq-fill { display: block; height: 100%; border-radius: 999px; background: var(--shift-grad-cta); box-shadow: 0 0 8px -1px var(--shift-amber); transition: width 0.6s var(--shift-ease); }
.seq-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.seq-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--shift-text-muted); background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); padding: 3px 9px 3px 4px; border-radius: 999px; transition: 0.2s; }
.seq-chip b { display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%; font-family: var(--shift-mono); font-size: 9px; background: rgba(251,191,36,0.16); color: var(--shift-amber); }
.seq-chip.off { opacity: 0.7; }
.seq-chip.off b { background: rgba(148,163,184,0.16); color: var(--shift-text-dim); }
.seq-chip.current { border-color: var(--shift-amber); color: var(--shift-text); background: rgba(251,191,36,0.1); }
.seq-chip.current b { background: var(--shift-grad-cta); color: #1f1408; }
.seq-lbl { max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.rc-meta { display: flex; gap: 16px; }
.rc-meta span { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--shift-text-muted); }
.rc-meta svg { color: var(--shift-amber); }

.rc-actions { display: flex; gap: 8px; margin-top: auto; }
.ra-advance { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px; border-radius: 12px; cursor: pointer; border: none; background: var(--shift-grad-cta); color: #1f1408; font-weight: 700; font-size: 12.5px; box-shadow: 0 8px 20px -10px rgba(245,158,11,0.7); transition: transform 0.18s, box-shadow 0.25s; }
.ra-advance:hover:not(:disabled) { box-shadow: 0 12px 28px -10px rgba(245,158,11,0.9); }
.ra-advance:active:not(:disabled) { transform: scale(0.98); }
.ra-advance:disabled { opacity: 0.6; }
.ra-ghost { width: 38px; height: 38px; border-radius: 11px; border: 1px solid var(--shift-border-soft); background: var(--shift-surface-2); color: var(--shift-text-muted); cursor: pointer; display: grid; place-items: center; transition: 0.18s; }
.ra-ghost:hover { color: var(--shift-amber); border-color: var(--shift-border); transform: translateY(-1px); }
.ra-ghost.danger:hover { color: var(--shift-alert); border-color: var(--shift-alert-soft); }

.del-copy { font-size: 13px; line-height: 1.6; color: var(--shift-text-2); margin: 0; }

/* ════════ CORPORATE DELETE WORKFLOW ════════ */
.del-flow { display: flex; flex-direction: column; gap: 16px; }
.del-lead { margin: 0; font-size: 13px; line-height: 1.6; color: var(--shift-text-2); }
.del-mono { font-family: var(--shift-mono); color: var(--shift-amber); }
.del-impact { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.di-stat { display: flex; align-items: center; gap: 10px; padding: 11px 12px; border-radius: 13px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.di-ic { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0; background: rgba(251,191,36,0.12); color: var(--shift-amber); border: 1px solid rgba(251,191,36,0.24); }
.di-ic.warn { background: var(--shift-warn-soft); color: var(--shift-ember-strong); border-color: color-mix(in srgb, var(--shift-ember) 28%, transparent); }
.di-ic.ok { background: var(--shift-ok-soft); color: var(--shift-ok); border-color: color-mix(in srgb, var(--shift-ok) 32%, transparent); }
.di-body { display: flex; flex-direction: column; min-width: 0; }
.di-body b { font-size: 17px; font-weight: 800; color: var(--shift-text); line-height: 1.1; }
.di-body small { font-size: 9.5px; color: var(--shift-text-muted); }
.del-loading { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--shift-text-dim); }

.del-choice { display: flex; flex-direction: column; gap: 8px; padding: 13px 14px; border-radius: 13px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.dc-head { font-size: 12px; font-weight: 600; color: var(--shift-text-2); margin-bottom: 2px; }
.dc-opt { position: relative; display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-radius: 11px; cursor: pointer; background: var(--shift-surface); border: 1px solid var(--shift-border-soft); transition: border-color 0.2s, background 0.2s; }
.dc-opt input { position: absolute; opacity: 0; pointer-events: none; }
.dc-opt.on { border-color: var(--shift-amber); background: rgba(251,191,36,0.08); }
.dc-opt.danger.on { border-color: var(--shift-alert); background: var(--shift-alert-soft); }
.dc-radio { position: relative; width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; margin-top: 2px; border: 1.5px solid var(--shift-border); transition: border-color 0.2s; }
.dc-opt.on .dc-radio { border-color: var(--shift-amber); }
.dc-opt.on .dc-radio::after { content: ''; position: absolute; inset: 3px; border-radius: 50%; background: var(--shift-amber); }
.dc-opt.danger.on .dc-radio { border-color: var(--shift-alert); }
.dc-opt.danger.on .dc-radio::after { background: var(--shift-alert); }
.dc-txt { display: flex; flex-direction: column; gap: 2px; }
.dc-txt b { font-size: 12.5px; color: var(--shift-text); display: inline-flex; align-items: center; gap: 7px; }
.dc-txt b em { font-style: normal; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.06em; padding: 1px 6px; border-radius: 999px; background: var(--shift-ok-soft); color: var(--shift-ok); }
.dc-txt small { font-size: 11px; color: var(--shift-text-muted); line-height: 1.45; }

.del-confirm { display: flex; flex-direction: column; gap: 6px; }
.dc-label { font-size: 11.5px; color: var(--shift-text-muted); }
.dc-label b { color: var(--shift-text); }
.del-input { background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); border-radius: 10px; padding: 9px 12px; color: var(--shift-text); font: inherit; font-size: 13px; font-family: var(--shift-mono); transition: border-color 0.2s, box-shadow 0.2s; }
.del-input:focus { outline: none; border-color: var(--shift-amber); box-shadow: 0 0 0 3px rgba(251,191,36,0.1); }
.del-input.ok { border-color: var(--shift-ok); box-shadow: 0 0 0 3px var(--shift-ok-soft); }

.btn-pause { display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; border-radius: 11px; cursor: pointer; font-size: 13px; font-weight: 700;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border); color: var(--shift-text); transition: 0.18s; }
.btn-pause:hover:not(:disabled) { border-color: var(--shift-amber); color: var(--shift-amber); }
.btn-pause:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-danger:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }

.spin :deep(svg), .spin { animation: shift-spin 0.85s linear infinite; }

@media (max-width: 560px) { .del-impact { grid-template-columns: 1fr; } }

@media (max-width: 1100px) { .kpi-ribbon { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 720px) { .console-top { flex-direction: column; } .console-side { width: 100%; } .console-actions { width: 100%; } }

/* ════════ LIGHT THEME ════════ */
[data-theme="light"] .console-scan { background: linear-gradient(180deg, rgba(217,119,6,0.08), transparent); }
[data-theme="light"] .orbit-dot { border-color: var(--shift-surface-2); }
[data-theme="light"] .rc-spot { background: radial-gradient(380px circle at var(--mx,50%) var(--my,50%), rgba(217,119,6,0.12), transparent 60%); }
[data-theme="light"] .btn-danger { color: #fff; }
</style>
