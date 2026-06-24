<template>
  <Teleport to="body">
    <Presence>
      <div v-if="open" class="exm-overlay" @mousedown.self="$emit('close')">
        <Motion as="div" class="exm ex-grain" :initial="reduced ? false : { opacity: 0, y: 28, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.97 }" :transition="{ duration: 0.36, ease: [0.16,1,0.3,1] }">
          <span class="exm-aura" aria-hidden="true" />
          <span class="exm-sheen" aria-hidden="true" />

          <header class="exm-head">
            <span class="exm-ico"><ScrollText :size="18" /></span>
            <div class="exm-htxt">
              <span class="exm-eyebrow"><FileBadge :size="10" /> Exit · Governance</span>
              <h3 class="exm-title">{{ editing ? 'Refine policy' : 'Draft a separation policy' }}</h3>
            </div>
            <button class="exm-x" @click="$emit('close')" type="button"><X :size="17" /></button>
          </header>

          <div class="exm-body">
            <!-- live charter preview -->
            <div class="prev" :class="{ ready: f.policy_name.trim() }">
              <span class="prev-grid" aria-hidden="true" />
              <div class="prev-top">
                <span class="prev-ico"><ScrollText :size="15" /></span>
                <div class="prev-id">
                  <span class="prev-name">{{ f.policy_name.trim() || 'Untitled policy' }}</span>
                  <span class="prev-scope"><component :is="f.grade_id ? GraduationCap : Building2" :size="10" /> {{ scopeLabel }}</span>
                </div>
                <span class="prev-seal" :class="f.is_active ? 'on' : 'off'"><component :is="f.policy_name.trim() ? ShieldCheck : Stamp" :size="15" /></span>
              </div>
              <div class="prev-row">
                <span class="prev-chip"><CalendarClock :size="10" /> {{ f.notice_period_days }}d notice</span>
                <span class="prev-chip"><Coins :size="10" /> {{ f.gratuity_enabled ? `≥${f.gratuity_min_years}y` : 'no gratuity' }}</span>
                <span class="prev-chip"><Workflow :size="10" /> {{ f.approval_levels.length }}-stage</span>
                <span class="prev-chip"><DoorOpen :size="10" /> {{ f.clearance_template.length || 'default' }} gates</span>
                <span class="prev-stamp" :class="f.policy_name.trim() ? 'ready' : 'draft'">{{ f.policy_name.trim() ? 'READY' : 'DRAFT' }}</span>
              </div>
            </div>

            <!-- Identity -->
            <Motion as="div" class="sec" :initial="reduced ? false : { opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="st(0)">
              <span class="sec-cap"><FileBadge :size="12" /> Identity</span>
              <div class="fld"><label>Policy name <i>*</i></label><input v-model="f.policy_name" class="inp" placeholder="e.g. Senior Staff Separation" /></div>
              <div class="fld"><label>Description <em>optional</em></label><textarea v-model="f.description" rows="2" class="inp" placeholder="What this charter is for, who it covers…" /></div>
              <div class="fld"><label>Grade scope</label><ExSelect v-model="f.grade_id" :options="gradeOpts" searchable placeholder="All grades (organisation default)" /></div>
            </Motion>

            <!-- Notice & buyout -->
            <Motion as="div" class="sec" :initial="reduced ? false : { opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="st(1)">
              <span class="sec-cap"><CalendarClock :size="12" /> Notice &amp; buyout</span>
              <div class="two">
                <div class="fld"><label>Notice days</label>
                  <div class="step">
                    <button type="button" @click="bump('notice_period_days', -1, { min: 0, max: 365 })"><Minus :size="14" /></button>
                    <input class="step-v" :value="f.notice_period_days" inputmode="numeric" @input="f.notice_period_days = sInt($event.target.value)" @blur="f.notice_period_days = clamp(f.notice_period_days, 0, 365)" />
                    <button type="button" @click="bump('notice_period_days', 1, { min: 0, max: 365 })"><Plus :size="14" /></button>
                  </div>
                </div>
                <div class="fld"><label>Probation notice days</label>
                  <div class="step">
                    <button type="button" @click="bump('probation_notice_days', -1, { min: 0, max: 365 })"><Minus :size="14" /></button>
                    <input class="step-v" :value="f.probation_notice_days" inputmode="numeric" @input="f.probation_notice_days = sInt($event.target.value)" @blur="f.probation_notice_days = clamp(f.probation_notice_days, 0, 365)" />
                    <button type="button" @click="bump('probation_notice_days', 1, { min: 0, max: 365 })"><Plus :size="14" /></button>
                  </div>
                </div>
              </div>
              <div class="two">
                <div class="fld"><label>Buyout allowed</label>
                  <div class="seg seg-2"><button :class="{ on: f.buyout_allowed }" @click="f.buyout_allowed = true" type="button">Allowed</button>
                    <button :class="{ on: !f.buyout_allowed }" @click="f.buyout_allowed = false" type="button">No buyout</button></div></div>
                <div class="fld"><label>Buyout basis</label>
                  <div class="seg seg-2"><button :class="{ on: f.buyout_basis === 'BASIC' }" @click="f.buyout_basis = 'BASIC'" type="button">Basic</button>
                    <button :class="{ on: f.buyout_basis === 'GROSS' }" @click="f.buyout_basis = 'GROSS'" type="button">Gross</button></div></div>
              </div>
            </Motion>

            <!-- Gratuity -->
            <Motion as="div" class="sec" :initial="reduced ? false : { opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="st(2)">
              <span class="sec-cap"><Coins :size="12" /> Gratuity</span>
              <label class="sw"><input type="checkbox" v-model="f.gratuity_enabled" /><span class="sw-track"><span class="sw-thumb" /></span> Gratuity payable on exit</label>
              <div v-if="f.gratuity_enabled" class="fld" style="max-width:220px;margin-top:10px"><label>Minimum eligible years</label>
                <div class="step">
                  <button type="button" @click="bump('gratuity_min_years', -0.5, { min: 0, max: 20, dec: 1 })"><Minus :size="14" /></button>
                  <input class="step-v" :value="f.gratuity_min_years" inputmode="decimal" @input="f.gratuity_min_years = sHalf($event.target.value)" @blur="f.gratuity_min_years = clamp(f.gratuity_min_years, 0, 20)" />
                  <button type="button" @click="bump('gratuity_min_years', 0.5, { min: 0, max: 20, dec: 1 })"><Plus :size="14" /></button>
                </div>
              </div>
            </Motion>

            <!-- Approval chain -->
            <Motion as="div" class="sec builder" :initial="reduced ? false : { opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="st(3)">
              <div class="bld-head"><span class="sec-cap"><Workflow :size="12" /> Settlement approval chain</span>
                <button class="bld-add" @click="addApproval" type="button"><Plus :size="13" /> Stage</button></div>
              <TransitionGroup name="row" tag="div">
                <div v-for="(a, i) in f.approval_levels" :key="a._k" class="bld-row approval">
                  <span class="bld-num">{{ i + 1 }}</span>
                  <ExSelect v-model="a.role" :options="roleOpts" size="sm" />
                  <input v-model="a.label" class="inp sm" placeholder="Label (e.g. Reporting Manager)" />
                  <button class="bld-x" @click="f.approval_levels.splice(i, 1)" type="button"><X :size="13" /></button>
                </div>
              </TransitionGroup>
              <p v-if="!f.approval_levels.length" class="bld-empty">No stages — settlement approval needs only a superuser.</p>
            </Motion>

            <!-- Clearance gates -->
            <Motion as="div" class="sec builder" :initial="reduced ? false : { opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="st(4)">
              <div class="bld-head"><span class="sec-cap"><DoorOpen :size="12" /> Clearance gate sequence</span>
                <button class="bld-add" @click="addClearance" type="button"><Plus :size="13" /> Gate</button></div>
              <TransitionGroup name="row" tag="div">
                <div v-for="(it, i) in f.clearance_template" :key="it._k" class="bld-row gate">
                  <ExSelect v-model="it.department" :options="deptOpts" size="sm" />
                  <input v-model="it.title" class="inp sm" placeholder="Clearance item (e.g. Laptop returned)" />
                  <label class="mini-sw"><input type="checkbox" v-model="it.is_mandatory" /><span class="sw-track sm"><span class="sw-thumb" /></span><b>req</b></label>
                  <button class="bld-x" @click="f.clearance_template.splice(i, 1)" type="button"><X :size="13" /></button>
                </div>
              </TransitionGroup>
              <p v-if="!f.clearance_template.length" class="bld-empty">Empty — the built-in default checklist (incl. IT ERP login) is used.</p>
            </Motion>

            <!-- Interview questions -->
            <Motion as="div" class="sec builder" :initial="reduced ? false : { opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="st(5)">
              <div class="bld-head"><span class="sec-cap"><MessagesSquare :size="12" /> Exit interview questions</span>
                <button class="bld-add" @click="addQuestion" type="button"><Plus :size="13" /> Question</button></div>
              <TransitionGroup name="row" tag="div">
                <div v-for="(q, i) in f.interview_questions" :key="q._k" class="bld-row qrow">
                  <input v-model="q.question" class="inp sm" placeholder="e.g. How would you rate your manager?" />
                  <div class="seg seg-2 qtype"><button :class="{ on: q.type === 'rating' }" @click="q.type = 'rating'" type="button"><Star :size="11" /> Rating</button>
                    <button :class="{ on: q.type === 'text' }" @click="q.type = 'text'" type="button"><Type :size="11" /> Text</button></div>
                  <button class="bld-x" @click="f.interview_questions.splice(i, 1)" type="button"><X :size="13" /></button>
                </div>
              </TransitionGroup>
              <p v-if="!f.interview_questions.length" class="bld-empty">Empty — the built-in default questionnaire is used.</p>
            </Motion>

            <!-- Active -->
            <Motion as="div" class="sec" :initial="reduced ? false : { opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="st(6)">
              <label class="sw"><input type="checkbox" v-model="f.is_active" /><span class="sw-track"><span class="sw-thumb" /></span> Active — this charter is live for new separations</label>
            </Motion>
          </div>

          <footer class="exm-foot">
            <button class="exm-btn ghost" @click="$emit('close')" type="button">Cancel</button>
            <Motion as="button" type="button" class="exm-btn primary" :disabled="!f.policy_name.trim() || busy"
              :whileHover="(!f.policy_name.trim() || busy) ? {} : { y: -1 }" :whileTap="(!f.policy_name.trim() || busy) ? {} : { scale: 0.97 }" @click="save">
              <Loader2 v-if="busy" :size="15" class="spin" /><Stamp v-else :size="15" /> {{ editing ? 'Save charter' : 'Enact charter' }}
            </Motion>
          </footer>
        </Motion>
      </div>
    </Presence>
  </Teleport>
