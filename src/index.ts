/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { BunFile } from 'bun';

/// <reference lib="dom.iterable" />
function isURL(link: string) {
	try {
		const url = new URL(link);
		return true;
	} catch (error) {
		return false;
	}
}


/**
 * Thanks to VisioN for this function, found on stackoverflow
 * https://stackoverflow.com/questions/190852/how-can-i-get-file-extensions-with-javascript/12900504#12900504
 * */
function getExtension(path: string) {
    let basename = path.split(/[\\/]/).pop();
    if (!basename) return '';
    let pos = basename.lastIndexOf('.');
    if (basename === "" || pos < 1) return '';
    return basename.slice(pos + 1);
}

function getNumberOfLines(file: string) {
	return file.split('\n').length;
}

function getLines(file: string, amount: number, end: number) {
	const start = end - amount < 0 ?  0 : end - amount;
	return file.split('\n').slice(start, end).map((l,i) => l = `${i + start + 1}:${l}`).join('\n');
}

function returnLineNumberOfOccurance(file: string, text: string) {
	for (const [i, line] of file.split('\n').entries()) {
		if (line.includes(text)) return i + 1;
	}

	return 0;
}

function getColumnNumber(file: string, index: number) {
	const lastLine = file.slice(0, index).split('\n');
	return lastLine[lastLine.length - 1].length;
}

type File = { path: string, file: BunFile, ref: string, type: 'LINK' | 'SCRIPT' | 'HTML' };

async function getAllLinks(path: typeof import('path'), document: Document, entrypoint: string): Promise<File[]> {
	const files: File[] = [];
	
	for (const link of document.querySelectorAll('link')) {
		const href = link.getAttribute('href');
		if (!href || isURL(href)) continue;

		const resolved = path.resolve(entrypoint, '..', href)
		const importFile = Bun.file(resolved);

		if (!(await importFile.exists())) {
			const fileText = (document.toString()).replace(/\t/g, '    ');
			const search = `href="${href}"`;
			const line = returnLineNumberOfOccurance(fileText, search);
			const columnNumber = getColumnNumber(fileText, fileText.indexOf(search) + search.length / 2) + `${line}`.length + 1;
			console.log(getLines(fileText, 4, line + 1));
			console.log('^'.padStart(columnNumber))
			console.error(`HTMLParseError: Specified <link> href '${href}' does not exist!`)
			console.log(`      at ${entrypoint}:${line}:${columnNumber}`)
			continue;
		}

		files.push({
			path: resolved,
			file: importFile,
			ref: href,
			type: 'LINK'
		})
	}

	return files;
}

async function getAllScripts(path: typeof import('path'), document: Document, entrypoint: string): Promise<File[]> {
	const files: File[] = [];
	
	for (const elem of document.querySelectorAll('script')) {
		let src = elem.getAttribute('src');
		if (!src || isURL(src)) continue;

		if (src[0] == '/') src = '.' + src;

		const resolved = path.resolve(entrypoint, '..', src)
		const importFile = Bun.file(resolved);

		if (!(await importFile.exists())) {
			const fileText = (document.toString()).replace(/\t/g, '    ');
			const search = `src="${elem.getAttribute('src')}"`;
			const line = returnLineNumberOfOccurance(fileText, search);
			const columnNumber = getColumnNumber(fileText, fileText.indexOf(search) + search.length / 2) + `${line}`.length + 1;
			console.log(getLines(fileText, 4, line + 1));
			console.log('^'.padStart(columnNumber))
			console.error(`HTMLParseError: Specified <script> src '${src}' does not exist!`)
			console.log(`      at ${entrypoint}:${line}:${columnNumber}`)
			continue;
		}

		const extension = getExtension(src);
		const newSrc = src.slice(0, src.lastIndexOf(extension));
		elem.setAttribute('src', newSrc + 'js')

		files.push({
			path: resolved,
			file: importFile,
			ref: src,
			type: 'SCRIPT'
		})
	}

	return files;
}

function getLastCommonDirectoryIndex(files: File[]) {
	let shortest = files[0].path.split('/').length;
	for (const file of files) {
		const splitPath = file.path.split('/').length;
		if (splitPath < shortest) shortest = splitPath;
	}

	let prevDirectory = files[0].path.split('/')[1];
	for (let i = 1; i < shortest; i++) {
		let currentDirectory = files[0].path.split('/')[i];
		for (const file of files) {
			if (file.path.split('/')[i] !== currentDirectory) return i - 1;
		}
		prevDirectory = currentDirectory;
	}

	return shortest - 2;
}

const html = (): import('bun').BunPlugin => {
	return {
		name: 'bun-plugin-html',
		async setup(build) {
			const fs = await import('fs');
			const path = await import('path');
			const {DOMParser, parseHTML} = await import('linkedom');

			for (const entrypoint of build.config.entrypoints) {
				if (getExtension(entrypoint) !== 'html') continue;

				let file = Bun.file(entrypoint);
				const { document } = parseHTML(await file.text());

				const links = await getAllLinks(path, document, entrypoint);
				const scripts = await getAllScripts(path, document, entrypoint);

				const files: File[] = [...links, ...scripts, {
					path: path.resolve(entrypoint),
					file,
					ref: '',
					type: 'HTML'
				}];

				const root = getLastCommonDirectoryIndex(files);

				for (const file of files) {
					const filePath = file.path.split('/').slice(root + 1).join('/');
					if (file.type === 'LINK') {
						const finalDest = path.resolve(process.cwd(), build.config.outdir!, filePath);
						fs.mkdirSync(path.dirname(finalDest), { recursive: true });
						Bun.write(finalDest, file.file)
					} else if (file.type === 'SCRIPT') {
						await Bun.build({
							entrypoints: [file.path],
							outdir: path.resolve(process.cwd(), build.config.outdir!),
							root: file.path.split('/').slice(0, root + 1).join('/'),
							naming: '[dir]/[name].[ext]',
						})
					} else {
						const finalDest = path.resolve(process.cwd(), build.config.outdir!, filePath);
						fs.mkdirSync(path.dirname(finalDest), { recursive: true });
						Bun.write(finalDest, document.toString());
					}
				}
			}


			build.onLoad({ filter: /\.(html)$/ }, async (args) => {
				return { exports: { HTMLParserPluginExportMentToBeUnused: "asdf" }, loader: 'object'}
			});
		},
	}
};

export default html;
