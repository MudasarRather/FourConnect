<template>
  <div class="editor-toolbar" @click.stop>
    <!-- Text Formatting -->
    <div class="toolbar-group">
      <button type="button" @click="$emit('cmd', 'bold')" title="Bold" class="fmt-btn"><strong>B</strong></button>
      <button type="button" @click="$emit('cmd', 'italic')" title="Italic" class="fmt-btn"><em>I</em></button>
      <button type="button" @click="$emit('cmd', 'underline')" title="Underline" class="fmt-btn"><u>U</u></button>
    </div>

    <!-- Block Formatting -->
    <div class="toolbar-group">
      <button type="button" @click="$emit('cmd', 'formatBlock', 'P')" title="Normal Text" class="fmt-btn">P</button>
      <button type="button" @click="$emit('cmd', 'formatBlock', 'H1')" title="Heading 1" class="fmt-btn">H1</button>
      <button type="button" @click="$emit('cmd', 'formatBlock', 'H2')" title="Heading 2" class="fmt-btn">H2</button>
    </div>

    <!-- Lists & Table -->
    <div class="toolbar-group">
      <button type="button" @click="$emit('cmd', 'insertUnorderedList')" title="Bullet List" class="fmt-btn"><List :size="12" /></button>
      <button type="button" @click="$emit('cmd', 'insertOrderedList')" title="Numbered List" class="fmt-btn"><ListOrdered :size="12" /></button>
      <button type="button" @click="$emit('insertTable')" title="Insert Table" class="fmt-btn"><Table :size="12" /></button>
    </div>

    <!-- Color Picker -->
    <div class="color-picker-wrapper">
      <button type="button" class="fmt-btn" title="Text Color" @click.stop="showPicker = !showPicker">
        <span class="color-swatch" :style="{ background: currentColor }"></span>
      </button>
      <div class="color-palette" v-if="showPicker">
        <div 
          v-for="c in textColors" :key="c" 
          :style="{ background: c }" 
          @mousedown.prevent="$emit('setColor', c); showPicker = false"
        ></div>
      </div>
    </div>

    <!-- Attach & Auto-Correct -->
    <div class="toolbar-group">
      <button type="button" @click="$emit('attach')" title="Attach (PDF/Image)" class="fmt-btn"><Paperclip :size="12" /></button>
      <button 
        type="button" 
        @click="$emit('toggleAutoCorrect')" 
        class="fmt-btn" 
        :class="{ active: autoCorrectEnabled, 'ai-suggest': suggestionActive }" 
        :title="suggestionActive ? 'AI Rewrite: Polish your text' : 'AI Rewrite (Grammar Fix)'"
      >
        <div class="wand-wrapper">
          <Wand2 :size="12" />
        </div>
        <span v-if="suggestionActive" class="polish-text">Polish ✨</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { List, ListOrdered, Table, Paperclip, Wand2 } from 'lucide-vue-next'

const props = defineProps({
  autoCorrectEnabled: { type: Boolean, default: false },
  suggestionActive: { type: Boolean, default: false },
  currentColor: { type: String, default: '#ffffff' },
})

defineEmits(['cmd', 'insertTable', 'attach', 'toggleAutoCorrect', 'setColor'])

const showPicker = ref(false)
const textColors = ['#ffffff', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#a1a1aa']
</script>

<style scoped>
.editor-toolbar { 
  display: flex; gap: 4px; flex-wrap: wrap; 
  /* Background/Border handled by parent wrapper */
  padding: 4px;
}
.toolbar-group { display: flex; gap: 2px; align-items: center; padding-right: 6px; border-right: 1px solid rgba(255,255,255,0.1); margin-right: 2px; }
.toolbar-group:last-child { border-right: none; }

.fmt-btn {
  width: 24px; height: 24px; border-radius: 4px; background: transparent; border: none;
  color: rgba(255,255,255,0.6); cursor: pointer; display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-family: 'Inter', sans-serif; font-weight: 600;
  transition: all 0.2s;
}
.fmt-btn:hover, .fmt-btn.active { background: rgba(255,255,255,0.1); color: white; }
.fmt-btn.active { color: #f59e0b; }

.fmt-btn.ai-suggest {
  width: auto;
  padding: 0 10px;
  gap: 6px;
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
  animation: pulse-glow 2s infinite ease-in-out;
  overflow: hidden;
}

.wand-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.ai-suggest .wand-wrapper {
  transform: rotate(15deg) scale(1.1);
}

.polish-text {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  animation: slide-in 0.3s ease-out;
}

@keyframes slide-in {
  from { opacity: 0; transform: translateX(-5px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes pulse-glow {
  0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.1); }
  50% { box-shadow: 0 0 15px 2px rgba(245, 158, 11, 0.25); background: rgba(245, 158, 11, 0.2); }
  100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.1); }
}

.color-picker-wrapper { position: relative; }
.color-swatch { width: 12px; height: 12px; border-radius: 2px; border: 1px solid rgba(255,255,255,0.2); }
.color-palette {
  position: absolute; top: 100%; left: 0; margin-top: 4px; background: #18181b;
  border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px;
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; z-index: 100;
  width: 80px; box-shadow: 0 10px 20px rgba(0,0,0,0.5);
}
.color-palette div {
  width: 14px; height: 14px; border-radius: 3px; cursor: pointer; border: 1px solid rgba(255,255,255,0.1);
}
.color-palette div:hover { transform: scale(1.1); }

/* ═════════ LIGHT THEME OVERRIDES ═════════════════════════════════════════ */
[data-theme="light"] .toolbar-group {
  border-right-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .fmt-btn {
  color: #6b5840;
  background: rgba(255, 250, 240, 0.55);
  border: 1px solid rgba(217, 119, 6, 0.18);
}
[data-theme="light"] .fmt-btn:hover {
  background: rgba(217, 119, 6, 0.14);
  color: #92400e;
  border-color: rgba(217, 119, 6, 0.40);
}
[data-theme="light"] .fmt-btn.active {
  background: rgba(217, 119, 6, 0.18);
  color: #b45309;
  border-color: rgba(217, 119, 6, 0.45);
}
[data-theme="light"] .fmt-btn.ai-suggest {
  background: rgba(217, 119, 6, 0.16);
  color: #b45309;
  border-color: rgba(217, 119, 6, 0.40);
}
[data-theme="light"] .color-swatch {
  border-color: rgba(40, 25, 10, 0.20);
}
[data-theme="light"] .color-palette {
  background: #faf7f0;
  border-color: rgba(217, 119, 6, 0.22);
  box-shadow: 0 10px 20px rgba(40, 25, 10, 0.22);
}
[data-theme="light"] .color-palette div {
  border-color: rgba(40, 25, 10, 0.18);
}
</style>
