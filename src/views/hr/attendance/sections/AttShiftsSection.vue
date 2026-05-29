<template>
  <section class="att-shifts">
    <Motion as="header" class="shifts-banner"
      :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="banner-glow" />
      <div class="banner-text">
        <span class="att-eyebrow"><span class="att-eyebrow-dot" />Schedule templates</span>
        <h2 class="banner-title"><span>Shift</span><span class="banner-divider">·</span><span>Templates</span></h2>
        <p class="banner-sub">Reusable shift blueprints with break-windows, late-punch policy and overrun alerts. Assign one as default per employee — the daily rollup honours the active assignment.</p>
      </div>
      <div class="banner-aside">
        <button class="onb-btn-primary" @click="openCreate"><Plus :size="13" />New shift</button>
        <button class="onb-btn-ghost" @click="reload"><RefreshCw :size="13" />Refresh</button>
      </div>
    </Motion>

    <div class="shifts-grid">
      <Motion v-for="(s, i) in shifts" :key="s.id" as="article" class="shift-card"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }"
        :whileHover="{ y: -3 }"
      >
        <header class="card-head">
          <div class="card-head-left">
            <span class="shift-code">{{ s.code }}</span>
            <span class="shift-type" :data-type="s.shift_type">{{ s.shift_type }}</span>
          </div>
          <div class="card-head-actions">
            <button class="icon-btn small assign" title="Assign shift to employees" @click="openAssign(s)"><UsersRound :size="13" /></button>
            <button class="icon-btn small" title="Edit shift" @click="openEdit(s)"><Pencil :size="13" /></button>
            <button class="icon-btn small danger" title="Delete shift" @click="openDelete(s)"><Trash2 :size="13" /></button>
          </div>
        </header>
        <h3 class="shift-name">{{ s.name }}</h3>
        <!-- 24h timeline -->
        <div class="shift-timeline">
          <div class="timeline-track">
            <div class="timeline-bar"
              :style="{
                left: hourPct(s.start_time) + '%',
                width: durationPct(s.start_time, s.end_time) + '%',
              }"
            >
              <span class="timeline-bar-start">{{ shortTime(s.start_time) }}</span>
              <span class="timeline-bar-end">{{ shortTime(s.end_time) }}</span>
            </div>
            <!-- break-window markers -->
            <span v-for="(bw, bi) in (s.break_windows || [])" :key="bi" class="timeline-break"
              :style="{ left: hourPct(bw.start_time) + '%', width: bwWidthPct(bw) + '%' }"
              :title="`${bw.label} ${bw.start_time}–${bw.end_time} (max ${bw.max_minutes}m)`"
            ><span class="break-dot" /></span>
          </div>
          <div class="timeline-ruler">
            <span v-for="h in [0,6,12,18,24]" :key="h">{{ String(h).padStart(2, '0') }}</span>
          </div>
        </div>
        <div class="shift-meta">
          <span><Coffee :size="11" />{{ s.break_minutes }}m total break</span>
          <span><Hourglass :size="11" />{{ s.grace_minutes }}m grace</span>
          <span><Calendar :size="11" />{{ offDaysLabel(s.weekly_off_days) }} off</span>
        </div>
        <div class="shift-policy">
          <span class="policy-chip" :data-on="!!s.late_punch_requires_approval" :title="`Late punches need admin approval beyond ${s.grace_minutes + s.late_self_punch_threshold_minutes}m`">
            <ShieldCheck :size="10" />Late-punch approval
          </span>
          <span class="policy-chip" v-if="(s.break_windows || []).length">
            <Sparkles :size="10" />{{ s.break_windows.length }} break window{{ s.break_windows.length > 1 ? 's' : '' }}
          </span>
          <span class="policy-chip" v-if="s.night_allowance" data-on="true">
            <Moon :size="10" />Night allowance
          </span>
        </div>
        <button class="shift-assign-cta" type="button" @click="openAssign(s)">
          <UsersRound :size="12" />
          <span>{{ (assignedCounts[s.id] || 0) === 0 ? 'Assign to employees' : `${assignedCounts[s.id]} assigned · manage` }}</span>
        </button>
      </Motion>
      <AttEmptyState
        v-if="!shifts.length"
        tone="gold"
        :icon="CalendarClock"
        title="No shift templates yet"
        sub="Reusable shift blueprints with break-windows, late-punch policy and overrun alerts. Create one to assign as the default per employee."
        meta="Live · auto-refresh every minute"
      >
        <template #actions>
          <button class="onb-btn-primary" @click="openCreate"><Plus :size="13" />Create first shift</button>
        </template>
      </AttEmptyState>
    </div>

    <!-- ═══════════════════ Delete modal ═══════════════════ -->
    <AttDeleteModal
      :open="!!deleteTarget"
      title="Delete shift template?"
      subtitle="Existing assignments stay intact, but new assignments to this shift will be blocked."
      :target-label="deleteTarget?.name || ''"
      :target-meta="deleteTarget ? `${shortTime(deleteTarget.start_time)} – ${shortTime(deleteTarget.end_time)} · ${deleteTarget.break_minutes || 0}m break` : ''"
      :target-tag="deleteTarget?.code || ''"
      :target-icon="CalendarClock"
      :presets="[
        'Created by mistake',
        'Duplicate of another shift',
        'No longer used by any team',
        'Replacing with an updated template',
      ]"
      :submitting="deleting"
      confirm-label="Delete shift"
      warning="Deleting a shift is logged to the audit trail. Employees previously on this shift retain their historical records."
      @close="deleteTarget = null"
      @confirm="confirmDelete"
    />

    <!-- ═══════════════════ Create / Edit modal (OnbModal chrome) ═══════════════════ -->
    <OnbModal
      :open="showModal"
      :title="editingId ? 'Update shift template' : 'New shift template'"
      :subtitle="editingId ? 'Saving will roll into the daily attendance summary' : 'Reusable blueprint with break-windows, late-punch policy and overrun alerts'"
      :icon="CalendarClock"
      :width="780"
      @close="closeModal"
    >
      <div class="modal-grid">
              <!-- IDENTITY -->
              <fieldset class="form-block">
                <legend>Identity</legend>
                <div class="field-row tri">
                  <label class="field">
                    <span>Code <em>*</em></span>
                    <input v-model="form.code" placeholder="NIGHT-22-06" class="att-input" :disabled="!!editingId" />
                  </label>
                  <label class="field tall">
                    <span>Name <em>*</em></span>
                    <input v-model="form.name" placeholder="Night Shift" class="att-input" />
                  </label>
                  <label class="field">
                    <span>Type</span>
                    <select v-model="form.shift_type" class="att-input">
                      <option value="GENERAL">General</option>
                      <option value="NIGHT">Night</option>
                      <option value="ROTATIONAL">Rotational</option>
                      <option value="FLEXIBLE">Flexible</option>
                    </select>
                  </label>
                </div>
                <label class="field">
                  <span>Description</span>
                  <input v-model="form.description" placeholder="Optional note about who this shift is for" class="att-input" />
                </label>
              </fieldset>

              <!-- TIMING -->
              <fieldset class="form-block">
                <legend>Timing & day hours</legend>
                <div class="field-row quad">
                  <label class="field">
                    <span>Start <em>*</em></span>
                    <input v-model="form.start_time" type="time" class="att-input" />
                  </label>
                  <label class="field">
                    <span>End <em>*</em></span>
                    <input v-model="form.end_time" type="time" class="att-input" />
                  </label>
                  <label class="field">
                    <span>Half-day hrs</span>
                    <input v-model.number="form.half_day_hours" type="number" min="0" step="0.5" class="att-input" />
                  </label>
                  <label class="field">
                    <span>Full-day hrs</span>
                    <input v-model.number="form.full_day_hours" type="number" min="0" step="0.5" class="att-input" />
                  </label>
                </div>
                <label class="field">
                  <span>Weekly off days</span>
                  <div class="dow-row">
                    <button type="button" v-for="(label, idx) in DOW_LABELS" :key="idx"
                      class="dow-pill" :class="{ active: form.weekly_off_days.includes(idx) }"
                      @click="toggleDow(idx)"
                    >{{ label }}</button>
                  </div>
                </label>
                <label class="field-toggle">
                  <input type="checkbox" v-model="form.night_allowance" />
                  <span class="toggle-label"><Moon :size="11" />Night allowance applicable</span>
                </label>
              </fieldset>

              <!-- LATE-PUNCH POLICY -->
              <fieldset class="form-block">
                <legend>Late-punch policy</legend>
                <label class="field-toggle">
                  <input type="checkbox" v-model="form.late_punch_requires_approval" />
                  <span class="toggle-label"><ShieldCheck :size="11" />Block self-punch beyond threshold — route to admin approval</span>
                </label>
                <div class="field-row tri">
                  <label class="field">
                    <span>Grace (min)</span>
                    <input v-model.number="form.grace_minutes" type="number" min="0" class="att-input" />
                  </label>
                  <label class="field">
                    <span>Self-punch threshold (min past grace)</span>
                    <input v-model.number="form.late_self_punch_threshold_minutes" type="number" min="0" class="att-input"
                      :disabled="!form.late_punch_requires_approval" />
                  </label>
                  <label class="field">
                    <span>Locked at</span>
                    <div class="readout">{{ form.grace_minutes + (form.late_punch_requires_approval ? form.late_self_punch_threshold_minutes : 0) }} min<br><em>past start</em></div>
                  </label>
                </div>
                <p class="hint">
                  Employee can self-punch within <b>grace + threshold</b> of shift start. Beyond that, the clock-in button is replaced with "Request approval" — the punch lands only after admin approves it.
                </p>
              </fieldset>

              <!-- BREAK CONFIG -->
              <fieldset class="form-block">
                <legend>Breaks</legend>
                <div class="field-row tri">
                  <label class="field">
                    <span>Total break per day (min)</span>
                    <input v-model.number="form.break_minutes" type="number" min="0" class="att-input" />
                  </label>
                  <label class="field">
                    <span>Break overrun alert (min)</span>
                    <input v-model.number="form.break_overrun_alert_minutes" type="number" min="0" class="att-input"
                      title="Notify admin if employee doesn't end break within this many minutes past the window" />
                  </label>
                  <label class="field">
                    <span>&nbsp;</span>
                    <button type="button" class="onb-btn-ghost grow" @click="addBreakWindow"><Plus :size="13" />Add window</button>
                  </label>
                </div>
                <p class="hint" v-if="!form.break_windows.length">
                  No break windows configured — employees can start a break any time as long as total break minutes stay under the cap. Add one or more named windows (e.g. <i>Lunch 13:00–14:00</i>) to restrict break timing.
                </p>
                <div class="bw-list">
                  <Motion v-for="(bw, idx) in form.break_windows" :key="idx" as="div" class="bw-row"
                    :initial="{ opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }"
                    :transition="{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }"
                  >
                    <input v-model="bw.label" placeholder="Label (Lunch)" class="att-input bw-label" />
                    <input v-model="bw.start_time" type="time" class="att-input bw-time" />
                    <span class="bw-dash">→</span>
                    <input v-model="bw.end_time" type="time" class="att-input bw-time" />
                    <input v-model.number="bw.max_minutes" type="number" min="1" max="240" class="att-input bw-max" placeholder="max" />
                    <span class="bw-unit">min</span>
                    <button type="button" class="icon-btn small danger" @click="form.break_windows.splice(idx, 1)" title="Remove window">
                      <X :size="13" />
                    </button>
                  </Motion>
                </div>
              </fieldset>
      </div>
      <template #footer>
        <span class="foot-spacer">{{ editingId ? 'Editing shift template' : 'Creating new shift template' }}</span>
        <button class="onb-btn-ghost" @click="closeModal">Cancel</button>
        <button class="onb-btn-primary" :disabled="!isValid || saving" @click="doSubmit">
          <CheckCircle2 v-if="!saving" :size="13" /><Loader2 v-else :size="13" class="spin" />
          {{ saving ? 'Saving…' : (editingId ? 'Save changes' : 'Create shift') }}
        </button>
      </template>
    </OnbModal>

    <!-- ═══════════════════ Assign shift to employees ═══════════════════ -->
    <OnbModal
      :open="!!assignTarget"
      :title="assignTarget ? `Assign · ${assignTarget.name}` : 'Assign shift'"
      :subtitle="assignTarget ? `Roll ${assignTarget.code} out to one or more employees from a chosen start date` : ''"
      :icon="UsersRound"
      :width="680"
      @close="closeAssign"
    >
      <div class="assign-stack">
        <div class="assign-grid-2">
          <OnbField
            v-model="assignForm.effective_from"
            type="date"
            label="Effective from"
            required
            hint="The day the new shift starts applying. Older days keep their previous assignment."
          />
          <OnbField
            v-model="assignForm.effective_until"
            type="date"
            label="Effective until"
            required
            hint="Required — the last day this assignment applies. Prevents accidental open-ended overlaps with future shifts."
          />
        </div>

        <!-- conflict banner shown by the 409 path -->
        <div v-if="assignConflicts.length" class="assign-conflict">
          <div class="assign-conflict-head">
            <ShieldAlert :size="13" />
            <span>{{ assignConflicts.length }} conflict{{ assignConflicts.length === 1 ? '' : 's' }} block this assignment</span>
          </div>
          <ul class="assign-conflict-list">
            <li v-for="c in assignConflicts" :key="c.assignment_id">
              <b>{{ c.employee_name }}</b>
              is already on
              <span class="onb-mono">{{ c.conflicting_shift_code }}</span>
              ({{ c.conflicting_shift_name }})
              from <span class="onb-mono">{{ c.conflicting_from }}</span><span v-if="c.conflicting_until">
                to <span class="onb-mono">{{ c.conflicting_until }}</span></span><span v-else> (open-ended)</span>.
            </li>
          </ul>
        </div>

        <div class="assign-search-wrap">
          <span class="assign-search-icon"><Search :size="13" /></span>
          <input
            v-model="assignSearch"
            class="assign-search-input"
            placeholder="Search by name, code or department…"
            @input="filterEmployees"
          />
          <span v-if="assignForm.employee_ids.length" class="assign-pick-count">
            {{ assignForm.employee_ids.length }} selected
          </span>
        </div>

        <div class="assign-emp-grid" v-if="filteredEmps.length">
          <button
            v-for="e in filteredEmps"
            :key="e.id"
            type="button"
            class="emp-pick"
            :class="{
              'is-selected': assignForm.employee_ids.includes(e.id),
              'is-assigned': alreadyAssignedIds.has(e.id),
            }"
            :title="alreadyAssignedIds.has(e.id) ? `Already on this shift (${alreadyAssignedSummary(e.id)})` : ''"
            @click="toggleEmployee(e.id)"
          >
            <span class="emp-pick-avatar">{{ initialsOf(e.full_name) }}</span>
            <span class="emp-pick-text">
              <span class="emp-pick-name">{{ e.full_name }}</span>
              <span class="emp-pick-meta onb-mono">{{ e.employee_code || '—' }} · {{ e.department_name || e.department || '—' }}</span>
            </span>
            <span v-if="alreadyAssignedIds.has(e.id)" class="emp-pick-flag" title="Already assigned to this shift">
              <ShieldCheck :size="11" />
              <span>Assigned</span>
            </span>
            <span class="emp-pick-check">
              <Check v-if="assignForm.employee_ids.includes(e.id)" :size="12" />
            </span>
          </button>
        </div>
        <div v-else-if="loadingEmps" class="assign-emp-loading">
          <Loader2 :size="14" class="spin" /> Loading employees…
        </div>
        <div v-else class="assign-emp-empty">
          <UsersRound :size="14" /> No employees match this filter.
        </div>

        <div class="assign-current">
          <div class="assign-current-head">
            <span><ShieldCheck :size="11" /> Currently assigned</span>
            <span class="onb-mono">{{ currentAssignments.length }}</span>
          </div>
          <ul v-if="currentAssignments.length" class="assign-current-list">
            <li v-for="a in currentAssignments" :key="a.id">
              <span class="ac-avatar">{{ initialsOf(a.employee_name) }}</span>
              <span class="ac-text">
                <b>{{ a.employee_name || 'Unknown employee' }}</b>
                <span class="onb-mono">from {{ a.effective_from }}<span v-if="a.effective_until"> → {{ a.effective_until }}</span></span>
              </span>
              <button
                type="button"
                class="ac-remove"
                :disabled="removingId === a.id"
                :title="`Remove ${a.employee_name || 'this employee'} from this shift`"
                @click="removeAssignment(a)"
              >
                <Loader2 v-if="removingId === a.id" :size="12" class="spin" />
                <UserMinus v-else :size="12" />
                <span>{{ removingId === a.id ? 'Removing…' : 'Remove' }}</span>
              </button>
            </li>
          </ul>
          <div v-else class="assign-current-empty">
            <UsersRound :size="13" />
            <span>No employees on this shift yet — pick one above and click "Assign shift" to start.</span>
          </div>
        </div>
      </div>
      <template #footer>
        <span class="foot-spacer">{{ assignForm.employee_ids.length }} employee{{ assignForm.employee_ids.length === 1 ? '' : 's' }} chosen</span>
        <button class="onb-btn-ghost" @click="closeAssign">Cancel</button>
        <button class="onb-btn-primary"
          :disabled="!assignForm.employee_ids.length || !assignForm.effective_from || !assignForm.effective_until || assigning"
          @click="doAssign">
          <CheckCircle2 v-if="!assigning" :size="13" /><Loader2 v-else :size="13" class="spin" />
          {{ assigning ? 'Assigning…' : 'Assign shift' }}
        </button>
      </template>
    </OnbModal>

    <!-- ═══════════════════ Remove employee from shift (ultra-modern) ═══════════════════ -->
    <AttDeleteModal
      :open="!!removeTarget"
      title="Remove from this shift?"
      subtitle="The employee will fall back to their previous shift on the next rollup."
      :target-label="removeTarget?.employee_name || ''"
      :target-meta="removeTarget ? `From ${removeTarget.effective_from}${removeTarget.effective_until ? ' → ' + removeTarget.effective_until : ' (open-ended)'}` : ''"
      :target-tag="assignTarget?.code || ''"
      :target-icon="UserMinus"
      :presets="[
        'Assigned to wrong shift',
        'Employee changed team',
        'Shift not applicable from this date',
        'Duplicate assignment',
      ]"
      reason-placeholder="Briefly note why this assignment is being removed — audit logs preserve this note…"
      :submitting="removingId !== null"
      confirm-label="Remove from shift"
      submitting-label="Removing…"
      warning="Audit trail keeps the removed assignment. Past attendance rows for this shift are unaffected."
      @close="cancelRemove"
      @confirm="confirmRemoveAssignment"
    />
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  RefreshCw, Plus, Coffee, Hourglass, Calendar, X, Pencil, Trash2,
  ShieldCheck, ShieldAlert, Sparkles, Moon, CheckCircle2, Loader2, CalendarClock,
  UsersRound, Search, Check, UserMinus,
} from 'lucide-vue-next'
import {
  fetchShifts, createShift, patchShift, deleteShift,
  fetchShiftAssignments, assignShift, unassignShift,
} from '../composables/useAttendance'
import AttDeleteModal from '../components/AttDeleteModal.vue'
import AttEmptyState from '../components/AttEmptyState.vue'
import OnbModal from '../../onboarding/components/OnbModal.vue'
import OnbField from '../../onboarding/components/OnbField.vue'
import axios from 'axios'
import { API } from '@/utils/api'
import { useToast } from 'vue-toastification'

