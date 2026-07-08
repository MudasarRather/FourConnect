<template>
  <!-- Live routing intelligence for the Assignment step. Calls /me/tickets/routing-preview
       (debounced) to show which team WOULD handle this + a real SLA forecast, surfaces a
       "you're on the handling team" badge with a self-claim toggle, and (for reporting
       managers / admins only) reveals team + agent routing pickers. -->
  <div class="sd-route">
    <!-- destination -->
    <Motion class="rt-dest" :class="{ on: !!pv.team_name }" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
      <span class="rt-ic"><component :is="loading ? LoaderCircle : (pv.team_name ? Route : Inbox)" :size="18" :class="{ spin: loading }" /></span>
      <div class="rt-b">
        <span class="rt-eyebrow">{{ loading ? 'Resolving route…' : (pv.team_name ? 'Auto-routes to' : 'No matched team') }}</span>
        <span class="rt-team">{{ pv.team_name || 'Triage queue — an agent will route it' }}</span>
        <span v-if="pv.queue_name" class="rt-queue"><Layers :size="11" /> {{ pv.queue_name }}</span>
      </div>
      <div class="rt-sla">
        <span class="rt-sla-row"><Timer :size="12" /> Response <b>{{ etaResp }}</b></span>
        <span class="rt-sla-row"><CheckCircle2 :size="12" /> Resolve <b>{{ etaResolve }}</b></span>
        <span v-if="pv.sla_package_name" class="rt-pkg">{{ pv.sla_package_name }}</span>
      </div>
    </Motion>

    <!-- BLOCKED — not a member of the team that handles this; can't raise it here -->
    <Presence>
      <Motion v-if="blocked" class="rt-block" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: -6 }">
        <span class="rt-block-glow" aria-hidden="true" />
        <span class="rt-block-ic"><ShieldAlert :size="20" /></span>
        <div class="rt-block-b">
          <span class="rt-block-h">You're not on the {{ pv.team_name }} team</span>
          <span class="rt-block-p">This classification routes to <b>{{ pv.team_name }}</b>, and only its members can raise it here. Pick a category your team handles, or ask {{ pv.team_name }} to raise it.</span>
        </div>
        <span class="rt-block-lock"><Lock :size="13" /> Locked</span>
      </Motion>
    </Presence>

    <!-- you're on the handling team → self-claim -->
    <Presence>
      <Motion v-if="canSelfClaim && !blocked" class="rt-claim" :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }">
        <span class="rt-claim-badge"><ShieldCheck :size="13" /> {{ pv.you_are_on_team ? `You're on the ${pv.team_name || 'support'} team that handles this` : 'You can work this ticket' }}</span>
        <button type="button" class="rt-toggle" :class="{ on: assignMe }" @click="emit('update:assignMe', !assignMe)">
          <span class="rt-knob"><UserCheck :size="13" /></span>
          <span class="rt-tl">{{ assignMe ? 'Assigned to me' : 'Assign to me' }}</span>
        </button>
      </Motion>
    </Presence>

    <!-- manager / admin → route to another team + pick an agent -->
    <div v-if="canRoute" class="rt-manage">
      <span class="rt-manage-h"><GitBranch :size="12" /> Routing override <i>manager / admin</i></span>
      <div class="rt-grid">
        <div class="rt-f">
          <label>Route to team</label>
          <SdSelect :model-value="teamId" :options="teamOptions" placeholder="Auto (by category / type)" @update:modelValue="(v) => emit('update:teamId', v)" />
        </div>
        <div class="rt-f">
          <label>Assign agent</label>
          <SdSelect :model-value="assignedAgentId" :options="agentOptions" placeholder="Leave for auto / queue" @update:modelValue="(v) => emit('update:assignedAgentId', v)" />
        </div>
      </div>
      <p class="rt-hint"><Info :size="12" /> Leave both open to let auto-routing pick the best team &amp; agent.</p>
    </div>

    <p v-else-if="!canSelfClaim && !blocked" class="rt-note"><Info :size="12" /> This ticket auto-routes the moment you submit — you'll be notified on every update.</p>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { Route, Inbox, Layers, Timer, CheckCircle2, ShieldCheck, ShieldAlert, Lock, UserCheck, GitBranch, Info, LoaderCircle } from 'lucide-vue-next'
