<template>
  <SetModal :open="open" :title="`Remove ${target?.label || 'classification'}`" subtitle="Workforce · Classification"
    :icon="Trash2" accent-color="var(--set-conflict)" :width="780" aside-placement="bottom" mode="delete" @close="$emit('close')">

    <div class="ecd" :class="factsPlacement">
      <!-- ACTION ZONE -->
      <div class="ecd-action">
        <!-- specimen slab (dissolves on confirm) -->
        <Motion as="div" class="ecd-spec" :class="{ dissolving: loading }" :data-blocked="blocked"
          :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }">
          <span class="ecd-spec-grain" aria-hidden="true" />
          <span class="ecd-spec-edge" aria-hidden="true" />
          <span class="ecd-ic"><component :is="glyph" :size="18" /></span>
          <div class="ecd-spec-id">
            <b>{{ target?.label || '—' }}</b>
            <span v-if="target?.code" class="set-mono">{{ target.code }}</span>
          </div>
          <span class="ecd-stamp" :data-blocked="blocked">{{ blocked ? 'Locked' : 'Clear to remove' }}</span>
        </Motion>

        <div class="ecd-checks">
          <span class="ecd-checks-lab">Extraction pre-flight</span>

          <Motion as="div" class="ecd-check" :data-state="headcount > 0 ? 'fail' : 'pass'"
            :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.08 }">
            <span class="ecd-check-ic"><component :is="headcount > 0 ? XCircle : CheckCircle2" :size="15" /></span>
            <div class="ecd-check-body">
              <b>{{ headcount > 0 ? `${headcount} employee${headcount === 1 ? '' : 's'} classified here` : 'No one classified here' }}</b>
              <span>{{ headcount > 0 ? 'The server refuses removal (409) until each is re-classified — their leave, payroll & travel scope depends on it.' : 'No live employee record carries this classification — safe to remove.' }}</span>
            </div>
            <button v-if="headcount > 0" class="ecd-check-go" @click="$emit('view-people', target)">View people <ArrowRight :size="12" /></button>
          </Motion>

          <Motion as="div" class="ecd-check" :data-state="target?.is_active ? 'warn' : 'info'"
            :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.14 }">
            <span class="ecd-check-ic"><component :is="target?.is_active ? AlertTriangle : Info" :size="15" /></span>
            <div class="ecd-check-body">
              <b>{{ target?.is_active ? 'Currently active — offered at hiring' : 'Already inactive' }}</b>
              <span>{{ target?.is_active ? 'Removal pulls it from the new-hire classification picker immediately.' : 'It is already hidden from the picker.' }}</span>
            </div>
          </Motion>
        </div>

        <!-- non-destructive nudge -->
        <Motion as="div" class="ecd-soft" v-if="target?.is_active"
          :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.2 }">
          <div class="ecd-soft-txt"><PowerOff :size="14" /><span>Prefer <b>deactivating</b>? It stays in the ledger and on existing records — just hidden from new hires. Fully reversible.</span></div>
          <button type="button" class="ecd-soft-btn" :disabled="loading" @click="$emit('deactivate', target)">Deactivate instead</button>
        </Motion>

        <!-- reason -->
        <div class="ecd-reason">
          <span class="ecd-reason-lab">Reason for removal <i>(recorded in the settings ledger)</i></span>
          <div class="ecd-presets">
            <button v-for="p in PRESETS" :key="p" type="button" class="ecd-preset" :class="{ on: reason === p }" @click="pick(p)">{{ p }}</button>
          </div>
          <textarea v-model="reason" rows="2" class="ecd-textarea" placeholder="Add context — e.g. merged Trainee into Probationary after the policy review…" />
        </div>

        <Motion v-if="blocked" as="div" class="ecd-blocked"
          :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.3 }">
          <ShieldAlert :size="14" /> Locked while {{ headcount }} {{ headcount === 1 ? 'person is' : 'people are' }} classified here. Re-classify or deactivate instead.
        </Motion>
      </div>

      <!-- FACTS ZONE (left when few facts, bottom when many) -->
      <aside class="ecd-facts">
        <span class="ecd-facts-edge" aria-hidden="true" />
        <header class="ecd-facts-head"><FileText :size="12" /> Classification record</header>
        <div class="ecd-facts-grid">
          <Motion v-for="(f, i) in facts" :key="f.label" as="div" class="ecd-fact"
            :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.36, delay: 0.06 + i * 0.04, ease: [0.16, 1, 0.3, 1] }">
            <span class="ecd-fact-ic" :data-tone="f.tone"><component :is="f.icon" :size="13" /></span>
            <div class="ecd-fact-body">
              <span class="ecd-fact-lab">{{ f.label }}</span>
              <b :class="{ muted: !f.set }">{{ f.value }}</b>
            </div>
          </Motion>
        </div>
      </aside>
    </div>

    <template #aside>
      <SetWorkflowRail accent="var(--set-conflict)" :icon="Trash2" title="What removing a classification does"
        :summary="summary" :steps="steps" :affects="affects" :note="note" danger :actor="actor" mode="delete" orientation="horizontal" />
    </template>

    <template #footer>
      <button class="set-btn set-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="set-btn ecd-confirm" :class="{ disabled: blocked || loading }"
        :whileHover="(blocked || loading) ? {} : { y: -2, scale: 1.02 }" :whileTap="(blocked || loading) ? {} : { scale: 0.96 }"
        :disabled="blocked || loading" @click="$emit('confirm', reason)">
        <Loader v-if="loading" :size="14" class="set-spin" /><Trash2 v-else :size="14" />
        {{ blocked ? 'Re-classify people first' : 'Remove classification' }}
      </Motion>
    </template>
  </SetModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  Trash2, Loader, Hash, FileText, Info, ShieldAlert, ShieldCheck, CheckCircle2, XCircle, AlertTriangle, ArrowRight,
  Archive, History, PowerOff, Power, Users, Percent,
  UserCog, GraduationCap, ScrollText, UserCheck, Tag,
} from 'lucide-vue-next'
import SetModal from './SetModal.vue'
import SetWorkflowRail from './SetWorkflowRail.vue'
import { MODULES } from './connectivity'
import { useActor } from '../composables/useActor'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  target: { type: Object, default: null },
  headcount: { type: Number, default: 0 },
  share: { type: Number, default: 0 },
  hasWorkforce: { type: Boolean, default: false },
})
defineEmits(['close', 'confirm', 'deactivate', 'view-people'])

