
export function getOverlayItems() : OverlayItem[] {
	return [
		{
			overlayProps: {
				position: [2539067, 1181238],
				stopEvent: false,
			},
			payload: {
				id: 'one'
			}
		}, {
			overlayProps: {
				position: [2539017, 1181187],
				stopEvent: false,
			},
			payload: {
				id: 'two'
			}
		}
	];
}

let currentMapId = 'yverdon';

export function getCurrentMapId(): string{
	return currentMapId;
}

export function setCurrentMapId(mapId : string){
	currentMapId = mapId
}
