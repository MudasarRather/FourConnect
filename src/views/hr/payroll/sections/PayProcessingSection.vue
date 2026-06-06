<template>
  <div class="sec">
    <!-- ══════════ LAUNCH CONSOLE ══════════ -->
    <Motion class="console" as="section"
      :initial="{ opacity: 0, y: 20 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: [0.16,1,0.3,1] }">
      <!-- cinematic backdrop -->
      <span class="cs-aura" aria-hidden="true" />
      <span class="cs-grid-bg" aria-hidden="true" />
      <span class="cs-dust" aria-hidden="true">
        <i v-for="d in 14" :key="d" :style="dustStyle(d)" />
      </span>

      <div class="cs-top">
        <div class="cs-intro">
          <span class="cs-eyebrow"><Cpu :size="13" /> Pay run engine</span>
          <h2 class="cs-foil">Run payroll</h2>
          <p>Pull attendance LOP, compensation and statutory rates, then mint every payslip in one pass — verified and approved before a rupee is released.</p>
          <div class="cs-actions">
            <Motion as="button" class="cs-launch" :whileHover="{ y: -2, scale: 1.015 }" :whileTap="{ scale: 0.97 }"
              :transition="{ duration: 0.3, ease: [0.16,1,0.3,1] }" @click="modalOpen = true">
              <span class="cs-launch-sheen" />
              <Play :size="16" /> New monthly run
            </Motion>
            <span class="cs-period"><CalendarClock :size="13" /> {{ monthLabel(period.month) }} {{ period.year }} · All departments</span>
          </div>
        </div>

        <!-- live eligibility dial -->
        <div class="cs-dial">
          <div v-if="eligLoading" class="cs-dial-skel"><span class="pay-skel" style="width:138px;height:138px;border-radius:50%" /></div>
          <template v-else-if="elig">
            <div class="cs-gauge">
              <svg viewBox="0 0 140 140" class="cs-gauge-svg">
                <circle class="g-track" cx="70" cy="70" r="60" />
                <circle class="g-fill" cx="70" cy="70" r="60" :stroke-dasharray="gaugeCirc" :stroke-dashoffset="gaugeOffset" />
              </svg>
              <div class="cs-gauge-mid">
                <PayCountUp :value="elig.eligible_count" class="g-num" />
                <span class="g-cap">of {{ elig.total_candidates }} payable</span>
              </div>
            </div>
            <div class="cs-dial-kpis">
              <div class="dk"><span class="dk-dot ok" /><PayCountUp :value="elig.eligible_count" class="dk-n" /><span class="dk-l">eligible</span></div>
              <div class="dk" :class="{ warn: elig.blocked_count }"><span class="dk-dot warn" /><PayCountUp :value="elig.blocked_count" class="dk-n" /><span class="dk-l">exceptions</span></div>
              <div class="dk"><span class="dk-dot fs" /><PayCountUp :value="elig.final_settlement_count" class="dk-n" /><span class="dk-l">final settle</span></div>
              <div class="dk net"><span class="dk-dot netd" /><PayMoneyValue :value="elig.estimated_net" tone="net" short class="dk-n" /><span class="dk-l">est net</span></div>
            </div>
          </template>
          <div v-else class="cs-dial-err"><Activity :size="18" /><span>Eligibility unavailable</span></div>
        </div>
      </div>

      <!-- exceptions note -->
      <transition name="cs-fade">
        <div v-if="elig && elig.blocked_count" class="cs-exc">
          <AlertTriangle :size="14" />
          <span><b>{{ elig.blocked_count }}</b> employee{{ elig.blocked_count > 1 ? 's' : '' }} can't be paid this period — missing compensation or salary structure. They're held back, not silently dropped.</span>
        </div>
      </transition>

      <!-- ══ animated pipeline conveyor ══ -->
      <div class="cs-pipe">
        <div v-for="(st, i) in PIPELINE" :key="st" class="pipe-stage" :class="pipeCls(i)">
          <span class="pipe-node"><component :is="STAGE_ICON[st]" :size="13" /></span>
          <span class="pipe-name">{{ statusMeta(st).label }}</span>
          <span v-if="i < PIPELINE.length - 1" class="pipe-link"><span class="pipe-flow" :class="{ on: i < curStageIdx }" /></span>
        </div>
      </div>
    </Motion>

    <!-- ══════════ RECENT RUNS — LEDGER CARDS ══════════ -->
    <div class="recent-head">
      <h3><ScrollText :size="15" /> Recent runs</h3>
      <span v-if="batches.length" class="mono">{{ batches.length }} shown</span>
    </div>

    <div v-if="loading" class="ledger"><div v-for="i in 3" :key="i" class="pay-skel" style="height:84px;border-radius:18px" /></div>
    <PayEmptyState v-else-if="!batches.length" :icon="CalendarClock" title="No pay runs yet"
      sub="Start your first monthly run — you'll preview eligibility before anything is created." />
    <div v-else class="ledger">
      <Motion v-for="(b, i) in batches" :key="b.id" as="article" class="lcard"
        :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.42, delay: Math.min(i * 0.05, 0.4), ease: [0.16,1,0.3,1] }"
        :whileHover="{ y: -3 }" @click="$emit('open-batch', b.id)">
        <span class="lc-spine" :class="b.status.toLowerCase()" />
        <div class="lc-main">
          <div class="lc-row1">
            <div class="lc-id">
              <span class="lc-no">{{ b.batch_no }}</span>
              <span class="lc-per">{{ monthLabel(b.period_month) }} {{ b.period_year }}</span>
            </div>
            <PayStatusChip :status="b.status" :pulse="['GENERATED','VERIFIED','APPROVED'].includes(b.status)" />
            <button v-if="canDeleteBatch(b.status)" class="lc-del" title="Delete run" @click.stop="delTarget = b">
              <Trash2 :size="15" />
            </button>
            <ChevronRight :size="16" class="lc-arrow" />
          </div>
          <div class="lc-row2">
            <div class="lc-mini">
              <span v-for="(st, si) in PIPELINE" :key="st" class="mini-dot" :class="miniCls(b, si)" />
            </div>
            <div class="lc-stats">
              <div class="lc-stat"><span><Users :size="11" /> Emp</span><b>{{ b.total_employees }}</b></div>
              <div class="lc-stat net"><span><Coins :size="11" /> Net</span><PayMoneyValue tone="net" :value="b.total_net" :animate="false" short class="lc-net" /></div>
            </div>
          </div>
        </div>
      </Motion>
    </div>

    <PayRunMonthModal :open="modalOpen" :default-period="period" @close="modalOpen = false" @created="onCreated" />
    <PayDeleteRunModal :open="!!delTarget" :batch="delTarget" :busy="delBusy"
      @close="delTarget = null" @confirm="confirmDelete" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { Cpu, Play, CalendarClock, ChevronRight, ScrollText, Users, Coins, AlertTriangle, Activity,
  FileText, Cog, ShieldCheck, BadgeCheck, Banknote, Lock, Trash2 } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import PayEmptyState from '../components/PayEmptyState.vue'
