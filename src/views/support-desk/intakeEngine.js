/*
  intakeEngine.js — the Intake Intelligence brain (v2, "Signal Prism").

  Deterministic, explainable, client-side language engine for the create-ticket
  wizard. Replaces the v1 copilot heuristics with a scored, confidence-weighted
  read of the whole signal:

    · TYPE        — scored over all 9 ticket types (phrases + lexicon), softmax-ish
                    confidence, human-readable evidence.
    · IMPACT      — breadth of blast radius (org-wide → only me), read separately.
    · URGENCY     — time pressure (halted / deadline / whenever), read separately.
    · PRIORITY    — derived impact × urgency through the SAME ITIL matrix the form
                    uses (never guessed directly — the v1 mistake).
    · CATEGORY    — scored over EVERY category node (parents AND children) with a
                    dynamic lexicon built from real names + a synonym atlas; a child
                    hit nominates its parent, so subcategory comes along free.
    · SENTIMENT   — weighted lexicon, negation flips, intensifiers, shouting.
    · QUALITY     — how diagnosable the description is + coaching tips.
    · ENTITIES    — error codes, apps, devices, affected-user counts, timeframes.
    · DUPLICATES  — hybrid stem-Jaccard + bigram-Dice against recent tickets.

  Pure functions, no imports from Vue — the LLM-swap seam for the whole desk is
  this module's analyseIntake().
*/

import { IMPACT_URGENCY_MATRIX } from '@/composables/useSupportDesk'

/* ═══════════════ text plumbing ═══════════════ */
const norm = (s) => (s || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"')
const STOP = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'have', 'has', 'are', 'was', 'were', 'not', 'but', 'you', 'our', 'can', 'cannot', 'when', 'will', 'from', 'into', 'about', 'there', 'their', 'they', 'how', 'why', 'what', 'please', 'need', 'unable', 'issue', 'problem', 'help', 'getting', 'been', 'being', 'would', 'could', 'should', 'since', 'after', 'before', 'while', 'because', 'also', 'just', 'still', 'very', 'really', 'its', "it's", 'your', 'does', 'did', 'doing', 'due', 'any', 'some', 'all', 'out', 'get', 'got', 'trying', 'tried', 'a', 'an', 'is', 'it', 'to', 'of', 'in', 'on', 'my', 'we', 'i'])

