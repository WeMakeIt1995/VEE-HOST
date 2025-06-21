<script setup lang="ts">

console.info(`make IC`);

import { computed, inject, ref, reactive } from 'vue';
import type { ICInstance, ICType, PinDefinition } from '@/types/simulator';
import type { SimulatorStore } from '@/stores/simulator';
import { transform } from 'typescript';
import type { ComputedRef } from 'vue';

const mainImageLeft = ref(0);
const mainImageTop = ref(0);
const mainImageWidth = ref(0);
const mainImageHeight = ref(0);
const pinImgLoaded = ref(false);
const pinImageSize = ref({ width: 0, height: 0 });
const pinsHiddenStatus = reactive<boolean[]>([]);

const props = defineProps<{
  ic: ICInstance;
  selected: boolean;
}>();

const icType = props.ic.icType;

for (let i = 0; i < props.ic.icType.topPins.length; i ++) {
  pinsHiddenStatus.push(false);
}
for (let i = 0; i < props.ic.icType.rightPins.length; i ++) {
  pinsHiddenStatus.push(false);
}
for (let i = 0; i < props.ic.icType.bottomPins.length; i ++) {
  pinsHiddenStatus.push(false);
}
for (let i = 0; i < props.ic.icType.leftPins.length; i ++) {
  pinsHiddenStatus.push(false);
}

let lastSelectPinIdx: null | number = null;
let currentSelectPinIdx: null | number = lastSelectPinIdx;

setInterval(() => {
  if (currentSelectPinIdx !== null) {
    pinsHiddenStatus[currentSelectPinIdx] = ! pinsHiddenStatus[currentSelectPinIdx];
  }
}, 1000)

const emit = defineEmits<{
  (e: 'pin-click', icId: string, pinId: string): void;
  (e: 'click'): void;
}>();

// const simulatorStore = inject<SimulatorStore>('simulatorStore')!;

// const icType: ComputedRef<ICType> = computed(() => {
//   return simulatorStore.state.icTypes.find(t => t.id === props.ic.typeId);
// });

// function handlePinClick(pinId: string, event: MouseEvent) {
//   event.stopPropagation();
//   emit('pin-click', props.ic.id, pinId);
// }

function handlePinClick(idx: number) {
  console.log(`last select pin ${lastSelectPinIdx}, current select pin ${idx}`)

  if (idx !== lastSelectPinIdx && lastSelectPinIdx !== null) {
    pinsHiddenStatus[lastSelectPinIdx] = false;
  }
  currentSelectPinIdx = idx;
  lastSelectPinIdx = currentSelectPinIdx;
}

function getPinImage(pin: PinDefinition) {
  switch(pin.type) {
    case 'power':   return "src/assets/pale-pin.png";
    case 'utility': return "src/assets/chartreuse-pin.png";
    case 'gpio':    return "src/assets/gray-pin.png";
  }
}

const pinImg = new Image();
pinImg.src = "src/assets/blue-pin.png";

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

function getTopPinStyle(pin: PinDefinition, idx: number) {
  switch (icType.topPinsPlaceConfig.alignment) {
    case "center": {
      return {
        position: 'absolute',
        width: pinImg.width + 'px',
        height: pinImg.height + 'px',
        left: icType.width / 2 -
              icType.topPins.length / 2 * (pinImg.height + icType.topPinsPlaceConfig.gap) +
              idx * (pinImg.height + icType.topPinsPlaceConfig.gap) -
              1 +
              'px',
        top: pinImg.width - 1 + 'px',
        transform: 'rotate(-90deg)',
        transformOrigin: 'left top',
      };
    }

    case 'left': {
      return {
        position: 'absolute',
        width: pinImg.width + 'px',
        height: pinImg.height + 'px',
        left: pinImg.width + icType.topPinsPlaceConfig.padding +
              idx * (pinImg.height + icType.topPinsPlaceConfig.gap) -
              1 +
              'px',
        top: pinImg.width + 'px',
        transform: 'rotate(-90deg)',
        transformOrigin: 'left top',
      };
    }

    case 'right': {
      return {
        position: 'absolute',
        width: pinImg.width + 'px',
        height: pinImg.height + 'px',
        left: icType.width - pinImg.width - pinImg.height - icType.topPinsPlaceConfig.padding -
              (icType.topPins.length - 1 - idx) * (pinImg.height + icType.topPinsPlaceConfig.gap) -
              1 +
              'px',
        top: pinImg.width + 'px',
        transform: 'rotate(-90deg)',
        transformOrigin: 'left top',
      };
    }
  }
}

