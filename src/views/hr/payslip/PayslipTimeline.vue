<template>
  <div class="tl">
    <div class="spine" aria-hidden="true" />
    <Motion v-for="(p, i) in items" :key="p.id" as="div" class="node"
      :initial="{ opacity: 0, x: -12 }" :animate="{ opacity: 1, x: 0 }"
      :transition="{ duration: 0.4, delay: Math.min(i*0.05,0.5), ease: [0.16,1,0.3,1] }">
      <span class="dot" />
      <div class="card" @click="$emit('open', p.id)">
        <div class="c-left">
          <span class="mon">{{ monthLabel(p.period_month) }} {{ p.period_year }}</span>
          <span class="no">{{ p.payslip_no }}</span>
        </div>
        <PayMoneyValue class="net" tone="net" :value="p.net_pay" :animate="false" />
        <PayStatusChip :status="p.status" />
        <button class="dl" title="Download PDF" @click.stop="dl(p)"><Download :size="14" /></button>
      </div>
    </Motion>
  </div>
</template>

<script setup>
import { Motion } from 'motion-v'
import { Download } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import PayMoneyValue from '../payroll/components/PayMoneyValue.vue'
import PayStatusChip from '../payroll/components/PayStatusChip.vue'
import { monthLabel } from '@/composables/usePayroll'
import { downloadMyPayslipPdf } from '@/composables/usePayslip'

defineProps({ items: { type: Array, default: () => [] } })
defineEmits(['open'])
const toast = useToast()
const dl = async (p) => {
  try { await downloadMyPayslipPdf(p.id, p.payslip_no) }
  catch (e) { toast.error(e?.response?.status === 503 ? 'PDF engine unavailable (GTK)' : 'Download failed') }
}
</script>

<style scoped>
.tl { position: relative; padding-left: 26px; display: flex; flex-direction: column; gap: 12px; }
.spine { position: absolute; left: 7px; top: 6px; bottom: 6px; width: 2px; background: var(--pay-grad-rail); opacity: 0.5; }
.node { position: relative; }
.dot { position: absolute; left: -23px; top: 22px; width: 11px; height: 11px; border-radius: 50%;
  background: var(--pay-treasury); box-shadow: 0 0 0 4px rgba(251,191,36,0.14); }
.card { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: 14px; cursor: pointer;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft); transition: 0.2s; }
.card:hover { border-color: var(--pay-border); transform: translateX(3px); }
.c-left { display: flex; flex-direction: column; min-width: 130px; }
.mon { font-size: 14px; color: var(--pay-text); font-weight: 600; }
.no { font-family: var(--pay-mono); font-size: 10.5px; color: var(--pay-text-muted); }
.net { font-size: 16px; margin-left: auto; }
.dl { width: 32px; height: 32px; border-radius: 9px; border: 1px solid var(--pay-border-soft); background: var(--pay-surface-2);
  color: var(--pay-text-2); cursor: pointer; display: grid; place-items: center; }
.dl:hover { color: var(--pay-treasury); border-color: var(--pay-border); }
</style>
