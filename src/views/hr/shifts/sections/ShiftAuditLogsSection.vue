<template>
  <section class="aud">
    <Motion as="header" class="aud-banner" :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5 }">
      <span class="banner-glow" />
      <div class="banner-text">
        <span class="eyebrow"><ScrollText :size="12" /> Append-only trail</span>
        <h2>Audit Logs</h2>
        <p>Every shift assignment, rotation advance and roster publish is recorded immutably. Filtered to shift-related events.</p>
      </div>
      <button class="btn-ghost" @click="reload" :class="{ spin: loading }"><RefreshCw :size="14" /> Refresh</button>
    </Motion>

    <div class="card">
      <div v-if="loading && !logs.length" class="aud-skel">
        <div v-for="n in 6" :key="n" class="sk-line" />
      </div>
      <ol v-else-if="logs.length" class="timeline">
        <Motion v-for="(l, i) in logs" :key="l.id || i" as="li" class="tl-item"
          :initial="{ opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.3, delay: Math.min(i * 0.02, 0.3) }">
          <span class="tl-node"><component :is="iconFor(l)" :size="13" /></span>
          <div class="tl-body">
            <div class="tl-top">
              <span class="tl-action">{{ labelFor(l) }}</span>
              <span class="tl-time">{{ fmtTime(l.created_at) }}</span>
            </div>
            <div class="tl-detail">
              <span v-if="l.actor_name" class="tl-actor">by {{ l.actor_name }}</span>
              <span v-if="l.target_table" class="tl-target">{{ prettyTable(l.target_table) }}</span>
              <span v-if="payloadSummary(l)" class="tl-payload">{{ payloadSummary(l) }}</span>
            </div>
          </div>
        </Motion>
      </ol>
      <ShiftEmptyState v-else :icon="ScrollText" title="No shift activity yet"
        sub="Assignments, rotation advances and roster publishes will appear here as they happen." />
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { ScrollText, RefreshCw, UsersRound, RefreshCcw, CalendarRange } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ShiftEmptyState from '../components/ShiftEmptyState.vue'
import { fetchShiftLogs } from '@/composables/useShifts'

const toast = useToast()
const logs = ref([])
const loading = ref(false)

const reload = async () => {
  loading.value = true
  try {
    const data = await fetchShiftLogs({ action: 'SHIFT_ASSIGNED', limit: 100 })
    const rows = Array.isArray(data) ? data : (data.items || [])
    logs.value = rows
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load audit logs')
    logs.value = []
  } finally { loading.value = false }
}
onMounted(reload)

const prettyTable = (t) => ({
  hr_employee_shift_assignments: 'Assignment',
  hr_shift_rotations: 'Rotation',
  hr_shift_rosters: 'Roster',
}[t] || t || '')

const iconFor = (l) => {
  if (l.target_table === 'hr_shift_rotations') return RefreshCcw
  if (l.target_table === 'hr_shift_rosters') return CalendarRange
  return UsersRound
}
const labelFor = (l) => {
  if (l.target_table === 'hr_shift_rotations') return 'Rotation advanced'
  if (l.target_table === 'hr_shift_rosters') return 'Roster published'
  return 'Shift assigned'
}
const payloadSummary = (l) => {
  const p = l.payload || {}
  const bits = []
  if (p.rotation) bits.push(p.rotation)
  if (p.count != null) bits.push(`${p.count} assigned`)
  if (p.written != null) bits.push(`${p.written} written`)
  if (p.skipped) bits.push(`${p.skipped} skipped`)
  if (p.week_start) bits.push(`week ${p.week_start}`)
  if (p.effective_from) bits.push(`from ${p.effective_from}`)
  return bits.join(' · ')
}
const fmtTime = (t) => {
  if (!t) return ''
  try { return new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return t }
}
</script>

<style scoped>
.aud { display: flex; flex-direction: column; gap: 16px; }
.aud-banner { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 20px 24px; border-radius: 20px; overflow: hidden; background: var(--shift-surface); border: 1px solid var(--shift-border); }
.banner-glow { position: absolute; inset: 0; background: var(--shift-grad-hero); pointer-events: none; }
.banner-text { position: relative; z-index: 1; max-width: 620px; }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--shift-amber-strong); }
.banner-text h2 { margin: 6px 0 4px; font-size: 22px; font-weight: 800; color: var(--shift-text); letter-spacing: -0.02em; }
.banner-text p { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--shift-text-muted); }
.btn-ghost { display: inline-flex; align-items: center; gap: 6px; padding: 9px 13px; border-radius: 10px; cursor: pointer; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); font-weight: 600; font-size: 13px; flex-shrink: 0; }
.btn-ghost.spin :deep(svg) { animation: shift-spin 0.85s linear infinite; }

.card { background: var(--shift-surface); border: 1px solid var(--shift-border-soft); border-radius: 18px; padding: 20px 22px; }
.aud-skel { display: flex; flex-direction: column; gap: 12px; }
.sk-line { height: 40px; border-radius: 10px; background: linear-gradient(100deg, var(--shift-surface-2), var(--shift-surface), var(--shift-surface-2)); background-size: 200% 100%; animation: shift-shimmer 1.4s linear infinite; }
@keyframes shift-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.timeline { list-style: none; margin: 0; padding: 0; position: relative; }
.timeline::before { content: ''; position: absolute; left: 13px; top: 6px; bottom: 6px; width: 1px; background: var(--shift-border-soft); }
.tl-item { position: relative; display: flex; gap: 14px; padding: 8px 0; }
.tl-node { position: relative; z-index: 1; width: 28px; height: 28px; flex-shrink: 0; border-radius: 50%; display: grid; place-items: center;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border); color: var(--shift-amber); }
.tl-body { flex: 1; min-width: 0; }
.tl-top { display: flex; align-items: baseline; gap: 10px; }
.tl-action { font-size: 13px; font-weight: 700; color: var(--shift-text); }
.tl-time { font-family: var(--shift-mono); font-size: 10.5px; color: var(--shift-text-dim); margin-left: auto; }
.tl-detail { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 3px; }
.tl-actor { font-size: 11.5px; color: var(--shift-text-muted); }
.tl-target { font-family: var(--shift-mono); font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.06em; padding: 2px 7px; border-radius: 6px; background: rgba(251,191,36,0.1); color: var(--shift-amber); }
.tl-payload { font-size: 11.5px; color: var(--shift-text-2); }
</style>
