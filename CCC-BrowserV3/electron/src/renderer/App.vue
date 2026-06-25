<template>
  <div id="app-container">
    <router-view />
  </div>
</template>

<script setup lang="ts">
/**
 * 应用根组件
 */
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  width: 100%;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

#app-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