const actor = useActor()
const reason = ref('')
watch(() => props.open, (v) => { if (v) reason.value = '' })

const PRESETS = ['Consolidated into another classification', 'Duplicate', 'Policy change', 'No longer used', 'Created in error']
const pick = (p) => { reason.value = reason.value === p ? '' : p }

const blocked = computed(() => Number(props.headcount || 0) > 0)

const glyph = computed(() => {
  const c = String(props.target?.code || '').toUpperCase()
  if (c.includes('PERMANENT') || c.includes('CONFIRM')) return ShieldCheck
  if (c.includes('PROBATION')) return UserCog
  if (c.includes('TRAINEE') || c.includes('INTERN')) return GraduationCap
  if (c.includes('CONTRACT')) return ScrollText
  if (c.includes('CONSULT')) return UserCheck
  return Tag
})

const facts = computed(() => {
  const t = props.target || {}
  const list = [
    { label: 'Code', value: t.code || '—', set: !!t.code, icon: Hash, tone: 'gold' },
    { label: 'Status', value: t.is_active ? 'Active' : 'Inactive', set: !!t.is_active, icon: t.is_active ? Power : PowerOff, tone: t.is_active ? 'ok' : 'warn' },
    { label: 'Population', value: `${props.headcount} ${props.headcount === 1 ? 'person' : 'people'}`, set: props.headcount > 0, icon: Users, tone: props.headcount > 0 ? 'danger' : 'ok' },
  ]
  if (props.hasWorkforce) list.push({ label: 'Share of workforce', value: `${props.share}%`, set: props.share > 0, icon: Percent, tone: 'gold' })
  if (t.description) list.push({ label: 'Description', value: t.description, set: true, icon: FileText, tone: 'gold' })
  return list
})
// few facts → side (left); many → bottom strip
const factsPlacement = computed(() => (facts.value.length > 4 ? 'stacked' : 'side'))

const affects = ['employees', 'payroll', 'exit'].map((s) => MODULES[s]).filter(Boolean).map((m) => ({ icon: m.icon, label: m.label }))
const summary = computed(() => `Removing ${props.target?.label || 'this classification'} pulls it from the new-hire picker. It is a soft-delete — kept for audit and restorable. Built-in classifications can never be deleted, only deactivated.`)
const steps = computed(() => [
  { icon: ShieldCheck, title: 'Pre-flight', text: 'The API refuses (409) while any active employee is still classified here.' },
  { icon: Archive, title: 'Soft-delete', text: 'The classification is tombstoned — gone from the strata and every dropdown, retained in the database.' },
  { icon: PowerOff, title: 'Picker', text: props.target?.is_active ? 'It leaves the new-hire classification picker the moment it is removed.' : 'It was already hidden from the picker.' },
  { icon: History, title: 'Audited · reversible', text: 'The removal and your reason are sealed into the settings ledger; a super admin can restore it.' },
])
const note = computed(() => (blocked.value
  ? `${props.headcount} employee record(s) carry this classification. Re-classify them in Employees before it can be removed.`
  : 'Tip: deactivating keeps history intact and is reversible — prefer it unless this was created in error.'))
