<template>
  <Teleport to="body">
    <Presence>
      <div v-if="open" class="exm-overlay" @mousedown.self="close">
        <Motion as="div" class="exm ex-grain" :class="`tone-${cfg.tone}`"
          :initial="{ opacity: 0, y: 26, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 16, scale: 0.98 }" :transition="{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }">
          <span class="exm-aura" aria-hidden="true" />
          <span class="exm-edge" aria-hidden="true" />
          <header class="exm-head">
            <span class="exm-ico"><component :is="cfg.icon" :size="18" /></span>
            <div>
              <h3 class="exm-title">{{ cfg.title }}</h3>
              <p v-if="subtitle" class="exm-sub ex-mono">{{ subtitle }}</p>
            </div>
            <button class="exm-x" @click="close" type="button"><X :size="17" /></button>
          </header>

          <div class="exm-body" :key="mode">
            <!-- CREATE / EDIT — the Separation Pass -->
            <template v-if="mode === 'create' || mode === 'edit'">
              <div class="pass" :class="{ ready: valid }">
                <span class="pass-perf" aria-hidden="true" />
                <div class="pass-band">
                  <span class="pass-ico"><component :is="selType.icon" :size="16" /></span>
                  <div class="pass-band-t">
                    <span class="pass-kicker">SEPARATION PASS</span>
                    <span class="pass-type">{{ selType.label }}</span>
                  </div>
                  <span class="pass-stamp" :class="{ on: valid }">{{ valid ? 'READY' : 'DRAFT' }}</span>
                </div>
                <div class="pass-grid">
                  <div class="pass-cell"><span class="pc-k">Employee</span><span class="pc-v">{{ selEmp ? selEmp.name : '—' }}</span></div>
                  <div class="pass-cell"><span class="pc-k">Code</span><span class="pc-v ex-mono">{{ selEmp ? (selEmp.code || '—') : '—' }}</span></div>
                  <div class="pass-cell"><span class="pc-k">Filed</span><span class="pc-v">{{ form.resignation_date ? fmtDate(form.resignation_date) : '—' }}</span></div>
                  <div class="pass-cell"><span class="pc-k">Requested last day</span><span class="pc-v">{{ form.requested_last_working_date ? fmtDate(form.requested_last_working_date) : '—' }}</span></div>
                  <div class="pass-cell span"><span class="pc-k">Reason</span><span class="pc-v">{{ selReason ? selReason.label : '—' }}</span></div>
                </div>
              </div>

              <div class="fld"><label>Employee <i v-if="mode === 'create'">*</i></label>
                <ExSelect v-if="mode === 'create'" v-model="form.employee_id" :options="employeeOpts" searchable placeholder="Search employee…" />
                <div v-else class="fld-ro"><User :size="14" /> <span class="ro-name">{{ selEmp ? selEmp.name : '—' }}</span>
                  <span v-if="selEmp?.code" class="ex-mono ro-code">{{ selEmp.code }}</span></div>
              </div>

              <div class="fld"><label>Separation type <i>*</i></label>
                <div class="type-grid">
                  <button v-for="t in types" :key="t.key" type="button" class="type-opt"
                    :class="{ on: form.resignation_type === t.key }" @click="setType(t.key)">
                    <component :is="t.icon" :size="15" />
                    <span>{{ t.label }}</span>
                  </button>
                </div>
              </div>

              <div class="fld"><label>Exit policy</label>
                <ExSelect v-model="form.policy_id" :options="policyOpts" placeholder="Auto — by employee grade" @change="onPolicyChange" /></div>

              <div v-if="appliedNoticeDays != null" class="notice-info" :class="{ waived: noticeWaived }">
                <span class="ni-ico"><CalendarClock :size="15" /></span>
                <div class="ni-body">
                  <span class="ni-lead">
                    <template v-if="noticeWaived">No notice period — {{ selType.label }} waives notice</template>
                    <template v-else><b>{{ appliedNoticeDays }} days</b> notice — last working day auto-set</template>
                  </span>
                  <span class="ni-sub">{{ policyLabel }}<template v-if="!noticeWaived"> · finalised on accept</template></span>
                  <span v-if="policyMismatch" class="ni-hint"><AlertTriangle :size="11" /> Overrides the grade-default policy for this employee</span>
                  <span v-if="noticeInfo?.on_probation && form.resignation_type !== 'PROBATION_EXIT'" class="ni-hint"><AlertTriangle :size="11" /> On probation — “Probation exit” would apply {{ noticeInfo.probation_notice_days }} days</span>
                </div>
              </div>

              <div class="fld"><label>Reason category</label>
                <ExSelect v-model="form.reason_category" :options="reasonOpts" placeholder="Why are they leaving…" /></div>
              <div class="fld-row">
                <div class="fld"><label>Filed date</label>
                  <HrDatePicker v-model="form.resignation_date" :max="today" placeholder="Today" @update:modelValue="applyNoticeToLwd" /></div>
                <div class="fld"><label>Requested last working day</label>
                  <HrDatePicker v-model="form.requested_last_working_date" :min="today" /></div>
              </div>
              <div class="fld"><label>Detail</label>
                <textarea v-model="form.reason_detail" rows="3" placeholder="Context for this separation…" /></div>
            </template>

            <!-- ACCEPT — Acceptance Pass + live notice timeline -->
            <template v-else-if="mode === 'accept'">
              <div class="acc" :class="{ waived: form.notice_waived }">
                <span class="acc-aura" aria-hidden="true" />
                <div class="acc-head">
                  <span class="acc-badge"><CheckCircle2 :size="15" /></span>
                  <div class="acc-h-t">
                    <span class="acc-kicker">ACCEPTANCE · {{ selType.label }}</span>
                    <span class="acc-name">{{ acceptName }}</span>
                  </div>
                  <span class="acc-stamp" :class="{ waived: form.notice_waived }">{{ form.notice_waived ? 'IMMEDIATE' : 'NOTICE' }}</span>
                </div>

                <!-- the notice timeline -->
                <div class="acc-tl">
                  <div class="acc-node">
                    <span class="acc-dot" />
                    <span class="acc-nk">Accepted</span>
                    <span class="acc-nv ex-mono">{{ fmtDate(today) }}</span>
                  </div>
                  <div class="acc-track">
                    <span class="acc-fill" :style="{ width: noticeFillPct + '%' }"><i class="acc-comet" /></span>
                    <span class="acc-track-lab">
                      <template v-if="form.notice_waived"><Undo2 :size="11" /> Notice waived</template>
                      <template v-else><CalendarClock :size="11" /> {{ form.notice_period_days || 0 }}-day notice</template>
                    </span>
                  </div>
                  <div class="acc-node end">
                    <span class="acc-dot end" />
                    <span class="acc-nk">Last working day</span>
                    <Presence mode="wait">
                      <Motion :key="form.last_working_date || 'none'" as="span" class="acc-nv hl ex-mono"
                        :initial="{ opacity: 0, y: -6 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: 6 }"
                        :transition="{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }">{{ form.last_working_date ? fmtDate(form.last_working_date) : '—' }}</Motion>
                    </Presence>
                  </div>
                </div>

                <div class="acc-meta">
                  <span class="acc-chip"><ClipboardCheck :size="12" /> seeds clearance · F&amp;F · interview</span>
                  <span class="acc-chip hl">{{ relievesLabel }}</span>
                </div>
              </div>

              <!-- notice control -->
              <div class="fld" :class="{ 'is-dim': form.notice_waived }">
                <label>Notice period</label>
                <div class="notice-ctl">
                  <div class="np-row">
                    <button v-for="p in [15, 30, 45, 60, 90]" :key="p" type="button" class="np"
                      :class="{ on: !form.notice_waived && Number(form.notice_period_days) === p }"
                      :disabled="form.notice_waived" @click="setNotice(p)">{{ p }}d</button>
                  </div>
                  <div class="np-step">
                    <button type="button" class="np-pm" :disabled="form.notice_waived || Number(form.notice_period_days) <= 0" @click="bumpNotice(-1)" aria-label="Decrease"><Minus :size="14" /></button>
                    <input type="number" min="0" v-model.number="form.notice_period_days" :disabled="form.notice_waived" @input="onNoticeChange" />
                    <button type="button" class="np-pm" :disabled="form.notice_waived" @click="bumpNotice(1)" aria-label="Increase"><Plus :size="14" /></button>
                    <span class="np-unit">days</span>
                  </div>
                </div>
              </div>

              <!-- last working day (auto from notice) -->
              <div class="fld">
                <label>Last working day <i v-if="!form.notice_waived">*</i>
                  <span class="lwd-auto"><Sparkles :size="10" /> auto from notice</span>
                </label>
                <HrDatePicker v-model="form.last_working_date" :min="today" @update:modelValue="onLwdChange" />
              </div>

              <!-- modern switches -->
              <div class="acc-switches">
                <button type="button" class="sw" :class="{ on: form.notice_waived }" @click="toggleWaive">
                  <span class="sw-track"><span class="sw-knob" /></span>
                  <span class="sw-tx"><b>Waive notice period</b><i>Relieve immediately — no notice served</i></span>
                </button>
                <button type="button" class="sw good" :class="{ on: form.eligible_for_rehire }" @click="form.eligible_for_rehire = !form.eligible_for_rehire">
                  <span class="sw-track"><span class="sw-knob" /></span>
                  <span class="sw-tx"><b>Eligible for rehire</b><i>Mark this exit as rehire-friendly</i></span>
                </button>
              </div>
            </template>

            <!-- START NOTICE — Notice Commencement -->
            <template v-else-if="mode === 'start-notice'">
              <div class="acc is-notice">
                <span class="acc-aura" aria-hidden="true" />
                <div class="acc-head">
                  <span class="acc-badge"><CalendarClock :size="15" /></span>
                  <div class="acc-h-t">
                    <span class="acc-kicker">NOTICE PERIOD · COMMENCING</span>
                    <span class="acc-name">{{ acceptName }}</span>
                  </div>
                  <span class="acc-stamp on-notice"><span class="sn-ping" aria-hidden="true" />ON NOTICE</span>
                </div>

                <div class="acc-tl">
                  <div class="acc-node">
                    <span class="acc-dot" />
                    <span class="acc-nk">Notice starts</span>
                    <Presence mode="wait">
                      <Motion :key="form.notice_period_start_date || 's'" as="span" class="acc-nv ex-mono"
                        :initial="{ opacity: 0, y: -6 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: 6 }"
                        :transition="{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }">{{ form.notice_period_start_date ? fmtDate(form.notice_period_start_date) : '—' }}</Motion>
                    </Presence>
                  </div>
                  <div class="acc-track">
                    <span class="acc-fill" :style="{ width: snFillPct + '%' }"><i class="acc-comet" /></span>
                    <span class="acc-track-lab"><CalendarClock :size="11" /> {{ snDuration }}-day notice</span>
                  </div>
                  <div class="acc-node end">
                    <span class="acc-dot end" />
                    <span class="acc-nk">Last working day</span>
                    <Presence mode="wait">
                      <Motion :key="form.last_working_date || 'l'" as="span" class="acc-nv hl ex-mono"
                        :initial="{ opacity: 0, y: -6 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: 6 }"
                        :transition="{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }">{{ form.last_working_date ? fmtDate(form.last_working_date) : '—' }}</Motion>
                    </Presence>
                  </div>
                </div>

                <div class="acc-meta">
                  <span class="acc-chip"><Activity :size="12" /> drives employee → ON NOTICE</span>
                  <span class="acc-chip hl">{{ snRelievesLabel }}</span>
                </div>
              </div>

              <div class="fld-row">
                <div class="fld"><label>Notice start date <i>*</i>
                  <button v-if="form.notice_period_start_date !== today" type="button" class="sn-today" @click="snSetStart(today)">today</button>
                </label>
                  <HrDatePicker v-model="form.notice_period_start_date" :max="form.last_working_date || null" @update:modelValue="snOnStartChange" /></div>
                <div class="fld"><label>Notice length</label>
                  <div class="np-step">
                    <button type="button" class="np-pm" :disabled="snDuration <= 0" @click="snBump(-1)" aria-label="Decrease"><Minus :size="14" /></button>
                    <input type="number" min="0" v-model.number="form.notice_period_days" @input="snOnDaysChange" />
                    <button type="button" class="np-pm" @click="snBump(1)" aria-label="Increase"><Plus :size="14" /></button>
                    <span class="np-unit">days</span>
                  </div>
                </div>
              </div>

              <div class="fld"><label>Last working day <i>*</i>
                <span class="lwd-auto"><Sparkles :size="10" /> auto — start + notice length</span>
              </label>
                <HrDatePicker v-model="form.last_working_date" :min="form.notice_period_start_date || today" @update:modelValue="snOnLwdChange" /></div>
            </template>

            <!-- WAIVE / ADJUST NOTICE -->
            <template v-else-if="mode === 'waive-notice'">
              <div class="fld"><label>Buyout days (recovered in F&F)</label>
                <input v-model.number="form.buyout_days" type="number" min="0" placeholder="0" /></div>
              <div class="fld"><label>Reason <i>*</i></label>
                <textarea v-model="form.reason" rows="3" placeholder="Why is notice being waived…" /></div>
            </template>
            <!-- ADJUST NOTICE — committed-notice revision (before → after) -->
            <template v-else-if="mode === 'adjust-notice'">
              <div class="adj" :class="adjDeltaTone">
                <span class="acc-aura" aria-hidden="true" />
                <div class="acc-head">
                  <span class="adj-badge"><CalendarClock :size="15" /></span>
                  <div class="acc-h-t">
                    <span class="acc-kicker">NOTICE REVISION</span>
                    <span class="acc-name">{{ acceptName }}</span>
                  </div>
                  <Presence mode="wait">
                    <Motion :key="adjDeltaLabel" as="span" class="adj-delta" :class="adjDeltaTone"
                      :initial="{ opacity: 0, scale: 0.8 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.8 }"
                      :transition="{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }">
                      <component :is="adjDeltaIcon" :size="13" /> {{ adjDeltaLabel }}
                    </Motion>
                  </Presence>
                </div>

                <div class="adj-cmp">
                  <div class="adj-col">
                    <span class="adj-col-k">Current last day</span>
                    <span class="adj-col-v ex-mono">{{ adjOrigLwd ? fmtDate(adjOrigLwd) : '—' }}</span>
                    <span class="adj-col-s">{{ adjOrigDaysLabel }}</span>
                  </div>
                  <span class="adj-arrow"><ArrowRight :size="16" /></span>
                  <div class="adj-col new">
                    <span class="adj-col-k">New last day</span>
                    <Presence mode="wait">
                      <Motion :key="form.last_working_date || 'n'" as="span" class="adj-col-v ex-mono hl"
                        :initial="{ opacity: 0, y: -6 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: 6 }"
                        :transition="{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }">{{ form.last_working_date ? fmtDate(form.last_working_date) : '—' }}</Motion>
                    </Presence>
                    <span class="adj-col-s">{{ adjNewDaysLabel }}</span>
                  </div>
                </div>

                <div class="acc-meta">
                  <span class="acc-chip"><CalendarClock :size="12" /> notice began {{ fmtDate(adjStart) }}</span>
                  <span class="acc-chip hl">{{ adjNewDaysLabel }}</span>
                </div>
              </div>

              <div class="fld-row">
                <div class="fld"><label>New last working day <i>*</i></label>
                  <HrDatePicker v-model="form.last_working_date" :min="adjStart" @update:modelValue="adjOnLwdChange" /></div>
                <div class="fld"><label>Notice length
                  <span class="lwd-auto"><Sparkles :size="10" /> from {{ fmtDate(adjStart) }}</span></label>
                  <div class="np-step">
                    <button type="button" class="np-pm" :disabled="Number(form.notice_period_days) <= 0" @click="adjBump(-1)" aria-label="Decrease"><Minus :size="14" /></button>
                    <input type="number" min="0" v-model.number="form.notice_period_days" @input="adjOnDaysChange" />
                    <button type="button" class="np-pm" @click="adjBump(1)" aria-label="Increase"><Plus :size="14" /></button>
                    <span class="np-unit">days</span>
                  </div>
                </div>
              </div>

              <!-- reason workflow -->
              <div class="fld"><label>Reason for revision <i>*</i></label>
                <div class="adj-reasons">
                  <Motion v-for="(r, i) in adjPresets" :key="r" as="button" type="button"
                    class="reason-chip" :class="{ on: adjPicked === r }" @click="adjPick(r)"
                    :initial="{ opacity: 0, y: 7 }" :animate="{ opacity: 1, y: 0 }"
                    :transition="{ duration: 0.28, delay: 0.03 + i * 0.03, ease: [0.16, 1, 0.3, 1] }"
                    :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }">
                    <span class="rc-tick"><Check :size="11" /></span><span>{{ r }}</span>
                  </Motion>
                </div>
              </div>
              <div class="fld"><label>{{ adjPicked === 'Other' ? 'Specify the reason' : 'Note' }} <i v-if="adjPicked === 'Other'">*</i><span v-else class="opt">optional</span></label>
                <textarea v-model="adjNote" rows="2" placeholder="Context for the audit trail…" /></div>

              <div class="adj-audit"><ShieldCheck :size="13" /> This revises a committed notice period — the change and reason are written to the audit log.</div>
            </template>

            <!-- REJECT / CANCEL -->
            <template v-else-if="mode === 'reject' || mode === 'cancel'">
              <p class="exm-note danger">{{ mode === 'cancel' ? 'Cancelling reverts an ON-NOTICE employee back to ACTIVE.' : 'This separation request will be marked rejected.' }}</p>
              <div class="fld"><label>Reason <i>*</i></label>
                <textarea v-model="form.reason" rows="3" placeholder="Reason…" /></div>
            </template>

            <!-- MANAGER DECISION -->
            <template v-else-if="mode === 'manager-decision'">
              <div class="seg">
                <button :class="{ on: form.decision === 'APPROVED' }" @click="form.decision = 'APPROVED'" type="button"><Check :size="14" /> Approve</button>
                <button :class="{ on: form.decision === 'REJECTED', dgr: form.decision === 'REJECTED' }" @click="form.decision = 'REJECTED'" type="button"><X :size="14" /> Reject</button>
              </div>
              <div class="fld"><label>Notes</label><textarea v-model="form.notes" rows="3" /></div>
            </template>

            <!-- FINALIZE EXIT -->
            <template v-else-if="mode === 'finalize-exit'">
              <p class="exm-note">Marks the employee <b>EXITED</b> (lifecycle), fires asset offboarding, and completes the case.</p>
              <div class="fld"><label>Exit date <i>*</i></label><HrDatePicker v-model="form.exit_date" /></div>
              <label class="exm-toggle"><input type="checkbox" v-model="form.eligible_for_rehire" /> Eligible for rehire</label>
            </template>

            <!-- GENERIC CONFIRM -->
            <template v-else>
              <p class="exm-note">{{ confirmText || 'Confirm this action?' }}</p>
            </template>
          </div>

          <footer class="exm-foot">
            <button class="exm-btn ghost" @click="close" type="button">Cancel</button>
            <Motion as="button" class="exm-btn primary" :class="{ off: !valid || busy }"
              :whileHover="!valid || busy ? {} : { y: -2, scale: 1.03 }" :whileTap="!valid || busy ? {} : { scale: 0.97 }"
              :disabled="!valid || busy" @click="submit" type="button">
              <span class="btn-sheen" aria-hidden="true" />
              <Loader2 v-if="busy" :size="15" class="spin" />
              <component v-else :is="cfg.icon" :size="15" />
              {{ cfg.cta }}
            </Motion>
          </footer>
        </Motion>
      </div>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X, Check, Loader2, DoorOpen, CheckCircle2, XCircle, Ban, CalendarClock, ShieldCheck, BadgeCheck, Undo2, FilePen, User, AlertTriangle, Sparkles, ClipboardCheck, Minus, Plus, Activity, ArrowRight, ArrowUpRight, ArrowDownRight } from 'lucide-vue-next'
