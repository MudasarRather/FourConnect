<template>
  <Teleport to="body">
    <Presence>
      <div v-if="open" class="exm-overlay" @mousedown.self="$emit('close')">
        <Motion as="div" class="exm ex-grain" :class="[`tone-${form.status.toLowerCase()}`, { sealing }]"
          :initial="reduced ? false : { opacity: 0, y: 30, scale: 0.95 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 20, scale: 0.97 }" :transition="{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }">
          <span class="exm-aura" aria-hidden="true" />
          <span class="exm-mesh" aria-hidden="true" />
          <span class="exm-grid" aria-hidden="true" />
          <span class="exm-sheen" aria-hidden="true" />
          <span v-if="sealing" class="exm-flash" aria-hidden="true" />
          <span v-if="sealing" class="exm-burst" aria-hidden="true" />

          <!-- ── header: persistent component motif + identity ── -->
          <header class="exm-head">
            <ClearanceMotif class="exm-motif" :kind="pb.motif" :hex="dept.hex" :tone="form.status" :size="62" />
            <div class="exm-htxt">
              <span class="exm-eyebrow"><component :is="dept.icon" :size="11" /> {{ dept.label }} gate · {{ item?.is_mandatory ? 'mandatory' : 'optional' }}</span>
              <h3 class="exm-title">{{ item?.title || 'Clearance item' }}</h3>
            </div>
            <span class="exm-seal-chip" :style="{ '--c': cur.hex }"><component :is="cur.icon" :size="12" /> {{ cur.label }}</span>
            <button class="exm-x" type="button" @click="$emit('close')"><X :size="17" /></button>
          </header>

          <!-- ── stepper ── -->
          <div class="exm-steps">
            <div class="step-rail"><span class="step-beam" :style="{ width: railPct + '%' }" /></div>
            <button v-for="(s, i) in STEPS" :key="s.key" type="button" class="step" :class="{ on: step === i, done: step > i }"
              @click="goStep(i)">
              <span class="step-node"><component :is="step > i ? Check : s.icon" :size="13" /></span>
              <span class="step-lab">{{ s.label }}</span>
            </button>
          </div>

          <!-- ── body: animated step panels ── -->
          <div class="exm-body">
            <Motion as="div" :key="step" class="panel"
              :initial="reduced ? false : { opacity: 0, x: dir * 26 }" :animate="{ opacity: 1, x: 0 }"
              :transition="{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }">

              <!-- STEP 1 · VERIFY -->
              <template v-if="step === 0">
                <div v-if="sysSig" class="sysbanner" :class="'sb-' + sysSig.state">
                  <span class="sb-ic"><component :is="sigBannerIcon" :size="16" /></span>
                  <div class="sb-txt">
                    <b>{{ sourceLabel }} check<span v-if="sysSig.auto" class="sb-auto">auto-sync</span></b>
                    <span>{{ sysSig.label }}<i v-if="sysSig.detail"> · {{ sysSig.detail }}</i></span>
                  </div>
                </div>
                <p class="brief">{{ pb.brief }}</p>
                <div v-if="pb.system" class="sysnote"><Sparkles :size="14" /><span>{{ pb.system }}</span></div>

                <!-- de-provisioning action (corporate IT/security offboarding) -->
                <div v-if="canRevoke" class="erp-act">
                  <div class="erp-lead">
                    <span class="erp-ico"><component :is="revokeIcon" :size="16" /></span>
                    <div class="erp-txt"><b>{{ revokeMeta.title }}</b><span>{{ revokeMeta.desc }}</span></div>
                  </div>
                  <div v-if="!confirmRevoke" class="erp-foot">
                    <button type="button" class="erp-btn" @click="confirmRevoke = true"><ShieldX :size="14" /> {{ revokeMeta.btn }}</button>
                  </div>
                  <div v-else class="erp-confirm">
                    <span class="erp-warn"><AlertTriangle :size="13" /> {{ revokeMeta.warn }}</span>
                    <div class="erp-confirm-acts">
                      <button type="button" class="erp-ghost" :disabled="busy" @click="confirmRevoke = false">Cancel</button>
                      <Motion as="button" type="button" class="erp-go" :disabled="busy" :whileTap="busy ? {} : { scale: 0.96 }" @click="$emit('revoke', item)">
                        <Loader2 v-if="busy" :size="14" class="spin" /><ShieldX v-else :size="14" /> Revoke &amp; clear
                      </Motion>
                    </div>
                  </div>
                </div>
                <div v-else-if="alreadyRevoked" class="erp-done"><ShieldCheck :size="14" /> {{ revokeMeta.doneLabel }} — sign off below to record it.</div>

                <!-- APPLY GATES (HR records / F&F ack): cinematic live-records console -->
                <ClearanceApplyConsole v-if="applyGate" :tasks="applyTasks" :checks="checks" :kind="pb.apply.kind"
                  :case-info="caseInfo" :signal="sysSig" :committing="sealing" :reduced="reduced" @toggle="toggle" />

                <!-- ALL OTHER GATES: verification checklist -->
                <template v-else>
                  <div class="chk-head">
                    <span class="chk-cap"><ShieldCheck :size="13" /> Verification checklist</span>
                    <span class="chk-count ex-mono">{{ doneCount }}/{{ pb.steps.length }}</span>
                    <button type="button" class="chk-all" :class="{ on: allVerified }" @click="markAll">
                      <component :is="allVerified ? CheckCheck : ListChecks" :size="12" /> {{ allVerified ? 'All verified' : 'Mark all' }}
                    </button>
                  </div>
                  <ul class="chk-list">
                    <Motion v-for="(s, i) in pb.steps" :key="i" as="li" class="chk" :class="{ on: checks[i] }"
                      :initial="reduced ? false : { opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0 }"
                      :transition="{ duration: 0.3, delay: 0.04 + i * 0.05, ease: [0.16, 1, 0.3, 1] }"
                      @click="toggle(i)">
                      <span class="chk-box"><svg viewBox="0 0 16 16" width="12" height="12"><polyline class="chk-tick" points="3.2,8.6 6.6,12 13,4.6" /></svg></span>
                      <span class="chk-txt">{{ s }}</span>
                    </Motion>
                  </ul>
                </template>
                <p v-if="item?.link" class="xlink" @click="goLink"><component :is="ArrowUpRight" :size="12" /> Open {{ item.link.label }}</p>
              </template>

              <!-- STEP 2 · DISPOSITION -->
              <template v-else-if="step === 1">
                <label class="fl">Set the gate disposition</label>
                <div class="seg">
                  <button v-for="s in STATUSES" :key="s.key" type="button" :class="{ on: form.status === s.key }"
                    :style="{ '--c': s.hex }" @click="form.status = s.key">
                    <component :is="s.icon" :size="15" /><span>{{ s.label }}</span>
                  </button>
                </div>

                <Motion v-if="form.status === 'BLOCKED'" as="div" class="sub-fld blocked"
                  :initial="reduced ? false : { opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }">
                  <label class="fl">Reason for blocking <i>required</i></label>
                  <div class="chips">
                    <button v-for="r in BLOCK_PRESETS" :key="r" type="button" class="chip" :class="{ on: form.blockedReason === r }" @click="form.blockedReason = r">{{ r }}</button>
                  </div>
                  <textarea v-model="form.blockedReason" rows="2" placeholder="Why is this gate blocked? Written to the audit trail…" />
                </Motion>

                <Motion v-if="pb.recovery" as="div" class="sub-fld"
                  :initial="reduced ? false : { opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }">
                  <label class="fl">{{ pb.recovery.label }} <i>feeds F&amp;F recoveries</i></label>
                  <div class="money"><span class="money-cur">₹</span><input v-model.number="form.recovery_amount" type="number" min="0" step="1" placeholder="0" /></div>
                  <span class="fl-hint"><HandCoins :size="11" /> {{ pb.recovery.hint }}</span>
                </Motion>
                <div v-else class="disp-note"><CircleSlash :size="13" /> No recovery charge applies to this obligation.</div>
              </template>

              <!-- STEP 3 · AUTHORIZE -->
              <template v-else>
                <label class="fl">Gate-keeper / accountable owner <i>optional</i></label>
                <ExSelect v-model="form.assignee_user_id" :options="userOpts" searchable placeholder="Unassigned" />

                <label class="fl" style="margin-top:13px">Sign-off note <i>optional</i></label>
                <div class="chips">
                  <button v-for="p in pb.presets" :key="p" type="button" class="chip soft" @click="addPreset(p)">{{ p }}</button>
                </div>
                <textarea v-model="form.note" rows="2" placeholder="Add a note for the audit trail…" />

                <!-- live no-dues certificate -->
                <div class="cert" :style="{ '--c': cur.hex }">
                  <span class="cert-grid" aria-hidden="true" />
                  <div class="cert-top">
                    <span class="cert-medal">{{ initials(caseInfo?.employee_name || caseInfo?.employee_code || dept.label) }}</span>
                    <div class="cert-id">
                      <span class="cert-name">{{ caseInfo?.employee_name || caseInfo?.employee_code || 'Clearance record' }}</span>
                      <span class="cert-meta ex-mono">{{ caseInfo?.case_number || '' }} · {{ dept.label }} no-dues</span>
                    </div>
                    <span class="cert-seal"><component :is="cur.icon" :size="18" /></span>
                  </div>
                  <span class="cert-item">{{ item?.title }}</span>
                  <div class="cert-tags">
                    <span class="cert-tag st"><component :is="cur.icon" :size="10" /> {{ cur.label }}</span>
                    <span v-if="form.status === 'CLEARED'" class="cert-tag ok"><ShieldCheck :size="10" /> {{ doneCount }}/{{ pb.steps.length }} verified</span>
                    <span v-if="form.recovery_amount > 0" class="cert-tag rec"><HandCoins :size="10" /> {{ fmtINR(form.recovery_amount) }} → F&F</span>
                    <span v-if="assigneeLabel" class="cert-tag asg"><UserCheck :size="10" /> {{ assigneeLabel }}</span>
                  </div>
                </div>
              </template>
            </Motion>
          </div>

          <!-- ── footer ── -->
          <footer class="exm-foot">
            <button v-if="step > 0" class="exm-btn ghost" type="button" @click="back"><ChevronLeft :size="15" /> Back</button>
            <button v-else class="exm-btn ghost" type="button" @click="$emit('close')">Cancel</button>
            <span class="foot-spacer" />
            <span v-if="step === 2 && sealHint" class="seal-hint"><AlertTriangle :size="12" /> {{ sealHint }}</span>
            <Motion v-if="step < 2" as="button" type="button" class="exm-btn primary" :class="`go-${form.status.toLowerCase()}`"
              :whileHover="reduced ? {} : { y: -1 }" :whileTap="{ scale: 0.97 }" @click="next">
              Continue <ChevronRight :size="15" />
            </Motion>
            <Motion v-else as="button" type="button" class="exm-btn seal" :class="`go-${form.status.toLowerCase()}`"
              :disabled="!canSeal" :whileHover="canSeal ? { y: -1 } : {}" :whileTap="canSeal ? { scale: 0.96 } : {}" @click="submit">
              <Loader2 v-if="busy" :size="15" class="spin" /><component v-else :is="cur.icon" :size="15" />
              {{ sealLabel }}
            </Motion>
          </footer>
        </Motion>
      </div>
    </Presence>
  </Teleport>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  X, Check, CheckCheck, ListChecks, ChevronLeft, ChevronRight, ArrowUpRight,
  Hourglass, Activity, LockKeyhole, CircleSlash, HandCoins, UserCheck,
  ShieldCheck, ShieldX, KeyRound, Stamp, Gavel, Sparkles, AlertTriangle, Loader2,
} from 'lucide-vue-next'
import ExSelect from '../components/ExSelect.vue'
import ClearanceMotif from '../components/ClearanceMotif.vue'
import ClearanceApplyConsole from '../components/ClearanceApplyConsole.vue'
import { clearanceDeptMeta, clearanceItemPlaybook, fmtINR, initials } from '@/composables/useExit'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  item: { type: Object, default: null },
  users: { type: Array, default: () => [] },
  caseInfo: { type: Object, default: null },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'submit', 'go', 'revoke'])
