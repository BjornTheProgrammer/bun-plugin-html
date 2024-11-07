import fs, { readdirSync } from 'node:fs';
import html from "../src/index";
import { expect, test, describe } from "bun:test";
import { emptyDir, testIfFileExists } from './utils';
import path from 'path';
import { Glob } from 'bun';

describe("Testing Using Custom Name", async () => {
	const generationDirectory = './test/generation/naming';
	const expectedDirectory = './test/expected/naming';

	if (fs.existsSync(generationDirectory)) emptyDir(generationDirectory);

	await Bun.build({
		entrypoints: ['./test/starting/index.html'],
		outdir: generationDirectory,
		naming: {
			chunk: 'chunks/[dir]/[name]-[hash].[ext]',
			asset: 'assets/[name].[ext]',
			entry: 'main.html'
		},
		plugins: [html({
			naming: {
				css: 'css/[name]-1234.[ext]'
			}
		})],
		minify: true,
	})

	test('main.html file exists', async () => {
		const filepath = path.resolve(generationDirectory, 'main.html');
		expect(await Bun.file(filepath).exists()).toEqual(true);
	})

	// testIfFileExists(generationDirectory, expectedDirectory, 'main.html');
	testIfFileExists(generationDirectory, expectedDirectory, 'css/main-1234.css');
	// testIfFileExists(generationDirectory, expectedDirectory, 'chunks/main-pgegyjtv.js');
	// testIfFileExists(generationDirectory, expectedDirectory, 'chunks/js/secondary-yn1gbx15.js');
	testIfFileExists(generationDirectory, expectedDirectory, 'assets/build-custom.cljs');
	testIfFileExists(generationDirectory, expectedDirectory, 'assets/favicon.ico');
	testIfFileExists(generationDirectory, expectedDirectory, 'assets/shubham-dhage-unsplash.jpg');
});