const emit = defineEmits(['refresh-stats'])
const toast = useToast()

const shifts = ref([])
const showModal = ref(false)
const editingId = ref(null)
const saving = ref(false)

const DOW_LABELS = ['M','T','W','Th','F','Sa','Su']

const blankForm = () => ({
  code: '', name: '', shift_type: 'GENERAL',
  start_time: '09:00', end_time: '18:00',
  break_minutes: 60, grace_minutes: 10,
  half_day_hours: 4, full_day_hours: 8,
  weekly_off_days: [5, 6],
  night_allowance: false,
  description: '',
  break_windows: [],
  late_punch_requires_approval: true,
  late_self_punch_threshold_minutes: 15,
  break_overrun_alert_minutes: 10,
})
const form = reactive(blankForm())

const isValid = computed(() => !!(
  form.code && form.name && form.start_time && form.end_time
  && form.break_windows.every(w => w.label && w.start_time && w.end_time && w.max_minutes > 0)
))

const openCreate = () => {
  editingId.value = null
  Object.assign(form, blankForm())
  showModal.value = true
}
const openEdit = (s) => {
  editingId.value = s.id
  Object.assign(form, {
    code: s.code, name: s.name, shift_type: s.shift_type,
    start_time: (s.start_time || '').slice(0, 5),
    end_time: (s.end_time || '').slice(0, 5),
    break_minutes: s.break_minutes ?? 60,
    grace_minutes: s.grace_minutes ?? 10,
    half_day_hours: Number(s.half_day_hours ?? 4),
    full_day_hours: Number(s.full_day_hours ?? 8),
    weekly_off_days: Array.isArray(s.weekly_off_days) ? [...s.weekly_off_days] : [5, 6],
    night_allowance: !!s.night_allowance,
    description: s.description || '',
    break_windows: Array.isArray(s.break_windows) ? s.break_windows.map(w => ({ ...w })) : [],
    late_punch_requires_approval: s.late_punch_requires_approval ?? true,
    late_self_punch_threshold_minutes: s.late_self_punch_threshold_minutes ?? 15,
    break_overrun_alert_minutes: s.break_overrun_alert_minutes ?? 10,
  })
  showModal.value = true
}
const closeModal = () => { if (!saving.value) showModal.value = false }

