<template>
  <article ref="cardEl" class="rac" :class="{ boomerang: cand.rehire_count > 0 }">
    <span class="rac-glare" aria-hidden="true" />
    <span class="rac-spine" aria-hidden="true" />

    <!-- header -->
    <header class="rac-top">
      <div class="rac-av-wrap">
        <span class="rac-av-ring" aria-hidden="true" />
        <span class="rac-av">{{ initials }}</span>
        <span class="rac-av-badge" v-if="cand.rehire_count > 0"><Repeat :size="9" /></span>
      </div>
      <div class="rac-id">
        <b>{{ cand.full_name || 'Former employee' }}</b>
        <small>{{ cand.employee_id }}<template v-if="cand.designation_name"> · {{ cand.designation_name }}</template></small>
      </div>
      <span class="rac-state" :data-s="(cand.lifecycle_state || '').toLowerCase()">{{ stateLabel }}</span>
    </header>

    <!-- service ledger — prior tenure → away, with a return arc -->
    <div class="rac-ledger">
      <div class="rac-leg">
        <span class="rac-leg-k">Prior service</span>
        <span class="rac-leg-v">{{ priorTenure }}</span>
      </div>
      <svg class="rac-arc" viewBox="0 0 90 34" aria-hidden="true">
        <path class="rac-arc-track" d="M8 26 C 30 2, 60 2, 82 26" />
        <path class="rac-arc-flow" d="M8 26 C 30 2, 60 2, 82 26" />
        <circle class="rac-arc-a" cx="8" cy="26" r="3" />
        <circle class="rac-arc-b" cx="82" cy="26" r="3.4" />
      </svg>
      <div class="rac-leg right">
        <span class="rac-leg-k">Away</span>
        <span class="rac-leg-v">{{ away }}</span>
      </div>
    </div>

    <!-- facts -->
    <div class="rac-facts">
      <div class="rac-fact"><Building2 :size="12" /><span>{{ cand.department_name || 'No dept' }}</span></div>
      <div class="rac-fact"><CalendarOff :size="12" /><span>Exited {{ fmtDate(cand.exit_date) }}</span></div>
      <div class="rac-fact"><CalendarClock :size="12" /><span>Joined {{ fmtDate(cand.original_joining_date) }}</span></div>
      <div class="rac-fact" v-if="cand.rehire_count > 0"><RotateCcw :size="12" /><span>Rehired ×{{ cand.rehire_count }}</span></div>
    </div>

    <!-- footer -->
    <div class="rac-foot">
      <span class="rac-case" :title="caseTitle">
        <FileText :size="11" /> {{ cand.exit_case_number }}<template v-if="cand.exit_reason_category"> · {{ prettyReason }}</template>
      </span>
      <Motion as="button" class="rac-cta" :whileHover="{ y: -2, scale: 1.03 }" :whileTap="{ scale: 0.95 }" @click="$emit('rehire', cand)">
        <span class="rac-cta-sweep" aria-hidden="true" />
        <RotateCcw :size="13" /> Rehire
      </Motion>
    </div>
  </article>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Building2, CalendarOff, CalendarClock, FileText, RotateCcw, Repeat } from 'lucide-vue-next'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({ cand: { type: Object, required: true } })
