import fs from 'node:fs';
import html from "../src/index";
import { expect, test, describe } from "bun:test";
import { sleep, sleepSync } from "bun";
import { emptyDir, testIfFileExists } from './utils';

describe("Testing Generation of Minified HTML", async () => {
	const generationDirectory = './test/generation/minify';
	const expectedDirectory = './test/expected/minify';

	if (fs.existsSync(generationDirectory)) emptyDir(generationDirectory);

	await Bun.build({
		entrypoints: ['./test/starting/index.html'],
		outdir: generationDirectory,
		minify: true,
		plugins: [html()],
	})

	testIfFileExists(generationDirectory, expectedDirectory, 'index.html');
	testIfFileExists(generationDirectory, expectedDirectory, 'images/favicon.ico');
});

