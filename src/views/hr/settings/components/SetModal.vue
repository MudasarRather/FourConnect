<template>
  <teleport to="body">
    <Presence>
      <Motion v-if="open" key="ov" as="div" class="set-ov"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.22 }" @click.self="$emit('close')">
        <Motion as="div" class="set-modal" :class="{ split: isSide, stacked: isStacked }"
          :style="{ '--acc': accentColor, maxWidth: width + 'px' }"
          :initial="{ opacity: 0, y: 22, scale: 0.965 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 14, scale: 0.98 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
          <span class="set-modal-edge" aria-hidden="true" />
          <header class="set-modal-head">
            <span class="set-modal-head-aura" aria-hidden="true" />
            <span v-if="icon" class="set-modal-ic">
              <span class="set-modal-ic-ring" aria-hidden="true" />
              <component :is="icon" :size="18" />
            </span>
            <div class="set-modal-titles">
              <b>{{ title }}</b>
              <span v-if="subtitle">{{ subtitle }}</span>
            </div>
            <span v-if="mode" class="set-modal-mode" :data-mode="mode">{{ modeLabel }}</span>
            <button class="set-modal-x" type="button" aria-label="Close" @click="$emit('close')">
              <X :size="16" />
            </button>
          </header>

          <div class="set-modal-body" :class="{ split: isSide, stacked: isStacked }">
            <div class="set-modal-main"><slot /></div>
            <aside v-if="hasAside" class="set-modal-aside" :class="{ bottom: isStacked }">
              <span class="set-modal-aside-edge" aria-hidden="true" />
              <slot name="aside" />
            </aside>
          </div>

          <footer v-if="$slots.footer" class="set-modal-foot"><slot name="footer" /></footer>
        </Motion>
      </Motion>
    </Presence>
  </teleport>
</template>

<script setup>
import { computed, useSlots } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  icon: { type: [Object, Function], default: null },
  accentColor: { type: String, default: 'var(--set-gold)' },
  width: { type: Number, default: 620 },
  mode: { type: String, default: '' },                 // create | edit | delete → header chip
  asidePlacement: { type: String, default: 'side' },   // side | bottom
})
defineEmits(['close'])

const slots = useSlots()
const hasAside = computed(() => !!slots.aside)
const isSide = computed(() => hasAside.value && props.asidePlacement === 'side')
const isStacked = computed(() => hasAside.value && props.asidePlacement === 'bottom')
const modeLabel = computed(() => ({ create: 'New', edit: 'Editing', delete: 'Delete' }[props.mode] || ''))
</script>

<style scoped>
.set-ov { position: fixed; inset: 0; z-index: 1200; display: flex; align-items: center; justify-content: center;
  padding: 24px; background: rgba(5, 5, 6, 0.64); backdrop-filter: blur(12px) saturate(140%);
  -webkit-backdrop-filter: blur(12px) saturate(140%); }
.set-modal { position: relative; width: 100%; display: flex; flex-direction: column; max-height: 90vh; overflow: hidden;
  border-radius: 22px; background: var(--set-surface-elevated); border: 1px solid var(--set-border-strong);
  box-shadow: 0 44px 100px -42px rgba(0, 0, 0, 0.88), 0 0 0 1px color-mix(in srgb, var(--acc) 8%, transparent); }
.set-modal-edge { position: absolute; left: 0; right: 0; top: 0; height: 3px; z-index: 4;
  background: linear-gradient(90deg, transparent, var(--acc), transparent); opacity: 0.9; }

.set-modal-head { position: relative; overflow: hidden; display: flex; align-items: center; gap: 12px;
  padding: 18px 18px 15px; border-bottom: 1px solid var(--set-border); flex-shrink: 0; }
.set-modal-head-aura { position: absolute; inset: -120% 40% auto -10%; height: 220%;
  background: radial-gradient(circle, color-mix(in srgb, var(--acc) 22%, transparent), transparent 70%); filter: blur(30px); pointer-events: none; }
.set-modal-ic { position: relative; display: grid; place-items: center; width: 42px; height: 42px; border-radius: 13px; flex-shrink: 0;
  color: var(--acc); background: color-mix(in srgb, var(--acc) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--acc) 30%, transparent); }
.set-modal-ic-ring { position: absolute; inset: -4px; border-radius: 16px; border: 1px solid color-mix(in srgb, var(--acc) 30%, transparent); opacity: 0.6; animation: set-ic-pulse 2.8s ease-in-out infinite; }
@keyframes set-ic-pulse { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.08); opacity: 0; } }
.set-modal-titles { position: relative; flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.set-modal-titles b { font-size: 16px; font-weight: 800; color: var(--set-text); }
.set-modal-titles span { font-size: 12px; color: var(--set-text-muted); }
.set-modal-mode { position: relative; font-size: 9px; font-weight: 850; letter-spacing: 0.12em; text-transform: uppercase;
  padding: 4px 10px; border-radius: 999px; color: var(--acc);
  background: color-mix(in srgb, var(--acc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--acc) 30%, transparent); }
.set-modal-mode[data-mode="delete"] { color: var(--set-conflict); background: var(--set-conflict-soft); border-color: color-mix(in srgb, var(--set-conflict) 32%, transparent); }
.set-modal-x { position: relative; width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; flex-shrink: 0;
  background: transparent; border: 1px solid var(--set-border); color: var(--set-text-muted); cursor: pointer; transition: all 0.2s; }
.set-modal-x:hover { color: var(--set-text); border-color: var(--set-border-strong); background: var(--set-surface); transform: rotate(90deg); }

.set-modal-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 18px; }
.set-modal-body > :deep(*) { flex-shrink: 0; }

/* ── side layout: form left, info rail right (for field-heavy modals) ── */
.set-modal-body.split { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 0; padding: 0; align-items: stretch; }
.set-modal-body.split .set-modal-main { padding: 22px; min-width: 0; }
.set-modal-body.split .set-modal-aside { border-left: 1px solid var(--set-border); }
.set-modal-body.split .set-modal-aside-edge { left: 0; top: 0; bottom: 0; width: 1px; height: auto;
  background: linear-gradient(180deg, transparent, var(--acc), transparent); }

/* ── stacked layout: form on top, info strip at the bottom (for short modals) ── */
.set-modal-body.stacked { display: flex; flex-direction: column; padding: 0; }
.set-modal-body.stacked .set-modal-main { padding: 22px 22px 18px; }
.set-modal-body.stacked .set-modal-aside.bottom { border-top: 1px solid var(--set-border); padding: 18px 22px 20px; }
.set-modal-body.stacked .set-modal-aside-edge { left: 0; right: 0; top: 0; height: 1px; width: auto; bottom: auto;
  background: linear-gradient(90deg, transparent, var(--acc), transparent); }

.set-modal-aside { position: relative; padding: 18px 16px; background: var(--set-panel); }
.set-modal-aside-edge { position: absolute; opacity: 0.4; pointer-events: none; }

.set-modal-foot { display: flex; align-items: center; justify-content: flex-end; gap: 10px;
  padding: 14px 18px; border-top: 1px solid var(--set-border); flex-shrink: 0; }

@media (max-width: 720px) {
  .set-modal-body.split { grid-template-columns: 1fr; }
  .set-modal-body.split .set-modal-aside { border-left: 0; border-top: 1px solid var(--set-border); }
  .set-modal-body.split .set-modal-aside-edge { display: none; }
}
@media (max-width: 560px) { .set-ov { padding: 12px; } }
@media (prefers-reduced-motion: reduce) { .set-modal-ic-ring { animation: none; } .set-modal-x:hover { transform: none; } }
</style>
