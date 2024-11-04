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
		naming: '[dir]/[name]-[hash].[ext]',
		plugins: [html()],
	})
});
