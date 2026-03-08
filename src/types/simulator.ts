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

export interface CommunicationInterface {
  type: "vee-spi",
  getPathInQemuQom: (qomId: any) => string,
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

  stateFrame?: number;
  stateAreaRect?: { x: number, y: number, width: number, height: number };
  getStateCommand?: (qomId: string) => string;
  getInitStateHtml?: () => string;
  onStateUpdateStateHtml?: (result: any, type: ICType) => Promise<string>;
  onStateUpdateImage?: (result: any, type: ICType) => string;

  getPinPathInQemuQom: (qomId: string, pin: PinDefinition, interfaces: CommunicationInterface[], interfacesQomId: string[]) => string;

  communicationInterfaces?: CommunicationInterface[];
}

export enum PinType {
  Power,
  Utility,
  Gpio,
};

export interface PinDefinition {
  tag: string;
  type: "power" | "utility" | "gpio";
  chipId?: number;
  num?: number;
}

export interface ICInstance {
  id: string;
  typeId: string;
  x: number;
  y: number;
  rotation: number;
  label: string,
  icType: ICType;
  properties: Record<string, any>;
  communicationInterfaces: string[];
  pinIdTable: Set<string>;
}

export interface ConnectionPoint {
  icId: string;
  pinId: string;
  isLinkPoint: boolean;
}

export interface Connection {
  id: string;
  from: ConnectionPoint;
  to: ConnectionPoint;
  vertices: {x: number, y: number}[];
}

export type ConnectionSegments = Connection[]

export interface SimulatorState {
  icTypes: ICType[];
  placedICs: ICInstance[];
  connections: ConnectionSegments[];
  selectedElement: {
    type: 'connection' | 'ic' | 'pin' | null;
    id: string | null;
  };
  activePin: string,
  serialOpen: boolean,
  serialOut: string,
}
