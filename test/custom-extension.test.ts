import { describe } from 'bun:test';
import fs from 'node:fs';
import type { PluginBuilder } from 'bun';
import html from '../src/index';
import { emptyDir, testFileDoesntExist, testIfFileExists } from './utils';

import 'squint-cljs'; // somehow I needed to pre-require this;
const squintLoader = {
	name: 'squint loader',
	async setup(build: PluginBuilder) {
		// @ts-ignore
		const { compileString } = await import('squint-cljs');
		const { readFileSync } = await import('node:fs');
		// when a .cljs file is imported...
		build.onLoad({ filter: /\.cljs$/ }, ({ path }) => {
			// read and compile it with squint
			const file = readFileSync(path, 'utf8');
			const contents = compileString(file);
			// and return the compiled source code as "js"
			return {
				contents,
				loader: 'js',
			};
		});
	},
};

describe('Testing Generation of Custom Extension', async () => {
	const generationDirectory = './test/generation/custom-extension';
	const expectedDirectory = './test/expected/custom-extension';

	if (fs.existsSync(generationDirectory)) emptyDir(generationDirectory);

	await Bun.build({
		entrypoints: ['./test/starting/index.html'],
		outdir: generationDirectory,
		plugins: [
			squintLoader,
			html({
				includeExtensions: ['.cljs'],
				excludeExtensions: ['.css', '.ico', '.tsx'],
			}),
		],
		naming: '[dir]/[name].[ext]',
	});

	testIfFileExists(generationDirectory, expectedDirectory, 'index.html');
	testIfFileExists(generationDirectory, expectedDirectory, 'main.js');
	testIfFileExists(
		generationDirectory,
		expectedDirectory,
		'js/build-custom.js',
	);

	testFileDoesntExist(generationDirectory, 'js/build-custom.cljs');
});
