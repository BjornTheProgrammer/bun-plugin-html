import fs from 'node:fs';
import html from "../src/index";
import { expect, test, describe } from "bun:test";
import { sleep, sleepSync } from "bun";
import { emptyDir } from './utils';

describe("Testing Generation of HTML (minify)", () => {
	test("building", async () => {
		const directory = "./test/generated-minify";
		if (fs.existsSync(directory)) emptyDir(directory);

		await Bun.build({
			entrypoints: ['./test/starting/index.html'],
			outdir: directory,
			minify: true,
			plugins: [html()],
		})

		expect(await Bun.file('./test/generated-minify/index.html').exists()).toBe(true);
	})

	test("index.html", async () => {
		const expected = await Bun.file('./test/expected-minify/index.html').text();
		const generated = await Bun.file('./test/generated-minify/index.html').text();
		expect(generated).toBe(expected);
	});

	test("images/favicon.ico", async () => {
		const expected = await Bun.file('./test/expected-minify/images/favicon.ico').text();
		const generated = await Bun.file('./test/generated-minify/images/favicon.ico').text();
		expect(generated).toBe(expected);
	});
});
