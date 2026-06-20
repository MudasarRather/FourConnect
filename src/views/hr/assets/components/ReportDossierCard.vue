<template>
  <!-- Outer shell runs the deal-in entrance; inner .rdx owns the pointer tilt so
       the two transforms never fight. -->
  <div class="rdx-shell" :style="{ '--i': index, '--a': report.accent, '--ad': report.accent_deep || report.accent }">
    <article ref="cardEl" class="rdx" :class="{ live: !!live }">
      <span class="rdx-glare" aria-hidden="true" />
      <span class="rdx-scan" aria-hidden="true" />

      <!-- accent header strip -->
      <header class="rdx-strip">
        <span class="rdx-crest">{{ report.icon }}</span>
        <div class="rdx-id">
          <span class="rdx-eyebrow">{{ report.eyebrow }}</span>
          <h3 class="rdx-name">{{ report.name }}</h3>
        </div>
        <button class="rdx-go" type="button" :title="`Open in ${linkLabel}`" @click="$emit('go')">
          <ArrowUpRight :size="14" />
        </button>
      </header>

      <p class="rdx-tag">{{ report.tagline }}</p>

      <!-- live telemetry -->
      <div class="rdx-tele">
        <div class="rdx-count">
          <span class="rdx-dot" :class="{ on: !!live }" />
          <template v-if="live">
            <AssetCountUp :value="count" class="rdx-count-v" />
            <span class="rdx-count-l">{{ countLabel }}</span>
          </template>
          <template v-else>
            <span class="rdx-count-v dim">—</span>
            <span class="rdx-count-l">records</span>
          </template>
        </div>
        <div class="rdx-spark" aria-hidden="true">
          <span v-for="(h, bi) in report.wave" :key="bi" class="rdx-bar"
            :style="{ height: (20 + h * 80) + '%', animationDelay: (bi * 0.04) + 's' }" />
        </div>
      </div>

      <!-- headline metric chip (from live summary) -->
      <div v-if="headline" class="rdx-headline">
        <component :is="headline.icon" :size="13" />
        <b>{{ headline.value }}</b>
        <span>{{ headline.label }}</span>
      </div>

      <!-- actions -->
      <footer class="rdx-actions">
        <Motion as="button" type="button" class="rdx-compose"
          :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="$emit('compose')">
          <Sparkles :size="13" /> Compose
        </Motion>
        <div class="rdx-fmts">
          <Motion v-for="f in FORMATS" :key="f.v" as="button" type="button" class="rdx-fmt"
            :class="{ busy: busy === f.v }" :disabled="!!busy"
            :whileHover="busy ? {} : { y: -2 }" :whileTap="{ scale: 0.94 }"
            :title="`Download ${f.l}`" @click="$emit('download', f.v)">
            <Loader v-if="busy === f.v" :size="13" class="spin" />
            <component v-else :is="f.icon" :size="13" />
          </Motion>
        </div>
      </footer>
    </article>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import {
  ArrowUpRight, Sparkles, Loader, FileType, Sheet, FileText,
  Banknote, AlertTriangle, Clock, TrendingDown, Boxes, Layers,
} from 'lucide-vue-next'
import AssetCountUp from './AssetCountUp.vue'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  report: { type: Object, required: true },     // {key,name,eyebrow,tagline,icon,accent,accent_deep,wave,group}
  index: { type: Number, default: 0 },
  live: { type: Object, default: null },          // {count, summary} | null
  busy: { type: String, default: '' },            // current downloading format for THIS card
  linkLabel: { type: String, default: 'module' },
})
defineEmits(['download', 'compose', 'go'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)

const FORMATS = [
  { v: 'pdf', l: 'PDF', icon: FileType },
  { v: 'excel', l: 'Excel', icon: Sheet },
  { v: 'csv', l: 'CSV', icon: FileText },
]

const count = computed(() => Number(props.live?.count || 0))
const countLabel = computed(() => (props.report.group === 'overview' ? 'segments' : 'records'))

// Pull a meaningful headline metric out of the live summary, per report family.
const HEADLINE = {
  inventory_register: { keys: ['total_value'], label: 'est. value', icon: Banknote, money: true },
  estate_overview: { keys: ['value'], label: 'est. value', icon: Banknote, money: true },
  financial_valuation: { keys: ['total_book'], label: 'book value', icon: Banknote, money: true },
  vendor_spend: { keys: ['total_spend'], label: 'procurement', icon: Banknote, money: true },
  category_distribution: { keys: ['total_value'], label: 'classified value', icon: Layers, money: true },
  allocation_register: { keys: ['overdue'], label: 'overdue', icon: AlertTriangle },
  allocation_by_department: { keys: ['departments'], label: 'departments', icon: Boxes },
  unacknowledged: { keys: ['over_7d'], label: '> 7 days', icon: Clock },
  maintenance_log: { keys: ['total_cost'], label: 'service cost', icon: Banknote, money: true },
  damage_log: { keys: ['recovery'], label: 'recovered', icon: Banknote, money: true },
  warranty_expiry: { keys: ['lapsed'], label: 'lapsed', icon: AlertTriangle },
  asset_aging: { keys: ['refresh_candidates'], label: 'refresh due', icon: TrendingDown },
  audit_reconciliation: { keys: ['missing'], label: 'missing', icon: AlertTriangle },
  disposal_register: { keys: ['total_sale'], label: 'recovered', icon: Banknote, money: true },
  compliance: { keys: ['total'], label: 'flagged', icon: AlertTriangle },
}
const headline = computed(() => {
  const s = props.live?.summary
  const def = HEADLINE[props.report.key]
  if (!s || !def) return null
  const k = def.keys.find(k => s[k] != null)
  if (k == null) return null
  const raw = Number(s[k]) || 0
  return { icon: def.icon, label: def.label, value: def.money ? money(raw) : compact(raw) }
})

function compact(n) {
  const v = Number(n) || 0
  if (v >= 1e7) return (v / 1e7).toFixed(1) + 'Cr'
  if (v >= 1e5) return (v / 1e5).toFixed(1) + 'L'
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'k'
  return String(v)
}
const money = (n) => '₹' + compact(n)
</script>

<style scoped>
.rdx-shell { animation: as-deal 0.6s var(--as-spring) both; animation-delay: calc(var(--i) * 0.05s); will-change: transform, opacity; }
.rdx {
  position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 11px; height: 100%;
  padding: 0 16px 15px; border-radius: 18px; background: var(--as-surf-card);
  border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow);
  transition: transform 0.4s var(--as-spring), box-shadow 0.4s var(--as-spring), border-color 0.3s;
}
.rdx:hover {
  border-color: color-mix(in srgb, var(--a) 38%, transparent);
  box-shadow: var(--as-card-shadow-hover);
  transform: perspective(1100px)
    rotateX(calc((var(--my, 0.5) - 0.5) * -5deg))
    rotateY(calc((var(--mx, 0.5) - 0.5) * 7deg)) translateY(-3px);
}
.rdx-glare { position: absolute; inset: 0; pointer-events: none; z-index: 3; opacity: var(--spot, 0); transition: opacity 0.4s ease;
  background: radial-gradient(360px 280px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--a) 20%, transparent), transparent 60%); }