function getRightPinStyle(pin: PinDefinition, idx: number) {
  switch (icType.rightPinsPlaceConfig.alignment) {
    case "center": {
      return {
        position: 'absolute',
        width: pinImg.width + 'px',
        height: pinImg.height + 'px',
        left: icType.width - pinImg.width - 1 + 'px',
        top:  icType.height / 2 -
              icType.rightPins.length / 2 * (pinImg.height + icType.rightPinsPlaceConfig.gap) +
              idx * (pinImg.height + icType.rightPinsPlaceConfig.gap) -
              1 +
              'px',
        transform: 'rotate(0deg)',
        transformOrigin: 'left top',
      };
    }

    case 'left': {
      return {
        position: 'absolute',
        width: pinImg.width + 'px',
        height: pinImg.height + 'px',
        left: icType.width - pinImg.width - 1 + 'px',
        top:  pinImg.width + icType.rightPinsPlaceConfig.padding +
              idx * (pinImg.height + icType.rightPinsPlaceConfig.gap) -
              1 +
              'px',
        transform: 'rotate(0deg)',
        transformOrigin: 'left top',
      };
    }

    case 'right': {
      return {
        position: 'absolute',
        width: pinImg.width + 'px',
        height: pinImg.height + 'px',
        left: icType.width - pinImg.width - 1 + 'px',
        top:  icType.height - pinImg.width - pinImg.height - icType.rightPinsPlaceConfig.padding -
              (icType.rightPins.length - 1 - idx) * (pinImg.height + icType.rightPinsPlaceConfig.gap) -
              1 +
              'px',
        transform: 'rotate(0deg)',
        transformOrigin: 'left top',
      };
    }
  }
}

function getBottomPinStyle(pin: PinDefinition, idx: number) {
  switch (icType.bottomPinsPlaceConfig.alignment) {
    case "center": {
      return {
        position: 'absolute',
        width: pinImg.width + 'px',
        height: pinImg.height + 'px',
        left: icType.width / 2 -
              icType.topPins.length / 2 * (pinImg.height + icType.bottomPinsPlaceConfig.gap) +
              idx * (pinImg.height + icType.bottomPinsPlaceConfig.gap) -
              1 +
              'px',
        top: icType.height - 1 + 'px',
        transform: 'rotate(-90deg)',
        transformOrigin: 'left top',
      };
    }

    case 'left': {
      return {
        position: 'absolute',
        width: pinImg.width + 'px',
        height: pinImg.height + 'px',
        left: icType.width - pinImg.width - pinImg.height - icType.bottomPinsPlaceConfig.padding -
              idx * (pinImg.height + icType.bottomPinsPlaceConfig.gap) -
              1 +
              'px',
        top: icType.height - 1 + 'px',
        transform: 'rotate(-90deg)',
        transformOrigin: 'left top',
      };
    }

    case 'right': {
      return {
        position: 'absolute',
        width: pinImg.width + 'px',
        height: pinImg.height + 'px',
        left: pinImg.width + icType.bottomPinsPlaceConfig.padding +
              idx * (pinImg.height + icType.bottomPinsPlaceConfig.gap) -
              1 +
              'px',
        top: icType.height - 1 + 'px',
        transform: 'rotate(-90deg)',
        transformOrigin: 'left top',
      };
    }
  }
}

