<template>
  <aside class="sd-cop">
    <span class="cop-grain" aria-hidden="true" />

    <!-- header: a live "intelligence" scanner -->
    <header class="cop-head">
      <span class="cop-orb" :class="{ scan: scanning }">
        <Sparkles :size="15" />
        <span class="orb-ring" aria-hidden="true" />
      </span>
      <div class="cop-head-txt">
        <b>Intake Intelligence</b>
        <i>{{ scanning ? 'Analysing your request…' : engaged ? 'Live read of your ticket' : 'Standing by' }}</i>
      </div>
      <span class="cop-beam" :class="{ on: scanning }" aria-hidden="true" />
    </header>

    <div class="cop-body">
      <!-- idle -->
      <div v-if="!engaged" class="cop-idle">
        <span class="idle-mote" aria-hidden="true" /><span class="idle-mote m2" aria-hidden="true" /><span class="idle-mote m3" aria-hidden="true" />
        <Radar :size="26" />
        <p>Start describing the issue.</p>
        <small>I'll classify it, flag duplicates, surface known fixes, and forecast the SLA — live.</small>
      </div>

      <template v-else>
        <!-- CLASSIFICATION -->
        <Motion as="section" class="cop-card" :initial="card0" :animate="card1" :transition="ft(0)">
          <h5><BrainCircuit :size="13" /> Classification</h5>
          <div class="cls-grid">
            <button class="cls-row" :class="{ diff: sugType && sugType !== ticketType }" @click="sugType && sugType !== ticketType && emitApply({ ticket_type: sugType })">
              <span class="cls-k">Type</span>
              <span class="cls-v">{{ typeLabel(sugType || ticketType) }}</span>
              <span v-if="sugType && sugType !== ticketType" class="cls-apply">Apply</span>
            </button>
            <button class="cls-row" :class="{ diff: sugPriority && sugPriority !== priority }" @click="sugPriority && sugPriority !== priority && emitApply({ priority: sugPriority })">
              <span class="cls-k">Priority</span>
              <span class="cls-v" :style="{ color: priColor(sugPriority || priority) }"><i class="cls-dot" :style="{ background: priColor(sugPriority || priority) }" />{{ priLabel(sugPriority || priority) }}</span>
              <span v-if="sugPriority && sugPriority !== priority" class="cls-apply">Apply</span>
            </button>
            <button v-if="sugCategory" class="cls-row" :class="{ diff: sugCategory.id !== categoryId }" @click="sugCategory.id !== categoryId && emitApply({ category_id: sugCategory.id })">
              <span class="cls-k">Category</span>
              <span class="cls-v">{{ sugCategory.name }}</span>
              <span v-if="sugCategory.id !== categoryId" class="cls-apply">Apply</span>
            </button>
          </div>
          <div v-if="keywords.length" class="cls-tags">
            <span v-for="k in keywords" :key="k" class="cls-tag">{{ k }}</span>
          </div>
        </Motion>

        <!-- SENTIMENT -->
        <Motion as="section" class="cop-card" :initial="card0" :animate="card1" :transition="ft(1)">
          <h5><Activity :size="13" /> Sentiment</h5>
          <div class="snt">
            <span class="snt-face" :style="{ '--sc': sentiment.color }">{{ sentiment.emoji }}</span>
            <div class="snt-body">
              <div class="snt-meter"><span class="snt-fill" :style="{ width: sentiment.pct + '%', background: sentiment.color }" /><span class="snt-needle" :style="{ left: sentiment.pct + '%' }" /></div>
              <span class="snt-lbl" :style="{ color: sentiment.color }">{{ sentiment.label }}</span>
            </div>
          </div>
        </Motion>

        <!-- DUPLICATES -->
        <Motion v-if="duplicates.length" as="section" class="cop-card warn" :initial="card0" :animate="card1" :transition="ft(2)">
          <h5><CopyCheck :size="13" /> Possible duplicates <span class="cnt">{{ duplicates.length }}</span></h5>
          <button v-for="d in duplicates" :key="d.id" class="dup" @click="$emit('open', d.id)">
            <span class="dup-sim" :style="{ '--s': d.sim }">{{ Math.round(d.sim * 100) }}%</span>
            <span class="dup-body">
              <span class="dup-subj">{{ d.subject }}</span>
              <span class="dup-meta sd-mono">{{ d.ticket_number }} · {{ statusLabel(d.status) }}</span>
            </span>
            <ArrowUpRight :size="13" class="dup-go" />
          </button>
        </Motion>

        <!-- KNOWLEDGE -->
        <Motion as="section" class="cop-card" :initial="card0" :animate="card1" :transition="ft(3)">
          <h5><BookOpen :size="13" /> Knowledge that may help <span v-if="kbLoading" class="kb-spin"><Loader2 :size="11" /></span></h5>
          <template v-if="articles.length">
            <button v-for="a in articles" :key="a.id" class="kb" @click="$emit('article', a)">
              <span class="kb-ic"><FileText :size="14" /></span>
              <span class="kb-body">
                <span class="kb-title">{{ a.title }}</span>
                <span v-if="a.category_name || a.excerpt" class="kb-sub">{{ a.category_name || excerptOf(a) }}</span>
              </span>
              <ArrowUpRight :size="12" class="kb-go" />
            </button>
            <p class="kb-hint"><Lightbulb :size="11" /> A known fix could resolve this without waiting on an agent.</p>
          </template>
          <p v-else-if="!kbLoading" class="cop-empty">No matching articles yet — keep describing the issue.</p>
        </Motion>

        <!-- SLA FORECAST -->
        <Motion as="section" class="cop-card" :initial="card0" :animate="card1" :transition="ft(4)">
          <h5><Timer :size="13" /> SLA forecast</h5>
          <div class="sla-row">
            <div class="sla-cell"><span class="sla-k">First response</span><b>{{ sla.response }}</b></div>
            <span class="sla-div" />
            <div class="sla-cell"><span class="sla-k">Resolution</span><b>{{ sla.resolution }}</b></div>
          </div>
          <p class="sla-note">Estimated for <b :style="{ color: priColor(priority) }">{{ priLabel(priority) }}</b> — final target is set on submit.</p>
        </Motion>
      </template>
    </div>
  </aside>
