/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import fs from 'fs'
import path from 'path';
import { BunFile, BunPlugin, BuildConfig, BuildOutput, PluginBuilder, BuildArtifact } from 'bun';
import { minify, Options as HTMLTerserOptions } from 'html-minifier-terser';
import CleanCSS, { OptionsOutput as CleanCssOptions } from 'clean-css';
import { attributeToSelector, changeFileExtension, cleanupEmptyFolders, findLastCommonPath, getColumnNumber, getLines, isURL, removeCommonPath, returnLineNumberOfOccurance } from './utils';
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

async function getAllFiles(options: BunPluginHTMLOptions | undefined, filePath: string, excluded: readonly string[]) {
	const extension = path.parse(filePath).ext;
	if (extension !== '.htm' && extension !== '.html') return [];

	const files: {file: BunFile, attribute?: FileDetails["attribute"], kind?: FileDetails["kind"]}[] = [];
	const rewriter = new HTMLRewriter();

	const resolvedPath = path.resolve(filePath);
	const originalFile = Bun.file(resolvedPath);
	let fileText = await originalFile.text();

	files.push({
		file: originalFile,
		kind: 'entry-point'
	});

	let excludedSelector = '';

	for (const exclude of excluded) {
		excludedSelector += `:not(${exclude})`
	}

	rewriter.on(excludedSelector, {
		async element(el) {
			let attributeName, attributeValue;

			for (const attribute of attributesToSearch) {
				if (el.hasAttribute(attribute)) {
					attributeName = attribute;
					attributeValue = el.getAttribute(attribute);
					break;
				}
			}

			if (!attributeName || !attributeValue || isURL(attributeValue)) return;
			const resolvedPath = path.resolve(path.dirname(filePath), attributeValue);
			const extension = path.parse(resolvedPath).ext;
			if (options?.excludeExtensions?.includes(extension)) return;
			const file = Bun.file(resolvedPath);

			if (!(await file.exists())) {
				fileText = fileText.replace(/\t/g, '	');
				const search = `${attributeName}="${attributeValue}"`;
				const line = returnLineNumberOfOccurance(fileText, search);
				const columnNumber = getColumnNumber(fileText, fileText.indexOf(search) + search.length / 2) + `${line}`.length + 1;
				console.log(getLines(fileText, 4, line + 1));
				console.log('^'.padStart(columnNumber))
				console.error(`HTMLParseError: Specified <${el.tagName}> ${attributeName} '${attributeValue}' does not exist!`)
				console.log(`	  at ${filePath}:${line}:${columnNumber}`)
				return;
			}
			
			files.push({
				file,
				attribute: {
					name: attributeName,
					value: attributeValue
				}
			})
		},
	});

	rewriter.transform(fileText);

	return files;
}

