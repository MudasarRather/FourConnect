<template>
  <SetModal :open="open" :title="`Retire ${target?.label || 'type'}`" subtitle="Workforce · Engagement"
    :icon="Trash2" accent-color="var(--set-conflict)" :width="760" aside-placement="bottom" mode="delete" @close="$emit('close')">

    <div class="etd" :class="factsPlacement">
      <!-- ACTION ZONE -->
      <div class="etd-action">
        <Motion as="div" class="etd-head" :data-blocked="blocked"
          :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
          <span class="etd-ic">
            <span class="etd-ic-ring" aria-hidden="true" />
            <component :is="glyph" :size="18" />
          </span>
          <div class="etd-head-id">
            <b>{{ target?.label || '—' }}</b>
            <span v-if="target?.code" class="set-mono">{{ target.code }}</span>
          </div>
          <span class="etd-stamp" :data-blocked="blocked">{{ blocked ? 'Blocked' : 'Clear to retire' }}</span>
        </Motion>

        <!-- pre-flight -->
        <div class="etd-checks">
          <span class="etd-checks-lab">Pre-flight clearance</span>

          <Motion as="div" class="etd-check" :data-state="engaged > 0 ? 'fail' : 'pass'"
            :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.08 }">
            <span class="etd-check-ic"><component :is="engaged > 0 ? XCircle : CheckCircle2" :size="15" /></span>
            <div class="etd-check-body">
              <b>{{ engaged > 0 ? `${engaged} employee${engaged === 1 ? '' : 's'} engaged under this type` : 'No employees engaged under this type' }}</b>
              <span>{{ engaged > 0 ? 'The server refuses the delete until each is moved to another engagement model.' : 'Nobody references this type — safe to retire.' }}</span>
            </div>
            <button v-if="engaged > 0" class="etd-check-go" @click="$emit('view-people', target)">View people <ArrowRight :size="12" /></button>
          </Motion>

          <Motion as="div" class="etd-check" :data-state="target?.is_active ? 'warn' : 'info'"
            :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.14 }">
            <span class="etd-check-ic"><component :is="target?.is_active ? AlertTriangle : Info" :size="15" /></span>
            <div class="etd-check-body">
              <b>{{ target?.is_active ? 'Currently active — offered to new hires' : 'Already inactive' }}</b>
              <span>{{ target?.is_active ? 'Retiring pulls it from the new-employee picker immediately. Prefer deactivating if you might re-use it.' : 'It is already hidden from the new-hire picker.' }}</span>
            </div>
          </Motion>
        </div>

        <!-- non-destructive nudge -->
        <Motion as="div" class="etd-soft" v-if="target?.is_active"
          :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.2 }">
          <div class="etd-soft-txt"><PowerOff :size="14" /><span>Not sure? <b>Deactivate</b> instead — it stays in the ledger and on existing records, just hidden from new hires. Fully reversible.</span></div>
          <button type="button" class="etd-soft-btn" :disabled="loading" @click="$emit('deactivate', target)">Deactivate instead</button>
        </Motion>

        <!-- reason -->
        <div class="etd-reason">
          <span class="etd-reason-lab">Reason for removal <i>(recorded in the settings ledger)</i></span>
          <div class="etd-presets">
            <button v-for="p in PRESETS" :key="p" type="button" class="etd-preset" :class="{ on: reason === p }" @click="pick(p)">{{ p }}</button>
          </div>
          <textarea v-model="reason" rows="2" class="etd-textarea" placeholder="Add context — e.g. consolidated into Full Time after the contractor policy change…" />
        </div>

        <Motion v-if="blocked" as="div" class="etd-blocked" key="blk"
          :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.3 }">
          <ShieldAlert :size="14" /> Locked while {{ engaged }} {{ engaged === 1 ? 'person is' : 'people are' }} engaged under this type. Reassign or deactivate instead.
        </Motion>
      </div>

      <!-- FACTS ZONE (left when few facts, bottom when many) -->
      <aside class="etd-facts">
        <span class="etd-facts-edge" aria-hidden="true" />
        <header class="etd-facts-head"><FileText :size="12" /> Type record</header>
        <div class="etd-facts-grid">
          <Motion v-for="(f, i) in facts" :key="f.label" as="div" class="etd-fact"
            :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.36, delay: 0.06 + i * 0.04, ease: [0.16, 1, 0.3, 1] }">
            <span class="etd-fact-ic" :data-tone="f.tone"><component :is="f.icon" :size="13" /></span>
            <div class="etd-fact-body">
              <span class="etd-fact-lab">{{ f.label }}</span>
              <b :class="{ muted: !f.set }">{{ f.value }}</b>
            </div>
          </Motion>
        </div>
      </aside>
    </div>

    <template #aside>
      <SetWorkflowRail accent="var(--set-conflict)" :icon="Trash2" title="What retiring an engagement model does"
        :summary="summary" :steps="steps" :affects="affects" :note="note" danger :actor="actor" mode="delete" orientation="horizontal" />
    </template>

    <template #footer>
      <button class="set-btn set-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="set-btn etd-confirm" :class="{ disabled: blocked || loading }"
        :whileHover="(blocked || loading) ? {} : { y: -2, scale: 1.02 }" :whileTap="(blocked || loading) ? {} : { scale: 0.96 }"
        :disabled="blocked || loading" @click="$emit('confirm', reason)">
        <Loader v-if="loading" :size="14" class="set-spin" /><Trash2 v-else :size="14" />
        {{ blocked ? 'Reassign people first' : 'Retire type' }}
      </Motion>
    </template>
  </SetModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  Trash2, Loader, Hash, FileText, Info, ShieldAlert, ShieldCheck, CheckCircle2, XCircle, AlertTriangle, ArrowRight,
  Archive, History, RotateCcw, Power, PowerOff, Users, Percent,
  BriefcaseBusiness, Clock3, ScrollText, Handshake, GraduationCap, Tag,
} from 'lucide-vue-next'
import SetModal from './SetModal.vue'
import SetWorkflowRail from './SetWorkflowRail.vue'
import { MODULES } from './connectivity'
import { useActor } from '../composables/useActor'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  target: { type: Object, default: null },
  engaged: { type: Number, default: 0 },
  share: { type: Number, default: 0 },
  hasWorkforce: { type: Boolean, default: false },
})
defineEmits(['close', 'confirm', 'deactivate', 'view-people'])