const reduced = prefersReduced()

const STATUSES = [
  { key: 'PENDING', label: 'Pending', hex: '#9ca3af', icon: Hourglass },
  { key: 'IN_PROGRESS', label: 'In progress', hex: '#fbbf24', icon: Activity },
  { key: 'CLEARED', label: 'Cleared', hex: '#34d399', icon: Check },
  { key: 'BLOCKED', label: 'Blocked', hex: '#ef4444', icon: LockKeyhole },
  { key: 'NA', label: 'N/A', hex: '#6b7280', icon: CircleSlash },
]
const ST_BY = Object.fromEntries(STATUSES.map(s => [s.key, s]))
const STEPS = [
  { key: 'verify', label: 'Verify', icon: ShieldCheck },
  { key: 'disposition', label: 'Disposition', icon: Gavel },
  { key: 'authorize', label: 'Authorize', icon: Stamp },
]
const BLOCK_PRESETS = ['Asset not returned', 'Dues outstanding', 'Documents pending', 'Awaiting handover', 'Needs re-verification']

const step = ref(0)
const dir = ref(1)
const sealing = ref(false)
const checks = ref([])
const form = reactive({ status: 'CLEARED', note: '', recovery_amount: null, assignee_user_id: '', blockedReason: '' })

const pb = computed(() => clearanceItemPlaybook(props.item?.item_key, props.item?.department))
const dept = computed(() => clearanceDeptMeta(props.item?.department))
// Gates whose marked tasks WRITE to real records (Employee record / F&F settlement).
const applyGate = computed(() => !!pb.value.apply)
const applyTasks = computed(() => pb.value.apply?.tasks || [])