import ExSelect from '../components/ExSelect.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import { RESIGNATION_TYPES, REASON_CATEGORIES, resignationTypeMeta, reasonMeta, fmtDate, todayISO, addDays, daysBetween, daysRemaining, fetchNoticePreview, fetchPolicies } from '@/composables/useExit'

const props = defineProps({
  open: { type: Boolean, default: false },
  mode: { type: String, default: 'create' },
  subtitle: { type: String, default: '' },
  confirmText: { type: String, default: '' },
  employees: { type: Array, default: () => [] }, // [{id, name, code}]
  initial: { type: Object, default: null },      // case detail for edit mode
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'submit'])
const today = todayISO()

const CFG = {
  create: { title: 'New separation', cta: 'Create case', icon: DoorOpen, tone: 'violet' },
  edit: { title: 'Edit separation', cta: 'Save changes', icon: FilePen, tone: 'violet' },
  accept: { title: 'Accept resignation', cta: 'Accept', icon: CheckCircle2, tone: 'amber' },
  'start-notice': { title: 'Start notice period', cta: 'Start notice', icon: CalendarClock, tone: 'violet' },
  'waive-notice': { title: 'Waive notice', cta: 'Waive', icon: Undo2, tone: 'amber' },
  'adjust-notice': { title: 'Adjust notice', cta: 'Save', icon: CalendarClock, tone: 'amber' },
  reject: { title: 'Reject resignation', cta: 'Reject', icon: XCircle, tone: 'danger' },
  cancel: { title: 'Cancel case', cta: 'Cancel case', icon: Ban, tone: 'danger' },
  'manager-decision': { title: 'Manager decision', cta: 'Submit', icon: ShieldCheck, tone: 'amber' },
  'finalize-exit': { title: 'Finalize exit', cta: 'Mark exited', icon: BadgeCheck, tone: 'violet' },
  confirm: { title: 'Confirm', cta: 'Confirm', icon: Check, tone: 'amber' },
}
const cfg = computed(() => CFG[props.mode] || CFG.confirm)

