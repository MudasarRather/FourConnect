<template>
  <div class="sd-qcf">
    <!-- ═══ THE DECISION GRAPH — hero console ═══ -->
    <SdQueueConfigHero
      :queues="allQueues" :rules="heroRules" :slas="slas" :skills="skills"
      :ledger-total="ledgerTotal" :probe="probe"
      @pick="goPanel" @new="openQueueModal()" @backfill="openBackfill" @edit="onGraphEdit" />

    <!-- ═══ node dock (panel nav) ═══ -->
    <nav class="qcf-dock" aria-label="Config sections">
      <span class="qcf-dock-rail" aria-hidden="true" />
      <Motion v-for="(s, i) in SECTIONS" :key="s.key" as="button" class="qcf-node" :class="{ on: section === s.key }"
        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.35, delay: 0.35 + i * 0.05, ease: [0.16, 1, 0.3, 1] }"
        :while-hover="{ y: -3 }" :while-tap="{ scale: 0.96 }" @click="goPanel(s.key)">
        <span class="qcf-node-port" aria-hidden="true" />
        <component :is="s.icon" :size="14" />
        <span class="qcf-node-lb">{{ s.label }}</span>
        <b v-if="s.count() != null" class="qcf-node-n sd-mono">{{ s.count() }}</b>
      </Motion>
    </nav>

    <!-- ═══ A · LANES — THE BLADE RACK ═══ -->
    <section v-if="section === 'queues'" class="qcf-panel gstack">
      <SdLaneBladeRack :lanes="bladeLanes"
        @new="openQueueModal()" @edit="gotoLaneById" @remove="removeLaneById" @backfill="openBackfill" />
    </section>

    <!-- ═══ B · ROUTING RULES — THE INTERCEPT GAUNTLET + PROBE CHAMBER ═══ -->
    <section v-else-if="section === 'rules'" class="qcf-panel gstack">
      <SdRuleGauntlet :rules="gauntletRules" :trace="probeTrace"
        @new="openRuleModal(null, 'on_create')" @edit="editRuleById" @delete="deleteRuleById"
        @history="historyRuleById" @nudge="nudgeRuleById" @lane="gotoLaneById" />

      <!-- ═══ THE PROBE CHAMBER — full-width dry-run console under the corridor ═══ -->
      <div class="qpc">
        <span class="qpc-sweep" aria-hidden="true" />

        <!-- zone 1 · payload composer -->
        <div class="qpc-compose">
          <header class="qpc-head">
            <span class="qpc-lamp" :class="{ busy: simBusy, done: !!simResult && !simBusy }" aria-hidden="true" />
            <FlaskConical :size="14" /> <b>Probe chamber</b>
            <span class="qpc-st sd-mono">{{ simBusy ? 'CHARGING' : simResult ? 'REPORT READY' : 'DRY RUN' }}</span>
          </header>
          <p class="qpc-sub">Compose a phantom ticket and drop it down the gauntlet above — nothing is written.</p>
          <Motion as="label" class="qpc-f wide" :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(0)">
            <span class="sd-mono">SUBJECT</span>
            <input v-model="sim.subject" class="qcf-inp" placeholder="e.g. VPN down at the Pune office" />
          </Motion>
          <div class="qpc-grid">
            <Motion as="div" class="qpc-f" :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(1)">
              <span class="sd-mono">TYPE</span><SdSelect v-model="sim.ticket_type" :options="typeOpts" placeholder="Any type" /></Motion>
            <Motion as="div" class="qpc-f" :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(2)">
              <span class="sd-mono">PRIORITY</span><SdSelect v-model="sim.priority" :options="priorityOpts" placeholder="Any priority" /></Motion>
            <Motion as="div" class="qpc-f" :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(3)">
              <span class="sd-mono">IMPACT</span><SdSelect v-model="sim.impact" :options="severityOpts" placeholder="Any impact" /></Motion>
            <Motion as="div" class="qpc-f" :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(4)">
              <span class="sd-mono">CATEGORY</span><SdSelect v-model="sim.category_id" :options="categoryOpts" placeholder="Any category" /></Motion>
            <Motion as="div" class="qpc-f" :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(5)">
              <span class="sd-mono">SUBCATEGORY</span><SdSelect v-model="sim.subcategory_id" :options="subcategoryOpts" placeholder="Any subcategory" /></Motion>
            <Motion as="div" class="qpc-f" :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(6)">
              <span class="sd-mono">ORGANIZATION</span><SdSelect v-model="sim.organization_id" :options="orgOpts" placeholder="Any org" /></Motion>
          </div>
          <Motion as="label" class="qpc-f wide" :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(7)">
            <span class="sd-mono">TAGS</span>
            <input v-model="sim.tags" class="qcf-inp" placeholder="vip, network, escalate-fast…" />
          </Motion>
        </div>

        <!-- zone 2 · fire control -->
        <div class="qpc-fire">
          <button class="qpc-launch" :class="{ charging: simBusy }" :disabled="simBusy" title="Dry-run this phantom ticket" @click="runSim">
            <span class="qpc-launch-halo" aria-hidden="true" />
            <span class="qpc-launch-ring" aria-hidden="true" />
            <span class="qpc-launch-core"><Loader v-if="simBusy" :size="20" class="qcf-spin" /><Play v-else :size="20" /></span>
          </button>
          <b class="qpc-fire-lb sd-mono">{{ simBusy ? 'CHARGING…' : 'DROP THE PROBE' }}</b>
          <span v-if="probe" class="qpc-seq sd-mono">RUN #{{ String(probe.seq).padStart(2, '0') }}</span>
          <span v-else class="qpc-seq sd-mono dim">CORRIDOR IDLE</span>
        </div>

        <!-- zone 3 · trajectory report -->
        <div class="qpc-report">
          <header class="qpc-head"><Route :size="13" /> <b>Trajectory report</b></header>
          <Presence>
            <Motion v-if="simResult" key="out" as="div" class="qpc-out" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
              :exit="{ opacity: 0, y: -8 }" :transition="{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }">
              <div v-if="simResult.matched.length" class="qpc-hits">
                <Motion v-for="(m, mi) in simResult.matched" :key="m.rule_id" as="div" class="qpc-hit sd-mono"
                  :initial="{ opacity: 0, x: -12 }" :animate="{ opacity: 1, x: 0 }"
                  :transition="{ duration: 0.32, delay: 0.12 + mi * 0.1, ease: [0.16, 1, 0.3, 1] }">
                  <Zap :size="11" /> GATE {{ String(m.order_index).padStart(2, '0') }} · {{ m.name }}
                  <em v-if="m.stopped">SEALED THE CHAIN</em>
                </Motion>
              </div>
              <p v-else class="qpc-miss sd-mono">NO GATE CAPTURED IT — FELL TO THE CATEGORY ROUTER</p>
              <div class="qpc-path">
                <span class="qpc-hop sd-mono">INTAKE</span>
                <ArrowRight :size="11" class="qpc-hop-arrow" />
                <template v-if="simResult.decision.overflow_from">
                  <span class="qpc-hop strike sd-mono" :title="'At capacity'">{{ simResult.decision.overflow_from }}</span>
                  <ArrowRight :size="11" class="qpc-hop-arrow spill" />
                </template>
                <span class="qpc-hop dest sd-mono">{{ simResult.decision.queue_name || simResult.decision.team_name || 'UNROUTED' }}</span>
              </div>
              <div class="qpc-effects">
                <span v-if="simResult.decision.via" class="via sd-mono">via {{ simResult.decision.via }}</span>
                <span v-if="simResult.fallback_used" class="fb sd-mono">FALLBACK ROUTER</span>
                <span v-if="simResult.decision.overflow_from" class="fb spill sd-mono">CAPACITY SPILL</span>
                <span v-if="simResult.decision.priority" class="via sd-mono">priority → {{ simResult.decision.priority }}</span>
                <span v-if="simResult.decision.queue_sla_package" class="via sd-mono">SLA → {{ simResult.decision.queue_sla_package }}</span>
              </div>
            </Motion>
            <Motion v-else key="idle" as="div" class="qpc-idle" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
              :exit="{ opacity: 0 }" :transition="{ duration: 0.3 }">
              <span class="qpc-idle-orb" aria-hidden="true" />
              <p class="sd-mono">NO PROBE DROPPED YET</p>
              <span>The report writes itself here — matched gates, the final lane, spills and SLA effects.</span>
            </Motion>
          </Presence>
        </div>
      </div>
    </section>

    <!-- ═══ C · SLA CLOCKS — THE CADENCE FIELD ═══ -->
    <section v-else-if="section === 'sla'" class="qcf-panel gstack">
      <SdSlaCadenceField :policies="slas" :queues="allQueues" :organizations="pickers.organizations || []"
        @new="openSlaModal()" @edit="editSlaById" @lanes="goPanel('queues')" />
    </section>

    <!-- ═══ D · SKILLS — THE CERTIFICATION GRID ═══ -->
    <section v-else-if="section === 'skills'" class="qcf-panel gstack">
      <SdSkillGrid :skills="skills" :agents="agentPool" :queues="allQueues" :busy-skills="certBusy"
        @new="openSkillModal()" @edit="editSkillById" @toggle="toggleCert" @lane="gotoLaneById" />
    </section>

    <!-- ═══ E · HOURS & HOLIDAYS — THE DAYWHEEL ═══ -->
    <section v-else-if="section === 'hours'" class="qcf-panel gstack">
      <SdOpsDaywheel :teams="teams" :holidays="holidays" :busy-set="hoursBusy"
        @save="saveCrewHours" @add-holiday="addHoliday" @remove-holiday="removeHoliday" />
    </section>

    <!-- ═══ F · ESCALATION — THE ASCENT PROFILE ═══ -->
    <section v-else-if="section === 'escalation'" class="qcf-panel gstack">
      <SdAscentProfile :policies="ascentPolicies"
        @new="openRuleModal(null, 'time_based')" @edit="editRuleById" @delete="deleteRuleById"
        @history="historyRuleById" @toggle="toggleRuleLive" />
    </section>

    <!-- ═══ G · LEDGER — THE CLOUD CHAMBER ═══ -->
    <section v-else-if="section === 'ledger'" class="qcf-panel gstack">
      <SdLedgerChamber :items="ledgerItems" :total="ledgerTotal" :page="ledgerPage" :limit="LEDGER_LIMIT"
        :entity="ledgerEntity" :busy="ledgerBusy"
        @filter="setLedgerEntity" @page="setLedgerPage" @history="openRevisions" />
    </section>

    <!-- ═══ H · WIRES — THE UPLINK ARRAY ═══ -->
    <section v-else-if="section === 'wires'" class="qcf-panel gstack">
      <SdUplinkArray :wires="wires" :busy="wireBusy" :testing="wireTesting" :test-result="wireTestResult"
        @toggle="toggleWire" @save-url="saveWebhookUrl" @test="fireTestTransmission" />
    </section>

    <!-- ═══════════ MODALS — the INSTRUMENT CASES (SdCfgModal two-pane) ═══════════ -->
    <!-- Lane editor -->
    <SdCfgModal :open="queueModal" :eyebrow="editingQueue ? 'EDIT LANE' : 'NEW LANE'"
      :title="editingQueue ? `Edit ${queueForm.name || 'lane'}` : 'Lay a new lane'" width="940px"
      :ready="laneValid" :actor-name="actor.name" :actor-email="actor.email" @close="queueModal = false">
      <template #preview>
        <!-- BLADE PROOF — the lane forms as a live 1U blade, mirroring THE BLADE RACK -->
        <div class="pvw-blade" :style="{ '--lc': colorOk && queueForm.color ? queueForm.color : 'var(--sd-qc-core)' }">
          <span class="pvw-vents" aria-hidden="true" />
          <div class="pvw-power" aria-hidden="true">
            <span class="pvw-lamp2" :class="{ on: queueForm.is_active }" />
            <span class="pvw-pipe" />
          </div>
          <div class="pvw-bmain">
            <header class="pvw-bh">
              <b>{{ queueForm.name || 'Unnamed lane' }}</b>
              <span v-if="queueForm.is_default" class="pvw-master sd-mono"><Crown :size="8" /> MASTER</span>
            </header>
            <span class="pvw-bsub sd-mono">
              <i class="pvw-tier" :style="queueForm.tier ? { color: TIER_META[queueForm.tier].accent } : {}">
                {{ queueForm.tier ? TIER_META[queueForm.tier].short : 'FRONTLINE' }}</i>
              <template v-if="queueForm.code"> · {{ queueForm.code }}</template>
            </span>
            <div class="pvw-leds" :class="{ scan: bladeScanning }" aria-hidden="true">
              <i v-for="sg in 12" :key="sg" class="pvw-led" :class="{ on: sg <= bladeLit }" :style="{ '--si': sg }" />
            </div>
            <span class="pvw-led-lb sd-mono">{{ bladeLedCaption }}</span>
            <div class="pvw-chips2 sd-mono">
              <span><Users :size="9" /> {{ teamOpts.find(t => String(t.value) === String(queueForm.team_id))?.label || 'no crew' }}</span>
              <span><Repeat :size="9" /> {{ queueForm.auto_assign ? methodShort(queueForm.assignment_method) : 'manual pick-up' }}</span>
              <span><Timer :size="9" /> {{ queueForm.sla_package_id ? slaName(queueForm.sla_package_id) : 'desk default' }}</span>
              <span v-if="queueForm.overflow_queue_id" class="spill"><CornerDownRight :size="9" /> {{ laneName(queueForm.overflow_queue_id) }}</span>
            </div>
            <div class="pvw-drain">
              <span class="lb sd-mono">DRAIN {{ queueForm.queue_priority ?? 50 }}</span>
              <i class="bar"><i class="fill" :style="{ width: (queueForm.queue_priority ?? 50) + '%' }" /></i>
            </div>
          </div>
        </div>
        <p v-if="defaultCrownNote" class="pvw-note warn"><TriangleAlert :size="11" /> {{ defaultCrownNote }}</p>
        <p v-if="overflowCycleWarn" class="pvw-note danger"><TriangleAlert :size="11" /> {{ overflowCycleWarn }}</p>

        <!-- ROUTING BRIEF — a live narration of what this lane will DO, line by line -->
        <div class="pvw-brief">
          <span class="pvw-brief-h sd-mono"><Route :size="10" /> ROUTING BRIEF <i>· forms as you configure</i></span>
          <div v-for="(b, bi) in laneBrief" :key="b.k" class="pvw-bl" :class="{ on: b.on, warn: b.warn }" :style="{ '--i': bi }">
            <span class="pvw-bl-rail" aria-hidden="true"><i class="node" /><i v-if="bi < laneBrief.length - 1" class="wire" /></span>
            <div class="pvw-bl-body">
              <b class="sd-mono">{{ b.t }}</b>
              <span>{{ b.d }}</span>
            </div>
          </div>
        </div>
      </template>

      <div class="qm-grid2">
        <label class="qm-f"><span>Name <em>*</em></span><input v-model.trim="queueForm.name" class="qcf-inp" placeholder="e.g. Billing" /></label>
        <label class="qm-f"><span>Code <i>· short badge</i></span><input v-model.trim="queueForm.code" class="qcf-inp" placeholder="BILL" /></label>
      </div>
      <div class="qm-f"><span>Colour <i>· the lane's spine across the desk</i></span><SdCfgColor v-model="queueForm.color" /></div>
      <label class="qm-f"><span>Description <i>· why this lane exists — lands in the ledger</i></span>
        <textarea v-model.trim="queueForm.description" class="qcf-inp qm-area" rows="2" placeholder="e.g. Dedicated billing intake for enterprise clients…" /></label>
      <div class="qm-f">
        <span>Tier</span>
        <div class="qm-seg">
          <button v-for="t in [null, 1, 2, 3]" :key="String(t)" type="button" class="qm-seg-b"
            :class="{ on: queueForm.tier === t }" :style="t ? { '--sc': TIER_META[t].accent } : {}"
            @click="queueForm.tier = t">{{ t ? TIER_META[t].label : 'Untiered' }}</button>
        </div>
      </div>
      <div class="qm-grid2">
        <div class="qm-f"><span>Crew (team)</span><SdSelect v-model="queueForm.team_id" :options="teamOpts" placeholder="No team" /></div>
        <div class="qm-f"><span>Drain priority <i>· higher serves first</i></span>
          <div class="qm-range">
            <input v-model.number="queueForm.queue_priority" type="range" min="1" max="100" class="qm-slider" />
            <b class="sd-mono">{{ queueForm.queue_priority ?? 50 }}</b>
          </div>
        </div>
      </div>
      <div class="qm-f">
        <span>Assignment</span>
        <div class="qm-seg">
          <button v-for="m in METHODS" :key="m.value" type="button" class="qm-seg-b" :class="{ on: queueForm.assignment_method === m.value }"
            @click="queueForm.assignment_method = m.value"><component :is="m.icon" :size="13" /> {{ m.label }}</button>
        </div>
        <div class="qm-grid2">
          <SdCfgSwitch v-model="queueForm.auto_assign" label="Auto-assign on arrival"
            :hint="queueForm.auto_assign ? 'The lane claims an agent the moment work lands' : 'Work waits unowned for Serve-next / claim'" />
          <label v-if="queueForm.assignment_method === 'load_balanced'" class="qm-f">
            <span>Cap per agent <i>· soft ceiling</i></span>
            <input v-model.number="queueForm.max_agent_load" class="qcf-inp" type="number" min="1" placeholder="∞ unlimited" />
          </label>
        </div>
      </div>
      <div class="qm-f">
        <span>Serve order <i>· play-mode & drain order inside the lane</i></span>
        <div class="qm-seg">
          <button v-for="s in SERVE_ORDERS" :key="s.value" type="button" class="qm-seg-b" :class="{ on: queueForm.serve_order === s.value }"
            :title="s.blurb" @click="queueForm.serve_order = s.value">{{ s.label }}</button>
        </div>
      </div>
      <div class="qm-v2">
        <span class="qm-v2-h sd-mono"><Gauge :size="11" /> SERVICE POLICY</span>
        <div class="qm-grid3">
          <div class="qm-f"><span>SLA policy <i>· org contracts win</i></span>
            <SdSelect v-model="queueForm.sla_package_id" :options="slaOptsWithNone" placeholder="Desk default" /></div>
          <label class="qm-f"><span>Capacity <i>· open-ticket cap</i></span>
            <input v-model.number="queueForm.capacity_limit" class="qcf-inp" type="number" min="1" placeholder="∞ unlimited" /></label>
          <div class="qm-f"><span>Overflow lane <i>· spill when full</i></span>
            <SdSelect v-model="queueForm.overflow_queue_id" :options="overflowOpts" placeholder="None — hold" /></div>
        </div>
        <p v-if="overflowCycleWarn" class="qm-hint warn"><TriangleAlert :size="12" /> {{ overflowCycleWarn }}</p>
        <p v-else-if="queueForm.capacity_limit && !queueForm.overflow_queue_id" class="qm-hint">
          At capacity with no overflow lane, new work still lands here (capacity is a signal, never a wall).</p>
      </div>
      <div class="qm-f">
        <span>Routes categories <i>· subcategory picks beat parent picks</i></span>
        <div v-if="categoryList.length" class="qm-chips">
          <button v-for="c in categoryList" :key="c.id" type="button" class="qm-chip"
            :class="{ on: queueForm.category_ids.includes(String(c.id)) }" @click="toggleIn(queueForm.category_ids, String(c.id))">
            <Check v-if="queueForm.category_ids.includes(String(c.id))" :size="10" class="qm-chip-tick" />{{ c.name }}</button>
        </div>
        <p v-else class="qm-hint">No categories yet.</p>
      </div>
      <div class="qm-f">
        <span>Requires skills <i>· auto-assign prefers agents holding ALL of these</i></span>
        <div v-if="skills.length" class="qm-chips">
          <button v-for="s in skills" :key="s.id" type="button" class="qm-chip skill"
            :class="{ on: queueForm.skill_ids.includes(String(s.id)) }" @click="toggleIn(queueForm.skill_ids, String(s.id))">
            <Sparkles :size="10" /> {{ s.name }}</button>
        </div>
        <p v-else class="qm-hint">No skills defined yet (Skills section).</p>
      </div>
      <div class="qm-grid2">
        <SdCfgSwitch v-model="queueForm.is_default" label="Default fallback lane" :disabled="editingQueue?.is_default"
          hint="Unroutable tickets land here — exactly one lane wears the crown" />
        <SdCfgSwitch v-if="editingQueue" v-model="queueForm.is_active" label="Active" :disabled="editingQueue?.is_default"
          :hint="queueForm.is_active ? 'Routing and serve-next see this lane' : 'Retired — invisible to routing'" />
      </div>

      <template #footer>
        <button class="qcf-btn" @click="queueModal = false">Cancel</button>
        <span style="flex:1" />
        <Motion as="button" class="qcf-btn primary" :disabled="busy || !laneValid" :while-hover="laneValid ? { y: -2 } : {}"
          :while-tap="laneValid ? { scale: 0.97 } : {}" @click="saveQueue">
          <Loader v-if="busy" :size="13" class="qcf-spin" /> {{ editingQueue ? 'Save lane' : 'Lay lane' }}
        </Motion>
      </template>
    </SdCfgModal>

    <!-- Lane decommission — THE DECOMMISSION BAY (danger instrument case) -->
    <SdCfgModal :open="!!deleteQueueTarget" tone="danger" eyebrow="DECOMMISSION BAY"
      :title="`Pull ${deleteQueueTarget?.name || 'this lane'} from the rack?`" width="880px"
      :ready="doomDirectivesOk" :actor-name="actor.name" :actor-email="actor.email" @close="closeDoom">
      <template #preview>
        <!-- the blade, flatlining -->
        <div v-if="deleteQueueTarget" class="pvw-blade doom" :style="{ '--lc': deleteQueueTarget.color || 'var(--sd-qc-halt)' }">
          <span class="pvw-vents" aria-hidden="true" />
          <div class="pvw-power" aria-hidden="true">
            <span class="pvw-lamp2 doom" />
            <span class="pvw-pipe" />
          </div>
          <div class="pvw-bmain">
            <header class="pvw-bh">
              <b>{{ deleteQueueTarget.name }}</b>
              <span class="pvw-flatline sd-mono">FLATLINING</span>
            </header>
            <span class="pvw-bsub sd-mono">
              <i class="pvw-tier">{{ deleteQueueTarget.tier ? TIER_META[deleteQueueTarget.tier].short : 'FRONTLINE' }}</i>
              <template v-if="deleteQueueTarget.code"> · {{ deleteQueueTarget.code }}</template>
            </span>
            <div class="pvw-leds drain" aria-hidden="true">
              <i v-for="sg in 12" :key="sg" class="pvw-led on" :style="{ '--si': sg }" />
            </div>
            <span class="pvw-led-lb sd-mono">{{ doomActive ? `${doomActive} active ticket(s) still aboard` : 'hold is empty — clean pull' }}</span>
          </div>
        </div>

        <!-- what this pull touches -->
        <div class="pvw-brief doom">
          <span class="pvw-brief-h sd-mono doomh"><TriangleAlert :size="10" /> DECOMMISSION MANIFEST <i>· what this pull touches</i></span>
          <div v-for="(b, bi) in doomManifest" :key="b.k" class="pvw-bl doom" :class="{ on: b.on, warn: b.warn, danger: b.danger }" :style="{ '--i': bi }">
            <span class="pvw-bl-rail" aria-hidden="true"><i class="node" /><i v-if="bi < doomManifest.length - 1" class="wire" /></span>
            <div class="pvw-bl-body">
              <b class="sd-mono">{{ b.t }}</b>
              <span>{{ b.d }}</span>
            </div>
          </div>
        </div>
      </template>

      <p class="qm-hint big">
        <TriangleAlert :size="14" />
        The lane is soft-deleted and vanishes from routing, serve-next and every picker. Rules and spill
        paths that point here are <b>not</b> rewired — the manifest on the left lists what to repoint.
      </p>
      <div v-if="doomNeedsReassign" class="qm-f">
        <span>Inheriting lane <em>*</em> <i>· its {{ doomActive }} active ticket(s) move there, audited</i></span>
        <SdSelect v-model="reassignTo" :options="reassignOpts" placeholder="Pick the lane that inherits…" />
      </div>
      <p v-else class="qm-hint">No active tickets aboard — nothing needs a new home.</p>
      <label class="qm-f"><span>Reason <i>· optional — lands in the ledger beside the pull</i></span>
        <textarea v-model.trim="deleteReason" class="qcf-inp qm-area" rows="2"
          placeholder="e.g. Merged into the new Billing L2 lane after the reorg…" /></label>

      <template #footer>
        <button class="qcf-btn" :disabled="busy" @click="closeDoom">Keep the lane</button>
        <span style="flex:1" />
        <button v-if="!deleteArm" class="qcf-btn danger ghosted" :disabled="busy || !doomDirectivesOk"
          :title="doomDirectivesOk ? 'Arm the pull — one more click executes' : 'Pick the inheriting lane first'"
          @click="deleteArm = true"><Trash2 :size="13" /> Arm the pull</button>
        <Motion v-else as="button" class="qcf-btn danger arm" :disabled="busy || !doomDirectivesOk"
          :initial="{ scale: 0.9 }" :animate="{ scale: 1 }" :while-tap="{ scale: 0.96 }" @click="confirmDeleteQueue">
          <Loader v-if="busy" :size="13" class="qcf-spin" /><TriangleAlert v-else :size="13" />
          EXECUTE — pull {{ deleteQueueTarget?.name }}
        </Motion>
      </template>
    </SdCfgModal>

    <!-- Backfill router — THE RECOVERY SWEEP -->
    <SdBackfillModal :open="backfillModal" :scanning="backfillScanning" :running="backfillRunning"
      :plan="backfillPlan" :result="backfillResult"
      @close="backfillModal = false" @execute="runBackfill" @again="runBackfill"
      @fix-lane="backfillFixLane" @fix-rules="backfillFixRules" />

    <!-- Rule / escalation-policy editor -->
    <SdCfgModal :open="ruleModal" :eyebrow="ruleForm.trigger === 'time_based' ? 'ESCALATION POLICY' : 'ROUTING RULE'"
      :title="editingRule ? `Edit ${ruleForm.name || 'rule'}` : (ruleForm.trigger === 'time_based' ? 'New escalation policy' : 'New routing rule')"
      width="980px" :ready="ruleValid" versioned :actor-name="actor.name" :actor-email="actor.email" @close="ruleModal = false">
      <template #preview>
        <!-- GATE PROOF — the rule forms as a live interceptor gate, mirroring THE GAUNTLET -->
        <div class="pvw-gate2" :class="{ off: !ruleForm.is_active }">
          <span class="pvw-g2-scan" aria-hidden="true" />
          <header class="pvw-g2-h">
            <span class="pvw-g2-slot sd-mono" :title="gateSlot.hint">{{ gateSlot.plate }}</span>
            <b class="pvw-g2-name">{{ ruleForm.name || 'Unnamed rule' }}</b>
            <span class="pvw-lamp" :class="{ on: ruleForm.is_active }" :title="ruleForm.is_active ? 'Live on the chain' : 'Parked'" />
          </header>
          <div class="pvw-flow">
            <span class="pvw-node sd-mono">{{ ruleForm.trigger === 'time_based' ? 'OPEN TICKET' : 'NEW TICKET' }}</span>
            <span v-if="ruleForm.trigger === 'time_based'" class="pvw-wire timed sd-mono"><Clock3 :size="9" /> {{ fmtMins(ruleForm.time_threshold_mins) || '—' }}</span>
            <span v-else class="pvw-wire" aria-hidden="true" />
            <span class="pvw-gate sd-mono" :class="{ any: ruleForm.match_type === 'any' }">{{ ruleForm.match_type === 'any' ? 'ANY' : 'ALL' }}</span>
          </div>
          <div class="pvw-conds">
            <template v-for="(c, i) in ruleForm.conditions" :key="'c' + i">
              <span v-if="i" class="pvw-join sd-mono">{{ ruleForm.match_type === 'any' ? 'OR' : 'AND' }}</span>
              <span class="pvw-cond sd-mono" :class="{ bad: !condOk(c) }">{{ condChip(c) }}</span>
            </template>
            <span v-if="!ruleForm.conditions.length" class="pvw-cond dim sd-mono">no conditions — never matches</span>
          </div>
          <!-- deflection arm → destination port -->
          <div class="pvw-g2-deflect">
            <span class="pvw-g2-arm" :class="{ live: gatePort.kind !== 'none' }" aria-hidden="true" />
            <span class="pvw-g2-port sd-mono" :class="gatePort.kind" :style="gatePort.color ? { '--pc': gatePort.color } : {}">
              <i v-if="gatePort.kind === 'lane'" class="pvw-g2-portdot" aria-hidden="true" />{{ gatePort.label }}</span>
          </div>
          <div v-if="gateExtraActs.length" class="pvw-conds">
            <span v-for="(a, i) in gateExtraActs" :key="'a' + i" class="pvw-cond act sd-mono" :class="{ bad: !actOk(a) }">{{ actChip(a) }}</span>
          </div>
          <span v-if="ruleForm.stop_processing" class="pvw-stop sd-mono">■ SEALS THE CHAIN ON CAPTURE</span>
        </div>
        <p v-if="shadowWarn" class="pvw-note warn"><TriangleAlert :size="11" /> {{ shadowWarn }}</p>

        <!-- CHAIN BRIEF — a live narration of how this gate will behave on the line -->
        <div class="pvw-brief">
          <span class="pvw-brief-h sd-mono"><GitBranch :size="10" /> CHAIN BRIEF <i>· forms as you configure</i></span>
          <div v-for="(b, bi) in gateBrief" :key="b.k" class="pvw-bl" :class="{ on: b.on, warn: b.warn }" :style="{ '--i': bi }">
            <span class="pvw-bl-rail" aria-hidden="true"><i class="node" /><i v-if="bi < gateBrief.length - 1" class="wire" /></span>
            <div class="pvw-bl-body">
              <b class="sd-mono">{{ b.t }}</b>
              <span>{{ b.d }}</span>
            </div>
          </div>
        </div>
      </template>

      <div class="qm-grid2">
        <label class="qm-f"><span>Name <em>*</em></span><input v-model.trim="ruleForm.name" class="qcf-inp" placeholder="e.g. VIP billing straight to L2" /></label>
        <div class="qm-f">
          <span>Match</span>
          <div class="qm-seg">
            <button type="button" class="qm-seg-b" :class="{ on: ruleForm.match_type === 'all' }" @click="ruleForm.match_type = 'all'">ALL conditions</button>
            <button type="button" class="qm-seg-b" :class="{ on: ruleForm.match_type === 'any' }" @click="ruleForm.match_type = 'any'">ANY condition</button>
          </div>
        </div>
      </div>
      <label class="qm-f"><span>Description <i>· intent of this {{ ruleForm.trigger === 'time_based' ? 'policy' : 'rule' }} — kept with every version</i></span>
        <textarea v-model.trim="ruleForm.description" class="qcf-inp qm-area" rows="2" placeholder="e.g. Enterprise billing incidents skip L1 triage per the Acme contract…" /></label>
      <div v-if="ruleForm.trigger === 'time_based'" class="qm-f">
        <span>Fires after the ticket has been open for <em>*</em></span>
        <div class="qm-range wide">
          <input v-model.number="ruleForm.time_threshold_mins" class="qcf-inp mins" type="number" min="5" placeholder="240" />
          <span class="sd-mono qm-mins-lb">minutes · {{ fmtMins(ruleForm.time_threshold_mins) || '—' }}</span>
          <button v-for="q in THRESHOLD_CHIPS" :key="q.mins" type="button" class="qm-chip tiny" :class="{ on: ruleForm.time_threshold_mins === q.mins }"
            @click="ruleForm.time_threshold_mins = q.mins">{{ q.label }}</button>
        </div>
      </div>

      <div class="qm-f">
        <span>When… <i>· conditions{{ ruleForm.match_type === 'any' ? ' (any one hit fires it)' : ' (every one must hit)' }}</i></span>
        <TransitionGroup name="qm-row" tag="div" class="qm-rows">
          <div v-for="(c, i) in ruleForm.conditions" :key="c._k || (c._k = rowKey())" class="qm-cond" :class="{ bad: !condOk(c) }">
            <SdSelect v-model="c.field" :options="RULE_FIELDS" placeholder="Field" class="qm-cond-f" />
            <SdSelect v-model="c.op" :options="opsFor(c.field)" placeholder="is" class="qm-cond-o" />
            <SdSelect v-if="valueKind(c.field) === 'select'" v-model="c.value" :options="valueOpts(c.field)" placeholder="Value" class="qm-cond-v" />
            <input v-else-if="c.op === 'matches_keywords'" v-model="c.value" class="qcf-inp qm-cond-v" placeholder="keyword, keyword, …" />
            <input v-else-if="!['is_empty', 'not_empty'].includes(c.op)" v-model="c.value" class="qcf-inp qm-cond-v" placeholder="Value" />
            <span v-else class="qm-cond-v" />
            <button class="qcf-ic danger sm" @click="ruleForm.conditions.splice(i, 1)"><X :size="12" /></button>
          </div>
        </TransitionGroup>
        <button class="qcf-btn ghost sm" @click="ruleForm.conditions.push({ field: 'ticket_type', op: 'eq', value: '', _k: rowKey() })"><Plus :size="12" /> Add condition</button>
      </div>

      <div class="qm-f">
        <span>Then… <i>· actions, applied in order</i></span>
        <TransitionGroup name="qm-row" tag="div" class="qm-rows">
          <div v-for="(a, i) in ruleForm.actions" :key="a._k || (a._k = rowKey())" class="qm-cond" :class="{ bad: !actOk(a) }">
            <SdSelect v-model="a.type" :options="actionOpts" placeholder="Action" class="qm-cond-f wide" />
            <SdSelect v-if="actionNeeds(a.type) === 'queue'" v-model="a.value" :options="queueValueOpts" placeholder="Queue" class="qm-cond-v" />
            <SdSelect v-else-if="actionNeeds(a.type) === 'team'" v-model="a.value" :options="teamOpts" placeholder="Team" class="qm-cond-v" />
            <SdSelect v-else-if="actionNeeds(a.type) === 'priority'" v-model="a.value" :options="priorityOpts" placeholder="Priority" class="qm-cond-v" />
            <SdSelect v-else-if="actionNeeds(a.type) === 'sla'" v-model="a.value" :options="slaOpts" placeholder="SLA package" class="qm-cond-v" />
            <SdSelect v-else-if="actionNeeds(a.type) === 'agent'" v-model="a.value" :options="agentOpts" placeholder="Agent" class="qm-cond-v" />
            <SdSelect v-else-if="actionNeeds(a.type) === 'tier'" v-model="a.value" :options="tierOpts" placeholder="Tier" class="qm-cond-v" />
            <input v-else-if="actionNeeds(a.type) === 'tags'" v-model="a.value" class="qcf-inp qm-cond-v" placeholder="tags, comma" />
            <span v-else class="qm-cond-v" />
            <button class="qcf-ic danger sm" @click="ruleForm.actions.splice(i, 1)"><X :size="12" /></button>
          </div>
        </TransitionGroup>
        <button class="qcf-btn ghost sm" @click="ruleForm.actions.push({ type: ruleForm.trigger === 'time_based' ? 'escalate_tier' : 'route_queue', value: '', _k: rowKey() })"><Plus :size="12" /> Add action</button>
      </div>

      <div class="qm-grid2">
        <SdCfgSwitch v-model="ruleForm.stop_processing" label="Stop the chain on match"
          hint="First-match semantics — later rules never see a ticket this one claims" />
        <SdCfgSwitch v-model="ruleForm.is_active" label="Live"
          :hint="ruleForm.is_active ? 'Evaluated on the chain' : 'Parked — kept but never runs'" />
      </div>

      <template #footer>
        <button v-if="editingRule" class="qcf-btn ghost" @click="openRevisions(editingRule.id, editingRule.name)"><History :size="13" /> History</button>
        <button class="qcf-btn" @click="ruleModal = false">Cancel</button>
        <span style="flex:1" />
        <Motion as="button" class="qcf-btn primary" :disabled="busy || !ruleValid" :while-hover="ruleValid ? { y: -2 } : {}"
          :while-tap="ruleValid ? { scale: 0.97 } : {}" @click="saveRule">
          <Loader v-if="busy" :size="13" class="qcf-spin" /> {{ editingRule ? 'Save' : 'Create' }}
        </Motion>
      </template>
    </SdCfgModal>

    <!-- Rule delete confirm — THE DECOMMISSION CHAMBER -->
    <SdRuleDecomModal :open="!!deleteRuleTarget" :rule="deleteRuleTarget" :next-catcher="deleteRuleNext" :busy="busy"
      @close="deleteRuleTarget = null" @confirm="confirmDeleteRule" @park="parkDeleteTarget"
      @history="deleteRuleTarget && openRevisions(deleteRuleTarget.id, deleteRuleTarget.name)" />

    <!-- Rule revisions — THE REWIND DECK -->
    <SdRuleHistoryModal :open="revModal" :name="revName" :busy="revBusy" :restoring="revRestoring"
      :revisions="revisions" :rule-live="revRuleLive" :resolve-cond="revResolveCond" :resolve-act="revResolveAct"
      @close="revModal = false" @restore="restoreRevision" @recreate="recreateRevision" />

    <!-- SLA policy editor -->
    <SdCfgModal :open="slaModal" :eyebrow="editingSla ? 'EDIT SLA POLICY' : 'NEW SLA POLICY'"
      :title="editingSla ? `Edit ${slaForm.name}` : 'New SLA policy'" width="880px"
      :ready="slaValid" :actor-name="actor.name" :actor-email="actor.email" @close="slaModal = false">
      <template #preview>
        <!-- CADENCE PROOF — the policy forms on a mini log time-axis, mirroring THE CADENCE FIELD -->
        <div class="pvw-cad">
          <header class="pvw-cad-h">
            <span class="pvw-cad-dial" :style="{ '--cov': slaCoverage }" :title="`${slaTimedCells} of 10 clocks set`" aria-hidden="true"><Timer :size="10" /></span>
            <b>{{ slaForm.name || 'Unnamed policy' }}</b>
            <span v-if="slaForm.is_default" class="pvw-master sd-mono"><Crown :size="8" /> DEFAULT</span>
          </header>
          <div class="pvw-cad-field">
            <span v-for="t in SLA_TICKS" :key="t.m" class="pvw-cad-tick" :style="{ left: t.x + '%' }" aria-hidden="true"><i class="sd-mono">{{ t.label }}</i></span>
            <span class="pvw-cad-beam" aria-hidden="true" />
            <template v-for="(tr, j) in slaTraces" :key="tr.pr">
              <span v-if="tr.timed" class="pvw-cad-trace" :class="{ bad: tr.bad }"
                :style="{ top: tr.top + 'px', left: tr.left + '%', width: tr.width + '%', '--tc': tr.color, '--d': (j * 0.09) + 's' }"
                :title="`${tr.pr.toUpperCase()} — ack ${tr.respLabel} · resolve ${tr.resoLabel}`">
                <i class="band" aria-hidden="true" /><i class="head" aria-hidden="true" /><i v-if="tr.hasReso" class="node" :class="{ hollow: !tr.hasResp }" aria-hidden="true" />
              </span>
              <span v-else class="pvw-cad-void sd-mono" :style="{ top: tr.top + 'px', '--tc': tr.color }">{{ tr.pr.toUpperCase() }} · UNTIMED</span>
            </template>
          </div>
        </div>
        <p v-if="dupSlaName" class="pvw-note danger"><TriangleAlert :size="11" /> A policy named “{{ slaForm.name }}” already exists — pick a distinct name.</p>
        <p v-else-if="slaNegRows.length" class="pvw-note danger"><TriangleAlert :size="11" /> Clocks can’t run backwards — negative minutes on: {{ slaNegRows.join(', ') }}.</p>
        <p v-else-if="slaBadRows.length" class="pvw-note danger"><TriangleAlert :size="11" /> Resolution can’t be shorter than response: {{ slaBadRows.join(', ') }}.</p>
        <p v-else-if="!slaHasClock" class="pvw-note warn"><TriangleAlert :size="11" /> Every clock is blank — this policy would time nothing.</p>

        <!-- CLOCK BRIEF — a live narration of how this policy will keep time -->
        <div class="pvw-brief">
          <span class="pvw-brief-h sd-mono"><Timer :size="10" /> CLOCK BRIEF <i>· forms as you configure</i></span>
          <div v-for="(b, bi) in slaBrief" :key="b.k" class="pvw-bl" :class="{ on: b.on, warn: b.warn }" :style="{ '--i': bi }">
            <span class="pvw-bl-rail" aria-hidden="true"><i class="node" /><i v-if="bi < slaBrief.length - 1" class="wire" /></span>
            <div class="pvw-bl-body">
              <b class="sd-mono">{{ b.t }}</b>
              <span>{{ b.d }}</span>
            </div>
          </div>
        </div>
      </template>

      <div class="qm-grid2">
        <label class="qm-f"><span>Name <em>*</em></span><input v-model.trim="slaForm.name" class="qcf-inp" placeholder="e.g. Gold support" /></label>
        <SdCfgSwitch v-model="slaForm.is_default" label="Default policy" hint="Applies when neither the org contract nor the lane names one" />
      </div>
      <label class="qm-f"><span>Description <i>· who this policy serves — lands in the ledger</i></span>
        <textarea v-model.trim="slaForm.description" class="qcf-inp qm-area" rows="2" placeholder="e.g. Contractual targets for Gold-tier clients…" /></label>
      <div class="qm-f">
        <span>Quick-fill presets</span>
        <div class="qm-chips">
          <button v-for="p in SLA_PRESETS" :key="p.key" type="button" class="qm-chip preset" @click="applySlaPreset(p.key)">
            <Wand2 :size="10" /> {{ p.label }}</button>
        </div>
      </div>
      <div class="qm-clockrows">
        <div v-for="pr in PRIORITY_KEYS" :key="pr" class="qm-clockrow" :class="{ bad: slaRowBad(pr) || slaRowNeg(pr) }"
          :style="{ '--pc': priorityColor(pr) }">
          <span class="qm-cr-tag sd-mono">{{ pr.toUpperCase() }}</span>
          <label class="qm-cr-cell">
            <span class="sd-mono">ACK · MIN</span>
            <input v-model.number="slaForm.matrix[pr].response_mins" class="qm-cr-inp sd-mono" type="number" min="0" placeholder="—" />
            <em class="sd-mono">{{ fmtMins(slaForm.matrix[pr].response_mins) || 'no clock' }}</em>
          </label>
          <span class="qm-cr-div" aria-hidden="true" />
          <label class="qm-cr-cell">
            <span class="sd-mono">RESOLVE · MIN</span>
            <input v-model.number="slaForm.matrix[pr].resolution_mins" class="qm-cr-inp sd-mono" type="number" min="0" placeholder="—" />
            <em class="sd-mono">{{ fmtMins(slaForm.matrix[pr].resolution_mins) || 'no clock' }}</em>
          </label>
        </div>
      </div>
      <p class="qm-hint">Blank = no clock for that priority. Values are wall-clock minutes; pause states stop the clock.
        Escalation levels on a package are notify-only — tier moves live in Escalation policies.</p>

      <template #footer>
        <template v-if="editingSla">
          <span v-if="editingSla.is_default" class="qm-protected sd-mono" title="The desk must always keep a default clock — crown another policy first to unlock delete">
            <Crown :size="11" /> DEFAULT — DELETE-PROTECTED</span>
          <button v-else-if="!slaArm" class="qcf-btn danger ghosted" :disabled="busy" @click="slaArm = true"><Trash2 :size="13" /> Delete</button>
          <Motion v-else as="button" class="qcf-btn danger" :disabled="busy" :initial="{ scale: 0.92 }" :animate="{ scale: 1 }" @click="removeSla">
            <TriangleAlert :size="13" /> Really delete{{ slaCarryNote }}?
          </Motion>
        </template>
        <button class="qcf-btn" @click="slaModal = false">Cancel</button>
        <span style="flex:1" />
        <Motion as="button" class="qcf-btn primary" :disabled="busy || !slaValid" :while-hover="slaValid ? { y: -2 } : {}"
          :while-tap="slaValid ? { scale: 0.97 } : {}" @click="saveSla">
          <Loader v-if="busy" :size="13" class="qcf-spin" /> Save policy
        </Motion>
      </template>
    </SdCfgModal>

    <!-- Skill editor -->
    <SdCfgModal :open="skillModal" :eyebrow="editingSkill ? 'EDIT SKILL' : 'NEW SKILL'"
      :title="editingSkill ? `Edit ${skillForm.name}` : 'New skill'" width="820px"
      :ready="skillValid" :actor-name="actor.name" :actor-email="actor.email" @close="skillModal = false">
      <template #preview>
        <!-- THE BADGE — the skill exactly as the Certification Grid will wear it -->
        <div class="svp-badge" :class="{ paused: editingSkill && !skillForm.is_active }"
          :style="{ '--sc': skillColorOk && skillForm.color ? skillForm.color : 'var(--sd-qc-core)' }">
          <span class="svp-spine" aria-hidden="true" />
          <header class="svp-h">
            <span class="svp-diode" :class="{ lit: skillForm.agent_ids.length }" aria-hidden="true" />
            <b :class="{ ghost: !skillForm.name }">{{ skillForm.name || 'Unnamed skill' }}</b>
            <em v-if="skillForm.code" class="sd-mono">{{ skillForm.code }}</em>
          </header>
          <div class="svp-ring-row">
            <span class="svp-ring" aria-hidden="true">
              <svg viewBox="0 0 36 36">
                <circle class="bg" cx="18" cy="18" r="15.5" />
                <circle class="fg" cx="18" cy="18" r="15.5" :style="{ strokeDashoffset: 97.4 - 97.4 * rosterPct }" />
              </svg>
              <b class="sd-mono">{{ skillForm.agent_ids.length }}</b>
            </span>
            <div class="svp-ring-b sd-mono">
              <b>{{ Math.round(rosterPct * 100) }}%</b>
              <span>OF THE CREW CERTIFIED</span>
            </div>
          </div>
          <div class="svp-avas">
            <span v-for="a in rosterPreview" :key="a.value" class="svp-ava sd-mono" :title="a.label">{{ initials(a.label) }}</span>
            <span v-if="skillForm.agent_ids.length > 4" class="svp-ava more sd-mono">+{{ skillForm.agent_ids.length - 4 }}</span>
            <span v-if="!skillForm.agent_ids.length" class="svp-none sd-mono">NOBODY CERTIFIED YET</span>
          </div>
          <span class="svp-demand sd-mono"><Inbox :size="9" />
            {{ editingSkill ? `${editingSkill.queue_count || 0} LANE${(editingSkill.queue_count || 0) === 1 ? '' : 'S'} DEMAND IT`
              : 'NOT WIRED TO A LANE YET' }}</span>
          <span v-if="editingSkill && !skillForm.is_active" class="svp-paused sd-mono" aria-hidden="true">PAUSED</span>
        </div>

        <!-- SIGNAL CHECKS — the badge forms as the fields complete -->
        <div class="svp-checks">
          <div v-for="(c, i) in skillChecks" :key="c.k" class="svp-check"
            :class="{ ok: c.ok, bad: c.bad, warn: c.warn }" :style="{ '--i': i }">
            <span class="svp-check-dot" aria-hidden="true">
              <svg viewBox="0 0 10 10"><path d="M2,5.2 L4.2,7.4 L8,3.2" /></svg>
            </span>
            <b class="sd-mono">{{ c.label }}</b>
            <em class="sd-mono">{{ c.text }}</em>
          </div>
        </div>

        <!-- one strip, worst problem first -->
        <p v-if="skillBlocker" class="svp-strip danger"><TriangleAlert :size="10" /> {{ skillBlocker }}</p>
        <p v-else-if="editingSkill && !skillForm.is_active && (editingSkill.queue_count || 0) > 0" class="svp-strip warn">
          <TriangleAlert :size="10" /> Pausing while {{ editingSkill.queue_count }}
          lane{{ editingSkill.queue_count === 1 ? '' : 's' }} demand{{ editingSkill.queue_count === 1 ? 's' : '' }} it —
          holders stop counting; those lanes fail open to their whole crew.</p>

        <!-- HOW IT WIRES — what this modal actually drives -->
        <div class="svp-mech">
          <span class="svp-mech-h sd-mono"><CircuitBoard :size="10" /> HOW IT WIRES</span>
          <div class="svp-flow" aria-hidden="true">
            <span class="n sd-mono">SKILL</span><i class="w" /><span class="n sd-mono">LANES</span><i class="w" /><span class="n sd-mono">CREW</span>
          </div>
          <div class="svp-fact" :style="{ '--i': 0 }"><Inbox :size="10" />
            <p>A lane that requires it auto-assigns <b>only agents holding ALL</b> of that lane's skills.</p></div>
          <div class="svp-fact" :style="{ '--i': 1 }"><ShieldCheck :size="10" />
            <p>No qualified holder? The lane <b>fails open to the whole crew</b> — routing never starves.</p></div>
          <div class="svp-fact" :style="{ '--i': 2 }"><ScrollText :size="10" />
            <p>Saves and matrix flips are <b>signed to the Ledger</b> under your name.</p></div>
        </div>
      </template>

      <div class="qm-grid2">
        <label class="qm-f"><span>Name <em>*</em></span>
          <input v-model.trim="skillForm.name" class="qcf-inp" maxlength="120" placeholder="e.g. Networking" /></label>
        <label class="qm-f"><span>Code <i>· short badge · unique desk-wide</i></span>
          <span class="svf-code">
            <input v-model.trim="skillForm.code" class="qcf-inp" maxlength="12" placeholder="NET"
              @input="skillForm.code = (skillForm.code || '').toUpperCase()" />
            <Motion v-if="suggestedCode && !skillForm.code" as="button" type="button" class="svf-suggest sd-mono"
              :initial="{ opacity: 0, scale: 0.9 }" :animate="{ opacity: 1, scale: 1 }" :while-tap="{ scale: 0.94 }"
              :title="`Mint the code “${suggestedCode}” from the name`" @click="skillForm.code = suggestedCode">
              <Wand2 :size="11" /> {{ suggestedCode }}
            </Motion>
          </span></label>
      </div>
      <div class="qm-f"><span>Colour <i>· the diode every board wears for it</i></span><SdCfgColor v-model="skillForm.color" /></div>
      <label class="qm-f"><span>Description <i>· what this skill certifies — lands in the ledger</i></span>
        <textarea v-model.trim="skillForm.description" class="qcf-inp qm-area" rows="2" maxlength="500"
          placeholder="e.g. Can diagnose LAN/WAN, VPN and firewall issues end-to-end…" /></label>
      <SdCfgSwitch v-if="editingSkill" v-model="skillForm.is_active" label="Live on the routing floor"
        hint="Paused skills keep their roster but stop counting toward lane requirements — lanes demanding them fail open to the crew" />
      <div class="qm-f">
        <span>Held by <i>· the agent-skill matrix — also editable cell-by-cell on the grid</i></span>
        <div class="qm-agent-tools">
          <div class="qm-agent-search"><Search :size="12" /><input v-model.trim="agentFilter" class="qm-agent-inp" placeholder="Filter agents…" /></div>
          <button type="button" class="svf-mini sd-mono" :disabled="!filteredAgentPool.length"
            :title="agentFilter ? 'Certify every agent matching the filter' : 'Certify the whole crew'"
            @click="certifyFiltered">+ ALL{{ agentFilter ? ' FILTERED' : '' }}</button>
          <button type="button" class="svf-mini sd-mono" :disabled="!skillForm.agent_ids.length"
            title="Revoke everyone" @click="skillForm.agent_ids.splice(0)">NONE</button>
          <span class="sd-mono qm-agent-n">{{ skillForm.agent_ids.length }}/{{ agentPool.length }}</span>
        </div>
        <i class="svf-meter" aria-hidden="true"><i :style="{ width: (rosterPct * 100) + '%' }" /></i>
        <div class="qm-chips scroll">
          <button v-for="a in filteredAgentPool" :key="a.value" type="button" class="qm-chip roster"
            :class="{ on: skillForm.agent_ids.includes(String(a.value)) }" @click="toggleIn(skillForm.agent_ids, String(a.value))">
            <span class="svf-chip-ava sd-mono" aria-hidden="true">{{ initials(a.label) }}</span>{{ a.label }}
            <Check v-if="skillForm.agent_ids.includes(String(a.value))" :size="10" class="qm-chip-tick" /></button>
          <p v-if="!agentPool.length" class="qm-hint">No agents flagged yet.</p>
          <p v-else-if="!filteredAgentPool.length" class="qm-hint">No agent matches “{{ agentFilter }}”.</p>
        </div>
      </div>

      <template #footer>
        <template v-if="editingSkill">
          <button v-if="!skillArm" class="qcf-btn danger ghosted" :disabled="busy" @click="skillArm = true"><Trash2 :size="13" /> Delete</button>
          <Motion v-else as="button" class="qcf-btn danger" :disabled="busy" :initial="{ scale: 0.92 }" :animate="{ scale: 1 }" @click="removeSkill">
            <TriangleAlert :size="13" /> Really delete{{ editingSkill.queue_count ? ` — ${editingSkill.queue_count} lane(s) still require it` : '' }}?
          </Motion>
        </template>
        <button class="qcf-btn" @click="skillModal = false">Cancel</button>
        <span style="flex:1" />
        <Motion as="button" class="qcf-btn primary" :disabled="busy || !skillValid" :while-hover="skillValid ? { y: -2 } : {}"
          :while-tap="skillValid ? { scale: 0.97 } : {}" @click="saveSkill">
          <Loader v-if="busy" :size="13" class="qcf-spin" /> Save skill
        </Motion>
      </template>
    </SdCfgModal>
  </div>
