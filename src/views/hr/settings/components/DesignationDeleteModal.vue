<template>
  <SetModal :open="open" :title="`Retire ${target?.name || 'title'}`" subtitle="Organization · Titles"
    :icon="Trash2" accent-color="var(--set-conflict)" :width="760" aside-placement="bottom" mode="delete" @close="$emit('close')">

    <div class="ddx" :class="factsPlacement">
      <!-- ACTION ZONE -->
      <div class="ddx-action">
        <Motion as="div" class="ddx-head" :data-blocked="blocked"
          :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
          <span class="ddx-ic">
            <span class="ddx-ic-ring" aria-hidden="true" />
            <BadgeCheck :size="18" />
          </span>
          <div class="ddx-head-id">
            <b>{{ target?.name || '—' }}</b>
            <span v-if="target?.code" class="set-mono">{{ target.code }}</span>
          </div>
          <span class="ddx-stamp" :data-blocked="blocked">{{ blocked ? 'Blocked' : 'Clear to retire' }}</span>
        </Motion>

        <!-- pre-flight clearance -->
        <div class="ddx-checks">
          <span class="ddx-checks-lab">Pre-flight clearance</span>

          <Motion as="div" class="ddx-check" :data-state="usage.employees > 0 ? 'fail' : 'pass'"
            :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.08 }">
            <span class="ddx-check-ic"><component :is="usage.employees > 0 ? XCircle : CheckCircle2" :size="15" /></span>
            <div class="ddx-check-body">
              <b>{{ usage.employees > 0 ? `${usage.employees} employee${usage.employees === 1 ? '' : 's'} hold this title` : 'No employees hold this title' }}</b>
              <span>{{ usage.employees > 0 ? 'The server refuses the delete until each is promoted, transferred or offboarded.' : 'Nobody is mapped to this designation — safe to retire.' }}</span>
            </div>
            <button v-if="usage.employees > 0" class="ddx-check-go" @click="$emit('view-people', target)">Reassign <ArrowRight :size="12" /></button>
          </Motion>

          <Motion as="div" class="ddx-check" :data-state="usage.reporting_children > 0 ? 'warn' : 'pass'"
            :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.14 }">
            <span class="ddx-check-ic"><component :is="usage.reporting_children > 0 ? AlertTriangle : CheckCircle2" :size="15" /></span>
            <div class="ddx-check-body">
              <b>{{ usage.reporting_children > 0 ? `${usage.reporting_children} title${usage.reporting_children === 1 ? '' : 's'} report up to this one` : 'Nothing reports up to this title' }}</b>
              <span>{{ usage.reporting_children > 0 ? 'Their reporting line will dangle — re-point them at another title to keep the hierarchy intact.' : 'This is a leaf in the reporting tree — nothing depends on it.' }}</span>
            </div>
          </Motion>

          <Motion as="div" class="ddx-check" :data-state="usage.requisitions > 0 ? 'warn' : 'info'"
            :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.4, delay: 0.2 }">
            <span class="ddx-check-ic"><component :is="usage.requisitions > 0 ? AlertTriangle : Info" :size="15" /></span>
            <div class="ddx-check-body">
              <b>{{ usage.requisitions > 0 ? `${usage.requisitions} open requisition${usage.requisitions === 1 ? '' : 's'} reference it` : 'No open requisitions reference it' }}</b>
              <span>{{ usage.requisitions > 0 ? 'Recruitment requisitions keep a stale reference — re-select a title on each before it disappears from pickers.' : 'Recruitment has nothing pinned to this title.' }}</span>
            </div>
          </Motion>
        </div>

        <!-- reason -->
        <div class="ddx-reason">
          <span class="ddx-reason-lab">Reason for removal <i>(sealed into the audit ledger)</i></span>
          <div class="ddx-presets">
            <button v-for="p in PRESETS" :key="p" type="button" class="ddx-preset" :class="{ on: reason === p }" @click="pick(p)">{{ p }}</button>
          </div>
          <textarea v-model="reason" rows="2" class="ddx-textarea" placeholder="Add context — e.g. merged into Lead Engineer after the Q3 restructure…" />
        </div>

        <Motion v-if="blocked" as="div" class="ddx-blocked" key="blk"
          :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.3 }">
          <ShieldAlert :size="14" /> Locked while {{ usage.employees }} {{ usage.employees === 1 ? 'person holds' : 'people hold' }} this title. Reassign them in Employees first.
        </Motion>
      </div>

      <!-- FACTS ZONE ("user info" — left when few facts, bottom when many) -->
      <aside class="ddx-facts">
        <span class="ddx-facts-edge" aria-hidden="true" />
        <header class="ddx-facts-head"><FileText :size="12" /> Title record</header>
        <div class="ddx-facts-grid">
          <Motion v-for="(f, i) in facts" :key="f.label" as="div" class="ddx-fact"
            :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.36, delay: 0.06 + i * 0.04, ease: [0.16, 1, 0.3, 1] }">
            <span class="ddx-fact-ic" :data-tone="f.tone"><component :is="f.icon" :size="13" /></span>
            <div class="ddx-fact-body">
              <span class="ddx-fact-lab">{{ f.label }}</span>
              <b :class="{ muted: !f.set }">{{ f.value }}</b>
            </div>
          </Motion>
        </div>
      </aside>
    </div>

    <template #aside>
      <SetWorkflowRail accent="var(--set-conflict)" :icon="Trash2" title="What retiring a title does"
        :summary="summary" :steps="steps" :affects="affects" :note="note" danger :actor="actor" mode="delete" orientation="horizontal" />
    </template>

    <template #footer>
      <button class="set-btn set-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="set-btn ddx-confirm" :class="{ disabled: blocked || loading }"
        :whileHover="(blocked || loading) ? {} : { y: -2, scale: 1.02 }" :whileTap="(blocked || loading) ? {} : { scale: 0.96 }"
        :disabled="blocked || loading" @click="$emit('confirm', reason)">
        <Loader v-if="loading" :size="14" class="set-spin" /><Trash2 v-else :size="14" />
        {{ blocked ? 'Reassign people first' : 'Retire title' }}
      </Motion>
    </template>
  </SetModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  Trash2, Loader, BadgeCheck, Hash, Layers, Building2, CornerLeftUp, Crown, Users, GitFork, UserPlus,
  FileText, Info, ShieldAlert, ShieldCheck, CheckCircle2, XCircle, AlertTriangle, ArrowRight,
  Archive, History, RotateCcw,
} from 'lucide-vue-next'
import SetModal from './SetModal.vue'
import SetWorkflowRail from './SetWorkflowRail.vue'
import { MODULES } from './connectivity'
import { useActor } from '../composables/useActor'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  target: { type: Object, default: null },
  usage: { type: Object, default: () => ({ employees: 0, reporting_children: 0, requisitions: 0, positions: 0 }) },
  gradeName: { type: String, default: '' },
  departmentName: { type: String, default: '' },
  parentName: { type: String, default: '' },
})
defineEmits(['close', 'confirm', 'view-people'])

