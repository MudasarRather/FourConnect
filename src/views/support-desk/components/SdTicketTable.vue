<template>
  <div class="sd-tt" :class="{ compact: density === 'compact' }" :style="{ '--acc': accent }">
    <div class="tt-scroll">
      <table class="tt-table">
        <thead>
          <tr>
            <th v-for="col in cols" :key="col.key" :class="['tt-th', col.align, { sortable: col.sortable, on: sortBy === col.sortKey }]"
              :style="col.width ? { width: col.width } : null" @click="col.sortable && $emit('sort', col.sortKey)">
              <template v-if="col.key === 'flag'">
                <button v-if="selectable" class="tt-check tt-check--all" :class="{ on: allOnPageSelected }" @click.stop="$emit('toggle-all')" :aria-label="allOnPageSelected ? 'Deselect page' : 'Select page'">
                  <Check v-if="allOnPageSelected" :size="12" />
                </button>
              </template>
              <template v-else>
                <span>{{ col.label }}</span>
                <ChevronUp v-if="col.sortable && sortBy === col.sortKey && sortDir === 'asc'" :size="12" class="tt-sort" />
                <ChevronDown v-else-if="col.sortable && sortBy === col.sortKey" :size="12" class="tt-sort" />
              </template>
            </th>
          </tr>
        </thead>

        <tbody>
          <!-- skeletons -->
          <tr v-if="loading && !rows.length" v-for="n in 6" :key="'sk' + n" class="tt-row tt-skel">
            <td v-for="col in cols" :key="col.key"><span class="tt-skel-bar" /></td>
          </tr>

          <tr v-for="(t, i) in rows" :key="t.id" class="tt-row" :class="{ sel: isSel(t.id), breach: rowBreached(t), grab: draggableRows }"
            :style="{ '--pc': priColor(t.priority), '--i': i }" :draggable="draggableRows || undefined"
            @dragstart="draggableRows && onRowDrag($event, t)" @click="$emit('open', t.id)">
            <td v-for="col in cols" :key="col.key" :class="['tt-td', col.align]">
              <!-- select + priority spine -->
              <template v-if="col.key === 'flag'">
                <span class="tt-spine" />
                <button v-if="selectable" class="tt-check" :class="{ on: isSel(t.id) }" @click.stop="$emit('toggle', t.id)" :aria-label="isSel(t.id) ? 'Deselect' : 'Select'">
                  <Check v-if="isSel(t.id)" :size="12" />
                </button>
              </template>

              <span v-else-if="col.key === 'number'" class="tt-no sd-mono">{{ t.ticket_number }}</span>

              <template v-else-if="col.key === 'subject'">
                <span class="tt-subj">{{ t.subject }}</span>
                <span v-if="t.is_escalated" class="tt-esc"><Flame :size="10" /></span>
              </template>

              <span v-else-if="col.key === 'type'" class="tt-type">{{ typeLabel(t.ticket_type) }}</span>
              <SdPill v-else-if="col.key === 'priority'" kind="priority" :value="t.priority" />
              <SdPill v-else-if="col.key === 'status'" kind="status" :value="t.status" />

              <span v-else-if="col.key === 'requester'" class="tt-dim">{{ requester(t) }}</span>

              <span v-else-if="col.key === 'agent'" class="tt-agent" :class="{ none: !t.assigned_agent_name }">
                <span class="tt-ag-dot">{{ initials(t.assigned_agent_name) }}</span>
                <span class="tt-ag-name">{{ t.assigned_agent_name || 'Unassigned' }}</span>
              </span>

              <span v-else-if="col.key === 'sla'" class="tt-sla" :class="slaState(t)">
                <Timer :size="11" />{{ slaLabel(t) }}
              </span>

              <span v-else-if="col.key === 'age'" class="tt-dim">{{ ago(t.created_at) }}</span>
              <span v-else-if="col.key === 'created'" class="tt-dim">{{ ago(t.created_at) }}</span>
              <span v-else-if="col.key === 'updated'" class="tt-dim">{{ ago(t.updated_at) }}</span>
              <span v-else-if="col.key === 'comments'" class="tt-dim">{{ t.comment_count || 0 }}</span>

              <span v-else-if="col.key === 'escalation'" class="tt-badge esc">L{{ t.escalation_level || 0 }}</span>
              <span v-else-if="col.key === 'reopened'" class="tt-badge warn">{{ t.reopened_count || 0 }}×</span>

              <!-- reopened-desk columns (Möbius Loop) -->
              <span v-else-if="col.key === 'reopenSource'" class="tt-ropsrc" :class="{ none: !t.reopen_source }">
                <template v-if="t.reopen_source"><RotateCcw :size="10" />{{ reopenSourceLabel(t.reopen_source) }}</template>
                <span v-else class="tt-dim">—</span>
              </span>
              <span v-else-if="col.key === 'reopenedAt'" class="tt-ropat sd-mono" :class="{ none: !t.last_reopened_at }">
                <template v-if="t.last_reopened_at">{{ ago(t.last_reopened_at) }} ago</template>
                <template v-else>—</template>
              </span>
              <template v-else-if="col.key === 'prevRes'">
                <span v-if="t.prev_resolution_code || t.prev_resolution_summary" class="tt-prev"
                  :title="t.prev_resolution_summary || 'No summary recorded on the failed fix'">
                  <s>{{ (t.prev_resolution_code || 'fixed').replace(/_/g, ' ') }}</s>
                  <i v-if="t.reopen_reason_code" class="tt-prev-code">{{ reopenReasonShort(t.reopen_reason_code) }}</i>
                </span>
                <span v-else class="tt-dim">—</span>
              </template>

              <span v-else-if="col.key === 'breach'" class="tt-breach">
                <span v-if="t.sla_resolution_breached && t.sla_response_breached" class="tt-badge danger">Both</span>
                <span v-else-if="t.sla_resolution_breached" class="tt-badge danger">Resolution</span>
                <span v-else-if="t.sla_response_breached" class="tt-badge danger">Response</span>
                <span v-else class="tt-dim">—</span>
              </span>

              <!-- breached-desk columns (Time-Debt Meter) -->
              <span v-else-if="col.key === 'overage'" class="tt-over sd-mono" :class="{ frozen: !!t.sla_paused_since, none: !overMin(t) }">
                <template v-if="overMin(t)">+{{ overLabel(t) }}<i v-if="t.sla_paused_since" class="tt-over-frz" title="SLA clock frozen (paused status) — debt is not accruing">❄</i></template>
                <template v-else>—</template>
              </span>
              <span v-else-if="col.key === 'breachedAt'" class="tt-brcat" :class="{ none: !breachStamp(t) }">
                <template v-if="breachStamp(t)"><Timer :size="11" />{{ ago(breachStamp(t)) }} ago</template>
                <template v-else>—</template>
              </span>
              <template v-else-if="col.key === 'rca'">
                <span v-if="t.rca_summary" class="tt-rca filed"><Check :size="11" /> Filed</span>
                <span v-else-if="t.breach_reason" class="tt-rca reason" :title="'Coded reason only — full RCA missing: ' + t.breach_reason">Reason</span>
                <button v-else class="tt-ack-un brc" @click.stop="$emit('rca', t)"
                  title="No root cause on record — capture it now">
                  <span class="tt-ack-ping" aria-hidden="true" />RCA
                </button>
              </template>

              <span v-else-if="col.key === 'overdue'" class="tt-badge danger">{{ overdueDays(t) }}</span>

              <!-- Overdue desk: live governing-clock overage (ticks with `now`) + kind chip -->
              <span v-else-if="col.key === 'lateBy'" class="tt-lateby sd-mono">
                <b>{{ lateByLabel(t) }}</b>
                <i v-if="respOnlyOver(t)" class="tt-lb-kind" title="First response never sent — the response clock is the miss">1st REPLY</i>
              </span>

              <span v-else-if="col.key === 'dueAt'" class="tt-dueat sd-mono">{{ fmtDueAt(t) }}</span>

              <span v-else-if="col.key === 'csat'" class="tt-csat">
                <template v-if="t.csat_score"><Star :size="12" class="lit" />{{ t.csat_score }}/5</template>
                <span v-else class="tt-dim">—</span>
              </span>

              <!-- resolved-desk columns ("Closeout") -->
              <span v-else-if="col.key === 'resolutionCode'" class="tt-rescode" :class="{ none: !t.resolution_code }">
                <template v-if="t.resolution_code"><CircleCheck :size="10" />{{ t.resolution_code.replace(/_/g, ' ') }}</template>
                <span v-else class="tt-dim">—</span>
              </span>
              <span v-else-if="col.key === 'resolvedAt'" class="tt-resat sd-mono" :class="{ none: !t.resolved_at }">
                <template v-if="t.resolved_at">{{ ago(t.resolved_at) }} ago</template>
                <template v-else>—</template>
              </span>
              <span v-else-if="col.key === 'resolvedBy'" class="tt-dim">{{ t.resolved_by_name || t.assigned_agent_name || '—' }}</span>
              <span v-else-if="col.key === 'autoClose'" class="tt-autoclose sd-mono" :class="autoCloseState(t)">
                <template v-if="t.status === 'resolved' && t.auto_close_at"><Timer :size="11" />{{ autoCloseLabel(t) }}</template>
                <span v-else-if="t.status === 'closed'" class="tt-dim">closed</span>
                <span v-else class="tt-dim">—</span>
              </span>

              <!-- closed-desk columns ("Archive of Record") -->
              <button v-else-if="col.key === 'closeSource'" class="tt-prov" :class="'ps-' + closeSourceOf(t)"
                title="Open the closure certificate" @click.stop="$emit('certificate', t)">
                <component :is="sourceIcon(t)" :size="10" /><span>{{ sourceShort(t) }}</span>
              </button>
              <span v-else-if="col.key === 'closedAt'" class="tt-resat sd-mono" :class="{ none: !t.closed_at }">
                <template v-if="t.closed_at">{{ ago(t.closed_at) }} ago</template>
                <template v-else>—</template>
              </span>
              <span v-else-if="col.key === 'closedBy'" class="tt-sealedby" :class="{ sys: t.status === 'closed' && !t.closed_by_id }">
                {{ t.closed_by_name || (t.status === 'closed' ? 'System' : '—') }}
              </span>
              <span v-else-if="col.key === 'lifespan'" class="tt-resat sd-mono">{{ lifespanLabel(t) }}</span>
              <span v-else-if="col.key === 'followUp'" class="tt-chain" :class="{ none: !t.follow_up_of_number }">
                <template v-if="t.follow_up_of_number"><Link2 :size="10" />{{ t.follow_up_of_number }}</template>
                <span v-else class="tt-dim">—</span>
              </span>

              <!-- archived-desk columns ("Deep Storage") -->
              <SdPill v-else-if="col.key === 'statusAtArchive'" kind="status" :value="t.status_at_archive ?? t.status" />
              <span v-else-if="col.key === 'archiveReason'" class="tt-arcreason" :class="'ar-' + archiveReasonTone(archiveReasonOf(t))"
                :title="archiveReasonLabel(archiveReasonOf(t))">
                <Archive :size="10" /><span>{{ archiveReasonShort(archiveReasonOf(t)) }}</span>
              </span>
              <span v-else-if="col.key === 'archivedAt'" class="tt-resat sd-mono" :class="{ none: !t.archived_at }">
                <template v-if="t.archived_at">{{ ago(t.archived_at) }} ago</template>
                <template v-else>—</template>
              </span>
              <span v-else-if="col.key === 'archivedBy'" class="tt-sealedby" :class="{ sys: t.is_deleted && !t.archived_by_id }">
                {{ t.archived_by_name || (t.is_deleted ? 'System' : '—') }}
              </span>
              <span v-else-if="col.key === 'dormancy'" class="tt-resat sd-mono">{{ dormancyLabel(t) }}</span>
              <template v-else-if="col.key === 'purgeIn'">
                <span v-if="t.legal_hold" class="tt-purgein held"
                  title="Legal hold — exempt from retention; only a superuser can release it">
                  <Scale :size="11" /> HELD
                </span>
                <span v-else-if="purgeState(t) === 'eligible'" class="tt-purgein eligible"
                  title="Past the retention window — a superuser may permanently purge this record">
                  <TimerOff :size="11" /> ELIGIBLE
                </span>
                <span v-else-if="purgeState(t) !== 'none'" class="tt-purgein" :class="purgeState(t)">
                  <Timer :size="11" /> {{ purgeLabel(t) }}
                </span>
                <span v-else class="tt-dim">—</span>
              </template>
              <template v-else-if="col.key === 'restore'">
                <button class="tt-restore" @click.stop="$emit('restore', t)"
                  title="Pull this record back into circulation">
                  <ArchiveRestore :size="11" /> Restore
                </button>
              </template>

              <!-- Team Ops columns ("Squad Command") -->
              <span v-else-if="col.key === 'viewers'" class="tt-eyes" :class="{ none: !(t.viewers || []).length, hot: (t.viewers || []).length > 1 }"
                :title="(t.viewers || []).length ? 'Also viewing: ' + t.viewers.map(v => v.name || 'Agent').join(', ') : 'No one else has this open'">
                <template v-if="(t.viewers || []).length">
                  <span v-for="v in t.viewers.slice(0, 3)" :key="v.user_id" class="tt-eye-dot">{{ initials(v.name) }}</span>
                  <Eye :size="11" class="tt-eye-ic" />
                </template>
                <span v-else class="tt-dim">—</span>
              </span>
              <template v-else-if="col.key === 'handoff'">
                <button class="tt-handoff" @click.stop="$emit('handoff', t)"
                  title="Hand this ticket off to a teammate (audited, reason-coded)">
                  <ArrowLeftRight :size="11" /> Handoff
                </button>
              </template>

              <!-- vendor lifecycle columns (Pending Vendor "Relay Station") -->
              <template v-else-if="col.key === 'vendor'">
                <span class="tt-vendor" :class="{ none: !t.vendor_name }">
                  <span class="tt-v-ic"><Truck :size="12" /></span>
                  <span class="tt-v-body">
                    <span class="tt-v-name">{{ t.vendor_name || 'Unnamed vendor' }}</span>
                    <span v-if="t.vendor_wait_reason" class="tt-v-reason">{{ vendorReasonLabel(t.vendor_wait_reason) }}</span>
                  </span>
                </span>
              </template>
              <span v-else-if="col.key === 'vendorEta'" class="tt-veta" :class="etaState(t)">
                <template v-if="t.vendor_due_at"><AlarmClock :size="11" />{{ etaLabel(t) }}</template>
                <span v-else class="tt-dim">no ETA</span>
              </span>
              <span v-else-if="col.key === 'vendorWait'" class="tt-vwait" :class="{ hot: isVendorOverdue(t) }">{{ waitLabel(t) }}</span>

              <!-- on-hold governance columns (Suspension Dock) -->
              <template v-else-if="col.key === 'holdReason'">
                <span class="tt-hold" :class="{ none: !t.hold_reason_code && !t.hold_reason }">
                  <span class="tt-h-ic"><PauseCircle :size="12" /></span>
                  <span class="tt-h-body">
                    <span class="tt-h-name">{{ holdReasonLabel(t.hold_reason_code) }}</span>
                    <span v-if="t.hold_reason" class="tt-h-detail">{{ t.hold_reason }}</span>
                  </span>
                  <i v-if="t.hold_stale" class="tt-h-stale" title="Hold review due">STALE</i>
                </span>
              </template>
              <span v-else-if="col.key === 'release'" class="tt-rel" :class="releaseState(t)">
                <template v-if="releaseEp(t)"><CalendarClock :size="11" />{{ releaseLabel(t) }}</template>
                <span v-else class="tt-dim">no date</span>
              </span>
              <span v-else-if="col.key === 'heldFor'" class="tt-held" :class="{ hot: t.hold_stale }">{{ heldForLabel(t) }}</span>

              <!-- war-room columns (Critical tickets) -->
              <template v-else-if="col.key === 'mi'">
                <button v-if="t.is_major_incident" class="tt-mi on" title="Open the war room" @click.stop="$emit('war', t)">
                  <Siren :size="11" /><span class="tt-mi-lb">MI</span>
                </button>
                <span v-else class="tt-mi"><span class="tt-dim">—</span></span>
              </template>
              <template v-else-if="col.key === 'ack'">
                <span v-if="t.acknowledged_at" class="tt-ack">
                  <Check :size="11" />
                  <span class="tt-ack-by">{{ initials(t.acknowledged_by_name) }}</span>
                  <span class="tt-ack-d">{{ ackDelta(t) }}</span>
                </span>
                <span v-else-if="terminal(t)" class="tt-dim">—</span>
                <button v-else class="tt-ack-un" @click.stop="$emit('ack', t)" title="Acknowledge — take responder eyes on this">
                  <span class="tt-ack-ping" aria-hidden="true" />ACK
                </button>
              </template>
              <span v-else-if="col.key === 'nextUpdate'" class="tt-upd" :class="updState(t)">
                <template v-if="hasCadence(t)"><BellRing :size="11" />{{ updLabel(t) }}</template>
                <span v-else class="tt-dim">—</span>
              </span>
              <template v-else-if="col.key === 'impact'">
                <span v-if="t.business_impact || t.affected_users" class="tt-imp">
                  <span v-if="t.business_impact" class="tt-imp-chip" :class="'bi-' + t.business_impact">{{ t.business_impact.toUpperCase() }}</span>
                  <span v-if="t.affected_users" class="tt-imp-users"><Users :size="10" />{{ fmtUsers(t.affected_users) }}</span>
                </span>
                <span v-else class="tt-dim">—</span>
              </template>

              <!-- escalated-desk columns (Thermal Updraft) -->
              <template v-else-if="col.key === 'tier'">
                <span class="tt-tier" :class="{ hot: (t.escalation_level || 0) >= 3, auto: t.auto_escalated }">
                  <ChevronsUp :size="11" />L{{ t.escalation_level || 0 }}
                  <i v-if="t.auto_escalated" class="tt-tier-auto" title="Auto-escalated by the SLA-breach sweep">AUTO</i>
                </span>
              </template>
              <template v-else-if="col.key === 'escTarget'">
                <span class="tt-esct" :class="{ none: !t.escalated_to_team_name && !t.escalated_by_name }">
                  <span class="tt-esct-team">{{ t.escalated_to_team_name || (t.escalation_type === 'hierarchical' ? 'Up the chain' : '—') }}</span>
                  <span v-if="t.escalated_by_name" class="tt-esct-by">by {{ t.escalated_by_name }}</span>
                </span>
              </template>
              <template v-else-if="col.key === 'escAck'">
                <span v-if="t.escalation_acknowledged_at" class="tt-ack">
                  <Check :size="11" />
                  <span class="tt-ack-by">{{ initials(t.escalation_acknowledged_by_name) }}</span>
                  <span class="tt-ack-d">{{ escAckDelta(t) }}</span>
                </span>
                <span v-else-if="terminal(t) || !t.is_escalated" class="tt-dim">—</span>
                <button v-else class="tt-ack-un esc" @click.stop="$emit('esc-ack', t)"
                  title="Acknowledge the escalation — the receiving tier owns eyes on this">
                  <span class="tt-ack-ping" aria-hidden="true" />ACK
                </button>
              </template>
              <span v-else-if="col.key === 'escDue'" class="tt-upd" :class="escDueState(t)">
                <template v-if="escDueActive(t)"><AlarmClock :size="11" />{{ escDueLabel(t) }}</template>
                <span v-else-if="t.escalation_acknowledged_at" class="tt-esc-met">✓ met</span>
                <span v-else class="tt-dim">—</span>
              </span>
              <span v-else-if="col.key === 'dwell'" class="tt-dwell" :class="{ hot: dwellMs(t) >= 24 * 3600000 }">{{ dwellLabel(t) }}</span>

              <span v-else class="tt-dim">—</span>
            </td>
          </tr>

          <tr v-if="!loading && !rows.length" class="tt-empty-row">
            <td :colspan="cols.length">
              <div class="tt-empty">
                <span class="tt-empty-ico"><component :is="emptyIcon || Inbox" :size="26" /></span>
                <p class="tt-empty-title">{{ empty?.title || 'Nothing here' }}</p>
                <p class="tt-empty-blurb">{{ empty?.blurb || '' }}</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Check, ChevronUp, ChevronDown, ChevronsUp, Flame, Timer, Star, Inbox, Truck, AlarmClock, PauseCircle, CalendarClock, Siren, BellRing, Users, RotateCcw, CircleCheck, Stamp, GitMerge, Undo2, BellOff, Link2, Archive, ArchiveRestore, Scale, TimerOff, Eye, ArrowLeftRight } from 'lucide-vue-next'
