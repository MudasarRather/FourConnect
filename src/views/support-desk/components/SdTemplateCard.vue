<template>
  <Motion as="article" ref="cardEl" class="tpc" :class="[`is-${status}`, { busy }]"
    :style="{ '--acc': accent }"
    :initial="{ opacity: 0, y: 16, scale: 0.98 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
    :transition="{ duration: 0.45, delay: Math.min(index * 0.04, 0.4), ease: [0.16, 1, 0.3, 1] }"
    @mousemove="onMove" @mouseleave="onLeave" @click="$emit('edit', t)">
    <span class="tpc-spot" aria-hidden="true" />
    <span class="tpc-ribbon sd-mono" :data-status="status">{{ ribbon }}</span>

    <header class="tpc-head">
      <span class="tpc-seal" :title="t.name">
        <template v-if="isEmoji">{{ t.icon }}</template>
        <component :is="iconComp" v-else :size="16" />
      </span>
      <div class="tpc-idbox">
        <h3 class="tpc-name">{{ t.name }}</h3>
        <p class="tpc-desc">{{ t.description || t.subject || 'No description' }}</p>
      </div>
      <button class="tpc-pin" :class="{ on: t.pinned }" :title="t.pinned ? 'Unpin' : 'Pin to the top of the case'"
        @click.stop="$emit('pin', t)">
        <Pin :size="13" />
      </button>
    </header>

    <div class="tpc-meta">
      <SdPill v-if="t.priority" kind="priority" :value="t.priority" />
      <span v-if="t.ticket_type" class="tpc-tag">{{ typeLabel(t.ticket_type) }}</span>
      <span v-if="catName" class="tpc-tag dim"><FolderOpen :size="10" /> {{ catName }}</span>
      <span v-if="teamName" class="tpc-tag dim"><Users :size="10" /> {{ teamName }}</span>
      <span v-if="(t.checklist || []).length" class="tpc-tag dim"><ListChecks :size="10" /> {{ t.checklist.length }}</span>
    </div>

    <div v-if="(t.tags || []).length" class="tpc-tags">
      <span v-for="tag in t.tags.slice(0, 5)" :key="tag" class="tpc-hash">#{{ tag }}</span>
      <span v-if="t.tags.length > 5" class="tpc-hash">+{{ t.tags.length - 5 }}</span>
    </div>

    <footer class="tpc-foot sd-mono">
      <span class="tpc-uses" :class="{ zero: !t.usage_count }">
        <Zap :size="11" /> {{ t.usage_count || 0 }} strike{{ (t.usage_count || 0) === 1 ? '' : 's' }}
      </span>
      <span class="tpc-when">{{ lastUsed }}</span>
      <span class="tpc-ver">v{{ t.version || 1 }}</span>
    </footer>

    <!-- hover action rail -->
    <div class="tpc-rail" @click.stop>
      <button v-if="status !== 'archived'" class="tpc-act use" :disabled="busy"
        :title="status === 'draft' ? 'Test-drive this draft in the New Ticket intake' : 'Prefill a new ticket from this plate'"
        @click="$emit('apply', t)"><Play :size="13" /><span>Use</span></button>
      <button class="tpc-act" :disabled="busy" title="Edit the plate" @click="$emit('edit', t)"><Pencil :size="13" /><span>Edit</span></button>
      <button class="tpc-act" :disabled="busy" title="Strike a draft copy" @click="$emit('clone', t)"><CopyPlus :size="13" /><span>Clone</span></button>
      <button v-if="status === 'archived'" class="tpc-act use" :disabled="busy" title="Put the plate back in circulation"
        @click="$emit('activate', t)"><ArchiveRestore :size="13" /><span>Activate</span></button>
      <button v-else-if="status === 'draft'" class="tpc-act use" :disabled="busy" title="Activate — lock it into the chase"
        @click="$emit('activate', t)"><Stamp :size="13" /><span>Activate</span></button>
      <button class="tpc-act danger" :disabled="busy" title="Retire the plate" @click="$emit('retire', t)"><Archive :size="13" /></button>
    </div>
  </Motion>
</template>

<script setup>
/* SdTemplateCard — one master plate in the library case. Pointer spotlight +
   status ribbon (copper active / graphite draft / umber archived) + identity
   seal (emoji or lucide icon on the plate accent) + usage meta + a hover action
   rail. Click anywhere = edit; rail actions stop propagation. */
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import {
  Pin, Zap, Play, Pencil, CopyPlus, Archive, ArchiveRestore, Stamp,
  FolderOpen, Users, ListChecks,
  KeyRound, Wifi, Monitor, Printer, Mail, Shield, Bug, CreditCard, UserPlus, HardDrive, Wrench,
} from 'lucide-vue-next'
import SdPill from './SdPill.vue'
import { typeLabel } from '@/composables/useSupportDesk'

