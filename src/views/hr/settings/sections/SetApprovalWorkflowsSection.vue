<template>
  <div class="aw">
    <SetSectionHead eyebrow="Automation · Routing" title="Approval" accent="Workflows"
      accent-color="var(--set-orange)" :icon="Workflow"
      sub="A switchboard for every approval signal. Design the relay each request travels — origin to verdict. Changes apply to new requests; in-flight ones keep the chain they were submitted under.">
      <template #actions>
        <button class="set-btn set-btn-steel" :disabled="loading" @click="reload" title="Refresh">
          <RefreshCw :size="14" :class="{ 'set-spin': loading }" />
        </button>
      </template>

      <!-- signature instrument: the routing bus (also the channel selector) -->
      <div class="bus" role="tablist">
        <button v-for="m in modules" :key="m.module" class="bus-line" :class="{ on: activeModule === m.module }"
          :style="{ '--acc': moduleAccent(m.module) }" role="tab" :aria-selected="activeModule === m.module"
          @click="selectModule(m.module)">
          <span class="bus-glyph"><component :is="moduleIcon(m.module)" :size="16" /></span>
          <span class="bus-meta">
            <b>{{ m.label }}</b>
            <span>{{ m.policies.length }} {{ m.policies.length === 1 ? 'policy' : 'policies' }} · {{ moduleStages(m) }} stages</span>
          </span>
          <span class="bus-live"><span class="bus-live-dot" /> Live</span>
          <span class="bus-track" aria-hidden="true">
            <span class="bus-flow" />
            <i v-for="k in 4" :key="k" class="bus-dot" :style="{ '--d': (k * 0.9) + 's' }" />
          </span>
        </button>
      </div>
    </SetSectionHead>

    <!-- loading -->
    <div v-if="loading" class="aw-skel"><span class="aw-skel-beam" /></div>

    <template v-else-if="activeMod">
      <!-- policy roster strip -->
      <div class="roster">
        <header class="roster-head">
          <span class="roster-title"><component :is="moduleIcon(activeModule)" :size="13" /> {{ activeMod.label }} policies</span>
          <span class="roster-hint">{{ activeMod.policies.length }} routable</span>
        </header>
        <div v-if="activeMod.policies.length" class="roster-rail">
          <Motion v-for="(p, i) in activeMod.policies" :key="p.id" as="button" type="button"
            class="rchip" :class="{ on: p.id === activePolicyId }"
            :initial="reduced ? false : { opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.4, delay: 0.04 + i * 0.04, ease: [0.16, 1, 0.3, 1] }"
            :whileHover="{ y: -2 }" @click="selectPolicy(p)">
            <span class="rchip-dot" :data-on="p.is_active" />
            <span class="rchip-body">
              <b>{{ p.label }}</b>
              <span>{{ chainLen(p) }} stage{{ chainLen(p) === 1 ? '' : 's' }}</span>
            </span>
            <span class="rchip-tag" :data-default="p.uses_default">{{ p.uses_default ? 'Default' : 'Custom' }}</span>
          </Motion>
        </div>
        <p v-else class="roster-empty">No {{ activeMod.label.toLowerCase() }} policies exist yet — create one in the {{ activeMod.label }} module first.</p>
      </div>

      <!-- builder + intelligence -->
      <div v-if="activePolicy" class="aw-grid">
        <!-- ── RELAY BUILDER ── -->
        <section class="relay-wrap">
          <header class="relay-head">
            <div class="relay-head-id">
              <span class="relay-id-dot" :data-on="activePolicy.is_active" />
              <div>
                <b>{{ activePolicy.label }}</b>
                <span class="relay-id-sub">{{ workingChain.length }} stage{{ workingChain.length === 1 ? '' : 's' }} · {{ isCustom ? 'custom routing' : 'system default' }}</span>
              </div>
            </div>
            <div class="relay-head-tools">
              <Motion as="button" type="button" class="set-btn set-btn-ghost" :class="{ disabled: dispatching || !workingChain.length }"
                :whileHover="(dispatching || !workingChain.length) ? {} : { y: -2 }" :whileTap="{ scale: 0.96 }"
                :disabled="dispatching || !workingChain.length" @click="dispatch">
                <Send :size="13" /> Dispatch test
              </Motion>
              <Motion as="button" type="button" class="set-btn set-btn-primary" :whileHover="{ y: -2, scale: 1.04 }" :whileTap="{ scale: 0.95 }" @click="addStage">
                <Plus :size="14" /> Add stage
              </Motion>
            </div>
          </header>

          <!-- the relay -->
          <div class="relay" :class="{ dispatching }">
            <span class="relay-grain" aria-hidden="true" />
            <div class="relay-track">
              <!-- origin -->
              <div class="rnode origin" :class="{ pinged: dispatching }">
                <span class="rnode-ic"><User :size="15" /></span>
                <b>Employee</b><i>submits</i>
              </div>

              <template v-if="workingChain.length">
                <template v-for="(st, i) in workingChain" :key="i">
                  <span class="conduit" :class="{ surge: dispatching && dispatchPos === i, done: dispatchPos > i }" aria-hidden="true">
                    <span class="conduit-flow" /><span class="conduit-packet" />
                  </span>
                  <ApprovalGate :stage="st" :index="i" :total="workingChain.length"
                    :approver-types="activeMod.approver_types" :supports-amounts="activeMod.supports_amounts"
                    :lit="dispatchPos > i" :active="dispatching && dispatchPos === i"
                    @patch="patchStage(i, $event)" @remove="removeStage(i)" @move="moveStage(i, $event)" />
                </template>
                <span class="conduit" :class="{ surge: dispatching && dispatchPos === workingChain.length, done: dispatchPos > workingChain.length }" aria-hidden="true">
                  <span class="conduit-flow" /><span class="conduit-packet" />
                </span>
              </template>

              <!-- empty: prompt to add the first gate -->
              <template v-else>
                <span class="conduit" aria-hidden="true"><span class="conduit-flow" /></span>
                <button type="button" class="relay-empty" @click="addStage">
                  <Plus :size="18" /><b>Add the first stage</b>
                  <span>With no stages this policy uses the {{ activeMod.label }} system default ({{ activeMod.default_chain.length }} stage{{ activeMod.default_chain.length === 1 ? '' : 's' }}).</span>
                </button>
                <span class="conduit" aria-hidden="true"><span class="conduit-flow" /></span>
              </template>

              <!-- terminus -->
              <div class="rnode term" :class="{ sealed: dispatchPos > workingChain.length }">
                <span class="rnode-ic"><CheckCheck :size="15" /></span>
                <b>Approved</b><i>{{ dispatchPos > workingChain.length ? 'sealed' : 'verdict' }}</i>
              </div>
            </div>
          </div>

          <!-- footer actions -->
          <footer class="relay-foot">
            <span v-if="dirty" class="relay-dirty"><span class="relay-dirty-dot" /> Unsaved routing</span>
            <span v-else class="relay-saved"><Check :size="12" /> All changes saved</span>

            <button v-if="dirty" class="set-btn set-btn-ghost" :disabled="saving" @click="resetChain">
              <Undo2 :size="13" /> Discard edits
            </button>
            <button v-if="isCustom" class="set-btn aw-revert" :disabled="saving" @click="resetOpen = true">
              <RotateCcw :size="13" /> Revert to default
            </button>
            <Motion as="button" type="button" class="set-btn set-btn-primary" :class="{ disabled: !dirty || saving }"
              :whileHover="(!dirty || saving) ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
              :disabled="!dirty || saving" @click="save">
              <Loader v-if="saving" :size="14" class="set-spin" /><Save v-else :size="14" /> Save routing
            </Motion>
          </footer>
        </section>

        <!-- ── ROUTING INTELLIGENCE ── -->
        <aside class="intel">
          <header class="intel-head"><Activity :size="14" /> Routing intelligence</header>

          <!-- depth + composition -->
          <div class="intel-card">
            <div class="intel-depth">
              <span class="intel-depth-n"><SetCountUp :value="workingChain.length" /></span>
              <span class="intel-depth-lab">approval stage{{ workingChain.length === 1 ? '' : 's' }}</span>
            </div>
            <div v-if="approverMix.length" class="intel-mix">
              <div v-for="a in approverMix" :key="a.type" class="intel-mix-row">
                <span class="intel-mix-ic" :style="{ '--acc': a.color }"><component :is="a.icon" :size="12" /></span>
                <span class="intel-mix-lab">{{ a.label }}</span>
                <span class="intel-mix-bar"><span :style="{ width: (a.count / workingChain.length * 100) + '%', background: a.color }" /></span>
                <b>{{ a.count }}</b>
              </div>
            </div>
            <p v-else class="intel-empty">No stages — {{ activeMod.label }} falls back to its built-in default chain.</p>
          </div>

          <!-- amount gates -->
          <div v-if="activeMod.supports_amounts" class="intel-card">
            <header class="intel-card-head"><IndianRupee :size="12" /> Amount gates</header>
            <p v-if="!amountGates.length" class="intel-note">Every stage applies to all amounts. Add a threshold on a stage to skip it for small requests.</p>
            <div v-else class="intel-gates">
              <div v-for="(g, i) in amountGates" :key="i" class="intel-gate">
                <component :is="approverMeta(g.approver_type).icon" :size="12" :style="{ color: approverMeta(g.approver_type).color }" />
                <span>{{ g.label || approverMeta(g.approver_type).label }}</span>
                <b>≥ ₹{{ Number(g.min_amount).toLocaleString('en-IN') }}</b>
              </div>
            </div>
          </div>

          <!-- connectivity map (the honest wiring) -->
          <div class="intel-card">
            <header class="intel-card-head"><Share2 :size="12" /> Where routing is wired</header>
            <div class="conn">
              <button v-for="c in CONNECTIVITY" :key="c.slug" class="conn-row" :data-state="c.state"
                :class="{ here: c.slug === activeModule }" @click="goModule(c.to)">
                <span class="conn-ic"><component :is="c.icon" :size="13" /></span>
                <span class="conn-body">
                  <b>{{ c.label }}</b>
                  <span>{{ c.note }}</span>
                </span>
                <span class="conn-state">
                  <component :is="c.state === 'live' ? Zap : (c.state === 'fixed' ? Lock : CircleDashed)" :size="11" />
                  {{ c.state === 'live' ? 'Configurable' : (c.state === 'fixed' ? 'Fixed' : 'No chain') }}
                </span>
              </button>
            </div>
            <p class="intel-foot">Only Live channels are designed here. Training routing is fixed in code; Exit is governed by clearance &amp; settlement.</p>
          </div>

          <!-- pair with notifications -->
          <button class="intel-pair" @click="$emit('go', 'notification-rules')">
            <BellRing :size="13" />
            <span><b>Pair with Notification Rules</b><i>Decide who gets pinged at each stage</i></span>
            <ArrowUpRight :size="13" />
          </button>
        </aside>
      </div>

      <!-- no policy selected -->
      <SetEmptyState v-else :icon="Workflow" accent-color="var(--set-orange)"
        title="Pick a policy to wire its relay"
        :sub="`Select one of the ${activeMod.label} policies above to design the chain a request travels through.`" />
    </template>

    <!-- revert / default modal -->
    <ApprovalResetModal :open="resetOpen" :loading="reverting" :policy="activePolicy"
      :module-slug="activeModule" :module-label="activeMod?.label || ''"
      :current-chain="savedChain" :default-chain="activeMod?.default_chain || []"
      @close="resetOpen = false" @confirm="confirmReset" @go="goModuleSlug" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  Workflow, RefreshCw, Plus, RotateCcw, Save, Loader, Undo2, User, CheckCheck, Check,
  Send, Activity, Share2, Zap, Lock, CircleDashed, IndianRupee, BellRing, ArrowUpRight,
  CalendarDays, Plane, Receipt, GraduationCap, DoorOpen,
} from 'lucide-vue-next'
import SetSectionHead from '../components/SetSectionHead.vue'
import SetEmptyState from '../components/SetEmptyState.vue'
import SetCountUp from '../components/SetCountUp.vue'
import ApprovalGate from '../components/ApprovalGate.vue'
import ApprovalResetModal from '../components/ApprovalResetModal.vue'
import { approverMeta } from '../components/approverMeta'
import { MODULES } from '../components/connectivity'
import { listApprovalWorkflows, updateApprovalChain, errText } from '../composables/useHrSettings'
import { prefersReduced } from '@/composables/useShiftMotion'

