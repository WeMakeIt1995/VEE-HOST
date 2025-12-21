<script setup lang="ts">

import { ref, inject, onMounted, computed } from 'vue';
import GridBackground from './GridBackground.vue';
import ICComponent from './ICComponent.vue';
import Connection from './Connection.vue';
import type { useSimulatorStore } from '@/stores/simulator';
import { jsPlumb, jsPlumbInstance, type Endpoint } from 'jsplumb';
import type { CommunicationInterface, ICInstance, PinDefinition } from '../../types/simulator';

const simulatorStore = inject<ReturnType<typeof useSimulatorStore>>('simulatorStore')!;

const canvasRef = ref<HTMLElement | null>(null);
const activePin = ref<{ icId: string; pinImgId: string, pinId: string, pinAnchorId: string } | null>(null);
const viewport = ref({
  x: 0,
  y: 0,
  scale: 1
});

let g_plumb: jsPlumbInstance | null = null;
let g_executable = ref('');
let g_displayData = ref([]);
let g_executableDebug = ref(false);

const StartSimulator = '开始仿真';
const LaunchSimulator = '仿真启动中';
const StopSimulator = '停止仿真';
const EnableExecutableDebug = '打开调试模式';
const DisableExecutableDebug = '关闭调试模式';

const MachineControlServerUrl = 'ws://localhost:4445';
const MachineQmpServerUrl = 'ws://localhost:4446';
const MachineSerialServerUrl = 'ws://localhost:4447';

let g_startSimulatorButtonText = ref(StartSimulator);
let g_startSimulatorButtonDisabled = ref(false);
let g_blueprintModifyDisabled = ref(false);

let g_machineControlClient: WebSocket | null = null;
let g_machineMessageClient: WebSocket | null = null;
let g_machineSerialClient: WebSocket | null = null;

const emit = defineEmits<{
  (e: 'serialOut', val: string, append: boolean): void;
}>();

function clearAll()
{
  simulatorStore.reset();
  g_plumb?.deleteEveryConnection();
  g_plumb?.deleteEveryEndpoint();
}

function loadExample()
{
  clearAll();

  simulatorStore.addIC('STM32F405RGTx', 480, 700);
  simulatorStore.addIC('SSD1306', 460, 200);

  setTimeout(() => {
    console.log(simulatorStore.state);

    function connectPin(ic1: ICInstance, pin1: string, ic2: ICInstance, pin2: string) {
      let srcPin = simulatorStore.getPinDefinitionFromTag(ic1, pin1)!;
      handlePinClick(
        ic1.id,
        simulatorStore.createPinImageId(ic1, srcPin),
        simulatorStore.createPinId(ic1, srcPin),
        simulatorStore.createPinAnchorId(ic1, srcPin)
      );

      let desPin = simulatorStore.getPinDefinitionFromTag(ic2, pin2)!;
      handlePinClick(
        ic2.id,
        simulatorStore.createPinImageId(ic2, desPin),
        simulatorStore.createPinId(ic2, desPin),
        simulatorStore.createPinAnchorId(ic2, desPin)
      );
    }

    connectPin(simulatorStore.state.placedICs[0], "PB7", simulatorStore.state.placedICs[1], "RST");
    connectPin(simulatorStore.state.placedICs[0], "PB6", simulatorStore.state.placedICs[1], "CS");
    connectPin(simulatorStore.state.placedICs[0], "PB5", simulatorStore.state.placedICs[1], "MOSI");
    connectPin(simulatorStore.state.placedICs[0], "PB4", simulatorStore.state.placedICs[1], "DC");
    connectPin(simulatorStore.state.placedICs[0], "PB3", simulatorStore.state.placedICs[1], "SCK");
  }, 200);
}

function stopSimulator()
{
  g_machineControlClient?.close();
  g_machineMessageClient?.close();
  g_machineSerialClient?.close();
  g_machineControlClient = null;
  g_machineMessageClient = null;
  g_machineSerialClient = null;
  g_startSimulatorButtonText.value = StartSimulator;
  g_startSimulatorButtonDisabled.value = false;
  g_blueprintModifyDisabled.value = false;
}