</template>

<script setup>
/* SdQueueConfigSection — "THE DECISION GRAPH", the queues module's admin hub
   (adminOnly tab — every backing endpoint is superuser-gated). The routing engine
   rendered as a live node-flow hero (SdQueueConfigHero → SdDecisionGraph); eight
   dock panels: Lanes (queue CRUD incl. tier/serve-order/drain/default/skills +
   config-v2 SLA policy/capacity/overflow), Routing rules (first-match chain + the
   Probe Console dry-run whose decision travels the hero graph), SLA clocks, Skills,
   Hours & holidays (also powers the business_hours rule condition), Escalation
   policies (time_based rules), the Ledger (config audit + per-rule revision
   history) and The Wires. Deep-links: ?queue=<id> opens that lane's editor,
   ?panel=<key> lands on a panel. */
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  Inbox, GitBranch, Timer, Sparkles, Clock3, TrendingUp, BellRing, ScrollText,
  Plus, Pencil, Trash2, ChevronUp, ChevronDown, FlaskConical, Play, Zap, X,
  TriangleAlert, Loader, Save, CalendarDays, Hand, Repeat, Scale, Route,
  Users, Gauge, CornerDownRight, History, ArrowRight, Settings2, Check, Search, Wand2, Crown,
  CircuitBoard, ShieldCheck,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import SdModalShell from '../components/SdModalShell.vue'
