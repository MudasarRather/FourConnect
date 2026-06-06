<template>
  <Teleport to="body">
    <transition name="pd-fade">
      <div v-if="open" class="pd-overlay" @mousedown.self="$emit('close')">
        <Motion class="pd-modal" as="div"
          :initial="{ opacity: 0, y: 24, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.4, ease: [0.16,1,0.3,1] }">
          <header class="pd-head">
            <div><span class="eyebrow">Statement</span><h2>{{ slip?.payslip_no || 'Loading…' }}</h2></div>
            <button class="x" @click="$emit('close')"><X :size="18" /></button>
          </header>
          <div v-if="loading" class="pd-body"><div class="pay-skel" style="height:280px" /></div>
          <div v-else-if="slip" class="pd-body">
            <div class="pd-net">
              <div><span>Net pay</span><PayMoneyValue class="big" tone="net" :value="slip.net_pay" /></div>
              <span class="period">{{ monthLabel(slip.period_month) }} {{ slip.period_year }}</span>
            </div>
            <div class="pd-meta">
              <div><span>Working</span><b>{{ slip.working_days }}</b></div>
              <div><span>Paid</span><b>{{ slip.paid_days }}</b></div>
              <div><span>LOP</span><b>{{ slip.lop_days }}</b></div>
              <div><span>Regime</span><b>{{ slip.tax_regime || '—' }}</b></div>
            </div>
            <div v-for="sec in grouped" :key="sec.key" class="pd-sec">
              <h4><span class="pay-cat" :class="sec.cat">{{ sec.label }}</span><PayMoneyValue :value="sec.total" :animate="false" /></h4>
              <ul><li v-for="l in sec.lines" :key="l.component_code">
                <span>{{ l.component_name }}</span><PayMoneyValue :value="l.amount" :animate="false" /></li></ul>
            </div>
            <button class="dl-btn" @click="download"><Download :size="15" /> Download PDF</button>
          </div>
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { Motion } from 'motion-v'
import { X, Download } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import PayMoneyValue from '../payroll/components/PayMoneyValue.vue'
import { monthLabel } from '@/composables/usePayroll'
import { PAYSLIP_SECTIONS, fetchMyPayslip, downloadMyPayslipPdf } from '@/composables/usePayslip'

const props = defineProps({ open: Boolean, payslipId: { type: String, default: null } })
defineEmits(['close'])
const toast = useToast()
const slip = ref(null); const loading = ref(false)

watch(() => [props.open, props.payslipId], async () => {
  if (!props.open || !props.payslipId) return
  loading.value = true; slip.value = null
  try { slip.value = await fetchMyPayslip(props.payslipId) }
  catch (e) { toast.error('Failed to load payslip') }
  finally { loading.value = false }
})
const grouped = computed(() => !slip.value ? [] : PAYSLIP_SECTIONS.map(sec => {
  const lines = (slip.value.lines || []).filter(l => l.component_type === sec.key)
  return { ...sec, lines, total: lines.reduce((a, l) => a + Number(l.amount || 0), 0) }
}).filter(s => s.lines.length))
const download = async () => {
  try { await downloadMyPayslipPdf(slip.value.id, slip.value.payslip_no) }
  catch (e) { toast.error(e?.response?.status === 503 ? 'PDF engine unavailable (GTK)' : 'Download failed') }
}
</script>

<style scoped>
.pd-overlay { position: fixed; inset: 0; z-index: 4000; background: rgba(6,5,4,0.6); backdrop-filter: blur(8px); display: grid; place-items: center; padding: 20px; }
.pd-modal { width: min(520px, 96vw); max-height: 90vh; overflow-y: auto; background: var(--pay-surface-2); border: 1px solid var(--pay-border); border-radius: 22px; box-shadow: 0 40px 100px -40px rgba(0,0,0,0.8); }
.pd-head { position: sticky; top: 0; display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 22px 12px; background: var(--pay-surface-2); }
.eyebrow { font-family: var(--pay-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; color: var(--pay-treasury); }
.pd-head h2 { margin: 4px 0 0; font-size: 18px; color: var(--pay-text); font-family: var(--pay-mono); }
.x { width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--pay-border-soft); background: var(--pay-surface); color: var(--pay-text-2); cursor: pointer; display: grid; place-items: center; }
.pd-body { padding: 8px 22px 26px; }
.pd-net { display: flex; align-items: center; justify-content: space-between; padding: 16px; border-radius: 16px; background: var(--pay-net-soft); margin-bottom: 14px; }
.pd-net span { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--pay-text-muted); }
.big { font-size: 26px; }
.period { font-size: 13px; color: var(--pay-text-2); }
.pd-meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
.pd-meta div { background: var(--pay-surface); border-radius: 10px; padding: 8px; text-align: center; }
.pd-meta span { display: block; font-size: 9px; text-transform: uppercase; color: var(--pay-text-muted); }
.pd-meta b { font-family: var(--pay-mono); color: var(--pay-text); }
.pd-sec { margin-bottom: 14px; }
.pd-sec h4 { display: flex; align-items: center; justify-content: space-between; margin: 0 0 6px; }
.pd-sec ul { list-style: none; margin: 0; padding: 0; }
.pd-sec li { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed var(--pay-border-soft); font-size: 13px; color: var(--pay-text-2); }
.dl-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px; border-radius: 12px; border: none; cursor: pointer; background: var(--pay-grad-cta); color: #1a1206; font-weight: 700; font-size: 13px; margin-top: 12px; }
.pd-fade-enter-active, .pd-fade-leave-active { transition: opacity 0.3s; }
.pd-fade-enter-from, .pd-fade-leave-to { opacity: 0; }
</style>
