<script setup lang="ts">

console.info(`make IC`);

import { computed, inject, ref, reactive, watch } from 'vue';
import type { ICInstance, ICType, PinDefinition } from '@/types/simulator';
import type { useSimulatorStore } from '@/stores/simulator';
import { transform } from 'typescript';
import type { ComputedRef, StyleValue } from 'vue';
import { onMounted } from 'vue';
import * as utility from '@/stores/utility';

const mainImageLeft = ref(0);
const mainImageTop = ref(0);
const mainImageWidth = ref(0);
const mainImageHeight = ref(0);
const pinImgLoaded = ref(false);
const pinImageSize = ref({ width: 0, height: 0 });

const props = defineProps<{
  ic: ICInstance;
  selected: boolean;
  displayData: number[];
}>();

const icType = props.ic.icType;

const emit = defineEmits<{
  (e: 'pin-click', icId: string, pinImgId: string, pinId: string, pinAnchorId: string): void;
  (e: 'click'): void;
}>();

const displaySrc = ref<string>("");

const simulatorStore = inject<ReturnType<typeof useSimulatorStore>>('simulatorStore')!;

// const icType: ComputedRef<ICType> = computed(() => {
//   return simulatorStore.state.icTypes.find(t => t.id === props.ic.typeId);
// });

// function handlePinClick(pinId: string, event: MouseEvent) {
//   event.stopPropagation();
//   emit('pin-click', props.ic.id, pinId);
// }

function createPinImageId(ic: ICInstance, pin: PinDefinition)
{
  return simulatorStore.createPinImageId(ic, pin);
}

function createPinId(ic: ICInstance, pin: PinDefinition)
{
  return simulatorStore.createPinId(ic, pin);
}

function createPinAnchorId(ic: ICInstance, pin: PinDefinition)
{
  return simulatorStore.createPinAnchorId(ic, pin);
}

function handlePinClick(idx: number, pin: PinDefinition, event: MouseEvent) {
  event.stopPropagation();

  emit('pin-click', props.ic.id, createPinImageId(props.ic, pin), createPinId(props.ic, pin), createPinAnchorId(props.ic, pin));
}

function getPinImage(pin: PinDefinition) {
  switch(pin.type) {
    case 'power':   return utility.getSourcePath("/pale-pin.png");
    case 'utility': return utility.getSourcePath("/chartreuse-pin.png");
    case 'gpio':    return utility.getSourcePath("/gray-pin.png");
  }
}

const pinImg = new Image();
pinImg.src = utility.getSourcePath("/blue-pin.png");

pinImg.onload = () => {
  console.log(`load pin image ok`);

  pinImgLoaded.value = true;

  pinImageSize.value = {
    width: pinImg.width,
    height: pinImg.height,
  };

  mainImageWidth.value = icType.width - 2 * pinImg.width;
  mainImageHeight.value = icType.height - 2 * pinImg.width;
  mainImageLeft.value = pinImg.width - 1;
  mainImageTop.value = pinImg.width - 1;
};

pinImg.onerror = (error) => {
  console.log(`load pin image faild`);
};

function getDisplayStyle() : StyleValue {
  return {
    position: 'absolute',
    width: props.ic.icType.display?.width + 'px',
    height: props.ic.icType.display?.height + 'px',
    left: props.ic.icType.display?.left + 'px',
    top: props.ic.icType.display?.top + 'px',
  }
}

function getTopPinStyle(ic: ICInstance, pin: PinDefinition, idx: number) : StyleValue {
  let left = 0;
  let top = 0;

  switch (icType.topPinsPlaceConfig.alignment) {
    case "center": {
      left = icType.width / 2 -
            icType.topPins.length / 2 * (pinImg.height + icType.topPinsPlaceConfig.gap) +
            idx * (pinImg.height + icType.topPinsPlaceConfig.gap) - 1;
      top = pinImg.width - 1;
    } break;

    case 'left': {
      left = pinImg.width + icType.topPinsPlaceConfig.padding +
            idx * (pinImg.height + icType.topPinsPlaceConfig.gap) - 1;
      top = pinImg.width;
    } break;

    case 'right': {
        left = icType.width - pinImg.width - pinImg.height - icType.topPinsPlaceConfig.padding -
              (icType.topPins.length - 1 - idx) * (pinImg.height + icType.topPinsPlaceConfig.gap) - 1;
        top = pinImg.width;
    } break;
  }

  return {
    position: 'absolute',
    width: pinImg.width + 'px',
    height: pinImg.height + 'px',
    left: left + 'px',
    top: top + 'px',
    transform: 'rotate(-90deg)',
    transformOrigin: 'left top',
  };
}