const SRC_LABEL = { account: 'Account Provisioning', provisioning: 'Account Provisioning', asset: 'Asset module', reimbursement: 'Reimbursements', interview: 'Exit Interviews', advance: 'Travel advances' }
const sysSig = computed(() => props.item?.system_signal || null)
const sourceLabel = computed(() => SRC_LABEL[sysSig.value?.source] || 'System')
const sigBannerIcon = computed(() => sysSig.value?.state === 'satisfied' ? ShieldCheck : sysSig.value?.state === 'attention' ? AlertTriangle : Hourglass)

// De-provisioning action — ERP disables sign-in on the linked User; the other
// IT/Security gates flip their Account Provisioning row to REVOKED. Both then
// sign off the gate. 'Revoke access' DOES the work, it doesn't just tick a box.
const PROV_LABELS = {
  it_email_revoke: 'Email / SSO', it_vpn_revoke: 'VPN access',
  it_repo_access: 'Repo / code access', sec_biometric: 'Biometric enrolment', adm_access_card: 'Access card',
}
const confirmRevoke = ref(false)
const revokeKind = computed(() => props.item?.item_key === 'it_erp_login' ? 'erp' : (PROV_LABELS[props.item?.item_key] ? 'prov' : null))
const provLabel = computed(() => PROV_LABELS[props.item?.item_key] || 'access')
const revokeIcon = computed(() => (revokeKind.value === 'erp' ? KeyRound : ShieldX))
const revokeMeta = computed(() => (revokeKind.value === 'erp'
  ? { title: 'Revoke ERP login & credentials', desc: 'Disables sign-in immediately, clears the activation gate and ends the session — then signs off this gate.', btn: 'Revoke ERP login now', warn: 'This disables the account & ends sessions. Continue?', doneLabel: 'ERP login already revoked' }
  : { title: `Revoke ${provLabel.value}`, desc: `Marks ${provLabel.value} de-provisioned in Account Provisioning, then signs off this gate.`, btn: `Revoke ${provLabel.value} now`, warn: `This marks ${provLabel.value} de-provisioned. Continue?`, doneLabel: `${provLabel.value} already revoked` }))