</template>

<script setup>
import { reactive, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  ScrollText, FileBadge, X, Plus, Minus, Workflow, DoorOpen, Coins, CalendarClock,
  MessagesSquare, Loader2, Stamp, ShieldCheck, Building2, GraduationCap, Star, Type,
} from 'lucide-vue-next'
import ExSelect from '../components/ExSelect.vue'
import { CLEARANCE_DEPTS } from '@/composables/useExit'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  policy: { type: Object, default: null },
  grades: { type: Array, default: () => [] },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'save'])
const reduced = prefersReduced()

const editing = computed(() => !!props.policy?.id)
const gradeOpts = computed(() => [{ value: null, label: 'All grades (organisation default)' }, ...props.grades.map(g => ({ value: g.id, label: g.name }))])
const scopeLabel = computed(() => f.grade_id ? (props.grades.find(g => g.id === f.grade_id)?.name || 'Grade') : 'Organisation default')
const roleOpts = [
  { value: 'MANAGER', label: 'Manager' }, { value: 'HR', label: 'HR' },
  { value: 'FINANCE', label: 'Finance' }, { value: 'DEPT_HEAD', label: 'Dept head' },
]
const deptOpts = CLEARANCE_DEPTS.map(d => ({ value: d.key, label: d.label, icon: d.icon }))