function getLeftPinStyle(pin: PinDefinition, idx: number) {
  switch (icType.leftPinsPlaceConfig.alignment) {
    case "center": {
      return {
        position: 'absolute',
        width: pinImg.width + 'px',
        height: pinImg.height + 'px',
        left: 0 - 1 + 'px',
        top:  icType.height / 2 +
              icType.topPins.length / 2 * (pinImg.height + icType.leftPinsPlaceConfig.gap) -
              (idx + 1) * (pinImg.height + icType.leftPinsPlaceConfig.gap) -
              1 +
              'px',
        transform: 'rotate(0deg)',
        transformOrigin: 'left top',
      };
    }

    case 'left': {
      return {
        position: 'absolute',
        width: pinImg.width + 'px',
        height: pinImg.height + 'px',
        left: 0 - 1 + 'px',
        top:  icType.height - pinImg.width - icType.leftPinsPlaceConfig.padding -
              (idx + 1) * (pinImg.height + icType.leftPinsPlaceConfig.gap) -
              1 +
              'px',
        transform: 'rotate(0deg)',
        transformOrigin: 'left top',
      };
    }

    case 'right': {
      return {
        position: 'absolute',
        width: pinImg.width + 'px',
        height: pinImg.height + 'px',
        left: 0 - 1 + 'px',
        top:  pinImg.width + icType.leftPinsPlaceConfig.padding +
              (icType.rightPins.length - 1 - idx) * (pinImg.height + icType.leftPinsPlaceConfig.gap) -
              1 +
              'px',
        transform: 'rotate(0deg)',
        transformOrigin: 'left top',
      };
    }
  }
}

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
    v-if="pinImgLoaded"
    v-for="(pin, idx) in icType.topPins"
    :src="getPinImage(pin)"
    :style="getTopPinStyle(pin, idx)"
    :hidden="pinsHiddenStatus[idx]"
  >
    <div
      v-for="(pin, idx) in icType.topPins"
      class="pin-tag pin-img"
      :title="pin.tag"
      :style="getTopPinStyle(pin, idx)"
      :hidden="pinsHiddenStatus[idx]"
      @click="handlePinClick(idx)"
    >
      {{ pin.tag }}
    </div>
  </img>

  <img
    v-if="pinImgLoaded"
    v-for="(pin, idx) in icType.rightPins"
    :src="getPinImage(pin)"
    :style="getRightPinStyle(pin, idx)"
    :hidden="pinsHiddenStatus[icType.topPins.length + idx]"
  >
    <div
      v-if="pinImgLoaded"
      v-for="(pin, idx) in icType.rightPins"
      class="pin-tag pin-img"
      :title="pin.tag"
      :style="getRightPinStyle(pin, idx)"
      :hidden="pinsHiddenStatus[icType.topPins.length + idx]"
    >
      {{ pin.tag }}
    </div>
  </img>

  <img
    v-if="pinImgLoaded"
    v-for="(pin, idx) in icType.bottomPins"
    :src="getPinImage(pin)"
    :style="getBottomPinStyle(pin, idx)"
    :hidden="pinsHiddenStatus[icType.topPins.length + icType.rightPins.length + idx]"
  >
    <div
      v-if="pinImgLoaded"
      v-for="(pin, idx) in icType.bottomPins"
      class="pin-tag pin-img"
      :title="pin.tag"
      :style="getBottomPinStyle(pin, idx)"
      :hidden="pinsHiddenStatus[icType.topPins.length + icType.rightPins.length + idx]"
    >
      {{ pin.tag }}
    </div>
  </img>

  <img
    v-if="pinImgLoaded"
    v-for="(pin, idx) in icType.leftPins"
    :src="getPinImage(pin)"
    :style="getLeftPinStyle(pin, idx)"
    :hidden="pinsHiddenStatus[icType.topPins.length + icType.rightPins.length + icType.bottomPins.length + idx]"
  >
    <div
      v-if="pinImgLoaded"
      v-for="(pin, idx) in icType.leftPins"
      class="pin-tag pin-img"
      :title="pin.tag"
      :style="getLeftPinStyle(pin, idx)"
      :hidden="pinsHiddenStatus[icType.topPins.length + icType.rightPins.length + icType.bottomPins.length + idx]"
      @click="handlePinClick(icType.topPins.length + icType.rightPins.length + icType.bottomPins.length + idx)"
    >
      {{ pin.tag }}
    </div>
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