</script>

<style scoped>
.ecd { display: grid; gap: 16px; }
.ecd.side { grid-template-columns: minmax(0, 232px) minmax(0, 1fr); align-items: start; }
.ecd.side .ecd-action { order: 2; }
.ecd.side .ecd-facts { order: 1; }
.ecd.stacked { grid-template-columns: 1fr; }
.ecd.stacked .ecd-facts { order: 2; }

.ecd-action { display: flex; flex-direction: column; gap: 13px; }

/* specimen slab */
.ecd-spec { position: relative; overflow: hidden; display: flex; align-items: center; gap: 12px; padding: 14px 15px; border-radius: 14px;
  background: var(--set-panel); border: 1px solid color-mix(in srgb, var(--set-conflict) 22%, transparent); transition: opacity 0.5s, filter 0.5s; }
.ecd-spec.dissolving { opacity: 0.45; filter: grayscale(0.7); }
.ecd-spec-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: radial-gradient(circle at 25% 40%, rgba(255,255,255,0.1) 0.5px, transparent 1.4px), radial-gradient(circle at 70% 65%, rgba(0,0,0,0.16) 0.5px, transparent 1.4px);
  background-size: 26px 26px, 34px 34px; }
.ecd-spec.dissolving .ecd-spec-grain { animation: ecd-fall 0.7s ease-in forwards; }
@keyframes ecd-fall { to { transform: translateY(14px); opacity: 0; } }
.ecd-spec-edge { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: linear-gradient(180deg, var(--set-conflict), color-mix(in srgb, var(--set-conflict) 30%, transparent)); }
.ecd-ic { position: relative; display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0; color: var(--set-conflict);
  background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 30%, transparent); }
.ecd-spec-id { position: relative; flex: 1; min-width: 0; }
.ecd-spec-id b { display: block; font-size: 15px; font-weight: 800; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ecd-spec-id span { font-size: 11px; color: var(--set-text-muted); }
.ecd-stamp { position: relative; flex-shrink: 0; font-size: 9px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px;
  color: var(--set-ok); background: var(--set-ok-soft); border: 1px solid color-mix(in srgb, var(--set-ok) 28%, transparent); }
.ecd-stamp[data-blocked="true"] { color: var(--set-conflict); background: var(--set-conflict-soft); border-color: color-mix(in srgb, var(--set-conflict) 28%, transparent); }

.ecd-checks { display: flex; flex-direction: column; gap: 8px; }
.ecd-checks-lab { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-dim); }
.ecd-check { display: flex; align-items: flex-start; gap: 10px; padding: 11px 12px; border-radius: 12px;
  background: var(--set-surface); border: 1px solid var(--set-border); border-left: 3px solid var(--set-unset); }
.ecd-check[data-state="pass"] { border-left-color: var(--set-ok); }
.ecd-check[data-state="fail"] { border-left-color: var(--set-conflict); background: color-mix(in srgb, var(--set-conflict) 6%, var(--set-surface)); }
.ecd-check[data-state="warn"] { border-left-color: var(--set-partial); }
.ecd-check[data-state="info"] { border-left-color: var(--set-ember); }
.ecd-check-ic { flex-shrink: 0; margin-top: 1px; }
.ecd-check[data-state="pass"] .ecd-check-ic :deep(svg) { color: var(--set-ok); }
.ecd-check[data-state="fail"] .ecd-check-ic :deep(svg) { color: var(--set-conflict); }
.ecd-check[data-state="warn"] .ecd-check-ic :deep(svg) { color: var(--set-partial); }
.ecd-check[data-state="info"] .ecd-check-ic :deep(svg) { color: var(--set-ember); }
.ecd-check-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ecd-check-body b { font-size: 12.5px; font-weight: 750; color: var(--set-text); }
.ecd-check-body span { font-size: 11px; line-height: 1.45; color: var(--set-text-muted); }
.ecd-check-go { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; align-self: center; padding: 6px 10px; border-radius: 9px; cursor: pointer;
  font: inherit; font-size: 11px; font-weight: 700; color: var(--set-conflict); background: var(--set-conflict-soft);
  border: 1px solid color-mix(in srgb, var(--set-conflict) 32%, transparent); transition: all 0.2s; }
