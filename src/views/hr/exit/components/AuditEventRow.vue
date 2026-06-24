<template>
  <div class="ael-shell" :style="{ '--i': index }">
    <article ref="cardRef" class="ael" :class="{ open: expanded }" :style="{ '--c': meta.color }">
      <span class="ael-spine" aria-hidden="true" />
      <span class="ael-glare" aria-hidden="true" />

      <button type="button" class="ael-main" :aria-expanded="expanded" @click="expanded = !expanded">
        <span class="ael-glyph">
          <component :is="meta.icon" :size="17" />
          <span class="ael-seal" :title="'Sealed #' + hash"><Check :size="9" /></span>
        </span>

        <span class="ael-body">
          <span class="ael-top">
            <b class="ael-action">{{ meta.label }}</b>
            <span class="ael-entity" :style="{ '--e': entityMeta.color }">
              <component :is="entityMeta.icon" :size="10" />{{ entityMeta.label }}
            </span>
            <span class="ael-hash ex-mono"><Hash :size="9" />{{ hash }}</span>
            <span class="ael-time" :title="full">{{ rel }}</span>
          </span>

          <span class="ael-meta">
            <span v-if="hasFlow" class="ael-flow">
              <i class="fl from">{{ prettyStatus(entry.from_status) || '∅' }}</i>
              <span class="fl-arrow" aria-hidden="true"><span class="fl-run" /></span>
              <i class="fl to">{{ prettyStatus(entry.to_status) || '∅' }}</i>
            </span>
            <span v-if="entry.actor_name" class="ael-actor"><User :size="11" />{{ entry.actor_name }}</span>
            <span v-else class="ael-actor sys"><Cpu :size="11" />System</span>
            <span v-if="entry.note" class="ael-note">{{ entry.note }}</span>
          </span>
        </span>

        <span class="ael-aside">
          <span class="ael-link-btn" :title="'Open ' + targetLabel" @click.stop="$emit('go', targetTab)">
            <ArrowUpRight :size="15" />
          </span>
          <ChevronDown class="ael-chev" :class="{ up: expanded }" :size="16" />
        </span>
      </button>

      <div class="ael-exp">
        <div class="ael-exp-inner">
          <div class="ael-grid">
            <span class="eg"><i>Timestamp</i><b class="ex-mono">{{ full }}</b></span>
            <span class="eg"><i>Actor</i><b>{{ entry.actor_name || 'System / automation' }}</b></span>
            <span class="eg"><i>Entity</i><b>{{ entityMeta.label }} · {{ pretty(entry.action) }}</b></span>
            <span v-if="hasFlow" class="eg"><i>Transition</i><b class="ex-mono">{{ prettyStatus(entry.from_status) || '∅' }} → {{ prettyStatus(entry.to_status) || '∅' }}</b></span>
            <span v-if="entry.entity_id" class="eg"><i>Entity ref</i><b class="ex-mono">{{ shortHash(entry.entity_id) }}</b></span>
            <span v-if="entry.exit_case_id" class="eg"><i>Case ref</i><b class="ex-mono">{{ shortHash(entry.exit_case_id) }}</b></span>
          </div>
          <pre v-if="payloadText" class="ael-payload ex-mono">{{ payloadText }}</pre>
          <div class="ael-cta-row">
            <button type="button" class="ael-cta" @click.stop="$emit('go', targetTab)">
              <component :is="entityMeta.icon" :size="13" /> Open {{ targetLabel }}
              <ArrowUpRight :size="13" />
            </button>
          </div>
        </div>
      </div>
    </article>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Hash, User, Cpu, Check, ChevronDown, ArrowUpRight } from 'lucide-vue-next'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import {
  auditActionMeta, auditEntityMeta, auditTargetTab, auditTargetLabel,
  shortHash, fmtFull, relTime, pretty,
} from './auditMeta.js'

const props = defineProps({
  entry: { type: Object, required: true },
  index: { type: Number, default: 0 },
})
defineEmits(['go'])

const cardRef = ref(null)
usePointerSpotlight(cardRef)
const expanded = ref(false)

const meta = computed(() => auditActionMeta(props.entry.action))
const entityMeta = computed(() => auditEntityMeta(props.entry.entity_type))
const hash = computed(() => shortHash(props.entry.id))
const rel = computed(() => relTime(props.entry.created_at))
const full = computed(() => fmtFull(props.entry.created_at))
const targetTab = computed(() => auditTargetTab(props.entry))
const targetLabel = computed(() => auditTargetLabel(targetTab.value))
const hasFlow = computed(() => !!(props.entry.from_status || props.entry.to_status))
const prettyStatus = (s) => (s ? pretty(s) : '')

const payloadText = computed(() => {
  const p = props.entry.payload
  if (p == null || (typeof p === 'object' && !Object.keys(p).length)) return ''
  try { return typeof p === 'string' ? p : JSON.stringify(p, null, 2) } catch { return '' }
})
</script>

<style scoped>
.ael-shell { animation: ex-deal 0.5s var(--ex-spring) backwards; animation-delay: calc(var(--i) * 0.045s); }
.ael { position: relative; overflow: hidden; border-radius: 15px; margin-bottom: 9px;
  background: var(--ex-surface); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow);
  transition: border-color 0.25s, box-shadow 0.3s, transform 0.3s var(--ex-spring); }
