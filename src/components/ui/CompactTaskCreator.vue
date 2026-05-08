<template>
  <div class="task-creator-container">
    <!-- Header Row (Matches Preview) -->
    <div class="creator-header">
       <span class="col-idx">#</span>
       <span class="col-name">Task Name</span>
       <div class="col-meta">
          <span class="col-time">Time</span>
       </div>
       <span class="col-action"></span>
    </div>

    <div class="task-list-flow" ref="taskListRef">
       <div v-for="(task, index) in localTasks" :key="index" class="task-row">
          <div class="task-idx">{{ index + 1 }}</div>
          
          <!-- Name -->
          <input 
             v-model="task.name" 
             placeholder="Enter task name..." 
             class="input-clean name"
             @keydown.enter.prevent
             @input="updateParent"
          />
          
          <!-- Time & Unit -->
          <div class="time-group">
            <div class="input-wrapper small">
               <input 
                  v-model="task.time_val" 
                  type="number" 
                  placeholder="0" 
                  class="input-clean"
                  @input="updateParent"
                  @keydown="(e) => enforceNumeric(e, false)"
               />
            </div>
            
            <!-- Custom Mini Dropdown for Unit -->
            <div class="unit-custom-select" v-click-outside="closeDropdown">
                <button 
                  class="unit-trigger" 
                  @click.stop="toggleDropdown(index)" 
                  :ref="(el) => triggerRefs[index] = el"
                >
                    {{ getUnitLabel(task.unit) }}
                </button>
            </div>
          </div>

          <!-- Weight Removed -->

          <!-- Remove -->
          <button class="btn-remove" @click="removeTask(index)" v-if="localTasks.length > 1">
             <X :size="14" />
          </button>
          
          <!-- Padding for alignment if delete button hidden -->
          <div class="btn-placeholder" v-else></div>
       </div>
    </div>

    <!-- Actions -->
    <div class="footer-actions">
       <button class="btn-add" @click="addTask">
          <Plus :size="14" /> <span>Add Another Task</span>
       </button>
       
       <div class="summary">
          <span>Total: </span>
          <span class="highlight">{{ totalTimeFormatted }}</span>
       </div>
    </div>
  </div>

  <Teleport to="body">
    <div 
       v-if="openDropdownIndex !== -1" 
       class="unit-dropdown-menu" 
       :style="dropdownStyle"
       ref="dropdownMenuRef"
    >
        <div class="unit-option" @click="setUnit(openDropdownIndex, 'mins')">min</div>
        <div class="unit-option" @click="setUnit(openDropdownIndex, 'hours')">hr</div>
        <div class="unit-option" @click="setUnit(openDropdownIndex, 'days')">day</div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Plus, X } from 'lucide-vue-next'
import { useToast } from '../../composables/useToast'

const props = defineProps({
  modelValue: { type: Array, default: () => [] } 
})

const emit = defineEmits(['update:modelValue'])
const { addToast } = useToast()

// Local state
const localTasks = ref([])
const openDropdownIndex = ref(-1)
const triggerRefs = ref([])
const dropdownStyle = ref({})
const dropdownMenuRef = ref(null)
const taskListRef = ref(null)

// Click Outside Directive
const vClickOutside = {
  mounted(el, binding) {
    el.clickOutsideEvent = function(event) {
        // Check if click is on the trigger wrapper
        const isWrapper = el === event.target || el.contains(event.target)
        
        // Check if click is on the teleported menu
        const menuEl = dropdownMenuRef.value
        const isMenu = menuEl && (menuEl === event.target || menuEl.contains(event.target))
        
        if (!isWrapper && !isMenu) {
            binding.value(event, el)
        }
    };
    document.body.addEventListener('click', el.clickOutsideEvent);
  },
  unmounted(el) {
    document.body.removeEventListener('click', el.clickOutsideEvent);
  }
};

// Sync from prop
watch(() => props.modelValue, (newVal) => {
    if (!newVal) return
    if (JSON.stringify(newVal) !== JSON.stringify(localTasks.value)) {
        localTasks.value = newVal.map(t => ({
            name: t.name,
            time_val: t.time_val !== undefined ? t.time_val : (t.estimated_minutes || ''),
            unit: t.unit || 'mins',
            weightage: t.weightage,
            estimated_minutes: t.estimated_minutes
        }))
    }
}, { immediate: true, deep: true })

