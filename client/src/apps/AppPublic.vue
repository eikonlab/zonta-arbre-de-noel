<template>
  <router-view />
</template>

<script setup>
// Router handles all the routing logic
</script>

<style>
html {
  overscroll-behavior: none;
  -webkit-overflow-scrolling: auto;
}

body {
  margin: 0;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overscroll-behavior: none;
  -webkit-overflow-scrolling: auto;
  touch-action: pan-y;
}

* {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}
</style>