.rdx-scan { position: absolute; left: 0; right: 0; top: 0; height: 2px; z-index: 2; opacity: 0;
  background: linear-gradient(90deg, transparent, var(--a), transparent); }
.rdx:hover .rdx-scan { animation: as-scanline 1.1s var(--as-ease) 1; }

/* accent strip */
.rdx-strip { position: relative; display: flex; align-items: center; gap: 11px; margin: 0 -16px; padding: 14px 16px;
  background: linear-gradient(120deg, color-mix(in srgb, var(--a) 22%, transparent), color-mix(in srgb, var(--ad) 8%, transparent));
  border-bottom: 1px solid color-mix(in srgb, var(--a) 20%, transparent); }
.rdx-crest { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
  font-size: 18px; font-weight: 900; color: #fff; background: linear-gradient(135deg, var(--a), var(--ad));
  box-shadow: 0 8px 20px -9px var(--a); }
.rdx-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.rdx-eyebrow { font-size: 8.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ad); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
[data-theme="dark"] .rdx-eyebrow { color: color-mix(in srgb, var(--a) 78%, #fff); }
.rdx-name { margin: 0; font-size: 15.5px; font-weight: 850; letter-spacing: -0.01em; color: var(--as-text); }
.rdx-go { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; cursor: pointer;
  color: var(--as-text-muted); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: all 0.2s; }
.rdx-go:hover { color: var(--a); border-color: color-mix(in srgb, var(--a) 45%, transparent); transform: translate(1px, -1px); }

.rdx-tag { position: relative; margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--as-text-muted); }

/* telemetry */
.rdx-tele { position: relative; display: flex; align-items: flex-end; justify-content: space-between; gap: 14px; margin-top: auto; }
.rdx-count { display: flex; align-items: baseline; gap: 7px; }
.rdx-dot { width: 7px; height: 7px; border-radius: 50%; align-self: center; background: var(--as-text-dim); }
.rdx-dot.on { background: var(--a); box-shadow: 0 0 0 0 color-mix(in srgb, var(--a) 60%, transparent); animation: rdx-pulse 2.4s ease-out infinite; }
.rdx-count-v { font-family: var(--as-mono); font-size: 24px; font-weight: 800; letter-spacing: -0.02em; color: var(--as-text); line-height: 1; }
.rdx-count-v.dim { color: var(--as-text-dim); }
.rdx-count-l { font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-text-dim); }
.rdx-spark { display: flex; align-items: flex-end; gap: 2.5px; height: 30px; width: 96px; }
.rdx-bar { flex: 1; border-radius: 2px 2px 0 0; transform-origin: bottom;
  background: linear-gradient(180deg, var(--a), color-mix(in srgb, var(--a) 24%, transparent));
  animation: rdx-grow 0.7s var(--as-spring) both; }

