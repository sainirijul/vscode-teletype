export interface Position {
	row: number;
	column: number;
}


export interface TextUdpate {
	oldStart: Position;
	oldEnd: Position;
	newStart: Position;
	newEnd: Position;
	oldText: string;
	newText: string;
}

export interface Range {
	start: Position;
	end: Position;
}


export interface Selection {
	exclusive?: boolean;
	range: Range;
	reversed: boolean;
	tailed?: boolean;
}

export interface SelectionMap {
	[markerId : number]: Selection;
}