let _k = 0
const k = () => `r${_k++}`
const blank = () => ({
  policy_name: '', description: '', grade_id: null,
  notice_period_days: 30, probation_notice_days: 7, buyout_allowed: true, buyout_basis: 'BASIC',
  gratuity_enabled: true, gratuity_min_years: 5, is_active: true,
  approval_levels: [{ _k: k(), role: 'MANAGER', label: 'Reporting Manager' }, { _k: k(), role: 'HR', label: 'HR' }],
  clearance_template: [],
  interview_questions: [],
})
const f = reactive(blank())

watch(() => props.open, (o) => {
  if (!o) return
  Object.assign(f, blank())
  if (props.policy) {
    Object.assign(f, {
      policy_name: props.policy.policy_name || '', description: props.policy.description || '',
      grade_id: props.policy.grade_id || null,
      notice_period_days: props.policy.notice_period_days ?? 30,
      probation_notice_days: props.policy.probation_notice_days ?? 7,
      buyout_allowed: props.policy.buyout_allowed ?? true,
      buyout_basis: props.policy.buyout_basis || 'BASIC',
      gratuity_enabled: props.policy.gratuity_enabled ?? true,
      gratuity_min_years: Number(props.policy.gratuity_min_years ?? 5),
      is_active: props.policy.is_active ?? true,
      approval_levels: (props.policy.approval_levels || []).map(a => ({ _k: k(), role: a.role, label: a.label })),
      clearance_template: (props.policy.clearance_template || []).map(c => ({ _k: k(), department: c.department, item_key: c.item_key, title: c.title, is_mandatory: c.is_mandatory !== false })),
      interview_questions: (props.policy.interview_questions || []).map(q => ({ _k: k(), key: q.key, question: q.question, type: q.type || 'text' })),
    })
  }
})