defineEmits(['go'])
const router = useRouter()
const toast = useToast()
const reduced = prefersReduced()

const loading = ref(false)
const saving = ref(false)
const reverting = ref(false)
const resetOpen = ref(false)
const modules = ref([])
const activeModule = ref(null)
const activePolicyId = ref(null)
const workingChain = ref([])
const originalSnapshot = ref('[]')

// ── module presentation ──────────────────────────────────────────────────────
const MODULE_ICON = { leave: CalendarDays, travel: Plane, reimbursement: Receipt }
const MODULE_ACCENT = { leave: 'var(--set-orange)', travel: 'var(--set-amber)', reimbursement: 'var(--set-gold)' }
const moduleIcon = (slug) => MODULE_ICON[slug] || Workflow
const moduleAccent = (slug) => MODULE_ACCENT[slug] || 'var(--set-orange)'

// the honest connectivity map — leave/travel/reimbursement consume chains at
// submit (snapshotted onto each request); training is hardcoded; exit has none.
const CONNECTIVITY = [
  { slug: 'leave', label: 'Leave', icon: CalendarDays, state: 'live', note: 'Every leave request routes through its policy chain', to: MODULES.leave.to },
  { slug: 'travel', label: 'Travel', icon: Plane, state: 'live', note: 'Amount-aware routing per grade policy', to: MODULES.travel.to },
  { slug: 'reimbursement', label: 'Reimbursement', icon: Receipt, state: 'live', note: 'Amount-aware routing per claim category', to: MODULES.reimbursements.to },
  { slug: 'training', label: 'Training', icon: GraduationCap, state: 'fixed', note: 'Manager → HR, fixed in code (not editable here)', to: MODULES.training.to },
  { slug: 'exit', label: 'Exit', icon: DoorOpen, state: 'none', note: 'Governed by clearance & settlement — no approval chain', to: MODULES.exit.to },
]

