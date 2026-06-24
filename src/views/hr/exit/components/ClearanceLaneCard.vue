<template>
  <div class="lane-shell" :style="{ '--i': index }">
    <div ref="cardEl" class="lane ex-grain" :class="{ blocked: hasBlocked, done: group.progress >= 100 }" :style="{ '--c': meta.hex }">
      <span class="lane-glare" aria-hidden="true" />
      <span class="lane-spine" aria-hidden="true" />

      <header class="lane-head">
        <span class="lane-ico"><component :is="meta.icon" :size="16" /></span>
        <div class="lane-id">
          <span class="lane-name">{{ meta.label }}</span>
          <span class="lane-sub">{{ group.cleared }}/{{ group.total }} cleared</span>
        </div>
        <span class="lane-ring" :style="{ '--ex-p': (group.progress || 0) * 3.6 + 'deg' }">
          <span class="lr-pct ex-mono">{{ group.progress || 0 }}</span>
        </span>
      </header>

      <ul class="lane-items">
        <li v-for="it in group.items" :key="it.id" class="ci" :class="`st-${it.status.toLowerCase()}`">
          <span class="ci-dot" :style="{ background: stMeta(it.status).hex }" />
          <div class="ci-main">
            <span class="ci-titlerow">
              <span class="ci-title">{{ it.title }}</span>
              <i v-if="it.is_mandatory" class="ci-req">required</i>
            </span>
            <span v-if="it.remarks" class="ci-rem">{{ cleanRemarks(it.remarks) }}</span>
            <div v-if="it.is_self_handover && it.submission && it.submission.submitted_at" class="ci-ho">
              <Handshake :size="11" />
              <span class="ci-ho-tx">
                Employee handover<template v-if="hoSteps(it)"> · {{ hoSteps(it) }}</template><template v-if="it.submission.successor_name"> · successor: {{ it.submission.successor_name }}</template>
                <em v-if="it.submission.notes">“{{ it.submission.notes }}”</em>
              </span>
            </div>
            <div class="ci-tags">
              <span v-if="it.is_self_handover" class="ci-tag ho"><Handshake :size="10" /> {{ it.submission && it.submission.submitted_at ? 'Employee-filed' : 'Awaiting employee' }}</span>
              <span class="ci-tag st" :style="{ '--c': stMeta(it.status).hex }">{{ stMeta(it.status).label }}</span>
              <span v-if="it.system_signal" class="ci-tag sys" :class="'sys-' + it.system_signal.state" :title="it.system_signal.detail || ''">
                <component :is="sigIcon(it.system_signal.source)" :size="10" /> {{ it.system_signal.label }}
              </span>
              <span v-if="it.recovery_amount" class="ci-tag rec"><HandCoins :size="10" /> {{ fmtINR(it.recovery_amount) }} → F&F</span>
              <span v-if="it.assignee_name" class="ci-tag asg"><UserCheck :size="10" /> {{ it.assignee_name }}</span>
              <span v-if="appliedMeta(it)" class="ci-tag applied"><component :is="appliedMeta(it).icon" :size="10" /> {{ appliedMeta(it).label }}</span>
              <span v-if="autoCleared(it)" class="ci-tag sgn auto"><Sparkles :size="10" /> Auto-verified<i v-if="it.signed_off_at"> · {{ fmtDate(it.signed_off_at) }}</i></span>
              <span v-else-if="it.status === 'CLEARED' && it.signed_off_by_name" class="ci-tag sgn"><Stamp :size="10" /> {{ it.signed_off_by_name }}<i v-if="it.signed_off_at"> · {{ fmtDate(it.signed_off_at) }}</i></span>
            </div>
          </div>
          <div class="ci-acts">
            <Motion as="button" type="button" class="ci-btn primary" :whileHover="reduced ? {} : { y: -1 }" :whileTap="{ scale: 0.95 }" @click="$emit('signoff', it)">
              <component :is="it.status === 'CLEARED' ? FilePen : Stamp" :size="12" /> {{ it.status === 'CLEARED' ? 'Edit' : 'Sign off' }}
            </Motion>
            <Motion v-if="it.status === 'CLEARED'" as="button" type="button" class="ci-btn ghost" :whileHover="reduced ? {} : { y: -1 }" :whileTap="{ scale: 0.95 }" @click="$emit('reopen', it)" title="Reopen with reason (audited)">
              <RotateCcw :size="12" /> Reopen
            </Motion>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { HandCoins, UserCheck, Stamp, FilePen, RotateCcw, Sparkles, KeyRound, PackageCheck, ReceiptText, Coins, MessagesSquare, ShieldX, Handshake, ScrollText, BadgeCheck } from 'lucide-vue-next'
import { clearanceDeptMeta, clearanceStatusMeta, clearanceItemPlaybook, fmtINR, fmtDate } from '@/composables/useExit'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  group: { type: Object, required: true },
  index: { type: Number, default: 0 },
})
defineEmits(['signoff', 'reopen'])

