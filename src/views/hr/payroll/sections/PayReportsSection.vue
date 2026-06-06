<template>
  <div class="mint">
    <!-- ════════ THE MINT PRESS — hero ════════ -->
    <section class="press" data-anim="press">
      <!-- engraving press centrepiece -->
      <div class="press-stage" :class="{ forging }">
        <div class="press-aura" aria-hidden="true"></div>
        <div class="press-arm" aria-hidden="true">
          <span class="arm-rod"></span>
          <span class="arm-head"></span>
        </div>

        <div class="coin-wrap">
          <div class="coin" :class="{ strike: forging }">
            <span class="coin-guilloche" aria-hidden="true"></span>
            <span class="coin-ring" aria-hidden="true"></span>
            <span class="coin-face">
              <span class="coin-glyph">₹</span>
              <span class="coin-sub">MINT&nbsp;·&nbsp;PRESS</span>
            </span>
            <span class="coin-sheen" aria-hidden="true"></span>
          </div>
          <span v-if="forging" class="strike-ping" aria-hidden="true"></span>
          <div v-if="sparking" class="sparks" aria-hidden="true">
            <span v-for="n in 16" :key="n" class="spark" :style="sparkStyle(n)"></span>
          </div>
          <div class="anvil" aria-hidden="true"></div>
        </div>
      </div>

      <!-- telemetry -->
      <div class="press-info">
        <div class="eyebrow">
          <span class="dot"></span> PAYROLL · THE MINT PRESS
        </div>
        <h2 class="press-title">Report Foundry</h2>
        <p class="press-sub">
          Forge auditable payroll documents — each struck in its own PDF, Excel and CSV.
        </p>

        <div class="period">
          <div class="ctrl">
            <CalendarRange :size="14" />
            <select v-model.number="month" @change="reloadPreview">
              <option v-for="m in 12" :key="m" :value="m">{{ monthLabel(m) }}</option>
            </select>
          </div>
          <input v-model.number="year" type="number" class="yr" @change="reloadPreview" />
          <span v-if="preview" class="fy-tag">FY {{ preview.fiscal_year }}</span>
          <button class="refresh" :class="{ spin: loadingPreview }" title="Refresh telemetry" @click="reloadPreview">
            <RefreshCw :size="14" />
          </button>
        </div>

        <!-- live KPI counters -->
        <div class="kpis">
          <Motion v-for="(k, i) in kpis" :key="k.label" as="div" class="kpi" :class="k.tone"
            :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.5, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }">
            <div class="kpi-l">{{ k.label }}</div>
            <div class="kpi-v">
              <template v-if="k.money"><PayMoneyValue :value="k.value" short :tone="k.moneyTone" /></template>
              <template v-else><PayCountUp :value="k.value" /></template>
            </div>
            <div class="kpi-spark"><i v-for="b in k.bars" :key="b" :style="{ height: b + '%' }"></i></div>
          </Motion>
        </div>
      </div>
    </section>

    <!-- ════════ plate rail ════════ -->
    <section class="rail">
      <div v-if="loadingIndex" class="rail-skel">
        <div v-for="i in 8" :key="i" class="pay-skel plate-skel" />
      </div>

      <div v-for="grp in grouped" v-else :key="grp.group" class="grp">
        <header class="grp-head">
          <span class="grp-name">{{ grp.group }}</span>
          <span class="grp-line"></span>
          <span class="grp-count">{{ groupTotal(grp) }} <small>records</small></span>
        </header>

        <div class="plates">
          <Motion v-for="(r, i) in grp.items" :key="r.key" as="button"
            class="plate" :class="{ on: selectedKey === r.key }"
            :style="plateVars(r)"
            :initial="{ opacity: 0, y: 18, rotateX: -8 }"
            :animate="{ opacity: 1, y: 0, rotateX: 0 }"
            :transition="{ duration: 0.5, delay: 0.04 * i, ease: [0.16, 1, 0.3, 1] }"
            :while-hover="{ y: -4 }" :while-tap="{ scale: 0.97 }"
            @click="select(r.key)">
            <span class="plate-sheen" aria-hidden="true"></span>
            <span class="plate-ic"><component :is="iconFor(r.key)" :size="18" /></span>
            <span class="plate-body">
              <span class="plate-name">{{ r.name }}</span>
              <span class="plate-tag">{{ r.tagline }}</span>
            </span>
            <span class="plate-count">{{ countFor(r.key) }}</span>
          </Motion>
        </div>
      </div>
    </section>

    <!-- ════════ forge stage — specimen + console ════════ -->
    <section v-if="selected" class="stage">
      <!-- live specimen of the selected report's cover -->
      <Transition name="flip" mode="out-in">
        <article :key="selectedKey" class="specimen" :style="specimenVars">
          <div class="spec-accent"></div>
          <div class="spec-grain" aria-hidden="true"></div>
          <header class="spec-head">
            <span class="spec-ic"><component :is="iconFor(selectedKey)" :size="20" /></span>
            <div>
              <div class="spec-eyebrow">{{ selected.group.toUpperCase() }} · {{ preview?.period_label || periodLabel }}</div>
              <h3 class="spec-title">{{ selected.name }}</h3>
            </div>
          </header>
          <p class="spec-sub">{{ selected.subtitle || selected.description }}</p>

          <div class="spec-kpis">
            <div class="sk">
              <div class="sk-l">Records</div>
              <div class="sk-v"><PayCountUp :value="countFor(selectedKey)" /></div>
            </div>
            <div class="sk">
              <div class="sk-l">Employees</div>
              <div class="sk-v"><PayCountUp :value="summary.employees" /></div>
            </div>
            <div class="sk">
              <div class="sk-l">{{ moneyMetric.label }}</div>
              <div class="sk-v sk-money"><PayMoneyValue :value="moneyMetric.value" short :tone="moneyMetric.tone" /></div>
            </div>
          </div>

          <div class="spec-strip" aria-hidden="true">
            <span v-for="n in 7" :key="n" :style="{ height: stripBar(n) + '%' }"></span>
          </div>

          <footer class="spec-foot">
            <span class="spec-foil">Fourreck Technologies Pvt. Ltd.</span>
            <span class="spec-conf">Confidential</span>
          </footer>
        </article>
      </Transition>

      <!-- console -->
      <div class="console">
        <div class="con-head">
          <Hammer :size="15" />
          <span>Strike the {{ selected.name }}</span>
        </div>
        <p class="con-note">
          Choose a format. Each document is struck server-side — the PDF carries a bespoke
          cover; the workbook ships with live charts &amp; conditional formats.
        </p>

        <div class="forge-btns">
          <button class="forge pdf" :disabled="!!busy" @click="forge('pdf')">
            <FileDown :size="16" />
            <span>Forge PDF</span>
            <i v-if="busy === 'pdf'" class="bspin"></i>
          </button>
          <button class="forge xls" :disabled="!!busy" @click="forge('excel')">
            <FileSpreadsheet :size="16" />
            <span>Excel</span>
            <i v-if="busy === 'excel'" class="bspin"></i>
          </button>
          <button class="forge csv" :disabled="!!busy" @click="forge('csv')">
            <FileText :size="16" />
            <span>CSV</span>
            <i v-if="busy === 'csv'" class="bspin"></i>
          </button>
        </div>

        <div class="con-formats">
          <span class="cf"><b>PDF</b> — branded, print-ready</span>
          <span class="cf"><b>XLSX</b> — formulas &amp; charts</span>
          <span class="cf"><b>CSV</b> — pipeline feed</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  CalendarRange, RefreshCw, FileDown, FileSpreadsheet, FileText, Hammer,
  BookText, Table2, BadgeCheck, Landmark, HeartPulse, Building2, FileLock2,
  Network, TrendingUp, Wallet, Users, Ticket,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import PayCountUp from '../components/PayCountUp.vue'
