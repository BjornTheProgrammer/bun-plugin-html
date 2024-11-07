import fs from 'node:fs';
import html from "../src/index";
import { expect, test, describe } from "bun:test";
import { $, sleep, sleepSync } from "bun";
import { emptyDir, testIfFileExists } from './utils';
import path from "path"

describe("Testing Tailwind Preprocessor", async () => {
	const generationDirectory = './test/generation/preprocessor';
	const expectedDirectory = './test/expected/preprocessor';

	if (fs.existsSync(generationDirectory)) emptyDir(generationDirectory);

	const startingDirectory = './test/starting/'

	await Bun.build({
		entrypoints: [path.resolve(startingDirectory, 'index.html')],
		outdir: generationDirectory,
		minify: true,
		plugins: [html({
			async preprocessor(processor) {
				const files = processor.getFiles();

				processor.writeFile(path.resolve(startingDirectory, './js/third.js'), `export default { hello: 'world' }`)

				for (const file of files) {
					if (file.extension == '.css') {
						const contents = await $`bun run tailwindcss -i ${file.path} --content '${startingDirectory}**/*.{html,js,ts}'`.quiet().text();
						processor.writeFile(file.path, contents);
					}

					if (file.extension == '.ts') {
						processor.writeFile(file.path, `import hello from "./js/third.js"\nconsole.log(hello);\n${await file.content}`)
					}

					if (file.extension == '.html') {
						const rewriter = new HTMLRewriter();
						rewriter.on('body', {
							element(el) {
							    el.append(`<p>From preprocessor</p>`, {
							    	html: true
							    })
							},
						})

						const output = rewriter.transform(await file.content);
						processor.writeFile(file.path, output)
					}
				}

				processor.writeFile(path.resolve(startingDirectory, 'hello.txt'), 'Hello World!')
			},
		})],
		naming: '[dir]/[name].[ext]',
	})

	testIfFileExists(generationDirectory, expectedDirectory, 'index.html');
	testIfFileExists(generationDirectory, expectedDirectory, 'images/favicon.ico');
	testIfFileExists(generationDirectory, expectedDirectory, 'main.css');
	testIfFileExists(generationDirectory, expectedDirectory, 'tailwind.css');
	testIfFileExists(generationDirectory, expectedDirectory, 'js/secondary.js');
	testIfFileExists(generationDirectory, expectedDirectory, 'js/third.js');
	testIfFileExists(generationDirectory, expectedDirectory, 'main.js');
});