const reduced = prefersReduced()
const cardEl = ref(null)
usePointerSpotlight(cardEl)

const meta = computed(() => clearanceDeptMeta(props.group.department))
const stMeta = (s) => clearanceStatusMeta(s)
const hasBlocked = computed(() => (props.group.items || []).some(it => it.status === 'BLOCKED'))

const SIG_ICON = { account: KeyRound, provisioning: ShieldX, asset: PackageCheck, reimbursement: ReceiptText, interview: MessagesSquare, advance: Coins }
const sigIcon = (s) => SIG_ICON[s] || Sparkles
const autoCleared = (it) => it.status === 'CLEARED' && /\[Auto\]/.test(it.remarks || '')
// HR-gate "apply" outcomes — the marked tasks wrote to the real records.
const APPLIED = { records: { icon: ScrollText, label: 'Records finalised' }, ff_ack: { icon: BadgeCheck, label: 'F&F acknowledged' }, fin_loans: { icon: Coins, label: 'Dues scheduled' } }
const appliedMeta = (it) => (it.status === 'CLEARED' && it.submission && APPLIED[it.submission.kind]) ? APPLIED[it.submission.kind] : null
const hoSteps = (it) => {
  const pb = clearanceItemPlaybook(it.item_key, it.department)
  const total = pb.steps?.length || 0
  if (!total) return ''
  const done = Object.values(it.submission?.checklist || {}).filter(Boolean).length
  return `${done}/${total} steps`
}
const cleanRemarks = (r) => (r || '')
  .replace(/\n?\[Auto\][^\n]*/gi, '')
  .replace(/^\[Records\]\s*/i, 'Records · ')
  .replace(/\n?\[Records\]\s*/gi, ' · ')
  .replace(/^\[F&F ack\]\s*/i, 'F&F · ')
  .replace(/\n?\[F&F ack\]\s*/gi, ' · ')
  .replace(/^\[Loans\]\s*/i, 'Loans · ')
  .replace(/\n?\[Loans\]\s*/gi, ' · ')
  .replace(/\n?\[ERP revoked\]\s*/gi, ' · ')
  .replace(/\n?\[Revoked\]\s*/gi, ' · ')
  .replace(/\n?\[Reopened\]\s*/g, ' · Reopened: ')
  .replace(/^\[Blocked\]\s*/i, 'Blocked: ')
  .replace(/\n?\[Blocked\]\s*/gi, ' · Blocked: ')
  .trim()
</script>

<style scoped>
.lane-shell { animation: ex-deal 0.5s var(--ex-spring) backwards; animation-delay: calc(var(--i) * 0.06s); }
.lane { position: relative; overflow: hidden; border-radius: 18px; padding: 0; background: var(--ex-surface); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow);
  transition: transform 0.3s var(--ex-spring), box-shadow 0.3s, border-color 0.3s; }
.lane:hover { transform: perspective(1100px) rotateX(calc((var(--my, 0.5) - 0.5) * -5deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 7deg)) translateY(-2px);
  box-shadow: var(--ex-shadow-hover); border-color: color-mix(in srgb, var(--c) 32%, transparent); }
.lane.blocked { border-color: color-mix(in srgb, var(--ex-blocked) 30%, transparent); }
.lane.done { border-color: color-mix(in srgb, var(--ex-cleared) 28%, transparent); }
.lane-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s; z-index: 4;
  background: radial-gradient(280px 200px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--c) 22%, transparent), transparent 60%); }
.lane-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--c); box-shadow: 0 0 12px color-mix(in srgb, var(--c) 50%, transparent); }
.lane.blocked .lane-spine { background: var(--ex-blocked); box-shadow: 0 0 12px color-mix(in srgb, var(--ex-blocked) 55%, transparent); }
.lane.done .lane-spine { background: var(--ex-cleared); box-shadow: 0 0 12px color-mix(in srgb, var(--ex-cleared) 55%, transparent); }

.lane-head { display: flex; align-items: center; gap: 10px; padding: 13px 14px 11px; border-bottom: 1px solid var(--ex-border); }
.lane-ico { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0; color: var(--c);
  background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 28%, transparent); }
.lane-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.lane-name { font-size: 13.5px; font-weight: 820; color: var(--ex-text); }
.lane-sub { font-size: 10.5px; font-weight: 600; color: var(--ex-text-muted); }
.lane-ring { position: relative; width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0; display: grid; place-items: center;
  background: conic-gradient(from -90deg, var(--c) var(--ex-p, 0deg), color-mix(in srgb, var(--ex-steel) 24%, transparent) 0); transition: --ex-p 0.8s var(--ex-spring); }
