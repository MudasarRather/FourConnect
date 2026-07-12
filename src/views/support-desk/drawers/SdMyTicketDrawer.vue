<template>
  <Teleport to="body">
    <Presence>
      <Motion
        v-if="ticketId" class="mtd-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }"
        @mousedown.self="$emit('close')"
      >
        <Motion
          class="mtd"
          :initial="{ x: '100%' }" :animate="{ x: 0 }" :exit="{ x: '100%' }"
          :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }"
        >
          <!-- skeleton -->
          <div v-if="loading" class="mtd-skel">
            <span class="sk sk-no" /><span class="sk sk-title" /><span class="sk sk-pills" />
            <span class="sk sk-deck" /><span class="sk sk-row" /><span class="sk sk-row" />
          </div>

          <template v-else-if="ticket">
            <!-- ░░ HEADER ░░ -->
            <header class="mtd-head">
              <div class="mh-grain" aria-hidden="true" />
              <div class="mh-top">
                <span class="mh-no sd-mono"><Hash :size="12" />{{ ticket.ticket_number }}</span>
                <span v-if="ticket.is_major_incident" class="mh-flag major"><Siren :size="11" /> MAJOR</span>
                <span v-if="ticket.is_escalated" class="mh-flag esc"><Flame :size="11" /> L{{ ticket.escalation_level }}</span>
                <span v-if="ticket.reopened_count" class="mh-flag"><RotateCcw :size="11" /> {{ ticket.reopened_count }}×</span>
                <span class="mh-spacer" />
                <span v-if="canWork" class="mh-role"><Shield :size="11" /> Working</span>
                <button class="mh-x" @click="$emit('close')"><X :size="18" /></button>
              </div>
              <h2 class="mh-subject">{{ ticket.subject }}</h2>
              <div class="mh-pills">
                <span class="mh-pill" :style="{ '--pc': priColor(ticket.priority) }"><i />{{ priLabel(ticket.priority) }}</span>
                <span v-if="isWithdrawn" class="mh-pill withdrawn"><Ban :size="11" /> Withdrawn</span>
                <span v-else class="mh-pill" :style="{ '--pc': statusColor(ticket.status) }"><i />{{ statusLabel(ticket.status) }}</span>
                <span v-if="ticket.team_name" class="mh-pill team"><Users :size="11" /> {{ ticket.team_name }}</span>
                <span v-if="ticket.category_name" class="mh-pill soft"><Layers :size="11" /> {{ ticket.category_name }}{{ ticket.subcategory_name ? ' › ' + ticket.subcategory_name : '' }}</span>
                <span v-if="autoCloseAt" class="mh-pill autoclose"><Timer :size="11" /> Auto-close {{ autoCloseLabel }}</span>
              </div>

              <!-- DUAL SLA DECK -->
              <div class="mh-deck">
                <div class="sla-twin">
                  <div class="sla-orb" :style="{ '--p': respRing.p, '--rc': respRing.color }">
                    <span class="orb-in"><b class="sd-mono">{{ respRing.label }}</b><i>response</i></span>
                  </div>
                  <div class="sla-orb" :style="{ '--p': resRing.p, '--rc': resRing.color }">
                    <span class="orb-in"><b class="sd-mono">{{ resRing.label }}</b><i>resolve</i></span>
                  </div>
                </div>
                <div class="mh-meta">
                  <span><Clock :size="12" /> Opened {{ ago(ticket.created_at) }}</span>
                  <span v-if="ticket.assigned_agent_name"><Headset :size="12" /> {{ ticket.assigned_agent_name }}</span>
                  <span v-else class="muted"><Headset :size="12" /> Unassigned</span>
                  <span v-if="ticket.time_spent_minutes"><Timer :size="12" /> {{ fmtMins(ticket.time_spent_minutes) }} logged</span>
                </div>
              </div>

              <!-- collaborators rail -->
              <div v-if="collaborators.length || canWork" class="mh-collab">
                <span class="mc-lbl"><UsersRound :size="12" /> Working on this</span>
                <div class="mc-avas">
                  <span v-if="ticket.assigned_agent_name" class="mc-ava owner" :title="ticket.assigned_agent_name + ' · owner'">{{ initials(ticket.assigned_agent_name) }}</span>
                  <span v-for="c in collaborators" :key="c.id" class="mc-ava" :title="c.name">{{ initials(c.name) }}</span>
                  <button v-if="canWork" class="mc-add" title="Add collaborator" @click="togglePanel('collab')"><Plus :size="13" /></button>
                </div>
              </div>

              <!-- context banner -->
              <Motion v-if="banner" :key="banner.key" class="mh-banner" :class="banner.tone"
                :initial="{ opacity: 0, y: -6 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.3 }">
                <component :is="banner.icon" :size="15" />
                <p>{{ banner.text }}</p>
              </Motion>

              <!-- ACTION BAR -->
              <div class="mh-actions">
                <button v-if="!isTerminal" class="act primary" @click="goReply"><CornerDownLeft :size="14" /> Reply</button>
                <template v-if="canWork">
                  <button v-if="!isTerminal" class="act" :class="{ on: panel === 'assign' }" @click="togglePanel('assign')"><UserCheck :size="14" /> Assign</button>
                  <button class="act" :class="{ on: panel === 'collab' }" @click="togglePanel('collab')"><UsersRound :size="14" /> People</button>
                  <button v-if="!isTerminal" class="act good" @click="resolveOpen = true"><CircleCheck :size="14" /> Resolve</button>
                  <button v-if="!isClosed" class="act" @click="closeOpen = true"><Archive :size="14" /> Close</button>
                </template>
                <template v-else>
                  <button v-if="canEdit" class="act" :class="{ on: tab === 'details' && editing }" @click="startEdit"><PenLine :size="14" /> Edit</button>
                  <button v-if="canWithdraw" class="act danger" @click="withdrawOpen = true"><Ban :size="14" /> Withdraw</button>
                </template>
                <button v-if="ticket.status === 'resolved'" class="act" :class="{ on: panel === 'reopen' }" @click="togglePanel('reopen')"><RotateCcw :size="14" /> Reopen</button>
                <button v-if="canRate" class="act good" @click="goRate"><Star :size="14" /> Rate</button>
              </div>

              <!-- inline: ASSIGN -->
              <Motion v-if="panel === 'assign'" class="mh-panel" :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :transition="{ duration: 0.28 }">
                <span class="mp-lbl">Route to a team member</span>
                <div v-if="assigneesLoading" class="mp-load"><Loader :size="14" class="spin" /> Loading team…</div>
                <div v-else class="mp-people">
                  <button v-for="a in assignees" :key="a.id" class="mp-person" :class="{ on: a.is_current }" @click="doAssign(a)">
                    <span class="mp-ava">{{ initials(a.name) }}</span>
                    <span class="mp-pbody"><b>{{ a.name }}{{ a.id === me.id ? ' (you)' : '' }}</b><i>{{ roleLabel(a.role) }}</i></span>
                    <Shield v-if="a.is_agent" :size="12" class="mp-agent" />
                    <Check v-if="a.is_current" :size="14" class="mp-cur" />
                  </button>
                  <p v-if="!assignees.length" class="mp-empty">No teammates available to route to.</p>
                </div>
              </Motion>

              <!-- inline: COLLABORATORS -->
              <Motion v-if="panel === 'collab'" class="mh-panel" :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :transition="{ duration: 0.28 }">
                <span class="mp-lbl">Collaborators <i>extra people who can see &amp; work this ticket</i></span>
                <div v-if="collaborators.length" class="mp-chips">
                  <span v-for="c in collaborators" :key="c.id" class="mp-chip">
                    <span class="mp-cava">{{ initials(c.name) }}</span>{{ c.name }}
                    <button v-if="canWork" @click="removeCollab(c.id)"><X :size="11" /></button>
                  </span>
                </div>
                <p v-else class="mp-hint">No collaborators yet — add a teammate to work this together.</p>
                <div v-if="canWork" class="mp-search">
                  <Search :size="14" />
                  <input v-model="collabQuery" placeholder="Type 2+ letters to search colleagues…" />
                </div>
                <div v-if="canWork && collabQuery.trim()" class="mp-results">
                  <button v-for="p in collabMatches" :key="p.id" class="mp-person" @click="addCollab(p)">
                    <span class="mp-ava">{{ initials(p.name) }}</span>
                    <span class="mp-pbody"><b>{{ p.name }}</b><i>{{ [p.designation, p.department].filter(Boolean).join(' · ') || p.email }}</i></span>
                    <Plus :size="14" />
                  </button>
                  <p v-if="!collabMatches.length" class="mp-empty">No matches.</p>
                </div>
              </Motion>

              <!-- inline: REOPEN -->
              <Motion v-if="panel === 'reopen'" class="mh-panel" :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :transition="{ duration: 0.28 }">
                <span class="mp-lbl">Reopen — what's still happening?</span>
                <div class="mp-codes">
                  <button v-for="r in REOPEN_REASON_CODES" :key="r.value" type="button" class="mp-code"
                    :class="{ on: reopenCode === r.value }" @click="reopenCode = reopenCode === r.value ? '' : r.value">{{ r.label }}</button>
                </div>
                <textarea v-model="reopenReason" rows="2" class="mtd-input" placeholder="The issue came back because…" />
                <div class="mp-row">
                  <button class="mini ghost" @click="panel = null">Cancel</button>
                  <button class="mini primary" :disabled="reopenReason.trim().length < 2 || busy" @click="doReopen"><RotateCcw :size="13" /> Reopen ticket</button>
                </div>
              </Motion>
            </header>

            <!-- ░░ TABS ░░ -->
            <div class="mtd-tabs">
              <button v-for="t in TABS" :key="t.key" class="mtab" :class="{ on: tab === t.key }" @click="tab = t.key">
                <component :is="t.icon" :size="14" /> {{ t.label }}
                <span v-if="t.key === 'conversation' && msgCount" class="mtab-n">{{ msgCount }}</span>
                <span v-if="t.key === 'activity' && activities.length" class="mtab-n">{{ activities.length }}</span>
              </button>
              <span class="mtab-ink" :style="inkStyle" />
            </div>

            <!-- ░░ BODY ░░ -->
            <div class="mtd-body" ref="bodyRef">
              <Motion :key="tab" :initial="{ opacity: 0, x: 12 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }">

                <!-- ── CONVERSATION ── -->
                <template v-if="tab === 'conversation'">
                  <div class="thread">
                    <div v-if="ticket.description" class="msg requester">
                      <span class="msg-ava">{{ initials(ticket.raised_by_name || 'You') }}</span>
                      <div class="msg-bubble">
                        <div class="msg-head"><strong>{{ isRequester ? 'You' : (ticket.raised_by_name || 'Requester') }}</strong><span>opened this ticket</span><i class="msg-time">{{ ago(ticket.created_at) }}</i></div>
                        <p class="msg-body">{{ ticket.description }}</p>
                        <div v-if="(ticket.attachments || []).length" class="msg-atts">
                          <a v-for="(a, i) in ticket.attachments" :key="i" class="msg-att" :href="attUrl(a)" target="_blank" rel="noopener"><Paperclip :size="11" /> {{ a.name || ('file ' + (i + 1)) }}</a>
                        </div>
                      </div>
                    </div>
                    <div v-for="c in visibleComments" :key="c.id" class="msg" :class="msgClass(c)">
                      <span class="msg-ava" :class="{ staff: c.author_kind === 'staff', sys: c.author_kind === 'system' }">{{ msgAva(c) }}</span>
                      <div class="msg-bubble" :class="{ note: c.is_internal }">
                        <div class="msg-head">
                          <strong>{{ msgWho(c) }}</strong>
                          <span v-if="c.is_internal" class="note-tag"><Lock :size="9" /> internal</span>
                          <i class="msg-time">{{ ago(c.created_at) }}</i>
                        </div>
                        <p class="msg-body">{{ c.body }}</p>
                        <div v-if="(c.attachments || []).length" class="msg-atts">
                          <a v-for="(a, i) in c.attachments" :key="i" class="msg-att" :href="attUrl(a)" target="_blank" rel="noopener"><Paperclip :size="11" /> {{ a.name || ('file ' + (i + 1)) }}</a>
                        </div>
                      </div>
                    </div>
                    <p v-if="!ticket.description && !visibleComments.length" class="thread-empty">No messages yet.</p>
                  </div>

                  <!-- CSAT (requester, terminal) -->
                  <div v-if="canRate" ref="rateRef" class="csat">
                    <p class="csat-q">How was your support experience?</p>
                    <div class="stars">
                      <button v-for="n in 5" :key="n" type="button" :class="{ lit: n <= (rating || hoverStar) }"
                        @click="rating = n" @mouseenter="hoverStar = n" @mouseleave="hoverStar = 0"><Star :size="24" /></button>
                    </div>
                    <textarea v-model="csatComment" rows="2" class="mtd-input" placeholder="Tell us more (optional)…" />
                    <button class="mtd-btn primary" :disabled="busy || !rating" @click="submitRating"><Check :size="14" /> Submit rating</button>
                  </div>
                  <div v-else-if="ticket.csat_score" class="csat-done"><CircleCheck :size="15" /> Rated {{ ticket.csat_score }}/5<span v-if="ticket.csat_comment"> — “{{ ticket.csat_comment }}”</span></div>

                  <!-- composer -->
                  <div v-if="!isTerminal" ref="composerRef" class="composer" :class="{ internal: replyInternal }">
                    <textarea v-model="reply" rows="3" :placeholder="replyInternal ? 'Add an internal note (team-only)…' : 'Write a reply…'" />
                    <div class="composer-foot">
                      <label v-if="canWork" class="cf-chk" :class="{ on: replyInternal }"><input type="checkbox" v-model="replyInternal" hidden /><Lock :size="11" /> Internal note</label>
                      <span v-else class="hint"><Headset :size="12" /> Support is notified instantly</span>
                      <button class="mtd-btn sm primary" :disabled="busy || !reply.trim()" @click="send"><Send :size="13" /> {{ replyInternal ? 'Add note' : 'Reply' }}</button>
                    </div>
                  </div>
                </template>

                <!-- ── DETAILS ── -->
                <template v-else-if="tab === 'details'">
                  <div v-if="!editing" class="dview">
                    <!-- classification -->
                    <section class="d-panel">
                      <header class="d-ph"><h4><Tag :size="13" /> Classification</h4>
                        <button v-if="canEdit" class="d-mini" @click="startEdit"><PenLine :size="11" /> Edit</button></header>
                      <div class="d-grid">
                        <div class="d-cell"><span class="d-k">Type</span><b>{{ typeLabel(ticket.ticket_type) }}</b></div>
                        <div class="d-cell"><span class="d-k">Priority</span><b :style="{ color: priColor(ticket.priority) }">{{ priLabel(ticket.priority) }}</b></div>
                        <div class="d-cell"><span class="d-k">Impact</span><b>{{ cap(ticket.impact) || '—' }}</b></div>
                        <div class="d-cell"><span class="d-k">Urgency</span><b>{{ cap(ticket.urgency) || '—' }}</b></div>
                      </div>
                      <div v-if="ticket.description" class="d-desc-block">
                        <span class="d-k">Description</span>
                        <p class="d-desc">{{ ticket.description }}</p>
                      </div>
                      <div v-if="(ticket.tags || []).length" class="d-tags">
                        <span v-for="tg in ticket.tags" :key="tg" class="d-tag">{{ tg }}</span>
                      </div>
                    </section>

                    <!-- people -->
                    <section class="d-panel">
                      <header class="d-ph"><h4><UsersRound :size="13" /> People</h4>
                        <button v-if="canWork" class="d-mini" @click="togglePanel('collab')"><Plus :size="11" /> Manage</button></header>
                      <div class="d-people">
                        <div class="d-person"><span class="d-pava owner">{{ ticket.assigned_agent_name ? initials(ticket.assigned_agent_name) : '?' }}</span>
                          <div><b>{{ ticket.assigned_agent_name || 'Unassigned' }}</b><i>Owner</i></div></div>
                        <div class="d-person"><span class="d-pava req">{{ initials(ticket.raised_by_name || 'R') }}</span>
                          <div><b>{{ ticket.raised_by_name || 'Requester' }}</b><i>Requester</i></div></div>
                        <div v-for="c in collaborators" :key="c.id" class="d-person"><span class="d-pava">{{ initials(c.name) }}</span>
                          <div><b>{{ c.name }}</b><i>Collaborator</i></div></div>
                      </div>
                    </section>

                    <!-- SLA timings -->
                    <section class="d-panel">
                      <header class="d-ph"><h4><Timer :size="13" /> SLA &amp; timings</h4></header>
                      <div class="d-grid">
                        <div class="d-cell"><span class="d-k">Response due</span><b :class="{ breach: ticket.sla_response_breached }">{{ fmtDate(ticket.response_due_at) }}</b></div>
                        <div class="d-cell"><span class="d-k">First responded</span><b>{{ ticket.first_responded_at ? fmtDate(ticket.first_responded_at) : '—' }}</b></div>
                        <div class="d-cell"><span class="d-k">Resolution due</span><b :class="{ breach: ticket.sla_resolution_breached }">{{ fmtDate(ticket.resolution_due_at) }}</b></div>
                        <div class="d-cell"><span class="d-k">Resolved</span><b>{{ ticket.resolved_at ? fmtDate(ticket.resolved_at) : '—' }}</b></div>
                        <div class="d-cell"><span class="d-k">Opened</span><b>{{ fmtDate(ticket.created_at) }}</b></div>
                        <div class="d-cell"><span class="d-k">Time logged</span><b>{{ fmtMins(ticket.time_spent_minutes) }}</b></div>
                      </div>
                    </section>

                    <!-- resolution -->
                    <section v-if="ticket.resolution_code" class="d-panel resolved">
                      <header class="d-ph"><h4><CircleCheck :size="13" /> Resolution</h4></header>
                      <div class="d-grid">
                        <div class="d-cell"><span class="d-k">Code</span><b>{{ resolutionLabel(ticket.resolution_code) }}</b></div>
                        <div class="d-cell"><span class="d-k">Root cause</span><b>{{ ticket.resolution_category ? rootCauseLabel(ticket.resolution_category) : '—' }}</b></div>
                      </div>
                      <p v-if="ticket.resolution_summary" class="d-desc">{{ ticket.resolution_summary }}</p>
                    </section>

                    <!-- escalation -->
                    <section v-if="ticket.is_escalated" class="d-panel">
                      <header class="d-ph"><h4><Flame :size="13" /> Escalation</h4></header>
                      <div class="d-grid">
                        <div class="d-cell"><span class="d-k">Level</span><b>L{{ ticket.escalation_level }}</b></div>
                        <div class="d-cell"><span class="d-k">Escalated</span><b>{{ ticket.escalated_at ? ago(ticket.escalated_at) : '—' }}</b></div>
                      </div>
                      <p v-if="ticket.escalation_reason" class="d-desc">{{ ticket.escalation_reason }}</p>
                    </section>

                    <!-- vendor -->
                    <section v-if="ticket.vendor_name || ticket.status === 'pending_vendor'" class="d-panel">
                      <header class="d-ph"><h4><Truck :size="13" /> Vendor</h4></header>
                      <div class="d-grid">
                        <div class="d-cell"><span class="d-k">Vendor</span><b>{{ ticket.vendor_name || '—' }}</b></div>
                        <div class="d-cell"><span class="d-k">Status</span><b>{{ ticket.vendor_status || '—' }}</b></div>
                      </div>
                    </section>

                    <!-- attachments -->
                    <section v-if="(ticket.attachments || []).length" class="d-panel">
                      <header class="d-ph"><h4><Paperclip :size="13" /> Attachments</h4></header>
                      <a v-for="(a, i) in ticket.attachments" :key="i" class="d-att" :href="attUrl(a)" target="_blank" rel="noopener">
                        <Paperclip :size="13" /> {{ a.name || a.filename || ('Attachment ' + (i + 1)) }}
                      </a>
                    </section>

                    <p v-if="!canWork && !canEdit" class="d-lock"><Lock :size="12" /> Support has this in hand — classification is managed by the team.</p>
                  </div>

                  <!-- edit mode (requester, open only) -->
                  <div v-else class="dedit">
                    <label class="f"><span class="f-k">Subject</span><input v-model="form.subject" class="mtd-input" maxlength="200" /></label>
                    <label class="f"><span class="f-k">Description</span><textarea v-model="form.description" rows="5" class="mtd-input" /></label>
                    <div class="f2">
                      <div class="f"><span class="f-k">Priority</span><SdSelect v-model="form.priority" :options="priOpts" /></div>
                      <div class="f"><span class="f-k">Category</span><SdSelect v-model="form.category_id" :options="catOpts" placeholder="Uncategorized" /></div>
                    </div>
                    <div class="f"><span class="f-k">Tags</span>
                      <div class="tagbox" :class="{ focus: tagFocus }">
                        <span v-for="(tg, i) in form.tags" :key="tg + i" class="tg">{{ tg }}<button @click="form.tags.splice(i, 1)"><X :size="10" /></button></span>
                        <input v-model="tagInput" class="tg-in" :placeholder="form.tags.length ? '' : 'Add a tag…'" @keydown.enter.prevent="addTag" @keydown.delete="tagBack" @focus="tagFocus = true" @blur="tagFocus = false" />
                      </div>
                    </div>
                    <div class="dedit-foot">
                      <button class="mtd-btn ghost" @click="editing = false">Cancel</button>
                      <button class="mtd-btn primary" :disabled="busy || form.subject.trim().length < 3" @click="saveEdit">
                        <component :is="busy ? LoaderCircle : Check" :size="14" :class="{ spin: busy }" /> Save changes
                      </button>
                    </div>
                  </div>
                </template>

                <!-- ── ACTIVITY ── -->
                <template v-else>
                  <div class="timeline">
                    <div v-for="(a, i) in activities" :key="a.id" class="tl-row" :style="{ '--i': i }">
                      <span class="tl-node" :class="actTone(a.action)"><component :is="actIcon(a.action)" :size="12" /></span>
                      <div class="tl-body">
                        <div class="tl-head"><strong>{{ actLabel(a.action) }}</strong><i>{{ ago(a.created_at) }}</i></div>
                        <p v-if="actDetail(a)" class="tl-detail">{{ actDetail(a) }}</p>
                        <span class="tl-by">{{ a.actor_name || 'System' }}</span>
                      </div>
                    </div>
                    <p v-if="!activities.length" class="thread-empty">No activity recorded yet.</p>
                  </div>
                </template>
              </Motion>
              <p v-if="err" class="mtd-err"><AlertTriangle :size="13" /> {{ err }}</p>
            </div>
          </template>
        </Motion>
      </Motion>
    </Presence>

    <!-- modals -->
    <SdWithdrawModal :open="withdrawOpen" :ticket="ticket" @close="withdrawOpen = false" @done="onModalDone" />
    <SdResolveModal :open="resolveOpen" :ticket="ticket" :agent="caps.isAgent" @close="resolveOpen = false" @done="onModalDone" />
    <SdCloseModal :open="closeOpen" :ticket="ticket" :agent="caps.isAgent" @close="closeOpen = false" @done="onModalDone" />
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  X, Hash, Send, Star, Timer, Clock, Headset, Layers, Tag, Paperclip, Lock,
  PenLine, CornerDownLeft, UserCheck, RotateCcw, Ban, Check, LoaderCircle, CircleCheck,
  AlertTriangle, MessageSquare, Info, History, Sparkles, Plus, ArrowRightLeft, Users, UsersRound,
  Shield, Siren, Flame, Archive, Truck, Search, Loader, CheckCheck,
} from 'lucide-vue-next'
import SdSelect from '../components/SdSelect.vue'
import SdWithdrawModal from '../modals/SdWithdrawModal.vue'
import SdResolveModal from '../modals/SdResolveModal.vue'
import SdCloseModal from '../modals/SdCloseModal.vue'
import {
  getMyTicket, replyMyTicket, rateMyTicket, updateMyTicket, reopenMyTicket,
  managerAssignTicket, listTicketAssignees, addMyCollaborator, removeMyCollaborator,
  listTeamPeople, listMyCategories,
  PRIORITIES, priorityColor, statusColor as stColor, priorityLabel, statusLabel as stLabel,
  typeLabel, resolutionLabel, rootCauseLabel, SUPPORT_AUTOCLOSE_DAYS, REOPEN_REASON_CODES,
} from '@/composables/useSupportDesk'
import { API_BASE } from '@/utils/api'