import PayStatusChip from '../components/PayStatusChip.vue'
import PayMoneyValue from '../components/PayMoneyValue.vue'
import PayCountUp from '../components/PayCountUp.vue'
import PayRunMonthModal from '../modals/PayRunMonthModal.vue'
import PayDeleteRunModal from '../modals/PayDeleteRunModal.vue'
import { statusMeta, BATCH_PIPELINE, monthLabel } from '@/composables/usePayroll'
import { fetchBatches, fetchEligibility, deleteBatch, canDeleteBatch } from '@/composables/usePayrollBatch'

const props = defineProps({ period: { type: Object, required: true } })
const emit = defineEmits(['go', 'open-batch'])
const toast = useToast()

const PIPELINE = BATCH_PIPELINE
const STAGE_ICON = { DRAFT: FileText, GENERATED: Cog, VERIFIED: ShieldCheck, APPROVED: BadgeCheck, RELEASED: Banknote, LOCKED: Lock }

const batches = ref([]); const loading = ref(false); const modalOpen = ref(false)
const elig = ref(null); const eligLoading = ref(false)
const delTarget = ref(null); const delBusy = ref(false)

// pipeline "engine position" follows the most recent run's stage (visual only)
const curStageIdx = computed(() => {
  const top = batches.value[0]
  return top ? Math.max(0, PIPELINE.indexOf(top.status)) : 0
})
const pipeCls = (i) => ({ done: i < curStageIdx.value, active: i === curStageIdx.value })
const miniCls = (b, si) => {
  const idx = PIPELINE.indexOf(b.status)
  return { done: si < idx, active: si === idx }
}

// eligibility gauge geometry
const gaugeCirc = 2 * Math.PI * 60
const gaugeOffset = computed(() => {
  if (!elig.value || !elig.value.total_candidates) return gaugeCirc
  return gaugeCirc * (1 - elig.value.eligible_count / elig.value.total_candidates)
})

// deterministic dust particle placement (no Math.random in render path)
const dustStyle = (n) => {
  const left = (n * 137.5) % 100
  const delay = (n % 7) * 0.9
  const dur = 7 + (n % 5) * 1.6
  const size = 2 + (n % 3)
  return { left: `${left}%`, width: `${size}px`, height: `${size}px`,
    animationDelay: `${delay}s`, animationDuration: `${dur}s` }
}

