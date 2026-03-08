type Point = [number, number];
export type Segment = [Point, Point];

/**
 * 判断两条线段是否平行
 * @param segment1 第一条线段的两个端点坐标 [[x1, y1], [x2, y2]]
 * @param segment2 第二条线段的两个端点坐标 [[x1, y1], [x2, y2]]
 * @param tolerance 容差值，用于处理浮点数误差，默认为1e-10
 * @returns 是否平行
 */
export function areSegmentsParallel(
  segment1: Segment,
  segment2: Segment,
  tolerance: number = 1e-1
): boolean {
  // 计算第一条线段的向量
  const [p1, p2] = segment1;
  const v1 = [p2[0] - p1[0], p2[1] - p1[1]];

  // 计算第二条线段的向量
  const [q1, q2] = segment2;
  const v2 = [q2[0] - q1[0], q2[1] - q1[1]];

  // 处理零向量（线段退化为点）
  const isV1Zero = Math.abs(v1[0]!) < tolerance && Math.abs(v1[1]!) < tolerance;
  const isV2Zero = Math.abs(v2[0]!) < tolerance && Math.abs(v2[1]!) < tolerance;

  if (isV1Zero || isV2Zero) {
    // 如果至少有一个是零向量，无法定义平行关系
    return false;
  }

  // 计算叉积（判断两个向量是否共线/平行）
  // 二维向量叉积公式：v1 × v2 = v1.x * v2.y - v1.y * v2.x
  const crossProduct = v1[0]! * v2[1]! - v1[1]! * v2[0]!;

  // 如果叉积的绝对值小于容差值，则认为是平行的
  return Math.abs(crossProduct) < tolerance;
}

/**
 * 计算两条平行线段之间的最短距离
 * @param s1 第一条线段
 * @param s2 第二条线段
 * @returns 最短距离，如果线段不平行返回-1
 */
export function distanceBetweenParallelSegments(s1: Segment, s2: Segment): number {
  const [A, B] = s1;
  const [C, D] = s2;

  // 1. 检查是否平行
  const [Ax, Ay] = A;
  const [Bx, By] = B;
  const [Cx, Cy] = C;
  const [Dx, Dy] = D;

  // 计算向量
  const v1 = [Bx - Ax, By - Ay];
  const v2 = [Dx - Cx, Dy - Cy];

  const epsilon = 1e-10;

  if (! areSegmentsParallel(s1, s2)) {
    return -1; // 不平行
  }

  // 2. 计算平行线之间的距离（点C到直线AB的距离）
  const numerator = Math.abs(v1[1]! * (Cx - Ax) - v1[0]! * (Cy - Ay));
  const denominator = Math.sqrt(v1[0]! * v1[0]! + v1[1]! * v1[1]!);

  // 处理垂直线段或退化为点的情况
  if (denominator < epsilon) {
    // 线段退化为点
    const dx1 = Ax - Cx;
    const dy1 = Ay - Cy;
    return Math.sqrt(dx1 * dx1 + dy1 * dy1);
  }

  const lineDistance = numerator / denominator;

  // 3. 检查是否有重叠（投影区间有交集）
  // 计算线段在垂直方向上的投影
  const getProjection = (segment: Segment): [number, number] => {
    const [start, end] = segment;
    // 计算垂直于线段方向的向量
    const perpVector = [-v1[1]!, v1[0]];
    const perpLength = Math.sqrt(perpVector[0]! * perpVector[0]! + perpVector[1]! * perpVector[1]!);

    if (perpLength < epsilon) {
      // 线段退化为点
      return [0, 0];
    }

    // 归一化垂直向量
    const unitPerp = [perpVector[0]! / perpLength, perpVector[1]! / perpLength];

    // 计算投影值
    const projectPoint = (point: Point): number => {
      return unitPerp[0]! * point[0] + unitPerp[1]! * point[1];
    };

    const p1 = projectPoint(start);
    const p2 = projectPoint(end);

    return [Math.min(p1, p2), Math.max(p1, p2)];
  };

  const proj1 = getProjection(s1);
  const proj2 = getProjection(s2);

  // 检查投影区间是否有重叠
  const hasOverlap = !(proj1[1] < proj2[0] || proj2[1] < proj1[0]);

  if (hasOverlap) {
    // 有重叠时，距离就是平行线之间的距离
    return lineDistance;
  }

  // 4. 无重叠时，计算四个端点之间的最短距离
  const distances: number[] = [];

  // s1的端点到s2的距离
  distances.push(pointToSegmentDistance(A, s2).distance);
  distances.push(pointToSegmentDistance(B, s2).distance);

  // s2的端点到s1的距离
  distances.push(pointToSegmentDistance(C, s1).distance);
  distances.push(pointToSegmentDistance(D, s1).distance);

  return Math.min(...distances);
}

