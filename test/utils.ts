import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

export function emptyDir(dirPath: string) {
	const dirContents = fs.readdirSync(dirPath); // List dir content

	for (const fileOrDirPath of dirContents) {
		try {
			// Get Full path
			const fullPath = path.join(dirPath, fileOrDirPath);
			const stat = fs.statSync(fullPath);
			if (stat.isDirectory()) {
				// It's a sub directory
				if (fs.readdirSync(fullPath).length) emptyDir(fullPath);
				// If the dir is not empty then remove it's contents too(recursively)
				fs.rmdirSync(fullPath);
			} else fs.unlinkSync(fullPath); // It's a file
		} catch (ex) {
			console.error((ex as Error).message);
		}
	}
}

export function testIfFileExists(generationDirectory: string, expectedDirectory: string, file: string) {
	const generatedFileLocation = path.resolve(generationDirectory, file);
	const expectedFileLocation = path.resolve(expectedDirectory, file);

	test(`Checking for ${file}`, async () => {
		try {
			const expected = Bun.file(generatedFileLocation);
			const generated = Bun.file(expectedFileLocation);

			if (!await expected.exists()) {
				throw new Error(`Could not find file '${file}' in '${expectedDirectory}'`);
			} else if (!await generated.exists()) {
				throw new Error(`Could not find file '${file}' in '${generationDirectory}'`);
			}

			const expectedText = await expected.text();
			const generatedText = await generated.text();

			if (expectedText !== generatedText) throw new Error(`File '${file}' in '${generationDirectory}' does not match '${expectedDirectory}'`);

			expect().pass('Files exist and match');
		} catch (error) {
			expect().fail((error as Error).message)
		}
	})
}

export function testFileDoesntExist(generationDirectory: string, file: string) {
	const generatedFileLocation = path.resolve(generationDirectory, file);

	test(`Checking that ${file} does NOT exist`, async () => {
		try {
			expect(await Bun.file(generatedFileLocation).exists()).toBeFalse();
		} catch (error) {
			console.error(error);
			expect().fail(`Found '${file}' in '${generationDirectory}' when it shouldn't exist`)
		}
	})
}