async function reload() {
  loading.value = true
  try {
    const data = await listApprovalWorkflows()
    modules.value = data.modules || []
    if (activeModule.value && modules.value.some(m => m.module === activeModule.value)) selectModule(activeModule.value)
    else if (modules.value.length) selectModule(modules.value[0].module)
  } catch (e) { toast.error(errText(e, 'Failed to load approval workflows')) }
  finally { loading.value = false }
}
onMounted(reload)
onBeforeUnmount(() => clearTimeout(dispatchTimer))

const activeMod = computed(() => modules.value.find(m => m.module === activeModule.value) || null)
const activePolicy = computed(() => activeMod.value?.policies.find(p => p.id === activePolicyId.value) || null)
const chainLen = (p) => (p.approval_chain && p.approval_chain.length) ? p.approval_chain.length : (activeMod.value?.default_chain?.length || 0)

// the SAVED chain on the active policy (drives the revert modal + custom flag)
const savedChain = computed(() => {
  const p = activePolicy.value
  if (!p) return []
  return (p.approval_chain && p.approval_chain.length) ? p.approval_chain : (activeMod.value?.default_chain || [])
})
const isCustom = computed(() => !!(activePolicy.value?.approval_chain && activePolicy.value.approval_chain.length))

function selectModule(slug) {
  activeModule.value = slug
  const m = modules.value.find(x => x.module === slug)
  const first = m?.policies?.[0]
  if (first) selectPolicy(first)
  else { activePolicyId.value = null; workingChain.value = [] }
}
function selectPolicy(p) {
  stopDispatch()
  activePolicyId.value = p.id
  const base = (p.approval_chain && p.approval_chain.length) ? p.approval_chain : (activeMod.value?.default_chain || [])
  workingChain.value = base.map(s => ({
    approver_type: s.approver_type,
    label: s.label || approverMeta(s.approver_type).label,
    min_amount: s.min_amount ?? null,
    approver_user_id: s.approver_user_id ?? null,   // preserve a pinned "Specific person"
  }))
  originalSnapshot.value = JSON.stringify(workingChain.value)
}