.ecd-check-go:hover { background: color-mix(in srgb, var(--set-conflict) 18%, transparent); }

.ecd-soft { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 13px; border-radius: 12px;
  background: var(--set-ok-soft); border: 1px solid color-mix(in srgb, var(--set-ok) 26%, transparent); }
.ecd-soft-txt { display: flex; align-items: center; gap: 8px; font-size: 11.5px; line-height: 1.4; color: var(--set-text-secondary); }
.ecd-soft-txt b { color: var(--set-text); }
.ecd-soft-txt :deep(svg) { color: var(--set-ok); flex-shrink: 0; }
.ecd-soft-btn { flex-shrink: 0; padding: 7px 13px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 700;
  color: var(--set-ok); background: transparent; border: 1px solid color-mix(in srgb, var(--set-ok) 40%, transparent); transition: all 0.2s; }
.ecd-soft-btn:hover { background: color-mix(in srgb, var(--set-ok) 14%, transparent); transform: translateY(-1px); }
.ecd-soft-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.ecd-reason { display: flex; flex-direction: column; gap: 7px; }
.ecd-reason-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-dim); }
.ecd-reason-lab i { font-style: normal; color: var(--set-text-dim); text-transform: none; letter-spacing: 0; font-weight: 600; }
.ecd-presets { display: flex; flex-wrap: wrap; gap: 6px; }
.ecd-preset { padding: 5px 11px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 11px; font-weight: 600;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.ecd-preset:hover { color: var(--set-text); border-color: var(--set-border-strong); transform: translateY(-1px); }
.ecd-preset.on { color: var(--set-conflict); background: var(--set-conflict-soft); border-color: color-mix(in srgb, var(--set-conflict) 36%, transparent); }
.ecd-textarea { width: 100%; resize: vertical; min-height: 56px; padding: 11px 13px; border-radius: 11px; font: inherit; font-size: 13px;
  color: var(--hr-input-text); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s, background 0.2s; }
.ecd-textarea:focus { outline: none; background: var(--hr-input-bg-focus); border-color: var(--hr-input-border-focus); }
.ecd-textarea::placeholder { color: var(--hr-input-placeholder); }

.ecd-blocked { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 11px; font-size: 11.5px; line-height: 1.5;
  color: var(--set-text-secondary); background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 30%, transparent); }
.ecd-blocked :deep(svg) { color: var(--set-conflict); flex-shrink: 0; }

.ecd-facts { position: relative; padding: 14px 14px 12px; border-radius: 14px; background: var(--set-panel); border: 1px solid var(--set-border); }
.ecd-facts-edge { position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--set-ember), color-mix(in srgb, var(--set-ember) 24%, transparent)); }
.ecd-facts-head { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-dim); margin-bottom: 11px; }
.ecd-facts-head :deep(svg) { color: var(--set-ember); }
.ecd-facts-grid { display: flex; flex-direction: column; gap: 8px; }
.ecd.stacked .ecd-facts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 9px; }
.ecd-fact { display: flex; align-items: center; gap: 9px; }
.ecd-fact-ic { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0; color: var(--set-ember); background: color-mix(in srgb, var(--set-ember) 12%, transparent); }
.ecd-fact-ic[data-tone="ok"] { color: var(--set-ok); background: var(--set-ok-soft); }
.ecd-fact-ic[data-tone="warn"] { color: var(--set-partial); background: var(--set-partial-soft); }
.ecd-fact-ic[data-tone="danger"] { color: var(--set-conflict); background: var(--set-conflict-soft); }
.ecd-fact-body { min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
.ecd-fact-lab { font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--set-text-dim); }
.ecd-fact-body b { font-size: 12.5px; font-weight: 750; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ecd-fact-body b.muted { color: var(--set-text-dim); font-weight: 600; }

.ecd-confirm { color: #fff; background: linear-gradient(135deg, #f87171, #dc2626); border: none; box-shadow: 0 10px 24px -12px rgba(220,38,38,0.6); }
.ecd-confirm:hover { color: #fff; }
.ecd-confirm.disabled { background: var(--set-surface-elevated); color: var(--set-text-dim); box-shadow: none; }

@media (max-width: 640px) {
  .ecd.side { grid-template-columns: 1fr; }
  .ecd.side .ecd-action { order: 1; }
  .ecd.side .ecd-facts { order: 2; }
  .ecd-soft { flex-direction: column; align-items: stretch; }
}
@media (prefers-reduced-motion: reduce) { .ecd-spec.dissolving .ecd-spec-grain { animation: none; } }
</style>
