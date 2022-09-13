export interface Point {
	x: number;
	y: number;
}

export type Segment = [Point, Point]


export function sub(a: Point, b: Point): Point{
	return {x: a.x - b.x, y: a.y - b.y};
}

export function add(a: Point, b: Point): Point{
	return {x: a.x + b.x, y: a.y + b.y};
}

export function equalsStrict(a : Point, b: Point): boolean{
	return a.x === b.x && a.y === b.y;
}

export function equals(a: Point, b: Point, epsilon: number = 0.00001): boolean{
  return (Math.abs(a.x -b.x) < epsilon && Math.abs(a.y - b.y) < epsilon)
}

export function mul(a: Point, multiplicand: number): Point {
	return {x: a.x * multiplicand, y: a.y * multiplicand};
}

export function dot(a: Point, b: Point): number {
	return a.x * b.x + a.y * b.y;
}

export function lengthSquared(a: Point): number {
	return dot(a, a);
}

export function length(a: Point): number {
  return Math.sqrt(lengthSquared(a));
}

export function proj(a: Point, b: Point): Point {
	const abProduct = dot(a, b);
	const bbProduct = dot(b, b);
	if (bbProduct > 0) {
		const k = abProduct / bbProduct;
		return mul(b, k);
	} else {
		// AB is not a segment but a point (a === b)
		return a;
	}
}

export function lineSegmentInterception(s1: Segment, s2: Segment): Point | false {
	const p0 = s1[0], p1 = s1[1],
		p2 = s2[0], p3 = s2[1]
	const s10_x = p1.x - p0.x, s10_y = p1.y - p0.y,
		s32_x = p3.x - p2.x, s32_y = p3.y - p2.y
	const denom = s10_x * s32_y - s32_x * s10_y
	if (denom == 0) return false // collinear
	const s02_x = p0.x - p2.x,
		s02_y = p0.y - p2.y
	const s_numer = s10_x * s02_y - s10_y * s02_x
	if (s_numer < 0 == denom > 0) return false // no collision
	const t_numer = s32_x * s02_y - s32_y * s02_x
	if (t_numer < 0 == denom > 0) return false // no collision
	if (s_numer > denom == denom > 0 || t_numer > denom == denom > 0) return false // no collision
	// collision detected
	const t = t_numer / denom
	return { x: p0.x + (t * s10_x), y: p0.y + (t * s10_y) }
}

export function isPointInPolygon(point: Point, polygon: Point[]) {
	// code from Randolph Franklin (found at http://local.wasp.uwa.edu.au/~pbourke/geometry/insidepoly/)
	const { x, y } = point;
	let c = false;

	polygon.forEach((p, i, arr) => {
		const p1 = p;
		const p2 = arr[(i + 1) % arr.length];

		if (
			((p1.y <= y && y < p2.y) || (p2.y <= y && y < p1.y)) &&
			x < ((p2.x - p1.x) * (y - p1.y)) / (p2.y - p1.y) + p1.x
		) {
			c = !c;
		}
	});

	return c;
}

