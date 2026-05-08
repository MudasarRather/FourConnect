<template>
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="geometric-logo">
    <mask id="path-1-inside-1_4_2" fill="white">
      <rect x="2" y="2" width="16" height="16" rx="4"/>
    </mask>
    <rect x="2" y="2" width="16" height="16" rx="4" stroke="currentColor" stroke-width="8" mask="url(#path-1-inside-1_4_2)"/>
    
    <mask id="path-2-inside-1_4_2" fill="white">
      <rect x="22" y="2" width="16" height="16" rx="4"/>
    </mask>
    <rect x="22" y="2" width="16" height="16" rx="4" stroke="currentColor" stroke-width="8" mask="url(#path-2-inside-1_4_2)" opacity="0.6"/>
    
    <mask id="path-3-inside-1_4_2" fill="white">
      <rect x="2" y="22" width="16" height="16" rx="4"/>
    </mask>
    <rect x="2" y="22" width="16" height="16" rx="4" stroke="currentColor" stroke-width="8" mask="url(#path-3-inside-1_4_2)" opacity="0.6"/>
    
    <rect x="22" y="22" width="16" height="16" rx="4" fill="currentColor"/>
  </svg>
</template>

<style scoped>
.geometric-logo {
  color: var(--text-primary);
  transition: transform 0.3s var(--ease);
}
.geometric-logo:hover {
  transform: rotate(90deg);
}
</style>
