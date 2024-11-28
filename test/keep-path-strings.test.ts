import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import html from '../src/index';
import { emptyDir } from './utils';

describe('Testing keepOriginalPaths', async () => {
	const generationDirectory = './test/generation/keep-path-strings';
	if (fs.existsSync(generationDirectory)) emptyDir(generationDirectory);

	test('Checking keepOriginalPaths is true', async () => {
		await Bun.build({
			entrypoints: ['./test/splitting/keep-path-strings.html'],
			outdir: generationDirectory,
			plugins: [
				html({
					keepOriginalPaths: true,
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

	test('Checking keepOriginalPaths is string[]', async () => {
		await Bun.build({
			entrypoints: ['./test/splitting/keep-path-strings.html'],
			outdir: generationDirectory,
			plugins: [
				html({
					keepOriginalPaths: ['y.ts'],
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

	test('Checking no keepOriginalPaths', async () => {
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
