<template>
  <Teleport to="body">
    <transition name="paym-fade">
      <div v-if="open" class="paym-overlay" @mousedown.self="$emit('close')">
        <Motion class="paym-modal danger" as="div"
          :initial="{ opacity: 0, y: 28, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.5, ease: [0.16,1,0.3,1] }">
          <span class="paym-foil" />
          <button class="paym-x" @click="$emit('close')"><X :size="18" /></button>

          <header class="paym-hero center">
            <div class="paym-coin"><span class="paym-coin-ring" /><span class="paym-coin-halo" /><Trash2 :size="22" /></div>
            <div class="paym-hero-txt">
              <p class="paym-eyebrow">Salary structure · {{ structure?.code }}</p>
              <h2 class="paym-title">Delete this structure?</h2>
              <p class="paym-sub">Archiving removes it from the list and stops new assignments. This is reversible only by an admin in the database.</p>
            </div>
          </header>

          <div class="paym-body">
            <div class="paym-stats">
              <div class="paym-stat"><span>Name</span><b>{{ structure?.name }}</b></div>
              <div class="paym-stat"><span>Components</span><b>{{ structure?.component_count ?? (structure?.components?.length || 0) }}</b></div>
            </div>

            <div class="paym-note danger">
              <ShieldAlert :size="15" />
              <ul class="del-list">
                <li>The structure is <b>soft-deleted (archived)</b> and hidden from the list — employees already on it keep their current compensation snapshot and are paid normally.</li>
                <li>You <b>cannot assign</b> an archived structure to new employees.</li>
                <li>If it's currently assigned to <b>active</b> employee compensation, deletion is <b>blocked</b> until you reassign them.</li>
                <li>The action is recorded in the <b>payroll audit log</b>.</li>
              </ul>
            </div>

            <label class="paym-tg" :style="{'--i': 0}">
              <input type="checkbox" v-model="ack" />
              <span>I understand this structure will be archived and can no longer be assigned.</span>
            </label>
          </div>

          <footer class="paym-foot center">
            <button class="paym-btn ghost" @click="$emit('close')">Cancel</button>
            <button class="paym-btn danger" :disabled="!ack || deleting" @click="$emit('confirm')">
              {{ deleting ? 'Deleting…' : 'Delete structure' }}</button>
          </footer>
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Motion } from 'motion-v'
import { Trash2, X, ShieldAlert } from 'lucide-vue-next'

const props = defineProps({
  open: Boolean,
  structure: { type: Object, default: null },
  deleting: { type: Boolean, default: false },
})
defineEmits(['close', 'confirm'])

const ack = ref(false)
watch(() => props.open, (o) => { if (o) ack.value = false })
</script>

<style scoped>
/* Styling comes from global .paym-* atoms. */
.del-list { margin: 0; padding-left: 16px; display: flex; flex-direction: column; gap: 6px; }
.del-list li { line-height: 1.45; }
</style>
