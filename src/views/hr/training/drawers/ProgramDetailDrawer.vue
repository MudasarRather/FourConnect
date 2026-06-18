<template>
  <TrnDrawer :open="open" wide eyebrow="Training program" :title="program?.name || ''" :icon="BookOpen" @close="$emit('close')">
    <template v-if="program">
     <div class="pd-stack">
      <!-- overview: trait flags + vital signs -->
      <Motion as="section" class="pd-card"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }">
        <div class="pd-badges">
          <TrnTypeBadge :type="program.training_type" />
          <span class="pd-flag" :class="program.is_active ? 'ok' : 'off'">
            <span class="pf-dot" /> {{ program.is_active ? 'Active' : 'Inactive' }}
          </span>
          <span v-if="program.certification_required" class="pd-flag ok"><Award :size="12" /> Certified</span>
          <span v-if="program.is_mandatory_for_new_joiners" class="pd-flag"><UserPlus :size="12" /> Joiner-mandatory</span>
          <span v-if="program.is_compliance" class="pd-flag warn"><ShieldCheck :size="12" /> Compliance</span>
        </div>
        <dl class="pd-meta">
          <div class="pdm-cell"><dt><Hash :size="11" /> Code</dt><dd class="trn-mono">{{ program.code || '—' }}</dd></div>
          <div class="pdm-cell"><dt><Clock :size="11" /> Duration</dt><dd>{{ program.duration_hours ? program.duration_hours + ' h' : '—' }}</dd></div>
          <div class="pdm-cell"><dt><MonitorPlay :size="11" /> Delivery</dt><dd class="cap">{{ prettyMode(program.delivery_mode) }}</dd></div>
          <div class="pdm-cell"><dt><Presentation :size="11" /> Trainer</dt><dd>{{ program.trainer_name || '—' }}</dd></div>
          <div class="pdm-cell"><dt><CalendarDays :size="11" /> Created</dt><dd>{{ createdDate }}</dd></div>
          <div class="pdm-cell"><dt><Award :size="11" /> Certificate</dt><dd>{{ program.certification_required ? 'On completion' : 'None' }}</dd></div>
        </dl>
      </Motion>

      <!-- about -->
      <Motion v-if="program.description" as="section" class="pd-card"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.06, ease: [0.16, 1, 0.3, 1] }">
        <h4 class="pd-card-h"><FileText :size="12" /> About this program</h4>
        <p class="pd-about">{{ program.description }}</p>
      </Motion>

      <!-- enrollment analytics -->
      <Motion as="section" class="pd-card pd-analytics"
        :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.55, delay: 0.12, ease: [0.16, 1, 0.3, 1] }">
        <span class="pa-aura" aria-hidden="true" />
        <span class="pa-grain trn-grain" aria-hidden="true" />
        <header class="pa-head">
          <h4><Activity :size="13" /> Enrollment analytics</h4>
          <span v-if="!loadingStats && total > 0" class="pa-total trn-mono">{{ total }} total</span>
        </header>

        <div v-if="loadingStats" class="pa-loading">
          <div class="trn-skel" style="width:124px;height:124px;border-radius:50%" />
          <div class="pa-skel-col">
            <div class="trn-skel" style="height:58px" /><div class="trn-skel" style="height:58px" />
          </div>
        </div>

        <template v-else-if="total > 0">
          <div class="pa-top">
            <div class="pa-orbit-wrap">
              <span class="pa-orbit-glow" aria-hidden="true" />
              <span class="pa-comet" aria-hidden="true"><i /></span>
              <TrnProgressOrbit :pct="completionPct" :size="124" :stroke="9" color="var(--trn-st-completed-hex)" label="completed" />
            </div>
            <div class="pa-mini">
              <Motion v-for="(st, i) in miniStats" :key="st.key" as="button" type="button" class="pa-stat"
                :class="{ clickable: st.click }" :style="{ '--c': st.accent }"
                :initial="{ opacity: 0, y: 12, scale: 0.95 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
                :transition="{ duration: 0.42, delay: 0.18 + i * 0.07, ease: [0.16, 1, 0.3, 1] }"
                :whileHover="st.click ? { y: -3 } : {}" :whileTap="st.click ? { scale: 0.96 } : {}"
                @click="st.click && $emit('assign')">
                <span class="pas-ic"><component :is="st.icon" :size="14" /></span>
                <span class="pas-val"><TrnCountUp :value="st.value" /></span>
                <span class="pas-lab">{{ st.label }}</span>
              </Motion>
            </div>
          </div>

          <!-- status distribution -->
          <div class="pa-dist">
            <div class="pad-top"><span class="pad-cap">Status distribution</span><span class="pad-pct trn-mono">{{ completionPct }}% complete</span></div>
            <div class="pad-bar" :class="{ ready: barReady }">
              <span v-for="seg in segments" :key="seg.key" class="pad-seg"
                :style="{ width: (barReady ? seg.pct : 0) + '%', '--sc': seg.color }" :title="`${seg.label}: ${seg.count}`" />
            </div>
            <div class="pad-legend">
              <Motion v-for="(seg, i) in segments" :key="seg.key" as="span" class="padl"
                :initial="{ opacity: 0, y: 4 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.3, delay: 0.42 + i * 0.06 }">
                <i :style="{ background: seg.color }" /> {{ seg.label }} <b>{{ seg.count }}</b>
              </Motion>
            </div>
          </div>

          <Motion v-if="avgScore !== null" as="div" class="pa-score"
            :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.5 }">
            <span class="pasc-ic"><Gauge :size="14" /></span>
            <span>Average score <b>{{ avgScore }}</b> <i>· {{ scored }} graded completion{{ scored === 1 ? '' : 's' }}</i></span>
          </Motion>

          <!-- recent assignees -->
          <div class="pa-recent">
            <h5><Users :size="12" /> Recent enrollees</h5>
            <ul>
              <Motion v-for="(a, i) in recent" :key="a.id" as="li"
                :initial="{ opacity: 0, x: 12 }" :animate="{ opacity: 1, x: 0 }"
                :transition="{ duration: 0.36, delay: 0.46 + i * 0.06, ease: [0.16, 1, 0.3, 1] }">
                <span class="par-av" :style="{ '--c': avatarColor(a.employee_name) }">{{ initials(a.employee_name) }}</span>
                <span class="par-meta">
                  <span class="par-name">{{ a.employee_name || 'Unknown' }}</span>
                  <span v-if="a.assigned_date" class="par-date">enrolled {{ shortDate(a.assigned_date) }}</span>
                </span>
                <TrnStatusStamp :status="a.status" />
              </Motion>
            </ul>
          </div>
        </template>

        <div v-else class="pa-empty">
          <span class="pae-orb" aria-hidden="true"><span class="ring" /><Telescope :size="22" /></span>
          <p>No employees enrolled yet.</p>
          <button class="trn-btn trn-btn-ghost" @click="$emit('assign')"><UserPlus :size="14" /> Assign employees</button>
        </div>
      </Motion>

      <a v-if="program.materials_url" class="pd-material" :href="program.materials_url" target="_blank" rel="noopener">
        <FileText :size="15" /> Open training materials <ExternalLink :size="13" />
      </a>
     </div>
    </template>

    <template #footer>
      <button class="trn-btn trn-btn-danger pd-del" @click="$emit('delete', program)"><Trash2 :size="14" /></button>
      <button class="trn-btn trn-btn-ghost" @click="$emit('edit', program)"><Pencil :size="14" /> Edit</button>
      <button class="trn-btn trn-btn-primary" @click="$emit('assign')"><UserPlus :size="14" /> Assign</button>
    </template>
  </TrnDrawer>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { Motion } from 'motion-v'
