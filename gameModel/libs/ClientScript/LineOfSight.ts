import { getPblosPolygon } from "./machin";
import { getPblosPolygon2 } from "./machin2";

import { buildingLayer, Point, Segment, Shape } from './layersData';

function modulo(n: number, m: number) {
	return ((n % m) + m) % m;
}



function pointEquals(a: Point, b: Point) {
	// wlog("Point Equals, ", {a, b});
	return Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001;
}

export function cleanShape(shape: Shape): Shape {
	if (shape.length === 0) {
		return shape;
	}

	let ref = shape[shape.length - 1];
	return shape.filter(point => {
		if (pointEquals(point, ref)) {
			return false;
		}
		ref = point;
		return true;
	});
}

function add(a: Point, b: Point): Point {
	return {
		x: a.x + b.x,
		y: a.y + b.y
	}
}

function sub(a: Point, b: Point): Point {
	return {
		x: a.x - b.x,
		y: a.y - b.y
	}
}

function mul(a: Point, s: number): Point {
	return {
		x: a.x * s,
		y: a.y * s
	}
}

let debug = false;

function printCSV(shape: Shape, title: string) {
	if (debug) {
		title && wlog(title);
		shape && wlog(shape.map(({ x, y }) => `${x}\t${y}`).join("\n"));
	}
}



function printAllCSV(title: string, ...shapes: Shape[]) {
	if (!debug)
		return;
	const output: string[] = [];
	const max = shapes.reduce<number>((max, shape) => Math.max(max, shape.length), 0);
	for (let i = 0; i < max; i++) {
		shapes.forEach(shape => {
			const coord = shape[i];
			if (coord) {
				output.push(`${coord.x}\t${coord.y}\t`)
			} else {
				output.push("\t\t");
			}
			output.push("\t");
		})
		output.push("\n");
	}
	wlog(title);
	wlog(output.join(""))
}


/*
 *           B
 *          /
 * cp > 0  /
 *        /    cp < 0
 *       /
 *      /
 *     A
 */