const actor = useActor()
const reason = ref('')
watch(() => props.open, (v) => { if (v) reason.value = '' })

const PRESETS = ['Consolidated into another type', 'Duplicate', 'Policy change', 'No longer offered', 'Created in error']
const pick = (p) => { reason.value = reason.value === p ? '' : p }

const blocked = computed(() => Number(props.engaged || 0) > 0)

const glyph = computed(() => {
  const c = String(props.target?.code || '').toUpperCase()
  if (c.includes('FULL')) return BriefcaseBusiness
  if (c.includes('PART')) return Clock3
  if (c.includes('CONTRACT')) return ScrollText
  if (c.includes('CONSULT')) return Handshake
  if (c.includes('INTERN') || c.includes('TRAINEE')) return GraduationCap
  return Tag
})

const facts = computed(() => {
  const t = props.target || {}
  const list = [
    { label: 'Code', value: t.code || '—', set: !!t.code, icon: Hash, tone: 'gold' },
    { label: 'Status', value: t.is_active ? 'Active' : 'Inactive', set: !!t.is_active, icon: t.is_active ? Power : PowerOff, tone: t.is_active ? 'ok' : 'warn' },
    { label: 'Engaged', value: `${props.engaged} ${props.engaged === 1 ? 'person' : 'people'}`, set: props.engaged > 0, icon: Users, tone: props.engaged > 0 ? 'danger' : 'ok' },
  ]
  if (props.hasWorkforce) list.push({ label: 'Share of workforce', value: `${props.share}%`, set: props.share > 0, icon: Percent, tone: 'gold' })
  if (t.description) list.push({ label: 'Description', value: t.description, set: true, icon: FileText, tone: 'gold' })
  return list
})
// few facts → side (left); many → bottom strip
const factsPlacement = computed(() => facts.value.length > 4 ? 'stacked' : 'side')