function getTopPinAnchorStyle(ic: ICInstance, pin: PinDefinition, idx: number) : StyleValue {
  let s = getTopPinStyle(ic, pin, idx)

  return {
    position: 'absolute',
    width: '0px',
    height: '0px',
    left: parseInt((s as any).left) + pinImg.height / 2 + 'px',
    top: parseInt((s as any).top) - pinImg.width + 'px',
    opacity: '0',
  };
}

function getRightPinStyle(ic: ICInstance, pin: PinDefinition, idx: number) : StyleValue {
  let left = 0;
  let top = 0;

  switch (icType.topPinsPlaceConfig.alignment) {
    case "center": {
      left = icType.width - pinImg.width - 1;
      top = icType.height / 2 -
            icType.rightPins.length / 2 * (pinImg.height + icType.rightPinsPlaceConfig.gap) +
            idx * (pinImg.height + icType.rightPinsPlaceConfig.gap) - 1;
    } break;

    case 'left': {
      left = icType.width - pinImg.width - 1;
      top = pinImg.width + icType.rightPinsPlaceConfig.padding +
            idx * (pinImg.height + icType.rightPinsPlaceConfig.gap) - 1;
    } break;

    case 'right': {
      left = icType.width - pinImg.width - 1;
      top = icType.height - pinImg.width - pinImg.height - icType.rightPinsPlaceConfig.padding -
            (icType.rightPins.length - 1 - idx) * (pinImg.height + icType.rightPinsPlaceConfig.gap) - 1;
    } break;
  }

  return {
    position: 'absolute',
    width: pinImg.width + 'px',
    height: pinImg.height + 'px',
    left: left + 'px',
    top: top + 'px',
    transform: 'rotate(0deg)',
    transformOrigin: 'left top',
  };
}

function getRightPinAnchorStyle(ic: ICInstance, pin: PinDefinition, idx: number) : StyleValue {
  let s = getRightPinStyle(ic, pin, idx)

  return {
    position: 'absolute',
    width: '0px',
    height: '0px',
    left: parseInt((s as any).left) + pinImg.width + 'px',
    top: parseInt((s as any).top) + pinImg.height / 2 + 'px',
    opacity: '0',
  };
}

function getBottomPinStyle(ic: ICInstance, pin: PinDefinition, idx: number) : StyleValue {
  let left = 0;
  let top = 0;

  switch (icType.topPinsPlaceConfig.alignment) {
    case "center": {
      left = icType.width / 2 -
             icType.topPins.length / 2 * (pinImg.height + icType.bottomPinsPlaceConfig.gap) +
             idx * (pinImg.height + icType.bottomPinsPlaceConfig.gap) - 1;
      top = icType.height - 1;
    } break;

    case 'left': {
      left = icType.width - pinImg.width - pinImg.height - icType.bottomPinsPlaceConfig.padding -
              idx * (pinImg.height + icType.bottomPinsPlaceConfig.gap) - 1;
      top = icType.height - 1;
    } break;

    case 'right': {
      left = pinImg.width + icType.bottomPinsPlaceConfig.padding +
             idx * (pinImg.height + icType.bottomPinsPlaceConfig.gap) - 1;
      top = icType.height - 1;
    } break;
  }

  return {
    position: 'absolute',
    width: pinImg.width + 'px',
    height: pinImg.height + 'px',
    left: left + 'px',
    top: top + 'px',
    transform: 'rotate(-90deg)',
    transformOrigin: 'left top',
  };
}

function getBottomPinAnchorStyle(ic: ICInstance, pin: PinDefinition, idx: number) : StyleValue {
  let s = getBottomPinStyle(ic, pin, idx)

  return {
    position: 'absolute',
    width: '0px',
    height: '0px',
    left: parseInt((s as any).left) + pinImg.height / 2 + 'px',
    top: parseInt((s as any).top) + 'px',
    opacity: '0',
  };
}

function getLeftPinStyle(ic: ICInstance, pin: PinDefinition, idx: number) : StyleValue {
  let left = 0;
  let top = 0;

  switch (icType.topPinsPlaceConfig.alignment) {
    case "center": {
      left = 0 - 1;
      top = icType.height / 2 +
            icType.topPins.length / 2 * (pinImg.height + icType.leftPinsPlaceConfig.gap) -
            (idx + 1) * (pinImg.height + icType.leftPinsPlaceConfig.gap) - 1;
    } break;

    case 'left': {
      left = 0 - 1;
      top =  icType.height - pinImg.width - icType.leftPinsPlaceConfig.padding -
             (idx + 1) * (pinImg.height + icType.leftPinsPlaceConfig.gap) - 1;
    } break;

    case 'right': {
      left = 0 - 1;
      top = pinImg.width + icType.leftPinsPlaceConfig.padding +
           (icType.rightPins.length - 1 - idx) * (pinImg.height + icType.leftPinsPlaceConfig.gap) - 1;
    } break;
  }

  return {
    position: 'absolute',
    width: pinImg.width + 'px',
    height: pinImg.height + 'px',
    left: left + 'px',
    top: top + 'px',
    transform: 'rotate(0deg)',
    transformOrigin: 'left top',
  };
}

