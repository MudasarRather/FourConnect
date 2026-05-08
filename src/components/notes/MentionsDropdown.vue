<template>
  <Teleport to="body">
    <div 
      v-if="show"
      class="mentions-dropdown glass-panel"
      :style="position"
    >
      <div 
        v-for="(user, i) in users" 
        :key="user.id"
        class="mention-item"
        :class="{ active: i === activeIndex }"
        @click.stop="$emit('select', user)"
      >
        <div class="m-avatar" :style="{ backgroundImage: `url(${user.avatar || 'https://ui-avatars.com/api/?name='+user.name})` }">
        </div>
        <span class="m-name">{{ user.name }}</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  show: { type: Boolean, default: false },
  users: { type: Array, default: () => [] },
  activeIndex: { type: Number, default: 0 },
  position: { type: Object, default: () => ({ top: '0px', left: '0px' }) },
})

defineEmits(['select'])
</script>

<style scoped>
.mentions-dropdown {
  position: fixed;
  z-index: 9999;
  max-height: 200px; overflow-y: auto;
  width: 200px;
  background: rgba(10, 10, 10, 0.95); 
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; max-height: 160px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
  animation: scaleIn 0.15s ease-out;
  padding: 6px;
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); translate: 0 5px; }
  to { opacity: 1; transform: scale(1); translate: 0 0; }
}

.mention-item {
  display: flex; align-items: center; gap: 8px; padding: 8px 10px;
  cursor: pointer; font-size: 12px; color: #d4d4d8; border-radius: 8px;
  transition: all 0.15s; margin-bottom: 2px;
}
.mention-item:hover, .mention-item.active { 
  background: rgba(234, 179, 8, 0.15); 
  color: #eab308; 
}
.m-avatar {
  width: 20px; height: 20px; border-radius: 6px; background: rgba(255,255,255,0.1); 
  display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700;
  background-size: cover; text-transform: uppercase; color: white;
}
.mention-item:hover .m-avatar, .mention-item.active .m-avatar {
  color: #eab308;
}
.m-name { font-weight: 500; }
</style>