const reload = async () => {
  loading.value = true
  try { batches.value = (await fetchBatches({ limit: 12 })).items || [] }
  catch { toast.error('Failed to load runs') }
  finally { loading.value = false }
}
const loadEligibility = async () => {
  eligLoading.value = true
  try { elig.value = await fetchEligibility({ period_month: props.period.month, period_year: props.period.year, department_id: null }) }
  catch { elig.value = null }
  finally { eligLoading.value = false }
}
const onCreated = (batch) => { reload(); loadEligibility(); emit('open-batch', batch.id) }
const confirmDelete = async (payload) => {
  delBusy.value = true
  try { await deleteBatch(delTarget.value.id, payload); toast.success('Pay run deleted'); delTarget.value = null; reload(); loadEligibility() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to delete run') }
  finally { delBusy.value = false }
}
onMounted(() => { reload(); loadEligibility() })
</script>

<style scoped>
.sec { display: flex; flex-direction: column; gap: 18px; padding-top: 8px; }
.mono { font-family: var(--pay-mono); }

/* ══════════ LAUNCH CONSOLE ══════════ */
.console { position: relative; overflow: hidden; border-radius: 24px;
  border: 1px solid var(--pay-border); padding: 26px 28px 20px;
  background:
    radial-gradient(130% 120% at 12% -10%, rgba(251,191,36,0.16), transparent 52%),
    radial-gradient(120% 130% at 100% 0%, rgba(234,88,12,0.12), transparent 55%),
    var(--pay-surface-2);
  box-shadow: 0 28px 80px -42px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05); }

/* cinematic backdrop layers */
.cs-aura { position: absolute; inset: -30% -10% auto -10%; height: 90%; pointer-events: none; z-index: 0;
  background: radial-gradient(60% 80% at 30% 20%, rgba(251,191,36,0.22), transparent 60%),
              radial-gradient(50% 70% at 80% 10%, rgba(234,88,12,0.16), transparent 60%);
  filter: blur(14px); animation: pay-aurora-drift 11s ease-in-out infinite; }
