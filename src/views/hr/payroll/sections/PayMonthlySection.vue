<template>
  <div class="sec">
    <PayEmptyState v-if="!loadingList && !batches.length" :icon="CalendarClock" title="No pay runs"
      sub="Create a run in Processing to begin." />

    <template v-else>
      <!-- ── run rail: minted ingot selector ── -->
      <div class="rail-wrap">
        <span class="rail-eyebrow"><Layers :size="12" /> Pay runs</span>
        <div class="rail">
          <Motion v-for="(b, i) in batches" :key="b.id" as="button" class="ingot" :class="{ on: b.id === activeId }"
            :initial="{ opacity: 0, y: 14, rotateX: -18 }" :animate="{ opacity: 1, y: 0, rotateX: 0 }"
            :transition="{ duration: 0.42, delay: Math.min(i*0.05,0.4), ease: [0.16,1,0.3,1] }"
            :whileHover="{ y: -3 }" :whileTap="{ scale: 0.97 }" @click="select(b.id)">
            <span class="ingot-sheen" />
            <div class="ingot-id">
              <span class="ingot-no">{{ b.batch_no }}</span>
              <span class="ingot-per">{{ monthLabel(b.period_month) }} {{ b.period_year }}</span>
            </div>
            <PayMoneyValue class="ingot-net" tone="net" :value="b.total_net" :short="true" :animate="false" />
            <div class="ingot-foot">
              <PayStatusChip :status="b.status" />
              <span class="ingot-emp">{{ b.total_employees }} emp</span>
            </div>
          </Motion>
        </div>
      </div>

      <div v-if="bf.loading.value" class="pay-skel" style="height:300px" />

      <template v-else-if="bf.batch.value">
        <!-- ── command console ── -->
        <Motion as="div" class="console" :key="bf.batch.value.id"
          :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.55, ease: [0.16,1,0.3,1] }">
          <span class="console-foil" aria-hidden="true" />

          <header class="con-head">
            <div class="con-title">
              <span class="con-eyebrow"><Coins :size="12" /> Monthly run</span>
              <h2 class="pay-foil-text">{{ monthLabel(bf.batch.value.period_month) }} {{ bf.batch.value.period_year }}</h2>
              <span class="con-no">{{ bf.batch.value.batch_no }}<em v-if="bf.batch.value.department_name"> · {{ bf.batch.value.department_name }}</em></span>
            </div>
            <PayStatusChip :status="bf.batch.value.status"
              :pulse="['GENERATED','VERIFIED','APPROVED'].includes(bf.batch.value.status)" />
          </header>

          <!-- launch-sequence lifecycle with timestamps -->
          <div class="stepper">
            <div v-for="(st, i) in PIPELINE" :key="st" class="step" :class="stepCls(i)">
              <span class="st-dot" />
              <div class="st-txt">
                <span class="st-name">{{ statusMeta(st).label }}</span>
                <span class="st-time">{{ stageTime(st) || (i <= curIdx ? '—' : '') }}</span>
              </div>
              <span v-if="i < PIPELINE.length-1" class="st-line" :class="{ fill: i < curIdx }" />
            </div>
          </div>

          <!-- money flow: gross → deductions → net -->
          <div class="flow">
            <Motion as="div" class="flow-card" :initial="{ opacity: 0, x: -16 }" :animate="{ opacity: 1, x: 0 }"
              :transition="{ duration: 0.45, delay: 0.12 }">
              <span class="fc-bar" style="background:linear-gradient(180deg,#fbbf24,#b8860b)" />
              <span class="fc-lbl">Gross earnings</span>
              <PayMoneyValue class="fc-val" :value="bf.batch.value.total_gross" :duration="800" />
            </Motion>

            <span class="flow-op" aria-hidden="true">−</span>

            <Motion as="div" class="flow-card" :initial="{ opacity: 0, x: -16 }" :animate="{ opacity: 1, x: 0 }"
              :transition="{ duration: 0.45, delay: 0.2 }">
              <span class="fc-bar" style="background:linear-gradient(180deg,#fb923c,#c2410c)" />
              <span class="fc-lbl">Deductions</span>
              <PayMoneyValue class="fc-val" tone="deduction" :value="bf.batch.value.total_deductions" :duration="800" />
            </Motion>

            <span class="flow-op equals" aria-hidden="true">=</span>

            <Motion as="div" class="flow-net" :initial="{ opacity: 0, scale: 0.94 }" :animate="{ opacity: 1, scale: 1 }"
              :transition="{ duration: 0.55, delay: 0.3, ease: [0.34,1.56,0.64,1] }">
              <span class="net-stream" aria-hidden="true" />
              <div class="net-head"><span class="fn-lbl">Net payable</span>
                <span class="net-coin"><Coins :size="15" /><i class="net-ring" /></span></div>
              <PayMoneyValue class="net-val" tone="net" :value="bf.batch.value.total_net" :duration="1000" />
              <span class="net-emp">across {{ bf.batch.value.total_employees }} employees</span>
            </Motion>
          </div>

          <div class="employer-row">
            <span><Building2 :size="13" /> Employer cost</span>
            <PayMoneyValue :value="bf.batch.value.total_employer_cost" :animate="false" />
            <span v-if="bf.batch.value.pay_date" class="pay-date"><CalendarDays :size="13" /> Pay date {{ fmtDate(bf.batch.value.pay_date) }}</span>
          </div>

          <!-- action bar -->
          <div class="actions">
            <Motion v-for="a in actions" :key="a.action" as="button" class="abtn" :class="{ primary: a.primary }"
              :disabled="acting || bf.generating.value"
              :whileHover="(acting||bf.generating.value) ? {} : { y: -2 }" :whileTap="{ scale: 0.96 }"
              @click="doAction(a)">{{ a.label }}</Motion>
            <span v-if="!actions.length" class="locked-note"><Lock :size="13" /> Run is {{ bf.batch.value.status.toLowerCase() }} — read only</span>
            <Motion v-if="canDeleteBatch(bf.batch.value.status)" as="button" class="abtn danger-ghost"
              :disabled="acting || bf.generating.value || delBusy"
              :whileHover="(acting||bf.generating.value) ? {} : { y: -2 }" :whileTap="{ scale: 0.96 }"
              @click="delOpen = true"><Trash2 :size="14" /> Delete run</Motion>
          </div>

          <!-- minting progress -->
          <transition name="gen-fade">
            <div v-if="bf.generating.value" class="genbar">
              <div class="gb-track">
                <div class="gb-fill" :style="{ width: prog.pct + '%' }">
                  <span class="gb-sheen" /><span class="gb-strike" />
                </div>
              </div>
              <span class="gb-lbl">Minting {{ prog.done }} of {{ prog.total || '…' }}</span>
            </div>
          </transition>
        </Motion>

        <!-- ── payslip ledger ── -->
        <div class="grid-head"><h3><ReceiptText :size="15" /> Payslips</h3><span>{{ bf.total.value }} employees</span></div>
        <PayEmptyState v-if="!bf.payslips.value.length" :icon="ReceiptText" title="No payslips yet"
          sub="Generate the run to compute payslips." />
        <div v-else class="ledger">
          <div class="ldg-head">
            <span>Payslip</span><span>Employee</span><span class="r">Gross</span>
            <span class="r">Deductions</span><span class="r">Net</span><span class="split">Split</span><span />
          </div>
          <Motion v-for="(p, i) in bf.payslips.value" :key="p.id + '-' + page" as="div" class="ldg-row"
            :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.3, delay: Math.min(i*0.022,0.3) }"
            :whileHover="{ x: 3 }" @click="openSlip(p.id)">
            <span class="mono">{{ p.payslip_no }}</span>
            <span class="emp"><b>{{ p.employee_name || p.employee_code }}</b><em>{{ p.employee_code }}</em></span>
            <span class="r"><PayMoneyValue :value="p.gross_earnings" :animate="false" /></span>
            <span class="r"><PayMoneyValue tone="deduction" :value="p.total_deductions" :animate="false" /></span>
            <span class="r"><PayMoneyValue tone="net" :value="p.net_pay" :animate="false" /></span>
            <span class="split"><i class="split-bar"><b :style="{ width: rowPct(p) + '%' }" /></i></span>
            <span class="r"><Eye :size="15" class="eye" /></span>
          </Motion>
        </div>
        <PayPagination v-if="bf.payslips.value.length" :page="page" :page-size="limit" :total-items="bf.total.value"
          @update:page="goPage" @update:page-size="s => { limit = s; page = 1; goPage(1) }" />
      </template>
    </template>

    <PayBatchActionModal :open="confirmModal.open" :action="confirmModal.action" :batch="bf.batch.value"
      @close="confirmModal.open = false" @confirm="onConfirm" />
    <PayslipPreviewDrawer :open="drawer.open" :payslip-id="drawer.id" mode="admin"
      @close="drawer.open = false" @updated="refreshActive" />
    <PayDeleteRunModal :open="delOpen" :batch="bf.batch.value" :busy="delBusy"
      @close="delOpen = false" @confirm="confirmDelete" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import { CalendarClock, ReceiptText, Lock, Eye, Coins, Layers, Building2, CalendarDays, Trash2 } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import PayEmptyState from '../components/PayEmptyState.vue'
