import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { type CommunicationInterface, type SimulatorState, type ICType, type ICInstance, type Connection, PinType, type PinDefinition, type PinsPlaceConfig, type ConnectionPoint, type ConnectionSegments } from '@/types/simulator';
import { icTypes as g_icTypes } from './ictypes';
import * as utility from '@/stores/utility';
import * as joint from '@joint/core';
import {
  type Segment,
  areSegmentsParallel,
  distanceBetweenParallelSegments,
  getTurnAngle,
  findIntersectionAfterTranslation,
  getSideShiftTranslation,
  segmentLengthSquared,
  pointToPolygonDistance,
} from './papertools';

class FrameEmiter
{
  timer: number | null = null;
  works: (() => void)[] = [];
  promiseResolves: ((r: boolean) => void)[] = [];
  worksDoneResolve: ((r: any) => void) | null = null;
  enable = true;
  rateVal: number = 33;

  constructor()
  {

  }

  setEnable(state: boolean) {
    this.enable = state;
  }

  hasWork() {
    return this.works.length || this.promiseResolves.length;
  }

  waitWorksDone() {
    if (this.hasWork()) {
      return new Promise((res) => this.worksDoneResolve = res);
    }
    else {
      return Promise.resolve(true);
    }
  }

  private _doWork() {
    const f = this.works.pop();
    f && f();
    this.works = [];
    this.timer = null;

    if (! this.enable && this.worksDoneResolve) {
      this.worksDoneResolve(true);
      this.worksDoneResolve = null;
    }
  }

  rate(val: number) {
    this.timer !== null && clearTimeout(this.timer);
    this.rateVal = val;
    if (this.works.length) {
      this.timer = setTimeout(this._doWork.bind(this), this.rateVal);
    }
    else if (this.promiseResolves.length) {
      this.timer = setTimeout(this._doPromise.bind(this), this.rateVal);
    }
  }

  emitWork(f: () => void) {
    if (! this.enable) {
      return;
    }

    this.works.push(f);
    if (this.timer !== null) {
      return;
    }
    this.timer = setTimeout(this._doWork.bind(this), this.rateVal);
  }

  private _doPromise() {
    const f = this.promiseResolves.pop();
    f && f(true);

    for (const item of this.promiseResolves) {
      item(false);
    }

    this.promiseResolves = [];
    this.timer = null;

    if (! this.enable && this.worksDoneResolve) {
      this.worksDoneResolve(true);
      this.worksDoneResolve = null;
    }
  }

  emitPromise() {
    if (! this.enable) {
      console.log(`cannot emit promise`);
      return Promise.resolve(false);
    }

    if (this.timer === null) {
      this.timer = setTimeout(this._doPromise.bind(this), this.rateVal);
    }
    return new Promise((res) => this.promiseResolves.push(res));
  }
};

const JointHtmlElement = joint.dia.Element.define('html-element',
  {
    attrs: {
        foreignObject: {
            width: 'calc(w)',
            height: 'calc(h)'
        }
    }
  },
  {
    markup: joint.util.svg/* xml */`
        <foreignObject @selector="foreignObject">
            <div style="background: white">
                tttttttttttttttttttttttttttt
            </div>
        </foreignObject>
    `
  }
);

const g_pinImg = new Image();
g_pinImg.src = utility.getSourcePath("/blue-pin.png");

g_pinImg.onload = () => {
  console.log(`load pin image ok`, { width: g_pinImg.width, height: g_pinImg.height });
};

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function getPinImage(pin: PinDefinition) {
  switch(pin.type) {
    case 'power':   return utility.getSourcePath("/pale-pin.png");
    case 'utility': return utility.getSourcePath("/chartreuse-pin.png");
    case 'gpio':    return utility.getSourcePath("/gray-pin.png");
  }
}

function svg2vertices(data: string) {
  let vertices: joint.dia.Link.Vertex[] = [];

  const commands = data.match(/[MmLlHhVvCcSsQqTtAaZz]|[\d.-]+/g);

  let currentPoint = { x: 0, y: 0 };
  let previousCmd = '';
  let nextCmd = '';

  for (let i = 0; i < commands!.length;) {
      const cmd = commands![i++];

      // if (i + 2 < commands!.length - 1) {
      //   let c = commands![i + 2];
      //   nextCmd = c ? c : '';
      // }

      if ((cmd === 'M' || cmd === 'L') && (! (previousCmd === 'C' && nextCmd === 'C'))) {
          // 移动到或直线到
          const x = parseFloat(commands![i++]!);
          const y = parseFloat(commands![i++]!);
          currentPoint = { x, y };
          vertices.push(currentPoint);
      }

      if (cmd === 'M' || cmd === 'L' || cmd === 'C') {
        previousCmd = cmd;
      }
      // 可以添加其他命令的处理...
  }

  return vertices;
}

function linesIntersect(
  p1: joint.dia.Link.Vertex,
  p2: joint.dia.Link.Vertex,
  p3: joint.dia.Link.Vertex,
  p4: joint.dia.Link.Vertex
) {
  const ccw = (a: joint.dia.Link.Vertex, b: joint.dia.Link.Vertex, c: joint.dia.Link.Vertex) => {
    return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  };

  return ccw(p1, p3, p4) !== ccw(p2, p3, p4) &&
        ccw(p1, p2, p3) !== ccw(p1, p2, p4);
}

function isLinkInRect(pathPoints: joint.dia.Link.Vertex[], rect: joint.g.Rect) {
  // 方法1: 检查所有顶点是否都在选框内
  const allVerticesInRect = pathPoints.every(point =>
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );

  if (allVerticesInRect) return true;

  // 方法2: 检查连线与选框边界是否相交
  const rectLines = [
    { p1: { x: rect.x, y: rect.y }, p2: { x: rect.x + rect.width, y: rect.y } },
    { p1: { x: rect.x + rect.width, y: rect.y }, p2: { x: rect.x + rect.width, y: rect.y + rect.height } },
    { p1: { x: rect.x + rect.width, y: rect.y + rect.height }, p2: { x: rect.x, y: rect.y + rect.height } },
    { p1: { x: rect.x, y: rect.y + rect.height }, p2: { x: rect.x, y: rect.y } }
  ];

  // 检查连线的每条线段是否与选框边界相交
  for (let i = 0; i < pathPoints.length - 1; i++) {
    const p1 = pathPoints[i]!;
    const p2 = pathPoints[i + 1]!;

    for (const rectLine of rectLines) {
      if (linesIntersect(p1, p2, rectLine.p1, rectLine.p2)) {
        return true;
      }
    }
  }

  return false;
}