import PayMoneyValue from '../components/PayMoneyValue.vue'
import { monthLabel } from '@/composables/usePayroll'
import { fetchReportIndex, fetchReportPreview, downloadReport } from '@/composables/usePayrollExtra'

const toast = useToast()
const now = new Date()
const month = ref(now.getMonth() + 1)
const year = ref(now.getFullYear())

const reports = ref([])
const loadingIndex = ref(false)
const preview = ref(null)
const loadingPreview = ref(false)
const selectedKey = ref('register')
const busy = ref(null)
const forging = ref(false)
const sparking = ref(false)

const GROUP_ORDER = ['Core', 'Statutory filing', 'Analytics', 'Adjustments']

const ICONS = {
  'register': BookText, 'salary-sheet': Table2, 'statutory': BadgeCheck,
  'pf-ecr': Landmark, 'esi': HeartPulse, 'professional-tax': Building2, 'tds-24q': FileLock2,
  'department-cost': Network, 'variance': TrendingUp, 'ctc-summary': Wallet, 'headcount': Users,
  'adjustments': Ticket, 'ytd-earnings': CalendarRange,
}
const iconFor = (k) => ICONS[k] || BookText

const grouped = computed(() => {
  const by = {}
  for (const r of reports.value) (by[r.group] ||= []).push(r)
  return GROUP_ORDER.filter(g => by[g]).map(g => ({ group: g, items: by[g] }))
})
const selected = computed(() => reports.value.find(r => r.key === selectedKey.value) || null)
const periodLabel = computed(() => `${monthLabel(month.value)} ${year.value}`)