const affects = ['employees', 'payroll', 'recruitment'].map(s => MODULES[s]).filter(Boolean).map(m => ({ icon: m.icon, label: m.label }))
const summary = computed(() => `Retiring ${props.target?.label || 'this type'} pulls it from the new-hire picker. It is a soft-delete — the row is kept for audit and can be restored. Built-in types can never be deleted, only deactivated.`)
const steps = computed(() => [
  { icon: ShieldCheck, title: 'Pre-flight', text: 'The API refuses (409) while any active employee is still engaged under this type.' },
  { icon: Archive, title: 'Soft-delete', text: 'The type is tombstoned — gone from the composition orbit and every dropdown, retained in the database.' },
  { icon: PowerOff, title: 'Picker', text: props.target?.is_active ? 'It disappears from the new-employee engagement-model picker the moment it is retired.' : 'It was already hidden from the new-hire picker.' },
  { icon: History, title: 'Audited · reversible', text: 'The removal and your reason are sealed into the settings ledger; a super admin can restore it.' },
])
const note = computed(() => blocked.value
  ? `${props.engaged} employee record(s) reference this type. Move them to another engagement model in Employees before it can be removed.`
  : 'Tip: deactivating keeps history intact and is reversible — prefer it unless this type was created in error.')
</script>

<style scoped>
.etd { display: grid; gap: 16px; }
.etd.side { grid-template-columns: minmax(0, 230px) minmax(0, 1fr); align-items: start; }
.etd.side .etd-action { order: 2; }
.etd.side .etd-facts { order: 1; }
.etd.stacked { grid-template-columns: 1fr; }
.etd.stacked .etd-facts { order: 2; }

.etd-action { display: flex; flex-direction: column; gap: 13px; }

.etd-head { position: relative; display: flex; align-items: center; gap: 12px; padding: 13px 15px; border-radius: 14px;
  background: var(--set-panel); border: 1px solid color-mix(in srgb, var(--set-conflict) 22%, transparent); }
.etd-ic { position: relative; display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0; color: var(--set-conflict);
  background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 30%, transparent); }
.etd-ic-ring { position: absolute; inset: -4px; border-radius: 15px; border: 1px solid color-mix(in srgb, var(--set-conflict) 34%, transparent); animation: etd-pulse 2.6s ease-in-out infinite; }
@keyframes etd-pulse { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.1); opacity: 0; } }
.etd-head-id { flex: 1; min-width: 0; }
.etd-head-id b { display: block; font-size: 15px; font-weight: 800; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.etd-head-id span { font-size: 11px; color: var(--set-text-muted); }
.etd-stamp { flex-shrink: 0; font-size: 9px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px;
  color: var(--set-ok); background: var(--set-ok-soft); border: 1px solid color-mix(in srgb, var(--set-ok) 28%, transparent); }
.etd-stamp[data-blocked="true"] { color: var(--set-conflict); background: var(--set-conflict-soft); border-color: color-mix(in srgb, var(--set-conflict) 28%, transparent); }

.etd-checks { display: flex; flex-direction: column; gap: 8px; }
.etd-checks-lab { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-dim); }
.etd-check { display: flex; align-items: flex-start; gap: 10px; padding: 11px 12px; border-radius: 12px;
  background: var(--set-surface); border: 1px solid var(--set-border); border-left: 3px solid var(--set-unset); }
.etd-check[data-state="pass"] { border-left-color: var(--set-ok); }
.etd-check[data-state="fail"] { border-left-color: var(--set-conflict); background: color-mix(in srgb, var(--set-conflict) 6%, var(--set-surface)); }
.etd-check[data-state="warn"] { border-left-color: var(--set-partial); }
.etd-check[data-state="info"] { border-left-color: var(--set-deep); }
.etd-check-ic { flex-shrink: 0; margin-top: 1px; }
.etd-check[data-state="pass"] .etd-check-ic :deep(svg) { color: var(--set-ok); }
.etd-check[data-state="fail"] .etd-check-ic :deep(svg) { color: var(--set-conflict); }
.etd-check[data-state="warn"] .etd-check-ic :deep(svg) { color: var(--set-partial); }
.etd-check[data-state="info"] .etd-check-ic :deep(svg) { color: var(--set-deep); }
.etd-check-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.etd-check-body b { font-size: 12.5px; font-weight: 750; color: var(--set-text); }
.etd-check-body span { font-size: 11px; line-height: 1.45; color: var(--set-text-muted); }
.etd-check-go { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; align-self: center; padding: 6px 10px; border-radius: 9px; cursor: pointer;
  font: inherit; font-size: 11px; font-weight: 700; color: var(--set-conflict); background: var(--set-conflict-soft);
  border: 1px solid color-mix(in srgb, var(--set-conflict) 32%, transparent); transition: all 0.2s; }