const form = reactive({})
const reset = () => {
  Object.keys(form).forEach(k => delete form[k])
  if (props.mode === 'create') {
    Object.assign(form, { resignation_type: 'VOLUNTARY', resignation_date: today, policy_id: '' })
    // Deep-link from the employee profile ("Initiate Exit") pre-selects the employee.
    if (props.initial?.employee_id) form.employee_id = props.initial.employee_id
  }
  if (props.mode === 'edit' && props.initial) {
    const d = props.initial
    Object.assign(form, {
      resignation_type: d.resignation_type || 'VOLUNTARY',
      reason_category: d.reason_category || '',
      reason_detail: d.reason_detail || '',
      resignation_date: d.resignation_date || '',
      requested_last_working_date: d.requested_last_working_date || '',
      policy_id: d.policy_id || '',
    })
  }
  if (props.mode === 'accept') {
    const d = props.initial || {}
    const term = ['TERMINATION', 'MUTUAL_SEPARATION'].includes(d.resignation_type)
    const waived = d.notice_waived != null ? d.notice_waived : term
    Object.assign(form, {
      resignation_type: d.resignation_type || 'VOLUNTARY',
      notice_period_days: waived ? 0 : (d.notice_period_days != null ? d.notice_period_days : 30),
      notice_waived: waived,
      eligible_for_rehire: d.eligible_for_rehire != null ? d.eligible_for_rehire : true,
      last_working_date: '',
    })
    acceptTouched.value = false
    acceptPrevNotice = form.notice_period_days || 30
    // Seed the last working day: honour an already-planned / employee-requested date,
    // otherwise derive it from the notice period (counted from acceptance = today).
    if (waived) {
      form.last_working_date = today
    } else {
      const req = d.last_working_date || d.requested_last_working_date
      if (req && req >= today) {
        form.last_working_date = req
        const span = daysBetween(today, req)
        if (d.notice_period_days == null && span != null) form.notice_period_days = Math.max(0, span)
      } else {
        form.last_working_date = addDays(today, form.notice_period_days)
      }
    }
    // If HR never set explicit notice days, refine the default from the grade policy.
    if (!waived && d.notice_period_days == null && d.employee_id) loadAcceptNotice(d)
  }
  if (props.mode === 'start-notice') {
    const d = props.initial || {}
    const start = d.notice_period_start_date || today        // notice begins now by default
    let days = d.notice_period_days
    if (days == null && d.last_working_date) {               // back-derive the window from the accepted last day
      const span = daysBetween(start, d.last_working_date)
      if (span != null) days = Math.max(0, span)
    }
    if (days == null) days = 30
    form.notice_period_start_date = start
    form.notice_period_days = days
    // honour the accept-time planned last day if it still sits after the start, else derive it
    form.last_working_date = (d.last_working_date && d.last_working_date >= start)
      ? d.last_working_date : addDays(start, days)
  }
  if (props.mode === 'adjust-notice') {
    const d = props.initial || {}
    const start = d.notice_period_start_date || today
    const cur = d.last_working_date || addDays(start, d.notice_period_days != null ? d.notice_period_days : 30)
    const span = daysBetween(start, cur)
    form.last_working_date = cur
    form.notice_period_days = d.notice_period_days != null ? d.notice_period_days : (span != null ? Math.max(0, span) : 30)
    form.reason = ''
    adjPicked.value = ''
    adjNote.value = ''
  }
  if (props.mode === 'manager-decision') form.decision = 'APPROVED'
}
watch(() => props.open, (o) => { if (o) reset() })