import SdPill from './SdPill.vue'
import { typeLabel, priorityColor, vendorReasonLabel, holdReasonLabel, reopenSourceLabel, reopenReasonShort, closeSourceOf, CLOSE_SOURCES, archiveReasonOf, archiveReasonLabel, archiveReasonShort, archiveReasonTone, PURGE_RETENTION_DAYS } from '@/composables/useSupportDesk'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  columns: { type: Array, default: () => [] },     // ordered column keys
  loading: { type: Boolean, default: false },
  selectable: { type: Boolean, default: false },
  selected: { type: Array, default: () => [] },     // ids
  sortBy: { type: String, default: 'created_at' },
  sortDir: { type: String, default: 'desc' },
  now: { type: Number, default: () => Date.now() },
  density: { type: String, default: 'comfortable' },
  accent: { type: String, default: 'var(--sd-amber)' },
  empty: { type: Object, default: null },
  emptyIcon: { type: [Object, Function], default: null },
  // Team Ops: rows become drag sources (dropped on SdRosterDeck tiles → handoff).
  draggableRows: { type: Boolean, default: false },
})
defineEmits(['open', 'toggle', 'toggle-all', 'sort', 'ack', 'war', 'esc-ack', 'rca', 'certificate', 'restore', 'handoff'])

// Column catalog: label / alignment / sortability / backend sort key.
const CATALOG = {
  flag: { label: '', align: 'l', sortable: false, width: '34px' },
  number: { label: 'Ticket', align: 'l', sortable: true, sortKey: 'ticket_number', width: '104px' },
  subject: { label: 'Subject', align: 'l', sortable: true, sortKey: 'subject' },
  type: { label: 'Type', align: 'l', sortable: false, width: '88px' },
  priority: { label: 'Priority', align: 'l', sortable: true, sortKey: 'priority', width: '100px' },
  // Status must seat the longest pill ("Pending Customer") + cell padding without clipping —
  // under table-layout:fixed the flexible Subject column absorbs the width (no horizontal scroll).
  status: { label: 'Status', align: 'l', sortable: true, sortKey: 'status', width: '148px' },
  requester: { label: 'Requester', align: 'l', sortable: false, width: '124px' },
  agent: { label: 'Agent', align: 'l', sortable: false, width: '124px' },
  sla: { label: 'SLA', align: 'r', sortable: true, sortKey: 'resolution_due_at', width: '92px' },
  age: { label: 'Age', align: 'r', sortable: true, sortKey: 'created_at', width: '78px' },
  // Sortable right-aligned headers grow a chevron when active — 86px clipped "UPDATED ▾".
  created: { label: 'Created', align: 'r', sortable: true, sortKey: 'created_at', width: '100px' },
  updated: { label: 'Updated', align: 'r', sortable: true, sortKey: 'updated_at', width: '100px' },
  comments: { label: 'Replies', align: 'r', sortable: false, width: '72px' },
  escalation: { label: 'Level', align: 'l', sortable: true, sortKey: 'escalation_level', width: '72px' },
  reopened: { label: 'Reopens', align: 'l', sortable: true, sortKey: 'reopened_count', width: '84px' },
  // reopened-desk columns ("Möbius Loop") — who kicked it back, when the cycle started,
  // the failed fix (client-side sortKeys like the war-room set).
  reopenSource: { label: 'Kicked back by', align: 'l', sortable: true, sortKey: 'reopenSource', width: '128px' },
  reopenedAt: { label: 'Reopened', align: 'l', sortable: true, sortKey: 'reopenedAt', width: '100px' },
  prevRes: { label: 'Failed fix', align: 'l', sortable: true, sortKey: 'prevRes', width: '150px' },
  breach: { label: 'Breach', align: 'l', sortable: false, width: '104px' },
  overdue: { label: 'Overdue', align: 'l', sortable: true, sortKey: 'resolution_due_at', width: '92px' },
  lateBy: { label: 'Late by', align: 'l', sortable: true, sortKey: 'lateBy', width: '112px' },
  dueAt: { label: 'Was due', align: 'l', sortable: true, sortKey: 'dueAt', width: '124px' },
  csat: { label: 'CSAT', align: 'l', sortable: false, width: '84px' },
  vendor: { label: 'Vendor', align: 'l', sortable: true, sortKey: 'vendor', width: '156px' },
  vendorEta: { label: 'Vendor ETA', align: 'l', sortable: true, sortKey: 'vendorEta', width: '108px' },
  vendorWait: { label: 'Waiting', align: 'r', sortable: true, sortKey: 'vendorWait', width: '86px' },
  holdReason: { label: 'Hold reason', align: 'l', sortable: true, sortKey: 'holdReason', width: '160px' },
  release: { label: 'Release', align: 'l', sortable: true, sortKey: 'release', width: '106px' },
  heldFor: { label: 'Held for', align: 'r', sortable: true, sortKey: 'heldFor', width: '84px' },
  // war-room columns (Critical) — sortKeys are client-side (the Critical section sorts its
  // 100-row working set in the browser; the server whitelist just falls back to created_at).
  mi: { label: 'MI', align: 'l', sortable: false, width: '56px' },
  ack: { label: 'Ack', align: 'l', sortable: true, sortKey: 'ack', width: '112px' },
  nextUpdate: { label: 'Next update', align: 'l', sortable: true, sortKey: 'nextUpdate', width: '112px' },
  impact: { label: 'Impact', align: 'l', sortable: false, width: '124px' },
  // breached-desk columns ("Time-Debt Meter") — client-side sortKeys like the war-room set.
  overage: { label: 'Overage', align: 'r', sortable: true, sortKey: 'overage', width: '96px' },
  breachedAt: { label: 'Breached', align: 'l', sortable: true, sortKey: 'breachedAt', width: '104px' },
  rca: { label: 'Root cause', align: 'l', sortable: true, sortKey: 'rca', width: '108px' },
  // escalated-desk columns ("Thermal Updraft") — client-side sortKeys like the war-room set.
  tier: { label: 'Tier', align: 'l', sortable: true, sortKey: 'tier', width: '82px' },
  escTarget: { label: 'Raised to', align: 'l', sortable: false, width: '132px' },
  escAck: { label: 'Tier ack', align: 'l', sortable: true, sortKey: 'escAck', width: '116px' },
  escDue: { label: 'Ack clock', align: 'l', sortable: true, sortKey: 'escDue', width: '104px' },
  dwell: { label: 'At tier', align: 'r', sortable: true, sortKey: 'dwell', width: '84px' },
  // resolved-desk columns ("Closeout") — the fix code, when it landed, who recorded it,
  // and the live resolved→closed countdown (client-side sortKeys).
  resolutionCode: { label: 'Fix code', align: 'l', sortable: true, sortKey: 'resolutionCode', width: '128px' },
  resolvedAt: { label: 'Resolved', align: 'l', sortable: true, sortKey: 'resolvedAt', width: '104px' },
  resolvedBy: { label: 'Resolved by', align: 'l', sortable: false, width: '124px' },
  autoClose: { label: 'Closes in', align: 'l', sortable: true, sortKey: 'autoClose', width: '104px' },
  // closed-desk columns ("Archive of Record") — closure provenance, the seal stamp, the
  // pause-credited lifespan and the follow-up chain (client-side sortKeys).
  closeSource: { label: 'Provenance', align: 'l', sortable: true, sortKey: 'closeSource', width: '124px' },
  closedAt: { label: 'Sealed', align: 'l', sortable: true, sortKey: 'closedAt', width: '104px' },
  closedBy: { label: 'Sealed by', align: 'l', sortable: false, width: '124px' },
  lifespan: { label: 'Lifespan', align: 'r', sortable: true, sortKey: 'lifespan', width: '92px' },
  followUp: { label: 'Chain', align: 'l', sortable: false, width: '104px' },
  // archived-desk columns ("Deep Storage") — the status the record died in, the coded
  // reason, provenance stamps, live dormancy + the retention countdown, and the one-click
  // restore action (client-side sortKeys; 'archivedAt' also exists server-side).
  statusAtArchive: { label: 'Was', align: 'l', sortable: true, sortKey: 'statusAtArchive', width: '148px' },
  archiveReason: { label: 'Reason', align: 'l', sortable: true, sortKey: 'archiveReason', width: '118px' },
  archivedAt: { label: 'Shelved', align: 'l', sortable: true, sortKey: 'archivedAt', width: '104px' },
  archivedBy: { label: 'Shelved by', align: 'l', sortable: false, width: '124px' },
  dormancy: { label: 'Dormant', align: 'r', sortable: true, sortKey: 'dormancy', width: '92px' },
  purgeIn: { label: 'Purge in', align: 'l', sortable: true, sortKey: 'purgeIn', width: '116px' },
  restore: { label: '', align: 'r', sortable: false, width: '104px' },
  // Team Ops desk ("Squad Command") — live agent-collision pips + the handoff action.
  viewers: { label: 'Eyes', align: 'l', sortable: false, width: '76px' },
  handoff: { label: '', align: 'r', sortable: false, width: '92px' },
}
const cols = computed(() => props.columns.map(k => ({ key: k, ...(CATALOG[k] || { label: k, align: 'l', sortable: false }) })))