import PayStatusChip from '../components/PayStatusChip.vue'
import PayMoneyValue from '../components/PayMoneyValue.vue'
import PayPagination from '../components/PayPagination.vue'
import PayBatchActionModal from '../modals/PayBatchActionModal.vue'
import PayDeleteRunModal from '../modals/PayDeleteRunModal.vue'
import PayslipPreviewDrawer from '../drawers/PayslipPreviewDrawer.vue'
import { statusMeta, BATCH_PIPELINE, monthLabel } from '@/composables/usePayroll'
import { usePayrollBatch, BATCH_TRANSITIONS, fetchBatches, fetchBatchProgress, deleteBatch, canDeleteBatch } from '@/composables/usePayrollBatch'

const props = defineProps({ period: { type: Object, required: true }, focusBatch: { type: String, default: null } })
const emit = defineEmits(['refresh-stats'])
const toast = useToast()

const PIPELINE = BATCH_PIPELINE
const batches = ref([]); const loadingList = ref(false); const activeId = ref(null)
const page = ref(1); const limit = ref(25); const acting = ref(false)
const confirmModal = ref({ open: false, action: 'release' })
const drawer = ref({ open: false, id: null })
const prog = ref({ done: 0, total: 0, pct: 0 })
const delOpen = ref(false); const delBusy = ref(false)
let progTimer = null