const types = RESIGNATION_TYPES
const employeeOpts = computed(() => props.employees.map(e => ({ value: e.id, label: `${e.name || e.code} · ${e.code || ''}` })))
const reasonOpts = [{ value: '', label: '(none)' }, ...REASON_CATEGORIES.map(r => ({ value: r.key, label: r.label, icon: r.icon }))]

// live-preview helpers (create / edit mode)
const selEmp = computed(() => {
  if (props.mode === 'edit' && props.initial) return { name: props.initial.employee_name, code: props.initial.employee_code }
  return props.employees.find(e => e.id === form.employee_id) || null
})
const selType = computed(() => resignationTypeMeta(form.resignation_type))
const selReason = computed(() => (form.reason_category ? reasonMeta(form.reason_category) : null))

// applicable notice period (resolved from the Exit Policy by grade) — informs HR up-front
const noticeInfo = ref(null)
let noticeReq = 0
const empIdForNotice = computed(() => (props.mode === 'edit' ? props.initial?.employee_id : form.employee_id))
const loadNoticePreview = async () => {
  const id = empIdForNotice.value
  if (!['create', 'edit'].includes(props.mode) || !id) { noticeInfo.value = null; return }
  const seq = ++noticeReq
  try {
    const d = await fetchNoticePreview(id, form.resignation_type || 'VOLUNTARY')
    if (seq === noticeReq) {
      noticeInfo.value = d
      // On create, default the policy to the grade match and auto-fill the last day.
      // On edit we never auto-overwrite an existing requested date on open.
      if (props.mode === 'create') {
        if (!form.policy_id && d.policy_id) form.policy_id = d.policy_id
        applyNoticeToLwd()
      }
    }
  } catch { if (seq === noticeReq) noticeInfo.value = null }
}
watch([empIdForNotice, () => form.resignation_type, () => props.open], () => {
  if (props.open) loadNoticePreview(); else noticeInfo.value = null
})

// ── exit-policy selection → auto-fill the requested last working day ─────────
const policies = ref([])
const loadPolicies = async () => {
  if (policies.value.length) return
  try { const d = await fetchPolicies({ limit: 200 }); policies.value = d.items || [] }
  catch { policies.value = [] }
}
const policyOpts = computed(() => policies.value.map(p => ({
  value: p.id, label: `${p.policy_name} · ${p.notice_period_days}d`,
  hint: p.grade_name ? `Grade ${p.grade_name}` : 'All grades',
})))
const selectedPolicy = computed(() => policies.value.find(p => p.id === form.policy_id) || null)
const noticeWaived = computed(() => ['TERMINATION', 'MUTUAL_SEPARATION'].includes(form.resignation_type))
const appliedNoticeDays = computed(() => {
  if (noticeWaived.value) return 0
  const p = selectedPolicy.value
  if (p) return form.resignation_type === 'PROBATION_EXIT' ? p.probation_notice_days : p.notice_period_days
  if (noticeInfo.value) return noticeInfo.value.applied_notice_days
  return null
})
const policyLabel = computed(() => {
  if (selectedPolicy.value) return `Per ${selectedPolicy.value.policy_name}`
  if (noticeInfo.value) return noticeInfo.value.is_default ? 'Org default — no grade-specific policy' : `Per ${noticeInfo.value.policy_name}`
  return ''
})
const policyMismatch = computed(() =>
  !!(selectedPolicy.value && noticeInfo.value?.policy_id && selectedPolicy.value.id !== noticeInfo.value.policy_id))
const applyNoticeToLwd = () => {
  if (!['create', 'edit'].includes(props.mode)) return
  const n = appliedNoticeDays.value
  if (n == null) return
  form.requested_last_working_date = addDays(form.resignation_date || today, n)
}
const setType = (key) => { form.resignation_type = key; applyNoticeToLwd() }
const onPolicyChange = () => applyNoticeToLwd()
watch(() => props.open, (o) => { if (o) loadPolicies() })

// ── ACCEPT: auto-derive the last working day, two-way synced with notice days ──
const acceptTouched = ref(false)   // any manual edit stops the policy-preview auto-fill
let acceptPrevNotice = 30          // remembers notice days across a waive toggle
let acceptNoticeReq = 0
const acceptName = computed(() => props.initial?.employee_name || props.initial?.employee_code || 'This employee')
const relievesLabel = computed(() => {
  if (form.notice_waived) return 'Immediate release'
  const d = daysRemaining(form.last_working_date)
  if (d == null) return ''
  return d <= 0 ? 'Relieves today' : `Relieves in ${d} day${d === 1 ? '' : 's'}`
})
const noticeFillPct = computed(() => {
  if (form.notice_waived) return 8
  const n = Number(form.notice_period_days) || 0
  return Math.max(10, Math.min(100, Math.round((n / 90) * 100)))
})
const setNotice = (n) => {
  if (form.notice_waived) return
  acceptTouched.value = true
  form.notice_period_days = n; acceptPrevNotice = n
  form.last_working_date = addDays(today, n)
}
const bumpNotice = (delta) => { if (!form.notice_waived) setNotice(Math.max(0, (Number(form.notice_period_days) || 0) + delta)) }
const onNoticeChange = () => { if (props.mode === 'accept' && !form.notice_waived) setNotice(Math.max(0, Number(form.notice_period_days) || 0)) }
const onLwdChange = () => {
  if (props.mode !== 'accept' || form.notice_waived) return
  acceptTouched.value = true
  const span = daysBetween(today, form.last_working_date)
  if (span != null) { form.notice_period_days = Math.max(0, span); acceptPrevNotice = form.notice_period_days }
}
const toggleWaive = () => {
  acceptTouched.value = true
  form.notice_waived = !form.notice_waived
  if (form.notice_waived) { acceptPrevNotice = form.notice_period_days || acceptPrevNotice || 30; form.notice_period_days = 0; form.last_working_date = today }
  else { form.notice_period_days = acceptPrevNotice || 30; form.last_working_date = addDays(today, form.notice_period_days) }
}
const loadAcceptNotice = async (d) => {
  const seq = ++acceptNoticeReq
  try {
    const r = await fetchNoticePreview(d.employee_id, d.resignation_type || 'VOLUNTARY')
    if (seq !== acceptNoticeReq || props.mode !== 'accept' || acceptTouched.value || form.notice_waived) return
    if (r && r.applied_notice_days != null) {
      form.notice_period_days = r.applied_notice_days
      acceptPrevNotice = r.applied_notice_days || 30
      form.last_working_date = addDays(today, form.notice_period_days)
    }
  } catch { /* keep the 30-day default */ }
}