import {
  BookOpen, Award, UserPlus, ShieldCheck, FileText, ExternalLink, Pencil, Trash2,
  Hash, Clock, MonitorPlay, Presentation, CalendarDays, Activity, Gauge, Telescope,
  Users, CheckCircle2, Loader, AlarmClock,
} from 'lucide-vue-next'
import TrnDrawer from '../components/TrnDrawer.vue'
import TrnTypeBadge from '../components/TrnTypeBadge.vue'
import TrnProgressOrbit from '../components/TrnProgressOrbit.vue'
import TrnStatusStamp from '../components/TrnStatusStamp.vue'
import TrnCountUp from '../components/TrnCountUp.vue'
import { statusMeta, fetchTrainingAssignments } from '@/composables/useTraining'

const props = defineProps({ open: { type: Boolean, default: false }, program: { type: Object, default: null } })
defineEmits(['close', 'edit', 'delete', 'assign'])

const assignments = ref([])
const loadingStats = ref(false)
const barReady = ref(false)

const loadAnalytics = async () => {
  if (!props.program?.id) return
  loadingStats.value = true
  barReady.value = false
  assignments.value = []
  try {
    assignments.value = await fetchTrainingAssignments({ program_id: props.program.id })
  } catch { /* analytics are best-effort; drawer still renders */ }
  finally {
    loadingStats.value = false
    await nextTick()
    requestAnimationFrame(() => { barReady.value = true })
  }
}

