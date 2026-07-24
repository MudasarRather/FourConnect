<template>
  <Teleport to="body">
    <Presence>
      <Motion
        v-if="ticketId"
        class="tkd-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.24 }"
        @mousedown.self="$emit('close')"
      >
        <Motion
          class="tkd" :class="{ expanded }" :data-role="role"
          :initial="{ x: '100%' }" :animate="{ x: 0 }" :exit="{ x: '100%' }"
          :transition="{ duration: 0.46, ease: [0.16, 1, 0.3, 1] }"
        >
          <!-- status-reactive spine + ambient depth -->
          <span class="tkd-spine" :style="{ '--sc': spineColor }" aria-hidden="true" />
          <span class="tkd-orb a" aria-hidden="true" />
          <span class="tkd-orb b" aria-hidden="true" />

          <!-- ░░ SKELETON ░░ -->
          <div v-if="loading" class="tkd-skel">
            <span class="sk sk-no" /><span class="sk sk-title" /><span class="sk sk-pills" />
            <span class="sk sk-console" /><span class="sk sk-row" /><span class="sk sk-row" />
          </div>

          <template v-else-if="t">
            <!-- ░░ STICKY HEADER ░░ -->
            <header class="tkd-head">
              <div class="th-grain" aria-hidden="true" />
              <div class="th-top">
                <span class="th-no sd-mono"><Hash :size="12" />{{ t.ticket_number }}</span>
                <span v-if="t.is_major_incident" class="th-flag major"><Siren :size="11" /> MAJOR</span>
                <span v-if="t.is_escalated" class="th-flag esc"><Flame :size="11" /> L{{ t.escalation_level }}</span>
                <span v-if="t.reopened_count" class="th-flag" :title="reopenFlagTitle"><RotateCcw :size="11" /> {{ t.reopened_count }}×<template v-if="t.reopen_source"> · {{ reopenSourceLabel(t.reopen_source) }}</template></span>
                <span v-if="t.merged_into_id" class="th-flag"><GitMerge :size="11" /> merged</span>
                <!-- agent-collision presence (Zendesk-style): who else has this open right now -->
                <span v-if="othersHere.length" class="th-flag watch" :title="othersHere.map(v => v.name || 'Teammate').join(', ')">
                  <Eye :size="11" /> {{ othersHere.length === 1 ? (firstName(othersHere[0].name) || 'a teammate') : othersHere.length + ' teammates' }} here
                </span>
                <span class="th-spacer" />
                <span class="th-role" :class="role"><component :is="roleMeta.icon" :size="11" /> {{ roleMeta.label }}</span>
                <button class="th-x th-expand" :title="expanded ? 'Collapse' : 'Expand to conversation theater'" @click="toggleExpand"><component :is="expanded ? Minimize2 : Maximize2" :size="16" /></button>
                <button class="th-x" @click="$emit('close')"><X :size="18" /></button>
              </div>
              <h2 class="th-subject">{{ t.subject }}</h2>
              <div class="th-pills">
                <SdPill kind="priority" :value="t.priority" />
                <SdPill kind="status" :value="displayStatus" />
                <span class="th-soft"><Tag :size="11" /> {{ typeLabel(t.ticket_type) }}</span>
                <span v-if="t.category_name" class="th-soft"><Layers :size="11" /> {{ t.category_name }}{{ t.subcategory_name ? ' › ' + t.subcategory_name : '' }}</span>
                <span v-if="t.team_name" class="th-soft"><Users :size="11" /> {{ t.team_name }}</span>
                <span v-if="t.sub_status" class="th-soft"><Activity :size="11" /> {{ cap(t.sub_status) }}</span>
              </div>
              <!-- status-aware banner -->
              <Presence>
                <Motion v-if="banner" :key="banner.key" class="th-banner" :class="banner.tone"
                  :initial="{ opacity: 0, y: -6 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: -6 }"
                  :transition="{ duration: 0.3 }">
                  <component :is="banner.icon" :size="14" /><span>{{ banner.text }}</span>
                </Motion>
              </Presence>
            </header>

            <!-- ░░ SCROLLING BODY ░░ -->
            <div class="tkd-body" :class="{ expanded }" ref="bodyRef">
              <!-- CONTEXT column (collapsed: the whole scroll; expanded: left pane) -->
              <div class="tkd-ctx">

              <!-- ── SIGNATURE: the Resolution Console ── -->
              <Motion class="tk-console" v-bind="sT(0)">
                <div class="tkc-grain" aria-hidden="true" />
                <!-- focal countdown + meta -->
                <div class="tkc-top">
                  <div class="tk-focal" :class="focal.tone">
                    <span class="tkf-ring" aria-hidden="true" />
                    <span class="tkf-big sd-mono">{{ focal.big }}</span>
                    <span class="tkf-sub">{{ focal.sub }}</span>
                  </div>
                  <div class="tkc-meta">
                    <span><Clock :size="12" /> Opened {{ ago(t.created_at) }}</span>
                    <span v-if="t.assigned_agent_name"><Headset :size="12" /> {{ t.assigned_agent_name }}</span>
                    <span v-else class="muted"><Headset :size="12" /> Unassigned</span>
                    <span v-if="t.sla_package_id"><Gauge :size="12" /> SLA policy active</span>
                    <span v-if="t.last_viewed_at && role === 'agent'"><Eye :size="12" /> Seen {{ ago(t.last_viewed_at) }}</span>
                  </div>
                </div>

                <!-- dual SLA frontier bars -->
                <div class="tk-sla">
                  <div class="tk-sla-row" v-for="m in slaMeters" :key="m.key" :class="m.tone">
                    <span class="tsl-name">{{ m.name }}</span>
                    <div class="tsl-track">
                      <span class="tsl-frontier" aria-hidden="true" />
                      <span class="tsl-fill" :style="{ width: (m.p * 100) + '%' }"><i class="tsl-comet" /></span>
                    </div>
                    <span class="tsl-val sd-mono">{{ m.label }}</span>
                  </div>
                </div>

                <!-- lifecycle filament -->
                <div class="tk-life">
                  <div class="tkl-rail"><span class="tkl-fill" :style="{ width: fillPct + '%' }" /></div>
                  <div class="tkl-nodes">
                    <div v-for="(s, i) in stages" :key="s.key" class="tkl-node" :class="{ done: s.done, cur: i === currentIndex }" :title="s.at ? fmt(s.at) : s.label">
                      <span class="tkl-dot"><component :is="s.icon" :size="11" /></span>
                      <span class="tkl-lbl">{{ s.label }}</span>
                    </div>
                  </div>
                </div>
              </Motion>

              <!-- ── SLA verdict ribbon — the outcome flags, prominent under the console ── -->
              <Motion class="tk-slaflags" v-bind="sT(1)">
                <div class="tsf-seal" :class="slaVerdict.tone">
                  <component :is="slaVerdict.icon" :size="16" />
                  <span>{{ slaVerdict.label }}</span>
                </div>
                <div class="tsf-cards">
                  <div v-for="f in slaFlags" :key="f.key" class="tsf" :class="f.tone">
                    <span class="tsf-ic"><component :is="f.icon" :size="15" /></span>
                    <div class="tsf-body">
                      <span class="tsf-name">{{ f.name }}</span>
                      <span class="tsf-state">{{ f.state }}</span>
                      <span v-if="f.meta" class="tsf-meta sd-mono">{{ f.meta }}</span>
                    </div>
                  </div>
                </div>
              </Motion>

              <!-- ── vitals deck ── -->
              <Motion class="tk-vitals" v-bind="sT(2)">
                <div v-for="v in vitals" :key="v.key" class="tkv" :class="v.tone">
                  <span class="tkv-ic"><component :is="v.icon" :size="14" /></span>
                  <span class="tkv-val sd-mono">{{ v.value }}</span>
                  <span class="tkv-lbl">{{ v.label }}</span>
                </div>
              </Motion>

              <!-- ── TABS ── -->
              <Motion class="tkd-tabs" v-bind="sT(3)">
                <button v-for="tab in TABS" :key="tab.key" class="tk-tab" :class="{ on: activeTab === tab.key }" @click="activeTab = tab.key">
                  <component :is="tab.icon" :size="14" /> <span>{{ tab.label }}</span>
                  <span v-if="tab.key === 'conversation' && msgCount" class="tk-tab-n">{{ msgCount }}</span>
                  <span v-if="tab.key === 'activity' && activities.length" class="tk-tab-n">{{ activities.length }}</span>
                </button>
                <span class="tk-tab-ink" :style="inkStyle" />
              </Motion>

              <!-- ── TAB CONTENT (details / activity; conversation lives in its own pane) ── -->
              <div class="tk-tabbody" v-show="activeTab !== 'conversation'">
                <Motion :key="activeTab" :initial="{ opacity: 0, x: 12 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }">

                  <!-- ═══ DETAILS ═══ -->
                  <template v-if="activeTab === 'details'">
                    <!-- Classification -->
                    <section class="tk-panel" style="--i:0">
                      <header class="tk-ph"><h4><Pencil :size="13" /> Classification</h4>
                        <button v-if="canEditClass && !editing" class="tk-mini" @click="startEdit"><Pencil :size="12" /> Edit</button>
                        <span v-else-if="editing" class="tk-edit-acts"><button class="tk-mini" @click="editing = false">Cancel</button><button class="tk-mini primary" :disabled="busy" @click="saveEdit">Save</button></span>
                      </header>
                      <div v-if="!editing" class="tk-facts">
                        <SdKvRow :icon="Flag" label="Priority" :index="0">
                          <b :style="{ color: priorityColor(t.priority) }">{{ priorityLabel(t.priority) }}<i v-if="priorityP(t.priority)" class="pcode">{{ priorityP(t.priority) }}</i></b>
                        </SdKvRow>
                        <SdKvRow :icon="Tag" label="Type" :value="typeLabel(t.ticket_type)" :index="1" />
                        <SdKvRow :icon="Zap" label="Impact" :value="cap(t.impact)" :index="2" />
                        <SdKvRow :icon="AlarmClock" label="Urgency" :value="cap(t.urgency)" :index="3" />
                        <SdKvRow :icon="Layers" label="Category" :value="t.category_name" :index="4" />
                        <SdKvRow :icon="Globe" label="Source" :value="cap(t.source)" :index="5" />
                      </div>
                      <div v-else class="tk-edit-grid">
                        <div v-if="isAgent"><label class="tk-il">Priority</label><SdSelect v-model="ed.priority" :options="PRIORITIES" /></div>
                        <div v-if="isAgent"><label class="tk-il">Type</label><SdSelect v-model="ed.ticket_type" :options="TICKET_TYPES" /></div>
                        <div v-if="isAgent"><label class="tk-il">Impact</label><SdSelect v-model="ed.impact" :options="IMPACT_OPTS" /></div>
                        <div v-if="isAgent"><label class="tk-il">Urgency</label><SdSelect v-model="ed.urgency" :options="IMPACT_OPTS" /></div>
                        <div><label class="tk-il">Category</label><SdSelect v-model="ed.category_id" :options="catOptions" /></div>
                        <div v-if="isAgent"><label class="tk-il">Organization</label><SdSelect v-model="ed.organization_id" :options="orgOptions" /></div>
                        <div v-if="isAgent" class="full"><label class="tk-il">Tags</label><input v-model="ed.tags" class="tk-inp" placeholder="network, vpn, priority-client — comma separated" /></div>
                        <template v-if="!isAgent">
                          <div><label class="tk-il">Priority</label><SdSelect v-model="ed.priority" :options="PRIORITIES" /></div>
                          <div class="full"><label class="tk-il">Subject</label><input v-model="ed.subject" class="tk-inp" maxlength="200" /></div>
                          <div class="full"><label class="tk-il">Description</label><textarea v-model="ed.description" rows="4" class="tk-inp" /></div>
                        </template>
                      </div>
                      <div v-if="!editing && t.description" class="tk-desc"><span class="tk-desc-k">Description</span><p>{{ t.description }}</p></div>
                      <div v-if="!editing && (t.tags || []).length" class="tk-tagrow">
                        <span v-for="tg in t.tags" :key="tg" class="tk-tagchip">{{ tg }}</span>
                      </div>
                    </section>

                    <!-- Requester & contact -->
                    <section class="tk-panel" style="--i:1">
                      <header class="tk-ph"><h4><Headset :size="13" /> Requester &amp; contact</h4></header>
                      <div class="tk-facts">
                        <SdKvRow :icon="UserRound" label="Raised by" :value="t.raised_by_name || t.contact_name" :index="0" />
                        <SdKvRow :icon="Building2" label="Organization" :value="t.organization_name" :index="1" />
                        <SdKvRow v-if="t.customer_name" :icon="Contact" label="Customer" :value="t.customer_name" :index="2" />
                        <SdKvRow v-if="t.department" :icon="Users" label="Department" :value="t.department" :index="3" />
                        <SdKvRow v-if="t.contact_email" :icon="Mail" label="Email" full :index="4"><a :href="`mailto:${t.contact_email}`">{{ t.contact_email }}</a></SdKvRow>
                        <SdKvRow v-if="t.contact_phone" :icon="Phone" label="Phone" :index="5"><a :href="`tel:${t.contact_phone}`">{{ t.contact_phone }}</a></SdKvRow>
                        <SdKvRow v-if="t.location" :icon="MapPin" label="Location" :value="t.location" :index="6" />
                      </div>
                    </section>

                    <!-- People & collaborators -->
                    <section class="tk-panel" style="--i:2">
                      <header class="tk-ph"><h4><UsersRound :size="13" /> People</h4>
                        <!-- owner-tier gate (canCommand), matching the backend actor gate on
                             collaborator add/remove — canWork alone let teammates open a modal
                             whose every action 403s. -->
                        <button v-if="canWork && canCommand" class="tk-mini" @click="openAction('collab')"><Plus :size="12" /> Manage</button></header>
                      <div class="tk-collab-list">
                        <div class="tk-collab"><span class="tk-cava owner">{{ initials(t.assigned_agent_name || '?') }}</span><div class="tk-cmeta"><b>{{ t.assigned_agent_name || 'Unassigned' }}</b><span>Owner</span></div></div>
                        <div class="tk-collab"><span class="tk-cava req">{{ initials(t.raised_by_name || 'R') }}</span><div class="tk-cmeta"><b>{{ t.raised_by_name || 'Requester' }}</b><span>Requester</span></div></div>
                        <div v-for="c in collaborators" :key="c.id" class="tk-collab"><span class="tk-cava">{{ initials(c.name) }}</span><div class="tk-cmeta"><b>{{ c.name }}</b><span>Collaborator</span></div></div>
                      </div>
                    </section>

                    <!-- Resolution -->
                    <section v-if="t.resolution_code || t.resolution_summary" class="tk-panel good" style="--i:3">
                      <header class="tk-ph"><h4><CircleCheck :size="13" /> Resolution</h4></header>
                      <div class="tk-facts">
                        <SdKvRow :icon="BadgeCheck" label="Code" :value="resolutionLabel(t.resolution_code)" tone="good" :index="0" />
                        <SdKvRow :icon="FileSearch" label="Root cause" :value="t.resolution_category ? rootCauseLabel(t.resolution_category) : ''" :index="1" />
                        <SdKvRow :icon="Timer" label="Time logged" :value="fmtMins(t.time_spent_minutes)" :index="2" />
                        <SdKvRow :icon="CircleCheck" label="Resolved" :value="t.resolved_at ? ago(t.resolved_at) : ''" tone="good" :index="3" />
                      </div>
                      <p v-if="t.resolution_summary" class="tk-note-line">{{ t.resolution_summary }}</p>
                    </section>

                    <!-- Vendor Relay (pending-vendor lifecycle) -->
                    <section v-if="t.status === 'pending_vendor' || t.vendor_name" class="tk-panel tk-vpanel" :class="{ hot: vendorOverdue }" style="--i:4">
                      <header class="tk-ph"><h4><Truck :size="13" /> Vendor hand-off
                        <span v-if="vendorOverdue" class="tk-vbadge"><AlarmClock :size="10" /> overdue</span></h4>
                        <button v-if="isAgent && canCommand" class="tk-mini" @click="toggleVendor">{{ vendorEdit ? 'Cancel' : 'Edit' }}</button></header>

                      <div v-if="!vendorEdit" class="tk-facts">
                        <SdKvRow :icon="Truck" label="Vendor" :value="t.vendor_name" :index="0" />
                        <SdKvRow :icon="Hash" label="External ref" :value="t.vendor_ticket_ref" :index="1" />
                        <SdKvRow :icon="Pause" label="Waiting on" :value="vendorReasonLabel(t.vendor_wait_reason)" :index="2" />
                        <SdKvRow :icon="AlarmClock" label="Expected back" :value="fmtEta(t.vendor_due_at)" :index="3" />
                        <SdKvRow :icon="Clock" label="Dispatched" :value="t.vendor_dispatched_at ? ago(t.vendor_dispatched_at) + ' ago' : '—'" :index="4" />
                        <SdKvRow :icon="Send" label="Chases" :value="chaseSummary" :index="5" />
                        <SdKvRow :icon="Activity" label="Vendor status" :value="t.vendor_status" :index="6" />
                      </div>
                      <div v-else class="tk-edit-grid">
                        <div><label class="tk-il">Vendor name</label><input v-model="vd.vendor_name" class="tk-inp" /></div>
                        <div><label class="tk-il">External ref</label><input v-model="vd.vendor_ticket_ref" class="tk-inp" /></div>
                        <div><label class="tk-il">Waiting on</label><SdSelect v-model="vd.vendor_wait_reason" :options="VENDOR_WAIT_REASONS" /></div>
                        <div><label class="tk-il">Expected back (ETA)</label><input v-model="vd.vendor_due_at" type="datetime-local" class="tk-inp" /></div>
                        <div><label class="tk-il">PO / cost ref</label><input v-model="vd.vendor_po_ref" class="tk-inp" /></div>
                        <div><label class="tk-il">Vendor status</label><input v-model="vd.vendor_status" class="tk-inp" /></div>
                        <div class="tk-form-foot"><button class="tk-mini primary" :disabled="busy" @click="saveVendor">Save</button></div>
                      </div>

                      <!-- quick actions -->
                      <div v-if="isAgent && canCommand && t.status === 'pending_vendor' && !vendorEdit" class="tk-vacts">
                        <button class="tk-vbtn" :disabled="busy" @click="chaseVendor"><Send :size="12" /> Chase vendor</button>
                        <button class="tk-vbtn primary" :disabled="busy" @click="bringBackVendor"><CornerDownLeft :size="12" /> Vendor replied · bring back</button>
                      </div>

                      <!-- vendor reply-log (internal side conversation, hidden from the client) -->
                      <div v-if="vendorReplies.length" class="tk-vlog">
                        <span class="tk-vlog-h sd-mono"><MessageSquare :size="11" /> VENDOR LOG · {{ vendorReplies.length }}</span>
                        <div v-for="c in vendorReplies" :key="c.id" class="tk-vmsg">
                          <span class="tk-vmsg-b">{{ c.body }}</span>
                          <span class="tk-vmsg-t">{{ ago(c.created_at) }} ago · {{ c.author_name }}</span>
                        </div>
                      </div>
                    </section>

                    <!-- Awaiting customer -->
                    <section v-if="t.status === 'pending_customer'" class="tk-panel" style="--i:5">
                      <header class="tk-ph"><h4><BellRing :size="13" /> Awaiting customer</h4>
                        <button v-if="isAgent && canCommand" class="tk-mini primary" @click="openAction('remind')">Send reminder</button></header>
                      <div class="tk-facts">
                        <SdKvRow :icon="MessageSquare" label="Last customer reply" :value="t.last_customer_reply_at ? ago(t.last_customer_reply_at) : 'never'" :index="0" />
                        <SdKvRow :icon="BellRing" label="Reminders sent" :value="t.reminder_count || 0" tone="warn" :index="1" />
                        <SdKvRow :icon="Clock" label="Last reminder" :value="t.last_reminder_at ? ago(t.last_reminder_at) : ''" :index="2" />
                      </div>
                    </section>

                    <!-- Business impact + war-room response (ACK / MTTA / update cadence) -->
                    <section v-if="t.is_major_incident || t.priority === 'critical'" class="tk-panel danger" style="--i:6">
                      <header class="tk-ph"><h4><Siren :size="13" /> Business impact</h4>
                        <button v-if="isAgent && canCommand && !t.acknowledged_at && !isTerminal" class="tk-mini primary" :disabled="busy" @click="ackNow">Acknowledge</button>
                        <button v-if="isAgent && canFlagIncident" class="tk-mini" @click="openAction('incident')">Edit</button></header>
                      <div class="tk-facts">
                        <SdKvRow :icon="Siren" label="Major incident" :value="t.is_major_incident ? 'Yes' : 'No'" :tone="t.is_major_incident ? 'danger' : ''" :index="0" />
                        <SdKvRow :icon="Activity" label="Impact" :value="t.business_impact" tone="danger" :index="1" />
                        <SdKvRow :icon="Users" label="Affected users" :value="t.affected_users ?? ''" :index="2" />
                        <SdKvRow :icon="Banknote" label="Revenue impact" :value="t.revenue_impact" :index="3" />
                        <SdKvRow :icon="BadgeCheck" label="Acknowledged" full :tone="t.acknowledged_at ? 'good' : (isTerminal ? '' : 'danger')" :index="4">
                          <b v-if="t.acknowledged_at">{{ t.acknowledged_by_name || 'Responder' }} · {{ ago(t.acknowledged_at) }}{{ mttaText ? ' · MTTA ' + mttaText : '' }}</b>
                          <b v-else>{{ isTerminal ? '—' : 'Awaiting responder ACK' }}</b>
                        </SdKvRow>
                        <SdKvRow v-if="t.next_update_due_at && !isTerminal" :icon="BellRing" label="Next update" :tone="updateOverdue ? 'danger' : 'warn'" :index="5">
                          <b>{{ cadenceText }}{{ t.update_interval_minutes ? ` · every ${t.update_interval_minutes}m` : '' }}</b>
                        </SdKvRow>
                        <SdKvRow v-if="t.last_status_update_at" :icon="MessageSquare" label="Last update" :value="ago(t.last_status_update_at)" :index="6" />
                        <SdKvRow v-if="t.war_room_url" :icon="Video" label="War room" full :index="7"><a :href="t.war_room_url" target="_blank">{{ t.war_room_url }}</a></SdKvRow>
                      </div>
                    </section>

                    <!-- RCA -->
                    <section v-if="t.sla_resolution_breached || t.sla_response_breached || t.rca_summary || (isAgent && isTerminal)" class="tk-panel" style="--i:7">
                      <header class="tk-ph"><h4><FileSearch :size="13" /> Root-cause analysis</h4>
                        <button v-if="isAgent && canCommand" class="tk-mini" @click="openRca">{{ t.rca_summary ? 'Edit' : 'Record' }}</button></header>
                      <div v-if="t.rca_summary || t.breach_reason" class="tk-rca">
                        <p v-if="t.breach_reason"><b>Reason:</b> {{ t.breach_reason }}</p>
                        <p v-if="t.rca_summary"><b>Root cause:</b> {{ t.rca_summary }}</p>
                        <p v-if="t.rca_corrective"><b>Corrective:</b> {{ t.rca_corrective }}</p>
                        <p v-if="t.rca_preventive"><b>Preventive:</b> {{ t.rca_preventive }}</p>
                      </div>
                      <p v-else class="tk-form-note">No RCA recorded yet.</p>
                    </section>

                    <!-- Escalation (tier, routing + the eMTTA response gate) -->
                    <section v-if="t.is_escalated || t.escalation_level" class="tk-panel" style="--i:8">
                      <header class="tk-ph"><h4><Flame :size="13" /> Escalation</h4>
                        <button v-if="isAgent && canCommand && t.is_escalated && !t.escalation_acknowledged_at && !isTerminal" class="tk-mini primary" :disabled="busy" @click="ackEscalationNow">Acknowledge</button></header>
                      <div class="tk-facts">
                        <SdKvRow :icon="Flame" label="Level" :value="`L${t.escalation_level}`" tone="warn" :index="0" />
                        <SdKvRow :icon="Clock" label="Escalated" :value="t.escalated_at ? ago(t.escalated_at) : ''" :index="1" />
                        <SdKvRow v-if="t.escalation_type" :icon="ArrowRightLeft" label="Type" :value="cap(t.escalation_type)" :index="2" />
                        <SdKvRow v-if="t.escalated_to_team_name" :icon="Users" label="Routed to" :value="t.escalated_to_team_name" :index="3" />
                        <SdKvRow v-if="t.is_escalated" :icon="BadgeCheck" label="Response" full :tone="t.escalation_acknowledged_at ? 'good' : (escResponseOverdue ? 'danger' : 'warn')" :index="4">
                          <b v-if="t.escalation_acknowledged_at">Acknowledged · {{ t.escalation_acknowledged_by_name || 'Senior' }} · {{ ago(t.escalation_acknowledged_at) }}</b>
                          <b v-else>{{ escResponseText }}</b>
                        </SdKvRow>
                        <SdKvRow v-if="t.escalation_reason" :icon="Info" label="Reason" :value="t.escalation_reason" full :index="5" />
                      </div>
                    </section>

                    <!-- SLA timings -->
                    <section class="tk-panel" style="--i:9">
                      <header class="tk-ph"><h4><Timer :size="13" /> SLA timings</h4>
                        <span class="tk-state-pills">
                          <SdPill v-if="t.sla_response_state" kind="sla" :value="t.sla_response_state" title="Response" />
                          <SdPill v-if="t.sla_resolution_state" kind="sla" :value="t.sla_resolution_state" title="Resolution" />
                        </span>
                      </header>
                      <div class="tk-facts">
                        <SdKvRow :icon="Timer" label="Response due" mono :tone="t.sla_response_breached ? 'danger' : ''" :index="0"><b :class="{ breach: t.sla_response_breached }">{{ fmt(t.response_due_at) }}</b></SdKvRow>
                        <SdKvRow :icon="MessageSquare" label="First responded" :value="fmt(t.first_responded_at)" mono :index="1" />
                        <SdKvRow :icon="Gauge" label="Resolution due" mono :tone="t.sla_resolution_breached ? 'danger' : ''" :index="2"><b :class="{ breach: t.sla_resolution_breached }">{{ fmt(t.resolution_due_at) }}</b></SdKvRow>
                        <SdKvRow :icon="CircleCheck" label="Resolved" :value="fmt(t.resolved_at)" mono :index="3" />
                        <SdKvRow :icon="Clock" label="Created" :value="fmt(t.created_at)" mono :index="4" />
                        <SdKvRow v-if="t.closed_at" :icon="Lock" label="Closed" :value="fmt(t.closed_at)" mono :index="5" />
                        <SdKvRow v-if="t.status === 'on_hold'" :icon="Pause" label="On hold" full tone="warn" :index="6"><b>{{ holdReasonLabel(t.hold_reason_code) }}{{ t.hold_reason ? ' — ' + t.hold_reason : '' }}{{ (t.auto_resume_at || t.hold_until) ? ' · auto-resumes ' + fmt(t.auto_resume_at || t.hold_until) : ' · no release date' }}{{ t.hold_review_count ? ` · ${t.hold_review_count} review(s)` : '' }}{{ t.hold_stale ? ' · REVIEW DUE' : '' }}</b></SdKvRow>
                        <SdKvRow v-if="pausedInfo" :icon="Pause" label="SLA clock" full :tone="pausedInfo.frozen ? 'warn' : ''" :index="7"><b>{{ pausedInfo.frozen ? 'Paused' : 'Resumed' }} · {{ pausedInfo.text }}</b></SdKvRow>
                      </div>
                    </section>

                    <!-- Attachments & links -->
                    <section v-if="(t.attachments && t.attachments.length) || hasLinks || t.merged_into_id" class="tk-panel" style="--i:10">
                      <header class="tk-ph"><h4><Paperclip :size="13" /> Attachments &amp; links</h4></header>
                      <SdAttachments v-if="t.attachments && t.attachments.length" :attachments="t.attachments" />
                      <div v-if="hasLinks || t.merged_into_id" class="tk-links">
                        <span v-if="t.linked_problem_id" class="tk-link-chip"><Bug :size="11" /> Problem</span>
                        <span v-if="t.linked_change_id" class="tk-link-chip"><GitPullRequest :size="11" /> Change</span>
                        <span v-if="t.links && t.links.task_id" class="tk-link-chip"><ListPlus :size="11" /> Task</span>
                        <span v-if="t.merged_into_id" class="tk-link-chip"><GitMerge :size="11" /> Merged</span>
                      </div>
                    </section>
                  </template>

                  <!-- ═══ ACTIVITY ═══ -->
                  <template v-else>
                    <div v-if="reversedActivities.length" class="tk-timeline">
                      <div v-for="(a, i) in reversedActivities" :key="a.id" class="tk-tl-row" :class="{ head: i === 0 }" :style="{ '--i': i }">
                        <span class="tk-tl-node" :class="actTone(a.action)"><component :is="actIcon(a.action)" :size="12" /></span>
                        <div class="tk-tl-body">
                          <div class="tk-tl-head"><b>{{ actLabel(a.action) }}</b><i>{{ ago(a.created_at) }}</i></div>
                          <p v-if="actDetail(a)" class="tk-tl-detail">{{ actDetail(a) }}</p>
                          <span class="tk-tl-by">{{ a.actor_name || 'System' }}</span>
                        </div>
                      </div>
                    </div>
                    <p v-else class="tk-empty">No activity yet.</p>
                  </template>

                </Motion>
                <p v-if="err" class="tk-error"><AlertTriangle :size="13" /> {{ err }}</p>
              </div>
              </div><!-- /.tkd-ctx -->

              <!-- ░░ CONVERSATION PANE — ONE source of truth: a tab when collapsed, the right pane when expanded ░░ -->
              <section class="tk-convo" v-show="expanded || activeTab === 'conversation'">
                <header v-if="expanded" class="tk-convo-head"><MessageSquare :size="14" /> Conversation<span v-if="msgCount" class="tk-tab-n">{{ msgCount }}</span></header>
                <div class="thread">
                  <div v-if="t.description" class="msg requester" style="--i:0">
                    <span class="msg-ava req">{{ initials(t.raised_by_name || t.contact_name || 'R') }}</span>
                    <div class="msg-bubble">
                      <div class="msg-head"><strong>{{ requesterIsMe ? 'You' : (t.raised_by_name || t.contact_name || 'Requester') }}</strong><span>opened this ticket</span><i class="msg-time">{{ ago(t.created_at) }}</i></div>
                      <p class="msg-body">{{ t.description }}</p>
                      <SdAttachments v-if="(t.attachments || []).length" :attachments="t.attachments" compact />
                    </div>
                  </div>
                  <div v-for="(c, ci) in (t.comments || [])" :key="c.id" class="msg" :class="msgClass(c)" :style="{ '--i': ci + 1 }">
                    <span class="msg-ava" :class="{ staff: c.author_kind === 'staff', sys: c.author_kind === 'system' }">{{ msgAva(c) }}</span>
                    <div class="msg-bubble" :class="{ note: c.is_internal, redacted: c.is_redacted }">
                      <div class="msg-head">
                        <strong>{{ msgWho(c) }}</strong>
                        <span v-if="c.is_internal" class="note-tag"><Lock :size="9" /> internal</span>
                        <span v-if="c.is_redacted" class="note-tag redact"><EyeOff :size="9" /> redacted</span>
                        <i class="msg-time">{{ ago(c.created_at) }}</i>
                        <button v-if="canRedact(c)" class="msg-redact" title="Redact this message" @click="openRedact(c)"><EyeOff :size="11" /></button>
                      </div>
                      <p class="msg-body" :class="{ 'is-redacted': c.is_redacted }">{{ c.body }}</p>
                      <p v-if="c.is_redacted && c.redacted_reason" class="msg-redact-why">Reason: {{ c.redacted_reason }}</p>
                      <SdAttachments v-if="(c.attachments || []).length" :attachments="c.attachments" compact />
                    </div>
                  </div>
                  <p v-if="!t.description && !(t.comments || []).length" class="tk-empty">No messages yet.</p>
                </div>

                <!-- CSAT (requester · terminal) -->
                <div v-if="canRate" ref="rateRef" class="csat">
                  <p class="csat-q"><Star :size="14" /> How was your support experience?</p>
                  <div class="stars">
                    <button v-for="n in 5" :key="n" type="button" :class="{ lit: n <= (rating || hoverStar) }"
                      @click="rating = n" @mouseenter="hoverStar = n" @mouseleave="hoverStar = 0"><Star :size="26" /></button>
                  </div>
                  <textarea v-model="csatComment" rows="2" class="tk-inp" placeholder="Tell us more (optional)…" />
                  <Motion as="button" class="tk-btn primary" :whileTap="{ scale: 0.96 }" :disabled="busy || !rating" @click="submitRating"><Check :size="14" /> Submit rating</Motion>
                </div>
                <div v-else-if="t.csat_score" class="csat-done"><CircleCheck :size="15" /> Rated {{ t.csat_score }}/5<span v-if="t.csat_comment"> — “{{ t.csat_comment }}”</span></div>

                <!-- composer -->
                <div v-if="canReply" ref="composerRef" class="composer" :class="{ internal: commentInternal }">
                  <textarea v-model="commentBody" rows="3" :placeholder="commentInternal ? 'Add an internal note (team-only)…' : (role === 'requester' ? 'Write a reply…' : 'Reply to the requester…')" />
                  <div class="composer-foot">
                    <label v-if="canWork" class="cf-chk" :class="{ on: commentInternal }"><input type="checkbox" v-model="commentInternal" hidden /><Lock :size="11" /> Internal note</label>
                    <span v-else class="cf-hint"><Headset :size="12" /> Support is notified instantly</span>
                    <Motion as="button" class="tk-btn primary sm" :whileTap="{ scale: 0.95 }" :disabled="busy || !commentBody.trim()" @click="sendComment"><Send :size="13" /> {{ commentInternal ? 'Add note' : 'Reply' }}</Motion>
                  </div>
                </div>
              </section>
            </div>

            <!-- ░░ STICKY ACTION DOCK ░░ -->
            <footer class="tkd-foot">
              <!-- "more" agent menu -->
              <Presence>
                <Motion v-if="form === 'more'" class="tk-more"
                  :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: 12 }" :transition="{ duration: 0.24 }">
                  <button v-if="canMoveTo('in_progress')" class="tk-more-item" @click="openMove('in_progress')"><PlayCircle :size="14" /> Move to In Progress</button>
                  <button v-if="canMoveTo('pending_customer')" class="tk-more-item" @click="openMove('pending_customer')"><Hourglass :size="14" /> Move to Pending Customer</button>
                  <button v-if="canMoveTo('pending_vendor')" class="tk-more-item" @click="openMove('pending_vendor')"><Truck :size="14" /> Dispatch to vendor</button>
                  <span v-if="canMoveTo('in_progress') || canMoveTo('pending_customer') || canMoveTo('pending_vendor')" class="tk-more-sep" />
                  <button v-if="canReassign" class="tk-more-item" @click="openAction('route')"><ArrowRightLeft :size="14" /> Reassign / hand off</button>
                  <button v-if="canNudge" class="tk-more-item" :disabled="busy" @click="doNudgeOwner"><BellRing :size="14" /> Nudge the owner</button>
                  <button v-if="!isTerminal && canCommand" class="tk-more-item" @click="openAction('remind')"><BellRing :size="14" /> Send reminder</button>
                  <button v-if="canFlagIncident" class="tk-more-item" @click="openAction('incident')"><Siren :size="14" /> {{ t.is_major_incident ? 'Update incident' : 'Flag major incident' }}</button>
                  <button v-if="canPostUpdate" class="tk-more-item" @click="openForm('update')"><MessageSquare :size="14" /> Post stakeholder update</button>
                  <!-- Incident-command verbs (Fault Grid parity — the drawer is a full command surface) -->
                  <template v-if="canIncidentCommand">
                    <span class="tk-more-sep" />
                    <button v-if="!isTerminal" class="tk-more-item" @click="openRoles"><Crown :size="14" /> Staff response roster</button>
                    <button v-if="!isTerminal" class="tk-more-item" @click="openIncModal('decision')"><Gavel :size="14" /> Log command decision</button>
                    <button class="tk-more-item" @click="openIncModal('impact')"><Gauge :size="14" /> Impact detail / blast radius</button>
                    <button v-if="!isTerminal || t.parent_incident_id" class="tk-more-item" @click="openIncModal('link')">
                      <Link2 :size="14" /> {{ t.parent_incident_id ? 'Master incident link' : 'Roll under master incident' }}</button>
                    <button class="tk-more-item" :disabled="busy" @click="draftPir"><FileCheck2 :size="14" /> Open post-incident review</button>
                  </template>
                  <button v-if="canCommand" class="tk-more-item" @click="openRca"><FileSearch :size="14" /> Record RCA</button>
                  <span v-if="canCommand && !isArchived" class="tk-more-sep" />
                  <button v-if="canCommand && !isArchived" class="tk-more-item" @click="openForm('time')"><Timer :size="14" /> Log time worked</button>
                  <button v-if="canMerge" class="tk-more-item" @click="openForm('merge')"><GitMerge :size="14" /> Merge into another ticket</button>
                  <button v-if="canFollowUp" class="tk-more-item" @click="openForm('followup')"><GitPullRequest :size="14" /> Create follow-up ticket</button>
                  <button v-if="canPromoteKb" class="tk-more-item" :disabled="busy" @click="promoteKb"><Sparkles :size="14" /> Promote to knowledge base</button>
                  <!-- Owner-tier gated: /tickets/{id}/to-task requires the actor tier server-side -->
                  <button v-if="canCommand" class="tk-more-item" :disabled="busy || !!t.links?.task_id" @click="createTaskFromTicket">
                    <ListPlus :size="14" /> {{ t.links?.task_id ? 'Task already created' : 'Create task' }}
                  </button>
                  <!-- Superuser governance: re-home a mis-filed ticket to the right requester -->
                  <template v-if="isAdminCap">
                    <span class="tk-more-sep" />
                    <button class="tk-more-item" @click="openChangeRequester"><Contact :size="14" /> Change requester</button>
                  </template>
                  <button v-if="!isArchived && canCommand" class="tk-more-item danger" @click="openDelete"><Archive :size="14" /> Archive ticket</button>
                  <button v-else-if="isArchived && canCommand" class="tk-more-item" :disabled="busy" @click="doRestore"><ArchiveRestore :size="14" /> Restore from archive</button>
                </Motion>

                <!-- mini-form popovers (log time / merge / follow-up / stakeholder update) -->
                <Motion v-if="MINI_FORMS.includes(form)" class="tk-more tk-mform"
                  :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: 12 }" :transition="{ duration: 0.24 }">
                  <!-- LOG TIME -->
                  <template v-if="form === 'time'">
                    <p class="tk-mf-h"><Timer :size="13" /> Log time on {{ t.ticket_number }}</p>
                    <div class="tk-mf-row">
                      <input v-model.number="timeMinutes" type="number" min="1" max="10000" class="tk-inp" placeholder="Minutes" style="max-width: 110px" />
                      <input v-model="timeNote" class="tk-inp" placeholder="What was the work? (optional)" />
                    </div>
                    <div class="tk-mf-foot">
                      <button class="tk-mini" @click="form = null">Cancel</button>
                      <button class="tk-mini primary" :disabled="busy || !(timeMinutes >= 1)" @click="doLogTime">Log {{ timeMinutes >= 1 ? fmtMins(Math.round(timeMinutes)) : 'time' }}</button>
                    </div>
                    <p class="tk-mf-note">Adds to the effort record — {{ fmtMins(t.time_spent_minutes) }} logged so far.</p>
                  </template>
                  <!-- MERGE -->
                  <template v-else-if="form === 'merge'">
                    <p class="tk-mf-h"><GitMerge :size="13" /> Merge {{ t.ticket_number }} into a master</p>
                    <div class="tk-mf-row"><Search :size="13" class="tk-mf-ico" /><input v-model="mergeQuery" class="tk-inp" placeholder="Search ticket # or subject…" @input="searchMerge" /></div>
                    <div v-if="mergeResults.length" class="tk-mf-list">
                      <button v-for="m in mergeResults" :key="m.id" class="tk-mf-item" :class="{ on: mergeTarget && mergeTarget.id === m.id }" @click="mergeTarget = m">
                        <b class="sd-mono">{{ m.ticket_number }}</b><span>{{ m.subject }}</span><SdPill kind="status" :value="m.status" />
                      </button>
                    </div>
                    <p v-else-if="mergeQuery.trim() && !mergeSearching" class="tk-mf-note">No candidates found.</p>
                    <input v-model="mergeComment" class="tk-inp" placeholder="Merge note (optional)" />
                    <div class="tk-mf-foot">
                      <button class="tk-mini" @click="form = null">Cancel</button>
                      <button class="tk-mini primary" :disabled="busy || !mergeTarget" @click="doMerge">Merge into {{ mergeTarget?.ticket_number || '…' }}</button>
                    </div>
                    <p class="tk-mf-note">This ticket closes as a duplicate; its story is cross-noted onto the master.</p>
                  </template>
                  <!-- FOLLOW-UP -->
                  <template v-else-if="form === 'followup'">
                    <p class="tk-mf-h"><GitPullRequest :size="13" /> Follow-up on {{ t.ticket_number }}</p>
                    <input v-model="fuSubject" class="tk-inp" maxlength="200" placeholder="Subject" />
                    <textarea v-model="fuDesc" rows="3" class="tk-inp" placeholder="What still needs doing? (required)" />
                    <label class="cf-chk" :class="{ on: fuAssignMe }"><input type="checkbox" v-model="fuAssignMe" hidden /><UserCheck :size="11" /> Assign it to me</label>
                    <div class="tk-mf-foot">
                      <button class="tk-mini" @click="form = null">Cancel</button>
                      <button class="tk-mini primary" :disabled="busy || fuDesc.trim().length < 3" @click="doFollowUp">Create follow-up</button>
                    </div>
                    <p class="tk-mf-note">A closed record is immutable — the follow-up continues its story on a fresh SLA.</p>
                  </template>
                  <!-- STAKEHOLDER UPDATE -->
                  <template v-else-if="form === 'update'">
                    <p class="tk-mf-h"><Siren :size="13" /> Stakeholder update · {{ t.ticket_number }}</p>
                    <textarea v-model="updBody" rows="3" class="tk-inp" placeholder="What do stakeholders need to know right now?" />
                    <div class="tk-mf-row">
                      <label class="cf-chk" :class="{ on: updInternal }"><input type="checkbox" v-model="updInternal" hidden /><Lock :size="11" /> Internal only</label>
                      <SdSelect v-model="updCadence" :options="CADENCE_OPTS" style="flex: 1" />
                    </div>
                    <div class="tk-mf-foot">
                      <button class="tk-mini" @click="form = null">Cancel</button>
                      <button class="tk-mini primary" :disabled="busy || updBody.trim().length < 2" @click="doPostUpdate">Post update</button>
                    </div>
                    <p class="tk-mf-note">Lands on the timeline and re-arms the promised-update timer the overdue sweep watches.</p>
                  </template>
                  <!-- REDACT COMMENT (superuser) -->
                  <template v-else-if="form === 'redact'">
                    <p class="tk-mf-h"><EyeOff :size="13" /> Redact message from {{ redactTarget?.author_name || 'author' }}</p>
                    <p class="tk-mf-quote">“{{ (redactTarget?.body || '').slice(0, 140) }}{{ (redactTarget?.body || '').length > 140 ? '…' : '' }}”</p>
                    <input v-model="redactReason" class="tk-inp" maxlength="300" placeholder="Why is this being redacted? (required)" />
                    <div class="tk-mf-foot">
                      <button class="tk-mini" @click="form = null">Cancel</button>
                      <button class="tk-mini danger" :disabled="busy || redactReason.trim().length < 3" @click="doRedact">Redact permanently</button>
                    </div>
                    <p class="tk-mf-note">Irreversible — the text and any attachments are destroyed. Who/when/why stay on the audit trail.</p>
                  </template>
                  <!-- CHANGE REQUESTER (superuser) -->
                  <template v-else-if="form === 'requester'">
                    <p class="tk-mf-h"><Contact :size="13" /> Change requester · {{ t.ticket_number }}</p>
                    <div class="tk-mf-row"><Search :size="13" class="tk-mf-ico" /><input v-model="reqQuery" class="tk-inp" placeholder="Search employee by name or email…" @input="searchRequester" /></div>
                    <div v-if="reqResults.length" class="tk-mf-list">
                      <button v-for="p in reqResults" :key="p.id" class="tk-mf-item" :class="{ on: reqTarget && reqTarget.id === p.id }" @click="reqTarget = p">
                        <b>{{ p.name }}</b><span>{{ p.email }}</span>
                      </button>
                    </div>
                    <p v-else-if="reqQuery.trim() && !reqSearching" class="tk-mf-note">No matching employees.</p>
                    <input v-model="reqReason" class="tk-inp" placeholder="Reason (optional)" />
                    <div class="tk-mf-foot">
                      <button class="tk-mini" @click="form = null">Cancel</button>
                      <button class="tk-mini primary" :disabled="busy || !reqTarget" @click="doChangeRequester">Re-home to {{ reqTarget?.name || '…' }}</button>
                    </div>
                    <p class="tk-mf-note">Moves visibility, notifications and the reopen right to the new requester. Both parties are notified.</p>
                  </template>
                </Motion>
              </Presence>

              <!-- action dock -->
              <div class="tk-dock">
                <!-- ARCHIVED (Deep Storage) — the tombstone is read-only; Restore is the way back -->
                <template v-if="role === 'agent' && isArchived">
                  <Motion v-if="canCommand" as="button" class="tk-act good" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" :disabled="busy" @click="doRestore">
                    <ArchiveRestore :size="14" /> Restore to circulation
                  </Motion>
                  <span v-else class="tk-act" style="cursor: default; opacity: .8"><Lock :size="14" /> {{ t.assigned_agent_name || 'A teammate' }} owns this record — ask them or the team lead</span>
                  <span v-if="t.legal_hold" class="tk-act" style="cursor: default; color: var(--sd-arc-hold, #eab308); border-color: color-mix(in srgb, var(--sd-arc-hold, #eab308) 50%, transparent);">
                    <Scale :size="14" /> Legal hold — superuser releases
                  </span>
                </template>
                <!-- AGENT -->
                <template v-else-if="role === 'agent'">
                  <!-- Teammate view: a colleague's assigned ticket is read + reply only — the
                       sanctioned transfer paths are claim (unassigned) / handoff / team lead. -->
                  <span v-if="!canCommand" class="tk-act" style="cursor: default; opacity: .8"><Lock :size="14" /> {{ t.assigned_agent_name || 'A teammate' }} owns this — reply, or ask the team lead</span>
                  <Motion v-if="canCommand && !isMine && !isTerminal" as="button" class="tk-act" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="openAction('assign')"><UserCheck :size="14" /> Assign me</Motion>
                  <Motion v-if="canCommand && !isTerminal && !t.is_escalated" as="button" class="tk-act warn" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="tryEscalate"><Flame :size="14" /> Escalate</Motion>
                  <Motion v-if="canCommand && t.is_escalated" as="button" class="tk-act" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="openAction('deescalate')"><ChevronDown :size="14" /> De-escalate</Motion>
                  <Motion v-if="canHold" as="button" class="tk-act" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="openAction('hold')"><Pause :size="14" /> Hold</Motion>
                  <Motion v-if="canCommand && t.status === 'on_hold'" as="button" class="tk-act" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="openAction('resume')"><Play :size="14" /> Resume</Motion>
                  <Motion v-if="canCommand && t.status === 'on_hold'" as="button" class="tk-act" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="openAction('hold-extend')"><CalendarClock :size="14" /> Extend</Motion>
                  <Motion v-if="canCommand && !isTerminal" as="button" class="tk-act good" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="tryResolve"><CircleCheck :size="14" /> Resolve</Motion>
                  <Motion v-if="canCommand && t.status !== 'closed'" as="button" class="tk-act" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="tryClose"><Lock :size="14" /> Close</Motion>
                  <!-- a merged tombstone never reopens — the master carries the story (backend 409s too) -->
                  <Motion v-if="canCommand && isTerminal && !t.merged_into_id" as="button" class="tk-act" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="openAction('reopen')"><RotateCcw :size="14" /> Reopen</Motion>
                  <Motion as="button" class="tk-act" :class="{ on: form === 'more' }" :whileTap="{ scale: 0.96 }" @click="form = form === 'more' ? null : 'more'"><MoreHorizontal :size="14" /> More</Motion>
                </template>
                <!-- WORKER (can work, not a full agent) -->
                <template v-else-if="role === 'worker'">
                  <Motion v-if="!isTerminal" as="button" class="tk-act primary" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="goReply"><CornerDownLeft :size="14" /> Reply</Motion>
                  <Motion v-if="!isTerminal && canCommand" as="button" class="tk-act" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="openAction('route')"><UserCheck :size="14" /> Route</Motion>
                  <Motion v-if="canCommand" as="button" class="tk-act" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="openAction('collab')"><UsersRound :size="14" /> People</Motion>
                  <Motion v-if="!isTerminal && canCommand" as="button" class="tk-act good" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="resolveOpen = true"><CircleCheck :size="14" /> Resolve</Motion>
                  <Motion v-if="t.status === 'resolved'" as="button" class="tk-act" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="openAction('reopen')"><RotateCcw :size="14" /> Reopen</Motion>
                </template>
                <!-- REQUESTER -->
                <template v-else>
                  <Motion v-if="!isTerminal" as="button" class="tk-act primary" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="goReply"><CornerDownLeft :size="14" /> Reply</Motion>
                  <Motion v-if="canRequesterEdit" as="button" class="tk-act" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="startEdit"><PenLine :size="14" /> Edit</Motion>
                  <Motion v-if="canWithdraw" as="button" class="tk-act danger" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="withdrawOpen = true"><Ban :size="14" /> Withdraw</Motion>
                  <Motion v-if="t.status === 'resolved'" as="button" class="tk-act" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="openAction('reopen')"><RotateCcw :size="14" /> Reopen</Motion>
                  <Motion v-if="canRate" as="button" class="tk-act good" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="goRate"><Star :size="14" /> Rate</Motion>
                </template>
              </div>
            </footer>
          </template>
        </Motion>
      </Motion>
    </Presence>

    <!-- modals -->
    <SdTicketDeleteModal :open="deleteOpen" :ticket="t" @close="deleteOpen = false" @done="onArchived" />
    <SdResolveModal :open="resolveOpen" :ticket="t" :agent="isAgent" @close="resolveOpen = false" @done="onModalDone" />
    <SdCloseModal :open="closeOpen" :ticket="t" :agent="isAgent" @close="closeOpen = false" @done="onModalDone" />
    <SdWithdrawModal :open="withdrawOpen" :ticket="t" @close="withdrawOpen = false" @done="onModalDone" />
    <SdAgentActionModal :open="actionOpen" :mode="actionMode" :ticket="t" :agent="isAgent" :me="meForModal" @close="actionOpen = false" @done="onActionDone" />
    <!-- RCA routes through the Breached desk's full console (SLA-anatomy evidence + coded
         breach-reason taxonomy) — ONE root-cause surface everywhere, like the escalate console. -->
    <SdRcaConsole :open="rcaOpen" :ticket="t" :now="now" @close="rcaOpen = false" @saved="onRcaSaved" />
    <!-- Incident-command modals — the SAME consoles the Fault Grid sections use, so the
         drawer never forces an agent back to a section to command an incident. -->
    <SdIncRolesModal :open="incModal === 'roles'" :ticket="t"
      @close="incModal = null" @done="onIncDone" />
    <SdIncDecisionModal :open="incModal === 'decision'" :ticket="t"
      @close="incModal = null" @done="onIncDone" />
    <SdIncImpactModal :open="incModal === 'impact'" :ticket="t"
      @close="incModal = null" @done="onIncDone" />
    <SdIncLinkModal :open="incModal === 'link'" :ticket="t"
      @close="incModal = null" @done="onIncDone" />
    <!-- Ultra-modern work-state move (process · people · reason · workflow) — reused from the
         Live Ops board so "Move to In Progress / Pending Customer" carry full context. -->
    <SdFlowMoveModal :open="!!moveTo" :ticket="t" :from="t?.status" :to="moveTo" :agent="isAgent"
      :me="meForModal" :assignees="[]" :now="now" @close="moveTo = null" @done="onMoved" />
    <!-- The SAME corporate escalation console every list surface uses (tier ladder, ITIL
         reassessment, team routing) — not a cut-down escalate form. -->
    <SdEscalateConsole :open="escalateOpen" :ticket="t" :me="meForModal" :assignees="[]" :now="now"
      @close="escalateOpen = false" @done="onEscalated" />
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  X, Send, Flame, RotateCcw, Pause, Play, UserCheck, ChevronDown, MoreHorizontal,
  BellRing, Siren, FileSearch, ListPlus, Pencil, Truck, Timer, Paperclip, Bug,
  GitPullRequest, Star, Archive, CircleCheck, Lock, UsersRound, Plus, Search,
  Hash, Clock, Headset, Layers, Tag, MessageSquare, Info, History, Sparkles,
  ArrowRightLeft, Users, Gauge, Mail, Phone, MapPin, GitMerge, AlertTriangle, Ban, PenLine,
  Shield, UserRound, Inbox, Activity, Check, CornerDownLeft, Loader, Eye,
  Flag, Zap, AlarmClock, Globe, Building2, Contact, BadgeCheck, Banknote, Video,
  Maximize2, Minimize2, PlayCircle, Hourglass, CalendarClock, ArchiveRestore, Scale, EyeOff,
  Crown, Gavel, Link2, FileCheck2,
} from 'lucide-vue-next'
import SdPill from '../components/SdPill.vue'
import SdSelect from '../components/SdSelect.vue'
import SdKvRow from '../components/SdKvRow.vue'
import SdAttachments from '../components/SdAttachments.vue'
import SdFlowMoveModal from '../modals/SdFlowMoveModal.vue'
import SdEscalateConsole from './SdEscalateConsole.vue'
import SdTicketDeleteModal from '../modals/SdTicketDeleteModal.vue'
import SdResolveModal from '../modals/SdResolveModal.vue'
import SdCloseModal from '../modals/SdCloseModal.vue'
import SdWithdrawModal from '../modals/SdWithdrawModal.vue'
import SdAgentActionModal from '../modals/SdAgentActionModal.vue'
import SdRcaConsole from '../modals/SdRcaConsole.vue'
import SdIncRolesModal from '../modals/SdIncRolesModal.vue'
import SdIncDecisionModal from '../modals/SdIncDecisionModal.vue'
import SdIncImpactModal from '../modals/SdIncImpactModal.vue'
import SdIncLinkModal from '../modals/SdIncLinkModal.vue'
import { API_BASE } from '@/utils/api'
import {
  // assign / de-escalate / resume / hold / reopen run through SdAgentActionModal;
  // escalate opens the shared SdEscalateConsole (same as every list surface)
  getTicket, addTicketComment, ticketToTask, updateTicket, markTicketViewed,
  // War-room response: incident ACK (MTTA) + escalation ACK (eMTTA)
  ackTicket, ackEscalation,
  // agent console completeness: worklog, merge, follow-up, KB promote, cadence post,
  // owner nudge, live agent-collision presence, ticket search (merge target picker)
  logTicketTime, mergeTicket, createFollowUpTicket, promoteTicketToKb,
  postStatusUpdate, nudgeTicketOwner, ticketPresence, listTickets,
  // self endpoints
  getMyTicket, replyMyTicket, rateMyTicket, updateMyTicket, listMyCategories,
  // shared
  getMe, loadPickers, usePickers, useCapabilities, fetchCapabilities,
  PRIORITIES, TICKET_TYPES, IMPACT_URGENCY, priorityLabel, typeLabel, priorityColor,
  resolutionLabel, rootCauseLabel, priorityP, SUPPORT_AUTOCLOSE_DAYS,
  // Vendor Relay Station lifecycle
  vendorChase, vendorReply, VENDOR_WAIT_REASONS, vendorReasonLabel,
  // Suspension Dock hold governance
  holdReasonLabel,
  // Deep Storage (Archived desk) — tombstone context + the way back
  restoreTicket, archiveReasonOf, archiveReasonLabel, PURGE_RETENTION_DAYS,
  // Möbius Loop reopen context
  reopenSourceLabel, reopenReasonLabel,
  // Superuser governance — comment redaction + change requester
  redactTicketComment, changeTicketRequester, listTeamPeople,
  // Incident command (Fault Grid verbs — roster/decision/impact modals + PIR + rollup)
  createPir,
} from '@/composables/useSupportDesk'