const actor = useActor()
const reason = ref('')
watch(() => props.open, (v) => { if (v) reason.value = '' })

const PRESETS = ['Merged into another title', 'Duplicate', 'Restructured', 'Renamed', 'No longer used']
const pick = (p) => { reason.value = reason.value === p ? '' : p }

const blocked = computed(() => Number(props.usage?.employees || 0) > 0)

// ── facts ("user info"): every meaningful attribute of the title ────────────
const facts = computed(() => {
  const t = props.target || {}
  const u = props.usage || {}
  const list = [
    { label: 'Code', value: t.code || '—', set: !!t.code, icon: Hash, tone: 'gold' },
    { label: 'Grade', value: props.gradeName || 'No grade mapped', set: !!props.gradeName, icon: Layers, tone: 'gold' },
    { label: 'Department', value: props.departmentName || 'Any department', set: !!props.departmentName, icon: Building2, tone: 'gold' },
    { label: 'Reports to', value: props.parentName || 'Top of chain', set: !!props.parentName, icon: props.parentName ? CornerLeftUp : Crown, tone: 'gold' },
  ]
  if (t.level != null && t.level !== '') list.push({ label: 'Hierarchy level', value: `Level ${t.level}`, set: true, icon: Layers, tone: 'gold' })
  list.push({ label: 'Held by', value: `${u.employees || 0} ${u.employees === 1 ? 'person' : 'people'}`, set: (u.employees || 0) > 0, icon: Users, tone: (u.employees || 0) > 0 ? 'danger' : 'ok' })
  list.push({ label: 'Direct reports', value: `${u.reporting_children || 0} ${u.reporting_children === 1 ? 'title' : 'titles'}`, set: (u.reporting_children || 0) > 0, icon: GitFork, tone: (u.reporting_children || 0) > 0 ? 'warn' : 'ok' })
  if ((u.requisitions || 0) > 0) list.push({ label: 'Open requisitions', value: `${u.requisitions}`, set: true, icon: UserPlus, tone: 'warn' })
  return list
})
// Few facts → side (left); many → bottom strip. (The user's dynamic-placement rule.)
const factsPlacement = computed(() => facts.value.length > 5 ? 'stacked' : 'side')

