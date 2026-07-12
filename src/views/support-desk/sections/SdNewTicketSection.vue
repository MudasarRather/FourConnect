<template>
  <div class="itk" ref="rootEl" :class="{ agent: isAgent, ready: canSubmit }">
    <!-- ══ TALL ANIMATED HERO (hosts the step conduit + actions) ══ -->
    <div ref="heroEl">
      <SdIntakeHero
        :eyebrow="isAgent ? 'AGENT INTAKE · INTELLIGENT INTAKE' : 'NEW REQUEST · INTELLIGENT INTAKE'"
        title="Create a" accent="support ticket"
        :sub="isAgent ? 'Classify, route and bind to SLA — one signal, fully formed.' : 'Tell us what’s happening. We classify, surface fixes and route it the moment you submit.'"
        :draft-label="draftLabel" :steps="steps" :current="currentStep" :reached="reached" :completion="completion"
        :can-submit="canSubmit" :saving="saving" :ready="canSubmit"
        @jump="onJump" @save="openSaveDraft" @discard="openDiscard" @submit="submit"
      >
        <template #credential>
          <SdIntakeCrystal compact
            :subject="form.subject" :ticket-type="form.ticket_type" :priority="form.priority"
            :category-name="categoryName" :completion="completion" :ready="canSubmit"
            :steps="ledger" :requester-name="isAgent ? (form.contact_name || me.name || 'You') : (me.name || 'You')"
            :draft-label="draftLabel"
          />
        </template>
      </SdIntakeHero>
    </div>

    <!-- restore-draft banner -->
    <Presence>
      <Motion v-if="showRestore" class="itk-restore" :initial="{ opacity: 0, y: -8 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: -8 }">
        <History :size="15" />
        <span>You have a saved draft<i v-if="draftMeta?.name"> — “{{ draftMeta.name }}”</i>. Pick up where you left off?</span>
        <button class="rs-btn" @click="restoreDraft">Restore</button>
        <button class="rs-btn ghost" @click="dismissRestore">Start fresh</button>
      </Motion>
    </Presence>

    <!-- ══ BODY — stretched step stage (left) + intake intelligence (right) ══ -->
    <div class="itk-body" :style="{ '--hero-h': heroH + 'px' }">
      <!-- PRIMARY — stretched step stage, one step at a time -->
      <main class="itk-stage">
        <div ref="stepWrapRef" class="itk-step-wrap">
          <Presence mode="wait">
            <!-- 1 · REQUESTER & CLIENT -->
            <Motion v-if="currentKey === 'requester'" key="requester" class="itk-step" :initial="stepIn" :animate="stepAnimate" :exit="stepOut" :transition="stepT">
              <div class="step-head"><span class="step-no">{{ stepNo('requester') }}</span><div><h3>Requester information</h3><p>Who this ticket is for — bind the client so the contract &amp; SLA follow.</p></div></div>

              <!-- raised-by identity strip -->
              <div class="req-strip">
                <span class="rq-ava">{{ initials }}</span>
                <div class="rq-b">
                  <span class="rq-name">Raised by {{ me.name || 'you' }}</span>
                  <span v-if="me.email" class="rq-mail">{{ me.email }}{{ me.department ? ' · ' + me.department : '' }}</span>
                </div>
                <span class="rq-stamp"><ShieldCheck :size="12" /> Verified</span>
              </div>

              <div class="f-grid2">
                <div class="f"><label>Organization <em>*</em> <i class="opt">the client this is for</i></label><SdSelect v-model="form.organization_id" :options="orgOpts" placeholder="None — internal request" /></div>
                <div class="f"><label>Source</label><SdSelect v-model="form.source" :options="SOURCE_OPTS" /></div>
              </div>
              <Presence>
                <Motion v-if="selectedOrg" class="client-banner" :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: -6 }">
                  <span class="cb-ic"><Building2 :size="16" /></span>
                  <div class="cb-b">
                    <span class="cb-eyebrow">ON BEHALF OF</span>
                    <span class="cb-name">{{ selectedOrg.name }}</span>
                    <div class="cb-chips">
                      <span v-if="selectedOrg.support_plan" class="cb-chip"><Star :size="10" /> {{ selectedOrg.support_plan }}</span>
                      <span v-if="selectedOrg.code" class="cb-chip sd-mono">{{ selectedOrg.code }}</span>
                    </div>
                  </div>
                  <span class="cb-stamp"><ShieldCheck :size="11" /> CLIENT</span>
                </Motion>
              </Presence>
              <!-- registered customer lookup (Zendesk requester-style) — auto-fills the ad-hoc fields -->
              <div v-if="isAgent && form.organization_id" class="f">
                <label>Customer <i class="opt">registered contact — auto-fills the fields below</i></label>
                <SdSelect v-model="form.customer_id" :options="customerOpts" placeholder="Ad-hoc contact (type below)" />
              </div>
              <div class="f-grid2">
                <label class="f"><span>Contact <em>*</em> <i class="opt">contact person</i></span><input v-model="form.contact_name" class="f-in" placeholder="Reporter name" /></label>
                <label class="f"><span>Email</span><input v-model="form.contact_email" type="email" class="f-in" placeholder="reporter@company.com" /></label>
              </div>
              <div class="f-grid2">
                <label class="f"><span>Phone</span><input v-model="form.contact_phone" class="f-in" placeholder="+91…" /></label>
                <label class="f"><span>Department</span><input v-model="form.department" class="f-in" placeholder="IT / HR / Finance…" /></label>
              </div>
              <label class="f"><span>Location</span><input v-model="form.location" class="f-in" placeholder="Office / branch / region" /></label>
            </Motion>

            <!-- 2 · DESCRIBE -->
            <Motion v-else-if="currentKey === 'describe'" key="describe" class="itk-step" :initial="stepIn" :animate="stepAnimate" :exit="stepOut" :transition="stepT">
              <div class="step-head"><span class="step-no">{{ stepNo('describe') }}</span><div><h3>The issue</h3><p>A sharp subject and rich detail resolve faster.</p></div></div>
              <label class="f">
                <span>Subject <em>*</em></span>
                <div class="f-subj">
                  <input v-model="form.subject" class="f-in" maxlength="255" placeholder="One line that captures the issue" @keydown.enter.prevent />
                  <span class="f-count" :class="{ warn: form.subject.length > 230 }">{{ form.subject.length }}/255</span>
                </div>
              </label>
              <label class="f">
                <span>Description <em>*</em> <i class="opt">markdown supported</i></span>
                <textarea ref="descEl" v-model="form.description" class="f-in f-area" rows="6"
                  placeholder="What’s happening, what you expected, steps to reproduce, and why it matters…" @input="autoGrow" />
              </label>
              <div class="f">
                <span class="f-lbl">Request type</span>
                <div class="type-grid">
                  <button v-for="ty in TYPE_OPTS" :key="ty.value" type="button" class="type-chip" :class="{ on: form.ticket_type === ty.value }" @click="form.ticket_type = ty.value">
                    <span class="tc-ic"><component :is="ty.icon" :size="15" /></span>
                    <span class="tc-lbl">{{ ty.label }}</span>
                  </button>
                </div>
              </div>

              <!-- SIGNAL PRISM — the intake intelligence, woven into the form -->
              <SdSignalRead
                variant="live"
                :subject="form.subject" :description="form.description"
                :ticket-type="form.ticket_type" :priority="form.priority"
                :impact="form.impact" :urgency="form.urgency"
                :category-id="form.category_id" :subcategory-id="form.subcategory_id"
                :categories="pickers.categories" :recent-tickets="recent"
                @apply="applySuggestion" @open="goTicket" @article="goArticle" @focus-desc="focusDesc"
              />
            </Motion>

            <!-- 3 · CLASSIFY -->
            <Motion v-else-if="currentKey === 'classify'" key="classify" class="itk-step" :initial="stepIn" :animate="stepAnimate" :exit="stepOut" :transition="stepT">
              <div class="step-head"><span class="step-no">{{ stepNo('classify') }}</span><div><h3>Classification &amp; priority</h3><p>Plot impact against urgency — the priority computes itself.</p></div></div>
              <SdSignalRead
                variant="banner" class="itk-banner"
                :subject="form.subject" :description="form.description"
                :ticket-type="form.ticket_type" :priority="form.priority"
                :impact="form.impact" :urgency="form.urgency"
                :category-id="form.category_id" :subcategory-id="form.subcategory_id"
                :categories="pickers.categories" :recent-tickets="recent"
                @apply="applySuggestion"
              />
              <div class="f-grid2">
                <div class="f"><label>Category <em>*</em></label><SdSelect v-model="form.category_id" :options="mainCatOpts" placeholder="Select a category…" /></div>
                <div class="f"><label>Subcategory</label><SdSelect v-model="form.subcategory_id" :options="subCatOpts" :disabled="!hasSubs" :placeholder="hasSubs ? 'Select a subcategory…' : 'No subcategories'" /></div>
              </div>
              <div class="f">
                <span class="f-lbl">Impact × Urgency <em>*</em></span>
                <SdPriorityMatrix :impact="form.impact" :urgency="form.urgency" @pick="onMatrix" />
              </div>
              <div class="f">
                <span class="f-lbl">Priority <i class="opt">auto-set by the matrix — override if needed</i></span>
                <div class="pri-bar">
                  <button v-for="p in PRIORITIES" :key="p.value" type="button" class="pri-seg" :class="{ on: form.priority === p.value }" :style="{ '--pc': priColor(p.value) }" @click="setPriority(p.value)">
                    <span class="pri-dot" /><span class="pri-l">{{ p.label }}</span>
                  </button>
                </div>
              </div>
            </Motion>

            <!-- 4 · ROUTING & SLA / ASSIGNMENT -->
            <Motion v-else-if="currentKey === 'routing'" key="routing" class="itk-step" :initial="stepIn" :animate="stepAnimate" :exit="stepOut" :transition="stepT">
              <div class="step-head"><span class="step-no">{{ stepNo('routing') }}</span><div><h3>{{ isAgent ? 'Routing & SLA' : 'Assignment' }}</h3><p>Where it goes, the SLA it’s bound to, and who owns it.</p></div></div>
              <div v-if="isAgent" class="f">
                <label>SLA package <i class="opt">defaults to the client / global policy</i></label>
                <SdSelect v-model="form.sla_package_id" :options="slaOpts" placeholder="Auto (org / default)" />
              </div>
              <SdRoutingPreview
                :category-id="form.category_id" :subcategory-id="form.subcategory_id" :ticket-type="form.ticket_type" :organization-id="form.organization_id"
                :priority="form.priority" :sla-package-id="form.sla_package_id"
                :is-agent="isAgent" :is-manager="isAgent && isManager" :is-admin="isAdmin"
                v-model:assign-me="form.assign_me" v-model:team-id="form.team_id" v-model:assigned-agent-id="form.assigned_agent_id"
                :team-options="teamOpts" :agent-options="agentOpts" @preview="(p) => Object.assign(routePv, p)"
              />
              <!-- watchers / CC (Zendesk followers, ServiceNow watch list) — notified + can view -->
              <div v-if="isAgent" class="f">
                <span class="f-lbl">Watchers / CC <i class="opt">kept in the loop from the first reply</i></span>
                <div v-if="form.collaborators.length" class="tagbox">
                  <span v-for="(cid, i) in form.collaborators" :key="cid" class="tag">{{ collabName(cid) }}<button type="button" @click="form.collaborators.splice(i, 1)"><X :size="11" /></button></span>
                </div>
                <SdSelect :model-value="''" :options="collabOpts" placeholder="Add a watcher…" @update:model-value="addCollab" />
              </div>
            </Motion>

            <!-- 5 · CONTEXT (agent only) — impact / vendor / related -->
            <Motion v-else-if="currentKey === 'context'" key="context" class="itk-step" :initial="stepIn" :animate="stepAnimate" :exit="stepOut" :transition="stepT">
              <div class="step-head"><span class="step-no">{{ stepNo('context') }}</span><div><h3>Business impact &amp; links <i class="opt-h">optional</i></h3><p>Quantify the blast radius and connect related records.</p></div></div>
              <div class="f">
                <span class="f-lbl">Business impact</span>
                <div class="pri-bar">
                  <button v-for="b in IMPACT_OPTS" :key="b.value" type="button" class="pri-seg" :class="{ on: form.business_impact === b.value }" :style="{ '--pc': priColor(bizToPri(b.value)) }" @click="form.business_impact = form.business_impact === b.value ? '' : b.value">
                    <span class="pri-dot" /><span class="pri-l">{{ b.label }}</span>
                  </button>
                </div>
              </div>
              <div class="f-grid2">
                <label class="f"><span>Affected users</span><input v-model.number="form.affected_users" type="number" min="0" class="f-in" placeholder="e.g. 25" /></label>
                <label class="f"><span>Vendor <i class="opt">if a third party is involved</i></span><input v-model="form.vendor_name" class="f-in" placeholder="Vendor name" /></label>
              </div>
              <label class="f"><span>Revenue / compliance impact</span><input v-model="form.revenue_impact" class="f-in" placeholder="e.g. blocks ₹2L/day billing run" /></label>
              <div class="f-grid2">
                <div class="f"><label>Linked change</label><SdSelect v-model="form.linked_change_id" :options="changeOpts" placeholder="None" /></div>
                <div class="f"><label>Linked problem</label><SdSelect v-model="form.linked_problem_id" :options="problemOpts" placeholder="None" /></div>
              </div>
            </Motion>

            <!-- 6 · ATTACH -->
            <Motion v-else-if="currentKey === 'attach'" key="attach" class="itk-step" :initial="stepIn" :animate="stepAnimate" :exit="stepOut" :transition="stepT">
              <div class="step-head"><span class="step-no">{{ stepNo('attach') }}</span><div><h3>Evidence &amp; tags</h3><p>Screenshots, logs and labels that speed up triage.</p></div></div>
              <div class="f">
                <span class="f-lbl">Attachments <i class="opt">PDF / image · ≤5MB each</i></span>
                <div class="dropzone" :class="{ busy: uploading, drag: dragOver }" @click="pickFiles" @dragover.prevent="dragOver = true" @dragleave.prevent="dragOver = false" @drop.prevent="onDrop">
                  <input ref="fileInput" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.csv,.log,.txt,.xlsx,.docx,.zip" class="dz-in" @change="onFiles" />
                  <component :is="uploading ? LoaderCircle : UploadCloud" :size="20" :class="{ spin: uploading }" />
                  <span>{{ uploading ? 'Uploading…' : 'Drop files here or click to browse' }}</span>
                </div>
                <div v-if="form.attachments.length" class="att-list">
                  <span v-for="(a, i) in form.attachments" :key="i" class="att"><Paperclip :size="12" /><i>{{ a.name }}</i><button type="button" @click.stop="form.attachments.splice(i, 1)"><X :size="11" /></button></span>
                </div>
                <p v-if="fileErr" class="att-err"><AlertCircle :size="12" /> {{ fileErr }}</p>
              </div>
              <div class="f">
                <span class="f-lbl">Tags <i class="opt">up to 8</i></span>
                <div class="tagbox" :class="{ focused: tagFocus }">
                  <span v-for="(tg, i) in form.tags" :key="tg + i" class="tag">{{ tg }}<button type="button" @click="form.tags.splice(i, 1)"><X :size="11" /></button></span>
                  <input v-model="tagInput" class="tag-in" :placeholder="form.tags.length ? '' : 'Add a tag, press Enter'" @keydown.enter.prevent="addTag" @keydown.delete="onTagBack" @focus="tagFocus = true" @blur="tagFocus = false" />
                </div>
              </div>
            </Motion>

            <!-- 7 · REVIEW -->
            <Motion v-else key="review" class="itk-step" :initial="stepIn" :animate="stepAnimate" :exit="stepOut" :transition="stepT">
              <div class="step-head"><span class="step-no">{{ stepNo('review') }}</span><div><h3>Review &amp; submit</h3><p>One last look before the SLA clock starts.</p></div></div>
              <ul class="rev">
                <li><span><Tag :size="13" /> Type</span><b>{{ typeLabelOf(form.ticket_type) }}</b></li>
                <li><span><Flag :size="13" /> Priority</span><b :style="{ color: priColor(form.priority) }">{{ priLabel(form.priority) }} · {{ priP(form.priority) }}</b></li>
                <li v-if="categoryName"><span><Layers :size="13" /> Category</span><b>{{ categoryName }}{{ subcategoryName ? ' › ' + subcategoryName : '' }}</b></li>
                <li v-if="matrixChosen"><span><Crosshair :size="13" /> Impact × Urgency</span><b>{{ cap(form.impact) }} × {{ cap(form.urgency) }}</b></li>
                <li v-if="isAgent && orgName"><span><Building2 :size="13" /> Client</span><b>{{ orgName }}</b></li>
                <li v-if="routePv.team_name"><span><Route :size="13" /> Routes to</span><b>{{ routePv.team_name }}{{ form.assign_me ? ' · you' : '' }}</b></li>
                <li v-if="form.collaborators.length"><span><Star :size="13" /> Watchers</span><b>{{ form.collaborators.length }}</b></li>
                <li><span><Paperclip :size="13" /> Attachments</span><b>{{ form.attachments.length || 'None' }}</b></li>
              </ul>
              <SdSignalRead
                variant="digest" class="itk-digest"
                :subject="form.subject" :description="form.description"
                :ticket-type="form.ticket_type" :priority="form.priority"
                :impact="form.impact" :urgency="form.urgency"
                :category-id="form.category_id" :subcategory-id="form.subcategory_id"
                :categories="pickers.categories" :recent-tickets="recent"
                @apply="applySuggestion"
              />
              <p v-if="error" class="itk-err"><AlertCircle :size="14" /> {{ error }}</p>
              <Motion as="button" type="button" class="itk-submit" :class="{ off: !canSubmit }" :disabled="!canSubmit || saving"
                :whileHover="canSubmit ? { y: -2, scale: 1.01 } : {}" :whileTap="canSubmit ? { scale: 0.98 } : {}" @click="submit">
                <component :is="saving ? LoaderCircle : Rocket" :size="16" :class="{ spin: saving }" />
                {{ saving ? 'Creating ticket…' : 'Create ticket' }}
              </Motion>
              <p class="itk-fine"><ShieldCheck :size="12" /> {{ isAgent ? 'The desk SLA clock starts the instant this is created.' : 'Support is notified instantly — track every reply under My Tickets.' }}</p>
            </Motion>
          </Presence>
        </div>

        <!-- inline validation gate (cinematic) -->
        <Presence>
          <Motion v-if="stepError" key="step-err" class="itk-step-err"
            :initial="{ opacity: 0, y: -10, scale: 0.985 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
            :exit="{ opacity: 0, y: -8, scale: 0.985 }" :transition="{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }">
            <span class="se-glow" aria-hidden="true" />
            <span class="se-ic"><ShieldAlert :size="18" /></span>
            <div class="se-b">
              <span class="se-h">Can’t continue yet</span>
              <span class="se-p">{{ stepError }}</span>
            </div>
            <span class="se-badge"><AlertCircle :size="11" /> Action needed</span>
          </Motion>
        </Presence>

        <!-- nav footer -->
        <footer class="itk-nav">
          <button type="button" class="nav-btn ghost" :class="{ off: currentStep === 0 }" :disabled="currentStep === 0" @click="back"><ChevronLeft :size="16" /> Back</button>
          <span class="nav-count">Step {{ currentStep + 1 }} <i>of</i> {{ steps.length }}</span>
          <button v-if="currentStep < steps.length - 1" type="button" class="nav-btn primary" @click="next">Continue <ChevronRight :size="16" /></button>
          <Motion v-else as="button" type="button" class="nav-btn primary" :class="{ off: !canSubmit }" :disabled="!canSubmit || saving" :whileTap="canSubmit ? { scale: 0.97 } : {}" @click="submit">
            <component :is="saving ? LoaderCircle : Rocket" :size="15" :class="{ spin: saving }" /> {{ saving ? 'Creating…' : 'Create ticket' }}
          </Motion>
        </footer>
      </main>
    </div>

    <!-- ══ SAVE DRAFT MODAL ══ -->
    <SdModalShell :open="saveOpen" eyebrow="LOCAL DRAFT" title="Save this draft" width="460px" @close="saveOpen = false">
      <div class="dm">
        <label class="f"><span>Draft name</span><input v-model="draftName" class="f-in" placeholder="e.g. VPN access request" /></label>
        <label class="f"><span>Notes <i class="opt">optional</i></span><textarea v-model="draftNotes" class="f-in f-area" rows="3" placeholder="Anything to remember when you come back…" /></label>
        <p class="dm-note"><Info :size="12" /> Saved in this browser only — it isn’t submitted to support yet.</p>
      </div>
      <template #footer>
        <button class="sh-like-btn ghost" @click="saveOpen = false">Cancel</button>
        <span style="flex:1" />
        <button class="sh-like-btn primary" @click="confirmSaveDraft"><Save :size="14" /> Save draft</button>
      </template>
    </SdModalShell>

    <!-- ══ DISCARD MODAL (ultra-modern, reasoned) ══ -->
    <SdModalShell :open="discardOpen" eyebrow="DISCARD DRAFT" title="Discard this ticket?" width="480px" @close="discardOpen = false">
      <div class="dk">
        <div class="dk-hero">
          <span class="dk-rings" aria-hidden="true" />
          <span class="dk-ic"><Trash2 :size="26" /></span>
        </div>
        <p class="dk-lead">Everything you’ve entered will be cleared and the local draft removed. This can’t be undone — but no ticket has been created yet, so nothing is sent to support.</p>
        <div class="dk-reasons">
          <span class="dk-rlbl">Reason <i class="opt">optional</i></span>
          <div class="dk-chips">
            <button v-for="r in DISCARD_REASONS" :key="r" type="button" class="dk-chip" :class="{ on: discardReason === r }" @click="discardReason = discardReason === r ? '' : r">{{ r }}</button>
          </div>
        </div>
        <ul class="dk-flow">
          <li><Trash2 :size="12" /> The draft is cleared from this browser</li>
          <li><RotateCcw :size="12" /> You return to step 1, fresh</li>
          <li><ShieldCheck :size="12" /> No ticket number is minted · nothing is submitted</li>
        </ul>
      </div>
      <template #footer>
        <button class="sh-like-btn ghost" @click="discardOpen = false">Keep editing</button>
        <span style="flex:1" />
        <button class="sh-like-btn danger" @click="confirmDiscard"><Trash2 :size="14" /> Discard draft</button>
      </template>
    </SdModalShell>

    <!-- ══ CREATE CONFIRMATION MODAL ══ -->
    <SdModalShell :open="confirmOpen" eyebrow="TICKET CREATED" title="Your ticket is in" width="480px" @close="closeConfirm">
      <div v-if="done" class="cf">
        <div class="cf-hero">
          <span class="cf-burst" aria-hidden="true" />
          <span class="cf-ic"><CheckCircle2 :size="30" /></span>
          <span class="cf-no sd-mono">{{ done.ticket_number }}</span>
          <span class="cf-subj">{{ done.subject }}</span>
        </div>
        <ul class="cf-grid">
          <li><span>Priority</span><b :style="{ color: priColor(done.priority) }">{{ priLabel(done.priority) }} · {{ priP(done.priority) }}</b></li>
          <li><span>Type</span><b>{{ typeLabelOf(done.ticket_type) }}</b></li>
          <li><span>Status</span><b><SdPill kind="status" :value="done.status" /></b></li>
          <li><span>Owner</span><b>{{ done.assigned_agent_name || 'Auto-routing…' }}</b></li>
          <li class="wide"><span>SLA — first response / resolution</span><b class="sd-mono">{{ slaText.response }} &nbsp;·&nbsp; {{ slaText.resolution }}</b></li>
        </ul>
      </div>
      <template #footer>
        <button class="sh-like-btn ghost" @click="createAnother"><Plus :size="14" /> Create another</button>
        <span style="flex:1" />
        <button class="sh-like-btn primary" @click="viewMyTickets"><ArrowUpRight :size="14" /> View in My Tickets</button>
      </template>
    </SdModalShell>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  Hash, Save, Rocket, LoaderCircle, History, ShieldCheck, Zap, Gauge, Route,
  BellRing, Layers, Building2, Globe, UploadCloud, Paperclip, X, AlertCircle, Tag, Flag, Crosshair,
  Info, CheckCircle2, Plus, ArrowUpRight, ChevronLeft, ChevronRight, Star, FileText, Trash2, RotateCcw,
  AlertTriangle, Inbox, Bug, Sparkles, MessageCircleWarning, GitPullRequest, Wrench, GraduationCap, Hammer,
  ShieldAlert,
} from 'lucide-vue-next'
import SdIntakeHero from '../components/SdIntakeHero.vue'
import SdIntakeCrystal from '../components/SdIntakeCrystal.vue'
import SdSignalRead from '../components/SdSignalRead.vue'
import SdRoutingPreview from '../components/SdRoutingPreview.vue'
import SdPriorityMatrix from '../components/SdPriorityMatrix.vue'
import SdSelect from '../components/SdSelect.vue'
import SdPill from '../components/SdPill.vue'
import SdModalShell from '../components/SdModalShell.vue'
import {
  createMyTicket, createTicket, getMe, loadPickers, usePickers, uploadSupportFile, listMyTickets,
  fetchCapabilities, useCapabilities, listSupportAgents, listTeams, listMyTeam, listMyTeams,
  listChangeRequests, listProblems, routingPreview, listCustomers, applyTemplate,
  PRIORITIES, TICKET_TYPES, SOURCES, IMPACT_URGENCY,
  priorityColor, priorityLabel, priorityP, typeLabel as typeLabelOf,
} from '@/composables/useSupportDesk'
import { substituteTemplate } from '../templateVariables'

