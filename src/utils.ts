import path from 'node:path';
import type { BuildArtifact, BunFile } from 'bun';

export type FileDetails = {
	attribute?: {
		name: string;
		value: string;
	};
	content?:
		| Blob
		| NodeJS.TypedArray
		| ArrayBufferLike
		| string
		| Bun.BlobPart[];
	kind: BuildArtifact['kind'];
	hash: string;
	originalPath: string | false;
	htmlImporter: string;
};

const urlTester = /^(#|http[s]:\/\/|\/)/i;
export function isURL(link: string) {
	if (urlTester.test(link)) {
		return true;
	}
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
	return file
		.split('\n')
		.slice(start, end)
		.map((l, i) => {
			const lineNumber = `${i + start + 1}`.padStart(maxdigits);
			return `${lineNumber}:${l}`;
		})
		.join('\n');
}

export function changeFileExtension(filePath: string, newExtension: string) {
	return path.format({ ...path.parse(filePath), base: '', ext: newExtension });
}

export function findLastCommonPath(paths: string[]) {
	if (paths.length === 0) return '';

	const allPathsIdentical = paths.every((p) => p === paths[0]);
	if (allPathsIdentical) return path.dirname(paths[0]);

	// Normalize paths and split them
	const splitPaths = paths.map((p) => path.normalize(p).split(path.sep));
	const commonPath = [];

	for (let i = 0; i < splitPaths[0].length; i++) {
		const currentPart = splitPaths[0][i];
		if (splitPaths.every((p) => p[i] === currentPart)) {
			commonPath.push(currentPart);
		} else {
			break;
		}
	}

	return commonPath.join(path.sep);
}

export function removeCommonPath(filePath: string, commonPath: string) {
	return path.relative(commonPath, filePath);
}

export function attributeToSelector(
	attribute: Exclude<FileDetails['attribute'], undefined>,
) {
	return `*[${attribute.name}="${attribute.value}"]`;
}

export function contentToString(content: FileDetails['content']) {
	if (content === undefined) return '';
	if (typeof content === 'string') return content;
	if (content instanceof Blob) return content.text();
	if (ArrayBuffer.isView(content)) return new TextDecoder().decode(content);
	if (Array.isArray(content)) return new Blob(content as BlobPart[]).text();
	if (content instanceof SharedArrayBuffer)
		return new TextDecoder().decode(new Uint8Array(content));
	return new TextDecoder().decode(content);
}

export class Processor {
	#files: Map<string, FileDetails> = new Map();

	constructor(inputs: Map<BunFile, FileDetails>) {
		for (const [file, details] of inputs) {
			if (!file.name) continue;
			this.#files.set(file.name, details);
		}
	}

	/**
	 * Get all the files, that can then be changed using writeFile.
	 */
	getFiles() {
		const fileList: {
			path: string;
			content: Promise<string> | string;
			extension: string;
		}[] = [];

		for (const [filepath, details] of this.#files) {
			const extension = path.parse(filepath).ext;
			fileList.push({
				path: filepath,
				content: contentToString(details.content) || Bun.file(filepath).text(),
				extension,
			});
		}

		return fileList;
	}

	/**
	 * Writes the specified file at filepath with the specified content.
	 *
	 * If the path is the same as what the original file path was, then this will overwrite the content in that file.
	 *
	 * If it isn't this creates a new file which will be outputted to the outdir. New files are treated as chunks.
	 */
	writeFile(filepath: string, content: string) {
		if (!path.isAbsolute(filepath)) throw new Error('Path MUST be absolute');
		if (this.#files.has(filepath)) {
			const fileDetails = this.#files.get(filepath) as FileDetails;
			this.#files.set(filepath, {
				...fileDetails,
				content,
			});
		} else {
			this.#files.set(filepath, {
				kind: 'chunk',
				hash: Bun.hash(content, 1).toString(16).slice(0, 8),
				content,
				originalPath: filepath,
				htmlImporter: '',
			});
		}
	}

	/**
	 * This should only be called by the internals
	 */
	export() {
		const files: Map<BunFile, FileDetails> = new Map();

		for (const [filepath, details] of this.#files) {
			files.set(Bun.file(filepath), details);
		}

		return files;
	}
}