const bf = usePayrollBatch()
const curIdx = computed(() => bf.batch.value ? PIPELINE.indexOf(bf.batch.value.status) : -1)
const actions = computed(() => bf.batch.value ? (BATCH_TRANSITIONS[bf.batch.value.status] || []) : [])
const stepCls = (i) => ({ done: i < curIdx.value, active: i === curIdx.value })

// per-stage completion timestamps (launch-sequence telemetry)
const STAGE_FIELD = {
  DRAFT: 'created_at', GENERATED: 'generated_at', VERIFIED: 'verified_at',
  APPROVED: 'approved_at', RELEASED: 'released_at', LOCKED: 'locked_at',
}
const _MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const fmtDate = (v) => {
  if (!v) return ''
  const d = new Date(v)
  if (isNaN(d)) return ''
  return `${d.getDate()} ${_MON[d.getMonth()]}`
}
const stageTime = (st) => {
  const v = bf.batch.value && bf.batch.value[STAGE_FIELD[st]]
  return v ? fmtDate(v) : ''
}
const rowPct = (p) => {
  const g = Number(p.gross_earnings || 0)
  if (!g) return 0
  return Math.max(0, Math.min(100, Math.round((Number(p.net_pay || 0) / g) * 100)))
}

const loadList = async () => {
  loadingList.value = true
  try {
    batches.value = (await fetchBatches({ limit: 24 })).items || []
    const target = props.focusBatch || (batches.value[0] && batches.value[0].id)
    if (target) await select(target)
  } catch { toast.error('Failed to load runs') }
  finally { loadingList.value = false }
}
const select = async (id) => {
  activeId.value = id; page.value = 1
  await bf.load(id)
  await bf.loadPayslips(id, { skip: 0, limit: limit.value })
}
const goPage = async (p) => { page.value = p; await bf.loadPayslips(activeId.value, { skip: (p-1)*limit.value, limit: limit.value }) }
const openSlip = (id) => { drawer.value = { open: true, id } }