const props = defineProps({
  ticketId: { type: String, default: null },
  caps: { type: Object, default: null },
  me: { type: Object, default: () => ({ id: null, name: '', email: '' }) },
})
const emit = defineEmits(['close', 'changed'])
const toast = useToast()
const route = useRoute()
const capState = useCapabilities()

/* ── state ── */
const t = ref(null)
const loading = ref(false)
const busy = ref(false)
const err = ref('')
const activeTab = ref('conversation')
const form = ref(null)
const now = ref(Date.now())
let nowTick = null
const fetchedId = ref(null)

// Expanded = "conversation theater": the drawer widens into two panes (context left,
// conversation right). The conversation stops being a tab (it's always shown on the right).
const expanded = ref(false)
const toggleExpand = () => {
  expanded.value = !expanded.value
  if (expanded.value && activeTab.value === 'conversation') activeTab.value = 'details'
}

const bodyRef = ref(null)
const composerRef = ref(null)
const rateRef = ref(null)

const ALL_TABS = [
  { key: 'conversation', label: 'Conversation', icon: MessageSquare },
  { key: 'details', label: 'Details', icon: Info },
  { key: 'activity', label: 'Activity', icon: History },
]
// Expanded → conversation is the right pane, so drop it from the tab strip.
const TABS = computed(() => (expanded.value ? ALL_TABS.filter(x => x.key !== 'conversation') : ALL_TABS))
const IMPACT_OPTS = [{ value: '', label: '—' }, ...IMPACT_URGENCY]

