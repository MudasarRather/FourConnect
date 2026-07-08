<template>
  <Motion as="div" class="uc-shell"
    :initial="{ opacity: 0, y: 16, scale: 0.98 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
    :transition="{ duration: 0.45, delay: Math.min(index * 0.04, 0.4), ease: [0.16, 1, 0.3, 1] }">
    <!-- inner element owns the pointer tilt so it never fights the entrance transform -->
    <article ref="cardEl" class="uc" :class="[`is-${status}`, { busy }]" :style="{ '--acc': accent }"
      @mousemove="onMove" @mouseleave="onLeave" @click="$emit('preview', t)">
      <span class="uc-spot" aria-hidden="true" />
      <span class="uc-ribbon sd-mono" :data-status="status">{{ ribbon }}</span>

      <header class="uc-head">
        <span class="uc-seal" :title="t.name">
          <template v-if="isEmoji">{{ t.icon }}</template>
          <component :is="iconComp" v-else :size="16" />
        </span>
        <div class="uc-idbox">
          <h3 class="uc-name">{{ t.name }}</h3>
          <p class="uc-desc">{{ t.description || t.subject || 'No description' }}</p>
        </div>
        <button class="uc-fav" :class="{ on: t.is_favorite }" :disabled="busy"
          :title="t.is_favorite ? 'Unstar' : 'Star — pin it to your Favorites lens'"
          @click.stop="$emit('fav', t)">
          <Star :size="14" :fill="t.is_favorite ? 'currentColor' : 'none'" />
        </button>
      </header>

      <div class="uc-meta">
        <span class="uc-vis sd-mono" :data-vis="visibility">
          <component :is="visIcon" :size="10" /> {{ visLabel }}
        </span>
        <SdPill v-if="t.priority" kind="priority" :value="t.priority" />
        <span v-if="t.ticket_type" class="uc-tag">{{ typeLabel(t.ticket_type) }}</span>
        <span v-if="catName" class="uc-tag dim"><FolderOpen :size="10" /> {{ catName }}</span>
        <span v-if="(t.checklist || []).length" class="uc-tag dim"><ListChecks :size="10" /> {{ t.checklist.length }}</span>
        <span v-if="t.pinned" class="uc-tag dim" title="Curated by the desk admin"><Pin :size="10" /> desk pick</span>
      </div>

      <div v-if="(t.tags || []).length" class="uc-tags">
        <span v-for="tag in t.tags.slice(0, 5)" :key="tag" class="uc-hash">#{{ tag }}</span>
        <span v-if="t.tags.length > 5" class="uc-hash">+{{ t.tags.length - 5 }}</span>
      </div>

      <footer class="uc-foot sd-mono">
        <span class="uc-uses" :class="{ zero: !t.usage_count }">
          <Zap :size="11" /> {{ t.usage_count || 0 }} play{{ (t.usage_count || 0) === 1 ? '' : 's' }}
        </span>
        <span class="uc-when">{{ lastUsed }}</span>
        <span class="uc-ver">v{{ t.version || 1 }}</span>
      </footer>

      <!-- hover action rail -->
      <div class="uc-rail" @click.stop>
        <button v-if="status !== 'archived'" class="uc-act use" :disabled="busy"
          :title="status === 'draft' ? 'Test-drive your draft in the New Ticket intake' : 'Play into a fresh ticket intake'"
          @click="$emit('use', t)"><Play :size="13" /><span>Use</span></button>
        <button v-if="status === 'active' || mine" class="uc-act" :disabled="busy"
          title="Run on a ticket you're working — note or reply"
          @click="$emit('run', t)"><Zap :size="13" /><span>Run</span></button>
        <button class="uc-act" :disabled="busy" title="Preview with live variables"
          @click="$emit('preview', t)"><Eye :size="13" /><span>View</span></button>
        <button class="uc-act" :disabled="busy" title="Clone into MY slides as a draft"
          @click="$emit('clone', t)"><CopyPlus :size="13" /><span>Mine</span></button>
        <template v-if="mine">
          <button class="uc-act" :disabled="busy" title="Edit your tape" @click="$emit('edit', t)"><Pencil :size="13" /><span>Edit</span></button>
          <button v-if="status === 'archived'" class="uc-act use" :disabled="busy" title="Put it back in the rack"
            @click="$emit('activate', t)"><ArchiveRestore :size="13" /><span>Restore</span></button>
          <button class="uc-act danger" :disabled="busy" title="Retire your tape" @click="$emit('retire', t)"><Archive :size="13" /></button>
        </template>
      </div>
    </article>
  </Motion>