const toggleDow = (idx) => {
  const i = form.weekly_off_days.indexOf(idx)
  if (i >= 0) form.weekly_off_days.splice(i, 1)
  else form.weekly_off_days.push(idx)
}
const addBreakWindow = () => {
  form.break_windows.push({ label: 'Lunch', start_time: '13:00', end_time: '14:00', max_minutes: 30 })
}

const buildPayload = () => ({
  code: form.code.trim(),
  name: form.name.trim(),
  shift_type: form.shift_type,
  start_time: form.start_time,
  end_time: form.end_time,
  break_minutes: Number(form.break_minutes) || 0,
  grace_minutes: Number(form.grace_minutes) || 0,
  half_day_hours: Number(form.half_day_hours) || 0,
  full_day_hours: Number(form.full_day_hours) || 0,
  weekly_off_days: [...form.weekly_off_days],
  night_allowance: !!form.night_allowance,
  description: form.description || null,
  break_windows: form.break_windows.map(w => ({
    label: w.label.trim(),
    start_time: w.start_time,
    end_time: w.end_time,
    max_minutes: Number(w.max_minutes) || 1,
  })),
  late_punch_requires_approval: !!form.late_punch_requires_approval,
  late_self_punch_threshold_minutes: Number(form.late_self_punch_threshold_minutes) || 0,
  break_overrun_alert_minutes: Number(form.break_overrun_alert_minutes) || 0,
})

const doSubmit = async () => {
  if (!isValid.value) return
  saving.value = true
  try {
    const payload = buildPayload()
    if (editingId.value) {
      const { code, ...editable } = payload  // code is locked on edit
      await patchShift(editingId.value, editable)
      toast.success('Shift updated')
    } else {
      await createShift(payload)
      toast.success('Shift created')
    }
    showModal.value = false
    await reload()
    emit('refresh-stats')
  } catch (e) {
    toast.error(e?.response?.data?.detail || (editingId.value ? 'Could not update' : 'Could not create shift'))
  } finally { saving.value = false }
}

const deleteTarget = ref(null)
const deleting = ref(false)
const openDelete = (s) => { deleteTarget.value = s }
const confirmDelete = async (reason) => {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await deleteShift(deleteTarget.value.id, reason)
    toast.success(`Shift "${deleteTarget.value.name}" deleted`)
    deleteTarget.value = null
    await reload()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not delete shift')
  } finally {
    deleting.value = false
  }
}

const assignedCounts = reactive({})

const reload = async () => {
  try {
    const data = await fetchShifts({ limit: 100 })
    shifts.value = data.items || []
    // Pull current assignment counts in one call so each card shows
    // "N assigned · manage" instead of the bare "Assign to employees" CTA.
    // Backend `/shifts/assignments` only accepts `employee_id` + `active_on`,
    // never `shift_id` or `limit` — sending those query params used to 422.
    try {
      const today = todayIso()
      const assigns = await fetchShiftAssignments({ active_on: today })
      // The endpoint returns a bare list (no .items wrapper).
      const rows = Array.isArray(assigns) ? assigns : (assigns.items || [])
      const counts = {}
      for (const a of rows) {
        if (a.is_active === false) continue
        counts[a.shift_id] = (counts[a.shift_id] || 0) + 1
      }
      for (const k of Object.keys(assignedCounts)) delete assignedCounts[k]
      Object.assign(assignedCounts, counts)
    } catch {
      // Counts are best-effort — silently fall back to "Assign" CTA.
    }
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load shifts')
  }
}
onMounted(reload)

// ────────────────── ASSIGN WORKFLOW ──────────────────
const assignTarget = ref(null)
const assigning = ref(false)
const loadingEmps = ref(false)
const employees = ref([])
const assignSearch = ref('')
const currentAssignments = ref([])

const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const isoOffsetDays = (days) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const assignForm = reactive({
  employee_ids: [],
  effective_from: todayIso(),
  // Default to 30 days out so the admin has a sensible bounded window
  // instead of an open-ended assignment that blocks future overlapping
  // shifts. Mandatory in the new workflow.
  effective_until: isoOffsetDays(30),
})