const updateParent = () => {
    const payload = localTasks.value.map(t => {
        let mins = parseInt(t.time_val) || 0
        if (t.unit === 'hours') mins *= 60
        if (t.unit === 'days') mins *= 60 * 8
        
        return {
            name: t.name,
            time_val: t.time_val,
            unit: t.unit,
            weightage: t.weightage,
            estimated_minutes: mins
        }
    })
    emit('update:modelValue', payload)
}

const hasEmptyFields = computed(() => {
    return localTasks.value.some(t => !t.name || !t.time_val)
})

const enforceNumeric = (e, allowDecimal = false) => {
    // Block invalid chars explicitly
    if (['e', 'E', '+', '-'].includes(e.key)) {
        e.preventDefault()
        return
    }
    
    // Allow Controls
    const controls = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
    if (controls.includes(e.key) || e.ctrlKey || e.metaKey) return
    
    // Allow Numbers
    if (/^[0-9]$/.test(e.key)) return
    
    // Allow Decimal if permitted
    if (allowDecimal && e.key === '.') return
    
    // Block Everything Else (Alphabets, Symbols, Spaces)
    e.preventDefault()
}

const addTask = () => {
    if (hasEmptyFields.value) {
        addToast("Please fill all fields for the current task first.", "error")
        return
    }

    localTasks.value.push({
        name: '',
        time_val: '',
        unit: 'mins',
        weightage: ''
    })
    updateParent()
    

    
    // Auto-scroll
    setTimeout(() => {
        if (taskListRef.value) {
            taskListRef.value.scrollTop = taskListRef.value.scrollHeight
        }
    }, 50)
}

const removeTask = (index) => {
    localTasks.value.splice(index, 1)
    updateParent()
}

// Dropdown Logic
const toggleDropdown = (index) => {
    if (openDropdownIndex.value === index) {
        openDropdownIndex.value = -1
        return
    }
    
    // Open
    openDropdownIndex.value = index
    const trigger = triggerRefs.value[index]
    if (trigger) {
        const rect = trigger.getBoundingClientRect()
        dropdownStyle.value = {
            top: `${rect.bottom + 4}px`,
            left: `${rect.left}px`,
            minWidth: `${rect.width}px`
        }
    }
}
const closeDropdown = () => {
    openDropdownIndex.value = -1
}
const setUnit = (index, unit) => {
    localTasks.value[index].unit = unit
    openDropdownIndex.value = -1
    updateParent()
}
const getUnitLabel = (unit) => {
    return { mins: 'min', hours: 'hr', days: 'd' }[unit] || 'min'
}

const totalTimeFormatted = computed(() => {
    let totalMins = 0
    localTasks.value.forEach(t => {
        let val = parseInt(t.time_val) || 0
        if (t.unit === 'hours') val *= 60
        if (t.unit === 'days') val *= 60 * 8
        totalMins += val
    })
    
    if (totalMins === 0) return '0 min'
    
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
})

onMounted(() => {
    if (localTasks.value.length === 0) {
        addTask()
    }
})
</script>

<style scoped>
/* Styles */
.task-creator-container {
  display: flex; flex-direction: column; gap: 0;
  width: 100%;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 8px;
  overflow: hidden;
}

.creator-header {
    display: flex; align-items: center; padding: 10px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    background: rgba(255,255,255,0.02);
}

/* Header Columns */
.col-idx { width: 24px; font-size: 10px; color: rgba(255,255,255,0.3); font-weight: 700; text-align: center; }
.col-name { flex: 1; font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
.col-meta { display: flex; gap: 8px; width: auto; /* Allow auto to fit children */ } 
.col-time { font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; font-weight: 600; width: 90px; text-align: center; } /* Match time-group */
.col-weight { font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; font-weight: 600; width: 80px; text-align: center; } /* Match weight input */
.col-action { width: 24px; } /* Space for X button */


.task-list-flow {
  display: flex; flex-direction: column; 
  max-height: 140px; /* ~3.5 items */
  overflow-y: auto;
  padding-right: 4px; /* Space for scrollbar */
}

/* Custom Scrollbar for Task List */
.task-list-flow::-webkit-scrollbar { width: 4px; }
.task-list-flow::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
.task-list-flow::-webkit-scrollbar-track { background: transparent; }

.task-row {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.02);
  min-height: 40px;
}
.task-row:last-child { border-bottom: none; }
.task-row:hover { background: rgba(255,255,255,0.02); }