// ── numeric helpers (no spinner arrows anywhere) ──
const sInt = (s) => { const n = parseInt(String(s).replace(/[^\d]/g, ''), 10); return isNaN(n) ? 0 : n }
const sHalf = (s) => { const n = parseFloat(String(s).replace(/[^\d.]/g, '')); return isNaN(n) ? 0 : n }
const clamp = (v, min, max) => Math.min(max, Math.max(min, Number(v) || 0))
const bump = (key, delta, { min = 0, max = 999, dec = 0 } = {}) => {
  let v = (Number(f[key]) || 0) + delta
  v = clamp(v, min, max)
  f[key] = dec ? Math.round(v * 2) / 2 : Math.round(v)
}

const addApproval = () => f.approval_levels.push({ _k: k(), role: 'HR', label: 'HR' })
const addClearance = () => f.clearance_template.push({ _k: k(), department: 'HR', item_key: '', title: '', is_mandatory: true })
const addQuestion = () => f.interview_questions.push({ _k: k(), key: '', question: '', type: 'rating' })

const st = (i) => ({ duration: 0.4, delay: 0.06 + i * 0.05, ease: [0.16, 1, 0.3, 1] })
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40)

const save = () => {
  if (!f.policy_name.trim() || props.busy) return
  const payload = {
    policy_name: f.policy_name.trim(), description: f.description?.trim() || null, grade_id: f.grade_id || null,
    notice_period_days: clamp(f.notice_period_days, 0, 365), probation_notice_days: clamp(f.probation_notice_days, 0, 365),
    buyout_allowed: f.buyout_allowed, buyout_basis: f.buyout_basis,
    gratuity_enabled: f.gratuity_enabled, gratuity_min_years: clamp(f.gratuity_min_years, 0, 20), is_active: f.is_active,
    approval_levels: f.approval_levels.map((a, i) => ({ level: i + 1, role: a.role, label: a.label?.trim() || a.role })),
    clearance_template: f.clearance_template.filter(c => c.title?.trim()).map((c, i) => ({
      department: c.department, item_key: c.item_key || `${String(c.department).toLowerCase()}_${slug(c.title) || i}`,
      title: c.title.trim(), is_mandatory: c.is_mandatory !== false, sort_order: (i + 1) * 10,
    })),
    interview_questions: f.interview_questions.filter(q => q.question?.trim()).map((q, i) => ({
      key: q.key || slug(q.question) || `q_${i}`, question: q.question.trim(), type: q.type || 'text',
    })),
  }
  emit('save', payload)
}
</script>

