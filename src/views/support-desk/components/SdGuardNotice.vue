<template>
  <Motion v-if="error" as="div" class="gn" :class="tone"
    :initial="{ opacity: 0, y: 8, scale: 0.985 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
    :transition="{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }" role="alert">
    <div class="gn-head">
      <span class="gn-ic"><component :is="icon" :size="15" /></span>
      <div class="gn-copy">
        <p class="gn-title">{{ headline }}</p>
        <p class="gn-msg">{{ message }}</p>
      </div>
    </div>

    <!-- member blockers (removal guard) -->
    <ul v-if="members.length" class="gn-members">
      <li v-for="m in members" :key="m.user_id">
        <span class="gn-ava" aria-hidden="true">{{ initials(m.name) }}</span>
        <span class="gn-name">{{ m.name || 'Member' }}</span>
        <b class="gn-n sd-mono">{{ m.open_count }} open</b>
      </li>
    </ul>

    <!-- active-work counts (deactivate / delete guard) -->
    <div v-else-if="counts.length" class="gn-counts sd-mono">
      <span v-for="c in counts" :key="c.label"><b>{{ c.value }}</b> {{ c.label }}</span>
    </div>

    <p v-if="hint" class="gn-hint"><Lightbulb :size="12" /> {{ hint }}</p>
  </Motion>
</template>

<script setup>
/* SdGuardNotice — renders the Team Command structured-409 payloads
   ({error, message, members[]/counts}) as a coded, actionable notice instead of a raw
   toast. String details degrade to a plain line. */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { AlertTriangle, ShieldAlert, UsersRound, Lightbulb } from 'lucide-vue-next'

const props = defineProps({
  // e?.response?.data?.detail — string or the structured object
  error: { type: [Object, String], default: null },
})

const obj = computed(() => (props.error && typeof props.error === 'object') ? props.error : null)
const code = computed(() => obj.value?.error || '')
const tone = computed(() => code.value === 'members_have_open_assignments' ? 'warn' : 'danger')
const icon = computed(() => code.value === 'members_have_open_assignments' ? UsersRound
  : code.value ? ShieldAlert : AlertTriangle)

const HEADLINES = {
  team_has_active_tickets: 'Live work still depends on this team',
  members_have_open_assignments: 'Departing members still own open work',
  team_has_no_assignable_members: 'No one left to take the work',
}
const HINTS = {
  team_has_active_tickets: 'Resolve, close or move the tickets first — deleting keeps history, it never destroys work.',
  members_have_open_assignments: 'Pick what happens to each ticket below: hand it to a teammate, auto-spread it, or return it to the team queue.',
  team_has_no_assignable_members: 'Add at least one non-collaborator member (or a lead) before removing the current owners.',
}
const headline = computed(() => HEADLINES[code.value] || 'Blocked by a safety guard')
const message = computed(() => obj.value?.message || (typeof props.error === 'string' ? props.error : ''))
const hint = computed(() => HINTS[code.value] || '')
const members = computed(() => obj.value?.members || [])
const counts = computed(() => {
  if (!obj.value || members.value.length) return []
  const out = []
  if (obj.value.open) out.push({ label: 'open', value: obj.value.open })
  if (obj.value.on_hold) out.push({ label: 'on hold', value: obj.value.on_hold })
  if (obj.value.escalated_in) out.push({ label: 'escalated in', value: obj.value.escalated_in })
  return out
})
const initials = (n) => (n || 'M').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
</script>

<style scoped>
.gn { display: flex; flex-direction: column; gap: 10px; padding: 13px 15px; border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--gc) 38%, transparent);
  background: color-mix(in srgb, var(--gc) 9%, transparent); }
.gn.danger { --gc: var(--sd-team-strain); }
.gn.warn { --gc: var(--sd-team-core); }
.gn-head { display: flex; align-items: flex-start; gap: 10px; }
.gn-ic { width: 30px; height: 30px; flex: 0 0 30px; display: grid; place-items: center; border-radius: 9px;
  color: var(--gc); background: color-mix(in srgb, var(--gc) 15%, transparent); }
.gn-copy { min-width: 0; }
.gn-title { margin: 0 0 2px; font-size: 13px; font-weight: 800; color: var(--sd-text); }
.gn-msg { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--sd-text-secondary); }
.gn-members { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.gn-members li { display: flex; align-items: center; gap: 9px; padding: 7px 10px; border-radius: 10px;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.gn-ava { width: 24px; height: 24px; flex: 0 0 24px; display: grid; place-items: center; border-radius: 50%;
  font-size: 9.5px; font-weight: 800; color: var(--sd-team-deep); background: var(--sd-team-soft);
  border: 1px solid var(--sd-team-brd); }
.gn-name { flex: 1; min-width: 0; font-size: 12.5px; font-weight: 650; color: var(--sd-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gn-n { font-size: 11px; font-weight: 700; color: var(--gc); }
.gn-counts { display: flex; flex-wrap: wrap; gap: 14px; font-size: 11.5px; color: var(--sd-text-secondary); }
.gn-counts b { color: var(--gc); font-size: 13px; }
.gn-hint { display: flex; align-items: flex-start; gap: 7px; margin: 0; font-size: 11.5px; line-height: 1.5;
  color: var(--sd-text-muted); }
.gn-hint :deep(svg) { flex: 0 0 auto; margin-top: 2px; color: var(--gc); }
</style>