defineProps({ embedded: { type: Boolean, default: false } })
const emit = defineEmits(['go', 'changed'])

const route = useRoute()
const router = useRouter()
const toast = useToast()
const base = computed(() => (route.path.startsWith('/user') ? '/user/support' : '/admin/support-desk'))

/* ── capability-driven mode (NOT path-driven): /user/support is the AGENT portal ── */
const caps = useCapabilities()
const isAgent = computed(() => caps.isAgent)
const isManager = computed(() => caps.isManager)
const isAdmin = computed(() => caps.isAdmin)

const pickers = usePickers()
const me = ref({ id: null, name: '', email: '', role: '', department: '' })
const recent = ref([])
const routePv = reactive({ team_id: null, team_name: null, you_are_on_team: false, can_self_assign: false, you_handle_type: false, team_member_ids: [], handling_member_ids: [] })

/* ── form ── */
const blank = () => ({
  subject: '', description: '', ticket_type: 'incident', priority: 'medium',
  impact: '', urgency: '', category_id: '', subcategory_id: '', tags: [], attachments: [],
  source: 'internal', organization_id: '', customer_id: '', contact_name: '', contact_email: '', contact_phone: '',
  department: '', location: '', sla_package_id: '', assign_me: false,
  team_id: '', assigned_agent_id: '', collaborators: [],
  business_impact: '', affected_users: null, revenue_impact: '', vendor_name: '',
  linked_change_id: '', linked_problem_id: '',
})
const form = reactive(blank())
const resetForm = () => { Object.assign(form, blank()); appliedTemplateId.value = null }