function cross_product([a, b]: Segment, c: Point): number {
	// return ( x2 - x1 ) * ( y3 - y1 ) - ( x3 - x1 ) * ( y2 - y1 );
	return (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
}


interface Intersection {
	point: Point | undefined;
	//af: number;
	bf: number
};


/*
 *

 * 
 *                   A1
 *                  /
 *                 /
 *         b0-----P------------b1
 *               /
 *              /
 *             A0
 * 
 *        ->  0 < af < 1
 *        ->  0 < bf < 1
 * 
 **************************************************************
 *
 *	      b0------------p------------b1
 *
 * 
 *                   A1
 *                 /
 *                /
 *               /
 *              A0
 * 
 *          af > 1
 * 
 * 
 * 
 * Point is null if segment are parallel
 * af is |a0 P| / |a0 a1|
 * af is |b0 P| / |b0 b1|
 * 
 * if af >0 && af < 1 point is on A segment; if af < 0, point is before a0; if bf > 1 point is beyond a1
 *
 * same logic for bf
 */
export function getSegSemiLineIntersection(segment: Segment, semiLine: Segment): Intersection | undefined {

	const s1 = sub(segment[1], segment[0]);
	const s2 = sub(semiLine[1], semiLine[0]);

	const denom = s1.x * s2.y - s2.x * s1.y

	if (Math.abs(denom) > 0.01) {
		//debug && wlog("denom", denom);
		const dX = segment[0].x - semiLine[0].x;
		const dY = segment[0].y - semiLine[0].y;



		const sNumer = (-s1.y * dX + s1.x * dY);
		if (
			(Math.abs(sNumer) < 0.001) // s=~0
			|| (sNumer < 0 == denom < 0) // s > 0
		) {
			const tNumer = (s2.x * dY - s2.y * dX);

			//const t = tNumer / denom;

			if (
				(Math.abs(tNumer) < 0.001) // t=~0
				|| (Math.abs(tNumer - denom) < 0.001) // t=~~
				||
				(
					(tNumer < 0 == denom < 0) // t > 0
					&& (tNumer > denom == denom < 0)  // t < 1
				)) {

				const s = sNumer / denom;
				return {
					point: add(semiLine[0], mul(s2, s)),
					// af: t,
					bf: s,
				}

			} else {
				if (debug) {
					const t = tNumer / denom;
					if (t > -0.001 && t < 1.001) {
						wlog("T: ", { t, tNumer, denom });
					}
				}
			}
		} else {
			if (debug) {
				const s = sNumer / denom;
				if (s > -0.001 && s < 1.001) {
					wlog("S: ", { s, sNumer, denom });
				}
			}
		}

	}
	return undefined;
}


function getSegmentIntersection(s1: Segment, s2: Segment): Point | undefined {
	const p0 = s1[0], p1 = s1[1],
		p2 = s2[0], p3 = s2[1];

	const s10_x = p1.x - p0.x, s10_y = p1.y - p0.y,
		s32_x = p3.x - p2.x, s32_y = p3.y - p2.y;

	const denom = s10_x * s32_y - s32_x * s10_y

	if (denom == 0)
		return undefined // collinear


	//const s = (-s1.y * (a[0].x - b[0].x) + s1.x * (a[0].y - b[0].y)) / denom;
	//const t = (s2.x * (a[0].y - b[0].y) - s2.y * (a[0].x - b[0].x)) / denom;


	const s02_x = p0.x - p2.x,
		s02_y = p0.y - p2.y
	const s_numer = s10_x * s02_y - s10_y * s02_x
	if (s_numer < 0 == denom > 0) {
		// no collision: s < 0
		return undefined
	}

	const t_numer = s32_x * s02_y - s32_y * s02_x
	if (t_numer < 0 == denom > 0) {
		// no collision: t < 0
		return undefined
	}

	if (s_numer > denom == denom > 0 || t_numer > denom == denom > 0) {
		// no collision: s or t > 1
		return undefined;
	}
	// collision detected
	const t = t_numer / denom

	return { x: p0.x + (t * s10_x), y: p0.y + (t * s10_y) }
}

function projectPolar(c: Point, radius: number, angle: number): Point {
	return {
		x: c.x + Math.cos(angle) * radius,
		y: c.y + Math.sin(angle) * radius,
	}
}

function createCircle(c: Point, radius: number, nbSample: number = 28): Shape {
	const angle = 2 * Math.PI / nbSample;
	return Array.from({ length: nbSample }, (_, i) => projectPolar(c, radius, i * angle));
}


type LocalizedPoint = {
	point: Point;
	shapeIndex: number;
}

type LocalizedIntersection = {
	point: Intersection;
	shapeIndex: number;
}

function getAllRealIntersections(s: Shape, segment: Segment): LocalizedPoint[] {
	const result: LocalizedPoint[] = [];
	let ptA: Point = s[s.length - 1];

	for (let i = 0; i < s.length; i++) {
		let ptB = s[i];

		const wall: Segment = [ptA, ptB];

		const intersect = getSegmentIntersection(wall, segment);

		if (intersect != null) {
			const shapeIndex = i === 0 ? s.length -1 : i - 1;
			// modulo(i - 1, s.length)
			result.push({ point: intersect, shapeIndex: shapeIndex });
		}
		ptA = ptB;
	}

	return result;
}

function getRayIntersections(s: Shape, ray: Segment): LocalizedIntersection[] {
	const result: LocalizedIntersection[] = [];

	let j = s.length - 1;
	for (let i = 0; i < s.length; j = i++) {
		const ptA: Point = s[j];
		const ptB = s[i];

		const wall: Segment = [ptA, ptB];

		const intersect = getSegSemiLineIntersection(wall, ray);
		//debug && wlog("Intersect", intersect);
		/*if (intersect === 'colinear') {
			result.push({
				point: {
					af: 0,
					bf: 0,
					point: ptA,
				},
				shapeIndex: i,
			});
		} else */
		if (intersect != null) {
			//debug && wlog("Accepted");
			result.push({ point: intersect, shapeIndex: j });
		}
	}

	return result;
}

interface InternalPoint {
	pos: 'on' | 'in';
	ray: boolean;
	wall: boolean;
	point: Point;
	shapeRef: Shape;
	shapeIndex: number;
	shapeIndex2: number;
}

function extractPoints(shape: Shape, i: number, j: number): Shape {
	//wlog("Extract point:", i, j);
	const ps: Shape = [];
	const sL = shape.length;

	const start = modulo(i, sL);

	//	if (start === modulo(j, sL)) {
	//		return [];
	//	}


	const stop = modulo(j + 1, sL);

	let count = 0;

	debug && wlog(`Extract from [${start} to ${stop}[`);
	let k = start;
	do {
		//wlog("Extract point ", k);
		count++;
		if (shape[k] == null) {
			debugger;
		}
		ps.push(shape[k]);
		if (count > sL) {
			throw "Error: inifinite loop";
		}
		k = modulo(k + 1, sL);
	} while (k !== stop);




	return ps;
}

function getNearest(points: LocalizedIntersection[]): LocalizedIntersection {
	if (points.length === 1) {
		return points[0];
	}
	return points.sort((a, b) => {
		return a.point.bf - b.point.bf;
	})[0];
}

function getFarthest(points: LocalizedIntersection[]): LocalizedIntersection {
	if (points.length === 1) {
		return points[0];
	}
	return points.sort((a, b) => {
		return a.point.bf - b.point.bf;
	})[0];
}

function computeLineOfSight(c: Point, radius: number, obstacles: Shape[], edge: number): Shape {

	let lineOfSight = createCircle(c, radius, edge);

	obstacles.forEach(obstacle => {


		let j = obstacle.length - 1;
		for (let i = 1; i < obstacle.length; j = i++) {
			const ptA: Point = obstacle[j];
			const rayA: Segment = [c, ptA];

			const ptB = obstacle[i];
			const rayB: Segment = [c, ptB];
			const wall: Segment = [ptA, ptB];


			// which side of  rayA is B ? 
			const cp = cross_product(rayA, ptB);
			if (Math.abs(cp) > 0.01) {

				let rA = rayA;
				let rB = rayB;

				let pA = ptA;
				let pB = ptB;

				if (cp < 0) {
					// invert wall
					wall.reverse();
					rA = rayB;
					pA = ptB;
					rB = rayA;
					pB = ptA;
				}

				printCSV(lineOfSight, "LOS");

				printCSV(wall, "Wall");


				printCSV(rA, "First Ray");
				printCSV(rB, "Second Ray");

				debug && wlog("RayA");
				const allRayAI = getRayIntersections(lineOfSight, rA);
				debug && wlog("RayB");
				const allRayBI = getRayIntersections(lineOfSight, rB);

				// let rayAI: LocalizedIntersection | undefined = allRayAI[0];
				// let rayBI: LocalizedIntersection | undefined = allRayBI[0];

				const rayAI = getFarthest(allRayAI)
				const rayBI = getNearest(allRayBI);

				//if (allRayAI.length > 1) {
				// keep only farthest
				//	debug && wlog("Severay Points from RayA !", allRayAI);
				//	debugger;
				//}
				//if (allRayBI.length > 1) {
				// Always take nearest
				//rayBI = allRayBI[allRayBI.length - 1];
				//}
				/*
								if (rayAI == null || rayBI == null) {
									wlog("IMPOSSIBLE CASE: please debug");
									debugger;
								}
								if (rayAI.point == null || rayBI.point == null) {
									wlog("IMPOSSIBLE CASE: please debug");
									debugger;
								}*/
				if (pA == null || pB == null) {
					wlog("IMPOSSIBLE CASE: please debug");
					debugger;
				}
				let intersections = getAllRealIntersections(lineOfSight, wall);

				const shapeLastPoint = lineOfSight.length - 1;
				const points: InternalPoint[] = [];
				if (Math.abs(rayAI.point.bf - 1) < 0.01) {
					points.push({
						point: rayAI.point.point!,
						ray: true,
						wall: false,
						shapeRef: lineOfSight,
						shapeIndex: rayAI.shapeIndex,
						shapeIndex2: rayAI.shapeIndex === shapeLastPoint ? 0 : rayAI.shapeIndex + 1,
						pos: 'on',
					});
				} else if (rayAI.point.bf > 1) {
					points.push({
						point: rayAI.point.point!,
						ray: true,
						wall: false,
						shapeRef: lineOfSight,
						shapeIndex: rayAI.shapeIndex,
						shapeIndex2: rayAI.shapeIndex === shapeLastPoint ? 0 : rayAI.shapeIndex + 1,
						pos: 'on'
					});
					points.push({
						point: pA,
						ray: true,
						wall: true,
						shapeRef: wall,
						shapeIndex: 0,
						shapeIndex2: 0,
						pos: 'in'
					});
				} else {
					// point is out of sight: ignore
				}

				printCSV(points.map(p => p.point), "Points 1");

				intersections
					.sort((a, b) => {
						const ptA = a.point;
						const ptB = b.point;

						if (ptA == null || ptB == null) {
							debugger;
						}

						const cpA = cross_product(rA, ptA!);
						const cpB = cross_product(rA, ptB!);
						return cpA - cpB;
					})
					.forEach(ptI => {
						points.push({
							point: ptI.point,
							ray: false,
							wall: true,
							shapeRef: lineOfSight,
							shapeIndex: ptI.shapeIndex,
							shapeIndex2: ptI.shapeIndex === shapeLastPoint ? 0 : ptI.shapeIndex + 1,
							pos: 'on',
						});
					});


				printCSV(points.map(p => p.point), "Points2");

				if (Math.abs(rayBI.point.bf - 1) < 0.01) {
					points.push({
						point: rayBI.point.point!,
						ray: true,
						wall: false,
						shapeRef: lineOfSight,
						shapeIndex: rayBI.shapeIndex,
						shapeIndex2: rayBI.shapeIndex === shapeLastPoint ? 0 : rayBI.shapeIndex + 1,
						pos: 'on'
					});
				} else if (rayBI.point.bf > 1) {
					points.push({
						point: pB,
						ray: true,
						wall: true,
						shapeRef: wall,
						shapeIndex: 1,
						shapeIndex2: 1,
						pos: 'in'
					});
					points.push({
						point: rayBI.point.point!,
						ray: true,
						wall: false,
						shapeRef: lineOfSight,
						shapeIndex: rayBI.shapeIndex,
						shapeIndex2: rayBI.shapeIndex === shapeLastPoint ? 0 : rayBI.shapeIndex + 1,
						pos: 'on'
					});
				} else {
					// point is out of sight: ignore
				}

				printCSV(points.map(p => p.point), "Points3");

				let ref: InternalPoint | undefined = undefined;
				const filterdPoint: InternalPoint[] = points.filter((point) => {
					if (ref != null) {
						if (pointEquals(point.point, ref.point)) {
							return false;
						}
					}
					ref = point;
					return true;
				});
				printCSV(filterdPoint.map(p => p.point), "Filtered");

				debug && wlog("FilteredPoints: ", filterdPoint.map(p => ({ ...p, shapeRef: undefined })));

				const newLineOfSight: Shape = [];

				let firstShapeRef: number | undefined = undefined;

				let lastShapeRef: number | undefined = undefined;

				let previous: 'on' | 'in' = 'on';
				let previousType: 'los' | 'wall' | 'none' = 'none';
				let previousPoint : InternalPoint | undefined;

				for (const p of filterdPoint) {
					if (p.pos === 'in') {
						previous = 'in';
						previousType = 'wall';
						// straight line
						newLineOfSight.push(p.point);
						if (p.point == null) {
							debugger;
						}
					} else {
						// point is on current line of sight
						if (previous === 'in') {
							// straight line to reach the point
							newLineOfSight.push(p.point);
							previousType = 'wall';
							if (p.point == null) {
								debugger;
							}
						} else /*if (previous === 'on')*/ {
							if (previousType === 'none') {
								// init newLineOfSight
								firstShapeRef = p.shapeIndex;
								previousType = 'los';
								newLineOfSight.push(p.point);
								if (p.point == null) {
									debugger;
								}
							} else if (previousType === 'los') {
								if (lastShapeRef === p.shapeIndex2 || p.wall === false || previousPoint?.wall === false) {
									// new point is on same LOS segment
									previousType = 'los';
								} else {
									// new point is on another LOS segment
									previousType = 'wall';
								}

								newLineOfSight.push(p.point);
								if (p.point == null) {
									debugger;
								}
							} else /* if (previousType === 'wall') */ {
								previousType = 'los';
								// copy lineOfSight
								if (lastShapeRef != null) {
									if (lastShapeRef !== p.shapeIndex2) {
										newLineOfSight.push(
											...extractPoints(lineOfSight, lastShapeRef, p.shapeIndex),
											p.point
										);
									} else {
										newLineOfSight.push(p.point);
									}
									if (p.point == null) {
										debugger;
									}
								}
							}
						}
						previousPoint = p;
						lastShapeRef = p.shapeIndex2;
						previous = 'on';
					}
				}
				if (firstShapeRef != null && lastShapeRef != null) {
					newLineOfSight.push(
						...extractPoints(lineOfSight, lastShapeRef, firstShapeRef)

					)
					printAllCSV("CSV",
						lineOfSight,
						[...rA, ...rB],
						filterdPoint.map(p => ({ x: p.point.x, y: p.point.y })),
						wall,
						newLineOfSight
					);

					lineOfSight = cleanShape(newLineOfSight);

					debug && wlog("Update line of sight: ", lineOfSight);
				}

			} else {
				debug && wlog("Wall is aligned: skip");
			}
		}
	});

	return lineOfSight;
}


const data: { center: Point; label: string; lineOfSight: Shape; pb: any, pb2: any, buildings: Shape[] } = {
	lineOfSight: [],
	label: '',
	pb: undefined,
	pb2: undefined,
	buildings: [],
	center: { x: 0, y: 0 },
}

function updatePbLOS([x, y]: [number, number], layer: any, radius: number, edge: number) {
	data.pb = getPblosPolygon([x, y], layer, radius, edge);
}


function updatePbLOS2([x, y]: [number, number], layer: any, radius: number, edge: number) {
	data.pb2 = getPblosPolygon2([x, y], layer, radius, edge);
}

function internalUpdateLineOfSight([x, y]: [number, number], radius: number, edge: number) {

	let obstacles: Shape[] = [];
	wlog("LOS CEnter: ", [x, y]);

	console.time("LOS");
	console.time("LOS:obs");
	if (buildingLayer.current) {
		const extent = [x - radius, y - radius, x + radius, y + radius];
		obstacles = buildingLayer.current.getSource().getFeaturesInExtent(extent).flatMap(feature => {
			const theGeom = feature.getGeometry();
			debug && wlog("TheGeom ", theGeom.getType());
			if (theGeom.getType() === 'MultiPolygon') {
				const multi: [number, number][][][] = theGeom.getCoordinates();
				return multi.flatMap(part => part.map(subpart => subpart.map(([x, y]) => ({ x, y })));
			} else if (theGeom.getType() === 'Polygon') {
				debugger;
				return [];
			}
			// TODO handle multi
			// TODO handle hole
			//return theGeom.getCoordinates()[0].map(([x, y]) => ({ x, y }))
			return []
		});
		data.buildings = obstacles;
	}
	console.timeEnd("LOS:obs");
	console.time("LOS:algo");
	const start = new Date().getTime();
	data.lineOfSight = computeLineOfSight({ x, y }, radius, obstacles, edge);
	data.label = `\n\n\nM in ${(new Date().getTime()) - start}ms`;
	console.timeEnd("LOS:algo");
	console.timeEnd("LOS");
	//wlog("LineOfSight: ", data.lineOfSight, obstacles.length);
}


export function updateLineOfSight(center: [number, number], radius: number = 75, edge: number = 48) {

	debug = Variable.find(gameModel, 'debug').getValue(self);

	data.center = { x: center[0], y: center[1] };
	wlog("Update LineOfSight", { radius, edge });
	if (buildingLayer.current) {
		updatePbLOS(center, buildingLayer.current, radius, edge);
	}

	if (buildingLayer.current) {
		updatePbLOS2(center, buildingLayer.current, radius, edge);
	}

	internalUpdateLineOfSight(center, radius, edge);

	APIMethods.runScript("var v = Variable.find(gameModel, 'ddd').getInstance(self); v.setValue(!v.getValue())", {});
}


export function updateLineOfSightFromClick(center: [number, number]) {
	wlog(center);
	updateLineOfSight(center);
	APIMethods.runScript(`Variable.find(gameModel, 'x_CW3EaC').setValue(self, ${center[0]});
	Variable.find(gameModel, 'y').setValue(self, ${center[1]});`, {});
}

function convertShape(shape: Shape) {
	if(typeof shape.map !== 'function'){
		
		debugger
	}
		//return [];

	const newShape = [...shape.map(p => [p.x, p.y])];

	if (newShape[0]) {
		newShape.push(newShape[0]);
	}
	return newShape;
}

export function getLineOfSightObstacles() {
	const layer = ({
		"type": "FeatureCollection",
		"name": "LineOfSightObstacles",
		"features": data.buildings.map((shape, i) => {
			return {
				id: "lineOfSightObstacle-" + i,
				type: "Feature",
				geometry: {
					type: "Polygon",
					coordinates: [convertShape(shape)]
				}
			};
		})
	})
	return layer;
}

export function getLineOfSightLayer() {
	const los = convertShape(data.lineOfSight);

	const layer = ({
		"type": "FeatureCollection",
		"name": "LineOfSight",
		"features":
			[{
				id: "lineOfSight",
				type: "Feature",
				geometry: {
					type: "Polygon",
					coordinates: [los]
				},
				properties: {
					label: '',
					fill: '#0000ff55',
				}
			}]
	});
	layer.features[0].properties.label = data.label;

	if (data.pb2) {
		layer.features.push(data.pb2);
	}

	if (data.pb) {
		layer.features.push(data.pb);
	}

	layer.features.push({
		id: "center",
		type: "Feature",
		geometry: {
			type: "Polygon",
			coordinates: [
				convertShape(createCircle(data.center, 1, 4))
			]
		},
		properties: {
			label: '',
			fill: 'black',
		}
	});
	return layer;
}

export function recompute() {
	const x = Variable.find(gameModel, 'x_CW3EaC').getValue(self)
	const y = Variable.find(gameModel, 'y').getValue(self)
	updateLineOfSight([x, y]);
}


export function getStyle(feature: any): LayerStyleObject {
	return {
		fill: {
			type: 'FillStyle',
			color: feature.getProperties().fill,
		},
		stroke: {
			type: 'StrokeStyle',
			color: 'black',
			width: 1,
		},
		text: {
			type: 'TextStyle',
			text: `${feature.getProperties().label}`
		}
	}
}