const props = defineProps({
  ticketId: { type: String, default: null },
  caps: { type: Object, default: () => ({ isManager: false, isAgent: false }) },
  me: { type: Object, default: () => ({ id: null, name: '' }) },
})
const emit = defineEmits(['close', 'changed'])
const toast = useToast()

const ticket = ref(null)
const loading = ref(false)
const busy = ref(false)
const err = ref('')
const tab = ref('conversation')
const now = ref(Date.now())
let tick = null

const reply = ref('')
const replyInternal = ref(false)
const rating = ref(0)
const hoverStar = ref(0)
const csatComment = ref('')
const editing = ref(false)
const form = ref({ subject: '', description: '', priority: 'medium', category_id: '', tags: [] })
const tagInput = ref('')
const tagFocus = ref(false)

const panel = ref(null)                // assign | collab | reopen
const reopenReason = ref('')
const reopenCode = ref('')             // coded verdict on the failed fix (ReopenReason taxonomy)
const withdrawOpen = ref(false)
const resolveOpen = ref(false)
const closeOpen = ref(false)

const assignees = ref([])
const assigneesLoading = ref(false)
const people = ref([])
const collabQuery = ref('')
const cats = ref([])

const bodyRef = ref(null)
const composerRef = ref(null)
const rateRef = ref(null)