/* ── capability / persona ── */
const myId = computed(() => props.me?.id || fetchedId.value)
// Both /user/support AND /admin/support-desk are AGENT portals → run the full agent
// console on either. (The only requester-facing surface is the deferred client portal
// at /support/portal.) `wantsAgent` decides which API to call; `agentDenied` flips on a
// 403/404 so a genuine non-agent who lands here degrades gracefully instead of blanking.
const onAgentPortal = computed(() => route.path.startsWith('/admin/support-desk') || route.path.startsWith('/user/support'))
const wantsAgent = computed(() => {
  if (onAgentPortal.value) return true
  const c = props.caps
  if (c && c.agent != null) return !!c.agent
  if (c && c.isAgent != null) return !!c.isAgent
  return route.path.startsWith('/admin') || capState.isAgent
})
const agentDenied = ref(false)
const isAgent = computed(() => wantsAgent.value && !agentDenied.value)
const canWork = computed(() => isAgent.value || !!t.value?.viewer_can_work)
const requesterIsMe = computed(() => t.value && myId.value && String(t.value.raised_by_user_id) === String(myId.value))
const role = computed(() => (isAgent.value ? 'agent' : canWork.value ? 'worker' : 'requester'))
const roleMeta = computed(() => ({
  agent: { label: 'Agent console', icon: Shield },
  worker: { label: 'Working', icon: Headset },
  requester: { label: 'Your ticket', icon: UserRound },
}[role.value]))

