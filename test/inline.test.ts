import fs from 'node:fs';
import html from "../src/index";
import { expect, test, describe } from "bun:test";
import { sleep, sleepSync } from "bun";
import { emptyDir, testIfFileExists } from './utils';

describe("Testing Generation of Inlined HTML", async () => {
	const generationDirectory = './test/generation/inline';
	const expectedDirectory = './test/expected/inline';

	if (fs.existsSync(generationDirectory)) emptyDir(generationDirectory);

	await Bun.build({
		entrypoints: ['./test/starting/index.html'],
		outdir: generationDirectory,
		plugins: [html({ inline: true })],
	})

	testIfFileExists(generationDirectory, expectedDirectory, 'index.html');
	testIfFileExists(generationDirectory, expectedDirectory, 'images/favicon.ico');
});