export const stem = (w) => {
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
const stemLex = (obj) => { const o = {}; for (const [k, v] of Object.entries(obj)) { const st = stem(k); o[st] = Math.max(o[st] || 0, v) } return o }
/* saturating confidence: 0 evidence → 0, lots of evidence → ~0.95 */
const conf = (score, k = 3) => Math.min(0.95, score > 0 ? score / (score + k) + 0.18 : 0)

/* ═══════════════ type engine ═══════════════ */
const CANT = "(?:can(?:no|')t|cannot|couldn'?t|won'?t|wouldn'?t|doesn'?t|don'?t|didn'?t|isn'?t|aren'?t|wasn'?t|(?:is|are|was|were|does|do|did|will|has|have) not|not able to|unable to|fail(?:s|ing|ed)? to|stopped|no longer|never)"
const FUNC_VERB = "(?:work(?:ing)?|load(?:ing)?|open(?:ing)?|connect(?:ing)?|log ?in(?:g)?|login|sign ?in|access|start(?:ing)?|boot(?:ing)?|launch(?:ing)?|respond(?:ing)?|sync(?:ing)?|send(?:ing)?|receiv(?:e|ing)|sav(?:e|ing)|print(?:ing)?|charg(?:e|ing)|turn(?:ing)? on|power(?:ing)? (?:on|up)|display(?:ing)?|render(?:ing)?|play(?:ing)?|updat(?:e|ing)|submit(?:ting)?|upload(?:ing)?|download(?:ing)?|run(?:ning)?|reach|find|see)"
const TYPE_SIGNALS = {
  incident: {
    label: 'Incident',
    phrases: [
      [new RegExp(`\\b${CANT}\\s+(?:\\w+\\s+){0,3}?${FUNC_VERB}`), 'something that worked has stopped'],
      [/\b(?:is|are|was|were|has been|have been|went|seems?|appears?|keeps? going)\s+(?:\w+\s+){0,2}?(?:down|offline|unavailable|unreachable|unresponsive|inaccessible|dead|frozen|stuck|hanging|broken)\b/, 'reports a down / offline state'],
      [/\bnot working\b/, '“not working”'], [/\bstopped working\b/, '“stopped working”'],
      [/\bno (?:internet|network|connection|access|response|signal|power|display|sound|audio)\b/, 'loss of a basic service'],
      [/\b(?:blank|white|black) (?:screen|page)\b/, 'dead screen'],
      [/\b(?:times? out|timing out|timed out)\b/, 'timeouts'],
      [/\bserver (?:is )?down\b/, 'server down'],
    ],
    words: ['down', 'outage', 'offline', 'unavailable', 'unreachable', 'unresponsive', 'crash', 'crashed', 'frozen', 'stuck', 'hang', 'broken', 'dead'],
  },
  bug: {
    label: 'Bug',
    phrases: [
      [/\b(?:throws?|thrown|getting|got|shows?|showing|returns?|returned|displays?|see(?:ing)?)\s+(?:an?\s+|the\s+)?(?:error|exception|warning|404|500|502|503|blank|wrong|incorrect)\b/, 'an error is displayed'],
      [/\berror (?:message|code|popup|dialog|screen)\b/, 'explicit error artifact'],
      [/\bwrong (?:result|value|amount|total|data|date|calculation|number|name|status|balance)\b/, 'wrong output'],
      [/\bsteps? to reproduce\b/, 'repro steps supplied'], [/\bexpected .{3,40}(?:but|instead)\b/, 'expected-vs-actual'],
    ],
    words: ['bug', 'error', 'exception', 'glitch', 'incorrect', 'defect', 'mismatch', 'misaligned', 'typo', 'corrupt'],
  },
  service_request: {
    label: 'Service request',
    phrases: [
      [/\b(?:need|needs?|request(?:ing)?|require|want|would like|asking for)\s+(?:\w+\s+){0,3}?(?:access|account|licen[cs]e|permission|installation|installed|setup|set up|laptop|monitor|software|hardware|vpn|email|id card|credentials?)\b/, 'asks for something to be provided'],
      [/\bplease (?:provide|give|grant|create|set ?up|install|configure|enable|activate|issue|arrange|allot)\b/, 'a provisioning verb'],
      [/\b(?:reset|forgot(?:ten)?) (?:my |the )?password\b/, 'password reset'],
      [/\bnew (?:account|user|joiner|employee|laptop|licen[cs]e|email|sim|connection)\b/, 'a new-thing request'],
      [/\baccess to\b/, 'access request'],
    ],
    words: ['provision', 'install', 'license', 'licence', 'permission', 'onboard', 'activate', 'renew', 'allocate'],
  },
  feature_request: {
    label: 'Feature request',
    phrases: [[/\b(?:would be (?:nice|great|helpful|useful)|feature request|can (?:we|you) (?:add|have)|please add|it would help|wish (?:there|we|it)|should (?:also )?(?:have|support|allow)|add (?:support|an option|the ability)|nice to have|suggestion to)\b/, 'asks for new capability']],
    words: ['feature', 'enhancement', 'improvement', 'suggestion', 'enhance'],
  },
  change: {
    label: 'Change',
    phrases: [[/\b(?:change request|maintenance window|config(?:uration)? change|deploy(?:ment)?|roll ?out|roll ?back|go[- ]live|cutover)\b/, 'planned-change vocabulary']],
    words: ['deploy', 'release', 'migration', 'upgrade', 'rollback'],
  },
  complaint: {
    label: 'Complaint',
    phrases: [[/\b(?:not (?:happy|satisfied)|poor (?:service|support|experience|quality)|unacceptable|disappointed|dissatisfied|worst (?:service|support|experience)|no ?(?:one|body) (?:has )?(?:responded|replied|helped|is helping)|still waiting|kept waiting|fed up)\b/, 'dissatisfaction with service']],
    words: ['complaint', 'unhappy', 'unacceptable', 'disappointed', 'pathetic', 'terrible', 'awful', 'worst', 'frustrated'],
  },
  training: {
    label: 'Training',
    phrases: [
      [/\bhow (?:do|can|does|should|to) (?:i|we|one)\b/, 'a how-do-I question'], [/\bhow to\b/, '“how to”'],
      [/\bwhat (?:is|are) the (?:steps?|process|procedure)\b/, 'asks for a procedure'],
      [/\bneed (?:help|training) (?:with|on|using)\b/, 'asks for guidance'],
    ],
    words: ['tutorial', 'training', 'documentation', 'walkthrough', 'guide'],
  },
  problem: {
    label: 'Problem',
    phrases: [
      [/\bkeeps? (?:\w+\s+){0,2}?(?:happening|failing|crashing|disconnecting|dropping|freezing|restarting|logging (?:me |us )?out)\b/, 'keeps happening'],
      [/\b(?:again and again|over and over|multiple times|several times|(?:second|third|fourth|2nd|3rd|4th) time)\b/, 'recurrence counted'],
      [/\b(?:intermittent(?:ly)?|randomly|sporadically|on and off|off and on)\b/, 'intermittent pattern'],
      [/\broot cause\b/, 'asks for root cause'], [/\brecurring\b/, '“recurring”'],
    ],
    words: ['recurring', 'intermittent', 'repeatedly', 'frequently', 'persists', 'chronic', 'flaky'],
  },
  implementation: {
    label: 'Implementation',
    phrases: [[/\b(?:implementation|implement (?:the|a|new)|on[- ]?site (?:setup|visit)|commissioning|installation project|new (?:site|branch|office) setup)\b/, 'project-scale delivery']],
    words: ['implementation', 'commissioning', 'rollout'],
  },
}

/* ═══════════════ impact / urgency engines ═══════════════ */
const IMPACT_BANDS = [
  { value: 'critical', rules: [
    [/\b(?:whole|entire) (?:company|organi[sz]ation|org|business|infra(?:structure)?)\b/, 'entire organisation affected'],
    [/\b(?:company|org(?:anisation|anization)?)[- ]wide\b/, 'org-wide'],
    [/\ball (?:users|employees|staff|systems|branches|sites|offices)\b/, 'all users affected'],
    [/\bno ?(?:one|body) can\b/, 'nobody can work'],
    [/\bproduction\b/, 'production is involved'],
    [/\b(?:data (?:loss|lost|leak|breach)|security (?:breach|incident)|ransomware|hacked)\b/, 'data/security severity'],
    [/\b(?:1\d\d|[2-9]\d{2,})\+? (?:users|people|employees|staff|agents|machines|systems)\b/, '100+ users'],
  ] },
  { value: 'high', rules: [
    [/\b(?:whole|entire) (?:team|office|department|branch|floor|network|server)\b/, 'a whole team / site affected'],
    [/\b(?:[2-9]\d)\+? (?:users|people|employees|staff|agents|machines|systems)\b/, 'tens of users'],
    [/\b(?:client|customer)[- ]facing\b/, 'client-facing'],
    [/\b(?:revenue|billing|payroll|invoice|payment)s?\b/, 'money flow involved'],
    [/\beveryone (?:in|on|at)\b/, 'everyone in a group'],
  ] },
  { value: 'medium', rules: [
    [/\b(?:my|our) team\b/, 'a team is affected'],
    [/\b(?:few|several|some|couple of|handful of|\d) (?:users|people|colleagues|employees|of us)\b/, 'a few users'],
    [/\bwe (?:are|were|can'?t|cannot)\b/, 'plural reporter'],
  ] },
  { value: 'low', rules: [
    [/\b(?:only me|just me|only I|my (?:laptop|machine|system|account|desktop|login|profile|phone))\b/, 'single user'],
    [/\bfor me\b/, 'single user'],
  ] },
]
const URGENCY_BANDS = [
  { value: 'critical', rules: [
    [/\b(?:cannot work|can'?t work|work (?:has )?stopped|business (?:has )?stopped|complete(?:ly)? (?:halt|stopped|blocked)|dead in the water|at a standstill)\b/, 'work is halted'],
    [/\b(?:right now|immediately|emergency|sev ?1|p1\b)\b/, 'immediate language'],
    [/\b(?:by (?:today|tonight|eod|end of day)|in the next hour|within the hour)\b/, 'same-day deadline'],
    [/\b(?:security (?:breach|incident)|ransomware|hacked|data leak)\b/, 'active security event'],
  ] },
  { value: 'high', rules: [
    [/\b(?:urgent(?:ly)?|asap|as soon as possible|high priority|escalat\w+|blocker|blocking|blocked)\b/, 'urgent language'],
    [/\b(?:by tomorrow|before (?:the )?(?:demo|meeting|presentation|launch|audit|month[- ]end)|deadline)\b/, 'a near deadline'],
    [/\b(?:is|are) (?:down|offline|unavailable)\b/, 'live outage'],
  ] },
  { value: 'medium', rules: [
    [/\b(?:this week|soon|when possible|earliest)\b/, 'soon-ish'],
  ] },
  { value: 'low', rules: [
    [/\b(?:no rush|whenever|not urgent|low priority|minor|cosmetic|typo|nice to have|when you (?:get|have) (?:a chance|time)|at your convenience|no hurry|take your time)\b/, 'explicitly relaxed'],
  ] },
]
const scoreBands = (bands, t) => {
  const out = []
  for (const band of bands) {
    let s = 0; const ev = []
    for (const [rx, why] of band.rules) if (rx.test(t)) { s += 1.6; if (ev.length < 2) ev.push(why) }
    out.push({ value: band.value, score: s, evidence: ev })
  }
  return out.sort((a, b) => b.score - a.score)[0]
}

/* ═══════════════ category atlas ═══════════════ */
const CAT_SYNONYMS = {
  network: ['network', 'vpn', 'wifi', 'wi-fi', 'connection', 'internet', 'lan', 'wan', 'dns', 'router', 'switch', 'firewall', 'proxy', 'ethernet', 'bandwidth', 'latency', 'ping', 'isp'],
  hardware: ['hardware', 'laptop', 'desktop', 'computer', 'monitor', 'keyboard', 'mouse', 'printer', 'scanner', 'device', 'screen', 'battery', 'charger', 'dock', 'headset', 'webcam', 'ram', 'disk', 'ssd', 'server', 'machine'],
  software: ['software', 'application', 'app', 'install', 'installation', 'license', 'licence', 'update', 'crash', 'excel', 'word', 'browser', 'chrome', 'edge', 'erp', 'crm', 'version', 'patch'],
  'laptop / desktop': ['laptop', 'desktop', 'computer', 'notebook', 'macbook', 'thinkpad', 'pc', 'workstation', 'boot', 'battery', 'charger', 'keyboard', 'trackpad', 'screen'],
  email: ['email', 'e-mail', 'outlook', 'mailbox', 'smtp', 'imap', 'inbox', 'mail', 'spam', 'distribution list'],
  mailbox: ['mailbox', 'inbox', 'outlook', 'mail', 'email'],
  security: ['security', 'phishing', 'breach', 'virus', 'malware', 'ransomware', 'suspicious', 'antivirus'],
  'login / sso': ['login', 'log in', 'sign in', 'signin', 'sso', 'okta', 'mfa', '2fa', 'otp', 'authentication', 'session', 'logged out'],
  'password reset': ['password', 'forgot', 'reset', 'locked out', 'account locked', 'credentials'],
  'account & access': ['account', 'access', 'permission', 'role', 'credentials', 'locked', 'authorization', 'unauthorised', 'grant'],
  'access & identity': ['access', 'identity', 'permission', 'role', 'sso', 'account'],
  'permissions / roles': ['permission', 'role', 'rights', 'grant', 'access level', 'admin rights'],
  vpn: ['vpn', 'tunnel', 'remote access', 'anyconnect', 'forticlient'],
  'wi-fi': ['wifi', 'wi-fi', 'wireless', 'hotspot', 'signal', 'access point'],
  'internet / isp': ['internet', 'isp', 'broadband', 'leased line', 'fiber', 'fibre'],
  'lan / cabling': ['lan', 'cable', 'cabling', 'ethernet', 'port', 'patch', 'jack', 'socket'],
  firewall: ['firewall', 'blocked site', 'port blocked', 'whitelist', 'blacklist'],
  'printer / scanner': ['printer', 'print', 'scanner', 'scan', 'toner', 'cartridge', 'paper jam', 'xerox'],
  'backend / api': ['api', 'backend', 'endpoint', '500', '502', '503', 'timeout', 'server error', 'database', 'sql', 'webhook'],
  'ui / frontend': ['ui', 'frontend', 'button', 'page', 'screen', 'layout', 'display', 'css', 'render', 'alignment', 'responsive'],
  'billing / invoice': ['invoice', 'billing', 'payment', 'refund', 'subscription', 'charge', 'gst', 'receipt'],
  'billing & payments': ['invoice', 'billing', 'payment', 'refund', 'gateway', 'charge', 'transaction'],
  'technical support': ['technical', 'support', 'troubleshoot', 'diagnose', 'fix'],
  'business application': ['erp', 'crm', 'sap', 'tally', 'application', 'module', 'workflow'],
  'data / records': ['data', 'record', 'report', 'export', 'import', 'missing data', 'restore', 'backup'],
  'data migration': ['migration', 'migrate', 'import', 'export', 'transfer data'],
  'operating system': ['windows', 'macos', 'linux', 'ubuntu', 'os', 'blue screen', 'bsod', 'update', 'boot'],
  'installation / update': ['install', 'installation', 'update', 'upgrade', 'setup', 'patch', 'version'],
  'setup / provisioning': ['setup', 'provision', 'configure', 'onboard', 'new joiner', 'new account'],
  'new account': ['new account', 'new user', 'new joiner', 'create account', 'onboard'],
  licensing: ['license', 'licence', 'activation', 'key', 'subscription', 'renewal', 'expired'],
  'shared drive': ['shared drive', 'network drive', 'file share', 'folder access', 'onedrive', 'google drive', 'sharepoint'],
  conferencing: ['zoom', 'teams', 'meet', 'webex', 'conference', 'meeting room', 'projector', 'video call', 'audio'],
  'mobile device': ['mobile', 'phone', 'android', 'iphone', 'ios', 'sim', 'tablet'],
  monitor: ['monitor', 'display', 'screen', 'hdmi', 'vga', 'resolution', 'flicker'],
  peripherals: ['keyboard', 'mouse', 'headset', 'webcam', 'dock', 'usb', 'adapter', 'dongle'],
  'delay / sla': ['delay', 'delayed', 'sla', 'late', 'no response', 'waiting'],
  emergency: ['emergency', 'urgent', 'critical', 'fire', 'immediate'],
  'recurring incident': ['recurring', 'again', 'repeat', 'intermittent', 'keeps happening'],
  'known error': ['known error', 'workaround', 'kedb'],
  'feature request': ['feature', 'enhancement', 'improvement', 'suggestion'],
  'bug report': ['bug', 'error', 'defect', 'glitch', 'crash'],
  'root-cause analysis': ['root cause', 'rca', 'postmortem', 'analysis'],
  reporting: ['report', 'dashboard', 'analytics', 'export', 'metrics'],
  training: ['training', 'how to', 'guide', 'tutorial', 'documentation'],
  onboarding: ['onboarding', 'new joiner', 'induction', 'first day'],
  compliance: ['compliance', 'audit', 'policy', 'regulation', 'gdpr'],
  integration: ['integration', 'api', 'webhook', 'sync', 'connector'],
  automation: ['automation', 'workflow', 'trigger', 'schedule', 'bot'],
  performance: ['slow', 'performance', 'lag', 'latency', 'loading', 'hangs', 'freeze', 'speed'],
  usability: ['usability', 'confusing', 'hard to use', 'ux', 'unclear'],
  configuration: ['configuration', 'config', 'setting', 'preference', 'parameter'],
  calendar: ['calendar', 'meeting', 'invite', 'schedule', 'appointment'],
  communication: ['communication', 'chat', 'slack', 'teams', 'message'],
  'group / distribution list': ['distribution list', 'group email', 'mailing list', 'dl'],
  'spam / phishing': ['spam', 'phishing', 'junk', 'suspicious email', 'scam'],
  'staff conduct': ['conduct', 'behaviour', 'behavior', 'harassment', 'misconduct'],
  'service quality': ['quality', 'poor service', 'dissatisfied', 'experience'],
  'go-live support': ['go-live', 'go live', 'launch', 'cutover', 'hypercare'],
  'tool / application': ['tool', 'application', 'app', 'software'],
  'email & collaboration': ['email', 'collaboration', 'outlook', 'teams', 'sharepoint'],
  'network & connectivity': ['network', 'connectivity', 'vpn', 'wifi', 'internet', 'connection'],
}

const scoreCategories = (cats, t, ts) => {
  const hit = (term) => (term.includes(' ') || term.includes('-')) ? t.includes(` ${term} `) : ts.has(stem(term))
  const scored = []
  for (const c of cats) {
    let s = 0; const ev = []
    const name = norm(c.name || '').trim()
    if (name && t.includes(` ${name} `)) { s += 3; ev.push(`names “${c.name}”`) }
    for (const nt of tokens(name)) if (nt.length >= 4 && ts.has(stem(nt))) s += 0.8
    for (const [key, syn] of Object.entries(CAT_SYNONYMS)) {
      if (!name.includes(key) && key !== name) continue
      for (const term of syn) if (hit(term)) { s += 1; if (ev.length < 3) ev.push(`mentions “${term}”`) }
    }
    if (s > 0) scored.push({ cat: c, score: s, evidence: ev })
  }
  return scored.sort((a, b) => b.score - a.score)
}

/* ═══════════════ sentiment ═══════════════ */
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

const readSentiment = (raw, seq, shout) => {
  let score = 0
  for (let i = 0; i < seq.length; i++) {
    const st = stem(seq[i])
    let v = NEG_LEX[st] != null ? -NEG_LEX[st] : (POS_LEX[st] != null ? POS_LEX[st] : 0)
    if (!v) continue
    const prev = seq[i - 1], prev2 = seq[i - 2]
    if (prev && INTENS.has(prev)) v *= 1.5
    if ((prev && /^(?:not|no|never|isnt|arent|wasnt)$/.test(prev.replace(/'/g, ''))) ||
        (prev2 && /^(?:not|no|never)$/.test(prev2) && prev && INTENS.has(prev))) v = -v * 0.8
    score += v
  }
  score -= shout * 1.6
  const pct = Math.max(4, Math.min(96, 50 + score * 8))
  if (score <= -3.5) return { score, pct, label: 'Critical / upset', tone: 'critical', emoji: '😣' }
  if (score <= -1) return { score, pct, label: 'Negative', tone: 'negative', emoji: '🙁' }
  if (score >= 1.5) return { score, pct, label: 'Positive', tone: 'positive', emoji: '🙂' }
  return { score, pct, label: 'Neutral', tone: 'neutral', emoji: '😐' }
}

/* ═══════════════ entities ═══════════════ */
const APP_NAMES = ['outlook', 'chrome', 'edge', 'firefox', 'safari', 'teams', 'zoom', 'slack', 'excel', 'word', 'powerpoint', 'onedrive', 'sharepoint', 'sap', 'tally', 'jira', 'github', 'gitlab', 'postman', 'figma', 'photoshop', 'illustrator', 'autocad', 'vpn', 'anyconnect', 'forticlient', 'whatsapp', 'gmail', 'drive', 'notion', 'salesforce', 'zoho', 'quickbooks', 'fourconnect']
const DEVICE_NAMES = ['laptop', 'desktop', 'printer', 'scanner', 'monitor', 'keyboard', 'mouse', 'router', 'server', 'switch', 'firewall', 'ups', 'projector', 'headset', 'webcam', 'dock', 'phone', 'tablet', 'kiosk']

const readEntities = (raw, t, ts) => {
  const codes = new Set()
  for (const m of raw.matchAll(/\b(?:error|err|code|status)\s*[:#]?\s*(\d{2,5})\b/gi)) codes.add(m[1])
  for (const m of raw.matchAll(/\b(4\d\d|5\d\d)\b/g)) { if (/(?:error|http|status|returns?|throws?|got|getting)/i.test(raw)) codes.add(m[1]) }
  for (const m of raw.matchAll(/\b(0x[0-9a-f]{4,})\b/gi)) codes.add(m[1])
  const apps = APP_NAMES.filter(a => t.includes(` ${a} `) || ts.has(a))
  const devices = DEVICE_NAMES.filter(d => ts.has(stem(d)))
  const um = t.match(/\b(\d{1,4})\+?\s*(?:users|people|employees|staff|agents|machines|systems|laptops)\b/)
  const affected = um ? parseInt(um[1], 10) : null
  const timeframe = /\b(?:since|started|from|began|(?:this|last) (?:morning|night|week|monday|tuesday|wednesday|thursday|friday)|yesterday|today at|around \d|after the (?:update|upgrade|patch|restart|migration))\b/.test(t)
  return { codes: [...codes].slice(0, 4), apps: apps.slice(0, 4), devices: devices.slice(0, 4), affected, timeframe }
}

/* ═══════════════ description quality / coaching ═══════════════ */
const readQuality = (subject, description, entities, t) => {
  const checks = [
    { key: 'subject', ok: subject.trim().length >= 8, w: 1.2, tip: 'Sharpen the subject (≥ 8 chars)' },
    { key: 'length', ok: description.trim().length >= 80, w: 1.6, tip: 'Add more detail — 2–3 sentences minimum' },
    { key: 'when', ok: entities.timeframe, w: 1.2, tip: 'Say WHEN it started (“since this morning…”)' },
    { key: 'scope', ok: /\b(?:only me|my team|all users|everyone|whole|entire|\d+ (?:users|people))\b/.test(t), w: 1.2, tip: 'Say WHO is affected (just you? the team?)' },
    { key: 'repro', ok: /\b(?:steps?|when i|every time|after i|if i|tried|reproduce)\b/.test(t), w: 1.1, tip: 'Describe what you tried or how to reproduce' },
    { key: 'artifact', ok: entities.codes.length > 0 || entities.apps.length > 0 || entities.devices.length > 0, w: 1, tip: 'Name the app / device / error code' },
    { key: 'expected', ok: /\b(?:expected|should|instead|supposed to)\b/.test(t), w: 0.9, tip: 'Say what you EXPECTED to happen' },
  ]
  const total = checks.reduce((s, c) => s + c.w, 0)
  const got = checks.reduce((s, c) => s + (c.ok ? c.w : 0), 0)
  const pct = Math.round((got / total) * 100)
  const tips = checks.filter(c => !c.ok).slice(0, 3).map(c => c.tip)
  const level = pct >= 80 ? 'strong' : pct >= 50 ? 'fair' : 'thin'
  return { pct, level, tips }
}

/* ═══════════════ duplicates ═══════════════ */
const sigTokens = (s) => new Set(stems(s).filter(x => !STOP.has(x) && x.length >= 3))
const bigrams = (s) => {
  const seq = stems(s).filter(x => !STOP.has(x) && x.length >= 3)
  const out = new Set()
  for (let i = 0; i < seq.length - 1; i++) out.add(`${seq[i]} ${seq[i + 1]}`)
  return out
}
const readDuplicates = (subject, description, recent) => {
  const mineT = sigTokens(`${subject} ${(description || '').slice(0, 240)}`)
  const mineB = bigrams(subject)
  if (mineT.size < 2) return []
  const out = []
  for (const r of (recent || [])) {
    const theirsT = sigTokens(r.subject)
    if (!theirsT.size) continue
    let inter = 0; mineT.forEach(x => { if (theirsT.has(x)) inter++ })
    const jac = inter / new Set([...mineT, ...theirsT]).size
    const theirsB = bigrams(r.subject)
    let binter = 0; mineB.forEach(x => { if (theirsB.has(x)) binter++ })
    const dice = (mineB.size + theirsB.size) ? (2 * binter) / (mineB.size + theirsB.size) : 0
    const sim = 0.55 * jac + 0.45 * dice
    if (inter >= 2 && sim >= 0.22) out.push({ id: r.id, subject: r.subject, ticket_number: r.ticket_number, status: r.status, sim: Math.min(0.98, sim + 0.1) })
  }
  return out.sort((a, b) => b.sim - a.sim).slice(0, 3)
}

/* ═══════════════ keywords (kb query fuel) ═══════════════ */
const readKeywords = (subject, description, t) => {
  const counts = {}; const label = {}
  const add = (w, n) => {
    const st = stem(w)
    if (STOP.has(w) || STOP.has(st) || st.length < 3) return
    counts[st] = (counts[st] || 0) + n
    if (!label[st] || w.length < label[st].length) label[st] = w
  }
  for (const w of tokens(subject)) add(w, 2)
  for (const w of tokens(description)) add(w, 1)
  const seq = tokens(t)
  for (let i = 0; i < seq.length - 1; i++) {
    const a = seq[i], b = seq[i + 1]
    if (STOP.has(a) || STOP.has(b) || a.length < 3 || b.length < 3) continue
    const key = `${stem(a)} ${stem(b)}`
    counts[key] = (counts[key] || 0) + 1.6
    label[key] = `${a} ${b}`
  }
  return Object.entries(counts).sort((x, y) => y[1] - x[1]).slice(0, 5).map(([k]) => label[k])
}

/* ═══════════════ THE READ ═══════════════ */
export function analyseIntake({ subject = '', description = '', categories = [], recentTickets = [] }) {
  const raw = `${subject} ${description}`
  const engaged = raw.trim().length >= 4
  const t = ` ${norm(raw).replace(/\s+/g, ' ')} `
  const seq = tokens(raw)
  const ts = new Set(seq.map(stem))
  const shout = ((raw.match(/\b[A-Z]{3,}\b/g) || []).length >= 2 ? 0.5 : 0) + (/!{2,}/.test(raw) ? 0.5 : 0)

  if (!engaged) {
    return { engaged: false, keywords: [], entities: { codes: [], apps: [], devices: [], affected: null, timeframe: false },
      type: null, impact: null, urgency: null, priority: null, category: null, subcategory: null,
      sentiment: { score: 0, pct: 50, label: 'Neutral', tone: 'neutral', emoji: '😐' },
      quality: { pct: 0, level: 'thin', tips: [] }, duplicates: [], kbQuery: '' }
  }

  /* type — scored across every type; confidence = share of total evidence */
  const typeScores = Object.entries(TYPE_SIGNALS).map(([key, sig]) => {
    let s = 0; const ev = []
    for (const [rx, why] of sig.phrases) if (rx.test(t)) { s += 2.5; if (ev.length < 2) ev.push(why) }
    for (const w of sig.words) if (ts.has(stem(w))) { s += 1; if (ev.length < 3) ev.push(`“${w}”`) }
    return { key, label: sig.label, score: s, evidence: ev }
  }).sort((a, b) => b.score - a.score)
  const totalTypeScore = typeScores.reduce((s, x) => s + x.score, 0)
  const bestType = typeScores[0]
  const type = bestType.score >= 1 ? {
    value: bestType.key, label: bestType.label,
    confidence: Math.min(0.95, (bestType.score / Math.max(1, totalTypeScore)) * 0.55 + conf(bestType.score) * 0.45),
    evidence: bestType.evidence,
  } : null

  /* impact + urgency read separately → priority through the ITIL matrix */
  const impBest = scoreBands(IMPACT_BANDS, t)
  const urgBest = scoreBands(URGENCY_BANDS, t)
  const entities = readEntities(raw, t, ts)
  if (entities.affected != null && impBest.score === 0) {
    impBest.value = entities.affected >= 100 ? 'critical' : entities.affected >= 20 ? 'high' : entities.affected > 1 ? 'medium' : 'low'
    impBest.score = 1.6; impBest.evidence = [`${entities.affected} users affected`]
  }
  const downish = /\b(?:down|outage|offline|not working|stopped working|crash)\b/.test(t)
  if (urgBest.score === 0 && downish) { urgBest.value = 'high'; urgBest.score = 1; urgBest.evidence = ['a live outage implies urgency'] }
  if (impBest.score === 0 && downish) { impBest.value = 'medium'; impBest.score = 0.8; impBest.evidence = ['an outage with unstated scope'] }
  const impact = impBest.score > 0 ? { value: impBest.value, confidence: conf(impBest.score, 2), evidence: impBest.evidence } : null
  const urgency = urgBest.score > 0 ? { value: urgBest.value, confidence: conf(urgBest.score, 2), evidence: urgBest.evidence } : null
  let priority = null
  if (impact && urgency) {
    const p = IMPACT_URGENCY_MATRIX[urgency.value]?.[impact.value] || null
    if (p) priority = {
      value: p, confidence: Math.min(impact.confidence, urgency.confidence),
      evidence: [...(impact.evidence || []).slice(0, 1), ...(urgency.evidence || []).slice(0, 1)],
    }
  }

  /* category + subcategory — child hits nominate their parent */
  const scored = scoreCategories(categories || [], t, ts)
  let category = null; let subcategory = null
  if (scored.length && scored[0].score >= 1) {
    const top = scored[0]
    if (top.cat.parent_id) {
      const parent = (categories || []).find(c => String(c.id) === String(top.cat.parent_id))
      if (parent) {
        category = { id: parent.id, name: parent.name, confidence: conf(top.score), evidence: top.evidence }
        subcategory = { id: top.cat.id, name: top.cat.name, parentId: parent.id }
      }
    } else {
      category = { id: top.cat.id, name: top.cat.name, confidence: conf(top.score), evidence: top.evidence }
      const child = scored.find(x => String(x.cat.parent_id || '') === String(top.cat.id))
      if (child && child.score >= 1) subcategory = { id: child.cat.id, name: child.cat.name, parentId: top.cat.id }
    }
  }

  const sentiment = readSentiment(raw, seq, shout)
  const quality = readQuality(subject, description, entities, t)
  const duplicates = readDuplicates(subject, description, recentTickets)
  const keywords = readKeywords(subject, description, t)
  const kbQuery = keywords.slice(0, 2).join(' ').trim() || subject.trim()

  return { engaged: true, keywords, entities, type, impact, urgency, priority, category, subcategory, sentiment, quality, duplicates, kbQuery }
}