// ── START NOTICE: notice start ⇄ length ⇄ last working day, all auto-synced ──
const snDuration = computed(() => Math.max(0, Number(form.notice_period_days) || 0))
const snFillPct = computed(() => Math.max(10, Math.min(100, Math.round((snDuration.value / 90) * 100))))
const snRelievesLabel = computed(() => {
  const d = daysRemaining(form.last_working_date)
  if (d == null) return ''
  if (d < 0) return 'Last day already passed'
  return d === 0 ? 'Relieves today' : `Relieves in ${d} day${d === 1 ? '' : 's'}`
})
const snRecomputeLwd = () => {
  const start = form.notice_period_start_date || today
  form.last_working_date = addDays(start, Math.max(0, Number(form.notice_period_days) || 0))
}
const snOnStartChange = () => { if (props.mode === 'start-notice') snRecomputeLwd() }
const snSetStart = (d) => { form.notice_period_start_date = d; snRecomputeLwd() }
const snSetDays = (n) => { form.notice_period_days = Math.max(0, n); snRecomputeLwd() }
const snBump = (delta) => snSetDays(Math.max(0, (Number(form.notice_period_days) || 0) + delta))
const snOnDaysChange = () => { if (props.mode === 'start-notice') snSetDays(Math.max(0, Number(form.notice_period_days) || 0)) }
const snOnLwdChange = () => {
  if (props.mode !== 'start-notice') return
  const span = daysBetween(form.notice_period_start_date || today, form.last_working_date)
  if (span != null) form.notice_period_days = Math.max(0, span)
}

// ── ADJUST NOTICE: a before→after revision against the committed notice, w/ a reason ──
const adjPicked = ref('')
const adjNote = ref('')
const ADJ_PRESETS = ['Extended at employee request', 'Extended for handover / KT', 'Early release agreed', 'Buyout / shortfall settled', 'Date correction', 'Business / replacement timeline', 'Other']
const adjPresets = ADJ_PRESETS
const adjStart = computed(() => props.initial?.notice_period_start_date || today)
const adjOrigLwd = computed(() => props.initial?.last_working_date || null)
const _daysLabel = (d) => d == null ? '—' : d < 0 ? `${-d}d overdue` : d === 0 ? 'last day today' : `${d}d left`
const adjOrigDaysLabel = computed(() => _daysLabel(daysRemaining(adjOrigLwd.value)))
const adjNewDaysLabel = computed(() => _daysLabel(daysRemaining(form.last_working_date)))
const adjDelta = computed(() => {
  if (!adjOrigLwd.value || !form.last_working_date) return null
  return daysBetween(adjOrigLwd.value, form.last_working_date)
})
const adjDeltaTone = computed(() => { const v = adjDelta.value; return v == null || v === 0 ? 'flat' : v > 0 ? 'ext' : 'cut' })
const adjDeltaIcon = computed(() => { const v = adjDelta.value; return v == null || v === 0 ? Minus : v > 0 ? ArrowUpRight : ArrowDownRight })
const adjDeltaLabel = computed(() => {
  const v = adjDelta.value
  if (v == null || v === 0) return 'No change'
  return v > 0 ? `Extended +${v}d` : `Reduced ${Math.abs(v)}d`
})
const adjReasonValid = computed(() => adjPicked.value === 'Other' ? !!adjNote.value.trim() : !!(adjPicked.value || adjNote.value.trim()))
const adjPick = (r) => { adjPicked.value = adjPicked.value === r ? '' : r }
const adjSetDays = (n) => { form.notice_period_days = Math.max(0, n); form.last_working_date = addDays(adjStart.value, form.notice_period_days) }
const adjBump = (delta) => adjSetDays(Math.max(0, (Number(form.notice_period_days) || 0) + delta))
const adjOnDaysChange = () => { if (props.mode === 'adjust-notice') adjSetDays(Math.max(0, Number(form.notice_period_days) || 0)) }
const adjOnLwdChange = () => {
  if (props.mode !== 'adjust-notice') return
  const span = daysBetween(adjStart.value, form.last_working_date)
  if (span != null) form.notice_period_days = Math.max(0, span)
}
// keep form.reason (sent to the backend) in sync with the chip + note
watch([adjPicked, adjNote], () => {
  if (props.mode !== 'adjust-notice') return
  const preset = adjPicked.value && adjPicked.value !== 'Other' ? adjPicked.value : ''
  const n = (adjNote.value || '').trim()
  form.reason = preset && n ? `${preset} — ${n}` : (preset || n)
})

const valid = computed(() => {
  if (props.mode === 'create') return !!form.employee_id && !!form.resignation_type
  if (props.mode === 'edit') return !!form.resignation_type
  if (props.mode === 'accept') return form.notice_waived || !!form.last_working_date
  if (props.mode === 'start-notice') return !!form.notice_period_start_date && !!form.last_working_date
  if (props.mode === 'adjust-notice') return !!form.last_working_date && adjReasonValid.value
  if (props.mode === 'reject' || props.mode === 'cancel' || props.mode === 'waive-notice') return !!(form.reason && form.reason.trim())
  if (props.mode === 'finalize-exit') return !!form.exit_date
  return true
})

const close = () => emit('close')
const submit = () => {
  if (!valid.value || props.busy) return
  // omit empty-string fields so Optional enum/date columns aren't sent as '' (Pydantic rejects)
  const payload = {}
  for (const [k, v] of Object.entries(form)) { if (v === '') continue; payload[k] = v }
  emit('submit', payload)
}
</script>