const dirty = computed(() => JSON.stringify(workingChain.value) !== originalSnapshot.value)

// ── chain editing ────────────────────────────────────────────────────────────
function addStage() {
  stopDispatch()
  const t = activeMod.value?.approver_types?.[0] || 'MANAGER'
  workingChain.value.push({ approver_type: t, label: approverMeta(t).label, min_amount: null, approver_user_id: null })
}
function patchStage(i, patch) { Object.assign(workingChain.value[i], patch) }
function removeStage(i) { stopDispatch(); workingChain.value.splice(i, 1) }
function moveStage(i, dir) {
  const j = i + dir
  if (j < 0 || j >= workingChain.value.length) return
  const arr = workingChain.value
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
}
function resetChain() { workingChain.value = JSON.parse(originalSnapshot.value) }

// ── routing intelligence ─────────────────────────────────────────────────────
const approverMix = computed(() => {
  const counts = {}
  for (const s of workingChain.value) counts[s.approver_type] = (counts[s.approver_type] || 0) + 1
  return Object.entries(counts).map(([type, count]) => ({ type, count, ...approverMeta(type) }))
})
const amountGates = computed(() => workingChain.value.filter(s => s.min_amount != null && s.min_amount !== ''))
const moduleStages = (m) => m.policies.reduce((sum, p) =>
  sum + ((p.approval_chain && p.approval_chain.length) ? p.approval_chain.length : (m.default_chain?.length || 0)), 0)