const pollProgress = () => {
  clearInterval(progTimer)
  progTimer = setInterval(async () => {
    if (!bf.generating.value) { clearInterval(progTimer); return }
    try { prog.value = await fetchBatchProgress(activeId.value) } catch {}
  }, 700)
}

const doAction = async (a) => {
  if (a.action === 'generate' || a.action === 'recalc') {
    prog.value = { done: 0, total: bf.batch.value.total_employees || 0, pct: 0 }
    pollProgress()
    try { await bf.generate(activeId.value); toast.success('Payslips generated'); emit('refresh-stats') }
    catch (e) { toast.error(e?.response?.data?.detail || 'Generation failed') }
    finally { clearInterval(progTimer); await refreshActive() }
    return
  }
  if (a.confirm) { confirmModal.value = { open: true, action: a.action }; return }
  await runTransition(a.action, {})
}
const onConfirm = async (payload) => {
  confirmModal.value.open = false
  await runTransition(confirmModal.value.action, payload)
}
const runTransition = async (action, body) => {
  acting.value = true
  try { await bf.act(activeId.value, action, body); toast.success(`Run ${action}d`); emit('refresh-stats'); await refreshActive() }
  catch (e) { toast.error(e?.response?.data?.detail || `Failed to ${action}`) }
  finally { acting.value = false }
}
const refreshActive = async () => {
  await bf.load(activeId.value)
  await bf.loadPayslips(activeId.value, { skip: (page.value-1)*limit.value, limit: limit.value })
  const idx = batches.value.findIndex(b => b.id === activeId.value)
  if (idx >= 0) batches.value[idx] = bf.batch.value
}
const confirmDelete = async (payload) => {
  delBusy.value = true
  try {
    await deleteBatch(activeId.value, payload)
    toast.success('Pay run deleted'); emit('refresh-stats'); delOpen.value = false
    batches.value = (await fetchBatches({ limit: 24 })).items || []
    const next = batches.value[0]
    if (next) await select(next.id)
    else { activeId.value = null; bf.batch.value = null }
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to delete run') }
  finally { delBusy.value = false }
}
watch(() => props.focusBatch, (id) => { if (id) select(id) })
onMounted(loadList)
onBeforeUnmount(() => clearInterval(progTimer))
</script>

<style scoped>
.sec { display: flex; flex-direction: column; gap: 18px; padding-top: 8px; }

/* ── run rail: minted ingots ── */
.rail-wrap { display: flex; flex-direction: column; gap: 9px; }
.rail-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--pay-mono); font-size: 10px;
  text-transform: uppercase; letter-spacing: 0.12em; color: var(--pay-text-muted); }
.rail { display: flex; gap: 11px; overflow-x: auto; padding: 4px 2px 8px; perspective: 800px; }
.rail::-webkit-scrollbar { height: 6px; } .rail::-webkit-scrollbar-thumb { background: var(--pay-border); border-radius: 6px; }
.ingot { position: relative; flex: 0 0 auto; width: 178px; display: flex; flex-direction: column; gap: 8px; align-items: stretch;
  padding: 13px 15px; border-radius: 15px; cursor: pointer; overflow: hidden; text-align: left;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft); transition: border-color 0.25s, background 0.25s, box-shadow 0.25s; }
