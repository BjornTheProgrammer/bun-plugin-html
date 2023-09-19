import fs from "node:fs";
import path from "node:path";
import html from "../src/index";
import { expect, test, describe } from "bun:test";
import { sleep, sleepSync } from "bun";
import { emptyDir } from "./utils";

describe("Testing Generation of HTML (no minify)", () => {
	test("building", async () => {
		const directory = "./test/generated";
		if (fs.existsSync(directory)) emptyDir(directory);

		await Bun.build({
			entrypoints: ['./test/starting/index.html'],
			outdir: directory,
			plugins: [html()],
		})

		expect(await Bun.file('./test/generated/index.html').exists()).toBe(true);
	})

	test("index.html", async () => {
		const expected = await Bun.file('./test/expected/index.html').text();
		const generated = await Bun.file('./test/generated/index.html').text();
		expect(generated).toBe(expected);
	});

	test("main.css", async () => {
		const expected = await Bun.file('./test/expected/main.css').text();
		const generated = await Bun.file('./test/generated/main.css').text();
		expect(generated).toBe(expected);
	});

	test("main.js", async () => {
		const expected = await Bun.file('./test/expected/main.js').text();
		const generated = await Bun.file('./test/generated/main.js').text();
		expect(generated).toBe(expected);
	});

	test("js/secondary.js", async () => {
		const expected = await Bun.file('./test/expected/js/secondary.js').text();
		const generated = await Bun.file('./test/generated/js/secondary.js').text();
		expect(generated).toBe(expected);
	});

	test("images/favicon.ico", async () => {
		const expected = await Bun.file('./test/expected/images/favicon.ico').text();
		const generated = await Bun.file('./test/generated/images/favicon.ico').text();
		expect(generated).toBe(expected);
	});
});