watch(() => props.open, (o) => { if (o) loadAnalytics() })
watch(() => props.program?.id, () => { if (props.open) loadAnalytics() })

const total = computed(() => assignments.value.length)
const statusCount = (s) => assignments.value.filter(a => a.status === s).length
const completionPct = computed(() => total.value ? Math.round((statusCount('COMPLETED') / total.value) * 100) : 0)
const overdue = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return assignments.value.filter(a => a.due_date && a.due_date < today && !['COMPLETED', 'WAIVED'].includes(a.status)).length
})
const scored = computed(() => assignments.value.filter(a => a.status === 'COMPLETED' && a.score != null).length)
const avgScore = computed(() => {
  const rows = assignments.value.filter(a => a.status === 'COMPLETED' && a.score != null)
  if (!rows.length) return null
  return Math.round((rows.reduce((s, a) => s + Number(a.score), 0) / rows.length) * 10) / 10
})

const miniStats = computed(() => [
  { key: 'enrolled', label: 'Enrolled', value: total.value, icon: Users, accent: 'var(--trn-amber)', click: true },
  { key: 'completed', label: 'Completed', value: statusCount('COMPLETED'), icon: CheckCircle2, accent: 'var(--trn-st-completed)' },
  { key: 'inprogress', label: 'In progress', value: statusCount('IN_PROGRESS'), icon: Loader, accent: 'var(--trn-st-in-progress)' },
  { key: 'overdue', label: 'Overdue', value: overdue.value, icon: AlarmClock, accent: overdue.value > 0 ? 'var(--trn-st-failed)' : 'var(--trn-text-dim)' },
])

const STATUS_ORDER = [
  { key: 'COMPLETED', color: 'var(--trn-st-completed)' },
  { key: 'IN_PROGRESS', color: 'var(--trn-st-in-progress)' },
  { key: 'NOT_STARTED', color: 'var(--trn-st-not-started)' },
  { key: 'WAIVED', color: 'var(--trn-st-waived)' },
  { key: 'FAILED', color: 'var(--trn-st-failed)' },
]
const distribution = computed(() => STATUS_ORDER.map(s => {
  const count = statusCount(s.key)
  return { ...s, count, label: statusMeta(s.key).label, pct: total.value ? (count / total.value) * 100 : 0 }
}))
const segments = computed(() => distribution.value.filter(s => s.count))
const recent = computed(() =>
  [...assignments.value].sort((a, b) => (b.assigned_date || '').localeCompare(a.assigned_date || '')).slice(0, 5))

const createdDate = computed(() => {
  if (!props.program?.created_at) return '—'
  try { return new Date(props.program.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return '—' }
})
const prettyMode = (m) => (m ? String(m).replace(/_/g, ' ').toLowerCase() : '—')
const shortDate = (d) => {
  try { return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) } catch { return d }
}
const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
const PALETTE = ['#fbbf24', '#fb923c', '#f59e0b', '#34d399', '#ea580c', '#d97706']
const avatarColor = (n) => PALETTE[((n || '').length) % PALETTE.length]
</script>

<style scoped>
/* structured stack of cards */
.pd-stack { display: flex; flex-direction: column; gap: 14px; }
.pd-card { position: relative; border: 1px solid var(--trn-border-soft); border-radius: 18px; padding: 16px 18px; background: var(--trn-surface); }
.pd-card-h { display: flex; align-items: center; gap: 6px; margin: 0 0 12px; font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.07em; color: var(--trn-text-muted); }

