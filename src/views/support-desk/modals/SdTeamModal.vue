<template>
  <SdModalShell :open="open" :eyebrow="editing ? 'EDIT TEAM' : 'NEW SUPPORT TEAM'" :title="editing ? 'Edit support team' : 'Build a support team'" width="1000px" @close="$emit('close')">
    <div class="tm">
      <!-- stepper -->
      <div class="tm-steps" role="tablist">
        <button v-for="(s, i) in STEPS" :key="s.key" type="button" class="tm-step" :class="{ on: i === step, done: i < step }" :disabled="i > maxReached" @click="goStep(i)">
          <span class="tm-node"><Check v-if="i < step" :size="13" /><component v-else :is="s.icon" :size="13" /></span>
          <span class="tm-lbl">{{ s.label }}</span>
          <span v-if="i < STEPS.length - 1" class="tm-line" :class="{ lit: i < step }" aria-hidden="true" />
        </button>
      </div>

      <div class="tm-grid">
        <!-- FORM -->
        <div class="tm-formcol">
          <Motion :key="step" as="div" class="tm-pane" :initial="{ opacity: 0, x: 16 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }">
            <!-- STEP 1 — Identity -->
            <template v-if="curKey === 'identity'">
              <label class="tm-field">
                <span class="tm-k">Team name <em>*</em></span>
                <input v-model="form.name" class="tm-inp" :class="{ bad: nameTaken }" maxlength="120" placeholder="e.g. Tier-2 Infrastructure" @keydown.enter.prevent="next" />
                <Presence>
                  <Motion v-if="nameTaken" as="span" class="tm-dup" :initial="{ opacity: 0, y: -4 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0 }">
                    <AlertCircle :size="11" /> A team already carries this name.
                  </Motion>
                </Presence>
              </label>
              <div class="tm-grid2">
                <label class="tm-field"><span class="tm-k">Code <i>optional</i></span>
                  <input v-model="form.code" class="tm-inp" :class="{ bad: codeTaken }" maxlength="40" placeholder="L2-INFRA" />
                  <Presence>
                    <Motion v-if="codeTaken" as="span" class="tm-dup" :initial="{ opacity: 0, y: -4 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0 }">
                      <AlertCircle :size="11" /> Code already in use.
                    </Motion>
                  </Presence>
                </label>
                <div class="tm-field">
                  <span class="tm-k">Accent colour</span>
                  <div class="tm-swatches">
                    <button v-for="c in SWATCHES" :key="c" type="button" class="tm-sw" :class="{ on: form.color === c }" :style="{ background: c }" @click="form.color = c" />
                  </div>
                </div>
              </div>
              <label class="tm-field">
                <span class="tm-k">Purpose / charter <i>why this team exists, what it handles</i></span>
                <textarea v-model="form.description" rows="4" class="tm-inp" placeholder="This team owns production infrastructure incidents — servers, network, and platform reliability. SLA-critical." />
              </label>
            </template>

            <!-- STEP 2 — Scope & Routing -->
            <template v-else-if="curKey === 'scope'">
              <p class="tm-q">Which request types does this team handle?</p>
              <p class="tm-sub-q">Tickets of these types get routed to this team. Pick all that apply.</p>
              <div class="tm-typegrid">
                <button
                  v-for="ty in TYPE_OPTS" :key="ty.value" type="button"
                  class="tm-typechip" :class="{ on: form.request_types.includes(ty.value) }"
                  @click="toggleType(ty.value)"
                >
                  <span class="tm-tc-ic"><component :is="ty.icon" :size="16" /></span>
                  <span class="tm-tc-lbl">{{ ty.label }}</span>
                  <span class="tm-tc-tick"><Check :size="11" /></span>
                </button>
              </div>

              <p class="tm-q mt">Categories this team owns <i class="opt">optional</i></p>
              <div v-if="!categories.length" class="tm-cat-empty">
                <component :is="pickersLoading ? Loader : Layers" :size="13" :class="{ spin: pickersLoading }" />
                {{ pickersLoading ? 'Loading categories…' : 'No categories configured yet.' }}
              </div>
              <div v-else class="tm-cats">
                <button
                  v-for="c in categories" :key="c.id" type="button"
                  class="tm-cat" :class="{ on: form.category_ids.includes(c.id) }"
                  @click="toggleCategory(c.id)"
                >
                  <span class="tm-cat-dot" /><span class="tm-cat-lbl">{{ c.name }}</span>
                  <Check v-if="form.category_ids.includes(c.id)" :size="12" class="tm-cat-tick" />
                </button>
              </div>

              <p class="tm-q mt">Auto-assign matched tickets?</p>
              <button type="button" class="tm-toggle" :class="{ on: form.auto_assign }" @click="form.auto_assign = !form.auto_assign">
                <span class="tm-tg-knob"><component :is="form.auto_assign ? Zap : Hand" :size="13" /></span>
                <span class="tm-tg-body">
                  <span class="tm-tg-lbl">{{ form.auto_assign ? 'Auto-assign is on' : 'Manual assignment' }}</span>
                  <span class="tm-tg-sub">{{ form.auto_assign ? 'Incoming tickets are spread across agents automatically.' : 'Agents pick up tickets from the team queue themselves.' }}</span>
                </span>
              </button>
              <Presence>
                <Motion
                  v-if="form.auto_assign" as="div" class="tm-method"
                  :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }"
                  :transition="{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }"
                >
                  <span class="tm-method-lbl">Distribution method</span>
                  <div class="tm-seg">
                    <button v-for="m in ASSIGN_METHODS" :key="m.value" type="button"
                      class="tm-seg-btn" :class="{ on: form.assignment_method === m.value }"
                      @click="form.assignment_method = m.value">
                      <component :is="m.icon" :size="13" /> {{ m.label }}
                    </button>
                  </div>
                </Motion>
              </Presence>

              <p class="tm-q mt">Default priority <i class="opt">optional · pre-set on new tickets</i></p>
              <div class="tm-seg wide">
                <button v-for="p in PRIORITIES" :key="p.value" type="button"
                  class="tm-seg-btn pri" :class="{ on: form.default_priority === p.value }"
                  :style="{ '--pc': priColor(p.value) }"
                  @click="form.default_priority = form.default_priority === p.value ? '' : p.value">
                  <span class="tm-pri-dot" /> {{ p.label }}
                </button>
              </div>
            </template>

            <!-- STEP 3 — Members & roles -->
            <template v-else-if="curKey === 'members'">
              <div class="tm-msearch">
                <Search :size="15" />
                <input v-model="q" class="tm-msearch-in" placeholder="Search employees by name or email…" />
                <span class="tm-selcount">{{ form.member_ids.length }} selected</span>
              </div>
              <div class="tm-people">
                <div v-if="loadingPeople" class="tm-people-empty"><Loader :size="16" class="spin" /> Loading directory…</div>
                <template v-else>
                  <Motion
                    as="div" v-for="(p, i) in shownPeople" :key="p.id"
                    class="tm-person" :class="{ on: form.member_ids.includes(p.id) }"
                    :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.24, delay: Math.min(i * 0.015, 0.3) }"
                  >
                    <button type="button" class="tm-person-tap" @click="toggleMember(p.id)">
                      <span class="tm-ava" :style="avaStyle(p)">{{ initials(p.name) }}</span>
                      <span class="tm-pbody">
                        <span class="tm-pname">{{ p.name }}</span>
                        <span class="tm-psub">{{ [p.designation, p.department].filter(Boolean).join(' · ') || p.email }}</span>
                      </span>
                      <span class="tm-badges">
                        <span v-if="p.is_manager" class="tm-badge mgr"><Crown :size="10" /> Manager</span>
                        <span v-if="p.is_agent" class="tm-badge agent"><Shield :size="10" /> Agent</span>
                      </span>
                      <span class="tm-check"><Check :size="13" /></span>
                    </button>
                    <Presence>
                      <Motion
                        v-if="form.member_ids.includes(p.id)" as="div" class="tm-roles"
                        :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }"
                        :transition="{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }"
                      >
                        <span class="tm-roles-k">Role</span>
                        <div class="tm-roleseg">
                          <button v-for="r in ROLES" :key="r.value" type="button"
                            class="tm-role-btn" :class="{ on: roleOf(p.id) === r.value }"
                            @click="setRole(p.id, r.value)">
                            <component :is="r.icon" :size="11" /> {{ r.label }}
                          </button>
                        </div>
                      </Motion>
                    </Presence>
                  </Motion>
                  <p v-if="!shownPeople.length" class="tm-people-empty">No matching employees.</p>
                </template>
              </div>
              <p class="tm-note"><Info :size="12" /> Only <b>Lead</b> and <b>Agent</b> members get auto-assigned work. <em>Collaborators</em> are visibility-only — they can see and help, but never auto-receive tickets.</p>

              <Presence>
                <Motion v-if="leadClearedNote" as="p" class="tm-leadnote"
                  :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }"
                  :transition="{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }">
                  <Crown :size="12" /> Lead removed with that member — pick a new lead in <b>Service &amp; review</b>.
                </Motion>
              </Presence>

              <!-- departing members still own active tickets → pick ONE directive for the batch -->
              <Presence>
                <Motion v-if="editing && impact.length" as="div" class="tm-impact"
                  :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }"
                  :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }">
                  <p class="tm-imp-head"><AlertTriangle :size="13" />
                    {{ impact.length }} departing member{{ impact.length === 1 ? '' : 's' }} still own{{ impact.length === 1 ? 's' : '' }}
                    <b>{{ impactTotal }}</b> active ticket{{ impactTotal === 1 ? '' : 's' }} on this team.</p>
                  <ul class="tm-imp-list">
                    <li v-for="m in impact" :key="m.user_id">
                      <span class="tm-ava sm" :style="avaStyle(m)">{{ initials(m.name) }}</span>
                      <span class="tm-imp-name">{{ m.name || 'Member' }}</span>
                      <b class="tm-imp-n sd-mono">{{ m.open_count }} open</b>
                    </li>
                  </ul>
                  <p class="tm-imp-q">What happens to their tickets when you save?</p>
                  <div class="tm-seg">
                    <button type="button" class="tm-seg-btn" :class="{ on: directive === 'auto' }" @click="directive = 'auto'">
                      <Repeat :size="12" /> Auto by team method
                    </button>
                    <button type="button" class="tm-seg-btn" :class="{ on: directive === 'unassign' }" @click="directive = 'unassign'">
                      <Inbox :size="12" /> Back to the queue
                    </button>
                    <button type="button" class="tm-seg-btn" :class="{ on: directive === 'reassign' }" @click="directive = 'reassign'">
                      <UserCheck :size="12" /> Hand to…
                    </button>
                  </div>
                  <Presence>
                    <Motion v-if="directive === 'reassign'" as="div"
                      :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }"
                      :transition="{ duration: 0.22 }">
                      <SdSelect v-model="reassignTo" :options="reassignOpts" placeholder="Choose who takes over…" />
                    </Motion>
                  </Presence>
                  <SdGuardNotice :error="guardErr" />
                </Motion>
              </Presence>
            </template>

            <!-- STEP 4 — Service profile & review -->
            <template v-else>
              <p class="tm-q">Business hours</p>
              <p class="tm-sub-q">When this team is on the clock — drives the SLA countdown.</p>
              <div class="tm-days">
                <button v-for="d in DAYS" :key="d.n" type="button"
                  class="tm-day" :class="{ on: form.business_hours.days.includes(d.n) }"
                  @click="toggleDay(d.n)">{{ d.lbl }}</button>
              </div>
              <div class="tm-grid3">
                <label class="tm-field"><span class="tm-k">Start</span><input v-model="form.business_hours.start" type="time" class="tm-inp" /></label>
                <label class="tm-field"><span class="tm-k">End</span><input v-model="form.business_hours.end" type="time" class="tm-inp" /></label>
                <label class="tm-field"><span class="tm-k">Timezone</span><input v-model="form.business_hours.tz" class="tm-inp" placeholder="Asia/Kolkata" /></label>
              </div>

              <p class="tm-q mt">Default SLA package <i class="opt">optional</i></p>
              <SdSelect v-model="form.default_sla_package_id" :options="slaOpts" placeholder="Auto (org / default)" />

              <p class="tm-q mt">Team lead</p>
              <p class="tm-sub-q">The lead owns triage and routing. A reporting manager makes a natural lead.</p>
              <div class="tm-leads">
                <button type="button" class="tm-lead" :class="{ on: !form.lead_user_id }" @click="form.lead_user_id = ''"><span class="tm-lead-x"><Minus :size="14" /></span> No lead</button>
                <button
                  v-for="p in selectedPeople" :key="p.id" type="button"
                  class="tm-lead" :class="{ on: form.lead_user_id === p.id }" @click="pickLead(p.id)"
                >
                  <span class="tm-ava sm" :style="avaStyle(p)">{{ initials(p.name) }}</span>
                  <span class="tm-lead-body"><b>{{ p.name }}</b><i>{{ p.designation || p.email }}</i></span>
                  <Crown v-if="p.is_manager" :size="13" class="tm-crown" />
                </button>
                <p v-if="!selectedPeople.length" class="tm-people-empty">Add members first to pick a lead.</p>
              </div>

              <!-- legacy data: a lead who was never seated on the roster -->
              <Presence>
                <Motion v-if="outsideLead" as="div" class="tm-outlead"
                  :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }"
                  :transition="{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }">
                  <AlertTriangle :size="13" />
                  <span><b>{{ outsideLead.name }}</b> leads this team but isn't on the roster — they won't appear on the crew board.</span>
                  <button type="button" class="tm-outlead-fix" @click="seatLead"><UserPlus :size="12" /> Seat as Lead</button>
                </Motion>
              </Presence>

              <ul class="tm-review">
                <li><span><Users :size="13" /> Members</span><b>{{ form.member_ids.length }}</b></li>
                <li><span><Shield :size="13" /> Agents &amp; leads (auto-assignable)</span><b>{{ workerCount }}</b></li>
                <li><span><Tags :size="13" /> Request types</span><b>{{ form.request_types.length }}</b></li>
                <li><span><Zap :size="13" /> Auto-assign</span><b :style="form.auto_assign ? { color: 'var(--sd-success)' } : null">{{ form.auto_assign ? methodLabel : 'Manual' }}</b></li>
                <li><span><Crown :size="13" /> Lead</span><b>{{ leadName || 'None' }}</b></li>
                <li v-if="editing && impact.length"><span><UserCheck :size="13" /> Departing owners' tickets</span>
                  <b :style="directiveOk ? { color: 'var(--sd-success)' } : { color: 'var(--sd-danger)' }">
                    {{ directive === 'auto' ? 'Auto-spread' : directive === 'unassign' ? 'Back to queue' : directive === 'reassign' ? 'Handed over' : 'Choose in Members' }}
                  </b></li>
              </ul>
            </template>
          </Motion>
          <p v-if="error" class="tm-err"><AlertCircle :size="14" /> {{ error }}</p>
        </div>

        <!-- LIVE PREVIEW -->
        <aside class="tm-preview">
          <div class="tm-card" :style="{ '--tc': form.color || 'var(--sd-amber)' }">
            <span class="tm-card-spine" />
            <span class="tm-card-grain" aria-hidden="true" />
            <div class="tm-card-head">
              <span class="tm-card-ic"><Users :size="16" /></span>
              <div class="tm-card-tags">
                <span class="tm-route" :class="{ auto: form.auto_assign }">
                  <component :is="form.auto_assign ? Zap : Hand" :size="10" /> {{ form.auto_assign ? 'AUTO' : 'MANUAL' }}
                </span>
                <span class="tm-card-stamp" :class="{ ready: isValid }">{{ isValid ? 'READY' : 'DRAFT' }}</span>
              </div>
            </div>
            <p class="tm-card-name" :class="{ ph: !form.name }">{{ form.name || 'Team name' }}</p>
            <p v-if="form.code" class="tm-card-code sd-mono">{{ form.code }}</p>
            <p class="tm-card-desc">{{ form.description || 'A charter helps the team know what it owns.' }}</p>
            <div v-if="form.request_types.length" class="tm-card-types">
              <span v-for="t in shownTypeChips" :key="t.value" class="tm-tchip" :title="t.label">
                <component :is="t.icon" :size="11" /> {{ t.label }}
              </span>
              <span v-if="form.request_types.length > 4" class="tm-tchip more">+{{ form.request_types.length - 4 }}</span>
            </div>
            <div class="tm-card-lead" v-if="leadName"><Crown :size="12" /> Led by <b>{{ leadName }}</b></div>
            <div class="tm-card-roster">
              <span v-for="p in selectedPeople.slice(0, 7)" :key="p.id" class="tm-rava" :style="avaStyle(p)" :title="p.name">{{ initials(p.name) }}</span>
              <span v-if="form.member_ids.length > 7" class="tm-rava more">+{{ form.member_ids.length - 7 }}</span>
              <span v-if="!form.member_ids.length" class="tm-roster-ph">No members yet</span>
            </div>
            <div class="tm-card-foot">
              <span><b>{{ form.member_ids.length }}</b> members</span>
              <span><b>{{ workerCount }}</b> agents</span>
              <span><b>{{ form.request_types.length }}</b> types</span>
            </div>
          </div>
          <p class="tm-hint"><Sparkles :size="12" /> {{ stepHint }}</p>
        </aside>
      </div>

      <!-- ── delete ceremony (in-modal danger sub-dialog; structured 409 → GuardNotice) ── -->
      <Presence>
        <Motion v-if="deleteOpen" as="div" class="tm-delwrap"
          :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.2 }">
          <Motion as="div" class="tm-del" :initial="{ scale: 0.94, y: 12 }" :animate="{ scale: 1, y: 0 }"
            :exit="{ scale: 0.96, opacity: 0 }" :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }">
            <p class="tm-del-title"><Trash2 :size="15" /> Delete “{{ form.name || 'this team' }}”?</p>
            <p class="tm-del-sub">The team is archived, never destroyed: queues and templates pointing at it are
              detached, ticket history keeps its name. Deleting is <b>blocked</b> while any active ticket —
              open or on hold — or a live escalation still depends on it.</p>
            <SdGuardNotice :error="deleteErr" />
            <div class="tm-del-row">
              <button class="tm-btn ghost" type="button" @click="deleteOpen = false; deleteErr = null">Keep team</button>
              <button class="tm-btn dangerfill" type="button" :disabled="deleting" @click="confirmDelete">
                <component :is="deleting ? Loader : Trash2" :size="14" :class="{ spin: deleting }" />
                {{ deleting ? 'Deleting…' : 'Delete team' }}
              </button>
            </div>
          </Motion>
        </Motion>
      </Presence>
    </div>

    <template #footer>
      <button v-if="editing" class="tm-btn danger" type="button" @click="deleteOpen = true"><Trash2 :size="14" /> Delete</button>
      <button v-if="step > 0" class="tm-btn ghost" type="button" @click="prev"><ChevronLeft :size="15" /> Back</button>
      <button class="tm-btn ghost" type="button" @click="$emit('close')">Cancel</button>
      <span class="tm-spacer" />
      <button v-if="step < STEPS.length - 1" class="tm-btn primary" type="button" :disabled="!canNext" @click="next">Continue <ChevronRight :size="15" /></button>
      <button v-else class="tm-btn primary" type="button" :disabled="saving || !isValid" @click="submit">
        <component :is="saving ? Loader : Check" :size="15" :class="{ spin: saving }" /> {{ saving ? 'Saving…' : (editing ? 'Save team' : 'Create team') }}
      </button>
    </template>
  </SdModalShell>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  Users, Check, Search, Crown, Shield, Info, Minus, Sparkles, AlertCircle,
  ChevronLeft, ChevronRight, Loader, Fingerprint, Trash2, Tags, Layers,
  Zap, Hand, Repeat, Scale, UserCog, Route, CalendarClock, UserCheck, UserPlus,
  AlertTriangle, Inbox, Bug, MessageCircleWarning, GitPullRequest, Wrench, GraduationCap, Hammer,
} from 'lucide-vue-next'
import SdModalShell from '../components/SdModalShell.vue'
import SdSelect from '../components/SdSelect.vue'
import SdGuardNotice from '../components/SdGuardNotice.vue'
import {
  createTeam, updateTeam, deleteTeam, listTeams, fetchTeamMemberImpact,
  listTeamPeople, loadPickers, usePickers,
  TICKET_TYPES, PRIORITIES, priorityColor,
} from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  team: { type: Object, default: null },
})
const emit = defineEmits(['close', 'saved', 'deleted'])