// ── dispatch simulation ──────────────────────────────────────────────────────
const dispatching = ref(false)
const dispatchPos = ref(-1)
let dispatchTimer = null
function stopDispatch() { clearTimeout(dispatchTimer); dispatching.value = false; dispatchPos.value = -1 }
function dispatch() {
  if (!workingChain.value.length) return
  stopDispatch()
  const n = workingChain.value.length
  dispatching.value = true
  dispatchPos.value = 0
  const stepMs = reduced ? 220 : 680
  const step = () => {
    if (dispatchPos.value > n) {                 // sealed — hold, then reset
      dispatchTimer = setTimeout(stopDispatch, reduced ? 400 : 1300)
      return
    }
    dispatchPos.value += 1
    dispatchTimer = setTimeout(step, stepMs)
  }
  dispatchTimer = setTimeout(step, stepMs)
}

// ── persistence ──────────────────────────────────────────────────────────────
function buildChainPayload() {
  return workingChain.value.map(s => ({
    approver_type: s.approver_type,
    label: s.label || approverMeta(s.approver_type).label,
    min_amount: (s.min_amount === '' || s.min_amount == null) ? null : Number(s.min_amount),
    // a pinned person is only meaningful on a USER stage; clear it otherwise
    approver_user_id: s.approver_type === 'USER' ? (s.approver_user_id || null) : null,
  }))
}
async function save() {
  if (!activePolicy.value || !dirty.value) return
  // every "Specific person" stage must actually name someone — otherwise the
  // consumer skips it at submit (an unresolvable step), making it a silent no-op.
  const missing = workingChain.value.findIndex(s => s.approver_type === 'USER' && !s.approver_user_id)
  if (missing !== -1) {
    toast.error(`Stage ${missing + 1}: choose the specific person who approves, or change its approver type.`)
    return
  }
  saving.value = true
  try {
    const chain = buildChainPayload()
    await updateApprovalChain(activeModule.value, activePolicyId.value, chain)
    if (activePolicy.value) activePolicy.value.approval_chain = chain
    originalSnapshot.value = JSON.stringify(workingChain.value)
    toast.success('Approval routing saved')
  } catch (e) { toast.error(errText(e, 'Failed to save routing')) }
  finally { saving.value = false }
}
async function confirmReset(reason) {
  if (!activePolicy.value) return
  reverting.value = true
  try {
    await updateApprovalChain(activeModule.value, activePolicyId.value, [], reason)
    if (activePolicy.value) { activePolicy.value.approval_chain = []; activePolicy.value.uses_default = true }
    selectPolicy(activePolicy.value)   // reflect default into the working chain + snapshot
    resetOpen.value = false
    toast.success(`${activeMod.value?.label} routing reverted to default`)
  } catch (e) { toast.error(errText(e, 'Failed to revert routing')) }
  finally { reverting.value = false }
}

// ── cross-links ──────────────────────────────────────────────────────────────
function goModule(to) { if (to) router.push(to) }
function goModuleSlug(slug) {
  const key = slug === 'reimbursement' ? 'reimbursements' : slug
  goModule(MODULES[key]?.to)
}
</script>

<style scoped>
.aw { display: flex; flex-direction: column; gap: 16px; }

/* ── routing bus (signature instrument + channel selector) ── */
.bus { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
@media (max-width: 760px) { .bus { grid-template-columns: 1fr; } }
.bus-line { position: relative; overflow: hidden; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px;
  padding: 12px 13px; border-radius: 14px; cursor: pointer; text-align: left; font: inherit;
  background: var(--set-panel); border: 1px solid var(--set-border); transition: border-color 0.3s var(--set-spring), background 0.3s, transform 0.3s var(--set-spring); }
.bus-line:hover { transform: translateY(-2px); border-color: var(--set-border-strong); }
.bus-line.on { border-color: color-mix(in srgb, var(--acc) 45%, transparent); background: color-mix(in srgb, var(--acc) 9%, var(--set-panel));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--acc) 22%, transparent), 0 16px 34px -26px var(--acc); }
.bus-glyph { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; color: var(--acc);
  background: color-mix(in srgb, var(--acc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--acc) 28%, transparent); }
.bus-meta { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.bus-meta b { font-size: 13px; font-weight: 800; color: var(--set-text); }
.bus-meta span { font-size: 10.5px; color: var(--set-text-muted); }
.bus-live { display: inline-flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--set-ok); padding: 3px 8px; border-radius: 999px; background: var(--set-ok-soft); border: 1px solid color-mix(in srgb, var(--set-ok) 26%, transparent); }
.bus-live-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--set-ok); box-shadow: 0 0 7px var(--set-ok); animation: set-led-pulse 2s ease-in-out infinite; }
.bus-track { grid-column: 1 / -1; position: relative; height: 3px; margin-top: 4px; border-radius: 2px; overflow: hidden; background: var(--set-trace-idle); }
.bus-flow { position: absolute; inset: 0; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--acc) 40%, transparent), transparent);
  background-size: 50% 100%; background-repeat: no-repeat; animation: bus-sweep 2.6s linear infinite; }
