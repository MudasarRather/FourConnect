<template>
  <div class="trn-sec">
    <!-- ════ hero ════ -->
    <section class="cm-hero" ref="heroRef">
      <div class="cm-grain trn-grain" aria-hidden="true" />
      <span class="cm-blob b1" aria-hidden="true" />
      <span class="cm-blob b2" aria-hidden="true" />
      <span class="cm-spot" aria-hidden="true" />

      <div class="cm-hero-copy">
        <Motion as="span" class="cm-eyebrow"
          :initial="{ opacity: 0, y: -8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
          <ShieldCheck :size="13" /> Compliance Engine
        </Motion>
        <h2 class="cm-title">
          <Motion v-for="(w, i) in titleWords" :key="i" as="span" class="cm-word" :class="{ grad: w.grad }"
            :initial="{ opacity: 0, y: 22, filter: 'blur(8px)' }" :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
            :transition="{ duration: 0.6, delay: 0.1 + i * 0.09, ease: [0.16, 1, 0.3, 1] }">{{ w.t }}&nbsp;</Motion>
        </h2>
        <Motion as="p" class="cm-sub"
          :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.6, delay: 0.38 }">
          Recurring mandates that keep eligible cohorts certified on schedule. Each rule re-evaluates every day and can auto-enrol whoever falls behind — straight into Employee Trainings.
        </Motion>
        <Motion as="div" class="cm-actions"
          :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.5 }">
          <Motion as="button" class="trn-btn trn-btn-primary" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="openCreate">
            <Plus :size="15" /> New compliance rule
          </Motion>
          <button class="trn-btn trn-btn-ghost" @click="$emit('go', 'enrollment')"><Users :size="14" /> View enrollments</button>
        </Motion>
      </div>
    </section>

    <!-- ════ loading ════ -->
    <div v-if="loading" class="cm-skel">
      <div class="trn-skel" style="height: 150px; border-radius: 22px" />
      <div class="cm-skel-grid">
        <div v-for="n in 3" :key="n" class="trn-skel" style="height: 250px; border-radius: 20px" />
      </div>
    </div>

    <template v-else>
      <!-- ════ signature: org compliance spectrum ════ -->
      <Motion as="section" class="cm-spectrum"
        :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
        <span class="cm-spectrum-aura" aria-hidden="true" />
        <div class="cm-spectrum-top">
          <div class="cm-spectrum-score">
            <span class="cm-score-eyebrow trn-mono"><Activity :size="12" /> Org compliance</span>
            <span class="cm-score-val trn-mono" :style="{ color: orgColor }"><TrnCountUp :value="orgPct" suffix="%" /></span>
            <span class="cm-score-sub">{{ orgCounts.total }} obligation{{ orgCounts.total === 1 ? '' : 's' }} across {{ configs.length }} rule{{ configs.length === 1 ? '' : 's' }}</span>
          </div>
          <div class="cm-spectrum-mini">
            <div class="cm-mini"><span class="cm-mini-v trn-mono"><TrnCountUp :value="configs.length" /></span><span class="cm-mini-l">Rules</span></div>
            <div class="cm-mini"><span class="cm-mini-v trn-mono"><TrnCountUp :value="activeCount" /></span><span class="cm-mini-l">Active</span></div>
            <div class="cm-mini danger"><span class="cm-mini-v trn-mono"><TrnCountUp :value="orgCounts.OVERDUE" /></span><span class="cm-mini-l">Overdue</span></div>
          </div>
        </div>

        <div class="cm-spectrum-bar" :title="`${orgCounts.total} obligations`">
          <span v-for="s in orgSegments" :key="s.key" class="cm-spectrum-seg" :class="s.key" :style="{ width: (ready ? s.pct : 0) + '%' }" />
          <span v-if="!orgCounts.total" class="cm-spectrum-empty">No eligible obligations yet</span>
        </div>
        <div class="cm-spectrum-legend">
          <span v-for="s in orgLegend" :key="s.key" class="cm-sl" :class="s.key">
            <i /> {{ s.label }} <b class="trn-mono"><TrnCountUp :value="s.count" /></b>
          </span>
        </div>
      </Motion>

      <!-- ════ empty states ════ -->
      <TrnEmptyState v-if="!configs.length && !programs.length" :icon="BookOpen" title="No training programs yet"
        sub="Compliance rules sit on top of a training program. Create a program first, then mandate it here.">
        <button class="trn-btn trn-btn-primary" style="margin-top:14px" @click="$emit('go', 'programs')"><Plus :size="15" /> Go to programs</button>
      </TrnEmptyState>

      <TrnEmptyState v-else-if="!configs.length" :icon="ShieldCheck" title="No compliance rules yet"
        sub="Define a recurring mandate to keep an eligible cohort certified — set the cadence and let auto-reassign do the rest.">
        <button class="trn-btn trn-btn-primary" style="margin-top:14px" @click="openCreate"><Plus :size="15" /> New compliance rule</button>
      </TrnEmptyState>

      <!-- ════ mandate grid ════ -->
      <div v-else class="cm-grid">
        <Presence>
          <Motion v-for="(c, i) in configs" :key="c.id" as="div"
            :initial="{ opacity: 0, y: 16, filter: 'blur(6px)' }" :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
            :exit="{ opacity: 0, y: -10, scale: 0.97 }"
            :transition="{ duration: 0.48, delay: Math.min(i * 0.06, 0.4), ease: [0.16, 1, 0.3, 1] }">
            <ComplianceMandateCard :config="c" :roster="rosterFor(c)" :reassigning="reassigning"
              @sweep="runReassign" @edit="openEdit" @delete="askDelete" @toggle-active="toggleActive" @go="$emit('go', $event)" />
          </Motion>
        </Presence>
      </div>
    </template>

    <ComplianceConfigModal :open="modalOpen" :config="editing" :programs="programs" :used-program-ids="usedProgramIds"
      @close="modalOpen = false" @saved="onSaved" @go="$emit('go', $event)" />

    <TrnDeleteModal
      :open="delOpen"
      title="Delete compliance rule"
      :item-name="delTarget?.program_name || 'this program'"
      :item-meta="delTarget ? `${freqLabel(delTarget.frequency)} mandate · ${delTarget.eligible_count ?? 0} eligible` : ''"
      :icon="ShieldCheck"
      :consequences="['Stops tracking this mandate', 'No more auto-enrolment for the cohort', 'Existing enrolments already created are kept']"
      confirm-label="Delete rule"
      :loading="deleting"
      @close="delOpen = false"
      @confirm="doDelete" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import { ShieldCheck, Plus, Users, Activity, BookOpen } from 'lucide-vue-next'