// `filteredEmps` keeps a local refinement on top of the (already
// server-searched) `employees` cache so typing feels instant. The watcher
// below debounces and re-queries the backend when the input changes so the
// admin sees results even if the matching employee wasn't in the first 100.
const filteredEmps = computed(() => {
  const q = (assignSearch.value || '').trim().toLowerCase()
  if (!q) return employees.value.slice(0, 100)
  return employees.value.filter(e =>
    (e.full_name || '').toLowerCase().includes(q) ||
    (e.employee_code || '').toLowerCase().includes(q) ||
    (e.department_name || '').toLowerCase().includes(q)
  ).slice(0, 100)
})

let _searchTimer = null
const filterEmployees = () => {
  clearTimeout(_searchTimer)
  _searchTimer = setTimeout(() => {
    // Re-query the backend so the admin can find anyone, not just the
    // first 100 names the modal opened with.
    loadEmployees(assignSearch.value.trim())
  }, 280)
}

const initialsOf = (name) => (name || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'

const authHeader = () => {
  const t = localStorage.getItem('admin_token') || localStorage.getItem('user_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

// The backend caps /hr/employees at limit=100 and does NOT accept a `status`
// query param (use `lifecycle_state` if filtering needed). Sending limit=500
// or status=ACTIVE returned 422 and broke the assign workflow. We also map
// the response shape: list endpoint wraps rows under `.items`.
const loadEmployees = async (search = '') => {
  loadingEmps.value = true
  try {
    const params = { limit: 100, page: 1 }
    if (search) params.search = search
    const { data } = await axios.get(`${API}/hr/employees/`, {
      headers: authHeader(), params,
    })
    const rows = Array.isArray(data) ? data : (data?.items || [])
    // Normalise field names: list endpoint returns user-derived `full_name`
    // and `email` under `user`; tolerate either shape so the grid keeps
    // working if the backend payload evolves.
    employees.value = rows.map(r => ({
      id: r.id,
      full_name: r.full_name || r.user?.full_name || r.name || '—',
      employee_code: r.employee_code || r.employee_id || '',
      department_name: r.department_name || r.department?.name || r.department || '',
    }))
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not load employees')
  } finally { loadingEmps.value = false }
}

// The backend's `/shifts/assignments` endpoint accepts `shift_id`, `employee_id`
// and `active_on`. Route order was wrong previously (catch-all `/{shift_id}`
// shadowed `/assignments`, returning 422); that's now fixed in shifts.py, so
// we can pass shift_id straight through and let Postgres do the filtering.
const loadCurrentAssignments = async (shiftId) => {
  if (!shiftId) { currentAssignments.value = []; return }
  try {
    const data = await fetchShiftAssignments({ shift_id: shiftId, active_on: todayIso() })
    const rows = Array.isArray(data) ? data : (data?.items || [])
    currentAssignments.value = rows
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[shifts] loadCurrentAssignments failed', e)
    toast.warning(e?.response?.data?.detail || 'Could not load current assignments')
    currentAssignments.value = []
  }
}

const openAssign = async (s) => {
  assignTarget.value = s
  assignForm.employee_ids = []
  assignForm.effective_from = todayIso()
  assignForm.effective_until = isoOffsetDays(30)
  assignSearch.value = ''
  assignConflicts.value = []
  await Promise.all([loadEmployees(), loadCurrentAssignments(s.id)])
}
const closeAssign = () => { if (!assigning.value) assignTarget.value = null }

// Set of employee IDs currently assigned to this shift (covers active +
// future-bounded assignments). Drives the "Assigned" flag in the picker and
// the click-guard below.
const alreadyAssignedIds = computed(() => {
  const s = new Set()
  for (const a of currentAssignments.value || []) {
    if (a?.employee_id) s.add(a.employee_id)
  }
  return s
})

const alreadyAssignedSummary = (empId) => {
  const a = (currentAssignments.value || []).find(x => x.employee_id === empId)
  if (!a) return ''
  return a.effective_until
    ? `from ${a.effective_from} → ${a.effective_until}`
    : `from ${a.effective_from} · open-ended`
}

const toggleEmployee = (id) => {
  // Refuse to add an already-assigned employee to the selection — the picker
  // already shows the "Assigned" flag visually; this catches keyboard / quick
  // double-click cases and explains why the click did nothing.
  if (alreadyAssignedIds.value.has(id) && !assignForm.employee_ids.includes(id)) {
    const summary = alreadyAssignedSummary(id) || 'this shift'
    toast.warning(`Already on this shift (${summary}) — to change dates, remove the row first.`)
    return
  }
  const i = assignForm.employee_ids.indexOf(id)
  if (i >= 0) assignForm.employee_ids.splice(i, 1)
  else assignForm.employee_ids.push(id)
}

const removingId = ref(null)
const removeTarget = ref(null)
const removeAssignment = (a) => { removeTarget.value = a }
const cancelRemove = () => { if (removingId.value === null) removeTarget.value = null }

const confirmRemoveAssignment = async (reason) => {
  const a = removeTarget.value
  if (!a?.id || removingId.value) return
  removingId.value = a.id
  try {
    await unassignShift(a.id, reason)
    toast.success(`${a.employee_name || 'Employee'} removed from this shift`)
    currentAssignments.value = currentAssignments.value.filter(x => x.id !== a.id)
    removeTarget.value = null
    await reload()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not remove assignment')
  } finally {
    removingId.value = null
  }
}

const assignConflicts = ref([])

const doAssign = async () => {
  if (!assignTarget.value || !assignForm.employee_ids.length) return
  if (!assignForm.effective_from || !assignForm.effective_until) {
    toast.warning('Both Effective from and Effective until are required')
    return
  }
  // Pre-flight: if EVERY selected employee is already on this shift, the
  // backend would silently no-op (or extend dates). Tell the admin upfront
  // and don't fire the request at all.
  const fresh = assignForm.employee_ids.filter(id => !alreadyAssignedIds.value.has(id))
  if (fresh.length === 0) {
    toast.warning('All selected employees are already on this shift — nothing to assign.')
    return
  }
  assignConflicts.value = []
  assigning.value = true
  try {
    const result = await assignShift(assignTarget.value.id, {
      employee_ids: assignForm.employee_ids,
      effective_from: assignForm.effective_from,
      effective_until: assignForm.effective_until,
    })
    const created = result?.assigned ?? 0
    const extended = result?.extended ?? 0
    if (created === 0 && extended === 0) {
      toast.info('No changes — the selected employees are already on this shift for these dates.')
    } else {
      const msg = []
      if (created) msg.push(`${created} new`)
      if (extended) msg.push(`${extended} date-extended`)
      toast.success(`Shift roll-out · ${msg.join(' · ')}`)
    }
    assignTarget.value = null
    await reload()
  } catch (e) {
    // Backend now returns a structured 409 with `conflicts` so we can render
    // each blocking row instead of just showing a generic toast.
    const detail = e?.response?.data?.detail
    if (e?.response?.status === 409 && typeof detail === 'object' && Array.isArray(detail.conflicts)) {
      assignConflicts.value = detail.conflicts
      toast.error(detail.message || 'Assignment conflicts — see banner inside the modal')
    } else {
      toast.error((typeof detail === 'string' ? detail : detail?.message) || 'Could not assign shift')
    }
  } finally { assigning.value = false }
}

// ── visualisation helpers ──
const offDaysLabel = (arr) => (arr || []).map(d => DOW_LABELS[d] || '').filter(Boolean).join('/')
const shortTime = (t) => (t || '').slice(0, 5)
const minutes = (t) => {
  const [h, m] = (t || '00:00').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
const hourPct = (t) => Math.min(100, (minutes(t) / (24 * 60)) * 100)
const durationPct = (s, e) => {
  const sm = minutes(s), em = minutes(e)
  let dur = em - sm
  if (dur <= 0) dur += 24 * 60
  return Math.max(2, (dur / (24 * 60)) * 100)
}
const bwWidthPct = (bw) => {
  const sm = minutes(bw.start_time), em = minutes(bw.end_time)
  return Math.max(0.6, ((em - sm) / (24 * 60)) * 100)
}
</script>

<style scoped>
@import '../../../../styles/attendance-theme.css';

.att-shifts { display: flex; flex-direction: column; gap: 16px; padding-top: 18px; }

.shifts-banner {
  position: relative; overflow: hidden;
  padding: 22px 24px;
  border-radius: 20px;
  background:
    radial-gradient(120% 100% at 100% 0%, rgba(20, 184, 166, 0.14), transparent 65%),
    var(--att-glass);
  border: var(--att-glass-stroke);
  backdrop-filter: var(--att-glass-blur);
  display: grid; grid-template-columns: 1fr auto; gap: 18px;
}
.banner-glow {
  position: absolute; inset: -40% -10% auto auto;
  width: 50%; height: 200%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(20, 184, 166, 0.30), transparent 70%);
  filter: blur(60px);
  animation: att-aurora 14s ease-in-out infinite;
  pointer-events: none;
}
.banner-text { display: flex; flex-direction: column; gap: 4px; }
.att-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.8px;
  text-transform: uppercase; color: var(--att-teal-100);
}
.att-eyebrow-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--att-orange-200);
  animation: att-live-pulse 2.2s ease-in-out infinite;
}
.banner-title {
  margin: 4px 0 0; font-size: 28px; font-weight: 800; letter-spacing: -0.02em;
  background: var(--att-gradient-hero);
  background-size: 200% 200%;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: att-title-shimmer 7s ease-in-out infinite;
  display: inline-flex; gap: 8px; align-items: baseline;
}
.banner-divider { color: var(--hr-text-dim); -webkit-text-fill-color: var(--hr-text-dim); font-weight: 400; }
.banner-sub { margin: 6px 0 0; font-size: 12.5px; color: var(--hr-text-muted); line-height: 1.5; max-width: 720px; }
.banner-aside { display: flex; gap: 8px; align-self: flex-start; }