.cs-grid-bg { position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0.5;
  background-image: linear-gradient(rgba(251,191,36,0.05) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(251,191,36,0.05) 1px, transparent 1px);
  background-size: 38px 38px; mask-image: radial-gradient(80% 80% at 50% 0%, #000, transparent 75%); }
.cs-dust { position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.cs-dust i { position: absolute; top: -8px; border-radius: 50%;
  background: radial-gradient(circle, var(--pay-mint-bright), rgba(251,191,36,0)); opacity: 0; animation: pay-dust-fall linear infinite; }

.cs-top { position: relative; z-index: 1; display: flex; gap: 28px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
.cs-intro { min-width: 280px; flex: 1; }
.cs-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--pay-mono);
  font-size: 11px; text-transform: uppercase; letter-spacing: 0.13em; color: var(--pay-treasury); }
.cs-foil { margin: 9px 0 7px; font-size: 30px; font-weight: 800; letter-spacing: -0.02em; line-height: 1;
  background: linear-gradient(100deg, var(--pay-text) 30%, var(--pay-mint-bright) 50%, var(--pay-text) 70%);
  background-size: 200% auto; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  animation: pay-foil-text 6s linear infinite; }
.cs-intro p { margin: 0 0 18px; color: var(--pay-text-2); font-size: 13.5px; line-height: 1.55; max-width: 460px; }
.cs-actions { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.cs-launch { position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 9px;
  padding: 13px 24px; border-radius: 14px; border: none; cursor: pointer;
  background: var(--pay-grad-cta); color: #1a1206; font-weight: 800; font-size: 14.5px;
  box-shadow: 0 14px 34px -12px rgba(245,158,11,0.75), inset 0 1px 0 rgba(255,255,255,0.4); }
.cs-launch-sheen { position: absolute; top: 0; bottom: 0; left: 0; width: 38%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent); transform: translateX(-220%);
  animation: pay-foil-sweep 3.6s var(--pay-ease) infinite; }
.cs-period { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--pay-text-muted); }

/* live eligibility dial */
.cs-dial { display: flex; align-items: center; gap: 18px; flex-shrink: 0; }
.cs-dial-skel { display: grid; place-items: center; }
.cs-gauge { position: relative; width: 140px; height: 140px; flex-shrink: 0; }
.cs-gauge-svg { width: 140px; height: 140px; transform: rotate(-90deg); }
.cs-gauge-svg .g-track { fill: none; stroke: var(--pay-border-soft); stroke-width: 10; }
.cs-gauge-svg .g-fill { fill: none; stroke: var(--pay-net); stroke-width: 10; stroke-linecap: round;
  transition: stroke-dashoffset 1.1s var(--pay-ease); filter: drop-shadow(0 0 7px rgba(52,211,153,0.45)); }
.cs-gauge-mid { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.cs-gauge-mid .g-num { font-family: var(--pay-mono); font-size: 38px; font-weight: 800; color: var(--pay-text); line-height: 1; }
.cs-gauge-mid .g-cap { font-size: 10px; color: var(--pay-text-muted); margin-top: 5px; text-align: center; max-width: 90px; }
.cs-dial-kpis { display: flex; flex-direction: column; gap: 9px; }
.dk { display: flex; align-items: center; gap: 7px; }
.dk-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.dk-dot.ok { background: var(--pay-net); box-shadow: 0 0 8px rgba(52,211,153,0.6); }
.dk-dot.warn { background: var(--pay-deduction); }
.dk-dot.fs { background: var(--pay-statutory); }
.dk-dot.netd { background: var(--pay-net); box-shadow: 0 0 8px rgba(52,211,153,0.6); }
.dk-n { font-family: var(--pay-mono); font-size: 16px; font-weight: 800; color: var(--pay-text); min-width: 16px; }
.dk-l { font-size: 11px; color: var(--pay-text-muted); }
.dk.warn .dk-n { color: var(--pay-deduction); }
.dk.net { margin-top: 2px; padding-top: 9px; border-top: 1px solid var(--pay-border-soft); }
.dk.net .dk-n { color: var(--pay-net); font-size: 15px; }
.cs-dial-err { display: flex; flex-direction: column; align-items: center; gap: 6px; color: var(--pay-text-muted); font-size: 11px; padding: 20px; }

/* exceptions note */
.cs-exc { position: relative; z-index: 1; display: flex; gap: 9px; align-items: center; margin-top: 16px;
  padding: 10px 14px; border-radius: 12px; font-size: 12px; line-height: 1.45; color: var(--pay-text-2);
  background: var(--pay-deduction-soft); border: 1px solid rgba(194,65,12,0.26); }
.cs-exc svg { color: var(--pay-deduction); flex-shrink: 0; } .cs-exc b { color: var(--pay-text); }
.cs-fade-enter-active { transition: opacity 0.4s var(--pay-ease), transform 0.4s var(--pay-ease); }
.cs-fade-enter-from { opacity: 0; transform: translateY(-6px); }

/* animated pipeline conveyor */
.cs-pipe { position: relative; z-index: 1; display: flex; align-items: center; margin-top: 22px;
  padding: 16px 6px 4px; border-top: 1px solid var(--pay-border-soft); }
.pipe-stage { position: relative; display: flex; align-items: center; gap: 8px; flex: 1; }
.pipe-stage:last-child { flex: 0 0 auto; }
.pipe-node { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; flex-shrink: 0;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft); color: var(--pay-text-muted);
  transition: background 0.4s, border-color 0.4s, color 0.4s, box-shadow 0.4s; }
.pipe-stage.done .pipe-node { background: var(--pay-net-soft); border-color: rgba(52,211,153,0.4); color: var(--pay-net); }
.pipe-stage.active .pipe-node { background: var(--pay-grad-cta); border-color: transparent; color: #1a1206;
  box-shadow: 0 8px 20px -8px rgba(245,158,11,0.7); animation: pay-node-halo 1.9s ease-in-out infinite; }
.pipe-name { font-size: 11px; color: var(--pay-text-muted); white-space: nowrap; }
.pipe-stage.done .pipe-name, .pipe-stage.active .pipe-name { color: var(--pay-text-2); }
.pipe-link { flex: 1; min-width: 16px; height: 3px; margin: 0 10px; border-radius: 3px; position: relative;
  background: var(--pay-border-soft); overflow: hidden; }
.pipe-flow { position: absolute; inset: 0; transform-origin: left; transform: scaleX(0);
  background: linear-gradient(90deg, var(--pay-net-strong), var(--pay-net)); transition: transform 0.6s var(--pay-ease); }
.pipe-flow.on { transform: scaleX(1); }
.pipe-flow.on::after { content: ''; position: absolute; inset: 0; width: 40%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent); animation: pay-foil-sweep 2s linear infinite; }