.ingot.on { border-color: var(--pay-treasury); background: radial-gradient(120% 90% at 0% 0%, rgba(251,191,36,0.14), transparent 60%), var(--pay-surface);
  box-shadow: 0 14px 34px -18px rgba(245,158,11,0.55); }
.ingot-sheen { position: absolute; top: 0; left: 0; width: 60%; height: 100%; pointer-events: none;
  background: linear-gradient(105deg, transparent, rgba(255,255,255,0.14), transparent); transform: translateX(-160%); }
.ingot.on .ingot-sheen { animation: pay-ingot-sheen 2.6s var(--pay-ease) infinite; }
.ingot-id { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ingot-no { font-family: var(--pay-mono); font-size: 12px; color: var(--pay-text); font-weight: 700;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.ingot-per { font-size: 11px; color: var(--pay-text-muted); }
.ingot-net { font-size: 17px; }
.ingot-foot { display: flex; align-items: center; justify-content: space-between; gap: 6px; width: 100%; min-width: 0; }
.ingot-foot :deep(.pay-chip) { font-size: 10px; padding: 3px 8px; max-width: 100%; overflow: hidden; }
.ingot-emp { flex-shrink: 0; font-size: 10px; color: var(--pay-text-muted); }

/* ── command console ── */
.console { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 18px;
  padding: 22px 24px; border-radius: 22px; border: 1px solid var(--pay-border);
  background: radial-gradient(130% 70% at 100% 0%, rgba(251,191,36,0.10), transparent 48%), var(--pay-surface);
  box-shadow: 0 30px 80px -50px rgba(0,0,0,0.7); }
.console-foil { position: absolute; top: 0; left: 0; right: 0; height: 3px; overflow: hidden;
  background: linear-gradient(90deg, transparent, rgba(251,191,36,0.2), transparent); }
.console-foil::after { content: ''; position: absolute; inset: 0 auto 0 0; width: 40%;
  background: linear-gradient(90deg, transparent, var(--pay-mint-bright), var(--pay-amber), transparent);
  animation: pay-foil-sweep 4s var(--pay-ease) infinite; }

.con-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.con-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--pay-mono); font-size: 10px;
  text-transform: uppercase; letter-spacing: 0.14em; color: var(--pay-treasury); }
.con-title h2 { margin: 5px 0 3px; font-size: 27px; font-weight: 800; letter-spacing: -0.02em; }
.con-no { font-family: var(--pay-mono); font-size: 12px; color: var(--pay-text-muted); }
.con-no em { font-style: normal; }

/* launch-sequence stepper */
.stepper { display: flex; align-items: flex-start; }
.step { position: relative; display: flex; align-items: flex-start; gap: 8px; flex: 1; min-width: 0; }
.st-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--pay-border); border: 2px solid var(--pay-text-muted);
  flex-shrink: 0; margin-top: 2px; transition: background 0.3s, border-color 0.3s; }
.step.done .st-dot { background: var(--pay-net); border-color: var(--pay-net); }
.step.active .st-dot { background: var(--pay-treasury); border-color: var(--pay-mint-bright); animation: pay-node-halo 1.8s ease-out infinite; }
.st-txt { display: flex; flex-direction: column; line-height: 1.25; min-width: 0; }
.st-name { font-size: 11px; color: var(--pay-text-muted); white-space: nowrap; }
.step.done .st-name, .step.active .st-name { color: var(--pay-text-2); font-weight: 600; }
.st-time { font-family: var(--pay-mono); font-size: 9.5px; color: var(--pay-text-muted); opacity: 0.8; min-height: 11px; }
.st-line { position: absolute; left: 12px; right: -8px; top: 7px; height: 3px; border-radius: 3px; background: var(--pay-border); z-index: -1; overflow: hidden; }
.st-line.fill { background: linear-gradient(90deg, var(--pay-net-strong), var(--pay-net)); }
.st-line.fill::after { content: ''; position: absolute; inset: 0 auto 0 0; width: 45%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent); animation: pay-foil-sweep 2s linear infinite; }

