<template>
  <Motion ref="root" as="section" class="act hr-card"
    :initial="reduced ? false : { opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, delay: 0.18, ease: [0.16, 1, 0.3, 1] }">
    <span class="hr-grain" aria-hidden="true" />
    <header class="act-head">
      <span class="act-eyebrow"><BellRing :size="13" /> Action Center</span>
      <span class="act-flag" :data-clear="totalPending === 0">
        <component :is="totalPending === 0 ? ShieldCheck : AlertTriangle" :size="12" />
        {{ totalPending === 0 ? 'All clear' : `${totalPending} pending` }}
      </span>
    </header>

    <div v-if="shownRows.length" class="act-list">
      <Motion v-for="(r, i) in shownRows" :key="r.key" as="button" type="button" class="act-row" :data-tone="r.tone"
        :initial="reduced ? false : { opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }"
        :transition="{ duration: 0.34, delay: 0.22 + i * 0.05 }"
        :whileHover="reduced ? {} : { x: 3 }" :whileTap="{ scale: 0.98 }" @click="$emit('go', r.target)">
        <span class="act-ic"><component :is="r.icon" :size="15" /><span v-if="i === 0 && !reduced" class="act-ping" /></span>
        <span class="act-num hr-mono"><HrCountUp :value="r.value" :start="lit" /></span>
        <span class="act-lab">{{ r.label }}<small>{{ r.module }}</small></span>
        <ChevronRight :size="15" class="act-arrow" />
      </Motion>
    </div>

    <div v-else class="act-empty">
      <span class="act-empty-ic"><PartyPopper :size="22" /></span>
      <p>No approvals waiting.<br /><small>Every HR queue is clear.</small></p>
    </div>

    <button class="act-foot" type="button" @click="$emit('go', '/admin/hr/leave/my-approvals')">
      <Inbox :size="13" /> Review all approval queues <ArrowUpRight :size="13" />
    </button>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import {
  BellRing, ShieldCheck, AlertTriangle, ChevronRight, PartyPopper, Inbox, ArrowUpRight,
  CalendarOff, Banknote, Plane, Receipt, FileSignature, ClipboardCheck, Target, DoorOpen, GraduationCap,
} from 'lucide-vue-next'
import HrCountUp from '@/components/hr/HrCountUp.vue'
import { prefersReduced, useInView } from '@/composables/useShiftMotion'

const props = defineProps({ data: { type: Object, default: () => ({}) } })
defineEmits(['go'])
const reduced = prefersReduced()
const root = ref(null)
const { visible: lit } = useInView(root, { threshold: 0.25 })

const n = (v) => Number(v) || 0
const rows = computed(() => {
  const d = props.data
  const lv = d.leave || {}
  const rec = d.recruitment?.stats || d.recruitment || {}
  const tr = d.travel || {}
  const rb = d.reimbursements || {}
  const pr = d.payroll || {}
  const ob = d.onboarding || {}
  const pf = d.performance || {}
  const ex = d.exit?.kpis || d.exit || {}
  const tn = d.training || {}
  const candidates = [
    { key: 'leave', icon: CalendarOff, module: 'Leave', label: 'Leave approvals', tone: 'gold',
      value: n(lv.pending_manager) + n(lv.pending_hr) + n(lv.pending), target: '/admin/hr/leave/my-approvals' },
    { key: 'payroll', icon: Banknote, module: 'Payroll', label: 'Payroll batches to approve', tone: 'emerald',
      value: n(pr.pending_approvals), target: '/admin/hr/payroll/approval' },
    { key: 'reimburse', icon: Receipt, module: 'Reimbursements', label: 'Claims to approve', tone: 'orange',
      value: n(rb.pending_approval), target: '/admin/hr/reimbursements/approvals' },
    { key: 'travel', icon: Plane, module: 'Travel', label: 'Travel requests', tone: 'orange',
      value: n(tr.pending) + n(tr.pending_approvals), target: '/admin/hr/travel/approvals' },
    { key: 'offers', icon: FileSignature, module: 'Recruitment', label: 'Offers & interviews', tone: 'gold',
      value: n(rec.offers_pending) + n(rec.pending_interviews), target: '/admin/hr/recruitment/offers' },
    { key: 'onboard', icon: ClipboardCheck, module: 'Onboarding', label: 'Onboarding documents', tone: 'gold',
      value: n(ob.pending_documents), target: '/admin/hr/onboarding/approvals' },
    { key: 'perf', icon: Target, module: 'Performance', label: 'Reviews overdue', tone: 'danger',
      value: n(pf.overdue), target: '/admin/hr/performance/reviews' },
    { key: 'exit', icon: DoorOpen, module: 'Exit', label: 'Clearances & settlements', tone: 'exited',
      value: n(ex.pending_clearances) + n(ex.pending_settlements), target: '/admin/hr/exit/clearance' },
    { key: 'training', icon: GraduationCap, module: 'Training', label: 'Overdue & expiring certs', tone: 'notice',
      value: n(tn.overdue_count) + n(tn.certs_expiring_30), target: '/admin/hr/training/compliance' },
  ]
  return candidates.filter((c) => c.value > 0).sort((a, b) => b.value - a.value)
})
const shownRows = computed(() => rows.value.slice(0, 7))
const totalPending = computed(() => rows.value.reduce((s, r) => s + r.value, 0))
</script>