import TrnEmptyState from '../components/TrnEmptyState.vue'
import TrnCountUp from '../components/TrnCountUp.vue'
import TrnDeleteModal from '../components/TrnDeleteModal.vue'
import ComplianceMandateCard from '../components/ComplianceMandateCard.vue'
import ComplianceConfigModal from '../modals/ComplianceConfigModal.vue'
import {
  fetchCompliance, deleteCompliance, runComplianceReassign, patchCompliance,
  fetchComplianceStatus, fetchTrainingPrograms,
} from '@/composables/useTraining'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const emit = defineEmits(['refresh-stats', 'go'])
const toast = useToast()

const configs = ref([])
const programs = ref([])
const allStatus = ref([])
const loading = ref(true)
const ready = ref(false)
const reassigning = ref(null)
const modalOpen = ref(false)
const editing = ref(null)

const delOpen = ref(false)
const delTarget = ref(null)
const deleting = ref(false)

const heroRef = ref(null)
usePointerSpotlight(heroRef)

const titleWords = [{ t: 'Every' }, { t: 'mandate,' }, { t: 'on' }, { t: 'cadence.', grad: true }]

const FREQ_LABELS = {
  ONE_TIME: 'One-time', MONTHLY: 'Monthly', QUARTERLY: 'Quarterly',
  HALF_YEARLY: 'Half-yearly', ANNUAL: 'Annual', BIENNIAL: 'Biennial',
}
const freqLabel = (f) => FREQ_LABELS[f] || (f ? f.replace(/_/g, ' ') : '—')

// roster grouped by program (status rows have program_id; configs are 1:1 with programs)
const rosterByProgram = computed(() => {
  const m = {}
  for (const r of allStatus.value) {
    const k = String(r.program_id)
    ;(m[k] = m[k] || []).push(r)
  }
  return m
})
const rosterFor = (c) => rosterByProgram.value[String(c.program_id)] || []

const activeCount = computed(() => configs.value.filter(c => c.is_active !== false).length)
const usedProgramIds = computed(() => configs.value.map(c => c.program_id))