const priColor = (v) => priorityColor(v)
const priLabel = (v) => priorityLabel(v)
const statusColor = (v) => stColor(v)
const statusLabel = (v) => stLabel(v)

const canWork = computed(() => !!ticket.value?.viewer_can_work)
const isRequester = computed(() => ticket.value && String(ticket.value.raised_by_user_id) === String(props.me.id))
const isTerminal = computed(() => ['resolved', 'closed'].includes(ticket.value?.status))
const isClosed = computed(() => ticket.value?.status === 'closed')
const isWithdrawn = computed(() => ticket.value?.status === 'closed' && ticket.value?.resolution_code === 'cancelled')
const canEdit = computed(() => isRequester.value && ticket.value?.status === 'open')
const canWithdraw = computed(() => isRequester.value && ticket.value && !isTerminal.value)
const canRate = computed(() => isRequester.value && isTerminal.value && !ticket.value?.csat_score && !isWithdrawn.value)

const collaborators = computed(() => ticket.value?.collaborator_people || [])
const visibleComments = computed(() => {
  const all = ticket.value?.comments || []
  return canWork.value ? all : all.filter(c => !c.is_internal)
})
const activities = computed(() => ticket.value?.activities || [])
const msgCount = computed(() => visibleComments.value.length + (ticket.value?.description ? 1 : 0))