.task-idx {
  font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.3);
  width: 24px; text-align: center;
}

.input-clean {
  background: transparent; border: none; color: #f5f5f7;
  font-family: inherit; font-size: 12px;
  padding: 2px;
}
.input-clean:focus { outline: none; }
.input-clean::placeholder { color: rgba(255,255,255,0.2); }

.name { flex: 1; min-width: 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
.name:focus { border-bottom-color: #3b82f6; }

.time-group {
    display: flex; align-items: center; gap: 2px;
    background: rgba(0,0,0,0.2); border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.05);
    padding: 0 2px 0 4px;
    height: 24px;
    width: 90px; /* Fixed match header */
}
.time-group:focus-within { border-color: rgba(255,255,255,0.2); }

.time-group .input-wrapper { background: none; border: none; padding: 0; height: auto; }
.time-group input { text-align: right; width: 32px; padding-right: 2px; }

/* Custom Mini Dropdown */
.unit-custom-select { position: relative; height: 100%; display: flex; align-items: center; flex: 1; justify-content: flex-end; }
.unit-trigger {
    background: transparent; border: none; border-left: 1px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.6); font-size: 10px; font-weight: 600; text-transform: uppercase;
    padding: 0 6px; height: 16px; cursor: pointer;
    transition: color 0.2s;
    width: 100%; text-align: center;
}
.unit-trigger:hover { color: white; }

.unit-dropdown-menu {
    position: fixed; z-index: 999999;
    background: #1e1e21; border: 1px solid rgba(255,255,255,0.1);
    border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    padding: 4px; min-width: 50px;
    animation: fadeIn 0.1s ease-out;
}
@keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }

.unit-option {
    padding: 4px 8px; font-size: 11px; color: rgba(255,255,255,0.7);
    cursor: pointer; border-radius: 4px; text-align: center;
}
.unit-option:hover { background: rgba(255,255,255,0.1); color: white; }

.input-wrapper {
   display: flex; align-items: center; 
   background: rgba(0,0,0,0.2); border-radius: 6px;
   padding: 0 6px;
   border: 1px solid transparent;
   height: 24px;
}
.input-wrapper:focus-within { border-color: rgba(255,255,255,0.1); }
.input-wrapper.small { width: 80px; /* Fixed match header */ }
.input-wrapper input { width: 100%; text-align: right; }

.suffix { font-size: 10px; color: rgba(255,255,255,0.3); margin-left: 1px; }

.btn-remove {
   opacity: 0; background: none; border: none; color: #ef4444; 
   cursor: pointer; padding: 4px; display: flex; align-items: center;
   transition: 0.2s;
}
.task-row:hover .btn-remove { opacity: 0.6; }
.btn-remove:hover { opacity: 1; transform: scale(1.1); }

/* Footer */
.footer-actions {
   display: flex; justify-content: space-between; align-items: center;
   padding: 10px 12px;
   background: rgba(0,0,0,0.2);
   border-top: 1px solid rgba(255,255,255,0.05);
}

.btn-add {
  display: flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05);
  border-radius: 20px; padding: 4px 10px;
  color: #f5f5f7; font-size: 11px; font-weight: 500;
  cursor: pointer; transition: 0.2s;
}
.btn-add:hover { background: rgba(255,255,255,0.1); }

.summary { font-size: 11px; color: rgba(255,255,255,0.5); }
.summary .highlight { color: #3b82f6; font-weight: 600; font-family: 'SF Mono', monospace; }

/* Chrome Number Input clean */
/* Clean Number Inputs (Cross Browser) */
input[type=number] {
  -moz-appearance: textfield;
  appearance: textfield;
}

input[type=number]::-webkit-outer-spin-button, 
input[type=number]::-webkit-inner-spin-button {
  -webkit-appearance: none; 
  margin: 0; 
}
</style>
