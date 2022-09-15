import { Shape, obstacleGrids, obstacleExtents, ObstacleType } from "./layersData";
import {Point} from './point2D';
import { Algorithm, PathFinder as PathFinder5, PathFinderProps } from "./pathFindingImpl5";
import { length, sub } from "./point2D";
import { getCurrentMapId } from "./helprs";


interface PointFeature {
	type: "Point";
	coordinates: PointLikeObject;
}

interface LineStringFeature {
	type: "LineString";
	coordinates: PointLikeObject[];
}

interface PolygonFeature {
	type: "Polygon";
	coordinates: PointLikeObject[][];
}

interface MultiPolygonFeature {
	type: "MultiPolygon";
	coordinates: PointLikeObject[][][];
}


type Geometry = PointFeature | LineStringFeature | PolygonFeature | MultiPolygonFeature;

interface AdvancedFeature {
	type: 'Feature';
	properties?: { [key: string]: unknown };
	geometry: Geometry
}

type Feature = Geometry | AdvancedFeature;


interface CRS {
	type: string;
	properties: {
		name: string;
	}
}

export interface FeatureCollection {
	type: "FeatureCollection";
	name: string;
	crs?: CRS;
	features: Feature[];
}

export const emptyFeatureCollection: FeatureCollection = {
	type: "FeatureCollection",
	name: "empty collection",
	features: []
}

interface PathData {
	label: string;
	path: Shape;
}

interface Data {
	from: Point;
	to: Point;
	path1: PathData;
	path2: PathData;
	path3: PathData;
	cellData: FeatureCollection
}

const data: Data = {
	from: { x: 0, y: 0 },
	to: { x: 0, y: 0 },
	path1: {
		label: 'Path1',
		path: [],
	},
	path2: {
		label: 'Path2',
		path: [],
	},
	path3: {
		label: 'Path3',
		path: []
	},
	cellData: emptyFeatureCollection
}

export type CellOption = 'ExploredNodes' | 'Obstacles' | 'Recursive' | 'None';

