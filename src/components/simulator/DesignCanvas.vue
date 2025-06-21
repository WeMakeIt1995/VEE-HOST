<script setup lang="ts">
import { ref, inject, onMounted, computed } from 'vue';
import GridBackground from './GridBackground.vue';
import ICComponent from './ICComponent.vue';
import Connection from './Connection.vue';
import type { SimulatorStore } from '@/stores/simulator';

const simulatorStore = inject<SimulatorStore>('simulatorStore')!;

const canvasRef = ref<HTMLElement | null>(null);
const activePin = ref<{ icId: string; pinId: string } | null>(null);
const viewport = ref({
  x: 0,
  y: 0,
  scale: 1
});

// 处理拖放
function handleDrop(event: DragEvent) {
  event.preventDefault();
  if (!event.dataTransfer || !canvasRef.value) return;

  const data = JSON.parse(event.dataTransfer.getData('text/plain'));
  if (data.type === 'ic') {
    const rect = canvasRef.value.getBoundingClientRect();
    const x = (event.clientX - rect.left - viewport.value.x) / viewport.value.scale;
    const y = (event.clientY - rect.top - viewport.value.y) / viewport.value.scale;
    console.info(`addIC`);
    simulatorStore.addIC(data.icType, x, y);
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
}

// 处理引脚点击
function handlePinClick(icId: string, pinId: string) {
  if (!activePin.value) {
    // 第一次点击，记录起点
    activePin.value = { icId, pinId };
  } else {
    // 第二次点击，创建连线
    simulatorStore.createConnection(activePin.value, { icId, pinId });
    activePin.value = null;
  }
}

// 处理画布点击
function handleCanvasClick() {
  simulatorStore.selectElement(null, null);
}

// 计算连线路径
function calculateConnectionPath(connection: any) {
  const fromIC = simulatorStore.state.placedICs.find(ic => ic.id === connection.from.icId);
  const toIC = simulatorStore.state.placedICs.find(ic => ic.id === connection.to.icId);

  if (!fromIC || !toIC) return '';

  const fromPin = simulatorStore.state.icTypes.find(ic => ic.id === fromIC.typeId)?.pins.find(p => p.id === connection.from.pinId);
  const toPin = simulatorStore.state.icTypes.find(ic => ic.id === toIC.typeId)?.pins.find(p => p.id === connection.to.pinId);

  if (!fromPin || !toPin) return '';

  // 简化的直线连接
  const fromPos = getPinPosition(fromIC, fromPin);
  const toPos = getPinPosition(toIC, toPin);

  return `M ${fromPos.x} ${fromPos.y} L ${toPos.x} ${toPos.y}`;
}

function getPinPosition(ic: any, pin: any) {
  const baseX = ic.x;
  const baseY = ic.y;

  switch (pin.position) {
    case 'left': return { x: baseX, y: baseY + 20 + pin.order * 15 };
    case 'right': return { x: baseX + 80, y: baseY + 20 + pin.order * 15 };
    case 'top': return { x: baseX + 40 + pin.order * 15, y: baseY };
    case 'bottom': return { x: baseX + 40 + pin.order * 15, y: baseY + 60 };
    default: return { x: baseX, y: baseY };
  }
}
</script>

<template>
  <div
    class="design-canvas"
    ref="canvasRef"
    @drop="handleDrop"
    @dragover="handleDragOver"
    @click="handleCanvasClick"
  >
    <GridBackground :scale="viewport.scale" />

    <svg class="connections-layer">
      <Connection
        v-for="conn in simulatorStore.state.connections"
        :key="conn.id"
        :path="calculateConnectionPath(conn)"
        :selected="simulatorStore.state.selectedElement.type === 'connection' &&
                  simulatorStore.state.selectedElement.id === conn.id"
        @click.stop="simulatorStore.selectElement('connection', conn.id)"
      />
    </svg>

    <div class="ics-container">
      <ICComponent
        v-for="ic in simulatorStore.state.placedICs"
        :key="ic.id"
        :ic="ic"
        :selected="simulatorStore.state.selectedElement.type === 'ic' &&
                  simulatorStore.state.selectedElement.id === ic.id"
        @pin-click="handlePinClick"
        @click.stop="simulatorStore.selectElement('ic', ic.id)"
      />
    </div>
  </div>
</template>

<style scoped>
.design-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #f9f9f9;
}

.connections-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.ics-container {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
}
</style>