function startSimulator()
{
  if (g_machineControlClient) {
    stopSimulator();
    return;
  }
  else {
    console.info(`start simulator`);
  }

  console.log(simulatorStore.state);

  let devices: Record<string, ICInstance> = {};
  let interfaceDevices: Record<string, CommunicationInterface> = {};
  let lineSet = new Set();

  simulatorStore.state.placedICs.forEach((v) => {
    if (v.icType.type === "MCU") {
      console.info(`get machine model: ${v.icType.qemuDeviceType}`);
      devices["machine model"] = v;
      return;
    }

    let idx = 0;
    let qomId = `${v.icType.qemuDeviceId}${idx}`;
    while (typeof devices[qomId] !== "undefined") {
      idx ++;
      qomId = `${v.icType.qemuDeviceId}${idx}`;
    }
    console.info(`make device qomId: ${qomId}`);
    devices[qomId] = v;

    v.icType.communicationInterfaces?.forEach((vv) => {
      let idx = 0;
      let qomId = `${vv.type}${idx}`;
      while (typeof devices[qomId] !== "undefined") {
        idx ++;
        qomId = `${vv.type}${idx}`;
      }
      console.info(`make device qomId: ${qomId}`);
      interfaceDevices[qomId] = vv;

      if (v.communicationInterfaces.length) {
        return;
      }

      v.communicationInterfaces.push(qomId);
    });
  });

  let parameters: string[] = [];
  let devicesStr: string[] = [];

  if (typeof devices["machine model"] !== "undefined") {
    parameters.push(`-M ${devices["machine model"].icType.qemuDeviceType}`);
    parameters.push(`-kernel ${g_executable.value}`);
    parameters.push(`-chardev socket,id=qmp,port=4444,host=localhost,server=on`);
    parameters.push(`-mon chardev=qmp,mode=control,pretty=off`);
  }
  else {
    alert("未设定MCU, 无法仿真");
    return;
  }

  for (let i in interfaceDevices) {
    parameters.push(`-device ${interfaceDevices[i].type},id=${i}`);
    devicesStr.push(`${interfaceDevices[i].type},id=${i}`);
  }

  for (let i in devices) {
    if (devices[i].icType.type === "MCU") {
      continue;
    }

    let p = `-device ${devices[i].icType.qemuDeviceType},id=${i}`;
    devices[i].communicationInterfaces.forEach((v) => {
      // console.info(`make communicationInterfaces: device=${i},type=${interfaceDevices[v].type},v=${v}`);

      p += `,${interfaceDevices[v].type}=${v}`;
    });

    devicesStr.push(`${p.split(' ')[1]}`);

    parameters.push(p);
  }

  simulatorStore.state.connections.forEach((v, idx) => {
    let qomId = `vee-line${idx}`;
    let fromIcQomId = "";
    let fromIc: ICInstance | null = null;
    let toIcQomId = "";
    let toIc: ICInstance | null = null;

    for (let i in devices) {
      if (devices[i].id === v.from.icId) {
        fromIcQomId = i;
        fromIc = devices[i];
      }
      else if (devices[i].id === v.to.icId) {
        toIcQomId = i;
        toIc = devices[i];
      }
    }

    let fromPin = fromIc?.icType.getPinPathInQemuQom(
      fromIcQomId,
      simulatorStore.getPinDefinitionFromTag(fromIc, v.from.pinId)!,
      fromIc.icType.communicationInterfaces!,
      fromIc.communicationInterfaces
    );
    let toPin = toIc?.icType.getPinPathInQemuQom(
      toIcQomId,
      simulatorStore.getPinDefinitionFromTag(toIc, v.to.pinId)!,
      toIc.icType.communicationInterfaces!,
      toIc.communicationInterfaces
    );
    let p = `-device vee-line,id=${qomId},vee-pins-path='${fromPin},,${toPin}'`;

    devicesStr.push(`vee-line,id=${qomId},vee-pins-path='${fromPin},,${toPin}'`);

    parameters.push(p);
  });

  console.log(parameters);
  console.log(devicesStr);

  (async () => {
    g_startSimulatorButtonText.value = LaunchSimulator;
    g_startSimulatorButtonDisabled.value = true;
    g_blueprintModifyDisabled.value = true;

    g_machineControlClient = new WebSocket(MachineControlServerUrl);
    g_machineControlClient.onopen = async (ev) => {
      g_machineControlClient?.send(JSON.stringify({
        command: 'launch-arm',
        parameters: {
          model: 'vee-stm32f405',
          kernel: g_executable.value,
          devices: devicesStr,
          debug: g_executableDebug.value,
        },
      }));

      async function waitMachine(timeout: number)
      {
        return new Promise((res, rej) => {
          g_machineControlClient!.onmessage = (ev) => {

            let o = JSON.parse(ev.data);

            if (o.machineState) {
              switch (o.machineState) {
              case 'Error': rej(false); break;
              case 'Terminated': rej(false); break;
              case 'Booting': break;
              case 'Running': res(true); break;
              }
            }
          };

          setTimeout(() => {
            rej(false);
          }, timeout)
        });
      }

      try {
        await waitMachine(g_executableDebug.value ? 60e3 : 6e3);
      }
      catch {
        stopSimulator();

        return;
      }

      g_machineMessageClient = new WebSocket(MachineQmpServerUrl);

      let timer = setInterval(() => {
        if (g_machineMessageClient) {
          if (g_machineMessageClient.readyState === WebSocket.OPEN) {
            g_machineMessageClient.send(JSON.stringify({
              execute: "vee-ssd1306-get-pixel",
              arguments: {
                path: "/machine/peripheral/vee-display0"
              },
            }));
          }
        }
      }, 100);

      g_machineMessageClient.onopen = async (ev) => {
        g_startSimulatorButtonText.value = StopSimulator;
        g_startSimulatorButtonDisabled.value = false;
      };

      g_machineMessageClient.onmessage = (ev) => {
        // console.info(`get message from machine, len=${ev.data.length}`);
        if (ev.data.length < 256) {
          console.info(ev.data);
        }

        let o = JSON.parse(ev.data);

        if (o["return"] && o["return"]["pixel"]) {
          g_displayData.value = o["return"]["pixel"];
        }
      };

      g_machineMessageClient.onerror = (ev) => {
        console.error(`machine message client error`);

        alert(`仿真启动失败：无效的可执行文件`);

        clearInterval(timer);
        stopSimulator();
      };
      g_machineMessageClient.onclose = (ev) => {
        console.info(`machine message client close`);

        clearInterval(timer);
        stopSimulator();
      };

      // ########################################################

      g_machineSerialClient = new WebSocket(MachineSerialServerUrl);

      g_machineSerialClient.onopen = async (ev) => {
        emit('serialOut', '', false);
      };

      g_machineSerialClient.onmessage = (ev) => {
        // console.info(`machine serial data: `, ev.data);

        emit('serialOut', ev.data, true);
      };

      g_machineSerialClient.onerror = (ev) => {

      };
      g_machineSerialClient.onclose = (ev) => {

      };
    };

    g_machineControlClient.onerror = (ev) => {
      alert(`连接仿真服务失败`);

      stopSimulator();
    };
  })();
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
    simulatorStore.addIC(data.icType, x, y);
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
}

