import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import html from '../src/index';
import { emptyDir } from './utils';

describe('Testing keepPathStrings', async () => {
	const generationDirectory = './test/generation/keep-path-strings';
	if (fs.existsSync(generationDirectory)) emptyDir(generationDirectory);

	test('Checking keepPathStrings is true', async () => {
		await Bun.build({
			entrypoints: ['./test/splitting/keep-path-strings.html'],
			outdir: generationDirectory,
			plugins: [
				html({
					keepPathStrings: true,
				}),
			],
			root: '.',
			naming: {
				entry: 'keep.html',
				chunk: '[name]-[hash].[ext]',
			},
		});
		const entryHtml = `${generationDirectory}/keep.html`;
		expect(fs.existsSync(entryHtml));
		const content = await Bun.file(entryHtml).text();
		expect(content.indexOf('x.ts') > -1).toBeTrue();
		expect(content.indexOf('y.ts') > -1).toBeTrue();
	});

	test('Checking keepPathStrings is string[]', async () => {
		await Bun.build({
			entrypoints: ['./test/splitting/keep-path-strings.html'],
			outdir: generationDirectory,
			plugins: [
				html({
					keepPathStrings: ['y.ts'],
				}),
			],
			root: '.',
			naming: {
				entry: 'keep-y.html',
				chunk: '[name]-[hash].[ext]',
			},
		});
		const entryHtml = `${generationDirectory}/keep-y.html`;
		expect(fs.existsSync(entryHtml));
		const content = await Bun.file(entryHtml).text();
		expect(content.indexOf('x.ts') > -1).toBeFalse();
		expect(content.indexOf('y.ts') > -1).toBeTrue();
	});

	test('Checking no keepPathStrings', async () => {
		await Bun.build({
			entrypoints: ['./test/splitting/keep-path-strings.html'],
			outdir: generationDirectory,
			plugins: [html()],
			root: '.',
			naming: {
				entry: 'keep-none.html',
				chunk: '[name]-[hash].[ext]',
			},
		});
		const entryHtml = `${generationDirectory}/keep-none.html`;
		expect(fs.existsSync(entryHtml));
		const content = await Bun.file(entryHtml).text();
		expect(content.indexOf('x.ts') > -1).toBeFalse();
		expect(content.indexOf('y.ts') > -1).toBeFalse();
	});
});