const priOpts = computed(() => PRIORITIES)
const catOpts = computed(() => [{ value: '', label: 'Uncategorized' }, ...cats.value.map(c => ({ value: c.id, label: c.name }))])
const collabMatches = computed(() => {
  const term = collabQuery.value.trim().toLowerCase()
  if (!term) return []
  const taken = new Set([String(ticket.value?.assigned_agent_id), ...collaborators.value.map(c => String(c.id))])
  return people.value
    .filter(p => !taken.has(String(p.id)))
    .filter(p => `${p.name} ${p.email} ${p.designation || ''} ${p.department || ''}`.toLowerCase().includes(term))
    .slice(0, 6)
})

const TABS = [
  { key: 'conversation', label: 'Conversation', icon: MessageSquare },
  { key: 'details', label: 'Details', icon: Info },
  { key: 'activity', label: 'Activity', icon: History },
]
const inkStyle = computed(() => ({ transform: `translateX(${TABS.findIndex(t => t.key === tab.value) * 100}%)` }))

/* ── dual SLA rings ── */
const createdMs = computed(() => (ticket.value?.created_at ? new Date(ticket.value.created_at).getTime() : null))
const ringFor = (dueIso, doneIso, breachedFlag) => {
  if (doneIso) return { p: 1, color: 'var(--sd-success)', label: '✓' }
  if (isTerminal.value) return { p: 1, color: 'var(--sd-success)', label: '✓' }
  const due = dueIso ? new Date(dueIso).getTime() : null
  if (!due) return { p: 0.04, color: 'var(--sd-steel)', label: '∞' }
  const start = createdMs.value || (due - 86400000)
  const p = Math.min(1, Math.max(0, (now.value - start) / (due - start)))
  const breached = breachedFlag || now.value > due
  const color = breached ? 'var(--sd-danger)' : (p > 0.8 ? 'var(--sd-warning)' : priColor(ticket.value?.priority))
  return { p, color, label: (breached ? '-' : '') + fmtDur(Math.abs(due - now.value)) }
}
const respRing = computed(() => ringFor(ticket.value?.response_due_at, ticket.value?.first_responded_at, ticket.value?.sla_response_breached))
const resRing = computed(() => ringFor(ticket.value?.resolution_due_at, ticket.value?.resolved_at, ticket.value?.sla_resolution_breached))

/* ── auto-close countdown (resolved → closed after the reopen window) ── */
const autoCloseAt = computed(() => (ticket.value?.status === 'resolved' && ticket.value?.resolved_at)
  ? new Date(ticket.value.resolved_at).getTime() + SUPPORT_AUTOCLOSE_DAYS * 86400000 : null)
