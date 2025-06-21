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

export interface ICType {
  id: string;
  name: string;
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
