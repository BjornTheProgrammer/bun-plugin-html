import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import { sleep, sleepSync } from 'bun';
import html from '../src/index';
import { emptyDir, testIfFileExists } from './utils';

describe('Testing Generation of Minified HTML', async () => {
	const generationDirectory = './test/generation/minify-skip-html';
	const expectedDirectory = './test/expected/minify-skip-html';

	if (fs.existsSync(generationDirectory)) emptyDir(generationDirectory);

	await Bun.build({
		entrypoints: ['./test/starting/index.html'],
		outdir: generationDirectory,
		minify: true,
		plugins: [
			html({
				minifyOptions: {
					minifyHTML: false,
				},
			}),
		],
		naming: '[dir]/[name].[ext]',
	});

	testIfFileExists(generationDirectory, expectedDirectory, 'index.html');
	testIfFileExists(generationDirectory, expectedDirectory, 'main.css');
	testIfFileExists(generationDirectory, expectedDirectory, 'main.js');
	testIfFileExists(generationDirectory, expectedDirectory, 'tailwind.css');
	testIfFileExists(
		generationDirectory,
		expectedDirectory,
		'images/favicon.ico',
	);
});
