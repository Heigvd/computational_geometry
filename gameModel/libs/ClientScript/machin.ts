
/// TYPES
type Point = [number, number]
type Polygon = Point[]
type Buildings = Polygon[]
type Segment = [Point, Point]

interface ObjectSegment {
	id: string,
	point: Point
	lastId: string,
	nextId: string
	angle: number
	squareDistance: number
	arrayLenght: number
	segment: Segment
}



/////////////////////////////////////////////////////////////////////////
/*
			if (theGeom.getType() === 'MultiPolygon') {
				const multi: [number, number][][][] = theGeom.getCoordinates();
				return multi.flatMap(part => part.map(subpart => subpart.map(([x, y]) => ({ x, y })));
			} else if (theGeom.getType() === 'Polygon') {
				debugger;
				return [];
			}*/


function getPBBuildings([x,y]: [number, number], radius: number, layer: any) {
	const extent = [x - radius, y - radius, x + radius, y + radius];
	const obstacles =layer.getSource().getFeaturesInExtent(extent);
	
	const buildingFeatures = obstacles.filter(feature => feature.getGeometry().getType() === "MultiPolygon");
	//wlog("Feature ", buildingFeatures);
	const coordinates = buildingFeatures.map(feature => feature.getGeometry().getCoordinates()[0][0]);
	//wlog("Coordinates: ", coordinates);
	//return [];
	return coordinates;
}

/////////////////////////////////////////////////////////////////////////

/// LOS LAYER
function angleDistanceToXY(
	startPosition: Point,
	distance: number,
	angle: number
) {
	return {
		x: startPosition[0] + distance * Math.cos(angle),
		y: startPosition[1] + distance * Math.sin(angle),
	};
}

interface VisionPoint {
	angle: number;
	squareDistance: number;
	point: Point;
}

var eps = 0.0000001;

function lineSegmentInterception(s1: Segment, s2: Segment): Point | false {
	const p0 = s1[0], p1 = s1[1],
		p2 = s2[0], p3 = s2[1]
	const s10_x = p1[0] - p0[0], s10_y = p1[1] - p0[1],
		s32_x = p3[0] - p2[0], s32_y = p3[1] - p2[1]
	const denom = s10_x * s32_y - s32_x * s10_y
	if (denom == 0) return false // collinear
	const s02_x = p0[0] - p2[0],
		s02_y = p0[1] - p2[1]
	const s_numer = s10_x * s02_y - s10_y * s02_x
	if (s_numer < 0 == denom > 0) return false // no collision
	const t_numer = s32_x * s02_y - s32_y * s02_x
	if (t_numer < 0 == denom > 0) return false // no collision
	if (s_numer > denom == denom > 0 || t_numer > denom == denom > 0) return false // no collision
	// collision detected
	const t = t_numer / denom
	return [p0[0] + (t * s10_x), p0[1] + (t * s10_y)]
}

export function computeVisionPolygon(
	position: Point,
	buildings: Buildings,
	visionDistance: number = 100,
	nbBoundingSegments: number = 50
): VisionPoint[] {
	// Creating vision bounds
	const surroundingBuildings: Buildings = [];

	for (let i = 0; i < nbBoundingSegments; ++i) {
		const { x: x1, y: y1 } = angleDistanceToXY(
			position,
			visionDistance,
			((i * 2 * Math.PI) / nbBoundingSegments) - Math.PI
		);
		const { x: x2, y: y2 } = angleDistanceToXY(
			position,
			visionDistance,
			(((i + 1) * 2 * Math.PI) / nbBoundingSegments) - Math.PI
		);

		surroundingBuildings.push([
			[x1, y1],
			[x2, y2],
		]);
	}

	//geoLogger.info("transformed",buildingFeatures[0].getGeometry().clone().transform('EPSG:4326', 'HEIG-VD').getCoordinates());
	//buildings = buildingFeatures.map(feature => feature.getGeometry().clone().transform('EPSG:4326', 'HEIG-VD').getCoordinates())


	const segments = [...surroundingBuildings, ...buildings]
		.flatMap(function mapDistanceSegments(building, bi) {
			return building.map((p, i, arr) => {
				const lastIndex = (i - 1) % arr.length;
				const nextIndex = (i + 1) % arr.length;

				// const last = arr[lastIndex];
				const next = arr[nextIndex];

				const dx = p[0] - position[0];
				const dz = p[1] - position[1];

				const objectSegment: ObjectSegment = {
					id: `${bi}-${i}`,
					point: p,
					lastId: `${bi}-${lastIndex}`,
					nextId: `${bi}-${nextIndex}`,
					angle: Math.atan2(dz, dx),
					squareDistance: dx * dx + dz * dz,
					arrayLenght: arr.length,
					segment: [p,
						next]
				}
				return objectSegment;
			});
		})
		.sort(function sortDistanceSegments(a, b) {
			return a.angle - b.angle;
		})
		.reduce<{
			[id: string]: ObjectSegment;
		}>(function reduceDistanceSegments(o, item) {
			o[item.id] = item;
			return o;
		}, {});

	const visionPoints = Object.values(segments)
		.map(function mapVisionPoints(segment) {
			const segmentFromPlayer: Segment = [
				position,
				segment.point]

			const intersections = Object.values(segments)
				.map(function mapIntersections({ segment }) {
					return lineSegmentInterception(segmentFromPlayer, segment);
					//return segment_intersection(segmentFromPlayer, segment);
				})
				.filter(function filterIntersections(intersection) {
					return intersection != false;
				})
				.map(function computeIntersections(intersection) {
					const point = (intersection as Point)
					const dx = point[0] - position[0];
					const dz = point[1] - position[1];
					const squareDistance = dx * dx + dz * dz;
					const angle = Math.atan2(dz, dx);
					return {
						angle,
						squareDistance,
						point,
					};
				})
				.sort(function sortIntersections(a, b) {
					return a.squareDistance - b.squareDistance;
				});

			return intersections[0];
		})
		.filter(function filterVisionPoints(pt) {
			return pt != null;
		});

	return [...visionPoints, visionPoints[0]];
}

export function getPblosPolygon([x, y]: Point, layer: any, radius: number, edge: number) : any {

//	wlog("Obsacles: ", layer);

	console.time("PbLos");
	console.time("PbLos:obs");
	const buildings = getPBBuildings( [x, y], radius, layer);
//	wlog("Buildings: ", buildings);

	console.timeEnd("PbLos:obs");
	console.time("PbLos:compute");
	const start = new Date().getTime();
	const data = {
		id: "LOS",
		type: "Feature",
		geometry: {
			type: "Polygon",
			coordinates: [computeVisionPolygon(
				[x, y],
				buildings, radius, edge)
				.map(vision => vision.point)],
		},
		properties: {
			label: '',
			fill: '#ff000055',
		}
	};
	data.properties.label = `\n\n\n\n\nPB in ${(new Date().getTime()) - start}ms`;

	console.timeEnd("PbLos:compute");
	console.timeEnd("PbLos");
	return data;
}