.ael:hover { border-color: color-mix(in srgb, var(--c) 38%, var(--ex-border)); box-shadow: var(--ex-shadow); transform: translateY(-1px); }
.ael-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--c);
  box-shadow: 0 0 14px -2px var(--c); }
.ael-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.35s; z-index: 1;
  background: radial-gradient(360px 160px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--c) 14%, transparent), transparent 60%); }

.ael-main { position: relative; z-index: 2; display: flex; align-items: flex-start; gap: 13px; width: 100%; text-align: left;
  padding: 13px 15px 13px 17px; background: none; border: none; cursor: pointer; color: inherit; font: inherit; }

.ael-glyph { position: relative; flex-shrink: 0; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px;
  color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 32%, transparent); }
.ael-seal { position: absolute; right: -4px; bottom: -4px; display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%;
  color: #0a0807; background: var(--ex-cleared); border: 2px solid var(--ex-surface); box-shadow: 0 0 8px -1px var(--ex-cleared); }

.ael-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.ael-top { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.ael-action { font-size: 13.5px; font-weight: 820; color: var(--ex-text); }
.ael-entity { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;
  color: var(--e); background: color-mix(in srgb, var(--e) 13%, transparent); border: 1px solid color-mix(in srgb, var(--e) 30%, transparent); padding: 2px 7px; border-radius: 999px; }
.ael-hash { display: inline-flex; align-items: center; gap: 2px; font-size: 9.5px; font-weight: 700; color: var(--ex-text-dim); }
.ael-time { margin-left: auto; font-size: 11px; font-weight: 600; color: var(--ex-text-muted); white-space: nowrap; }

.ael-meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 11.5px; color: var(--ex-text-secondary); }
.ael-flow { display: inline-flex; align-items: center; gap: 7px; }
.fl { font-family: var(--ex-mono); font-size: 10.5px; font-style: normal; font-weight: 700; padding: 1.5px 8px; border-radius: 999px;
  color: var(--ex-text-secondary); background: var(--ex-steel-soft); border: 1px solid var(--ex-border); }
.fl.to { color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent); border-color: color-mix(in srgb, var(--c) 30%, transparent); }
.fl-arrow { position: relative; width: 22px; height: 2px; border-radius: 2px; overflow: hidden; background: var(--ex-border-strong); }
.fl-run { position: absolute; inset: 0; width: 50%; border-radius: 2px; background: linear-gradient(90deg, transparent, var(--c)); animation: ael-flow 1.8s linear infinite; }
.ael-actor { display: inline-flex; align-items: center; gap: 4px; color: var(--ex-text-muted); }
.ael-actor.sys { color: var(--ex-text-dim); }
.ael-note { color: var(--ex-text-muted); font-style: italic; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 360px; }

.ael-aside { display: flex; align-items: center; gap: 4px; flex-shrink: 0; align-self: center; }
.ael-link-btn { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: var(--ex-text-muted);
  background: transparent; border: 1px solid transparent; transition: background 0.2s, color 0.2s, border-color 0.2s; }
.ael-link-btn:hover { color: var(--ex-violet); background: var(--ex-violet-soft); border-color: var(--ex-violet-border); }
.ael-chev { color: var(--ex-text-dim); transition: transform 0.3s var(--ex-spring), color 0.2s; }
.ael-chev.up { transform: rotate(180deg); color: var(--ex-violet); }

/* expand — pure-CSS grid-rows trick, no JS measurement */
.ael-exp { position: relative; z-index: 2; display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.42s var(--ex-spring); }
.ael.open .ael-exp { grid-template-rows: 1fr; }
.ael-exp-inner { min-height: 0; overflow: hidden; opacity: 0; transition: opacity 0.3s 0.05s; }
.ael.open .ael-exp-inner { opacity: 1; }
.ael-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 11px 18px; padding: 4px 17px 13px 70px; border-top: 1px dashed var(--ex-border); margin-top: 2px; padding-top: 13px; }
.eg { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.eg i { font-size: 9px; font-style: normal; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ex-text-dim); }
.eg b { font-size: 12px; font-weight: 700; color: var(--ex-text); word-break: break-word; }
.ael-payload { margin: 0 17px 12px 70px; padding: 11px 13px; border-radius: 10px; font-size: 11px; line-height: 1.5; color: var(--ex-text-secondary);
  background: var(--ex-panel); border: 1px solid var(--ex-border); white-space: pre-wrap; word-break: break-word; max-height: 220px; overflow: auto; }
.ael-cta-row { padding: 0 17px 14px 70px; }
.ael-cta { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 10px; cursor: pointer;
  font-size: 12px; font-weight: 750; color: #1a1206; background: var(--ex-grad-hero); border: none; box-shadow: var(--ex-violet-glow);
  transition: transform 0.2s var(--ex-spring), filter 0.2s; }
.ael-cta:hover { transform: translateY(-1px); filter: brightness(1.05); }

@keyframes ael-flow { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
@media (max-width: 640px) {
  .ael-time { margin-left: 0; }
  .ael-grid, .ael-payload, .ael-cta-row { padding-left: 17px; margin-left: 17px; }
  .ael-grid { padding-left: 0; } .ael-payload { margin-left: 17px; } .ael-cta-row { padding-left: 17px; }
}
@media (prefers-reduced-motion: reduce) {
  .ael-shell { animation: none; }
  .fl-run { animation: none; }
  .ael, .ael-chev, .ael-exp, .ael-exp-inner { transition: none; }
}
</style>