.pd-badges { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 14px; padding-bottom: 14px; border-bottom: 1px solid var(--trn-border-soft); }
.pd-flag { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 999px;
  color: var(--trn-text-muted); background: var(--trn-surface-elevated); border: 1px solid var(--trn-border-soft); }
.pd-flag.ok { color: var(--trn-st-completed); background: var(--trn-cert-active-soft); border-color: color-mix(in srgb, var(--trn-st-completed) 26%, transparent); }
.pd-flag.warn { color: var(--trn-ember); background: var(--trn-cert-pending-soft); border-color: color-mix(in srgb, var(--trn-ember) 26%, transparent); }
.pd-flag.off { color: var(--trn-text-dim); }
.pf-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

.pd-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0; }
.pdm-cell { display: flex; flex-direction: column; gap: 3px; padding: 9px 11px; border-radius: 11px;
  background: var(--trn-surface-elevated); border: 1px solid var(--trn-border-soft); }
.pd-meta dt { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--trn-text-dim); }
.pd-meta dd { margin: 0; font-size: 13.5px; color: var(--trn-text); font-weight: 600; }
.pd-meta dd.cap { text-transform: capitalize; }

.pa-head h4, .pa-recent h5 { display: flex; align-items: center; gap: 6px; margin: 0 0 8px; font-size: 11.5px;
  text-transform: uppercase; letter-spacing: 0.06em; color: var(--trn-text-muted); font-weight: 700; }
.pd-about { margin: 0; font-size: 13.5px; line-height: 1.6; color: var(--trn-text-secondary); }

/* analytics — extends .pd-card with a richer surface + aura */
.pd-analytics { overflow: hidden; isolation: isolate; background: var(--trn-surf-card); box-shadow: var(--trn-card-shadow); }
.pa-aura { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.8;
  background: radial-gradient(95% 70% at 0% 0%, color-mix(in srgb, var(--trn-st-completed) 11%, transparent), transparent 56%),
    radial-gradient(80% 80% at 100% 0%, color-mix(in srgb, var(--trn-amber) 9%, transparent), transparent 60%); }
.pa-grain { z-index: 0; opacity: 0.04; }
.pd-analytics > *:not(.pa-aura):not(.pa-grain) { position: relative; z-index: 1; }
.pa-head { display: flex; align-items: center; justify-content: space-between; }
.pa-head h4 { margin: 0; }
.pa-total { font-size: 11px; color: var(--trn-text-dim); padding: 2px 9px; border-radius: 999px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.pa-loading { display: flex; gap: 16px; align-items: center; padding: 10px 0; }
.pa-skel-col { flex: 1; display: flex; flex-direction: column; gap: 8px; }

.pa-top { display: flex; align-items: center; gap: 18px; margin: 14px 0 16px; }
.pa-orbit-wrap { position: relative; width: 124px; height: 124px; flex-shrink: 0; display: grid; place-items: center; }
.pa-orbit-glow { position: absolute; inset: 14px; border-radius: 50%; z-index: 0;
  background: radial-gradient(circle, color-mix(in srgb, var(--trn-st-completed) 24%, transparent), transparent 70%);
  filter: blur(7px); animation: trn-core-breathe 4s ease-in-out infinite; }
.pa-orbit-wrap :deep(.trn-orbit-meter) { position: relative; z-index: 2; }
.pa-comet { position: absolute; inset: 9px; z-index: 1; animation: trn-orbit-spin 6s linear infinite; }
.pa-comet i { position: absolute; top: -3px; left: 50%; transform: translateX(-50%); width: 6px; height: 6px; border-radius: 50%;
  background: var(--trn-st-completed); box-shadow: 0 0 10px var(--trn-st-completed); }

.pa-mini { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; flex: 1; }
.pa-stat { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 2px; align-items: flex-start;
  padding: 10px 11px 9px; border-radius: 13px; border: 1px solid var(--trn-border-soft); background: var(--trn-surface);
  text-align: left; cursor: default; transition: border-color 0.25s, background 0.25s; }
.pa-stat::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--c); opacity: 0.85; }
.pa-stat.clickable { cursor: pointer; }
.pa-stat.clickable:hover { border-color: color-mix(in srgb, var(--c) 42%, transparent); background: var(--trn-surface-elevated); }
.pas-ic { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 8px; margin-bottom: 3px;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); }
.pas-val { font-family: var(--trn-mono); font-size: 22px; font-weight: 800; color: var(--trn-text); line-height: 1; }
.pas-lab { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--trn-text-dim); }

