<template>
  <div class="fixed-actions-widget" :class="{ open: isOpen }" v-click-outside="close">
     <!-- Expanded Menu -->
     <transition name="scale-fade">
        <div v-if="isOpen" class="actions-menu glass-panel">
            <div class="menu-header">
               <span class="bot-name">Assistant</span>
            </div>
            <div class="menu-items">
               <button class="menu-action" @click="trigger('request_budget')">
                  <div class="icon-box"><FilePlus :size="16" /></div>
                  <span class="action-label">Request Budget</span>
               </button>
               <button class="menu-action" @click="trigger('record_payment')">
                  <div class="icon-box"><CreditCard :size="16" /></div>
                  <span class="action-label">Record Payment</span>
               </button>
               <button class="menu-action" @click="trigger('export_report')">
                  <div class="icon-box"><Download :size="16" /></div>
                  <span class="action-label">Export Report</span>
               </button>
            </div>
        </div>
     </transition>

     <!-- Floating Button -->
     <button class="fab-trigger" @click.stop="isOpen = !isOpen">
        <transition name="rotate-fade" mode="out-in">
           <Zap v-if="!isOpen" :size="20" fill="currentColor" />
           <X v-else :size="20" />
        </transition>
     </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Zap, X, FilePlus, CreditCard, Download } from 'lucide-vue-next'

const isOpen = ref(false)
const emit = defineEmits(['action'])

const trigger = (action) => {
   emit('action', action)
   isOpen.value = false
}

const close = () => {
   isOpen.value = false
}

// Simple directive for click outside
const vClickOutside = {
  mounted(el, binding) {
    el.clickOutsideEvent = function(event) {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value(event, el);
      }
    };
    document.body.addEventListener('click', el.clickOutsideEvent);
  },
  unmounted(el) {
    document.body.removeEventListener('click', el.clickOutsideEvent);
  },
};
</script>

<style scoped>
.fixed-actions-widget {
  position: fixed; bottom: 32px; right: 32px; z-index: 100;
  display: flex; flex-direction: column; align-items: flex-end; gap: 12px;
}

/* FAB Trigger */
.fab-trigger {
  width: 48px; height: 48px; border-radius: 50%;
  /* Solid Yellow - No Shadow/Glow */
  background: #fbbf24;
  color: #1c1917;
  border: 1px solid rgba(255,255,255,0.2);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; 
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s;
  
  /* Unique Animation: Levitation */
  animation: levitate 4s ease-in-out infinite;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1); /* Very subtle dark shadow for depth only, no colored glow */
}

.fab-trigger:hover { 
   transform: scale(1.1) rotate(5deg); 
   background: #f59e0b;
   /* No colored shadow on hover */
   animation-play-state: paused; /* Pause float on interaction */
}

.fixed-actions-widget.open .fab-trigger {
   background: #27272a; color: white; border-color: rgba(255,255,255,0.1);
   transform: rotate(90deg);
   animation: none;
}

@keyframes levitate {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

/* Menu Panel */
.actions-menu {
  width: 200px; /* Smaller width */
  background: rgba(20, 20, 23, 0.8);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0,0,0,0.4);
  transform-origin: bottom right;
  margin-bottom: 8px;
}

.menu-header {
  padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.05);
  background: rgba(251, 191, 36, 0.05); /* Subtle yellow tint */
}
.bot-name { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #fbbf24; letter-spacing: 0.05em; }

.menu-items { padding: 6px; display: flex; flex-direction: column; gap: 2px; }

.menu-action {
  display: flex; align-items: center; gap: 10px; padding: 8px 10px;
  background: transparent; border: none; border-radius: 8px;
  cursor: pointer; text-align: left; transition: all 0.2s;
  width: 100%; color: rgba(255,255,255,0.8);
}

.menu-action:hover { 
   background: rgba(255,255,255,0.08); 
   color: white; translate: 2px 0;
}

.icon-box {
  display: flex; align-items: center; justify-content: center;
  color: #fbbf24; /* Yellow Icon */
}

.action-label { font-size: 13px; font-weight: 500; }

/* Transitions */
.scale-fade-enter-active, .scale-fade-leave-active { transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
.scale-fade-enter-from, .scale-fade-leave-to { opacity: 0; transform: translateY(10px) scale(0.9); }

.rotate-fade-enter-active, .rotate-fade-leave-active { transition: all 0.2s; }
.rotate-fade-enter-from, .rotate-fade-leave-to { opacity: 0; transform: rotate(90deg); }
</style>
