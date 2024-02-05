import fs from 'node:fs';
import html from "../src/index";
import { expect, test, describe } from "bun:test";
import { sleep, sleepSync } from "bun";
import { emptyDir, testFileDoesntExist, testIfFileExists } from './utils';

import { plugin } from "bun";
import "squint-cljs"; // somehow I needed to pre-require this;
export const squintLoader = {
  name: "squint loader",
  async setup(build) {
    let { compileString } = await import("squint-cljs");
    const { readFileSync } = await import("fs");
    // when a .cljs file is imported...
    build.onLoad({ filter: /\.cljs$/ }, ({ path }) => {
      // read and compile it with squint
      const file = readFileSync(path, "utf8");
      const contents = compileString(file);
      // and return the compiled source code as "js"
      return {
        contents,
        loader: "js",
      };
    });
  },
};

describe("Testing Generation of HTML", async () => {
  const generationDirectory = './test/generation/custom-extension';
  const expectedDirectory = './test/expected/custom-extension';

  if (fs.existsSync(generationDirectory)) emptyDir(generationDirectory);

  await Bun.build({
    entrypoints: ['./test/starting/index.html'],
    outdir: generationDirectory,
    plugins: [squintLoader, html({ includeExtension: ['.cljs'], filter: ['.css', '.ico', '.tsx'], plugins: [squintLoader] })],
  })

  testIfFileExists(generationDirectory, expectedDirectory, 'index.html');
  testIfFileExists(generationDirectory, expectedDirectory, 'main.js');
  testIfFileExists(generationDirectory, expectedDirectory, 'js/build-custom.js');

  testFileDoesntExist(generationDirectory, 'js/build-custom.cljs');
});