const isTerminal = computed(() => ['resolved', 'closed'].includes(t.value?.status))
// Deep Storage: an archived tombstone is READ-ONLY here except Restore (and legal-hold
// context). The backend 404s every other mutation on a soft-deleted row.
const isArchived = computed(() => !!(t.value?.is_deleted || t.value?.archived_at))
const isClosed = computed(() => t.value?.status === 'closed')
const isWithdrawn = computed(() => t.value?.status === 'closed' && t.value?.resolution_code === 'cancelled')
const isMine = computed(() => myId.value && String(t.value?.assigned_agent_id) === String(myId.value))
/* OWNER-TIER gate (mirrors the backend actor gate): commanding an ASSIGNED ticket's
   workflow (escalate / move / hold / vendor / resolve / close / reopen / archive) is
   reserved to the assignee, a collaborator, the owning team's LEAD, the assignee's
   manager, or an admin. An UNASSIGNED ticket is team triage — anyone may act (claiming
   formalizes it). A plain teammate keeps read + reply; transfers go through claim/handoff. */
const isCollaborator = computed(() => {
  if (!myId.value || !t.value) return false
  const ids = (t.value.collaborators || t.value.collaborator_people?.map(p => p.user_id || p.id) || []).map(String)
  return ids.includes(String(myId.value))
})
const isLeadHere = computed(() => !!t.value?.team_id && (capState.leadTeamIds || []).includes(String(t.value.team_id)))
const isAdminCap = computed(() => capState.isAdmin || !!props.caps?.is_admin)
const canCommand = computed(() => !!t.value && (
  isAdminCap.value || isMine.value || isCollaborator.value || isLeadHere.value
  || !t.value.assigned_agent_id
  || (capState.isManager && !!t.value.viewer_can_work)))
const canHold = computed(() => t.value && !isTerminal.value && t.value.status !== 'on_hold' && canCommand.value)
/* agent-console completeness gates */
const canReassign = computed(() => isAgent.value && canCommand.value && !isTerminal.value && !isArchived.value)
const canMerge = computed(() => isAgent.value && canCommand.value && !isTerminal.value && !isArchived.value && !t.value?.merged_into_id)
const canFollowUp = computed(() => isAgent.value && isTerminal.value && !isArchived.value && !t.value?.merged_into_id)
const canPromoteKb = computed(() => isAgent.value && isTerminal.value && !isArchived.value && !t.value?.merged_into_id)
const canNudge = computed(() => isAgent.value && !isTerminal.value && !isArchived.value && !!t.value?.assigned_agent_id && !isMine.value)
const canPostUpdate = computed(() => isAgent.value && canCommand.value && !isArchived.value && !!t.value?.is_major_incident)
// A major incident is an active-disruption op — can't DECLARE one on a resolved/closed ticket
// (reopen first; use RCA for the record). Editing an already-major incident stays allowed.
const canFlagIncident = computed(() => (!isTerminal.value || !!t.value?.is_major_incident) && canCommand.value)
const canEditClass = computed(() => (isAgent.value && canCommand.value) || (requesterIsMe.value && t.value?.status === 'open'))
const canRequesterEdit = computed(() => requesterIsMe.value && !isAgent.value && t.value?.status === 'open')
const canWithdraw = computed(() => requesterIsMe.value && !isAgent.value && t.value && !isTerminal.value)
// CSAT is a requester/client affordance — never surface it inside the agent console.
const canRate = computed(() => !isAgent.value && requesterIsMe.value && isTerminal.value && !t.value?.csat_score && !isWithdrawn.value)
const canReply = computed(() => !isTerminal.value && (canWork.value || requesterIsMe.value))
const displayStatus = computed(() => (isWithdrawn.value ? 'closed' : t.value?.status))
const spineColor = computed(() => {
  const s = t.value?.status
  const map = { open: 'var(--sd-st-open)', in_progress: 'var(--sd-st-progress)', pending_customer: 'var(--sd-st-pending)', pending_vendor: 'var(--sd-st-pending)', on_hold: 'var(--sd-st-hold)', escalated: 'var(--sd-st-escalated)', resolved: 'var(--sd-st-resolved)', closed: 'var(--sd-st-closed)' }
  if (t.value?.sla_resolution_breached && !isTerminal.value) return 'var(--sd-danger)'
  return map[s] || 'var(--sd-amber)'
})

/* ── tabs ink ── */
const tabIndex = computed(() => Math.max(0, TABS.value.findIndex(x => x.key === activeTab.value)))
const inkStyle = computed(() => ({ width: `${100 / TABS.value.length}%`, transform: `translateX(${tabIndex.value * 100}%)` }))
const msgCount = computed(() => (t.value?.comments?.length || 0) + (t.value?.description ? 1 : 0))
const activities = computed(() => t.value?.activities || [])
const reversedActivities = computed(() => (t.value?.activities ? [...t.value.activities].reverse() : []))
const collaborators = computed(() => t.value?.collaborator_people || [])
const hasLinks = computed(() => t.value && (t.value.linked_problem_id || t.value.linked_change_id || (t.value.links && t.value.links.task_id)))

/* ── pickers / categories ── */
const pickers = usePickers()
const myCats = ref([])
const catOptions = computed(() => {
  if (isAgent.value) return [{ value: '', label: 'No category' }, ...(pickers.categories || []).map(c => ({ value: c.id, label: c.name }))]
  return [{ value: '', label: 'Uncategorized' }, ...myCats.value.map(c => ({ value: c.id, label: c.name }))]
})
const orgOptions = computed(() => [{ value: '', label: 'No organization' }, ...(pickers.organizations || []).map(o => ({ value: o.id, label: o.name }))])

/* ── staggered section transition (Travel pattern) ── */
const sT = (n) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.42, delay: 0.06 + n * 0.06, ease: [0.16, 1, 0.3, 1] },
})

