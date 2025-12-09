// interface ICType {
//   id: string;
//   name: string;
//   category: string;
//   pins: PinDefinition[];
//   width: number;
//   height: number;
// }

// interface PinDefinition {
//   id: string;
//   name: string;
//   type: 'input' | 'output' | 'inout';
//   position: 'left' | 'right' | 'top' | 'bottom';
//   order: number;
// }

export interface PinsPlaceConfig {
  alignment: "center" | "left" | "right";
  gap: number;
  padding: number;
};

interface CommunicationInterface {
  type: "vee-spi",
  getPathInQemuQom: (qomId) => string,
}

export interface ICType {
  type: "IC" | "Display" | "MCU";
  id: string;
  name: string;
  qemuDeviceType: string,
  qemuDeviceId: string,
  category: string;
  topPinsPlaceConfig: PinsPlaceConfig;
  rightPinsPlaceConfig: PinsPlaceConfig;
  bottomPinsPlaceConfig: PinsPlaceConfig;
  leftPinsPlaceConfig: PinsPlaceConfig;
  topPins: PinDefinition[];
  rightPins: PinDefinition[];
  bottomPins: PinDefinition[];
  leftPins: PinDefinition[];
  width: number;
  height: number;
  image: string;

  getPinPathInQemuQom: (qomId: string, pin: PinDefinition, interfaces: CommunicationInterface[], interfacesQomId: string[]) => string;

  communicationInterfaces?: CommunicationInterface[];

  display?: {
    left: number,
    top: number,
    width: number,
    height: number,
    pixelWidth: number,
    pixelHeight: number,
  };
}

export enum PinType {
  Power,
  Utility,
  Gpio,
};

interface PinDefinition {
  tag: string;
  type: "power" | "utility" | "gpio";
  chipId?: number;
  num?: number;
}

interface ICInstance {
  id: string;
  typeId: string;
  x: number;
  y: number;
  rotation: number;
  icType: ICType;
  properties: Record<string, any>;
  communicationInterfaces: string[],
}

interface Connection {
  id: string;
  from: { icId: string; pinId: string };
  to: { icId: string; pinId: string };
}

interface SimulatorState {
  icTypes: ICType[];
  placedICs: ICInstance[];
  connections: Connection[];
  selectedElement: {
    type: 'ic' | 'connection' | null;
    id: string | null;
  };
}
