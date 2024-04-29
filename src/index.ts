/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import fs from 'fs'
import path from 'path';
import { BunFile, BunPlugin, BuildConfig, BuildOutput } from 'bun';

import { parseHTML } from 'linkedom';
import { beforeAll } from 'bun:test';
import { minify, Options as HTMLTerserOptions } from 'html-minifier-terser';
import CleanCSS, { OptionsOutput as CleanCssOptions } from 'clean-css';
import { changeFileExtension, cleanupEmptyFolders, findElementFromAttibute, findLastCommonPath, getColumnNumber, getLines, isURL, removeCommonPath, returnLineNumberOfOccurance } from './utils';
import { minify as terser, MinifyOptions } from 'terser';

export type BunPluginHTMLOptions = {
	inline?: boolean | {
		css?: boolean;
		js?: boolean;
	};
	minifyOptions?: HTMLTerserOptions;
	includeExtensions?: string[];
	excludeExtensions?: string[];
	excludeSelectors?: string[];
	plugins?: BunPlugin[];
}

const attributesToSearch = ['src', 'href', 'data', 'action'] as const;
const extensionsToBuild: readonly string[] = ['.js', '.jsx', '.ts', '.tsx'] as const;
const selectorsToExclude: readonly string[] = ['a'] as const;
export const defaultMinifyOptions: HTMLTerserOptions = {
	collapseWhitespace: true,
	collapseInlineTagWhitespace: true,
	caseSensitive: true,
	minifyCSS: {},
	minifyJS: true,
	removeComments: true,
	removeRedundantAttributes: true,
} as const;

export type File = {
	path: string,
	file: BunFile,
	attribute: {
		name: typeof attributesToSearch[number],
		value: string
	}
};

async function getAllFiles(document: Document, entrypoint: string, selector: string): Promise<File[]> {
	const files: File[] = [];
	for (const element of document.querySelectorAll(selector)) {
		let attributeName, attributeValue;

		for (const attribute of attributesToSearch) {
			if (element.hasAttribute(attribute)) {
				attributeName = attribute;
				attributeValue = element.getAttribute(attribute);
			}
		}

		if (!attributeName || !attributeValue || isURL(attributeValue)) continue;
		const resolvedPath = path.resolve(path.dirname(entrypoint), attributeValue);
		const file = Bun.file(resolvedPath);

		if (!(await file.exists())) {
			const fileText = (document.toString()).replace(/\t/g, '	');
			const search = `${attributeName}="${attributeValue}"`;
			const line = returnLineNumberOfOccurance(fileText, search);
			const columnNumber = getColumnNumber(fileText, fileText.indexOf(search) + search.length / 2) + `${line}`.length + 1;
			console.log(getLines(fileText, 4, line + 1));
			console.log('^'.padStart(columnNumber))
			console.error(`HTMLParseError: Specified <${element.tagName}> ${attributeName} '${attributeValue}' does not exist!`)
			console.log(`	  at ${entrypoint}:${line}:${columnNumber}`)
			continue;
		}

		files.push({
			path: resolvedPath,
			file,
			attribute: {
				name: attributeName,
				value: attributeValue
			}
		})
	}

	return files;
}

function getCSSMinifier(config: BuildConfig, options: HTMLTerserOptions): (text: string) => string {
	if (config.minify && options.minifyCSS !== false) {
		if (typeof options.minifyCSS === 'function') {
			return options.minifyCSS as (text: string) => string;
		} else {
			const cssOptions = typeof options.minifyCSS === 'object' ? options.minifyCSS as CleanCssOptions : {};
			const minifier = new CleanCSS(cssOptions);

			return (text: string) => {
				const output = minifier.minify(text);
				output.warnings.forEach(console.warn);
				if (output.errors.length > 0) {
					output.errors.forEach(console.error);
					return text;
				}
				return output.styles;
			};
		}
	} else {
		return (text: string) => text;
	}
}

function getJSMinifier(config: BuildConfig, options: HTMLTerserOptions): (result: BuildOutput) => Promise<BuildOutput> {
	const noop = async (result: BuildOutput) => result;
	if (config.minify) {
		return async (result: BuildOutput) => {
			if (result.success && result.outputs?.length > 0) {
				const file = Bun.file(result.outputs[0].path);
				return file.text()
					.then(async text => {
						if (typeof options.minifyJS === 'function') {
							return options.minifyJS(text, false);
						} else if (typeof options.minifyJS === 'object') {
							const result = await terser(text, options.minifyJS as MinifyOptions)
							return result.code ? result.code : text;
						} else {
							return text;
						}
					})
					.then(content => {
						Bun.write(file, content);
						return result;
					})
					.catch(err => {
						console.error(err);
						return result;
					});
			} else return result;
		}
	} else return noop;
}