/* ─── static meta (house palette only — warm golds/ambers, emerald, red, stone) ─── */
const SWATCHES = ['#fb923c', '#fbbf24', '#e8b04b', '#f97316', '#d97706', '#ef4444', '#34d399', '#9ca3af']
const STEPS = [
  { key: 'identity', label: 'Identity', icon: Fingerprint },
  { key: 'scope', label: 'Scope & routing', icon: Route },
  { key: 'members', label: 'Members', icon: Users },
  { key: 'review', label: 'Service & review', icon: CalendarClock },
]
const TYPE_ICONS = {
  incident: AlertTriangle, service_request: Inbox, bug: Bug, feature_request: Sparkles,
  complaint: MessageCircleWarning, change: GitPullRequest, problem: Wrench,
  training: GraduationCap, implementation: Hammer,
}
const TYPE_OPTS = TICKET_TYPES.map(t => ({ ...t, icon: TYPE_ICONS[t.value] || Inbox }))
const ASSIGN_METHODS = [
  { value: 'round_robin', label: 'Round-robin', icon: Repeat },
  { value: 'load_balanced', label: 'Least busy', icon: Scale },
]
const ROLES = [
  { value: 'lead', label: 'Lead', icon: Crown },
  { value: 'agent', label: 'Agent', icon: Shield },
  { value: 'collaborator', label: 'Collaborator', icon: UserCog },
]
const DAYS = [
  { n: 1, lbl: 'Mon' }, { n: 2, lbl: 'Tue' }, { n: 3, lbl: 'Wed' }, { n: 4, lbl: 'Thu' },
  { n: 5, lbl: 'Fri' }, { n: 6, lbl: 'Sat' }, { n: 7, lbl: 'Sun' },
]