const countFor = (k) => preview.value?.counts?.[k] ?? 0
const groupTotal = (grp) => grp.items.reduce((s, r) => s + countFor(r.key), 0)

const summary = computed(() => preview.value?.summary || {})

const kpis = computed(() => {
  const s = summary.value
  return [
    { label: 'Gross Payroll', value: s.gross || 0, money: true, moneyTone: '', tone: 'gold', bars: [40, 70, 55, 90, 65] },
    { label: 'Net Disbursed', value: s.net || 0, money: true, moneyTone: 'net', tone: 'net', bars: [55, 80, 60, 95, 75] },
    { label: 'Employees', value: s.employees || 0, money: false, tone: 'plain', bars: [30, 55, 45, 70, 50] },
    { label: 'Employer Cost', value: s.employer_cost || 0, money: true, moneyTone: 'statutory', tone: 'bronze', bars: [35, 50, 65, 45, 60] },
  ]
})

// money metric shown on the specimen, adapted to the selected report
const moneyMetric = computed(() => {
  const s = summary.value
  const k = selectedKey.value
  if (k === 'statutory' || k === 'pf-ecr' || k === 'esi' || k === 'professional-tax' || k === 'tds-24q')
    return { label: 'Statutory', value: (s.pf || 0) + (s.esi || 0) + (s.pt || 0) + (s.tds || 0), tone: 'statutory' }
  if (k === 'department-cost' || k === 'headcount')
    return { label: 'Total Cost', value: s.total_cost || 0, tone: 'deduction' }
  if (k === 'ctc-summary') return { label: 'Gross', value: s.gross || 0, tone: '' }
  return { label: 'Net Pay', value: s.net || 0, tone: 'net' }
})

const plateVars = (r) => ({ '--ac': r.accent, '--ac-soft': r.accent_soft, '--ac-deep': r.accent_deep })
const specimenVars = computed(() => selected.value
  ? { '--ac': selected.value.accent, '--ac-soft': selected.value.accent_soft, '--ac-deep': selected.value.accent_deep }
  : {})

const stripBar = (n) => {
  // deterministic pseudo-bars seeded by report key so each specimen looks distinct
  const seed = (selectedKey.value.charCodeAt(0) + n * 37) % 60
  return 35 + seed
}
const sparkStyle = (n) => {
  const ang = (n / 16) * Math.PI * 2
  return {
    '--dx': `${Math.cos(ang) * (40 + (n % 5) * 8)}px`,
    '--dy': `${-Math.abs(Math.sin(ang)) * (60 + (n % 4) * 14) - 20}px`,
    animationDelay: `${(n % 6) * 22}ms`,
  }
}

const select = (k) => { selectedKey.value = k }

async function loadIndex() {
  loadingIndex.value = true
  try {
    reports.value = (await fetchReportIndex()).reports || []
    if (reports.value.length && !reports.value.find(r => r.key === selectedKey.value))
      selectedKey.value = reports.value[0].key
  } catch { toast.error('Failed to load report catalogue') }
  finally { loadingIndex.value = false }
}

async function reloadPreview() {
  loadingPreview.value = true
  try { preview.value = await fetchReportPreview(year.value, month.value) }
  catch { /* preview is best-effort; cards still work */ }
  finally { loadingPreview.value = false }
}