const html = (options?: BunPluginHTMLOptions): BunPlugin => {
	return {
		name: 'bun-plugin-html',
		async setup(build) {
			for (const entrypoint of build.config.entrypoints) {
				if (!(path.extname(entrypoint) === '.html' || path.extname(entrypoint) === '.htm')) continue;

				let entrypointFile = Bun.file(entrypoint);
				const { document } = parseHTML(await entrypointFile.text());

				const excluded = options?.excludeSelectors ? options.excludeSelectors.concat(selectorsToExclude) : selectorsToExclude;
				const files = await getAllFiles(document, entrypoint, `:not(${excluded.join(', ')})`);

				files.push({
					path: path.resolve(entrypoint),
					file: entrypointFile,
					attribute: {
						name: 'src',
						value: entrypoint
					}
				})

				const paths = files.map(file => file.path);
				const commonPath = findLastCommonPath(paths);
				const buildExtensions = options?.includeExtensions ? options.includeExtensions.concat(extensionsToBuild) : extensionsToBuild;
				const htmlOptions = options?.minifyOptions ?? defaultMinifyOptions;
				const cssMinifier = getCSSMinifier(build.config, htmlOptions);
				const jsMinifier = getJSMinifier(build.config, htmlOptions);

				for (const file of files) {
					const extension = path.extname(file.path);
					if (options?.excludeExtensions?.includes(extension)) continue;

					switch (path.extname(file.path)) {
						case '.css':
							{
								const content = await file.file.text().then(cssMinifier);

								if (file.file !== entrypointFile && options && (options.inline === true || (typeof options.inline === 'object' && options.inline?.css === true))) {
									const element = findElementFromAttibute(document, file.attribute);
									const styleTag = document.createElement('style');
									styleTag.innerHTML = content;
									element?.insertAdjacentElement('afterend', styleTag);
									element?.remove();
								} else {
									const finalDest = path.resolve(process.cwd(), build.config.outdir!, removeCommonPath(file.path, commonPath));
									fs.mkdirSync(path.dirname(finalDest), { recursive: true });
									Bun.write(finalDest, content);
								}
							}
							break;
						case '.html':
						case '.htm':
							{
								const content = await file.file.text();

								const isEntryPoint = path.relative(file.path, entrypoint).length === 0;
								if (!isEntryPoint) {
									const element = findElementFromAttibute(document, file.attribute);
									const htmlContentHolder = document.createElement('span');
									htmlContentHolder.innerHTML = content;
									element?.insertAdjacentElement('afterend', htmlContentHolder);
									element?.remove();
								} else {
									const finalDest = path.resolve(process.cwd(), build.config.outdir!, removeCommonPath(file.path, commonPath));
									fs.mkdirSync(path.dirname(finalDest), { recursive: true });
									const fileContents = build.config.minify ? await minify(document.toString(), htmlOptions) : document.toString();
	
									Bun.write(finalDest, fileContents);
								}
							}
							break;
						default:
							if (buildExtensions.includes(extension)) {
								const response = await Bun.build({
									entrypoints: [file.path],
									minify: build.config.minify,
									sourcemap: build.config.sourcemap,
									outdir: path.resolve(process.cwd(), build.config.outdir!),
									root: commonPath,
									naming: '[dir]/[name].[ext]',
									plugins: options?.plugins,
								});

								const element = findElementFromAttibute(document, file.attribute);

								if (options && (options.inline === true || (typeof options.inline === 'object' && options.inline?.js === true))) {
									if (!response.outputs?.length) {
										const fileText = (document.toString()).replace(/\t/g, '    ');
										const search = `${file.attribute.name}="${file.attribute.value}"`;
										const line = returnLineNumberOfOccurance(fileText, search);
										const columnNumber = getColumnNumber(fileText, fileText.indexOf(search) + search.length / 2) + `${line}`.length + 1;
										console.log(getLines(fileText, 4, line + 1));
										console.log('^'.padStart(columnNumber))
										console.error(`HTMLParseError: Specified <${element?.tagName}> ${file.attribute.name} '${file.attribute.value}' failed to build`)
										console.log(`      at ${entrypoint}:${line}:${columnNumber}`)
										continue;
									}

									element!.removeAttribute('src')
									const scriptFile = Bun.file(response.outputs[0].path);
									element!.innerHTML = (await scriptFile.text()).replaceAll(/(<)(\/script>)/g, '\\x3C$2');
									fs.unlinkSync(response.outputs[0].path);
								} else {
									element?.setAttribute(file.attribute.name, changeFileExtension(file.attribute.value, '.js'));
								}
							}
							else {
								const finalDest = path.resolve(process.cwd(), build.config.outdir!, removeCommonPath(file.path, commonPath));
								fs.mkdirSync(path.dirname(finalDest), { recursive: true });
								Bun.write(finalDest, file.file);
							}
							break;
					}
				}

				cleanupEmptyFolders(path.resolve(process.cwd(), build.config.outdir!))
			}

			build.onLoad({ filter: /\.(html|htm)$/ }, async (args) => {
				throw new Error('bun-plugin-html does not support output information at this time.');
			});
		}
	}
};

export default html;