const editing = computed(() => !!props.team)
const step = ref(0)
const maxReached = ref(0)
const curKey = computed(() => STEPS[step.value].key)
const saving = ref(false)
const error = ref('')

/* ─── form ─── */
const defaultHours = () => ({ days: [1, 2, 3, 4, 5], start: '09:00', end: '18:00', tz: 'Asia/Kolkata' })
const blank = () => ({
  name: '', code: '', color: '#fb923c', description: '',
  member_ids: [], member_roles: {}, lead_user_id: '',
  request_types: [], category_ids: [],
  auto_assign: false, assignment_method: 'round_robin',
  business_hours: defaultHours(),
  default_sla_package_id: '', default_priority: '',
})
const form = reactive(blank())

/* ─── pickers (categories + SLA packages) ─── */
const pickers = usePickers()
const pickersLoading = ref(false)
const categories = computed(() => pickers.categories || [])
const slaOpts = computed(() => [{ value: '', label: 'Auto (org / default)' }, ...(pickers.slaPackages || []).map(p => ({ value: p.id, label: p.name }))])

/* ─── people directory ─── */
const people = ref([])
const loadingPeople = ref(false)
const q = ref('')

const loadPeople = async () => {
  loadingPeople.value = true
  try { people.value = await listTeamPeople({ limit: 500 }) } catch { people.value = [] } finally { loadingPeople.value = false }
}

