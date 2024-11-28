import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import html from '../src/index';
import { emptyDir } from './utils';

describe('Testing Splitting', async () => {
	const generationDirectory = './test/generation/splitting';

	if (fs.existsSync(generationDirectory)) emptyDir(generationDirectory);

	await Bun.build({
		entrypoints: ['./test/splitting/index.html'],
		outdir: generationDirectory,
		plugins: [
			html({
				naming: {
					css: '[name]-[hash].[ext]',
				},
			}),
		],
		root: '.',
		naming: {
			entry: '[dir]/[name].[ext]',
			chunk: '[name]-[hash].[ext]',
		},
		splitting: true,
	});

	const entryHtml = `${generationDirectory}/index.html`;
	expect(fs.existsSync(entryHtml));

	const content = await Bun.file(entryHtml).text();
	const src: string[] = content.match(/[^"\/]+\.js/g) || [];
	test('Checking ts module compiled', async () => {
		expect(src?.length).toBe(2);
		expect(src[0].startsWith('x-')).toBeTrue();
		expect(src[1].startsWith('y-')).toBeTrue();
		expect(fs.existsSync(`${generationDirectory}/${src[0]}`));
		expect(fs.existsSync(`${generationDirectory}/${src[1]}`));
	});
	test('Checking module splitting', async () => {
		const c = await Bun.file(`${generationDirectory}/${src[1]}`).text();
		expect(c && c.indexOf(src[0]) > -1).toBeTrue();
	});

	test('Checking import url', async () => {
		const xc = await Bun.file(`${generationDirectory}/${src[0]}`).text();
		expect(
			xc?.includes('https://cdn.jsdelivr.net/npm/luxon@3.5.0/+esm'),
		).toBeTrue();
	});

	test('Checking .scss compiled', async () => {
		const m = content.match(/style-[^.]+.css/);
		expect(m?.length).toBe(1);
		expect(fs.existsSync(`${generationDirectory}/${m?.[0]}`));
	});
});