const saving = ref(false)
const error = ref('')
const done = ref(null)
/* Template provenance — set when the intake was prefilled from a Copperplate
   Studio plate (?template=<id>); stamped onto the created ticket. */
const appliedTemplateId = ref(null)

/* ── options ── */
const TYPE_ICONS = { incident: AlertTriangle, service_request: Inbox, bug: Bug, feature_request: Sparkles, complaint: MessageCircleWarning, change: GitPullRequest, problem: Wrench, training: GraduationCap, implementation: Hammer }
const TYPE_OPTS = TICKET_TYPES.map(t => ({ ...t, icon: TYPE_ICONS[t.value] || Inbox }))
const SOURCE_OPTS = SOURCES
const IMPACT_OPTS = IMPACT_URGENCY
const priColor = (v) => priorityColor(v)
const priLabel = (v) => priorityLabel(v)
const priP = (v) => priorityP(v) || ''
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')
const bizToPri = (v) => (v === 'critical' ? 'critical' : v === 'high' ? 'high' : v === 'medium' ? 'medium' : 'low')

/* ── category cascade ── */
const allCats = computed(() => pickers.categories || [])
const mainCatOpts = computed(() => [
  { value: '', label: 'Select a category…' },
  ...allCats.value.filter(c => !c.parent_id && (!(c.request_types || []).length || (c.request_types || []).includes(form.ticket_type))).map(c => ({ value: c.id, label: c.name })),
])
const subCatOpts = computed(() => allCats.value.filter(c => String(c.parent_id) === String(form.category_id)).map(c => ({ value: c.id, label: c.name })))
const hasSubs = computed(() => !!form.category_id && subCatOpts.value.length > 0)
const categoryName = computed(() => allCats.value.find(c => c.id === form.category_id)?.name || '')
const subcategoryName = computed(() => allCats.value.find(c => c.id === form.subcategory_id)?.name || '')
const orgOpts = computed(() => [{ value: '', label: 'None (internal / ad-hoc)' }, ...(pickers.organizations || []).map(o => ({ value: o.id, label: o.name, icon: Building2 }))])
const slaOpts = computed(() => [{ value: '', label: 'Auto (org / default)' }, ...(pickers.slaPackages || []).map(p => ({ value: p.id, label: p.name }))])
const orgName = computed(() => (pickers.organizations || []).find(o => o.id === form.organization_id)?.name || '')
const selectedOrg = computed(() => (pickers.organizations || []).find(o => o.id === form.organization_id) || null)

/* ── routing override pickers (agent: full desk; manager: own scope) ── */
const teamList = ref([]); const agentList = ref([])
const teamOpts = computed(() => [{ value: '', label: 'Auto (by category / type)' }, ...teamList.value.map(t => ({ value: String(t.id), label: t.name }))])
const agentOpts = computed(() => [{ value: '', label: 'Leave for auto / queue' }, ...agentList.value.map(a => ({ value: String(a.id), label: a.name || a.full_name || a.email }))])

