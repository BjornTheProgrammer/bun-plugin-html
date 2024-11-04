import fs from 'node:fs';
import html from "../src/index";
import { expect, test, describe } from "bun:test";
import { sleep, sleepSync } from "bun";
import { emptyDir, testFileDoesntExist, testIfFileExists } from './utils';

describe("Testing Generation of Exclude Extension", async () => {
	const generationDirectory = './test/generation/exclude-extensions';
	const expectedDirectory = './test/expected/exclude-extensions';

	if (fs.existsSync(generationDirectory)) emptyDir(generationDirectory);

	await Bun.build({
		entrypoints: ['./test/starting/index.html'],
		outdir: generationDirectory,
		plugins: [html({excludeExtensions: ['.css', '.ico', '.tsx']})],
	})

	testIfFileExists(generationDirectory, expectedDirectory, 'index.html');
	testIfFileExists(generationDirectory, expectedDirectory, 'main.js');

	testFileDoesntExist(generationDirectory, 'main.css');
	testFileDoesntExist(generationDirectory, 'images/favicon.ico');
	testFileDoesntExist(generationDirectory, 'js/secondary.js');
});