/* ── helpers ── */
const initials = (n) => ((n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?')
const firstName = (n) => (n || '').trim().split(/\s+/)[0] || ''
const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1).replace(/_/g, ' ') : '')
const clamp = (v) => Math.min(1, Math.max(0, v))
const fmtDur = (ms) => {
  const m = Math.floor(ms / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}
const fmtCountdown = (ms) => {
  const tot = Math.floor(ms / 1000)
  const d = Math.floor(tot / 86400), h = Math.floor((tot % 86400) / 3600), m = Math.floor((tot % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  const s = tot % 60
  return `${m}m ${s}s`
}
const fmtMins = (m) => { if (!m) return '—'; const h = Math.floor(m / 60); const r = m % 60; return h ? `${h}h ${r}m` : `${r}m` }
const fileUrl = (a) => { const u = (a && (a.url || a.file_url || a.path)) || ''; return u.startsWith('http') ? u : (u ? `${API_BASE}${u}` : '#') }
const fmt = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—')

/* SLA stop-the-clock — banked paused time + a live freeze while parked/awaiting a reply */
const pausedInfo = computed(() => {
  const x = t.value
  if (!x) return null
  const banked = Number(x.sla_paused_ms || 0)
  const since = x.sla_paused_since ? new Date(x.sla_paused_since).getTime() : null
  if (!since && banked <= 0) return null
  const total = banked + (since ? Math.max(0, now.value - since) : 0)
  return {
    frozen: !!since,
    text: since ? `Clock frozen — ${fmtDur(total)} not counted yet`
                : `${fmtDur(banked)} not counted · deadlines extended`,
  }
})
const ago = (iso) => {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

/* ── banner ── */
const banner = computed(() => {
  const x = t.value; if (!x) return null
  if (isArchived.value) {
    // Deep-storage context strip — who shelved it, why, and what retention says next.
    const bits = ['In deep storage']
    if (x.archived_at) bits.push(`archived ${ago(x.archived_at)}`)
    bits.push(`by ${x.archived_by_name || 'System'}`)
    const code = archiveReasonOf(x)
    if (code && code !== 'uncoded') bits.push(`· ${archiveReasonLabel(code).toLowerCase()}`)
    if (x.legal_hold) bits.push('· ⚖ legal hold — retention suspended')
    else if (x.purge_eligible) bits.push('· PURGE-ELIGIBLE (superuser may destroy it)')
    else if (x.purge_eligible_at || x.archived_at) {
      const e = x.purge_eligible_at ? new Date(x.purge_eligible_at).getTime()
        : new Date(x.archived_at).getTime() + PURGE_RETENTION_DAYS * 86400000
      const dd = Math.max(0, Math.floor((e - now.value) / 86400000))
      bits.push(`· purge-eligible in ${dd}d`)
    }
    return { key: 'arc', tone: 'hold', icon: Archive, text: bits.join(' ') }
  }
  if (isWithdrawn.value) return { key: 'wd', tone: 'neutral', icon: Ban, text: 'Withdrawn — kept in history. Support can reopen it.' }
  if (x.status === 'on_hold') {
    const why = x.hold_reason_code ? holdReasonLabel(x.hold_reason_code) : (x.hold_reason || '')
    const rel = x.auto_resume_at || x.hold_until
    return { key: 'hold', tone: 'hold', icon: Pause, text: `On hold${why ? ' — ' + why : ''}${rel ? ' · auto-resumes ' + fmt(rel) : ''}${x.hold_stale ? ' · review due' : ''}` }
  }
  if (x.status === 'resolved' && x.resolved_at) {
    const diff = new Date(x.resolved_at).getTime() + SUPPORT_AUTOCLOSE_DAYS * 86400000 - now.value
    const dd = Math.floor(Math.max(0, diff) / 86400000), hh = Math.floor((Math.max(0, diff) % 86400000) / 3600000)
    return { key: 'res', tone: 'good', icon: CircleCheck, text: `Resolved${x.resolution_code && !isWithdrawn.value ? ' (' + resolutionLabel(x.resolution_code) + ')' : ''} — auto-closes in ${diff <= 0 ? 'moments' : (dd > 0 ? dd + 'd ' + hh + 'h' : hh + 'h')} unless reopened.` }
  }
  if (x.status === 'closed') return { key: 'cl', tone: 'neutral', icon: Lock, text: 'This ticket is closed.' }
  if (x.is_major_incident) return { key: 'major', tone: 'major', icon: Siren, text: `Major incident${x.business_impact ? ' · ' + x.business_impact + ' impact' : ''}` }
  if (x.sla_resolution_breached) return { key: 'breach', tone: 'breach', icon: Timer, text: 'SLA breached — resolution past target.' }
  if (x.status === 'pending_customer') return { key: 'pending', tone: 'pending', icon: BellRing, text: `Awaiting customer · ${x.reminder_count || 0} reminders sent` }
  if (x.reopened_count) {
    // Reopen context (Möbius Loop desk): the failed fix rides with the ticket — read it
    // before re-fixing. A FRESH re-resolution clock was re-armed on the reopen.
    const bits = [`Reopened ×${x.reopened_count}`]
    if (x.reopen_source) bits.push(`by ${reopenSourceLabel(x.reopen_source).toLowerCase()}`)
    if (x.reopen_reason_code) bits.push(`(${reopenReasonLabel(x.reopen_reason_code).toLowerCase()})`)
    const prev = x.prev_resolution_code ? ` — prior fix “${String(x.prev_resolution_code).replace(/_/g, ' ')}” didn't hold` : ''
    return { key: 'reopen', tone: 'pending', icon: RotateCcw, text: `${bits.join(' ')}${prev} · fresh resolution clock running` }
  }
  return null
})
const reopenFlagTitle = computed(() => {
  const x = t.value; if (!x?.reopened_count) return ''
  const bits = [`Reopened ${x.reopened_count}×`]
  if (x.reopen_source) bits.push(`last by ${reopenSourceLabel(x.reopen_source)}`)
  if (x.last_reopened_at) bits.push(`on ${fmt(x.last_reopened_at)}`)
  if (x.reopen_reason_code) bits.push(`verdict: ${reopenReasonLabel(x.reopen_reason_code)}`)
  if (x.prev_resolution_summary) bits.push(`failed fix: ${x.prev_resolution_summary}`)
  return bits.join(' · ')
})

/* ── SLA frontier meters (live) ── */
const createdMs = computed(() => (t.value?.created_at ? new Date(t.value.created_at).getTime() : null))
const meterFor = (name, key, dueIso, doneIso, breachedFlag) => {
  if (doneIso || isTerminal.value) return { name, key, p: 1, tone: 'met', label: '✓ met' }
  const due = dueIso ? new Date(dueIso).getTime() : null
  if (!due) return { name, key, p: 0.03, tone: 'none', label: 'no target' }
  const start = createdMs.value || (due - 86400000)
  const p = clamp((now.value - start) / (due - start))
  const overdue = breachedFlag || now.value > due
  const tone = overdue ? 'breach' : (p > 0.8 ? 'warn' : 'ok')
  return { name, key, p, tone, label: (overdue ? '-' : '') + fmtDur(Math.abs(due - now.value)) + (overdue ? ' over' : ' left') }
}
const slaMeters = computed(() => {
  const x = t.value; if (!x) return []
  return [
    meterFor('Response', 'resp', x.response_due_at, x.first_responded_at, x.sla_response_breached),
    meterFor('Resolution', 'res', x.resolution_due_at, x.resolved_at, x.sla_resolution_breached),
  ]
})

/* ── SLA verdict flags (Met / Breached / Overdue / Due-soon / On-track / No-target) ── */
const slaFlagFor = (name, key, breached, dueIso, doneIso) => {
  // Keep meta SHORT + relative ("19h over", "3h left", "15h ago") — long absolute dates
  // overflow the narrow flag card. Met-on-time → no meta (the ✓ state says it all).
  const overStr = dueIso ? fmtDur(Math.abs(now.value - new Date(dueIso).getTime())) + ' over' : ''
  if (breached) return { key, name, tone: 'breach', state: 'Breached', icon: AlertTriangle, meta: doneIso ? ago(doneIso) : overStr }
  if (doneIso) return { key, name, tone: 'met', state: 'Met', icon: CircleCheck, meta: ago(doneIso) }
  if (isTerminal.value) return { key, name, tone: 'met', state: 'Met', icon: CircleCheck, meta: '' }
  if (!dueIso) return { key, name, tone: 'none', state: 'No target', icon: Gauge, meta: '' }
  const rem = new Date(dueIso).getTime() - now.value
  if (rem < 0) return { key, name, tone: 'breach', state: 'Overdue', icon: AlertTriangle, meta: fmtDur(Math.abs(rem)) + ' over' }
  if (rem < 7200000) return { key, name, tone: 'warn', state: 'Due soon', icon: Timer, meta: fmtDur(rem) + ' left' }
  return { key, name, tone: 'ok', state: 'On track', icon: Timer, meta: fmtDur(rem) + ' left' }
}
const slaFlags = computed(() => {
  const x = t.value; if (!x) return []
  return [
    slaFlagFor('Response', 'resp', x.sla_response_breached, x.response_due_at, x.first_responded_at),
    slaFlagFor('Resolution', 'res', x.sla_resolution_breached, x.resolution_due_at, x.resolved_at),
  ]
})
// Overall verdict seal. "SLA breached" (red) is reserved for an actual RESOLUTION miss — the
// binding commitment. A late first-response while resolution still has runway is "Response
// overdue" (amber), NOT a full breach (otherwise every un-replied ticket screams red).
const slaVerdict = computed(() => {
  const f = slaFlags.value
  const res = f.find(s => s.key === 'res')
  const resp = f.find(s => s.key === 'resp')
  if (res && res.tone === 'breach') return { tone: 'breach', label: 'SLA breached', icon: AlertTriangle }
  if (resp && resp.tone === 'breach') return { tone: 'warn', label: 'Response overdue', icon: Timer }
  if (f.some(s => s.tone === 'warn')) return { tone: 'warn', label: 'SLA at risk', icon: Timer }
  if (f.length && f.every(s => s.tone === 'met')) return { tone: 'met', label: 'SLA met', icon: CircleCheck }
  if (f.length && f.every(s => s.tone === 'none')) return { tone: 'none', label: 'No SLA target', icon: Gauge }
  return { tone: 'ok', label: 'SLA on track', icon: Gauge }
})
const focal = computed(() => {
  const x = t.value; if (!x) return { tone: 'none', big: '—', sub: '' }
  if (isTerminal.value) return { tone: 'met', big: 'SLA', sub: isWithdrawn.value ? 'withdrawn' : 'targets met' }
  const consider = []
  if (!x.first_responded_at && x.response_due_at) consider.push({ due: new Date(x.response_due_at).getTime(), label: 'response' })
  if (!x.resolved_at && x.resolution_due_at) consider.push({ due: new Date(x.resolution_due_at).getTime(), label: 'resolution' })
  if (!consider.length) return { tone: 'none', big: '∞', sub: 'no SLA target' }
  consider.sort((a, b) => a.due - b.due)
  const next = consider[0]
  const diff = next.due - now.value
  const overdue = diff < 0
  return { tone: overdue ? 'breach' : (diff < 3600000 ? 'warn' : 'ok'), big: fmtCountdown(Math.abs(diff)), sub: overdue ? `${next.label} overdue` : `to ${next.label} breach` }
})

/* ── lifecycle filament ── */
const LIFE = [
  { key: 'created', label: 'Logged', icon: Inbox },
  { key: 'responded', label: '1st Reply', icon: MessageSquare },
  { key: 'progress', label: 'Working', icon: Activity },
  { key: 'resolved', label: 'Resolved', icon: CircleCheck },
  { key: 'closed', label: 'Closed', icon: Lock },
]
const stages = computed(() => {
  const x = t.value || {}
  const working = ['in_progress', 'pending_customer', 'pending_vendor', 'on_hold', 'escalated', 'resolved', 'closed'].includes(x.status)
  const done = {
    created: true,
    responded: !!x.first_responded_at,
    progress: working,
    resolved: !!x.resolved_at || ['resolved', 'closed'].includes(x.status),
    closed: !!x.closed_at || x.status === 'closed',
  }
  const ats = { created: x.created_at, responded: x.first_responded_at, progress: null, resolved: x.resolved_at, closed: x.closed_at }
  return LIFE.map(s => ({ ...s, done: done[s.key], at: ats[s.key] }))
})
const currentIndex = computed(() => { let idx = 0; stages.value.forEach((s, i) => { if (s.done) idx = i }); return idx })
const fillPct = computed(() => (currentIndex.value / (LIFE.length - 1)) * 100)

/* ── vitals deck ── */
const vitals = computed(() => {
  const x = t.value || {}
  const ageMs = x.created_at ? now.value - new Date(x.created_at).getTime() : 0
  const replies = (x.comment_count != null ? x.comment_count : (x.comments?.length || 0))
  const out = [
    { key: 'age', label: 'Age', icon: Clock, value: fmtDur(ageMs), tone: '' },
    { key: 'logged', label: 'Logged', icon: Timer, value: fmtMins(x.time_spent_minutes), tone: '' },
    { key: 'replies', label: 'Replies', icon: MessageSquare, value: String(replies), tone: '' },
  ]
  if (x.csat_score) out.push({ key: 'csat', label: 'CSAT', icon: Star, value: `${x.csat_score}/5`, tone: 'good' })
  else if (x.reopened_count) out.push({ key: 'reopen', label: 'Reopened', icon: RotateCcw, value: `${x.reopened_count}×`, tone: 'warn' })
  else if (x.is_escalated) out.push({ key: 'esc', label: 'Escalation', icon: Flame, value: `L${x.escalation_level}`, tone: 'warn' })
  else out.push({ key: 'people', label: 'People', icon: UsersRound, value: String((x.collaborator_people?.length || 0) + 1), tone: '' })
  return out
})

/* ── load + lifecycle ── */
const ensureCaps = async () => {
  // Always hydrate the capability cache (single-inflight, module-cached): the owner-tier
  // gate needs lead_team_ids/is_admin even when a section passed a minimal `caps` prop.
  try { await fetchCapabilities() } catch { /* self-service only */ }
  if (!myId.value) { try { const m = await getMe(); fetchedId.value = m?.id || null } catch { /* */ } }
}
const load = async (id) => {
  loading.value = true; err.value = ''; agentDenied.value = false
  try {
    if (wantsAgent.value) {
      try {
        t.value = await getTicket(id)
        markTicketViewed(id).catch(() => {})
      } catch (e) {
        const s = e?.response?.status
        if (s === 403 || s === 404) { t.value = await getMyTicket(id); agentDenied.value = true } // not a flagged agent → self view
        else throw e
      }
    } else {
      t.value = await getMyTicket(id)
    }
  } catch (e) { err.value = e?.response?.data?.detail || 'Failed to load ticket.'; t.value = null }
  finally { loading.value = false }
}
const resetTransient = () => {
  activeTab.value = 'conversation'; form.value = null; editing.value = false; vendorEdit.value = false
  commentBody.value = ''; commentInternal.value = false; rating.value = 0; csatComment.value = ''
  actionOpen.value = false
}

const run = async (fn) => {
  busy.value = true; err.value = ''
  try { await fn(); await load(props.ticketId); form.value = null; emit('changed') }
  catch (e) { err.value = e?.response?.data?.detail || 'Action failed.'; toast.error(err.value) }
  finally { busy.value = false }
}

/* Create a project Task from this ticket. The generic `run()` gives no success
   feedback, so this dedicated handler toasts the new task code + jumps to Details
   where the linked-task chip now shows (closing the "nothing happens" gap). */
const createTaskFromTicket = async () => {
  if (busy.value || !t.value?.id) return
  if (t.value.links?.task_id) { toast.info('A task is already linked to this ticket.'); return }
  form.value = null; busy.value = true; err.value = ''
  try {
    const res = await ticketToTask(t.value.id, {})
    await load(props.ticketId)
    activeTab.value = 'details'
    emit('changed')
    toast.success(res?.task_code ? `Task ${res.task_code} created from this ticket` : 'Task created from this ticket')
  } catch (e) {
    err.value = e?.response?.data?.detail || 'Could not create the task.'
    toast.error(err.value)
  } finally { busy.value = false }
}

/* ── conversation ── */
const commentBody = ref('')
const commentInternal = ref(false)
const sendComment = () => run(async () => {
  const payload = { body: commentBody.value.trim(), is_internal: canWork.value && commentInternal.value }
  if (isAgent.value) await addTicketComment(t.value.id, payload)
  else await replyMyTicket(props.ticketId, payload)
  commentBody.value = ''; commentInternal.value = false; activeTab.value = 'conversation'
  toast.success(payload.is_internal ? 'Note added' : 'Reply sent')
})
const goReply = () => { activeTab.value = 'conversation'; nextTick(() => composerRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })) }
const goRate = () => { activeTab.value = 'conversation'; nextTick(() => rateRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })) }

const msgClass = (c) => (c.author_kind === 'staff' ? 'staff' : c.author_kind === 'system' ? 'system' : 'requester')
const msgAva = (c) => (c.author_kind === 'staff' ? 'S' : c.author_kind === 'system' ? '⚙' : initials(c.author_name || 'R'))
const msgWho = (c) => (c.author_name || (c.author_kind === 'staff' ? 'Support' : c.author_kind === 'system' ? 'System' : 'Requester'))

/* ── CSAT ── */
const rating = ref(0)
const hoverStar = ref(0)
const csatComment = ref('')
const submitRating = () => run(async () => {
  await rateMyTicket(props.ticketId, { csat_score: rating.value, csat_comment: csatComment.value || null })
  toast.success('Thanks for the feedback!')
})

/* ── classification edit ── */
const editing = ref(false)
const ed = reactive({ priority: '', ticket_type: '', impact: '', urgency: '', category_id: '', organization_id: '', subject: '', description: '', tags: '' })
const startEdit = () => {
  activeTab.value = 'details'; editing.value = true; form.value = null
  const x = t.value
  ed.priority = x.priority || 'medium'; ed.ticket_type = x.ticket_type || 'incident'
  ed.impact = x.impact || ''; ed.urgency = x.urgency || ''
  ed.category_id = x.category_id || ''; ed.organization_id = x.organization_id || ''
  ed.subject = x.subject || ''; ed.description = x.description || ''
  ed.tags = (x.tags || []).join(', ')
}
const saveEdit = () => run(async () => {
  if (isAgent.value) {
    await updateTicket(t.value.id, { priority: ed.priority, ticket_type: ed.ticket_type, impact: ed.impact || null, urgency: ed.urgency || null, category_id: ed.category_id || null, organization_id: ed.organization_id || null,
      tags: ed.tags.split(',').map(s => s.trim()).filter(Boolean) })
  } else {
    await updateMyTicket(props.ticketId, { subject: ed.subject.trim(), description: ed.description || null, priority: ed.priority, category_id: ed.category_id || null })
  }
  editing.value = false; toast.success('Ticket updated')
})

/* ── war-room response (critical / major incident) ── */
const mttaText = computed(() => {
  const x = t.value
  if (!x?.acknowledged_at || !x?.created_at) return ''
  return fmtDur(Math.max(0, new Date(x.acknowledged_at).getTime() - new Date(x.created_at).getTime()))
})
const updateOverdue = computed(() => {
  const x = t.value
  if (x?.update_overdue != null) return !!x.update_overdue
  return !!x?.next_update_due_at && now.value > new Date(x.next_update_due_at).getTime()
})
const cadenceText = computed(() => {
  const due = t.value?.next_update_due_at ? new Date(t.value.next_update_due_at).getTime() : null
  if (!due) return '—'
  const rem = due - now.value
  return rem < 0 ? `${fmtDur(Math.abs(rem))} overdue` : `in ${fmtDur(rem)}`
})
const escResponseOverdue = computed(() => {
  const x = t.value
  if (x?.esc_response_overdue != null) return !!x.esc_response_overdue
  return !!x?.escalation_response_due_at && now.value > new Date(x.escalation_response_due_at).getTime()
})
const escResponseText = computed(() => {
  const due = t.value?.escalation_response_due_at ? new Date(t.value.escalation_response_due_at).getTime() : null
  if (!due) return 'Awaiting acknowledgement'
  const rem = due - now.value
  return rem < 0 ? `ACK overdue by ${fmtDur(Math.abs(rem))}` : `ACK due in ${fmtDur(rem)}`
})
const ackNow = () => run(async () => { await ackTicket(t.value.id); toast.success(`${t.value.ticket_number} acknowledged — you're on it`) })
const ackEscalationNow = () => run(async () => { await ackEscalation(t.value.id); toast.success('Escalation acknowledged') })