const onRowDrag = (e, t) => {
  try { e.dataTransfer.setData('text/ticket-id', String(t.id)); e.dataTransfer.effectAllowed = 'move' } catch { /* */ }
}

const selSet = computed(() => new Set(props.selected.map(String)))
const isSel = (id) => selSet.value.has(String(id))
const allOnPageSelected = computed(() => props.rows.length > 0 && props.rows.every(r => isSel(r.id)))

const priColor = (p) => priorityColor(p)
const requester = (t) => t.organization_name || t.contact_name || t.raised_by_name || 'Internal'
const initials = (n) => n ? n.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() : '—'

const dueMs = (t) => { const d = t.resolution_due_at || t.response_due_at; return d ? new Date(d).getTime() : null }
const terminal = (t) => ['resolved', 'closed'].includes(t.status)
const rowBreached = (t) => t.sla_resolution_breached || (dueMs(t) != null && props.now > dueMs(t) && !terminal(t))
const slaBreached = (t) => t.sla_resolution_breached || t.sla_response_breached
const slaState = (t) => {
  // Terminal isn't automatically a win — a ticket resolved AFTER its target breached its SLA.
  if (terminal(t)) return slaBreached(t) ? 'over' : 'done'
  const d = dueMs(t); if (d == null) return 'none'
  const rem = d - props.now
  if (rem < 0) return 'over'
  if (rem < 7200000) return 'soon'
  return 'ok'
}
const slaLabel = (t) => {
  if (terminal(t)) return slaBreached(t) ? 'Late' : '✓ met'
  const d = dueMs(t); if (d == null) return '—'
  const rem = d - props.now, abs = Math.abs(rem), m = Math.floor(abs / 60000)
  const lbl = m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`
  return rem < 0 ? `${lbl} over` : lbl
}
const overdueDays = (t) => {
  const d = dueMs(t); if (d == null) return '—'
  const days = Math.floor((props.now - d) / 86400000)
  return days >= 1 ? `${days}d` : '<1d'
}
/* Overdue desk cells — governing missed clock (resolution wins; else un-replied response),
   pause-aware so a frozen row never fakes a live burn. */
const respOnlyOver = (t) => {
  const res = ep(t.resolution_due_at), resp = ep(t.response_due_at)
  const end = ep(t.sla_paused_since) || props.now
  return !(res && res < end) && !!resp && resp < end && !t.first_responded_at
}
const lateByLabel = (t) => {
  const end = ep(t.sla_paused_since) || props.now
  const res = ep(t.resolution_due_at)
  const due = (res && res < end) ? res : (respOnlyOver(t) ? ep(t.response_due_at) : 0)
  if (!due) return '—'
  const m = Math.max(0, Math.floor((end - due) / 60000))
  return m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`
}
const fmtDueAt = (t) => {
  const d = t.resolution_due_at || t.response_due_at
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
const ago = (iso) => {
  if (!iso) return '—'
  const s = Math.floor((props.now - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}
// Resolved desk: live resolved→closed countdown against the server-authoritative auto_close_at.
const autoCloseMs = (t) => (t.auto_close_at ? new Date(t.auto_close_at).getTime() - props.now : null)
const autoCloseLabel = (t) => {
  const ms = autoCloseMs(t)
  if (ms == null) return '—'
  if (ms <= 0) return 'sweep due'
  const m = Math.floor(ms / 60000)
  if (m < 60) return `${m}m`
  if (m < 1440) return `${Math.floor(m / 60)}h ${m % 60}m`
  return `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`
}
const autoCloseState = (t) => {
  const ms = autoCloseMs(t)
  if (ms == null || t.status !== 'resolved') return ''
  return ms <= 0 ? 'over' : ms <= 24 * 3600000 ? 'soon' : ''
}

/* ── closed-desk helpers ("Archive of Record") ── */
const SOURCE_ICONS = { manual: Stamp, auto_sweep: Timer, merged: GitMerge, withdrawn: Undo2, no_response: BellOff }
const sourceIcon = (t) => SOURCE_ICONS[closeSourceOf(t)] || Stamp
const sourceShort = (t) => (CLOSE_SOURCES.find(s => s.value === closeSourceOf(t)) || {}).short || '—'
// Pause-credited full lifespan created→closed (static — the record is sealed).
const lifespanLabel = (t) => {
  if (!t.closed_at || !t.created_at) return '—'
  const ms = Math.max(0, new Date(t.closed_at).getTime() - new Date(t.created_at).getTime() - (t.sla_paused_ms || 0))
  const m = Math.floor(ms / 60000)
  if (m < 60) return `${m}m`
  if (m < 1440) return `${Math.floor(m / 60)}h ${m % 60}m`
  return `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`
}

/* ── Deep Storage helpers (Archived desk) — dormancy + retention countdown ── */
const dormancyLabel = (t) => {
  if (!t.archived_at) return '—'
  const m = Math.max(0, Math.floor((props.now - new Date(t.archived_at).getTime()) / 60000))
  if (m < 60) return `${m}m`
  if (m < 1440) return `${Math.floor(m / 60)}h`
  return `${Math.floor(m / 1440)}d`
}
// Retention endpoint: server-enriched purge_eligible_at wins; fall back to
// archived_at + PURGE_RETENTION_DAYS for stats-less rows. Legal holds never count down.
const purgeEpoch = (t) => {
  const e = ep(t.purge_eligible_at)
  if (e) return e
  const a = ep(t.archived_at)
  return a ? a + PURGE_RETENTION_DAYS * 86400000 : 0
}
const purgeState = (t) => {
  if (t.legal_hold) return 'held'
  const e = purgeEpoch(t); if (!e) return 'none'
  const rem = e - props.now
  if (rem <= 0) return 'eligible'
  return rem < 7 * 86400000 ? 'soon' : 'ok'
}
const purgeLabel = (t) => {
  const e = purgeEpoch(t); if (!e) return '—'
  const rem = Math.max(0, e - props.now)
  const d = Math.floor(rem / 86400000)
  if (d >= 1) return `${d}d`
  const h = Math.floor(rem / 3600000)
  return h >= 1 ? `${h}h` : `${Math.max(1, Math.floor(rem / 60000))}m`
}

/* ── vendor lifecycle helpers ── */
const ep = (v) => (v ? new Date(v).getTime() : 0)
const isVendorOverdue = (t) => (t.vendor_overdue != null ? !!t.vendor_overdue : (ep(t.vendor_due_at) ? props.now > ep(t.vendor_due_at) : false))
const vendorWaitMs = (t) => {
  if (Number.isFinite(t.vendor_wait_ms) && t.vendor_wait_ms != null) return Math.max(0, t.vendor_wait_ms)
  const r = ep(t.vendor_dispatched_at); return r ? Math.max(0, props.now - r) : 0
}
const waitLabel = (t) => {
  const ms = vendorWaitMs(t); if (!ms) return '—'
  const m = Math.floor(ms / 60000)
  return m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`
}
const etaState = (t) => { if (!t.vendor_due_at) return 'none'; return isVendorOverdue(t) ? 'over' : (ep(t.vendor_due_at) - props.now < 86400000 ? 'soon' : 'ok') }
const etaLabel = (t) => {
  const d = ep(t.vendor_due_at); if (!d) return '—'
  const rem = d - props.now, abs = Math.abs(rem), m = Math.floor(abs / 60000)
  const lbl = m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`
  return rem < 0 ? `${lbl} over` : lbl
}

/* ── on-hold governance helpers (Suspension Dock) ── */
const releaseEp = (t) => ep(t.auto_resume_at) || ep(t.hold_until)
const releaseState = (t) => {
  const r = releaseEp(t); if (!r) return 'none'
  return r <= props.now ? 'over' : (r - props.now < 86400000 ? 'soon' : 'ok')
}
const releaseLabel = (t) => {
  const r = releaseEp(t); if (!r) return '—'
  const rem = r - props.now, m = Math.floor(Math.abs(rem) / 60000)
  const lbl = m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`
  return rem < 0 ? `${lbl} over` : lbl
}
const heldForLabel = (t) => {
  const ms = Number.isFinite(t.time_on_hold_ms) && t.time_on_hold_ms != null
    ? Math.max(0, t.time_on_hold_ms)
    : (ep(t.held_at) ? Math.max(0, props.now - ep(t.held_at)) : 0)
  if (!ms) return '—'
  const m = Math.floor(ms / 60000)
  return m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`
}

/* ── war-room helpers (Critical) ── */
const ackDelta = (t) => {
  const a = ep(t.acknowledged_at), c0 = ep(t.created_at)
  if (!a || !c0) return ''
  const m = Math.max(0, Math.floor((a - c0) / 60000))
  return m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`
}
const hasCadence = (t) => !!t.next_update_due_at && !terminal(t)
const updState = (t) => {
  if (!hasCadence(t)) return 'none'
  const rem = ep(t.next_update_due_at) - props.now
  if (rem < 0) return 'over'
  if (rem < 900000) return 'soon'
  return 'ok'
}
const updLabel = (t) => {
  const rem = ep(t.next_update_due_at) - props.now, m = Math.floor(Math.abs(rem) / 60000)
  const lbl = m < 60 ? `${m}m` : `${Math.floor(m / 60)}h`
  return rem < 0 ? `${lbl} over` : lbl
}
const fmtUsers = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n))

/* ── breached-desk helpers (Time-Debt Meter) ── */
const breachStamp = (t) => t.sla_resolution_breached_at || t.sla_response_breached_at ||
  (t.sla_resolution_breached ? t.resolution_due_at : null) ||
  (t.sla_response_breached ? t.response_due_at : null) || null
// Pause-aware overage: measured to resolved_at once repaired, frozen at sla_paused_since
// while the clock is stopped, live otherwise. Resolution target wins; response as fallback.
const overMin = (t) => {
  const due = ep(t.sla_resolution_breached ? t.resolution_due_at : (t.sla_response_breached ? t.response_due_at : null))
  if (!due) return 0
  const end = t.sla_resolution_breached
    ? (ep(t.resolved_at) || ep(t.sla_paused_since) || props.now)
    : (ep(t.first_responded_at) || ep(t.sla_paused_since) || props.now)
  return Math.max(0, Math.floor((end - due) / 60000))
}
const overLabel = (t) => {
  const m = overMin(t)
  return m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`
}

/* ── escalated-desk helpers (Thermal Updraft) ── */
const escAckDelta = (t) => {
  const a = ep(t.escalation_acknowledged_at), e = ep(t.escalated_at)
  if (!a || !e) return ''
  const m = Math.max(0, Math.floor((a - e) / 60000))
  return m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`
}
const escDueActive = (t) => !!t.escalation_response_due_at && !t.escalation_acknowledged_at && !terminal(t) && t.is_escalated
const escDueState = (t) => {
  if (!escDueActive(t)) return 'none'
  const rem = ep(t.escalation_response_due_at) - props.now
  if (rem < 0) return 'over'
  if (rem < 900000) return 'soon'
  return 'ok'
}
const escDueLabel = (t) => {
  const rem = ep(t.escalation_response_due_at) - props.now, m = Math.floor(Math.abs(rem) / 60000)
  const lbl = m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`
  return rem < 0 ? `${lbl} over` : lbl
}
const dwellMs = (t) => (Number.isFinite(t.time_since_escalated_ms) && t.time_since_escalated_ms != null
  ? Math.max(0, t.time_since_escalated_ms)
  : (ep(t.escalated_at) ? Math.max(0, props.now - ep(t.escalated_at)) : 0))
const dwellLabel = (t) => {
  const ms = dwellMs(t); if (!ms) return '—'
  const m = Math.floor(ms / 60000)
  return m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`
}
</script>

<style scoped>
.sd-tt { border: 1px solid var(--sd-border); border-radius: 16px; overflow: hidden; background: var(--sd-surface); }
/* Safety-net only: on very narrow viewports the fixed layout still fits down to min-width,
   below which it scrolls rather than break. On desktop the table fills 100% with no scroll. */
.tt-scroll { overflow-x: auto; }
/* table-layout: fixed → the flexible Subject column absorbs remaining space and truncates
   instead of forcing the table wider than its container (no horizontal scroll on desktop). */
.tt-table { width: 100%; border-collapse: collapse; table-layout: fixed; min-width: 680px; }

.tt-th { position: sticky; top: 0; z-index: 2; text-align: left; padding: 11px 12px; font-size: 10.5px; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase; color: var(--sd-text-dim); background: var(--sd-surface-glass);
  backdrop-filter: blur(8px); border-bottom: 1px solid var(--sd-border); white-space: nowrap; user-select: none; overflow: hidden; text-overflow: ellipsis; }
.tt-th.r { text-align: right; }
.tt-th.sortable { cursor: pointer; transition: color 0.18s; }
.tt-th.sortable:hover, .tt-th.on { color: var(--acc); }
.tt-sort { vertical-align: middle; margin-left: 3px; }

.tt-row { cursor: pointer; border-bottom: 1px solid var(--sd-border); transition: background 0.15s; animation: sd-stream-in 0.4s var(--sd-spring) backwards; animation-delay: calc(var(--i, 0) * 0.022s); }
.tt-row:hover { background: var(--sd-surface-glass); }
.tt-row.sel { background: color-mix(in srgb, var(--acc) 10%, transparent); }
/* every cell truncates its own content — under table-layout:fixed this keeps long
   requester / agent / subject values inside their column instead of spilling or scrolling. */
.tt-td { padding: 11px 12px; font-size: 12.5px; color: var(--sd-text); vertical-align: middle; white-space: nowrap; position: relative; overflow: hidden; text-overflow: ellipsis; }
.tt-td.r { text-align: right; }
.sd-tt.compact .tt-td { padding: 7px 12px; font-size: 12px; }
.sd-tt.compact .tt-th { padding: 8px 12px; }

.tt-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--pc); opacity: 0.85; }
.tt-row.breach .tt-spine { box-shadow: 0 0 10px var(--pc); }

.tt-check { width: 18px; height: 18px; display: grid; place-items: center; border-radius: 5px; cursor: pointer; margin-left: 6px;
  background: var(--sd-surface-glass); border: 1.5px solid var(--sd-border-strong); color: var(--sd-canvas); }
.tt-check.on { background: var(--acc); border-color: transparent; color: #fff; }
.tt-check--all { margin-left: 4px; }

.tt-no { color: var(--acc); font-weight: 700; font-size: 11.5px; }
.tt-subj { font-weight: 600; max-width: 100%; overflow: hidden; text-overflow: ellipsis; display: inline-block; vertical-align: middle; }
.tt-esc { display: inline-flex; color: var(--sd-st-escalated); margin-left: 6px; vertical-align: middle; }
.tt-type { font-size: 11px; color: var(--sd-text-muted); text-transform: uppercase; letter-spacing: 0.03em; }
.tt-dim { color: var(--sd-text-muted); }

.tt-agent { display: inline-flex; align-items: center; gap: 7px; max-width: 150px; }
.tt-agent.none { color: var(--sd-text-dim); }
.tt-ag-dot { flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font-size: 9px; font-weight: 800; color: #fff; background: var(--sd-grad-rail); }
.tt-agent.none .tt-ag-dot { background: var(--sd-surface-glass); color: var(--sd-text-dim); border: 1px solid var(--sd-border-strong); }
.tt-ag-name { overflow: hidden; text-overflow: ellipsis; }

.tt-sla { display: inline-flex; align-items: center; gap: 4px; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--sd-text-secondary); }
.tt-sla.soon { color: var(--sd-warning); }
.tt-sla.over { color: var(--sd-danger); }
.tt-sla.done { color: var(--sd-success); }
.tt-sla.none { color: var(--sd-text-dim); }

.tt-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 7px; font-size: 11px; font-weight: 700; }
.tt-badge.esc { color: var(--sd-st-escalated); background: var(--sd-st-escalated-soft); }
.tt-badge.warn { color: var(--sd-warning); background: var(--sd-warning-soft); }
.tt-badge.danger { color: var(--sd-danger); background: var(--sd-danger-soft); }
.tt-csat { display: inline-flex; align-items: center; gap: 4px; font-weight: 700; }
.tt-csat .lit { color: var(--sd-amber); }

/* resolved-desk cells ("Closeout") */
.tt-rescode { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700;
  color: var(--sd-res-core); text-transform: capitalize; }
.tt-resat { font-size: 11px; font-weight: 700; color: var(--sd-text-muted); }
.tt-autoclose { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 800;
  color: var(--sd-res-close); }
.tt-autoclose.soon { color: var(--sd-warning); }
.tt-autoclose.over { color: var(--sd-danger); }

/* closed-desk cells ("Archive of Record") — the provenance chip opens the certificate */
.tt-prov { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 999px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.06em; cursor: pointer; font-family: var(--sd-mono);
  border: 1px solid var(--sd-cls-brd); background: var(--sd-cls-soft); color: var(--sd-cls-core);
  transition: border-color 0.18s, transform 0.12s; }
.tt-prov:hover { border-color: var(--sd-cls-seal); transform: translateY(-1px); }
.tt-prov.ps-manual { color: var(--sd-cls-seal); border-color: color-mix(in srgb, var(--sd-cls-seal) 45%, transparent); background: var(--sd-cls-seal-soft); }
.tt-prov.ps-merged { color: var(--sd-cls-frost); }
.tt-prov.ps-withdrawn { color: var(--sd-text-muted); }
.tt-prov.ps-no_response { color: var(--sd-warning); }
.tt-sealedby { font-size: 12px; color: var(--sd-text-muted); }
.tt-sealedby.sys { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; color: var(--sd-cls-frost); font-family: var(--sd-mono); }
.tt-chain { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 700;
  color: var(--sd-cls-seal); font-family: var(--sd-mono); }

/* Deep Storage cells (Archived desk) */
.tt-arcreason { display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.07em; font-family: var(--sd-mono);
  color: var(--sd-arc-core, #cbbfa4); background: var(--sd-arc-soft, rgba(203,191,164,0.13));
  border: 1px solid var(--sd-arc-brd, rgba(203,191,164,0.28)); }
.tt-arcreason.ar-bronze { color: var(--sd-arc-bronze, #b08d57); background: var(--sd-arc-bronze-soft, rgba(176,141,87,0.15)); border-color: var(--sd-arc-bronze, #b08d57); }
.tt-arcreason.ar-hold { color: var(--sd-arc-hold, #eab308); background: var(--sd-arc-hold-soft, rgba(234,179,8,0.15)); border-color: var(--sd-arc-hold, #eab308); }
.tt-arcreason.ar-purge { color: var(--sd-arc-purge, #f97316); background: var(--sd-arc-purge-soft, rgba(249,115,22,0.14)); border-color: var(--sd-arc-purge, #f97316); }
.tt-arcreason.ar-restore { color: var(--sd-arc-restore, #34d399); background: var(--sd-arc-restore-soft, rgba(52,211,153,0.14)); border-color: var(--sd-arc-restore, #34d399); }
.tt-arcreason.ar-deep { color: var(--sd-arc-deep, #8a7a5c); background: var(--sd-arc-deep-soft, rgba(138,122,92,0.18)); border-color: var(--sd-arc-deep, #8a7a5c); }
.tt-purgein { display: inline-flex; align-items: center; gap: 4px; font-weight: 700; font-family: var(--sd-mono);
  font-size: 11px; font-variant-numeric: tabular-nums; color: var(--sd-text-secondary); }
.tt-purgein.soon { color: var(--sd-arc-purge, #f97316); }
.tt-purgein.eligible { color: var(--sd-arc-purge, #f97316); font-size: 9.5px; letter-spacing: 0.08em; }
.tt-purgein.held { color: var(--sd-arc-hold, #eab308); font-size: 9.5px; letter-spacing: 0.08em; }
.tt-restore { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 8px;
  border: 1px solid var(--sd-arc-restore, #34d399); background: var(--sd-arc-restore-soft, rgba(52,211,153,0.14));
  color: var(--sd-arc-restore, #34d399); font-size: 10.5px; font-weight: 800; letter-spacing: 0.04em;
  cursor: pointer; transition: transform 0.15s ease, box-shadow 0.2s ease; }
.tt-restore:hover { transform: translateY(-1px); box-shadow: 0 0 14px var(--sd-arc-restore-soft, rgba(52,211,153,0.14)); }
.tt-restore:active { transform: translateY(0); }

/* Team Ops cells — collision pips + handoff action */
.tt-row.grab { cursor: grab; }
.tt-row.grab:active { cursor: grabbing; }
.tt-eyes { display: inline-flex; align-items: center; }
.tt-eyes.hot .tt-eye-dot { animation: tt-eye-pulse 1.6s ease-out infinite; }
.tt-eye-dot { width: 18px; height: 18px; display: grid; place-items: center; border-radius: 50%;
  margin-right: -6px; font-size: 8px; font-weight: 800; letter-spacing: 0.02em;
  color: var(--sd-team-hi, #ffd98a); background: var(--sd-team-deep-soft, rgba(154,109,31,0.18));
  border: 1px solid var(--sd-team-brd, rgba(232,176,75,0.3)); }
.tt-eye-ic { margin-left: 10px; color: var(--sd-team-core, #e8b04b); }
@keyframes tt-eye-pulse { 0% { box-shadow: 0 0 0 0 var(--sd-team-soft, rgba(232,176,75,0.13)); } 70% { box-shadow: 0 0 0 5px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
.tt-handoff { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 8px;
  border: 1px solid var(--sd-team-brd, rgba(232,176,75,0.3)); background: var(--sd-team-soft, rgba(232,176,75,0.13));
  color: var(--sd-team-core, #e8b04b); font-size: 10.5px; font-weight: 800; letter-spacing: 0.04em;
  cursor: pointer; transition: transform 0.15s ease, box-shadow 0.2s ease; }
.tt-handoff:hover { transform: translateY(-1px); box-shadow: 0 0 14px var(--sd-team-soft, rgba(232,176,75,0.13)); }
.tt-handoff:active { transform: translateY(0); }

/* vendor lifecycle cells */
.tt-vendor { display: inline-flex; align-items: center; gap: 8px; max-width: 100%; }
.tt-vendor.none { color: var(--sd-text-dim); }
.tt-v-ic { flex-shrink: 0; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 7px; color: var(--sd-vendor-steel); background: var(--sd-vendor-steel-soft); }
.tt-v-body { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
.tt-v-name { font-weight: 650; overflow: hidden; text-overflow: ellipsis; }
.tt-v-reason { font-size: 10px; font-weight: 600; color: var(--sd-vendor-signal); text-transform: uppercase; letter-spacing: 0.03em; }
.tt-veta { display: inline-flex; align-items: center; gap: 4px; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--sd-text-secondary); }
.tt-veta.soon { color: var(--sd-warning); }
.tt-veta.over { color: var(--sd-vendor-overdue); }
.tt-veta.none { color: var(--sd-text-dim); font-weight: 500; }
.tt-vwait { font-weight: 700; font-variant-numeric: tabular-nums; color: var(--sd-text-secondary); }
.tt-vwait.hot { color: var(--sd-vendor-overdue); }

/* overdue recovery cells */
/* reopened-desk columns (Möbius Loop) */
.tt-ropsrc { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; color: var(--sd-rop-band, var(--sd-amber)); }
.tt-ropsrc.none { color: var(--sd-text-dim); }
.tt-ropat { font-size: 11px; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--sd-rop-hi, var(--sd-warning)); }
.tt-ropat.none { color: var(--sd-text-dim); }
.tt-prev { display: inline-flex; align-items: center; gap: 6px; min-width: 0; max-width: 100%; }
.tt-prev s { font-size: 10.5px; font-weight: 700; color: var(--sd-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  text-decoration-color: var(--sd-rop-core, var(--sd-danger)); text-decoration-thickness: 1.5px; }
.tt-prev-code { flex-shrink: 0; font-size: 8px; font-weight: 800; font-style: normal; letter-spacing: 0.08em;
  padding: 2px 5px; border-radius: 5px; color: var(--sd-rop-hi, var(--sd-warning)); background: var(--sd-rop-soft, var(--sd-warning-soft));
  border: 1px dashed color-mix(in srgb, var(--sd-rop-core, #e0509b) 45%, transparent); }

.tt-lateby { display: inline-flex; align-items: center; gap: 6px; }
.tt-lateby b { font-weight: 800; font-variant-numeric: tabular-nums; color: var(--sd-ovd-core); }
.tt-lb-kind { flex-shrink: 0; font-size: 8px; font-weight: 800; font-style: normal; letter-spacing: 0.08em;
  padding: 2px 5px; border-radius: 5px; color: var(--sd-ovd-dust); background: var(--sd-ovd-dust-soft);
  border: 1px dashed color-mix(in srgb, var(--sd-ovd-dust) 45%, transparent); }
.tt-dueat { font-weight: 600; font-variant-numeric: tabular-nums; color: var(--sd-text-secondary); white-space: nowrap; }

/* on-hold governance cells */
.tt-hold { display: inline-flex; align-items: center; gap: 8px; max-width: 100%; }
.tt-hold.none { color: var(--sd-text-dim); }
.tt-h-ic { flex-shrink: 0; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 7px; color: var(--sd-dock-stone); background: var(--sd-dock-stone-soft); }
.tt-h-body { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
.tt-h-name { font-weight: 650; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tt-h-detail { font-size: 10px; font-weight: 500; color: var(--sd-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tt-h-stale { flex-shrink: 0; font-size: 8px; font-weight: 800; font-style: normal; letter-spacing: 0.1em; padding: 2px 5px; border-radius: 5px; color: var(--sd-warning); background: var(--sd-warning-soft); border: 1px dashed color-mix(in srgb, var(--sd-warning) 45%, transparent); }
.tt-rel { display: inline-flex; align-items: center; gap: 4px; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--sd-text-secondary); }
.tt-rel.soon { color: var(--sd-dock-ember); }
.tt-rel.over { color: var(--sd-dock-overdue); }
.tt-rel.none { color: var(--sd-text-dim); font-weight: 500; }
.tt-held { font-weight: 700; font-variant-numeric: tabular-nums; color: var(--sd-text-secondary); }
.tt-held.hot { color: var(--sd-warning); }

/* war-room cells (Critical) */
.tt-mi { display: inline-flex; align-items: center; gap: 4px; font-weight: 800; font-size: 10px; letter-spacing: 0.08em;
  background: none; border: none; padding: 0; font-family: inherit; }
.tt-mi.on { color: var(--sd-crit-core); cursor: pointer; }
.tt-mi.on .tt-mi-lb { padding: 1px 5px; border-radius: 5px; background: var(--sd-crit-soft); border: 1px solid color-mix(in srgb, var(--sd-crit-core) 40%, transparent); transition: box-shadow 0.15s; }
.tt-mi.on:hover .tt-mi-lb { box-shadow: 0 0 10px -2px var(--sd-crit-core); }
.tt-ack { display: inline-flex; align-items: center; gap: 5px; font-weight: 700; color: var(--sd-crit-ack); font-variant-numeric: tabular-nums; }
.tt-ack-by { font-size: 10px; font-weight: 800; letter-spacing: 0.04em; }
.tt-ack-d { font-size: 10.5px; color: var(--sd-text-muted); font-weight: 600; }
.tt-ack-un { position: relative; display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px 3px 7px; border-radius: 7px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.1em; cursor: pointer;
  color: var(--sd-crit-core); background: var(--sd-crit-soft);
  border: 1px solid color-mix(in srgb, var(--sd-crit-core) 45%, transparent); transition: transform 0.15s, box-shadow 0.15s; }
.tt-ack-un:hover { transform: translateY(-1px); box-shadow: 0 4px 14px -6px var(--sd-crit-core); }
.tt-ack-ping { width: 6px; height: 6px; border-radius: 50%; background: var(--sd-crit-core); animation: tt-ack-pulse 1.6s ease-out infinite; }
@keyframes tt-ack-pulse {
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-crit-core) 55%, transparent); }
  100% { box-shadow: 0 0 0 8px transparent; }
}
.tt-upd { display: inline-flex; align-items: center; gap: 4px; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--sd-text-secondary); }
.tt-upd.soon { color: var(--sd-warning); }
.tt-upd.over { color: var(--sd-crit-core); }

/* breached-desk cells (Time-Debt Meter) */
.tt-over { font-weight: 800; font-variant-numeric: tabular-nums; color: var(--sd-brc-core); font-size: 12px; }
.tt-over.frozen { color: var(--sd-brc-brass); }
.tt-over.none { color: var(--sd-text-dim); font-weight: 500; }
.tt-over-frz { font-style: normal; font-size: 10px; margin-left: 4px; opacity: 0.9; }
.tt-brcat { display: inline-flex; align-items: center; gap: 4px; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--sd-text-secondary); }
.tt-brcat.none { color: var(--sd-text-dim); font-weight: 500; }
.tt-rca { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 7px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.05em; }
.tt-rca.filed { color: var(--sd-brc-repair); background: var(--sd-brc-repair-soft); border: 1px solid color-mix(in srgb, var(--sd-brc-repair) 40%, transparent); }
.tt-rca.reason { color: var(--sd-brc-brass); background: var(--sd-brc-brass-soft); border: 1px dashed color-mix(in srgb, var(--sd-brc-brass) 50%, transparent); }
.tt-ack-un.brc { color: var(--sd-brc-core); background: var(--sd-brc-soft); border-color: color-mix(in srgb, var(--sd-brc-core) 45%, transparent); }
.tt-ack-un.brc:hover { box-shadow: 0 4px 14px -6px var(--sd-brc-core); }
.tt-ack-un.brc .tt-ack-ping { background: var(--sd-brc-core); }

/* escalated-desk cells (Thermal Updraft) */
.tt-tier { display: inline-flex; align-items: center; gap: 3px; padding: 3px 8px; border-radius: 7px; font-size: 11px; font-weight: 800;
  color: var(--sd-esc-core); background: var(--sd-esc-soft); border: 1px solid color-mix(in srgb, var(--sd-esc-core) 38%, transparent); }
.tt-tier.hot { color: var(--sd-esc-deep); background: var(--sd-esc-deep-soft); border-color: color-mix(in srgb, var(--sd-esc-deep) 55%, transparent); box-shadow: 0 0 10px -3px var(--sd-esc-deep); }
.tt-tier-auto { margin-left: 3px; font-size: 8px; font-weight: 800; font-style: normal; letter-spacing: 0.08em; color: var(--sd-esc-auto);
  border: 1px dashed color-mix(in srgb, var(--sd-esc-auto) 55%, transparent); border-radius: 4px; padding: 0 3px; }
.tt-esct { display: inline-flex; flex-direction: column; gap: 1px; min-width: 0; }
.tt-esct.none { color: var(--sd-text-dim); }
.tt-esct-team { font-weight: 700; font-size: 12px; overflow: hidden; text-overflow: ellipsis; }
.tt-esct-by { font-size: 10px; color: var(--sd-text-muted); overflow: hidden; text-overflow: ellipsis; }
.tt-ack-un.esc { color: var(--sd-esc-core); background: var(--sd-esc-soft); border-color: color-mix(in srgb, var(--sd-esc-core) 45%, transparent); }
.tt-ack-un.esc:hover { box-shadow: 0 4px 14px -6px var(--sd-esc-core); }
.tt-ack-un.esc .tt-ack-ping { background: var(--sd-esc-core); }
.tt-esc-met { font-size: 11px; font-weight: 700; color: var(--sd-esc-ack); }
.tt-dwell { font-weight: 700; font-variant-numeric: tabular-nums; color: var(--sd-text-secondary); }
.tt-dwell.hot { color: var(--sd-esc-deep); }
.tt-upd.none { color: var(--sd-text-dim); }
.tt-imp { display: inline-flex; align-items: center; gap: 7px; }
.tt-imp-chip { padding: 2px 6px; border-radius: 5px; font-size: 9px; font-weight: 800; letter-spacing: 0.07em; color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); }
.tt-imp-chip.bi-critical { color: var(--sd-crit-core); background: var(--sd-crit-soft); border-color: color-mix(in srgb, var(--sd-crit-core) 40%, transparent); }
.tt-imp-chip.bi-high { color: var(--sd-crit-flare); background: color-mix(in srgb, var(--sd-crit-flare) 12%, transparent); border-color: color-mix(in srgb, var(--sd-crit-flare) 40%, transparent); }
.tt-imp-chip.bi-medium { color: var(--sd-warning); background: var(--sd-warning-soft); border-color: color-mix(in srgb, var(--sd-warning) 40%, transparent); }
.tt-imp-users { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 700; color: var(--sd-text-secondary); font-variant-numeric: tabular-nums; }

.tt-skel-bar { display: block; height: 12px; border-radius: 6px; background: var(--sd-surface-glass); animation: sd-fluid-shimmer 1.4s linear infinite; background-size: 200% 100%; }
.tt-empty-row td { padding: 0; }
.tt-empty { display: flex; flex-direction: column; align-items: center; gap: 9px; padding: 42px 16px; text-align: center; }
.tt-empty-ico { display: grid; place-items: center; width: 56px; height: 56px; border-radius: 16px; color: var(--acc); background: color-mix(in srgb, var(--acc) 12%, transparent); }
.tt-empty-title { margin: 0; font-size: 14px; font-weight: 700; color: var(--sd-text); }
.tt-empty-blurb { margin: 0; font-size: 12.5px; color: var(--sd-text-muted); max-width: 36ch; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .tt-row, html:not([data-cinematic="on"]) .tt-skel-bar,
  html:not([data-cinematic="on"]) .tt-ack-ping, html:not([data-cinematic="on"]) .tt-eye-dot { animation: none; }
}
</style>