.lane-ring::after { content: ''; position: absolute; inset: 4px; border-radius: 50%; background: var(--ex-surface); }
.lane.done .lane-ring { background: conic-gradient(from -90deg, var(--ex-cleared) 360deg, var(--ex-cleared) 0); }
.lr-pct { position: relative; z-index: 1; font-size: 11px; font-weight: 850; color: var(--ex-text); }

.lane-items { list-style: none; margin: 0; padding: 6px; display: flex; flex-direction: column; gap: 2px; }
.ci { display: flex; align-items: flex-start; gap: 9px; padding: 9px 9px; border-radius: 11px; transition: background 0.2s; }
.ci:hover { background: var(--ex-violet-soft); }
.ci-dot { width: 9px; height: 9px; border-radius: 50%; margin-top: 4px; flex-shrink: 0; box-shadow: 0 0 6px currentColor; }
.ci.st-blocked .ci-dot { animation: ci-pulse 1.6s ease-in-out infinite; }
@keyframes ci-pulse { 0%,100% { box-shadow: 0 0 4px var(--ex-blocked); } 50% { box-shadow: 0 0 11px var(--ex-blocked); } }
.ci-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.ci-titlerow { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.ci-title { font-size: 12.5px; font-weight: 650; color: var(--ex-text); }
.ci-req { font-style: normal; font-size: 8.5px; font-weight: 800; color: var(--ex-violet); text-transform: uppercase; letter-spacing: 0.06em; padding: 1px 5px; border-radius: 5px; background: var(--ex-violet-soft); }
.ci-rem { font-size: 11px; color: var(--ex-text-muted); line-height: 1.4; }
.ci-ho { display: flex; align-items: flex-start; gap: 6px; font-size: 11px; line-height: 1.45; color: var(--ex-text-secondary);
  padding: 6px 8px; border-radius: 9px; background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.ci-ho svg { color: var(--ex-violet); flex-shrink: 0; margin-top: 1px; }
.ci-ho-tx em { display: block; font-style: italic; color: var(--ex-text-muted); margin-top: 2px; }
.ci-tag.ho { color: var(--ex-violet); background: var(--ex-violet-soft); border-color: var(--ex-violet-border); }
.ci-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 1px; }
.ci-tag { display: inline-flex; align-items: center; gap: 3px; font-size: 9.5px; font-weight: 700; padding: 2px 7px; border-radius: 999px; white-space: nowrap;
  color: var(--ex-text-muted); background: var(--ex-steel-soft); border: 1px solid var(--ex-border); }
.ci-tag.st { color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); border-color: color-mix(in srgb, var(--c) 30%, transparent); }
.ci-tag.rec { color: var(--ex-blocked); background: var(--ex-blocked-soft); border-color: color-mix(in srgb, var(--ex-blocked) 28%, transparent); }
.ci-tag.asg { color: var(--ex-amber-strong); }
.ci-tag.sgn { color: var(--ex-cleared); background: var(--ex-cleared-soft); border-color: color-mix(in srgb, var(--ex-cleared) 26%, transparent); }
.ci-tag.sgn i { font-style: normal; opacity: 0.85; }
.ci-tag.sgn.auto { color: var(--ex-cleared); background: var(--ex-cleared-soft); border-color: color-mix(in srgb, var(--ex-cleared) 30%, transparent); }
.ci-tag.applied { color: var(--ex-violet); background: var(--ex-violet-soft); border-color: var(--ex-violet-border); }
.ci-tag.sys { font-weight: 750; }
.ci-tag.sys.sys-satisfied { color: var(--ex-cleared); background: var(--ex-cleared-soft); border-color: color-mix(in srgb, var(--ex-cleared) 28%, transparent); }
.ci-tag.sys.sys-pending { color: var(--ex-steel); background: var(--ex-steel-soft); border-color: var(--ex-border-strong); }
.ci-tag.sys.sys-attention { color: var(--ex-blocked); background: var(--ex-blocked-soft); border-color: color-mix(in srgb, var(--ex-blocked) 28%, transparent); }
.ci-acts { display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }
.ci-btn { display: inline-flex; align-items: center; gap: 4px; padding: 6px 9px; border-radius: 8px; cursor: pointer; font-size: 10.5px; font-weight: 750; font-family: inherit; white-space: nowrap; }
.ci-btn.primary { border: none; background: var(--ex-violet-soft); color: var(--ex-violet); border: 1px solid var(--ex-violet-border); }
.ci-btn.primary:hover { background: color-mix(in srgb, var(--ex-violet) 18%, transparent); }
.ci-btn.ghost { background: transparent; border: 1px solid var(--ex-border); color: var(--ex-text-muted); }
.ci-btn.ghost:hover { border-color: var(--ex-border-strong); color: var(--ex-text-secondary); }

[data-theme="light"] .lane-ring::after { background: var(--ex-surface); }
@media (prefers-reduced-motion: reduce) { .lane-shell { animation: none; } .lane:hover { transform: none; } .lane-ring { transition: none; } .ci.st-blocked .ci-dot { animation: none; } }
</style>
