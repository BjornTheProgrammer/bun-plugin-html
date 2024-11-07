/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import path from 'path';
import { BunFile, BunPlugin, BuildConfig, PluginBuilder, BuildArtifact, file } from 'bun';
import { minify, Options as HTMLTerserOptions } from 'html-minifier-terser';
import CleanCSS, { OptionsOutput as CleanCssOptions } from 'clean-css';
import { FileDetails, Processor, attributeToSelector, changeFileExtension, contentToString, findLastCommonPath, getColumnNumber, getLines, isURL, removeCommonPath, returnLineNumberOfOccurance } from './utils';
import { minify as terser, MinifyOptions } from 'terser';
import os from 'os';
import fs from 'fs/promises'

export type File = {
	file: BunFile, details: FileDetails
}

export type BunPluginHTMLOptions = {
	/**
	 * Whether to inline all files or not. Additionally, you can choose whether to inline just 
	 * css and js files.
	 */
	inline?: boolean | {
		css?: boolean;
		js?: boolean;
	};
	/**
	 * `bun-plugin-html`` already respects the default naming rules of Bun.build, but if you wish to override
	 * that behavior for the naming of css files, then you can do so here.
	 */
	naming?: {
		css?: string,
	};
	/**
	 * Choose how the content is minified, if `Bun.build({ minify: true })` is set.
	 */
	minifyOptions?: HTMLTerserOptions;
	/**
	 * Choose what extensions to include in building of javascript files with `Bun.build`. 
	 * 
	 * Defaults are `.js`, `.jsx`, `.ts`, and `.tsx` files.
	 */
	includeExtensions?: string[];
	/**
	 * Choose which extensions to exclude from Bun.build processing.
	 */
	excludeExtensions?: string[];
	/**
	 * Choose which selectors to exclude. Only one is excluded by default, that being `a`
	 */
	excludeSelectors?: string[];
	/**
	 * Processes the files before they are processed by `bun-plugin-html`. Useful for things like tailwindcss.
	 */
	preprocessor?: (processor: Processor) => void | Promise<void>;
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

	const files: File[] = [];
	const rewriter = new HTMLRewriter();

	const resolvedPath = path.resolve(filePath);
	const originalFile = Bun.file(resolvedPath);
	let fileText = await originalFile.text();

	const hash = Bun.hash(fileText, 1).toString(16).slice(0, 8);

	files.push({
		file: originalFile,
		details: {
			kind: 'entry-point',
			hash,
			originalPath: resolvedPath
		}
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
				details: {
					kind: 'chunk',
					attribute: {
						name: attributeName,
						value: attributeValue
					},
					hash,
					originalPath: resolvedPath
				}
			})
		},
	});

	rewriter.transform(fileText);

	return files;
}