<style scoped>
.exm-overlay { position: fixed; inset: 0; z-index: 1440; display: grid; place-items: center; padding: 20px; background: rgba(6,5,10,0.66); backdrop-filter: blur(9px); -webkit-backdrop-filter: blur(9px); }
[data-theme="light"] .exm-overlay { background: rgba(60,45,20,0.34); }
.exm { position: relative; overflow: hidden; width: min(640px, 96vw); max-height: 92vh; display: flex; flex-direction: column; border-radius: 22px;
  background: var(--ex-surface-elevated); border: 1px solid var(--ex-border-strong); box-shadow: var(--ex-shadow); }
.exm-aura { position: absolute; inset: -45% 30% 55% -12%; pointer-events: none; background: radial-gradient(60% 80% at 24% 0%, rgba(251,146,60,0.16), transparent 70%); }
.exm-sheen { position: absolute; inset: 0 0 auto; height: 2px; pointer-events: none; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ex-amber) 75%, transparent), transparent); }

.exm-head { position: relative; z-index: 2; flex-shrink: 0; display: flex; align-items: center; gap: 12px; padding: 17px 20px 12px; }
.exm-ico { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.exm-htxt { flex: 1; min-width: 0; }
.exm-eyebrow { display: inline-flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 850; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ex-text-dim); }
.exm-title { font-size: 16px; font-weight: 840; margin: 2px 0 0; color: var(--ex-text); }
.exm-x { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; cursor: pointer; flex-shrink: 0; background: transparent; border: 1px solid var(--ex-border); color: var(--ex-text-muted); }
.exm-x:hover { color: var(--ex-text); border-color: var(--ex-border-strong); }