<style scoped>
.exm-overlay { position: fixed; inset: 0; z-index: 1440; display: grid; place-items: center; padding: 20px;
  background: rgba(6, 5, 10, 0.66); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
[data-theme="light"] .exm-overlay { background: rgba(40, 30, 15, 0.42); }
/* Card clips to the radius (overflow:hidden, no scroll) so all four corners stay
   round; the BODY scrolls between a fixed head + foot. A sticky footer inside a
   rounded scroll container isn't clipped by Chrome → square bottom corners. */
.exm { position: relative; overflow: hidden; width: min(540px, 96vw); max-height: 92vh;
  display: flex; flex-direction: column;
  border-radius: 22px; background: var(--ex-surface-elevated); border: 1px solid var(--ex-border-strong); box-shadow: var(--ex-shadow); }
.exm-aura { position: absolute; inset: -40% 30% 50% -10%; pointer-events: none; animation: ex-aura-drift 11s ease-in-out infinite;
  background: radial-gradient(60% 80% at 20% 0%, var(--tone-aura, rgba(251,146,60,0.2)), transparent 70%); }
.exm-edge { position: absolute; top: 0; left: 0; right: 0; height: 2px; pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--ex-ember), var(--ex-amber-bright), transparent); opacity: 0.8; }
.exm.tone-danger { --tone-aura: rgba(239,68,68,0.2); }
.exm.tone-danger .exm-edge { background: linear-gradient(90deg, transparent, #ef4444, #fca5a5, transparent); }
.exm.tone-amber { --tone-aura: rgba(251,191,36,0.18); }
.exm-head { position: relative; flex-shrink: 0; display: flex; align-items: flex-start; gap: 12px; padding: 18px 20px 12px; }
.exm-ico { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
  color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.exm.tone-danger .exm-ico { color: var(--ex-blocked); background: var(--ex-blocked-soft); border-color: color-mix(in srgb, var(--ex-blocked) 30%, transparent); }
.exm.tone-amber .exm-ico { color: var(--ex-amber); background: var(--ex-amber-soft); border-color: var(--ex-amber-border); }
.exm-title { font-size: 16px; font-weight: 820; color: var(--ex-text); margin: 0; }
.exm-sub { font-size: 11.5px; color: var(--ex-text-muted); margin: 2px 0 0; }
.exm-x { margin-left: auto; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; cursor: pointer;
  background: transparent; border: 1px solid var(--ex-border); color: var(--ex-text-muted); transition: all 0.2s; }
.exm-x:hover { color: var(--ex-text); border-color: var(--ex-border-strong); transform: rotate(90deg); }
.exm-body { position: relative; flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 6px 20px 14px; display: flex; flex-direction: column; gap: 12px; }
.exm-body > * { animation: ex-fade-up 0.42s var(--ex-spring) backwards; }
.exm-body > *:nth-child(1) { animation-delay: 0.04s; }
.exm-body > *:nth-child(2) { animation-delay: 0.09s; }
.exm-body > *:nth-child(3) { animation-delay: 0.14s; }
.exm-body > *:nth-child(4) { animation-delay: 0.19s; }
.exm-body > *:nth-child(5) { animation-delay: 0.24s; }
.exm-body > *:nth-child(6) { animation-delay: 0.29s; }
.exm-body > *:nth-child(7) { animation-delay: 0.34s; }

/* ── Separation Pass live preview ─────────────────────────────────────────── */
.pass { position: relative; overflow: hidden; border-radius: 15px; background: var(--ex-panel);
  border: 1px solid var(--ex-border); transition: border-color 0.4s, box-shadow 0.4s; }
.pass.ready { border-color: var(--ex-violet-border); box-shadow: 0 0 28px -10px rgba(251,146,60,0.5); }
.pass-perf { position: absolute; left: 0; right: 0; top: 52px; height: 1px; pointer-events: none;
  background: repeating-linear-gradient(90deg, var(--ex-border-strong) 0 5px, transparent 5px 11px); }
.pass-band { display: flex; align-items: center; gap: 11px; padding: 11px 14px; background: var(--ex-grad-card); }
.pass-ico { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
  color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.pass-band-t { display: flex; flex-direction: column; min-width: 0; }
.pass-kicker { font-size: 9px; font-weight: 800; letter-spacing: 0.2em; color: var(--ex-text-muted); }
.pass-type { font-size: 14px; font-weight: 820; color: var(--ex-text); }
.pass-stamp { margin-left: auto; font-size: 10px; font-weight: 850; letter-spacing: 0.12em; padding: 4px 9px; border-radius: 7px;
  color: var(--ex-text-muted); background: var(--ex-steel-soft); border: 1px dashed var(--ex-border-strong); transition: all 0.4s; }
.pass-stamp.on { color: var(--ex-cleared); background: var(--ex-cleared-soft); border-style: solid; border-color: color-mix(in srgb, var(--ex-cleared) 36%, transparent); transform: rotate(-3deg); }
.pass-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--ex-border); }
.pass-cell { display: flex; flex-direction: column; gap: 2px; padding: 9px 14px; background: var(--ex-panel); }
.pass-cell.span { grid-column: 1 / -1; }
.fld-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.pc-k { font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ex-text-dim); }
.pc-v { font-size: 12.5px; font-weight: 700; color: var(--ex-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ── segmented separation-type picker ─────────────────────────────────────── */
.type-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.type-opt { display: inline-flex; align-items: center; gap: 8px; padding: 9px 11px; border-radius: 11px; cursor: pointer; text-align: left;
  background: var(--ex-surface); border: 1px solid var(--ex-border); color: var(--ex-text-secondary); font-size: 12.5px; font-weight: 700; font-family: inherit;
  transition: all 0.2s var(--ex-spring); }
.type-opt svg { color: var(--ex-text-muted); flex-shrink: 0; transition: color 0.2s; }
.type-opt:hover { border-color: var(--ex-border-strong); transform: translateY(-1px); }
.type-opt.on { border-color: var(--ex-violet-border); background: var(--ex-violet-soft); color: var(--ex-violet); }
.type-opt.on svg { color: var(--ex-violet); }

/* ── applicable notice-period banner ──────────────────────────────────────── */
.notice-info { display: flex; gap: 10px; align-items: flex-start; padding: 11px 13px; border-radius: 12px;
  background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.notice-info.waived { background: var(--ex-amber-soft); border-color: var(--ex-amber-border); }
.ni-ico { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
  color: var(--ex-violet); background: color-mix(in srgb, var(--ex-violet) 14%, transparent); }
.notice-info.waived .ni-ico { color: var(--ex-amber); background: var(--ex-amber-soft); }
.ni-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ni-lead { font-size: 13px; color: var(--ex-text); }
.ni-lead b { font-family: var(--ex-mono); font-weight: 850; color: var(--ex-violet); }
.ni-sub { font-size: 11px; color: var(--ex-text-muted); }
.ni-hint { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 700; color: var(--ex-amber); margin-top: 3px; }

.exm-note { font-size: 12.5px; color: var(--ex-text-secondary); margin: 0; padding: 9px 11px; border-radius: 10px;
  background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.exm-note.danger { background: var(--ex-blocked-soft); border-color: color-mix(in srgb, var(--ex-blocked) 28%, transparent); color: var(--ex-text-secondary); }
.fld { display: flex; flex-direction: column; gap: 5px; }
.fld label { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ex-text-muted); }
.fld label i { color: var(--ex-violet); font-style: normal; }
.fld-ro { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 10px; font-size: 13px;
  background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); color: var(--ex-text); }
.fld-ro svg { color: var(--ex-violet); flex-shrink: 0; }
.ro-name { font-weight: 800; }
.ro-code { margin-left: auto; font-size: 11px; color: var(--ex-text-muted); }
.fld input, .fld textarea { width: 100%; padding: 10px 12px; border-radius: 10px; font-size: 13px; font-family: inherit;
  background: rgba(0,0,0,0.3); border: 1px solid var(--ex-border); color: var(--ex-text); resize: vertical; transition: border-color 0.2s, box-shadow 0.2s; }
.fld input:focus, .fld textarea:focus { outline: none; border-color: var(--ex-violet-border); box-shadow: 0 0 0 3px rgba(251,146,60,0.12); }
[data-theme="light"] .fld input, [data-theme="light"] .fld textarea { background: rgba(255,250,242,0.72); }
.exm-toggle { display: flex; align-items: center; gap: 9px; font-size: 12.5px; color: var(--ex-text-secondary); cursor: pointer; }
.exm-toggle input { width: 16px; height: 16px; accent-color: var(--ex-violet); }
.seg { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.seg button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border-radius: 10px; cursor: pointer;
  background: var(--ex-surface); border: 1px solid var(--ex-border); color: var(--ex-text-secondary); font-weight: 700; font-size: 13px; transition: all 0.2s; }
.seg button.on { border-color: var(--ex-violet-border); background: var(--ex-violet-soft); color: var(--ex-violet); }
.seg button.on.dgr { border-color: color-mix(in srgb, var(--ex-blocked) 36%, transparent); background: var(--ex-blocked-soft); color: var(--ex-blocked); }
/* ── ACCEPT: Acceptance Pass + notice timeline ───────────────────────────── */
.acc { position: relative; overflow: hidden; border-radius: 16px; padding: 13px 15px 14px;
  background: var(--ex-panel); border: 1px solid var(--ex-border); }
.acc-aura { position: absolute; inset: -60% 30% 30% -20%; pointer-events: none; transition: background 0.5s;
  background: radial-gradient(60% 80% at 25% 0%, rgba(52, 211, 153, 0.16), transparent 70%); }
.acc.waived .acc-aura { background: radial-gradient(60% 80% at 25% 0%, rgba(251, 146, 60, 0.18), transparent 70%); }
.acc-head { position: relative; display: flex; align-items: center; gap: 11px; margin-bottom: 16px; }
.acc-badge { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
  color: var(--ex-cleared); background: var(--ex-cleared-soft); border: 1px solid color-mix(in srgb, var(--ex-cleared) 32%, transparent); transition: all 0.4s; }
.acc.waived .acc-badge { color: var(--ex-amber); background: var(--ex-amber-soft); border-color: var(--ex-amber-border); }
.acc-h-t { display: flex; flex-direction: column; min-width: 0; }
.acc-kicker { font-size: 9px; font-weight: 800; letter-spacing: 0.16em; color: var(--ex-text-muted); }
.acc-name { font-size: 14.5px; font-weight: 820; color: var(--ex-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.acc-stamp { margin-left: auto; flex-shrink: 0; font-size: 9.5px; font-weight: 850; letter-spacing: 0.14em; padding: 4px 9px; border-radius: 7px; transition: all 0.4s;
  color: var(--ex-cleared); background: var(--ex-cleared-soft); border: 1px solid color-mix(in srgb, var(--ex-cleared) 34%, transparent); }
.acc-stamp.waived { color: var(--ex-amber); background: var(--ex-amber-soft); border-color: var(--ex-amber-border); transform: rotate(-3deg); }

.acc-tl { position: relative; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; }
.acc-node { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.acc-node.end { align-items: flex-end; text-align: right; }
.acc-dot { width: 11px; height: 11px; border-radius: 50%; background: var(--ex-steel); box-shadow: 0 0 0 3px var(--ex-steel-soft); }
.acc-dot.end { background: var(--ex-cleared); box-shadow: 0 0 10px 1px color-mix(in srgb, var(--ex-cleared) 60%, transparent); }
.acc.waived .acc-dot.end { background: var(--ex-amber-bright); box-shadow: 0 0 10px 1px color-mix(in srgb, var(--ex-amber-bright) 60%, transparent); }
.acc-nk { font-size: 9.5px; font-weight: 750; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ex-text-dim); }
.acc-nv { font-size: 12.5px; font-weight: 800; color: var(--ex-text); }
.acc-nv.hl { font-size: 14px; color: var(--ex-cleared); }
.acc.waived .acc-nv.hl { color: var(--ex-amber-strong); }
.acc-track { position: relative; height: 4px; border-radius: 999px; background: var(--ex-steel-soft); }
.acc-fill { position: absolute; left: 0; top: 0; height: 100%; border-radius: 999px; transition: width 0.6s var(--ex-spring);
  background: linear-gradient(90deg, var(--ex-amber), var(--ex-ember) 55%, var(--ex-cleared)); }
.acc.waived .acc-fill { background: var(--ex-amber); }
.acc-comet { position: absolute; right: -1px; top: 50%; width: 7px; height: 7px; border-radius: 50%; transform: translateY(-50%);
  background: #fff; animation: acc-comet-pulse 1.8s ease-in-out infinite; }
.acc-track-lab { position: absolute; left: 50%; top: -19px; transform: translateX(-50%); white-space: nowrap;
  display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 750; color: var(--ex-text-muted); }
.acc-track-lab svg { color: var(--ex-amber); }
.acc-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
.acc-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; padding: 4px 9px; border-radius: 999px;
  color: var(--ex-text-muted); background: var(--ex-steel-soft); border: 1px solid var(--ex-border); }
.acc-chip.hl { margin-left: auto; color: var(--ex-cleared); background: var(--ex-cleared-soft); border-color: color-mix(in srgb, var(--ex-cleared) 28%, transparent); }
.acc.waived .acc-chip.hl { color: var(--ex-amber-strong); background: var(--ex-amber-soft); border-color: var(--ex-amber-border); }

.fld.is-dim { opacity: 0.5; pointer-events: none; }
.notice-ctl { display: flex; flex-direction: column; gap: 8px; }
.np-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
.np { padding: 8px 0; border-radius: 9px; cursor: pointer; font-size: 12px; font-weight: 800; font-family: var(--ex-mono);
  background: var(--ex-surface); border: 1px solid var(--ex-border); color: var(--ex-text-secondary); transition: all 0.2s var(--ex-spring); }
.np:hover:not(:disabled) { border-color: var(--ex-amber-border); transform: translateY(-1px); }
.np.on { border-color: var(--ex-amber-border); background: var(--ex-amber-soft); color: var(--ex-amber-strong); }
.np:disabled { cursor: not-allowed; }
.np-step { display: flex; align-items: center; gap: 8px; padding: 5px 6px; border-radius: 10px; background: rgba(0, 0, 0, 0.3); border: 1px solid var(--ex-border); }
[data-theme="light"] .np-step { background: rgba(255, 250, 242, 0.72); }
.np-pm { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; cursor: pointer;
  background: var(--ex-surface); border: 1px solid var(--ex-border); color: var(--ex-text); transition: all 0.18s; }
.np-pm:hover:not(:disabled) { border-color: var(--ex-amber-border); color: var(--ex-amber-strong); }
.np-pm:disabled { opacity: 0.4; cursor: not-allowed; }
.np-step input { flex: 1; min-width: 0; background: none; border: none; outline: none; text-align: center;
  font-family: var(--ex-mono); font-size: 15px; font-weight: 850; color: var(--ex-text); }
.np-step input::-webkit-outer-spin-button, .np-step input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.np-unit { font-size: 11px; font-weight: 700; color: var(--ex-text-dim); padding-right: 6px; }
.lwd-auto { display: inline-flex; align-items: center; gap: 3px; margin-left: 7px; font-size: 9px; font-weight: 700; text-transform: none; letter-spacing: 0; color: var(--ex-cleared); }
.lwd-auto svg { color: var(--ex-amber-bright); }

.acc-switches { display: flex; flex-direction: column; gap: 8px; }
.sw { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border-radius: 12px; cursor: pointer; text-align: left; font-family: inherit;
  background: var(--ex-surface); border: 1px solid var(--ex-border); transition: border-color 0.2s, background 0.2s; }
.sw:hover { border-color: var(--ex-border-strong); }
.sw.on { border-color: var(--ex-amber-border); background: var(--ex-amber-soft); }
.sw.good.on { border-color: color-mix(in srgb, var(--ex-cleared) 34%, transparent); background: var(--ex-cleared-soft); }
.sw-track { position: relative; flex-shrink: 0; width: 38px; height: 22px; border-radius: 999px; background: var(--ex-steel-soft); border: 1px solid var(--ex-border); transition: background 0.25s, border-color 0.25s; }
.sw.on .sw-track { background: var(--ex-amber); border-color: transparent; }
.sw.good.on .sw-track { background: var(--ex-cleared); }
.sw-knob { position: absolute; top: 50%; left: 2px; width: 16px; height: 16px; border-radius: 50%; transform: translateY(-50%);
  background: #fff; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.35); transition: left 0.25s var(--ex-spring); }
.sw.on .sw-knob { left: 18px; }
.sw-tx { display: flex; flex-direction: column; min-width: 0; }
.sw-tx b { font-size: 12.5px; font-weight: 800; color: var(--ex-text); }
.sw-tx i { font-size: 10.5px; font-style: normal; color: var(--ex-text-muted); }
@keyframes acc-comet-pulse { 0%, 100% { box-shadow: 0 0 6px 0 var(--ex-amber-bright); } 50% { box-shadow: 0 0 12px 2px var(--ex-amber-bright); } }

/* ── START NOTICE: re-tone the Acceptance Pass to the in-progress brand accent ─ */
.acc.is-notice .acc-aura { background: radial-gradient(60% 80% at 25% 0%, rgba(251, 146, 60, 0.16), transparent 70%); }
.acc.is-notice .acc-badge { color: var(--ex-violet); background: var(--ex-violet-soft); border-color: var(--ex-violet-border); }
.acc.is-notice .acc-dot.end { background: var(--ex-violet); box-shadow: 0 0 10px 1px color-mix(in srgb, var(--ex-violet) 60%, transparent); }
.acc.is-notice .acc-nv.hl { color: var(--ex-violet); }
.acc.is-notice .acc-fill { background: linear-gradient(90deg, var(--ex-amber), var(--ex-ember) 60%, var(--ex-violet)); }
.acc.is-notice .acc-chip.hl { color: var(--ex-violet); background: var(--ex-violet-soft); border-color: var(--ex-violet-border); }
.acc-stamp.on-notice { display: inline-flex; align-items: center; gap: 6px; color: var(--ex-violet); background: var(--ex-violet-soft); border-color: var(--ex-violet-border); }
.sn-ping { width: 6px; height: 6px; border-radius: 50%; background: var(--ex-violet); animation: sn-ping 1.8s ease-out infinite; }
@keyframes sn-ping { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--ex-violet) 70%, transparent); } 70%, 100% { box-shadow: 0 0 0 7px transparent; } }
.sn-today { margin-left: 7px; padding: 2px 8px; border-radius: 999px; cursor: pointer; font-size: 9px; font-weight: 750; text-transform: none; letter-spacing: 0; font-family: inherit;
  color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); transition: transform 0.18s var(--ex-spring); }
.sn-today:hover { transform: translateY(-1px); }

/* ── ADJUST NOTICE: before → after revision ──────────────────────────────── */
.adj { position: relative; overflow: hidden; border-radius: 16px; padding: 13px 15px 14px; background: var(--ex-panel); border: 1px solid var(--ex-border); }
.adj .acc-aura { background: radial-gradient(60% 80% at 25% 0%, rgba(251, 146, 60, 0.16), transparent 70%); }
.adj.cut .acc-aura { background: radial-gradient(60% 80% at 25% 0%, rgba(52, 211, 153, 0.14), transparent 70%); }
.adj-badge { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
  color: var(--ex-amber); background: var(--ex-amber-soft); border: 1px solid var(--ex-amber-border); }
.adj-delta { display: inline-flex; align-items: center; gap: 5px; margin-left: auto; flex-shrink: 0; font-size: 11px; font-weight: 850; letter-spacing: 0.02em; padding: 4px 10px; border-radius: 999px; }
.adj-delta.ext { color: var(--ex-amber-strong); background: var(--ex-amber-soft); border: 1px solid var(--ex-amber-border); }
.adj-delta.cut { color: var(--ex-cleared); background: var(--ex-cleared-soft); border: 1px solid color-mix(in srgb, var(--ex-cleared) 32%, transparent); }
.adj-delta.flat { color: var(--ex-text-muted); background: var(--ex-steel-soft); border: 1px solid var(--ex-border); }
.adj-cmp { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; }
.adj-col { display: flex; flex-direction: column; gap: 3px; padding: 11px 13px; border-radius: 12px; background: var(--ex-surface); border: 1px solid var(--ex-border); }
.adj-col.new { border-color: var(--ex-amber-border); background: var(--ex-amber-soft); }
.adj.cut .adj-col.new { border-color: color-mix(in srgb, var(--ex-cleared) 30%, transparent); background: var(--ex-cleared-soft); }
.adj-col-k { font-size: 9.5px; font-weight: 750; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ex-text-dim); }
.adj-col-v { font-size: 15px; font-weight: 850; color: var(--ex-text); }
.adj-col-v.hl { color: var(--ex-amber-strong); }
.adj.cut .adj-col-v.hl { color: var(--ex-cleared); }
.adj-col-s { font-size: 10.5px; font-weight: 700; color: var(--ex-text-muted); }
.adj-arrow { display: grid; place-items: center; color: var(--ex-text-dim); }
.adj-reasons { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.reason-chip { display: inline-flex; align-items: center; gap: 8px; padding: 9px 11px; border-radius: 11px; cursor: pointer; text-align: left;
  background: var(--ex-surface); border: 1px solid var(--ex-border); color: var(--ex-text-secondary); font-size: 12px; font-weight: 650; font-family: inherit; }
.rc-tick { display: grid; place-items: center; width: 17px; height: 17px; border-radius: 6px; flex-shrink: 0; border: 1px solid var(--ex-border-strong); color: transparent; transition: all 0.2s; }
.reason-chip.on { border-color: var(--ex-amber-border); background: var(--ex-amber-soft); color: var(--ex-text); }
.reason-chip.on .rc-tick { background: var(--ex-amber); border-color: var(--ex-amber); color: #1a1206; }
.opt { font-size: 10px; font-weight: 600; text-transform: none; letter-spacing: 0; color: var(--ex-text-dim); margin-left: 5px; }
.adj-audit { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--ex-text-muted); padding: 9px 11px; border-radius: 10px; background: var(--ex-steel-soft); border: 1px dashed var(--ex-border-strong); }
.adj-audit svg { color: var(--ex-amber); flex-shrink: 0; }

.exm-foot { position: relative; flex-shrink: 0; display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px 18px;
  background: linear-gradient(180deg, transparent, var(--ex-surface-elevated) 40%); }
.exm-btn { position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: 11px; font-size: 13px; font-weight: 800; cursor: pointer; }
.exm-btn.ghost { background: transparent; border: 1px solid var(--ex-border-strong); color: var(--ex-text-secondary); }
.exm-btn.primary { border: none; background: var(--ex-grad-hero); color: #1a1206; }
.exm-btn.primary.off { opacity: 0.5; cursor: not-allowed; }
.exm.tone-danger .exm-btn.primary { background: linear-gradient(135deg, #ef4444, #b91c1c); color: #fff; }
.btn-sheen { position: absolute; top: 0; left: 0; width: 40%; height: 100%; pointer-events: none; opacity: 0;
  background: linear-gradient(120deg, transparent, rgba(255,255,255,0.5), transparent); }
.exm-btn.primary:not(.off):hover .btn-sheen { opacity: 1; animation: ex-sheen-pass 0.9s ease-out; }
.spin { animation: ex-spin-slow 0.8s linear infinite; }
@media (max-width: 520px) {
  .type-grid, .pass-grid, .fld-row, .adj-reasons { grid-template-columns: 1fr; }
  .adj-cmp { grid-template-columns: 1fr; }
  .adj-arrow { transform: rotate(90deg); }
}
@media (prefers-reduced-motion: reduce) {
  .exm-aura, .spin, .exm-body > *, .acc-comet, .sn-ping { animation: none !important; }
  .exm-x:hover { transform: none; } .btn-sheen { display: none; }
  .acc-fill, .sw-knob, .acc-stamp, .np { transition: none; }
}
</style>