function getLeftPinAnchorStyle(ic: ICInstance, pin: PinDefinition, idx: number) : StyleValue {
  let s = getLeftPinStyle(ic, pin, idx)

  return {
    position: 'absolute',
    width: '0px',
    height: '0px',
    left: parseInt((s as any).left) + 'px',
    top: parseInt((s as any).top) + pinImg.height / 2 + 'px',
    opacity: '0',
  };
}

onMounted(async () => {
  let icType = props.ic.icType;

  if (icType.display) {
    watch(() => props.displayData, async (val) => {
      console.log(`display data changed`);

      if (icType.display) {
        let pixelBuffer = new Uint8ClampedArray(icType.display.pixelWidth * icType.display.pixelHeight * 4);
        for (let i = 0; i < pixelBuffer.length; i += 4) {
          pixelBuffer[i] = val[i / 4] ? 255 : 0;     // R
          pixelBuffer[i + 1] = 0;   // G
          pixelBuffer[i + 2] = 0;   // B
          pixelBuffer[i + 3] = 255; // A
        }

        // 1. 创建临时 canvas 绘制原始像素数据
        const srcCanvas = new OffscreenCanvas(icType.display.pixelWidth, icType.display.pixelHeight);
        const srcCtx = srcCanvas.getContext('2d');
        if (!srcCtx) return;

        const imageData = new ImageData(pixelBuffer, icType.display.pixelWidth, icType.display.pixelHeight);
        srcCtx.putImageData(imageData, 0, 0);

        // 2. 创建目标 canvas（280x140）并缩放绘制
        const destCanvas = new OffscreenCanvas(icType.display.width, icType.display.height);
        const destCtx = destCanvas.getContext('2d');
        if (!destCtx) return;

        // 关键：使用 drawImage 缩放
        destCtx.drawImage(srcCanvas, 0, 0, icType.display.pixelWidth, icType.display.pixelHeight, 0, 0, icType.display.width, icType.display.height);

        // 3. 转换为 Data URL 并赋值给 <img>
        const blob = await destCanvas.convertToBlob({ type: 'image/png' });
        displaySrc.value = URL.createObjectURL(blob);
      }
    });

    let pixelBuffer = new Uint8ClampedArray(icType.display.pixelWidth * icType.display.pixelHeight * 4);
    for (let i = 0; i < pixelBuffer.length; i += 4) {
      pixelBuffer[i] = 255;     // R
      pixelBuffer[i + 1] = 0;   // G
      pixelBuffer[i + 2] = 0;   // B
      pixelBuffer[i + 3] = 255; // A
    }

    // 1. 创建临时 canvas 绘制原始像素数据
    const srcCanvas = new OffscreenCanvas(icType.display.pixelWidth, icType.display.pixelHeight);
    const srcCtx = srcCanvas.getContext('2d');
    if (!srcCtx) return;

    const imageData = new ImageData(pixelBuffer, icType.display.pixelWidth, icType.display.pixelHeight);
    srcCtx.putImageData(imageData, 0, 0);

    // 2. 创建目标 canvas（280x140）并缩放绘制
    const destCanvas = new OffscreenCanvas(icType.display.width, icType.display.height);
    const destCtx = destCanvas.getContext('2d');
    if (!destCtx) return;

    // 关键：使用 drawImage 缩放
    destCtx.drawImage(srcCanvas, 0, 0, icType.display.pixelWidth, icType.display.pixelHeight, 0, 0, icType.display.width, icType.display.height);

    // 3. 转换为 Data URL 并赋值给 <img>
    const blob = await destCanvas.convertToBlob({ type: 'image/png' });
    displaySrc.value = URL.createObjectURL(blob);
  }
})

</script>