const sigSatisfied = computed(() => ['account', 'provisioning'].includes(sysSig.value?.source) && sysSig.value?.state === 'satisfied')
const canRevoke = computed(() => !!revokeKind.value && props.item?.status !== 'CLEARED' && !sigSatisfied.value)
const alreadyRevoked = computed(() => !!revokeKind.value && sigSatisfied.value && props.item?.status !== 'CLEARED')
const cur = computed(() => ST_BY[form.status] || STATUSES[0])
const userOpts = computed(() => [{ value: '', label: 'Unassigned' }, ...props.users])
const assigneeLabel = computed(() => props.users.find(u => u.value === form.assignee_user_id)?.label || '')
const doneCount = computed(() => checks.value.filter(Boolean).length)
const allVerified = computed(() => pb.value.steps.length > 0 && checks.value.length >= pb.value.steps.length && pb.value.steps.every((_, i) => checks.value[i]))
const railPct = computed(() => (step.value / (STEPS.length - 1)) * 100)

const canSeal = computed(() => {
  if (props.busy) return false
  if (form.status === 'CLEARED' && !allVerified.value) return false
  if (form.status === 'BLOCKED' && !form.blockedReason.trim()) return false
  return true
})
const sealHint = computed(() => {
  if (form.status === 'CLEARED' && !allVerified.value) return `Verify all ${pb.value.steps.length} steps to clear`
  if (form.status === 'BLOCKED' && !form.blockedReason.trim()) return 'A blocking reason is required'
  return ''
})
const sealLabel = computed(() => {
  if (form.status === 'CLEARED') return 'Seal & sign off'
  if (form.status === 'BLOCKED') return 'Record block'
  return 'Save status'
})

const toggle = (i) => { checks.value[i] = !checks.value[i] }
const markAll = () => { const v = !allVerified.value; checks.value = pb.value.steps.map(() => v) }
const addPreset = (p) => { form.note = form.note ? `${form.note.trim()} · ${p}` : p }
const goStep = (i) => { dir.value = i > step.value ? 1 : -1; step.value = i }
const next = () => { if (step.value < 2) { dir.value = 1; step.value++ } }
const back = () => { if (step.value > 0) { dir.value = -1; step.value-- } }
const goLink = () => { if (props.item?.link) { emit('go', { tab: props.item.link.tab }); emit('close') } }

watch(() => props.open, (o) => {
  if (!o || !props.item) return
  const it = props.item
  step.value = 0; dir.value = 1; sealing.value = false; confirmRevoke.value = false
  form.status = it.status === 'PENDING' ? 'CLEARED' : it.status
  form.recovery_amount = it.recovery_amount != null ? Number(it.recovery_amount) : null
  form.assignee_user_id = it.assignee_user_id || ''
  // parse stored remarks → blocked reason + free note (strip audit tags)
  let raw = (it.remarks || '').replace(/\n?\[Reopened\][\s\S]*/g, '').trim()
  const bm = raw.match(/\[Blocked\]\s*([^\n]*)/i)
  form.blockedReason = bm ? bm[1].trim() : ''
  form.note = raw.replace(/\[Blocked\][^\n]*\n?/i, '').trim()
  // an already-cleared item is treated as fully verified for a quick re-seal
  checks.value = pb.value.steps.map(() => it.status === 'CLEARED')
}, { immediate: true })

// reset the seal-flash once an async submit settles while the modal stays open
// (e.g. a save error) so a retry replays the ceremony cleanly
watch(() => props.busy, (b, prev) => { if (prev && !b) sealing.value = false })

const buildRemarks = () => {
  const parts = []
  if (form.status === 'BLOCKED' && form.blockedReason.trim()) parts.push(`[Blocked] ${form.blockedReason.trim()}`)
  if (form.note.trim()) parts.push(form.note.trim())
  return parts.join('\n') || null
}
const submit = () => {
  if (!canSeal.value) return
  sealing.value = true
  const payload = {
    status: form.status,
    remarks: buildRemarks(),
    recovery_amount: form.recovery_amount || null,
    assignee_user_id: form.assignee_user_id || null,
  }
  // Apply gates that are being CLEARED route to the apply endpoints, which write
  // the marked tasks to the real records. Other dispositions (BLOCKED / NA) and
  // every non-apply gate keep the plain status update.
  if (applyGate.value && form.status === 'CLEARED') {
    payload.applyKind = pb.value.apply.kind
    payload.tasks = {}
    applyTasks.value.forEach((t, i) => { payload.tasks[t.key] = !!checks.value[i] })
    // finance gate: the Disposition ₹ captures a non-travel loan → loan_recovery
    if (pb.value.apply.kind === 'fin') payload.loan_recovery_amount = form.recovery_amount || 0
  }
  emit('submit', payload)
}
</script>

<style scoped>
.exm-overlay { position: fixed; inset: 0; z-index: 1440; display: grid; place-items: center; padding: 20px;
  background: rgba(6, 5, 10, 0.66); backdrop-filter: blur(9px); -webkit-backdrop-filter: blur(9px); }
[data-theme="light"] .exm-overlay { background: rgba(60, 45, 20, 0.34); }
.exm { position: relative; overflow: hidden; width: min(560px, 96vw); max-height: 92vh; display: flex; flex-direction: column;
  border-radius: 24px; background: var(--ex-surface-elevated); border: 1px solid var(--ex-border-strong);
  box-shadow: var(--ex-shadow); transition: border-color 0.45s; }