/* ── related-record pickers (agent context step) ── */
const changeList = ref([]); const problemList = ref([])
const changeOpts = computed(() => [{ value: '', label: 'None' }, ...changeList.value.map(c => ({ value: String(c.id), label: c.title || c.subject || c.change_number || 'Change' }))])
const problemOpts = computed(() => [{ value: '', label: 'None' }, ...problemList.value.map(p => ({ value: String(p.id), label: p.title || p.subject || p.problem_number || 'Problem' }))])

watch(() => form.ticket_type, () => { if (!mainCatOpts.value.some(o => o.value && o.value === form.category_id)) { form.category_id = ''; form.subcategory_id = '' } })
watch(() => form.category_id, () => { if (!subCatOpts.value.some(o => o.value === form.subcategory_id)) form.subcategory_id = '' })

/* ── registered-customer lookup (agent) — org-scoped; picking one fills the contact fields ── */
const customerList = ref([])
const customerOpts = computed(() => [
  { value: '', label: 'Ad-hoc contact (type below)' },
  ...customerList.value.map(c => ({ value: String(c.id), label: c.name + (c.email ? ' · ' + c.email : '') })),
])
watch(() => form.organization_id, (org) => {
  form.customer_id = ''
  customerList.value = []
  if (org && isAgent.value) {
    listCustomers({ organization_id: org, limit: 100 })
      .then(r => { customerList.value = r?.items || r || [] })
      .catch(() => { customerList.value = [] })
  }
})
watch(() => form.customer_id, (id) => {
  const c = customerList.value.find(x => String(x.id) === String(id))
  if (!c) return
  if (c.name) form.contact_name = c.name
  if (c.email) form.contact_email = c.email
  if (c.phone) form.contact_phone = c.phone
})

/* ── watchers / CC (agent) — Zendesk followers; sent as collaborators on create ── */
const collabOpts = computed(() => [
  { value: '', label: 'Add a watcher…' },
  ...agentList.value
    .filter(a => !form.collaborators.includes(String(a.id)) && String(a.id) !== String(form.assigned_agent_id) && String(a.id) !== String(me.value.id))
    .map(a => ({ value: String(a.id), label: a.name || a.full_name || a.email })),
])
const addCollab = (v) => { if (v && !form.collaborators.includes(String(v))) form.collaborators.push(String(v)) }
const collabName = (id) => { const a = agentList.value.find(x => String(x.id) === String(id)); return a?.name || a?.full_name || a?.email || 'Member' }

/* ── matrix + copilot ── */
const matrixChosen = computed(() => !!form.impact && !!form.urgency)
const onMatrix = ({ impact, urgency, priority }) => { form.impact = impact; form.urgency = urgency; if (priority) form.priority = priority }
// Setting a priority directly (priority bar OR the copilot's Apply) must light the
// Impact×Urgency matrix — it was staying blank because the matrix is impact/urgency-
// driven. Map each priority to its canonical matrix cell so sd-mx updates live.
const PRIORITY_TO_MATRIX = {
  critical: { impact: 'critical', urgency: 'critical' }, high: { impact: 'high', urgency: 'high' },
  medium: { impact: 'medium', urgency: 'medium' }, low: { impact: 'low', urgency: 'low' },
  urgent: { impact: 'critical', urgency: 'high' },
}
const setPriority = (p) => { form.priority = p; const m = PRIORITY_TO_MATRIX[p]; if (m) { form.impact = m.impact; form.urgency = m.urgency } }
const applySuggestion = (patch) => {
  if (patch.ticket_type) form.ticket_type = patch.ticket_type
  // Impact × Urgency travel WITH the priority when the engine derived it through the
  // matrix — the matrix lights up exactly as if the user plotted it by hand.
  if (patch.impact && patch.urgency) {
    form.impact = patch.impact; form.urgency = patch.urgency
    if (patch.priority) form.priority = patch.priority
  } else if (patch.priority) setPriority(patch.priority)
  if (patch.category_id) {
    form.category_id = String(patch.category_id)
    form.subcategory_id = patch.subcategory_id ? String(patch.subcategory_id) : ''
  } else if (patch.subcategory_id) form.subcategory_id = String(patch.subcategory_id)
  toast.success('Applied suggestion', { timeout: 1400 })
}
const focusDesc = () => {
  const i = stepKeys.value.indexOf('describe')
  if (currentStep.value !== i) goStep(i)
  nextTick(() => descEl.value?.focus())
}

/* ── validity + role-adaptive team gate + ledger ── */
const REQUIRED_DESC_LEN = 10
const subjectOk = computed(() => form.subject.trim().length > 2)
const descOk = computed(() => form.description.trim().length >= REQUIRED_DESC_LEN)
// Core mandatory fields per step (product decision: the fields that DEFINE the ticket;
// genuinely-optional ones — phone, location, SLA auto-route, etc. — stay optional).
const step1Valid = computed(() => form.contact_name.trim().length > 0)
const step2Valid = computed(() => subjectOk.value && descOk.value && !!form.ticket_type)
const step3Valid = computed(() => !!form.category_id && !!form.impact && !!form.urgency && !!form.priority)

// Who is checked against "the team that handles this" depends on the caller:
//   admin → no restriction · manager → the AGENT they assign · self → their own membership.
const teamRole = computed(() => (isAdmin.value ? 'admin' : isManager.value ? 'manager' : 'self'))

// SELF — must belong to a team that handles the chosen REQUEST TYPE (gate on step 2).
// reqTypePv is a lightweight routing-preview keyed on the request type alone. you_handle_type
// is true if you're on ANY team that owns this type (not just the one that wins routing — so
// a Tier 2 member isn't blocked because Tier 1 sorts first).
const reqTypePv = reactive({ team_id: null, team_name: null, you_handle_type: false, loaded: false })
let reqTypeTimer = null
const refreshReqTypeTeam = () => {
  routingPreview({ ticket_type: form.ticket_type || 'incident', organization_id: form.organization_id || undefined })
    .then((r) => { reqTypePv.team_id = r?.team_id || null; reqTypePv.team_name = r?.team_name || null; reqTypePv.you_handle_type = !!r?.you_handle_type; reqTypePv.loaded = true })
    .catch(() => { reqTypePv.team_id = null; reqTypePv.team_name = null; reqTypePv.you_handle_type = false; reqTypePv.loaded = true })
}
watch(() => [form.ticket_type, form.organization_id], () => {
  // Reset BEFORE the debounce — the previous type's "handled" verdict must not let a
  // fast Next slip through while the new preview is in flight (the gate fails CLOSED).
  reqTypePv.you_handle_type = false; reqTypePv.loaded = false
  clearTimeout(reqTypeTimer); reqTypeTimer = setTimeout(refreshReqTypeTeam, 200)
}, { immediate: true })
// Blocked whenever the handling union says "not yours" — INCLUDING when no team owns the
// type at all (team_id null). Gating on !!team_id let an org-wide unhandled type sail
// through to triage; only admins/managers may raise a type no team has claimed.
const selfTeamBlocked = computed(() => teamRole.value === 'self' && !reqTypePv.you_handle_type)
const selfBlockMsg = computed(() => (reqTypePv.team_id
  ? `You're not on a team that handles ${typeLabelOf(form.ticket_type)} requests — pick a request type your team handles, or ask an owning team to raise it.`
  : `No support team handles ${typeLabelOf(form.ticket_type)} requests yet — pick a different request type, or ask an admin to set up routing for it.`))

// MANAGER — the agent they pick must be on a team that handles this (explicit team override
// → that team's roster; else the UNION of every team that owns this type, from routePv).
const effTeamMemberIds = computed(() => {
  if (form.team_id) {
    const t = teamList.value.find(x => String(x.id) === String(form.team_id))
    return (t?.member_ids || []).map(String)
  }
  return (routePv.handling_member_ids || []).map(String)
})
const effTeamId = computed(() => form.team_id || routePv.team_id || null)
const managerAgentBlocked = computed(() =>
  teamRole.value === 'manager' && !!form.assigned_agent_id && !!effTeamId.value
  && !effTeamMemberIds.value.includes(String(form.assigned_agent_id)))

const canSubmit = computed(() =>
  step1Valid.value && step2Valid.value && step3Valid.value
  && !selfTeamBlocked.value && !managerAgentBlocked.value && !saving.value)
const ledger = computed(() => {
  const arr = [
    { key: 'who', label: 'Contact captured', done: step1Valid.value },
    { key: 'subj', label: 'Subject captured', done: subjectOk.value },
    { key: 'detail', label: 'Details added', done: descOk.value },
    { key: 'class', label: 'Categorised', done: !!form.category_id },
    { key: 'prio', label: 'Priority plotted', done: matrixChosen.value },
  ]
  if (isAgent.value) arr.push({ key: 'ctx', label: 'Client linked', done: !!(form.organization_id || form.contact_name) })
  return arr
})
const completion = computed(() => ledger.value.filter(l => l.done).length / ledger.value.length)

/* ── steps (capability-aware) ── */
const steps = computed(() => {
  const list = [
    { key: 'requester', label: isAgent.value ? 'Client' : 'Requester', icon: Building2, done: step1Valid.value },
    { key: 'describe', label: 'Describe', icon: AlertTriangle, done: step2Valid.value && !selfTeamBlocked.value },
    { key: 'classify', label: 'Classify', icon: Crosshair, done: step3Valid.value },
    { key: 'routing', label: isAgent.value ? 'Routing' : 'Assign', icon: Route, done: !managerAgentBlocked.value },
  ]
  list.push({ key: 'context', label: 'Impact', icon: Gauge, done: !!(form.business_impact || form.affected_users || form.vendor_name || form.linked_change_id || form.linked_problem_id) })
  list.push({ key: 'attach', label: 'Attach', icon: Paperclip, done: form.attachments.length > 0 || form.tags.length > 0 })
  list.push({ key: 'review', label: 'Review', icon: CheckCircle2, done: canSubmit.value })
  return list
})
const stepKeys = computed(() => steps.value.map(s => s.key))
const currentStep = ref(0)
const reached = ref(0)
const dir = ref(1)
const stepError = ref('')
const blockStep = (msg) => { stepError.value = msg; toast.warning(msg, { timeout: 2800 }) }
// Clear the inline gate message the moment the user edits a field it could relate to.
watch(() => [form.contact_name, form.subject, form.description, form.category_id, form.impact, form.urgency, form.ticket_type, form.assigned_agent_id, form.team_id], () => { stepError.value = '' })
const currentKey = computed(() => stepKeys.value[Math.min(currentStep.value, stepKeys.value.length - 1)])
const stepNo = (k) => String(stepKeys.value.indexOf(k) + 1).padStart(2, '0')
const stepIn = computed(() => ({ opacity: 0, x: dir.value * 34, y: 10, scale: 0.985, filter: 'blur(6px)' }))
const stepOut = computed(() => ({ opacity: 0, x: dir.value * -34, y: -6, scale: 0.985, filter: 'blur(6px)' }))
const stepAnimate = { opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)' }
const stepT = { duration: 0.38, ease: [0.16, 1, 0.3, 1] }

