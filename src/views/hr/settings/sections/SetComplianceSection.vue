<template>
  <div class="cmp">
    <SetSectionHead eyebrow="Pay & Statutory · Statute" title="Compliance" accent="Aegis"
      accent-color="var(--set-ok)" :icon="ShieldCheck"
      sub="PF, ESI, Professional Tax and TDS — the statutory rate tables the payroll engine actually reads, scoped by financial year, state and effective date. Configure them here; the Aegis shows what's sealed and what falls back to defaults.">
      <template #actions>
        <div class="cmp-fy"><span>FY</span><HrSelect v-model="fy" :options="fyOptions" /></div>
        <button class="set-btn set-btn-steel" :disabled="loading" @click="reload" title="Refresh"><RefreshCw :size="14" :class="{ 'set-spin': loading }" /></button>
        <Motion as="button" type="button" class="set-btn set-btn-primary" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="openCreate()"><Plus :size="14" /> New rate</Motion>
      </template>

      <template #lenses>
        <div class="cmp-lenses">
          <button class="set-chip" :class="{ on: lens === 'all' }" style="--acc: var(--set-ok)" @click="lens = 'all'"><Layers :size="12" /> All <b>{{ rows.length }}</b></button>
          <button v-for="f in FAMILIES" :key="f.key" class="set-chip" :class="{ on: lens === f.key }" :style="{ '--acc': FAMILY_HEX[f.key] }" @click="setLens(f.key)">
            <component :is="ICONS[f.key]" :size="12" /> {{ f.short }} <b>{{ familyRowCount(f.key) }}</b>
          </button>
          <button v-if="unmappedAll.length" class="set-chip" :class="{ on: lens === 'ignored' }" style="--acc: var(--set-conflict)" @click="setLens('ignored')"><Unplug :size="12" /> Ignored <b>{{ unmappedAll.length }}</b></button>
        </div>
      </template>

      <div class="cmp-powers">
        <Share2 :size="12" /><span class="cmp-powers-lab">Powers</span>
        <button class="cmp-mod" @click="$router.push('/admin/hr/payroll/dashboard')"><Wallet :size="12" /> Payroll</button>
        <button class="cmp-mod alt" @click="$router.push('/admin/hr/payroll/payslips')"><ReceiptText :size="12" /> Payslips</button>
      </div>
    </SetSectionHead>

    <!-- signature instrument + engine-coverage intelligence -->
    <div class="cmp-hero">
      <Motion as="div" class="cmp-aegis-wrap" :initial="{ opacity: 0, scale: 0.985 }" :animate="{ opacity: 1, scale: 1 }" :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
        <div v-if="loading" class="cmp-aegis-skel"><span class="cmp-skel-beam" /></div>
        <StatuteAegis v-else :families="familyCoverage" :overall="overall" :fy="fy" @pick="onAegisPick" />
      </Motion>

      <Motion as="aside" class="cmp-insight" :initial="{ opacity: 0, x: 16 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }">
        <header class="cmp-insight-head"><Activity :size="14" /> Engine coverage</header>

        <div class="cmp-cov">
          <div class="cmp-cov-bar"><span class="cmp-cov-fill" :style="{ width: overall.pct + '%' }" :data-state="overall.pct >= 100 ? 'sealed' : overall.pct > 0 ? 'partial' : 'open'" /></div>
          <div class="cmp-cov-legend"><b>{{ overall.configured }}/{{ overall.total }}</b><span>core inputs configured · {{ overall.pct }}%</span></div>
        </div>

        <!-- missing core keys → one-click configure -->
        <div v-if="overall.missing.length" class="cmp-miss">
          <span class="cmp-miss-lab"><AlertTriangle :size="12" /> {{ overall.missing.length }} on statutory default</span>
          <div class="cmp-miss-chips">
            <button v-for="k in overall.missing.slice(0, 6)" :key="k" class="cmp-miss-chip" @click="openCreate(k)" :title="`Configure ${CATALOG_BY_KEY[k]?.label}`">
              <Plus :size="10" /> {{ CATALOG_BY_KEY[k]?.label || k }}
            </button>
          </div>
        </div>
        <div v-else class="cmp-ok"><ShieldCheck :size="14" /> Every core statute is configured for {{ fy }}.</div>

        <!-- ignored / unmapped keys — the loophole, surfaced -->
        <button v-if="unmappedAll.length" class="cmp-ghost" @click="setLens('ignored')">
          <Unplug :size="14" />
          <div><b>{{ unmappedAll.length }} row{{ unmappedAll.length === 1 ? '' : 's' }} ignored by the engine</b><span>Legacy / mistyped keys load_config() never reads — review & remove.</span></div>
          <ArrowRight :size="13" />
        </button>

        <button class="cmp-insight-link" @click="$router.push('/admin/hr/payroll/dashboard')">
          <Wallet :size="13" /> These rates drive every payslip <ArrowRight :size="12" />
        </button>
      </Motion>
    </div>

    <!-- engine-accurate contribution simulator -->
    <Motion as="div" class="cmp-sim" :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.14, ease: [0.16, 1, 0.3, 1] }">
      <div class="cmp-sim-head">
        <span class="cmp-sim-eyebrow"><Calculator :size="13" /> Contribution simulator <i>mirrors the engine for {{ fy }}</i></span>
        <div class="cmp-sim-inputs">
          <label>Gross <input type="number" v-model.number="simGross" min="0" /></label>
          <label>Basic <input type="number" v-model.number="simBasic" min="0" /></label>
          <div class="cmp-sim-regime">
            <button :class="{ on: simRegime === 'NEW' }" @click="simRegime = 'NEW'">New</button>
            <button :class="{ on: simRegime === 'OLD' }" @click="simRegime = 'OLD'">Old</button>
          </div>
        </div>
      </div>
      <div class="cmp-bars">
        <div class="cmp-bar-row">
          <span class="cmp-bar-lab">Employee deductions <b>₹{{ fmt(sim.empTotal) }}</b></span>
          <div class="cmp-bar">
            <span class="cmp-seg pf" :style="{ width: pct(sim.pfEmp, sim.barMax) }" :title="`PF ₹${fmt(sim.pfEmp)}`" />
            <span class="cmp-seg esi" :style="{ width: pct(sim.esiEmp, sim.barMax) }" :title="`ESI ₹${fmt(sim.esiEmp)}`" />
            <span class="cmp-seg pt" :style="{ width: pct(sim.pt, sim.barMax) }" :title="`PT ₹${fmt(sim.pt)}`" />
            <span class="cmp-seg tds" :style="{ width: pct(sim.tds, sim.barMax) }" :title="`TDS ₹${fmt(sim.tds)}`" />
          </div>
        </div>
        <div class="cmp-bar-row">
          <span class="cmp-bar-lab">Employer cost <b>₹{{ fmt(sim.emprTotal) }}</b></span>
          <div class="cmp-bar">
            <span class="cmp-seg pf" :style="{ width: pct(sim.pfEmpr, sim.barMax) }" :title="`PF ₹${fmt(sim.pfEmpr)}`" />
            <span class="cmp-seg esi" :style="{ width: pct(sim.esiEmpr, sim.barMax) }" :title="`ESI ₹${fmt(sim.esiEmpr)}`" />
          </div>
        </div>
        <div class="cmp-bar-row takehome">
          <span class="cmp-bar-lab">Est. monthly take-home <b>₹{{ fmt(sim.takeHome) }}</b></span>
          <div class="cmp-bar"><span class="cmp-seg take" :style="{ width: pct(sim.takeHome, simGross || 1) }" /></div>
        </div>
      </div>
      <div class="cmp-legend">
        <span><i class="d pf" /> PF</span><span><i class="d esi" /> ESI</span><span><i class="d pt" /> PT</span><span><i class="d tds" /> TDS</span><span><i class="d take" /> Take-home</span>
        <span class="cmp-legend-note">CTC ≈ ₹{{ fmt(sim.ctc) }}/mo · {{ sim.esiOn ? 'within ESI threshold' : 'above ESI threshold' }} · uses your configured rates, statutory defaults otherwise</span>
      </div>
    </Motion>

    <!-- statutory rate cards, grouped by family -->
    <div v-if="loading" class="cmp-grid"><div v-for="n in 4" :key="n" class="cmp-cardskel" :style="{ '--i': n }"><span class="cmp-skel-beam" /></div></div>
    <SetEmptyState v-else-if="!rows.length" :icon="ShieldCheck" accent-color="var(--set-ok)"
      title="No statutory rates for this year" sub="Add PF / ESI / PT / TDS rates so the payroll engine computes statutory deductions correctly.">
      <button class="set-btn set-btn-primary" @click="openCreate()"><Plus :size="14" /> New rate</button>
    </SetEmptyState>
    <template v-else>
      <div v-for="grp in grouped" :key="grp.key" class="cmp-fam">
        <header class="cmp-fam-head" :style="{ '--c': grp.hex }"><component :is="ICONS[grp.key]" :size="15" /> {{ grp.label }}<span class="set-mono">{{ grp.rows.length }}</span></header>
        <div class="cmp-grid">
          <ComplianceRateCard v-for="(r, i) in grp.rows" :key="r.id" :row="r" :index="i" @edit="openEdit" @delete="openDelete" @toggle="toggleActive" />
        </div>
      </div>
      <div v-if="showUnmapped && unmapped.length" class="cmp-fam">
        <header class="cmp-fam-head ignored"><Unplug :size="15" /> Ignored by engine<span class="set-mono">{{ unmapped.length }}</span></header>
        <p class="cmp-ignored-note"><AlertTriangle :size="12" /> These keys don't match anything the payroll engine reads — they were written by an older UI and have zero effect. Remove them or re-create with a valid key.</p>
        <div class="cmp-grid">
          <ComplianceRateCard v-for="(r, i) in unmapped" :key="r.id" :row="r" :index="i" @edit="openEdit" @delete="openDelete" @toggle="toggleActive" />
        </div>
      </div>
    </template>

    <ComplianceRateModal :open="formOpen" :edit-target="editTarget" :saving="saving" :default-fy="fy" :prefill-key="prefillKey" @close="formOpen = false" @save="save" />
    <ComplianceDeleteModal :open="delOpen" :loading="deleting" :target="delTarget" @close="delOpen = false" @confirm="doDelete" @deactivate="doDeactivate" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import { ShieldCheck, RefreshCw, Plus, Calculator, Layers, Share2, Wallet, ReceiptText, Activity, AlertTriangle, ArrowRight, Unplug,
  PiggyBank, HeartPulse, Landmark, Receipt } from 'lucide-vue-next'