.pa-dist { margin-bottom: 14px; }
.pad-top { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; }
.pad-cap { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--trn-text-dim); font-weight: 600; }
.pad-pct { font-size: 11px; color: var(--trn-st-completed); }
.pad-bar { position: relative; display: flex; height: 13px; border-radius: 999px; overflow: hidden;
  background: var(--trn-surface-elevated); box-shadow: inset 0 1px 3px rgba(0,0,0,0.25); }
.pad-seg { position: relative; overflow: hidden; height: 100%; transition: width 1s var(--trn-spring);
  background: linear-gradient(180deg, color-mix(in srgb, var(--sc) 86%, #fff 14%), var(--sc)); }
.pad-seg:not(:last-child) { box-shadow: inset -1.5px 0 0 var(--trn-canvas); }
.pad-bar.ready .pad-seg::after { content: ''; position: absolute; inset: 0;
  background: linear-gradient(110deg, transparent 18%, rgba(255,255,255,0.45) 50%, transparent 82%); background-size: 220% 100%;
  animation: trn-sheen 2.8s linear infinite; }
.pad-legend { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
.padl { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--trn-text-muted); }
.padl i { width: 8px; height: 8px; border-radius: 3px; }
.padl b { color: var(--trn-text); font-family: var(--trn-mono); }

.pa-score { display: flex; align-items: center; gap: 9px; font-size: 12px; color: var(--trn-text-muted); margin-bottom: 16px;
  padding: 9px 11px; border-radius: 12px; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.pasc-ic { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0;
  color: var(--trn-amber); background: color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.pa-score b { color: var(--trn-amber-strong); font-family: var(--trn-mono); }
.pa-score i { font-style: normal; color: var(--trn-text-dim); }

.pa-recent h5 { display: flex; align-items: center; gap: 6px; margin: 0 0 10px; font-size: 11.5px; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--trn-text-muted); font-weight: 700; }
.pa-recent ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
.pa-recent li { display: flex; align-items: center; gap: 11px; padding: 7px 9px; border-radius: 11px; background: var(--trn-surface);
  border: 1px solid var(--trn-border-soft); transition: transform 0.2s var(--trn-spring), border-color 0.2s; }
.pa-recent li:hover { transform: translateX(3px); border-color: var(--trn-border-strong); }
.par-av { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
  font-size: 11px; font-weight: 700; color: #1a1206; background: color-mix(in srgb, var(--c) 80%, #fff);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--c) 40%, transparent), 0 0 12px -4px var(--c); }
.par-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.par-name { font-size: 13px; font-weight: 600; color: var(--trn-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.par-date { font-size: 10.5px; color: var(--trn-text-dim); }

.pa-empty { display: grid; place-items: center; gap: 8px; text-align: center; padding: 24px 12px; color: var(--trn-text-muted); }
.pae-orb { position: relative; width: 60px; height: 60px; display: grid; place-items: center; color: var(--trn-amber); margin-bottom: 2px; }
.pae-orb .ring { position: absolute; inset: 0; border-radius: 50%; border: 1px dashed color-mix(in srgb, var(--trn-amber) 40%, transparent);
  animation: trn-orbit-spin 12s linear infinite; }
.pa-empty p { margin: 0; font-size: 13px; }
.pae-orb :deep(svg) { filter: drop-shadow(0 0 8px var(--trn-dome-glow)); }

@media (prefers-reduced-motion: reduce) {
  .pa-orbit-glow, .pa-comet, .pad-bar.ready .pad-seg::after, .pae-orb .ring { animation: none !important; }
}

.pd-material { display: inline-flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 12px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); color: var(--trn-amber); font-size: 13px; font-weight: 600; text-decoration: none; transition: background 0.2s; }
.pd-material:hover { background: var(--trn-surface-elevated); }

.pd-del { margin-right: auto; padding-left: 12px; padding-right: 12px; }
@media (max-width: 520px) { .pa-top { flex-direction: column; align-items: stretch; } .pa-mini { grid-template-columns: 1fr 1fr; } }
</style>