.shifts-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 14px;
}

.shift-card {
  position: relative;
  padding: 18px;
  border-radius: 18px;
  background:
    radial-gradient(120% 80% at 0% 0%, rgba(251, 191, 36, 0.08), transparent 55%),
    linear-gradient(160deg, rgba(28, 22, 18, 0.62), rgba(20, 16, 14, 0.82));
  border: 1px solid rgba(251, 191, 36, 0.26);
  backdrop-filter: var(--att-glass-blur);
  box-shadow:
    0 22px 50px -28px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  transition: border-color .28s var(--att-spring), transform .28s var(--att-spring), box-shadow .28s var(--att-spring);
  display: flex; flex-direction: column; gap: 10px;
  overflow: hidden;
}
/* corner sheen */
.shift-card::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 64px;
  background: linear-gradient(180deg, rgba(251, 191, 36, 0.08), transparent);
  pointer-events: none;
}
/* punch-card perforated left strip */
.shift-card::after {
  content: ''; position: absolute; left: 6px; top: 16px; bottom: 16px; width: 3px;
  background:
    radial-gradient(circle at 50% 4px,  rgba(251, 191, 36, 0.55) 1.1px, transparent 1.5px),
    radial-gradient(circle at 50% 10px, rgba(251, 191, 36, 0.55) 1.1px, transparent 1.5px),
    radial-gradient(circle at 50% 16px, rgba(251, 191, 36, 0.55) 1.1px, transparent 1.5px);
  background-repeat: repeat-y; background-size: 3px 8px;
  opacity: 0.45;
  pointer-events: none;
}
.shift-card:hover {
  border-color: rgba(251, 146, 60, 0.55);
  transform: translateY(-2px);
  box-shadow:
    0 28px 60px -28px rgba(251, 146, 60, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.card-head { display: flex; justify-content: space-between; align-items: center; }
.card-head-left { display: inline-flex; align-items: center; gap: 8px; }
.card-head-actions { display: inline-flex; gap: 4px; opacity: 0.55; transition: opacity .2s; }
.shift-card:hover .card-head-actions { opacity: 1; }
.shift-code { font-family: var(--hr-mono); font-size: 11px; font-weight: 700; color: var(--att-teal-100); letter-spacing: 0.6px; }
.shift-type {
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.8px;
  padding: 3px 8px; border-radius: 6px;
  background: var(--att-yellow-soft); color: var(--att-yellow-200);
  border: 1px solid var(--att-yellow-border-soft);
}
.shift-type[data-type="NIGHT"] { background: rgba(167, 139, 250, 0.18); color: #c4b5fd; border-color: rgba(167, 139, 250, 0.32); }
.shift-type[data-type="ROTATIONAL"] { background: rgba(56, 189, 248, 0.18); color: #7dd3fc; border-color: rgba(56, 189, 248, 0.32); }

.shift-name { margin: 0; font-size: 17px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.01em; }

.shift-timeline { display: flex; flex-direction: column; gap: 6px; }
.timeline-track {
  position: relative; height: 20px;
  background:
    repeating-linear-gradient(
      90deg,
      rgba(251, 191, 36, 0.10) 0,
      rgba(251, 191, 36, 0.10) 1px,
      transparent 1px,
      transparent 8.333%
    ),
    linear-gradient(180deg, rgba(28, 22, 18, 0.85), rgba(20, 16, 14, 0.95));
  border: 1px solid rgba(251, 191, 36, 0.34);
  border-radius: 8px;
  box-shadow:
    inset 0 1px 3px rgba(0, 0, 0, 0.45),
    inset 0 -1px 0 rgba(255, 255, 255, 0.04);
  overflow: hidden;
}
.timeline-bar {
  position: absolute; top: 2px; bottom: 2px;
  background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 55%, #fb923c 100%);
  border-radius: 5px;
  border: 1px solid rgba(120, 53, 15, 0.45);
  box-shadow:
    0 0 12px rgba(251, 146, 60, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 7px;
  font-family: var(--hr-mono);
  font-size: 10px; font-weight: 800; color: #1f1408;
  letter-spacing: 0.4px;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.45);
  animation: att-bar-grow 0.9s var(--att-ease-quint);
}
.timeline-bar-start,
.timeline-bar-end {
  position: relative; z-index: 1;
}
.timeline-break {
  position: absolute; top: 2px; bottom: 2px;
  background: rgba(251, 146, 60, 0.55);
  border-radius: 3px;
  border: 1px solid rgba(251, 146, 60, 0.75);
  z-index: 2;
  display: flex; align-items: center; justify-content: center;
}
.break-dot {
  width: 4px; height: 4px; border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 4px #fff;
}
@keyframes att-bar-grow { from { transform: scaleX(0); transform-origin: left; } to { transform: scaleX(1); } }

.timeline-ruler {
  display: flex; justify-content: space-between;
  font-size: 9px; font-family: var(--hr-mono); color: var(--hr-text-muted);
}

.shift-meta {
  display: flex; gap: 12px; flex-wrap: wrap;
  margin-top: 6px; padding-top: 10px;
  border-top: 1px solid rgba(20, 184, 166, 0.14);
  font-size: 11px; color: var(--hr-text-secondary);
}
.shift-meta span { display: inline-flex; align-items: center; gap: 4px; }
.shift-meta svg { color: var(--att-teal-100); }

.shift-assign-cta {
  margin-top: 8px;
  display: inline-flex; align-items: center; gap: 6px;
  align-self: flex-start;
  padding: 6px 12px; border-radius: 999px;
  background:
    linear-gradient(135deg, rgba(251, 191, 36, 0.20), rgba(251, 146, 60, 0.16));
  border: 1px dashed rgba(251, 146, 60, 0.55);
  color: var(--att-yellow-200);
  font: inherit; font-size: 10.5px; font-weight: 800; letter-spacing: 0.4px;
  cursor: pointer;
  transition: border-color .22s var(--att-spring), background .22s, transform .22s;
}
.shift-assign-cta:hover {
  transform: translateY(-1px);
  border-style: solid;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.32), rgba(251, 146, 60, 0.26));
  color: #fde68a;
}
[data-theme="light"] .shift-assign-cta {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.14), rgba(194, 65, 12, 0.10));
  border-color: rgba(194, 65, 12, 0.55);
  color: var(--att-orange-500);
}
[data-theme="light"] .shift-assign-cta:hover {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.22), rgba(194, 65, 12, 0.16));
  color: #9a3412;
}

.icon-btn.small.assign {
  color: var(--att-teal-100);
  border: 1px solid rgba(94, 234, 212, 0.30);
  background: rgba(94, 234, 212, 0.08);
}
.icon-btn.small.assign:hover {
  background: rgba(94, 234, 212, 0.18);
  border-color: rgba(94, 234, 212, 0.50);
  color: #ccfbf1;
}
[data-theme="light"] .icon-btn.small.assign {
  background: rgba(13, 148, 136, 0.10);
  border-color: rgba(13, 148, 136, 0.35);
  color: var(--att-teal-500);
}

/* ─── Assign-shift modal innards ─── */
.assign-stack { display: flex; flex-direction: column; gap: 14px; }
.assign-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 540px) { .assign-grid-2 { grid-template-columns: 1fr; } }

