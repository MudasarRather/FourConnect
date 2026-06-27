<template>
  <div class="tx-shell" :style="{ '--i': index, '--acc': accent }">
    <article ref="cardEl" class="tx">
      <span class="tx-glare" aria-hidden="true" />
      <span class="tx-spine" aria-hidden="true" />

      <header class="tx-head">
        <span class="tx-ic"><component :is="group.icon" :size="17" /></span>
        <div class="tx-headtext">
          <b>{{ group.title }}</b>
          <span class="tx-count">{{ valueCount }} values</span>
        </div>
        <span class="tx-tag" :class="{ cfg: group.configurable }">
          <component :is="group.configurable ? Settings2 : Lock" :size="11" />
          {{ group.configurable ? 'Configurable' : 'System' }}
        </span>
      </header>

      <p class="tx-blurb">{{ group.blurb }}</p>

      <!-- flat list -->
      <div v-if="group.items" class="tx-chips">
        <span v-for="it in group.items" :key="it.value" class="tx-chip" :style="{ '--c': toneColor(it.tone) }">
          <component v-if="it.icon" :is="it.icon" :size="12" class="tx-chip-ic" />
          <i v-else class="tx-chip-dot" />
          {{ it.label }}
        </span>
      </div>

      <!-- sub-grouped -->
      <div v-else-if="group.sub" class="tx-subs">
        <div v-for="sub in group.sub" :key="sub.label" class="tx-sub">
          <span class="tx-sub-lab">{{ sub.label }}</span>
          <div class="tx-chips">
            <span v-for="it in sub.items" :key="it.value" class="tx-chip" :style="{ '--c': toneColor(it.tone) }">
              <component v-if="it.icon" :is="it.icon" :size="12" class="tx-chip-ic" />
              <i v-else class="tx-chip-dot" />
              {{ it.label }}
            </span>
          </div>
        </div>
      </div>
    </article>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Lock, Settings2 } from 'lucide-vue-next'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import { toneColor, TONES } from '../composables/recruitmentVocab'

const props = defineProps({
  group: { type: Object, required: true },
  index: { type: Number, default: 0 },
})
const cardEl = ref(null)
usePointerSpotlight(cardEl)

const accent = computed(() => TONES[props.group.accent] || TONES.gold)
const valueCount = computed(() => {
  if (props.group.items) return props.group.items.length
  if (props.group.sub) return props.group.sub.reduce((n, s) => n + s.items.length, 0)
  return 0
})
</script>

<style scoped>
.tx-shell { animation: set-deal 0.55s var(--set-spring) both; animation-delay: calc(var(--i) * 0.06s); }
.tx { position: relative; overflow: hidden; height: 100%;
  padding: 16px 17px 17px; border-radius: 17px;
  background: var(--set-surface); border: 1px solid var(--set-border);
  box-shadow: var(--set-card-shadow);
  transition: transform 0.3s var(--set-spring), border-color 0.3s, box-shadow 0.3s;
  --mx: 0.5; --my: 0.5; --spot: 0; }
.tx:hover { transform: perspective(1100px)
  rotateX(calc((var(--my) - 0.5) * -5deg)) rotateY(calc((var(--mx) - 0.5) * 7deg)) translateY(-3px);
  border-color: color-mix(in srgb, var(--acc) 40%, transparent); box-shadow: var(--set-card-shadow-hover); }
.tx-glare { position: absolute; inset: 0; z-index: 3; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(420px circle at calc(var(--mx) * 100%) calc(var(--my) * 100%),
    color-mix(in srgb, var(--acc) 16%, transparent), transparent 45%); }
.tx-spine { position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--acc), color-mix(in srgb, var(--acc) 20%, transparent)); box-shadow: 0 0 14px color-mix(in srgb, var(--acc) 50%, transparent); }

.tx-head { position: relative; z-index: 1; display: flex; align-items: center; gap: 11px; }
.tx-ic { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; flex-shrink: 0;
  color: var(--acc); background: color-mix(in srgb, var(--acc) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--acc) 28%, transparent); }
.tx-headtext { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.tx-headtext b { font-size: 14px; font-weight: 800; color: var(--set-text); }
.tx-count { font-size: 10.5px; font-weight: 600; color: var(--set-text-dim); }
.tx-tag { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0;
  padding: 4px 9px; border-radius: 999px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--set-text-muted); background: var(--set-unset-soft); border: 1px solid var(--set-border); }
.tx-tag.cfg { color: var(--set-ok); background: var(--set-ok-soft); border-color: color-mix(in srgb, var(--set-ok) 30%, transparent); }

.tx-blurb { position: relative; z-index: 1; margin: 11px 0 13px; font-size: 11.5px; line-height: 1.5; color: var(--set-text-muted); }

.tx-chips { display: flex; flex-wrap: wrap; gap: 6px; position: relative; z-index: 1; }
.tx-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 8px;
  font-size: 11px; font-weight: 650; color: var(--set-text-secondary);
  background: color-mix(in srgb, var(--c) 9%, var(--set-surface-elevated));
  border: 1px solid color-mix(in srgb, var(--c) 24%, transparent); transition: all 0.2s var(--set-spring); }
.tx-chip:hover { color: var(--set-text); border-color: color-mix(in srgb, var(--c) 50%, transparent);
  background: color-mix(in srgb, var(--c) 15%, var(--set-surface-elevated)); transform: translateY(-1px); }
.tx-chip-ic { color: var(--c); flex-shrink: 0; }
.tx-chip-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--c); box-shadow: 0 0 7px color-mix(in srgb, var(--c) 70%, transparent); flex-shrink: 0; }

.tx-subs { display: flex; flex-direction: column; gap: 12px; position: relative; z-index: 1; }
.tx-sub-lab { display: block; margin-bottom: 7px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.1em;
  text-transform: uppercase; color: color-mix(in srgb, var(--acc) 60%, var(--set-text-muted)); }

@media (prefers-reduced-motion: reduce) {
  .tx-shell { animation: none; }
  .tx:hover { transform: translateY(-2px); }
}
</style>