</template>

<script setup>
/* SdUtplCard — one slide in the Projection Room library. Outer Motion shell owns
   the staggered entrance; the INNER article owns the pointer 3D tilt + spotlight
   (never on the same element — the transforms would fight). Star = the caller's
   own favorite (optimistic in the parent); "desk pick" = the admin's global pin,
   read-only here. Owner-only rail actions (edit/retire) appear only on `mine`.
   Click anywhere = preview. */
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import {
  Star, Zap, Play, Eye, Pencil, CopyPlus, Archive, ArchiveRestore, Pin,
  FolderOpen, ListChecks, Globe, Users, Lock, Stamp,
  KeyRound, Wifi, Monitor, Printer, Mail, Shield, Bug, CreditCard, UserPlus, HardDrive, Wrench, Film,
} from 'lucide-vue-next'
import SdPill from './SdPill.vue'
import { typeLabel } from '@/composables/useSupportDesk'

const ICONS = { Stamp, Film, KeyRound, Wifi, Monitor, Printer, Mail, Shield, Bug, CreditCard, UserPlus, HardDrive, Wrench }

const props = defineProps({
  t: { type: Object, required: true },
  index: { type: Number, default: 0 },
  mine: { type: Boolean, default: false },      // caller owns this personal slide
  catName: { type: String, default: '' },
  busy: { type: Boolean, default: false },
})
defineEmits(['use', 'run', 'preview', 'clone', 'fav', 'edit', 'retire', 'activate'])

const cardEl = ref(null)
const status = computed(() => props.t.status || 'active')
const ribbon = computed(() => ({ active: 'LIVE', draft: 'DRAFT', archived: 'BOXED' }[status.value] || 'LIVE'))
const accent = computed(() => props.t.accent || 'var(--sd-utpl-core)')
const isEmoji = computed(() => !!props.t.icon && !/^[A-Za-z]/.test(props.t.icon))
const iconComp = computed(() => ICONS[props.t.icon] || Film)

const visibility = computed(() => props.t.visibility || 'global')
const visLabel = computed(() => (visibility.value === 'personal' ? (props.mine ? 'MINE' : 'PERSONAL')
  : visibility.value === 'team' ? 'TEAM' : 'LIBRARY'))
const visIcon = computed(() => (visibility.value === 'personal' ? Lock : visibility.value === 'team' ? Users : Globe))

const lastUsed = computed(() => {
  if (!props.t.last_used_at) return 'never played'
  const mins = Math.max(1, Math.round((Date.now() - new Date(props.t.last_used_at).getTime()) / 60000))
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`
  return `${Math.round(mins / 1440)}d ago`
})

/* pointer spotlight + gentle 3D tilt (inner element only) */
const onMove = (e) => {
  const el = cardEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width)}`)
  el.style.setProperty('--my', `${((e.clientY - r.top) / r.height)}`)
}
const onLeave = () => {
  const el = cardEl.value
  if (el) { el.style.setProperty('--mx', '0.5'); el.style.setProperty('--my', '0.5') }
}
</script>