.exm.tone-cleared { border-color: color-mix(in srgb, var(--ex-cleared) 34%, transparent); }
.exm.tone-blocked { border-color: color-mix(in srgb, var(--ex-blocked) 34%, transparent); }
.exm-aura { position: absolute; inset: -55% 20% 55% -12%; pointer-events: none; transition: background 0.45s;
  background: radial-gradient(60% 80% at 32% 0%, rgba(251, 146, 60, 0.16), transparent 70%); }
.exm.tone-cleared .exm-aura { background: radial-gradient(60% 80% at 32% 0%, rgba(52, 211, 153, 0.18), transparent 70%); }
.exm.tone-blocked .exm-aura { background: radial-gradient(60% 80% at 32% 0%, rgba(239, 68, 68, 0.17), transparent 70%); }
/* drifting mesh — layered radial blobs, slow parallax (blender-level ambience) */
.exm-mesh { position: absolute; inset: 0; pointer-events: none; opacity: 0.6; mix-blend-mode: screen;
  background:
    radial-gradient(34% 44% at 16% 12%, color-mix(in srgb, var(--ex-amber) 22%, transparent), transparent 70%),
    radial-gradient(30% 40% at 88% 22%, color-mix(in srgb, var(--ex-violet) 24%, transparent), transparent 72%),
    radial-gradient(40% 50% at 70% 96%, color-mix(in srgb, var(--ex-cleared) 16%, transparent), transparent 74%);
  animation: exm-mesh 14s ease-in-out infinite alternate; }
.exm.tone-cleared .exm-mesh { background:
    radial-gradient(34% 44% at 16% 12%, color-mix(in srgb, var(--ex-cleared) 22%, transparent), transparent 70%),
    radial-gradient(30% 40% at 88% 22%, color-mix(in srgb, var(--ex-cleared) 18%, transparent), transparent 72%),
    radial-gradient(40% 50% at 70% 96%, color-mix(in srgb, var(--ex-amber) 14%, transparent), transparent 74%); }
.exm.tone-blocked .exm-mesh { background:
    radial-gradient(34% 44% at 16% 12%, color-mix(in srgb, var(--ex-blocked) 22%, transparent), transparent 70%),
    radial-gradient(30% 40% at 88% 22%, color-mix(in srgb, var(--ex-blocked) 16%, transparent), transparent 72%),
    radial-gradient(40% 50% at 70% 96%, color-mix(in srgb, var(--ex-amber) 12%, transparent), transparent 74%); }
[data-theme="light"] .exm-mesh { mix-blend-mode: normal; opacity: 0.5; }
@keyframes exm-mesh { 0% { transform: translate3d(0, 0, 0) scale(1); } 100% { transform: translate3d(-3%, 2%, 0) scale(1.08); } }
/* faint technical grid masked to the top — gives the surface depth */
.exm-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(var(--ex-border) 1px, transparent 1px), linear-gradient(90deg, var(--ex-border) 1px, transparent 1px);
  background-size: 26px 26px;
  mask: radial-gradient(130% 80% at 50% -10%, #000, transparent 70%); -webkit-mask: radial-gradient(130% 80% at 50% -10%, #000, transparent 70%); }

.exm-sheen { position: absolute; inset: 0 0 auto; height: 2px; pointer-events: none;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ex-amber) 75%, transparent), transparent); }
.exm.tone-cleared .exm-sheen { background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ex-cleared) 78%, transparent), transparent); }
.exm.tone-blocked .exm-sheen { background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ex-blocked) 78%, transparent), transparent); }
.exm-flash { position: absolute; inset: 0; z-index: 6; pointer-events: none;
  background: radial-gradient(circle at 50% 38%, color-mix(in srgb, var(--ex-cleared) 30%, transparent), transparent 60%);
  animation: seal-flash 0.7s ease-out; }
.exm.tone-blocked .exm-flash { background: radial-gradient(circle at 50% 38%, color-mix(in srgb, var(--ex-blocked) 30%, transparent), transparent 60%); }
@keyframes seal-flash { 0% { opacity: 0; transform: scale(0.6); } 30% { opacity: 1; } 100% { opacity: 0; transform: scale(1.3); } }
/* expanding seal-burst ring — the ceremonial "stamp pressed" shockwave */
.exm-burst { position: absolute; left: 50%; top: 40%; z-index: 7; width: 80px; height: 80px; margin: -40px 0 0 -40px; border-radius: 50%; pointer-events: none;
  border: 2px solid color-mix(in srgb, var(--ex-cleared) 70%, transparent); animation: seal-burst 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.exm.tone-blocked .exm-burst { border-color: color-mix(in srgb, var(--ex-blocked) 70%, transparent); }
.exm.tone-in_progress .exm-burst, .exm.tone-pending .exm-burst, .exm.tone-na .exm-burst { border-color: color-mix(in srgb, var(--ex-amber) 70%, transparent); }
@keyframes seal-burst { 0% { opacity: 0.9; transform: scale(0.3); } 100% { opacity: 0; transform: scale(4.2); } }

/* header */
.exm-head { position: relative; z-index: 2; display: flex; align-items: center; gap: 13px; padding: 17px 18px 11px; }
.exm-motif { flex-shrink: 0; }
.exm-htxt { flex: 1; min-width: 0; }
.exm-eyebrow { display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-text-dim); }
.exm-title { font-size: 16px; font-weight: 840; margin: 2px 0 0; color: var(--ex-text); line-height: 1.18; }
.exm-seal-chip { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; padding: 4px 9px; border-radius: 999px;
  font-size: 10px; font-weight: 800; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 32%, transparent); transition: color 0.3s; }
