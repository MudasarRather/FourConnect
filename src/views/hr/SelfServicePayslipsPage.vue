<template>
  <div class="ssp">
    <div v-if="loading" class="ssp-load">
      <div class="pay-skel" style="height:64px" />
      <div class="pay-skel" style="height:260px" />
      <div class="pay-skel" style="height:230px" />
      <div class="pay-skel" style="height:150px" />
    </div>

    <PayEmptyState v-else-if="unlinked || !payslips.length" :icon="ReceiptText"
      title="No payslips yet" sub="Your released payslips will appear here once payroll is processed." />

    <template v-else>
      <!-- header + YTD telemetry -->
      <header class="ssp-head">
        <div>
          <span class="eyebrow"><Coins :size="13" /> My pay · FY {{ annual?.fiscal_year || fyLabel() }}</span>
          <h1>Your pay, minted.</h1>
        </div>
        <div class="ytd">
          <Motion v-for="(t, i) in ytd" :key="t.label" as="div" class="ytd-tile" :style="{ '--ac': t.color }"
            :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.5, delay: 0.06 * i, ease: [0.16, 1, 0.3, 1] }">
            <span class="yt-l">{{ t.label }}</span>
            <span class="yt-v">
              <template v-if="t.money"><PayMoneyValue :value="t.value" short :tone="t.tone" :duration="900" /></template>
              <template v-else><PayCountUp :value="t.value" />{{ t.suffix }}</template>
            </span>
          </Motion>
        </div>
      </header>

      <!-- HERO — the minted note (re-mints on selection) -->
      <section class="ssp-note">
        <PayslipMintedNote :key="selectedId" :payslip="selected" @view="openDetail(selected.id)" @download="download(selected)" />
      </section>

      <!-- annual earnings stream -->
      <section class="ssp-stream">
        <PayslipEarningsStream :months="annual?.months || []" :selected-key="selectedKey" @select="selectMonth" />
      </section>

      <!-- cinematic film reel -->
      <section class="ssp-reel">
        <PayslipCinemaReel :items="payslips" :selected-id="selectedId" @select="selectId" />
      </section>
    </template>

    <PayslipPreviewDrawer :open="detail.open" :payslip-id="detail.id" mode="self" variant="drawer"
      @close="detail.open = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { Coins, ReceiptText } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'

import '@/styles/payroll-theme.css'

import PayMoneyValue from './payroll/components/PayMoneyValue.vue'
import PayCountUp from './payroll/components/PayCountUp.vue'
import PayEmptyState from './payroll/components/PayEmptyState.vue'
import PayslipPreviewDrawer from './payroll/drawers/PayslipPreviewDrawer.vue'
import PayslipMintedNote from './payslip/PayslipMintedNote.vue'
import PayslipEarningsStream from './payslip/PayslipEarningsStream.vue'
import PayslipCinemaReel from './payslip/PayslipCinemaReel.vue'

import { monthLabel, fyLabel } from '@/composables/usePayroll'
import { fetchMyPayslips, fetchMyAnnual, downloadMyPayslipPdf } from '@/composables/usePayslip'

const toast = useToast()
const payslips = ref([])
const annual = ref(null)
const loading = ref(true)
const unlinked = ref(false)
const selectedId = ref(null)
const detail = ref({ open: false, id: null })

const selected = computed(() =>
  payslips.value.find(p => String(p.id) === String(selectedId.value)) || payslips.value[0] || null)
const selectedKey = computed(() => selected.value ? `${selected.value.period_year}-${selected.value.period_month}` : '')

const ytd = computed(() => {
  const g = Number(annual.value?.total_gross || 0)
  const n = Number(annual.value?.total_net || 0)
  const d = Number(annual.value?.total_deductions || 0)
  const pct = g ? Math.round((n / g) * 100) : 0
  return [
    { label: 'Gross · YTD', value: g, money: true, tone: '', color: 'var(--pay-mint)' },
    { label: 'Net · YTD', value: n, money: true, tone: 'net', color: 'var(--pay-net)' },
    { label: 'Deductions · YTD', value: d, money: true, tone: 'deduction', color: 'var(--pay-deduction)' },
    { label: 'Take-home', value: pct, money: false, suffix: '%', color: 'var(--pay-treasury)' },
  ]
})

const selectId = (id) => { selectedId.value = id }
const selectMonth = ({ year, month }) => {
  const hit = payslips.value.find(p => p.period_year === year && p.period_month === month)
  if (hit) selectedId.value = hit.id
}
const openDetail = (id) => { detail.value = { open: true, id: String(id) } }
const download = async (p) => {
  if (!p) return
  try { await downloadMyPayslipPdf(p.id, p.payslip_no) }
  catch (e) { toast.error(e?.response?.status === 503 ? 'PDF engine unavailable (GTK)' : 'Download failed') }
}

const load = async () => {
  loading.value = true
  try {
    const res = await fetchMyPayslips({ limit: 60 })
    unlinked.value = !!res.unlinked
    payslips.value = (res.items || []).slice().sort((a, b) =>
      (b.period_year - a.period_year) || (b.period_month - a.period_month))
    selectedId.value = payslips.value[0]?.id || null
    if (!unlinked.value) annual.value = await fetchMyAnnual()
  } catch (e) { toast.error('Failed to load payslips') }
  finally { loading.value = false }
}
onMounted(load)
</script>

<style scoped>
.ssp { position: relative; min-height: 100%; padding: 24px 28px 60px; color: var(--pay-text);
  background: var(--pay-canvas); }
.ssp-load { display: flex; flex-direction: column; gap: 16px; }

.ssp-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap; margin-bottom: 22px; }
.eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--pay-mono); font-size: 11px;
  text-transform: uppercase; letter-spacing: 0.14em; color: var(--pay-treasury); }
.ssp-head h1 { margin: 6px 0 0; font-size: clamp(26px, 4vw, 40px); font-weight: 800; letter-spacing: -0.03em; color: var(--pay-text); }

.ytd { display: grid; grid-template-columns: repeat(4, minmax(96px, 1fr)); gap: 12px; flex: 1; max-width: 560px; }
.ytd-tile { padding: 11px 13px; border-radius: 14px; background: var(--pay-surface); border: 1px solid var(--pay-border-soft);
  border-top: 2px solid var(--ac); }
.yt-l { display: block; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pay-text-muted); }
.yt-v { display: block; margin-top: 4px; font-size: 18px; font-weight: 900; color: var(--pay-text); font-variant-numeric: tabular-nums; }

.ssp-note { margin-bottom: 18px; }
.ssp-stream { margin-bottom: 18px; }

@media (max-width: 820px) { .ytd { max-width: none; width: 100%; grid-template-columns: repeat(2, 1fr); } }
</style>