<style scoped>
.uc-shell { display: flex; }
.uc {
  position: relative; overflow: hidden; cursor: pointer; flex: 1;
  display: flex; flex-direction: column; gap: 10px;
  padding: 16px 16px 14px; border-radius: 16px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--sd-surface) 92%, var(--acc) 8%), var(--sd-surface));
  border: 1px solid var(--sd-border);
  transition: border-color 0.25s, transform 0.25s var(--sd-spring), box-shadow 0.25s;
}
.uc:hover {
  border-color: color-mix(in srgb, var(--acc) 45%, var(--sd-border));
  transform: perspective(1100px)
    rotateX(calc((var(--my, 0.5) - 0.5) * -5deg))
    rotateY(calc((var(--mx, 0.5) - 0.5) * 7deg))
    translateY(-3px);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.35);
}
[data-theme="light"] .uc:hover { box-shadow: 0 14px 30px rgba(95, 58, 8, 0.14); }
.uc.is-draft { border-style: dashed; }
.uc.is-archived { opacity: 0.72; }
.uc.is-archived:hover { opacity: 1; }
.uc.busy { pointer-events: none; opacity: 0.55; }

.uc-spot {
  position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.3s;
  background: radial-gradient(240px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%),
    color-mix(in srgb, var(--acc) 13%, transparent), transparent 70%);
}
.uc:hover .uc-spot { opacity: 1; }

.uc-ribbon {
  position: absolute; top: 13px; right: -32px; transform: rotate(38deg);
  width: 110px; text-align: center; padding: 3px 0;
  font-size: 8px; font-weight: 800; letter-spacing: 0.22em;
}
.uc-ribbon[data-status="active"] { background: color-mix(in srgb, var(--sd-utpl-core) 24%, transparent); color: var(--sd-utpl-hi); }
[data-theme="light"] .uc-ribbon[data-status="active"] { color: var(--sd-utpl-deep); }
.uc-ribbon[data-status="draft"] { background: color-mix(in srgb, var(--sd-utpl-ink) 26%, transparent); color: var(--sd-utpl-ink); }
.uc-ribbon[data-status="archived"] { background: color-mix(in srgb, var(--sd-utpl-arch) 30%, transparent); color: var(--sd-utpl-arch); }

