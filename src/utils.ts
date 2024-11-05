import { BuildArtifact } from 'bun';
import path from 'path';

export type FileDetails = {
	attribute?: {
		name: string,
		value: string
	}
	content?: Blob | NodeJS.TypedArray | ArrayBufferLike | string | Bun.BlobPart[],
	kind: BuildArtifact["kind"],
	hash: string,
	originalPath: string | false,
}

export function isURL(link: string) {
	try {
		const url = new URL(link);
		return true;
	} catch (error) {
		return false;
	}
}

export function returnLineNumberOfOccurance(file: string, text: string) {
	for (const [i, line] of file.split('\n').entries()) {
		if (line.includes(text)) return i + 1;
	}

	return 0;
}

export function getColumnNumber(file: string, index: number) {
	const lastLine = file.slice(0, index).split('\n');
	return lastLine[lastLine.length - 1].length;
}

export function getLines(file: string, amount: number, end: number) {
	const maxdigits = end.toString().length;
	const start = end - amount < 0 ? 0 : end - amount;
	return file.split('\n').slice(start, end).map((l, i) => {
		const lineNumber = `${i + start + 1}`.padStart(maxdigits);
		return `${lineNumber}:${l}`
	}).join('\n');
}

export function changeFileExtension(filePath: string, newExtension: string) {
	return path.format({ ...path.parse(filePath), base: '', ext: newExtension })
}

export function findLastCommonPath(paths: string[]) {
	if (paths.length === 0) return '';

	const allPathsIdentical = paths.every(p => p === paths[0]);
	if (allPathsIdentical) return path.dirname(paths[0]);

	// Normalize paths and split them
	let splitPaths = paths.map(p => path.normalize(p).split(path.sep));
	let commonPath = [];

	for (let i = 0; i < splitPaths[0].length; i++) {
		let currentPart = splitPaths[0][i];
		if (splitPaths.every(p => p[i] === currentPart)) {
			commonPath.push(currentPart);
		} else {
			break;
		}
	}

	return commonPath.join(path.sep);
}

export function removeCommonPath(filePath: string, commonPath: string) {
	let normalizedPath = path.normalize(filePath);
	return normalizedPath.substring(commonPath.length + (commonPath.length > 0 ? path.sep.length : 0));
}

export function attributeToSelector(attribute: Exclude<FileDetails["attribute"], undefined>) {
	return `*[${attribute.name}="${attribute.value}"]`
}