async function forge(format) {
  if (busy.value) return
  busy.value = format
  forging.value = true
  sparking.value = true
  setTimeout(() => { forging.value = false }, 650)
  setTimeout(() => { sparking.value = false }, 900)
  try {
    await downloadReport(selectedKey.value, year.value, month.value, format)
    toast.success(`${selected.value?.name} · ${format.toUpperCase()} struck`)
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Strike failed — check the pay period has a released run')
  } finally {
    busy.value = null
  }
}

onMounted(() => { loadIndex(); reloadPreview() })
</script>

<style scoped>
.mint { display: flex; flex-direction: column; gap: 22px; padding-top: 6px; }

/* ════════ HERO / PRESS ════════ */
.press {
  position: relative; display: grid; grid-template-columns: 320px 1fr; gap: 26px;
  padding: 26px 28px; border-radius: 24px; overflow: hidden;
  background:
    radial-gradient(120% 140% at 0% 0%, rgba(251,191,36,0.10), transparent 55%),
    var(--pay-surface-2);
  border: 1px solid var(--pay-border);
  box-shadow: 0 30px 80px -50px rgba(0,0,0,0.7);
}
.press::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background-image: linear-gradient(rgba(251,191,36,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(251,191,36,0.05) 1px, transparent 1px);
  background-size: 26px 26px; mask-image: radial-gradient(80% 80% at 20% 10%, #000, transparent 70%);
  opacity: 0.5;
}

/* —— press stage —— */
.press-stage { position: relative; display: grid; place-items: center; min-height: 250px; }
.press-aura {
  position: absolute; width: 260px; height: 260px; border-radius: 50%;
  background: radial-gradient(circle, rgba(251,191,36,0.28), transparent 65%);
  filter: blur(10px); animation: pay-glow-breathe 4.5s ease-in-out infinite;
}
.press-arm {
  position: absolute; top: 2px; display: flex; flex-direction: column; align-items: center;
  transform: translateY(-8px); transition: transform 0.18s var(--pay-spring); z-index: 4;
}
.arm-rod { width: 14px; height: 54px; border-radius: 4px;
  background: linear-gradient(90deg, #6b4e08, #fde68a 45%, #b8860b); box-shadow: 0 2px 8px rgba(0,0,0,0.4); }
.arm-head { width: 64px; height: 20px; border-radius: 6px; margin-top: -2px;
  background: linear-gradient(180deg, #fde68a, #b8860b); box-shadow: 0 6px 14px rgba(0,0,0,0.45); }
.press-stage.forging .press-arm { transform: translateY(34px); }

.coin-wrap { position: relative; display: grid; place-items: center; z-index: 3; }
.coin {
  position: relative; width: 168px; height: 168px; border-radius: 50%;
  display: grid; place-items: center; transform-style: preserve-3d;
  background: var(--pay-grad-coin);
  box-shadow: 0 0 0 6px rgba(184,134,11,0.25), 0 16px 36px -10px rgba(0,0,0,0.6),
    inset 0 3px 10px rgba(255,255,255,0.45), inset 0 -8px 16px rgba(106,78,8,0.5);
}
.coin.strike { animation: coin-press 0.5s var(--pay-spring); }
@keyframes coin-press { 0% { transform: scale(1); } 30% { transform: scale(0.93); } 100% { transform: scale(1); } }
.coin-guilloche {
  position: absolute; inset: 12px; border-radius: 50%;
  background: repeating-conic-gradient(from 0deg, rgba(106,78,8,0.0) 0deg 4deg, rgba(106,78,8,0.18) 4deg 8deg);
  animation: pay-dial-spin 26s linear infinite;
}
.coin-ring { position: absolute; inset: 18px; border-radius: 50%; border: 2px dashed rgba(106,78,8,0.4); }
.coin-face { position: relative; text-align: center; z-index: 2; }
.coin-glyph {
  display: block; font-size: 56px; font-weight: 900; line-height: 1; color: #5a3d05;
  text-shadow: 0 1px 0 rgba(255,255,255,0.5), 0 -1px 2px rgba(106,78,8,0.6);
}
.coin-sub { font-family: var(--pay-mono); font-size: 8px; letter-spacing: 2px; font-weight: 800; color: #6b4e08; }
.coin-sheen {
  position: absolute; inset: 0; border-radius: 50%; overflow: hidden; z-index: 3;
}
.coin-sheen::after {
  content: ''; position: absolute; top: 0; left: 0; width: 40%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent);
  transform: skewX(-18deg); animation: pay-foil-sweep 4.5s ease-in-out infinite;
}
.strike-ping {
  position: absolute; width: 168px; height: 168px; border-radius: 50%;
  border: 2px solid var(--pay-mint); animation: pay-strike-ping 0.7s ease-out forwards;
}
.anvil { width: 200px; height: 16px; margin-top: 8px; border-radius: 0 0 40px 40px;
  background: linear-gradient(180deg, rgba(120,90,30,0.5), rgba(40,30,12,0.2)); filter: blur(1px); }

.sparks { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; z-index: 5; }
.spark {
  position: absolute; width: 5px; height: 5px; border-radius: 50%;
  background: radial-gradient(circle, #fff, #f59e0b 60%, transparent);
  animation: spark-fly 0.85s ease-out forwards;
}
@keyframes spark-fly {
  0% { transform: translate(0,0) scale(1); opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) scale(0.2); opacity: 0; }
}

/* —— telemetry —— */
.press-info { position: relative; z-index: 2; display: flex; flex-direction: column; }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--pay-mono);
  font-size: 10.5px; font-weight: 800; letter-spacing: 2.5px; color: var(--pay-treasury); text-transform: uppercase; }
.eyebrow .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--pay-mint); box-shadow: 0 0 10px var(--pay-mint); animation: pay-dot-pulse 1.8s infinite; }
.press-title { margin: 8px 0 4px; font-size: 30px; font-weight: 900; letter-spacing: -0.5px;
  background: var(--pay-grad-cta); -webkit-background-clip: text; background-clip: text; color: transparent;
  background-size: 200% auto; animation: pay-foil-text 6s linear infinite; }
.press-sub { margin: 0 0 16px; font-size: 13px; color: var(--pay-text-2); max-width: 52ch; line-height: 1.5; }

.period { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; }
.ctrl { display: inline-flex; align-items: center; gap: 7px; padding: 0 11px; border-radius: 11px;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft); color: var(--pay-text-2); }
.ctrl select { background: transparent; border: 0; outline: 0; color: var(--pay-text); font-size: 13px; padding: 9px 2px; cursor: pointer; }
.ctrl select option { background: var(--pay-surface-2); color: var(--pay-text); }
.yr { width: 86px; padding: 9px 11px; border-radius: 11px; background: var(--pay-surface);
  border: 1px solid var(--pay-border-soft); color: var(--pay-text); font-size: 13px; outline: 0; }
