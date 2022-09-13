
/// TYPES
type Point = [number, number]
type Polygon = Point[]
type Buildings = Polygon[]
type Segment = [Point, Point]

interface ObjectSegment {
	angle: number;
	point: Point | undefined;
	segment: Segment;
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


function getPBBuildings([x, y]: [number, number], radius: number, layer: any) {
	const extent = [x - radius, y - radius, x + radius, y + radius];
	const obstacles = layer.getSource().getFeaturesInExtent(extent);

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
) : Point {
	return [
		startPosition[0] + distance * Math.cos(angle),
		startPosition[1] + distance * Math.sin(angle),
	];
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
): Point[] {

	const radius2 = visionDistance * visionDistance;
	const angle = 2 * Math.PI / nbBoundingSegments;

	const circlePoints = Array.from({ length: nbBoundingSegments }, (_, i) => {
		return {
			angle: i * angle - Math.PI,
			point: undefined,
			segment: undefined,
		}
	})

	const bSegments = buildings
		.flatMap(function mapDistanceSegments(building) {
			return building.flatMap((p, i, arr) => {
				if (i+1 === arr.length){
					return [];
				}
				const nextIndex = (i + 1) % arr.length;

				// const last = arr[lastIndex];
				const next = arr[nextIndex];

				const dx = p[0] - position[0];
				const dz = p[1] - position[1];

				const objectSegment: ObjectSegment = {
					angle: Math.atan2(dz, dx),
					point: p,
					segment: [p, next]
				}
				return [objectSegment];
			});
		});

	const angles = [
		...circlePoints,
		...bSegments.map(bS => ({ angle: bS.angle, point: bS.segment![0] }))
	].sort((a, b) => a.angle - b.angle);

	const visionPoints = angles
		.flatMap(function mapVisionPoints(angle) {
			const point = angle.point || angleDistanceToXY(position, visionDistance, angle.angle);

			const segmentFromPlayer: Segment = [
				position,
				point
			];

			const intersections = bSegments
				.map(function mapIntersections({ segment }) {
					return lineSegmentInterception(segmentFromPlayer, segment!);
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
					//const angle = Math.atan2(dz, dx);
					return {
						squareDistance,
						point,
					};
				})
				.sort(function sortIntersections(a, b) {
					return a.squareDistance - b.squareDistance;
				});

			if (intersections[0] == null ||
				intersections[0].squareDistance > radius2
			) {
				if (!angle.point) {
					return [point];
				}
				return [];
			} else {
				return [intersections[0].point];
			}
		})
	return [...visionPoints, visionPoints[0]];
}

export function getPblosPolygon2([x, y]: Point, layer: any, radius: number, edge: number): any {

	//	wlog("Obsacles: ", layer);

	console.time("PbLos2");
	console.time("PbLos2:obs");
	const buildings = getPBBuildings([x, y], radius, layer);
	//	wlog("Buildings: ", buildings);

	console.timeEnd("PbLos2:obs");
	console.time("PbLos2:compute");
	const start = new Date().getTime();
	const data = {
		id: "LOS_pb_2",
		type: "Feature",
		geometry: {
			type: "Polygon",
			coordinates: [computeVisionPolygon(
				[x, y],
				buildings, radius, edge)
				],
		},
		properties: {
			label: '',
			fill: '#00ff0055',
		}
	};
	data.properties.label = `\n\n\n\n\n\n\n\nPB2 in ${(new Date().getTime()) - start}ms`;

	console.timeEnd("PbLos2:compute");
	console.timeEnd("PbLos2");
	return data;
}