watch(() => props.open, (v) => {
  if (!v) return
  Object.assign(form, blank())
  step.value = 0; maxReached.value = 0; error.value = ''; q.value = ''
  impact.value = []; directive.value = ''; reassignTo.value = ''; guardErr.value = null
  deleteOpen.value = false; deleteErr.value = null; leadClearedNote.value = false
  // uniqueness snapshot (inactive teams still hold their names/codes)
  listTeams({ include_inactive: true }).then(r => { allTeams.value = r || [] }).catch(() => { allTeams.value = [] })
  if (props.team) {
    const t = props.team
    form.name = t.name || ''; form.code = t.code || ''; form.color = t.color || '#fb923c'
    form.description = t.description || ''
    form.member_ids = (t.member_ids || []).map(String)
    form.member_roles = {}
    Object.entries(t.member_roles || {}).forEach(([k, val]) => { form.member_roles[String(k)] = val })
    form.lead_user_id = t.lead_user_id ? String(t.lead_user_id) : ''
    form.request_types = Array.isArray(t.request_types) ? [...t.request_types] : []
    form.category_ids = (t.category_ids || []).map(String)
    form.auto_assign = !!t.auto_assign
    form.assignment_method = t.assignment_method && t.assignment_method !== 'manual' ? t.assignment_method : 'round_robin'
    const bh = t.business_hours && Object.keys(t.business_hours).length ? t.business_hours : defaultHours()
    form.business_hours = {
      days: Array.isArray(bh.days) && bh.days.length ? [...bh.days] : [1, 2, 3, 4, 5],
      start: bh.start || '09:00', end: bh.end || '18:00', tz: bh.tz || 'Asia/Kolkata',
    }
    form.default_sla_package_id = t.default_sla_package_id ? String(t.default_sla_package_id) : ''
    form.default_priority = t.default_priority || ''
  }
  loadPeople()
  pickersLoading.value = true
  loadPickers().finally(() => { pickersLoading.value = false })
})

/* ─── derived people lists ─── */
const shownPeople = computed(() => {
  const term = q.value.trim().toLowerCase()
  let list = people.value
  if (term) list = list.filter(p => `${p.name} ${p.email} ${p.designation || ''} ${p.department || ''}`.toLowerCase().includes(term))
  return [...list].sort((a, b) => {
    const sa = form.member_ids.includes(a.id) ? 0 : 1
    const sb = form.member_ids.includes(b.id) ? 0 : 1
    return sa - sb || (a.name || '').localeCompare(b.name || '')
  })
})
const selectedPeople = computed(() => form.member_ids.map(id => people.value.find(p => p.id === id)).filter(Boolean))
// Auto-assignable = members tagged lead/agent (Collaborators are visibility-only).
const workerCount = computed(() => form.member_ids.filter(id => roleOf(id) !== 'collaborator').length)
const leadName = computed(() => people.value.find(p => p.id === form.lead_user_id)?.name || '')
const methodLabel = computed(() => ASSIGN_METHODS.find(m => m.value === form.assignment_method)?.label || 'Round-robin')

const shownTypeChips = computed(() =>
  form.request_types.slice(0, 4).map(v => ({ value: v, label: TICKET_TYPES.find(t => t.value === v)?.label || v, icon: TYPE_ICONS[v] || Inbox })))

/* ─── toggles ─── */
const toggleMember = (id) => {
  const i = form.member_ids.indexOf(id)
  if (i >= 0) {
    form.member_ids.splice(i, 1)
    delete form.member_roles[id]
    if (form.lead_user_id === id) {
      form.lead_user_id = ''
      leadClearedNote.value = true
      clearTimeout(leadNoteTimer)
      leadNoteTimer = setTimeout(() => { leadClearedNote.value = false }, 6000)
    }
  } else {
    form.member_ids.push(id)
    if (!form.member_roles[id]) form.member_roles[id] = 'agent'
  }
}
const roleOf = (id) => form.member_roles[id] || 'agent'
const setRole = (id, role) => {
  form.member_roles[id] = role
  if (role === 'lead') form.lead_user_id = id
  else if (form.lead_user_id === id) form.lead_user_id = ''
}
const toggleType = (v) => {
  const i = form.request_types.indexOf(v)
  if (i >= 0) form.request_types.splice(i, 1)
  else form.request_types.push(v)
}
const toggleCategory = (id) => {
  const i = form.category_ids.indexOf(id)
  if (i >= 0) form.category_ids.splice(i, 1)
  else form.category_ids.push(id)
}
const toggleDay = (n) => {
  const arr = form.business_hours.days
  const i = arr.indexOf(n)
  if (i >= 0) arr.splice(i, 1)
  else { arr.push(n); arr.sort((a, b) => a - b) }
}
const pickLead = (id) => {
  form.lead_user_id = id
  if (!form.member_roles[id]) form.member_roles[id] = 'lead'
  else form.member_roles[id] = 'lead'
}