/* money flow */
.flow { display: grid; grid-template-columns: 1fr auto 1fr auto 1.3fr; align-items: stretch; gap: 12px; }
.flow-card { position: relative; display: flex; flex-direction: column; gap: 5px; padding: 14px 16px 14px 18px;
  border-radius: 16px; border: 1px solid var(--pay-border-soft); background: var(--pay-surface-2); overflow: hidden; }
.fc-bar { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }
.fc-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pay-text-muted); }
.fc-val { font-size: 21px; color: var(--pay-text); }
.flow-op { align-self: center; font-size: 22px; font-weight: 300; color: var(--pay-text-muted); }
.flow-op.equals { color: var(--pay-net); }

.flow-net { position: relative; display: flex; flex-direction: column; gap: 4px; padding: 16px 18px; border-radius: 18px; overflow: hidden;
  background: radial-gradient(130% 100% at 100% 0%, rgba(52,211,153,0.16), transparent 55%), var(--pay-net-soft);
  border: 1px solid rgba(52,211,153,0.28); }
.net-stream { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background: linear-gradient(180deg, transparent, rgba(52,211,153,0.18), transparent); background-size: 100% 260%;
  animation: pay-ribbon-pour 4s linear infinite; }
.net-head { display: flex; align-items: center; justify-content: space-between; position: relative; z-index: 1; }
.fn-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--pay-net-strong); }
.net-coin { position: relative; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center;
  color: #1a1206; background: var(--pay-grad-coin); box-shadow: 0 6px 16px -6px rgba(245,158,11,0.6); }
.net-ring { position: absolute; inset: -5px; border-radius: 50%; border: 1.5px dashed rgba(251,191,36,0.5); animation: pay-orbit 13s linear infinite; }
.net-val { position: relative; z-index: 1; font-size: 28px; }
.net-emp { position: relative; z-index: 1; font-size: 10.5px; color: var(--pay-text-muted); }

.employer-row { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--pay-text-muted); flex-wrap: wrap; }
.employer-row > span:first-child { display: inline-flex; align-items: center; gap: 6px; }
.employer-row .pay-money { font-size: 14px; color: var(--pay-text-2); }
.employer-row .pay-date { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; }

.actions { display: flex; gap: 9px; flex-wrap: wrap; align-items: center; }
.abtn { padding: 10px 19px; border-radius: 12px; border: 1px solid var(--pay-border-soft); background: var(--pay-surface-2);
  color: var(--pay-text-2); cursor: pointer; font-weight: 600; font-size: 13px; transition: color 0.2s, border-color 0.2s; }
.abtn:hover:not(:disabled) { border-color: var(--pay-border); color: var(--pay-text); }
.abtn.primary { position: relative; overflow: hidden; background: var(--pay-grad-cta); color: #1a1206; border-color: transparent; font-weight: 700;
  box-shadow: 0 8px 22px -10px rgba(245,158,11,0.7); }
.abtn.primary::after { content: ''; position: absolute; top: 0; bottom: 0; width: 34%; transform: translateX(-220%);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent); }
.abtn.primary:hover:not(:disabled)::after { animation: pay-foil-sweep 0.9s var(--pay-ease); }
.abtn:disabled { opacity: 0.5; cursor: not-allowed; }
.abtn.danger-ghost { margin-left: auto; display: inline-flex; align-items: center; gap: 6px;
  color: var(--pay-deduction); border-color: rgba(194,65,12,0.3); background: transparent; font-weight: 600; }
