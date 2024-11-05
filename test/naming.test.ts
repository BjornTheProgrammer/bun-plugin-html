import fs from 'node:fs';
import html from "../src/index";
import { expect, test, describe } from "bun:test";
import { sleep, sleepSync } from "bun";
import { emptyDir, testIfFileExists } from './utils';

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
	})

	testIfFileExists(generationDirectory, expectedDirectory, 'main.html');
	testIfFileExists(generationDirectory, expectedDirectory, 'css/main-1234.css');
	testIfFileExists(generationDirectory, expectedDirectory, 'chunks/main-xb0qxkma.js');
	testIfFileExists(generationDirectory, expectedDirectory, 'chunks/js/secondary-1h16109t.js');
	testIfFileExists(generationDirectory, expectedDirectory, 'assets/build-custom.cljs');
	testIfFileExists(generationDirectory, expectedDirectory, 'assets/favicon.ico');
	testIfFileExists(generationDirectory, expectedDirectory, 'assets/shubham-dhage-unsplash.jpg');
});