.etd-check-go:hover { background: color-mix(in srgb, var(--set-conflict) 18%, transparent); }

.etd-soft { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 13px; border-radius: 12px;
  background: var(--set-ok-soft); border: 1px solid color-mix(in srgb, var(--set-ok) 26%, transparent); }
.etd-soft-txt { display: flex; align-items: center; gap: 8px; font-size: 11.5px; line-height: 1.4; color: var(--set-text-secondary); }
.etd-soft-txt b { color: var(--set-text); }
.etd-soft-txt :deep(svg) { color: var(--set-ok); flex-shrink: 0; }
.etd-soft-btn { flex-shrink: 0; padding: 7px 13px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 700;
  color: var(--set-ok); background: transparent; border: 1px solid color-mix(in srgb, var(--set-ok) 40%, transparent); transition: all 0.2s; }
.etd-soft-btn:hover { background: color-mix(in srgb, var(--set-ok) 14%, transparent); transform: translateY(-1px); }
.etd-soft-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.etd-reason { display: flex; flex-direction: column; gap: 7px; }
.etd-reason-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-dim); }
.etd-reason-lab i { font-style: normal; color: var(--set-text-dim); text-transform: none; letter-spacing: 0; font-weight: 600; }
.etd-presets { display: flex; flex-wrap: wrap; gap: 6px; }
.etd-preset { padding: 5px 11px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 11px; font-weight: 600;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.etd-preset:hover { color: var(--set-text); border-color: var(--set-border-strong); transform: translateY(-1px); }
.etd-preset.on { color: var(--set-conflict); background: var(--set-conflict-soft); border-color: color-mix(in srgb, var(--set-conflict) 36%, transparent); }
.etd-textarea { width: 100%; resize: vertical; min-height: 56px; padding: 11px 13px; border-radius: 11px; font: inherit; font-size: 13px;
  color: var(--hr-input-text); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s, background 0.2s; }
.etd-textarea:focus { outline: none; background: var(--hr-input-bg-focus); border-color: var(--hr-input-border-focus); }
.etd-textarea::placeholder { color: var(--hr-input-placeholder); }

.etd-blocked { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 11px; font-size: 11.5px; line-height: 1.5;
  color: var(--set-text-secondary); background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 30%, transparent); }
.etd-blocked :deep(svg) { color: var(--set-conflict); flex-shrink: 0; }

.etd-facts { position: relative; padding: 14px 14px 12px; border-radius: 14px; background: var(--set-panel); border: 1px solid var(--set-border); }
.etd-facts-edge { position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--set-deep), color-mix(in srgb, var(--set-deep) 24%, transparent)); }
.etd-facts-head { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-dim); margin-bottom: 11px; }
.etd-facts-head :deep(svg) { color: var(--set-deep); }
.etd-facts-grid { display: flex; flex-direction: column; gap: 8px; }
.etd.stacked .etd-facts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 9px; }
.etd-fact { display: flex; align-items: center; gap: 9px; }
.etd-fact-ic { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0; color: var(--set-deep); background: color-mix(in srgb, var(--set-deep) 12%, transparent); }
.etd-fact-ic[data-tone="ok"] { color: var(--set-ok); background: var(--set-ok-soft); }
.etd-fact-ic[data-tone="warn"] { color: var(--set-partial); background: var(--set-partial-soft); }
.etd-fact-ic[data-tone="danger"] { color: var(--set-conflict); background: var(--set-conflict-soft); }
.etd-fact-body { min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
.etd-fact-lab { font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--set-text-dim); }
.etd-fact-body b { font-size: 12.5px; font-weight: 750; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.etd-fact-body b.muted { color: var(--set-text-dim); font-weight: 600; }

.etd-confirm { color: #fff; background: linear-gradient(135deg, #f87171, #dc2626); border: none; box-shadow: 0 10px 24px -12px rgba(220,38,38,0.6); }
.etd-confirm:hover { color: #fff; }
.etd-confirm.disabled { background: var(--set-surface-elevated); color: var(--set-text-dim); box-shadow: none; }

@media (max-width: 640px) {
  .etd.side { grid-template-columns: 1fr; }
  .etd.side .etd-action { order: 1; }
  .etd.side .etd-facts { order: 2; }
  .etd-soft { flex-direction: column; align-items: stretch; }
}
@media (prefers-reduced-motion: reduce) { .etd-ic-ring { animation: none; } }
</style>
