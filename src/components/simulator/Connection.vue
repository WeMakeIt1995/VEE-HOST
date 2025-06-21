<script setup lang="ts">
defineProps<{
  path: string;
  selected?: boolean;
}>();
</script>

<template>
  <path
    :d="path"
    fill="none"
    :stroke="selected ? '#1890ff' : '#666'"
    stroke-width="2"
    stroke-linecap="round"
    pointer-events="visibleStroke"
  />
</template>