.bus-dot { position: absolute; top: 50%; left: 0; width: 5px; height: 5px; border-radius: 50%; transform: translateY(-50%);
  background: var(--acc); box-shadow: 0 0 8px var(--acc); animation: bus-ride 3.6s linear infinite; animation-delay: var(--d); opacity: 0; }
@keyframes bus-sweep { 0% { background-position: -60% 0; } 100% { background-position: 160% 0; } }
@keyframes bus-ride { 0% { left: -2%; opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } 100% { left: 102%; opacity: 0; } }

/* ── policy roster ── */
.roster { padding: 13px 14px; border-radius: 16px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); }
.roster-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.roster-title { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-secondary); }
.roster-title :deep(svg) { color: var(--set-orange); }
.roster-hint { font-size: 10.5px; color: var(--set-text-dim); }
.roster-rail { display: flex; gap: 9px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: thin; }
.rchip { flex: 0 0 auto; min-width: 178px; max-width: 240px; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 9px;
  padding: 10px 12px; border-radius: 13px; cursor: pointer; text-align: left; font: inherit;
  background: var(--set-panel); border: 1px solid var(--set-border); transition: border-color 0.25s, background 0.25s, box-shadow 0.25s; }
.rchip:hover { border-color: var(--set-border-strong); }
.rchip.on { border-color: color-mix(in srgb, var(--set-orange) 42%, transparent); background: color-mix(in srgb, var(--set-orange) 10%, var(--set-panel));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--set-orange) 20%, transparent); }
.rchip-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--set-unset); }
.rchip-dot[data-on="true"] { background: var(--set-ok); box-shadow: 0 0 8px var(--set-ok); }
.rchip-body { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.rchip-body b { font-size: 12.5px; font-weight: 700; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rchip-body span { font-size: 10px; color: var(--set-text-muted); }
.rchip-tag { font-size: 8.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; padding: 3px 8px; border-radius: 999px;
  color: var(--set-orange); background: color-mix(in srgb, var(--set-orange) 13%, transparent); border: 1px solid color-mix(in srgb, var(--set-orange) 28%, transparent); }
.rchip-tag[data-default="true"] { color: var(--set-text-muted); background: var(--set-surface-elevated); border-color: var(--set-border); }
.roster-empty { font-size: 12px; color: var(--set-text-dim); padding: 6px 2px; }

/* ── grid: builder + intelligence ── */
.aw-grid { display: grid; grid-template-columns: minmax(0, 1fr) 326px; gap: 16px; align-items: start; }
@media (max-width: 980px) { .aw-grid { grid-template-columns: 1fr; } }

/* relay wrapper */
.relay-wrap { display: flex; flex-direction: column; gap: 14px; padding: 16px; border-radius: 18px;
  background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); }
.relay-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.relay-head-id { display: flex; align-items: center; gap: 10px; min-width: 0; }
.relay-id-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; background: var(--set-unset); }
.relay-id-dot[data-on="true"] { background: var(--set-ok); box-shadow: 0 0 9px var(--set-ok); }
.relay-head-id b { font-size: 15px; font-weight: 800; color: var(--set-text); }
.relay-id-sub { display: block; font-size: 10.5px; color: var(--set-text-muted); margin-top: 1px; }
.relay-head-tools { display: inline-flex; align-items: center; gap: 8px; }

