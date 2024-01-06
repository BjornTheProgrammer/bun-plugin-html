import fs from 'node:fs';
import html from "../src/index";
import { expect, test, describe } from "bun:test";
import { sleep, sleepSync } from "bun";
import { emptyDir, testIfFileExists } from './utils';

describe("Testing Generation of Minified HTML", async () => {
	const generationDirectory = './test/generation/minify-custom-options';
	const expectedDirectory = './test/expected/minify-custom-options';

	if (fs.existsSync(generationDirectory)) emptyDir(generationDirectory);

	await Bun.build({
		entrypoints: ['./test/starting/index.html'],
		outdir: generationDirectory,
		minify: true,
		plugins: [html({
			cssOptions: { format: { semicolonAfterLastProperty: true } },
			htmlOptions: { removeStyleLinkTypeAttributes: true, }
		})],
	})

	testIfFileExists(generationDirectory, expectedDirectory, 'index.html');
	testIfFileExists(generationDirectory, expectedDirectory, 'images/favicon.ico');
});