export const useSimulatorStore = defineStore('simulator', () => {

  let icTypes = g_icTypes;

  const state = ref<SimulatorState>({
    icTypes,
    placedICs: [],
    connections: [],
    selectedElement: { type: null, id: null },
    selectElementGroup: false,
    activePin: '',
    serialOpen: false,
    serialOut: '',
  });

  const g_pinImgMap: Record<string, joint.shapes.standard.Image> = {};

  let g_selectIcId = '';
  let g_selectPinId = '';
  let g_selectPinOldImg = '';
  let g_selectPinToggle = false;
  let g_icGroupMap: Record<string, joint.dia.Element> = {};

  let g_jointGraph: joint.dia.Graph;
  let g_jointPaper: joint.dia.Paper;
  let g_paperSave = '';
  let g_paperDoStack: string[] = [];
  let g_paperDoStackCurrent = 0;
  let g_paperPushStackEnable = true;

  let g_globalFrameEmiter = new FrameEmiter();
  g_globalFrameEmiter.rate(50);

  let g_highlightLinks: joint.dia.Link[] = [];
  let g_makeLinkSegments: joint.dia.Link[] = [];
  let g_makeLinkPoint: joint.shapes.standard.Circle | null = null;
  let g_makeLinkProjectionLink: joint.dia.Link | null = null;
  let g_selectionBound: joint.shapes.standard.Rectangle | null = null;
  let g_selectionStart = {x: 0, y: 0};
  let g_selectionLinks: joint.shapes.standard.Link[] = [];
  let g_moveICParent: joint.dia.Cell | null = null;
  let g_moveICStartChildPos: Record<string, {x: number, y: number}> = {};
  let g_moveICParentMoved = false;
  let g_moveICStartMousePos = {x: 0, y: 0};
  let g_moveICStartParentPos = {x: 0, y: 0};

  let g_isPanning = false;
  let g_panningStart = {x: 0, y: 0};

  const MachineControlServerUrl = 'ws://localhost:4445';
  const MachineQmpServerUrl = 'ws://localhost:4446';
  const MachineSerialServerUrl = 'ws://localhost:4447';

  let g_machineControlClient: WebSocket | null = null;
  let g_machineMessageClient: WebSocket | null = null;
  let g_machineSerialClient: WebSocket | null = null;

  const g_highlightLinkColor = '#1E90FF';

  function reset() {
    keyEscape();

    state.value = {
      icTypes,
      placedICs: [],
      connections: [],
      selectedElement: { type: null, id: null },
      selectElementGroup: false,
      activePin: '',
      serialOpen: false,
      serialOut: '',
    };

    g_icGroupMap = {};

    if (g_paperPushStackEnable) {
      g_paperDoStack = [];
      g_paperDoStackCurrent = 0;
    }

    g_jointGraph.clear();
  }

  function savePaper() {
    for (const item of state.value.placedICs) {
      let cell = g_jointGraph.getCell(item.id);
      if (! cell) {
        continue;
      }

      item.x = cell.position().x - g_pinImg.width;
      item.y = cell.position().y - g_pinImg.width;
      if (cell.angle() === 90 || cell.angle() === 270) {
        item.x += g_pinImg.width / 2;
        item.y -= g_pinImg.width / 2;
      }
    }
    return JSON.stringify(state.value, null, 4);
  }

  function getIcInstance(id: string) {
    for (const item of state.value.placedICs) {
      if (item.id === id) {
        return item;
      }
    }
    return null;
  }

  function loadPaper(s: string) {
    reset();

    try {
      let state = JSON.parse(s) as SimulatorState;

      for (const ic of state.placedICs) {
        const newIc = addIC(ic.typeId, ic.x, ic.y, ic.id);
        if (! newIc) {
          throw new Error(`no such ic typeId`);
        }
        icAddToJointGraph(g_jointGraph, newIc);
        jointElementRotation(ic.id, ic.rotation);
        setIcLabel(ic.label, ic.id);
      }
      for (const conn of state.connections) {
        createConnection(conn);
      }
    }
    catch (err) {
      console.error(err);

      alert(`解析图纸失败`);

      reset();
    }
  }

  function getICIdByGroupId(id: string) {
    for (let i in g_icGroupMap) {
      if (g_icGroupMap[i]!.id === id) {
        return i;
      }
    }
    return '';
  }

  function pushDoStack() {
    // console.log(new Error().stack);

    let save = savePaper();
    if (g_paperDoStackCurrent && g_paperDoStack[g_paperDoStackCurrent - 1] === save) {
      console.log(`push do stack false 1`);
      return;
    }
    if (! g_paperPushStackEnable) {
      console.log(`push do stack false 2`);
      return;
    }
    console.log(`push do stack true`);

    g_paperDoStack = g_paperDoStack.slice(0, g_paperDoStackCurrent);
    g_paperDoStack.push(save);
    g_paperDoStackCurrent ++;
  }

  function undo() {
    console.log(`undo, stackSize=${g_paperDoStack.length}, current=${g_paperDoStackCurrent}`);

    if (g_paperDoStackCurrent > 1) {
      g_paperDoStackCurrent --;

      g_paperPushStackEnable = false;

      // console.log(`load paper: ${g_paperDoStack[g_paperDoStackCurrent]!}`);

      loadPaper(g_paperDoStack[g_paperDoStackCurrent - 1]!);
      g_paperPushStackEnable = true;
    }
  }

  function redo() {
    console.log(`redo, stackSize=${g_paperDoStack.length}, current=${g_paperDoStackCurrent}`);

    if (g_paperDoStackCurrent < g_paperDoStack.length) {
      g_paperDoStackCurrent ++;

      g_paperPushStackEnable = false;
      loadPaper(g_paperDoStack[g_paperDoStackCurrent - 1]!);
      g_paperPushStackEnable = true;
    }
  }

  function getIntersectingLinkSegments(link: joint.dia.Link) {
    let r: joint.dia.Link[] = [];
    let connections = state.value.connections.filter((segments) => {
      // segments.forEach((conn) => console.log(`conn.id=${conn.id}`));
      return segments.some((conn) => conn.id === link.id) ||
        segments.some((conn) => conn.from.pinId === link.source().id) ||
        segments.some((conn) => conn.to.pinId === link.target().id);
    });
    for (const segments of connections) {
      r = r.concat(segments.map((v) => {
        return g_jointGraph.getCell(v.id) as joint.dia.Link;
      }));
    }
    return r;
  }

  function keyDelete() {
    if (g_selectionLinks.length) {
      // nothing to do
    }
    else if (! (state.value.selectedElement.type && state.value.selectedElement.id)) {
      return;
    }

    if (state.value.selectedElement.type === 'connection') {
      console.log(`delete connection`);

      state.value.connections = state.value.connections.filter((v) => {
        return !(v.map(vv => vv.id).includes(state.value.selectedElement.id!));
      });
    }
    else if (g_selectionLinks.length) {
      console.log(`delete links`);

      let ids = g_selectionLinks.map(v => v.id);

      for (const id of ids) {
        state.value.connections = state.value.connections.filter((v) => {
          return !(v.map(vv => vv.id).includes(`${id}`));
        });
      }
      g_selectionLinks = [];
    }
    else {
      state.value.placedICs = state.value.placedICs.filter((v) => {
        return v.id !== state.value.selectedElement.id;
      });
      state.value.connections = state.value.connections.filter((v) => {
        return !(
          v.map(vv => vv.from.icId).includes(state.value.selectedElement.id!) ||
          v.map(vv => vv.to.icId).includes(state.value.selectedElement.id!)
        );
      });
    }

    g_paperPushStackEnable = false;
    loadPaper(savePaper());
    g_paperPushStackEnable = true;

    pushDoStack();
  }

  function keyEscape() {
    selectElement(null, null, null);
  }

  function newPaperLink() {
    return new joint.shapes.standard.Link({
      attrs: {
        line: {
          targetMarker: {
            type: 'none',
          },
        },
      },
      router: {
        name: 'metro',
        args: {
          maxAllowedDirectionChange: 45,
        },
      },
      connector: {
        name: 'straight',
        cornerType: 'line',
        cornerRadius: 0,
        cornerPreserveAspectRatio: true,
      },
    });
  }

  function newLinkPoint() {
    return new joint.shapes.standard.Circle({
      id: `LinkPoint-${generateUUID()}`,
      size: {
        width: 8,
        height: 8,
      },
      attrs: {
        body: {
          fill: 'lightblue',
          pointerEvents: 'none',
        },
      },
    });
  }

  function newSelectionBound() {
    return new joint.shapes.standard.Rectangle({
      attrs: {
        body: {
          fill: 'rgba(0, 100, 255, 0.1)',
          stroke: 'rgba(0, 100, 255, 0.8)',
          strokeDasharray: '5.2',
        },
      },
    });
  }

  function selectionBoundEmbed(cells: joint.dia.Cell[]) {
    if (! g_selectionBound) {
      return;
    }

    const minZ = g_selectionBound.getEmbeddedCells().concat(cells).reduce((z, el) => {
      return Math.min(el.get('z') || 0, z);
    }, - Infinity);

    g_selectionBound.set('z', minZ - 1);
    g_selectionBound.embed(cells);
    g_selectionBound.fitEmbeds();

    state.value.selectElementGroup = true;
  }

  function selectionBoundClear() {
    if (! g_selectionBound) {
      return;
    }

    g_jointGraph.removeCell(g_selectionBound!);
    delete g_icGroupMap[g_selectionBound.id];
    g_selectionBound = null;

    state.value.selectElementGroup = false;
  }

  // make sure get rect after rotate
  function getCellRect(cell: joint.dia.Cell) {
    let r = (cell as joint.dia.Element).getBBox();

    if (cell.angle() === 90 || cell.angle() === 270) {
      console.log(`cell have cell=${cell.id}, cell.angle=${cell.angle()}`);
      r = (cell as joint.dia.Element).getBBox({rotate: true});
    }

    // let parent = g_jointGraph.getCell(cell.parent());
    // if (cell.getEmbeddedCells().length) {
    //   parent = cell;
    // }

    // if ((parent.angle() === 90 || parent.angle() === 270) && parent.id === cell.id) {
    // // if (parent.angle() === 90 || parent.angle() === 270) {
    //   console.log(`parent have angle=${parent.angle()} parent=${parent.id} cell=${cell.id}`);
    //   r.x += (r.width - r.height) / 2 + r.height / 2;
    //   r.y -= (r.width - r.height) / 2 + r.width / 2;

    //   let m = r.width;
    //   r.width = r.height;
    //   r.height = m;
    // }
    return r;
  }

  function changeHighlightLinks(links: joint.dia.Link[], color: string = 'lightblue') {
    console.log(`changeHighlightLinks links.length=${links.length}`);

    for (const link of g_highlightLinks) {
      let linkView = g_jointPaper.findViewByModel(link);
      linkView && joint.highlighters.mask.remove(linkView);
    }
    for (const link of links) {
      let linkView = g_jointPaper.findViewByModel(link);
      linkView && joint.highlighters.mask.remove(linkView);
      linkView && joint.highlighters.mask.add(linkView, 'root', 'element-highlight', {
        deep: true,
        padding: 0,
        attrs: {
          'stroke': color,
          'stroke-width': 2,
        }
      });
    }
    g_highlightLinks = links;
  }

  function resetPaperScale() {
    g_jointPaper.translate(0, 0);
    g_jointPaper.scale(1, 1);
  }

  function initJoint(graph: joint.dia.Graph, paper: joint.dia.Paper) {
    console.log(`joint.version=${joint.version}`);

    g_jointGraph = graph;
    g_jointPaper = paper;

    paper.on('element:pointerclick', (elementView, evt) => {
      g_jointPaper.el.focus();

      const element = elementView.model;

      console.log(`joint.dia.paper.on.element:pointerclick: id=${element.id}, ctrlKey=${evt.ctrlKey}`);

      if (g_pinImgMap[element.id]) {
        selectElement('pin', getIcIdByPinId(String(element.id)), String(element.id));
        return;
      }

      for (const ic of state.value.placedICs) {
        if (element.id === ic.id) {
          if (state.value.selectedElement.id && state.value.selectedElement.id !== ic.id && evt.ctrlKey) {
            console.log(`add element to selection bound`);

            if (! g_selectionBound) {
              g_selectionBound = newSelectionBound();
              g_selectionBound.addTo(graph);
            }
            g_icGroupMap[state.value.selectedElement.id] && selectionBoundEmbed([g_icGroupMap[state.value.selectedElement.id]!]);
            g_icGroupMap[element.id] && selectionBoundEmbed([g_icGroupMap[element.id]!]);
          }
          else {
            selectElement('ic', ic.id, null);
          }
          break;
        }
      }
    });

    graph.on('add', (cell: joint.dia.Cell) => {
      if (! cell.isLink()) {
        return;
      }

      let link = cell as joint.dia.Link;
      let linkView = paper.findViewByModel(link) as joint.dia.LinkView;
      let connection = linkView.getConnection();
      let vertices: joint.dia.Link.Vertex[] = svg2vertices(connection.serialize());

      let first = vertices[0];
      vertices = vertices.map((v) => {
        return {
          x: Math.abs(v!.x - first!.x) < 10 ? first!.x : v.x,
          y: Math.abs(v!.y - first!.y) < 10 ? first!.y : v.y,
        }
      });

      console.log(`new link ${link.id} vertices `, vertices);

      link.set({
        vertices,
        router: null
      });

      linkView.update();
      linkView.requestUpdate(0);
    });

    paper.on('element:pointerdown', (elementView, evt) => {
      g_jointPaper.el.focus();

      const element = elementView.model;

      g_moveICParent = element.getParentCell() || element;
      // selection bound
      if (g_moveICParent?.getParentCell()) {
        g_moveICParent = g_moveICParent.getParentCell();
      }
      if (g_moveICParent) {
        evt.stopImmediatePropagation();

        g_moveICStartMousePos = {x: evt.clientX!, y: evt.clientY!};
      }
    });

    paper.on('cell:pointermove', (cellView, evt) => {
      if (! g_moveICParent) {
        return;
      }

      evt.stopImmediatePropagation();

      const dx = evt.clientX! - g_moveICStartMousePos.x;
      const dy = evt.clientY! - g_moveICStartMousePos.y;

      if (cellView.model !== g_moveICParent) {
        (cellView.model as joint.dia.Element).translate(-dx, -dy);
      }
      (g_moveICParent as joint.dia.Element).translate(dx, dy);
      g_moveICParentMoved = true;
      g_moveICStartMousePos = {x: evt.clientX!, y: evt.clientY!};

      paper.trigger('render');
    });

    paper.on('cell:pointerup', (cellView, evt) => {
      g_jointPaper.el.focus();

      if (! g_moveICParent || ! g_moveICParentMoved) {
        return;
      }

      const element = cellView.model;

      for (const ic of state.value.placedICs) {
        if (element.id === ic.id) {
          selectElement('ic', ic.id, null);
          break;
        }
      }

      // relinkIc(`${element.id}`);

      pushDoStack();

      g_moveICParent = null;
      g_moveICParentMoved = false;
    });

    paper.on('cell:mouseenter', async (cellView, evt) => {
      if (! g_selectPinId) {
        return;
      }

      const element = cellView.model;
      if (! g_pinImgMap[element.id]) {
        return;
      }

      console.log(`cell mouse enter `, element.id);

      if (! await g_globalFrameEmiter.emitPromise()) {
        return;
      }

      g_makeLinkSegments.length && graph.removeCell(g_makeLinkSegments.pop()!);

      let link = newPaperLink();
      link.source(g_makeLinkSegments.length ? {
          x: g_makeLinkSegments[g_makeLinkSegments.length - 1]!.target().x,
          y: g_makeLinkSegments[g_makeLinkSegments.length - 1]!.target().y,
        } : {
          id: g_selectPinId,
          selector: 'body',
          port: 'port1',
        }
      );
      link.target({
        id: element.id,
        selector: 'body',
        port: 'port1',
      });
      link.addTo(graph);

      g_makeLinkSegments.push(link);

      changeHighlightLinks([... getIntersectingLinkSegments(link), link], g_highlightLinkColor);
    });

    paper.on('blank:pointerdown', (evt, x, y) => {
      console.log(`joint.dia.paper.on.blank:pointerdown`);
      g_jointPaper.el.focus();

      if (g_makeLinkSegments.length) {
        g_makeLinkSegments.push(g_makeLinkSegments[g_makeLinkSegments.length - 1]!.clone());
      }
      else {
        selectElement(null, null, null);

        if (g_selectionBound) {
          g_selectionBound.unembed(g_selectionBound.getEmbeddedCells());
          graph.removeCell(g_selectionBound);
        }
        g_selectionBound = newSelectionBound();
        g_selectionBound.addTo(graph);
        g_selectionStart = {x, y};
      }
    });

    paper.on('blank:pointermove', async (evt, x, y) => {
      if (g_isPanning) {
        return;
      }
      if (! g_selectionBound) {
        return;
      }

      if (! await g_globalFrameEmiter.emitPromise()) {
        return;
      }

      g_selectionBound?.set('position', {
        x: Math.min(g_selectionStart.x, x),
        y: Math.min(g_selectionStart.y, y),
      });
      g_selectionBound?.set('size', {
        width: Math.abs(x - g_selectionStart.x),
        height: Math.abs(y - g_selectionStart.y),
      });
    });

    paper.on('blank:pointerup', async (evt, x, y) => {
      if (! g_selectionBound) {
        return;
      }

      if (! await g_globalFrameEmiter.emitPromise()) {
        return;
      }

      const selectionRect = g_selectionBound!.getBBox();

      let elements = paper.model.getElements().filter((v) => {
        if (v === g_selectionBound ||
            v.parent()
        ) {
          return false;
        }
        return v.getBBox().intersect(selectionRect);
      });

      if (elements.length === 1) {
        selectElement('ic', `${getICIdByGroupId(elements[0]!.id.toString())}`, null);
        selectionBoundClear();
        return;
      }

      if (elements.length) {
        selectionBoundEmbed(elements);

        g_icGroupMap[g_selectionBound.id] = g_selectionBound;

        return;
      }

      // select links ?
      let links = paper.model.getLinks().filter((v) => {
        return isLinkInRect(v.vertices(), selectionRect);
      });

      if (links.length) {
        console.log(`select links`);

        for (const item of links) {
          getIntersectingLinkSegments(item).forEach((v) => {
            let view = paper.findViewByModel(v);
            if (! view) {
              return;
            }
            joint.highlighters.mask.remove(view);
            joint.highlighters.mask.add(view, 'root', 'element-highlight', {
              deep: true,
              padding: 0,
              attrs: {
                'stroke': '#DC143C',
                'stroke-width': 2,
              }
            });
          });
        }
        g_selectionLinks = links;

        selectionBoundClear();

        return;
      }

      // none select
      selectionBoundClear();
    });

    // 绑定滚轮事件
    paper.el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.01; // 调整灵敏度
      const rect = paper.el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const currentScale = paper.scale().sx;
      const newScale = Math.max(0.2, Math.min(2.8, currentScale + delta * 0.1));

      // 调用缩放函数
      scaleToPoint(newScale, x, y);
    });

    function scaleToPoint(scale: number, x: number, y: number) {
      console.log(`scale ${scale}`);

      const currentScale = paper.scale().sx;
      const beta = currentScale / scale;
      const ax = x - (x * beta);
      const ay = y - (y * beta);
      const t = paper.translate();
      paper.translate(t.tx - ax * scale, t.ty - ay * scale);
      paper.scale(scale, scale);
    }

    // 鼠标按下事件
    paper.el.addEventListener('mousedown', (evt) => {
      // 检查是否按下了 Ctrl 键
      if (evt.ctrlKey && evt.button === 0) { // 左键 + Ctrl
        g_isPanning = true;
        g_panningStart = { x: evt.clientX, y: evt.clientY };
        paper.el.style.cursor = 'grabbing';
        paper.el.style.userSelect = 'none';

        evt.preventDefault();
        evt.stopPropagation();
      }
    });

    // 鼠标释放事件
    paper.el.addEventListener('mouseup', (evt) => {
      g_isPanning = false;
      paper.el.style.cursor = 'default';
      paper.el.style.userSelect = 'auto';

      evt.preventDefault();
    });

    // 防止画布的默认拖拽行为干扰
    paper.el.addEventListener('dragstart', (evt) => {
      evt.preventDefault();
    });

    paper.el.addEventListener('mousemove', async (evt) => {
      if (g_isPanning) {
        // 计算鼠标移动距离
        const deltaX = evt.clientX - g_panningStart.x;
        const deltaY = evt.clientY - g_panningStart.y;

        // 获取当前的平移和缩放
        const currentTranslate = paper.translate();
        const currentScale = paper.scale();

        // 计算新的平移位置
        const newTx = currentTranslate.tx + deltaX;
        const newTy = currentTranslate.ty + deltaY;

        // 应用新的平移
        paper.translate(newTx, newTy);

        // 更新最后位置
        g_panningStart = { x: evt.clientX, y: evt.clientY };

        evt.preventDefault();
        return;
      }

      if (! g_selectPinId) {
        return;
      }

      let rect = paper.el.getBoundingClientRect();
      let x = evt.clientX - rect.left;
      let y = evt.clientY - rect.top;

      // console.log(x, y);

      // 获取当前缩放和变换状态
      const scale = paper.scale();
      const translate = paper.translate();

      // 应用反变换：先减去平移，再除以缩放
      x = (x - translate.tx) / scale.sx;
      y = (y - translate.ty) / scale.sy;

      // console.log(`translate `, x, y);

      let view = paper.findView(evt.target);
      if (! view) {
        if (! await g_globalFrameEmiter.emitPromise()) {
          return;
        }

        if (g_makeLinkPoint) {
          graph.removeCell(g_makeLinkPoint);
          g_makeLinkPoint = null;
        }

        g_makeLinkProjectionLink = null;

        let lastSegment = g_makeLinkSegments.pop();
        lastSegment && graph.removeCell(lastSegment);

        // make new link to emit paper.add event
        let link = newPaperLink();
        let source = g_makeLinkSegments.length ? {
          x: g_makeLinkSegments[g_makeLinkSegments.length - 1]!.target().x,
          y: g_makeLinkSegments[g_makeLinkSegments.length - 1]!.target().y,
        } : {
          id: g_selectPinId,
          selector: 'body',
          port: 'port1',
        };

        if (lastSegment && !g_makeLinkSegments.length) {
          let vertices = lastSegment.vertices();
          if (vertices.length) {
            source = {
              x: vertices[0]?.x,
              y: vertices[0]?.y,
            };
          }
        }

        if (typeof source.x === 'number') {
          if (Math.abs(x - source.x!) < 10) {
            x = source.x!;
          }
          if (Math.abs(y - source.y!) < 10) {
            y = source.y!;
          }
        }

        link.source(source);
        link.target({ x, y });
        link.addTo(graph);

        console.log(`create link segment source-target`, source, link.target());

        g_makeLinkSegments.push(link);

        changeHighlightLinks([link], g_highlightLinkColor);

        return;
      }

      let linkView = paper.findLinkViewsInArea({
        x: x - 4,
        y: y - 4,
        width: 8,
        height: 8,
      }).filter((v) => {
        return v !== paper.findViewByModel(g_makeLinkSegments[g_makeLinkSegments.length - 1]!);
      })[0];
      if (linkView) {
        console.log(`get link view, g_makeLinkSegments.length=${g_makeLinkSegments.length}`);

        if (! g_makeLinkSegments.length) {
          return;
        }

        if (! await g_globalFrameEmiter.emitPromise()) {
          return;
        }

        console.log(`move link point`);

        if (! g_makeLinkPoint) {
          console.log(`make link point`);
          g_makeLinkPoint = newLinkPoint();
          g_makeLinkPoint.addTo(graph);
        }

        g_makeLinkProjectionLink = linkView.model;

        let linkViewVertices = linkView.model.vertices();
        let distanceReulst = pointToPolygonDistance([x, y], linkViewVertices.map((v) => [v.x, v.y]));

        if (distanceReulst.projection) {
          x = distanceReulst.projection[0];
          y = distanceReulst.projection[1];
        }
        g_makeLinkPoint.position(x - g_makeLinkPoint.size().width / 2, y - g_makeLinkPoint.size().height / 2);

        g_makeLinkSegments.length && graph.removeCell(g_makeLinkSegments.pop()!);

        // make new link to emit paper.add event
        let link = newPaperLink();
        let source = g_makeLinkSegments.length ? {
          x: g_makeLinkSegments[g_makeLinkSegments.length - 1]!.target().x,
          y: g_makeLinkSegments[g_makeLinkSegments.length - 1]!.target().y,
        } : {
          id: g_selectPinId,
          selector: 'body',
          port: 'port1',
        };

        link.source(source);
        link.target({x, y});
        link.addTo(graph);

        g_makeLinkSegments.push(link);

        changeHighlightLinks([... getIntersectingLinkSegments(linkView.model), ... g_makeLinkSegments], g_highlightLinkColor);

        return;
      }
    });

    paper.on('link:pointerclick', async (linkView, evt) => {
      if (g_makeLinkSegments.length) {
        if (g_globalFrameEmiter.hasWork()) {
          g_globalFrameEmiter.setEnable(false);
          await g_globalFrameEmiter.waitWorksDone();
          g_globalFrameEmiter.setEnable(true);
        }

        if (g_makeLinkPoint) {
          if (! g_makeLinkProjectionLink) {
            return;
          }

          let linkPoint = g_makeLinkPoint;
          g_makeLinkPoint = null;
          let x = linkPoint.position().x + linkPoint.size().width / 2;
          let y = linkPoint.position().y + linkPoint.size().height / 2;

          state.value.connections.some((segments, idx) => {
            if (! segments.map((conn) => conn.id).includes(`${g_makeLinkProjectionLink!.id}`)) {
              return false;
            }

            // split link
            segments.some((conn, idx) => {
              if (conn.id !== g_makeLinkProjectionLink!.id) {
                return false;
              }

              let vertices1 = g_makeLinkProjectionLink?.vertices();
              if (! vertices1) {
                return true;
              }
              let distanceReulst = pointToPolygonDistance([x, y], vertices1.map((v) => [v.x, v.y]));

              let vertices2 = [{x, y}].concat(vertices1.slice(distanceReulst.segmentIndex + 1));
              vertices1 = vertices1.slice(0, distanceReulst.segmentIndex + 1);
              vertices1.push({x, y});

              // check circle, segments already includes projection link
              for (const seg of segments) {
                if (seg.from.pinId === g_selectPinId || seg.to.pinId === g_selectPinId) {
                  alert(`线路回环，无法创建！`);

                  g_jointGraph.removeCell(linkPoint);
                  selectElement(null, null, null);
                  changeHighlightLinks([]);

                  return true;
                }
              }

              // current connection should make first
              let currentConnection = createConnectionSegment({
                icId: g_selectIcId,
                pinId: g_selectPinId,
                isLinkPoint: false,
              }, {
                icId: '',
                pinId: `${linkPoint.id}`,
                isLinkPoint: true,
              });
              segments.push(currentConnection);

              g_pinImgMap[g_selectPinId]!.attr('image/xlink:href', g_selectPinOldImg);

              g_selectIcId = '';
              g_selectPinId = '';

              // other connections
              let firstConnection = createConnectionSegment(
                conn.from,
                {
                  icId: '',
                  pinId: `${linkPoint.id}`,
                  isLinkPoint: true,
                },
                '',
                vertices1
              );
              segments.push(firstConnection);

              let secondConnection = createConnectionSegment(
                {
                  icId: '',
                  pinId: `${linkPoint.id}`,
                  isLinkPoint: true,
                },
                conn.to,
                '',
                vertices2
              );
              segments.push(secondConnection);

              graph.removeCell(conn.id);
              segments.splice(idx, 1);

              return true;
            });

            state.value.connections[idx] = segments;

            pushDoStack();

            return true;
          });
        }
        else {
          g_makeLinkSegments.push(g_makeLinkSegments[g_makeLinkSegments.length - 1]!.clone());
        }
      }
      else {
        selectElement('connection', `${linkView.model.id}`, null);

        getIntersectingLinkSegments(linkView.model).forEach((v) => {
          let view = paper.findViewByModel(v);
          if (! view) {
            return;
          }
          joint.highlighters.mask.remove(view);
          joint.highlighters.mask.add(view, 'root', 'element-highlight', {
            deep: true,
            padding: 0,
            attrs: {
              'stroke': '#DC143C',
              'stroke-width': 2,
            }
          });
        });
      }
    });

    paper.on('link:mouseenter', (linkView) => {
      if (
        state.value.selectedElement.id === linkView.model.id ||
        g_selectionLinks.includes(linkView.model) ||
        g_makeLinkSegments.includes(linkView.model) ||
        g_makeLinkPoint
      ) {
        return;
      }

      changeHighlightLinks(getIntersectingLinkSegments(linkView.model), g_highlightLinkColor);
    });

    paper.on('link:mouseleave', (linkView) => {
      if (
        state.value.selectedElement.id === linkView.model.id ||
        g_selectionLinks.includes(linkView.model) ||
        g_makeLinkSegments.includes(linkView.model) ||
        g_makeLinkPoint
      ) {
        return;
      }

      changeHighlightLinks([]);
    });

    // paper.on('wheel', () => {

    // });

    pushDoStack();
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

  const selectElementGroup = computed(() => state.value.selectElementGroup);

  // Actions
  function addIC(typeId: string, x: number, y: number, id: string = '') {
    const icType = state.value.icTypes.find(ic => ic.id === typeId);
    if (!icType) {
      console.error(`wrrong icType=${icType}`);
      return null;
    }

    const newIC: ICInstance = {
      id: id || `ic-${generateUUID()}`,
      typeId,
      x,
      y,
      rotation: 0,
      label: '',
      icType: icType,
      properties: {},
      communicationInterfaces: [],
      pinIdTable: new Set(),
    };

    state.value.placedICs.push(newIC);

    selectElement('ic', newIC.id, null);

    return newIC;
  }

  async function updateIcState(result: any, ic: ICInstance) {
    let jointElement = g_jointGraph.getCell(ic.id);
    if (! jointElement) {
      console.error(`updateIcState can not find cell ${ic.id}`)
      return;
    }

    if (ic.icType.onStateUpdateImage) {
      // console.log(`update image`);
      jointElement.attr('image/xlink:href', ic.icType.onStateUpdateImage(result, ic.icType));
    }
    if (ic.icType.onStateUpdateStateHtml) {
      // console.log(`update state html`);
      let htmlElement = g_jointGraph.getCell(`${ic.id}-stateHtml`);
      if (htmlElement) {
        let content = await ic.icType.onStateUpdateStateHtml(result, ic.icType);
        htmlElement.set('markup', joint.util.svg
          `
          <foreignObject @selector="foreignObject">
            ${content}
          </foreignObject>
          `
        );
      }
    }
  }

  function getPinLabel(tag: string, pinAngle: number) {
    if (pinAngle === 180 || pinAngle === 270) {
      return {
        text: tag,
        refX: g_pinImg.width,
        refY: g_pinImg.height * 1.25 + g_pinImg.height,
        transform: `rotate(180)`
      };
    }
    else {
      return {
        text: tag,
        refX: 0,
        refY: - g_pinImg.height * 1.25,
      };
    }
  }

  function icAddToJointGraph(graph: joint.dia.Graph, ic: ICInstance) {
    const elements: joint.shapes.standard.Image[] = [];

    const icType = ic.icType;

    let body = new joint.shapes.standard.Image({
      id: ic.id,
      size: {
        width: ic.icType.width - g_pinImg.width * 2,
        height: ic.icType.height - g_pinImg.width * 2,
      },
      position: {
        x: ic.x + g_pinImg.width,
        y: ic.y + g_pinImg.width,
      },
      attrs: {
        image: {
          'xlink:href': ic.icType.image,
        },
      },
    });
    body.addTo(graph);

    function addPin(ic: ICInstance, pin: PinDefinition, x: number, y: number, angle: number) {
      let img = new joint.shapes.standard.Image({
        z: 3,
        id: createPinImageId(ic, pin),
        size: {
          width: g_pinImg.width,
          height: g_pinImg.height,
        },
        position: {
          x,
          y,
        },
        angle,
        attrs: {
          image: {
            'xlink:href': getPinImage(pin),
          },
          label: {
            text: pin.tag,
            refX: 0,
            refY: - g_pinImg.height * 1.25,
          },
        },

        ports: {
          groups: {
            right: {
              position: 'right',
              attrs: {
                circle: {
                  cursor: 'crosshair',
                  fill: '#4D64DD',
                  stroke: '#F4F7F6',
                  magnet: 'active',
                  r: 0,
                }
              }
            },
            bottom: {
              position: 'bottom',
              attrs: {
                circle: {
                  cursor: 'crosshair',
                  fill: '#4D64DD',
                  stroke: '#F4F7F6',
                  magnet: 'active',
                  r: 0,
                }
              }
            }
          },
          items: [{
            group: 'right',
            id: 'port1',
          }]
        }

      });
      img.addTo(graph);

      elements.push(img);

      return img;
    }

    let center = {
      x: body.position().x + body.size().width / 2,
      y: body.position().y + body.size().height / 2,
    };

    function getRightPinPosition(
      tx: number, side: number, alignment: typeof ic.icType.topPinsPlaceConfig.alignment, index: number,
      array: PinDefinition[], gap: number
    ) {
      let left = body.position().x + tx;
      let top = body.position().y;

      switch (alignment) {
        case "center": {
          left += 0;
          top += (side - (array.length * (g_pinImg.height + gap) - gap)) / 2 +
            index * (g_pinImg.height + gap);
        } break;

        case 'left': {

        } break;

        case 'right': {

        } break;
      }

      return {
        x: left,
        y: top,
      };
    }

    ic.icType.topPins.forEach((v, i) => {
      let pos = getRightPinPosition(
        body.size().width - (body.size().width - body.size().height) / 2,
        body.size().height, ic.icType.topPinsPlaceConfig.alignment, i,
        ic.icType.topPins, ic.icType.topPinsPlaceConfig.gap
      );

      let img = addPin(ic, v, pos.x, pos.y, 0);
      img.rotate(270, false, center);
      img.attr('label', getPinLabel(v.tag, 270));
    });

    ic.icType.rightPins.forEach((v, i) => {
      let pos = getRightPinPosition(
        body.size().width - (body.size().width - body.size().height) / 2,
        body.size().width, ic.icType.rightPinsPlaceConfig.alignment, i,
        ic.icType.rightPins, ic.icType.rightPinsPlaceConfig.gap
      );

      let img = addPin(ic, v, pos.x, pos.y, 0);
      img.rotate(0, false, center);
      img.attr('label', getPinLabel(v.tag, 0));
    });

    ic.icType.bottomPins.forEach((v, i) => {
      let pos = getRightPinPosition(
        body.size().width - (body.size().width - body.size().height) / 2,
        body.size().height, ic.icType.bottomPinsPlaceConfig.alignment, i,
        ic.icType.bottomPins, ic.icType.bottomPinsPlaceConfig.gap
      );

      let img = addPin(ic, v, pos.x, pos.y, 0);
      img.rotate(90, false, center);
      img.attr('label', getPinLabel(v.tag, 90));

      // let left = body.position().x + body.size().width - (body.size().width - body.size().height) / 2;
      // let top = body.position().y;

      // switch (ic.icType.bottomPinsPlaceConfig.alignment) {
      //   case "center": {
      //     left += (body.size().height - (ic.icType.bottomPins.length * (g_pinImg.height + ic.icType.bottomPinsPlaceConfig.gap) - ic.icType.bottomPinsPlaceConfig.gap)) / 2 -
      //       i * (g_pinImg.height + ic.icType.bottomPinsPlaceConfig.gap);
      //     top += body.size().height;
      //   } break;

      //   case 'left': {

      //   } break;

      //   case 'right': {

      //   } break;
      // }

      // let pos = {
      //   x: left,
      //   y: top,
      // };

      // let img = addPin(ic, v, pos.x, pos.y, 0);
      // img.rotate(90, false, pos);
    });

    ic.icType.leftPins.forEach((v, i) => {
      let pos = getRightPinPosition(
        body.size().width - (body.size().width - body.size().height) / 2,
        body.size().width, ic.icType.leftPinsPlaceConfig.alignment, i,
        ic.icType.leftPins, ic.icType.leftPinsPlaceConfig.gap
      );

      let img = addPin(ic, v, pos.x, pos.y, 0);
      img.rotate(180, false, center);
      img.attr('label', getPinLabel(v.tag, 180));
    });

    let html: joint.dia.Element | undefined;
    if (icType.stateAreaRect) {
      html = new JointHtmlElement({
        id: `${ic.id}-stateHtml`,
      });
      icType.getInitStateHtml && html.set('markup', joint.util.svg
        `
        <foreignObject @selector="foreignObject">
            ${icType.getInitStateHtml()}
        </foreignObject>
        `
      );
      html.position(icType.stateAreaRect.x + ic.x + g_pinImg.width, icType.stateAreaRect.y + ic.y);
      html.size(icType.stateAreaRect.width, icType.stateAreaRect.height);
      html.addTo(graph);
    }

    const group = new joint.shapes.standard.Rectangle();

    const minZ = elements.reduce((z, el) => {
      return Math.min(el.get('z') || 0, z);
    }, - Infinity);

    group.set('z', minZ - 1);

    group.addTo(graph);
    group.embed([body, ...elements]);
    html && group.embed(html);
    group.fitEmbeds();
    group.attr('body', {
      rx: 10, // 水平圆角半径
      ry: 10, // 垂直圆角半径
      strokeWidth: 2,
      stroke: 'gray',
      strokeDasharray: '5,5', // 虚线模式：5px实线，5px空白
    });

    g_icGroupMap[ic.id] = group;

    elements.forEach(v => g_pinImgMap[v.id] = v);

    pushDoStack();
  }

  function createConnectionSegment(from: ConnectionPoint, to: ConnectionPoint, id = '', vertices: joint.dia.Link.Vertex[] = []) {
    const newConnection: Connection = {
      id: id ? id : `conn-${generateUUID()}`,
      from,
      to,
      vertices,
    };

    if (g_makeLinkSegments.length) {
      vertices = [];
      for (const item of g_makeLinkSegments) {
        vertices = vertices.concat(item.vertices());
        g_jointGraph.removeCell(item);
      }
    }
    g_makeLinkSegments = [];

    if (from.isLinkPoint && (! g_jointGraph.getCell(`${from.pinId}`))) {
      let linkPoint = newLinkPoint();
      linkPoint.set('id', from.pinId);
      linkPoint.position(vertices[0]!.x - linkPoint.size().width / 2, vertices[0]!.y - linkPoint.size().height / 2);
      linkPoint.addTo(g_jointGraph);

      // console.log(`createConnectionSegment make link point at `, vertices[0]);
    }
    if (to.isLinkPoint && (! g_jointGraph.getCell(`${to.pinId}`))) {
      let linkPoint = newLinkPoint();
      linkPoint.set('id', to.pinId);
      linkPoint.position(vertices[vertices.length - 1]!.x - linkPoint.size().width / 2, vertices[vertices.length - 1]!.y - linkPoint.size().height / 2);
      linkPoint.addTo(g_jointGraph);

      // console.log(`createConnectionSegment make link point at `, vertices[vertices.length - 1]);
    }

    let link = newPaperLink();
    link.set('id', newConnection.id);
    link.source({
      id: from.pinId,
      selector: 'body',
      port: 'port1',
    });
    link.target({
      id: to.pinId,
      selector: 'body',
      port: 'port1',
    });
    link.addTo(g_jointGraph);

    if (vertices.length) {
      // vertices must set after addtTo graph
      (link as joint.dia.Cell).set({
        vertices,
        router: null
      });
    }

    console.log(`create connection `, from, to);

    newConnection.vertices = vertices;

    return newConnection;
  }

  function createConnection(segments: ConnectionSegments) {
    for (let seg of segments) {
      seg.id = createConnectionSegment(seg.from, seg.to, seg.id, seg.vertices).id;
    }
    state.value.connections.push(segments);
  }

  function getMachineControlClient() {
    return g_machineControlClient;
  }

  setInterval(() => {
    if (! g_selectPinId) {
      return;
    }

    if (g_selectPinToggle) {
      g_pinImgMap[g_selectPinId]!.attr('image/xlink:href', utility.getSourcePath('/black-pin.png'));
    }
    else {
      g_pinImgMap[g_selectPinId]!.attr('image/xlink:href', g_selectPinOldImg);
    }

    // console.log(`toggle select pin`);

    g_selectPinToggle = ! g_selectPinToggle;
  }, 500);

  function stopSimulator() {
    g_machineControlClient?.close();
    g_machineMessageClient?.close();
    g_machineSerialClient?.close();
    g_machineControlClient = null;
    g_machineMessageClient = null;
    g_machineSerialClient = null;

    g_paperSave && loadPaper(g_paperSave);
  }

  function startSimulator(options: {
    executeble: string,
    debug: boolean,
    inProcessServer: () => void,
    machineReady: () => void,
    machineClose: () => void,
    machineError: () => void,
    launchFaild: () => void
  }) {
    const { executeble, debug, inProcessServer, machineReady, machineClose, machineError, launchFaild } = options;

    console.log(state.value);

    let devices: Record<string, ICInstance> = {};
    let interfaceDevices: Record<string, CommunicationInterface> = {};

    state.value.placedICs.forEach((v) => {
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

      v.communicationInterfaces = [];

      v.icType.communicationInterfaces?.forEach((vv) => {
        let idx = 0;
        let qomId = `${vv.type}${idx}`;
        while (typeof devices[qomId] !== "undefined") {
          idx ++;
          qomId = `${vv.type}${idx}`;
        }
        console.info(`make device qomId: ${qomId}`);
        interfaceDevices[qomId] = vv;

        v.communicationInterfaces.push(qomId);
      });
    });

    let devicesStr: string[] = [];

    // make machine
    if (typeof devices["machine model"] !== "undefined") {

    }
    else {
      alert("未设定MCU, 无法仿真");
      return;
    }

    // make interfaces
    for (let i in interfaceDevices) {
      devicesStr.push(`${interfaceDevices[i]!.type},id=${i}`);
    }

    for (let i in devices) {
      if (devices[i]!.icType.type === "MCU") {
        continue;
      }

      let p = `-device ${devices[i]!.icType.qemuDeviceType},id=${i}`;
      // add interfaces id
      devices[i]!.communicationInterfaces.forEach((v) => {
        p += `,${interfaceDevices[v]!.type}=${interfaceDevices[v]!.getPathInQemuQom(v)}`;
      });

      devicesStr.push(`${p.split(' ')[1]}`);
    }

    state.value.connections.forEach((segments, idx) => {
      let qomId = `vee-line${idx}`;
      let pins: string[] = [];

      for (const conn of segments) {
        if (! conn.from.isLinkPoint) {
          let icQomId = '';
          let ic: ICInstance;

          for (let i in devices) {
            if (devices[i]!.id === conn.from.icId) {
              icQomId = i;
              ic = devices[i]!;
              break;
            }
          }

          let pin = ic!.icType.getPinPathInQemuQom(
            icQomId,
            getPinDefinitionFromPinId(ic!, conn.from.pinId)!,
            ic!.icType.communicationInterfaces!,
            ic!.communicationInterfaces
          );
          pins.push(pin);
        }
        if (! conn.to.isLinkPoint) {
          let icQomId = '';
          let ic: ICInstance;

          for (let i in devices) {
            if (devices[i]!.id === conn.to.icId) {
              icQomId = i;
              ic = devices[i]!;
              break;
            }
          }
          let pin = ic!.icType.getPinPathInQemuQom(
            icQomId,
            getPinDefinitionFromPinId(ic!, conn.to.pinId)!,
            ic!.icType.communicationInterfaces!,
            ic!.communicationInterfaces
          );
          pins.push(pin);
        }
      }

      // console.log(`pins `, pins);

      pins.length && devicesStr.push(`vee-line,id=${qomId},vee-pins-path='${pins.join(',,')}'`);
    });

    console.log(devicesStr);

    (async () => {
      await new Promise((res, rej) => {
        g_machineControlClient = new WebSocket(MachineControlServerUrl);

        g_machineControlClient.onopen = res;
        g_machineControlClient.onclose = rej;
        g_machineControlClient.onerror = rej;
      });

      g_machineControlClient?.send(JSON.stringify({
        command: 'launch-arm',
        parameters: {
          model: devices["machine model"]?.icType.qemuDeviceType,
          kernel: executeble,
          devices: devicesStr,
          debug: debug,
        },
      }));

      async function waitMachine(timeout: number) {
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

      await waitMachine(debug ? 60e3 : 6e3);

      await new Promise((res, rej) => {
        g_machineMessageClient = new WebSocket(MachineQmpServerUrl);

        g_machineMessageClient.onopen = res;
        g_machineMessageClient.onclose = rej;
        g_machineMessageClient.onerror = rej;
      });

      let getStateTimers: number[] = [];

      let pendingCommands: {command: string, ic: ICInstance}[] = [];

      for (let i in devices) {
        let qomId = i;
        let device = devices[i];
        if (! device?.icType.stateFrame || ! device.icType.getStateCommand) {
          console.log(`device ${i} no state frame`);
          continue;
        }

        getStateTimers.push(setInterval(() => {
          if (g_machineMessageClient?.readyState !== WebSocket.OPEN) {
            return;
          }

          let commandInfo = {
            command: device.icType.getStateCommand!(qomId),
            ic: device,
          };

          if (! pendingCommands.length) {
            g_machineMessageClient?.send(commandInfo.command);
          }
          pendingCommands.push(commandInfo);
        }, 1000 / device.icType.stateFrame));
      }

      g_machineMessageClient!.onclose = () => {
        getStateTimers.forEach((v) => {
          clearInterval(v);
        });

        machineClose();
      };

      g_machineMessageClient!.onmessage = (ev) => {
        if (ev.data.length < 256) {
          console.info(ev.data);
        }
        else {
          console.info(`get message from machine, len=${ev.data.length}`);
        }

        try {
          let o = JSON.parse(ev.data);

          if (o['return']) {
            if (pendingCommands.length) {
              let commandInfo = pendingCommands.shift();

              updateIcState(o, commandInfo!.ic);
            }

            if (pendingCommands.length) {
              g_machineMessageClient?.send(pendingCommands[0]!.command);
            }
          }
          else {
            console.error(`return not find`);
          }
        }
        catch {
          console.error(`parse error`);
        }
      };

      await new Promise((res, rej) => {
        g_machineSerialClient = new WebSocket(MachineSerialServerUrl);

        g_machineSerialClient.onopen = res;
        g_machineSerialClient.onclose = rej;
        g_machineSerialClient.onerror = rej;
      });

      state.value.serialOpen = true;

      g_machineSerialClient!.onmessage = (ev) => {
        state.value.serialOut = ev.data;
      };

      g_machineSerialClient!.onerror = (ev) => {
        state.value.serialOpen = false;
      };
      g_machineSerialClient!.onclose = (ev) => {
        state.value.serialOpen = false;
      };

      g_paperSave = savePaper();

      machineReady();

    })()
    .catch(() => {
      alert(`仿真启动失败：无效的可执行文件`);

      launchFaild();
    });
  }

  function selectElement(type: 'ic' | 'connection' | 'pin' | null, elementId: string | null, pinId: string | null) {
    console.log(`selectElement(${type}, ${elementId}, ${pinId})`);

    if (type === null) {
      let view = g_jointPaper.findView(elementId);
      view && joint.highlighters.mask.remove(view);

      view = g_jointPaper.findView(state.value.selectedElement.id);
      view && joint.highlighters.mask.remove(view);

      let ele = g_jointGraph.getCell(`${state.value.selectedElement.id}`);
      if (ele && ele.isLink()) {
        getIntersectingLinkSegments(ele).forEach((v) => {
          joint.highlighters.mask.remove(g_jointPaper.findViewByModel(v));
        });
      }

      for (const item of g_makeLinkSegments) {
        g_jointGraph.removeCell(item);
      }
      g_makeLinkSegments = [];

      for (const item of g_selectionLinks) {
        getIntersectingLinkSegments(item).forEach((v) => {
          view = g_jointPaper.findViewByModel(v);
          view && joint.highlighters.mask.remove(view);
        });
      }
      g_selectionLinks = [];

      if (g_makeLinkPoint) {
        g_jointGraph.removeCell(g_makeLinkPoint);
        g_makeLinkPoint = null;
      }
    }

    if (pinId && type !== 'connection') {
      if (g_pinImgMap[pinId]) {
        console.log(`selectPin: g_selectPinId=${g_selectPinId}, id=${pinId}`);

        if (g_selectPinId) {
          // check circle
          let segment = {
            id: '',
            from: {
              icId: g_selectIcId,
              pinId: g_selectPinId,
              isLinkPoint: false,
            },
            to: {
              icId: elementId!,
              pinId: pinId!,
              isLinkPoint: false,
            },
            vertices: [],
          };

          let r = state.value.connections.some((segments) => {
            let ids = segments.map((conn) => conn.from.pinId).concat(segments.map((conn) => conn.to.pinId));
            return ids.includes(segment.from.pinId) && ids.includes(segment.to.pinId);
          });

          if (r) {
            alert(`线路回环，无法创建！`);
          }
          else {
            // if ports projection, merge connection
            let mergeIdx = -1;
            state.value.connections.some((segments, idx) => {
              let ids = segments.map((conn) => conn.from.pinId).concat(segments.map((conn) => conn.to.pinId));
              let r = ids.includes(segment.from.pinId) || ids.includes(segment.to.pinId);
              if (r) {
                mergeIdx = idx;
              }
              return r;
            });

            createConnection([segment]);

            let lastSegments = state.value.connections[state.value.connections.length - 1]!;

            // push do stack after link vertices processed
            setTimeout(() => {
              for (const seg of lastSegments) {
                let link = g_jointGraph.getCell(seg.id) as joint.dia.Link;
                if (! link) {
                  continue;
                }
                seg.vertices = link.vertices();
              }

              pushDoStack();
            }, 10);

            console.log(`selectElement craete connection`);

            if (mergeIdx >= 0) {
              let segments = state.value.connections.pop()!;
              // @ts-ignore
              state.value.connections[mergeIdx] = state.value.connections[mergeIdx]?.concat(segments);
            }

            // clear
            g_pinImgMap[g_selectPinId]!.attr('image/xlink:href', g_selectPinOldImg);

            g_selectIcId = '';
            g_selectPinId = '';
          }

          selectElement(null, null, null);
          changeHighlightLinks([]);
        }
        else {
          g_selectIcId = elementId!;
          g_selectPinId = pinId;

          g_selectPinOldImg = g_pinImgMap[g_selectPinId]!.attr().image['xlink:href'];
        }
      }
    }
    else if (type !== 'connection') {
      if (g_selectPinId) {
        g_pinImgMap[g_selectPinId]!.attr('image/xlink:href', g_selectPinOldImg);

        g_selectPinId = '';
      }
    }

    state.value.selectedElement = {
      type: type,
      id: elementId,
    };

    // state.value.selectedElement = { type, id };
  }

  function jointElementRotation(icId: string, angle: number) {
    let ele = g_icGroupMap[icId];
    if (! ele) {
      return;
    }

    let center = {
      x: ele.position().x + ele.size().width / 2,
      y: ele.position().y + ele.size().height / 2,
    };

    let ic = getIcInstance(icId);
    if (ic) {
      ic.rotation = ele.angle() + angle;
    }

    ele.rotate(ele.angle() + angle, true, center);

    ele.getEmbeddedCells().forEach((v) => {
      if (! v.isElement()) {
        return;
      }

      (v as joint.dia.Element).rotate((v as joint.dia.Element).angle() + angle, true, center);
    });

    // relinkIc(icId);

    pushDoStack();
  }

  function selectRotation(angle: number) {
    if (! (state.value.selectedElement.type && state.value.selectedElement.id)) {
      return;
    }

    jointElementRotation(state.value.selectedElement.id, angle);
  }

  function selectAlign(side: 'top' | 'right' | 'bottom' | 'left', mode: 'none' | 'left' | 'average' | 'center' | 'right', _pushDoStack = true) {
    if (! g_selectionBound) {
      return;
    }
    const selectionRect = g_selectionBound.getBBox();

    function horizontalAlign(cells: joint.dia.Cell[], startX: number) {
      cells.reduce((acc, cell) => {
        let r = acc + getCellRect(cell).width;
        (cell as joint.dia.Element).translate(acc - getCellRect(cell).x, 0);
        return r;
      }, startX);
    }

    function verticalAlign(cells: joint.dia.Cell[], startY: number) {
      cells.reduce((acc, cell) => {
        let r = acc + getCellRect(cell).height;
        (cell as joint.dia.Element).translate(0, acc - getCellRect(cell).y);
        return r;
      }, startY);
    }

    switch (side) {
    case 'top': {
      switch (mode) {
      case 'none': {
        g_selectionBound.getEmbeddedCells().forEach((v) => {
          (v as joint.dia.Element).translate(0, selectionRect.y - getCellRect(v).y);
        });
      } break;

      case 'left': {
        selectAlign(side, 'none', false);

        const cells = g_selectionBound.getEmbeddedCells().sort((a, b) => {
          return getCellRect(a).x - getCellRect(b).x;
        });
        horizontalAlign(cells, selectionRect.x);
      } break;

      case 'average': {
        selectAlign(side, 'none', false);

        const cells = g_selectionBound.getEmbeddedCells().sort((a, b) => {
          return getCellRect(a).x - getCellRect(b).x;
        });
        cells.forEach((v, idx) => {
          (v as joint.dia.Element).translate(
            selectionRect.x + selectionRect.width / cells.length / 2 * (idx * 2 + 1) - getCellRect(v).width / 2 - getCellRect(v).x,
            0
          );
        });
      } break;

      case 'center': {
        selectAlign(side, 'none', false);

        const cells = g_selectionBound.getEmbeddedCells().sort((a, b) => {
          return getCellRect(a).x - getCellRect(b).x;
        });
        let startX = selectionRect.x + (selectionRect.width - cells.reduce((acc, cell) => acc + getCellRect(cell).width, 0)) / 2;
        horizontalAlign(cells, startX);
      } break;

      case 'right': {
        selectAlign(side, 'none', false);

        const cells = g_selectionBound.getEmbeddedCells().sort((a, b) => {
          return getCellRect(a).x - getCellRect(b).x;
        });
        let startX = selectionRect.x + selectionRect.width - cells.reduce((acc, cell) => acc + getCellRect(cell).width, 0);
        horizontalAlign(cells, startX);
      } break;
      }
    } break;

    case 'right': {
      switch (mode) {
      case 'none': {
        g_selectionBound.getEmbeddedCells().forEach((v) => {
          (v as joint.dia.Element).translate(selectionRect.x + selectionRect.width - getCellRect(v).width - getCellRect(v).x, 0);
        });
      } break;

      case 'left': {
        selectAlign(side, 'none', false);

        const cells = g_selectionBound.getEmbeddedCells().sort((a, b) => {
          return getCellRect(a).y - getCellRect(b).y;
        });
        verticalAlign(cells, selectionRect.y);
      } break;

      case 'average': {
        selectAlign(side, 'none', false);

        const cells = g_selectionBound.getEmbeddedCells().sort((a, b) => {
          return getCellRect(a).x - getCellRect(b).x;
        });
        cells.forEach((v, idx) => {
          (v as joint.dia.Element).translate(
            0,
            selectionRect.y + selectionRect.height / cells.length / 2 * (idx * 2 + 1) - getCellRect(v).height / 2 - getCellRect(v).y
          );
        });
      } break;

      case 'center': {
        selectAlign(side, 'none', false);

        const cells = g_selectionBound.getEmbeddedCells().sort((a, b) => {
          return getCellRect(a).y - getCellRect(b).y;
        });
        const startY = selectionRect.y + (selectionRect.height - cells.reduce((acc, cell) => acc + getCellRect(cell).height, 0)) / 2;
        verticalAlign(cells, startY);
      } break;

      case 'right': {
        selectAlign(side, 'none', false);

        const cells = g_selectionBound.getEmbeddedCells().sort((a, b) => {
          return getCellRect(a).y - getCellRect(b).y;
        });
        const startY = selectionRect.y + selectionRect.height - cells.reduce((acc, cell) => acc + getCellRect(cell).height, 0);
        verticalAlign(cells, startY);
      } break;
      }
    } break;

    case 'bottom': {
      switch (mode) {
      case 'none': {
        g_selectionBound.getEmbeddedCells().forEach((v) => {
          (v as joint.dia.Element).translate(0, selectionRect.y + selectionRect.height - getCellRect(v).y - getCellRect(v).height);
        });
      } break;

      case 'left': {
        selectAlign(side, 'none', false);

        const cells = g_selectionBound.getEmbeddedCells().sort((a, b) => {
          return getCellRect(a).x - getCellRect(b).x;
        });
        horizontalAlign(cells, selectionRect.x);
      } break;

      case 'average': {
        selectAlign(side, 'none', false);

        const cells = g_selectionBound.getEmbeddedCells().sort((a, b) => {
          return getCellRect(a).x - getCellRect(b).x;
        });
        cells.forEach((v, idx) => {
          (v as joint.dia.Element).translate(
            selectionRect.x + selectionRect.width / cells.length / 2 * (idx * 2 + 1) - getCellRect(v).width / 2 - getCellRect(v).x,
            0
          );
        });
      } break;

      case 'center': {
        selectAlign(side, 'none', false);

        const cells = g_selectionBound.getEmbeddedCells().sort((a, b) => {
          return getCellRect(a).x - getCellRect(b).x;
        });
        let startX = selectionRect.x + (selectionRect.width - cells.reduce((acc, cell) => acc + getCellRect(cell).width, 0)) / 2;
        horizontalAlign(cells, startX);
      } break;

      case 'right': {
        selectAlign(side, 'none', false);

        const cells = g_selectionBound.getEmbeddedCells().sort((a, b) => {
          return getCellRect(a).x - getCellRect(b).x;
        });
        let startX = selectionRect.x + selectionRect.width - cells.reduce((acc, cell) => acc + getCellRect(cell).width, 0);
        horizontalAlign(cells, startX);
      } break;
      }
    } break;

    case 'left': {
      switch (mode) {
      case 'none': {
        g_selectionBound.getEmbeddedCells().forEach((v) => {
          (v as joint.dia.Element).translate(selectionRect.x - getCellRect(v).x, 0);
        });
      } break;

      case 'left': {
        selectAlign(side, 'none', false);

        const cells = g_selectionBound.getEmbeddedCells().sort((a, b) => {
          return getCellRect(a).y - getCellRect(b).y;
        });
        verticalAlign(cells, selectionRect.y);
      } break;

      case 'average': {
        selectAlign(side, 'none', false);

        const cells = g_selectionBound.getEmbeddedCells().sort((a, b) => {
          return getCellRect(a).x - getCellRect(b).x;
        });
        cells.forEach((v, idx) => {
          (v as joint.dia.Element).translate(
            0,
            selectionRect.y + selectionRect.height / cells.length / 2 * (idx * 2 + 1) - getCellRect(v).height / 2 - getCellRect(v).y
          );
        });
      } break;

      case 'center': {
        selectAlign(side, 'none', false);

        const cells = g_selectionBound.getEmbeddedCells().sort((a, b) => {
          return getCellRect(a).y - getCellRect(b).y;
        });
        const startY = selectionRect.y + (selectionRect.height - cells.reduce((acc, cell) => acc + getCellRect(cell).height, 0)) / 2;
        verticalAlign(cells, startY);
      } break;

      case 'right': {
        selectAlign(side, 'none', false);

        const cells = g_selectionBound.getEmbeddedCells().sort((a, b) => {
          return getCellRect(a).y - getCellRect(b).y;
        });
        const startY = selectionRect.y + selectionRect.height - cells.reduce((acc, cell) => acc + getCellRect(cell).height, 0);
        verticalAlign(cells, startY);
      } break;
      }
    } break;
    }

    _pushDoStack && pushDoStack();
  }

  function setIcLabel(label: string, icId: string | null = null) {
    if (! icId) {
      if (! (state.value.selectedElement.type && state.value.selectedElement.id)) {
        return;
      }
      icId = state.value.selectedElement.id;
    }

    let ic = getIcInstance(icId);
    if (! ic) {
      return;
    }

    ic.label = label;

    let group = g_icGroupMap[ic.id];
    if (! group) {
      return;
    }

    group.attr('label', {
      text: label,
      refX: 0,
      refY: -group.size().height / 2 - 16,
      fontSize: 16,
    });

    pushDoStack();
  }

  function createPinImageId(ic: ICInstance, pin: PinDefinition) {
    let id = `${ic.id}.${pin.tag}.image`;
    let count = 1;

    while (ic.pinIdTable.has(id)) {
      id = `${ic.id}.${pin.tag}-${count ++}.image`;
    }
    ic.pinIdTable.add(id);

    return id;
  }

  function getIcIdByPinId(id: string) {
    let r = id.split('.')[0] || '';

    // console.info(`pinId=${id}, r=${r}`);

    return r;
  }

  function createPinId(ic: ICInstance, pin: PinDefinition) {
    return `${pin.tag}`;
  }

  function createPinAnchorId(ic: ICInstance, pin: PinDefinition) {
    return `${ic.id}.${pin.tag}.anchor`;
  }

  function getPinDefinitionFromPinId(ic: ICInstance, pinId: string) {
    let tag = pinId.split('.')[1] || '';

    for (let i in ic.icType.topPins) {
      if (ic.icType.topPins[i]!.tag === tag) {
          return ic.icType.topPins[i];
      }
    }
    for (let i in ic.icType.rightPins) {
      if (ic.icType.rightPins[i]!.tag === tag) {
          return ic.icType.rightPins[i];
      }
    }
    for (let i in ic.icType.bottomPins) {
      if (ic.icType.bottomPins[i]!.tag === tag) {
          return ic.icType.bottomPins[i];
      }
    }
    for (let i in ic.icType.leftPins) {
      if (ic.icType.leftPins[i]!.tag === tag) {
          return ic.icType.leftPins[i];
      }
    }
    return null;
  }

  function serialWrite(d: string, hex = false) {
    if (hex) {
      let ss = d.split(' ');
      let u8a = new Uint8Array(ss.length);
      ss.forEach((v, i) => {
        u8a[i] = parseInt(v, 16);
      });
      g_machineSerialClient?.send(u8a);
    }
    else {
      g_machineSerialClient?.send(d);
    }
  }

  return {
    state,
    icCategories,
    selectedIC,
    selectElementGroup,

    reset,
    savePaper,
    loadPaper,
    undo,
    redo,
    keyDelete,
    keyEscape,
    resetPaperScale,
    initJoint,
    addIC,
    updateIcState,
    icAddToJointGraph,
    createConnection,
    getMachineControlClient,
    stopSimulator,
    startSimulator,
    selectElement,
    selectRotation,
    selectAlign,
    setIcLabel,
    createPinImageId,
    createPinId,
    createPinAnchorId,
    getPinDefinitionFromPinId,
    serialWrite,
    generateUUID,
  };
});