import SetSectionHead from '../components/SetSectionHead.vue'
import SetEmptyState from '../components/SetEmptyState.vue'
import StatuteAegis from '../components/StatuteAegis.vue'
import ComplianceRateCard from '../components/ComplianceRateCard.vue'
import ComplianceRateModal from '../components/ComplianceRateModal.vue'
import ComplianceDeleteModal from '../components/ComplianceDeleteModal.vue'
import HrSelect from '@/components/hr/forms/HrSelect.vue'
import { listStatutory, createStatutory, updateStatutory, deleteStatutory, currentFiscalYear, errText } from '../composables/useHrSettings'
import { FAMILIES, FAMILY_HEX, CATALOG_BY_KEY, CORE_KEYS, catalogFor, resolveConfig, simulatePay, unmappedRows } from '../components/complianceCatalog'

const toast = useToast()
const router = useRouter()
const ICONS = { pf: PiggyBank, esi: HeartPulse, pt: Landmark, tax: Receipt }

const rows = ref([])
const loading = ref(false)
const fy = ref(currentFiscalYear())
const lens = ref('all')
const q = ref('')

const fyOptions = computed(() => {
  const cur = currentFiscalYear(); const startYear = Number(cur.slice(0, 4))
  return [0, -1, -2, 1].map(o => { const s = startYear + o; const v = `${s}-${String((s + 1) % 100).padStart(2, '0')}`; return { value: v, label: v } })
})

