import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import * as Diff from 'diff'
import { getLines, returnLineNumberOfOccurance } from "../src/utils";
import chalk from 'chalk';

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

export function stripCommnets(source: string) {
	return source.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
}

export function testIfExplicitFilePathExists(generatedFileLocation: string, expectedFileLocation: string, file: string) {
	test(`Checking for ${file}`, async () => {
		try {
			const expected = Bun.file(generatedFileLocation);
			const generated = Bun.file(expectedFileLocation);

			if (!await expected.exists()) {
				throw new Error(`Could not find file '${file}' in '${expectedFileLocation}'`);
			} else if (!await generated.exists()) {
				throw new Error(`Could not find file '${file}' in '${generatedFileLocation}'`);
			}

			const expectedText = stripCommnets(await expected.text());
			const generatedText = stripCommnets(await generated.text());
			
			if (expectedText !== generatedText) {
				const diff = Diff.diffChars(expectedText, generatedText);

				let lineNumber = 0;
				let firstOccurance = false;
				const result = diff.map((part) => {
					if (part.added || part.removed) firstOccurance = true;
					if (firstOccurance == false) lineNumber += part.value.split('\n').length;
					if (part.added) return chalk.green(part.value);
					if (part.removed) return chalk.red(part.value);
					return part.value;
				}).join('');

				const lines = getLines(result, 5, lineNumber + 3)
				console.log(lines);

				throw new Error(`File '${file}' in '${generatedFileLocation}' does not match '${expectedFileLocation}'`);
			}

			expect().pass('Files exist and match');
		} catch (error) {
			expect().fail((error as Error).message)
		}
	})
}

export function testIfFileExists(generationDirectory: string, expectedDirectory: string, file: string) {
	const generatedFileLocation = path.resolve(generationDirectory, file);
	const expectedFileLocation = path.resolve(expectedDirectory, file);

	return testIfExplicitFilePathExists(generatedFileLocation, expectedFileLocation, file);
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