/* the relay track */
.relay { position: relative; overflow: hidden; border-radius: 16px; padding: 18px 14px; background: var(--set-panel); border: 1px solid var(--set-border); }
.relay-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(color-mix(in srgb, var(--set-orange) 5%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--set-orange) 5%, transparent) 1px, transparent 1px);
  background-size: 26px 26px; mask-image: radial-gradient(130% 120% at 0% 0%, #000 8%, transparent 70%);
  -webkit-mask-image: radial-gradient(130% 120% at 0% 0%, #000 8%, transparent 70%); }
.relay-track { position: relative; z-index: 1; display: flex; align-items: stretch; gap: 0; overflow-x: auto; padding: 6px 2px 10px; min-height: 240px; }

/* origin / terminus nodes */
.rnode { flex: 0 0 auto; align-self: center; display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 14px 16px; border-radius: 14px;
  background: var(--set-surface-elevated); border: 1px solid var(--set-border); min-width: 92px; transition: border-color 0.4s, box-shadow 0.4s; }
.rnode-ic { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; color: var(--set-text-muted);
  background: var(--set-surface); border: 1px solid var(--set-border); transition: all 0.4s; }
.rnode b { font-size: 11.5px; font-weight: 800; color: var(--set-text); }
.rnode i { font-style: normal; font-size: 8.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-dim); }
.rnode.origin { border-style: dashed; }
.rnode.origin.pinged .rnode-ic { color: var(--set-orange); border-color: color-mix(in srgb, var(--set-orange) 40%, transparent); box-shadow: 0 0 16px -6px var(--set-orange); }
.rnode.term .rnode-ic { color: var(--set-ok); border-color: color-mix(in srgb, var(--set-ok) 32%, transparent); }
.rnode.term.sealed { border-color: color-mix(in srgb, var(--set-ok) 50%, transparent); box-shadow: 0 0 26px -10px var(--set-ok); }
.rnode.term.sealed .rnode-ic { background: var(--set-ok); color: #06281c; box-shadow: 0 0 18px -3px var(--set-ok); }

/* conduits between nodes/gates */
.conduit { position: relative; flex: 0 0 40px; align-self: center; height: 3px; border-radius: 2px; background: var(--set-trace-idle); overflow: visible; }
.conduit-flow { position: absolute; inset: 0; border-radius: 2px; overflow: hidden;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--set-orange) 38%, transparent), transparent);
  background-size: 60% 100%; background-repeat: no-repeat; animation: cond-flow 2.4s linear infinite; }
.conduit.done { background: color-mix(in srgb, var(--set-ok) 32%, transparent); }
.conduit.done .conduit-flow { background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--set-ok) 42%, transparent), transparent); }
.conduit-packet { position: absolute; top: 50%; left: 0; width: 9px; height: 9px; border-radius: 50%; transform: translate(-50%, -50%);
  background: var(--set-gold); box-shadow: 0 0 12px var(--set-gold); opacity: 0; }
.conduit.surge .conduit-packet { animation: cond-surge 0.66s ease-in-out forwards; }
@keyframes cond-flow { 0% { background-position: -60% 0; } 100% { background-position: 160% 0; } }
@keyframes cond-surge { 0% { left: 0; opacity: 0; } 18% { opacity: 1; } 82% { opacity: 1; } 100% { left: 100%; opacity: 0; } }

/* empty-state add card */
.relay-empty { flex: 0 0 auto; align-self: center; display: flex; flex-direction: column; align-items: center; gap: 6px; max-width: 260px;
  padding: 22px 20px; border-radius: 16px; cursor: pointer; text-align: center; font: inherit;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px dashed var(--set-border-strong); transition: all 0.25s; }
.relay-empty:hover { color: var(--set-orange); border-color: color-mix(in srgb, var(--set-orange) 45%, transparent); }
.relay-empty :deep(svg) { color: var(--set-orange); }
.relay-empty b { font-size: 13px; font-weight: 800; color: var(--set-text); }
.relay-empty span { font-size: 10.5px; line-height: 1.45; }

/* footer */
.relay-foot { display: flex; align-items: center; gap: 10px; padding-top: 13px; border-top: 1px solid var(--set-border); }
.relay-dirty { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 600; color: var(--set-orange); margin-right: auto; }
.relay-dirty-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--set-orange); box-shadow: 0 0 8px var(--set-orange); animation: set-led-pulse 1.6s ease-in-out infinite; }
.relay-saved { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--set-text-dim); margin-right: auto; }
.relay-saved :deep(svg) { color: var(--set-ok); }
.aw-revert { color: var(--set-conflict); background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 30%, transparent); }
.aw-revert:hover:not(:disabled) { background: color-mix(in srgb, var(--set-conflict) 16%, transparent); }

/* ── intelligence panel ── */
.intel { display: flex; flex-direction: column; gap: 12px; position: sticky; top: 12px; }
.intel-head { display: inline-flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--set-text-secondary); }
.intel-head :deep(svg) { color: var(--set-orange); }
.intel-card { padding: 14px; border-radius: 15px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); }
.intel-card-head { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; color: var(--set-text-dim); margin-bottom: 10px; }
.intel-card-head :deep(svg) { color: var(--set-orange); }

