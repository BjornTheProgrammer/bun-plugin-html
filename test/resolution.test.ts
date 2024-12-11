import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import { sleep, sleepSync } from 'bun';
import html from '../src/index';
import { emptyDir, testIfFileExists } from './utils';

describe('Testing Generation of HTML', async () => {
	const generationDirectory = './test/generation/resolution';
	const expectedDirectory = './test/expected/resolution';

	if (fs.existsSync(generationDirectory)) emptyDir(generationDirectory);

	const response = await Bun.build({
		entrypoints: ['./test/resolution/index.html'],
		outdir: generationDirectory,
		plugins: [html()],
		naming: '[dir]/[name].[ext]',
	});

	testIfFileExists(generationDirectory, expectedDirectory, 'index.html');
	testIfFileExists(generationDirectory, expectedDirectory, 'index.js');
});
