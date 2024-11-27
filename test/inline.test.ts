import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import { sleep, sleepSync } from 'bun';
import html from '../src/index';
import { emptyDir, testIfFileExists } from './utils';

describe('Testing Generation of Inlined HTML', async () => {
	const generationDirectory = './test/generation/inline';
	const expectedDirectory = './test/expected/inline';

	if (fs.existsSync(generationDirectory)) emptyDir(generationDirectory);

	await Bun.build({
		entrypoints: ['./test/starting/index.html'],
		outdir: generationDirectory,
		plugins: [html({ inline: true })],
		naming: '[dir]/[name].[ext]',
	});

	testIfFileExists(generationDirectory, expectedDirectory, 'index.html');
	testIfFileExists(
		generationDirectory,
		expectedDirectory,
		'images/favicon.ico',
	);
});