const ORG_STATES = [
  { key: 'compliant', match: 'COMPLIANT', label: 'Compliant' },
  { key: 'due', match: 'DUE', label: 'Due' },
  { key: 'overdue', match: 'OVERDUE', label: 'Overdue' },
  { key: 'never', match: 'NEVER', label: 'Never' },
]
const orgCounts = computed(() => {
  const c = { COMPLIANT: 0, DUE: 0, OVERDUE: 0, NEVER: 0, total: 0 }
  for (const r of allStatus.value) { c[r.state || 'NEVER'] = (c[r.state || 'NEVER'] || 0) + 1; c.total++ }
  return c
})
const orgPct = computed(() => (orgCounts.value.total ? Math.round((orgCounts.value.COMPLIANT / orgCounts.value.total) * 100) : 100))
const orgColor = computed(() => {
  const p = orgPct.value
  if (p >= 90) return 'var(--trn-st-completed)'
  if (p >= 70) return 'var(--trn-st-in-progress)'
  return 'var(--trn-st-failed)'
})
const orgSegments = computed(() => {
  const t = orgCounts.value.total || 1
  return ORG_STATES.map(s => ({ key: s.key, pct: (orgCounts.value[s.match] / t) * 100 })).filter(s => s.pct > 0)
})
const orgLegend = computed(() => ORG_STATES.map(s => ({ key: s.key, label: s.label, count: orgCounts.value[s.match] || 0 })))

const load = async () => {
  loading.value = true
  ready.value = false
  try {
    const [cfgs, status, progs] = await Promise.all([
      fetchCompliance().catch(() => []),
      fetchComplianceStatus().catch(() => []),
      fetchTrainingPrograms().catch(() => []),
    ])
    configs.value = Array.isArray(cfgs) ? cfgs : []
    allStatus.value = Array.isArray(status) ? status : []
    programs.value = Array.isArray(progs) ? progs : []
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load compliance rules')
  } finally {
    loading.value = false
    requestAnimationFrame(() => requestAnimationFrame(() => { ready.value = true }))
  }
}
onMounted(load)

const openCreate = () => { editing.value = null; modalOpen.value = true }
const openEdit = (c) => { editing.value = c; modalOpen.value = true }
const onSaved = () => { load(); emit('refresh-stats') }

const toggleActive = async (c) => {
  try {
    await patchCompliance(c.id, { is_active: !(c.is_active !== false) })
    toast.success(c.is_active !== false ? 'Rule paused' : 'Rule resumed')
    await load(); emit('refresh-stats')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not update the rule')
  }
}

const runReassign = async (c) => {
  if (reassigning.value) return
  reassigning.value = c.id
  try {
    const res = await runComplianceReassign(c.id) || {}
    const created = res.created ?? 0
    const skipped = res.skipped ?? 0
    if (created > 0) toast.success(`Swept — ${created} enrolment${created === 1 ? '' : 's'} created, ${skipped} already current`)
    else toast.info(`Sweep complete — everyone eligible is already current (${skipped} checked)`)
    await load(); emit('refresh-stats')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not run the sweep')
  } finally {
    reassigning.value = null
  }
}

const askDelete = (c) => { delTarget.value = c; delOpen.value = true }
const doDelete = async () => {
  if (!delTarget.value) return
  deleting.value = true
  try {
    await deleteCompliance(delTarget.value.id)
    toast.success('Compliance rule deleted')
    delOpen.value = false
    await load(); emit('refresh-stats')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not delete the rule')
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.trn-sec { display: flex; flex-direction: column; gap: 16px; }

/* ════ hero ════ */
.cm-hero { position: relative; overflow: hidden; border-radius: 24px; padding: 30px 34px;
  background: var(--trn-dome); border: 1px solid var(--trn-border-soft); box-shadow: var(--trn-card-shadow); }
.cm-hero::before { content: ''; position: absolute; inset: 0; background: var(--trn-grad-hero); z-index: 0; }
.cm-grain { z-index: 1; }
.cm-blob { position: absolute; z-index: 0; border-radius: 50%; filter: blur(46px); pointer-events: none; opacity: 0.5; }
.cm-blob.b1 { width: 320px; height: 320px; top: -130px; right: 6%; background: radial-gradient(circle, color-mix(in srgb, var(--trn-st-completed) 26%, transparent), transparent 70%); animation: cm-drift1 17s ease-in-out infinite; }
.cm-blob.b2 { width: 300px; height: 300px; bottom: -150px; left: 26%; background: radial-gradient(circle, color-mix(in srgb, var(--trn-amber) 26%, transparent), transparent 70%); animation: cm-drift2 20s ease-in-out infinite; }
.cm-spot { position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: calc(var(--spot, 0) * 0.7); transition: opacity 0.4s;
  background: radial-gradient(300px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--trn-amber) 16%, transparent), transparent 60%); }