async function reload() {
  loading.value = true
  try { rows.value = await listStatutory(fy.value) }
  catch (e) { toast.error(errText(e, 'Failed to load statutory config')) }
  finally { loading.value = false }
}
onMounted(reload)
watch(fy, reload)

// ── coverage (the loophole-closer, made visible) ──
const presentKeys = computed(() => new Set(rows.value.filter(r => r.is_active !== false).map(r => r.key)))
const familyCoverage = computed(() => FAMILIES.map((f) => {
  const core = CORE_KEYS.filter(k => CATALOG_BY_KEY[k].family === f.key)
  const configured = core.filter(k => presentKeys.value.has(k)).length
  return { key: f.key, label: f.label, short: f.short, hex: FAMILY_HEX[f.key], configured, total: core.length }
}))
const overall = computed(() => {
  const configured = familyCoverage.value.reduce((a, f) => a + f.configured, 0)
  const total = CORE_KEYS.length
  return { configured, total, pct: total ? Math.round((configured / total) * 100) : 0, missing: CORE_KEYS.filter(k => !presentKeys.value.has(k)) }
})

const unmappedAll = computed(() => unmappedRows(rows.value))
const familyOf = (r) => catalogFor(r.key)?.family || null
const familyRowCount = (fk) => rows.value.filter(r => familyOf(r) === fk).length