</template>

<script setup>
/*
  SdIntakeCopilot — the live "Intake Intelligence" panel.
  Deterministic, client-side heuristics (instant, free, private — matching the
  Support Desk's established heuristics-over-LLM decision) for classification +
  sentiment + duplicate matching, plus REAL knowledge-base suggestions via the
  /me/knowledge-base ?q search, and an SLA forecast. The seam to swap the
  heuristics for an LLM later is the `analyse()` block.
*/
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import {
  Sparkles, Radar, BrainCircuit, Activity, CopyCheck, BookOpen, Timer,
  FileText, ArrowUpRight, Lightbulb, Loader2,
} from 'lucide-vue-next'
import {
  listMyKb, priorityColor, priorityLabel, typeLabel as typeLabelOf, statusLabel,
} from '@/composables/useSupportDesk'

const props = defineProps({
  subject: { type: String, default: '' },
  description: { type: String, default: '' },
  ticketType: { type: String, default: 'incident' },
  priority: { type: String, default: 'medium' },
  categoryId: { type: String, default: '' },
  categories: { type: Array, default: () => [] },   // [{ id, name, parent_id, request_types }]
  recentTickets: { type: Array, default: () => [] },
})
const emit = defineEmits(['apply', 'open', 'article'])

const priColor = (v) => priorityColor(v)
const priLabel = (v) => priorityLabel(v)
const typeLabel = (v) => typeLabelOf(v)
const emitApply = (patch) => emit('apply', patch)

const card0 = { opacity: 0, y: 12 }
const card1 = { opacity: 1, y: 0 }
const ft = (i) => ({ duration: 0.4, delay: 0.04 + i * 0.07, ease: [0.16, 1, 0.3, 1] })

/* ═════════ Language engine — scored, whole-sentence heuristics ═════════
   The old pass was first-match keyword lists ("down" worked; a real sentence
   like "my laptop is not turning on" matched nothing). This engine normalizes
   the text, stems tokens, reads NEGATION + PHRASE patterns spanning the whole
   sentence, and SCORES every candidate verdict — the best one wins, with
   thresholds so weak evidence suggests nothing. Still deterministic and
   client-side (the desk's heuristics-over-LLM decision); the LLM seam stays here. */

const norm = (s) => (s || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"')
const text = computed(() => norm(`${props.subject} ${props.description}`).replace(/\s+/g, ' '))
const engaged = computed(() => (props.subject + props.description).trim().length >= 4)

const STOP = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'have', 'has', 'are', 'was', 'were', 'not', 'but', 'you', 'our', 'can', 'cannot', 'when', 'will', 'from', 'into', 'about', 'there', 'their', 'they', 'how', 'why', 'what', 'please', 'need', 'unable', 'issue', 'problem', 'help', 'getting', 'been', 'being', 'would', 'could', 'should', 'since', 'after', 'before', 'while', 'because', 'also', 'just', 'still', 'very', 'really', 'its', "it's", 'your', 'does', 'did', 'doing', 'due', 'any', 'some', 'all', 'out', 'get', 'got', 'trying', 'tried'])