<template>
  <div
    class="ic-component"
    :style="{
      left: `${ic.x}px`,
      top: `${ic.y}px`,
      width: `${icType?.width}px`,
      height: `${icType?.height}px`,
    }"
  >
  <!-- @click.stop="emit('click')" -->

  <img
    :src="icType.image"
    class="ic-img"
    :title="icType.name"
    :style="{
      position: 'relative',
      left: mainImageLeft + 'px',
      top: mainImageTop + 'px',
      width: mainImageWidth + 'px',
      height: mainImageHeight + 'px',
    }"
  />

  <img
    v-if="icType.type === 'Display'"
    :src="displaySrc"
    :style="getDisplayStyle()"
  />

  <img
    v-if="pinImgLoaded"
    v-for="(pin, idx) in icType.topPins"
    :id="createPinImageId(ic, pin)"
    :src="getPinImage(pin)"
    :style="getTopPinStyle(ic, pin, idx)"
  >
    <div
      v-for="(pin, idx) in icType.topPins"
      class="pin-tag pin-img"
      :id="createPinId(ic, pin)"
      :title="pin.tag"
      :style="getTopPinStyle(ic, pin, idx)"
      @click="handlePinClick(idx, pin, $event)"
    >
      {{ pin.tag }}
    </div>

    <div
      v-if="pinImgLoaded"
      v-for="(pin, idx) in icType.topPins"
      :id="createPinAnchorId(ic, pin)"
      :style="getTopPinAnchorStyle(ic, pin, idx)"
    />
  </img>

  <img
    v-if="pinImgLoaded"
    v-for="(pin, idx) in icType.rightPins"
    :id="createPinImageId(ic, pin)"
    :src="getPinImage(pin)"
    :style="getRightPinStyle(ic, pin, idx)"
  >
    <div
      v-if="pinImgLoaded"
      v-for="(pin, idx) in icType.rightPins"
      class="pin-tag pin-img"
      :id="createPinId(ic, pin)"
      :title="pin.tag"
      :style="getRightPinStyle(ic, pin, idx)"
      @click="handlePinClick(icType.topPins.length + idx, pin, $event)"
    >
      {{ pin.tag }}
    </div>

    <div
      v-if="pinImgLoaded"
      v-for="(pin, idx) in icType.rightPins"
      :id="createPinAnchorId(ic, pin)"
      :style="getRightPinAnchorStyle(ic, pin, idx)"
    />
  </img>

  <img
    v-if="pinImgLoaded"
    v-for="(pin, idx) in icType.bottomPins"
    :id="createPinImageId(ic, pin)"
    :src="getPinImage(pin)"
    :style="getBottomPinStyle(ic, pin, idx)"
  >
    <div
      v-if="pinImgLoaded"
      v-for="(pin, idx) in icType.bottomPins"
      class="pin-tag pin-img"
      :id="createPinId(ic, pin)"
      :title="pin.tag"
      :style="getBottomPinStyle(ic, pin, idx)"
      @click="handlePinClick(icType.topPins.length + icType.rightPins.length + idx, pin, $event)"
    >
      {{ pin.tag }}
    </div>

    <div
      v-if="pinImgLoaded"
      v-for="(pin, idx) in icType.bottomPins"
      :id="createPinAnchorId(ic, pin)"
      :style="getBottomPinAnchorStyle(ic, pin, idx)"
    />
  </img>

  <img
    v-if="pinImgLoaded"
    v-for="(pin, idx) in icType.leftPins"
    :id="createPinImageId(ic, pin)"
    :src="getPinImage(pin)"
    :style="getLeftPinStyle(ic, pin, idx)"
  >
    <div
      v-if="pinImgLoaded"
      v-for="(pin, idx) in icType.leftPins"
      class="pin-tag pin-img"
      :id="createPinId(ic, pin)"
      :title="pin.tag"
      :style="getLeftPinStyle(ic, pin, idx)"
      @click="handlePinClick(icType.topPins.length + icType.rightPins.length + icType.bottomPins.length + idx, pin, $event)"
    >
      {{ pin.tag }}
    </div>

    <div
      v-if="pinImgLoaded"
      v-for="(pin, idx) in icType.leftPins"
      :id="createPinAnchorId(ic, pin)"
      :style="getLeftPinAnchorStyle(ic, pin, idx)"
    />
  </img>

  </div>
</template>

<style scoped>

.ic-component {
  position: absolute;
  border: 1px dashed rgba(128, 128, 128, 64);
  border-radius: 8px;
  /* cursor: pointer; */
  transition: all 0.2s;
  transform-origin: center;
  padding: 0 0 0 0;
}

.ic-img {
  cursor: pointer;
  padding: 0 0 0 0;
}

.pin-img {
  cursor: pointer;
  padding: 0 0 0 0;
}

.pin-tag {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  font-size: 12px;
  text-indent: 2px;
  font-family: 'Courier New', Courier, monospace;
}

</style>
