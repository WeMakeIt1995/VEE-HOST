<script setup lang="ts">

import { ref, inject, onMounted, computed } from 'vue';
import GridBackground from './GridBackground.vue';
import ICComponent from './ICComponent.vue';
import Connection from './Connection.vue';
import type { useSimulatorStore } from '@/stores/simulator';
// import * as joint from 'jointjs';
import * as joint from '@joint/core';
import type { CommunicationInterface, ICInstance, PinDefinition } from '../../types/simulator';
// import { AvoidRouter } from './libavoid/src/shared/avoid-router.js';
// import { Edge } from './libavoid/src/shared/shapes.js';

const simulatorStore = inject<ReturnType<typeof useSimulatorStore>>('simulatorStore')!;

const canvasRef = ref<HTMLElement | null>(null);
const viewport = ref({
  x: 0,
  y: 0,
  scale: 1
});

let g_executable = ref('');
let g_displayData = ref([]);
let g_executableDebug = ref(false);

let g_jointGraph = new joint.dia.Graph();
let g_jointPaper = new joint.dia.Paper({});

const StartSimulator = '开始仿真';
const LaunchSimulator = '仿真启动中';
const StopSimulator = '停止仿真';
const EnableExecutableDebug = '打开调试模式';
const DisableExecutableDebug = '关闭调试模式';

let g_startSimulatorButtonText = ref(StartSimulator);
let g_startSimulatorButtonDisabled = ref(false);
let g_blueprintModifyDisabled = ref(false);

const emit = defineEmits<{

}>();

function savePaper()
{
  const s = simulatorStore.savePaper();
  const blob = new Blob([s], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function loadPaper()
{
  // 创建隐藏的 file input
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.style.display = 'none';

  input.onchange = (event) => {
    // @ts-ignore
    const file = event.target!.files[0];
    if (file) {
      const reader = new FileReader()

      reader.onload = (e) => {
        simulatorStore.loadPaper(e.target!.result as string);
      }

      reader.onerror = () => {
        alert('文件读取失败')
      }

      reader.readAsText(file)
    }
    // 清理
    document.body.removeChild(input);
  }

  document.body.appendChild(input);
  input.click();
}

function stopSimulator()
{
  g_startSimulatorButtonText.value = StartSimulator;
  g_startSimulatorButtonDisabled.value = false;
  g_blueprintModifyDisabled.value = false;

  simulatorStore.stopSimulator();
}

function startSimulator()
{
  if (simulatorStore.getMachineControlClient()) {
    stopSimulator();
    return;
  }
  else {
    console.info(`start simulator`);
  }

  simulatorStore.startSimulator({
    executeble: g_executable.value,
    debug: g_executableDebug.value,
    machineReady() {
      g_startSimulatorButtonText.value = StopSimulator;
      g_startSimulatorButtonDisabled.value = false;
    },
    inProcessServer() {
      g_startSimulatorButtonText.value = LaunchSimulator;
      g_startSimulatorButtonDisabled.value = true;
      g_blueprintModifyDisabled.value = true;
    },
    machineClose: stopSimulator,
    machineError: stopSimulator,
    launchFaild: stopSimulator,
  });
}

function onClickDebugButton()
{
  g_executableDebug.value = ! g_executableDebug.value;
}

async function onClickSetExecutablePath()
{
  try {
    const filePath = await (window as any).electronAPI.selectFile([".elf"]);
    console.log(`select file: ${filePath}`);

    if (filePath) {
      g_executable.value = filePath;
    }
  }
  catch (error) {
    console.error('select file faild:', error);
  }
}

// 处理拖放
function handleDrop(event: DragEvent) {
  event.preventDefault();
  if (!event.dataTransfer || !canvasRef.value) return;

  const data = JSON.parse(event.dataTransfer.getData('text/plain'));
  if (data.type === 'ic') {
    const rect = canvasRef.value.getBoundingClientRect();
    const x = (event.clientX - rect.left - viewport.value.x) / viewport.value.scale;
    const y = (event.clientY - rect.top - viewport.value.y) / viewport.value.scale;
    console.info(`addIC ${x} ${y}`);

    let ic = simulatorStore.addIC(data.icType, x, y);

    ic && simulatorStore.icAddToJointGraph(g_jointGraph, ic);
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
}

onMounted(async () => {
  let parentRect = canvasRef.value?.getBoundingClientRect();

  g_jointPaper = new joint.dia.Paper({
    el: canvasRef.value,
    model: g_jointGraph,
    width: parentRect?.width,
    height: parentRect?.height,
    gridSize: 1,
    interactive: { linkMove: false },

    // linkPinning: false,
    // // gridSize: 5,
    // async: true,
    // defaultLink: () => new Edge(),
    // validateConnection: (
    //   sourceView,
    //   sourceMagnet,
    //   targetView,
    //   targetMagnet,
    //   end
    // ) => {
    //   const source = sourceView.model;
    //   const target = targetView.model;
    //   if (source.isLink() || target.isLink()) return false;
    //   if (targetMagnet === sourceMagnet) return false;
    //   if (end === 'target' ? targetMagnet : sourceMagnet) {
    //       return true;
    //   }
    //   if (source === target) return false;
    //   return false;
    // },
  });

  simulatorStore.initJoint(g_jointGraph, g_jointPaper);

  // await AvoidRouter.load();

  // const router = new AvoidRouter(g_jointGraph, {
  //   shapeBufferDistance: 20,
  //   idealNudgingDistance: 10,
  //   portOverflow: 8,
  // });

  // router.addGraphListeners();
  // // setInterval(() => {
  // //   router.routeAll();
  // // }, 1000);
  // router.routeAll();

  canvasRef.value?.addEventListener('keydown', (ev) => {
    if (ev.ctrlKey && ev.key === 'z') {
      ev.preventDefault();
      simulatorStore.undo();
    }
    else if (ev.ctrlKey && ev.key === 'y') {
      ev.preventDefault();
      simulatorStore.redo();
    }
    else if (ev.key === 'Delete' || ev.key === 'Del') {
      ev.preventDefault();
      simulatorStore.keyDelete();
    }
    else if (ev.key === 'Escape') {
      ev.preventDefault();
      simulatorStore.keyEscape();
    }
  });
});

</script>

<template>
  <div style="display: flex; flex-direction: column;">
    <div>
      <button
        @click.stop="simulatorStore.reset()"
        :disabled="g_blueprintModifyDisabled"
      >清除所有元素</button>

      <button
        @click.stop="simulatorStore.resetPaperScale()"
        :disabled="g_blueprintModifyDisabled"
      >重置图纸缩放和位置</button>

      <button
        @click.stop="savePaper()"
      >保存图纸</button>

      <button
        @click.stop="loadPaper()"
        :disabled="g_blueprintModifyDisabled"
      >加载图纸</button>

      <button
        @click.stop="startSimulator()"
        :disabled="g_startSimulatorButtonDisabled"
      >{{ g_startSimulatorButtonText }}</button>

      <button
        @click.stop="onClickDebugButton()"
      >{{ g_executableDebug ? DisableExecutableDebug : EnableExecutableDebug }}</button>

      <button
        @click.stop="onClickSetExecutablePath()"
      >设置可执行文件路径</button>

      <span
        v-text="g_executable"
      ></span>
    </div>

    <div
      class="design-canvas"
      ref="canvasRef"
      tabindex="0"
      @drop="handleDrop"
      @dragover="handleDragOver"
    />
  </div>
</template>

<style scoped>
.design-canvas {
  position: relative;
  /* width: 100%; */
  /* height: 90%; */
  flex: 1;
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