/* ══════════ RECENT — LEDGER CARDS ══════════ */
.recent-head { display: flex; align-items: center; justify-content: space-between; }
.recent-head h3 { margin: 0; font-size: 14px; color: var(--pay-text); display: inline-flex; align-items: center; gap: 7px; }
.recent-head h3 svg { color: var(--pay-treasury); }
.recent-head .mono { font-size: 11px; color: var(--pay-text-muted); }
.ledger { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
.lcard { position: relative; overflow: hidden; display: flex; align-items: stretch;
  border-radius: 18px; cursor: pointer;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft);
  transition: border-color 0.25s, box-shadow 0.25s; }
.lcard:hover { border-color: var(--pay-border); box-shadow: 0 18px 40px -24px rgba(0,0,0,0.6); }
.lc-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--pay-treasury); }
.lc-spine.released, .lc-spine.locked { background: var(--pay-net); }
.lc-spine.draft { background: var(--pay-st-draft); }
.lc-spine.cancelled { background: var(--pay-st-cancelled); }
.lc-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12px; padding: 15px 16px 15px 22px; }
.lc-row1 { display: flex; align-items: center; gap: 10px; }
.lc-id { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.lc-no { font-family: var(--pay-mono); font-size: 13.5px; color: var(--pay-text); font-weight: 600;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lc-per { font-size: 11px; color: var(--pay-text-muted); }
.lc-row1 :deep(.pay-chip) { flex-shrink: 0; }
.lc-del { flex-shrink: 0; width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center;
  border: 1px solid var(--pay-border-soft); background: var(--pay-surface-2); color: var(--pay-text-muted);
  cursor: pointer; opacity: 0; transform: scale(0.85);
  transition: opacity 0.2s, transform 0.2s var(--pay-spring), color 0.18s, border-color 0.18s, background 0.18s; }
.lcard:hover .lc-del { opacity: 1; transform: scale(1); }
.lc-del:hover { color: var(--pay-deduction); border-color: rgba(194,65,12,0.4); background: var(--pay-deduction-soft); }
.lc-arrow { color: var(--pay-text-muted); flex-shrink: 0; transition: transform 0.25s, color 0.25s; }
.lcard:hover .lc-arrow { color: var(--pay-treasury); transform: translateX(3px); }
.lc-row2 { display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding-top: 11px; border-top: 1px solid var(--pay-border-soft); }
.lc-mini { display: flex; align-items: center; gap: 5px; }
.mini-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--pay-border); transition: background 0.3s, box-shadow 0.3s; }
.mini-dot.done { background: var(--pay-net); }
.mini-dot.active { background: var(--pay-treasury); box-shadow: 0 0 0 3px rgba(251,191,36,0.18); animation: pay-dot-pulse 1.7s ease-in-out infinite; }
.lc-stats { display: flex; gap: 16px; }
.lc-stat { display: flex; align-items: baseline; gap: 6px; }
.lc-stat span { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--pay-text-muted); }
.lc-stat b { font-family: var(--pay-mono); font-size: 14px; color: var(--pay-text); }
.lc-net { font-size: 14px; }

@media (max-width: 760px) {
  .cs-top { flex-direction: column; align-items: stretch; }
  .cs-dial { justify-content: center; }
  .cs-pipe { overflow-x: auto; } .pipe-name { display: none; }
  .ledger { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .cs-aura, .cs-dust i, .cs-foil, .cs-launch-sheen, .pipe-flow.on::after, .pipe-stage.active .pipe-node, .mini-dot.active { animation: none !important; }
  .cs-foil { -webkit-text-fill-color: var(--pay-text); }
}

/* ════════ LIGHT THEME OVERRIDES ════════ */
[data-theme="light"] .console {
  background:
    radial-gradient(130% 120% at 12% -10%, rgba(245,158,11,0.14), transparent 52%),
    radial-gradient(120% 130% at 100% 0%, rgba(234,88,12,0.10), transparent 55%),
    var(--pay-surface-2);
  box-shadow: 0 24px 60px -40px rgba(40,25,10,0.3), inset 0 1px 0 rgba(255,255,255,0.6); }
[data-theme="light"] .cs-foil {
  background: linear-gradient(100deg, var(--pay-text) 35%, #d97706 50%, var(--pay-text) 65%);
  background-size: 200% auto; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
[data-theme="light"] .pipe-node { background: rgba(255,250,240,0.8); }
[data-theme="light"] .lcard { background: rgba(255,250,240,0.72); }
[data-theme="light"] .cs-gauge-svg .g-fill { filter: drop-shadow(0 0 5px rgba(5,150,105,0.35)); }
[data-theme="light"] .cs-grid-bg { opacity: 0.4;
  background-image: linear-gradient(rgba(184,134,11,0.07) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(184,134,11,0.07) 1px, transparent 1px); }
</style>