const setLens = (k) => { lens.value = lens.value === k ? 'all' : k }
const onAegisPick = (fk) => { lens.value = fk }
const visibleRows = computed(() => rows.value.filter((r) => {
  if (lens.value === 'ignored') return !CATALOG_BY_KEY[r.key]
  if (lens.value !== 'all' && familyOf(r) !== lens.value) return false
  return true
}))
const grouped = computed(() => {
  if (lens.value === 'ignored') return []
  return FAMILIES.map(f => ({ key: f.key, label: f.label, hex: FAMILY_HEX[f.key], rows: visibleRows.value.filter(r => familyOf(r) === f.key) })).filter(g => g.rows.length)
})
const unmapped = computed(() => visibleRows.value.filter(r => !CATALOG_BY_KEY[r.key]))
const showUnmapped = computed(() => lens.value === 'all' || lens.value === 'ignored')

// ── simulator (engine-accurate) ──
const simGross = ref(40000)
const simBasic = ref(20000)
const simRegime = ref('NEW')
const cfg = computed(() => resolveConfig(rows.value, null))
const sim = computed(() => {
  const s = simulatePay({ gross: simGross.value, basic: simBasic.value, regime: simRegime.value }, cfg.value)
  return { ...s, barMax: Math.max(s.empTotal, s.emprTotal, 1) }
})
const fmt = (v) => Math.round(Number(v) || 0).toLocaleString('en-IN')
const pct = (v, max) => `${Math.min(100, (Number(v) / Number(max || 1)) * 100).toFixed(1)}%`

// ── CRUD ──
const formOpen = ref(false)
const editTarget = ref(null)
const prefillKey = ref('')
const saving = ref(false)
const openCreate = (key = '') => { editTarget.value = null; prefillKey.value = key || ''; formOpen.value = true }
const openEdit = (r) => { editTarget.value = r; prefillKey.value = ''; formOpen.value = true }

async function save({ create, id, payload, patch }) {
  saving.value = true
  try {
    if (create) await createStatutory(payload)
    else await updateStatutory(id, patch)
    toast.success(create ? 'Rate created' : 'Rate updated')
    formOpen.value = false; await reload()
  } catch (e) { toast.error(errText(e, 'Failed to save')) }
  finally { saving.value = false }
}

async function toggleActive(r) {
  const next = r.is_active === false
  r.is_active = next
  try { await updateStatutory(r.id, { is_active: next }) }
  catch (e) { r.is_active = !next; toast.error(errText(e, 'Failed to update')) }
}

const delOpen = ref(false)
const delTarget = ref(null)
const deleting = ref(false)
const openDelete = (r) => { delTarget.value = r; delOpen.value = true }
async function doDelete(reason) {
  deleting.value = true
  try { await deleteStatutory(delTarget.value.id, reason); toast.success('Rate removed'); delOpen.value = false; await reload() }
  catch (e) { toast.error(errText(e, 'Failed to remove')) }
  finally { deleting.value = false }
}
async function doDeactivate(r) {
  deleting.value = true
  try { await updateStatutory(r.id, { is_active: false }); toast.success('Rate deactivated'); delOpen.value = false; await reload() }
  catch (e) { toast.error(errText(e, 'Failed to deactivate')) }
  finally { deleting.value = false }
}
</script>

<style scoped>
.cmp { display: flex; flex-direction: column; gap: 16px; }
.cmp-fy { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; color: var(--set-text-muted); }
.cmp-fy :deep(.hr-select) { width: 118px; }
.cmp-lenses { display: flex; flex-wrap: wrap; gap: 8px; }
.cmp-lenses .set-chip b { color: var(--set-text); }

