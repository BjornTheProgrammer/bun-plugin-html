import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import { sleep, sleepSync } from 'bun';
import html from '../src/index';
import { emptyDir, testIfFileExists } from './utils';

describe('Testing Generation of HTML', async () => {
	const generationDirectory = './test/generation/css';
	const expectedDirectory = './test/expected/css';

	if (fs.existsSync(generationDirectory)) emptyDir(generationDirectory);

	const response = await Bun.build({
		entrypoints: ['./test/css/index.html'],
		outdir: generationDirectory,
		experimentalCss: true,
		plugins: [
			html({
				inline: true,
			}),
		],
		naming: '[dir]/[name].[ext]',
	});

	testIfFileExists(generationDirectory, expectedDirectory, 'index.html');
});