import SdCfgModal from '../components/SdCfgModal.vue'
import SdCfgSwitch from '../components/SdCfgSwitch.vue'
import SdCfgColor from '../components/SdCfgColor.vue'
import SdSelect from '../components/SdSelect.vue'
import SdQueueConfigHero from '../components/SdQueueConfigHero.vue'
import SdRuleGauntlet from '../components/SdRuleGauntlet.vue'
import SdSkillGrid from '../components/SdSkillGrid.vue'
import SdSlaCadenceField from '../components/SdSlaCadenceField.vue'
import SdOpsDaywheel from '../components/SdOpsDaywheel.vue'
import SdLedgerChamber from '../components/SdLedgerChamber.vue'
import SdLaneBladeRack from '../components/SdLaneBladeRack.vue'
import SdAscentProfile from '../components/SdAscentProfile.vue'
import SdUplinkArray from '../components/SdUplinkArray.vue'
import SdBackfillModal from '../components/SdBackfillModal.vue'
import SdRuleDecomModal from '../components/SdRuleDecomModal.vue'
import SdRuleHistoryModal from '../components/SdRuleHistoryModal.vue'
import {
  listQueues, createQueue, updateQueue, deleteQueue, routeUnrouted,
  listAutomationRules, createAutomationRule, updateAutomationRule, deleteAutomationRule,
  reorderRules, simulateRule, listRuleRevisions, configLedger,
  listSkills, createSkill, updateSkill, deleteSkill,
  listSlaPackages, createSlaPackage, updateSlaPackage, deleteSlaPackage,
  listTeams, updateTeam, listSupportAgents, listSettings, upsertSetting, testWebhook, getMe,
  loadPickers, usePickers, priorityColor,
  TIER_META, SERVE_ORDERS, RULE_FIELDS, RULE_OPS, RULE_ACTIONS, PRIORITIES, TICKET_TYPES,
} from '@/composables/useSupportDesk'

defineProps({ panel: { type: String, default: 'admin' }, agentReveal: { type: Boolean, default: false } })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const busy = ref(false)

/* the signing actor — every save is audited to the ledger under this identity */
const actor = ref({ name: '', email: '' })
getMe().then(m => { actor.value = { name: m?.full_name || m?.name || 'Admin', email: m?.email || '' } }).catch(() => {})

/* stable keys for TransitionGroup rows in the rule builder */
let _rk = 0
const rowKey = () => `k${++_rk}`
const HEX_RX = /^#[0-9a-fA-F]{6}$/

const SECTIONS = [
  { key: 'queues', label: 'Lanes', icon: Inbox, count: () => allQueues.value.length || null },
  { key: 'rules', label: 'Routing rules', icon: GitBranch, count: () => createRules.value.length || null },
  { key: 'sla', label: 'SLA clocks', icon: Timer, count: () => slas.value.length || null },
  { key: 'skills', label: 'Skills', icon: Sparkles, count: () => skills.value.length || null },
  { key: 'hours', label: 'Hours', icon: Clock3, count: () => null },
  { key: 'escalation', label: 'Escalation', icon: TrendingUp, count: () => timeRules.value.length || null },
  { key: 'ledger', label: 'Ledger', icon: ScrollText, count: () => ledgerTotal.value || null },
  { key: 'wires', label: 'The wires', icon: BellRing, count: () => null },
]
const section = ref('queues')
const goPanel = (key) => {
  if (!SECTIONS.some(s => s.key === key)) return
  section.value = key
  router.replace({ query: { ...route.query, panel: key } }).catch(() => {})
}

/* ── shared data ── */
const allQueues = ref([])
const rules = ref([])
const skills = ref([])
const slas = ref([])
const teams = ref([])
const agentPool = ref([])
const pickers = usePickers()
const categoryList = computed(() => pickers.categories || [])

const createRules = computed(() => rules.value.filter(r => (r.trigger || 'on_create') === 'on_create'))
const timeRules = computed(() => rules.value.filter(r => r.trigger === 'time_based'))
// Hero graph feed: on_create rules with their route target resolved client-side.
const heroRules = computed(() => createRules.value.map(r => ({
  ...r,
  target_queue_id: (r.actions || []).find(a => ['route_queue', 'assign_queue'].includes(a?.type))?.value || null,
})))

/* ── THE INTERCEPT GAUNTLET — display-ready rule chain for the interceptor corridor ── */
const gauntletRules = computed(() => createRules.value.map(r => {
  const conds = (r.conditions || []).map(c => ({
    f: labelOf(RULE_FIELDS, c.field),
    o: labelOf(RULE_OPS, c.op),
    v: ['is_empty', 'not_empty'].includes(c.op) ? '' : (Array.isArray(c.value) ? c.value.join(', ') : String(nameOfValue(c) ?? '')),
  }))
  const acts = (r.actions || []).map(a => ({
    label: labelOf(RULE_ACTIONS, a.type),
    value: a.value != null && a.value !== '' ? String(nameOfActionValue(a)) : '',
  }))
  /* destination port: lane target wins, then team, else the first in-place effect */
  let port = null
  const laneAct = (r.actions || []).find(a => ['route_queue', 'assign_queue'].includes(a?.type))
  const teamAct = (r.actions || []).find(a => ['route_team', 'assign_team'].includes(a?.type))
  if (laneAct) {
    const qz = allQueues.value.find(x => String(x.id) === String(laneAct.value))
    port = { kind: 'lane', label: qz?.name || 'Lane', color: qz?.color || null, queueId: laneAct.value }
  } else if (teamAct) {
    port = { kind: 'team', label: teams.value.find(t => String(t.id) === String(teamAct.value))?.name || 'Team' }
  } else if ((r.actions || []).length) {
    const a0 = r.actions[0]
    port = { kind: 'effect', label: `${labelOf(RULE_ACTIONS, a0.type)}${a0.value ? ` → ${nameOfActionValue(a0)}` : ''}` }
  }
  return {
    id: r.id, name: r.name, isActive: !!r.is_active, stop: !!r.stop_processing,
    runs: r.run_count || 0, matchType: r.match_type || 'all', conds, acts, port,
  }
}))
const ruleById = (id) => rules.value.find(x => String(x.id) === String(id))
const editRuleById = (id) => { const r = ruleById(id); if (r) openRuleModal(r) }
const deleteRuleById = (id) => { const r = ruleById(id); if (r) askDeleteRule(r) }
const historyRuleById = (id) => { const r = ruleById(id); if (r) openRevisions(r.id, r.name) }
const nudgeRuleById = (id, dir) => { const r = ruleById(id); if (r) nudgeRule(r, dir) }
const gotoLaneById = (qid) => { const qz = allQueues.value.find(x => String(x.id) === String(qid)); if (qz) openQueueModal(qz) }

/* ── THE ASCENT PROFILE — time-based policies as burn events, threshold order ── */
const ascentPolicies = computed(() => [...timeRules.value]
  .sort((a, b) => (a.time_threshold_mins || 0) - (b.time_threshold_mins || 0))
  .map((r) => {
    const conds = (r.conditions || []).map(c => ({
      f: labelOf(RULE_FIELDS, c.field),
      o: labelOf(RULE_OPS, c.op),
      v: ['is_empty', 'not_empty'].includes(c.op) ? '' : (Array.isArray(c.value) ? c.value.join(', ') : String(nameOfValue(c) ?? '')),
    }))
    const acts = (r.actions || []).map(a => ({
      label: labelOf(RULE_ACTIONS, a.type),
      value: a.value != null && a.value !== '' ? String(nameOfActionValue(a)) : '',
    }))
    const tierAct = (r.actions || []).find(a => a?.type === 'escalate_tier')
    return {
      id: r.id, name: r.name, mins: r.time_threshold_mins || 0, tLabel: fmtMins(r.time_threshold_mins),
      isActive: !!r.is_active, matchType: r.match_type || 'all',
      runs: r.run_count || 0, lastRunAt: r.last_run_at, conds, acts,
      tier: tierAct && Number(tierAct.value) ? Number(tierAct.value) : null,
    }
  }))