/* ── vendor relay lifecycle ── */
const vendorEdit = ref(false)
const vd = reactive({ vendor_name: '', vendor_ticket_ref: '', vendor_status: '', vendor_wait_reason: '', vendor_due_at: '', vendor_po_ref: '' })
const toLocalInput = (iso) => {
  if (!iso) return ''
  const d = new Date(iso); if (isNaN(d)) return ''
  const p = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
const toggleVendor = () => {
  vendorEdit.value = !vendorEdit.value
  if (vendorEdit.value) {
    vd.vendor_name = t.value.vendor_name || ''
    vd.vendor_ticket_ref = t.value.vendor_ticket_ref || ''
    vd.vendor_status = t.value.vendor_status || ''
    vd.vendor_wait_reason = t.value.vendor_wait_reason || ''
    vd.vendor_due_at = toLocalInput(t.value.vendor_due_at)
    vd.vendor_po_ref = t.value.vendor_po_ref || ''
  }
}
const saveVendor = () => run(async () => {
  await updateTicket(t.value.id, {
    vendor_name: vd.vendor_name || null, vendor_ticket_ref: vd.vendor_ticket_ref || null,
    vendor_status: vd.vendor_status || null, vendor_wait_reason: vd.vendor_wait_reason || null,
    vendor_due_at: vd.vendor_due_at || null, vendor_po_ref: vd.vendor_po_ref || null,
  })
  vendorEdit.value = false; toast.success('Vendor hand-off updated')
})
const vendorOverdue = computed(() => t.value?.vendor_overdue != null
  ? !!t.value.vendor_overdue
  : (t.value?.vendor_due_at ? now.value > new Date(t.value.vendor_due_at).getTime() : false))
const chaseSummary = computed(() => {
  const n = t.value?.vendor_reminder_count || 0
  if (!n) return 'Never chased'
  return `${n}× · last ${t.value.last_vendor_reminder_at ? ago(t.value.last_vendor_reminder_at) + ' ago' : '—'}`
})
const vendorReplies = computed(() => (t.value?.comments || []).filter(c => c.author_kind === 'vendor'))
const fmtEta = (iso) => {
  if (!iso) return '—'
  const rem = new Date(iso).getTime() - now.value, abs = Math.abs(rem)
  const days = Math.floor(abs / 86400000), hrs = Math.floor((abs % 86400000) / 3600000)
  const lbl = days >= 1 ? `${days}d ${hrs}h` : `${Math.max(1, Math.floor(abs / 3600000))}h`
  return rem < 0 ? `${lbl} overdue` : `in ${lbl}`
}
const chaseVendor = () => run(async () => { await vendorChase(t.value.id, {}); toast.success('Vendor chased') })
const bringBackVendor = () => run(async () => { await vendorReply(t.value.id, { body: 'Vendor responded — brought back to the desk.', resume: true }); toast.success('Brought back to the desk') })

/* ── action modal (hold/reopen/remind/incident/rca/route/collab) ──
   All form-based actions open the corporate SdAgentActionModal instead of an inline
   sheet, so each is a proper ultra-modern modal with workflow + reasons + a success seal. */
const actionOpen = ref(false)
const actionMode = ref('hold')
const openAction = (m) => { form.value = null; actionMode.value = m; actionOpen.value = true }

/* ── mini-form popovers: log time / merge / follow-up / stakeholder update ── */
const MINI_FORMS = ['time', 'merge', 'followup', 'update', 'redact', 'requester']
const timeMinutes = ref(null)
const timeNote = ref('')
const mergeQuery = ref('')
const mergeResults = ref([])
const mergeTarget = ref(null)
const mergeComment = ref('')
const mergeSearching = ref(false)
let mergeTimer = null
const fuSubject = ref('')
const fuDesc = ref('')
const fuAssignMe = ref(true)
const updBody = ref('')
const updInternal = ref(false)
const updCadence = ref('')
const CADENCE_OPTS = [
  { value: '', label: 'Keep current cadence' },
  { value: '30', label: 'Next update in 30m' },
  { value: '60', label: 'Next update in 1h' },
  { value: '120', label: 'Next update in 2h' },
  { value: 'stop', label: 'Stand cadence down' },
]
const openForm = (f) => {
  if (f === 'time') { timeMinutes.value = null; timeNote.value = '' }
  if (f === 'merge') { mergeQuery.value = ''; mergeResults.value = []; mergeTarget.value = null; mergeComment.value = '' }
  if (f === 'followup') { fuSubject.value = `Follow-up: ${t.value?.subject || ''}`.slice(0, 200); fuDesc.value = ''; fuAssignMe.value = true }
  if (f === 'update') { updBody.value = ''; updInternal.value = false; updCadence.value = '' }
  form.value = f
}
const doLogTime = () => run(async () => {
  const mins = Math.round(timeMinutes.value)
  await logTicketTime(t.value.id, { minutes: mins, note: timeNote.value.trim() || null })
  toast.success(`${fmtMins(mins)} logged on ${t.value.ticket_number}`)
})
const searchMerge = () => {
  clearTimeout(mergeTimer)
  mergeTimer = setTimeout(async () => {
    const q = mergeQuery.value.trim()
    if (!q) { mergeResults.value = []; return }
    mergeSearching.value = true
    try {
      const r = await listTickets({ q, limit: 8 })
      // a master must be ACTIVE work — no self, no tombstones, no finished records
      mergeResults.value = (r.items || []).filter(x =>
        String(x.id) !== String(t.value?.id) && !x.merged_into_id && !x.is_deleted
        && !['resolved', 'closed'].includes(x.status))
    } catch { mergeResults.value = [] }
    finally { mergeSearching.value = false }
  }, 300)
}
const doMerge = () => run(async () => {
  const target = mergeTarget.value
  await mergeTicket(t.value.id, { target_id: target.id, comment: mergeComment.value.trim() || null })
  toast.success(`${t.value.ticket_number} merged into ${target.ticket_number}`)
})
const doFollowUp = async () => {
  if (busy.value || fuDesc.value.trim().length < 3) return
  busy.value = true; err.value = ''
  try {
    const res = await createFollowUpTicket(t.value.id, {
      subject: fuSubject.value.trim() || null,
      description: fuDesc.value.trim(),
      assign_me: fuAssignMe.value,
    })
    form.value = null
    await load(props.ticketId)
    emit('changed')
    toast.success(res?.ticket_number ? `Follow-up ${res.ticket_number} created and linked` : 'Follow-up created and linked')
  } catch (e) { err.value = e?.response?.data?.detail || 'Could not create the follow-up.'; toast.error(err.value) }
  finally { busy.value = false }
}
const promoteKb = () => run(async () => {
  form.value = null
  await promoteTicketToKb(t.value.id)
  toast.success('Resolution drafted into the knowledge base')
})

/* ── Superuser governance: comment redaction + change requester ── */
const redactTarget = ref(null)
const redactReason = ref('')
// System rows carry workflow bookkeeping (merge notes, withdraw records) — redacting
// them would falsify the process trail, so only human comments are redactable.
const canRedact = (c) => isAdminCap.value && !c.is_redacted && c.author_kind !== 'system'
const openRedact = (c) => { redactTarget.value = c; redactReason.value = ''; form.value = 'redact' }
const doRedact = () => run(async () => {
  await redactTicketComment(t.value.id, redactTarget.value.id, { reason: redactReason.value.trim() })
  toast.success('Message redacted — audit trail updated')
})

const reqQuery = ref('')
const reqResults = ref([])
const reqTarget = ref(null)
const reqReason = ref('')
const reqSearching = ref(false)
let reqTimer = null
const openChangeRequester = () => {
  reqQuery.value = ''; reqResults.value = []; reqTarget.value = null; reqReason.value = ''
  form.value = 'requester'
}
const searchRequester = () => {
  clearTimeout(reqTimer)
  reqTimer = setTimeout(async () => {
    const q = reqQuery.value.trim()
    if (q.length < 2) { reqResults.value = []; return }  // backend search-gate: 2+ chars for agents
    reqSearching.value = true
    try {
      const r = await listTeamPeople({ q, limit: 8 })
      const cur = String(t.value?.raised_by_user_id || '')
      reqResults.value = (Array.isArray(r) ? r : (r.items || [])).filter(p => String(p.id) !== cur).slice(0, 8)
    } catch { reqResults.value = [] }
    finally { reqSearching.value = false }
  }, 300)
}
const doChangeRequester = () => run(async () => {
  const target = reqTarget.value
  await changeTicketRequester(t.value.id, { raised_by_user_id: target.id, reason: reqReason.value.trim() || null })
  toast.success(`${t.value.ticket_number} re-homed to ${target.name}`)
})
const doNudgeOwner = () => run(async () => {
  form.value = null
  await nudgeTicketOwner(t.value.id)
  toast.success(`${firstName(t.value.assigned_agent_name) || 'The owner'} has been nudged`)
})
const doPostUpdate = () => run(async () => {
  const p = { body: updBody.value.trim(), is_internal: updInternal.value }
  // Standing down an armed cadence needs a reason (backend 422) — the update text
  // accompanying the stand-down IS its stated reason.
  if (updCadence.value === 'stop') { p.stop_cadence = true; p.note = updBody.value.trim().slice(0, 500) }
  else if (updCadence.value) p.interval_minutes = Number(updCadence.value)
  await postStatusUpdate(t.value.id, p)
  toast.success('Stakeholder update posted')
})

/* ── agent-collision presence (heartbeat every 25s while the drawer is open) ── */
const viewers = ref([])
let presTimer = null
const beatPresence = async () => {
  if (!isAgent.value || !t.value?.id || isArchived.value) return
  try { const r = await ticketPresence(t.value.id); viewers.value = r?.viewers || [] }
  catch { /* presence is best-effort — never surface an error for it */ }
}
const othersHere = computed(() => (viewers.value || []).filter(v => String(v.user_id) !== String(myId.value)))
// RCA is the exception: it opens the Breached desk's full SdRcaConsole (SLA-anatomy
// evidence + coded breach-reason taxonomy) — one root-cause surface everywhere, same
// unification as escalate → SdEscalateConsole.
const rcaOpen = ref(false)
const openRca = () => { form.value = null; rcaOpen.value = true }
const onRcaSaved = () => { rcaOpen.value = false; if (props.ticketId) load(props.ticketId); emit('changed') }

/* ── Incident-command verbs (Fault Grid parity inside the drawer) ──
   roster / decision / impact / master-link reuse the SAME incident modals the sections
   mount; PIR drafting is idempotent server-side (409 = one already exists). Gated like
   the backend: incident-type ∪ MI, actor tier, live (not merged/archived). */
const isIncident = computed(() => !!t.value && (t.value.ticket_type === 'incident' || t.value.is_major_incident))
const canIncidentCommand = computed(() => isAgent.value && canCommand.value && !isArchived.value
  && isIncident.value && !t.value?.merged_into_id)
const incModal = ref(null)                 // 'roles' | 'decision' | 'impact' | 'link'
const openIncModal = (m) => { form.value = null; incModal.value = m }
// The roles modal self-hydrates from the sealed /roster-candidates read — the old
// listMyTeam() pool here was DIRECT REPORTS, empty for most agents.
const openRoles = () => { form.value = null; incModal.value = 'roles' }
const onIncDone = async () => { incModal.value = null; if (props.ticketId) await load(props.ticketId); emit('changed') }
const draftPir = async () => {
  form.value = null
  busy.value = true
  try {
    const p = await createPir(t.value.id)
    toast.success(`${p.report_number} drafted — build it on the Post-Incident desk`)
  } catch (e) {
    const detail = e?.response?.data?.detail || 'Could not open the post-incident review'
    if (e?.response?.status === 409) toast.info(detail)
    else toast.error(detail)
  } finally { busy.value = false }
}
// Pass identity (not just id) so the Assign modal can show who'll own it.
const meForModal = computed(() => ({ id: myId.value, name: props.me?.name || '', email: props.me?.email || '' }))

/* ── work-state move (In Progress / Pending Customer) via the rich SdFlowMoveModal ──
   A ticket does NOT auto-advance when you reply — replying and moving the ticket forward
   are separate, deliberate steps — so these give the agent an explicit, context-rich move.
   (A customer replying to a Pending-Customer ticket DOES auto-reactivate it server-side.) */
const moveTo = ref(null)
const canMoveTo = (s) => isAgent.value && canCommand.value && !!t.value && !isTerminal.value && t.value.status !== s
const openMove = (s) => { form.value = null; moveTo.value = s }
const onMoved = async () => {
  const label = moveTo.value
  moveTo.value = null
  await load(props.ticketId); emit('changed')
  toast.success(label === 'in_progress' ? 'Moved to In Progress'
    : label === 'pending_customer' ? 'Moved to Pending Customer · SLA clock paused'
    : label === 'pending_vendor' ? 'Dispatched to vendor · SLA clock paused'
    : 'Ticket moved')
}

// Ownership-before-action workflow guard (mirrors the backend): you can't escalate /
// resolve / close a ticket nobody is working — guide the agent to assign first instead of
// opening a form that the server will only reject with a 409.
const needsOwner = computed(() => isAgent.value && !isTerminal.value && !t.value?.assigned_agent_id)
const escalateOpen = ref(false)
const onEscalated = async () => { escalateOpen.value = false; if (props.ticketId) await load(props.ticketId); emit('changed'); toast.success('Ticket escalated') }
const tryEscalate = () => { if (needsOwner.value) { toast.info('Assign an owner before escalating'); openAction('assign'); return } form.value = null; escalateOpen.value = true }
const tryResolve = () => { if (needsOwner.value) { toast.info('Assign an owner before resolving'); openAction('assign'); return } resolveOpen.value = true }
const tryClose = () => { if (needsOwner.value) { toast.info('Assign an owner before closing'); openAction('assign'); return } closeOpen.value = true }
const onActionDone = (m) => {
  if (m !== 'collab-silent') actionOpen.value = false
  if (props.ticketId) load(props.ticketId)
  emit('changed')
}

/* ── modals ── */
const deleteOpen = ref(false)
const openDelete = () => { form.value = null; deleteOpen.value = true }
const onArchived = () => { deleteOpen.value = false; emit('changed'); emit('close') }
// Deep Storage: pull the tombstone back into circulation. 409s surface verbatim —
// a legal-held record needs a superuser to release the hold first.
const doRestore = async () => {
  if (!t.value?.id || busy.value) return
  busy.value = true; form.value = null
  try {
    await restoreTicket(t.value.id, {})
    toast.success(`${t.value.ticket_number} restored — back in circulation.`)
    await load(props.ticketId)
    emit('changed')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not restore the record.')
  } finally { busy.value = false }
}
const resolveOpen = ref(false)
const closeOpen = ref(false)
const withdrawOpen = ref(false)
const onModalDone = async () => {
  resolveOpen.value = false; closeOpen.value = false; withdrawOpen.value = false
  if (props.ticketId) await load(props.ticketId)
  emit('changed')
}

/* ── activity vocabulary ── */
const ACT = {
  created: { label: 'Ticket created', icon: Plus, tone: 'open' },
  replied: { label: 'Reply added', icon: MessageSquare, tone: 'info' },
  internal_note: { label: 'Internal note', icon: Lock, tone: 'info' },
  status_changed: { label: 'Status changed', icon: ArrowRightLeft, tone: 'info' },
  assigned: { label: 'Assigned', icon: UserCheck, tone: 'info' },
  routed: { label: 'Routed', icon: ArrowRightLeft, tone: 'info' },
  escalated: { label: 'Escalated', icon: Flame, tone: 'danger' },
  de_escalated: { label: 'De-escalated', icon: ChevronDown, tone: 'info' },
  resolved: { label: 'Resolved', icon: CircleCheck, tone: 'good' },
  reopened: { label: 'Reopened', icon: RotateCcw, tone: 'warn' },
  restored: { label: 'Restored', icon: Archive, tone: 'info' },
  withdrawn: { label: 'Withdrawn', icon: Ban, tone: 'neutral' },
  reminded: { label: 'Reminder sent', icon: BellRing, tone: 'warn' },
  rca_recorded: { label: 'RCA recorded', icon: FileSearch, tone: 'info' },
  major_incident: { label: 'Major incident', icon: Siren, tone: 'danger' },
  held: { label: 'Put on hold', icon: Pause, tone: 'warn' },
  resumed: { label: 'Resumed', icon: Play, tone: 'good' },
  csat: { label: 'CSAT submitted', icon: Star, tone: 'good' },
  merged: { label: 'Merged', icon: GitMerge, tone: 'neutral' },
  collaborator_added: { label: 'Collaborator added', icon: UsersRound, tone: 'info' },
  collaborator_removed: { label: 'Collaborator removed', icon: UsersRound, tone: 'neutral' },
  updated: { label: 'Updated', icon: PenLine, tone: 'info' },
}
const actIcon = (a) => ACT[a]?.icon || Sparkles
const actLabel = (a) => ACT[a]?.label || String(a).replace(/_/g, ' ')
const actTone = (a) => ACT[a]?.tone || 'info'
const actDetail = (a) => {
  const d = a.detail || {}
  if (a.action === 'status_changed' && d.to) return `${(d.from || '').replace(/_/g, ' ')} → ${(d.to || '').replace(/_/g, ' ')}`
  if (a.action === 'resolved' && d.code) return `${resolutionLabel(d.code)}${d.closed ? ' · closed' : ''}`
  if ((a.action === 'withdrawn' || a.action === 'reopened' || a.action === 'held') && (d.reason || d.hold_reason)) return d.reason || d.hold_reason
  if (a.action === 'replied' && d.preview) return d.preview
  if (a.action === 'collaborator_added' && d.name) return d.name
  if (a.action === 'routed' && d.team) return `to ${d.team}`
  if (a.action === 'assigned' && d.to_name) return `to ${d.to_name}`
  return ''
}

/* ── ticket lifecycle (declared last so resetTransient's refs all exist) ── */
watch(() => props.ticketId, async (id) => {
  if (id) {
    resetTransient()
    await ensureCaps()
    await load(id)
    if (wantsAgent.value) loadPickers().catch(() => {})
    else if (!myCats.value.length) listMyCategories().then(r => { myCats.value = r || [] }).catch(() => {})
    if (!nowTick) nowTick = setInterval(() => { now.value = Date.now() }, 1000)
    // agent-collision heartbeat — one beat now, then every 25s while this drawer is open
    viewers.value = []
    clearInterval(presTimer)
    beatPresence()
    presTimer = setInterval(beatPresence, 25000)
  } else {
    t.value = null; viewers.value = []
    clearInterval(presTimer); presTimer = null
  }
}, { immediate: true })
onBeforeUnmount(() => { if (nowTick) clearInterval(nowTick); if (presTimer) clearInterval(presTimer); clearTimeout(mergeTimer) })
</script>

<style scoped>
.tkd-overlay { position: fixed; inset: 0; z-index: 2100; display: flex; justify-content: flex-end; background: radial-gradient(70% 90% at 100% 50%, rgba(251, 146, 60, 0.16), transparent 60%), rgba(4, 5, 6, 0.6); backdrop-filter: blur(9px) saturate(118%); }
[data-theme="light"] .tkd-overlay { background: radial-gradient(70% 90% at 100% 50%, rgba(234, 88, 12, 0.12), transparent 60%), rgba(40, 25, 10, 0.34); }
.tkd { position: relative; width: min(640px, 100vw); height: 100%; display: flex; flex-direction: column; overflow: hidden;
  background: radial-gradient(120% 46% at 100% 0%, rgba(251, 146, 60, 0.08), transparent 58%), var(--sd-surface-elevated);
  border-left: 1px solid var(--sd-border-strong); box-shadow: -30px 0 80px rgba(0, 0, 0, 0.6); }
.tkd-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; z-index: 6; background: linear-gradient(180deg, var(--sc), color-mix(in srgb, var(--sc) 35%, transparent)); box-shadow: 0 0 18px color-mix(in srgb, var(--sc) 60%, transparent); transition: background 0.4s ease; }
.tkd-orb { position: absolute; border-radius: 50%; filter: blur(54px); pointer-events: none; opacity: 0.5; z-index: 0; }
.tkd-orb.a { width: 280px; height: 280px; top: -90px; right: -70px; background: radial-gradient(circle, var(--sd-fluid-glow), transparent 66%); animation: tkd-drift-a 13s ease-in-out infinite; }
.tkd-orb.b { width: 240px; height: 240px; bottom: -70px; left: -60px; background: radial-gradient(circle, rgba(234, 88, 12, 0.32), transparent 68%); animation: tkd-drift-b 16s ease-in-out infinite; }
@keyframes tkd-drift-a { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-26px, 30px) scale(1.12); } }
@keyframes tkd-drift-b { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(22px, -26px) scale(1.1); } }

/* skeleton */
.tkd-skel { position: relative; z-index: 1; padding: 24px 22px; display: flex; flex-direction: column; gap: 14px; }
.sk { display: block; border-radius: 9px; background: linear-gradient(90deg, var(--sd-surface), var(--sd-surface-glass), var(--sd-surface)); background-size: 200% 100%; animation: tkd-sh 1.3s linear infinite; }
.sk-no { width: 120px; height: 14px; } .sk-title { width: 78%; height: 24px; } .sk-pills { width: 62%; height: 22px; } .sk-console { width: 100%; height: 150px; } .sk-row { width: 100%; height: 58px; }
@keyframes tkd-sh { to { background-position: -200% 0; } }

/* ░ sticky header ░ */
.tkd-head { position: relative; z-index: 4; flex-shrink: 0; padding: 16px 22px 13px; border-bottom: 1px solid var(--sd-border); overflow: hidden;
  /* opaque (surface over the solid basin) so scrolled content never peeks through the header */
  background: var(--sd-surface-elevated);
  background: linear-gradient(var(--sd-surface-elevated), var(--sd-surface-elevated)), var(--sd-basin); }
