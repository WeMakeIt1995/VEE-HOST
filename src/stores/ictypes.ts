import { type ICType } from '@/types/simulator';
import * as utility from '@/stores/utility';

export const icTypes: ICType[] = [
  {
    type: "MCU",
    id: 'STM32F405RGTx',
    name: 'STM32F405RGTx',
    qemuDeviceType: "vee-stm32f405",
    qemuDeviceId: "",
    category: 'MCU',
    width: 420,
    height: 420,
    image: utility.getSourcePath('/STM32F405RGTx.png'),
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
      if (typeof pin.chipId !== 'undefined') {
        return `/machine/soc/GPIO${pin.tag.substring(1, 2)}/pin${pin.tag.substring(2)}`;
      }
      return ``;
    },
  },

  {
    type: "MCU",
    id: 'STM32F103RETx',
    name: 'STM32F103RETx',
    qemuDeviceType: "vee-stm32f103",
    qemuDeviceId: "",
    category: 'MCU',
    width: 420,
    height: 420,
    image: utility.getSourcePath('/STM32F103RETx.png'),
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
      { tag: "VSS", type: "power" },
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
      { tag: "VSS", type: "power" },
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
      { tag: "PD1", type: "gpio", chipId: 3, num: 1 },
      { tag: "PD0", type: "gpio", chipId: 3, num: 0 },
      { tag: "PC15", type: "gpio", chipId: 2, num: 15 },
      { tag: "PC14", type: "gpio", chipId: 2, num: 14 },
      { tag: "PC13", type: "gpio", chipId: 2, num: 13 },
      { tag: "VBAT", type: "power" },
    ],
    getPinPathInQemuQom(qomId, pin, interfaces, interfacesQomId) {
      if (typeof pin.chipId !== 'undefined') {
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
    width: 370,
    height: 290,
    image: utility.getSourcePath('/SSD1306.png'),
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
      { tag: "SCK", type: "gpio", chipId: 0, num: 4 },
      { tag: "DC", type: "gpio", chipId: 0, num: 3 },
      { tag: "MOSI", type: "gpio", chipId: 0, num: 2 },
      { tag: "CS", type: "gpio", chipId: 0, num: 1 },
      { tag: "RST", type: "gpio", chipId: 0, num: 0 },
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
          return `'/machine/peripheral/${qomId}'`;
        },
      }
    ],

    stateAreaRect: {
      x: 6,
      y: 54,
      width: 280,
      height: 140,
    },

    stateFrame: 10,
    getStateCommand(qomId) {
      return `{ "execute": "vee-ssd1306-get-pixel", "arguments": { "path": "/machine/peripheral/${qomId}"} }`;
    },
    getInitStateHtml() {
      return `<div>No image</div>`
    },
    async onStateUpdateStateHtml(result, type) {
      return new Promise(async (res) => {
        let data = result['return']['pixel'];
        if (! data) {
          res(type.getInitStateHtml!());
          return;
        }

        const pixelWidth = 128;
        const pixelHeight = 64;

        let pixelBuffer = new Uint8ClampedArray(pixelWidth * pixelHeight * 4);
        for (let i = 0; i < pixelBuffer.length; i += 4) {
          pixelBuffer[i] = data[i / 4] ? 255 : 0;     // R
          pixelBuffer[i + 1] = 0;   // G
          pixelBuffer[i + 2] = 0;   // B
          pixelBuffer[i + 3] = 255; // A
        }

        // 1. 创建临时 canvas 绘制原始像素数据
        const srcCanvas = new OffscreenCanvas(pixelWidth, pixelHeight);
        const srcCtx = srcCanvas.getContext('2d');
        if (!srcCtx) {
          res(type.getInitStateHtml!());
          return;
        };

        const imageData = new ImageData(pixelBuffer, pixelWidth, pixelHeight);
        srcCtx.putImageData(imageData, 0, 0);

        // 2. 创建目标 canvas（280x140）并缩放绘制
        const destCanvas = new OffscreenCanvas(type.stateAreaRect!.width, type.stateAreaRect!.height);
        const destCtx = destCanvas.getContext('2d');
        if (!destCtx) {
          res(type.getInitStateHtml!());
          return;
        };

        // 关键：使用 drawImage 缩放
        destCtx.drawImage(srcCanvas, 0, 0, pixelWidth, pixelHeight, 0, 0, type.stateAreaRect!.width, type.stateAreaRect!.height);

        // 3. 转换为 Data URL 并赋值给 <img>
        const blob = await destCanvas.convertToBlob({ type: 'image/png' });
        const blobUrl = URL.createObjectURL(blob);

        console.log(`blobUrl=${blobUrl}`);

        res(`<div style="width: 100%; height: 100%; background-image: url('${encodeURI(blobUrl)}')" />`);

        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      });
    },

    // display: {
    //   left: 8 + 38,
    //   top: 18 + 38,
    //   width: 280,
    //   height: 140,
    //   pixelWidth: 128,
    //   pixelHeight: 64,
    // },
  },

  {
    type: "IC",
    id: 'LMX2594',
    name: 'LMX2594',
    qemuDeviceType: "vee-lmx2594",
    qemuDeviceId: "vee-lmx",
    category: 'IC',
    width: 270,
    height: 270,
    image: utility.getSourcePath('/LMX2594.png'),
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
      { tag: "SCK", type: "gpio", chipId: 0, num: 3 },
      { tag: "SDI", type: "gpio", chipId: 0, num: 2 },
      { tag: "MUXout", type: "gpio", chipId: 0, num: 1 },
      { tag: "CSB", type: "gpio", chipId: 0, num: 0 },
    ],
    leftPins: [
    ],

    stateFrame: 10,
    stateAreaRect: {
      x: 0,
      y: 120 + 40,
      width: 190,
      height: 80,
    },
    getStateCommand(qomId) {
      return `{ "execute": "vee-lmx2594-get-status", "arguments": { "path": "/machine/peripheral/${qomId}"} }`;
    },
    getInitStateHtml() {
      return `
        <div style="background: rgb(253, 246, 227)">
          <p>rfout-a: Invalid</p>
          <p>rfout-b: Invalid</p>
        </div>
        `;
    },
    async onStateUpdateStateHtml(result, type) {
      let rfouta = `Invalid`;
      let rfoutb = `Invalid`;

      if (result['return'] && result['return']['rfouta']) {
        rfouta = result['return']['rfouta-valid'] ? `${result['return']['rfouta']}` : rfouta;
      }
      if (result['return'] && result['return']['rfoutb']) {
        rfoutb = result['return']['rfoutb-valid'] ? `${result['return']['rfoutb']}` : rfoutb;
      }

      return Promise.resolve(
        `
        <div style="background: rgb(253, 246, 227)">
          <p>rfout-a: ${rfouta}</p>
          <p>rfout-b: ${rfoutb}</p>
        </div>
        `
      );
    },

    getPinPathInQemuQom(qomId, pin, interfaces, interfacesQomId) {
      switch (pin.tag) {
      case "CSB":     return `/machine/peripheral/${interfacesQomId[0]}/pin-cs`;
      case "MUXout":  return `/machine/peripheral/${interfacesQomId[0]}/pin-miso`;
      case "SDI":     return `/machine/peripheral/${interfacesQomId[0]}/pin-mosi`;
      case "SCK":     return `/machine/peripheral/${interfacesQomId[0]}/pin-sck`;
      }
      return ``;
    },

    communicationInterfaces: [
      {
        type: "vee-spi",
        getPathInQemuQom(qomId) {
          return `'/machine/peripheral/${qomId}'`;
        },
      }
    ],
  },
  {
    type: "IC",
    id: 'LED-RED',
    name: 'LED-RED',
    qemuDeviceType: "vee-led",
    qemuDeviceId: "vee-led",
    category: 'IC',
    width: 120,
    height: 120,
    image: utility.getSourcePath('/LED-off.png'),
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
      { tag: "VCC", type: "gpio", chipId: 0, num: 0 },
    ],
    leftPins: [
    ],

    stateFrame: 10,
    getStateCommand(qomId) {
      return `{ "execute": "vee-led-get-status", "arguments": { "path": "/machine/peripheral/${qomId}"} }`;
    },
    onStateUpdateImage(result, type) {
      if (result['return'] && result['return']['on']) {
        return utility.getSourcePath('/LED-red.png');
      }
      else {
        return type.image;
      }
    },

    getPinPathInQemuQom(qomId, pin, interfaces, interfacesQomId) {
      switch (pin.tag) {
      case "VCC":     return `/machine/peripheral/${qomId}/pin-power`;
      }
      return ``;
    },
  },
  {
    type: "IC",
    id: 'LED-BLUE',
    name: 'LED-BLUE',
    qemuDeviceType: "vee-led",
    qemuDeviceId: "vee-led",
    category: 'IC',
    width: 120,
    height: 120,
    image: utility.getSourcePath('/LED-off.png'),
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
      { tag: "VCC", type: "gpio", chipId: 0, num: 0 },
    ],
    leftPins: [
    ],

    stateFrame: 10,
    getStateCommand(qomId) {
      return `{ "execute": "vee-led-get-status", "arguments": { "path": "/machine/peripheral/${qomId}"} }`;
    },
    onStateUpdateImage(result, type) {
      if (result['return'] && result['return']['on']) {
        return utility.getSourcePath('/LED-blue.png');
      }
      else {
        return type.image;
      }
    },

    getPinPathInQemuQom(qomId, pin, interfaces, interfacesQomId) {
      switch (pin.tag) {
      case "VCC":     return `/machine/peripheral/${qomId}/pin-power`;
      }
      return ``;
    },
  },
  {
    type: "IC",
    id: 'LED-GREEN',
    name: 'LED-GREEN',
    qemuDeviceType: "vee-led",
    qemuDeviceId: "vee-led",
    category: 'IC',
    width: 120,
    height: 120,
    image: utility.getSourcePath('/LED-off.png'),
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
      { tag: "VCC", type: "gpio", chipId: 0, num: 0 },
    ],
    leftPins: [
    ],

    stateFrame: 10,
    getStateCommand(qomId) {
      return `{ "execute": "vee-led-get-status", "arguments": { "path": "/machine/peripheral/${qomId}"} }`;
    },
    onStateUpdateImage(result, type) {
      if (result['return'] && result['return']['on']) {
        return utility.getSourcePath('/LED-green.png');
      }
      else {
        return type.image;
      }
    },

    getPinPathInQemuQom(qomId, pin, interfaces, interfacesQomId) {
      switch (pin.tag) {
      case "VCC":     return `/machine/peripheral/${qomId}/pin-power`;
      }
      return ``;
    },
  },
];
