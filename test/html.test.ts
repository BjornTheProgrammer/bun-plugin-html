import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import { sleep, sleepSync } from 'bun';
import html from '../src/index';
import { emptyDir, testIfFileExists } from './utils';

describe('Testing Generation of HTML', async () => {
	const generationDirectory = './test/generation/html';
	const expectedDirectory = './test/expected/html';

	if (fs.existsSync(generationDirectory)) emptyDir(generationDirectory);

	await Bun.build({
		entrypoints: ['./test/starting/index.html'],
		outdir: generationDirectory,
		plugins: [html()],
		naming: '[dir]/[name].[ext]',
	});

	testIfFileExists(generationDirectory, expectedDirectory, 'index.html');
	testIfFileExists(
		generationDirectory,
		expectedDirectory,
		'images/favicon.ico',
	);
	testIfFileExists(generationDirectory, expectedDirectory, 'main.css');
	testIfFileExists(generationDirectory, expectedDirectory, 'js/secondary.js');
	testIfFileExists(generationDirectory, expectedDirectory, 'main.js');
});