// ── workflow rail copy ───────────────────────────────────────────────────────
const affects = ['employees', 'recruitment'].map(s => MODULES[s]).filter(Boolean).map(m => ({ icon: m.icon, label: m.label }))
const summary = computed(() => `Retiring ${props.target?.name || 'this title'} pulls it from every picker. It is a soft-delete — the row is kept for audit and can be restored. Here is the exact sequence.`)
const steps = computed(() => [
  { icon: ShieldCheck, title: 'Pre-flight', text: 'The API refuses (409) while any active employee still holds the title — promote or transfer them first.' },
  { icon: Archive, title: 'Soft-delete', text: 'The title is tombstoned — gone from the spire and every dropdown, retained in the database.' },
  { icon: GitFork, title: 'Reporting lines', text: props.usage?.reporting_children > 0 ? `${props.usage.reporting_children} subordinate title(s) keep their stored pointer — re-point them to avoid a dangling line.` : 'No subordinate titles report up to this one, so the reporting tree stays intact.' },
  { icon: History, title: 'Audited · reversible', text: 'The removal and your reason are sealed into the settings ledger; a super admin can restore it.' },
])
const note = computed(() => blocked.value
  ? `${props.usage.employees} employee record(s) reference this title. Reassign them in Employees before it can be removed.`
  : (props.usage?.requisitions > 0 ? 'Open requisitions referencing this title are not rewritten — re-select a title on each in Recruitment.' : 'This action is logged against your account and can be reversed by a super administrator.'))
</script>

<style scoped>
.ddx { display: grid; gap: 16px; }
.ddx.side { grid-template-columns: minmax(0, 230px) minmax(0, 1fr); align-items: start; }
.ddx.side .ddx-action { order: 2; }
.ddx.side .ddx-facts { order: 1; }
.ddx.stacked { grid-template-columns: 1fr; }
.ddx.stacked .ddx-facts { order: 2; }

.ddx-action { display: flex; flex-direction: column; gap: 13px; }

.ddx-head { position: relative; display: flex; align-items: center; gap: 12px; padding: 13px 15px; border-radius: 14px;
  background: var(--set-panel); border: 1px solid color-mix(in srgb, var(--set-conflict) 22%, transparent); }
.ddx-ic { position: relative; display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0; color: var(--set-conflict);
  background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 30%, transparent); }
.ddx-ic-ring { position: absolute; inset: -4px; border-radius: 15px; border: 1px solid color-mix(in srgb, var(--set-conflict) 34%, transparent); animation: ddx-pulse 2.6s ease-in-out infinite; }
@keyframes ddx-pulse { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.1); opacity: 0; } }
.ddx-head-id { flex: 1; min-width: 0; }
.ddx-head-id b { display: block; font-size: 15px; font-weight: 800; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ddx-head-id span { font-size: 11px; color: var(--set-text-muted); }
.ddx-stamp { flex-shrink: 0; font-size: 9px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px;
  color: var(--set-ok); background: var(--set-ok-soft); border: 1px solid color-mix(in srgb, var(--set-ok) 28%, transparent); }
.ddx-stamp[data-blocked="true"] { color: var(--set-conflict); background: var(--set-conflict-soft); border-color: color-mix(in srgb, var(--set-conflict) 28%, transparent); }

.ddx-checks { display: flex; flex-direction: column; gap: 8px; }
.ddx-checks-lab { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-dim); }
.ddx-check { display: flex; align-items: flex-start; gap: 10px; padding: 11px 12px; border-radius: 12px;
  background: var(--set-surface); border: 1px solid var(--set-border); border-left: 3px solid var(--set-unset); }