setInterval(() => {
  if (! activePin.value) {
    return;
  }

  let ele = document.getElementById(activePin.value.pinId);
  ele!.hidden = ! ele!.hidden;
  ele = document.getElementById(activePin.value.pinImgId);
  ele!.hidden = ! ele!.hidden;
}, 1000)

// 处理引脚点击
function handlePinClick(icId: string, pinImgId: string, pinId: string, pinAnchorId: string) {
  console.log(`canvas handlePinClick(${icId}, ${pinId})`);

  if (!activePin.value) {
    // 第一次点击，记录起点
    console.log(`canvas handlePinClick first click`);

    activePin.value = { icId, pinImgId, pinId, pinAnchorId };
  } else {
    console.log(`canvas handlePinClick second click`);

    let ele = document.getElementById(activePin.value.pinId);
    ele!.hidden = false;
    ele = document.getElementById(activePin.value.pinImgId);
    ele!.hidden = false;

    // 第二次点击，创建连线
    g_plumb?.connect({
      source: activePin.value.pinAnchorId,
      target: pinAnchorId,
      endpoint: ["Dot", { radius: 4 }],
      connector: "Bezier",
      anchors: ["Top", "Bottom"],
    });

    simulatorStore.createConnection({
      icId: activePin.value.icId,
      pinId: activePin.value.pinId,
    }, {
      icId: icId,
      pinId: pinId,
    });

    activePin.value = null;

    simulatorStore.selectElement(null, null);
  }
}

// 处理画布点击
function handleCanvasClick() {
  console.log(`handleCanvasClick`);

  simulatorStore.selectElement(null, null);
}

onMounted(() => {
  g_plumb = jsPlumb.getInstance({
    Container: canvasRef.value,
  });

  // setInterval(() => {console.log(simulatorStore.state)}, 8000);
});

</script>

<template>
  <div
    class="design-canvas"
    ref="canvasRef"
    @drop="handleDrop"
    @dragover="handleDragOver"
    @click="handleCanvasClick"
  >
    <!-- <GridBackground :scale="viewport.scale" />

    <svg class="connections-layer">
      <Connection
        v-for="conn in simulatorStore.state.connections"
        :key="conn.id"
        :path="calculateConnectionPath(conn)"
        :selected="simulatorStore.state.selectedElement.type === 'connection' &&
                  simulatorStore.state.selectedElement.id === conn.id"
        @click.stop="simulatorStore.selectElement('connection', conn.id)"
      />
    </svg> -->

    <button
      @click.stop="clearAll()"
      :disabled="g_blueprintModifyDisabled"
    >清除所有元素</button>

    <button
      @click.stop="loadExample()"
      :disabled="g_blueprintModifyDisabled"
    >加载示例图纸</button>

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

    <div
      :style="{ pointerEvents: g_blueprintModifyDisabled ? 'none' : 'auto' }"
      class="ics-container"
    >
      <ICComponent
        v-for="ic in simulatorStore.state.placedICs"
        :key="ic.id"
        :ic="ic"
        :display-data="g_displayData"
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