import SdSelect from './SdSelect.vue'
import { routingPreview } from '@/composables/useSupportDesk'

const props = defineProps({
  categoryId: { type: String, default: '' },
  ticketType: { type: String, default: 'incident' },
  organizationId: { type: String, default: '' },
  priority: { type: String, default: 'medium' },
  slaPackageId: { type: String, default: '' },
  isAgent: { type: Boolean, default: false },
  isManager: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  assignMe: { type: Boolean, default: false },
  teamId: { type: String, default: '' },
  assignedAgentId: { type: String, default: '' },
  teamOptions: { type: Array, default: () => [] },
  agentOptions: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:assignMe', 'update:teamId', 'update:assignedAgentId', 'preview'])

const pv = reactive({ team_id: null, team_name: null, queue_name: null, you_are_on_team: false, can_self_assign: false, you_handle_type: false, team_member_ids: [], handling_member_ids: [], sla_package_name: null, sla_response_eta: null, sla_resolution_eta: null })
const loading = ref(false)

const canSelfClaim = computed(() => props.isAgent || pv.you_are_on_team || pv.can_self_assign)
const canRoute = computed(() => props.isManager || props.isAdmin)
// Blocked = a real team handles this, but the requester isn't on it (and isn't an
// admin) → they can't raise it here. Drives the lock + disables the parent's Continue.
const blocked = computed(() => !!pv.team_id && !canSelfClaim.value && !props.isAdmin)

/* relative ETA from ISO (mirrors the section's SLA fallback wording) */
const relTime = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso).getTime() - Date.now()
  if (isNaN(d)) return '—'
  const h = d / 3600000
  if (h < 1) return `~${Math.max(1, Math.round(h * 60))} min`
  if (h < 48) return `~${Math.round(h)} h`
  return `~${Math.round(h / 24)} d`
}
const etaResp = computed(() => relTime(pv.sla_response_eta))
const etaResolve = computed(() => relTime(pv.sla_resolution_eta))

let timer = null
const fetchPreview = () => {
  loading.value = true
  routingPreview({
    category_id: props.categoryId || undefined,
    ticket_type: props.ticketType || 'incident',
    organization_id: props.organizationId || undefined,
    priority: props.priority || 'medium',
    sla_package_id: props.slaPackageId || undefined,
  }).then((r) => {
    Object.assign(pv, r || {})
    emit('preview', { ...pv })
  }).catch(() => {}).finally(() => { loading.value = false })
}
const schedule = () => { clearTimeout(timer); timer = setTimeout(fetchPreview, 280) }

watch(() => [props.categoryId, props.ticketType, props.organizationId, props.priority, props.slaPackageId], schedule, { immediate: true })
onBeforeUnmount(() => clearTimeout(timer))
</script>

<style scoped>
.sd-route { display: flex; flex-direction: column; gap: 14px; }

.rt-dest { display: flex; align-items: center; gap: 14px; padding: 16px 17px; border-radius: 15px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); }
.rt-dest.on { border-color: var(--sd-amber-border); background: var(--sd-amber-soft); }
.rt-ic { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; color: var(--sd-amber); background: color-mix(in srgb, var(--sd-amber) 14%, transparent); flex-shrink: 0; }
.rt-dest.on .rt-ic { color: #1a1206; background: var(--sd-grad-hero); }
[data-theme="light"] .rt-dest.on .rt-ic { color: #fff8ec; }
.rt-ic .spin { animation: sd-spin-slow 0.9s linear infinite; }
.rt-b { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.rt-eyebrow { font-family: var(--sd-mono); font-size: 9px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--sd-text-muted); }
.rt-team { font-size: 15px; font-weight: 800; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; }
.rt-queue { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--sd-text-muted); }
.rt-sla { display: flex; flex-direction: column; gap: 3px; align-items: flex-end; flex-shrink: 0; padding-left: 12px; border-left: 1px solid var(--sd-border); }
.rt-sla-row { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--sd-text-muted); }
.rt-sla-row b { color: var(--sd-text); font-family: var(--sd-mono); font-size: 11.5px; }
.rt-sla-row svg { color: var(--sd-amber); }
.rt-pkg { font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--sd-text-dim); }