/* ─── helpers ─── */
const priColor = (v) => priorityColor(v)
const initials = (n) => ((n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?')
const avaStyle = (p) => {
  let h = 0; const s = String(p.id || p.name)
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360
  const hue = 20 + (h % 45)
  return { background: `linear-gradient(135deg, hsl(${hue} 85% 58%), hsl(${(hue + 18) % 360} 80% 46%))` }
}

/* ─── uniqueness (live, vs the fleet snapshot; server 400s are the backstop) ─── */
const allTeams = ref([])
const notMe = (t) => String(t.id) !== String(props.team?.id || '')
const nameTaken = computed(() => {
  const n = form.name.trim().toLowerCase()
  return !!n && allTeams.value.some(t => notMe(t) && (t.name || '').trim().toLowerCase() === n)
})
const codeTaken = computed(() => {
  const c = form.code.trim().toLowerCase()
  return !!c && allTeams.value.some(t => notMe(t) && (t.code || '').trim().toLowerCase() === c)
})

/* ─── lead ⇄ roster affordances ─── */
const leadClearedNote = ref(false)
let leadNoteTimer = null
// Legacy data can carry a lead who was never seated on the roster — surface + one-click fix.
const outsideLead = computed(() => (form.lead_user_id && !form.member_ids.includes(form.lead_user_id))
  ? people.value.find(p => p.id === form.lead_user_id) || { id: form.lead_user_id, name: 'Current lead' }
  : null)
const seatLead = () => {
  if (!form.lead_user_id) return
  if (!form.member_ids.includes(form.lead_user_id)) form.member_ids.push(form.lead_user_id)
  form.member_roles[form.lead_user_id] = 'lead'
}

/* ─── member-removal impact preflight (edit mode) ───
   The SAME helper that powers the PATCH 409, so this warning === the save guard.
   When departing members still own active team tickets, the admin picks ONE directive
   for the batch; it rides the update payload as reassign_strategy/reassign_to. */
const impact = ref([])
const directive = ref('')          // '' | 'auto' | 'unassign' | 'reassign'
const reassignTo = ref('')
const guardErr = ref(null)
let impTimer = null
const removedIds = computed(() => {
  if (!editing.value || !props.team) return []
  const orig = new Set([...(props.team.member_ids || []).map(String),
                        ...(props.team.lead_user_id ? [String(props.team.lead_user_id)] : [])])
  const cur = new Set([...form.member_ids, ...(form.lead_user_id ? [form.lead_user_id] : [])])
  return [...orig].filter(id => !cur.has(id))
})
watch(removedIds, (ids) => {
  clearTimeout(impTimer)
  if (!editing.value || !ids.length) { impact.value = []; directive.value = ''; reassignTo.value = ''; return }
  impTimer = setTimeout(async () => {
    try {
      const r = await fetchTeamMemberImpact(props.team.id, ids)
      impact.value = (r.members || []).filter(m => (m.open_count || 0) > 0)
    } catch { impact.value = [] }   // preflight is best-effort; the PATCH 409 is the real guard
  }, 400)
})
const impactTotal = computed(() => impact.value.reduce((s, m) => s + (m.open_count || 0), 0))
const reassignOpts = computed(() => selectedPeople.value
  .filter(p => roleOf(p.id) !== 'collaborator')
  .map(p => ({ value: p.id, label: p.name, icon: p.id === form.lead_user_id ? Crown : UserCheck })))
const directiveOk = computed(() => !impact.value.length
  || (directive.value && (directive.value !== 'reassign' || !!reassignTo.value)))

/* ─── delete (in-modal danger ceremony; structured 409 → SdGuardNotice) ─── */
const deleteOpen = ref(false)
const deleting = ref(false)
const deleteErr = ref(null)
const confirmDelete = async () => {
  if (!props.team) return
  deleting.value = true; deleteErr.value = null
  try {
    await deleteTeam(props.team.id)
    deleteOpen.value = false
    emit('deleted')
  } catch (e) {
    deleteErr.value = e?.response?.data?.detail || 'Delete failed.'
  } finally { deleting.value = false }
}

/* ─── validation + nav ─── */
const subjectOk = computed(() => form.name.trim().length > 1)
const isValid = computed(() => subjectOk.value && !nameTaken.value && !codeTaken.value && directiveOk.value)
const canNext = computed(() => (curKey.value === 'identity' ? (subjectOk.value && !nameTaken.value && !codeTaken.value) : true))
const next = () => { if (step.value < STEPS.length - 1 && canNext.value) { step.value++; maxReached.value = Math.max(maxReached.value, step.value) } }
const prev = () => { if (step.value > 0) step.value-- }
const goStep = (i) => { if (i <= maxReached.value) step.value = i }

const stepHint = computed(() => ({
  identity: 'Name the team and write a short charter — it’s what routing and reports show.',
  scope: 'Map the request types & categories this desk owns, then choose how work lands.',
  members: 'Staff the desk and tag each person Lead / Agent / Collaborator.',
  review: 'Set the hours that drive the SLA clock, pick a lead, and confirm.',
}[curKey.value] || ''))

/* ─── submit ─── */
const submit = async () => {
  if (!subjectOk.value) { error.value = 'A team name is required.'; step.value = 0; return }
  if (!directiveOk.value) { error.value = 'Choose what happens to the departing members’ tickets.'; step.value = 2; return }
  saving.value = true; error.value = ''; guardErr.value = null
  try {
    const payload = {
      name: form.name.trim(),
      code: form.code || null,
      color: form.color || null,
      description: form.description || null,
      lead_user_id: form.lead_user_id || null,
      member_ids: form.member_ids,
      member_roles: form.member_roles,
      request_types: form.request_types,
      category_ids: form.category_ids,
      auto_assign: form.auto_assign,
      assignment_method: form.auto_assign ? form.assignment_method : 'manual',
      business_hours: form.business_hours,
      default_sla_package_id: form.default_sla_package_id || null,
      default_priority: form.default_priority || null,
    }
    // reassignment directive rides the same PATCH — the backend re-seats the orphaned
    // tickets atomically with the roster change (activity + notification per ticket)
    if (editing.value && impact.value.length && directive.value) {
      payload.reassign_strategy = directive.value
      if (directive.value === 'reassign') payload.reassign_to = reassignTo.value
    }
    const saved = editing.value ? await updateTeam(props.team.id, payload) : await createTeam(payload)
    emit('saved', saved)
  } catch (e) {
    const d = e?.response?.data?.detail
    if (d && typeof d === 'object') {
      // structured guard — show it where the fix lives
      guardErr.value = d
      if (d.error === 'members_have_open_assignments') {
        impact.value = d.members || impact.value
        step.value = 2
      }
      error.value = d.message || 'Blocked by a safety guard.'
    } else {
      error.value = d || 'Could not save the team.'
      if (/name already exists|code already exists/i.test(String(d))) step.value = 0
    }
  } finally { saving.value = false }
}
</script>

<style scoped>
.tm { position: relative; display: flex; flex-direction: column; gap: 18px; }
.tm-steps { display: flex; align-items: center; }
.tm-step { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; background: none; border: 0; cursor: pointer; padding: 0; font-family: inherit; }
.tm-step:disabled { cursor: default; }
.tm-node { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; color: var(--sd-text-muted); background: var(--sd-surface); border: 1.5px solid var(--sd-border-strong); transition: all 0.28s var(--sd-spring); z-index: 1; }
.tm-step.on .tm-node { color: #1a1206; background: var(--sd-grad-hero); border-color: transparent; box-shadow: 0 0 0 4px var(--sd-amber-soft); }
[data-theme="light"] .tm-step.on .tm-node { color: #fff8ec; }
.tm-step.done .tm-node { color: var(--sd-success); border-color: color-mix(in srgb, var(--sd-success) 45%, transparent); background: var(--sd-success-soft); }
.tm-lbl { font-size: 11px; font-weight: 700; color: var(--sd-text-muted); }
.tm-step.on .tm-lbl { color: var(--sd-text); }
.tm-line { position: absolute; top: 15px; left: calc(50% + 18px); right: calc(-50% + 18px); height: 2px; background: var(--sd-border-strong); }
.tm-line.lit { background: linear-gradient(90deg, var(--sd-amber), var(--sd-ember)); }

.tm-grid { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 22px; align-items: start; }
.tm-formcol { min-width: 0; min-height: 392px; }
.tm-pane { display: flex; flex-direction: column; gap: 14px; }
.tm-field { display: flex; flex-direction: column; gap: 7px; }
.tm-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
.tm-grid3 { display: grid; grid-template-columns: 1fr 1fr 1.3fr; gap: 11px; }
.tm-k { font-size: 12px; font-weight: 600; color: var(--sd-text-secondary); }
.tm-k em { color: var(--sd-danger); font-style: normal; }
.tm-k i { font-style: normal; font-weight: 500; color: var(--sd-text-dim); font-size: 11px; margin-left: 4px; }
.tm-inp { width: 100%; padding: 11px 13px; border-radius: 11px; font-size: 14px; font-family: inherit; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text); }
.tm-inp:focus { outline: none; border-color: var(--sd-amber-border); box-shadow: 0 0 0 3px var(--sd-amber-soft); }
textarea.tm-inp { resize: vertical; line-height: 1.5; }
input[type="time"].tm-inp { color-scheme: dark; }
[data-theme="light"] input[type="time"].tm-inp { color-scheme: light; }
.tm-swatches { display: flex; gap: 7px; flex-wrap: wrap; }
.tm-sw { width: 26px; height: 26px; border-radius: 8px; cursor: pointer; border: 2px solid transparent; transition: transform 0.15s; }
.tm-sw:hover { transform: scale(1.12); }
.tm-sw.on { border-color: var(--sd-text); box-shadow: 0 0 0 2px var(--sd-surface-elevated), 0 0 0 4px currentColor; }

.tm-q { font-size: 13.5px; font-weight: 700; color: var(--sd-text); margin: 0; }
.tm-q.mt { margin-top: 4px; }
.tm-q .opt { font-style: normal; font-weight: 500; color: var(--sd-text-dim); font-size: 11px; margin-left: 4px; }
.tm-sub-q { font-size: 12.5px; color: var(--sd-text-muted); margin: -8px 0 2px; }

/* ── request-type grid (mirrors SdTicketCreateModal type-chip) ── */
.tm-typegrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
.tm-typechip { position: relative; display: flex; flex-direction: column; align-items: center; gap: 7px; padding: 13px 8px; border-radius: 13px; cursor: pointer; font-family: inherit; background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.2s var(--sd-spring); }
.tm-typechip:hover { border-color: var(--sd-amber-border); transform: translateY(-2px); }
.tm-typechip.on { border-color: transparent; background: var(--sd-amber-soft); box-shadow: 0 0 0 1.5px var(--sd-amber-border) inset; }
.tm-tc-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; color: var(--sd-amber); background: color-mix(in srgb, var(--sd-amber) 12%, transparent); }
.tm-typechip.on .tm-tc-ic { color: #1a1206; background: var(--sd-grad-hero); }
[data-theme="light"] .tm-typechip.on .tm-tc-ic { color: #fff8ec; }
.tm-tc-lbl { font-size: 11px; font-weight: 600; color: var(--sd-text-secondary); text-align: center; line-height: 1.2; }
.tm-typechip.on .tm-tc-lbl { color: var(--sd-text); }
.tm-tc-tick { position: absolute; top: 6px; right: 6px; display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%; color: #1a1206; background: var(--sd-grad-hero); opacity: 0; transform: scale(0.5); transition: all 0.2s var(--sd-spring); }
[data-theme="light"] .tm-tc-tick { color: #fff8ec; }
.tm-typechip.on .tm-tc-tick { opacity: 1; transform: scale(1); }

/* ── category chips ── */
.tm-cats { display: flex; flex-wrap: wrap; gap: 7px; }
.tm-cat { display: inline-flex; align-items: center; gap: 7px; padding: 7px 12px; border-radius: 999px; cursor: pointer; font-family: inherit; font-size: 12.5px; font-weight: 600; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.18s var(--sd-spring); }
.tm-cat:hover { border-color: var(--sd-amber-border); }
.tm-cat.on { color: var(--sd-text); background: var(--sd-amber-soft); border-color: var(--sd-amber-border); }
.tm-cat-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--sd-text-dim); }
.tm-cat.on .tm-cat-dot { background: var(--sd-amber); box-shadow: 0 0 7px color-mix(in srgb, var(--sd-amber) 60%, transparent); }
.tm-cat-tick { color: var(--sd-amber); }
.tm-cat-empty { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; color: var(--sd-text-dim); padding: 4px 0; }

/* ── auto-assign toggle ── */
.tm-toggle { display: flex; align-items: center; gap: 11px; padding: 12px 14px; border-radius: 13px; cursor: pointer; font-family: inherit; text-align: left; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); transition: all 0.2s var(--sd-spring); }
.tm-toggle.on { border-color: var(--sd-amber-border); background: var(--sd-amber-soft); }
.tm-tg-knob { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0; color: var(--sd-text-muted); background: var(--sd-surface); transition: all 0.24s var(--sd-spring); }
.tm-toggle.on .tm-tg-knob { color: #1a1206; background: var(--sd-grad-hero); }
[data-theme="light"] .tm-toggle.on .tm-tg-knob { color: #fff8ec; }
.tm-tg-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.tm-tg-lbl { font-size: 13px; font-weight: 700; color: var(--sd-text-secondary); }
.tm-toggle.on .tm-tg-lbl { color: var(--sd-text); }
.tm-tg-sub { font-size: 11px; color: var(--sd-text-muted); line-height: 1.35; }
.tm-method { overflow: hidden; display: flex; flex-direction: column; gap: 7px; }
.tm-method-lbl { font-size: 11px; font-weight: 600; color: var(--sd-text-muted); margin-top: 4px; }

/* ── segmented controls ── */
.tm-seg { display: flex; gap: 6px; }
.tm-seg.wide { flex-wrap: wrap; }
.tm-seg-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 6px; border-radius: 10px; cursor: pointer; font-family: inherit; font-size: 12px; font-weight: 650; color: var(--sd-text-muted); background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.18s var(--sd-spring); }
.tm-seg-btn:hover { border-color: var(--sd-amber-border); }
.tm-seg-btn.on { color: var(--sd-text); background: var(--sd-amber-soft); border-color: var(--sd-amber-border); }
.tm-seg-btn.pri { min-width: 84px; flex: 0 1 auto; }
.tm-seg-btn.pri:hover { border-color: color-mix(in srgb, var(--pc) 45%, transparent); }
.tm-seg-btn.pri.on { color: var(--sd-text); background: color-mix(in srgb, var(--pc) 14%, transparent); border-color: color-mix(in srgb, var(--pc) 55%, transparent); }
.tm-pri-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--pc); box-shadow: 0 0 7px color-mix(in srgb, var(--pc) 55%, transparent); }

/* ── members ── */
.tm-msearch { display: flex; align-items: center; gap: 9px; padding: 10px 13px; border-radius: 11px; background: var(--sd-surface); border: 1px solid var(--sd-border-strong); color: var(--sd-text-muted); }
.tm-msearch:focus-within { border-color: var(--sd-amber-border); box-shadow: 0 0 0 3px var(--sd-amber-soft); }
.tm-msearch-in { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--sd-text); font-size: 13.5px; font-family: inherit; }
.tm-selcount { font-family: var(--sd-mono); font-size: 11px; font-weight: 700; color: var(--sd-amber); white-space: nowrap; }
.tm-people { display: flex; flex-direction: column; gap: 6px; max-height: 320px; overflow-y: auto; padding: 2px; }
.tm-people-empty { font-size: 12.5px; color: var(--sd-text-dim); text-align: center; padding: 22px; display: inline-flex; align-items: center; gap: 8px; justify-content: center; }
.tm-person { display: flex; flex-direction: column; border-radius: 12px; background: var(--sd-surface); border: 1px solid var(--sd-border); transition: border-color 0.16s var(--sd-spring), background 0.16s; overflow: hidden; }
.tm-person:hover { border-color: var(--sd-amber-border); }
.tm-person.on { background: var(--sd-amber-soft); border-color: var(--sd-amber-border); }
.tm-person-tap { display: flex; align-items: center; gap: 11px; padding: 9px 12px; cursor: pointer; font-family: inherit; text-align: left; background: none; border: 0; width: 100%; }
.tm-ava { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; font-size: 12.5px; font-weight: 800; color: #1a1206; flex-shrink: 0; }
.tm-ava.sm { width: 30px; height: 30px; font-size: 11px; border-radius: 9px; }
.tm-pbody { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.tm-pname { font-size: 13.5px; font-weight: 700; color: var(--sd-text); }
.tm-psub { font-size: 11.5px; color: var(--sd-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tm-badges { display: flex; gap: 5px; flex-shrink: 0; }
.tm-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 700; padding: 3px 7px; border-radius: 999px; }
.tm-badge.mgr { color: var(--sd-amber); background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); }
.tm-badge.agent { color: var(--sd-success); background: var(--sd-success-soft); border: 1px solid color-mix(in srgb, var(--sd-success) 30%, transparent); }
.tm-check { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; flex-shrink: 0; color: transparent; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); transition: all 0.16s; }
.tm-person.on .tm-check { color: #1a1206; background: var(--sd-grad-hero); border-color: transparent; }
[data-theme="light"] .tm-person.on .tm-check { color: #fff8ec; }
.tm-roles { display: flex; align-items: center; gap: 9px; padding: 0 12px 10px 59px; }
.tm-roles-k { font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--sd-text-muted); flex-shrink: 0; }
.tm-roleseg { display: flex; gap: 5px; flex: 1; }
.tm-role-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 6px 5px; border-radius: 8px; cursor: pointer; font-family: inherit; font-size: 11px; font-weight: 650; color: var(--sd-text-muted); background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); transition: all 0.16s var(--sd-spring); }
.tm-role-btn:hover { color: var(--sd-text-secondary); border-color: var(--sd-amber-border); }
.tm-role-btn.on { color: #1a1206; background: var(--sd-grad-hero); border-color: transparent; }
[data-theme="light"] .tm-role-btn.on { color: #fff8ec; }
.tm-note { display: flex; align-items: flex-start; gap: 7px; font-size: 11.5px; color: var(--sd-text-muted); margin: 2px 0 0; line-height: 1.45; }
.tm-note b { color: var(--sd-success); }
.tm-note em { font-style: normal; color: var(--sd-text-secondary); font-weight: 600; }

/* ── business hours ── */
.tm-days { display: flex; gap: 6px; flex-wrap: wrap; }
.tm-day { flex: 1; min-width: 44px; padding: 8px 4px; border-radius: 9px; cursor: pointer; font-family: inherit; font-size: 11.5px; font-weight: 700; color: var(--sd-text-muted); background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.16s var(--sd-spring); }
.tm-day:hover { border-color: var(--sd-amber-border); }
.tm-day.on { color: var(--sd-text); background: var(--sd-amber-soft); border-color: var(--sd-amber-border); }

/* ── lead picker ── */
.tm-leads { display: flex; flex-direction: column; gap: 6px; max-height: 184px; overflow-y: auto; }
.tm-lead { display: flex; align-items: center; gap: 11px; padding: 9px 12px; border-radius: 12px; cursor: pointer; font-family: inherit; text-align: left; background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.16s var(--sd-spring); }
.tm-lead:hover { border-color: var(--sd-amber-border); }
.tm-lead.on { background: var(--sd-amber-soft); border-color: var(--sd-amber-border); box-shadow: 0 0 0 1px var(--sd-amber-border) inset; }
.tm-lead-body { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.tm-lead-body b { font-size: 13px; font-weight: 700; color: var(--sd-text); }
.tm-lead-body i { font-style: normal; font-size: 11px; color: var(--sd-text-muted); }
.tm-lead-x { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: var(--sd-text-dim); background: var(--sd-surface-glass); flex-shrink: 0; }
.tm-crown { color: var(--sd-amber); flex-shrink: 0; }
.tm-review { list-style: none; margin: 6px 0 0; padding: 0; display: flex; flex-direction: column; gap: 1px; border-radius: 12px; overflow: hidden; border: 1px solid var(--sd-border); }
.tm-review li { display: flex; align-items: center; justify-content: space-between; padding: 11px 14px; background: var(--sd-surface); font-size: 13px; }
.tm-review li span { display: inline-flex; align-items: center; gap: 7px; color: var(--sd-text-muted); }
.tm-review li b { color: var(--sd-text); font-weight: 700; }

.tm-err { display: flex; align-items: center; gap: 7px; color: var(--sd-danger); font-size: 12.5px; margin: 0; padding: 9px 12px; border-radius: 9px; background: var(--sd-danger-soft); }

/* ── live preview ── */
.tm-preview { position: sticky; top: 0; display: flex; flex-direction: column; gap: 10px; }
.tm-card { position: relative; overflow: hidden; padding: 18px 18px 15px; border-radius: 18px; background: linear-gradient(165deg, var(--sd-surface-elevated), var(--sd-panel)); border: 1px solid var(--sd-border-strong); box-shadow: var(--sd-card-shadow); }
.tm-card-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--tc); }
.tm-card-grain { position: absolute; inset: 0; opacity: 0.4; pointer-events: none; background-image: radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px); background-size: 3px 3px; }
.tm-card-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
.tm-card-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; color: #1a1206; background: linear-gradient(135deg, var(--tc), color-mix(in srgb, var(--tc) 60%, #000)); }
[data-theme="light"] .tm-card-ic { color: #fff8ec; }
.tm-card-tags { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
.tm-route { display: inline-flex; align-items: center; gap: 4px; font-family: var(--sd-mono); font-size: 9px; font-weight: 800; letter-spacing: 0.1em; padding: 3px 7px; border-radius: 6px; color: var(--sd-text-muted); background: var(--sd-surface); border: 1px solid var(--sd-border-strong); }
.tm-route.auto { color: var(--sd-success); background: var(--sd-success-soft); border-color: color-mix(in srgb, var(--sd-success) 32%, transparent); }
.tm-card-stamp { font-family: var(--sd-mono); font-size: 9px; font-weight: 800; letter-spacing: 0.12em; padding: 3px 8px; border-radius: 6px; color: var(--sd-text-muted); background: var(--sd-surface); border: 1px dashed var(--sd-border-strong); }
.tm-card-stamp.ready { color: var(--sd-success); background: var(--sd-success-soft); border-style: solid; border-color: color-mix(in srgb, var(--sd-success) 32%, transparent); }
.tm-card-name { font-size: 17px; font-weight: 800; color: var(--sd-text); margin: 0; line-height: 1.25; }
.tm-card-name.ph { color: var(--sd-text-dim); font-weight: 500; font-style: italic; }
.tm-card-code { font-family: var(--sd-mono); font-size: 11px; color: var(--sd-amber); margin: 4px 0 0; }
.tm-card-desc { font-size: 12px; color: var(--sd-text-muted); line-height: 1.5; margin: 10px 0 11px; min-height: 3em; }
.tm-card-types { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 11px; }
.tm-tchip { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 999px; color: var(--sd-amber); background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); }
.tm-tchip.more { color: var(--sd-text-secondary); background: var(--sd-surface); border-color: var(--sd-border); font-family: var(--sd-mono); }
.tm-card-lead { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--sd-text-secondary); margin-bottom: 12px; }
.tm-card-lead :deep(svg) { color: var(--sd-amber); }
.tm-card-lead b { color: var(--sd-text); }
.tm-card-roster { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; margin-bottom: 13px; min-height: 30px; }
.tm-rava { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; font-size: 11px; font-weight: 800; color: #1a1206; border: 2px solid var(--sd-surface-elevated); }
.tm-rava.more { color: var(--sd-text-secondary); background: var(--sd-surface); font-family: var(--sd-mono); }
.tm-roster-ph { font-size: 11.5px; color: var(--sd-text-dim); font-style: italic; }
.tm-card-foot { display: flex; gap: 14px; padding-top: 12px; border-top: 1px solid var(--sd-border); }
.tm-card-foot span { font-size: 11px; color: var(--sd-text-muted); }
.tm-card-foot b { font-size: 15px; color: var(--sd-text); font-weight: 800; margin-right: 3px; }
.tm-hint { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--sd-text-dim); margin: 0; line-height: 1.4; }

/* ── footer buttons ── */
.tm-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px; border-radius: 11px; font-size: 13.5px; font-weight: 700; cursor: pointer; font-family: inherit; border: 1px solid transparent; transition: all 0.2s var(--sd-spring); }
.tm-btn.ghost { color: var(--sd-text-secondary); background: var(--sd-surface); border-color: var(--sd-border-strong); }
.tm-btn.ghost:hover { color: var(--sd-text); border-color: var(--sd-amber-border); }
.tm-btn.primary { color: #1a1206; background: var(--sd-grad-hero); box-shadow: 0 8px 22px rgba(251,146,60,0.3); }
[data-theme="light"] .tm-btn.primary { color: #fff8ec; }
.tm-btn.primary:hover:not(:disabled) { transform: translateY(-1px); }
.tm-btn.danger { color: var(--sd-danger); background: var(--sd-surface); border-color: color-mix(in srgb, var(--sd-danger) 40%, transparent); }
.tm-btn.danger:hover { background: var(--sd-danger-soft); }
.tm-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.tm-btn.dangerfill { color: #fff5f5; background: linear-gradient(135deg, var(--sd-danger), #b91c1c); border: none; }
.tm-btn.dangerfill:hover:not(:disabled) { transform: translateY(-1px); }
.tm-spacer { flex: 1; }
.spin { animation: tm-spin 1s linear infinite; }
@keyframes tm-spin { to { transform: rotate(360deg); } }

/* ── inline uniqueness errors ── */
.tm-inp.bad { border-color: color-mix(in srgb, var(--sd-danger) 55%, transparent); }
.tm-inp.bad:focus { box-shadow: 0 0 0 3px var(--sd-danger-soft); border-color: var(--sd-danger); }
.tm-dup { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 650; color: var(--sd-danger); }

/* ── lead affordances ── */
.tm-leadnote { display: flex; align-items: center; gap: 7px; margin: 0; overflow: hidden;
  font-size: 11.5px; font-weight: 650; color: var(--sd-amber); }
.tm-leadnote b { color: var(--sd-text); }
.tm-outlead { display: flex; align-items: center; flex-wrap: wrap; gap: 9px; overflow: hidden;
  padding: 10px 13px; border-radius: 12px; font-size: 12px; color: var(--sd-text-secondary);
  background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); }
.tm-outlead :deep(svg) { color: var(--sd-amber); flex: 0 0 auto; }
.tm-outlead span { flex: 1; min-width: 0; line-height: 1.4; }
.tm-outlead b { color: var(--sd-text); }
.tm-outlead-fix { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 9px;
  cursor: pointer; font-family: inherit; font-size: 11.5px; font-weight: 700; color: #1a1206;
  background: var(--sd-grad-hero); border: none; }
[data-theme="light"] .tm-outlead-fix { color: #fff8ec; }

/* ── member-removal impact directive ── */
.tm-impact { display: flex; flex-direction: column; gap: 10px; overflow: hidden;
  padding: 13px 15px; border-radius: 14px;
  background: color-mix(in srgb, var(--sd-amber) 7%, transparent);
  border: 1px solid var(--sd-amber-border); }
.tm-imp-head { display: flex; align-items: flex-start; gap: 8px; margin: 0;
  font-size: 12.5px; font-weight: 700; color: var(--sd-text); line-height: 1.45; }
.tm-imp-head :deep(svg) { color: var(--sd-amber); flex: 0 0 auto; margin-top: 1px; }
.tm-imp-head b { color: var(--sd-amber); }
.tm-imp-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
.tm-imp-list li { display: flex; align-items: center; gap: 9px; padding: 6px 10px; border-radius: 10px;
  background: var(--sd-surface); border: 1px solid var(--sd-border); }
.tm-imp-name { flex: 1; min-width: 0; font-size: 12.5px; font-weight: 650; color: var(--sd-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tm-imp-n { font-size: 11px; font-weight: 700; color: var(--sd-amber); }
.tm-imp-q { margin: 0; font-size: 12px; font-weight: 650; color: var(--sd-text-secondary); }

/* ── delete ceremony ── */
.tm-delwrap { position: absolute; inset: -12px; z-index: 10; display: grid; place-items: center;
  border-radius: 16px; background: color-mix(in srgb, var(--sd-canvas) 62%, transparent);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
.tm-del { display: flex; flex-direction: column; gap: 12px; width: min(460px, calc(100% - 40px));
  padding: 20px 22px; border-radius: 18px; background: var(--sd-surface-elevated);
  border: 1px solid color-mix(in srgb, var(--sd-danger) 42%, transparent);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.45); }
.tm-del-title { display: flex; align-items: center; gap: 9px; margin: 0;
  font-size: 16px; font-weight: 800; color: var(--sd-text); }
.tm-del-title :deep(svg) { color: var(--sd-danger); }
.tm-del-sub { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--sd-text-secondary); }
.tm-del-sub b { color: var(--sd-danger); }
.tm-del-row { display: flex; justify-content: flex-end; gap: 9px; margin-top: 2px; }

/* ── entrance choreography (CSS-only; per-child pane stagger + ceremonies) ── */
.tm-pane > * { animation: tm-rise 0.42s var(--sd-spring) backwards; }
.tm-pane > *:nth-child(1) { animation-delay: 0.03s; }
.tm-pane > *:nth-child(2) { animation-delay: 0.07s; }
.tm-pane > *:nth-child(3) { animation-delay: 0.11s; }
.tm-pane > *:nth-child(4) { animation-delay: 0.15s; }
.tm-pane > *:nth-child(5) { animation-delay: 0.19s; }
.tm-pane > *:nth-child(6) { animation-delay: 0.23s; }
.tm-pane > *:nth-child(7) { animation-delay: 0.27s; }
.tm-pane > *:nth-child(8) { animation-delay: 0.31s; }
@keyframes tm-rise { from { opacity: 0; transform: translateY(9px); } }
.tm-step.on .tm-node { animation: tm-pop 0.4s var(--sd-spring); }
@keyframes tm-pop { 0% { transform: scale(0.7); } 55% { transform: scale(1.16); } 100% { transform: scale(1); } }
.tm-line.lit { animation: tm-draw 0.45s var(--sd-ease); transform-origin: left; }
@keyframes tm-draw { from { transform: scaleX(0); } }
.tm-card-stamp.ready { animation: tm-stamp 0.5s var(--sd-spring); }
@keyframes tm-stamp { 0% { transform: scale(1.6) rotate(-7deg); opacity: 0; } 60% { transform: scale(0.95) rotate(1deg); opacity: 1; } 100% { transform: scale(1) rotate(0); } }
.tm-rava { animation: tm-pop 0.35s var(--sd-spring) backwards; }
.tm-rava:nth-child(1) { animation-delay: 0.02s; } .tm-rava:nth-child(2) { animation-delay: 0.06s; }
.tm-rava:nth-child(3) { animation-delay: 0.10s; } .tm-rava:nth-child(4) { animation-delay: 0.14s; }
.tm-rava:nth-child(5) { animation-delay: 0.18s; } .tm-rava:nth-child(6) { animation-delay: 0.22s; }
.tm-rava:nth-child(7) { animation-delay: 0.26s; } .tm-rava:nth-child(8) { animation-delay: 0.30s; }

@media (max-width: 760px) {
  .tm-grid { grid-template-columns: 1fr; }
  .tm-preview { order: -1; }
  .tm-formcol { min-height: 0; }
  .tm-typegrid { grid-template-columns: repeat(2, 1fr); }
  .tm-grid3 { grid-template-columns: 1fr 1fr; }
  .tm-card-desc { min-height: 0; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .spin,
  html:not([data-cinematic="on"]) .tm-pane > *,
  html:not([data-cinematic="on"]) .tm-step.on .tm-node,
  html:not([data-cinematic="on"]) .tm-line.lit,
  html:not([data-cinematic="on"]) .tm-card-stamp.ready,
  html:not([data-cinematic="on"]) .tm-rava { animation: none; }
}
</style>