/**
 * 计算偏转角度（有符号）
 * @param p1 第一个顶点
 * @param p2 第二个顶点
 * @param p3 第三个顶点
 * @returns 偏转角度（弧度），正数表示左转，负数表示右转
 */
export function getTurnAngle(p1: Point, p2: Point, p3: Point): number {
  // 检查是否有点重合
  if (pointsEqual(p1, p2) || pointsEqual(p2, p3) || pointsEqual(p1, p3)) {
    return NaN;
  }

  // 计算向量
  const v1: Point = [p2[0] - p1[0], p2[1] - p1[1]];
  const v2: Point = [p3[0] - p2[0], p3[1] - p2[1]];

  // 计算向量长度
  const len1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]);
  const len2 = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1]);

  if (len1 === 0 || len2 === 0) return NaN;

  // 计算点积和叉积
  const dot = v1[0] * v2[0] + v1[1] * v2[1];
  const cross = v1[0] * v2[1] - v1[1] * v2[0];

  // 计算夹角
  const cosAngle = dot / (len1 * len2);
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));
  const angle = Math.acos(clampedCos);

  // 根据叉积符号确定方向
  return cross > 0 ? angle : -angle;
}

/**
 * 计算线段平移后与另一线段延长线的交点
 * @param movingSegment 要平移的线段
 * @param fixedSegment 固定线段（求其延长线）
 * @param dx x方向平移距离
 * @param dy y方向平移距离
 * @returns 交点坐标，如果不存在返回null
 */
export function findIntersectionAfterTranslation(
  movingSegment: Segment,
  fixedSegment: Segment,
  dx: number,
  dy: number
): Point | null {
  // 1. 获取平移后的线段
  const translatedSegment: Segment = [
    [movingSegment[0][0] + dx, movingSegment[0][1] + dy],
    [movingSegment[1][0] + dx, movingSegment[1][1] + dy]
  ];

  // 2. 求两条无限直线的交点
  const intersection = lineIntersection(
    translatedSegment,
    fixedSegment
  );

  // 3. 检查交点是否在fixedSegment的延长线上（总是在延长线上）
  // 和是否在translatedSegment的实际范围内
  if (intersection && isPointOnSegment(intersection, translatedSegment)) {
    return intersection;
  }

  return intersection; // 即使在延长线上也返回交点
}

/**
 * 求两条无限直线的交点
 */
function lineIntersection(line1: Segment, line2: Segment): Point | null {
  const [p1, p2] = line1;
  const [p3, p4] = line2;

  const [x1, y1] = p1;
  const [x2, y2] = p2;
  const [x3, y3] = p3;
  const [x4, y4] = p4;

  // 计算分母
  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  // 如果分母为0，说明直线平行或重合
  if (Math.abs(denominator) < 1e-10) {
    return null;
  }

  // 计算交点坐标
  const numeratorX = (x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4);
  const numeratorY = (x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4);

  const x = numeratorX / denominator;
  const y = numeratorY / denominator;

  return [x, y];
}

/**
 * 计算线段向一侧平移一段距离后的dx, dy（更直观的方向定义）
 * @param segment 原始线段
 * @param distance 平移距离（正数）
 * @param direction 平移方向：'left' 或 'right' 相对于观察者方向（从起点看向终点）
 * @returns 平移向量 [dx, dy]
 */
