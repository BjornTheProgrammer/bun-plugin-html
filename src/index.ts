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

function convertSrcAttribute(src: string) {
	if (src[0] == '/') src = '.' + src;

	const extension = getExtension(src);
	const newSrc = src.slice(0, src.lastIndexOf(extension));
	return newSrc + 'js';
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

		elem.setAttribute('src', convertSrcAttribute(src))

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

/**
 * Take from arnoson
 * https://gist.github.com/arnoson/3237697e8c61dfaf0356f814b1500d7b
 * */
export const cleanupEmptyFolders = (fs: typeof import('fs'), path: typeof import('path'), folder: string) => {
  if (!fs.statSync(folder).isDirectory()) return
  let files = fs.readdirSync(folder)

  if (files.length > 0) {
    files.forEach((file) => cleanupEmptyFolders(fs, path, path.join(folder, file)))
    files = fs.readdirSync(folder)
  }

  if (files.length == 0) {
    fs.rmdirSync(folder)
  }
}

const html = (): import('bun').BunPlugin => {
	return {
		name: 'bun-plugin-html',
		async setup(build) {
			const fs = await import('fs');
			const path = await import('path');
			const { parseHTML } = await import('linkedom');
			const { minify } = await import('html-minifier-terser');

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

				const scriptsGeneratedPaths = []

				for (const file of files) {
					const filePath = file.path.split('/').slice(root + 1).join('/');
					if (file.type === 'LINK') {
						if (file.file.type === 'text/css' && build.config.minify) {
							const linkTag = document.querySelector(`link[href='${file.ref}']`)
							const styleTag = document.createElement('style');
							styleTag.innerHTML = await file.file.text();
							linkTag?.insertAdjacentElement('afterend', styleTag);
							linkTag?.remove();
						} else {
							const finalDest = path.resolve(process.cwd(), build.config.outdir!, filePath);
							fs.mkdirSync(path.dirname(finalDest), { recursive: true });
							Bun.write(finalDest, file.file)
						}
					} else if (file.type === 'SCRIPT') {
						const response = await Bun.build({
							entrypoints: [file.path],
							minify: build.config.minify,
							sourcemap: build.config.sourcemap,
							outdir: path.resolve(process.cwd(), build.config.outdir!),
							root: file.path.split('/').slice(0, root + 1).join('/'),
							naming: '[dir]/[name].[ext]',
						})

						if (build.config.minify) {
							const scriptRef = convertSrcAttribute(file.ref);
							const scriptElement = document.querySelector(`script[src='${scriptRef}']`)
							if (!response.outputs?.length) {


							const fileText = (document.toString()).replace(/\t/g, '    ');
								const search = `src="${scriptRef}"`;
								const line = returnLineNumberOfOccurance(fileText, search);
								const columnNumber = getColumnNumber(fileText, fileText.indexOf(search) + search.length / 2) + `${line}`.length + 1;
								console.log(getLines(fileText, 4, line + 1));
								console.log('^'.padStart(columnNumber))
								console.error(`HTMLParseError: Specified <script> src '${scriptRef}' failed to build`)
								console.log(`      at ${entrypoint}:${line}:${columnNumber}`)
								continue;
							}
							scriptElement!.removeAttribute('src')
							const scriptFile = Bun.file(response.outputs[0].path);
							scriptElement!.innerHTML = await scriptFile.text();
							fs.unlinkSync(response.outputs[0].path);
							fs.readdirSync(path.dirname(response.outputs[0].path))
						}
					} else {
						const finalDest = path.resolve(process.cwd(), build.config.outdir!, filePath);
						fs.mkdirSync(path.dirname(finalDest), { recursive: true });

						const fileContents = build.config.minify ? await minify(document.toString(), {
							collapseWhitespace: true,
							collapseInlineTagWhitespace: true,
							caseSensitive: true,
							minifyCSS: true,
							minifyJS: true,
							removeComments: true,
							removeRedundantAttributes: true,
						}) : document.toString();

						Bun.write(finalDest, fileContents);
					}
				}

				cleanupEmptyFolders(fs, path, path.resolve(process.cwd(), build.config.outdir!))
			}


			build.onLoad({ filter: /\.(html)$/ }, async (args) => {
				return { exports: { HTMLParserPluginExportMentToBeUnused: "asdf" }, loader: 'object'}
			});
		},
	}
};

export default html;