const stepWrapRef = ref(null)
const resetStepScroll = () => {
  const el = stepWrapRef.value
  if (!el) return
  el.scrollTop = 0
  // Presence mode="wait": the incoming step only mounts AFTER the exit animation
  // (~340ms) — without this second reset it inherits the old step's scroll offset
  // and every step opens mid-scrolled.
  setTimeout(() => { if (stepWrapRef.value) stepWrapRef.value.scrollTop = 0 }, 380)
}
const goStep = (i) => {
  const n = steps.value.length
  if (i < 0 || i >= n) return
  dir.value = i >= currentStep.value ? 1 : -1
  currentStep.value = i
  reached.value = Math.max(reached.value, i)
  stepError.value = ''
  resetStepScroll()
}
const next = () => {
  stepError.value = ''
  const key = currentKey.value
  if (key === 'requester' && !step1Valid.value) { blockStep('Add a contact name to continue.'); return }
  if (key === 'describe') {
    if (!subjectOk.value) { blockStep('A subject of at least 3 characters is required.'); return }
    if (!descOk.value) { blockStep(`Add a description of at least ${REQUIRED_DESC_LEN} characters.`); return }
    // SELF gate: not on any team that handles this request type → can't raise it here.
    // While the preview is in flight the gate stays closed with an explicit message.
    if (teamRole.value === 'self' && !reqTypePv.loaded) { blockStep('Confirming which team handles this request type — try again in a second.'); return }
    if (selfTeamBlocked.value) { blockStep(selfBlockMsg.value); return }
  }
  if (key === 'classify' && !step3Valid.value) {
    blockStep(!form.category_id ? 'Pick a category to continue.' : 'Plot impact × urgency to set the priority.'); return
  }
  // MANAGER gate: the chosen assignee must be on a team that handles this request type.
  if (key === 'routing' && managerAgentBlocked.value) { blockStep('The agent you assigned isn’t on a team that handles this request type. Pick an agent who is, or change the team.'); return }
  error.value = ''
  goStep(currentStep.value + 1)
}
const back = () => goStep(currentStep.value - 1)
const onJump = (i) => { if (i <= reached.value) goStep(i) }

/* ── attachments ── */
const uploading = ref(false); const fileErr = ref(''); const fileInput = ref(null); const dragOver = ref(false)
const pickFiles = () => fileInput.value?.click()
const handleFiles = async (files) => {
  if (!files.length) return
  uploading.value = true; fileErr.value = ''
  for (const f of files) {
    if (f.size > 5 * 1024 * 1024) { fileErr.value = `${f.name} exceeds 5MB`; continue }
    try { form.attachments.push(await uploadSupportFile(f)) } catch (e) { fileErr.value = e?.response?.data?.detail || `Could not upload ${f.name}` }
  }
  uploading.value = false
  if (fileInput.value) fileInput.value.value = ''
}
const onFiles = (e) => handleFiles(Array.from(e.target.files || []))
const onDrop = (e) => { dragOver.value = false; handleFiles(Array.from(e.dataTransfer?.files || [])) }

/* ── tags ── */
const tagInput = ref(''); const tagFocus = ref(false)
const addTag = () => { const v = tagInput.value.trim(); if (v && !form.tags.includes(v) && form.tags.length < 8) form.tags.push(v); tagInput.value = '' }
const onTagBack = () => { if (!tagInput.value && form.tags.length) form.tags.pop() }

/* ── description auto-grow ── */
const descEl = ref(null)
const autoGrow = () => { const el = descEl.value; if (!el) return; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 320) + 'px' }

/* ── requester ── */
const initials = computed(() => { const n = (isAgent.value ? (form.contact_name || me.value.name) : me.value.name) || 'You'; return n.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'Y' })
const draftLabel = computed(() => 'TKT-' + new Date().getFullYear() + '-••••')

/* ── SLA text for the confirmation ── */
const relTime = (iso) => {
  if (!iso) return null
  const d = new Date(iso).getTime() - Date.now()
  if (isNaN(d)) return null
  const h = d / 3600000
  if (h < 1) return `~${Math.max(1, Math.round(h * 60))} min`
  if (h < 48) return `~${Math.round(h)} h`
  return `~${Math.round(h / 24)} d`
}
const SLA_FALLBACK = { critical: ['~30 min', '~4 h'], urgent: ['~1 h', '~8 h'], high: ['~2 h', '~1 d'], medium: ['~8 h', '~3 d'], low: ['~1 d', '~5 d'] }
const slaText = computed(() => {
  const t = done.value
  const fb = SLA_FALLBACK[t?.priority] || SLA_FALLBACK.medium
  return { response: (t && relTime(t.response_due_at)) || fb[0], resolution: (t && relTime(t.resolution_due_at)) || fb[1] }
})

/* ── DRAFT (localStorage) ── */
const draftKey = computed(() => `sd.intake.draft.${isAgent.value ? 'agent' : 'self'}`)
const saveOpen = ref(false); const draftName = ref(''); const draftNotes = ref('')
const showRestore = ref(false); const draftMeta = ref(null)
const openSaveDraft = () => { draftName.value = form.subject ? form.subject.slice(0, 60) : ''; saveOpen.value = true }
const confirmSaveDraft = () => {
  try { localStorage.setItem(draftKey.value, JSON.stringify({ form: { ...form }, name: draftName.value || null, notes: draftNotes.value || null, savedAt: Date.now() })); toast.success('Draft saved locally', { timeout: 1600 }) }
  catch { toast.error('Could not save draft') }
  saveOpen.value = false
}
const restoreDraft = () => {
  try { const d = JSON.parse(localStorage.getItem(draftKey.value)); if (d?.form) { Object.assign(form, blank(), d.form); nextTick(autoGrow) } } catch { /* corrupt */ }
  showRestore.value = false
}
const dismissRestore = () => { showRestore.value = false }

/* ── discard (ultra-modern confirm, with a reason) ── */
const discardOpen = ref(false)
const discardReason = ref('')
const DISCARD_REASONS = ['Created by mistake', 'Starting over', 'Wrong details entered', 'Duplicate of another ticket', 'No longer needed']
const openDiscard = () => {
  // Nothing entered yet → just reset silently, no ceremony.
  if (!form.subject && !form.description && !form.category_id && !form.organization_id && !form.attachments.length) { doDiscard(); return }
  discardReason.value = ''; discardOpen.value = true
}
const doDiscard = () => {
  resetForm(); error.value = ''
  try { localStorage.removeItem(draftKey.value) } catch { /* private */ }
  draftMeta.value = null; showRestore.value = false; goStep(0); reached.value = 0
}
const confirmDiscard = () => { doDiscard(); discardOpen.value = false; toast.info('Draft discarded', { timeout: 1400 }) }

/* ── submit ── */
const submit = async () => {
  // Final guard — bounce back to the first step that isn't satisfied (covers jumping
  // straight to Review via the step conduit after clearing a field).
  if (!step1Valid.value) { goStep(stepKeys.value.indexOf('requester')); blockStep('Add a contact name to continue.'); return }
  if (!subjectOk.value) { goStep(stepKeys.value.indexOf('describe')); blockStep('A subject of at least 3 characters is required.'); return }
  if (!descOk.value) { goStep(stepKeys.value.indexOf('describe')); blockStep(`Add a description of at least ${REQUIRED_DESC_LEN} characters.`); return }
  if (selfTeamBlocked.value) { goStep(stepKeys.value.indexOf('describe')); blockStep(selfBlockMsg.value); return }
  if (!step3Valid.value) { goStep(stepKeys.value.indexOf('classify')); blockStep(!form.category_id ? 'Pick a category to continue.' : 'Plot impact × urgency to set the priority.'); return }
  if (managerAgentBlocked.value) { goStep(stepKeys.value.indexOf('routing')); blockStep('The agent you assigned isn’t on a team that handles this request type.'); return }
  saving.value = true; error.value = ''
  try {
    const common = {
      subject: form.subject.trim(),
      description: form.description.trim() || undefined,
      ticket_type: form.ticket_type, priority: form.priority,
      impact: form.impact || undefined, urgency: form.urgency || undefined,
      category_id: form.category_id || undefined, subcategory_id: form.subcategory_id || undefined,
      tags: form.tags.length ? form.tags : undefined,
      attachments: form.attachments.length ? form.attachments : undefined,
    }
    // One rich payload for both endpoints. createTicket (agent) reads assigned_agent_id +
    // team_id; createMyTicket (self) forces raised_by=me, honours assign_me, and now
    // persists org/contact/source/impact too — so the requester info is never dropped.
    const payload = {
      ...common, source: form.source || 'portal',
      organization_id: form.organization_id || undefined,
      contact_name: form.contact_name || undefined,
      contact_email: form.contact_email || undefined,
      contact_phone: form.contact_phone || undefined,
      department: form.department || undefined,
      location: form.location || undefined,
      sla_package_id: form.sla_package_id || undefined,
      business_impact: form.business_impact || undefined,
      affected_users: (form.affected_users || form.affected_users === 0) ? form.affected_users : undefined,
      revenue_impact: form.revenue_impact || undefined,
      vendor_name: form.vendor_name || undefined,
      linked_change_id: form.linked_change_id || undefined,
      linked_problem_id: form.linked_problem_id || undefined,
      assign_me: !!form.assign_me,
      template_id: appliedTemplateId.value || undefined,
    }
    // Agents AND reporting managers may route/assign — send their picks so a manager's
    // assignee isn't silently dropped (the self endpoint now honours + validates it).
    if (isAgent.value || isManager.value) {
      payload.team_id = form.team_id || undefined
      payload.assigned_agent_id = form.assign_me && me.value.id ? me.value.id : (form.assigned_agent_id || undefined)
    }
    // Agent-only extras: registered customer binding + CC/watchers (the self endpoint
    // doesn't accept these — employees add collaborators from the drawer after creation).
    if (isAgent.value) {
      payload.customer_id = form.customer_id || undefined
      payload.collaborators = form.collaborators.length ? [...form.collaborators] : undefined
    }
    const created = isAgent.value ? await createTicket(payload) : await createMyTicket(payload)
    done.value = created
    confirmOpen.value = true
    try { localStorage.removeItem(draftKey.value) } catch { /* private */ }
    emit('changed')
  } catch (e) {
    error.value = e?.response?.data?.detail || 'Failed to create the ticket. Please try again.'
    goStep(stepKeys.value.indexOf('review'))
  } finally { saving.value = false }
}