.ddx-check[data-state="pass"] { border-left-color: var(--set-ok); }
.ddx-check[data-state="fail"] { border-left-color: var(--set-conflict); background: color-mix(in srgb, var(--set-conflict) 6%, var(--set-surface)); }
.ddx-check[data-state="warn"] { border-left-color: var(--set-partial); }
.ddx-check[data-state="info"] { border-left-color: var(--set-gold); }
.ddx-check-ic { flex-shrink: 0; margin-top: 1px; }
.ddx-check[data-state="pass"] .ddx-check-ic :deep(svg) { color: var(--set-ok); }
.ddx-check[data-state="fail"] .ddx-check-ic :deep(svg) { color: var(--set-conflict); }
.ddx-check[data-state="warn"] .ddx-check-ic :deep(svg) { color: var(--set-partial); }
.ddx-check[data-state="info"] .ddx-check-ic :deep(svg) { color: var(--set-gold); }
.ddx-check-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ddx-check-body b { font-size: 12.5px; font-weight: 750; color: var(--set-text); }
.ddx-check-body span { font-size: 11px; line-height: 1.45; color: var(--set-text-muted); }
.ddx-check-go { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; align-self: center; padding: 6px 10px; border-radius: 9px; cursor: pointer;
  font: inherit; font-size: 11px; font-weight: 700; color: var(--set-conflict); background: var(--set-conflict-soft);
  border: 1px solid color-mix(in srgb, var(--set-conflict) 32%, transparent); transition: all 0.2s; }
.ddx-check-go:hover { background: color-mix(in srgb, var(--set-conflict) 18%, transparent); }

.ddx-reason { display: flex; flex-direction: column; gap: 7px; }
.ddx-reason-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-dim); }
.ddx-reason-lab i { font-style: normal; color: var(--set-text-dim); text-transform: none; letter-spacing: 0; font-weight: 600; }
.ddx-presets { display: flex; flex-wrap: wrap; gap: 6px; }
.ddx-preset { padding: 5px 11px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 11px; font-weight: 600;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.ddx-preset:hover { color: var(--set-text); border-color: var(--set-border-strong); transform: translateY(-1px); }
.ddx-preset.on { color: var(--set-conflict); background: var(--set-conflict-soft); border-color: color-mix(in srgb, var(--set-conflict) 36%, transparent); }
.ddx-textarea { width: 100%; resize: vertical; min-height: 56px; padding: 11px 13px; border-radius: 11px; font: inherit; font-size: 13px;
  color: var(--hr-input-text); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s, background 0.2s; }
.ddx-textarea:focus { outline: none; background: var(--hr-input-bg-focus); border-color: var(--hr-input-border-focus); }
.ddx-textarea::placeholder { color: var(--hr-input-placeholder); }

.ddx-blocked { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 11px; font-size: 11.5px; line-height: 1.5;
  color: var(--set-text-secondary); background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 30%, transparent); }
.ddx-blocked :deep(svg) { color: var(--set-conflict); flex-shrink: 0; }

/* facts panel */
.ddx-facts { position: relative; padding: 14px 14px 12px; border-radius: 14px; background: var(--set-panel); border: 1px solid var(--set-border); }
.ddx-facts-edge { position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--set-gold), color-mix(in srgb, var(--set-gold) 24%, transparent)); }
.ddx-facts-head { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-dim); margin-bottom: 11px; }
.ddx-facts-head :deep(svg) { color: var(--set-gold); }
.ddx-facts-grid { display: flex; flex-direction: column; gap: 8px; }
.ddx.stacked .ddx-facts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 9px; }
.ddx-fact { display: flex; align-items: center; gap: 9px; }
.ddx-fact-ic { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0; color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 12%, transparent); }
.ddx-fact-ic[data-tone="ok"] { color: var(--set-ok); background: var(--set-ok-soft); }
.ddx-fact-ic[data-tone="warn"] { color: var(--set-partial); background: var(--set-partial-soft); }
.ddx-fact-ic[data-tone="danger"] { color: var(--set-conflict); background: var(--set-conflict-soft); }
.ddx-fact-body { min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
.ddx-fact-lab { font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--set-text-dim); }
.ddx-fact-body b { font-size: 12.5px; font-weight: 750; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ddx-fact-body b.muted { color: var(--set-text-dim); font-weight: 600; }

.ddx-confirm { color: #fff; background: linear-gradient(135deg, #f87171, #dc2626); border: none; box-shadow: 0 10px 24px -12px rgba(220,38,38,0.6); }
.ddx-confirm:hover { color: #fff; }
.ddx-confirm.disabled { background: var(--set-surface-elevated); color: var(--set-text-dim); box-shadow: none; }

@media (max-width: 640px) {
  .ddx.side { grid-template-columns: 1fr; }
  .ddx.side .ddx-action { order: 1; }
  .ddx.side .ddx-facts { order: 2; }
}
@media (prefers-reduced-motion: reduce) { .ddx-ic-ring { animation: none; } }
</style>