.abtn.danger-ghost:hover:not(:disabled) { background: var(--pay-deduction-soft); border-color: var(--pay-deduction); color: var(--pay-deduction); }
.locked-note { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--pay-text-muted); }

/* minting progress */
.genbar { display: flex; align-items: center; gap: 12px; }
.gb-track { flex: 1; height: 10px; border-radius: 999px; background: var(--pay-surface-2); overflow: hidden; border: 1px solid var(--pay-border-soft); }
.gb-fill { position: relative; height: 100%; background: var(--pay-grad-cta); transition: width 0.4s var(--pay-ease); overflow: visible; border-radius: 999px; }
.gb-sheen { position: absolute; inset: 0 auto 0 0; width: 40%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent); animation: pay-foil-sweep 1.3s linear infinite; }
.gb-strike { position: absolute; right: 0; top: 50%; width: 12px; height: 12px; margin: -6px 0 0; border-radius: 50%;
  background: var(--pay-mint-bright); box-shadow: 0 0 12px 2px rgba(253,230,138,0.8); animation: pay-strike-ping 0.9s ease-out infinite; }
.gb-lbl { font-family: var(--pay-mono); font-size: 11px; color: var(--pay-treasury); white-space: nowrap; }
.gen-fade-enter-active, .gen-fade-leave-active { transition: opacity 0.3s, max-height 0.3s; overflow: hidden; }
.gen-fade-enter-from, .gen-fade-leave-to { opacity: 0; max-height: 0; }

/* ── payslip ledger ── */
.grid-head { display: flex; align-items: center; justify-content: space-between; }
.grid-head h3 { margin: 0; font-size: 14px; color: var(--pay-text); display: inline-flex; align-items: center; gap: 7px; }
.grid-head span { font-family: var(--pay-mono); font-size: 12px; color: var(--pay-text-muted); }
.ledger { background: var(--pay-surface); border: 1px solid var(--pay-border); border-radius: 16px; overflow: hidden; }
.ldg-head, .ldg-row { display: grid; grid-template-columns: 1.1fr 1.7fr 1fr 1fr 1fr 0.8fr 36px; align-items: center; gap: 10px; padding: 11px 16px; }
.ldg-head { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--pay-text-muted); border-bottom: 1px solid var(--pay-border-soft); }
.ldg-head .r, .ldg-row .r { text-align: right; justify-self: end; }
.ldg-row { border-bottom: 1px solid var(--pay-border-soft); cursor: pointer; font-size: 13px; color: var(--pay-text-2); transition: background 0.18s; }
.ldg-row:last-child { border-bottom: none; }
.ldg-row:hover { background: rgba(251,191,36,0.05); }
.ldg-row .mono { font-family: var(--pay-mono); font-size: 12px; color: var(--pay-text); }
.emp { display: flex; flex-direction: column; min-width: 0; }
.emp b { color: var(--pay-text); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.emp em { font-style: normal; font-family: var(--pay-mono); font-size: 11px; color: var(--pay-text-muted); }
.split-bar { display: block; width: 100%; height: 6px; border-radius: 999px; background: var(--pay-deduction-soft); overflow: hidden; }
.split-bar b { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--pay-net-strong), var(--pay-net)); transition: width 0.5s var(--pay-ease); }
.eye { color: var(--pay-text-muted); }

@media (max-width: 760px) {
  .flow { grid-template-columns: 1fr; }
  .flow-op { display: none; }
  .stepper { overflow-x: auto; gap: 14px; }
  .step { flex: 0 0 auto; }
  .ldg-head .split, .ldg-row .split { display: none; }
  .ldg-head, .ldg-row { grid-template-columns: 1fr 1.4fr 1fr 1fr 30px; }
  .ldg-head span:nth-child(4), .ldg-row span:nth-child(4) { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .console-foil::after, .ingot.on .ingot-sheen, .net-stream, .net-ring,
  .gb-sheen, .gb-strike, .step.active .st-dot { animation: none !important; }
}
</style>
