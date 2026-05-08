<template>
  <div class="table-toolbar" @click.stop>
    <button class="table-action-btn" @click="$emit('addRow')" title="Add Row">
      <Rows3 :size="13" /> Add Row
    </button>
    <button class="table-action-btn" @click="$emit('addColumn')" title="Add Column">
      <Columns3 :size="13" /> Add Column
    </button>
    <span class="table-toolbar-sep"></span>
    <button class="table-action-btn" @click="$emit('deleteRow')" title="Delete Row">
      <Rows3 :size="13" /> Del Row
    </button>
    <button class="table-action-btn" @click="$emit('deleteColumn')" title="Delete Column">
      <Columns3 :size="13" /> Del Col
    </button>
    <span class="table-toolbar-sep"></span>
    <button class="table-action-btn danger" @click="$emit('deleteTable')" title="Delete Table">
      <Trash2 :size="13" /> Delete Table
    </button>
  </div>
</template>

<script setup>
import { Rows3, Columns3, Trash2 } from 'lucide-vue-next'

defineEmits(['addRow', 'addColumn', 'deleteRow', 'deleteColumn', 'deleteTable'])
</script>

<style scoped>
.table-toolbar {
  display: flex; gap: 6px; padding: 6px 8px; margin-bottom: 8px;
  background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.15);
  border-radius: 8px; flex-wrap: wrap;
}
.table-action-btn {
  display: flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 6px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.7); font-size: 11px; cursor: pointer; transition: all 0.15s;
}
.table-action-btn:hover { background: rgba(255,255,255,0.1); color: white; }
.table-action-btn.danger { border-color: rgba(239,68,68,0.2); }
.table-action-btn.danger:hover { background: rgba(239,68,68,0.15); color: #f87171; }
.table-toolbar-sep { width: 1px; height: 20px; background: rgba(255,255,255,0.1); margin: 0 2px; }
</style>