function getExtensionFiles(files: Map<BunFile, FileDetails>, extensions: readonly string[]) {
	const result: File[] = [];
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

function getJSMinifier(config: BuildConfig, options: HTMLTerserOptions): (text: string) => Promise<string> {
	const noop = async (text: string) => text;
	if (config.minify) {
		return async (text: string) => {
			if (typeof options.minifyJS === 'function') {
				return options.minifyJS(text, false);
			} else if (typeof options.minifyJS === 'object') {
				const result = await terser(text, options.minifyJS as MinifyOptions)
				return result.code ? result.code : text;
			} else {
				return text;
			}
		}
	} else return noop;
}

async function forJsFiles(options: BunPluginHTMLOptions | undefined, build: PluginBuilder, files: Map<BunFile, FileDetails>, buildExtensions: readonly string[]) {
	const jsFiles = getExtensionFiles(files, buildExtensions);
	jsFiles.forEach(item => files.delete(item.file));

	if (!jsFiles) return;

	let naming: BuildConfig["naming"] = {}
	if (typeof build.config.naming === 'string') {
		naming.entry = build.config.naming
		naming.chunk = build.config.naming
		naming.asset = build.config.naming
	} else if (typeof build.config.naming === 'object') {
		naming.entry = build.config.naming.chunk
		naming.chunk = build.config.naming.chunk
		naming.asset = build.config.naming.asset
	} else {
		naming.entry = './[name]-[hash].[ext]'
	}

	let entrypoints = jsFiles.map(item => item.file.name!);
	if (entrypoints.length == 0) return;
	let commonPath = findLastCommonPath(entrypoints);

	const requiresTempDir = jsFiles.some(file => file.details.content !== undefined);
	let tempDirPath = await fs.mkdtemp(path.join(os.tmpdir(), 'bun-build-'));

	if (requiresTempDir) {
		// Write files with `content` to the temporary directory
		await Promise.all(jsFiles.map(async (item, index) => {
			const filePath = removeCommonPath(item.file.name!, commonPath);
			const tempFilePath = path.resolve(tempDirPath!, filePath);
			await Bun.write(tempFilePath, item.details.content ?? item.file);
			entrypoints[index] = tempFilePath;
		}));
	}

	const customResolver = (options: { pathToResolveFrom: string }): BunPlugin => {
		return {
			name: "Custom Resolver",
			setup(build) {
				build.onResolve({ filter: /[\s\S]*/ }, async (args) => {
					try {
						let resolved;
						const tempPath = path.resolve(tempDirPath, args.path);
						const originalPath = path.resolve(args.path, options.pathToResolveFrom);

						// Check if the path is a module
						const isModule = !args.path.startsWith('./') && !args.path.startsWith('../') && !args.path.startsWith('/');

						if (await Bun.file(tempPath).exists()) {
							resolved = Bun.resolveSync(args.path, tempDirPath);
						} else if (isModule || await Bun.file(originalPath).exists()) {
							resolved = Bun.resolveSync(args.path, options.pathToResolveFrom);
						} else {
							resolved = path.resolve(args.importer, '../', args.path);
						}

						return {
							...args,
							path: resolved,
						};
					} catch (error) {
						console.error("Error during module resolution:");
						console.error("Potential reasons:");
						console.error("- Missing file in specified paths");
						console.error("- Invalid file type (non-JS file)");
						console.error("If unresolved, please report to `bun-plugin-html`.");
						console.error(error);

						// Return an empty path to prevent build failure
						return {
							...args,
							path: '',
						};
					}
				});
			},
		};
	};

	const result = await Bun.build({
		...build.config,
		entrypoints,
		naming,
		outdir: undefined,
		plugins: [customResolver({
			pathToResolveFrom: commonPath
		}), ...build.config.plugins]
	})

	let index = 0;
	for (const output of result.outputs) {
		const outputText = await output.text();
		const filePath = path.resolve(`${commonPath}/${output.path}`);

		if (output.kind == 'entry-point') {
			files.set(Bun.file(filePath), {
				content: outputText,
				attribute: jsFiles[index].details.attribute,
				kind: jsFiles[index].details.kind,
				hash: output.hash || Bun.hash(outputText, 1).toString(16).slice(0, 8),
				originalPath: jsFiles[index].details.originalPath
			})
			index++;
		} else {
			files.set(Bun.file(filePath), {
				content: outputText,
				kind: output.kind,
				hash: output.hash || Bun.hash(outputText, 1).toString(16).slice(0, 8),
				originalPath: false
			})
		}
	}
}

async function forStyleFiles(options: BunPluginHTMLOptions | undefined, build: PluginBuilder, htmlOptions: HTMLTerserOptions, files: Map<BunFile, FileDetails>) {
	const cssMinifier = getCSSMinifier(build.config, htmlOptions);
	const cssFiles = getExtensionFiles(files, ['.css']);
	
	if (!cssFiles) return;

	for (const item of cssFiles) {
		const file = item.file;
		let content = contentToString(item.details.content) || file.text();
		content = cssMinifier(await content);
		files.set(file, {
			content,
			attribute: item.details.attribute,
			kind: item.details.kind,
			hash: Bun.hash(content, 1).toString(16).slice(0, 8),
			originalPath: item.details.originalPath
		});
	}
}

function mapIntoKeys(files: Map<BunFile, FileDetails>) {
	const keys = [];
	for (const key of files.keys()) {
		keys.push(key.name!);
	}

	return keys;
}

async function processHtmlFiles(options: BunPluginHTMLOptions | undefined, build: PluginBuilder, files: Map<BunFile, FileDetails>, buildExtensions: readonly string[]) {
	const htmlFiles = getExtensionFiles(files, ['.html', '.htm']);
	const toChangeAttributes: ((rewriter: HTMLRewriter) => void)[] = [];
	
	if (!htmlFiles) return toChangeAttributes;

	for (const htmlFile of htmlFiles) {
		for (const [file, details] of files) {
			const attribute = details.attribute;
			if (attribute) {
				const selector = attributeToSelector(attribute);

				const extension = path.parse(file.name!).ext;

				if (extension == '.css') {
					if (options && (options.inline === true || (typeof options.inline === 'object' && options.inline?.css === true))) {
						files.delete(file);
						toChangeAttributes.push((rewriter: HTMLRewriter) => {
							rewriter.on(selector, {
								async element(el) {
									const content = await contentToString(details.content) || await file.text();
									el.replace(`<style>${content}</style>`, {
										html: true
									})
								}
							})
						})
					}
				} else if (buildExtensions.includes(extension)) {
					if (options && (options.inline === true || (typeof options.inline === 'object' && options.inline?.js === true))) {
						files.delete(file);

						toChangeAttributes.push((rewriter: HTMLRewriter) => {
							rewriter.on(selector, {
								async element(el) {
									let content = await contentToString(details.content) || await file.text();
									content = content.replaceAll(/(<)(\/script>)/g, '\\x3C$2');

									el.removeAttribute('src');
									el.setInnerContent(content, {
										html: true
									});
								}
							})
						})
					}
				} else {
					files.set(file, {
						...details,
						kind: 'asset'
					})
				}
			}
		}
	}

	return toChangeAttributes;
}

async function renameFile(options: BunPluginHTMLOptions | undefined, build: PluginBuilder, file: BunFile, hash: string, kind: BuildArtifact["kind"], sharedPath: string) {
	let buildNamingType: 'chunk' | 'entry' | 'asset' = 'asset';
	if (kind == 'entry-point') buildNamingType = 'entry';
	if (kind == 'chunk') buildNamingType = 'chunk'
	if (kind == 'sourcemap' || kind == 'bytecode') return file;

	const extension = path.parse(file.name!).ext;

	let naming: string | undefined;
	if (extension == '.css' && options && options.naming?.css) {
		naming = options.naming.css
	} else if (typeof build.config.naming === 'string') {
		naming = build.config.naming
	} else if (typeof build.config.naming === 'object') {
		naming = build.config.naming[buildNamingType]
	}

	if (!naming) return file;

	let filePath = path.normalize(file.name!);
	filePath = filePath.replace(`${sharedPath}`, '.');
	const parsedPath = path.parse(filePath);

	let dir = parsedPath.dir;
	let ext = parsedPath.ext.replace('.', '');
	let name = parsedPath.name;

	const newPath = naming
		.replaceAll('[dir]', dir)
		.replaceAll('[hash]', `${hash}`)
		.replaceAll('[ext]', ext)
		.replaceAll('[name]', name)

	const resolved = path.resolve(sharedPath, newPath);

	return Bun.file(resolved);
}

const html = (options?: BunPluginHTMLOptions): BunPlugin => {
	return {
		name: 'bun-plugin-html',
		async setup(build) {
			build.onLoad({ filter: /\.(html|htm)$/ }, async (args) => {
				throw new Error('bun-plugin-html does not support output information at this time.');
			});

			const htmlOptions = options?.minifyOptions ?? defaultMinifyOptions;

			const excluded = options?.excludeSelectors ? options.excludeSelectors.concat(selectorsToExclude) : selectorsToExclude;
			const buildExtensions = options?.includeExtensions ? options.includeExtensions.concat(extensionsToBuild) : extensionsToBuild;

			const filesPromises = await Promise.all(build.config.entrypoints.map(entrypoint => getAllFiles(options, entrypoint, excluded)));
			let files: Map<BunFile, FileDetails> = new Map(filesPromises.flat().map(item => [item.file, item.details]));
			if (!files.size) return;

			if (options?.preprocessor) {
				const processor = new Processor(files);
				await options.preprocessor(processor);
				files = processor.export();
			}

			await forJsFiles(options, build, files, buildExtensions);
			await forStyleFiles(options, build, htmlOptions, files)
			const attributesToChange = await processHtmlFiles(options, build, files, buildExtensions)

			const keys = mapIntoKeys(files);
			const commonPath = findLastCommonPath(keys);

			const newFiles: [BunFile, FileDetails][] = [];

			for (const [file, details] of files.entries()) {
				const extension = path.parse(file.name!).ext;
				let content = details.content ?? file;

				if (buildExtensions.includes(extension)) {
					let filePath = removeCommonPath(file.name!, commonPath);
					if (build.config.outdir) filePath = path.resolve(build.config.outdir, filePath);
					newFiles.push([Bun.file(filePath), {
						content,
						attribute: details.attribute,
						kind: details.kind,
						hash: details.hash,
						originalPath: details.originalPath
					}])
					continue;
				}

				const newFile = await renameFile(options, build, file, details.hash, details.kind, commonPath);
				let filePath = removeCommonPath(newFile.name!, commonPath);
				if (build.config.outdir) filePath = path.resolve(build.config.outdir, filePath);
				newFiles.push([Bun.file(filePath), {
					content,
					attribute: details.attribute,
					kind: details.kind,
					hash: details.hash,
					originalPath: details.originalPath
				}])
			}

			const commonPathOutput = findLastCommonPath(newFiles.map(([name]) => name.name!));

			for (const [file, details] of newFiles.filter(([file, details]) => details.kind != 'entry-point')) {
				await Bun.write(file.name!, details.content!, {
					createPath: true
				});

				if (!details.attribute) continue;
				const attribute = details.attribute;
				const selector = attributeToSelector(attribute);
				const extension = path.parse(file.name!).ext;

				attributesToChange.push((rewriter) => {
					rewriter.on(selector, {
						element(el) {
							if (el.getAttribute(attribute.name) === null) return;
							let path = removeCommonPath(file.name!, commonPathOutput);
							if (buildExtensions.includes(extension)) path = changeFileExtension(path, '.js');
							el.setAttribute(attribute.name, `./${path}`)
						}
					})
				});
			}

			for (const [file, details] of newFiles.filter(([file, details]) => details.kind == 'entry-point')) {
				let fileContents = await contentToString(details.content);
				const rewriter = new HTMLRewriter();
				attributesToChange.forEach(item => item(rewriter));
				fileContents = rewriter.transform(fileContents);
				fileContents = build.config.minify ? await minify(fileContents, htmlOptions) : fileContents;

				await Bun.write(file.name!, fileContents, {
					createPath: true
				});
			}
		}
	}
};

export default html;