/* ── confirmation ── */
const confirmOpen = ref(false)
const closeConfirm = () => { confirmOpen.value = false }
const createAnother = () => { confirmOpen.value = false; done.value = null; resetForm(); goStep(0); reached.value = 0 }
const viewMyTickets = () => { confirmOpen.value = false; router.push(`${base.value}/tickets/my`) }
const goTicket = () => { router.push(`${base.value}/tickets/my`) }
const goArticle = () => { router.push(`${base.value}/knowledge-base/browse`) }

/* ── hero height → drives the no-scroll stage ── */
const rootEl = ref(null); const heroEl = ref(null)
const heroH = ref(220)
let ro = null

/* ── lifecycle ── */
onMounted(async () => {
  loadPickers()
  listMyTickets({ page: 1, limit: 20 }).then(r => { recent.value = r?.items || [] }).catch(() => {})

  // Resolve capabilities + identity together, THEN decide the contact prefill. Step 1 is
  // the REQUESTER (end client). For an AGENT raising on a client's behalf we must NOT seed
  // contact with the agent's own name/email — they type the client's contact. Only a
  // self-service requester (who IS the requester) gets their identity prefilled. Awaiting
  // caps first avoids the race where an agent is briefly treated as 'self' and seeded.
  const [, m] = await Promise.all([
    fetchCapabilities().then(() => loadRoutingPickers()).catch(() => {}),
    getMe().catch(() => null),
  ])
  if (m) {
    me.value = { id: m?.id || null, name: m?.full_name || m?.name || '', email: m?.email || '', role: m?.designation || m?.job_title || m?.role || '', department: m?.department || '' }
    if (!isAgent.value) {
      if (!form.contact_name) form.contact_name = me.value.name
      if (!form.contact_email) form.contact_email = me.value.email
    }
  }

  // Copperplate Studio deep link: ?template=<id> prefills the intake. The apply
  // endpoint counts ONE strike server-side, so the param is stripped immediately
  // (router.replace) — a refresh can never double-count. Only the admin studio
  // emits this link; without the param this whole block is inert.
  let templateApplied = false
  const tplId = route.query.template
  if (tplId) {
    router.replace({ query: { ...route.query, template: undefined } })
    try {
      const t = await applyTemplate(tplId)
      const ctx = {
        'requester.name': !isAgent.value ? me.value.name : '',
        'requester.email': !isAgent.value ? me.value.email : '',
        'requester.department': !isAgent.value ? me.value.department : '',
        'agent.name': isAgent.value ? me.value.name : '',
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      if (t.ticket_type && TICKET_TYPES.some(x => x.value === t.ticket_type)) form.ticket_type = t.ticket_type
      if (t.subject) form.subject = substituteTemplate(t.subject, ctx)
      let desc = t.body ? substituteTemplate(t.body, ctx) : ''
      const steps = (t.checklist || []).map(c => c?.text).filter(Boolean)
      if (steps.length) desc += `${desc ? '\n\n' : ''}Checklist:\n${steps.map(s => `- [ ] ${s}`).join('\n')}`
      if (desc) form.description = desc
      if (t.priority && PRIORITIES.some(x => x.value === t.priority)) setPriority(t.priority)
      if (t.category_id) form.category_id = String(t.category_id)
      if ((t.tags || []).length) form.tags = t.tags.slice(0, 8)
      if (isAgent.value || isManager.value) {
        if (t.team_id) form.team_id = String(t.team_id)
        if (t.default_sla_package_id) form.sla_package_id = String(t.default_sla_package_id)
        if (t.default_assignee_id) form.assigned_agent_id = String(t.default_assignee_id)
      }
      appliedTemplateId.value = t.template_id
      templateApplied = true
      toast.success(`Template applied — ${t.name}`, { timeout: 2200 })
      nextTick(autoGrow)
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Template could not be applied — starting blank.')
    }
  }

  // saved draft? (after caps so draftKey resolves to the right agent/self bucket).
  // Suppressed when a template just prefilled the form — the plate wins this mount.
  if (!templateApplied) {
    try { const d = JSON.parse(localStorage.getItem(draftKey.value) || 'null'); if (d?.form?.subject || d?.form?.description) { draftMeta.value = d; showRestore.value = true } } catch { /* none */ }
  }

  await nextTick()
  if (heroEl.value && 'ResizeObserver' in window) {
    ro = new ResizeObserver(() => { heroH.value = heroEl.value?.offsetHeight || 220 })
    ro.observe(heroEl.value)
  }
})
onBeforeUnmount(() => { ro?.disconnect(); clearTimeout(reqTypeTimer) })

// Routing/related pickers: agents get the full desk; non-agent managers get their scope.
const loadRoutingPickers = () => {
  if (isAgent.value) {
    listTeams().then(r => { teamList.value = r?.items || r || [] }).catch(() => {})
    listSupportAgents().then(r => { agentList.value = r?.items || r || [] }).catch(() => {})
    listChangeRequests({ page: 1, limit: 50 }).then(r => { changeList.value = r?.items || r || [] }).catch(() => {})
    listProblems({ page: 1, limit: 50 }).then(r => { problemList.value = r?.items || r || [] }).catch(() => {})
  } else if (isManager.value) {
    listMyTeams().then(r => { teamList.value = r || [] }).catch(() => {})
    listMyTeam().then(r => { agentList.value = r || [] }).catch(() => {})
  }
}
</script>

<style scoped>
/* The page sits DIRECTLY on the app background — no support-canvas tint. The support
   workspace shell is viewport-locked, so THIS page owns its own vertical scroll (hero →
   full-width stage → credential/intelligence deck) rather than clipping. */
.itk { --nav-h: 52px; position: relative; padding: 2px 2px 8px; color: var(--sd-text); }

/* restore banner */
.itk-restore { display: flex; align-items: center; gap: 10px; padding: 11px 15px; border-radius: 13px; margin-bottom: 14px; font-size: 13px; color: var(--sd-text-secondary); background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); position: relative; z-index: 1; }
.itk-restore i { font-style: normal; color: var(--sd-text); font-weight: 600; }
.itk-restore svg { color: var(--sd-amber); flex-shrink: 0; }
.rs-btn { margin-left: auto; padding: 6px 13px; border-radius: 9px; font-size: 12px; font-weight: 700; cursor: pointer; border: none; color: #1a1206; background: var(--sd-grad-hero); font-family: inherit; }
[data-theme="light"] .rs-btn { color: #fff8ec; }
.rs-btn.ghost { margin-left: 0; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border-strong); }

/* ── body — ONE full-width step stage; the intelligence is woven INTO the steps
   (Signal Prism inside Describe, banner inside Classify, digest inside Review).
   Fits the viewport; the step content scrolls internally, never the page. ── */
.itk-body { position: relative; z-index: 1; display: grid; grid-template-columns: minmax(0, 1fr); align-items: stretch;
  height: calc(100vh - var(--nav-h) - var(--hero-h, 240px) - 48px); min-height: 440px; }
.itk-stage { animation: itk-rise 0.5s var(--sd-spring) both; }
@keyframes itk-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

/* full-width steps read better with a measured line length + two-column room */
.itk-step { max-width: 1060px; width: 100%; margin: 0 auto; }
.itk-banner { margin-bottom: 14px; }
.itk-digest { margin-bottom: 14px; }

/* ── ultra-modern scrollbars (scoped to this page's scroll surfaces) ── */
.itk-step-wrap, .itk-aside, .itk :deep(.sd-select-pop) { scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--sd-amber) 55%, transparent) transparent; }
.itk-step-wrap::-webkit-scrollbar, .itk-aside::-webkit-scrollbar, .itk :deep(.sd-select-pop)::-webkit-scrollbar { width: 9px; height: 9px; }
.itk-step-wrap::-webkit-scrollbar-track, .itk-aside::-webkit-scrollbar-track, .itk :deep(.sd-select-pop)::-webkit-scrollbar-track { background: transparent; margin: 6px 0; }
.itk-step-wrap::-webkit-scrollbar-thumb, .itk-aside::-webkit-scrollbar-thumb, .itk :deep(.sd-select-pop)::-webkit-scrollbar-thumb {
  border-radius: 999px; border: 2px solid transparent; background-clip: padding-box;
  background-color: color-mix(in srgb, var(--sd-ember) 55%, transparent);
  transition: background-color 0.2s;
}
.itk-step-wrap:hover::-webkit-scrollbar-thumb, .itk-aside:hover::-webkit-scrollbar-thumb { background-color: color-mix(in srgb, var(--sd-amber) 72%, transparent); }
.itk-step-wrap::-webkit-scrollbar-thumb:hover, .itk-aside::-webkit-scrollbar-thumb:hover { background-color: var(--sd-amber); }

/* center stage — the focal step card; content scrolls internally if a step is tall */
.itk-stage { position: relative; display: flex; flex-direction: column; min-width: 0; min-height: 0; border-radius: 20px; background: var(--sd-surface); border: 1px solid var(--sd-border); box-shadow: var(--sd-card-shadow); overflow: hidden; }
.itk-stage::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: var(--sd-grad-card); opacity: 0.5; }
.itk-step-wrap { position: relative; flex: 1; min-height: 0; padding: 24px 26px; overflow-y: auto; }
.itk-step { display: flex; flex-direction: column; }