.rdx-headline { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; padding: 5px 10px; border-radius: 8px;
  font-size: 11.5px; color: var(--as-text-secondary); background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.rdx-headline :deep(svg) { color: var(--a); }
.rdx-headline b { font-family: var(--as-mono); font-weight: 800; color: var(--as-text); }
.rdx-headline span { font-size: 9.5px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--as-text-dim); }

/* actions */
.rdx-actions { display: flex; align-items: center; gap: 8px; padding-top: 12px; border-top: 1px solid var(--as-border-soft); }
.rdx-compose { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 12px; border-radius: 10px;
  cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 700; color: #1a1206; border: none;
  background: linear-gradient(135deg, var(--a), var(--ad)); box-shadow: 0 8px 20px -11px var(--a); }
[data-theme="light"] .rdx-compose { color: #fff; }
.rdx-fmts { display: flex; gap: 5px; }
.rdx-fmt { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 10px; cursor: pointer;
  color: var(--as-text-secondary); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: color 0.2s, border-color 0.2s; }
.rdx-fmt:hover:not(:disabled) { color: var(--a); border-color: color-mix(in srgb, var(--a) 42%, transparent); }
.rdx-fmt:disabled { opacity: 0.55; cursor: wait; }
.rdx-fmt.busy { color: var(--a); border-color: color-mix(in srgb, var(--a) 42%, transparent); }
.spin { animation: as-spin 0.9s linear infinite; }

@keyframes rdx-grow { from { transform: scaleY(0.2); opacity: 0; } to { transform: scaleY(1); opacity: 1; } }
@keyframes rdx-pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--a) 55%, transparent); } 70%, 100% { box-shadow: 0 0 0 7px transparent; } }

@media (prefers-reduced-motion: reduce) {
  .rdx-shell { animation: none; }
  .rdx:hover { transform: translateY(-2px); }
  .rdx:hover .rdx-scan { animation: none; }
  .rdx-bar { animation: none; }
  .rdx-dot.on { animation: none; }
}
</style>