export function getSideShiftTranslation(
  segment: Segment,
  distance: number,
  direction: 'left' | 'right'
): [number, number] {
  const [[x1, y1], [x2, y2]] = segment;

  // 计算向量
  const vecX = x2 - x1;
  const vecY = y2 - y1;

  // 计算向量长度
  const len = Math.sqrt(vecX * vecX + vecY * vecY);

  if (len === 0) return [0, 0];

  // 归一化
  const unitX = vecX / len;
  const unitY = vecY / len;

  // 左侧法向量：逆时针旋转90度
  let normalX = -unitY;
  let normalY = unitX;

  // 根据方向调整
  if (direction === 'right') {
    normalX = unitY;
    normalY = -unitX;
  }

  // 计算平移
  const dx = normalX * distance;
  const dy = normalY * distance;

  return [dx, dy];
}

/**
 * 计算线段长度
 * @param segment 线段
 * @returns 线段长度
 */
export function segmentLength(segment: Segment): number {
  const [[x1, y1], [x2, y2]] = segment;

  // 使用欧几里得距离公式
  const dx = x2 - x1;
  const dy = y2 - y1;

  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 计算线段长度的平方（避免开方运算，用于比较时更高效）
 * @param segment 线段
 * @returns 线段长度的平方
 */
export function segmentLengthSquared(segment: Segment): number {
  const [[x1, y1], [x2, y2]] = segment;
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

export interface ProjectionResult {
  distance: number;          // 点到线段的最短距离
  projection: Point | null;  // 垂直投影点，null表示垂足在线段延长线上
  isWithinSegment: boolean;  // 垂足是否在线段上
  distanceToP1?: number;     // 点到起点距离
  distanceToP2?: number;     // 点到终点距离
  isEndPointProjection?: boolean; // 是否是端点投影
}

/**
 * 计算点到线段的最短距离和投影点
 * @param point 目标点
 * @param segment 线段 [起点, 终点]
 * @returns 包含距离、投影点等信息的对象
 */
export function pointToSegmentDistance(point: Point, segment: Segment): ProjectionResult {
  const [p, p1, p2] = [point, segment[0], segment[1]];

  // 特殊情况：线段退化为点
  if (pointsEqual(p1, p2)) {
    return {
      distance: distanceBetweenPoints(p, p1),
      projection: null,
      isWithinSegment: false,
      isEndPointProjection: true
    };
  }

  // 计算向量
  const v1: Point = [p2[0] - p1[0], p2[1] - p1[1]];  // 线段向量
  const v2: Point = [p[0] - p1[0], p[1] - p1[1]];    // 点到起点向量

  // 计算点p在v1方向上的投影系数t
  const v1Squared = v1[0] * v1[0] + v1[1] * v1[1];
  const dot = v2[0] * v1[0] + v2[1] * v1[1];
  const t = dot / v1Squared;

  // 计算投影点坐标
  let projection: Point | null = null;
  let isWithinSegment = false;
  let isEndPointProjection = false;
  let distance: number;

  if (t < 0) {
    // 垂足在线段起点之外
    projection = null;
    distance = distanceBetweenPoints(p, p1);
    isEndPointProjection = true;
  } else if (t > 1) {
    // 垂足在线段终点之外
    projection = null;
    distance = distanceBetweenPoints(p, p2);
    isEndPointProjection = true;
  } else {
    // 垂足在线段上
    projection = [p1[0] + t * v1[0], p1[1] + t * v1[1]];
    distance = distanceBetweenPoints(p, projection);
    isWithinSegment = true;
  }

  return {
    distance,
    projection,
    isWithinSegment,
    isEndPointProjection,
    distanceToP1: distanceBetweenPoints(p, p1),
    distanceToP2: distanceBetweenPoints(p, p2)
  };
}

/**
 * 计算点到直线的垂直距离和投影点
 * 不考虑垂足是否在线段上
 * @param point 目标点
 * @param line 直线 [线上点1, 线上点2]
 * @returns 垂直距离和投影点
 */
export function pointToLineDistance(point: Point, line: [Point, Point]): { distance: number; projection: Point } {
  const [p, p1, p2] = [point, line[0], line[1]];

  // 如果两个点重合，返回点到点的距离
  if (pointsEqual(p1, p2)) {
    return {
      distance: distanceBetweenPoints(p, p1),
      projection: [...p1]  // 拷贝
    };
  }

  // 计算向量
  const v1: Point = [p2[0] - p1[0], p2[1] - p1[1]];  // 直线方向向量
  const v2: Point = [p[0] - p1[0], p[1] - p1[1]];    // 点到p1向量

  // 计算点p在直线上的投影系数t
  const v1Squared = v1[0] * v1[0] + v1[1] * v1[1];
  const dot = v2[0] * v1[0] + v2[1] * v1[1];
  const t = dot / v1Squared;

  // 计算投影点
  const projection: Point = [p1[0] + t * v1[0], p1[1] + t * v1[1]];
  const distance = distanceBetweenPoints(p, projection);

  return { distance, projection };
}

/**
 * 计算两点之间的距离
 */
export function distanceBetweenPoints(p1: Point, p2: Point): number {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 判断两个点是否相等
 */
export function pointsEqual(p1: Point, p2: Point, epsilon: number = 1e-10): boolean {
  return Math.abs(p1[0] - p2[0]) < epsilon && Math.abs(p1[1] - p2[1]) < epsilon;
}

/**
 * 判断点是否在线段上
 * @param point 目标点
 * @param segment 线段
 * @param epsilon 容差
 */
export function isPointOnSegment(point: Point, segment: Segment, epsilon: number = 1e-10): boolean {
  const { distance, projection, isWithinSegment } = pointToSegmentDistance(point, segment);

  if (!projection) return false;

  // 检查投影点与目标点的距离是否在容差范围内
  if (distance > epsilon) return false;

  return isWithinSegment;
}

/**
 * 计算点到线段的方向（左侧/右侧/线上）
 * @param point 目标点
 * @param segment 线段
 * @returns 'left' | 'right' | 'on'
 */
export function pointToSegmentSide(point: Point, segment: Segment): 'left' | 'right' | 'on' {
  const [p1, p2] = segment;
  const v1: Point = [p2[0] - p1[0], p2[1] - p1[1]];
  const v2: Point = [point[0] - p1[0], point[1] - p1[1]];

  const cross = v1[0] * v2[1] - v1[1] * v2[0];
  const epsilon = 1e-10;

  if (Math.abs(cross) < epsilon) {
    return 'on';
  } else if (cross > 0) {
    return 'left';
  } else {
    return 'right';
  }
}

/**
 * 计算点到多边形的最近距离
 * @param point 目标点
 * @param polygon 多边形顶点数组
 * @returns 最近距离和对应的线段索引
 */
export function pointToPolygonDistance(point: Point, polygon: Point[]): { distance: number; segmentIndex: number; projection: Point | null } {
  if (polygon.length < 2) {
    return { distance: polygon.length === 1 ? distanceBetweenPoints(point, polygon[0]!) : Infinity, segmentIndex: -1, projection: null };
  }

  let minDistance = Infinity;
  let closestProjection: Point | null = null;
  let closestSegmentIndex = -1;

  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i]!;
    const p2 = polygon[(i + 1) % polygon.length]!;
    const segment: Segment = [p1, p2];

    const result = pointToSegmentDistance(point, segment);

    if (result.distance < minDistance) {
      minDistance = result.distance;
      closestSegmentIndex = i;
      closestProjection = result.projection || (result.isEndPointProjection ?
        (result.distanceToP1! < result.distanceToP2! ? p1 : p2) : null);
    }
  }

  return { distance: minDistance, segmentIndex: closestSegmentIndex, projection: closestProjection };
}