.th-grain { position: absolute; inset: 0; opacity: 0.4; pointer-events: none; background-image: radial-gradient(rgba(251, 191, 36, 0.06) 1px, transparent 1px); background-size: 20px 20px; -webkit-mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.6), transparent); mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.6), transparent); }
.th-top { position: relative; display: flex; align-items: center; gap: 7px; margin-bottom: 9px; }
.th-no { display: inline-flex; align-items: center; gap: 4px; font-size: 12.5px; font-weight: 700; color: var(--sd-amber); }
.th-flag { display: inline-flex; align-items: center; gap: 3px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.05em; padding: 2px 7px; border-radius: 6px; color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.th-flag.major, .th-flag.esc { color: var(--sd-danger); background: var(--sd-danger-soft); border-color: color-mix(in srgb, var(--sd-danger) 30%, transparent); }
/* agent-collision presence — a teammate has this ticket open right now */
.th-flag.watch { color: var(--sd-success); background: color-mix(in srgb, var(--sd-success) 10%, transparent);
  border-color: color-mix(in srgb, var(--sd-success) 35%, transparent); animation: tkd-watch 2.2s ease-in-out infinite; }
@keyframes tkd-watch { 50% { opacity: 0.65; } }
.th-spacer { flex: 1; }
.th-role { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; padding: 3px 9px; border-radius: 999px; border: 1px solid var(--sd-border-strong); color: var(--sd-text-muted); background: var(--sd-surface); }
.th-role.agent { color: var(--sd-amber); background: var(--sd-amber-soft); border-color: var(--sd-amber-border); }
.th-role.worker { color: var(--sd-st-progress); background: var(--sd-st-progress-soft); border-color: color-mix(in srgb, var(--sd-st-progress) 30%, transparent); }
.th-role.requester { color: var(--sd-success); background: var(--sd-success-soft); border-color: color-mix(in srgb, var(--sd-success) 28%, transparent); }
.th-x { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 9px; cursor: pointer; background: transparent; border: 1px solid var(--sd-border); color: var(--sd-text-muted); transition: all 0.18s; }
.th-x:hover { color: var(--sd-text); border-color: var(--sd-border-strong); transform: rotate(90deg); }
.th-subject { position: relative; font-size: 18px; font-weight: 800; color: var(--sd-text); margin: 0 0 10px; line-height: 1.28;
  /* long subjects wrap + clamp to 2 lines with an ellipsis so they never spill past the drawer edge */
  overflow-wrap: anywhere; word-break: break-word; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.th-pills { position: relative; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.th-soft { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; color: var(--sd-text-muted); background: var(--sd-surface); border: 1px solid var(--sd-border); padding: 3px 9px; border-radius: 999px; }
.th-banner { position: relative; display: flex; align-items: center; gap: 8px; margin-top: 11px; padding: 9px 12px; border-radius: 10px; font-size: 12.5px; font-weight: 600; }
.th-banner.hold { color: var(--sd-st-hold); background: var(--sd-st-hold-soft); }
.th-banner.major, .th-banner.breach { color: var(--sd-danger); background: var(--sd-danger-soft); }
.th-banner.pending { color: var(--sd-st-pending); background: var(--sd-st-pending-soft); }
.th-banner.good { color: var(--sd-success); background: var(--sd-success-soft); }
.th-banner.neutral { color: var(--sd-text-secondary); background: var(--sd-surface-glass); }

/* ░ body ░ */
.tkd-body { position: relative; z-index: 2; flex: 1; overflow-y: auto; display: flex; flex-direction: column; min-height: 0; }
.tkd-ctx { display: flex; flex-direction: column; gap: 13px; padding: 15px 20px 18px; }
/* never let the flex column compress its children — the column scrolls instead. Without this,
   a short viewport shrinks the console and its overflow:hidden clips the lifecycle filament. */
.tkd-ctx > * { flex-shrink: 0; }
.tk-convo { display: flex; flex-direction: column; gap: 12px; padding: 2px 20px 22px; }
.tk-convo-head { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--sd-text-muted); }
.tk-convo-head .tk-tab-n { margin-left: 2px; }

/* ░ Conversation theater (expanded two-pane: context left, conversation right) ░ */
.tkd { transition: width 0.42s var(--sd-spring); }
.tkd.expanded { width: min(1180px, 97vw); }
.tkd-body.expanded { display: grid; grid-template-columns: minmax(330px, 0.9fr) minmax(0, 1.1fr); overflow: hidden; }
.tkd-body.expanded .tkd-ctx { overflow-y: auto; min-width: 0; min-height: 0; }
.tkd-body.expanded .tk-convo { min-width: 0; min-height: 0; overflow: hidden; gap: 0; padding: 0; border-left: 1px solid var(--sd-border); }
.tkd-body.expanded .tk-convo-head { padding: 13px 18px; border-bottom: 1px solid var(--sd-border); flex-shrink: 0; }
.tkd-body.expanded .tk-convo .thread { flex: 1; overflow-y: auto; min-height: 0; padding: 15px 18px; margin: 0; }
.tkd-body.expanded .tk-convo .csat, .tkd-body.expanded .tk-convo .csat-done { flex-shrink: 0; margin: 0 18px 12px; }
.tkd-body.expanded .tk-convo .composer { flex-shrink: 0; margin: 0; border: none; border-top: 1px solid var(--sd-border); border-radius: 0; padding: 12px 18px; }

/* ░ signature: Resolution Console ░ */
.tk-console { position: relative; border: 1px solid var(--sd-border-strong); border-radius: 16px; padding: 15px; overflow: hidden;
  background: var(--sd-grad-card), var(--sd-surface); }
.tkc-grain { position: absolute; inset: 0; opacity: 0.35; pointer-events: none; background-image: radial-gradient(rgba(251, 191, 36, 0.05) 1px, transparent 1px); background-size: 16px 16px; }
.tkc-top { position: relative; display: flex; align-items: center; gap: 15px; margin-bottom: 14px; }
.tk-focal { position: relative; flex-shrink: 0; width: 96px; height: 96px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0 6px;
  background: radial-gradient(circle at 50% 38%, color-mix(in srgb, var(--fc) 16%, transparent), transparent 70%); border: 1px solid color-mix(in srgb, var(--fc) 28%, var(--sd-border)); --fc: var(--sd-amber); }
.tk-focal.ok { --fc: var(--sd-st-progress); } .tk-focal.warn { --fc: var(--sd-warning); } .tk-focal.breach { --fc: var(--sd-danger); } .tk-focal.met { --fc: var(--sd-success); } .tk-focal.none { --fc: var(--sd-steel); }
.tkf-ring { position: absolute; inset: 6px; border-radius: 50%; border: 1.5px dashed color-mix(in srgb, var(--fc) 40%, transparent); animation: tkd-spin 26s linear infinite; }
.tk-focal.breach .tkf-ring { animation-duration: 7s; }
.tkf-big { position: relative; font-size: 18px; font-weight: 800; color: var(--fc); line-height: 1; letter-spacing: -0.03em; white-space: nowrap; text-align: center; }
.tkf-sub { position: relative; margin-top: 4px; font-size: 8.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--sd-text-dim); max-width: 84px; }
.tkc-meta { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.tkc-meta span { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--sd-text-secondary); }
.tkc-meta span.muted { color: var(--sd-text-dim); }

.tk-sla { position: relative; display: flex; flex-direction: column; gap: 8px; margin-bottom: 13px; }
.tk-sla-row { display: grid; grid-template-columns: 72px 1fr 64px; align-items: center; gap: 10px; }
.tsl-name { font-size: 11px; font-weight: 700; color: var(--sd-text-secondary); }
.tsl-track { position: relative; height: 8px; border-radius: 999px; background: var(--sd-border-strong); overflow: visible; }
.tsl-frontier { position: absolute; left: 80%; top: -2px; bottom: -2px; width: 1.5px; background: color-mix(in srgb, var(--sd-warning) 65%, transparent); opacity: 0.7; }
.tsl-fill { position: absolute; inset: 0 auto 0 0; height: 100%; border-radius: 999px; background: var(--mc, var(--sd-amber)); transition: width 0.9s var(--sd-spring); }
.tsl-comet { position: absolute; right: 0; top: 50%; width: 9px; height: 9px; transform: translate(50%, -50%); border-radius: 50%; background: var(--mc, var(--sd-amber)); box-shadow: 0 0 10px var(--mc, var(--sd-amber)); }
.tsl-val { font-size: 10.5px; font-weight: 700; text-align: right; color: var(--mc, var(--sd-text-secondary)); }
.tk-sla-row.ok { --mc: var(--sd-st-progress); } .tk-sla-row.warn { --mc: var(--sd-warning); } .tk-sla-row.breach { --mc: var(--sd-danger); } .tk-sla-row.met { --mc: var(--sd-success); } .tk-sla-row.none { --mc: var(--sd-steel); }
.tk-sla-row.breach .tsl-comet { animation: tkd-pulse 1.1s ease-in-out infinite; }

/* lifecycle filament */
.tk-life { position: relative; padding-top: 4px; }
.tkl-rail { position: absolute; left: 11px; right: 11px; top: 14px; height: 2.5px; border-radius: 2px; background: var(--sd-border-strong); }
.tkl-fill { position: absolute; inset: 0 auto 0 0; height: 100%; border-radius: 2px; background: var(--sd-grad-rail); background-size: 200% 100%; box-shadow: 0 0 8px var(--sd-fluid-glow); transition: width 0.8s var(--sd-spring); animation: tkd-flow 3.2s linear infinite; }
.tkl-nodes { position: relative; display: flex; justify-content: space-between; }
.tkl-node { display: flex; flex-direction: column; align-items: center; gap: 5px; }
.tkl-dot { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; color: var(--sd-text-dim); background: var(--sd-surface-elevated); border: 1.5px solid var(--sd-border-strong); transition: all 0.3s var(--sd-spring); }
.tkl-node.done .tkl-dot { color: #1a1206; background: var(--sd-grad-hero); border-color: transparent; }
[data-theme="light"] .tkl-node.done .tkl-dot { color: #fff8ec; }
.tkl-node.cur .tkl-dot { box-shadow: 0 0 0 4px var(--sd-amber-soft); animation: tkd-beacon 1.8s ease-in-out infinite; }
.tkl-lbl { font-size: 9px; font-weight: 700; letter-spacing: 0.02em; color: var(--sd-text-dim); text-transform: uppercase; }
.tkl-node.done .tkl-lbl { color: var(--sd-text-secondary); }
.tkl-node.cur .tkl-lbl { color: var(--sd-amber); }

/* SLA verdict ribbon */
.tk-slaflags { display: flex; align-items: stretch; gap: 9px; }
.tsf-seal { --vc: var(--sd-steel); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; flex-shrink: 0; width: 116px; padding: 12px 10px; border-radius: 14px; text-align: center;
  color: var(--vc); background: color-mix(in srgb, var(--vc) 12%, transparent); border: 1px solid color-mix(in srgb, var(--vc) 32%, transparent); }
.tsf-seal span { font-size: 11px; font-weight: 800; letter-spacing: 0.02em; line-height: 1.2; }
.tsf-seal.met { --vc: var(--sd-success); } .tsf-seal.breach { --vc: var(--sd-danger); } .tsf-seal.warn { --vc: var(--sd-warning); } .tsf-seal.ok { --vc: var(--sd-st-progress); } .tsf-seal.none { --vc: var(--sd-steel); }
/* glow-only pulse — stays exactly in place (no transform/translate, so it never drifts onto the filament) */
.tsf-seal.breach { animation: tsf-seal-glow 1.9s ease-in-out infinite; }
@keyframes tsf-seal-glow { 0%, 100% { box-shadow: 0 0 0 0 transparent; } 50% { box-shadow: 0 0 15px color-mix(in srgb, var(--vc) 45%, transparent); } }
.tsf-cards { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 9px; min-width: 0; }
.tsf { --vc: var(--sd-steel); display: flex; align-items: center; gap: 9px; padding: 10px 12px; border-radius: 13px; min-width: 0;
  background: var(--sd-surface); border: 1px solid var(--sd-border); border-left: 3px solid var(--vc); }
.tsf.met { --vc: var(--sd-success); } .tsf.breach { --vc: var(--sd-danger); } .tsf.warn { --vc: var(--sd-warning); } .tsf.ok { --vc: var(--sd-st-progress); } .tsf.none { --vc: var(--sd-steel); }
.tsf-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; color: var(--vc); background: color-mix(in srgb, var(--vc) 13%, transparent); align-self: flex-start; }
.tsf-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.tsf-name { font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--sd-text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tsf-state { font-size: 13.5px; font-weight: 800; color: var(--vc); line-height: 1.15; }
/* meta stacks under the state (was a right-aligned nowrap float that collided with long dates) */
.tsf-meta { font-size: 10px; color: var(--sd-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; margin-top: 1px; }
@media (max-width: 560px) { .tk-slaflags { flex-direction: column; } .tsf-seal { width: auto; flex-direction: row; } }

/* vitals deck */
.tk-vitals { display: grid; grid-template-columns: repeat(4, 1fr); gap: 9px; }
.tkv { display: flex; flex-direction: column; gap: 3px; padding: 11px 12px; border-radius: 13px; background: var(--sd-surface); border: 1px solid var(--sd-border); position: relative; overflow: hidden; }
.tkv-ic { color: var(--sd-text-muted); }
.tkv.good .tkv-ic { color: var(--sd-success); } .tkv.warn .tkv-ic { color: var(--sd-warning); }
.tkv-val { font-size: 17px; font-weight: 800; color: var(--sd-text); line-height: 1.1; }
.tkv-lbl { font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--sd-text-dim); }

/* tabs */
.tkd-tabs { position: relative; display: flex; border-bottom: 1px solid var(--sd-border); }
.tk-tab { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 11px 8px; font-size: 12.5px; font-weight: 600; cursor: pointer; background: none; border: none; color: var(--sd-text-muted); transition: color 0.2s; font-family: inherit; }
.tk-tab:hover { color: var(--sd-text-secondary); }
.tk-tab.on { color: var(--sd-amber); }
.tk-tab-n { display: inline-grid; place-items: center; min-width: 17px; height: 17px; padding: 0 4px; border-radius: 999px; font-size: 9.5px; font-weight: 800; font-family: var(--sd-mono); color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.tk-tab.on .tk-tab-n { color: var(--sd-amber); border-color: var(--sd-amber-border); background: var(--sd-amber-soft); }
.tk-tab-ink { position: absolute; bottom: -1px; left: 0; height: 2px; border-radius: 2px 2px 0 0; background: var(--sd-grad-hero); box-shadow: 0 0 10px var(--sd-fluid-glow); transition: transform 0.34s var(--sd-spring); }

.tk-tabbody { display: flex; flex-direction: column; }
.tk-tabbody > * { display: flex; flex-direction: column; gap: 12px; }

/* conversation */
.thread { display: flex; flex-direction: column; gap: 11px; }
.msg { display: flex; gap: 9px; align-items: flex-start; animation: tkd-msg-in 0.42s var(--sd-spring) both; animation-delay: calc(var(--i, 0) * 0.05s); }
.msg.staff { flex-direction: row-reverse; }
.msg-ava { flex-shrink: 0; width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; font-size: 11px; font-weight: 800; color: var(--sd-text); background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); }
.msg-ava.req { color: #1a1206; background: var(--sd-grad-hero); border: none; }
[data-theme="light"] .msg-ava.req { color: #fff8ec; }
.msg-ava.staff { color: var(--sd-st-progress); border-color: color-mix(in srgb, var(--sd-st-progress) 40%, transparent); background: color-mix(in srgb, var(--sd-st-progress) 12%, transparent); }
.msg-ava.sys { color: var(--sd-steel); }
.msg-bubble { flex: 1; min-width: 0; padding: 10px 13px; border-radius: 13px; background: var(--sd-surface); border: 1px solid var(--sd-border); }
.msg.staff .msg-bubble { background: var(--sd-amber-soft); border-color: var(--sd-amber-border); }
.msg-bubble.note { background: var(--sd-st-hold-soft); border-color: color-mix(in srgb, var(--sd-st-hold) 28%, transparent); }
.msg-head { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; font-size: 12px; color: var(--sd-text-secondary); flex-wrap: wrap; }
.msg-head strong { color: var(--sd-text); }
.note-tag { display: inline-flex; align-items: center; gap: 3px; font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--sd-st-hold); }
.msg-time { margin-left: auto; font-style: normal; font-size: 11px; color: var(--sd-text-dim); }
.msg-body { margin: 0; font-size: 13.5px; color: var(--sd-text); line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; }
/* ── Redaction (superuser governance) ── */
.msg-bubble.redacted { background: var(--sd-surface-glass); border-style: dashed; }
.note-tag.redact { color: var(--sd-danger, #ef4444); }
.msg-body.is-redacted { color: var(--sd-text-dim); font-style: italic; }
.msg-redact-why { margin: 4px 0 0; font-size: 11px; color: var(--sd-text-dim); }
.msg-redact { display: inline-flex; align-items: center; padding: 2px 5px; border-radius: 6px; border: 1px solid transparent; background: transparent; color: var(--sd-text-dim); cursor: pointer; opacity: 0; transition: opacity 0.15s ease, color 0.15s ease; }
.msg-bubble:hover .msg-redact { opacity: 1; }
.msg-redact:hover { color: var(--sd-danger, #ef4444); border-color: color-mix(in srgb, var(--sd-danger, #ef4444) 35%, transparent); }
.tk-mf-quote { margin: 0; padding: 7px 10px; border-left: 2px solid var(--sd-border-strong); border-radius: 0 8px 8px 0; background: var(--sd-surface-glass); font-size: 12px; color: var(--sd-text-secondary); font-style: italic; overflow-wrap: anywhere; }
.tk-mini.danger { border-color: color-mix(in srgb, var(--sd-danger, #ef4444) 45%, transparent); color: var(--sd-danger, #ef4444); }
.tk-mini.danger:hover { background: color-mix(in srgb, var(--sd-danger, #ef4444) 12%, transparent); }
.msg-atts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.msg-att { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--sd-amber); text-decoration: none; padding: 3px 8px; border-radius: 7px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.msg-att:hover { border-color: var(--sd-amber-border); }
@keyframes tkd-msg-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

.csat { display: flex; flex-direction: column; gap: 9px; align-items: center; padding: 16px; border-radius: 14px; background: var(--sd-surface); border: 1px dashed var(--sd-amber-border); text-align: center; }
.csat-q { display: inline-flex; align-items: center; gap: 6px; margin: 0; font-size: 13.5px; font-weight: 700; color: var(--sd-text); }
.stars { display: flex; gap: 4px; }
.stars button { background: none; border: none; cursor: pointer; color: var(--sd-text-dim); padding: 2px; transition: transform 0.15s, color 0.15s; }
.stars button:hover { transform: scale(1.18); }
.stars button.lit { color: var(--sd-gold); }
.csat .tk-inp { width: 100%; }
.csat-done { display: inline-flex; align-items: center; gap: 6px; padding: 10px 12px; border-radius: 11px; background: var(--sd-success-soft); color: var(--sd-success); font-size: 13px; font-weight: 600; }

/* primary/secondary buttons used by the composer + CSAT */
.tk-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; border-radius: 11px; font-size: 13px; font-weight: 650; cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); transition: all 0.18s var(--sd-spring); }
.tk-btn:hover:not(:disabled) { border-color: var(--sd-amber-border); }
.tk-btn.primary { border: none; color: #1a1206; background: var(--sd-grad-hero); box-shadow: 0 8px 22px rgba(251, 146, 60, 0.26); }
[data-theme="light"] .tk-btn.primary { color: #fff8ec; }
.tk-btn.primary:hover:not(:disabled) { filter: brightness(1.05); }
.tk-btn.sm { padding: 8px 13px; font-size: 12.5px; }
.tk-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.composer { border: 1px solid var(--sd-border-strong); border-radius: 13px; overflow: hidden; background: var(--sd-surface-glass); transition: border-color 0.2s, box-shadow 0.28s var(--sd-spring); }
.composer:focus-within { border-color: var(--sd-amber-border); box-shadow: 0 0 0 3px var(--sd-amber-soft); }
.composer.internal { border-color: color-mix(in srgb, var(--sd-st-hold) 40%, transparent); background: var(--sd-st-hold-soft); }
.composer textarea { width: 100%; padding: 12px 14px; background: none; border: none; outline: none; color: var(--sd-text); font-size: 13.5px; font-family: inherit; resize: vertical; }
.composer-foot { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-top: 1px solid var(--sd-border); }
.cf-chk { display: inline-flex; align-items: center; gap: 5px; cursor: pointer; font-size: 11.5px; color: var(--sd-text-secondary); }
.cf-chk.on { color: var(--sd-st-hold); }
.cf-hint { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--sd-text-dim); }

/* panels */
.tk-panel { border: 1px solid var(--sd-border); border-radius: 13px; padding: 13px 15px; background: var(--sd-surface); animation: tkd-panel-in 0.42s var(--sd-spring) both; animation-delay: calc(var(--i, 0) * 0.04s); }
.tk-panel.good { border-color: color-mix(in srgb, var(--sd-success) 28%, var(--sd-border)); }
.tk-panel.danger { border-color: color-mix(in srgb, var(--sd-danger) 26%, var(--sd-border)); }
@keyframes tkd-panel-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
.tk-ph { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
.tk-ph h4 { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 800; color: var(--sd-text); margin: 0; }
.tk-state-pills { display: inline-flex; gap: 5px; }
.tk-mini { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 8px; font-size: 11.5px; font-weight: 600; cursor: pointer; border: 1px solid var(--sd-border-strong); background: var(--sd-surface-glass); color: var(--sd-text-secondary); font-family: inherit; }
.tk-mini:hover { border-color: var(--sd-amber-border); color: var(--sd-text); }
.tk-mini.primary { border: none; background: var(--sd-grad-hero); color: #1a1206; }
[data-theme="light"] .tk-mini.primary { color: #fff8ec; }
.tk-edit-acts { display: inline-flex; gap: 6px; }
/* refactored fact grid — each cell is an SdKvRow (icon + label + value) */
.tk-facts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.tk-kv { display: grid; grid-template-columns: 1fr 1fr; gap: 11px 16px; }
.tk-kv > div { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.tk-kv > div.full { grid-column: 1 / -1; }
.tk-kv span { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; color: var(--sd-text-dim); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }
.tk-kv b { font-size: 13px; color: var(--sd-text); font-weight: 600; overflow-wrap: anywhere; }
.tk-kv b.breach { color: var(--sd-danger); }
.pcode { font-style: normal; font-size: 10px; font-weight: 800; font-family: var(--sd-mono); color: var(--sd-text-dim); }
.tk-edit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.tk-edit-grid > div { display: flex; flex-direction: column; gap: 5px; }
.tk-edit-grid > div.full { grid-column: 1 / -1; }
.tk-desc { margin-top: 11px; display: flex; flex-direction: column; gap: 4px; }
.tk-desc-k { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--sd-text-dim); }
.tk-desc p { margin: 0; font-size: 13px; color: var(--sd-text-secondary); line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; }
.tk-tagrow { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 11px; }
.tk-tagchip { font-size: 10.5px; font-weight: 600; color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border); padding: 3px 9px; border-radius: 999px; }
.tk-rca { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--sd-text-secondary); }
.tk-rca b { color: var(--sd-text); }
.tk-note-line { margin: 9px 0 0; font-size: 12.5px; color: var(--sd-text-secondary); line-height: 1.5; }
.tk-attach { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
.tk-link { color: var(--sd-amber); font-size: 12.5px; text-decoration: none; display: inline-flex; align-items: center; gap: 5px; overflow-wrap: anywhere; }
.tk-link:hover { text-decoration: underline; }
.tk-links { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 8px; }
.tk-link-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border); padding: 4px 9px; border-radius: 999px; }
.tk-form-foot { display: flex; justify-content: flex-end; grid-column: 1 / -1; }

/* vendor relay panel */
.tk-vpanel.hot { border-color: var(--sd-vendor-overdue-soft); box-shadow: inset 0 0 0 1px var(--sd-vendor-overdue-soft); }
.tk-vbadge { display: inline-flex; align-items: center; gap: 3px; margin-left: 8px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--sd-vendor-overdue); background: var(--sd-vendor-overdue-soft); padding: 2px 7px; border-radius: 999px; vertical-align: middle; }
.tk-vacts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.tk-vbtn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border-radius: 10px; font-size: 12px; font-weight: 650; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border-strong); transition: border-color 0.18s, color 0.18s; }
.tk-vbtn:hover:not(:disabled) { border-color: var(--sd-vendor-signal); color: var(--sd-text); }
.tk-vbtn.primary { color: #22160a; background: var(--sd-vendor-grad); border-color: transparent; }
.tk-vbtn:disabled { opacity: 0.5; cursor: not-allowed; }
.tk-vlog { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; padding-top: 11px; border-top: 1px solid var(--sd-border); }
.tk-vlog-h { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.14em; color: var(--sd-vendor-steel); }
.tk-vmsg { display: flex; flex-direction: column; gap: 3px; padding: 9px 11px; border-radius: 10px; background: var(--sd-vendor-steel-soft); border: 1px solid var(--sd-border); }
.tk-vmsg-b { font-size: 12.5px; color: var(--sd-text); line-height: 1.4; }
.tk-vmsg-t { font-size: 10.5px; color: var(--sd-text-dim); }

/* collaborators (details) */
.tk-collab-list { display: flex; flex-direction: column; gap: 8px; }
.tk-collab { display: flex; align-items: center; gap: 10px; }
.tk-cava { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; font-size: 11px; font-weight: 800; color: var(--sd-text); background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); flex-shrink: 0; }
.tk-cava.owner { color: #1a1206; background: var(--sd-grad-hero); border: none; }
[data-theme="light"] .tk-cava.owner { color: #fff8ec; }
.tk-cava.req { color: var(--sd-st-progress); border-color: color-mix(in srgb, var(--sd-st-progress) 40%, transparent); }
.tk-cmeta { display: flex; flex-direction: column; min-width: 0; }
.tk-cmeta b { font-size: 13px; font-weight: 700; color: var(--sd-text); }
.tk-cmeta span { font-size: 11px; color: var(--sd-text-muted); }

/* timeline */
.tk-timeline { position: relative; display: flex; flex-direction: column; gap: 4px; padding-left: 4px; }
.tk-timeline::before { content: ""; position: absolute; left: 16px; top: 8px; bottom: 8px; width: 2px; background: linear-gradient(180deg, var(--sd-amber-border), var(--sd-border) 60%, transparent); }
.tk-tl-row { position: relative; display: flex; gap: 13px; padding: 7px 0; animation: tkd-msg-in 0.4s var(--sd-spring) both; animation-delay: calc(var(--i, 0) * 0.04s); }
.tk-tl-node { position: relative; z-index: 1; flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border-strong); }
.tk-tl-node.info { color: var(--sd-st-progress); border-color: color-mix(in srgb, var(--sd-st-progress) 38%, transparent); }
.tk-tl-node.good { color: var(--sd-success); border-color: color-mix(in srgb, var(--sd-success) 38%, transparent); }
.tk-tl-node.warn { color: var(--sd-warning); border-color: color-mix(in srgb, var(--sd-warning) 40%, transparent); }
.tk-tl-node.danger { color: var(--sd-danger); border-color: color-mix(in srgb, var(--sd-danger) 40%, transparent); }
.tk-tl-node.open { color: var(--sd-amber); border-color: var(--sd-amber-border); }
.tk-tl-row.head .tk-tl-node { box-shadow: 0 0 0 3px var(--sd-amber-soft); }
.tk-tl-body { display: flex; flex-direction: column; gap: 2px; padding-top: 2px; min-width: 0; }
.tk-tl-head { display: flex; align-items: baseline; gap: 8px; }
.tk-tl-head b { font-size: 13px; color: var(--sd-text); font-weight: 700; }
.tk-tl-head i { font-style: normal; font-size: 11px; color: var(--sd-text-dim); }
.tk-tl-detail { margin: 0; font-size: 12px; color: var(--sd-text-secondary); line-height: 1.4; overflow-wrap: anywhere; }
.tk-tl-by { font-size: 11px; color: var(--sd-text-dim); }

.tk-empty { text-align: center; color: var(--sd-text-dim); font-size: 13px; padding: 28px; margin: 0; }
.tk-error { display: flex; align-items: center; gap: 6px; color: var(--sd-danger); font-size: 12.5px; margin: 4px 0 0; }

/* ░ sticky action dock ░ */
.tkd-foot { position: relative; z-index: 5; flex-shrink: 0; border-top: 1px solid var(--sd-border); background: linear-gradient(0deg, var(--sd-surface-elevated), color-mix(in srgb, var(--sd-surface-elevated) 80%, transparent)); backdrop-filter: blur(12px); }
.tk-dock { display: flex; flex-wrap: wrap; gap: 6px; padding: 11px 16px; }
.tk-act { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 10px; font-size: 12px; font-weight: 650; cursor: pointer; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); font-family: inherit; }
.tk-act:hover { border-color: var(--sd-amber-border); }
.tk-act.warn { color: var(--sd-st-escalated); }
.tk-act.good { color: var(--sd-success); }
.tk-act.danger { color: var(--sd-danger); }
.tk-act.on { border-color: var(--sd-amber-border); color: var(--sd-amber); }
.tk-act.primary { border: none; background: var(--sd-grad-hero); color: #1a1206; }
[data-theme="light"] .tk-act.primary { color: #fff8ec; }
.tk-act.ghost { background: transparent; }
.tk-act:disabled { opacity: 0.5; cursor: not-allowed; }

/* action sheet (slide-up) */
.tk-sheet { position: relative; margin: 0; padding: 16px 16px 14px; border-top: 1px solid var(--sd-border); background: var(--sd-surface-glass); display: flex; flex-direction: column; gap: 8px; max-height: 56vh; overflow-y: auto; }
.tk-sheet h4 { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 800; color: var(--sd-text); margin: 0 0 2px; }
.tk-sheet-x { position: absolute; top: 12px; right: 14px; width: 28px; height: 28px; display: grid; place-items: center; border-radius: 8px; cursor: pointer; background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text-muted); }
.tk-sheet-x:hover { color: var(--sd-text); }
.tk-sheet-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
.tk-form-note { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--sd-text-muted); margin: 0; }
.tk-il { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--sd-text-dim); }
.tk-inp { width: 100%; padding: 9px 11px; border-radius: 9px; font-size: 13px; font-family: inherit; background: var(--sd-surface); border: 1px solid var(--sd-border-strong); color: var(--sd-text);
  transition: border-color 0.22s var(--sd-spring), box-shadow 0.28s var(--sd-spring), background 0.22s; }
.tk-inp::placeholder { color: var(--sd-text-dim); }
.tk-inp:hover:not(:focus) { border-color: var(--sd-amber-border); }
.tk-inp:focus { outline: none; border-color: var(--sd-amber-border); background: var(--sd-surface-glass); box-shadow: 0 0 0 3px var(--sd-amber-soft), 0 6px 18px -10px var(--sd-fluid-glow); }
.tk-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.tk-chk { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--sd-text-secondary); cursor: pointer; }

.tk-people { display: flex; flex-direction: column; gap: 5px; }
.tk-person { display: flex; align-items: center; gap: 9px; padding: 7px 10px; border-radius: 9px; cursor: pointer; font-family: inherit; background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text-secondary); text-align: left; }
.tk-person:hover { border-color: var(--sd-amber-border); color: var(--sd-text); background: var(--sd-amber-soft); }
.tk-person.on { border-color: var(--sd-amber-border); }
.tk-pava { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; font-size: 10.5px; font-weight: 800; color: var(--sd-text); background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); flex-shrink: 0; }
.tk-pbody { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.tk-pbody b { font-size: 12.5px; font-weight: 700; color: var(--sd-text); }
.tk-pbody i { font-style: normal; font-size: 10.5px; color: var(--sd-text-muted); }
.tk-pagent { color: var(--sd-amber); }
.tk-pcur { color: var(--sd-success); }
.tk-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.tk-chip { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 600; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border-strong); padding: 3px 4px 3px 8px; border-radius: 999px; }
.tk-chip-ava { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; font-size: 9px; font-weight: 800; color: var(--sd-text); background: var(--sd-surface-glass); }
.tk-chip button { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 50%; cursor: pointer; background: none; border: none; color: var(--sd-text-dim); }
.tk-chip button:hover { color: var(--sd-danger); }
.tk-search { display: flex; align-items: center; gap: 8px; padding: 8px 11px; border-radius: 10px; background: var(--sd-surface); border: 1px solid var(--sd-border-strong); color: var(--sd-text-muted); }
.tk-search:focus-within { border-color: var(--sd-amber-border); }
.tk-search input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--sd-text); font-size: 12.5px; font-family: inherit; }

.tk-more { display: flex; flex-direction: column; padding: 8px 12px; gap: 2px; border-top: 1px solid var(--sd-border); background: var(--sd-surface-glass); }
.tk-more-item { display: inline-flex; align-items: center; gap: 9px; padding: 9px 11px; border-radius: 9px; font-size: 12.5px; cursor: pointer; background: none; border: none; color: var(--sd-text-secondary); text-align: left; font-family: inherit; }
.tk-more-item:hover { background: var(--sd-surface); color: var(--sd-text); }
.tk-more-item.danger:hover { background: var(--sd-danger-soft); color: var(--sd-danger); }
.tk-more-item[disabled] { opacity: 0.45; cursor: not-allowed; }
.tk-more-sep { height: 1px; margin: 4px 2px; background: var(--sd-border); }

/* mini-form popovers (log time / merge / follow-up / stakeholder update) */
.tk-mform { gap: 8px; padding: 12px; }
.tk-mf-h { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 12.5px; font-weight: 700; color: var(--sd-text); }
.tk-mf-h :deep(svg), .tk-mf-h svg { color: var(--sd-amber); }
.tk-mf-row { display: flex; gap: 8px; align-items: center; }
.tk-mf-ico { color: var(--sd-text-dim); flex: none; }
.tk-mf-list { display: flex; flex-direction: column; gap: 4px; max-height: 176px; overflow-y: auto; }
.tk-mf-item { display: grid; grid-template-columns: auto 1fr auto; gap: 9px; align-items: center; padding: 7px 9px;
  border-radius: 9px; border: 1px solid var(--sd-border); background: transparent; cursor: pointer; text-align: left;
  transition: border-color 0.15s, background 0.15s; }
.tk-mf-item:hover { background: var(--sd-surface-glass); }
.tk-mf-item.on { border-color: var(--sd-amber); background: color-mix(in srgb, var(--sd-amber) 8%, transparent); }
.tk-mf-item b { font-size: 11px; color: var(--sd-amber); white-space: nowrap; }
.tk-mf-item span { font-size: 12px; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tk-mf-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 2px; }
.tk-mf-note { margin: 0; font-size: 10.5px; color: var(--sd-text-dim); }

.spin { animation: tkd-spin 1s linear infinite; }
@keyframes tkd-spin { to { transform: rotate(360deg); } }
@keyframes tkd-flow { to { background-position: 200% 0; } }
@keyframes tkd-pulse { 0%, 100% { box-shadow: 0 0 6px var(--mc); } 50% { box-shadow: 0 0 16px var(--mc); transform: translate(50%, -50%) scale(1.35); } }
@keyframes tkd-beacon { 0%, 100% { box-shadow: 0 0 0 4px var(--sd-amber-soft); } 50% { box-shadow: 0 0 0 7px color-mix(in srgb, var(--sd-amber) 8%, transparent); } }

@media (max-width: 560px) {
  .tk-kv, .tk-facts, .tk-edit-grid, .tk-grid2 { grid-template-columns: 1fr; }
  .tk-vitals { grid-template-columns: repeat(2, 1fr); }
}

/* honour OS reduce-motion unless cinematic mode is forced on */
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .sk,
  html:not([data-cinematic="on"]) .msg,
  html:not([data-cinematic="on"]) .tk-panel,
  html:not([data-cinematic="on"]) .tk-tl-row,
  html:not([data-cinematic="on"]) .tkd-orb,
  html:not([data-cinematic="on"]) .tkf-ring,
  html:not([data-cinematic="on"]) .tkl-fill,
  html:not([data-cinematic="on"]) .tkl-node.cur .tkl-dot,
  html:not([data-cinematic="on"]) .tk-sla-row.breach .tsl-comet,
  html:not([data-cinematic="on"]) .tsf-seal.breach { animation: none; }
  html:not([data-cinematic="on"]) .tsl-fill,
  html:not([data-cinematic="on"]) .tk-tab-ink { transition: none; }
}
</style>