.intel-depth { display: flex; align-items: baseline; gap: 8px; margin-bottom: 12px; }
.intel-depth-n { font-size: 30px; font-weight: 850; line-height: 1; color: var(--set-text); font-variant-numeric: tabular-nums;
  background: var(--set-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.intel-depth-lab { font-size: 11px; color: var(--set-text-muted); }
.intel-mix { display: flex; flex-direction: column; gap: 8px; }
.intel-mix-row { display: grid; grid-template-columns: auto 1fr auto auto; align-items: center; gap: 8px; }
.intel-mix-ic { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; color: var(--acc); background: color-mix(in srgb, var(--acc) 14%, transparent); }
.intel-mix-lab { font-size: 11.5px; font-weight: 600; color: var(--set-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.intel-mix-bar { width: 54px; height: 5px; border-radius: 3px; background: var(--set-trace-idle); overflow: hidden; }
.intel-mix-bar span { display: block; height: 100%; border-radius: 3px; transition: width 0.5s var(--set-spring); }
.intel-mix-row b { font-size: 11.5px; font-weight: 800; color: var(--set-text); min-width: 12px; text-align: right; }
.intel-empty, .intel-note { font-size: 11px; line-height: 1.5; color: var(--set-text-muted); margin: 0; }

.intel-gates { display: flex; flex-direction: column; gap: 7px; }
.intel-gate { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 8px; padding: 7px 9px; border-radius: 9px; background: var(--set-panel); border: 1px solid var(--set-border); }
.intel-gate span { font-size: 11.5px; font-weight: 600; color: var(--set-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.intel-gate b { font-size: 11px; font-weight: 800; color: var(--set-gold); }

/* connectivity */
.conn { display: flex; flex-direction: column; gap: 6px; }
.conn-row { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 9px; padding: 9px 10px; border-radius: 11px; cursor: pointer; text-align: left; font: inherit;
  background: var(--set-panel); border: 1px solid var(--set-border); border-left: 3px solid var(--set-unset); transition: all 0.2s; }
.conn-row:hover { border-color: var(--set-border-strong); transform: translateX(2px); }
.conn-row[data-state="live"] { border-left-color: var(--set-ok); }
.conn-row[data-state="fixed"] { border-left-color: var(--set-partial); }
.conn-row[data-state="none"] { border-left-color: var(--set-unset); }
.conn-row.here { background: color-mix(in srgb, var(--set-orange) 9%, var(--set-panel)); }
.conn-ic { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.conn-row[data-state="live"] .conn-ic { color: var(--set-ok); }
.conn-body { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.conn-body b { font-size: 12px; font-weight: 700; color: var(--set-text); }
.conn-body span { font-size: 10px; line-height: 1.35; color: var(--set-text-muted); }
.conn-state { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; align-self: flex-start; font-size: 8.5px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase;
  padding: 3px 7px; border-radius: 999px; color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.conn-row[data-state="live"] .conn-state { color: var(--set-ok); background: var(--set-ok-soft); border-color: color-mix(in srgb, var(--set-ok) 26%, transparent); }
.conn-row[data-state="fixed"] .conn-state { color: var(--set-partial); background: var(--set-partial-soft); border-color: color-mix(in srgb, var(--set-partial) 26%, transparent); }
.intel-foot { font-size: 10px; line-height: 1.5; color: var(--set-text-dim); margin: 10px 0 0; }

.intel-pair { display: flex; align-items: center; gap: 10px; padding: 12px 13px; border-radius: 13px; cursor: pointer; text-align: left; font: inherit;
  background: var(--set-surface); border: 1px solid var(--set-border); transition: all 0.22s; }
.intel-pair:hover { border-color: color-mix(in srgb, var(--set-gold) 40%, transparent); transform: translateY(-2px); box-shadow: var(--set-card-shadow-hover); }
.intel-pair > :deep(svg):first-child { color: var(--set-gold); flex-shrink: 0; }
.intel-pair span { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.intel-pair b { font-size: 12px; font-weight: 700; color: var(--set-text); }
.intel-pair i { font-style: normal; font-size: 10.5px; color: var(--set-text-muted); }
.intel-pair > :deep(svg):last-child { color: var(--set-text-dim); flex-shrink: 0; }

/* skeleton */
.aw-skel { position: relative; overflow: hidden; height: 360px; border-radius: 16px; background: var(--set-surface); border: 1px solid var(--set-border); }
.aw-skel-beam { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(251,191,36,0.08) 50%, transparent 70%); background-size: 220% 100%; animation: set-sheen 1.5s ease infinite; }

@media (prefers-reduced-motion: reduce) {
  .bus-flow, .bus-dot, .conduit-flow, .conduit.surge .conduit-packet, .bus-live-dot, .relay-dirty-dot, .aw-skel-beam { animation: none; }
}
</style>