export function getCellGridLayer(pathFinder: PathFinder5, width: number, height: number, cellOption: CellOption): FeatureCollection {

	const {
		//grid,
		gridWidth,
		gridHeight,
		cellSize,
		offsetPoint
	} = obstacleGrids.current[getCurrentMapId()];

	const source: FeatureCollection = {
		"type": "FeatureCollection",
		"name": "obstacle layer",
		"features": []
	};

	function addSquareFeature(minX: number, minY: number, maxX: number, maxY: number, properties: Record<string, unknown>): Feature {
		return {
			type: 'Feature',
			properties: properties,
			geometry: {
				type: 'Polygon',
				coordinates: [
					[
						[minX, minY],
						[minX, maxY],
						[maxX, maxY],
						[maxX, minY],
						[minX, minY],
					]
				]
			}
		}
	}

	const grid = pathFinder.getGrid();
	if(cellOption === 'ExploredNodes'){
		const tenth = pathFinder.counter / 20;
		const total = pathFinder.counter + tenth;
		wlog('heeey', width, height)

		for (let j = 0; j < grid.height; j++) {
			for (let i = 0; i < grid.width; i++) {

				if (grid.nodeExists({ x: i, y: j })) {
					const minPoint = PathFinder5.gridPointToWorldPoint({ x: i, y: j }, cellSize, offsetPoint)
					const maxPoint = PathFinder5.gridPointToWorldPoint({ x: i + 1, y: j + 1 }, cellSize, offsetPoint);

					const node = grid.getNodeAt({ x: i, y: j })!;
					const isOpen = node.getIsOnOpenList();
					
					const alpha = (tenth + node.counter) /total;

					const color = isOpen ? '#88888888' : `rgba(0, 34, 170, ${alpha})`;

					source.features.push(addSquareFeature(minPoint.x, minPoint.y, maxPoint.x, maxPoint.y, {
						color, 
						counter: node.counter,
						gValue: node.getGValue(),
					}));
				}
			}	
		}
	}
	else if(cellOption === 'Obstacles'){
		for (let j = 0; j < height; j++) {
			for (let i = 0; i < width; i++) {
				
				const walkability : ObstacleType = grid.walkabilityValue({ x: i, y: j })
				let color = '#0000AA';

				switch(walkability){
					case ObstacleType.Road:
						color = `rgb(200, 0, 30)`;
						break;
					case ObstacleType.Building:
						color = `rgb(20, 200, 30)`;
						break;
					case ObstacleType.Water:
						color = `rgb(200,200,40)`;
				}

				const minPoint = PathFinder5.gridPointToWorldPoint({ x: i, y: j }, cellSize, offsetPoint);
				const maxPoint = PathFinder5.gridPointToWorldPoint({ x: i + 1, y: j + 1 }, cellSize, offsetPoint);

				source.features.push(addSquareFeature(minPoint.x, minPoint.y, maxPoint.x, maxPoint.y, {
					color
					//counter: node.counter,
					//gValue: node.getGValue(),
				}));
				
			}
		}
	}
	else if(cellOption === 'Recursive'){

		Object.values(ObstacleType).filter(x => !isNaN(x as ObstacleType)).forEach((v) => 
		{
			let color = '#0000AA88';
			switch(v){
				case ObstacleType.Road:
					color = `rgba(200, 0, 30, 0.5)`;
					break;
				case ObstacleType.Building:
					color = `rgba(20, 200, 30, 0.5)`;
					break;
				case ObstacleType.Water:
					color = `rgba(0, 50, 240, 0.5)`;
			}
			//wlog('curr map id', getCurrentMapId());
			const exts = obstacleExtents.current[getCurrentMapId()][v as ObstacleType];
			if(!exts) return;
			for(let i = 0; i < exts.length && i < 20000; i++){
				const ext = exts[i];
				const minPoint = PathFinder5.gridPointToWorldPoint({ x: ext.minX, y: ext.minY }, cellSize, offsetPoint);
				const maxPoint = PathFinder5.gridPointToWorldPoint({ x: ext.maxX, y: ext.maxY }, cellSize, offsetPoint);

				source.features.push(addSquareFeature(minPoint.x, minPoint.y, maxPoint.x, maxPoint.y, {
					color,
					zindex: 1000 - (v as number)
					//extent: `${ext.toString()}`
				}));
			}
		});
	}

	return source;
}

function updatePaths() {
	const {
		grid,
		cellSize,
		offsetPoint,
		gridHeight,
		gridWidth
	} = obstacleGrids.current[getCurrentMapId()];


	const time3 = new Date().getTime();
	
	const jpsOn = true;

	const props : PathFinderProps = {
		grid: {
			matrix: grid,
			width: gridWidth,
			height: gridHeight,
			obstacleDensityThreshold: ObstacleType.NonWalkable,
		},
		cellSize,
		offsetPoint,
		heuristic: "Manhattan",
		diagonalAllowed: true,
		useJumpPointSearch: jpsOn,
		maxComputationTimeMs: 5000,
		maxCoverageRatio: 0.1
	}

	const pathFinder3 = new PathFinder5(props);

	wlog("Data: ", data.from, data.to);

	const algorithm : Algorithm = "AStarSmooth";
	let newPath3 = pathFinder3.findPath(data.from, data.to, algorithm);
	//wlog('---------------------- PATH 2nd');
	//newPath3 = pathFinder3.findPath(data.from, data.to, algorithm);
	//newPath3 = pathFinder3.findPath(data.from, data.to, algorithm);
	const duration3 = new Date().getTime() - time3;

	data.path3.path = newPath3;
	const destination3 = PathFinder5.worldPointToGridPoint(newPath3.slice(-1)[0], cellSize, offsetPoint);
	const endNode3 = pathFinder3.getGrid().getNodeAt(destination3);
	const cost3 = endNode3?.getGValue().toFixed(2);
	const realLength = lineLength(newPath3).toFixed(2);
	
	data.path3.label = `${algorithm} ${pathFinder3.heuristic} (JPS : ${jpsOn}) ${duration3} [ms]\nG:${cost3}\nSmoothed: ${realLength}`;
	//data.cellData = getCellGridLayer(pathFinder3, gridWidth, gridHeight, 'Obstacles');
	data.cellData = getCellGridLayer(pathFinder3, 200, 150 , 'Recursive');

	//************************************************ */
	/*let pathFinderX = new PathFinder5(props);
	const pathX = pathFinderX.findPath(data.from, data.to, 'AStar');
	data.path2.path = pathX;
	data.path2.label = '';*/

	//************************************************ */

}

