<script setup lang="ts">

import { computed, inject, onMounted, ref, watch } from 'vue';
import type { useSimulatorStore } from '@/stores/simulator';

const g_serialContent = ref('');

const props = defineProps<{
  serialContent: string;
}>();

const simulatorStore = inject<ReturnType<typeof useSimulatorStore>>('simulatorStore')!;

const selectedConnection = computed(() => {
  if (simulatorStore.state.selectedElement.type !== 'connection') return null;
  return simulatorStore.state.connections.find(
    conn => conn.id === simulatorStore.state.selectedElement.id
  );
});

const selectedICType = computed(() => {
  if (!simulatorStore.selectedIC) return null;
  return simulatorStore.state.icTypes.find(
    t => t.id === simulatorStore.selectedIC?.typeId
  );
});

function updateICProperty(key: string, value: any) {
  if (!simulatorStore.selectedIC) return;
  const ic = simulatorStore.state.placedICs.find(
    ic => ic.id === simulatorStore.selectedIC?.id
  );
  if (ic) {
    ic.properties = { ...ic.properties, [key]: value };
  }
}

onMounted(() => {
  watch(() => props.serialContent, async (val) => {
    console.log(`display data changed`);

    g_serialContent.value = val;
  });
});

</script>

<template>
  <div class="property-panel">
    <div v-if="simulatorStore.selectedIC" class="ic-properties">
      <h3>{{ selectedICType?.name }} 属性</h3>

      <div class="property-group">
        <label>位置</label>
        <div class="position-controls">
          <div class="position-input">
            <span>X:</span>
            <input
              type="number"
              v-model.number="simulatorStore.selectedIC.x"
            />
          </div>
          <div class="position-input">
            <span>Y:</span>
            <input
              type="number"
              v-model.number="simulatorStore.selectedIC.y"
            />
          </div>
        </div>
      </div>

      <div class="property-group">
        <label>旋转</label>
        <input
          type="range"
          min="0"
          max="360"
          step="1"
          v-model.number="simulatorStore.selectedIC.rotation"
        />
        <span>{{ simulatorStore.selectedIC.rotation }}°</span>
      </div>

      <!-- <div
        v-for="pin in selectedICType?.pins"
        :key="pin.id"
        class="property-group"
      >
        <label>{{ pin.name }} ({{ pin.type }})</label>
        <input
          type="text"
          v-model="simulatorStore.selectedIC.properties[pin.id]"
          @input="updateICProperty(pin.id, $event.target.value)"
          :placeholder="`${pin.name} 属性`"
        />
      </div> -->

      <button
        class="delete-button"
        @click="simulatorStore.deleteSelected"
      >
        删除组件
      </button>
    </div>

    <div v-else-if="selectedConnection" class="connection-properties">
      <h3>连线属性</h3>
      <p>从 {{ selectedConnection.from.icId }} 的 {{ selectedConnection.from.pinId }}</p>
      <p>到 {{ selectedConnection.to.icId }} 的 {{ selectedConnection.to.pinId }}</p>

      <button
        class="delete-button"
        @click="simulatorStore.deleteSelected"
      >
        删除连线
      </button>
    </div>

    <div v-else class="empty-state">
      <p>未选择任何元素</p>
      <p>点击画布上的组件或连线以编辑其属性</p>
    </div>

    <div
      class="serial-out"
    >
      <p>虚拟串口输出</p>
      <textarea
        v-model="g_serialContent"
        readonly
        class="serial-textarea"
      ></textarea>
    </div>
  </div>
</template>

<style scoped>
.property-panel {
  height: 100%;
  padding: 15px;
  /* overflow-y: auto; */
  display: flex;
  flex-direction: column;
  background: #fff;
}

.property-panel h3 {
  margin-top: 0;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.property-group {
  margin-bottom: 15px;
}

.property-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  font-size: 14px;
}

.property-group input[type="text"],
.property-group input[type="number"] {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.position-controls {
  display: flex;
  gap: 10px;
}

.position-input {
  flex: 1;
  display: flex;
  align-items: center;
}

.position-input span {
  margin-right: 5px;
  font-size: 14px;
}

.delete-button {
  margin-top: 20px;
  padding: 8px 15px;
  background: #ff4d4f;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.delete-button:hover {
  background: #ff7875;
}

.empty-state {
  color: #999;
  text-align: center;
  padding-top: 50px;
}

.serial-out {
  height: 50%;
  margin-top: auto;
  background: #f9f9f9;
}

.serial-textarea {
  background: white;
  width: 100%;
  height: 98%;
}

</style>