.fy-tag { font-family: var(--pay-mono); font-size: 11px; font-weight: 700; padding: 5px 10px; border-radius: 8px;
  color: var(--pay-treasury); background: rgba(184,134,11,0.12); }
.refresh { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; cursor: pointer;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft); color: var(--pay-text-2); }
.refresh:hover { color: var(--pay-treasury); border-color: var(--pay-border); }
.refresh.spin :deep(svg) { animation: pay-dial-spin 0.8s linear infinite; }

.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.kpi { position: relative; padding: 13px 14px 12px; border-radius: 15px; overflow: hidden;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft); border-top: 2px solid var(--pay-treasury); }
.kpi.net { border-top-color: var(--pay-net); }
.kpi.bronze { border-top-color: var(--pay-statutory); }
.kpi.plain { border-top-color: var(--pay-text-muted); }
.kpi-l { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--pay-text-muted); }
.kpi-v { margin-top: 5px; font-size: 19px; font-weight: 900; color: var(--pay-text); font-variant-numeric: tabular-nums; }
.kpi.net .kpi-v { color: var(--pay-net); }
.kpi-spark { display: flex; align-items: flex-end; gap: 3px; height: 16px; margin-top: 8px; opacity: 0.7; }
.kpi-spark i { flex: 1; border-radius: 2px 2px 0 0; background: linear-gradient(180deg, var(--pay-mint), transparent);
  animation: pay-bar-grow 0.7s var(--pay-ease) backwards; transform-origin: bottom; }