function lineLength(path: Point[]){

	let sum = 0;
	for(let i = 0; i < path.length-1; i++){
		const s = sub(path[i+1], path[i]);
		sum += length(s);
	}
	return sum;
}


export function updatePathsFromClick(point: [number, number]) {

	const offset = obstacleGrids.current[getCurrentMapId()].cellSize * 0.5;
	point[0] -= offset;
	point[1] -= offset;
	data.from.x = data.to.x || point[0];
	data.from.y = data.to.y || point[1];
	data.to.x = point[0];
	data.to.y = point[1];

	updatePaths();

	APIMethods.runScript(`
	Variable.find(gameModel, 'x2').setValue(self, ${data.from.x});
	Variable.find(gameModel, 'y2').setValue(self, ${data.from.y});
	`, {});
}

export function recomputePaths() {
	data.from.x = Variable.find(gameModel, 'x2').getValue(self);
	data.from.y = Variable.find(gameModel, 'y2').getValue(self);

	data.to.x = Variable.find(gameModel, 'x_CW3EaC').getValue(self);
	data.to.y = Variable.find(gameModel, 'y').getValue(self);

	updatePaths();
}

export function getPathsLayer() {
	const oGrid = obstacleGrids.current[getCurrentMapId()];

	const layer = ({
		"type": "FeatureCollection",
		"name": "Paths",
		"features":
			[
				{
					id: "path1",
					type: "Feature",
					geometry: {
						type: "LineString",
						coordinates: [...data.path1.path.map(p => [p.x+oGrid.cellSize*0.5, p.y+oGrid.cellSize*0.5])]

					},
					properties: {
						label: data.path1.label,
						fill: 'black',
					}
				},
				{
					id: "path2",
					type: "Feature",
					geometry: {
						type: "LineString",
						coordinates: [...data.path2.path.map(p => [p.x+oGrid.cellSize*0.5, p.y+oGrid.cellSize*0.5])]

					},
					properties: {
						label: data.path2.label,
						fill: 'blue',
					}
				},
				{
					id: "path3",
					type: "Feature",
					geometry: {
						type: "LineString",
						coordinates: [...data.path3.path.map(p => [p.x+oGrid.cellSize*0.5, p.y+oGrid.cellSize*0.5])]

					},
					properties: {
						label: data.path3.label,
						fill: 'hotpink',

					}
				},

			]
	});

	return layer;
}

export function getCellsLayer() {
	return data.cellData;
}


export function getCellStyle(feature: any): LayerStyleObject {

	const style : LayerStyleObject = {
		fill: {
			type: 'FillStyle',
			color: feature.getProperties().color,
		},
		stroke: {
			type: 'StrokeStyle',
			color: 'white',
			width:0.5
		},
		zIndex: feature.getProperties().zindex
	}

	if(feature.getProperties().extent){
		style.text = {
			type: 'TextStyle',
			text: `${feature.getProperties().extent}`,
			fill: {
				type: 'FillStyle',
				color: "white",
			}
		}
	}

	if(feature.getProperties().counter){
		style.text = {
			type: 'TextStyle',
			text: `${feature.getProperties().counter}`,
			fill: {
				type: 'FillStyle',
				color: "hotpink",
			}
		}
	}

	return style;
}

export function getStyle(feature: any): LayerStyleObject {
	return {
		stroke: {
			type: 'StrokeStyle',
			color: feature.getProperties().fill,
			width: 4,
		},
		text: {
			type: 'TextStyle',
			text: `${feature.getProperties().label}`,
			scale: 2,
		}
	}
}
