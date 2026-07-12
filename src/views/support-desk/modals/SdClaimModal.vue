<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open && ticket" class="clm-overlay" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.22 }" @mousedown.self="close">
        <Motion class="clm" role="dialog" aria-modal="true"
          :initial="{ opacity: 0, y: 26, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.985 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">

          <!-- animated aura header -->
          <div class="clm-aura" aria-hidden="true"><span class="ca1" /><span class="ca2" /><span class="ca-grain" /></div>

          <header class="clm-head">
            <div class="clm-titles">
              <Motion as="p" class="clm-eyebrow sd-mono" :initial="{ y: -6, opacity: 0 }" :animate="{ y: 0, opacity: 1 }" :transition="{ duration: 0.4 }">
                <Hand :size="12" /> CLAIM TICKET · {{ laneLabel }}
              </Motion>
              <Motion as="h2" class="clm-title" :initial="{ y: 8, opacity: 0 }" :animate="{ y: 0, opacity: 1 }" :transition="{ duration: 0.45, delay: 0.05 }">
                {{ ticket.ticket_number }}
              </Motion>
            </div>
            <button class="clm-x" type="button" aria-label="Close" @click="close"><X :size="18" /></button>
          </header>

          <div class="clm-body">
            <!-- ticket crystal -->
            <Motion class="clm-block clm-ticket" v-bind="ent(0)">
              <p class="ct-subj">{{ ticket.subject }}</p>
              <div class="ct-tags">
                <SdPill kind="priority" :value="ticket.priority" />
                <span class="ct-sla" :class="slaState">{{ slaLabel }}</span>
                <span class="ct-lane" :class="ticket.team_id ? 'team' : 'triage'">
                  <component :is="ticket.team_id ? Users : Inbox" :size="11" /> {{ ticket.team_id ? (ticket.team_name || 'Team queue') : 'Triage pool' }}
                </span>
                <span class="ct-age"><Clock3 :size="11" /> waiting {{ ageLabel }}</span>
              </div>
            </Motion>

            <!-- requester -->
            <Motion class="clm-block" v-bind="ent(1)">
              <p class="blk-label"><User :size="12" /> Requester</p>
              <div class="req">
                <span class="req-av">{{ initials(ticket.raised_by_name || ticket.contact_name) }}</span>
                <div class="req-info">
                  <span class="req-name">{{ ticket.raised_by_name || ticket.contact_name || 'Unknown requester' }}</span>
                  <span class="req-sub">
                    <template v-if="ticket.organization_name">{{ ticket.organization_name }} · </template>
                    <template v-if="ticket.contact_email">{{ ticket.contact_email }} · </template>
                    raised {{ ageLabel }} ago
                  </span>
                </div>
              </div>
            </Motion>

            <!-- routing + eligibility -->
            <Motion class="clm-block clm-route" :class="eligClass" v-bind="ent(2)">
              <p class="blk-label"><Route :size="12" /> Routing &amp; eligibility</p>
              <div class="rt-grid">
                <div class="rt-cell"><span class="rt-k">Request type</span><span class="rt-v">{{ typeLabel(ticket.ticket_type) }}</span></div>
                <div class="rt-cell"><span class="rt-k">Category</span><span class="rt-v">{{ ticket.category_name || '—' }}</span></div>
                <div class="rt-cell"><span class="rt-k">Handled by</span><span class="rt-v">{{ routing.team_name || ticket.team_name || (loadingRoute ? 'Checking…' : 'Unrouted') }}</span></div>
                <div class="rt-cell"><span class="rt-k">SLA target</span><span class="rt-v">{{ slaTarget }}</span></div>
              </div>
              <div class="elig" :class="eligClass">
                <span class="elig-ring"><component :is="eligible ? ShieldCheck : ShieldAlert" :size="16" /></span>
                <span class="elig-txt">
                  <b>{{ eligible ? 'You can claim this' : 'Not your team' }}</b>
                  <i>{{ eligReason }}</i>
                </span>
              </div>
            </Motion>

            <!-- what happens (workflow) -->
            <Motion class="clm-block" v-bind="ent(3)">
              <p class="blk-label"><Workflow :size="12" /> What happens when you claim</p>
              <ol class="flow">
                <li v-for="(s, i) in FLOW" :key="s.k" class="flow-step" :style="{ '--d': i }">
                  <span class="fs-node"><component :is="s.icon" :size="13" /></span>
                  <span class="fs-l">{{ s.l }}</span>
                </li>
              </ol>
            </Motion>

            <!-- optional reason -->
            <Motion class="clm-block" v-bind="ent(4)">
              <p class="blk-label"><PencilLine :size="12" /> Note <span class="opt">optional · added to the timeline</span></p>
              <div class="chips">
                <button v-for="c in CHIPS" :key="c" class="chip" :class="{ on: note === c }" @click="note = note === c ? '' : c">{{ c }}</button>
              </div>
              <textarea v-model="note" class="clm-ta" rows="2" placeholder="Why are you taking this? (optional)" />
            </Motion>
          </div>

          <footer class="clm-foot">
            <button class="clm-btn ghost" @click="close">Cancel</button>
            <Motion as="button" class="clm-btn primary" :disabled="!eligible || claiming"
              :while-hover="eligible && !claiming ? { y: -2, scale: 1.02 } : {}" :while-tap="eligible && !claiming ? { scale: 0.97 } : {}" @click="doClaim">
              <component :is="claiming ? Loader : Hand" :size="15" :class="{ spin: claiming }" />
              {{ claiming ? 'Claiming…' : 'Claim to me' }}
            </Motion>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  X, Hand, User, Users, Inbox, Route, Clock3, ShieldCheck, ShieldAlert, Workflow,
  PencilLine, Loader, UserCheck, ListChecks, Timer, Building2,
} from 'lucide-vue-next'
import SdPill from '../components/SdPill.vue'
import { claimTicket, routingPreview, typeLabel } from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  ticket: { type: Object, default: null },
  agent: { type: Boolean, default: true },
})
const emit = defineEmits(['close', 'claimed'])
const toast = useToast()