/* ════════ PLATE RAIL ════════ */
.rail { display: flex; flex-direction: column; gap: 18px; }
.rail-skel { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.plate-skel { height: 76px; border-radius: 16px; }
.grp-head { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.grp-name { font-family: var(--pay-mono); font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: var(--pay-text-2); }
.grp-line { flex: 1; height: 1px; background: linear-gradient(90deg, var(--pay-border), transparent); }
.grp-count { font-family: var(--pay-mono); font-size: 11px; color: var(--pay-text-muted); }
.grp-count small { opacity: 0.7; }

.plates { display: grid; grid-template-columns: repeat(auto-fill, minmax(244px, 1fr)); gap: 12px; }
.plate {
  position: relative; display: flex; align-items: center; gap: 12px; text-align: left;
  padding: 14px 15px; border-radius: 16px; cursor: pointer; overflow: hidden;
  color: var(--pay-text); transform-style: preserve-3d;
  background:
    linear-gradient(135deg, rgba(255,255,255,0.05), transparent 45%),
    var(--pay-surface);
  border: 1px solid var(--pay-border-soft);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 22px -16px rgba(0,0,0,0.8);
  transition: border-color 0.25s, box-shadow 0.25s;
}
.plate:hover { border-color: var(--ac, var(--pay-border)); }
.plate.on {
  border-color: var(--ac); background: linear-gradient(135deg, color-mix(in srgb, var(--ac) 16%, var(--pay-surface)), var(--pay-surface));
  box-shadow: 0 0 0 1px var(--ac), 0 14px 30px -18px var(--ac);
}
.plate-sheen { position: absolute; inset: 0; pointer-events: none; }
.plate:hover .plate-sheen::after {
  content: ''; position: absolute; top: 0; left: 0; width: 45%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
  transform: skewX(-18deg); animation: pay-ingot-sheen 0.9s ease;
}
.plate-ic { flex: 0 0 auto; width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center;
  color: var(--ac, var(--pay-treasury)); background: var(--ac-soft, rgba(251,191,36,0.1));
  border: 1px solid color-mix(in srgb, var(--ac) 40%, transparent); }
[data-theme="light"] .plate-ic { background: color-mix(in srgb, var(--ac) 14%, #fff); }
.plate-body { min-width: 0; flex: 1; }
.plate-name { display: block; font-size: 14px; font-weight: 700; line-height: 1.2; }
.plate-tag { display: block; font-size: 11px; color: var(--pay-text-muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.plate-count { flex: 0 0 auto; min-width: 30px; text-align: center; font-family: var(--pay-mono); font-weight: 800; font-size: 14px;
  color: var(--ac, var(--pay-treasury)); padding: 4px 9px; border-radius: 9px; background: rgba(0,0,0,0.18); }
[data-theme="light"] .plate-count { background: color-mix(in srgb, var(--ac) 12%, #fff); }

/* ════════ FORGE STAGE ════════ */
.stage { display: grid; grid-template-columns: 1fr 320px; gap: 20px; align-items: start; }
@media (max-width: 880px) { .stage, .press { grid-template-columns: 1fr; } }

.specimen {
  position: relative; padding: 24px 26px 18px; border-radius: 20px; overflow: hidden; min-height: 280px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--ac-soft) 60%, var(--pay-surface-2)), var(--pay-surface-2));
  border: 1px solid color-mix(in srgb, var(--ac) 35%, var(--pay-border));
  box-shadow: 0 24px 60px -40px rgba(0,0,0,0.7);
}
.spec-accent { position: absolute; top: 0; left: 0; right: 0; height: 7px; background: linear-gradient(90deg, var(--ac), var(--ac-deep)); }
.spec-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background: radial-gradient(120% 90% at 90% 0%, color-mix(in srgb, var(--ac) 18%, transparent), transparent 60%); }
.spec-head { display: flex; align-items: center; gap: 13px; margin-top: 8px; }
.spec-ic { width: 46px; height: 46px; border-radius: 13px; display: grid; place-items: center; color: #fff;
  background: linear-gradient(135deg, var(--ac), var(--ac-deep)); box-shadow: 0 8px 18px -8px var(--ac); }
.spec-eyebrow { font-family: var(--pay-mono); font-size: 10px; font-weight: 800; letter-spacing: 1.5px; color: var(--ac-deep); }
[data-theme="dark"] .spec-eyebrow, :root:not([data-theme="light"]) .spec-eyebrow { color: color-mix(in srgb, var(--ac) 75%, #fff); }
.spec-title { margin: 2px 0 0; font-size: 23px; font-weight: 900; letter-spacing: -0.4px; color: var(--pay-text); }
.spec-sub { margin: 12px 0 16px; font-size: 12.5px; color: var(--pay-text-2); line-height: 1.5; max-width: 60ch; }

.spec-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.sk { padding: 11px 13px; border-radius: 13px; background: var(--pay-surface);
  border: 1px solid var(--pay-border-soft); border-left: 3px solid var(--ac); }
.sk-l { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--pay-text-muted); }
.sk-v { margin-top: 4px; font-size: 18px; font-weight: 900; color: var(--pay-text); font-variant-numeric: tabular-nums; }
.spec-strip { display: flex; align-items: flex-end; gap: 5px; height: 40px; margin: 16px 0 10px; }
.spec-strip span { flex: 1; border-radius: 3px 3px 0 0; background: linear-gradient(180deg, var(--ac), transparent);
  animation: pay-bar-grow 0.6s var(--pay-ease) backwards; transform-origin: bottom; opacity: 0.6; }
.spec-foot { display: flex; justify-content: space-between; align-items: center; padding-top: 10px;
  border-top: 1px dashed color-mix(in srgb, var(--ac) 30%, transparent); }
.spec-foil { font-size: 10px; font-weight: 700; letter-spacing: 0.04em; color: var(--ac-deep); }
:root:not([data-theme="light"]) .spec-foil { color: color-mix(in srgb, var(--ac) 70%, #fff); }
.spec-conf { font-family: var(--pay-mono); font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: var(--pay-text-muted); }

/* console */
.console { padding: 20px; border-radius: 18px; background: var(--pay-surface-2); border: 1px solid var(--pay-border); }
.con-head { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 800; color: var(--pay-text); }
.con-head :deep(svg) { color: var(--pay-treasury); }
.con-note { margin: 10px 0 16px; font-size: 11.5px; color: var(--pay-text-2); line-height: 1.5; }
.forge-btns { display: flex; flex-direction: column; gap: 10px; }
.forge { position: relative; display: flex; align-items: center; gap: 10px; padding: 13px 16px; border-radius: 13px;
  font-size: 13.5px; font-weight: 800; cursor: pointer; border: 1px solid var(--pay-border-soft);
  color: var(--pay-text); background: var(--pay-surface); transition: transform 0.15s var(--pay-spring), border-color 0.2s; overflow: hidden; }
.forge:hover:not(:disabled) { transform: translateY(-2px); }
.forge:disabled { opacity: 0.55; cursor: progress; }
.forge.pdf { background: var(--pay-grad-cta); color: #2a1206; border: 0; }
.forge.pdf :deep(svg) { color: #2a1206; }
.forge.xls { border-color: color-mix(in srgb, var(--pay-net) 40%, transparent); }
.forge.xls :deep(svg) { color: var(--pay-net); }
.forge.csv :deep(svg) { color: var(--pay-text-2); }
.forge span { flex: 1; }
.bspin { width: 14px; height: 14px; border-radius: 50%; border: 2px solid currentColor; border-top-color: transparent; animation: pay-dial-spin 0.7s linear infinite; }
.con-formats { display: flex; flex-direction: column; gap: 6px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--pay-border-soft); }
.cf { font-size: 10.5px; color: var(--pay-text-muted); }
.cf b { color: var(--pay-text-2); font-family: var(--pay-mono); margin-right: 4px; }

/* specimen flip transition */
.flip-enter-active, .flip-leave-active { transition: transform 0.45s var(--pay-ease), opacity 0.45s var(--pay-ease); transform-style: preserve-3d; }
.flip-enter-from { opacity: 0; transform: rotateY(-35deg) translateX(20px); }
.flip-leave-to { opacity: 0; transform: rotateY(35deg) translateX(-20px); }

@media (prefers-reduced-motion: reduce) {
  .coin-guilloche, .coin-sheen::after, .press-aura, .press-title, .eyebrow .dot, .refresh.spin :deep(svg) { animation: none !important; }
  .flip-enter-from, .flip-leave-to { transform: none; }
}
</style>
