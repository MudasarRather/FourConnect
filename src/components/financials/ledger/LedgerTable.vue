<template>
  <div class="ledger-table-wrap glass-panel">
     <div class="header-actions">
        <h3>General Ledger</h3>
        <div class="filters">
           <input v-model="search" placeholder="Search transactions..." class="search-input" />
           <select v-model="typeFilter" class="filter-select">
              <option value="All">All Types</option>
              <option value="Debit">Debit</option>
              <option value="Credit">Credit</option>
           </select>
        </div>
     </div>

     <table class="data-table">
        <thead>
           <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Ref Type</th>
              <th>Debit</th>
              <th>Credit</th>
              <th>Balance</th>
           </tr>
        </thead>
        <tbody>
           <tr v-for="entry in filteredEntries" :key="entry.id">
              <td class="date-col">{{ new Date(entry.transaction_date).toLocaleDateString() }}</td>
              <td class="desc-col">{{ entry.description }}</td>
              <td><span class="ref-badge">{{ entry.reference_type || 'Manual' }}</span></td>
              <td class="amount debit" :class="{ empty: !entry.debit }">
                 {{ entry.debit ? '$' + Number(entry.debit).toLocaleString() : '-' }}
              </td>
              <td class="amount credit" :class="{ empty: !entry.credit }">
                 {{ entry.credit ? '$' + Number(entry.credit).toLocaleString() : '-' }}
              </td>
              <td class="amount balance">${{ Number(entry.balance).toLocaleString() }}</td>
           </tr>
           <tr v-if="filteredEntries.length === 0">
              <td colspan="6" class="empty-state">No transactions found</td>
           </tr>
        </tbody>
     </table>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({ entries: Array })

const search = ref('')
const typeFilter = ref('All')

const filteredEntries = computed(() => {
   if (!props.entries) return []
   return props.entries.filter(e => {
      const matchSearch = e.description?.toLowerCase().includes(search.value.toLowerCase())
      const matchType = typeFilter.value === 'All' 
         ? true 
         : typeFilter.value === 'Debit' ? e.debit > 0 : e.credit > 0
      return matchSearch && matchType
   })
})
</script>

<style scoped>
.glass-panel { background: #18181b; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; padding: 0; }
.header-actions {
  padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.05);
  display: flex; justify-content: space-between; align-items: center;
}
h3 { margin: 0; color: white; font-size: 14px; font-weight: 600; }

.filters { display: flex; gap: 12px; }
.search-input, .filter-select {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  padding: 6px 12px; border-radius: 6px; color: white; font-size: 12px; outline: none;
}
.search-input:focus, .filter-select:focus { border-color: #3b82f6; }

.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; padding: 12px 20px; color: rgba(255,255,255,0.4); font-weight: 500; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.05); }
td { padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #e4e4e7; }
tr:last-child td { border-bottom: none; }

.date-col { font-family: 'SF Mono', monospace; opacity: 0.6; font-size: 12px; }
.desc-col { font-weight: 500; color: white; }
.ref-badge { font-size: 10px; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; color: rgba(255,255,255,0.6); }

.amount { font-family: 'SF Mono', monospace; font-weight: 500; }
.debit { color: #f43f5e; } /* Expense */
.credit { color: #22c55e; } /* Income/Funding */
.balance { color: white; font-weight: 600; }
.empty { opacity: 0.2; }

.empty-state { text-align: center; padding: 40px; color: rgba(255,255,255,0.3); }
</style>
