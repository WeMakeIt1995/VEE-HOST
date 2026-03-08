<script setup lang="ts">
import { provide, ref } from 'vue';
import { useSimulatorStore } from '@/stores/simulator';
import ICLibraryPanel from '@/components/simulator/ICLibraryPanel.vue';
import DesignCanvas from '@/components/simulator/DesignCanvas.vue';
import PropertyPanel from '@/components/simulator/PropertyPanel.vue';

const simulatorStore = useSimulatorStore();
const searchQuery = ref('');
const serialContent = ref('');

// 提供store给所有子组件
provide('simulatorStore', simulatorStore);
</script>

<template>
  <div class="simulator-container">
    <ICLibraryPanel class="library-panel" :search-query="searchQuery" />
    <DesignCanvas class="design-canvas" />
    <PropertyPanel class="property-panel" :serial-content="serialContent" />
  </div>
</template>

<style scoped>
.simulator-container {
  display: flex;
  height: 92vh;
  width: 98vw;
}

.library-panel {
  width: 250px;
  border-right: 1px solid #ddd;
}

.design-canvas {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.property-panel {
  width: 360px;
  border-left: 1px solid #ddd;
}
</style>