function getExtensionFiles(files: Map<BunFile, FileDetails>, extensions: readonly string[]) {
	const result: {file: BunFile, details: FileDetails}[] = [];
	for (const [file, details] of files.entries()) {
		const extension = path.parse(file.name!).ext;
		if (!extensions.includes(extension)) continue;

		result.push({file, details});
	}

	return result;
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

async function forJsFiles(build: PluginBuilder, files: Map<BunFile, FileDetails>, buildExtensions: readonly string[]) {
	const jsFiles = getExtensionFiles(files, buildExtensions);
	jsFiles.forEach(item => files.delete(item.file));

	if (!jsFiles) return;

	const entrypoints = jsFiles.map(item => item.file.name!);
	const result = await Bun.build({
		...build.config,
		entrypoints,
		outdir: undefined,
	})


	const commonPath = findLastCommonPath(entrypoints);

	for (const [index, output] of result.outputs.entries()) {
		const outputText = await output.text();
		const filePath = path.resolve(`${commonPath}/${output.path}`);
		files.set(Bun.file(filePath), {
			content: outputText,
			attribute: jsFiles[index].details.attribute,
			kind: jsFiles[index].details.kind
		})
	}
}

async function forStyleFiles(options: BunPluginHTMLOptions | undefined, build: PluginBuilder, files: Map<BunFile, FileDetails>) {
	const htmlOptions = options?.minifyOptions ?? defaultMinifyOptions;
	const cssMinifier = getCSSMinifier(build.config, htmlOptions);
	const cssFiles = getExtensionFiles(files, ['.css']);
	
	if (!cssFiles) return;

	for (const item of cssFiles) {
		const file = item.file;
		const content = await file.text().then(cssMinifier);
		files.set(file, { content, kind: item.details.kind });
	}
}

function mapIntoKeys(files: Map<BunFile, FileDetails>) {
	const keys = [];
	for (const key of files.keys()) {
		keys.push(key.name!);
	}

	return keys;
}

async function forHtmlFiles(options: BunPluginHTMLOptions | undefined, build: PluginBuilder, files: Map<BunFile, FileDetails>, buildExtensions: readonly string[]) {
	const htmlOptions = options?.minifyOptions ?? defaultMinifyOptions;
	const htmlFiles = getExtensionFiles(files, ['.html', '.htm']);
	
	if (!htmlFiles) return;

	const keys = mapIntoKeys(files);
	const commonPath = findLastCommonPath(keys);

	for (const htmlFile of htmlFiles) {
		let rewriter = new HTMLRewriter();

		for (const [file, details] of files) {
			const attribute = details.attribute;
			if (attribute) {
				const selector = attributeToSelector(attribute);

				const extension = path.parse(file.name!).ext;

				if (extension == '.css' && options && (options.inline === true || (typeof options.inline === 'object' && options.inline?.css === true))) {
					files.delete(file);
					rewriter.on(selector, {
						async element(el) {
							const content = details.content ?? await file.text();
							el.replace(`<style>${content}</style>`)
						}
					})
				} else if (buildExtensions.includes(extension)) {
					if (options && (options.inline === true || (typeof options.inline === 'object' && options.inline?.js === true))) {
						files.delete(file);
						rewriter.on(selector, {
							async element(el) {
								let content = details.content ? details.content.toString() : await file.text();
								content = content.replaceAll(/(<)(\/script>)/g, '\\x3C$2');

								el.removeAttribute('src');
								el.setInnerContent(content);
							}
						})
					}
				} else {
					files.set(file, {
                        kind: 'asset'
                    });
				}

				rewriter.on(selector, {
					element(el) {
						if (el.getAttribute(attribute.name) === null) return;
						let path = removeCommonPath(file.name!, commonPath);
						if (buildExtensions.includes(extension)) path = changeFileExtension(path, '.js');
						el.setAttribute(attribute.name, `./${path}`)
					}
				})
			}
		}

		const htmlFileText = rewriter.transform(await htmlFile.file.text());
		const fileContents = build.config.minify ? await minify(htmlFileText, htmlOptions) : htmlFileText;

		files.set(htmlFile.file, {
			content: fileContents,
			kind: htmlFile.details.kind
		})
	}
}

async function renameFiles(build: PluginBuilder, files: Map<BunFile, FileDetails>) {
	let dir, hash, ext, name;
	if (typeof build.config.naming === 'string') {
		for (const [file, details] of files) {
			const filePath = file.name!
			const parsedPath = path.parse(filePath);

			dir = parsedPath.dir;
			hash = Bun.hash(await file.arrayBuffer())
			ext = parsedPath.ext.replace('.', '');
			name = parsedPath.name;

			const newPath = build.config.naming
				.replaceAll('[dir]', dir)
				.replaceAll('[hash]', `${hash}`)
				.replaceAll('[ext]', ext)
				.replaceAll('[name]', name)

			files.delete(file);
			files.set(Bun.file(path.resolve(newPath)), {
                content: file,
                kind: details.kind
            })
		}
	}
}

export type FileDetails = {
	attribute?: {
		name: string,
		value: string
	}
	content?: Blob | NodeJS.TypedArray | ArrayBufferLike | string | Bun.BlobPart[],
	kind: BuildArtifact["kind"]
}

const html = (options?: BunPluginHTMLOptions): BunPlugin => {
	return {
		name: 'bun-plugin-html',
		async setup(build) {
			build.onLoad({ filter: /\.(html|htm)$/ }, async (args) => {
				throw new Error('bun-plugin-html does not support output information at this time.');
			});

			const excluded = options?.excludeSelectors ? options.excludeSelectors.concat(selectorsToExclude) : selectorsToExclude;
			const buildExtensions = options?.includeExtensions ? options.includeExtensions.concat(extensionsToBuild) : extensionsToBuild;

			const filesPromises = await Promise.all(build.config.entrypoints.map(entrypoint => getAllFiles(options, entrypoint, excluded)));
			const files: Map<BunFile, FileDetails> = new Map(filesPromises.flat().map(item => [item.file, { attribute: item.attribute, kind: item.kind || 'chunk' }]));
			if (!files.size) return;

			await forJsFiles(build, files, buildExtensions);
			await forStyleFiles(options, build, files)
			await forHtmlFiles(options, build, files, buildExtensions)

			const keys = mapIntoKeys(files);
			const commonPath = findLastCommonPath(keys);

			for (const [file, details] of files.entries()) {
				let content = details.content ?? file;
				let filePath = removeCommonPath(file.name!, commonPath);

				if (build.config.outdir) filePath = path.resolve(build.config.outdir, filePath);
				await Bun.write(filePath, content);
			}
		}
	}
};

export default html;