/* field cascade — every step's controls deal in like cards (replays per step because
   Presence mode="wait" remounts the step) */
.itk-step > * { animation: itk-field-in 0.5s var(--sd-spring) both; }
.itk-step > *:nth-child(1) { animation-delay: 0.03s; } .itk-step > *:nth-child(2) { animation-delay: 0.08s; }
.itk-step > *:nth-child(3) { animation-delay: 0.13s; } .itk-step > *:nth-child(4) { animation-delay: 0.18s; }
.itk-step > *:nth-child(5) { animation-delay: 0.23s; } .itk-step > *:nth-child(6) { animation-delay: 0.28s; }
.itk-step > *:nth-child(7) { animation-delay: 0.33s; } .itk-step > *:nth-child(n+8) { animation-delay: 0.38s; }
@keyframes itk-field-in { from { opacity: 0; transform: translateY(12px) scale(0.995); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .itk-step > *,
  html:not([data-cinematic="on"]) .step-head::after,
  html:not([data-cinematic="on"]) .step-no { animation: none; }
}

/* left cards */
.itk-next { padding: 14px 15px; }
.itk-next h4 { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 750; letter-spacing: 0.04em; text-transform: uppercase; color: var(--sd-text-muted); margin: 0 0 11px; }
.itk-next h4 svg { color: var(--sd-amber); }
.itk-next ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 9px; }
.itk-next li { display: flex; align-items: center; gap: 9px; font-size: 12px; color: var(--sd-text-secondary); }
.itk-next li svg { color: var(--sd-text-dim); flex-shrink: 0; }

/* step header — the number tile pops in, a hairline sweep draws under the title */
.step-head { position: relative; display: flex; align-items: center; gap: 13px; margin-bottom: 18px; padding-bottom: 12px; }
.step-head::after { content: ""; position: absolute; left: 0; bottom: 0; height: 1.5px; width: 100%; border-radius: 2px;
  background: linear-gradient(90deg, var(--sd-amber-border), transparent 70%);
  transform-origin: left; animation: itk-sweep 0.7s 0.1s var(--sd-spring) both; }
@keyframes itk-sweep { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.step-no { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px; font-family: var(--sd-mono); font-size: 13px; font-weight: 800; color: var(--sd-amber); background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); flex-shrink: 0; animation: itk-no-pop 0.5s 0.05s var(--sd-spring) both; }
@keyframes itk-no-pop { from { transform: scale(0.7) rotate(-6deg); opacity: 0; } to { transform: scale(1) rotate(0); opacity: 1; } }
.step-head h3 { font-size: 17px; font-weight: 800; color: var(--sd-text); margin: 0; display: flex; align-items: center; gap: 9px; }
.step-head p { font-size: 12.5px; color: var(--sd-text-muted); margin: 1px 0 0; }
.opt-h { font-style: normal; font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--sd-text-dim); padding: 2px 7px; border-radius: 6px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }

/* fields */
.f { display: flex; flex-direction: column; gap: 7px; position: relative; margin-bottom: 14px; }
.f:last-child { margin-bottom: 0; }
.f > label, .f > span, .f-lbl { font-size: 12px; font-weight: 600; color: var(--sd-text-secondary); }
.f em { color: var(--sd-danger); font-style: normal; }
.f .opt { font-style: normal; font-weight: 500; color: var(--sd-text-dim); font-size: 11px; }
.f-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
.f-grid2 .f { margin-bottom: 0; }
.f-in { width: 100%; padding: 11px 13px; border-radius: 11px; font-size: 14px; font-family: inherit; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text); transition: border-color 0.22s, box-shadow 0.22s, transform 0.22s var(--sd-spring), background 0.22s; }
.f-in::placeholder { color: var(--sd-text-dim); transition: opacity 0.2s; }
.f-in:hover { border-color: color-mix(in srgb, var(--sd-amber) 30%, var(--sd-border-strong)); }
.f-in:focus { outline: none; border-color: var(--sd-amber-border); box-shadow: 0 0 0 3px var(--sd-amber-soft), 0 10px 26px -14px color-mix(in srgb, var(--sd-amber) 45%, transparent); transform: translateY(-1px); background: var(--sd-surface); }
.f-in:focus::placeholder { opacity: 0.55; }
/* the field LABEL ignites while its input holds focus */
.f:focus-within > label, .f:focus-within > span, label.f:focus-within > span { color: var(--sd-amber); }
.f em { display: inline-block; transition: transform 0.2s var(--sd-spring); }
.f:focus-within em { transform: scale(1.25); }
.f-area { resize: vertical; line-height: 1.55; min-height: 96px; }
.f-subj { position: relative; }
.f-count { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 10px; font-family: var(--sd-mono); color: var(--sd-text-dim); pointer-events: none; }
.f-count.warn { color: var(--sd-warning); }

/* client banner */
.client-banner { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 13px; margin-bottom: 14px; background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); overflow: hidden; }
.cb-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; color: #1a1206; background: var(--sd-grad-hero); flex-shrink: 0; }
[data-theme="light"] .cb-ic { color: #fff8ec; }
.cb-b { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.cb-eyebrow { font-family: var(--sd-mono); font-size: 8.5px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-text-muted); }
.cb-name { font-size: 14.5px; font-weight: 800; color: var(--sd-text); }
.cb-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
.cb-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 600; color: var(--sd-text-secondary); padding: 2px 8px; border-radius: 999px; background: var(--sd-surface); border: 1px solid var(--sd-border); }
.cb-stamp { display: inline-flex; align-items: center; gap: 4px; align-self: flex-start; font-family: var(--sd-mono); font-size: 8.5px; font-weight: 800; letter-spacing: 0.08em; color: var(--sd-amber); padding: 3px 7px; border-radius: 6px; background: var(--sd-surface); border: 1px solid var(--sd-amber-border); }

.req-strip { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 13px; margin-bottom: 14px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.req-strip .rq-ava { width: 40px; height: 40px; border-radius: 11px; font-size: 15px; }

.req-card { display: flex; align-items: center; gap: 14px; padding: 16px 17px; border-radius: 14px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); }
.rq-ava { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 14px; font-weight: 800; font-size: 17px; color: #1a1206; background: var(--sd-grad-hero); flex-shrink: 0; }
[data-theme="light"] .rq-ava { color: #fff8ec; }
.rq-b { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
.rq-name { font-size: 15px; font-weight: 750; color: var(--sd-text); }
.rq-mail { font-size: 12px; color: var(--sd-text-muted); }
.rq-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.rq-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: var(--sd-text-secondary); padding: 3px 9px; border-radius: 999px; background: var(--sd-surface); border: 1px solid var(--sd-border); }
.rq-stamp { display: inline-flex; align-items: center; gap: 5px; align-self: flex-start; font-size: 10.5px; font-weight: 700; color: var(--sd-success); padding: 5px 10px; border-radius: 8px; background: var(--sd-success-soft); border: 1px solid color-mix(in srgb, var(--sd-success) 30%, transparent); }

/* type chips */
.type-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(96px, 1fr)); gap: 9px; }
.type-chip { display: flex; flex-direction: column; align-items: center; gap: 7px; padding: 13px 8px; border-radius: 13px; cursor: pointer; font-family: inherit; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); transition: all 0.2s var(--sd-spring); }
.type-chip:hover { border-color: var(--sd-amber-border); transform: translateY(-2px); }
.type-chip.on { border-color: transparent; background: var(--sd-amber-soft); box-shadow: 0 0 0 1.5px var(--sd-amber-border) inset; }
.tc-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; color: var(--sd-amber); background: color-mix(in srgb, var(--sd-amber) 12%, transparent); }
.type-chip.on .tc-ic { color: #1a1206; background: var(--sd-grad-hero); }
[data-theme="light"] .type-chip.on .tc-ic { color: #fff8ec; }
.tc-lbl { font-size: 11px; font-weight: 600; color: var(--sd-text-secondary); text-align: center; line-height: 1.2; }
.type-chip.on .tc-lbl { color: var(--sd-text); }

/* priority / impact bar */
.pri-bar { display: flex; gap: 7px; }
.pri-seg { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 4px; border-radius: 11px; cursor: pointer; font-family: inherit; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); transition: all 0.2s var(--sd-spring); }
.pri-seg:hover { border-color: color-mix(in srgb, var(--pc) 45%, transparent); transform: translateY(-1px); }
.pri-seg.on { background: color-mix(in srgb, var(--pc) 14%, transparent); border-color: color-mix(in srgb, var(--pc) 55%, transparent); }
.pri-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--pc); box-shadow: 0 0 8px color-mix(in srgb, var(--pc) 55%, transparent); }
.pri-l { font-size: 10.5px; font-weight: 700; color: var(--sd-text-muted); }
.pri-seg.on .pri-l { color: var(--sd-text); }

/* dropzone + tags */
.dropzone { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 22px; border-radius: 13px; cursor: pointer; font-size: 12.5px; color: var(--sd-text-muted); background: var(--sd-surface-glass); border: 1.5px dashed var(--sd-border-strong); transition: all 0.2s var(--sd-spring); }
.dropzone:hover, .dropzone.drag { border-color: var(--sd-amber-border); color: var(--sd-text-secondary); background: var(--sd-amber-soft); }
.dropzone.drag { transform: scale(1.01); }
.dropzone.busy { pointer-events: none; opacity: 0.7; }
.dropzone svg { color: var(--sd-amber); }
.dz-in { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.dropzone .spin { animation: sd-spin-slow 1s linear infinite; }
.att-list { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 11px; }
.att { display: inline-flex; align-items: center; gap: 6px; padding: 6px 7px 6px 11px; border-radius: 9px; font-size: 11.5px; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border); max-width: 100%; }
.att i { font-style: normal; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px; }
.att button { display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%; border: none; cursor: pointer; color: var(--sd-text-muted); background: var(--sd-border-strong); flex-shrink: 0; }
.att button:hover { color: var(--sd-danger); }
.att-err { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--sd-danger); margin: 8px 0 0; }
.tagbox { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 9px 11px; border-radius: 11px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); }
.tagbox.focused { border-color: var(--sd-amber-border); box-shadow: 0 0 0 3px var(--sd-amber-soft); }
.tag { display: inline-flex; align-items: center; gap: 4px; padding: 3px 4px 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; color: var(--sd-amber); background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); }
.tag button { display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%; border: none; cursor: pointer; color: var(--sd-amber); background: color-mix(in srgb, var(--sd-amber) 18%, transparent); }
.tag-in { flex: 1; min-width: 100px; background: none; border: none; outline: none; color: var(--sd-text); font-size: 13.5px; font-family: inherit; padding: 4px 2px; }