.uc-head { display: flex; align-items: flex-start; gap: 11px; padding-right: 26px; }
.uc-seal {
  flex: 0 0 auto; width: 36px; height: 36px; display: grid; place-items: center;
  border-radius: 11px; font-size: 17px;
  background: color-mix(in srgb, var(--acc) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--acc) 38%, transparent);
  color: var(--acc);
  box-shadow: inset 0 1px 4px color-mix(in srgb, var(--acc) 25%, transparent);
}
.uc-idbox { min-width: 0; }
.uc-name { margin: 0 0 3px; font-size: 14.5px; font-weight: 800; color: var(--sd-text); line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.uc-desc { margin: 0; font-size: 12px; color: var(--sd-text-muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.uc-fav {
  position: absolute; top: 10px; right: 10px; z-index: 2;
  width: 26px; height: 26px; display: grid; place-items: center; border-radius: 8px; cursor: pointer;
  background: transparent; border: 1px solid transparent; color: var(--sd-text-muted);
  opacity: 0; transition: opacity 0.2s, color 0.2s, transform 0.2s var(--sd-spring);
}
.uc:hover .uc-fav, .uc-fav.on { opacity: 1; }
.uc-fav:hover { transform: scale(1.15); }
.uc-fav.on {
  color: var(--sd-utpl-fav);
  background: var(--sd-utpl-fav-soft);
  border-color: color-mix(in srgb, var(--sd-utpl-fav) 40%, transparent);
}

.uc-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.uc-vis {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 8.5px; font-weight: 800; letter-spacing: 0.14em;
  padding: 2.5px 8px; border-radius: 6px;
}
.uc-vis[data-vis="global"] { background: var(--sd-utpl-soft); color: var(--sd-utpl-hi); border: 1px solid color-mix(in srgb, var(--sd-utpl-core) 34%, transparent); }
[data-theme="light"] .uc-vis[data-vis="global"] { color: var(--sd-utpl-deep); }
.uc-vis[data-vis="team"] { background: var(--sd-utpl-deep-soft); color: var(--sd-utpl-core); border: 1px solid color-mix(in srgb, var(--sd-utpl-deep) 40%, transparent); }
.uc-vis[data-vis="personal"] { background: var(--sd-utpl-fav-soft); color: var(--sd-utpl-fav); border: 1px solid color-mix(in srgb, var(--sd-utpl-fav) 36%, transparent); }
[data-theme="light"] .uc-vis[data-vis="personal"] { color: var(--sd-utpl-fav); }
.uc-tag {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--sd-text-secondary); background: var(--sd-surface-glass);
  border: 1px solid var(--sd-border); padding: 2.5px 8px; border-radius: 6px;
}
.uc-tag.dim { text-transform: none; letter-spacing: 0; color: var(--sd-text-muted); }

.uc-tags { display: flex; flex-wrap: wrap; gap: 5px; }
.uc-hash { font-size: 11px; color: color-mix(in srgb, var(--acc) 80%, var(--sd-text)); }

.uc-foot {
  display: flex; align-items: center; gap: 12px; margin-top: auto; padding-top: 9px;
  border-top: 1px dashed color-mix(in srgb, var(--sd-border) 80%, transparent);
  font-size: 10px; letter-spacing: 0.06em; color: var(--sd-text-muted);
}
.uc-uses { display: inline-flex; align-items: center; gap: 4px; color: var(--sd-utpl-use); font-weight: 700; }
.uc-uses.zero { color: var(--sd-text-muted); }
.uc-when { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.uc-ver { margin-left: auto; padding: 1.5px 7px; border-radius: 6px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); font-variant-numeric: tabular-nums; }

/* ── hover action rail — magnetic expanding icon buttons (never overflow) ──
   Every action is an icon by default (fits ≥6 buttons in a 272px card); its
   label expands on that button's own hover. "Use" keeps its label pinned as the
   primary CTA and flexes to absorb neighbours' expansion. The rail clips as a
   safety net so nothing can ever spill past the card edge. */
.uc-rail {
  position: absolute; left: 8px; right: 8px; bottom: 8px; z-index: 3;
  display: flex; gap: 4px; padding: 6px; overflow: hidden;
  border-radius: 12px;
  background: color-mix(in srgb, var(--sd-utpl-plate) 90%, transparent);
  border: 1px solid var(--sd-utpl-brd);
  backdrop-filter: blur(10px);
  opacity: 0; transform: translateY(10px); pointer-events: none;
  transition: opacity 0.22s, transform 0.28s var(--sd-spring);
}
[data-theme="light"] .uc-rail { background: rgba(255, 250, 240, 0.9); }
.uc:hover .uc-rail, .uc:focus-within .uc-rail { opacity: 1; transform: translateY(0); pointer-events: auto; }
.uc-act {
  flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; gap: 0;
  height: 32px; max-width: 32px; padding: 0 9px; border-radius: 9px; cursor: pointer;
  font-size: 11px; font-weight: 700; white-space: nowrap; overflow: hidden;
  background: transparent; border: none; color: var(--sd-text-secondary);
  transition: max-width 0.32s var(--sd-spring), gap 0.28s var(--sd-spring), background 0.15s, color 0.15s;
}
.uc-act svg { flex: 0 0 auto; }
.uc-act span { max-width: 0; opacity: 0; transition: max-width 0.32s var(--sd-spring), opacity 0.2s; }
.uc-act:hover, .uc-act:focus-visible { max-width: 130px; gap: 6px; background: color-mix(in srgb, var(--sd-utpl-core) 15%, transparent); color: var(--sd-text); }
.uc-act:hover span, .uc-act:focus-visible span { max-width: 90px; opacity: 1; }
.uc-act.use { flex: 1 1 auto; max-width: 130px; gap: 6px; color: var(--sd-utpl-hi); }
.uc-act.use span { max-width: 90px; opacity: 1; }
[data-theme="light"] .uc-act.use { color: var(--sd-utpl-core); }
.uc-act.danger { color: var(--sd-utpl-arch); }
.uc-act.danger:hover { background: color-mix(in srgb, var(--sd-utpl-risk) 14%, transparent); color: var(--sd-utpl-risk); }
.uc-act:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
