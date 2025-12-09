import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { type SimulatorState, type ICType, type ICInstance, type Connection, PinType, type PinDefinition } from '@/types/simulator.d.ts';

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export const useSimulatorStore = defineStore('simulator', () => {
  // 状态
  // const state = ref<SimulatorState>({
  //   icTypes: [
  //     {
  //       id: 'STM32F405RGTx',
  //       name: 'STM32F405RGTx',
  //       category: 'Logic',
  //       width: 400,
  //       height: 400,
  //       image: '/src/assets/STM32F405RGTx.png',
  //       pins: [
  //         { id: 'in1', name: 'IN1', type: 'input', position: 'left', order: 1 },
  //         { id: 'in2', name: 'IN2', type: 'input', position: 'left', order: 2 },
  //         { id: 'out', name: 'OUT', type: 'output', position: 'right', order: 1 }
  //       ]
  //     },
  //     // 更多IC类型...
  //   ],
  //   placedICs: [],
  //   connections: [],
  //   selectedElement: { type: null, id: null }
  // });

  let icTypes: ICType[] = [
    {
      type: "MCU",
      id: 'STM32F405RGTx',
      name: 'STM32F405RGTx',
      qemuDeviceType: "vee-stm32f405",
      qemuDeviceId: "",
      category: 'Logic',
      width: 348 + 38 + 38,
      height: 348 + 38 + 38,
      image: '/src/assets/STM32F405RGTx.png',
      topPinsPlaceConfig: {
        alignment: "center",
        gap: 0,
        padding: 0,
      },
      rightPinsPlaceConfig: {
        alignment: "center",
        gap: 0,
        padding: 0,
      },
      bottomPinsPlaceConfig: {
        alignment: "center",
        gap: 0,
        padding: 0,
      },
      leftPinsPlaceConfig: {
        alignment: "center",
        gap: 0,
        padding: 0,
      },
      topPins: [
        { tag: "VDD", type: "power" },
        { tag: "VSS", type: "power" },
        { tag: "PB9", type: "gpio", chipId: 1, num: 9 },
        { tag: "PB8", type: "gpio", chipId: 1, num: 8 },
        { tag: "BOOT0", type: "utility"},
        { tag: "PB7", type: "gpio", chipId: 1, num: 7 },
        { tag: "PB6", type: "gpio", chipId: 1, num: 6 },
        { tag: "PB5", type: "gpio", chipId: 1, num: 5 },
        { tag: "PB4", type: "gpio", chipId: 1, num: 4 },
        { tag: "PB3", type: "gpio", chipId: 1, num: 3 },
        { tag: "PD2", type: "gpio", chipId: 3, num: 2 },
        { tag: "PC12", type: "gpio", chipId: 2, num: 12 },
        { tag: "PC11", type: "gpio", chipId: 2, num: 11 },
        { tag: "PC10", type: "gpio", chipId: 2, num: 10 },
        { tag: "PA15", type: "gpio", chipId: 0, num: 15 },
        { tag: "PA14", type: "gpio", chipId: 0, num: 14 },
      ],
      rightPins: [
        { tag: "VDD", type: "power" },
        { tag: "VCAP_2", type: "power" },
        { tag: "PA13", type: "gpio",  chipId: 0, num: 13 },
        { tag: "PA12", type: "gpio", chipId: 0, num: 12 },
        { tag: "PA11", type: "gpio", chipId: 0, num: 11 },
        { tag: "PA10", type: "gpio", chipId: 0, num: 10 },
        { tag: "PA9", type: "gpio", chipId: 0, num: 9 },
        { tag: "PA8", type: "gpio", chipId: 0, num: 8 },
        { tag: "PC9", type: "gpio", chipId: 2, num: 9 },
        { tag: "PC8", type: "gpio", chipId: 2, num: 8 },
        { tag: "PC7", type: "gpio", chipId: 2, num: 7 },
        { tag: "PC6", type: "gpio", chipId: 2, num: 6 },
        { tag: "PB15", type: "gpio", chipId: 1, num: 15 },
        { tag: "PB14", type: "gpio", chipId: 1, num: 14 },
        { tag: "PB13", type: "gpio", chipId: 1, num: 13 },
        { tag: "PB12", type: "gpio", chipId: 1, num: 12 },
      ],
      bottomPins: [
        { tag: "VDD", type: "power" },
        { tag: "VCAP_1", type: "power" },
        { tag: "PB11", type: "gpio", chipId: 1, num: 11 },
        { tag: "PB10", type: "gpio", chipId: 1, num: 10 },
        { tag: "PB2", type: "gpio", chipId: 1, num: 2 },
        { tag: "PB1", type: "gpio", chipId: 1, num: 1 },
        { tag: "PB0", type: "gpio", chipId: 1, num: 0 },
        { tag: "PC5", type: "gpio", chipId: 2, num: 5 },
        { tag: "PC4", type: "gpio", chipId: 2, num: 4 },
        { tag: "PA7", type: "gpio", chipId: 0, num: 7 },
        { tag: "PA6", type: "gpio", chipId: 0, num: 6 },
        { tag: "PA5", type: "gpio", chipId: 0, num: 5 },
        { tag: "PA4", type: "gpio", chipId: 0, num: 4 },
        { tag: "VDD", type: "power" },
        { tag: "VSS", type: "power" },
        { tag: "PA3", type: "gpio", chipId: 0, num: 3 },
      ],
      leftPins: [
        { tag: "PA2", type: "gpio", chipId: 0, num: 2 },
        { tag: "PA1", type: "gpio", chipId: 0, num: 1 },
        { tag: "PA0_WKUP", type: "gpio", chipId: 0, num: 0 },
        { tag: "VDD", type: "power" },
        { tag: "VSSA", type: "power" },
        { tag: "PC3", type: "gpio", chipId: 2, num: 3 },
        { tag: "PC2", type: "gpio", chipId: 2, num: 2 },
        { tag: "PC1", type: "gpio", chipId: 2, num: 1 },
        { tag: "PC0", type: "gpio", chipId: 2, num: 0 },
        { tag: "NRST", type: "utility" },
        { tag: "PH1", type: "gpio", chipId: 7, num: 1 },
        { tag: "PH0", type: "gpio", chipId: 7, num: 0 },
        { tag: "PC15", type: "gpio", chipId: 2, num: 15 },
        { tag: "PC14", type: "gpio", chipId: 2, num: 14 },
        { tag: "PC13", type: "gpio", chipId: 2, num: 13 },
        { tag: "VBAT", type: "power" },
      ],
      getPinPathInQemuQom(qomId, pin, interfaces, interfacesQomId) {
        if (pin.chipId) {
          return `/machine/soc/GPIO${pin.tag.substring(1, 2)}/pin${pin.tag.substring(2)}`;
        }
        return ``;
      },
    },
    {
      type: "Display",
      id: 'SSD1306',
      name: 'SSD1306',
      qemuDeviceType: "vee-ssd1306",
      qemuDeviceId: "vee-display",
      category: 'Display',
      width: 300 + 38 + 38,
      height: 216 + 38 + 38,
      image: '/src/assets/SSD1306.png',
      topPinsPlaceConfig: {
        alignment: "center",
        gap: 0,
        padding: 0,
      },
      rightPinsPlaceConfig: {
        alignment: "center",
        gap: 0,
        padding: 0,
      },
      bottomPinsPlaceConfig: {
        alignment: "center",
        gap: 0,
        padding: 0,
      },
      leftPinsPlaceConfig: {
        alignment: "center",
        gap: 0,
        padding: 0,
      },
      topPins: [
      ],
      rightPins: [
      ],
      bottomPins: [
        { tag: "RST", type: "gpio", chipId: 0, num: 0 },
        { tag: "CS", type: "gpio", chipId: 0, num: 1 },
        { tag: "MOSI", type: "gpio", chipId: 0, num: 2 },
        { tag: "DC", type: "gpio", chipId: 0, num: 3 },
        { tag: "SCK", type: "gpio", chipId: 0, num: 4 },
      ],
      leftPins: [
      ],

      getPinPathInQemuQom(qomId, pin, interfaces, interfacesQomId) {
        switch (pin.tag) {
        case "RST":   return `/machine/peripheral/${qomId}/pin-rst`;
        case "CS":    return `/machine/peripheral/${interfacesQomId[0]}/pin-cs`;
        case "MOSI":  return `/machine/peripheral/${interfacesQomId[0]}/pin-mosi`;
        case "DC":    return `/machine/peripheral/${qomId}/pin-dc`;
        case "SCK":   return `/machine/peripheral/${interfacesQomId[0]}/pin-sck`;
        }
        return ``;
      },

      communicationInterfaces: [
        {
          type: "vee-spi",
          getPathInQemuQom(qomId) {
            return `/machine/peripheral/${qomId}`;
          },
        }
      ],

      display: {
        left: 8 + 38,
        top: 18 + 38,
        width: 280,
        height: 140,
        pixelWidth: 128,
        pixelHeight: 64,
      },
    },
  ];

  const state = ref<SimulatorState>({
    icTypes,
    placedICs: [],
    connections: [],
    selectedElement: { type: null, id: null },
  });

  function reset()
  {
    state.value = {
      icTypes,
      placedICs: [],
      connections: [],
      selectedElement: { type: null, id: null },
    };
  }

  // Getters
  const icCategories = computed(() => {
    const categories = new Set<string>();
    state.value.icTypes.forEach(ic => categories.add(ic.category));
    return Array.from(categories).map(cat => ({
      name: cat,
      children: state.value.icTypes.filter(ic => ic.category === cat)
    }));
  });

  const selectedIC = computed(() => {
    if (state.value.selectedElement.type !== 'ic') return null;
    return state.value.placedICs.find(ic => ic.id === state.value.selectedElement.id);
  });

  // Actions
  function addIC(typeId: string, x: number, y: number) {
    const icType = state.value.icTypes.find(ic => ic.id === typeId);
    if (!icType) return;

    const newIC: ICInstance = {
      id: `ic-${generateUUID()}`,
      typeId,
      x,
      y,
      rotation: 0,
      icType: icType,
      properties: {},
      communicationInterfaces: [],
    };

    state.value.placedICs.push(newIC);

    console.info(`push()`);

    selectElement('ic', newIC.id);
  }

  function createConnection(from: { icId: string; pinId: string }, to: { icId: string; pinId: string }) {
    const newConnection: Connection = {
      id: `conn-${generateUUID()}`,
      from,
      to
    };

    state.value.connections.push(newConnection);
    // selectElement('connection', newConnection.id);
  }

  function selectElement(type: 'ic' | 'connection' | null, id: string | null) {
    console.log(`selectElement(${type}, ${id})`);

    state.value.selectedElement = { type, id };
  }

  function deleteSelected() {
    if (!state.value.selectedElement.id) return;

    if (state.value.selectedElement.type === 'ic') {
      // 删除IC及其相关连线
      state.value.connections = state.value.connections.filter(
        conn => conn.from.icId !== state.value.selectedElement.id &&
               conn.to.icId !== state.value.selectedElement.id
      );
      state.value.placedICs = state.value.placedICs.filter(
        ic => ic.id !== state.value.selectedElement.id
      );
    } else if (state.value.selectedElement.type === 'connection') {
      state.value.connections = state.value.connections.filter(
        conn => conn.id !== state.value.selectedElement.id
      );
    }

    selectElement(null, null);
  }

  function createPinImageId(ic: ICInstance, pin: PinDefinition) {
    return `${ic.id}.${pin.tag}.image`;
  }

  function createPinId(ic: ICInstance, pin: PinDefinition) {
    return `${pin.tag}`;
  }

  function createPinAnchorId(ic: ICInstance, pin: PinDefinition) {
    return `${ic.id}.${pin.tag}.anchor`;
  }

  function getPinDefinitionFromTag(ic: ICInstance, tag: string) {
    for (let i in ic.icType.topPins) {
      if (ic.icType.topPins[i].tag === tag) {
          return ic.icType.topPins[i];
      }
    }
    for (let i in ic.icType.rightPins) {
      if (ic.icType.rightPins[i].tag === tag) {
          return ic.icType.rightPins[i];
      }
    }
    for (let i in ic.icType.bottomPins) {
      if (ic.icType.bottomPins[i].tag === tag) {
          return ic.icType.bottomPins[i];
      }
    }
    for (let i in ic.icType.leftPins) {
      if (ic.icType.leftPins[i].tag === tag) {
          return ic.icType.leftPins[i];
      }
    }
    return null;
  }

  return {
    state,
    reset,
    icCategories,
    selectedIC,
    addIC,
    createConnection,
    selectElement,
    deleteSelected,
    createPinImageId,
    createPinId,
    createPinAnchorId,
    getPinDefinitionFromTag,
  };
});