<style scoped>
.act { position: relative; overflow: hidden; padding: 18px 20px; display: flex; flex-direction: column; gap: 12px; }
.act-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.act-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--hr-text-secondary); }
.act-eyebrow :deep(svg) { color: var(--hr-accent-gold); }
.act-flag { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 800; padding: 3px 9px; border-radius: 999px;
  color: var(--hr-notice); background: var(--hr-notice-soft); border: 1px solid color-mix(in srgb, var(--hr-notice) 30%, transparent); }
.act-flag[data-clear="true"] { color: var(--hr-active); background: var(--hr-active-soft); border-color: color-mix(in srgb, var(--hr-active) 30%, transparent); }

.act-list { display: flex; flex-direction: column; gap: 7px; flex: 1; }
.act-row { display: grid; grid-template-columns: 32px 30px 1fr auto; align-items: center; gap: 10px; padding: 9px 11px; border-radius: 12px; cursor: pointer; text-align: left; font: inherit;
  background: var(--hr-input-bg); border: 1px solid var(--hr-border); transition: background 0.2s, border-color 0.2s; }
.act-row:hover { background: var(--hr-surface-elevated); border-color: var(--hr-border-strong); }
.act-ic { position: relative; display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0; color: var(--rt); background: color-mix(in srgb, var(--rt) 14%, transparent); }
.act-row[data-tone="gold"] { --rt: var(--hr-accent-gold); }
.act-row[data-tone="orange"] { --rt: var(--hr-orange); }
.act-row[data-tone="emerald"] { --rt: var(--hr-active); }
.act-row[data-tone="notice"] { --rt: var(--hr-notice); }
.act-row[data-tone="danger"] { --rt: var(--hr-suspended); }
.act-row[data-tone="exited"] { --rt: var(--hr-exited); }
.act-ping { position: absolute; inset: -1px; border-radius: 9px; border: 1.5px solid currentColor; opacity: 0; animation: act-ping 2.4s ease-out infinite; }
@keyframes act-ping { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(1.32); opacity: 0; } }
.act-num { font-size: 18px; font-weight: 850; color: var(--hr-text); text-align: right; }
.act-lab { display: flex; flex-direction: column; font-size: 12.5px; color: var(--hr-text-secondary); line-height: 1.25; }
.act-lab small { font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--hr-text-dim); }
.act-arrow { color: var(--hr-text-dim); }

.act-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 20px 0; text-align: center; }
.act-empty-ic { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 14px; color: var(--hr-active); background: var(--hr-active-soft); }
.act-empty p { font-size: 13px; color: var(--hr-text-secondary); line-height: 1.5; }
.act-empty small { color: var(--hr-text-dim); }

.act-foot { display: inline-flex; align-items: center; justify-content: center; gap: 7px; width: 100%; margin-top: auto; padding: 10px 12px; border-radius: 12px; font-size: 11.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  color: var(--hr-text-secondary); background: var(--hr-input-bg); border: 1px solid var(--hr-border); transition: border-color 0.2s, color 0.2s; }
.act-foot:hover { color: var(--hr-accent-gold); border-color: var(--hr-accent-gold-border); }

@media (prefers-reduced-motion: reduce) { .act-ping { animation: none; } }
</style>
