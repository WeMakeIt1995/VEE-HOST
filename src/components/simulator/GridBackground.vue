<script setup lang="ts">
defineProps<{
  scale: number;
}>();
</script>

<template>
  <svg class="grid-background">
    <defs>
      <pattern
        id="grid-pattern"
        width="20"
        height="20"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M 20 0 L 0 0 0 20"
          fill="none"
          stroke="#e0e0e0"
          stroke-width="0.5"
        />
      </pattern>
    </defs>

    <rect width="100%" height="100%" fill="url(#grid-pattern)" />
  </svg>
</template>

<style scoped>
.grid-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