.exm-x { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; cursor: pointer; flex-shrink: 0;
  background: transparent; border: 1px solid var(--ex-border); color: var(--ex-text-muted); transition: color 0.2s, border-color 0.2s; }
.exm-x:hover { color: var(--ex-text); border-color: var(--ex-border-strong); }

/* stepper */
.exm-steps { position: relative; z-index: 2; display: flex; justify-content: space-between; gap: 6px; padding: 4px 22px 12px; }
.step-rail { position: absolute; left: 38px; right: 38px; top: 18px; height: 2px; border-radius: 2px; background: var(--ex-border-strong); overflow: hidden; }
.step-beam { position: absolute; inset: 0 auto 0 0; border-radius: 2px; overflow: hidden; background: var(--ex-grad-hero); box-shadow: 0 0 8px color-mix(in srgb, var(--ex-amber) 50%, transparent); transition: width 0.45s var(--ex-spring); }
.step-beam::after { content: ''; position: absolute; inset: 0; width: 40%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.7), transparent); animation: step-beam-shimmer 1.8s ease-in-out infinite; }
@keyframes step-beam-shimmer { 0% { transform: translateX(-120%); } 100% { transform: translateX(320%); } }
.step { position: relative; display: flex; flex-direction: column; align-items: center; gap: 5px; background: none; border: none; cursor: pointer; font-family: inherit; flex: 1; }
.step-node { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; transition: all 0.3s var(--ex-spring);
  background: var(--ex-surface); border: 1.5px solid var(--ex-border-strong); color: var(--ex-text-muted); }
.step.on .step-node { border-color: var(--ex-violet); color: var(--ex-violet); background: var(--ex-violet-soft); box-shadow: 0 0 0 4px color-mix(in srgb, var(--ex-violet) 14%, transparent); transform: scale(1.08); }
.step.done .step-node { border-color: var(--ex-cleared); color: var(--ex-cleared); background: var(--ex-cleared-soft); }
.step-lab { font-size: 10.5px; font-weight: 750; color: var(--ex-text-muted); transition: color 0.2s; }
.step.on .step-lab { color: var(--ex-text); }

/* body */
.exm-body { position: relative; z-index: 2; padding: 4px 20px 8px; overflow-y: auto; }
.panel { display: flex; flex-direction: column; gap: 11px; }

.brief { margin: 2px 0 0; font-size: 13px; line-height: 1.5; color: var(--ex-text-secondary); }
.sysnote { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border-radius: 12px; font-size: 11.5px; line-height: 1.45; font-weight: 600;
  color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.sysnote svg { flex-shrink: 0; margin-top: 1px; }

.sysbanner { display: flex; align-items: center; gap: 11px; padding: 11px 13px; border-radius: 13px; border: 1px solid var(--ex-border-strong); background: var(--ex-surface); }
.sysbanner .sb-ic { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0; }
.sb-txt { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.sb-txt b { display: inline-flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 850; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ex-text-muted); }
.sb-txt > span { font-size: 12.5px; font-weight: 700; color: var(--ex-text); }
.sb-txt i { font-style: normal; color: var(--ex-text-muted); font-weight: 600; }
.sb-auto { text-transform: none; letter-spacing: 0; font-size: 8.5px; font-weight: 850; padding: 1px 6px; border-radius: 999px; }
.sysbanner.sb-satisfied { border-color: color-mix(in srgb, var(--ex-cleared) 34%, transparent); background: color-mix(in srgb, var(--ex-cleared) 8%, transparent); }
.sysbanner.sb-satisfied .sb-ic, .sysbanner.sb-satisfied .sb-auto { color: var(--ex-cleared); background: var(--ex-cleared-soft); }
.sysbanner.sb-pending .sb-ic, .sysbanner.sb-pending .sb-auto { color: var(--ex-steel); background: var(--ex-steel-soft); }
.sysbanner.sb-attention { border-color: color-mix(in srgb, var(--ex-blocked) 34%, transparent); background: var(--ex-blocked-soft); }
.sysbanner.sb-attention .sb-ic, .sysbanner.sb-attention .sb-auto { color: var(--ex-blocked); background: var(--ex-blocked-soft); }

/* ERP de-provisioning action */
.erp-act { display: flex; flex-direction: column; gap: 11px; padding: 13px; border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--ex-blocked) 26%, transparent);
  background: linear-gradient(180deg, color-mix(in srgb, var(--ex-blocked) 7%, transparent), transparent); }
.erp-lead { display: flex; align-items: flex-start; gap: 11px; }
.erp-ico { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
  color: var(--ex-blocked); background: var(--ex-blocked-soft); border: 1px solid color-mix(in srgb, var(--ex-blocked) 30%, transparent); }