.exm-body { position: relative; z-index: 2; flex: 1 1 auto; min-height: 0; padding: 6px 20px 12px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
.exm-body > * { flex-shrink: 0; }  /* keep natural height — body scrolls, children never get squished */
.exm-body::-webkit-scrollbar { width: 7px; } .exm-body::-webkit-scrollbar-thumb { background: var(--ex-border-strong); border-radius: 999px; }

/* live preview */
.prev { position: relative; overflow: hidden; padding: 13px 14px; border-radius: 15px; background: var(--ex-panel);
  border: 1px solid var(--ex-border); transition: border-color 0.4s; }
.prev.ready { border-color: var(--ex-violet-border); }
.prev-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.4; background-image: linear-gradient(var(--ex-border) 1px, transparent 1px), linear-gradient(90deg, var(--ex-border) 1px, transparent 1px); background-size: 22px 22px; -webkit-mask: radial-gradient(120% 100% at 100% 0, #000, transparent 72%); mask: radial-gradient(120% 100% at 100% 0, #000, transparent 72%); }
.prev-top { position: relative; display: flex; align-items: center; gap: 10px; }
.prev-ico { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.prev-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.prev-name { font-size: 14px; font-weight: 820; color: var(--ex-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.prev-scope { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; color: var(--ex-text-muted); }
.prev-seal { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; transform: rotate(-8deg); border: 2px dashed; }
.prev-seal.on { color: var(--ex-cleared); border-color: color-mix(in srgb, var(--ex-cleared) 50%, transparent); }
.prev-seal.off { color: var(--ex-steel); border-color: color-mix(in srgb, var(--ex-steel) 45%, transparent); }
.prev-row { position: relative; display: flex; flex-wrap: wrap; gap: 5px; margin-top: 11px; align-items: center; }
.prev-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 750; padding: 3px 8px; border-radius: 999px; color: var(--ex-text-secondary); background: var(--ex-surface); border: 1px solid var(--ex-border); }
.prev-stamp { margin-left: auto; font-size: 9px; font-weight: 900; letter-spacing: 0.1em; padding: 3px 9px; border-radius: 6px; }
.prev-stamp.draft { color: var(--ex-steel); background: var(--ex-steel-soft); }
.prev-stamp.ready { color: var(--ex-cleared); background: var(--ex-cleared-soft); }

/* sections */
.sec { display: flex; flex-direction: column; gap: 9px; }
.sec-cap { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 850; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ex-violet); }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.fld { display: flex; flex-direction: column; gap: 5px; }
.fld label { font-size: 11px; font-weight: 750; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ex-text-muted); }
.fld label i { color: var(--ex-violet); font-style: normal; }
.fld label em { font-style: normal; text-transform: none; letter-spacing: 0; font-weight: 600; color: var(--ex-text-dim); margin-left: 4px; }
.inp { width: 100%; padding: 10px 12px; border-radius: 10px; font-size: 13px; font-family: inherit; background: rgba(0,0,0,0.3); border: 1px solid var(--ex-border); color: var(--ex-text); transition: border-color 0.2s, box-shadow 0.2s; }
.inp:focus { outline: none; border-color: var(--ex-violet-border); box-shadow: 0 0 0 3px rgba(251,146,60,0.12); }
.inp.sm { padding: 8px 10px; font-size: 12.5px; }
textarea.inp { resize: vertical; }
.inp::placeholder { color: var(--ex-text-dim); }
[data-theme="light"] .inp { background: rgba(255,250,242,0.74); }
/* belt-and-suspenders: never show native number spinners */
input[type=number] { -moz-appearance: textfield; appearance: textfield; }
input[type=number]::-webkit-outer-spin-button, input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

/* stepper */
.step { display: flex; align-items: center; gap: 0; border-radius: 10px; overflow: hidden; border: 1px solid var(--ex-border); background: rgba(0,0,0,0.3); }
[data-theme="light"] .step { background: rgba(255,250,242,0.74); }
.step button { display: grid; place-items: center; width: 38px; height: 40px; cursor: pointer; border: none; background: transparent; color: var(--ex-violet);
  transition: background 0.2s; }
.step button:hover { background: var(--ex-violet-soft); }
.step-v { flex: 1; min-width: 0; text-align: center; border: none; background: none; outline: none; font-size: 15px; font-weight: 800; font-family: var(--ex-mono); color: var(--ex-text); border-left: 1px solid var(--ex-border); border-right: 1px solid var(--ex-border); height: 40px; }

/* segmented */
.seg { display: grid; gap: 6px; } .seg-2 { grid-template-columns: 1fr 1fr; }
.seg button { display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 9px; border-radius: 9px; cursor: pointer; font-family: inherit; background: var(--ex-surface); border: 1px solid var(--ex-border); color: var(--ex-text-secondary); font-weight: 750; font-size: 12.5px; transition: all 0.2s; }
.seg button.on { border-color: var(--ex-violet-border); background: var(--ex-violet-soft); color: var(--ex-violet); }

/* switches */
.sw { display: inline-flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 600; color: var(--ex-text-secondary); cursor: pointer; }
.sw input { display: none; }
.sw-track { position: relative; width: 40px; height: 23px; border-radius: 999px; background: color-mix(in srgb, var(--ex-steel) 30%, transparent); border: 1px solid var(--ex-border); transition: background 0.25s; flex-shrink: 0; }
.sw-track.sm { width: 32px; height: 19px; }
.sw-thumb { position: absolute; top: 2px; left: 2px; width: 17px; height: 17px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.3); transition: transform 0.25s var(--ex-spring); }
.sw-track.sm .sw-thumb { width: 13px; height: 13px; }
.sw input:checked + .sw-track { background: var(--ex-grad-hero); border-color: transparent; }
.sw input:checked + .sw-track .sw-thumb { transform: translateX(17px); }
.sw-track.sm .sw input:checked + .sw-track .sw-thumb { transform: translateX(13px); }
.mini-sw { display: inline-flex; align-items: center; gap: 5px; cursor: pointer; font-size: 10.5px; font-weight: 750; color: var(--ex-text-muted); white-space: nowrap; }
.mini-sw input { display: none; }
.mini-sw input:checked + .sw-track { background: var(--ex-grad-hero); border-color: transparent; }
.mini-sw input:checked + .sw-track .sw-thumb { transform: translateX(13px); }

/* builders */
.builder { border: 1px solid var(--ex-border); border-radius: 14px; padding: 13px; background: var(--ex-surface); }
.bld-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.bld-add { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 750; color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); border-radius: 8px; padding: 5px 10px; cursor: pointer; font-family: inherit; }
.bld-row { display: grid; gap: 7px; align-items: center; margin-bottom: 7px; }
.bld-row.approval { grid-template-columns: auto 130px 1fr auto; }
.bld-row.gate { grid-template-columns: 130px 1fr auto auto; }
.bld-row.qrow { grid-template-columns: 1fr 150px auto; }
.bld-num { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; font-size: 11px; font-weight: 850; color: var(--ex-violet); background: var(--ex-violet-soft); }
.qtype { gap: 4px; } .qtype button { padding: 7px 4px; font-size: 11px; }
.bld-x { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; cursor: pointer; background: transparent; border: 1px solid var(--ex-border); color: var(--ex-text-muted); transition: color 0.2s, border-color 0.2s; }
.bld-x:hover { color: var(--ex-blocked); border-color: color-mix(in srgb, var(--ex-blocked) 30%, transparent); }
.bld-empty { font-size: 11px; color: var(--ex-text-dim); margin: 4px 0 0; }
.row-enter-active, .row-leave-active { transition: opacity 0.25s ease, transform 0.25s var(--ex-spring); }
.row-enter-from { opacity: 0; transform: translateX(-10px); }
.row-leave-to { opacity: 0; transform: translateX(10px); }

.exm-foot { position: relative; z-index: 2; flex-shrink: 0; display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px 18px; border-top: 1px solid var(--ex-border); }
.exm-btn { display: inline-flex; align-items: center; gap: 7px; padding: 11px 18px; border-radius: 12px; font-size: 13px; font-weight: 770; cursor: pointer; font-family: inherit; }
.exm-btn.ghost { background: transparent; border: 1px solid var(--ex-border-strong); color: var(--ex-text-secondary); }
.exm-btn.primary { border: none; background: var(--ex-grad-hero); color: #1a1206; box-shadow: 0 8px 24px -10px color-mix(in srgb, var(--ex-amber) 60%, transparent); }
.exm-btn.primary:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.spin { animation: ex-spin-slow 0.8s linear infinite; }

@media (max-width: 560px) {
  .two { grid-template-columns: 1fr; }
  .bld-row.approval { grid-template-columns: auto 1fr auto; } .bld-row.approval .inp { grid-column: 1 / -1; }
  .bld-row.gate, .bld-row.qrow { grid-template-columns: 1fr auto; }
}
@media (prefers-reduced-motion: reduce) { .spin { animation: none; } .sw-thumb { transition: none; } }
</style>