defineEmits(['rehire'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)

const initials = computed(() => (props.cand.full_name || '')
  .split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?')

const stateLabel = computed(() => ({ EXITED: 'Exited', ARCHIVED: 'Archived', INACTIVE: 'Inactive' }[props.cand.lifecycle_state] || props.cand.lifecycle_state || '—'))
const prettyReason = computed(() => String(props.cand.exit_reason_category || '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()))
const caseTitle = computed(() => `Exit case ${props.cand.exit_case_number || ''}`)

const fmtDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  return isNaN(d) ? iso : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

const spanLabel = (fromIso, toIso) => {
  if (!fromIso || !toIso) return '—'
  const a = new Date(fromIso), b = new Date(toIso)
  if (isNaN(a) || isNaN(b)) return '—'
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  if (b.getDate() < a.getDate()) months -= 1
  if (months <= 0) {
    const days = Math.max(1, Math.round((b - a) / 86400000))
    return `${days}d`
  }
  const y = Math.floor(months / 12), m = months % 12
  return y ? `${y}y${m ? ' ' + m + 'm' : ''}` : `${m}mo`
}

const priorTenure = computed(() => spanLabel(props.cand.original_joining_date, props.cand.exit_date))
const away = computed(() => spanLabel(props.cand.exit_date, new Date().toISOString().slice(0, 10)))
</script>

<style scoped>
.rac {
  position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 16px 17px;
  border-radius: 18px; background: var(--hr-surface); border: 1px solid var(--hr-border-strong);
  box-shadow: 0 14px 34px -26px rgba(0, 0, 0, 0.7);
  transition: transform 0.4s var(--hr-spring), box-shadow 0.35s var(--hr-spring), border-color 0.3s;
  transform: perspective(1100px) rotateX(calc((var(--my, 0.5) - 0.5) * -6deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 8deg));
}
.rac:hover {
  border-color: var(--hr-accent-gold-border);
  box-shadow: 0 26px 52px -28px rgba(245, 158, 11, 0.5);
  transform: perspective(1100px) rotateX(calc((var(--my, 0.5) - 0.5) * -6deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 8deg)) translateY(-3px);
}
.rac-glare { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 4; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(340px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), rgba(251, 191, 36, 0.16), transparent 60%); }
.rac-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--hr-gradient-hero); opacity: 0.85; }
.rac.boomerang .rac-spine { box-shadow: 0 0 14px rgba(251, 191, 36, 0.55); }

/* header */
.rac-top { display: flex; align-items: center; gap: 11px; }
.rac-av-wrap { position: relative; width: 44px; height: 44px; flex-shrink: 0; }
.rac-av-ring { position: absolute; inset: -3px; border-radius: 50%; border: 1.5px solid var(--hr-accent-gold-border); border-top-color: var(--hr-accent-gold); animation: rac-spin 5s linear infinite; }
.rac-av { position: absolute; inset: 0; border-radius: 50%; display: grid; place-items: center; font-weight: 800; font-size: 14px; color: #1f1408; background: linear-gradient(135deg, #fcd34d, #f59e0b); }
.rac-av-badge { position: absolute; right: -3px; bottom: -3px; width: 17px; height: 17px; border-radius: 50%; display: grid; place-items: center; color: #1f1408; background: linear-gradient(135deg, #fbbf24, #fb923c); border: 2px solid var(--hr-surface); }
@keyframes rac-spin { to { transform: rotate(360deg); } }
.rac-id { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.rac-id b { font-size: 14px; color: var(--hr-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rac-id small { font-size: 11px; color: var(--hr-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rac-state { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; padding: 3px 8px; border-radius: 999px; flex-shrink: 0;
  color: #fb923c; background: rgba(251, 146, 60, 0.12); border: 1px solid rgba(251, 146, 60, 0.32); }
.rac-state[data-s="archived"], .rac-state[data-s="inactive"] { color: var(--hr-text-muted); background: var(--hr-input-bg); border-color: var(--hr-border-strong); }

/* service ledger */
.rac-ledger { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; padding: 10px 6px; border-radius: 12px;
  background: var(--hr-input-bg); border: 1px solid var(--hr-border); }
.rac-leg { display: flex; flex-direction: column; gap: 2px; padding-left: 8px; } .rac-leg.right { align-items: flex-end; padding-right: 8px; padding-left: 0; }
.rac-leg-k { font-size: 8.5px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: var(--hr-text-dim); }
.rac-leg-v { font-size: 14px; font-weight: 800; color: var(--hr-text); font-variant-numeric: tabular-nums; }
.rac-arc { width: 90px; height: 34px; }
.rac-arc-track { fill: none; stroke: var(--hr-border-strong); stroke-width: 1.4; stroke-dasharray: 2 4; }
.rac-arc-flow { fill: none; stroke: var(--hr-accent-gold); stroke-width: 1.8; stroke-linecap: round; stroke-dasharray: 8 120; opacity: 0; transition: opacity 0.3s; animation: rac-flow 2.2s linear infinite; }
.rac:hover .rac-arc-flow { opacity: 0.95; }
@keyframes rac-flow { to { stroke-dashoffset: -128; } }
.rac-arc-a { fill: var(--hr-text-dim); }
.rac-arc-b { fill: var(--hr-accent-gold); filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.6)); }

/* facts */
.rac-facts { display: grid; grid-template-columns: 1fr 1fr; gap: 7px 12px; }
.rac-fact { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--hr-text-muted); min-width: 0; }
.rac-fact svg { color: var(--hr-accent-gold); flex-shrink: 0; }
.rac-fact span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* footer */
.rac-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 2px; padding-top: 11px; border-top: 1px solid var(--hr-border); }
.rac-case { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-family: var(--hr-mono); color: var(--hr-text-muted); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rac-case svg { flex-shrink: 0; }
.rac-cta { position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 10px; cursor: pointer;
  font-weight: 700; font-size: 12.5px; flex-shrink: 0; color: #1f1408; border: 0; background: var(--hr-gradient-hero); box-shadow: 0 8px 20px -10px rgba(245, 158, 11, 0.6); }
.rac-cta-sweep { position: absolute; inset: 0; background: linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.5), transparent 70%); transform: translateX(-130%); }
.rac:hover .rac-cta-sweep { animation: rac-sweep 0.85s var(--hr-spring); }
@keyframes rac-sweep { to { transform: translateX(130%); } }

[data-theme="light"] .rac { box-shadow: 0 16px 34px -26px rgba(40, 25, 10, 0.4); }
[data-theme="light"] .rac:hover { box-shadow: 0 26px 50px -28px rgba(217, 119, 6, 0.4); }
[data-theme="light"] .rac-av-badge { border-color: var(--hr-surface-elevated); }
[data-theme="light"] .rac-cta { color: #fff; }

@media (prefers-reduced-motion: reduce) {
  .rac, .rac:hover { transform: none; }
  .rac-av-ring, .rac-arc-flow, .rac-cta-sweep { animation: none; }
}
</style>
