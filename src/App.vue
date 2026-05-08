<script setup>
import ToastContainer from './components/ui/ToastContainer.vue'
</script>

<template>
  <router-view />
  <ToastContainer />
</template>

<style>
/* Global App Styles */
.Vue-Toastification__container {
  z-index: 999999 !important;
}
</style>


