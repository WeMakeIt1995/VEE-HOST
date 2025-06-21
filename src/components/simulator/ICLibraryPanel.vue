<script setup lang="ts">
import { computed, inject } from 'vue';
import type { SimulatorStore } from '@/stores/simulator';

const props = defineProps<{
  searchQuery: string;
}>();

const simulatorStore = inject<SimulatorStore>('simulatorStore')!;

const filteredICTypes = computed(() => {
  if (!props.searchQuery) return simulatorStore.icCategories;

  return simulatorStore.icCategories.map(cat => ({
    ...cat,
    children: cat.children.filter(ic =>
      ic.name.toLowerCase().includes(props.searchQuery.toLowerCase()) ||
      ic.category.toLowerCase().includes(props.searchQuery.toLowerCase())
    )
  })).filter(cat => cat.children.length > 0);
});

function handleDragStart(icType: any, event: DragEvent) {
  if (!event.dataTransfer) return;
  event.dataTransfer.setData('text/plain', JSON.stringify({
    type: 'ic',
    icType: icType.id
  }));
}
</script>

<template>
  <div class="ic-library">
    <div class="search-box">
      <slot name="search">
        <input
          type="text"
          placeholder="搜索IC..."
          v-model="props.searchQuery"
          class="search-input"
        />
      </slot>
    </div>

    <div class="ic-list">
      <div v-for="category in filteredICTypes" :key="category.name" class="category">
        <h3>{{ category.name }}</h3>
        <div class="ic-items">
          <div
            v-for="ic in category.children"
            :key="ic.id"
            class="ic-item"
            draggable="true"
            @dragstart="handleDragStart(ic, $event)"
          >
            <img class="ic-icon" :src="ic.image" />
            <span>{{ ic.name }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ic-library {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f5f5;
}

.search-box {
  padding: 10px;
  background: #fff;
  border-bottom: 1px solid #ddd;
}

.search-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.ic-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.category {
  margin-bottom: 15px;
}

.category h3 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #666;
}

.ic-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
}

.ic-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: grab;
  transition: all 0.2s;
}

.ic-item:hover {
  background: #e6f7ff;
  border-color: #1890ff;
}

.ic-icon {
  width: 40px;
  height: 40px;
  background: #eee;
  margin-bottom: 5px;
  border-radius: 4px;
}
</style>