.erp-txt { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.erp-txt b { font-size: 13px; font-weight: 800; color: var(--ex-text); }
.erp-txt span { font-size: 11.5px; line-height: 1.45; color: var(--ex-text-muted); }
.erp-foot { display: flex; }
.erp-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 10px; cursor: pointer; font-family: inherit; font-size: 12.5px; font-weight: 760;
  border: none; color: #fff; background: linear-gradient(135deg, #fca5a5, #ef4444 55%, #dc2626); box-shadow: 0 8px 22px -10px rgba(239, 68, 68, 0.6); }
.erp-confirm { display: flex; flex-direction: column; gap: 9px; }
.erp-warn { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 700; color: var(--ex-blocked); }
.erp-confirm-acts { display: flex; justify-content: flex-end; gap: 8px; }
.erp-ghost { padding: 8px 14px; border-radius: 10px; cursor: pointer; font-family: inherit; font-size: 12.5px; font-weight: 700;
  background: transparent; border: 1px solid var(--ex-border-strong); color: var(--ex-text-secondary); }
.erp-go { display: inline-flex; align-items: center; gap: 6px; padding: 8px 15px; border-radius: 10px; cursor: pointer; font-family: inherit; font-size: 12.5px; font-weight: 780;
  border: none; color: #fff; background: linear-gradient(135deg, #fca5a5, #ef4444 55%, #dc2626); }
.erp-go:disabled, .erp-ghost:disabled { opacity: 0.55; cursor: not-allowed; }
.erp-done { display: inline-flex; align-items: center; gap: 8px; padding: 11px 13px; border-radius: 12px; font-size: 12px; font-weight: 650;
  color: var(--ex-cleared); background: var(--ex-cleared-soft); border: 1px solid color-mix(in srgb, var(--ex-cleared) 28%, transparent); }

.chk-head { display: flex; align-items: center; gap: 9px; margin-top: 3px; }
.chk-cap { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ex-text-muted); }
.chk-count { font-size: 12px; font-weight: 850; color: var(--ex-text-secondary); }
.chk-all { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 999px; cursor: pointer; font-size: 10.5px; font-weight: 750; font-family: inherit;
  background: var(--ex-surface); border: 1px solid var(--ex-border-strong); color: var(--ex-text-secondary); transition: all 0.2s; }
.chk-all.on { color: var(--ex-cleared); background: var(--ex-cleared-soft); border-color: color-mix(in srgb, var(--ex-cleared) 36%, transparent); }
.chk-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
.chk { display: flex; align-items: center; gap: 11px; padding: 11px 12px; border-radius: 13px; cursor: pointer;
  background: var(--ex-surface); border: 1px solid var(--ex-border); transition: border-color 0.22s, background 0.22s; }
.chk:hover { border-color: var(--ex-border-strong); }
.chk.on { border-color: color-mix(in srgb, var(--ex-cleared) 38%, transparent); background: color-mix(in srgb, var(--ex-cleared) 8%, transparent); }
.chk-box { display: grid; place-items: center; width: 21px; height: 21px; border-radius: 7px; flex-shrink: 0;
  background: rgba(0, 0, 0, 0.25); border: 1.5px solid var(--ex-border-strong); transition: all 0.25s var(--ex-spring); }
.chk.on .chk-box { background: var(--ex-cleared); border-color: var(--ex-cleared); box-shadow: 0 0 10px color-mix(in srgb, var(--ex-cleared) 55%, transparent); }
.chk-tick { fill: none; stroke: #07160f; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 18; stroke-dashoffset: 18; transition: stroke-dashoffset 0.3s ease 0.05s; }
.chk.on .chk-tick { stroke-dashoffset: 0; }
.chk-txt { font-size: 12.5px; font-weight: 600; color: var(--ex-text-secondary); line-height: 1.35; }
.chk.on .chk-txt { color: var(--ex-text); }
[data-theme="light"] .chk-box { background: rgba(255, 250, 242, 0.8); }
.xlink { margin: 4px 0 0; display: inline-flex; align-items: center; gap: 4px; width: fit-content; font-size: 11.5px; font-weight: 700; cursor: pointer; color: var(--ex-violet); }
.xlink:hover { text-decoration: underline; }

/* disposition */
.fl { font-size: 11px; font-weight: 750; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ex-text-muted); }
.fl i { font-style: normal; text-transform: none; letter-spacing: 0; font-weight: 600; color: var(--ex-text-dim); margin-left: 5px; }
.fl-hint { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 600; color: var(--ex-text-dim); }
.seg { display: grid; grid-template-columns: repeat(5, 1fr); gap: 7px; }
.seg button { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 4px; border-radius: 12px; cursor: pointer; font-family: inherit;
  background: var(--ex-surface); border: 1px solid var(--ex-border); color: var(--ex-text-secondary); font-weight: 750; font-size: 10px; transition: all 0.2s; }
.seg button:hover { border-color: color-mix(in srgb, var(--c) 42%, transparent); transform: translateY(-1px); }
.seg button.on { border-color: var(--c); background: color-mix(in srgb, var(--c) 15%, transparent); color: var(--c); box-shadow: 0 0 0 1px color-mix(in srgb, var(--c) 32%, transparent), 0 6px 18px -8px color-mix(in srgb, var(--c) 50%, transparent); }
.sub-fld { display: flex; flex-direction: column; gap: 7px; overflow: hidden; }
.disp-note { display: inline-flex; align-items: center; gap: 7px; padding: 11px 13px; border-radius: 12px; font-size: 12px; font-weight: 600; color: var(--ex-text-muted); background: var(--ex-surface); border: 1px dashed var(--ex-border-strong); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { padding: 6px 11px; border-radius: 999px; cursor: pointer; font-size: 11px; font-weight: 700; font-family: inherit;
  background: var(--ex-surface); border: 1px solid var(--ex-border); color: var(--ex-text-secondary); transition: all 0.2s; }
.chip:hover { border-color: var(--ex-border-strong); }
.chip.on { border-color: color-mix(in srgb, var(--ex-blocked) 42%, transparent); background: var(--ex-blocked-soft); color: var(--ex-blocked); }
.chip.soft:hover { border-color: var(--ex-violet-border); color: var(--ex-violet); }
.money { display: flex; align-items: center; border-radius: 11px; background: rgba(0, 0, 0, 0.3); border: 1px solid var(--ex-border); overflow: hidden; }
.money-cur { padding: 0 12px; font-size: 14px; font-weight: 800; color: var(--ex-text-muted); }
.money input { flex: 1; padding: 11px 12px 11px 0; border: none; background: none; outline: none; font-size: 13px; font-family: inherit; color: var(--ex-text); }
textarea { width: 100%; padding: 10px 12px; border-radius: 11px; font-size: 13px; font-family: inherit; background: rgba(0, 0, 0, 0.3); border: 1px solid var(--ex-border); color: var(--ex-text); resize: vertical; }
textarea::placeholder, .money input::placeholder { color: var(--ex-text-dim); }
[data-theme="light"] textarea, [data-theme="light"] .money { background: rgba(255, 250, 242, 0.74); }

/* certificate */
.cert { position: relative; overflow: hidden; margin-top: 6px; padding: 14px; border-radius: 16px; display: flex; flex-direction: column; gap: 9px;
  background: var(--ex-panel); border: 1px solid color-mix(in srgb, var(--c) 26%, transparent); transition: border-color 0.4s; }
.cert-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(var(--ex-border) 1px, transparent 1px), linear-gradient(90deg, var(--ex-border) 1px, transparent 1px); background-size: 22px 22px;
  mask: radial-gradient(120% 100% at 100% 0, #000, transparent 72%); -webkit-mask: radial-gradient(120% 100% at 100% 0, #000, transparent 72%); }
.cert-top { position: relative; display: flex; align-items: center; gap: 11px; }
.cert-medal { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; font-family: var(--ex-mono); font-size: 12.5px; font-weight: 850;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.cert-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.cert-name { font-size: 13px; font-weight: 800; color: var(--ex-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cert-meta { font-size: 10px; color: var(--ex-text-muted); }
.cert-seal { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0; color: var(--c);
  border: 2px dashed color-mix(in srgb, var(--c) 50%, transparent); transform: rotate(-8deg); transition: color 0.3s, border-color 0.3s; }
.cert-item { position: relative; font-size: 12px; font-weight: 650; color: var(--ex-text-secondary); }
.cert-tags { position: relative; display: flex; flex-wrap: wrap; gap: 5px; }
.cert-tag { display: inline-flex; align-items: center; gap: 3px; font-size: 9.5px; font-weight: 750; padding: 3px 8px; border-radius: 999px; white-space: nowrap;
  color: var(--ex-text-muted); background: var(--ex-steel-soft); border: 1px solid var(--ex-border); }
.cert-tag.st { color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); border-color: color-mix(in srgb, var(--c) 30%, transparent); }
.cert-tag.ok { color: var(--ex-cleared); background: var(--ex-cleared-soft); border-color: color-mix(in srgb, var(--ex-cleared) 28%, transparent); }
.cert-tag.rec { color: var(--ex-blocked); background: var(--ex-blocked-soft); border-color: color-mix(in srgb, var(--ex-blocked) 28%, transparent); }
.cert-tag.asg { color: var(--ex-amber-strong); }

/* footer */
.exm-foot { position: relative; z-index: 2; display: flex; align-items: center; gap: 8px; padding: 12px 20px 18px; }
.foot-spacer { flex: 1; }
.seal-hint { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; color: var(--ex-pending); max-width: 180px; line-height: 1.25; }
.exm-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px; border-radius: 12px; font-size: 13px; font-weight: 760; cursor: pointer; font-family: inherit; transition: opacity 0.2s; }
.exm-btn.ghost { background: transparent; border: 1px solid var(--ex-border-strong); color: var(--ex-text-secondary); }
.exm-btn.ghost:hover { color: var(--ex-text); }
.exm-btn.primary, .exm-btn.seal { border: none; background: var(--ex-grad-hero); color: #1a1206; }
.exm-btn.seal { padding: 11px 20px; box-shadow: 0 8px 24px -10px color-mix(in srgb, var(--ex-amber) 60%, transparent); }
.exm-btn.go-cleared { background: linear-gradient(135deg, #6ee7b7, #34d399 55%, #10b981); color: #06281b; box-shadow: 0 8px 24px -10px rgba(52, 211, 153, 0.6); }
.exm-btn.go-blocked { background: linear-gradient(135deg, #fca5a5, #ef4444 55%, #dc2626); color: #fff; box-shadow: 0 8px 24px -10px rgba(239, 68, 68, 0.55); }
.exm-btn.seal:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.spin { animation: ex-spin-slow 0.8s linear infinite; }

.exm-body::-webkit-scrollbar { width: 7px; }
.exm-body::-webkit-scrollbar-thumb { background: var(--ex-border-strong); border-radius: 999px; }

@media (max-width: 540px) {
  .seg { grid-template-columns: repeat(3, 1fr); }
  .exm-title { font-size: 14.5px; }
  .seal-hint { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .spin { animation: none; } .exm-flash, .exm-burst { animation: none; display: none; }
  .exm-mesh { animation: none; } .step-beam::after { animation: none; display: none; }
  .step-beam { transition: none; } .chk-tick { transition: none; }
}
</style>