/* crude-but-safe suffix stemmer so "crashes/crashed/crashing" all read as "crash" */
const stem = (w) => {
  if (!w || w.length <= 3 || /(?:ss|us|is)$/.test(w)) return w
  let x = w.replace(/ies$/, 'y')
  if (/ing$/.test(x) && x.length > 5) x = x.slice(0, -3)
  else if (/ed$/.test(x) && x.length > 4) x = x.slice(0, -2)
  if (/es$/.test(x) && x.length > 4) x = x.slice(0, -2)
  else if (/s$/.test(x) && x.length > 3) x = x.slice(0, -1)
  return x || w
}
const tokens = (s) => (norm(s).match(/[a-z0-9][a-z0-9'-]{1,}/g) || []).map(w => w.replace(/'s$/, ''))
const stems = (s) => tokens(s).map(stem)
const tokSet = computed(() => new Set(stems(text.value)))
const stemLex = (obj) => { const o = {}; for (const [k, v] of Object.entries(obj)) { const s = stem(k); o[s] = Math.max(o[s] || 0, v) } return o }

/* ── keyword extraction — subject-boosted, stem-grouped, salient bigrams ── */
const keywords = computed(() => {
  const counts = {}; const label = {}
  const add = (w, n) => {
    const st = stem(w)
    if (STOP.has(w) || STOP.has(st) || st.length < 3) return
    counts[st] = (counts[st] || 0) + n
    if (!label[st] || w.length < label[st].length) label[st] = w
  }
  for (const w of tokens(props.subject)) add(w, 2)
  for (const w of tokens(props.description)) add(w, 1)
  // bigrams ("vpn connection", "payment gateway") outrank loose unigrams
  const seq = tokens(text.value)
  for (let i = 0; i < seq.length - 1; i++) {
    const a = seq[i], b = seq[i + 1]
    if (STOP.has(a) || STOP.has(b) || a.length < 3 || b.length < 3) continue
    const key = `${stem(a)} ${stem(b)}`
    counts[key] = (counts[key] || 0) + 1.6
    label[key] = `${a} ${b}`
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => label[k])
})

/* ── type engine — negation + phrase patterns, scored across ALL types ── */
const CANT = "(?:can(?:no|')t|cannot|couldn'?t|won'?t|wouldn'?t|doesn'?t|don'?t|didn'?t|isn'?t|aren'?t|wasn'?t|(?:is|are|was|were|does|do|did|will|has|have) not|not able to|unable to|fail(?:s|ing|ed)? to|stopped|no longer|never)"
const FUNC_VERB = "(?:work(?:ing)?|load(?:ing)?|open(?:ing)?|connect(?:ing)?|log ?in(?:g)?|login|sign ?in|access|start(?:ing)?|boot(?:ing)?|launch(?:ing)?|respond(?:ing)?|sync(?:ing)?|send(?:ing)?|receiv(?:e|ing)|sav(?:e|ing)|print(?:ing)?|charg(?:e|ing)|turn(?:ing)? on|power(?:ing)? (?:on|up)|display(?:ing)?|render(?:ing)?|play(?:ing)?|updat(?:e|ing)|submit(?:ting)?|upload(?:ing)?|download(?:ing)?|run(?:ning)?|reach|find|see)"
const TYPE_SIGNALS = {
  incident: {
    phrases: [
      new RegExp(`\\b${CANT}\\s+(?:\\w+\\s+){0,3}?${FUNC_VERB}`),
      /\b(?:is|are|was|were|has been|have been|went|seems?|appears?|keeps? going)\s+(?:\w+\s+){0,2}?(?:down|offline|unavailable|unreachable|unresponsive|inaccessible|dead|frozen|stuck|hanging|broken)\b/,
      /\bnot working\b/, /\bstopped working\b/, /\bquit working\b/,
      /\bno (?:internet|network|connection|access|response|signal|power|display|sound|audio)\b/,
      /\b(?:blank|white|black) (?:screen|page)\b/,
      /\b(?:times? out|timing out|timed out)\b/,
      /\b(?:locked out|logged out and can)/,
    ],
    words: ['down', 'outage', 'offline', 'unavailable', 'unreachable', 'unresponsive', 'crash', 'crashed', 'frozen', 'stuck', 'hang', 'broken', 'dead'],
  },
  bug: {
    phrases: [
      /\b(?:throws?|thrown|getting|got|shows?|showing|returns?|returned|displays?|see(?:ing)?)\s+(?:an?\s+|the\s+)?(?:error|exception|warning|404|500|502|503|blank|wrong|incorrect)\b/,
      /\berror (?:message|code|popup|dialog|screen)\b/,
      /\bwrong (?:result|value|amount|total|data|date|calculation|number|name|status|balance)\b/,
      /\b(?:doesn'?t|not|isn'?t)\s+(?:\w+\s+){0,2}?(?:sav|calculat|updat|reflect|match|align|display)\w*/,
      /\bsteps? to reproduce\b/, /\bexpected .{3,40}(?:but|instead)\b/,
    ],
    words: ['bug', 'error', 'exception', 'glitch', 'incorrect', 'defect', 'mismatch', 'misaligned', 'typo', 'corrupt'],
  },
  service_request: {
    phrases: [
      /\b(?:need|needs?|request(?:ing)?|require|want|would like|asking for)\s+(?:\w+\s+){0,3}?(?:access|account|licen[cs]e|permission|installation|installed|setup|set up|laptop|monitor|software|hardware|vpn|email|id card|credentials?)\b/,
      /\bplease (?:provide|give|grant|create|set ?up|install|configure|enable|activate|issue|arrange|allot)\b/,
      /\b(?:grant|give) (?:me |us |him |her )?access\b/,
      /\bnew (?:account|user|joiner|employee|laptop|licen[cs]e|email|sim|connection)\b/,
      /\b(?:reset|forgot(?:ten)?) (?:my |the )?password\b/,
      /\brequest (?:for|to)\b/, /\baccess to\b/,
    ],
    words: ['provision', 'install', 'license', 'licence', 'permission', 'onboard', 'activate', 'renew', 'allocate'],
  },
  feature_request: {
    phrases: [
      /\b(?:would be (?:nice|great|helpful|useful)|feature request|can (?:we|you) (?:add|have)|please add|it would help|wish (?:there|we|it)|should (?:also )?(?:have|support|allow)|add (?:support|an option|the ability)|nice to have|suggestion to)\b/,
    ],
    words: ['feature', 'enhancement', 'improvement', 'suggestion', 'enhance'],
  },
  change: {
    phrases: [
      /\b(?:change request|maintenance window|config(?:uration)? change|deploy(?:ment)?|roll ?out|roll ?back|go[- ]live|cutover)\b/,
      /\b(?:migrate|migration|upgrade|patch)\b/,
    ],
    words: ['deploy', 'release', 'migration', 'upgrade', 'rollback'],
  },
  complaint: {
    phrases: [
      /\b(?:not (?:happy|satisfied)|poor (?:service|support|experience|quality)|unacceptable|disappointed|dissatisfied|worst (?:service|support|experience)|no ?(?:one|body) (?:has )?(?:responded|replied|helped|is helping)|still waiting|kept waiting|fed up)\b/,
    ],
    words: ['complaint', 'unhappy', 'unacceptable', 'disappointed', 'pathetic', 'terrible', 'awful', 'worst', 'frustrated'],
  },
  training: {
    phrases: [
      /\bhow (?:do|can|does|should|to) (?:i|we|one)\b/, /\bhow to\b/,
      /\b(?:guide|walk) (?:me|us) through\b/,
      /\bwhere (?:do|can|should) (?:i|we) (?:find|see|get|download|check)\b/,
      /\bwhat (?:is|are) the (?:steps?|process|procedure)\b/,
      /\bneed (?:help|training) (?:with|on|using)\b/,
    ],
    words: ['tutorial', 'training', 'documentation', 'walkthrough', 'guide'],
  },
  problem: {
    phrases: [
      /\bkeeps? (?:\w+\s+){0,2}?(?:happening|failing|crashing|disconnecting|dropping|freezing|restarting|logging (?:me |us )?out)\b/,
      /\b(?:every|each) (?:time|day|week|morning|evening|hour)\b/,
      /\b(?:again and again|over and over|multiple times|several times|(?:second|third|fourth|2nd|3rd|4th) time)\b/,
      /\b(?:intermittent(?:ly)?|randomly|sporadically|on and off|off and on)\b/,
      /\b(?:since|for the (?:past|last)) (?:\w+\s+){0,2}?(?:days?|weeks?|months?|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/,
      /\broot cause\b/, /\brecurring\b/, /\bhappen(?:s|ed|ing)? again\b/,
    ],
    words: ['recurring', 'intermittent', 'repeatedly', 'frequently', 'persists', 'chronic', 'flaky'],
  },
}
const scoreType = (key) => {
  const sig = TYPE_SIGNALS[key]; const t = text.value; const ts = tokSet.value
  let s = 0
  for (const rx of sig.phrases) if (rx.test(t)) s += 2.5
  for (const w of sig.words) if (ts.has(stem(w))) s += 1
  return s
}
const sugType = computed(() => {
  if (!engaged.value) return ''
  let best = ''; let bestScore = 0
  for (const key of Object.keys(TYPE_SIGNALS)) {
    const s = scoreType(key)
    if (s > bestScore) { best = key; bestScore = s }
  }
  return bestScore >= 1 ? best : ''
})

/* ── priority engine — impact × downtime × severity × tone, scored ── */
const IMPACT_RX = /\b(?:everyone|every ?one|whole (?:team|office|company|department|branch|floor)|entire (?:team|office|company|department|network|system)|all (?:users|employees|staff|systems|branches|of us)|no ?(?:one|body) can|company[- ]wide|org(?:anisation|anization)?[- ]wide|\d{2,}\+? (?:users|people|employees|staff|agents|machines|systems))\b/
const DOWNTIME_RX = /\b(?:down|outage|offline|unavailable|unreachable|not working|stopped working|dead|crash(?:ed|ing)?)\b/
const SEVERITY_RX = /\b(?:data (?:loss|lost|leak|breach)|security (?:breach|incident)|ransomware|hacked|breach|revenue|financial loss|client[- ]facing|customer[- ]facing|production|go[- ]live|payroll)\b/
const URGENT_RX = /\b(?:urgent(?:ly)?|asap|as soon as possible|immediately|right away|right now|critical|emergency|blocker|blocking|blocked|severe|escalat\w+|high priority|p1|sev ?1|cannot work|can'?t work|business (?:has )?stopped|deadline|by (?:today|tonight|tomorrow|eod|end of day)|before (?:the )?(?:demo|meeting|presentation|launch|audit))\b/
const RELAX_RX = /\b(?:no rush|whenever|not urgent|low priority|minor|cosmetic|typo|nice to have|when you (?:get|have) (?:a chance|time)|at your convenience|no hurry|take your time)\b/
const shouting = computed(() => {
  const raw = `${props.subject} ${props.description}`
  const caps = (raw.match(/\b[A-Z]{3,}\b/g) || []).length
  return (caps >= 2 ? 0.5 : 0) + (/!{2,}/.test(raw) ? 0.5 : 0)
})
const sugPriority = computed(() => {
  if (!engaged.value) return ''
  const t = text.value
  let crit = 0
  if (IMPACT_RX.test(t)) crit += 1.5
  if (DOWNTIME_RX.test(t)) crit += 1
  if (SEVERITY_RX.test(t)) crit += 1.5
  const high = (URGENT_RX.test(t) ? 1.5 : 0) + shouting.value
  if (crit >= 2.5) return 'critical'                 // e.g. impact + downtime, or downtime + severity
  if (crit + high >= 1) return 'high'
  if (RELAX_RX.test(t)) return 'low'
  return ''
})

/* ── category engine — scored over ALL categories: name, synonyms, child names ── */
const CAT_SYNONYMS = {
  network: ['network', 'vpn', 'wifi', 'wi-fi', 'connection', 'internet', 'lan', 'wan', 'dns', 'router', 'switch', 'firewall', 'proxy', 'ethernet', 'bandwidth', 'latency', 'ping'],
  hardware: ['hardware', 'laptop', 'desktop', 'computer', 'monitor', 'keyboard', 'mouse', 'printer', 'scanner', 'device', 'screen', 'battery', 'charger', 'dock', 'headset', 'webcam', 'ram', 'disk', 'ssd'],
  software: ['software', 'application', 'app', 'install', 'installation', 'license', 'licence', 'update', 'crash', 'excel', 'word', 'browser', 'chrome', 'edge', 'erp', 'crm', 'version', 'patch'],
  email: ['email', 'e-mail', 'outlook', 'mailbox', 'smtp', 'imap', 'inbox', 'mail', 'spam', 'distribution list'],
  security: ['security', 'password', 'phishing', 'breach', 'mfa', '2fa', 'otp', 'login', 'authentication', 'account locked', 'locked out', 'virus', 'malware', 'ransomware', 'suspicious', 'antivirus', 'access'],
  database: ['database', 'sql', 'query', 'data', 'report', 'backup', 'restore', 'postgres', 'mysql', 'oracle'],
  hr: ['payroll', 'leave', 'attendance', 'salary', 'payslip', 'reimbursement', 'onboarding', 'offboarding'],
  billing: ['invoice', 'billing', 'payment', 'refund', 'subscription', 'charge', 'gst'],
  facilities: ['air conditioning', 'chair', 'desk', 'electricity', 'plumbing', 'housekeeping', 'parking', 'cafeteria'],
}
const sugCategory = computed(() => {
  const cats = props.categories || []
  const tops = cats.filter(c => !c.parent_id)
  if (!tops.length || !engaged.value) return null
  const t = ` ${text.value} `
  const ts = tokSet.value
  const hit = (term) => (term.includes(' ') || term.includes('-')) ? t.includes(` ${term} `) : ts.has(stem(term))
  let best = null; let bestScore = 0
  for (const c of tops) {
    let s = 0
    const name = norm(c.name || '').trim()
    if (name && t.includes(` ${name} `)) s += 3
    for (const [key, syn] of Object.entries(CAT_SYNONYMS)) {
      if (!name.includes(key)) continue
      for (const term of syn) if (hit(term)) s += 1
    }
    for (const child of cats) {   // child category names credit their parent
      if (String(child.parent_id) !== String(c.id)) continue
      const cn = norm(child.name || '').trim()
      if (cn && cn.length >= 3 && t.includes(cn)) s += 2
    }
    if (s > bestScore) { best = { id: c.id, name: c.name }; bestScore = s }
  }
  return bestScore >= 1 ? best : null
})

/* ── sentiment — weighted lexicon + negation flips + intensifiers + tone ── */
const NEG_LEX = stemLex({
  furious: 3, outraged: 3, angry: 2.5, unacceptable: 2.5, disgusted: 2.5, livid: 3,
  ridiculous: 2, terrible: 2, horrible: 2, awful: 2, worst: 2, pathetic: 2, useless: 2,
  frustrated: 2, frustrating: 2, disappointed: 1.8, ignored: 1.8, annoyed: 1.5, annoying: 1.5,
  upset: 1.5, unhappy: 1.5, complaint: 1.5, waiting: 1, delayed: 1, delay: 1,
  broken: 1, crash: 1, fail: 1, failed: 1, failure: 1, outage: 1, blocked: 1,
  escalate: 1, breach: 1.2, lost: 1, stuck: 0.8, down: 0.8,
  urgent: 0.8, asap: 0.8, immediately: 0.8, cannot: 0.6, unable: 0.6,
})
const POS_LEX = stemLex({
  appreciate: 2, appreciated: 2, grateful: 2, thanks: 1.5, thank: 1.5, awesome: 1.5,
  excellent: 1.5, love: 1.5, great: 1.2, helpful: 1.2, happy: 1.2, kindly: 1,
  whenever: 1, good: 0.8, please: 0.5,
})
const INTENS = new Set(['very', 'extremely', 'really', 'so', 'totally', 'completely', 'absolutely', 'super'])
const sentiment = computed(() => {
  if (!engaged.value) return { label: 'Neutral', pct: 50, color: 'var(--sd-steel)', emoji: '😐' }
  const seq = tokens(text.value)
  let score = 0
  for (let i = 0; i < seq.length; i++) {
    const st = stem(seq[i])
    let v = NEG_LEX[st] != null ? -NEG_LEX[st] : (POS_LEX[st] != null ? POS_LEX[st] : 0)
    if (!v) continue
    const prev = seq[i - 1], prev2 = seq[i - 2]
    if (prev && INTENS.has(prev)) v *= 1.5
    if ((prev && /^(?:not|no|never|isnt|arent|wasnt)$/.test(prev.replace(/'/g, ''))) ||
        (prev2 && /^(?:not|no|never)$/.test(prev2) && prev && INTENS.has(prev))) v = -v * 0.8   // "not happy" / "not very happy" flips
    score += v
  }
  score -= shouting.value * 1.6   // SHOUTING!!! reads as distress
  const pct = Math.max(4, Math.min(96, 50 + score * 8))
  if (score <= -3.5) return { label: 'Critical / upset', pct, color: 'var(--sd-pri-critical)', emoji: '😣' }
  if (score <= -1) return { label: 'Negative', pct, color: 'var(--sd-pri-urgent)', emoji: '🙁' }
  if (score >= 1.5) return { label: 'Positive', pct, color: 'var(--sd-success)', emoji: '🙂' }
  return { label: 'Neutral', pct, color: 'var(--sd-steel)', emoji: '😐' }
})

/* ── duplicate matching vs the requester's recent tickets (stemmed) ── */
const sigTokens = (s) => new Set(stems(s).filter(t => !STOP.has(t) && t.length >= 3))
const duplicates = computed(() => {
  const mine = sigTokens(props.subject)
  if (mine.size < 2) return []
  const out = []
  for (const r of (props.recentTickets || [])) {
    const theirs = sigTokens(r.subject)
    if (!theirs.size) continue
    let inter = 0; mine.forEach(t => { if (theirs.has(t)) inter++ })
    const sim = inter / new Set([...mine, ...theirs]).size
    if (inter >= 2 && sim >= 0.3) out.push({ id: r.id, subject: r.subject, ticket_number: r.ticket_number, status: r.status, sim })
  }
  return out.sort((a, b) => b.sim - a.sim).slice(0, 3)
})

/* ── SLA forecast (heuristic; real target computed server-side on submit) ── */
const SLA_MAP = {
  critical: { response: '30 min', resolution: '4 hours' },
  urgent: { response: '1 hour', resolution: '8 hours' },
  high: { response: '2 hours', resolution: '1 day' },
  medium: { response: '8 hours', resolution: '3 days' },
  low: { response: '1 day', resolution: '5 days' },
}
const sla = computed(() => SLA_MAP[props.priority] || SLA_MAP.medium)

/* ── KB suggestions — debounced REAL search ── */
const articles = ref([])
const kbLoading = ref(false)
const scanning = ref(false)
let kbTimer = null
const excerptOf = (a) => ((a.body || a.content || '').replace(/<[^>]+>/g, '').slice(0, 64) || '')
const runKb = () => {
  const q = keywords.value.slice(0, 2).join(' ').trim() || props.subject.trim()
  if (q.length < 3) { articles.value = []; return }
  kbLoading.value = true
  listMyKb({ q, limit: 4 })
    .then(res => { articles.value = (Array.isArray(res) ? res : res?.items || []).slice(0, 4) })
    .catch(() => { articles.value = [] })
    .finally(() => { kbLoading.value = false })
}
const scheduleAnalyse = () => {
  scanning.value = true
  clearTimeout(kbTimer)
  kbTimer = setTimeout(() => { runKb(); scanning.value = false }, 600)
}
watch(() => [props.subject, props.description], () => { if (engaged.value) scheduleAnalyse(); else { articles.value = []; scanning.value = false } }, { immediate: true })
onBeforeUnmount(() => clearTimeout(kbTimer))
</script>

<style scoped>
.sd-cop {
  position: relative; overflow: hidden;
  display: flex; flex-direction: column;
  border-radius: 20px; padding: 0;
  background: linear-gradient(180deg, var(--sd-surface-glass), var(--sd-panel));
  border: 1px solid var(--sd-border-strong);
  box-shadow: var(--sd-card-shadow);
  backdrop-filter: blur(16px) saturate(140%); -webkit-backdrop-filter: blur(16px) saturate(140%);
}
.cop-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.4; background-image: radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 3px 3px; }

.cop-head { position: relative; display: flex; align-items: center; gap: 11px; padding: 15px 16px; border-bottom: 1px solid var(--sd-border); flex-shrink: 0; }
.cop-orb { position: relative; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px; color: var(--sd-amber); background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); flex-shrink: 0; }
.orb-ring { position: absolute; inset: -4px; border-radius: 14px; border: 1.5px solid transparent; border-top-color: var(--sd-amber); opacity: 0; }
.cop-orb.scan .orb-ring { opacity: 1; animation: sd-spin-slow 0.9s linear infinite; }
.cop-head-txt { display: flex; flex-direction: column; min-width: 0; }
.cop-head-txt b { font-size: 13.5px; font-weight: 750; color: var(--sd-text); }
.cop-head-txt i { font-style: normal; font-size: 11px; color: var(--sd-text-muted); }
.cop-beam { position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; background: linear-gradient(90deg, transparent, var(--sd-amber), var(--sd-ember), transparent); background-size: 200% 100%; opacity: 0; }
.cop-beam.on { opacity: 1; animation: sd-rail-flow 1.4s linear infinite; }

.cop-body { display: flex; flex-direction: column; gap: 11px; padding: 14px 14px 16px; overflow-y: auto; flex: 1 1 auto; min-height: 0; }

.cop-idle { position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; padding: 34px 18px; color: var(--sd-text-muted); }
.cop-idle p { font-size: 13px; font-weight: 700; color: var(--sd-text-secondary); margin: 4px 0 0; }
.cop-idle small { font-size: 11.5px; color: var(--sd-text-dim); line-height: 1.5; max-width: 220px; }
.cop-idle > svg { color: var(--sd-amber); opacity: 0.8; }
.idle-mote { position: absolute; width: 5px; height: 5px; border-radius: 50%; background: var(--sd-amber); opacity: 0.4; top: 30%; left: 22%; animation: cop-mote 6s ease-in-out infinite; }
.idle-mote.m2 { top: 55%; left: 74%; background: var(--sd-ember); animation-duration: 7.5s; animation-delay: -2s; }
.idle-mote.m3 { top: 72%; left: 38%; animation-duration: 8.5s; animation-delay: -4s; }

.cop-card { position: relative; padding: 12px 13px; border-radius: 14px; background: var(--sd-surface); border: 1px solid var(--sd-border); }
.cop-card.warn { border-color: color-mix(in srgb, var(--sd-pri-urgent) 32%, transparent); background: color-mix(in srgb, var(--sd-pri-urgent) 6%, var(--sd-surface)); }
.cop-card h5 { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 750; letter-spacing: 0.04em; text-transform: uppercase; color: var(--sd-text-muted); margin: 0 0 10px; }
.cop-card h5 .cnt { margin-left: auto; font-family: var(--sd-mono); font-size: 10px; padding: 1px 7px; border-radius: 999px; color: var(--sd-pri-urgent); background: color-mix(in srgb, var(--sd-pri-urgent) 14%, transparent); }
.kb-spin { margin-left: auto; color: var(--sd-amber); display: inline-grid; }
.kb-spin svg { animation: sd-spin-slow 0.9s linear infinite; }

.cls-grid { display: flex; flex-direction: column; gap: 5px; }
.cls-row { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 10px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); cursor: default; font-family: inherit; text-align: left; }
.cls-row.diff { cursor: pointer; border-color: var(--sd-amber-border); }
.cls-row.diff:hover { background: var(--sd-amber-soft); }
.cls-k { font-size: 11px; font-weight: 600; color: var(--sd-text-muted); width: 56px; flex-shrink: 0; }
.cls-v { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 700; color: var(--sd-text); flex: 1; }
.cls-dot { width: 8px; height: 8px; border-radius: 50%; }
.cls-apply { font-size: 10px; font-weight: 800; letter-spacing: 0.04em; color: #1a1206; background: var(--sd-grad-hero); padding: 3px 8px; border-radius: 7px; }
[data-theme="light"] .cls-apply { color: #fff8ec; }
.cls-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 9px; }
.cls-tag { font-size: 10px; font-weight: 600; color: var(--sd-text-secondary); padding: 2px 8px; border-radius: 999px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); font-family: var(--sd-mono); }

.snt { display: flex; align-items: center; gap: 12px; }
.snt-face { font-size: 26px; filter: drop-shadow(0 2px 6px color-mix(in srgb, var(--sc) 40%, transparent)); }
.snt-body { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.snt-meter { position: relative; height: 7px; border-radius: 999px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); overflow: visible; }
.snt-fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 999px; transition: width 0.5s var(--sd-spring), background 0.4s; }
.snt-needle { position: absolute; top: -3px; width: 3px; height: 13px; border-radius: 2px; background: var(--sd-text); transform: translateX(-50%); transition: left 0.5s var(--sd-spring); box-shadow: 0 0 6px rgba(0,0,0,0.4); }
.snt-lbl { font-size: 11.5px; font-weight: 700; }

.dup { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 9px; border-radius: 10px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); cursor: pointer; font-family: inherit; text-align: left; margin-bottom: 6px; transition: transform 0.16s var(--sd-spring), border-color 0.16s; }
.dup:last-child { margin-bottom: 0; }
.dup:hover { transform: translateX(2px); border-color: var(--sd-pri-urgent); }
.dup-sim { display: grid; place-items: center; min-width: 36px; height: 30px; border-radius: 8px; font-family: var(--sd-mono); font-size: 11px; font-weight: 800; color: var(--sd-pri-urgent); background: color-mix(in srgb, var(--sd-pri-urgent) calc(8% + var(--s) * 18%), transparent); flex-shrink: 0; }
.dup-body { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.dup-subj { font-size: 12px; font-weight: 650; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dup-meta { font-size: 10px; color: var(--sd-text-muted); }
.dup-go { color: var(--sd-text-dim); flex-shrink: 0; }

.kb { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 9px; border-radius: 10px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); cursor: pointer; font-family: inherit; text-align: left; margin-bottom: 6px; transition: transform 0.16s var(--sd-spring), border-color 0.16s; }
.kb:hover { transform: translateX(2px); border-color: var(--sd-amber-border); }
.kb-ic { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; color: var(--sd-amber); background: var(--sd-amber-soft); flex-shrink: 0; }
.kb-body { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.kb-title { font-size: 12px; font-weight: 650; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kb-sub { font-size: 10.5px; color: var(--sd-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kb-go { color: var(--sd-text-dim); flex-shrink: 0; }
.kb-hint { display: flex; align-items: center; gap: 6px; font-size: 10.5px; color: var(--sd-text-dim); margin: 8px 0 0; line-height: 1.4; }
.cop-empty { font-size: 11.5px; color: var(--sd-text-dim); margin: 0; }

.sla-row { display: flex; align-items: center; gap: 12px; }
.sla-cell { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.sla-k { font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--sd-text-muted); }
.sla-cell b { font-size: 16px; font-weight: 800; color: var(--sd-text); font-family: var(--sd-mono); }
.sla-div { width: 1px; align-self: stretch; background: var(--sd-border-strong); }
.sla-note { font-size: 10.5px; color: var(--sd-text-dim); margin: 9px 0 0; }
.sla-note b { font-weight: 700; }

@keyframes cop-mote { 0%, 100% { transform: translate(0, 0); opacity: 0.3; } 50% { transform: translate(8px, -10px); opacity: 0.7; } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .orb-ring,
  html:not([data-cinematic="on"]) .cop-beam,
  html:not([data-cinematic="on"]) .idle-mote,
  html:not([data-cinematic="on"]) .kb-spin svg { animation: none; }
}
</style>