.cm-hero-copy { position: relative; z-index: 2; }
.cm-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--trn-mono); font-size: 11px; letter-spacing: 0.13em; text-transform: uppercase; color: var(--trn-amber-strong); }
.cm-title { margin: 12px 0 9px; font-size: 32px; line-height: 1.05; font-weight: 850; letter-spacing: -0.03em; color: var(--trn-text); display: flex; flex-wrap: wrap; }
.cm-word { display: inline-block; }
.cm-word.grad { background: linear-gradient(110deg, #34d399, #fde68a 50%, #fbbf24); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; background-size: 220% auto; animation: trn-sheen 5s linear infinite; }
[data-theme="light"] .cm-word.grad { background: linear-gradient(110deg, #047857, #b45309 50%, #d97706); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.cm-sub { margin: 0 0 18px; max-width: 600px; font-size: 13.5px; line-height: 1.6; color: var(--trn-text-secondary); }
.cm-actions { display: flex; gap: 10px; flex-wrap: wrap; }

/* ════ skeletons ════ */
.cm-skel { display: flex; flex-direction: column; gap: 14px; }
.cm-skel-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 14px; }

/* ════ org spectrum ════ */
.cm-spectrum { position: relative; overflow: hidden; isolation: isolate; border-radius: 22px; padding: 20px 24px 22px;
  background: var(--trn-surf-card); border: 1px solid var(--trn-border-soft); box-shadow: var(--trn-card-shadow); display: flex; flex-direction: column; gap: 14px; }
.cm-spectrum-aura { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.8;
  background: radial-gradient(70% 120% at 0% 0%, color-mix(in srgb, var(--trn-st-completed) 10%, transparent), transparent 58%),
    radial-gradient(60% 120% at 100% 0%, color-mix(in srgb, var(--trn-amber) 8%, transparent), transparent 60%); }
.cm-spectrum > * { position: relative; z-index: 1; }
.cm-spectrum-top { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.cm-spectrum-score { display: flex; flex-direction: column; gap: 2px; }
.cm-score-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trn-text-dim); }
.cm-score-val { font-size: 44px; font-weight: 850; line-height: 1; letter-spacing: -0.04em; }
.cm-score-sub { font-size: 11.5px; color: var(--trn-text-muted); margin-top: 2px; }
.cm-spectrum-mini { display: flex; gap: 22px; }
.cm-mini { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; }
.cm-mini-v { font-size: 22px; font-weight: 800; color: var(--trn-text); line-height: 1; }
.cm-mini.danger .cm-mini-v { color: var(--trn-st-failed); }
.cm-mini-l { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--trn-text-dim); }

.cm-spectrum-bar { position: relative; display: flex; height: 18px; border-radius: 999px; overflow: hidden;
  background: var(--trn-surface-elevated); box-shadow: inset 0 1px 4px rgba(0,0,0,0.25); }
.cm-spectrum-seg { position: relative; overflow: hidden; height: 100%; transition: width 1.1s var(--trn-spring); }
.cm-spectrum-seg:not(:last-child) { box-shadow: inset -2px 0 0 var(--trn-canvas); }
.cm-spectrum-seg.compliant { background: linear-gradient(180deg, color-mix(in srgb, var(--trn-st-completed) 86%, #fff), var(--trn-st-completed)); }
.cm-spectrum-seg.due { background: linear-gradient(180deg, color-mix(in srgb, var(--trn-st-in-progress) 86%, #fff), var(--trn-st-in-progress)); }
.cm-spectrum-seg.overdue { background: linear-gradient(180deg, color-mix(in srgb, var(--trn-st-failed) 86%, #fff), var(--trn-st-failed)); }
.cm-spectrum-seg.never { background: linear-gradient(180deg, color-mix(in srgb, var(--trn-st-not-started) 70%, #fff), var(--trn-st-not-started)); }
.cm-spectrum-seg::after { content: ''; position: absolute; inset: 0; background: linear-gradient(110deg, transparent 18%, rgba(255,255,255,0.42) 50%, transparent 82%);
  background-size: 220% 100%; animation: trn-sheen 2.8s linear infinite; }
.cm-spectrum-empty { position: absolute; inset: 0; display: grid; place-items: center; font-size: 11px; color: var(--trn-text-dim); }
.cm-spectrum-legend { display: flex; flex-wrap: wrap; gap: 14px; }
.cm-sl { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--trn-text-muted); }
.cm-sl i { width: 9px; height: 9px; border-radius: 3px; }
.cm-sl.compliant i { background: var(--trn-st-completed); }
.cm-sl.due i { background: var(--trn-st-in-progress); }
.cm-sl.overdue i { background: var(--trn-st-failed); }
.cm-sl.never i { background: var(--trn-st-not-started); }
.cm-sl b { color: var(--trn-text); }

/* ════ grid ════ */
.cm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 14px; }

@keyframes cm-drift1 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-24px, 26px); } }
@keyframes cm-drift2 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(28px, -20px); } }

@media (max-width: 560px) { .cm-title { font-size: 26px; } .cm-spectrum-mini { gap: 16px; } .cm-grid { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) {
  .cm-blob, .cm-spectrum-aura, .cm-word.grad, .cm-spectrum-seg::after { animation: none; }
  .cm-spectrum-seg { transition: none; }
}
</style>