/* ARM/STANDBY straight from the manifest — no modal round-trip */
const armBusy = ref(false)
const toggleRuleLive = async (id, next) => {
  if (armBusy.value) return
  armBusy.value = true
  try {
    const fresh = await updateAutomationRule(id, { is_active: next })
    const i = rules.value.findIndex(x => String(x.id) === String(id))
    if (i >= 0) rules.value.splice(i, 1, fresh)
    toast.success(next ? 'Burn armed' : 'Burn on standby')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not update the policy') }
  finally { armBusy.value = false }
}

const PRIORITY_KEYS = ['low', 'medium', 'high', 'urgent', 'critical']
const METHODS = [
  { value: 'manual', label: 'Manual', icon: Hand },
  { value: 'round_robin', label: 'Round-robin', icon: Repeat },
  { value: 'load_balanced', label: 'Load-balanced', icon: Scale },
]
const methodShort = (m) => ({ round_robin: 'round-robin', load_balanced: 'load-balanced' }[m] || 'manual')
const serveShort = (s) => (s === 'sla_breach' ? 'breach-time' : 'priority · age')
const fmtMins = (m) => (m == null || m === '' ? '—' : m < 60 ? `${m}m` : m < 1440 ? `${Math.round((m / 60) * 10) / 10}h` : `${Math.round((m / 1440) * 10) / 10}d`)
const initials = (n) => (n || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
const toggleIn = (arr, v) => { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v) }
const ago = (iso) => {
  if (!iso) return '—'
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
const fT = (i) => ({ duration: 0.4, delay: 0.05 + i * 0.06, ease: [0.16, 1, 0.3, 1] })

/* pointer glare for cards (writes --mx/--my onto the card) */
const glare = (e) => {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', ((e.clientX - r.left) / r.width).toFixed(3))
  el.style.setProperty('--my', ((e.clientY - r.top) / r.height).toFixed(3))
  el.style.setProperty('--spot', '1')
}
const unglare = (e) => e.currentTarget.style.setProperty('--spot', '0')

const laneName = (id) => allQueues.value.find(x => String(x.id) === String(id))?.name || '?'
const slaName = (id) => slas.value.find(x => String(x.id) === String(id))?.name || 'SLA'
const laneAtCapacity = (qz) => !!(qz.capacity_limit && (qz.open_ticket_count || 0) >= qz.capacity_limit)

/* ── THE BLADE RACK — display-ready lanes for the rack elevation ── */
const skillNameOf = (id) => skills.value.find(x => String(x.id) === String(id))?.name || null
const bladeLanes = computed(() => allQueues.value.map(qz => {
  const ratio = laneRatio(qz)
  const atCap = laneAtCapacity(qz)
  const of = qz.overflow_queue_id ? allQueues.value.find(x => String(x.id) === String(qz.overflow_queue_id)) : null
  const tm = TIER_META[qz.tier]
  return {
    id: qz.id, name: qz.name, code: qz.code || '', color: qz.color || 'var(--sd-qc-core)',
    isActive: qz.is_active !== false, isDefault: !!qz.is_default, tier: qz.tier ?? null,
    tierLabel: tm ? tm.label.toUpperCase() : 'FRONTLINE', tierAccent: tm ? tm.accent : null,
    teamName: qz.team_name || '', autoNoCrew: !!qz.auto_assign && !qz.team_id,
    method: qz.auto_assign ? methodShort(qz.assignment_method) : 'manual pick-up',
    serve: serveShort(qz.serve_order),
    slaName: qz.sla_package_id ? slaName(qz.sla_package_id) : '',
    skillNames: (qz.skill_ids || []).map(skillNameOf).filter(Boolean),
    drain: qz.queue_priority ?? 50,
    open: qz.open_ticket_count || 0, cap: qz.capacity_limit || 0,
    lit: Math.min(12, Math.max(qz.open_ticket_count ? 1 : 0, Math.round(ratio * 12))), atCap,
    overflow: of ? { id: of.id, name: of.name, active: of.is_active !== false } : null,
  }
}))
const removeLaneById = (id) => { const qz = allQueues.value.find(x => String(x.id) === String(id)); if (qz && !qz.is_default) askDeleteQueue(qz) }
const laneRatio = (qz) => {
  const open = qz.open_ticket_count || 0
  return Math.min(1, qz.capacity_limit ? open / qz.capacity_limit : open / 25)
}
const lanesOnSla = (pid) => allQueues.value.filter(q => String(q.sla_package_id || '') === String(pid)).length
const orgsOnSla = (pid) => (pickers.organizations || []).filter(o => String(o.sla_package_id || '') === String(pid)).length
const editSlaById = (id) => { const p = slas.value.find(x => String(x.id) === String(id)); if (p) openSlaModal(p) }

const teamOpts = computed(() => [{ value: '', label: 'No team' }, ...teams.value.map(t => ({ value: t.id, label: t.name }))])
const priorityOpts = computed(() => PRIORITIES)
const typeOpts = computed(() => TICKET_TYPES)
const severityOpts = [{ value: '', label: '(none)' }, ...['low', 'medium', 'high', 'critical'].map(v => ({ value: v, label: v }))]
const categoryOpts = computed(() => [{ value: '', label: '(none)' }, ...categoryList.value.map(c => ({ value: c.id, label: c.name }))])
const catName = (id) => categoryList.value.find(x => String(x.id) === String(id))?.name
const subcategoryOpts = computed(() => [{ value: '', label: '(none)' },
  ...categoryList.value.filter(c => c.parent_id).map(c => ({ value: c.id, label: `${catName(c.parent_id) || '—'} › ${c.name}` }))])
const orgOpts = computed(() => [{ value: '', label: '(none)' }, ...(pickers.organizations || []).map(o => ({ value: o.id, label: o.name }))])
const slaOpts = computed(() => slas.value.map(p => ({ value: p.id, label: p.name })))
const slaOptsWithNone = computed(() => [{ value: '', label: 'Desk default' }, ...slaOpts.value])
const agentOpts = computed(() => agentPool.value)
const queueValueOpts = computed(() => allQueues.value.filter(x => x.is_active).map(x => ({ value: x.id, label: `${x.name}${x.tier ? ` · L${x.tier}` : ''}` })))
const tierOpts = [{ value: 2, label: 'L2 · Specialist' }, { value: 3, label: 'L3 · Engineering' }]
const actionOpts = computed(() => RULE_ACTIONS.map(a => ({ value: a.value, label: a.label })))
const actionNeeds = (t) => RULE_ACTIONS.find(a => a.value === t)?.needs

const loadAll = async () => {
  const empty = []
  const [qs, rl, sk, sl, tm, ag] = await Promise.all([
    listQueues({ include_inactive: true }).catch(() => empty),
    listAutomationRules().catch(() => empty),
    listSkills({ include_inactive: true }).catch(() => empty),
    listSlaPackages().catch(() => empty),
    listTeams().catch(() => empty),
    listSupportAgents().catch(() => empty),
  ])
  allQueues.value = qs; rules.value = rl; skills.value = sk; slas.value = sl; teams.value = tm
  agentPool.value = (ag || []).map(a => ({ value: a.id, label: a.name || a.email }))
  loadPickers().catch(() => {})
  loadSettings()
  loadLedger(true)
}

/* graph click → open the thing you clicked */
const onGraphEdit = (hit) => {
  if (hit.kind === 'lane') {
    const qz = allQueues.value.find(x => String(x.id) === String(hit.id))
    if (qz) openQueueModal(qz)
  } else if (hit.kind === 'rule') {
    const r = rules.value.find(x => String(x.id) === String(hit.id))
    if (r) openRuleModal(r)
  }
}

/* ══ Backfill router — THE RECOVERY SWEEP ══ */
const backfillModal = ref(false)
const backfillScanning = ref(false)
const backfillRunning = ref(false)
const backfillPlan = ref(null)
const backfillResult = ref(null)
const openBackfill = async () => {
  backfillModal.value = true
  backfillPlan.value = null
  backfillResult.value = null
  backfillScanning.value = true
  try { backfillPlan.value = await routeUnrouted(true) }
  catch (e) { toast.error(e?.response?.data?.detail || 'Preview failed'); backfillModal.value = false }
  finally { backfillScanning.value = false }
}
const runBackfill = async () => {
  if (backfillRunning.value) return
  backfillRunning.value = true
  backfillResult.value = null
  const t0 = Date.now()
  try {
    const r = await routeUnrouted(false)
    /* let the chain run hot for at least one tracer pass before the seal lands */
    await new Promise(res => setTimeout(res, Math.max(0, 1100 - (Date.now() - t0))))
    backfillResult.value = r
    toast.success(`${r.routed} ticket(s) swept into their lanes${r.unrouted_count ? ` · ${r.unrouted_count} still unroutable` : ''}`)
    loadAll()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Backfill failed') } finally { backfillRunning.value = false }
}
/* FIX actions from the stranded ledger — jump straight to the thing that unblocks routing */
const backfillFixLane = async ({ teamId, makeDefault } = {}) => {
  backfillModal.value = false
  openQueueModal()
  await nextTick()
  if (teamId) queueForm.team_id = String(teamId)
  if (makeDefault) queueForm.is_default = true
}
const backfillFixRules = () => {
  backfillModal.value = false
  goPanel('rules')
}

/* ══ Lanes ══ */
const queueModal = ref(false)
const editingQueue = ref(null)
const queueForm = reactive({
  name: '', code: '', color: '', description: '', team_id: '', auto_assign: false, assignment_method: 'round_robin',
  category_ids: [], tier: null, skill_ids: [], serve_order: 'priority_age', queue_priority: 50,
  max_agent_load: null, is_default: false, is_active: true,
  sla_package_id: '', capacity_limit: null, overflow_queue_id: '',
})
const openQueueModal = (qz = null) => {
  editingQueue.value = qz
  Object.assign(queueForm, {
    name: qz?.name || '', code: qz?.code || '', color: qz?.color || '', description: qz?.description || '',
    team_id: qz?.team_id || '',
    auto_assign: !!qz?.auto_assign, assignment_method: qz?.assignment_method || 'round_robin',
    category_ids: (qz?.category_ids || []).map(String), tier: qz?.tier ?? null,
    skill_ids: (qz?.skill_ids || []).map(String), serve_order: qz?.serve_order || 'priority_age',
    queue_priority: qz?.queue_priority ?? 50, max_agent_load: qz?.max_agent_load ?? null,
    is_default: !!qz?.is_default, is_active: qz?.is_active !== false,
    sla_package_id: qz?.sla_package_id || '', capacity_limit: qz?.capacity_limit ?? null,
    overflow_queue_id: qz?.overflow_queue_id || '',
  })
  queueModal.value = true
}
/* invalid custom hex must never leak into the lane's spine */
const colorOk = computed(() => !queueForm.color || HEX_RX.test(queueForm.color))
const laneValid = computed(() => !!queueForm.name && !overflowCycleWarn.value && colorOk.value)
/* flipping is_default on quietly dethrones the current default — say so */
const defaultCrownNote = computed(() => {
  if (!queueForm.is_default) return ''
  const cur = allQueues.value.find(q => q.is_default && String(q.id) !== String(editingQueue.value?.id || ''))
  return cur ? `Moves the fallback crown from “${cur.name}” — unroutable tickets will land here instead.` : ''
})
const overflowOpts = computed(() => [{ value: '', label: 'None — hold at capacity' },
  ...allQueues.value
    .filter(x => x.is_active && String(x.id) !== String(editingQueue.value?.id || ''))
    .map(x => ({ value: x.id, label: `${x.name}${x.tier ? ` · L${x.tier}` : ''}` }))])
// Client-side mirror of the API's cycle guard (the backend still 422s as the seal).
const overflowCycleWarn = computed(() => {
  const of = queueForm.overflow_queue_id
  if (!of) return ''
  if (editingQueue.value && String(of) === String(editingQueue.value.id)) return 'A lane can’t overflow into itself.'
  const target = allQueues.value.find(x => String(x.id) === String(of))
  if (editingQueue.value && target?.overflow_queue_id && String(target.overflow_queue_id) === String(editingQueue.value.id)) {
    return `Overflow loop: ${target.name} already spills into this lane.`
  }
  return ''
})
/* ── BLADE PROOF + ROUTING BRIEF (the lane modal's live rail) ── */
const bladeScanning = computed(() => !editingQueue.value || !(editingQueue.value.open_ticket_count > 0))
const bladeLit = computed(() => {
  const qz = editingQueue.value
  if (!qz || !(qz.open_ticket_count > 0)) return 0
  const ratio = queueForm.capacity_limit ? Math.min(1, qz.open_ticket_count / queueForm.capacity_limit) : Math.min(1, qz.open_ticket_count / 25)
  return Math.min(12, Math.max(1, Math.round(ratio * 12)))
})
const bladeLedCaption = computed(() => {
  const qz = editingQueue.value
  if (qz && qz.open_ticket_count > 0) return `${qz.open_ticket_count} open now${queueForm.capacity_limit ? ` / ${queueForm.capacity_limit} cap` : ''}`
  return 'awaiting first traffic — scanner idling'
})
/* the brief narrates the lane's future behaviour — each line ignites as it's configured */
const laneBrief = computed(() => {
  const f = queueForm
  const nCat = f.category_ids.length
  const nSk = f.skill_ids.length
  const teamLabel = teamOpts.value.find(t => String(t.value) === String(f.team_id))?.label
  const hasTeam = !!f.team_id
  return [
    { k: 'intake', t: 'INTAKE', on: nCat > 0,
      d: nCat ? `${nCat} categor${nCat === 1 ? 'y routes' : 'ies route'} here — subcategory picks beat parents` : 'no categories wired — traffic only arrives via rules or manual moves' },
    { k: 'crew', t: 'CREW & CLAIM', on: hasTeam, warn: f.auto_assign && !hasTeam,
      d: f.auto_assign && !hasTeam ? 'auto-assign is armed but no crew is wired — it fails open to manual'
        : hasTeam ? `${teamLabel} ${f.auto_assign ? `· ${methodShort(f.assignment_method)} claims an agent on arrival` : '· work waits for Serve-next / claim'}`
        : 'no crew — every ticket is a manual pick-up' },
    { k: 'clock', t: 'CLOCK', on: true,
      d: f.sla_package_id ? `${slaName(f.sla_package_id)} times this lane — org contracts still win` : 'desk default SLA times this lane — org contracts win' },
    { k: 'ceiling', t: 'CEILING & SPILL', on: !!f.capacity_limit, warn: !!f.capacity_limit && !f.overflow_queue_id,
      d: f.capacity_limit ? (f.overflow_queue_id ? `past ${f.capacity_limit} open, new arrivals spill one hop to ${laneName(f.overflow_queue_id)}`
        : `capacity ${f.capacity_limit} is a signal, never a wall — with no spill path, work stacks here`) : 'no ceiling — this lane holds everything routed to it' },
    { k: 'gate', t: 'SKILL GATE', on: nSk > 0,
      d: nSk ? `auto-assign prefers agents certified in all ${nSk} skill${nSk === 1 ? '' : 's'} — fails open to the crew` : 'no gate — any crew agent qualifies' },
    { k: 'seal', t: 'LEDGER SEAL', on: true,
      d: `this save signs as ${actor.value.name || 'the admin'} and lands in the config ledger` },
  ]
})
const saveQueue = async () => {
  busy.value = true
  const payload = {
    ...queueForm,
    team_id: queueForm.team_id || null,
    max_agent_load: queueForm.max_agent_load || null,
    code: queueForm.code || null, color: queueForm.color || null,
    description: queueForm.description || null,
    queue_priority: Math.min(100, Math.max(1, Number(queueForm.queue_priority) || 50)),
    sla_package_id: queueForm.sla_package_id || null,
    capacity_limit: queueForm.capacity_limit || null,
    overflow_queue_id: queueForm.overflow_queue_id || null,
  }
  try {
    if (editingQueue.value) await updateQueue(editingQueue.value.id, payload)
    else await createQueue(payload)
    toast.success(editingQueue.value ? 'Lane saved' : 'Lane laid')
    queueModal.value = false
    loadAll()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Save failed') } finally { busy.value = false }
}
const deleteQueueTarget = ref(null)
const reassignTo = ref('')
const reassignOpts = computed(() => allQueues.value
  .filter(x => x.is_active && x.id !== deleteQueueTarget.value?.id)
  .map(x => ({ value: x.id, label: `${x.name}${x.tier ? ` · L${x.tier}` : ''}` })))
const deleteArm = ref(false)
const deleteReason = ref('')
const doomForceReassign = ref(false)
const askDeleteQueue = (qz) => {
  deleteQueueTarget.value = qz
  reassignTo.value = ''
  deleteArm.value = false
  deleteReason.value = ''
  doomForceReassign.value = false
}
const closeDoom = () => { deleteQueueTarget.value = null; deleteArm.value = false }
const doomActive = computed(() => deleteQueueTarget.value?.open_ticket_count || 0)
/* the backend counts ALL non-terminal work — a 409 flips this on even when the card said 0 */
const doomNeedsReassign = computed(() => doomActive.value > 0 || doomForceReassign.value)
const doomDirectivesOk = computed(() => !doomNeedsReassign.value || !!reassignTo.value)
const doomManifest = computed(() => {
  const t = deleteQueueTarget.value
  if (!t) return []
  const spillers = allQueues.value.filter(q => String(q.overflow_queue_id || '') === String(t.id) && String(q.id) !== String(t.id))
  const ruleHits = rules.value.filter(r => (r.actions || []).some(a =>
    ['route_queue', 'assign_queue'].includes(a?.type) && String(a.value) === String(t.id)))
  const nCat = (t.category_ids || []).length
  const list = (arr) => arr.slice(0, 3).map(x => x.name).join(', ') + (arr.length > 3 ? ` +${arr.length - 3}` : '')
  const rows = [
    { k: 'tickets', t: 'TICKETS ABOARD', on: true, danger: doomActive.value > 0,
      d: doomActive.value
        ? `${doomActive.value} active ticket(s) move to ${reassignTo.value ? (reassignOpts.value.find(o => String(o.value) === String(reassignTo.value))?.label || 'the inheriting lane') : '… pick the inheriting lane'} — the move is audited`
        : 'the hold is empty — nothing to rehome' },
    { k: 'spill', t: 'SPILL PATHS IN', on: true, warn: spillers.length > 0,
      d: spillers.length ? `${list(spillers)} spill${spillers.length === 1 ? 's' : ''} into this lane — that hop dies quietly (fail-open); repoint their overflow after the pull` : 'no lane spills into this one' },
    { k: 'rules', t: 'RULE TARGETS', on: true, warn: ruleHits.length > 0,
      d: ruleHits.length ? `${list(ruleHits)} route${ruleHits.length === 1 ? 's' : ''} here — the gate keeps firing but its target is gone; traffic falls to the category router` : 'no routing rule targets this lane' },
    { k: 'cats', t: 'CATEGORY MAP', on: true, warn: nCat > 0,
      d: nCat ? `${nCat} categor${nCat === 1 ? 'y loses' : 'ies lose'} their mapped lane — that traffic falls to the desk default` : 'no categories mapped here' },
  ]
  if (t.code) rows.push({ k: 'code', t: 'CODE RELEASE', on: true, d: `badge ${t.code} is freed for a future lane` })
  rows.push({ k: 'seal', t: 'LEDGER SEAL', on: true,
    d: `the pull signs as ${actor.value.name || 'the admin'}${deleteReason.value ? ' with your reason beside it' : ' — add a reason so future-you knows why'}` })
  return rows
})
const confirmDeleteQueue = async () => {
  busy.value = true
  try {
    const params = {}
    if (reassignTo.value) params.reassign_to = reassignTo.value
    if (deleteReason.value) params.reason = deleteReason.value
    await deleteQueue(deleteQueueTarget.value.id, Object.keys(params).length ? params : undefined)
    toast.success(`${deleteQueueTarget.value.name} pulled from the rack`)
    closeDoom()
    loadAll()
  } catch (e) {
    const detail = e?.response?.data?.detail || 'Delete failed'
    /* the backend counts pending/on-hold work as active — surface the directive instead of dead-ending */
    if (e?.response?.status === 409 && /reassign_to/i.test(String(detail))) {
      doomForceReassign.value = true
      deleteArm.value = false
      toast.warning('The lane still holds active work the card didn’t show — pick the inheriting lane.')
    } else toast.error(detail)
  } finally { busy.value = false }
}
/* ══ Rules ══ */
const ruleModal = ref(false)
const editingRule = ref(null)
const ruleForm = reactive({
  name: '', description: '', match_type: 'all', trigger: 'on_create', stop_processing: true, is_active: true,
  time_threshold_mins: null, conditions: [], actions: [],
})
const openRuleModal = (r = null, trigger = null) => {
  editingRule.value = r
  Object.assign(ruleForm, {
    name: r?.name || '', description: r?.description || '', match_type: r?.match_type || 'all',
    trigger: r?.trigger || trigger || 'on_create',
    stop_processing: r ? !!r.stop_processing : true,
    is_active: r ? !!r.is_active : true,
    time_threshold_mins: r?.time_threshold_mins ?? (trigger === 'time_based' ? 240 : null),
    conditions: JSON.parse(JSON.stringify(r?.conditions || [{ field: 'ticket_type', op: 'eq', value: '' }])).map(c => ({ ...c, _k: rowKey() })),
    actions: JSON.parse(JSON.stringify(r?.actions || [{ type: trigger === 'time_based' ? 'escalate_tier' : 'route_queue', value: '' }])).map(a => ({ ...a, _k: rowKey() })),
  })
  ruleModal.value = true
}
const THRESHOLD_CHIPS = [
  { mins: 60, label: '1h' }, { mins: 240, label: '4h' }, { mins: 480, label: '8h' }, { mins: 1440, label: '24h' },
]
/* row completeness — a half-filled condition/action is a silently-dead rule (the
   engine never matches an empty value), so saving one is now impossible. */
const condOk = (c) => !!c.field && !!c.op && (['is_empty', 'not_empty'].includes(c.op) || (c.value !== '' && c.value != null))
const actOk = (a) => !!a.type && (!actionNeeds(a.type) || (a.value !== '' && a.value != null))
const ruleValid = computed(() => !!ruleForm.name
  && ruleForm.conditions.length > 0 && ruleForm.conditions.every(condOk)
  && ruleForm.actions.length > 0 && ruleForm.actions.every(actOk)
  && (ruleForm.trigger !== 'time_based' || Number(ruleForm.time_threshold_mins) >= 5))
/* live preview chips */
const condChip = (c) => `${labelOf(RULE_FIELDS, c.field)} ${labelOf(RULE_OPS, c.op)} ${['is_empty', 'not_empty'].includes(c.op) ? '' : (Array.isArray(c.value) ? c.value.join('/') : nameOfValue(c) || '…')}`.trim()
const actChip = (a) => `${labelOf(RULE_ACTIONS, a.type)}${actionNeeds(a.type) ? ` → ${nameOfActionValue(a) || '…'}` : ''}`
/* SHADOW GUARD — the exact trap this desk hit live: an earlier active stop-rule with
   broader (or equal) ALL-conditions eats every ticket before this rule is reached. */
const shadowWarn = computed(() => {
  if (ruleForm.trigger !== 'on_create') return ''
  const mine = ruleForm.conditions.filter(condOk).map(c => `${c.field}|${c.op}|${String(c.value ?? '').toLowerCase()}`)
  if (!mine.length) return ''
  const myOrder = editingRule.value?.order_index ?? Number.POSITIVE_INFINITY
  for (const r of createRules.value) {
    if (editingRule.value && String(r.id) === String(editingRule.value.id)) continue
    if (!r.is_active || !r.stop_processing || (r.match_type || 'all') !== 'all') continue
    if ((r.order_index ?? 0) >= myOrder) continue
    const theirs = (r.conditions || []).map(c => `${c.field}|${c.op}|${String(c.value ?? '').toLowerCase()}`)
    if (theirs.length && theirs.every(k => mine.includes(k))) {
      return `“${r.name}” sits earlier with broader (or equal) conditions and stops the chain — this rule may never fire. Move this one above it, or narrow “${r.name}”.`
    }
  }
  return ''
})
/* ── GATE PROOF + CHAIN BRIEF (the rule modal's live rail) ── */
const gateSlot = computed(() => {
  if (ruleForm.trigger === 'time_based') return { plate: 'SWEEP', hint: 'Off-chain — evaluated on the escalation sweep, not the intercept corridor' }
  if (editingRule.value) {
    const i = createRules.value.findIndex(r => String(r.id) === String(editingRule.value.id))
    return { plate: '#' + String((i < 0 ? createRules.value.length : i) + 1).padStart(2, '0'), hint: 'This gate\'s slot on the corridor — first match wins' }
  }
  return { plate: '#' + String(createRules.value.length + 1).padStart(2, '0'), hint: 'New gates bolt onto the END of the corridor — nudge them earlier after saving' }
})
const gatePort = computed(() => {
  const laneAct = ruleForm.actions.find(a => ['route_queue', 'assign_queue'].includes(a?.type) && a.value)
  if (laneAct) {
    const qz = allQueues.value.find(x => String(x.id) === String(laneAct.value))
    return { kind: 'lane', label: qz?.name || 'Lane', color: qz?.color || null }
  }
  const teamAct = ruleForm.actions.find(a => ['route_team', 'assign_team'].includes(a?.type) && a.value)
  if (teamAct) return { kind: 'team', label: teams.value.find(t => String(t.id) === String(teamAct.value))?.name || 'Team', color: null }
  if (ruleForm.actions.length) return { kind: 'effect', label: 'IN-PLACE EFFECTS', color: null }
  return { kind: 'none', label: 'NO DEFLECTION YET', color: null }
})
const gateExtraActs = computed(() => {
  const primary = ruleForm.actions.find(a => ['route_queue', 'assign_queue', 'route_team', 'assign_team'].includes(a?.type) && a.value)
  return ruleForm.actions.filter(a => a !== primary)
})
const gateBrief = computed(() => {
  const f = ruleForm
  const timed = f.trigger === 'time_based'
  const nC = f.conditions.length, okC = f.conditions.filter(condOk).length
  const nA = f.actions.length, okA = f.actions.filter(actOk).length
  const rows = [
    { k: 'trigger', t: 'TRIGGER', on: !timed || Number(f.time_threshold_mins) >= 5, warn: timed && !(Number(f.time_threshold_mins) >= 5),
      d: timed ? (Number(f.time_threshold_mins) >= 5 ? `sweeps tickets still open past ${fmtMins(f.time_threshold_mins)} — fires once per ticket` : 'set the open-for threshold (min 5m) — the sweep needs a clock')
        : 'fires the instant a ticket is born, before anything else touches it' },
    { k: 'slot', t: timed ? 'OFF-CHAIN' : 'GATE SLOT', on: true,
      d: timed ? 'runs on the escalation sweep (board-open + cron), outside the intercept corridor'
        : `intercepts at slot ${gateSlot.value.plate} of ${createRules.value.length + (editingRule.value ? 0 : 1)} — first match wins, nudge order from the corridor` },
    { k: 'when', t: 'GATE LOGIC', on: nC > 0 && okC === nC, warn: nC > 0 && okC < nC,
      d: !nC ? 'no conditions — this gate matches NOTHING (never a catch-all by accident)'
        : okC < nC ? `${nC - okC} of ${nC} condition${nC - okC === 1 ? '' : 's'} still need${nC - okC === 1 ? 's' : ''} a value`
        : `${nC} condition${nC === 1 ? '' : 's'} — ${f.match_type === 'any' ? 'ANY one hit opens the gate' : 'ALL must hold to open the gate'}` },
    { k: 'deflect', t: 'DEFLECTION', on: nA > 0 && okA === nA, warn: nA > 0 && okA < nA,
      d: !nA ? 'no actions — a capture would do nothing'
        : okA < nA ? `${nA - okA} action${nA - okA === 1 ? '' : 's'} still need${nA - okA === 1 ? 's' : ''} a target`
        : gatePort.value.kind === 'lane' ? `captured tickets deflect into ${gatePort.value.label}${gateExtraActs.value.length ? ` · +${gateExtraActs.value.length} in-place effect${gateExtraActs.value.length === 1 ? '' : 's'}` : ''}`
        : gatePort.value.kind === 'team' ? `captured tickets hand to ${gatePort.value.label}${gateExtraActs.value.length ? ` · +${gateExtraActs.value.length} more effect${gateExtraActs.value.length === 1 ? '' : 's'}` : ''}`
        : `${nA} in-place effect${nA === 1 ? '' : 's'} — the ticket stays where routing puts it` },
    { k: 'seal', t: 'CHAIN SEAL', on: f.stop_processing,
      d: f.stop_processing ? 'a capture seals the chain — later gates never see the ticket' : 'pass-through — matched tickets keep falling to later gates' },
  ]
  if (!timed) rows.push({ k: 'shadow', t: 'SHADOW CHECK', on: !shadowWarn.value, warn: !!shadowWarn.value,
    d: shadowWarn.value ? 'an earlier sealed gate shadows this one — see the warning above' : 'no earlier sealed gate shadows this one — it can be reached' })
  rows.push({ k: 'vault', t: 'VERSION VAULT', on: true,
    d: `every save snapshots a version under ${actor.value.name || 'the admin'} — replay any of them from History` })
  return rows
})
const saveRule = async () => {
  busy.value = true
  // _k is a client-only TransitionGroup key — it must never persist into the JSONB.
  const strip = ({ _k, ...rest }) => rest
  const payload = {
    ...ruleForm,
    description: ruleForm.description || null,
    conditions: ruleForm.conditions.filter(condOk).map(strip),
    actions: ruleForm.actions
      .filter(actOk).map(strip)
      .map(a => (a.type === 'add_tags' && typeof a.value === 'string'
        ? { ...a, value: a.value.split(',').map(s => s.trim()).filter(Boolean) } : a)),
    order_index: editingRule.value?.order_index ?? (rules.value.length + 1),
  }
  try {
    if (editingRule.value) await updateAutomationRule(editingRule.value.id, payload)
    else await createAutomationRule(payload)
    toast.success('Rule saved')
    ruleModal.value = false
    loadAll()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Save failed') } finally { busy.value = false }
}
const deleteRuleTarget = ref(null)
const askDeleteRule = (r) => { deleteRuleTarget.value = r }
/* who inherits a decommissioned gate's traffic — the next LIVE gate down the chain */
const deleteRuleNext = computed(() => {
  const t = deleteRuleTarget.value
  if (!t || (t.trigger || 'on_create') !== 'on_create') return ''
  const chain = createRules.value
  const i = chain.findIndex(r => String(r.id) === String(t.id))
  const nxt = i >= 0 ? chain.slice(i + 1).find(r => r.is_active) : null
  return nxt ? `the next live gate — “${nxt.name}”` : 'the category router'
})
const confirmDeleteRule = async ({ reason } = {}) => {
  busy.value = true
  try {
    await deleteAutomationRule(deleteRuleTarget.value.id, reason ? { reason } : undefined)
    toast.success('Decommissioned — reason recorded in the ledger')
    deleteRuleTarget.value = null
    loadAll()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Delete failed') } finally { busy.value = false }
}
/* the reversible alternative — park it (is_active=false), keep config + history */
const parkDeleteTarget = async () => {
  const t = deleteRuleTarget.value
  if (!t) return
  busy.value = true
  try {
    const fresh = await updateAutomationRule(t.id, { is_active: false })
    const i = rules.value.findIndex(x => String(x.id) === String(t.id))
    if (i >= 0) rules.value.splice(i, 1, fresh)
    toast.success(`“${t.name}” parked — off the line, one switch brings it back`)
    deleteRuleTarget.value = null
  } catch (e) { toast.error(e?.response?.data?.detail || 'Park failed') } finally { busy.value = false }
}
const nudgeRule = async (r, dir) => {
  const list = [...createRules.value]
  const i = list.findIndex(x => x.id === r.id)
  const j = i + dir
  if (j < 0 || j >= list.length) return
  ;[list[i], list[j]] = [list[j], list[i]]
  try {
    rules.value = await reorderRules(list.map((x, idx) => ({ id: x.id, order_index: idx + 1 })))
  } catch (e) { toast.error(e?.response?.data?.detail || 'Reorder failed') }
}
const ruleSummary = (r) => {
  const conds = (r.conditions || []).map(c => `${labelOf(RULE_FIELDS, c.field)} ${labelOf(RULE_OPS, c.op)} ${Array.isArray(c.value) ? c.value.join('/') : nameOfValue(c)}`)
  const acts = (r.actions || []).map(a => `${labelOf(RULE_ACTIONS, a.type)}${a.value ? ` → ${nameOfActionValue(a)}` : ''}`)
  return `${conds.join(r.match_type === 'any' ? ' OR ' : ' AND ') || '(no conditions)'} ⇒ ${acts.join(', ') || '(no actions)'}`
}
const labelOf = (list, v) => list.find(x => x.value === v)?.label || v
const nameOfValue = (c) => {
  if (['category_id', 'subcategory_id'].includes(c.field)) return categoryList.value.find(x => String(x.id) === String(c.value))?.name || short(c.value)
  if (c.field === 'organization_id') return (pickers.organizations || []).find(x => String(x.id) === String(c.value))?.name || short(c.value)
  return c.value ?? ''
}
const nameOfActionValue = (a) => {
  if (['route_queue', 'assign_queue'].includes(a.type)) return allQueues.value.find(x => String(x.id) === String(a.value))?.name || short(a.value)
  if (['route_team', 'assign_team'].includes(a.type)) return teams.value.find(x => String(x.id) === String(a.value))?.name || short(a.value)
  if (a.type === 'set_sla_package') return slas.value.find(x => String(x.id) === String(a.value))?.name || short(a.value)
  if (a.type === 'set_assignee') return agentPool.value.find(x => String(x.value) === String(a.value))?.label || short(a.value)
  if (a.type === 'escalate_tier') return `L${a.value}`
  return Array.isArray(a.value) ? a.value.join(', ') : (a.value ?? '')
}
const short = (v) => String(v || '').slice(0, 8)

const opsFor = (field) => {
  if (field === 'priority') return RULE_OPS.filter(o => !['matches_keywords'].includes(o.value))
  if (['impact', 'urgency'].includes(field)) {
    return RULE_OPS.filter(o => ['eq', 'neq', 'in', 'not_in', 'gte', 'lte', 'is_empty', 'not_empty'].includes(o.value))
  }
  if (field === 'business_hours') return RULE_OPS.filter(o => ['eq', 'neq'].includes(o.value))
  if (['subject', 'description'].includes(field)) {
    return RULE_OPS.filter(o => ['contains', 'not_contains', 'matches_keywords', 'eq', 'neq', 'is_empty', 'not_empty'].includes(o.value))
  }
  if (['contact_email', 'department', 'location'].includes(field)) {
    return RULE_OPS.filter(o => ['contains', 'not_contains', 'eq', 'neq', 'is_empty', 'not_empty'].includes(o.value))
  }
  if (field === 'tags') return RULE_OPS.filter(o => ['contains', 'not_contains', 'is_empty', 'not_empty'].includes(o.value))
  if (field === 'is_major_incident') return RULE_OPS.filter(o => ['eq', 'neq'].includes(o.value))
  return RULE_OPS.filter(o => !['gte', 'lte', 'contains', 'not_contains', 'matches_keywords'].includes(o.value))
}
const valueKind = (field) => (['ticket_type', 'priority', 'source', 'impact', 'urgency', 'category_id', 'subcategory_id', 'organization_id', 'is_major_incident', 'business_hours'].includes(field) ? 'select' : 'text')
const valueOpts = (field) => {
  if (field === 'ticket_type') return TICKET_TYPES
  if (field === 'priority') return PRIORITIES
  if (field === 'source') return ['portal', 'email', 'phone', 'chat', 'whatsapp', 'api', 'monitoring', 'internal'].map(v => ({ value: v, label: v }))
  if (['impact', 'urgency'].includes(field)) return ['low', 'medium', 'high', 'critical'].map(v => ({ value: v, label: v }))
  if (field === 'category_id') return categoryOpts.value
  if (field === 'subcategory_id') return subcategoryOpts.value
  if (field === 'organization_id') return orgOpts.value
  if (field === 'is_major_incident') return [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]
  if (field === 'business_hours') return [{ value: 'in_hours', label: 'Inside business hours' }, { value: 'out_of_hours', label: 'Outside business hours' }]
  return []
}

/* the Probe Console (dry-run) — the decision also travels the hero graph */
const sim = reactive({ subject: '', ticket_type: '', priority: '', impact: '', category_id: '', subcategory_id: '', organization_id: '', tags: '' })
const simBusy = ref(false)
const simResult = ref(null)
const probe = ref(null)
const probeTrace = ref(null)   // the gauntlet's staged descent (verdict per gate)
let probeSeq = 0
const runSim = async () => {
  simBusy.value = true
  try {
    const r = await simulateRule({
      subject: sim.subject || null,
      ticket_type: sim.ticket_type || null,
      priority: sim.priority || null,
      impact: sim.impact || null,
      category_id: sim.category_id || null,
      subcategory_id: sim.subcategory_id || null,
      organization_id: sim.organization_id || null,
      tags: sim.tags ? sim.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
    })
    simResult.value = r
    const lastHit = (r.matched || []).slice(-1)[0]
    const seq = ++probeSeq
    probe.value = {
      seq,
      rule_id: lastHit?.rule_id || null,
      queue_id: r.decision?.queue_id || null,
      overflow_from_id: r.decision?.overflow_from_id || null,
    }
    /* stage the gauntlet descent: verdict per gate, in chain order, until a seal */
    const matchedIds = new Set((r.matched || []).map(m => String(m.rule_id)))
    const stopHit = (r.matched || []).find(m => m.stopped)
    const steps = []
    for (const rule of createRules.value) {
      if (!rule.is_active) { steps.push({ id: String(rule.id), verdict: 'skip', stopped: false }); continue }
      const stopped = !!(stopHit && String(stopHit.rule_id) === String(rule.id))
      steps.push({ id: String(rule.id), verdict: matchedIds.has(String(rule.id)) ? 'hit' : 'miss', stopped })
      if (stopped) break
    }
    probeTrace.value = { seq, steps, fallthrough: !!r.fallback_used }
  } catch (e) { toast.error(e?.response?.data?.detail || 'Simulation failed') } finally { simBusy.value = false }
}

/* ══ SLA ══ */
const slaModal = ref(false)
const editingSla = ref(null)
const emptyMatrix = () => Object.fromEntries(PRIORITY_KEYS.map(k => [k, { response_mins: null, resolution_mins: null }]))
const slaForm = reactive({ name: '', description: '', is_default: false, matrix: emptyMatrix() })
const slaArm = ref(false)
const openSlaModal = (p = null) => {
  editingSla.value = p
  slaArm.value = false
  slaForm.name = p?.name || ''
  slaForm.description = p?.description || ''
  slaForm.is_default = !!p?.is_default
  slaForm.matrix = emptyMatrix()
  for (const k of PRIORITY_KEYS) {
    const row = (p?.matrix || {})[k] || {}
    slaForm.matrix[k] = { response_mins: row.response_mins ?? null, resolution_mins: row.resolution_mins ?? null }
  }
  slaModal.value = true
}
/* one-tap sensible matrices */
const SLA_PRESETS = [
  { key: 'aggressive', label: 'Aggressive' }, { key: 'standard', label: 'Standard' }, { key: 'relaxed', label: 'Relaxed' },
]
const PRESET_MATRICES = {
  aggressive: { critical: [15, 120], urgent: [30, 240], high: [60, 480], medium: [240, 1440], low: [480, 2880] },
  standard: { critical: [30, 240], urgent: [60, 480], high: [120, 1440], medium: [480, 4320], low: [1440, 7200] },
  relaxed: { critical: [60, 480], urgent: [120, 960], high: [240, 2880], medium: [1440, 7200], low: [2880, 14400] },
}
const applySlaPreset = (key) => {
  const m = PRESET_MATRICES[key]
  for (const k of PRIORITY_KEYS) slaForm.matrix[k] = { response_mins: m[k][0], resolution_mins: m[k][1] }
}
/* sanity: a clock that resolves faster than it responds is nonsense — hard-blocked */
const slaRowBad = (pr) => {
  const r = slaForm.matrix[pr]
  return !!(r.response_mins && r.resolution_mins && Number(r.resolution_mins) < Number(r.response_mins))
}
const slaBadRows = computed(() => PRIORITY_KEYS.filter(slaRowBad).map(k => k.toUpperCase()))
const slaHasClock = computed(() => PRIORITY_KEYS.some(k => slaForm.matrix[k].response_mins || slaForm.matrix[k].resolution_mins))
/* two policies with one name make the lane/org pickers ambiguous — blocked client-side
   (the backend only guards create, not rename) */
const dupSlaName = computed(() => !!slaForm.name && slas.value.some(p =>
  (p.name || '').trim().toLowerCase() === slaForm.name.trim().toLowerCase()
  && String(p.id) !== String(editingSla.value?.id || '')))
const slaRowNeg = (pr) => {
  const r = slaForm.matrix[pr]
  return (r.response_mins != null && Number(r.response_mins) < 0) || (r.resolution_mins != null && Number(r.resolution_mins) < 0)
}
const slaNegRows = computed(() => PRIORITY_KEYS.filter(slaRowNeg).map(k => k.toUpperCase()))
const slaValid = computed(() => !!slaForm.name && slaHasClock.value && !slaBadRows.value.length && !slaNegRows.value.length && !dupSlaName.value)
/* ── CADENCE PROOF + CLOCK BRIEF (the SLA modal's live rail) ── */
const SLA_X = (m) => {
  const v = Math.max(10, Math.min(43200, Number(m) || 10))
  return ((Math.log(v) - Math.log(10)) / (Math.log(43200) - Math.log(10))) * 100
}
const SLA_TICKS = [
  { m: 60, label: '1h' }, { m: 240, label: '4h' }, { m: 1440, label: '1d' },
  { m: 10080, label: '7d' }, { m: 43200, label: '30d' },
].map(t => ({ ...t, x: SLA_X(t.m) }))
const slaTraces = computed(() => PRIORITY_KEYS.map((pr, j) => {
  const row = slaForm.matrix[pr] || {}
  const resp = Math.max(0, Number(row.response_mins) || 0)
  const reso = Math.max(0, Number(row.resolution_mins) || 0)
  const left = SLA_X(resp || reso)
  return {
    pr, color: priorityColor(pr), top: 16 + j * 15,
    timed: !!(resp || reso), hasResp: !!resp, hasReso: !!reso, bad: slaRowBad(pr) || slaRowNeg(pr),
    left, width: Math.max(resp && reso ? SLA_X(reso) - left : 0, 1),
    respLabel: fmtMins(resp) || '—', resoLabel: fmtMins(reso) || '—',
  }
}))
const slaTimedCells = computed(() => PRIORITY_KEYS.reduce((c, k) =>
  c + (slaForm.matrix[k].response_mins ? 1 : 0) + (slaForm.matrix[k].resolution_mins ? 1 : 0), 0))
const slaCoverage = computed(() => Math.round((slaTimedCells.value / 10) * 100))
const slaBrief = computed(() => {
  const untimed = PRIORITY_KEYS.filter(k => !slaForm.matrix[k].response_mins && !slaForm.matrix[k].resolution_mins)
  const lanes = editingSla.value ? lanesOnSla(editingSla.value.id) : 0
  const orgs = editingSla.value ? orgsOnSla(editingSla.value.id) : 0
  return [
    { k: 'coverage', t: 'COVERAGE', on: slaTimedCells.value > 0, warn: slaTimedCells.value > 0 && untimed.length > 0,
      d: !slaTimedCells.value ? 'no clocks set — this policy would time nothing'
        : untimed.length ? `${slaTimedCells.value}/10 clocks set — ${untimed.map(u => u.toUpperCase()).join(', ')} run${untimed.length === 1 ? 's' : ''} untimed`
        : 'all 10 clocks set — every priority is timed' },
    { k: 'sanity', t: 'SANITY', on: !slaBadRows.value.length && !slaNegRows.value.length, warn: !!(slaBadRows.value.length || slaNegRows.value.length),
      d: slaNegRows.value.length ? `negative minutes on ${slaNegRows.value.join(', ')} — clocks can't run backwards`
        : slaBadRows.value.length ? `${slaBadRows.value.join(', ')} resolve${slaBadRows.value.length === 1 ? 's' : ''} faster than ${slaBadRows.value.length === 1 ? 'it acks' : 'they ack'} — fix the order`
        : 'every resolution outlasts its ack — the clocks are coherent' },
    { k: 'precedence', t: 'PRECEDENCE', on: true,
      d: slaForm.is_default ? 'crowned default — times every ticket nothing else claims (rule/agent picks and org contracts still win)'
        : 'wins only when a lane or org contract names it — rule/agent picks beat everything' },
    { k: 'freeze', t: 'STOP THE CLOCK', on: true,
      d: 'pending customer, pending vendor and on-hold freeze both clocks — they resume on reactivation' },
    { k: 'carry', t: 'CARRIED BY', on: !!(lanes || orgs), warn: !!editingSla.value && !lanes && !orgs && !slaForm.is_default,
      d: editingSla.value
        ? (lanes || orgs ? `${lanes ? `${lanes} lane${lanes === 1 ? '' : 's'}` : ''}${lanes && orgs ? ' · ' : ''}${orgs ? `${orgs} org contract${orgs === 1 ? '' : 's'}` : ''} carry this policy`
          : slaForm.is_default ? 'nothing names it directly — as the default it still times the whole desk' : 'nothing carries it — wire it to a lane or org contract, or it never runs')
        : 'not carried yet — wire it to a lane or org contract after saving' },
    { k: 'name', t: 'NAME SEAL', on: !!slaForm.name && !dupSlaName.value, warn: dupSlaName.value,
      d: dupSlaName.value ? 'that name is taken — two same-named policies make every picker ambiguous'
        : slaForm.name ? `“${slaForm.name}” is unique across the desk` : 'name the policy — pickers sort by it' },
    { k: 'seal', t: 'LEDGER SEAL', on: true,
      d: `this save signs as ${actor.value.name || 'the admin'} and lands in the config ledger` },
  ]
})
const slaCarryNote = computed(() => {
  if (!editingSla.value) return ''
  const bits = []
  const ln = lanesOnSla(editingSla.value.id); if (ln) bits.push(`${ln} lane(s)`)
  const on = orgsOnSla(editingSla.value.id); if (on) bits.push(`${on} org contract(s)`)
  return bits.length ? ` — ${bits.join(' + ')} fall back to default` : ''
})
const saveSla = async () => {
  busy.value = true
  const matrix = {}
  for (const k of PRIORITY_KEYS) {
    const row = slaForm.matrix[k]
    if (row.response_mins || row.resolution_mins) matrix[k] = { response_mins: row.response_mins || null, resolution_mins: row.resolution_mins || null }
  }
  try {
    const payload = { name: slaForm.name, description: slaForm.description || null, is_default: slaForm.is_default, matrix }
    if (editingSla.value) await updateSlaPackage(editingSla.value.id, payload)
    else await createSlaPackage(payload)
    toast.success('SLA policy saved')
    slaModal.value = false
    loadAll()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Save failed') } finally { busy.value = false }
}
const removeSla = async () => {
  busy.value = true
  try {
    await deleteSlaPackage(editingSla.value.id)
    toast.success('SLA policy removed')
    slaModal.value = false
    loadAll()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Delete failed') } finally { busy.value = false }
}

/* ══ Skills — THE CERTIFICATION GRID ══ */
const skillModal = ref(false)
const editingSkill = ref(null)
const skillForm = reactive({ name: '', code: '', color: '', description: '', agent_ids: [], is_active: true })
const skillArm = ref(false)
const agentFilter = ref('')
const openSkillModal = (s = null) => {
  editingSkill.value = s
  skillArm.value = false
  agentFilter.value = ''
  Object.assign(skillForm, {
    name: s?.name || '', code: s?.code || '', color: s?.color || '', description: s?.description || '',
    agent_ids: (s?.agent_ids || []).map(String), is_active: s ? s.is_active !== false : true,
  })
  skillModal.value = true
}
const editSkillById = (id) => { const s = skills.value.find(x => String(x.id) === String(id)); if (s) openSkillModal(s) }

/* grid cell flip → live roster PATCH. Optimistic (the diode answers the click
   instantly), locked per skill so rapid flips can't interleave, reverted on failure. */
const certBusy = ref([])
const toggleCert = async (skillId, agentId) => {
  const sid = String(skillId)
  const s = skills.value.find(x => String(x.id) === sid)
  if (!s || certBusy.value.includes(sid)) return
  const beforeIds = (s.agent_ids || []).map(String)
  const beforeAgents = s.agents
  const next = beforeIds.includes(String(agentId))
    ? beforeIds.filter(a => a !== String(agentId))
    : [...beforeIds, String(agentId)]
  certBusy.value = [...certBusy.value, sid]
  s.agent_ids = next
  s.agents = next.map(id => ({ id, name: agentPool.value.find(a => String(a.value) === id)?.label || '?' }))
  try {
    const fresh = await updateSkill(sid, { agent_ids: next })
    const i = skills.value.findIndex(x => String(x.id) === sid)
    if (i >= 0) skills.value.splice(i, 1, fresh)
  } catch (e) {
    s.agent_ids = beforeIds
    s.agents = beforeAgents
    toast.error(e?.response?.data?.detail || 'Certification failed — roster unchanged')
  } finally { certBusy.value = certBusy.value.filter(x => x !== sid) }
}
const filteredAgentPool = computed(() => {
  const q = agentFilter.value.toLowerCase()
  return q ? agentPool.value.filter(a => (a.label || '').toLowerCase().includes(q)) : agentPool.value
})
/* two skills with one name make the lane picker ambiguous — blocked client-side */
const dupSkillName = computed(() => !!skillForm.name && skills.value.some(s =>
  (s.name || '').trim().toLowerCase() === skillForm.name.trim().toLowerCase()
  && String(s.id) !== String(editingSkill.value?.id || '')))
/* codes are DB-unique — catch the clash before the request instead of after */
const dupSkillCode = computed(() => !!skillForm.code && skills.value.some(s =>
  (s.code || '').trim().toLowerCase() === skillForm.code.trim().toLowerCase()
  && String(s.id) !== String(editingSkill.value?.id || '')))
const skillColorOk = computed(() => !skillForm.color || HEX_RX.test(skillForm.color))
const skillValid = computed(() => !!skillForm.name && !dupSkillName.value && !dupSkillCode.value && skillColorOk.value)

/* ── the badge preview + signal checks (the modal's left rail) ── */
const rosterPct = computed(() => (agentPool.value.length ? skillForm.agent_ids.length / agentPool.value.length : 0))
const rosterPreview = computed(() => agentPool.value.filter(a => skillForm.agent_ids.includes(String(a.value))).slice(0, 4))
const skillBlocker = computed(() =>
  dupSkillName.value ? `A skill named “${skillForm.name}” already exists.`
    : dupSkillCode.value ? `Code “${skillForm.code}” is taken — codes are unique desk-wide.`
      : !skillColorOk.value ? 'Colour must be a #rrggbb hex.' : '')
const skillChecks = computed(() => [
  { k: 'name', label: 'NAME', ok: !!skillForm.name && !dupSkillName.value, bad: dupSkillName.value,
    text: dupSkillName.value ? 'TAKEN' : skillForm.name ? 'SET' : 'REQUIRED' },
  { k: 'code', label: 'CODE', ok: !!skillForm.code && !dupSkillCode.value, bad: dupSkillCode.value,
    text: dupSkillCode.value ? 'TAKEN' : skillForm.code || 'OPTIONAL' },
  { k: 'color', label: 'COLOUR', ok: !!skillForm.color && skillColorOk.value, bad: !skillColorOk.value,
    text: !skillColorOk.value ? 'BAD HEX' : skillForm.color ? skillForm.color.toUpperCase() : 'HOUSE AMBER' },
  { k: 'roster', label: 'ROSTER', ok: skillForm.agent_ids.length > 0, warn: !skillForm.agent_ids.length,
    text: skillForm.agent_ids.length ? `${skillForm.agent_ids.length} CERTIFIED` : 'EMPTY — COVERAGE GAP' },
])
/* mint a unique code from the name — initials for multi-word, prefix otherwise */
const suggestedCode = computed(() => {
  const n = (skillForm.name || '').trim().toUpperCase().replace(/[^A-Z0-9\s]/g, '')
  if (!n) return ''
  const words = n.split(/\s+/).filter(Boolean)
  const base = words.length >= 2 ? words.map(w => w[0]).join('').slice(0, 4) : (words[0] || '').slice(0, 3)
  if (!base) return ''
  const taken = (c) => skills.value.some(s => (s.code || '').toUpperCase() === c
    && String(s.id) !== String(editingSkill.value?.id || ''))
  let code = base
  for (let i = 2; taken(code) && i < 10; i++) code = `${base}${i}`
  return taken(code) ? '' : code
})
const certifyFiltered = () => {
  filteredAgentPool.value.forEach((a) => {
    const v = String(a.value)
    if (!skillForm.agent_ids.includes(v)) skillForm.agent_ids.push(v)
  })
}
const saveSkill = async () => {
  busy.value = true
  const payload = { ...skillForm, code: skillForm.code || null, color: skillForm.color || null, description: skillForm.description || null }
  if (!editingSkill.value) delete payload.is_active   // SkillCreate has no is_active; new skills are born live
  try {
    if (editingSkill.value) await updateSkill(editingSkill.value.id, payload)
    else await createSkill(payload)
    toast.success('Skill saved')
    skillModal.value = false
    loadAll()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Save failed') } finally { busy.value = false }
}
const removeSkill = async () => {
  busy.value = true
  try {
    await deleteSkill(editingSkill.value.id)
    toast.success('Skill removed')
    skillModal.value = false
    loadAll()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Delete failed — queues may still require it') } finally { busy.value = false }
}

/* ══ Hours & holidays — THE DAYWHEEL (edit drafts live in the component) ══ */
const hoursBusy = reactive({})
const saveCrewHours = async (teamId, bh) => {
  hoursBusy[String(teamId)] = true
  try {
    await updateTeam(teamId, { business_hours: bh })
    const tm = teams.value.find(t => String(t.id) === String(teamId))
    if (tm) tm.business_hours = bh
    toast.success(`${tm?.name || 'Crew'} window committed`)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Save failed') }
  finally { delete hoursBusy[String(teamId)] }
}

const holidays = ref([])
const wires = reactive({ assign_email: true, breach_warning: true, webhook_url: '' })
const loadSettings = async () => {
  try {
    const all = await listSettings()
    const hs = all.find(s => s.key === 'business_holidays')
    holidays.value = (hs?.value?.items || [])
    const wr = all.find(s => s.key === 'queue_notifications')
    Object.assign(wires, { assign_email: true, breach_warning: true, webhook_url: '', ...(wr?.value || {}) })
  } catch { /* fresh install */ }
}
const persistHolidays = async () => {
  try { await upsertSetting({ key: 'business_holidays', value: { items: holidays.value } }) }
  catch (e) { toast.error(e?.response?.data?.detail || 'Save failed') }
}
const addHoliday = ({ date, label }) => {
  holidays.value.push({ date, label })
  holidays.value.sort((a, b) => a.date.localeCompare(b.date))
  persistHolidays()
}
const removeHoliday = (i) => { holidays.value.splice(i, 1); persistHolidays() }

/* ══ Wires ══ */
/* ── THE UPLINK ARRAY — breakers save instantly, the endpoint saves on demand ── */
const wireBusy = ref(false)
const wireTesting = ref(false)
const wireTestResult = ref(null)
const saveWires = async (okMsg = 'Wires saved') => {
  wireBusy.value = true
  try {
    await upsertSetting({ key: 'queue_notifications', value: { ...wires } })
    toast.success(okMsg)
    return true
  } catch (e) { toast.error(e?.response?.data?.detail || 'Save failed'); return false }
  finally { wireBusy.value = false }
}
const toggleWire = async (key) => {
  if (wireBusy.value || !(key in wires)) return
  wires[key] = !wires[key]
  const ok = await saveWires(wires[key] ? 'Wire restored — signals flowing' : 'Wire cut — signals silenced')
  if (!ok) wires[key] = !wires[key]   // revert the breaker on failure
}
const saveWebhookUrl = async (url) => {
  const before = wires.webhook_url
  wires.webhook_url = url || ''
  const ok = await saveWires(url ? 'Uplink wired' : 'Uplink disconnected')
  if (!ok) wires.webhook_url = before
  else wireTestResult.value = null   // a new endpoint voids the old verdict
}
const fireTestTransmission = async (url) => {
  if (wireTesting.value) return
  wireTesting.value = true
  wireTestResult.value = null
  const t0 = Date.now()
  try {
    const r = await testWebhook({ url: url || undefined })
    /* let the comet fly at least one full pass before the verdict lands */
    const wait = Math.max(0, 1200 - (Date.now() - t0))
    await new Promise(res => setTimeout(res, wait))
    wireTestResult.value = { ok: !!r.ok, detail: r.detail || '', at: Date.now() }
    if (r.ok) toast.success(`Test transmission delivered · ${r.detail}`)
    else toast.error(`Uplink unreachable · ${r.detail}`)
  } catch (e) {
    wireTestResult.value = { ok: false, detail: e?.response?.data?.detail || 'request failed', at: Date.now() }
    toast.error(e?.response?.data?.detail || 'Test failed')
  } finally { wireTesting.value = false }
}

/* ══ Ledger — THE CLOUD CHAMBER (display meta lives in the component) ══ */
const LEDGER_LIMIT = 10
const ledgerItems = ref([])
const ledgerTotal = ref(0)
const ledgerPage = ref(1)
const ledgerEntity = ref('')
const ledgerBusy = ref(false)
const loadLedger = async (quiet = false) => {
  if (!quiet) ledgerBusy.value = true
  try {
    const r = await configLedger({ page: ledgerPage.value, limit: LEDGER_LIMIT, entity: ledgerEntity.value || undefined })
    ledgerItems.value = r.items || []
    ledgerTotal.value = r.total || 0
    /* the frame can vanish under us (filter switch, entries pruned) — snap to the last one */
    const last = Math.max(1, Math.ceil(ledgerTotal.value / LEDGER_LIMIT))
    if (!ledgerItems.value.length && ledgerPage.value > last) { ledgerPage.value = last; return loadLedger(quiet) }
  } catch { /* agent panels / older backend */ }
  finally { ledgerBusy.value = false }
}
const setLedgerEntity = (v) => { ledgerEntity.value = v; ledgerPage.value = 1; loadLedger() }
const setLedgerPage = (pg) => {
  const last = Math.max(1, Math.ceil(ledgerTotal.value / LEDGER_LIMIT))
  ledgerPage.value = Math.min(Math.max(1, pg), last)
  loadLedger()
}

const revModal = ref(false)
const revBusy = ref(false)
const revRestoring = ref(false)
const revisions = ref([])
const revName = ref('')
const revRuleId = ref(null)
const openRevisions = async (ruleId, name = '') => {
  revModal.value = true
  revName.value = name || ''
  revRuleId.value = ruleId
  revBusy.value = true
  revisions.value = []
  try { revisions.value = await listRuleRevisions(ruleId) }
  catch (e) { toast.error(e?.response?.data?.detail || 'History unavailable') }
  finally { revBusy.value = false }
}
/* the deck is reachable from the Ledger for decommissioned rules — those are read-only + recreate */
const revRuleLive = computed(() => rules.value.some(r => String(r.id) === String(revRuleId.value || '')))
/* snapshots store raw ids — resolve them to live names with the same helpers the gauntlet uses */
const revResolveCond = (c) => ({
  f: labelOf(RULE_FIELDS, c.field), o: labelOf(RULE_OPS, c.op),
  v: ['is_empty', 'not_empty'].includes(c.op) ? '' : (Array.isArray(c.value) ? c.value.join(', ') : String(nameOfValue(c) ?? '')),
})
const revResolveAct = (a) => ({
  label: labelOf(RULE_ACTIONS, a.type),
  value: a.value != null && a.value !== '' ? String(nameOfActionValue(a)) : '',
})
/* the SNAPSHOT fields a restore/recreate carries — never order_index (chain position stays put) */
const snapPayload = (s) => ({
  name: s.name, description: s.description ?? null, match_type: s.match_type || 'all',
  conditions: s.conditions || [], actions: s.actions || [],
  trigger: s.trigger || 'on_create', stop_processing: !!s.stop_processing,
  time_threshold_mins: s.time_threshold_mins ?? null, is_active: s.is_active !== false,
})
const restoreRevision = async (snapshot) => {
  if (!revRuleId.value || revRestoring.value) return
  revRestoring.value = true
  try {
    const fresh = await updateAutomationRule(revRuleId.value, snapPayload(snapshot))
    const i = rules.value.findIndex(x => String(x.id) === String(revRuleId.value))
    if (i >= 0) rules.value.splice(i, 1, fresh)
    toast.success('Cut restored — it is now the live config (new version minted)')
    revisions.value = await listRuleRevisions(revRuleId.value)   // the deck shows the new head
  } catch (e) { toast.error(e?.response?.data?.detail || 'Restore failed') } finally { revRestoring.value = false }
}
const recreateRevision = async (snapshot) => {
  if (revRestoring.value) return
  revRestoring.value = true
  try {
    await createAutomationRule(snapPayload(snapshot))
    toast.success(`“${snapshot.name}” forged again — a fresh rule at the end of the chain`)
    revModal.value = false
    loadAll()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Recreate failed') } finally { revRestoring.value = false }
}

onMounted(async () => {
  if (route.query.panel && SECTIONS.some(s => s.key === route.query.panel)) section.value = String(route.query.panel)
  await loadAll()
  if (route.query.queue) {
    const qz = allQueues.value.find(x => String(x.id) === String(route.query.queue))
    if (qz) { section.value = 'queues'; openQueueModal(qz) }
  }
})
watch(section, (s) => { if (s === 'ledger') loadLedger() })
</script>

<style scoped>
.sd-qcf { display: flex; flex-direction: column; gap: 16px; color: var(--sd-text); }

/* ═══ node dock ═══ */
.qcf-dock {
  position: relative; display: flex; gap: 10px; flex-wrap: wrap; align-items: center;
  padding: 10px 14px; border-radius: 16px;
  border: 1px solid var(--sd-border); background: var(--sd-surface-glass);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
}
.qcf-dock-rail {
  position: absolute; left: 22px; right: 22px; top: 50%; height: 1px;
  background: linear-gradient(90deg, transparent, var(--sd-qc-brd), transparent);
  pointer-events: none;
}
.qcf-node {
  position: relative; display: inline-flex; align-items: center; gap: 7px;
  padding: 8px 14px 8px 11px; border-radius: 12px; cursor: pointer;
  font-size: 12px; font-weight: 700; color: var(--sd-text-muted);
  border: 1px solid var(--sd-border); background: var(--sd-surface);
  transition: color 0.25s, border-color 0.25s, box-shadow 0.25s;
}
.qcf-node-port {
  width: 7px; height: 7px; border-radius: 50%;
  border: 1.5px solid var(--sd-qc-brd); background: transparent;
  transition: background 0.25s, box-shadow 0.25s;
}
.qcf-node:hover { color: var(--sd-text); border-color: var(--sd-qc-brd); }
.qcf-node.on {
  color: var(--sd-text); border-color: var(--sd-qc-brd);
  box-shadow: var(--sd-qc-glow);
  background: linear-gradient(180deg, var(--sd-qc-soft), transparent);
}
.qcf-node.on .qcf-node-port { background: var(--sd-qc-core); box-shadow: 0 0 8px var(--sd-qc-core); }
.qcf-node-n {
  font-size: 10px; padding: 1px 7px; border-radius: 999px;
  background: var(--sd-qc-soft); color: var(--sd-qc-hi); font-weight: 800;
}
[data-theme="light"] .qcf-node-n { color: var(--sd-qc-hi); }

/* ═══ panel shell ═══ */
.qcf-panel {
  border: 1px solid var(--sd-border); border-radius: 18px; padding: 18px;
  background: var(--sd-surface);
  animation: qcf-in 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes qcf-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.qcf-panel.split { display: grid; grid-template-columns: 1.5fr 1fr; gap: 18px; }
@media (max-width: 980px) { .qcf-panel.split { grid-template-columns: 1fr; } }
/* the Intercept Gauntlet owns the full row; the Probe Chamber docks beneath it */
.qcf-panel.gstack { display: flex; flex-direction: column; gap: 16px; }
.qcf-ph { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.qcf-ph h3 { display: inline-flex; align-items: center; gap: 8px; margin: 0; font-size: 15.5px; font-weight: 800; color: var(--sd-text); }
.qcf-ph p { margin: 0; font-size: 12.5px; color: var(--sd-text-muted); flex: 1 1 260px; line-height: 1.5; }
.qcf-ph p b { color: var(--sd-text); }

/* ═══ buttons / inputs / misc atoms ═══ */
.qcf-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 8px 14px; border-radius: 11px; font-size: 12px; font-weight: 700; cursor: pointer;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface-elevated); color: var(--sd-text);
  transition: border-color 0.2s, transform 0.2s;
}
.qcf-btn:hover { border-color: var(--sd-qc-brd); }
.qcf-btn.primary { background: var(--sd-qc-grad); color: #241703; border-color: transparent; box-shadow: var(--sd-qc-glow); }
.qcf-btn.danger { border-color: rgba(251, 113, 133, 0.4); color: var(--sd-qc-halt); background: var(--sd-qc-halt-soft); }
.qcf-btn.ghost { background: transparent; }
.qcf-btn.sm { padding: 6px 11px; font-size: 11px; }
.qcf-btn.wide { width: 100%; justify-content: center; }
.qcf-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.qcf-ic {
  width: 28px; height: 28px; display: inline-grid; place-items: center; border-radius: 9px; cursor: pointer;
  border: 1px solid var(--sd-border); background: transparent; color: var(--sd-text-muted);
  transition: color 0.2s, border-color 0.2s, transform 0.2s;
}
.qcf-ic:hover { color: var(--sd-text); border-color: var(--sd-qc-brd); transform: translateY(-1px); }
.qcf-ic.danger:hover { color: var(--sd-qc-halt); border-color: rgba(251, 113, 133, 0.4); }
.qcf-ic.sm { width: 22px; height: 22px; border: none; }
.qcf-ic:disabled { opacity: 0.35; cursor: not-allowed; }
.qcf-inp {
  width: 100%; padding: 9px 12px; border-radius: 11px; font-size: 12.5px;
  background: var(--sd-input-bg, var(--sd-surface-elevated)); color: var(--sd-text);
  border: 1px solid var(--sd-border-strong); outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.qcf-inp:focus { border-color: var(--sd-qc-core); box-shadow: 0 0 0 3px var(--sd-qc-soft); }
.qcf-inp.time { width: 96px; } .qcf-inp.tz { width: 130px; } .qcf-inp.cap { width: 70px; display: inline-block; padding: 4px 8px; margin-left: 6px; }
.qcf-inp.wide { flex: 1; }
.qcf-none { color: var(--sd-text-faint, var(--sd-text-muted)); font-size: 12px; display: inline-flex; align-items: center; gap: 8px; }
.qcf-none.pad { padding: 18px 6px; }
.qcf-spin { animation: qcf-rot 0.9s linear infinite; }
@keyframes qcf-rot { to { transform: rotate(360deg); } }
.qcf-state {
  font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 2px 8px; border-radius: 999px; border: 1px solid var(--sd-border); color: var(--sd-text-muted);
}
.qcf-state.on { color: var(--sd-qc-go); border-color: rgba(52, 211, 153, 0.35); background: var(--sd-qc-go-soft); }
.qcf-chip {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 999px;
  border: 1px solid var(--sd-border); color: var(--sd-text-muted); background: transparent;
}
.qcf-chip.tier { color: var(--sc, var(--sd-qc-core)); border-color: color-mix(in srgb, var(--sc, var(--sd-qc-core)) 40%, transparent); }
.qcf-chip.halt { color: var(--sd-qc-halt); border-color: rgba(251, 113, 133, 0.4); background: var(--sd-qc-halt-soft); animation: qcf-throb 1.6s ease-in-out infinite; }
@keyframes qcf-throb { 50% { box-shadow: 0 0 12px rgba(251, 113, 133, 0.35); } }
.qcf-chip.spill { color: var(--sd-qc-spill); border-color: rgba(139, 147, 163, 0.4); }
.qcf-chip.sla { color: var(--sd-qc-warn); border-color: rgba(251, 191, 36, 0.35); }
.qcf-chip.filter { cursor: pointer; padding: 5px 12px; letter-spacing: 0.12em; }
.qcf-chip.filter.on { color: var(--sd-qc-hi); border-color: var(--sd-qc-brd); background: var(--sd-qc-soft); }

/* ═══ lanes — replaced by SdLaneBladeRack (THE BLADE RACK) ═══ */
@keyframes qcf-deal { from { opacity: 0; transform: translateY(14px) scale(0.985); } to { opacity: 1; transform: none; } }

/* ═══ rules chain ═══ */
.qcf-rules { display: flex; flex-direction: column; gap: 8px; }
.qcf-rules.chain { position: relative; padding-left: 14px; }
.qcf-rules.chain::before {
  content: ""; position: absolute; left: 4px; top: 12px; bottom: 12px; width: 2px;
  background: linear-gradient(180deg, transparent, var(--sd-qc-brd) 12%, var(--sd-qc-brd) 88%, transparent);
}
.qcf-rules.chain::after {
  content: ""; position: absolute; left: 1.5px; top: 12px; width: 7px; height: 7px; border-radius: 50%;
  background: var(--sd-qc-packet); box-shadow: 0 0 8px var(--sd-qc-packet);
  animation: qcf-chainflow 5s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}
@keyframes qcf-chainflow { 0% { top: 4%; opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } 100% { top: 92%; opacity: 0; } }
.qcf-rule {
  display: flex; align-items: center; gap: 10px;
  border: 1px solid var(--sd-border); border-radius: 13px;
  background: var(--sd-surface-elevated); padding: 9px 12px;
  animation: qcf-deal 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: calc(var(--i, 0) * 0.05s);
  transition: border-color 0.25s, box-shadow 0.25s;
}
.qcf-rule:hover { border-color: var(--sd-qc-brd); }
.qcf-rule.off { opacity: 0.55; }
.qcf-rule-order { display: flex; flex-direction: column; align-items: center; gap: 0; color: var(--sd-text-muted); font-size: 10px; }
.qcf-rule-lamp {
  width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0;
  background: var(--sd-border); transition: background 0.3s, box-shadow 0.3s;
}
.qcf-rule-lamp.on { background: var(--sd-qc-go); box-shadow: 0 0 9px var(--sd-qc-go); animation: qcf-lamp 2.6s ease-in-out infinite; }
@keyframes qcf-lamp { 50% { box-shadow: 0 0 3px var(--sd-qc-go); } }
.qcf-rule-body { flex: 1; min-width: 0; cursor: pointer; display: flex; flex-direction: column; gap: 2px; }
.qcf-rule-name { font-size: 13px; font-weight: 700; color: var(--sd-text); }
.qcf-rule-sum { font-size: 11px; color: var(--sd-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.qcf-rule-stop { font-size: 9px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-qc-halt); border: 1px solid rgba(251, 113, 133, 0.35); border-radius: 5px; padding: 2px 6px; }
.qcf-rule-runs { font-size: 10.5px; color: var(--sd-text-muted); }
.qcf-rule-move, .qcf-rule-enter-active, .qcf-rule-leave-active { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.qcf-rule-enter-from, .qcf-rule-leave-to { opacity: 0; transform: translateY(8px); }
.qcf-rule-leave-active { position: absolute; width: calc(100% - 14px); }

/* ═══ probe console ═══ */
.qcf-sim {
  border: 1px solid var(--sd-qc-brd); border-radius: 16px; padding: 14px;
  background: linear-gradient(180deg, var(--sd-qc-soft), transparent 40%), var(--sd-surface-elevated);
  display: flex; flex-direction: column; gap: 9px; align-self: start; position: sticky; top: 12px;
}
.qcf-sim-h { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 800; color: var(--sd-text); }
.qcf-sim-h .sd-mono { font-size: 9.5px; color: var(--sd-qc-hi); letter-spacing: 0.16em; }
.qcf-sim-sub { margin: 0; font-size: 11px; color: var(--sd-text-muted); line-height: 1.5; }
.qcf-sim-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.qcf-sim-out { border-top: 1px dashed var(--sd-border-strong); padding-top: 10px; display: flex; flex-direction: column; gap: 8px; }
.qcf-sim-chain { display: flex; flex-direction: column; gap: 4px; }
.qcf-sim-hit { display: flex; align-items: center; gap: 6px; font-size: 10.5px; color: var(--sd-qc-hi); }
.qcf-sim-hit em { color: var(--sd-qc-halt); font-style: normal; }
.qcf-sim-miss { margin: 0; font-size: 10.5px; color: var(--sd-text-muted); letter-spacing: 0.1em; }
.qcf-sim-path { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.qcf-hop {
  font-size: 10px; font-weight: 800; letter-spacing: 0.08em; padding: 4px 9px; border-radius: 8px;
  border: 1px solid var(--sd-border-strong); color: var(--sd-text-muted);
}
.qcf-hop.dest { color: var(--sd-qc-hi); border-color: var(--sd-qc-brd); background: var(--sd-qc-soft); box-shadow: var(--sd-qc-glow); }
.qcf-hop.strike { text-decoration: line-through; color: var(--sd-qc-halt); border-color: rgba(251, 113, 133, 0.35); }
.qcf-hop-arrow { color: var(--sd-qc-core); }
.qcf-hop-arrow.spill { color: var(--sd-qc-halt); }
.qcf-sim-decision { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.qcf-sim-decision .via { font-size: 9.5px; color: var(--sd-text-muted); border: 1px dashed var(--sd-border-strong); padding: 2px 7px; border-radius: 6px; }
.qcf-sim-decision .fb { font-size: 9.5px; color: var(--sd-qc-warn); border: 1px solid rgba(251, 191, 36, 0.35); padding: 2px 7px; border-radius: 6px; }
.qcf-sim-decision .fb.spill { color: var(--sd-qc-halt); border-color: rgba(251, 113, 133, 0.4); }

/* ═══ THE PROBE CHAMBER — full-width three-zone dry-run console ═══ */
.qpc {
  position: relative; overflow: hidden; isolation: isolate;
  display: grid; grid-template-columns: minmax(0, 1.5fr) 190px minmax(0, 1.1fr);
  gap: 0; border: 1px solid var(--sd-qc-brd); border-radius: 18px;
  background: linear-gradient(180deg, var(--sd-qc-soft), transparent 46%), var(--sd-surface-elevated);
}
.qpc-sweep {
  position: absolute; inset: 0; z-index: 0; pointer-events: none; border-radius: inherit;
  background: linear-gradient(105deg, transparent 42%, var(--sd-qc-soft) 50%, transparent 58%);
  background-size: 260% 100%;
  animation: qpc-sweep 7s ease-in-out infinite;
}
@keyframes qpc-sweep { 0%, 55% { background-position: 135% 0; } 95%, 100% { background-position: -135% 0; } }
.qpc-compose, .qpc-fire, .qpc-report { position: relative; z-index: 1; padding: 16px 18px; min-width: 0; }
.qpc-fire, .qpc-report { border-left: 1px dashed var(--sd-border-strong); }
.qpc-compose { display: flex; flex-direction: column; gap: 10px; }
.qpc-head {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: var(--sd-qc-core); margin-bottom: 2px;
}
.qpc-head b { font-weight: 800; color: var(--sd-text); }
.qpc-st { font-size: 9px; letter-spacing: 0.18em; color: var(--sd-qc-hi); margin-left: 2px; }
.qpc-lamp { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; background: var(--sd-qc-spill); transition: background 0.3s, box-shadow 0.3s; }
.qpc-lamp.busy { background: var(--sd-qc-warn); box-shadow: 0 0 10px var(--sd-qc-warn); animation: qpc-lamp 0.7s ease-in-out infinite; }
.qpc-lamp.done { background: var(--sd-qc-go); box-shadow: 0 0 9px var(--sd-qc-go); }
@keyframes qpc-lamp { 50% { box-shadow: 0 0 3px var(--sd-qc-warn); } }
.qpc-sub { margin: 0 0 2px; font-size: 11px; color: var(--sd-text-muted); line-height: 1.5; }
.qpc-f { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.qpc-f > span { font-size: 8.5px; font-weight: 800; letter-spacing: 0.18em; color: var(--sd-text-muted); }
.qpc-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
@media (max-width: 1280px) { .qpc-grid { grid-template-columns: 1fr 1fr; } }

/* fire control — the circular launch key */
.qpc-fire { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; }
.qpc-launch {
  position: relative; width: 92px; height: 92px; border-radius: 50%; border: none; cursor: pointer;
  background: transparent; display: grid; place-items: center; flex-shrink: 0;
  transition: transform 0.25s;
}
.qpc-launch:hover:not(:disabled) { transform: scale(1.05); }
.qpc-launch:active:not(:disabled) { transform: scale(0.95); }
.qpc-launch:disabled { cursor: wait; }
.qpc-launch-halo {
  position: absolute; inset: 0; border-radius: 50%;
  border: 1.5px solid color-mix(in srgb, var(--sd-qc-core) 40%, transparent);
  animation: qpc-halo 3.2s ease-out infinite;
}
@keyframes qpc-halo { from { transform: scale(1); opacity: 0.7; } to { transform: scale(1.45); opacity: 0; } }
.qpc-launch-ring {
  position: absolute; inset: 6px; border-radius: 50%;
  border: 2px dashed color-mix(in srgb, var(--sd-qc-core) 55%, transparent);
  animation: qpc-ring-spin 16s linear infinite;
}
.qpc-launch.charging .qpc-launch-ring { animation-duration: 1.1s; border-color: var(--sd-qc-warn); }
@keyframes qpc-ring-spin { to { transform: rotate(360deg); } }
.qpc-launch-core {
  position: relative; width: 62px; height: 62px; border-radius: 50%;
  display: grid; place-items: center; color: #241703;
  background: var(--sd-qc-grad); box-shadow: var(--sd-qc-glow);
  transition: box-shadow 0.3s;
}
.qpc-launch:hover:not(:disabled) .qpc-launch-core { box-shadow: 0 0 34px color-mix(in srgb, var(--sd-qc-core) 55%, transparent); }
.qpc-fire-lb { font-size: 9.5px; font-weight: 900; letter-spacing: 0.2em; color: var(--sd-qc-core); }
.qpc-seq { font-size: 9px; letter-spacing: 0.16em; color: var(--sd-qc-hi); }
.qpc-seq.dim { color: var(--sd-text-muted); opacity: 0.8; }

/* trajectory report */
.qpc-report { display: flex; flex-direction: column; gap: 10px; }
.qpc-out { display: flex; flex-direction: column; gap: 9px; }
.qpc-hits { display: flex; flex-direction: column; gap: 5px; }
.qpc-hit {
  display: flex; align-items: center; gap: 7px; flex-wrap: wrap;
  font-size: 10.5px; color: var(--sd-qc-hi);
  border: 1px solid color-mix(in srgb, var(--sd-qc-core) 26%, transparent);
  background: var(--sd-qc-soft); border-radius: 8px; padding: 6px 10px;
}
.qpc-hit em { font-style: normal; font-size: 8.5px; letter-spacing: 0.12em; color: var(--sd-qc-halt); margin-left: auto; }
.qpc-miss { margin: 0; font-size: 10px; letter-spacing: 0.1em; color: var(--sd-text-muted); }
.qpc-path { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.qpc-hop {
  font-size: 10px; font-weight: 800; letter-spacing: 0.08em; padding: 4px 10px; border-radius: 8px;
  border: 1px solid var(--sd-border-strong); color: var(--sd-text-muted);
}
.qpc-hop.dest { color: var(--sd-qc-hi); border-color: var(--sd-qc-brd); background: var(--sd-qc-soft); box-shadow: var(--sd-qc-glow); }
.qpc-hop.strike { text-decoration: line-through; color: var(--sd-qc-halt); border-color: color-mix(in srgb, var(--sd-qc-halt) 40%, transparent); }
.qpc-hop-arrow { color: var(--sd-qc-core); animation: qpc-arrow 1.4s ease-in-out infinite; }
.qpc-hop-arrow.spill { color: var(--sd-qc-halt); }
@keyframes qpc-arrow { 50% { transform: translateX(3px); opacity: 0.6; } }
.qpc-effects { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.qpc-effects .via { font-size: 9.5px; color: var(--sd-text-muted); border: 1px dashed var(--sd-border-strong); padding: 2px 8px; border-radius: 6px; }
.qpc-effects .fb { font-size: 9.5px; color: var(--sd-qc-warn); border: 1px solid color-mix(in srgb, var(--sd-qc-warn) 40%, transparent); padding: 2px 8px; border-radius: 6px; }
.qpc-effects .fb.spill { color: var(--sd-qc-halt); border-color: color-mix(in srgb, var(--sd-qc-halt) 45%, transparent); }
.qpc-idle { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 8px 0; }
.qpc-idle-orb {
  width: 14px; height: 14px; border-radius: 50%;
  background: radial-gradient(circle at 38% 34%, #fff7e3, #ffd98a 45%, #d98f1f 100%);
  box-shadow: 0 0 12px color-mix(in srgb, var(--sd-qc-core) 55%, transparent);
  animation: qpc-idle-bob 2.6s ease-in-out infinite;
}
@keyframes qpc-idle-bob { 50% { transform: translateY(3px); box-shadow: 0 0 6px color-mix(in srgb, var(--sd-qc-core) 35%, transparent); } }
.qpc-idle p { margin: 0; font-size: 10px; font-weight: 900; letter-spacing: 0.2em; color: var(--sd-qc-core); }
.qpc-idle > span { font-size: 11px; line-height: 1.55; color: var(--sd-text-muted); max-width: 320px; }

@media (max-width: 1100px) {
  .qpc { grid-template-columns: 1fr; }
  .qpc-fire, .qpc-report { border-left: none; border-top: 1px dashed var(--sd-border-strong); }
  .qpc-fire { flex-direction: row; justify-content: flex-start; gap: 16px; }
}

/* ═══ SLA cards — replaced by SdSlaCadenceField (THE CADENCE FIELD) ═══ */
.qm-protected {
  display: inline-flex; align-items: center; gap: 6px; align-self: center; cursor: help;
  font-size: 8.5px; font-weight: 900; letter-spacing: 0.14em; padding: 6px 10px; border-radius: 8px;
  color: var(--sd-qc-hi); background: var(--sd-qc-soft); border: 1px dashed var(--sd-qc-brd);
}

/* ═══ skills — the panel is now SdSkillGrid ("THE CERTIFICATION GRID"); only the
   modal-preview chip styles below (.pvw-skill*) remain in this file ═══ */

/* ═══ hours & holidays ═══ */
/* hours & holidays — replaced by SdOpsDaywheel (THE DAYWHEEL) */

/* ═══ ledger ═══ */
/* ledger — replaced by SdLedgerChamber (THE CLOUD CHAMBER) */

/* revisions */
/* revisions — the modal is now SdRuleHistoryModal ("THE REWIND DECK") */

/* ═══ wires — the panel is now SdUplinkArray ("THE UPLINK ARRAY") ═══ */

/* ═══ backfill — the modal is now SdBackfillModal ("THE RECOVERY SWEEP") ═══ */

/* ═══ modal internals ═══ */
.qm { display: flex; flex-direction: column; gap: 14px; }
.qm-anim { display: flex; flex-direction: column; gap: 14px; }
.qm-preview {
  position: relative; overflow: hidden;
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  border: 1px solid var(--sd-qc-brd); border-radius: 13px; padding: 12px 14px 12px 18px;
  background: linear-gradient(180deg, var(--sd-qc-soft), transparent 70%), var(--sd-surface);
}
.qm-preview-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--sc); }
.qm-preview b { font-size: 13.5px; color: var(--sd-text); }
.qm-preview b em { font-style: normal; color: var(--sd-qc-hi); }
.qm-preview-meta { font-size: 10px; color: var(--sd-text-muted); }
.qm-preview-stamp {
  margin-left: auto; font-size: 9px; font-weight: 800; letter-spacing: 0.2em;
  padding: 3px 9px; border-radius: 6px; border: 1px dashed var(--sd-border-strong); color: var(--sd-text-muted);
  transition: all 0.3s;
}
.qm-preview-stamp.ready { color: var(--sd-qc-go); border-color: rgba(52, 211, 153, 0.45); border-style: solid; }
.qm-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: end; }
.qm-grid2.tight { gap: 8px; }
.qm-grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; align-items: end; }
@media (max-width: 640px) { .qm-grid2, .qm-grid3 { grid-template-columns: 1fr; } }
.qm-f { display: flex; flex-direction: column; gap: 6px; }
.qm-f > span { font-size: 11px; font-weight: 700; color: var(--sd-text); }
.qm-f > span i { font-style: normal; font-weight: 500; color: var(--sd-text-muted); font-size: 10px; }
.qm-v2 {
  border: 1px dashed var(--sd-qc-brd); border-radius: 13px; padding: 12px;
  display: flex; flex-direction: column; gap: 10px;
  background: linear-gradient(180deg, var(--sd-qc-soft), transparent 55%);
}
.qm-v2-h { display: flex; align-items: center; gap: 6px; font-size: 9.5px; letter-spacing: 0.2em; color: var(--sd-qc-hi); font-weight: 800; }
.qm-seg { display: flex; gap: 6px; flex-wrap: wrap; }
.qm-seg-b {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 12px; border-radius: 10px; font-size: 11.5px; font-weight: 700; cursor: pointer;
  border: 1px solid var(--sd-border); background: transparent; color: var(--sd-text-muted);
  transition: all 0.2s;
}
.qm-seg-b.on { color: var(--sc, var(--sd-qc-hi)); border-color: color-mix(in srgb, var(--sc, var(--sd-qc-core)) 50%, transparent); background: color-mix(in srgb, var(--sc, var(--sd-qc-core)) 12%, transparent); }
.qm-check { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--sd-text); flex-wrap: wrap; }
.qm-check i { font-style: normal; color: var(--sd-text-muted); font-size: 10.5px; }
.qm-check input[type="checkbox"] { accent-color: var(--sd-qc-core); width: 15px; height: 15px; }
.qm-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.qm-chips.scroll { max-height: 160px; overflow-y: auto; }
.qm-chip {
  padding: 5px 11px; border-radius: 999px; font-size: 11px; font-weight: 600; cursor: pointer;
  border: 1px solid var(--sd-border); background: transparent; color: var(--sd-text-muted);
  display: inline-flex; align-items: center; gap: 5px; transition: all 0.2s;
}
.qm-chip.on { color: var(--sd-qc-hi); border-color: var(--sd-qc-brd); background: var(--sd-qc-soft); }
.qm-chip.skill.on { color: var(--sd-qc-go); border-color: rgba(52, 211, 153, 0.4); background: var(--sd-qc-go-soft); }
.qm-hint { margin: 0; font-size: 11px; color: var(--sd-text-muted); display: flex; align-items: baseline; gap: 6px; line-height: 1.5; flex-wrap: wrap; }
.qm-hint.big { font-size: 12.5px; }
.qm-hint.warn { color: var(--sd-qc-halt); }
.qm-hint b { color: var(--sd-text); }
/* condition/action rows read as ONE capsule — inner controls go borderless,
   thin dividers separate the cells (the stacked-border look was the old bug) */
.qm-cond {
  display: flex; gap: 0; align-items: stretch; padding: 3px; border-radius: 12px;
  border: 1px solid var(--sd-border); background: var(--sd-surface);
  transition: border-color 0.25s, box-shadow 0.25s;
}
.qm-cond:hover { border-color: var(--sd-qc-brd); }
.qm-cond:focus-within { border-color: var(--sd-qc-brd); box-shadow: 0 0 0 3px var(--sd-qc-soft); }
.qm-cond > * + * { margin-left: 6px; }
.qm-cond :deep(.sd-select-btn) { border-color: transparent; background: transparent; }
.qm-cond :deep(.sd-select-btn:hover) { background: color-mix(in srgb, var(--sd-qc-core) 7%, transparent); }
.qm-cond > .qcf-inp { border-color: transparent; background: transparent; }
.qm-cond > .qcf-inp:focus { border-color: transparent; box-shadow: none; background: color-mix(in srgb, var(--sd-qc-core) 7%, transparent); }
.qm-cond > .qm-cond-f, .qm-cond > .qm-cond-o { position: relative; }
.qm-cond > .qm-cond-o::before, .qm-cond > .qm-cond-v::before {
  content: ""; position: absolute; left: -3.5px; top: 20%; bottom: 20%; width: 1px;
  background: var(--sd-border);
}
.qm-cond > .qm-cond-v { position: relative; }
.qm-cond > .qcf-ic { align-self: center; border-color: transparent; }
.qm-cond-f { width: 168px; flex-shrink: 0; }
.qm-cond-f.wide { width: 196px; }
.qm-cond-o { width: 128px; flex-shrink: 0; }
.qm-cond-v { flex: 1; min-width: 0; }
/* sla matrix — replaced by .qm-clockrows capsules */

/* ═════ REDUCED MOTION ═════ */
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .qcf-lane-shell,
  html:not([data-cinematic="on"]) .qcf-rule,
  html:not([data-cinematic="on"]) .qcf-panel { animation: none; }
  html:not([data-cinematic="on"]) .pvw-blade,
  html:not([data-cinematic="on"]) .pvw-lamp2.on,
  html:not([data-cinematic="on"]) .pvw-master,
  html:not([data-cinematic="on"]) .pvw-leds.scan .pvw-led,
  html:not([data-cinematic="on"]) .pvw-bl,
  html:not([data-cinematic="on"]) .pvw-bl.on .pvw-bl-rail .wire { animation: none; }
  html:not([data-cinematic="on"]) .pvw-lamp2.doom,
  html:not([data-cinematic="on"]) .pvw-blade.doom .pvw-pipe,
  html:not([data-cinematic="on"]) .pvw-flatline,
  html:not([data-cinematic="on"]) .pvw-bl.doom.danger .pvw-bl-rail .node,
  html:not([data-cinematic="on"]) .qcf-btn.danger.arm { animation: none; }
  html:not([data-cinematic="on"]) .pvw-gate2,
  html:not([data-cinematic="on"]) .pvw-g2-scan,
  html:not([data-cinematic="on"]) .pvw-g2-arm.live { animation: none; }
  html:not([data-cinematic="on"]) .pvw-cad,
  html:not([data-cinematic="on"]) .pvw-cad-beam,
  html:not([data-cinematic="on"]) .pvw-cad-trace,
  html:not([data-cinematic="on"]) .pvw-cad-trace .head { animation: none; }
  html:not([data-cinematic="on"]) .pvw-leds.drain .pvw-led.on { animation: none; background: color-mix(in srgb, var(--sd-text-dim) 16%, transparent); box-shadow: none; }
  html:not([data-cinematic="on"]) .qcf-rules.chain::after,
  html:not([data-cinematic="on"]) .qcf-chip.halt,
  html:not([data-cinematic="on"]) .qcf-rule-lamp.on,
  html:not([data-cinematic="on"]) .qcf-ring .fg.hot { animation: none; }
  html:not([data-cinematic="on"]) .qcf-lane:hover { transform: none; }
  html:not([data-cinematic="on"]) .qpc-sweep,
  html:not([data-cinematic="on"]) .qpc-lamp.busy,
  html:not([data-cinematic="on"]) .qpc-launch-halo,
  html:not([data-cinematic="on"]) .qpc-launch-ring,
  html:not([data-cinematic="on"]) .qpc-hop-arrow,
  html:not([data-cinematic="on"]) .qpc-idle-orb { animation: none; }
}

/* ═════ LIGHT THEME OVERRIDES ═════ */
[data-theme="light"] .qcf-btn.primary { color: #241703; }
[data-theme="light"] .qcf-node.on { background: linear-gradient(180deg, var(--sd-qc-soft), transparent); }
[data-theme="light"] .qcf-lane-glare {
  background: radial-gradient(340px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), rgba(168, 121, 27, 0.1), transparent 60%);
}

/* ═════════ CFG MODALS v2 — previews + animated primitives ═════════ */
/* ═══ BLADE PROOF — the lane modal's live preview as a miniature rack blade ═══ */
.pvw-blade {
  position: relative; overflow: hidden; display: grid; grid-template-columns: 20px minmax(0, 1fr);
  gap: 10px; padding: 12px 12px 12px 8px; border-radius: 13px;
  border: 1px solid var(--sd-border); background: var(--sd-surface-elevated);
  animation: pvw-blade-in 0.55s cubic-bezier(0.22, 1.2, 0.36, 1) both;
}
@keyframes pvw-blade-in { from { opacity: 0; transform: translateX(-16px); } 70% { transform: translateX(2px); } to { opacity: 1; transform: translateX(0); } }
.pvw-vents {
  position: absolute; right: 0; top: 0; bottom: 0; width: 54px; pointer-events: none; opacity: 0.45;
  background: repeating-linear-gradient(90deg, color-mix(in srgb, var(--sd-text-dim) 14%, transparent) 0 2px, transparent 2px 7px);
  mask-image: linear-gradient(90deg, transparent, #000 70%);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 70%);
}
.pvw-power { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.pvw-lamp2 { width: 8px; height: 8px; border-radius: 50%; background: var(--sd-text-dim); opacity: 0.5; transition: all 0.3s; }
.pvw-lamp2.on { opacity: 1; background: var(--sd-qc-go); box-shadow: 0 0 8px var(--sd-qc-go); animation: pvw-lamp2-breathe 2.4s ease-in-out infinite; }
@keyframes pvw-lamp2-breathe { 50% { box-shadow: 0 0 14px var(--sd-qc-go); } }
.pvw-pipe {
  flex: 1; width: 4px; border-radius: 3px; min-height: 20px;
  background: linear-gradient(180deg, var(--lc, var(--sd-qc-core)), color-mix(in srgb, var(--lc, var(--sd-qc-core)) 35%, transparent));
  box-shadow: 0 0 8px color-mix(in srgb, var(--lc, var(--sd-qc-core)) 45%, transparent);
  transition: background 0.35s, box-shadow 0.35s;
}
.pvw-bmain { display: flex; flex-direction: column; gap: 6px; min-width: 0; position: relative; z-index: 1; }
.pvw-bh { display: flex; align-items: center; gap: 7px; min-width: 0; }
.pvw-bh b { font-size: 13px; font-weight: 800; color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pvw-master {
  display: inline-flex; align-items: center; gap: 3px; flex-shrink: 0;
  font-size: 7px; font-weight: 900; letter-spacing: 0.14em; padding: 2px 6px; border-radius: 999px;
  color: #241703; background: var(--sd-qc-grad);
  animation: pvw-master-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes pvw-master-in { from { transform: scale(0); } }
.pvw-bsub { display: inline-flex; align-items: center; gap: 5px; font-size: 8px; letter-spacing: 0.1em; color: var(--sd-text-muted); }
.pvw-tier {
  font-style: normal; font-size: 7px; font-weight: 900; letter-spacing: 0.14em;
  padding: 1.5px 6px; border-radius: 5px; color: var(--sd-qc-core);
  border: 1px solid var(--sd-qc-brd); background: var(--sd-qc-soft);
}
.pvw-leds { display: flex; gap: 3px; margin-top: 2px; }
.pvw-led {
  width: 9px; height: 12px; border-radius: 2.5px;
  background: color-mix(in srgb, var(--sd-text-dim) 16%, transparent);
  transition: background 0.3s, box-shadow 0.3s;
}
.pvw-led.on {
  background: var(--lc, var(--sd-qc-core));
  box-shadow: 0 0 6px color-mix(in srgb, var(--lc, var(--sd-qc-core)) 55%, transparent);
}
/* idle scanner — the blade waits for its first traffic, one bright cell sweeping */
.pvw-leds.scan .pvw-led { animation: pvw-scan 2.2s ease-in-out infinite; animation-delay: calc(var(--si, 1) * 0.09s); }
@keyframes pvw-scan {
  0%, 24%, 100% { background: color-mix(in srgb, var(--sd-text-dim) 16%, transparent); box-shadow: none; }
  8% { background: var(--lc, var(--sd-qc-core)); box-shadow: 0 0 8px color-mix(in srgb, var(--lc, var(--sd-qc-core)) 65%, transparent); }
}
.pvw-led-lb { font-size: 7px; letter-spacing: 0.14em; color: var(--sd-text-dim); }
.pvw-chips2 { display: flex; flex-direction: column; gap: 4px; }
.pvw-chips2 span { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; color: var(--sd-text-muted); min-width: 0; }
.pvw-chips2 svg { color: var(--sd-qc-core); flex-shrink: 0; }
.pvw-chips2 span.spill { color: var(--sd-qc-hi); }

/* ═══ CADENCE PROOF — the SLA modal's live preview as a mini time-axis field ═══ */
.pvw-cad {
  position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 6px;
  padding: 11px 12px; border-radius: 13px;
  border: 1px solid var(--sd-border); background: var(--sd-surface-elevated);
  animation: pvw-blade-in 0.55s cubic-bezier(0.22, 1.2, 0.36, 1) both;
}
.pvw-cad-h { display: flex; align-items: center; gap: 8px; min-width: 0; }
.pvw-cad-h b { font-size: 12.5px; font-weight: 800; color: var(--sd-text); min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
.pvw-cad-dial {
  position: relative; width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0; cursor: help;
  display: grid; place-items: center; color: var(--sd-qc-core);
  background:
    radial-gradient(var(--sd-surface-elevated) 55%, transparent 56%),
    conic-gradient(var(--sd-qc-core) calc(var(--cov, 0) * 1%), color-mix(in srgb, var(--sd-qc-core) 14%, transparent) 0);
  transition: background 0.4s;
}
.pvw-cad-field {
  position: relative; height: 96px; border-radius: 9px; overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--sd-qc-core) 18%, transparent);
  background: linear-gradient(180deg, var(--sd-qc-soft), transparent 70%);
}
.pvw-cad-tick { position: absolute; top: 0; bottom: 0; width: 1px; background: color-mix(in srgb, var(--sd-qc-core) 16%, transparent); }
.pvw-cad-tick i { position: absolute; top: 1px; left: 3px; font-style: normal; font-size: 6px; letter-spacing: 0.1em; color: var(--sd-text-dim); }
.pvw-cad-beam {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--sd-qc-core) 5%, transparent) 40%, color-mix(in srgb, var(--sd-qc-core) 16%, transparent) 50%, color-mix(in srgb, var(--sd-qc-core) 5%, transparent) 60%, transparent);
  background-size: 90px 100%; background-repeat: no-repeat;
  animation: pvw-cad-sweep 7s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
}
@keyframes pvw-cad-sweep { 0% { background-position: -90px 0; } 60%, 100% { background-position: calc(100% + 90px) 0; } }
.pvw-cad-trace {
  position: absolute; height: 6px; margin-top: -3px; border-radius: 999px; min-width: 6px;
  transform-origin: left center;
  animation: cf-modal-trace 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: var(--d, 0s);
}
@keyframes cf-modal-trace { from { opacity: 0; transform: scaleX(0); } to { opacity: 1; transform: scaleX(1); } }
.pvw-cad-trace .band {
  position: absolute; inset: 1px 0; border-radius: 999px;
  background: linear-gradient(90deg, var(--tc), color-mix(in srgb, var(--tc) 40%, transparent) 55%, color-mix(in srgb, var(--tc) 12%, transparent));
  box-shadow: 0 0 8px color-mix(in srgb, var(--tc) 32%, transparent);
}
.pvw-cad-trace .head {
  position: absolute; left: -3px; top: 50%; width: 7px; height: 7px; margin-top: -3.5px; border-radius: 50%;
  background: var(--tc); box-shadow: 0 0 7px var(--tc);
  animation: cf-modal-head 3s ease-in-out infinite; animation-delay: var(--d, 0s);
}
@keyframes cf-modal-head { 50% { box-shadow: 0 0 12px var(--tc); } }
.pvw-cad-trace .node {
  position: absolute; right: -4px; top: 50%; width: 9px; height: 9px; margin-top: -4.5px; border-radius: 50%;
  border: 2px solid var(--tc); background: var(--sd-surface-elevated);
}
.pvw-cad-trace .node.hollow { border-style: dashed; }
.pvw-cad-trace.bad .band { background: repeating-linear-gradient(90deg, color-mix(in srgb, var(--sd-qc-halt) 70%, transparent) 0 4px, transparent 4px 8px); box-shadow: none; }
.pvw-cad-trace.bad .head, .pvw-cad-trace.bad .node { background: var(--sd-qc-halt); border-color: var(--sd-qc-halt); box-shadow: none; animation: none; }
.pvw-cad-void {
  position: absolute; left: 6px; margin-top: -4px;
  font-size: 6px; letter-spacing: 0.16em; color: color-mix(in srgb, var(--tc) 42%, transparent);
}

/* ═══ clock rows — one capsule per priority, spinners gone, live human echo ═══ */
.qm-clockrows { display: flex; flex-direction: column; gap: 8px; }
.qm-clockrow {
  display: grid; grid-template-columns: 82px minmax(0, 1fr) 1px minmax(0, 1fr); align-items: center; gap: 12px;
  padding: 7px 12px 7px 0; border-radius: 12px;
  border: 1px solid var(--sd-border); background: var(--sd-surface);
  transition: border-color 0.25s, box-shadow 0.25s;
}
.qm-clockrow:hover { border-color: var(--sd-qc-brd); }
.qm-clockrow:focus-within { border-color: var(--sd-qc-brd); box-shadow: 0 0 0 3px var(--sd-qc-soft); }
.qm-clockrow.bad { border-color: color-mix(in srgb, var(--sd-danger) 45%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--sd-danger) 10%, transparent); }
.qm-cr-tag {
  font-size: 9px; font-weight: 900; letter-spacing: 0.1em; color: var(--pc, var(--sd-qc-core));
  padding: 4px 0 4px 11px; border-left: 3px solid var(--pc, var(--sd-qc-core)); border-radius: 2px;
}
.qm-cr-cell { display: flex; align-items: center; gap: 8px; min-width: 0; cursor: text; }
.qm-cr-cell > span { font-size: 6.5px; font-weight: 900; letter-spacing: 0.16em; color: var(--sd-text-dim); flex-shrink: 0; }
.qm-cr-inp {
  width: 72px; padding: 6px 9px; border-radius: 8px;
  border: 1px solid var(--sd-border);
  background: color-mix(in srgb, var(--sd-text-dim) 8%, transparent);
  font-size: 13.5px; font-weight: 700; color: var(--sd-text); font-variant-numeric: tabular-nums;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
}
.qm-cr-inp:hover { border-color: var(--sd-qc-brd); }
.qm-cr-inp:focus { outline: none; border-color: var(--sd-qc-brd); background: color-mix(in srgb, var(--sd-qc-core) 8%, transparent); box-shadow: 0 0 0 3px var(--sd-qc-soft); }
.qm-cr-inp::placeholder { color: var(--sd-text-muted); }
[data-theme="light"] .qm-cr-inp { background: rgba(60, 45, 20, 0.05); }
.qm-cr-cell em { font-style: normal; font-size: 8.5px; letter-spacing: 0.08em; color: var(--sd-qc-hi); white-space: nowrap; }
.qm-cr-div { width: 1px; height: 60%; background: var(--sd-border); }

/* spinner arrows are noise on an instrument — gone everywhere in the config surface */
input[type="number"].qcf-inp::-webkit-outer-spin-button,
input[type="number"].qcf-inp::-webkit-inner-spin-button,
.qm-cr-inp::-webkit-outer-spin-button,
.qm-cr-inp::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
input[type="number"].qcf-inp, .qm-cr-inp { -moz-appearance: textfield; appearance: textfield; }

/* ═══ GATE PROOF — the rule modal's live preview as an interceptor gate ═══ */
.pvw-gate2 {
  position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 8px;
  padding: 11px 12px; border-radius: 13px;
  border: 1px solid var(--sd-border); background: var(--sd-surface-elevated);
  animation: pvw-blade-in 0.55s cubic-bezier(0.22, 1.2, 0.36, 1) both;
  transition: opacity 0.3s;
}
.pvw-gate2.off { opacity: 0.6; }
.pvw-g2-scan {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--sd-qc-core) 7%, transparent) 50%, transparent);
  background-size: 100% 90px; background-repeat: no-repeat;
  animation: pvw-g2-scan 5.5s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
}
@keyframes pvw-g2-scan { 0% { background-position: 0 -90px; } 60%, 100% { background-position: 0 calc(100% + 90px); } }
.pvw-g2-h { display: flex; align-items: center; gap: 8px; min-width: 0; }
.pvw-g2-slot {
  flex-shrink: 0; font-size: 8px; font-weight: 900; letter-spacing: 0.12em; cursor: help;
  padding: 3px 7px; border-radius: 6px; color: var(--sd-qc-core);
  border: 1px solid var(--sd-qc-brd); background: var(--sd-qc-soft);
}
.pvw-g2-name { font-size: 12.5px; font-weight: 800; color: var(--sd-text); min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
.pvw-join { font-size: 6.5px; font-weight: 900; letter-spacing: 0.14em; color: var(--sd-qc-hi); align-self: center; }
.pvw-g2-deflect { display: flex; align-items: center; gap: 0; min-width: 0; }
.pvw-g2-arm {
  width: 26px; height: 2px; border-radius: 2px; flex-shrink: 0;
  background: repeating-linear-gradient(90deg, color-mix(in srgb, var(--sd-qc-core) 55%, transparent) 0 4px, transparent 4px 8px);
}
.pvw-g2-arm.live { animation: pvw-arm-flow 1.1s linear infinite; }
@keyframes pvw-arm-flow { to { background-position: 8px 0; } }
.pvw-g2-port {
  display: inline-flex; align-items: center; gap: 5px; min-width: 0; margin-left: 6px;
  font-size: 8px; font-weight: 900; letter-spacing: 0.1em; padding: 4px 9px; border-radius: 999px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.pvw-g2-port.lane { color: var(--sd-text); border: 1px solid color-mix(in srgb, var(--pc, var(--sd-qc-core)) 55%, transparent); background: color-mix(in srgb, var(--pc, var(--sd-qc-core)) 12%, transparent); }
.pvw-g2-port.team { color: var(--sd-qc-hi); border: 1px solid color-mix(in srgb, var(--sd-qc-hi) 40%, transparent); background: var(--sd-qc-hi-soft); }
.pvw-g2-port.effect { color: var(--sd-qc-core); border: 1px solid var(--sd-qc-brd); background: var(--sd-qc-soft); }
.pvw-g2-port.none { color: var(--sd-text-dim); border: 1px dashed var(--sd-border-strong); background: transparent; }
.pvw-g2-portdot { width: 7px; height: 7px; border-radius: 50%; background: var(--pc, var(--sd-qc-core)); box-shadow: 0 0 7px var(--pc, var(--sd-qc-core)); flex-shrink: 0; }

/* ═══ DECOMMISSION BAY — the blade flatlines, the manifest reads the blast radius ═══ */
.pvw-blade.doom { border-color: color-mix(in srgb, var(--sd-qc-halt) 40%, transparent); }
.pvw-blade.doom .pvw-pipe { animation: pvw-pipe-fade 2.4s ease-in-out infinite; }
@keyframes pvw-pipe-fade { 50% { opacity: 0.35; box-shadow: none; } }
.pvw-lamp2.doom {
  opacity: 1; background: var(--sd-qc-halt); box-shadow: 0 0 9px var(--sd-qc-halt);
  animation: pvw-lamp-dying 1.1s steps(2, start) infinite;
}
@keyframes pvw-lamp-dying { to { opacity: 0.25; box-shadow: none; } }
.pvw-flatline {
  display: inline-flex; flex-shrink: 0; font-size: 7px; font-weight: 900; letter-spacing: 0.16em;
  padding: 2px 6px; border-radius: 5px; transform: rotate(-1.5deg);
  color: var(--sd-qc-halt); background: var(--sd-qc-halt-soft);
  border: 1px solid color-mix(in srgb, var(--sd-qc-halt) 45%, transparent);
  animation: pvw-master-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
/* LEDs drain out one by one, right to left, and stay dark */
.pvw-leds.drain .pvw-led.on {
  background: var(--lc, var(--sd-qc-halt));
  box-shadow: 0 0 6px color-mix(in srgb, var(--lc, var(--sd-qc-halt)) 50%, transparent);
  animation: pvw-led-drain 0.5s ease forwards;
  animation-delay: calc((13 - var(--si, 1)) * 0.16s + 0.6s);
}
@keyframes pvw-led-drain {
  to { background: color-mix(in srgb, var(--sd-text-dim) 16%, transparent); box-shadow: none; }
}
.pvw-brief.doom { border-color: color-mix(in srgb, var(--sd-qc-halt) 35%, transparent);
  background: linear-gradient(180deg, var(--sd-qc-halt-soft), transparent 70%); }
.pvw-brief-h.doomh { color: var(--sd-qc-halt); }
.pvw-bl.doom .pvw-bl-rail .wire { background: repeating-linear-gradient(180deg, color-mix(in srgb, var(--sd-qc-halt) 35%, transparent) 0 3px, transparent 3px 6px); }
.pvw-bl.doom.on .pvw-bl-rail .node { background: var(--sd-qc-spill); box-shadow: 0 0 7px color-mix(in srgb, var(--sd-qc-spill) 55%, transparent); }
.pvw-bl.doom.on .pvw-bl-body b { color: var(--sd-text-secondary); }
.pvw-bl.doom.warn .pvw-bl-rail .node { background: var(--sd-qc-warn); box-shadow: 0 0 8px color-mix(in srgb, var(--sd-qc-warn) 60%, transparent); }
.pvw-bl.doom.warn .pvw-bl-body b { color: var(--sd-qc-warn); }
.pvw-bl.doom.danger .pvw-bl-rail .node { background: var(--sd-qc-halt); box-shadow: 0 0 9px color-mix(in srgb, var(--sd-qc-halt) 65%, transparent); animation: pvw-lamp-dying 1.4s steps(2, start) infinite; }
.pvw-bl.doom.danger .pvw-bl-body b { color: var(--sd-qc-halt); }
.pvw-bl.doom.danger .pvw-bl-body span { color: color-mix(in srgb, var(--sd-qc-halt) 70%, var(--sd-text-muted)); }
.qcf-btn.danger.arm { animation: qcf-arm-throb 1.3s ease-in-out infinite; }
@keyframes qcf-arm-throb { 50% { box-shadow: 0 0 18px color-mix(in srgb, var(--sd-qc-halt) 55%, transparent); } }

/* ═══ ROUTING BRIEF — live step-nodes that ignite as the form is configured ═══ */
.pvw-brief {
  display: flex; flex-direction: column; gap: 0; margin-top: 10px; padding: 10px 11px 6px;
  border-radius: 12px; border: 1px dashed var(--sd-border-strong);
  background: linear-gradient(180deg, var(--sd-qc-soft), transparent 70%);
}
.pvw-brief-h {
  display: inline-flex; align-items: center; gap: 5px; margin-bottom: 8px;
  font-size: 8px; font-weight: 900; letter-spacing: 0.2em; color: var(--sd-qc-core);
}
.pvw-brief-h i { font-style: normal; font-weight: 700; letter-spacing: 0.06em; font-size: 7.5px; color: var(--sd-text-dim); }
.pvw-bl {
  display: grid; grid-template-columns: 14px minmax(0, 1fr); gap: 8px;
  animation: pvw-bl-in 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(0.15s + var(--i, 0) * 0.08s);
}
@keyframes pvw-bl-in { from { opacity: 0; transform: translateX(-10px); } }
.pvw-bl-rail { position: relative; display: flex; flex-direction: column; align-items: center; }
.pvw-bl-rail .node {
  width: 8px; height: 8px; border-radius: 50%; margin-top: 3px; flex-shrink: 0;
  border: 1.5px dashed color-mix(in srgb, var(--sd-text-dim) 55%, transparent);
  background: transparent; transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.pvw-bl.on .pvw-bl-rail .node {
  border: none; background: var(--sd-qc-core);
  box-shadow: 0 0 8px color-mix(in srgb, var(--sd-qc-core) 60%, transparent);
  transform: scale(1.15);
}
.pvw-bl.warn .pvw-bl-rail .node { background: var(--sd-qc-warn); box-shadow: 0 0 8px color-mix(in srgb, var(--sd-qc-warn) 60%, transparent); border: none; transform: scale(1.15); }
.pvw-bl-rail .wire {
  flex: 1; width: 1.5px; min-height: 10px; margin: 2px 0;
  background: repeating-linear-gradient(180deg, color-mix(in srgb, var(--sd-qc-core) 40%, transparent) 0 3px, transparent 3px 6px);
  opacity: 0.5;
}
.pvw-bl.on .pvw-bl-rail .wire { animation: pvw-wire-flow 1.2s linear infinite; opacity: 0.9; }
@keyframes pvw-wire-flow { to { background-position: 0 6px; } }
.pvw-bl-body { display: flex; flex-direction: column; gap: 1px; padding-bottom: 9px; min-width: 0; }
.pvw-bl-body b {
  font-size: 7.5px; font-weight: 900; letter-spacing: 0.18em;
  color: var(--sd-text-dim); transition: color 0.3s;
}
.pvw-bl.on .pvw-bl-body b { color: var(--sd-qc-core); }
.pvw-bl.warn .pvw-bl-body b { color: var(--sd-qc-warn); }
.pvw-bl-body span { font-size: 9.5px; line-height: 1.45; color: var(--sd-text-muted); }
.pvw-bl.warn .pvw-bl-body span { color: color-mix(in srgb, var(--sd-qc-warn) 75%, var(--sd-text-muted)); }

.pvw-lane, .pvw-rule, .pvw-sla, .pvw-skill { position: relative; display: flex; flex-direction: column; gap: 9px;
  padding: 13px 13px 13px 17px; border-radius: 14px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); overflow: hidden; }
.pvw-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--sc, var(--sd-qc-core));
  box-shadow: 0 0 12px color-mix(in srgb, var(--sc, var(--sd-qc-core)) 55%, transparent); transition: background 0.3s; }
.pvw-h { display: flex; align-items: center; gap: 7px; }
.pvw-h b { font-size: 13.5px; font-weight: 800; color: var(--sd-text); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pvw-h em { font-style: normal; color: var(--sd-amber); }
.pvw-lamp { width: 8px; height: 8px; border-radius: 50%; background: var(--sd-text-dim); margin-left: auto; flex-shrink: 0; transition: background 0.3s; }
.pvw-lamp.on { background: var(--sd-success); box-shadow: 0 0 8px color-mix(in srgb, var(--sd-success) 65%, transparent); animation: pvw-blink 2.4s ease-in-out infinite; }
@keyframes pvw-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.pvw-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.pvw-rows { display: flex; flex-direction: column; gap: 5px; }
.pvw-rows span { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; color: var(--sd-text-muted); }
.pvw-rows svg { color: var(--sd-amber); flex-shrink: 0; }
.pvw-drain { display: flex; align-items: center; gap: 8px; }
.pvw-drain .lb { font-size: 8.5px; font-weight: 800; letter-spacing: 0.12em; color: var(--sd-text-dim); }
.pvw-drain .bar { position: relative; flex: 1; height: 5px; border-radius: 999px; background: var(--sd-surface); overflow: hidden; display: block; }
.pvw-drain .fill { position: absolute; inset: 0 auto 0 0; border-radius: inherit; background: var(--sd-grad-hero); transition: width 0.45s var(--sd-spring); display: block; }
.pvw-note { display: flex; align-items: flex-start; gap: 6px; margin: 9px 0 0; font-size: 10.5px; line-height: 1.45; color: var(--sd-text-muted); }
.pvw-note svg { flex-shrink: 0; margin-top: 1px; }
.pvw-note.warn { color: var(--sd-qc-warn, #f59e0b); }
.pvw-note.danger { color: var(--sd-danger); }

/* rule preview — the signal path */
.pvw-flow { display: flex; align-items: center; gap: 7px; }
.pvw-node { font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em; padding: 3px 8px; border-radius: 6px;
  color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border-strong); }
.pvw-wire { flex: 1; height: 2px; border-radius: 2px; background: linear-gradient(90deg, var(--sd-amber), transparent);
  background-size: 200% 100%; animation: sd-rail-flow 2.4s linear infinite; }
.pvw-wire.timed { flex: initial; height: auto; display: inline-flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 800;
  color: var(--sd-qc-warn, #f59e0b); background: none; padding: 0 2px; animation: none; }
.pvw-gate { font-size: 8.5px; font-weight: 800; letter-spacing: 0.14em; padding: 3px 8px; border-radius: 999px;
  color: var(--sd-amber); background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); }
.pvw-gate.any { color: var(--sd-qc-warn, #f59e0b); }
.pvw-conds { display: flex; flex-wrap: wrap; gap: 4px; }
.pvw-cond { font-size: 9px; font-weight: 700; padding: 3px 8px; border-radius: 7px; color: var(--sd-text-secondary);
  background: var(--sd-surface); border: 1px solid var(--sd-border); animation: pvw-chip-in 0.35s var(--sd-spring) both; }
.pvw-cond.act { color: var(--sd-amber); border-color: var(--sd-amber-border); background: var(--sd-amber-soft); }
.pvw-cond.bad { color: var(--sd-danger); border-style: dashed; border-color: color-mix(in srgb, var(--sd-danger) 50%, transparent); }
.pvw-cond.dim { color: var(--sd-text-dim); border-style: dashed; }
@keyframes pvw-chip-in { from { opacity: 0; transform: translateY(6px) scale(0.94); } to { opacity: 1; transform: none; } }
.pvw-zap { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; color: #1a1206;
  background: var(--sd-grad-hero); margin: -2px 0; align-self: center; }
[data-theme="light"] .pvw-zap { color: #fff8ec; }
.pvw-stop { align-self: flex-start; font-size: 8.5px; font-weight: 800; letter-spacing: 0.12em; color: var(--sd-danger);
  padding: 3px 8px; border-radius: 6px; border: 1px solid color-mix(in srgb, var(--sd-danger) 40%, transparent); }

/* SLA preview — dual clock bars per priority */
.pvw-clocks { display: flex; flex-direction: column; gap: 7px; }
.pvw-clock { display: grid; grid-template-columns: 52px 1fr; gap: 3px 8px; align-items: center; }
.pvw-clock.bad .pvw-clock-v { color: var(--sd-danger); }
.pvw-clock-pr { font-size: 8.5px; font-weight: 800; letter-spacing: 0.08em; }
.pvw-clock-bars { display: flex; flex-direction: column; gap: 2px; }
.pvw-clock-bars i { display: block; height: 4px; border-radius: 999px; transition: width 0.5s var(--sd-spring); }
.pvw-clock-bars .resp { background: var(--sd-amber); }
.pvw-clock-bars .reso { background: color-mix(in srgb, var(--sd-ember) 75%, transparent); }
.pvw-clock-v { grid-column: 2; font-size: 8.5px; color: var(--sd-text-dim); }

/* skill preview */
/* ═══ skill modal — THE BADGE + signal checks + mechanics deck (left rail) ═══ */
.svp-badge { position: relative; display: flex; flex-direction: column; gap: 9px; overflow: hidden;
  padding: 12px 12px 12px 16px; border-radius: 14px;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.svp-badge.paused { opacity: 0.85; }
.svp-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
  background: var(--sc, var(--sd-qc-core));
  box-shadow: 0 0 12px color-mix(in srgb, var(--sc, var(--sd-qc-core)) 55%, transparent); transition: background 0.3s; }
.svp-h { display: flex; align-items: center; gap: 7px; min-width: 0; }
.svp-diode { width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0;
  border: 1.5px solid color-mix(in srgb, var(--sd-text) 25%, transparent);
  background: transparent; transition: background 0.3s, border-color 0.3s, box-shadow 0.3s; }
.svp-diode.lit { background: var(--sc, var(--sd-qc-core)); border-color: var(--sc, var(--sd-qc-core));
  box-shadow: 0 0 8px color-mix(in srgb, var(--sc, var(--sd-qc-core)) 65%, transparent); }
.svp-h b { font-size: 13px; color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.svp-h b.ghost { color: var(--sd-text-dim); font-style: italic; font-weight: 600; }
.svp-h em { font-style: normal; font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em; padding: 2px 6px;
  border-radius: 5px; color: var(--sc, var(--sd-qc-core));
  border: 1px solid color-mix(in srgb, var(--sc, var(--sd-qc-core)) 45%, transparent); }
.svp-ring-row { display: flex; align-items: center; gap: 10px; }
.svp-ring { position: relative; width: 46px; height: 46px; display: grid; place-items: center; flex-shrink: 0; }
.svp-ring svg { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
.svp-ring .bg { fill: none; stroke: color-mix(in srgb, var(--sd-text) 12%, transparent); stroke-width: 3; }
.svp-ring .fg { fill: none; stroke: var(--sc, var(--sd-qc-core)); stroke-width: 3; stroke-linecap: round;
  stroke-dasharray: 97.4; transition: stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--sc, var(--sd-qc-core)) 55%, transparent)); }
.svp-ring > b { font-size: 13px; color: var(--sd-text); }
.svp-ring-b { display: flex; flex-direction: column; gap: 1px; }
.svp-ring-b b { font-size: 14px; color: var(--sc, var(--sd-qc-core)); }
.svp-ring-b span { font-size: 6.5px; letter-spacing: 0.16em; color: var(--sd-text-dim); line-height: 1.5; }
.svp-avas { display: flex; align-items: center; gap: 4px; min-height: 22px; }
.svp-ava { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px;
  font-size: 7.5px; font-weight: 800; color: var(--sc, var(--sd-qc-core));
  background: color-mix(in srgb, var(--sc, var(--sd-qc-core)) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--sc, var(--sd-qc-core)) 35%, transparent);
  animation: svp-pop 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes svp-pop { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: none; } }
.svp-ava.more { color: var(--sd-text-muted); background: transparent; border-color: var(--sd-border-strong); }
.svp-none { font-size: 7px; letter-spacing: 0.14em; color: var(--sd-text-dim); }
.svp-demand { display: inline-flex; align-items: center; gap: 5px; font-size: 7.5px;
  letter-spacing: 0.12em; color: var(--sd-text-muted); }
.svp-paused { position: absolute; top: 10px; right: -26px; transform: rotate(35deg); padding: 3px 30px;
  font-size: 8px; font-weight: 800; letter-spacing: 0.2em; color: var(--sd-qc-warn);
  border-top: 1px dashed color-mix(in srgb, var(--sd-qc-warn) 55%, transparent);
  border-bottom: 1px dashed color-mix(in srgb, var(--sd-qc-warn) 55%, transparent);
  background: color-mix(in srgb, var(--sd-qc-warn) 10%, transparent); }

.svp-checks { display: flex; flex-direction: column; gap: 4px; margin-top: 10px; }
.svp-check { display: flex; align-items: center; gap: 7px; padding: 5px 8px; border-radius: 8px;
  background: color-mix(in srgb, var(--sd-text) 3%, transparent);
  animation: svp-row 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: calc(0.1s + var(--i) * 0.06s); }
@keyframes svp-row { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: none; } }
.svp-check-dot { display: grid; place-items: center; width: 15px; height: 15px; border-radius: 50%; flex-shrink: 0;
  border: 1.5px dashed color-mix(in srgb, var(--sd-text) 25%, transparent); transition: all 0.3s; }
.svp-check-dot svg { width: 9px; height: 9px; }
.svp-check-dot path { fill: none; stroke: transparent; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: 12; stroke-dashoffset: 12; transition: stroke-dashoffset 0.35s cubic-bezier(0.16, 1, 0.3, 1) 0.05s, stroke 0.2s; }
.svp-check.ok .svp-check-dot { border-style: solid; border-color: color-mix(in srgb, var(--sd-qc-go) 55%, transparent);
  background: color-mix(in srgb, var(--sd-qc-go) 10%, transparent); }
.svp-check.ok .svp-check-dot path { stroke: var(--sd-qc-go); stroke-dashoffset: 0; }
.svp-check.bad .svp-check-dot { border-style: solid; border-color: color-mix(in srgb, var(--sd-qc-halt) 55%, transparent); }
.svp-check.warn .svp-check-dot { border-color: color-mix(in srgb, var(--sd-qc-warn) 55%, transparent); }
.svp-check b { font-size: 7.5px; letter-spacing: 0.14em; color: var(--sd-text-muted); width: 46px; flex-shrink: 0; }
.svp-check em { font-style: normal; font-size: 8.5px; font-weight: 700; letter-spacing: 0.06em;
  color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.svp-check.bad em { color: var(--sd-qc-halt); }
.svp-check.warn em { color: var(--sd-qc-warn); }

.svp-strip { display: flex; gap: 6px; align-items: flex-start; margin: 10px 0 0; padding: 7px 9px;
  border-radius: 9px; font-size: 9.5px; line-height: 1.5; }
.svp-strip.danger { color: var(--sd-qc-halt); border: 1px solid color-mix(in srgb, var(--sd-qc-halt) 40%, transparent);
  background: color-mix(in srgb, var(--sd-qc-halt) 7%, transparent); }
.svp-strip.warn { color: var(--sd-qc-warn); border: 1px solid color-mix(in srgb, var(--sd-qc-warn) 40%, transparent);
  background: color-mix(in srgb, var(--sd-qc-warn) 7%, transparent); }
.svp-strip svg { flex-shrink: 0; margin-top: 2px; }

.svp-mech { display: flex; flex-direction: column; gap: 7px; margin-top: 10px; padding: 10px 11px;
  border-radius: 12px; border: 1px dashed color-mix(in srgb, var(--sd-qc-core) 28%, transparent);
  background: color-mix(in srgb, var(--sd-qc-core) 4%, transparent); }
.svp-mech-h { display: inline-flex; align-items: center; gap: 5px; font-size: 7.5px; font-weight: 800;
  letter-spacing: 0.16em; color: var(--sd-qc-core); }
.svp-flow { display: flex; align-items: center; gap: 5px; }
.svp-flow .n { font-size: 7px; font-weight: 800; letter-spacing: 0.1em; padding: 3px 7px; border-radius: 6px;
  color: var(--sd-qc-core); border: 1px solid color-mix(in srgb, var(--sd-qc-core) 40%, transparent); }
.svp-flow .w { flex: 1; height: 2px; border-radius: 2px;
  background: repeating-linear-gradient(90deg, color-mix(in srgb, var(--sd-qc-core) 55%, transparent) 0 5px, transparent 5px 10px);
  background-size: 10px 2px; animation: svp-flow 0.9s linear infinite; }
@keyframes svp-flow { to { background-position: 10px 0; } }
.svp-fact { display: flex; gap: 7px; align-items: flex-start;
  animation: svp-row 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: calc(0.25s + var(--i) * 0.08s); }
.svp-fact svg { color: var(--sd-qc-core); flex-shrink: 0; margin-top: 2px; }
.svp-fact p { margin: 0; font-size: 9.5px; line-height: 1.5; color: var(--sd-text-secondary); }
.svp-fact p b { color: var(--sd-text); }

/* skill form upgrades */
.svf-code { position: relative; display: block; }
.svf-suggest { position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
  display: inline-flex; align-items: center; gap: 4px; padding: 4px 9px; border-radius: 999px;
  font-size: 9px; font-weight: 800; letter-spacing: 0.08em; cursor: pointer; font-family: inherit;
  color: var(--sd-qc-core); background: var(--sd-qc-soft); border: 1px dashed var(--sd-qc-brd);
  transition: border-style 0.2s, box-shadow 0.2s; }
.svf-suggest:hover { border-style: solid; box-shadow: 0 0 10px color-mix(in srgb, var(--sd-qc-core) 25%, transparent); }
.svf-mini { display: inline-flex; align-items: center; padding: 5px 9px; border-radius: 8px;
  font-size: 8px; font-weight: 800; letter-spacing: 0.1em; cursor: pointer; font-family: inherit;
  color: var(--sd-text-muted); background: transparent; border: 1px solid var(--sd-border-strong);
  transition: color 0.2s, border-color 0.2s, transform 0.2s; }
.svf-mini:hover:not(:disabled) { color: var(--sd-qc-core); border-color: var(--sd-qc-brd); transform: translateY(-1px); }
.svf-mini:disabled { opacity: 0.45; cursor: not-allowed; }
.svf-meter { display: block; height: 3px; border-radius: 3px; margin: 6px 0 8px;
  background: color-mix(in srgb, var(--sd-text) 8%, transparent); overflow: hidden; }
.svf-meter i { display: block; height: 100%; border-radius: inherit;
  background: linear-gradient(90deg, var(--sd-qc-core), var(--sd-qc-hi));
  transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
.qm-chip.roster { display: inline-flex; align-items: center; gap: 6px; }
.svf-chip-ava { display: grid; place-items: center; width: 17px; height: 17px; border-radius: 6px;
  font-size: 6.5px; font-weight: 800; color: var(--sd-text-muted);
  background: color-mix(in srgb, var(--sd-text) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--sd-text) 14%, transparent); transition: all 0.25s; }
.qm-chip.roster.on .svf-chip-ava { color: #241703; background: var(--sd-qc-grad); border-color: transparent; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .svp-ava,
  html:not([data-cinematic="on"]) .svp-check,
  html:not([data-cinematic="on"]) .svp-fact { animation-duration: 0.01s; animation-delay: 0s; }
  html:not([data-cinematic="on"]) .svp-flow .w { animation: none; }
}

/* form primitives v2 */
.qm-area { resize: vertical; line-height: 1.5; min-height: 52px; font-family: inherit; }
.qm-range { display: flex; align-items: center; gap: 11px; }
.qm-range.wide { flex-wrap: wrap; }
.qm-range > b { font-size: 13px; color: var(--sd-amber); min-width: 30px; text-align: right; }
.qm-slider { flex: 1; appearance: none; -webkit-appearance: none; height: 5px; border-radius: 999px; cursor: pointer;
  background: var(--sd-border-strong); outline: none; }
.qm-slider::-webkit-slider-thumb { appearance: none; -webkit-appearance: none; width: 17px; height: 17px; border-radius: 50%;
  background: var(--sd-grad-hero); border: 2.5px solid var(--sd-surface-elevated); box-shadow: 0 3px 9px rgba(251, 146, 60, 0.4);
  transition: transform 0.2s var(--sd-spring); }
.qm-slider::-webkit-slider-thumb:hover { transform: scale(1.22); }
.qm-slider::-moz-range-thumb { width: 15px; height: 15px; border-radius: 50%; background: var(--sd-grad-hero);
  border: 2.5px solid var(--sd-surface-elevated); }
.qcf-inp.mins { width: 96px; }
.qm-mins-lb { font-size: 10px; color: var(--sd-text-muted); }
.qm-rows { display: flex; flex-direction: column; gap: 7px; margin-bottom: 7px; }
.qm-cond.bad { border-color: color-mix(in srgb, var(--sd-danger) 45%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--sd-danger) 10%, transparent); }
.qm-row-enter-active, .qm-row-leave-active { transition: all 0.32s var(--sd-spring); }
.qm-row-enter-from { opacity: 0; transform: translateY(-8px) scale(0.985); }
.qm-row-leave-to { opacity: 0; transform: translateX(14px) scale(0.985); }
.qm-row-move { transition: transform 0.32s var(--sd-spring); }
.qm-chip-tick { margin-right: 3px; animation: pvw-chip-in 0.3s var(--sd-spring); }
.qm-chip.tiny { padding: 3px 9px; font-size: 10px; }
.qm-chip.preset { border-style: dashed; }
.qm-chip.preset:hover { border-color: var(--sd-amber); color: var(--sd-amber); }
.qm-agent-tools { display: flex; align-items: center; gap: 9px; margin-bottom: 7px; }
.qm-agent-search { display: inline-flex; align-items: center; gap: 6px; flex: 1; padding: 6px 10px; border-radius: 10px;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text-dim); }
.qm-agent-search:focus-within { border-color: var(--sd-amber-border); box-shadow: 0 0 0 3px var(--sd-amber-soft); }
.qm-agent-inp { flex: 1; background: none; border: none; outline: none; color: var(--sd-text); font-size: 12px; font-family: inherit; }
.qm-agent-n { font-size: 10px; color: var(--sd-text-muted); }
.qcf-inp.bad { border-color: color-mix(in srgb, var(--sd-danger) 55%, transparent); }
.qcf-btn.danger.ghosted { background: transparent; border-style: dashed; }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .pvw-lamp.on,
  html:not([data-cinematic="on"]) .pvw-wire,
  html:not([data-cinematic="on"]) .pvw-cond,
  html:not([data-cinematic="on"]) .qm-chip-tick { animation: none; }
}
</style>
