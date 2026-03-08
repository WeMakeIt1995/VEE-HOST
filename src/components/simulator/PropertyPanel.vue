<script setup lang="ts">

import { computed, inject, onMounted, ref, watch } from 'vue';
import type { useSimulatorStore } from '@/stores/simulator';

const g_serialContent = ref('');
const g_serialWriteContent = ref('');
const g_serialWriteSelect = ref('');
const g_serialWriteHex = ref(false);
const g_serialWriteHistory = ref<string[]>([]);
const g_labelSetContent = ref('');
const g_icId = ref('');

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

function serialWrite() {
  if (g_serialWriteHistory.value.indexOf(g_serialWriteContent.value) < 0) {
    g_serialWriteHistory.value.push(g_serialWriteContent.value);
  }
  simulatorStore.serialWrite(g_serialWriteContent.value, g_serialWriteHex.value);
}

function handleWriteSelectClick() {
  // @ts-ignore
  g_serialWriteContent.value = g_serialWriteSelect.value;
}

function onRotationChange(degree: number) {
  simulatorStore.selectRotation(degree);
}

function updateIcProperty() {
  simulatorStore.setIcLabel(g_labelSetContent.value);
}

onMounted(() => {
  watch(() => simulatorStore.state.selectedElement, (val) => {
    g_icId.value = `${val.id}`;
  });

  watch(() => simulatorStore.state.serialOut, (val) => {
    g_serialContent.value += val;
  });

  watch(() => simulatorStore.state.serialOpen, (val) => {
    if (val) {
      g_serialContent.value = '';
    }
  });
});

</script>

<template>
  <div class="property-panel">
    <div v-if="simulatorStore.selectedIC" class="ic-properties">
      <h3>{{ selectedICType?.name }} 属性</h3>
      <h3>{{ g_icId }}</h3>

      <div class="property-group">
        <button
          style="margin-top: 5px; margin-left: 5px;"
          @click="onRotationChange(-90)"
        >
          左转90°
        </button>
        <button
          style="margin-top: 5px; margin-left: 5px;"
          @click="onRotationChange(90)"
        >
          右转90°
        </button>
      </div>

      <div class="property-group">
        <p>设置标签</p>
        <input
          v-model="g_labelSetContent"
        />
      </div>

      <div class="property-group">
        <button
          @click="updateIcProperty"
        >配置属性</button>
      </div>

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

      <p>虚拟串口输入</p>
      <input
        v-model="g_serialWriteContent"
      />

      <p>
        <input type="checkbox" style="margin-right: 5px;">HEX发送</input>
      </p>

      <select
        v-model="g_serialWriteSelect"
        @click="handleWriteSelectClick"
      >
        <option
          v-for="item in g_serialWriteHistory"
          :value="item"
        >
          {{ item }}
        </option>
      </select>

      <button
        style="margin-top: 5px;"
        @click="serialWrite"
      >发送</button>
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
  height: 60%;
  margin-top: auto;
  display: flex;
  flex-direction: column;
  background: #f9f9f9;
}

.serial-textarea {
  background: white;
  flex: 1;
}

</style>