const ICONS = { Stamp, KeyRound, Wifi, Monitor, Printer, Mail, Shield, Bug, CreditCard, UserPlus, HardDrive, Wrench }

const props = defineProps({
  t: { type: Object, required: true },
  index: { type: Number, default: 0 },
  catName: { type: String, default: '' },
  teamName: { type: String, default: '' },
  busy: { type: Boolean, default: false },
})
defineEmits(['apply', 'edit', 'clone', 'pin', 'activate', 'retire'])

const cardEl = ref(null)
const status = computed(() => props.t.status || 'active')
const ribbon = computed(() => ({ active: 'ACTIVE', draft: 'DRAFT', archived: 'ARCHIVED' }[status.value] || 'ACTIVE'))
const accent = computed(() => props.t.accent || 'var(--sd-tpl-core)')
const isEmoji = computed(() => !!props.t.icon && !/^[A-Za-z]/.test(props.t.icon))
const iconComp = computed(() => ICONS[props.t.icon] || Stamp)

const lastUsed = computed(() => {
  if (!props.t.last_used_at) return 'never struck'
  const mins = Math.max(1, Math.round((Date.now() - new Date(props.t.last_used_at).getTime()) / 60000))
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`
  return `${Math.round(mins / 1440)}d ago`
})

/* pointer spotlight (cinematic tilt-lite: spotlight only, no layout-shifting tilt) */
const onMove = (e) => {
  const el = cardEl.value?.$el || cardEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
  el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
}
const onLeave = () => {
  const el = cardEl.value?.$el || cardEl.value
  if (el) { el.style.setProperty('--mx', '50%'); el.style.setProperty('--my', '-30%') }
}
</script>

<style scoped>
.tpc {
  position: relative; overflow: hidden; cursor: pointer;
  display: flex; flex-direction: column; gap: 10px;
  padding: 16px 16px 14px; border-radius: 16px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--sd-surface) 92%, var(--acc) 8%), var(--sd-surface));
  border: 1px solid var(--sd-border);
  transition: border-color 0.25s, transform 0.25s var(--sd-spring), box-shadow 0.25s;
}
.tpc:hover { border-color: color-mix(in srgb, var(--acc) 45%, var(--sd-border)); transform: translateY(-3px); box-shadow: 0 14px 34px rgba(0, 0, 0, 0.35); }
[data-theme="light"] .tpc:hover { box-shadow: 0 14px 30px rgba(94, 50, 19, 0.14); }
.tpc.is-draft { border-style: dashed; }
.tpc.is-archived { opacity: 0.72; }
.tpc.is-archived:hover { opacity: 1; }
.tpc.busy { pointer-events: none; opacity: 0.55; }

.tpc-spot {
  position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.3s;
  background: radial-gradient(240px circle at var(--mx, 50%) var(--my, -30%), color-mix(in srgb, var(--acc) 12%, transparent), transparent 70%);
}
.tpc:hover .tpc-spot { opacity: 1; }

.tpc-ribbon {
  position: absolute; top: 13px; right: -32px; transform: rotate(38deg);
  width: 110px; text-align: center; padding: 3px 0;
  font-size: 8px; font-weight: 800; letter-spacing: 0.22em;
}
.tpc-ribbon[data-status="active"] { background: color-mix(in srgb, var(--sd-tpl-core) 24%, transparent); color: var(--sd-tpl-hi); }
[data-theme="light"] .tpc-ribbon[data-status="active"] { color: var(--sd-tpl-deep); }
.tpc-ribbon[data-status="draft"] { background: color-mix(in srgb, var(--sd-tpl-ink) 26%, transparent); color: var(--sd-tpl-ink); }
.tpc-ribbon[data-status="archived"] { background: color-mix(in srgb, var(--sd-tpl-arch) 30%, transparent); color: var(--sd-tpl-arch); }

.tpc-head { display: flex; align-items: flex-start; gap: 11px; padding-right: 26px; }
.tpc-seal {
  flex: 0 0 auto; width: 36px; height: 36px; display: grid; place-items: center;
  border-radius: 11px; font-size: 17px;
  background: color-mix(in srgb, var(--acc) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--acc) 38%, transparent);
  color: var(--acc);
  box-shadow: inset 0 1px 4px color-mix(in srgb, var(--acc) 25%, transparent);
}
.tpc-idbox { min-width: 0; }
.tpc-name { margin: 0 0 3px; font-size: 14.5px; font-weight: 800; color: var(--sd-text); line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tpc-desc { margin: 0; font-size: 12px; color: var(--sd-text-muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.tpc-pin {
  position: absolute; top: 10px; right: 10px; z-index: 2;
  width: 26px; height: 26px; display: grid; place-items: center; border-radius: 8px; cursor: pointer;
  background: transparent; border: 1px solid transparent; color: var(--sd-text-muted);
  opacity: 0; transition: opacity 0.2s, color 0.2s;
}
.tpc:hover .tpc-pin, .tpc-pin.on { opacity: 1; }
.tpc-pin.on { color: var(--sd-tpl-hi); background: color-mix(in srgb, var(--sd-tpl-core) 16%, transparent); border-color: var(--sd-tpl-brd); }
[data-theme="light"] .tpc-pin.on { color: var(--sd-tpl-core); }

.tpc-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.tpc-tag {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--sd-text-secondary); background: var(--sd-surface-glass);
  border: 1px solid var(--sd-border); padding: 2.5px 8px; border-radius: 6px;
}
.tpc-tag.dim { text-transform: none; letter-spacing: 0; color: var(--sd-text-muted); }

.tpc-tags { display: flex; flex-wrap: wrap; gap: 5px; }
.tpc-hash { font-size: 11px; color: color-mix(in srgb, var(--acc) 80%, var(--sd-text)); }

.tpc-foot {
  display: flex; align-items: center; gap: 12px; margin-top: auto; padding-top: 9px;
  border-top: 1px dashed color-mix(in srgb, var(--sd-border) 80%, transparent);
  font-size: 10px; letter-spacing: 0.06em; color: var(--sd-text-muted);
}
.tpc-uses { display: inline-flex; align-items: center; gap: 4px; color: var(--sd-tpl-use); font-weight: 700; }
.tpc-uses.zero { color: var(--sd-text-muted); }
.tpc-when { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tpc-ver { margin-left: auto; padding: 1.5px 7px; border-radius: 6px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); font-variant-numeric: tabular-nums; }

/* ── hover action rail — magnetic expanding icon buttons (never overflow) ──
   Icon-only at rest so 5-6 actions always fit a 272px card; each label expands
   on its own hover. "Use" keeps its label pinned as the primary CTA. The rail
   clips as a safety net so nothing spills past the card edge. */
.tpc-rail {
  position: absolute; left: 8px; right: 8px; bottom: 8px; z-index: 3;
  display: flex; gap: 4px; padding: 6px; overflow: hidden;
  border-radius: 12px;
  background: color-mix(in srgb, var(--sd-panel, #16100a) 88%, transparent);
  border: 1px solid var(--sd-tpl-brd);
  backdrop-filter: blur(10px);
  opacity: 0; transform: translateY(10px); pointer-events: none;
  transition: opacity 0.22s, transform 0.28s var(--sd-spring);
}
[data-theme="light"] .tpc-rail { background: rgba(255, 250, 240, 0.88); }
.tpc:hover .tpc-rail, .tpc:focus-within .tpc-rail { opacity: 1; transform: translateY(0); pointer-events: auto; }
.tpc-act {
  flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; gap: 0;
  height: 32px; max-width: 32px; padding: 0 9px; border-radius: 9px; cursor: pointer;
  font-size: 11px; font-weight: 700; white-space: nowrap; overflow: hidden;
  background: transparent; border: none; color: var(--sd-text-secondary);
  transition: max-width 0.32s var(--sd-spring), gap 0.28s var(--sd-spring), background 0.15s, color 0.15s;
}
.tpc-act svg { flex: 0 0 auto; }
.tpc-act span { max-width: 0; opacity: 0; transition: max-width 0.32s var(--sd-spring), opacity 0.2s; }
.tpc-act:hover, .tpc-act:focus-visible { max-width: 130px; gap: 6px; background: color-mix(in srgb, var(--sd-tpl-core) 15%, transparent); color: var(--sd-text); }
.tpc-act:hover span, .tpc-act:focus-visible span { max-width: 90px; opacity: 1; }
.tpc-act.use { flex: 1 1 auto; max-width: 130px; gap: 6px; color: var(--sd-tpl-hi); }
.tpc-act.use span { max-width: 90px; opacity: 1; }
[data-theme="light"] .tpc-act.use { color: var(--sd-tpl-core); }
.tpc-act.danger { color: var(--sd-tpl-arch); }
.tpc-act.danger:hover { background: color-mix(in srgb, var(--sd-tpl-risk) 14%, transparent); color: var(--sd-tpl-risk); }
.tpc-act:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
