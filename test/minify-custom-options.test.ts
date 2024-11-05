import fs from 'node:fs';
import html, { defaultMinifyOptions } from "../src/index";
import { expect, test, describe } from "bun:test";
import { sleep, sleepSync } from "bun";
import { emptyDir, testIfFileExists } from './utils';

describe("Testing Generation of Minified HTML with Custom", async () => {
	const generationDirectory = './test/generation/minify-custom-options';
	const expectedDirectory = './test/expected/minify-custom-options';

	if (fs.existsSync(generationDirectory)) emptyDir(generationDirectory);

	await Bun.build({
		entrypoints: ['./test/starting/index.html'],
		outdir: generationDirectory,
		minify: true,
		plugins: [html({
			minifyOptions: {
				...defaultMinifyOptions,
				removeStyleLinkTypeAttributes: true,
				minifyCSS: { format: 'beautify' },
				minifyJS: { format: { beautify: true } }
			}
		})],
		naming: '[dir]/[name].[ext]',
	})

	testIfFileExists(generationDirectory, expectedDirectory, 'index.html');
	testIfFileExists(generationDirectory, expectedDirectory, 'main.css');
});