.cmp-powers { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--set-border); }
.cmp-powers > svg { color: var(--set-text-dim); }
.cmp-powers-lab { font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.cmp-mod { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 600; color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.cmp-mod:hover { color: var(--set-ok); border-color: color-mix(in srgb, var(--set-ok) 40%, transparent); transform: translateY(-1px); }
.cmp-mod :deep(svg) { color: var(--set-ok); } .cmp-mod.alt { color: var(--set-text-muted); } .cmp-mod.alt :deep(svg) { color: var(--set-text-muted); }

.cmp-hero { display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; align-items: stretch; }
@media (max-width: 980px) { .cmp-hero { grid-template-columns: 1fr; } }
.cmp-aegis-wrap { min-width: 0; }
.cmp-aegis-skel { position: relative; overflow: hidden; width: 100%; min-height: 400px; border-radius: 20px; background: var(--set-surface); border: 1px solid var(--set-border); }

.cmp-insight { display: flex; flex-direction: column; gap: 12px; padding: 16px; border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); }
.cmp-insight-head { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-ok); }
.cmp-insight-head :deep(svg) { color: var(--set-ok); }
.cmp-cov { display: flex; flex-direction: column; gap: 7px; padding: 12px; border-radius: 12px; background: var(--set-panel); border: 1px solid var(--set-border); }
.cmp-cov-bar { height: 10px; border-radius: 999px; overflow: hidden; background: var(--set-unset-soft); }
.cmp-cov-fill { display: block; height: 100%; border-radius: 999px; transition: width 0.8s var(--set-spring); }
.cmp-cov-fill[data-state="sealed"] { background: linear-gradient(90deg, #10b981, #34d399); }
.cmp-cov-fill[data-state="partial"] { background: linear-gradient(90deg, #d97706, #fbbf24); }
.cmp-cov-fill[data-state="open"] { background: linear-gradient(90deg, #b91c1c, #f87171); }
.cmp-cov-legend { display: flex; align-items: baseline; gap: 8px; }
.cmp-cov-legend b { font-size: 18px; font-weight: 850; color: var(--set-text); font-family: var(--set-mono); }
.cmp-cov-legend span { font-size: 10.5px; color: var(--set-text-muted); }

.cmp-miss { display: flex; flex-direction: column; gap: 8px; }
.cmp-miss-lab { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 750; color: var(--set-partial); }
.cmp-miss-lab :deep(svg) { color: var(--set-partial); }
.cmp-miss-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.cmp-miss-chip { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 10.5px; font-weight: 650; color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px dashed color-mix(in srgb, var(--set-partial) 40%, transparent); transition: all 0.2s; }
.cmp-miss-chip:hover { color: var(--set-ok); border-color: color-mix(in srgb, var(--set-ok) 50%, transparent); border-style: solid; transform: translateY(-1px); }
.cmp-miss-chip :deep(svg) { color: var(--set-ok); }
.cmp-ok { display: inline-flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 12px; font-size: 11.5px; color: var(--set-text-secondary); background: var(--set-ok-soft); border: 1px solid color-mix(in srgb, var(--set-ok) 26%, transparent); }
.cmp-ok :deep(svg) { color: var(--set-ok); }

.cmp-ghost { display: flex; align-items: center; gap: 10px; padding: 11px 12px; border-radius: 12px; cursor: pointer; text-align: left; font: inherit; color: var(--set-text-secondary); background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 28%, transparent); transition: all 0.2s; }
.cmp-ghost:hover { transform: translateY(-1px); }
.cmp-ghost > :deep(svg):first-child { color: var(--set-conflict); flex-shrink: 0; }
.cmp-ghost div { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.3; }
.cmp-ghost b { font-size: 12px; font-weight: 750; color: var(--set-text); }
.cmp-ghost span { font-size: 10.5px; color: var(--set-text-muted); }
.cmp-ghost > :deep(svg):last-child { color: var(--set-conflict); flex-shrink: 0; }

.cmp-insight-link { margin-top: auto; display: inline-flex; align-items: center; gap: 7px; padding: 9px 12px; border-radius: 11px; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 650; color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s; }
.cmp-insight-link:hover { color: var(--set-ok); border-color: color-mix(in srgb, var(--set-ok) 38%, transparent); }
.cmp-insight-link :deep(svg) { color: var(--set-ok); }

/* simulator */
.cmp-sim { position: relative; overflow: hidden; border-radius: 18px; padding: 18px 20px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); display: flex; flex-direction: column; gap: 14px; }
.cmp-sim-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.cmp-sim-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-ok); }
.cmp-sim-eyebrow i { font-style: normal; font-weight: 600; letter-spacing: 0; text-transform: none; color: var(--set-text-dim); font-size: 10.5px; }
.cmp-sim-inputs { display: flex; gap: 10px; align-items: center; }
.cmp-sim-inputs label { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--set-text-muted); }
.cmp-sim-inputs input { width: 100px; padding: 7px 10px; border-radius: 9px; font: inherit; font-size: 13px; color: var(--hr-input-text); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.cmp-sim-inputs input:focus { outline: none; border-color: var(--set-ok); }
.cmp-sim-regime { display: inline-flex; gap: 3px; padding: 3px; border-radius: 9px; background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.cmp-sim-regime button { padding: 5px 11px; border-radius: 7px; cursor: pointer; font: inherit; font-size: 11px; font-weight: 700; color: var(--set-text-muted); background: none; border: none; transition: all 0.2s; }
.cmp-sim-regime button.on { color: var(--set-ok); background: var(--set-ok-soft); }
.cmp-bars { display: flex; flex-direction: column; gap: 11px; }
.cmp-bar-row { display: flex; flex-direction: column; gap: 5px; }
.cmp-bar-lab { font-size: 12px; color: var(--set-text-secondary); display: flex; justify-content: space-between; }
.cmp-bar-lab b { color: var(--set-text); }
.cmp-bar { display: flex; height: 16px; border-radius: 8px; overflow: hidden; background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.cmp-seg { height: 100%; transition: width 0.7s var(--set-ease); }
.cmp-seg.pf { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.cmp-seg.esi { background: linear-gradient(90deg, #10b981, #34d399); }
.cmp-seg.pt { background: linear-gradient(90deg, #fb923c, #ea580c); }
.cmp-seg.tds { background: linear-gradient(90deg, #d97706, #b45309); }
.cmp-seg.take { background: linear-gradient(90deg, #10b981, #34d399); }
.cmp-legend { display: flex; flex-wrap: wrap; gap: 14px; font-size: 11px; color: var(--set-text-muted); align-items: center; }
.cmp-legend span { display: inline-flex; align-items: center; gap: 5px; }
.cmp-legend i.d { width: 10px; height: 10px; border-radius: 3px; }
.cmp-legend i.pf { background: #fbbf24; } .cmp-legend i.esi { background: #34d399; } .cmp-legend i.pt { background: #fb923c; } .cmp-legend i.tds { background: #d97706; } .cmp-legend i.take { background: #10b981; }
.cmp-legend-note { margin-left: auto; font-style: italic; color: var(--set-text-dim); }

/* families */
.cmp-fam { display: flex; flex-direction: column; gap: 11px; }
.cmp-fam-head { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--set-text-secondary); }
.cmp-fam-head :deep(svg) { color: var(--c, var(--set-ok)); }
.cmp-fam-head.ignored { color: var(--set-conflict); } .cmp-fam-head.ignored :deep(svg) { color: var(--set-conflict); }
.cmp-fam-head .set-mono { margin-left: auto; color: var(--set-text-dim); font-size: 11px; }
.cmp-ignored-note { display: flex; align-items: center; gap: 7px; margin: 0 0 2px; font-size: 11px; color: var(--set-text-muted); padding: 9px 12px; border-radius: 11px; background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 24%, transparent); }
.cmp-ignored-note :deep(svg) { color: var(--set-conflict); flex-shrink: 0; }
.cmp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 13px; }
.cmp-cardskel { position: relative; overflow: hidden; height: 150px; border-radius: 15px; background: var(--set-surface); border: 1px solid var(--set-border); animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.06s); }
.cmp-skel-beam { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(52,211,153,0.08) 50%, transparent 70%); background-size: 220% 100%; animation: set-sheen 1.5s ease infinite; }

@media (prefers-reduced-motion: reduce) { .cmp-seg, .cmp-cov-fill { transition: none; } .cmp-cardskel, .cmp-skel-beam { animation: none; } }
</style>
