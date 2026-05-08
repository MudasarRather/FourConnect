<template>
  <div class="geo-table">
    <!-- Table Header -->
    <div class="table-chrome">
      <div class="chrome-left">
        <div class="chrome-indicator"></div>
        <span class="chrome-title">{{ title }}</span>
        <span class="chrome-count">{{ items.length }}</span>
      </div>
      <div class="chrome-right">
        <slot name="actions"></slot>
      </div>
    </div>

    <!-- Table Body -->
    <div class="table-viewport">
      <div class="table-scroll">
        <!-- Header Row -->
        <div class="table-header-row">
          <div 
            v-for="(col, idx) in columns" 
            :key="idx"
            class="header-cell"
            :style="{ width: col.width || 'auto', flex: col.flex || 'none' }"
          >
            <span class="header-label">{{ col.label }}</span>
          </div>
        </div>

        <!-- Data Rows -->
        <TransitionGroup name="row" tag="div" class="table-body">
          <div 
            v-for="(item, rowIdx) in items" 
            :key="item.id"
            class="table-row"
            :style="{ '--row-delay': rowIdx * 0.05 + 's' }"
            @click="$emit('row-click', item)"
          >
            <slot name="row" :item="item" :index="rowIdx">
              <div 
                v-for="(col, colIdx) in columns" 
                :key="colIdx"
                class="table-cell"
                :style="{ width: col.width || 'auto', flex: col.flex || 'none' }"
                :class="[col.class]"
              >
                <slot :name="col.key" :item="item" :value="item[col.key]">
                  {{ item[col.key] }}
                </slot>
              </div>
            </slot>
          </div>
        </TransitionGroup>

        <!-- Empty State -->
        <div v-if="items.length === 0" class="empty-state">
          <div class="empty-icon">
            <slot name="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
              </svg>
            </slot>
          </div>
          <span class="empty-text">{{ emptyText }}</span>
        </div>
      </div>
    </div>

    <!-- Loading Overlay -->
    <Transition name="fade">
      <div v-if="loading" class="loading-overlay">
        <div class="loading-spinner">
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: 'Data Table' },
  columns: { type: Array, default: () => [] },
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  emptyText: { type: String, default: 'No data available' }
})

defineEmits(['row-click'])
</script>

<style scoped>
.geo-table {
  position: relative;
  background: linear-gradient(135deg, rgba(15, 15, 18, 0.95) 0%, rgba(20, 20, 25, 0.95) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  overflow: hidden;
  backdrop-filter: blur(20px);
}

/* Geometric Background */
.geo-pattern {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.geo-shape {
  position: absolute;
  border: 1px solid rgba(59, 130, 246, 0.08);
  border-radius: 50%;
  animation: floatShape 20s ease-in-out infinite;
}

.shape-1 {
  width: 300px;
  height: 300px;
  top: -150px;
  right: -100px;
  animation-delay: 0s;
}

.shape-2 {
  width: 200px;
  height: 200px;
  bottom: -100px;
  left: -50px;
  animation-delay: -5s;
}

.shape-3 {
  width: 150px;
  height: 150px;
  top: 50%;
  right: 20%;
  animation-delay: -10s;
}

@keyframes floatShape {
  0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0.5; }
  25% { transform: translate(10px, -10px) rotate(90deg); opacity: 0.8; }
  50% { transform: translate(0, -20px) rotate(180deg); opacity: 0.5; }
  75% { transform: translate(-10px, -10px) rotate(270deg); opacity: 0.8; }
}

/* Table Chrome */
.table-chrome {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  position: relative;
  z-index: 1;
}

.chrome-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.chrome-indicator {
  width: 4px;
  height: 24px;
  background: linear-gradient(180deg, #3b82f6 0%, #8b5cf6 100%);
  border-radius: 2px;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.chrome-title {
  font-size: 15px;
  font-weight: 600;
  color: #f5f5f7;
  letter-spacing: -0.01em;
}

.chrome-count {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.06);
  padding: 4px 10px;
  border-radius: 20px;
}

/* Table Viewport */
.table-viewport {
  position: relative;
  z-index: 1;
}

.table-scroll {
  overflow-x: auto;
}

/* Header Row */
.table-header-row {
  display: flex;
  align-items: center;
  padding: 8px 12px; /* Reduced padding from 16px */
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid transparent;
  border-radius: 12px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.header-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
  white-space: nowrap;
}

/* Table Body */
.table-body {
  position: relative;
}

.table-row {
  display: flex;
  padding: 0 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  /* animation removed to let TransitionGroup handle it */
  animation-delay: var(--row-delay);
}

.table-row:hover {
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.08) 0%, transparent 100%);
}

.table-row:last-child {
  border-bottom: none;
}

.table-cell {
  padding: 16px;
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #e5e5e7;
}

/* Row Transition */
.row-move, /* apply transition to moving elements */
.row-enter-active,
.row-leave-active {
  transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.row-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.row-leave-active {
  position: absolute; /* Crucial: take leaving items out of flow */
  /* Keep them in place horizontally */
  left: 0;
  right: 0;
  pointer-events: none;
}

.row-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  color: rgba(255, 255, 255, 0.3);
  gap: 16px;
}

.empty-icon {
  opacity: 0.3;
}

.empty-text {
  font-size: 14px;
}

/* Loading Overlay */
.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(10, 10, 12, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  position: relative;
}

.spinner-ring {
  position: absolute;
  inset: 0;
  border: 2px solid transparent;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spinRing 1s linear infinite;
}

.spinner-ring:nth-child(2) {
  inset: 6px;
  border-top-color: #8b5cf6;
  animation-duration: 0.8s;
  animation-direction: reverse;
}

.spinner-ring:nth-child(3) {
  inset: 12px;
  border-top-color: #ec4899;
  animation-duration: 0.6s;
}

@keyframes spinRing {
  to { transform: rotate(360deg); }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Scrollbar */
.table-scroll::-webkit-scrollbar {
  height: 6px;
}

.table-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.table-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}
</style>