/* review */
.rev { list-style: none; margin: 0 0 15px; padding: 0; display: flex; flex-direction: column; gap: 1px; border-radius: 13px; overflow: hidden; border: 1px solid var(--sd-border); }
.rev li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 15px; background: var(--sd-surface-glass); font-size: 13px; }
.rev li span { display: inline-flex; align-items: center; gap: 8px; color: var(--sd-text-muted); }
.rev li b { color: var(--sd-text); font-weight: 700; text-align: right; }
.itk-err { display: flex; align-items: center; gap: 7px; color: var(--sd-danger); font-size: 12.5px; margin: 0 0 12px; padding: 10px 13px; border-radius: 10px; background: var(--sd-danger-soft); }
.itk-submit { display: flex; align-items: center; justify-content: center; gap: 9px; width: 100%; padding: 15px; border-radius: 14px; font-size: 15px; font-weight: 800; cursor: pointer; font-family: inherit; border: none; color: #1a1206; background: var(--sd-grad-hero); box-shadow: 0 14px 34px rgba(251, 146, 60, 0.34); }
[data-theme="light"] .itk-submit { color: #fff8ec; }
.itk-submit.off { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.itk-submit .spin { animation: sd-spin-slow 0.9s linear infinite; }
.itk-fine { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--sd-text-dim); margin: 12px 0 0; justify-content: center; }

/* inline step gate — cinematic danger banner */
.itk-step-err { position: relative; display: flex; align-items: center; gap: 13px; overflow: hidden; margin: 0 18px 4px; padding: 14px 16px; border-radius: 15px; background: var(--sd-danger-soft); border: 1px solid color-mix(in srgb, var(--sd-danger) 38%, transparent); box-shadow: 0 12px 30px color-mix(in srgb, var(--sd-danger) 16%, transparent); }
.se-glow { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(62% 130% at 5% 50%, color-mix(in srgb, var(--sd-danger) 20%, transparent), transparent 68%); animation: se-pulse 2.4s ease-in-out infinite; }
.se-ic { position: relative; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; color: var(--sd-danger); background: color-mix(in srgb, var(--sd-danger) 16%, transparent); border: 1px solid color-mix(in srgb, var(--sd-danger) 34%, transparent); flex-shrink: 0; }
.se-ic::after { content: ''; position: absolute; inset: -1px; border-radius: 12px; box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-danger) 45%, transparent); animation: se-ring 2.2s ease-out infinite; }
.se-b { position: relative; display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.se-h { font-size: 13.5px; font-weight: 800; letter-spacing: -0.01em; color: var(--sd-danger); }
.se-p { font-size: 12px; line-height: 1.5; color: var(--sd-text-secondary); }
.se-badge { position: relative; display: inline-flex; align-items: center; gap: 5px; align-self: flex-start; font-family: var(--sd-mono); font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--sd-danger); padding: 4px 9px; border-radius: 8px; background: color-mix(in srgb, var(--sd-danger) 12%, transparent); border: 1px solid color-mix(in srgb, var(--sd-danger) 30%, transparent); flex-shrink: 0; white-space: nowrap; }
@keyframes se-pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.85; } }
@keyframes se-ring { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-danger) 42%, transparent); } 70%, 100% { box-shadow: 0 0 0 9px transparent; } }
@media (prefers-reduced-motion: reduce) { html:not([data-cinematic="on"]) .se-glow, html:not([data-cinematic="on"]) .se-ic::after { animation: none; } }
@media (max-width: 560px) { .se-badge { display: none; } }

/* nav footer */
.itk-nav { display: flex; align-items: center; gap: 12px; padding: 13px 18px; border-top: 1px solid var(--sd-border); background: color-mix(in srgb, var(--sd-surface-glass) 70%, transparent); flex-shrink: 0; }
.nav-count { font-size: 11.5px; font-weight: 700; color: var(--sd-text-muted); margin: 0 auto; }
.nav-count i { font-style: normal; color: var(--sd-text-dim); font-weight: 500; }
.nav-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface-glass); color: var(--sd-text-secondary); transition: all 0.2s var(--sd-spring); }
.nav-btn.ghost:hover { color: var(--sd-text); border-color: var(--sd-amber-border); }
.nav-btn.ghost.off { opacity: 0.4; cursor: not-allowed; }
.nav-btn.primary { border: none; color: #1a1206; background: var(--sd-grad-hero); box-shadow: 0 8px 20px rgba(251, 146, 60, 0.26); }
[data-theme="light"] .nav-btn.primary { color: #fff8ec; }
.nav-btn.primary.off { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.nav-btn:disabled { cursor: not-allowed; }
.nav-btn .spin { animation: sd-spin-slow 0.9s linear infinite; }

/* modals */
.dm { display: flex; flex-direction: column; gap: 14px; }
.dm-note { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--sd-text-dim); margin: 0; }
.sh-like-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text-secondary); }
.sh-like-btn.ghost:hover { color: var(--sd-text); border-color: var(--sd-amber-border); }
.sh-like-btn.primary { border: none; color: #1a1206; background: var(--sd-grad-hero); }
[data-theme="light"] .sh-like-btn.primary { color: #fff8ec; }
.sh-like-btn.danger { border: none; color: #fff; background: linear-gradient(135deg, var(--sd-danger), color-mix(in srgb, var(--sd-danger) 70%, #7f1d1d)); box-shadow: 0 8px 20px color-mix(in srgb, var(--sd-danger) 32%, transparent); }

/* discard modal */
.dk { display: flex; flex-direction: column; gap: 15px; }
.dk-hero { position: relative; align-self: center; display: grid; place-items: center; width: 72px; height: 72px; margin: 4px 0 2px; }
.dk-rings { position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid color-mix(in srgb, var(--sd-danger) 40%, transparent); animation: dk-ring 2.2s var(--sd-spring) infinite; }
.dk-ic { display: grid; place-items: center; width: 56px; height: 56px; border-radius: 18px; color: var(--sd-danger); background: var(--sd-danger-soft); border: 1px solid color-mix(in srgb, var(--sd-danger) 32%, transparent); }
@keyframes dk-ring { 0% { transform: scale(0.8); opacity: 0.8; } 100% { transform: scale(1.5); opacity: 0; } }
.dk-lead { font-size: 13px; line-height: 1.6; color: var(--sd-text-secondary); margin: 0; text-align: center; }
.dk-reasons { display: flex; flex-direction: column; gap: 8px; }
.dk-rlbl { font-size: 12px; font-weight: 600; color: var(--sd-text-secondary); }
.dk-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.dk-chip { padding: 7px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); transition: all 0.18s var(--sd-spring); }
.dk-chip:hover { border-color: color-mix(in srgb, var(--sd-danger) 40%, transparent); color: var(--sd-text); }
.dk-chip.on { color: var(--sd-danger); background: var(--sd-danger-soft); border-color: color-mix(in srgb, var(--sd-danger) 45%, transparent); }
.dk-flow { list-style: none; margin: 0; padding: 12px 14px; display: grid; gap: 8px; border-radius: 12px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.dk-flow li { display: flex; align-items: center; gap: 9px; font-size: 12px; color: var(--sd-text-muted); }
.dk-flow li svg { color: var(--sd-text-dim); flex-shrink: 0; }
@media (prefers-reduced-motion: reduce) { html:not([data-cinematic="on"]) .dk-rings { animation: none; } }
.cf { display: flex; flex-direction: column; gap: 18px; }
.cf-hero { position: relative; display: flex; flex-direction: column; align-items: center; gap: 7px; padding: 14px 0 4px; text-align: center; }
.cf-burst { position: absolute; top: 8px; width: 90px; height: 90px; border-radius: 50%; background: radial-gradient(circle, var(--sd-success-soft), transparent 70%); animation: cf-burst 1s var(--sd-ease) 1; }
.cf-ic { display: grid; place-items: center; width: 60px; height: 60px; border-radius: 18px; color: var(--sd-success); background: var(--sd-success-soft); border: 1px solid color-mix(in srgb, var(--sd-success) 30%, transparent); position: relative; }
.cf-no { font-size: 17px; font-weight: 800; color: var(--sd-text); letter-spacing: 0.06em; margin-top: 4px; }
.cf-subj { font-size: 13px; color: var(--sd-text-secondary); max-width: 90%; }
.cf-grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 1px; border-radius: 13px; overflow: hidden; border: 1px solid var(--sd-border); }
.cf-grid li { display: flex; flex-direction: column; gap: 3px; padding: 11px 14px; background: var(--sd-surface-glass); }
.cf-grid li.wide { grid-column: 1 / -1; }
.cf-grid li span { font-size: 10.5px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--sd-text-muted); }
.cf-grid li b { font-size: 13.5px; font-weight: 750; color: var(--sd-text); }
@keyframes cf-burst { 0% { opacity: 0.8; transform: scale(0.4); } 100% { opacity: 0; transform: scale(1.8); } }

/* ── responsive ── */
@media (max-width: 1040px) {
  .itk-body { height: auto; }
  .itk-stage { min-height: 440px; }
}
@media (max-width: 620px) { .f-grid2 { grid-template-columns: 1fr; } .itk-step-wrap { padding: 20px 18px; } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .cf-burst { animation: none; }
  html:not([data-cinematic="on"]) .itk-stage { animation: none; }
  html:not([data-cinematic="on"]) .dropzone .spin, html:not([data-cinematic="on"]) .itk-submit .spin, html:not([data-cinematic="on"]) .nav-btn .spin { animation: sd-spin-slow 1s linear infinite; }
}
</style>