const now = ref(Date.now())
let tick = null
const note = ref('')
const claiming = ref(false)
const routing = ref({})
const loadingRoute = ref(false)

const CHIPS = ['Owning this', 'Right skill set', 'Following up', 'Fastest to resolve']
const FLOW = [
  { k: 'assign', l: 'Assigned to you', icon: UserCheck },
  { k: 'queue', l: 'Enters My Tickets', icon: ListChecks },
  { k: 'sla', l: 'You own the SLA clock', icon: Timer },
  { k: 'team', l: 'Stamped to your team', icon: Building2 },
]

const ent = (i) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.44, delay: 0.12 + i * 0.07, ease: [0.16, 1, 0.3, 1] },
})

const dueMs = (t) => { const d = t?.resolution_due_at || t?.response_due_at; return d ? new Date(d).getTime() : null }
const slaState = computed(() => {
  const t = props.ticket; if (!t) return 'none'
  const dm = dueMs(t)
  if (t.sla_resolution_breached || (dm != null && dm <= now.value)) return 'breached'
  if (dm == null) return 'none'
  return (dm - now.value) <= 7200000 ? 'due-soon' : 'ok'
})
const slaLabel = computed(() => {
  const s = slaState.value
  if (s === 'breached') return 'SLA breached'
  if (s === 'none') return 'No SLA clock'
  const dm = dueMs(props.ticket); const h = (dm - now.value) / 3600000
  return h < 1 ? `${Math.max(1, Math.round(h * 60))}m to breach` : (h < 48 ? `${Math.round(h)}h to breach` : `${Math.round(h / 24)}d to breach`)
})
const slaTarget = computed(() => {
  const t = props.ticket; if (!t) return '—'
  if (t.resolution_due_at) { const d = new Date(t.resolution_due_at); return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  if (routing.value.sla_resolution_eta) { const d = new Date(routing.value.sla_resolution_eta); return `~${d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` }
  return 'No SLA'
})
const ageLabel = computed(() => {
  const t = props.ticket; if (!t?.created_at) return '—'
  const h = (now.value - new Date(t.created_at).getTime()) / 3600000
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m`
  if (h < 48) return `${Math.round(h)}h`
  return `${Math.round(h / 24)}d`
})
const laneLabel = computed(() => (props.ticket?.team_id ? 'TEAM QUEUE' : 'TRIAGE POOL'))

// eligibility — routingPreview.can_self_assign mirrors the backend claim gate (agent OR on a
// team that handles this request type). Superuser/agent flags make it true. Optimistic while loading.
const eligible = computed(() => (loadingRoute.value ? true : (routing.value.can_self_assign !== false)))
const eligClass = computed(() => (loadingRoute.value ? '' : (eligible.value ? 'ok' : 'blocked')))
const eligReason = computed(() => {
  if (loadingRoute.value) return 'Checking your team purview…'
  if (eligible.value) {
    if (routing.value.you_are_on_team && routing.value.team_name) return `You’re on ${routing.value.team_name}, which handles this request type.`
    if (routing.value.you_handle_type) return 'Your team handles this request type.'
    return 'Your role lets you claim across the desk.'
  }
  return routing.value.team_name
    ? `This routes to ${routing.value.team_name} — you’re not on a team that handles ${typeLabel(props.ticket?.ticket_type)}.`
    : 'You’re not on a team that handles this request type.'
})

const initials = (n) => (n || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()

const loadRouting = async () => {
  const t = props.ticket; if (!t) return
  loadingRoute.value = true; routing.value = {}
  try {
    routing.value = await routingPreview({
      category_id: t.category_id || undefined, subcategory_id: t.subcategory_id || undefined,
      ticket_type: t.ticket_type || 'incident',
      organization_id: t.organization_id || undefined, priority: t.priority || 'medium',
    }) || {}
  } catch { routing.value = {} } finally { loadingRoute.value = false }
}

const close = () => { if (!claiming.value) emit('close') }
const doClaim = async () => {
  const t = props.ticket
  if (!t || !eligible.value || claiming.value) return
  claiming.value = true
  try {
    const res = await claimTicket(t.id, { note: note.value?.trim() || undefined })
    toast.success(`Claimed ${t.ticket_number} — it’s in My Tickets now`)
    emit('claimed', res)
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not claim this ticket')
    if (e?.response?.status === 403 || e?.response?.status === 409) emit('claimed', null)  // refresh — state changed
  } finally { claiming.value = false }
}

const onKey = (e) => { if (e.key === 'Escape' && props.open) close() }
watch(() => props.open, (v) => {
  if (typeof document !== 'undefined') document.body.style.overflow = v ? 'hidden' : ''
  if (v) { note.value = ''; loadRouting() }
})
onMounted(() => { window.addEventListener('keydown', onKey); tick = setInterval(() => { now.value = Date.now() }, 1000) })
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); clearInterval(tick); if (typeof document !== 'undefined') document.body.style.overflow = '' })
</script>

<style scoped>
.clm-overlay { position: fixed; inset: 0; z-index: 2100; display: grid; place-items: center; padding: 24px;
  background: rgba(4, 5, 6, 0.64); backdrop-filter: blur(11px) saturate(140%); -webkit-backdrop-filter: blur(11px) saturate(140%); }
[data-theme="light"] .clm-overlay { background: rgba(40, 25, 10, 0.36); }

.clm { position: relative; width: min(600px, 94vw); max-height: 90vh; display: flex; flex-direction: column; overflow: hidden;
  background: var(--sd-surface-elevated); border: 1px solid var(--sd-border-strong); border-radius: 24px; box-shadow: var(--sd-shadow-hover); }

/* animated aura */
.clm-aura { position: absolute; inset: 0 0 auto 0; height: 150px; z-index: 0; pointer-events: none; overflow: hidden; }
.ca1, .ca2 { position: absolute; border-radius: 50%; filter: blur(48px); }
.ca1 { width: 260px; height: 260px; top: -120px; left: -40px; background: radial-gradient(circle, rgba(251, 191, 36, 0.4), transparent 65%); animation: clm-orb 20s ease-in-out infinite; }
.ca2 { width: 220px; height: 220px; top: -110px; right: 4%; background: radial-gradient(circle, rgba(251, 146, 60, 0.32), transparent 66%); animation: clm-orb 25s ease-in-out infinite reverse; }
.ca-grain { position: absolute; inset: 0; opacity: 0.06; mix-blend-mode: overlay; background-image: radial-gradient(rgba(251, 191, 36, 0.5) 1px, transparent 1px); background-size: 6px 6px; }
.clm::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 3px; z-index: 2; background: var(--sd-grad-rail); }

.clm-head { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 22px 24px 14px; }
.clm-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.18em; color: var(--sd-amber); margin: 0 0 7px; }
.clm-title { font-size: 22px; font-weight: 850; letter-spacing: -0.02em; color: var(--sd-text); margin: 0; }
.clm-x { flex-shrink: 0; width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px; cursor: pointer; background: transparent; border: 1px solid var(--sd-border); color: var(--sd-text-muted); transition: all 0.2s var(--sd-spring); }
.clm-x:hover { color: var(--sd-text); border-color: var(--sd-border-strong); background: var(--sd-surface); }

.clm-body { position: relative; z-index: 1; padding: 8px 24px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 13px; }
.clm-block { background: var(--sd-surface-glass); border: 1px solid var(--sd-border); border-radius: 14px; padding: 13px 15px; }
.blk-label { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--sd-text-dim); margin: 0 0 10px; }
.blk-label .opt { text-transform: none; letter-spacing: 0; font-weight: 500; color: var(--sd-text-dim); opacity: 0.8; }

/* ticket crystal */
.clm-ticket { background: var(--sd-grad-card), var(--sd-surface-glass); }
.ct-subj { margin: 0 0 10px; font-size: 15px; font-weight: 700; color: var(--sd-text); line-height: 1.35; }
.ct-tags { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.ct-sla { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; color: var(--sd-text-muted); background: var(--sd-surface); border: 1px solid var(--sd-border); }
.ct-sla.breached { color: var(--sd-danger); background: color-mix(in srgb, var(--sd-danger) 14%, transparent); }
.ct-sla.due-soon { color: var(--sd-warning); background: color-mix(in srgb, var(--sd-warning) 14%, transparent); }
.ct-lane { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; color: var(--sd-text-muted); background: var(--sd-surface); border: 1px solid var(--sd-border); }
.ct-lane.triage { color: var(--sd-ember); }
.ct-age { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--sd-text-muted); margin-left: auto; }

/* requester */
.req { display: flex; align-items: center; gap: 12px; }
.req-av { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; font-size: 13px; font-weight: 800; color: #1a1206; background: var(--sd-grad-hero); }
[data-theme="light"] .req-av { color: #fff8ec; }
.req-info { min-width: 0; }
.req-name { display: block; font-size: 14px; font-weight: 700; color: var(--sd-text); }
.req-sub { display: block; font-size: 12px; color: var(--sd-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* routing + eligibility */
.rt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; margin-bottom: 12px; }
.rt-cell { display: flex; flex-direction: column; gap: 2px; }
.rt-k { font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--sd-text-dim); }
.rt-v { font-size: 13px; font-weight: 600; color: var(--sd-text); }
.elig { display: flex; align-items: center; gap: 11px; padding: 11px 13px; border-radius: 12px; border: 1px solid var(--sd-border); background: var(--sd-surface); }
.elig-ring { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; }
.elig.ok .elig-ring { color: var(--sd-success); background: color-mix(in srgb, var(--sd-success) 14%, transparent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--sd-success) 40%, transparent); animation: clm-pop 0.4s var(--sd-spring) both; }
.elig.blocked .elig-ring { color: var(--sd-danger); background: color-mix(in srgb, var(--sd-danger) 14%, transparent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--sd-danger) 40%, transparent); }
.elig-txt { display: flex; flex-direction: column; gap: 2px; }
.elig-txt b { font-size: 13px; font-weight: 700; color: var(--sd-text); }
.elig.ok b { color: var(--sd-success); }
.elig.blocked b { color: var(--sd-danger); }
.elig-txt i { font-style: normal; font-size: 11.5px; color: var(--sd-text-muted); line-height: 1.4; }
.clm-route.blocked { border-color: color-mix(in srgb, var(--sd-danger) 40%, var(--sd-border)); }

/* workflow */
.flow { display: flex; align-items: flex-start; justify-content: space-between; gap: 4px; margin: 2px 0 0; padding: 0; list-style: none; position: relative; }
.flow::before { content: ''; position: absolute; top: 15px; left: 8%; right: 8%; height: 2px; border-radius: 2px;
  background: linear-gradient(90deg, var(--sd-amber), var(--sd-ember)); opacity: 0.28; }
.flow::after { content: ''; position: absolute; top: 14px; left: 8%; width: 22px; height: 4px; border-radius: 4px;
  background: var(--sd-amber); box-shadow: 0 0 10px var(--sd-amber); animation: clm-run 2.6s linear infinite; }
.flow-step { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1; text-align: center;
  animation: clm-light 0.5s var(--sd-spring) both; animation-delay: calc(0.35s + var(--d) * 0.14s); }
.fs-node { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; color: var(--sd-amber);
  background: var(--sd-surface-elevated); border: 1px solid var(--sd-amber-border); }
.fs-l { font-size: 10px; font-weight: 600; color: var(--sd-text-secondary); line-height: 1.25; max-width: 9ch; }

/* note */
.chips { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 9px; }
.chip { padding: 5px 11px; border-radius: 999px; font-size: 11.5px; font-weight: 600; cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text-secondary); transition: color 0.16s, border-color 0.16s; }
.chip:hover { color: var(--sd-text); border-color: var(--sd-amber); }
.chip.on { color: var(--sd-amber); border-color: var(--sd-amber); background: var(--sd-amber-soft); }
.clm-ta { width: 100%; resize: vertical; padding: 10px 12px; border-radius: 11px; background: var(--sd-surface); border: 1px solid var(--sd-border-strong); color: var(--sd-text); font-family: inherit; font-size: 13px; outline: none; }
.clm-ta:focus { border-color: var(--sd-amber); }

.clm-foot { position: relative; z-index: 1; display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 15px 24px; border-top: 1px solid var(--sd-border); background: var(--sd-surface-glass); }
.clm-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.clm-btn.ghost { background: transparent; }
.clm-btn.ghost:hover { border-color: var(--sd-text-muted); }
.clm-btn.primary { border: none; background: var(--sd-grad-hero); color: #1a1206; box-shadow: 0 8px 22px rgba(251, 146, 60, 0.3); }
[data-theme="light"] .clm-btn.primary { color: #fff8ec; }
.clm-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.spin { animation: clm-spin 0.8s linear infinite; }

@keyframes clm-orb { 0%, 100% { translate: 0 0; } 50% { translate: 20px 12px; } }
@keyframes clm-spin { to { transform: rotate(360deg); } }
@keyframes clm-pop { from { transform: scale(0.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes clm-light { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes clm-run { 0% { left: 8%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { left: calc(92% - 22px); opacity: 0; } }

@media (max-width: 560px) { .rt-grid { grid-template-columns: 1fr; } .fs-l { font-size: 9px; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .ca1,
  html:not([data-cinematic="on"]) .ca2,
  html:not([data-cinematic="on"]) .flow::after,
  html:not([data-cinematic="on"]) .flow-step,
  html:not([data-cinematic="on"]) .spin { animation: none; }
}
</style>