.assign-search-wrap {
  position: relative; display: flex; align-items: center;
  padding: 0 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.24);
}
[data-theme="light"] .assign-search-wrap {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(180, 83, 9, 0.28);
}
.assign-search-icon { color: var(--hr-text-muted); display: inline-flex; }
.assign-search-input {
  flex: 1; background: transparent; border: 0;
  padding: 10px 8px;
  font: inherit; font-size: 12.5px;
  color: var(--hr-text);
  outline: none;
}
.assign-pick-count {
  font-size: 10px; font-weight: 800; letter-spacing: 0.6px;
  text-transform: uppercase;
  padding: 3px 9px; border-radius: 999px;
  background: rgba(20, 184, 166, 0.18);
  color: var(--att-success-100);
}
[data-theme="light"] .assign-pick-count {
  background: rgba(13, 148, 136, 0.14); color: var(--att-success-500);
}

.assign-emp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
  max-height: 280px; overflow-y: auto;
  padding-right: 4px;
}
.emp-pick {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(251, 191, 36, 0.18);
  border-radius: 12px;
  font: inherit; cursor: pointer; text-align: left;
  color: var(--hr-text);
  transition: border-color .22s var(--att-spring), background .22s, transform .22s;
}
.emp-pick:hover { transform: translateY(-1px); border-color: rgba(251, 146, 60, 0.45); }
.emp-pick.is-selected {
  border-color: rgba(20, 184, 166, 0.65);
  background: rgba(20, 184, 166, 0.10);
  box-shadow: inset 0 0 0 1px rgba(20, 184, 166, 0.20);
}
.emp-pick-avatar {
  width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #fde68a, #fbbf24 50%, #fb923c);
  color: #1f1408; font-weight: 800; font-size: 10.5px;
  border: 1.4px solid rgba(251, 191, 36, 0.55);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.40);
}
.emp-pick-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.emp-pick-name { font-size: 12.5px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.emp-pick-meta { font-size: 10px; color: var(--hr-text-muted); }
.emp-pick-check {
  width: 18px; height: 18px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid rgba(251, 191, 36, 0.30);
  color: var(--att-success-100); flex-shrink: 0;
}
.emp-pick.is-selected .emp-pick-check {
  background: var(--att-success-300); color: #032724;
  border-color: var(--att-success-400);
}
[data-theme="light"] .emp-pick {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(180, 83, 9, 0.22);
}
[data-theme="light"] .emp-pick.is-selected {
  background: rgba(13, 148, 136, 0.10);
  border-color: rgba(13, 148, 136, 0.55);
}
[data-theme="light"] .emp-pick-avatar {
  background: linear-gradient(135deg, #f59e0b, #ea580c 55%, #c2410c);
  color: #fff;
  border-color: rgba(180, 83, 9, 0.55);
  text-shadow: 0 1px 0 rgba(120, 53, 15, 0.45);
}
[data-theme="light"] .emp-pick.is-selected .emp-pick-check {
  background: var(--att-success-500); color: #fff;
  border-color: var(--att-success-500);
}

/* "Already assigned" state — dim the chip and surface a teal Assigned pill so
   admins don't try to re-assign the same employee to the same shift. */
.emp-pick.is-assigned {
  opacity: 0.75;
  background:
    linear-gradient(90deg, transparent 0%, rgba(94, 234, 212, 0.06) 100%),
    rgba(255, 255, 255, 0.02);
  border-color: rgba(94, 234, 212, 0.30);
  cursor: not-allowed;
}
.emp-pick.is-assigned:hover {
  transform: none;
  border-color: rgba(94, 234, 212, 0.45);
}
.emp-pick-flag {
  display: inline-flex; align-items: center; gap: 4px;
  flex-shrink: 0;
  padding: 3px 8px; border-radius: 999px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase;
  background: rgba(94, 234, 212, 0.14);
  color: var(--att-success-100);
  border: 1px solid rgba(94, 234, 212, 0.40);
}
.emp-pick-flag svg { color: var(--att-success-100); }
[data-theme="light"] .emp-pick.is-assigned {
  opacity: 0.8;
  background: linear-gradient(90deg, rgba(255, 250, 240, 0.78), rgba(13, 148, 136, 0.06));
  border-color: rgba(13, 148, 136, 0.35);
}
[data-theme="light"] .emp-pick-flag {
  background: rgba(13, 148, 136, 0.10);
  color: var(--att-success-500);
  border-color: rgba(13, 148, 136, 0.40);
}
[data-theme="light"] .emp-pick-flag svg { color: var(--att-success-500); }

.assign-emp-loading,
.assign-emp-empty {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 16px; border-radius: 12px;
  background: rgba(251, 191, 36, 0.06);
  border: 1px dashed rgba(251, 191, 36, 0.30);
  color: var(--hr-text-muted); font-size: 12px;
}

.assign-current {
  margin-top: 6px;
  padding: 12px 14px;
  border: 1px solid rgba(20, 184, 166, 0.22);
  border-radius: 12px;
  background: rgba(20, 184, 166, 0.06);
}
[data-theme="light"] .assign-current {
  background: rgba(13, 148, 136, 0.08);
  border-color: rgba(13, 148, 136, 0.32);
}
.assign-current-head {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 10px; font-weight: 800; letter-spacing: 1.2px;
  text-transform: uppercase; color: var(--att-teal-100);
  margin-bottom: 8px;
}
[data-theme="light"] .assign-current-head { color: var(--att-teal-500); }
.assign-current-list {
  list-style: none; padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 6px;
}
.assign-current-list li {
  display: flex; align-items: center; gap: 10px;
  font-size: 12px; color: var(--hr-text);
  padding: 6px 4px;
  border-radius: 8px;
  transition: background .18s var(--att-spring);
}
.assign-current-list li:hover { background: rgba(248, 113, 113, 0.05); }
.assign-current-list li .ac-text { flex: 1; min-width: 0; }
.ac-remove {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 10px;
  font: inherit; font-size: 10.5px; font-weight: 800; letter-spacing: 0.4px;
  background: rgba(248, 113, 113, 0.12);
  color: #fca5a5;
  border: 1px solid rgba(248, 113, 113, 0.32);
  border-radius: 8px;
  cursor: pointer;
  text-transform: uppercase;
  transition: background .2s, border-color .2s, transform .2s var(--att-spring);
  flex-shrink: 0;
}
.ac-remove:hover:not(:disabled) {
  background: rgba(248, 113, 113, 0.22);
  border-color: rgba(248, 113, 113, 0.55);
  color: #fecaca;
  transform: translateY(-1px);
}
.ac-remove:disabled { opacity: 0.65; cursor: progress; }
[data-theme="light"] .ac-remove {
  background: rgba(220, 38, 38, 0.10);
  color: #b91c1c;
  border-color: rgba(220, 38, 38, 0.32);
}
[data-theme="light"] .ac-remove:hover:not(:disabled) {
  background: rgba(220, 38, 38, 0.18);
  border-color: rgba(220, 38, 38, 0.55);
  color: #991b1b;
}
[data-theme="light"] .assign-current-list li:hover {
  background: rgba(220, 38, 38, 0.05);
}
.assign-current-empty {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 12px 14px; border-radius: 10px;
  background: rgba(20, 184, 166, 0.06);
  border: 1px dashed rgba(20, 184, 166, 0.30);
  color: var(--hr-text-muted);
  font-size: 11.5px; font-style: italic;
}

/* ── 409 conflict banner shown inside the Assign modal ── */
.assign-conflict {
  padding: 12px 14px; border-radius: 12px;
  background: linear-gradient(135deg, rgba(248, 113, 113, 0.10), rgba(234, 88, 12, 0.10));
  border: 1px solid rgba(248, 113, 113, 0.45);
  color: var(--hr-text);
  display: flex; flex-direction: column; gap: 6px;
}
.assign-conflict-head {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 800; letter-spacing: 0.8px;
  text-transform: uppercase; color: #fca5a5;
}
.assign-conflict-list {
  list-style: disc; margin: 0; padding-left: 22px;
  font-size: 12px; line-height: 1.55; color: var(--hr-text-secondary);
}
.assign-conflict-list b { color: var(--hr-text); font-weight: 700; }
[data-theme="light"] .assign-conflict {
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.08), rgba(194, 65, 12, 0.08));
  border-color: rgba(220, 38, 38, 0.50);
  color: var(--hr-text);
}
[data-theme="light"] .assign-conflict-head { color: #b91c1c; }
[data-theme="light"] .assign-conflict-list { color: var(--hr-text-secondary); }
[data-theme="light"] .assign-conflict-list b { color: #1f1408; }
.assign-current-empty svg { color: var(--att-teal-100); flex-shrink: 0; }
[data-theme="light"] .assign-current-empty {
  background: rgba(13, 148, 136, 0.06);
  border-color: rgba(13, 148, 136, 0.30);
}
[data-theme="light"] .assign-current-empty svg { color: var(--att-teal-500); }
.ac-avatar {
  width: 24px; height: 24px; border-radius: 50%;
  background: rgba(20, 184, 166, 0.18); color: var(--att-success-100);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 9.5px; font-weight: 800;
}
[data-theme="light"] .ac-avatar { background: rgba(13, 148, 136, 0.18); color: var(--att-success-500); }
.ac-text { display: flex; flex-direction: column; line-height: 1.2; }
.ac-text .onb-mono { font-size: 10px; color: var(--hr-text-muted); }

.shift-policy { display: flex; gap: 6px; flex-wrap: wrap; }
.policy-chip {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.4px;
  padding: 3px 8px; border-radius: 999px;
  background: rgba(148, 163, 184, 0.12); color: var(--hr-text-muted);
  border: 1px solid rgba(148, 163, 184, 0.20);
}
.policy-chip[data-on="true"] {
  background: var(--att-teal-soft); color: var(--att-teal-100); border-color: var(--att-teal-border-soft);
}

.shifts-empty {
  padding: 40px; text-align: center;
  font-size: 12px; color: var(--hr-text-dim);
  border: 1px dashed rgba(20, 184, 166, 0.22);
  border-radius: 16px;
  background: var(--att-glass);
}

/* ════════════════════ Modal ════════════════════ */
.modal-overlay {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(0, 0, 0, 0.62);
  backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.modal-card {
  position: relative;
  width: 100%; max-width: 760px;
  max-height: calc(100vh - 40px);
  display: flex; flex-direction: column;
  background: rgba(8, 14, 18, 0.97);
  border: 1px solid rgba(20, 184, 166, 0.32);
  border-radius: 20px;
  box-shadow: 0 50px 100px -30px rgba(0, 0, 0, 0.7);
  overflow: hidden;
}
.modal-head {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 18px 22px; border-bottom: 1px solid rgba(20, 184, 166, 0.14);
}
.modal-head h3 { margin: 4px 0 0; font-size: 17px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.01em; }
.icon-btn {
  width: 32px; height: 32px; border-radius: 8px;
  background: rgba(255, 255, 255, 0.05); border: 0;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--hr-text-muted); cursor: pointer;
  transition: background .2s var(--att-spring), color .2s, border-color .2s;
}
.icon-btn:hover { background: rgba(255, 255, 255, 0.10); color: var(--hr-text); }
.icon-btn.small { width: 28px; height: 28px; border-radius: 7px; }
.icon-btn.danger:hover { background: rgba(239, 68, 68, 0.18); color: #fca5a5; }

.modal-body { padding: 18px 22px; display: flex; flex-direction: column; gap: 18px; overflow-y: auto; }
.modal-grid { display: flex; flex-direction: column; gap: 14px; }

.form-block {
  border: 1px solid rgba(20, 184, 166, 0.18);
  border-radius: 14px;
  padding: 14px 16px;
  background: rgba(20, 184, 166, 0.03);
  display: flex; flex-direction: column; gap: 10px;
}
.form-block legend {
  padding: 0 8px;
  font-size: 10px; font-weight: 800; letter-spacing: 1.4px;
  text-transform: uppercase; color: var(--att-teal-100);
}
.field { display: flex; flex-direction: column; gap: 5px; }
.field > span { font-size: 10px; font-weight: 800; letter-spacing: 1.0px; text-transform: uppercase; color: var(--hr-text-muted); }
.field > span em { color: var(--att-orange-200); font-style: normal; }
.field-row { display: grid; gap: 10px; }
.field-row.tri { grid-template-columns: 1fr 1.4fr 1fr; }
.field-row.quad { grid-template-columns: repeat(4, 1fr); }
@media (max-width: 640px) {
  .field-row.tri, .field-row.quad { grid-template-columns: 1fr 1fr; }
}

.att-input {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(20, 184, 166, 0.22);
  color: var(--hr-text);
  border-radius: 10px; padding: 9px 12px;
  font: inherit; font-size: 12.5px;
  color-scheme: dark;
  transition: border-color .2s, box-shadow .2s;
}
.att-input:focus { outline: none; border-color: var(--att-teal-200); box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.15); }
.att-input:disabled { opacity: 0.55; cursor: not-allowed; }

.readout {
  background: rgba(20, 184, 166, 0.08);
  border: 1px dashed rgba(20, 184, 166, 0.28);
  border-radius: 10px; padding: 7px 12px;
  font: inherit; font-size: 13px; font-weight: 800; color: var(--att-teal-100);
  font-family: var(--hr-mono);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  line-height: 1.1;
}
.readout em { font-style: normal; font-size: 8.5px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: var(--hr-text-muted); margin-top: 2px; }

.dow-row { display: inline-flex; gap: 6px; flex-wrap: wrap; }
.dow-pill {
  min-width: 38px; padding: 7px 11px; border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(251, 191, 36, 0.28);
  color: var(--hr-text);
  font: inherit; font-size: 11px; font-weight: 700; letter-spacing: 0.4px;
  cursor: pointer;
  transition: all .22s var(--att-spring);
}
.dow-pill:hover { color: #fff; border-color: var(--att-orange-200); transform: translateY(-1px); }
.dow-pill.active {
  background: linear-gradient(135deg, #fbbf24 0%, #fb923c 70%, #ea580c 100%);
  border-color: #fb923c;
  color: #1a0e04;
  font-weight: 800;
  box-shadow: 0 6px 18px -6px rgba(234, 88, 12, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.5);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.45);
}

.field-toggle {
  display: inline-flex; align-items: center; gap: 11px;
  padding: 8px 0;
  font-size: 12.5px; color: var(--hr-text);
  cursor: pointer; user-select: none;
}
.field-toggle input[type="checkbox"] {
  appearance: none; -webkit-appearance: none;
  width: 40px; height: 22px;
  background: rgba(20, 16, 14, 0.55);
  border: 1px solid rgba(251, 191, 36, 0.30);
  border-radius: 14px; position: relative;
  cursor: pointer;
  transition: background .25s var(--att-spring), border-color .25s var(--att-spring), box-shadow .25s var(--att-spring);
  flex-shrink: 0;
}
.field-toggle input[type="checkbox"]::before {
  content: ''; position: absolute; top: 2px; left: 2px;
  width: 16px; height: 16px; border-radius: 50%;
  background: linear-gradient(180deg, #fff, #f5e6c8);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.7);
  transition: transform .25s var(--att-spring), background .25s;
}
.field-toggle input[type="checkbox"]:checked {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 60%, #fb923c 100%);
  border-color: #fb923c;
  box-shadow: 0 6px 18px -6px rgba(234, 88, 12, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
.field-toggle input[type="checkbox"]:checked::before {
  transform: translateX(18px);
  background: #1f1408;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.10);
}
.field-toggle .toggle-label { display: inline-flex; align-items: center; gap: 7px; color: var(--hr-text); }
.field-toggle .toggle-label svg { color: var(--att-teal-100); }

/* Custom number input spinners — replace browser-default arrows with
   gold mini-buttons that match our design language. */
.att-input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}
.att-input[type="number"]::-webkit-outer-spin-button,
.att-input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
  height: 100%;
  width: 18px;
  position: relative;
  cursor: pointer;
  background:
    linear-gradient(180deg, rgba(251, 191, 36, 0.18), rgba(251, 191, 36, 0.06)) center / 100% 100% no-repeat,
    linear-gradient(180deg, transparent 45%, rgba(251, 191, 36, 0.40) 45%, rgba(251, 191, 36, 0.40) 55%, transparent 55%) center / 100% 100% no-repeat;
  border-left: 1px solid rgba(251, 191, 36, 0.25);
  opacity: 0.85;
  transition: opacity .2s, background .2s;
}
.att-input[type="number"]::-webkit-outer-spin-button:hover,
.att-input[type="number"]::-webkit-inner-spin-button:hover {
  opacity: 1;
  background:
    linear-gradient(180deg, rgba(251, 191, 36, 0.32), rgba(251, 191, 36, 0.12)) center / 100% 100% no-repeat;
}

.hint {
  margin: 0; padding: 8px 12px;
  background: rgba(20, 184, 166, 0.06);
  border-left: 2px solid var(--att-teal-200);
  border-radius: 0 8px 8px 0;
  font-size: 11.5px; color: var(--hr-text-muted); line-height: 1.5;
}
.hint b { color: var(--att-teal-100); }

.bw-list { display: flex; flex-direction: column; gap: 8px; }
.bw-row {
  display: grid;
  grid-template-columns: 1.3fr 0.9fr auto 0.9fr 0.7fr auto auto;
  gap: 6px; align-items: center;
}
.bw-label, .bw-time, .bw-max { padding: 7px 10px; font-size: 12px; }
.bw-dash { color: var(--hr-text-dim); font-size: 12px; text-align: center; }
.bw-unit { font-size: 10px; color: var(--hr-text-muted); letter-spacing: 0.6px; }
@media (max-width: 640px) {
  .bw-row { grid-template-columns: 1fr 1fr 1fr 1fr auto; }
  .bw-dash, .bw-unit { display: none; }
}

.onb-btn-ghost.grow { width: 100%; justify-content: center; }

.modal-foot {
  display: flex; gap: 8px; justify-content: flex-end; align-items: center;
  padding: 14px 22px; border-top: 1px solid rgba(20, 184, 166, 0.14);
}
.foot-spacer { flex: 1; font-size: 10.5px; letter-spacing: 0.8px; text-transform: uppercase; color: var(--hr-text-dim); }

@keyframes att-spin { to { transform: rotate(360deg); } }
.spin { animation: att-spin 0.9s linear infinite; }

.att-fade-enter-active, .att-fade-leave-active { transition: opacity .22s ease; }
.att-fade-enter-from, .att-fade-leave-to { opacity: 0; }

/* ════════════ LIGHT THEME ════════════ */
[data-theme="light"] .att-eyebrow { color: var(--att-teal-500); }
[data-theme="light"] .banner-title {
  background: linear-gradient(110deg, var(--att-teal-400), var(--att-yellow-500), var(--att-orange-500));
  -webkit-background-clip: text; background-clip: text;
}
[data-theme="light"] .shifts-banner {
  background:
    radial-gradient(120% 100% at 100% 0%, rgba(13, 148, 136, 0.14), transparent 65%),
    rgba(255, 250, 240, 0.85);
  border-color: rgba(13, 148, 136, 0.30);
  box-shadow: 0 22px 50px -28px rgba(40, 25, 10, 0.18);
}
[data-theme="light"] .shift-card {
  background:
    radial-gradient(120% 80% at 0% 0%, rgba(217, 119, 6, 0.10), transparent 55%),
    rgba(255, 250, 240, 0.94);
  border-color: rgba(180, 83, 9, 0.30);
  box-shadow: 0 22px 50px -28px rgba(40, 25, 10, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
[data-theme="light"] .shift-card::before {
  background: linear-gradient(180deg, rgba(217, 119, 6, 0.10), transparent);
}
[data-theme="light"] .shift-card::after {
  background:
    radial-gradient(circle at 50% 4px,  rgba(180, 83, 9, 0.6) 1.1px, transparent 1.5px),
    radial-gradient(circle at 50% 10px, rgba(180, 83, 9, 0.6) 1.1px, transparent 1.5px),
    radial-gradient(circle at 50% 16px, rgba(180, 83, 9, 0.6) 1.1px, transparent 1.5px);
  background-repeat: repeat-y; background-size: 3px 8px;
}
[data-theme="light"] .shift-card:hover {
  border-color: rgba(194, 65, 12, 0.55);
  box-shadow: 0 28px 60px -28px rgba(180, 83, 9, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
[data-theme="light"] .shift-code { color: var(--att-teal-500); }
[data-theme="light"] .shift-type {
  background: rgba(202, 138, 4, 0.16);
  color: var(--att-yellow-700);
  border-color: rgba(202, 138, 4, 0.32);
}
[data-theme="light"] .shift-type[data-type="NIGHT"] {
  background: rgba(124, 58, 237, 0.14); color: #6d28d9; border-color: rgba(124, 58, 237, 0.32);
}
[data-theme="light"] .timeline-track {
  background:
    repeating-linear-gradient(
      90deg,
      rgba(180, 83, 9, 0.18) 0,
      rgba(180, 83, 9, 0.18) 1px,
      transparent 1px,
      transparent 8.333%
    ),
    linear-gradient(180deg, rgba(255, 246, 226, 0.95), rgba(254, 240, 210, 0.98));
  border-color: rgba(180, 83, 9, 0.40);
  box-shadow:
    inset 0 1px 3px rgba(120, 53, 15, 0.12),
    inset 0 -1px 0 rgba(255, 255, 255, 0.55);
}
[data-theme="light"] .timeline-bar {
  background: linear-gradient(90deg, #f59e0b 0%, #ea580c 55%, #c2410c 100%);
  color: #fff;
  border-color: rgba(120, 53, 15, 0.55);
  text-shadow: 0 1px 0 rgba(120, 53, 15, 0.45);
  box-shadow:
    0 0 12px rgba(194, 65, 12, 0.40),
    inset 0 1px 0 rgba(255, 255, 255, 0.30);
}
[data-theme="light"] .timeline-break {
  background: rgba(234, 88, 12, 0.45);
  border-color: rgba(234, 88, 12, 0.70);
}
[data-theme="light"] .shift-meta { border-top-color: rgba(13, 148, 136, 0.20); }
[data-theme="light"] .shift-meta svg { color: var(--att-teal-500); }
[data-theme="light"] .policy-chip {
  background: rgba(13, 148, 136, 0.06); color: var(--hr-text-secondary);
  border-color: rgba(13, 148, 136, 0.18);
}
[data-theme="light"] .policy-chip[data-on="true"] {
  background: rgba(13, 148, 136, 0.12); color: var(--att-teal-500);
  border-color: rgba(13, 148, 136, 0.30);
}
[data-theme="light"] .shifts-empty { border-color: rgba(13, 148, 136, 0.30); }
[data-theme="light"] .modal-card {
  background: rgba(255, 250, 240, 0.98);
  border-color: rgba(13, 148, 136, 0.30);
}
[data-theme="light"] .att-input {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(13, 148, 136, 0.28);
  color-scheme: light;
}
[data-theme="light"] .form-block {
  background: rgba(13, 148, 136, 0.03);
  border-color: rgba(13, 148, 136, 0.22);
}
[data-theme="light"] .form-block legend { color: var(--att-teal-500); }
[data-theme="light"] .dow-pill {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(180, 83, 9, 0.30);
  color: var(--hr-text);
}
[data-theme="light"] .dow-pill:hover {
  border-color: rgba(194, 65, 12, 0.55);
  color: var(--hr-text);
  background: rgba(255, 250, 240, 0.95);
}
[data-theme="light"] .dow-pill.active {
  background: linear-gradient(135deg, #d97706 0%, #c2410c 70%, #9a3412 100%);
  color: #fff;
  border-color: #c2410c;
  box-shadow: 0 6px 18px -6px rgba(180, 83, 9, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.30);
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.25);
}
[data-theme="light"] .field-toggle input[type="checkbox"] {
  background: rgba(255, 250, 240, 0.75);
  border-color: rgba(180, 83, 9, 0.36);
}
[data-theme="light"] .field-toggle input[type="checkbox"]::before {
  background: linear-gradient(180deg, #fff, #fef3c7);
  box-shadow: 0 2px 6px rgba(120, 53, 15, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.7);
}
[data-theme="light"] .field-toggle input[type="checkbox"]:checked {
  background: linear-gradient(135deg, #d97706 0%, #c2410c 60%, #9a3412 100%);
  border-color: #c2410c;
  box-shadow: 0 6px 18px -6px rgba(180, 83, 9, 0.55);
}
[data-theme="light"] .field-toggle input[type="checkbox"]:checked::before {
  background: #fff7ed;
}
[data-theme="light"] .att-input[type="number"]::-webkit-outer-spin-button,
[data-theme="light"] .att-input[type="number"]::-webkit-inner-spin-button {
  background:
    linear-gradient(180deg, rgba(180, 83, 9, 0.18), rgba(180, 83, 9, 0.06)) center / 100% 100% no-repeat;
  border-left-color: rgba(180, 83, 9, 0.28);
}
[data-theme="light"] .hint {
  background: rgba(13, 148, 136, 0.06);
  border-left-color: var(--att-teal-500);
  color: var(--hr-text-secondary);
}
[data-theme="light"] .hint b { color: var(--att-teal-500); }
[data-theme="light"] .readout {
  background: rgba(13, 148, 136, 0.10);
  border-color: rgba(13, 148, 136, 0.36);
  color: var(--att-teal-500);
}
[data-theme="light"] .field-toggle input[type="checkbox"] { background: rgba(148, 163, 184, 0.35); }
[data-theme="light"] .field-toggle input[type="checkbox"]:checked {
  background: linear-gradient(135deg, var(--att-teal-500), var(--att-teal-400));
}
</style>
