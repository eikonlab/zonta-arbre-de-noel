<template>
  <component :is="currentApp" />
</template>

<script setup>
import { computed } from "vue";
import AppPublic from "./apps/AppPublic.vue";
import AppAdmin from "./apps/AppAdmin.vue";
import AppQR from "./apps/AppQR.vue";

// Get the mode from environment variables or URL parameters
const getMode = () => {
  // Check URL parameters first
  const urlParams = new URLSearchParams(window.location.search);
  const modeParam = urlParams.get("mode");
  if (modeParam) return modeParam;

  // Check environment variables
  return import.meta.env.VITE_APP_MODE || "public";
};

const mode = getMode();

const currentApp = computed(() => {
  switch (mode) {
    case "admin":
      return AppAdmin;
    case "qr":
      return AppQR;
    case "public":
    default:
      return AppPublic;
  }
});
</script>

<style>
body {
  margin: 0;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

* {
  box-sizing: border-box;
}
</style>
