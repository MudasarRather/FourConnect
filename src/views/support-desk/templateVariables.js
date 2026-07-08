/* Template variables — the moustache tokens a template's subject/body may carry.
   Substitution is FRONTEND-ONLY, at apply/preview time: the backend stores the
   plain text with placeholders (Zendesk-style). Unresolved tokens stay VISIBLE
   in the output so the agent notices and fills them by hand. */

export const TEMPLATE_VARIABLES = [
  { token: '{{requester.name}}', label: 'Requester name', hint: 'Full name of the person raising the ticket' },
  { token: '{{requester.email}}', label: 'Requester email', hint: 'Work email of the requester' },
  { token: '{{requester.department}}', label: 'Department', hint: 'Requester’s department, when known' },
  { token: '{{org.name}}', label: 'Organization', hint: 'Client organization on the ticket' },
  { token: '{{team.name}}', label: 'Team', hint: 'Support team the ticket routes to' },
  { token: '{{agent.name}}', label: 'Agent name', hint: 'The agent applying the template' },
  { token: '{{date}}', label: 'Date', hint: 'Today’s date (local)' },
  { token: '{{time}}', label: 'Time', hint: 'Current time (local)' },
  // Ticket tokens — resolvable only when a template RUNS ON an existing ticket
  // (the Projection Room macro); at new-ticket apply time they stay visible.
  { token: '{{ticket.number}}', label: 'Ticket number', hint: 'The ticket a macro runs on (macros only)' },
  { token: '{{ticket.subject}}', label: 'Ticket subject', hint: 'Subject of the ticket a macro runs on (macros only)' },
]

const KNOWN = new Set(TEMPLATE_VARIABLES.map((v) => v.token.slice(2, -2)))

/* Sample context for the wizard's live preview pane. */
export const SAMPLE_CONTEXT = {
  'requester.name': 'Asha Verma',
  'requester.email': 'asha.verma@example.com',
  'requester.department': 'Finance',
  'org.name': 'Meridian Retail Pvt Ltd',
  'team.name': 'Network Operations',
  'agent.name': 'You',
  date: new Date().toLocaleDateString(),
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
}

/* Replace known tokens that HAVE a non-empty value in ctx; leave the rest visible. */
export function substituteTemplate(text, ctx = {}) {
  if (!text) return text
  return String(text).replace(/\{\{\s*([a-zA-Z_.]+)\s*\}\}/g, (m, key) => {
    const v = ctx[key]
    return v != null && String(v).trim() !== '' ? String(v) : m
  })
}

/* Tokens present in the text that are NOT in the documented set (wizard warning). */
export function detectUnknownTokens(text) {
  if (!text) return []
  const out = new Set()
  const re = /\{\{\s*([a-zA-Z_.]+)\s*\}\}/g
  let m
  while ((m = re.exec(String(text)))) {
    if (!KNOWN.has(m[1])) out.add(`{{${m[1]}}}`)
  }
  return [...out]
}