const autoCloseLabel = computed(() => {
  if (!autoCloseAt.value) return ''
  const diff = autoCloseAt.value - now.value
  if (diff <= 0) return 'momentarily'
  const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000), m = Math.floor((diff % 3600000) / 60000)
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`
})

/* ── context banner ── */
const banner = computed(() => {
  const x = ticket.value; if (!x) return null
  if (isWithdrawn.value) return { key: 'wd', tone: 'neutral', icon: Ban, text: 'Withdrawn — kept in history. Support can reopen it.' }
  if (x.status === 'resolved') return { key: 'rs', tone: 'good', icon: CircleCheck, text: `Resolved${x.resolution_code ? ' (' + resolutionLabel(x.resolution_code) + ')' : ''} — auto-closes in ${autoCloseLabel.value} unless reopened.` }
  if (x.status === 'closed') return { key: 'cl', tone: 'neutral', icon: Lock, text: 'This ticket is closed.' }
  if (x.sla_resolution_breached) return { key: 'br', tone: 'danger', icon: AlertTriangle, text: 'SLA target passed — resolution is overdue.' }
  if (x.status === 'pending_customer') return { key: 'pc', tone: 'warn', icon: Info, text: 'Waiting on the requester’s reply to continue.' }
  if (x.is_major_incident) return { key: 'mi', tone: 'danger', icon: Siren, text: `Major incident${x.business_impact ? ' · ' + x.business_impact + ' impact' : ''}.` }
  return null
})

/* ── helpers ── */
const initials = (n) => ((n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?')
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')
const roleLabel = (r) => ({ lead: 'Team lead', agent: 'Agent', collaborator: 'Collaborator', report: 'Direct report', me: 'You' }[r] || 'Member')
const ago = (iso) => {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
const fmtDur = (ms) => {
  const m = Math.floor(ms / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}
const fmtMins = (m) => { if (!m) return '—'; const h = Math.floor(m / 60); const r = m % 60; return h ? `${h}h ${r}m` : `${r}m` }
const fmtDate = (iso) => { if (!iso) return '—'; try { return new Date(iso).toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return iso } }
const attUrl = (a) => { const u = a.url || a.file_url || a.path || ''; return u.startsWith('http') ? u : `${API_BASE}${u}` }

const msgClass = (c) => (c.author_kind === 'staff' ? 'staff' : c.author_kind === 'system' ? 'system' : 'requester')
const msgAva = (c) => (c.author_kind === 'staff' ? 'S' : c.author_kind === 'system' ? '⚙' : initials(c.author_name || 'You'))
const msgWho = (c) => (c.author_name || (c.author_kind === 'staff' ? 'Support' : c.author_kind === 'system' ? 'System' : 'Requester'))

const ACT = {
  created: { label: 'Ticket created', icon: Plus, tone: 'open' },
  replied: { label: 'Reply added', icon: MessageSquare, tone: 'info' },
  internal_note: { label: 'Internal note', icon: Lock, tone: 'info' },
  status_changed: { label: 'Status changed', icon: ArrowRightLeft, tone: 'info' },
  assigned: { label: 'Assigned', icon: UserCheck, tone: 'info' },
  routed: { label: 'Routed', icon: ArrowRightLeft, tone: 'info' },
  escalated: { label: 'Escalated', icon: Flame, tone: 'danger' },
  resolved: { label: 'Resolved', icon: CircleCheck, tone: 'good' },
  reopened: { label: 'Reopened', icon: RotateCcw, tone: 'warn' },
  withdrawn: { label: 'Withdrawn', icon: Ban, tone: 'neutral' },
  collaborator_added: { label: 'Collaborator added', icon: UsersRound, tone: 'info' },
  collaborator_removed: { label: 'Collaborator removed', icon: UsersRound, tone: 'neutral' },
  updated: { label: 'Updated', icon: PenLine, tone: 'info' },
}
const actIcon = (a) => ACT[a]?.icon || Sparkles
const actLabel = (a) => ACT[a]?.label || String(a).replace(/_/g, ' ')
const actTone = (a) => ACT[a]?.tone || 'info'
const actDetail = (a) => {
  const d = a.detail || {}
  if (a.action === 'status_changed' && d.to) return `${(d.from || '').replace('_', ' ')} → ${(d.to || '').replace('_', ' ')}`
  if (a.action === 'resolved' && d.code) return `${resolutionLabel(d.code)}${d.closed ? ' · closed' : ''}`
  if ((a.action === 'withdrawn' || a.action === 'reopened') && d.reason) return d.reason
  if (a.action === 'replied' && d.preview) return d.preview
  if (a.action === 'collaborator_added' && d.name) return d.name
  if (a.action === 'routed' && d.team) return `to ${d.team}`
  return ''
}

/* ── load ── */
const load = async (id) => {
  loading.value = true; err.value = ''
  try {
    ticket.value = await getMyTicket(id)
    tab.value = 'conversation'; editing.value = false; panel.value = null
    rating.value = 0; csatComment.value = ''; reply.value = ''; replyInternal.value = false
  } catch (e) { err.value = e?.response?.data?.detail || 'Failed to load ticket.'; ticket.value = null }
  finally { loading.value = false }
}
watch(() => props.ticketId, (id) => {
  if (id) {
    load(id)
    if (!tick) tick = setInterval(() => { now.value = Date.now() }, 1000)
    if (!cats.value.length) listMyCategories().then(r => { cats.value = r || [] }).catch(() => {})
  } else { ticket.value = null }
})
onBeforeUnmount(() => { if (tick) clearInterval(tick) })

const refresh = async () => { if (props.ticketId) { await load(props.ticketId); emit('changed') } }

/* ── panels ── */
const togglePanel = (p) => {
  panel.value = panel.value === p ? null : p
  if (panel.value === 'assign') loadAssignees()
}
const loadAssignees = async () => {
  assigneesLoading.value = true
  try { assignees.value = await listTicketAssignees(props.ticketId) } catch { assignees.value = [] } finally { assigneesLoading.value = false }
}
/* Server-driven typeahead — the backend search-gates /teams/people for agents
   (a 2+ char query, small page); bulk directory dumps are superuser-only now. */
let peopleTimer = null
watch(collabQuery, (v) => {
  clearTimeout(peopleTimer)
  const term = (v || '').trim()
  if (term.length < 2) { people.value = []; return }
  peopleTimer = setTimeout(() => {
    listTeamPeople({ q: term, limit: 8 })
      .then(r => { people.value = r || [] })
      .catch(() => { people.value = [] })
  }, 220)
})

/* ── actions ── */
const goReply = () => { tab.value = 'conversation'; nextTick(() => composerRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })) }
const goRate = () => { tab.value = 'conversation'; nextTick(() => rateRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })) }
const startEdit = () => { tab.value = 'details'; editing.value = true; panel.value = null; form.value = { subject: ticket.value.subject || '', description: ticket.value.description || '', priority: ticket.value.priority || 'medium', category_id: ticket.value.category_id || '', tags: [...(ticket.value.tags || [])] } }
const addTag = () => { const v = tagInput.value.trim(); if (v && !form.value.tags.includes(v) && form.value.tags.length < 8) form.value.tags.push(v); tagInput.value = '' }
const tagBack = () => { if (!tagInput.value && form.value.tags.length) form.value.tags.pop() }

const send = async () => {
  if (!reply.value.trim()) return
  busy.value = true; err.value = ''
  try { await replyMyTicket(props.ticketId, { body: reply.value.trim(), is_internal: replyInternal.value }); reply.value = ''; await refresh(); toast.success(replyInternal.value ? 'Note added' : 'Reply sent') }
  catch (e) { err.value = e?.response?.data?.detail || 'Reply failed.' } finally { busy.value = false }
}
const submitRating = async () => {
  busy.value = true; err.value = ''
  try { await rateMyTicket(props.ticketId, { csat_score: rating.value, csat_comment: csatComment.value || null }); await refresh(); toast.success('Thanks for the feedback!') }
  catch (e) { err.value = e?.response?.data?.detail || 'Rating failed.' } finally { busy.value = false }
}
const saveEdit = async () => {
  busy.value = true; err.value = ''
  try {
    await updateMyTicket(props.ticketId, {
      subject: form.value.subject.trim(), description: form.value.description || null,
      priority: form.value.priority, category_id: form.value.category_id || null, tags: form.value.tags,
    })
    editing.value = false; await refresh(); toast.success('Ticket updated')
  } catch (e) { err.value = e?.response?.data?.detail || 'Update failed.' } finally { busy.value = false }
}
const doAssign = async (a) => {
  if (a.is_current) return
  busy.value = true; err.value = ''
  try { await managerAssignTicket(props.ticketId, { assigned_agent_id: a.id }); panel.value = null; await refresh(); toast.success(`Routed to ${a.name}`) }
  catch (e) { err.value = e?.response?.data?.detail || 'Assign failed.'; toast.error(err.value) } finally { busy.value = false }
}
const addCollab = async (p) => {
  busy.value = true; err.value = ''
  try { await addMyCollaborator(props.ticketId, { user_id: p.id }); collabQuery.value = ''; await refresh(); toast.success(`${p.name} added`) }
  catch (e) { err.value = e?.response?.data?.detail || 'Could not add collaborator.'; toast.error(err.value) } finally { busy.value = false }
}
const removeCollab = async (id) => {
  busy.value = true; err.value = ''
  try { await removeMyCollaborator(props.ticketId, id); await refresh(); toast.success('Collaborator removed') }
  catch (e) { err.value = e?.response?.data?.detail || 'Could not remove collaborator.' } finally { busy.value = false }
}
const doReopen = async () => {
  busy.value = true; err.value = ''
  try {
    await reopenMyTicket(props.ticketId, { reason: reopenReason.value.trim(), reason_code: reopenCode.value || null })
    panel.value = null; reopenReason.value = ''; reopenCode.value = ''
    await refresh(); toast.success('Ticket reopened')
  }
  catch (e) { err.value = e?.response?.data?.detail || 'Reopen failed.' } finally { busy.value = false }
}
const onModalDone = async () => { withdrawOpen.value = false; resolveOpen.value = false; closeOpen.value = false; await refresh() }
</script>

<style scoped>
.mtd-overlay { position: fixed; inset: 0; z-index: 2100; display: flex; justify-content: flex-end; background: rgba(4,5,6,0.58); backdrop-filter: blur(7px); }
[data-theme="light"] .mtd-overlay { background: rgba(40,25,10,0.32); }
.mtd { width: min(600px, 100vw); height: 100%; display: flex; flex-direction: column; background: var(--sd-surface-elevated); border-left: 1px solid var(--sd-border-strong); box-shadow: -24px 0 70px rgba(0,0,0,0.55); overflow: hidden; }

/* skeleton */
.mtd-skel { padding: 26px; display: flex; flex-direction: column; gap: 14px; }
.sk { display: block; border-radius: 8px; background: linear-gradient(90deg, var(--sd-surface), var(--sd-surface-glass), var(--sd-surface)); background-size: 200% 100%; animation: mtd-sh 1.3s linear infinite; }
.sk-no { width: 110px; height: 14px; } .sk-title { width: 80%; height: 24px; } .sk-pills { width: 65%; height: 22px; } .sk-deck { width: 100%; height: 70px; } .sk-row { width: 100%; height: 54px; }
@keyframes mtd-sh { to { background-position: -200% 0; } }

/* header */
.mtd-head { position: relative; padding: 20px 22px 14px; border-bottom: 1px solid var(--sd-border); background: var(--sd-grad-card), var(--sd-surface-elevated); overflow: hidden; flex-shrink: 0; }
.mh-grain { position: absolute; inset: 0; opacity: 0.4; pointer-events: none; background-image: radial-gradient(rgba(251,191,36,0.06) 1px, transparent 1px); background-size: 20px 20px; -webkit-mask-image: linear-gradient(180deg, rgba(0,0,0,0.6), transparent); mask-image: linear-gradient(180deg, rgba(0,0,0,0.6), transparent); }
.mh-top { position: relative; display: flex; align-items: center; gap: 7px; margin-bottom: 9px; }
.mh-no { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; color: var(--sd-amber); }
.mh-flag { display: inline-flex; align-items: center; gap: 3px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.04em; padding: 2px 7px; border-radius: 6px; color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.mh-flag.major, .mh-flag.esc { color: var(--sd-danger); background: var(--sd-danger-soft); border-color: color-mix(in srgb, var(--sd-danger) 30%, transparent); }
.mh-spacer { flex: 1; }
.mh-role { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.06em; padding: 3px 8px; border-radius: 999px; color: var(--sd-success); background: var(--sd-success-soft); border: 1px solid color-mix(in srgb, var(--sd-success) 30%, transparent); }
.mh-x { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 9px; cursor: pointer; background: transparent; border: 1px solid var(--sd-border); color: var(--sd-text-muted); transition: all 0.18s; }
.mh-x:hover { color: var(--sd-text); border-color: var(--sd-border-strong); }
.mh-subject { position: relative; font-size: 18px; font-weight: 800; color: var(--sd-text); margin: 0 0 10px; line-height: 1.28; }
.mh-pills { position: relative; display: flex; flex-wrap: wrap; gap: 6px; }
.mh-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; color: var(--pc, var(--sd-text-secondary)); background: color-mix(in srgb, var(--pc, var(--sd-steel)) 13%, transparent); border: 1px solid color-mix(in srgb, var(--pc, var(--sd-steel)) 32%, transparent); }
.mh-pill i { width: 6px; height: 6px; border-radius: 50%; background: var(--pc); }
.mh-pill.withdrawn { color: var(--sd-steel); background: var(--sd-steel-soft); border-color: color-mix(in srgb, var(--sd-steel) 32%, transparent); }
.mh-pill.team { color: var(--sd-text-secondary); background: var(--sd-surface); border-color: var(--sd-border-strong); }
.mh-pill.soft { color: var(--sd-text-muted); background: var(--sd-surface); border-color: var(--sd-border); }
.mh-pill.autoclose { color: var(--sd-success); background: var(--sd-success-soft); border-color: color-mix(in srgb, var(--sd-success) 30%, transparent); }

.mh-deck { position: relative; display: flex; align-items: center; gap: 16px; margin-top: 15px; }
.sla-twin { display: flex; gap: 10px; flex-shrink: 0; }
.sla-orb { position: relative; width: 58px; height: 58px; border-radius: 50%; display: grid; place-items: center; background: conic-gradient(var(--rc) calc(var(--p, 0) * 360deg), var(--sd-border-strong) 0); transition: background 0.6s linear; }
.sla-orb::after { content: ''; position: absolute; inset: 4px; border-radius: 50%; background: var(--sd-surface-elevated); }
.orb-in { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; line-height: 1; }
.orb-in b { font-size: 13px; font-weight: 800; color: var(--sd-text); }
.orb-in i { font-size: 7.5px; font-style: normal; color: var(--sd-text-dim); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.05em; }
.mh-meta { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.mh-meta span { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--sd-text-secondary); }
.mh-meta span.muted { color: var(--sd-text-dim); }

.mh-collab { position: relative; display: flex; align-items: center; gap: 10px; margin-top: 13px; padding-top: 12px; border-top: 1px dashed var(--sd-border); }
.mc-lbl { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 600; color: var(--sd-text-muted); white-space: nowrap; }
.mc-avas { display: flex; align-items: center; }
.mc-ava { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px; font-size: 10px; font-weight: 800; color: var(--sd-text); background: var(--sd-surface); border: 1.5px solid var(--sd-surface-elevated); box-shadow: 0 0 0 1px var(--sd-border-strong); margin-left: -7px; }
.mc-ava:first-child { margin-left: 0; }
.mc-ava.owner { color: #1a1206; background: var(--sd-grad-hero); box-shadow: none; }
[data-theme="light"] .mc-ava.owner { color: #fff8ec; }
.mc-add { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px; margin-left: 4px; cursor: pointer; color: var(--sd-amber); background: var(--sd-amber-soft); border: 1px dashed var(--sd-amber-border); }
.mc-add:hover { background: var(--sd-amber); color: #1a1206; }

.mh-banner { position: relative; display: flex; align-items: flex-start; gap: 9px; margin-top: 13px; padding: 10px 13px; border-radius: 11px; font-size: 12.5px; line-height: 1.4; }
.mh-banner p { margin: 0; }
.mh-banner.good { color: var(--sd-success); background: var(--sd-success-soft); border: 1px solid color-mix(in srgb, var(--sd-success) 26%, transparent); }
.mh-banner.warn { color: var(--sd-warning); background: var(--sd-warning-soft); border: 1px solid color-mix(in srgb, var(--sd-warning) 28%, transparent); }
.mh-banner.danger { color: var(--sd-danger); background: var(--sd-danger-soft); border: 1px solid color-mix(in srgb, var(--sd-danger) 28%, transparent); }
.mh-banner.neutral { color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border-strong); }

.mh-actions { position: relative; display: flex; flex-wrap: wrap; gap: 7px; margin-top: 15px; }
.act { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 10px; font-size: 12.5px; font-weight: 650; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border-strong); transition: all 0.18s var(--sd-spring); }
.act:hover, .act.on { color: var(--sd-text); border-color: var(--sd-amber-border); background: var(--sd-amber-soft); }
.act.primary { color: #1a1206; background: var(--sd-grad-hero); border-color: transparent; }
[data-theme="light"] .act.primary { color: #fff8ec; }
.act.primary:hover { filter: brightness(1.05); }
.act.danger:hover { color: var(--sd-danger); border-color: color-mix(in srgb, var(--sd-danger) 40%, transparent); background: var(--sd-danger-soft); }
.act.good:hover, .act.good.on { color: var(--sd-success); border-color: color-mix(in srgb, var(--sd-success) 40%, transparent); background: var(--sd-success-soft); }

.mh-panel { position: relative; overflow: hidden; margin-top: 11px; padding: 12px; border-radius: 12px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); display: flex; flex-direction: column; gap: 9px; }
.mp-lbl { font-size: 12px; font-weight: 650; color: var(--sd-text-secondary); }
.mp-lbl i { font-style: normal; font-weight: 500; font-size: 11px; color: var(--sd-text-dim); margin-left: 4px; }
/* reopen verdict chips (ReopenReason taxonomy) */
.mp-codes { display: flex; flex-wrap: wrap; gap: 6px; }
.mp-code { padding: 5px 10px; border-radius: 999px; font-size: 11px; font-weight: 650; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: transparent; color: var(--sd-text-muted);
  transition: border-color 0.18s, color 0.18s, background 0.18s; }
.mp-code:hover { border-color: var(--sd-rop-core, var(--sd-warning)); color: var(--sd-text); }
.mp-code.on { border-color: var(--sd-rop-core, var(--sd-warning)); color: var(--sd-rop-core, var(--sd-warning)); background: var(--sd-rop-soft, var(--sd-warning-soft)); }
.mp-load { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--sd-text-muted); }
.mp-people { display: flex; flex-direction: column; gap: 5px; max-height: 230px; overflow-y: auto; }
.mp-person { display: flex; align-items: center; gap: 10px; padding: 8px 11px; border-radius: 10px; cursor: pointer; font-family: inherit; text-align: left; background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.16s; }
.mp-person:hover { border-color: var(--sd-amber-border); background: var(--sd-amber-soft); }
.mp-person.on { border-color: var(--sd-success); background: var(--sd-success-soft); }
.mp-ava { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; font-size: 11px; font-weight: 800; color: #1a1206; background: var(--sd-grad-hero); flex-shrink: 0; }
[data-theme="light"] .mp-ava { color: #fff8ec; }
.mp-pbody { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.mp-pbody b { font-size: 13px; font-weight: 700; color: var(--sd-text); }
.mp-pbody i { font-style: normal; font-size: 11px; color: var(--sd-text-muted); }
.mp-agent { color: var(--sd-success); flex-shrink: 0; }
.mp-cur { color: var(--sd-success); flex-shrink: 0; }
.mp-empty, .mp-hint { font-size: 12px; color: var(--sd-text-dim); margin: 2px 0; }
.mp-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.mp-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px 4px 4px; border-radius: 999px; font-size: 12px; font-weight: 600; color: var(--sd-text); background: var(--sd-surface); border: 1px solid var(--sd-border-strong); }
.mp-cava { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; font-size: 9px; font-weight: 800; color: #1a1206; background: var(--sd-grad-hero); }
[data-theme="light"] .mp-cava { color: #fff8ec; }
.mp-chip button { display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%; border: none; cursor: pointer; color: var(--sd-text-muted); background: var(--sd-border-strong); }
.mp-chip button:hover { color: var(--sd-danger); }
.mp-search { display: flex; align-items: center; gap: 8px; padding: 8px 11px; border-radius: 10px; background: var(--sd-surface); border: 1px solid var(--sd-border-strong); color: var(--sd-text-muted); }
.mp-search input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--sd-text); font-size: 13px; font-family: inherit; }
.mp-results { display: flex; flex-direction: column; gap: 5px; max-height: 200px; overflow-y: auto; }
.mp-row { display: flex; justify-content: flex-end; gap: 8px; }
.mini { display: inline-flex; align-items: center; gap: 5px; padding: 7px 13px; border-radius: 9px; font-size: 12px; font-weight: 650; cursor: pointer; font-family: inherit; border: 1px solid transparent; }
.mini.ghost { color: var(--sd-text-muted); background: var(--sd-surface); border-color: var(--sd-border-strong); }
.mini.primary { color: #1a1206; background: var(--sd-grad-hero); }
[data-theme="light"] .mini.primary { color: #fff8ec; }
.mini:disabled { opacity: 0.5; cursor: not-allowed; }

/* tabs */
.mtd-tabs { position: relative; display: flex; padding: 0 22px; border-bottom: 1px solid var(--sd-border); background: var(--sd-surface-elevated); flex-shrink: 0; }
.mtab { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 13px 8px; background: none; border: none; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 650; color: var(--sd-text-muted); }
.mtab.on { color: var(--sd-amber); }
.mtab-n { display: inline-grid; place-items: center; min-width: 17px; height: 17px; padding: 0 4px; border-radius: 999px; font-size: 10px; font-weight: 800; color: var(--sd-text-secondary); background: var(--sd-surface); }
.mtab-ink { position: absolute; bottom: -1px; left: 22px; width: calc((100% - 44px) / 3); height: 2.5px; background: var(--sd-grad-rail); border-radius: 2px; transition: transform 0.34s var(--sd-spring); }

/* body */
.mtd-body { flex: 1; overflow-y: auto; padding: 18px 22px 26px; }
.thread { display: flex; flex-direction: column; gap: 13px; }
.thread-empty { font-size: 13px; color: var(--sd-text-dim); text-align: center; padding: 24px 0; }
.msg { display: flex; gap: 10px; }
.msg.staff { flex-direction: row-reverse; }
.msg-ava { flex-shrink: 0; width: 32px; height: 32px; border-radius: 10px; display: grid; place-items: center; font-size: 12px; font-weight: 800; color: #1a1206; background: var(--sd-grad-hero); }
.msg-ava.staff { background: var(--sd-surface); color: var(--sd-amber); border: 1px solid var(--sd-amber-border); }
.msg-ava.sys { background: var(--sd-surface); color: var(--sd-text-muted); border: 1px solid var(--sd-border-strong); }
[data-theme="light"] .msg-ava { color: #fff8ec; }
[data-theme="light"] .msg-ava.staff { color: var(--sd-amber); }
.msg-bubble { flex: 1; min-width: 0; padding: 11px 13px; border-radius: 13px; background: var(--sd-surface); border: 1px solid var(--sd-border); }
.msg.staff .msg-bubble { background: var(--sd-amber-soft); border-color: var(--sd-amber-border); }
.msg-bubble.note { background: var(--sd-st-hold-soft); border-color: color-mix(in srgb, var(--sd-st-hold) 30%, transparent); border-style: dashed; }
.msg-head { display: flex; align-items: center; gap: 7px; margin-bottom: 5px; font-size: 12px; color: var(--sd-text-muted); }
.msg-head strong { color: var(--sd-text); font-weight: 700; }
.note-tag { display: inline-flex; align-items: center; gap: 3px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--sd-st-hold); }
.msg-time { margin-left: auto; font-style: normal; font-size: 10.5px; color: var(--sd-text-dim); }
.msg-body { margin: 0; font-size: 13.5px; line-height: 1.5; color: var(--sd-text); white-space: pre-wrap; }
.msg-atts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.msg-att { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--sd-amber); text-decoration: none; padding: 3px 8px; border-radius: 7px; background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); }

.csat { margin-top: 16px; padding: 16px; border-radius: 14px; background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); display: flex; flex-direction: column; gap: 11px; }
.csat-q { margin: 0; font-size: 14px; font-weight: 700; color: var(--sd-text); }
.stars { display: flex; gap: 5px; }
.stars button { background: none; border: none; cursor: pointer; color: var(--sd-text-dim); padding: 1px; transition: transform 0.15s, color 0.15s; }
.stars button.lit { color: var(--sd-amber); }
.stars button:hover { transform: scale(1.18); }
.csat-done { margin-top: 16px; display: inline-flex; align-items: center; gap: 8px; justify-content: center; padding: 12px; border-radius: 12px; background: var(--sd-success-soft); color: var(--sd-success); font-size: 13px; font-weight: 650; }

.composer { margin-top: 16px; border: 1px solid var(--sd-border-strong); border-radius: 14px; overflow: hidden; background: var(--sd-surface-glass); transition: border-color 0.2s; }
.composer.internal { border-color: color-mix(in srgb, var(--sd-st-hold) 40%, transparent); background: var(--sd-st-hold-soft); }
.composer textarea { width: 100%; padding: 13px; background: none; border: none; outline: none; color: var(--sd-text); font-size: 13.5px; font-family: inherit; resize: vertical; }
.composer-foot { display: flex; align-items: center; justify-content: space-between; padding: 9px 12px; border-top: 1px solid var(--sd-border); }
.hint { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--sd-text-dim); }
.cf-chk { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 600; color: var(--sd-text-muted); cursor: pointer; }
.cf-chk.on { color: var(--sd-st-hold); }

.mtd-input { width: 100%; padding: 11px 13px; border-radius: 11px; font-size: 13.5px; font-family: inherit; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text); resize: vertical; }
.mtd-input:focus { outline: none; border-color: var(--sd-amber-border); box-shadow: 0 0 0 3px var(--sd-amber-soft); }
.mtd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; border: 1px solid transparent; }
.mtd-btn.sm { padding: 8px 13px; font-size: 12.5px; }
.mtd-btn.primary { color: #1a1206; background: var(--sd-grad-hero); }
[data-theme="light"] .mtd-btn.primary { color: #fff8ec; }
.mtd-btn.ghost { color: var(--sd-text-secondary); background: var(--sd-surface); border-color: var(--sd-border-strong); }
.mtd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.mtd-btn .spin { animation: mtd-spin 1s linear infinite; }
@keyframes mtd-spin { to { transform: rotate(360deg); } }

/* details */
.dview { display: flex; flex-direction: column; gap: 13px; }
.d-panel { border: 1px solid var(--sd-border); border-radius: 14px; padding: 13px 15px; background: var(--sd-surface); }
.d-panel.resolved { border-color: color-mix(in srgb, var(--sd-success) 30%, transparent); background: var(--sd-success-soft); }
.d-ph { display: flex; align-items: center; justify-content: space-between; margin-bottom: 11px; }
.d-ph h4 { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 800; color: var(--sd-text); margin: 0; }
.d-ph h4 :deep(svg) { color: var(--sd-amber); }
.d-mini { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer; border: 1px solid var(--sd-border-strong); background: var(--sd-surface-glass); color: var(--sd-text-secondary); }
.d-mini:hover { border-color: var(--sd-amber-border); color: var(--sd-text); }
.d-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 11px 16px; }
.d-cell { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.d-k { font-size: 10.5px; color: var(--sd-text-dim); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }
.d-cell b { font-size: 13px; font-weight: 700; color: var(--sd-text); overflow-wrap: anywhere; }
.d-cell b.breach { color: var(--sd-danger); }
.d-desc-block { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
.d-desc { margin: 8px 0 0; font-size: 13px; line-height: 1.55; color: var(--sd-text-secondary); white-space: pre-wrap; }
.d-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 11px; }
.d-tag { font-size: 11.5px; font-weight: 600; color: var(--sd-amber); padding: 3px 10px; border-radius: 999px; background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); }
.d-people { display: flex; flex-direction: column; gap: 9px; }
.d-person { display: flex; align-items: center; gap: 10px; }
.d-pava { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; font-size: 11px; font-weight: 800; color: var(--sd-text); background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); flex-shrink: 0; }
.d-pava.owner { color: #1a1206; background: var(--sd-grad-hero); border: none; }
[data-theme="light"] .d-pava.owner { color: #fff8ec; }
.d-pava.req { color: var(--sd-amber); background: var(--sd-amber-soft); border-color: var(--sd-amber-border); }
.d-person div { display: flex; flex-direction: column; min-width: 0; }
.d-person b { font-size: 13px; font-weight: 700; color: var(--sd-text); }
.d-person i { font-style: normal; font-size: 11px; color: var(--sd-text-muted); }
.d-att { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--sd-text-secondary); padding: 8px 11px; border-radius: 9px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); text-decoration: none; width: fit-content; margin-top: 6px; }
.d-att:hover { border-color: var(--sd-amber-border); color: var(--sd-text); }
.d-lock { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--sd-text-dim); }

.dedit { display: flex; flex-direction: column; gap: 13px; }
.f { display: flex; flex-direction: column; gap: 6px; }
.f-k { font-size: 12px; font-weight: 600; color: var(--sd-text-secondary); }
.f2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.tagbox { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 8px 10px; border-radius: 11px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); }
.tagbox.focus { border-color: var(--sd-amber-border); box-shadow: 0 0 0 3px var(--sd-amber-soft); }
.tg { display: inline-flex; align-items: center; gap: 4px; padding: 3px 4px 3px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; color: var(--sd-amber); background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); }
.tg button { display: grid; place-items: center; width: 15px; height: 15px; border-radius: 50%; border: none; cursor: pointer; color: var(--sd-amber); background: color-mix(in srgb, var(--sd-amber) 18%, transparent); }
.tg-in { flex: 1; min-width: 80px; background: none; border: none; outline: none; color: var(--sd-text); font-size: 13px; font-family: inherit; padding: 4px 2px; }
.dedit-foot { display: flex; justify-content: flex-end; gap: 9px; margin-top: 4px; }

/* timeline */
.timeline { position: relative; display: flex; flex-direction: column; gap: 4px; padding-left: 6px; }
.tl-row { position: relative; display: flex; gap: 13px; padding: 4px 0 14px; }
.tl-row::before { content: ''; position: absolute; left: 12px; top: 26px; bottom: -4px; width: 2px; background: var(--sd-border); }
.tl-row:last-child::before { display: none; }
.tl-node { position: relative; z-index: 1; flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border-strong); }
.tl-node.good { color: var(--sd-success); border-color: color-mix(in srgb, var(--sd-success) 40%, transparent); }
.tl-node.danger { color: var(--sd-danger); border-color: color-mix(in srgb, var(--sd-danger) 40%, transparent); }
.tl-node.warn { color: var(--sd-warning); border-color: color-mix(in srgb, var(--sd-warning) 40%, transparent); }
.tl-node.open { color: var(--sd-amber); border-color: var(--sd-amber-border); }
.tl-body { flex: 1; min-width: 0; }
.tl-head { display: flex; align-items: center; gap: 8px; }
.tl-head strong { font-size: 13px; font-weight: 700; color: var(--sd-text); }
.tl-head i { font-style: normal; font-size: 11px; color: var(--sd-text-dim); margin-left: auto; }
.tl-detail { margin: 3px 0 0; font-size: 12px; color: var(--sd-text-secondary); }
.tl-by { font-size: 11px; color: var(--sd-text-dim); }

.mtd-err { display: flex; align-items: center; gap: 7px; margin: 14px 0 0; padding: 9px 12px; border-radius: 9px; font-size: 12.5px; color: var(--sd-danger); background: var(--sd-danger-soft); }
.spin { animation: mtd-spin 1s linear infinite; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .sk,
  html:not([data-cinematic="on"]) .spin,
  html:not([data-cinematic="on"]) .mtd-btn .spin { animation: none !important; }
}
</style>
