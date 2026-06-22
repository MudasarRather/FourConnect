<template>
  <div class="isp">
    <div v-if="!bookings.length" class="isp-empty">No bookings yet</div>
    <div v-else class="isp-rail">
      <div v-for="(b, i) in bookings" :key="b.id" class="isp-seg" :style="{ '--i': i, '--c': bookingMeta(b.booking_type).hex }">
        <span class="isp-node"><component :is="bookingMeta(b.booking_type).icon" :size="14" /></span>
        <div class="isp-card">
          <div class="isp-top">
            <span class="isp-type">{{ bookingMeta(b.booking_type).label }}</span>
            <span class="isp-cost trv-mono">{{ fmtINR(b.total_cost) }}</span>
          </div>
          <div class="isp-detail">
            <span v-if="b.vendor">{{ b.vendor }}</span>
            <span v-if="b.pnr_number" class="trv-mono">PNR {{ b.pnr_number }}</span>
            <span v-if="b.hotel_name">{{ b.hotel_name }}</span>
            <span v-if="b.travel_date" class="trv-mono">{{ fmtDate(b.travel_date) }}</span>
            <span v-if="b.check_in" class="trv-mono">{{ fmtDate(b.check_in) }} → {{ fmtDate(b.check_out) }}</span>
          </div>
        </div>
        <button v-if="editable" class="isp-edit" @click="$emit('edit', b)"><Pencil :size="12" /></button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Pencil } from 'lucide-vue-next'
import { fmtINR, fmtDate, bookingMeta } from '@/composables/useTravel'
defineProps({ bookings: { type: Array, default: () => [] }, editable: { type: Boolean, default: false } })
defineEmits(['edit'])
</script>

<style scoped>
.isp-empty { font-size: 12px; color: var(--trv-text-dim); padding: 12px 0; }
.isp-rail { position: relative; display: flex; flex-direction: column; gap: 12px; padding-left: 6px; }
.isp-rail::before { content: ""; position: absolute; left: 19px; top: 14px; bottom: 14px; width: 2px; background: repeating-linear-gradient(180deg, var(--trv-amber) 0 5px, transparent 5px 11px); opacity: 0.4; }
.isp-seg { position: relative; display: flex; align-items: flex-start; gap: 12px; animation: trv-deal 0.45s var(--trv-spring) backwards; animation-delay: calc(var(--i) * 0.06s); }
.isp-node { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0; z-index: 1; color: var(--c); background: color-mix(in srgb, var(--c) 14%, var(--trv-surface)); border: 1.5px solid var(--c); }
.isp-card { flex: 1; padding: 10px 14px; border-radius: 12px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.isp-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.isp-type { font-size: 13px; font-weight: 700; color: var(--trv-text); }
.isp-cost { font-size: 13px; font-weight: 700; color: var(--trv-amber); }
.isp-detail { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 4px; font-size: 11.5px; color: var(--trv-text-muted); }
.isp-edit { align-self: center; background: var(--trv-panel); border: 1px solid var(--trv-border); border-radius: 8px; padding: 6px; color: var(--trv-text-muted); cursor: pointer; }
.isp-edit:hover { color: var(--trv-amber); border-color: var(--trv-amber-border); }
@media (prefers-reduced-motion: reduce) { .isp-seg { animation: none; } }
</style>