/* blocked — not on the handling team */
.rt-block { position: relative; display: flex; align-items: center; gap: 14px; overflow: hidden; padding: 16px 17px; border-radius: 15px; background: var(--sd-danger-soft); border: 1px solid color-mix(in srgb, var(--sd-danger) 38%, transparent); }
.rt-block-glow { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(60% 120% at 8% 50%, color-mix(in srgb, var(--sd-danger) 18%, transparent), transparent 70%); animation: rt-block-pulse 2.4s ease-in-out infinite; }
.rt-block-ic { position: relative; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 13px; color: var(--sd-danger); background: color-mix(in srgb, var(--sd-danger) 16%, transparent); border: 1px solid color-mix(in srgb, var(--sd-danger) 34%, transparent); flex-shrink: 0; }
.rt-block-b { position: relative; display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
.rt-block-h { font-size: 14px; font-weight: 800; color: var(--sd-danger); }
.rt-block-p { font-size: 12px; line-height: 1.5; color: var(--sd-text-secondary); }
.rt-block-p b { color: var(--sd-text); }
.rt-block-lock { position: relative; display: inline-flex; align-items: center; gap: 5px; align-self: flex-start; font-family: var(--sd-mono); font-size: 9px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--sd-danger); padding: 4px 9px; border-radius: 7px; background: color-mix(in srgb, var(--sd-danger) 12%, transparent); border: 1px solid color-mix(in srgb, var(--sd-danger) 30%, transparent); flex-shrink: 0; }
@keyframes rt-block-pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }

.rt-claim { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; overflow: hidden; padding: 13px 15px; border-radius: 14px; background: var(--sd-success-soft); border: 1px solid color-mix(in srgb, var(--sd-success) 30%, transparent); }
.rt-claim-badge { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 650; color: var(--sd-success); }
.rt-toggle { display: inline-flex; align-items: center; gap: 9px; padding: 8px 12px 8px 8px; border-radius: 11px; cursor: pointer; font-family: inherit; background: var(--sd-surface); border: 1px solid var(--sd-border-strong); transition: all 0.2s var(--sd-spring); }
.rt-knob { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; color: var(--sd-text-muted); background: var(--sd-surface-glass); transition: all 0.24s var(--sd-spring); }
.rt-toggle.on { border-color: transparent; background: var(--sd-grad-hero); }
.rt-toggle.on .rt-knob { color: #1a1206; background: rgba(255,255,255,0.3); }
.rt-toggle.on .rt-tl { color: #1a1206; }
[data-theme="light"] .rt-toggle.on .rt-tl { color: #fff8ec; }
[data-theme="light"] .rt-toggle.on .rt-knob { color: #fff8ec; }
.rt-tl { font-size: 12.5px; font-weight: 700; color: var(--sd-text-secondary); }

.rt-manage { padding: 15px 16px; border-radius: 15px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.rt-manage-h { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 750; letter-spacing: 0.04em; text-transform: uppercase; color: var(--sd-text-muted); margin-bottom: 12px; }
.rt-manage-h svg { color: var(--sd-amber); }
.rt-manage-h i { font-style: normal; font-size: 9px; font-weight: 800; letter-spacing: 0.1em; color: var(--sd-text-dim); margin-left: auto; }
.rt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.rt-f { display: flex; flex-direction: column; gap: 6px; }
.rt-f label { font-size: 12px; font-weight: 600; color: var(--sd-text-secondary); }
.rt-hint, .rt-note { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--sd-text-dim); margin: 11px 0 0; }
.rt-note { margin: 0; }

@media (max-width: 560px) {
  .rt-dest { flex-wrap: wrap; }
  .rt-sla { align-items: flex-start; padding-left: 0; border-left: none; border-top: 1px solid var(--sd-border); padding-top: 8px; width: 100%; flex-direction: row; gap: 14px; }
  .rt-grid { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .rt-ic .spin { animation: sd-spin-slow 1s linear infinite; }
  html:not([data-cinematic="on"]) .rt-block-glow { animation: none; }
}
</style>
