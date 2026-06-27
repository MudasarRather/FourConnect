<template>
  <div class="wk-shell" :style="{ '--i': index }">
    <article ref="cardEl" class="wk">
      <span class="wk-glare" aria-hidden="true" />
      <span class="wk-spine" aria-hidden="true" />

      <header class="wk-head">
        <span class="wk-ic"><Gift :size="17" /></span>
        <div class="wk-titles">
          <b>{{ kit.name }}</b>
          <span>{{ items.length }} {{ items.length === 1 ? 'item' : 'items' }}</span>
        </div>
        <span class="wk-status" :class="kit.is_active ? 'on' : 'idle'">{{ kit.is_active ? 'Active' : 'Inactive' }}</span>
      </header>

      <p v-if="kit.description" class="wk-desc">{{ kit.description }}</p>

      <div v-if="items.length" class="wk-items">
        <span v-for="(it, i) in items.slice(0, 6)" :key="i" class="wk-item">
          <Package :size="11" />{{ itemName(it) }}<em v-if="itemQty(it) > 1">×{{ itemQty(it) }}</em>
        </span>
        <span v-if="items.length > 6" class="wk-item more">+{{ items.length - 6 }} more</span>
      </div>
      <p v-else class="wk-empty">No items yet</p>

      <footer class="wk-foot">
        <button class="wk-act" type="button" @click="$emit('edit', kit)"><Pencil :size="13" /> Edit kit</button>
      </footer>
    </article>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Gift, Package, Pencil } from 'lucide-vue-next'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  kit: { type: Object, required: true },
  index: { type: Number, default: 0 },
})
defineEmits(['edit'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)

const items = computed(() => Array.isArray(props.kit.default_items) ? props.kit.default_items : [])
const itemName = (it) => typeof it === 'string' ? it : (it?.item_name || it?.name || 'Item')
const itemQty = (it) => typeof it === 'object' ? (Number(it?.qty) || 1) : 1
</script>

<style scoped>
.wk-shell { animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.06s); height: 100%; }
.wk { position: relative; overflow: hidden; height: 100%; display: flex; flex-direction: column; gap: 11px;
  padding: 16px 17px; border-radius: 16px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow);
  transition: transform 0.3s var(--set-spring), border-color 0.3s, box-shadow 0.3s; --c: var(--set-ok); --mx: 0.5; --my: 0.5; --spot: 0; }
.wk:hover { transform: perspective(1000px) rotateX(calc((var(--my) - 0.5) * -5deg)) rotateY(calc((var(--mx) - 0.5) * 7deg)) translateY(-3px);
  border-color: color-mix(in srgb, var(--c) 38%, transparent); box-shadow: var(--set-card-shadow-hover); }
.wk-glare { position: absolute; inset: 0; z-index: 3; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(360px circle at calc(var(--mx) * 100%) calc(var(--my) * 100%), color-mix(in srgb, var(--c) 14%, transparent), transparent 45%); }
.wk-spine { position: absolute; left: 0; top: 13px; bottom: 13px; width: 3px; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--c), color-mix(in srgb, var(--c) 18%, transparent)); box-shadow: 0 0 12px color-mix(in srgb, var(--c) 45%, transparent); }

.wk-head { position: relative; z-index: 1; display: flex; align-items: center; gap: 11px; }
.wk-ic { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; flex-shrink: 0; color: var(--c);
  background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 26%, transparent); }
.wk-titles { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.wk-titles b { font-size: 14px; font-weight: 800; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wk-titles span { font-size: 11px; color: var(--set-text-muted); }
.wk-status { flex-shrink: 0; padding: 3px 9px; border-radius: 999px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
.wk-status.on { color: var(--set-ok); background: var(--set-ok-soft); }
.wk-status.idle { color: var(--set-text-muted); background: var(--set-unset-soft); }

.wk-desc { position: relative; z-index: 1; margin: 0; font-size: 11.5px; line-height: 1.5; color: var(--set-text-muted);
  display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.wk-items { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 5px; margin-top: auto; }
.wk-item { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 7px; font-size: 10.5px; font-weight: 650;
  color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.wk-item :deep(svg) { color: var(--c); flex-shrink: 0; }
.wk-item em { font-style: normal; font-weight: 800; color: var(--set-text); }
.wk-item.more { color: var(--set-text-muted); }
.wk-empty { position: relative; z-index: 1; margin: 0; margin-top: auto; font-size: 11px; font-style: italic; color: var(--set-text-dim); }

.wk-foot { position: relative; z-index: 1; padding-top: 11px; border-top: 1px solid var(--set-border); }
.wk-act { display: inline-flex; align-items: center; justify-content: center; gap: 6px; width: 100%; padding: 8px 12px; border-radius: 9px; cursor: pointer; font: inherit;
  font-size: 12px; font-weight: 700; color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.wk-act:hover { color: var(--set-ok); border-color: color-mix(in srgb, var(--set-ok) 36%, transparent); }

@media (prefers-reduced-motion: reduce) {
  .wk-shell { animation: none; }
  .wk:hover { transform: translateY(-2px); }
}
</style>
