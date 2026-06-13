<template>
  <section class="rep">
    <Motion as="header" class="rep-banner" :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5 }">
      <span class="banner-glow" />
      <div class="banner-text">
        <span class="eyebrow"><FileSpreadsheet :size="12" /> Export &amp; analyse</span>
        <h2>Reports</h2>
        <p>Generate operational shift reports straight from live data. Payroll-bound and forecasting reports activate alongside their modules.</p>
      </div>
    </Motion>

    <div class="rep-group">
      <span class="rg-title">Operational</span>
      <div class="rep-grid">
        <Motion v-for="(r, i) in operational" :key="r.key" as="article" class="rep-card"
          :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.05 * i }">
          <span class="rc-ic"><component :is="r.icon" :size="18" /></span>
          <h3>{{ r.title }}</h3>
          <p>{{ r.blurb }}</p>
          <button class="rc-dl" :disabled="busy === r.key" @click="run(r.key)">
            <Loader2 v-if="busy === r.key" :size="13" class="spin" /><Download v-else :size="13" />
            {{ busy === r.key ? 'Building…' : 'Export CSV' }}
          </button>
        </Motion>
      </div>
    </div>

    <div class="rep-group">
      <span class="rg-title">Payroll &amp; Workforce <em>· activate with their modules</em></span>
      <div class="rep-grid">
        <article v-for="r in soon" :key="r.title" class="rep-card soon">
          <span class="rc-ic"><component :is="r.icon" :size="18" /></span>
          <h3>{{ r.title }}</h3>
          <p>{{ r.blurb }}</p>
          <span class="rc-soon">Roadmap</span>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { Motion } from 'motion-v'
import {
  FileSpreadsheet, Download, Loader2, CalendarClock, Moon, Radar, RefreshCcw,
  Coins, TrendingUp, BarChart3,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import {
  fetchShifts, fetchShiftAssignments, fetchCoverageAlerts, fetchRotations, todayIso,
} from '@/composables/useShifts'

const toast = useToast()
const busy = ref('')

const operational = [
  { key: 'allocation', title: 'Shift Allocation', icon: CalendarClock, blurb: 'Every employee active on a shift today with effective dates.' },
  { key: 'night', title: 'Night Shift Report', icon: Moon, blurb: 'Staff currently assigned to night-type shifts.' },
  { key: 'coverage', title: 'Coverage Report', icon: Radar, blurb: 'Required vs. assigned head-count per coverage rule, with shortfalls.' },
  { key: 'rotation', title: 'Rotation Report', icon: RefreshCcw, blurb: 'All rotations with cycle, current step and member count.' },
]
const soon = [
  { title: 'Overtime Cost', icon: Coins, blurb: 'OT hours costed against pay rates per the Overtime Rules engine.' },
  { title: 'Shift / Night Allowance', icon: Coins, blurb: 'Allowance payouts derived from shift configuration.' },
  { title: 'Workforce Availability', icon: TrendingUp, blurb: 'Forecast staffing demand vs. assigned capacity.' },
  { title: 'Shift Utilisation', icon: BarChart3, blurb: 'Capacity utilisation per shift over a period.' },
]

const csvCell = (v) => {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const download = (filename, headers, rows) => {
  const lines = [headers.map(csvCell).join(',')]
  for (const r of rows) lines.push(r.map(csvCell).join(','))
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const run = async (key) => {
  busy.value = key
  try {
    const today = todayIso()
    if (key === 'allocation') {
      const data = await fetchShiftAssignments({ active_on: today })
      const rows = (Array.isArray(data) ? data : data.items || []).map(a => [a.employee_name, a.shift_code, a.shift_name, a.effective_from, a.effective_until || 'open'])
      download(`shift-allocation_${today}.csv`, ['Employee', 'Shift code', 'Shift', 'From', 'Until'], rows)
    } else if (key === 'night') {
      const [sh, as] = await Promise.all([fetchShifts({ limit: 100 }), fetchShiftAssignments({ active_on: today })])
      const nightIds = new Set((sh.items || []).filter(s => s.shift_type === 'NIGHT').map(s => s.id))
      const rows = (Array.isArray(as) ? as : as.items || []).filter(a => nightIds.has(a.shift_id)).map(a => [a.employee_name, a.shift_code, a.shift_name, a.effective_from, a.effective_until || 'open'])
      download(`night-shift_${today}.csv`, ['Employee', 'Shift code', 'Shift', 'From', 'Until'], rows)
    } else if (key === 'coverage') {
      const data = await fetchCoverageAlerts()
      const rows = (data.alerts || []).map(a => [a.shift_name, a.department_name || 'All', a.min_staff, a.assigned, a.shortfall, a.status])
      download(`coverage_${data.on_date}.csv`, ['Shift', 'Department', 'Required', 'Assigned', 'Shortfall', 'Status'], rows)
    } else if (key === 'rotation') {
      const data = await fetchRotations({ limit: 200 })
      const rows = (data.items || []).map(r => [r.name, r.cycle, r.frequency_days, (r.steps || []).length, r.member_count, (r.current_step_index % ((r.steps || []).length || 1)) + 1, r.last_advanced_on || 'never'])
      download(`rotations_${today}.csv`, ['Rotation', 'Cycle', 'Step days', 'Steps', 'Members', 'Current step', 'Last advanced'], rows)
    }
    toast.success('Report downloaded')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not build report')
  } finally { busy.value = '' }
}
</script>

<style scoped>
.rep { display: flex; flex-direction: column; gap: 18px; }
.rep-banner { position: relative; padding: 20px 24px; border-radius: 20px; overflow: hidden; background: var(--shift-surface); border: 1px solid var(--shift-border); }
.banner-glow { position: absolute; inset: 0; background: var(--shift-grad-hero); pointer-events: none; }
.banner-text { position: relative; z-index: 1; max-width: 620px; }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--shift-amber-strong); }
.banner-text h2 { margin: 6px 0 4px; font-size: 22px; font-weight: 800; color: var(--shift-text); letter-spacing: -0.02em; }
.banner-text p { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--shift-text-muted); }
.rep-group { display: flex; flex-direction: column; gap: 12px; }
.rg-title { font-family: var(--shift-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--shift-text-muted); }
.rg-title em { font-style: normal; color: var(--shift-text-dim); text-transform: none; letter-spacing: 0; }
.rep-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 13px; }
.rep-card { display: flex; flex-direction: column; gap: 8px; padding: 18px; border-radius: 16px; background: var(--shift-surface); border: 1px solid var(--shift-border-soft); }
.rep-card.soon { opacity: 0.7; }
.rc-ic { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; background: rgba(251,191,36,0.12); color: var(--shift-amber); }
.rep-card h3 { margin: 4px 0 0; font-size: 14px; font-weight: 700; color: var(--shift-text); }
.rep-card p { margin: 0; font-size: 12px; line-height: 1.5; color: var(--shift-text-muted); flex: 1; }
.rc-dl { display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 8px; border-radius: 9px; cursor: pointer;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border); color: var(--shift-amber); font-weight: 600; font-size: 12px; transition: 0.18s; }
.rc-dl:hover { background: rgba(251,191,36,0.12); }
.rc-dl:disabled { opacity: 0.6; }
.rc-soon { align-self: flex-start; font-family: var(--shift-mono); font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 9px; border-radius: 999px; background: rgba(148,163,184,0.12); color: var(--shift-text-dim); }
.spin :deep(svg), .spin { animation: shift-spin 0.85s linear infinite; }
</style>
