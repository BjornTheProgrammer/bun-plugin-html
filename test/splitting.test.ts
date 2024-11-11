import fs from "node:fs";
import html from "../src/index";
import { describe, expect, test } from "bun:test";
import { sleep, sleepSync } from "bun";
import { emptyDir, testIfFileExists } from "./utils";

describe("Testing Splitting", async () => {
  const generationDirectory = "./test/generation/splitting";

  if (fs.existsSync(generationDirectory)) emptyDir(generationDirectory);

  await Bun.build({
    entrypoints: ["./test/splitting/index.html"],
    outdir: generationDirectory,
    plugins: [html()],
    root: ".",
    naming: {
      entry: "[dir]/[name].[ext]",
      chunk: "[name]-[hash].[ext]",
    },
    splitting: true,
  });

  const entryHtml = `${generationDirectory}/index.html`;
  expect(fs.existsSync(entryHtml));

  const content = await Bun.file(entryHtml).text();
  const src: string[] = content.match(/[^"\/]+\.js/g) || [];
  expect(src?.length).toBe(2);
  expect(src[0].startsWith("x-")).toBeTrue();
  expect(src[1].startsWith("y-")).toBeTrue();
  expect(fs.existsSync(`${generationDirectory}/${src[0]}`));
  expect(fs.existsSync(`${generationDirectory}/${src[1]}`));
  const c = await Bun.file(`${generationDirectory}/${src[1]}`).text();
  expect(c && c.indexOf(src[0]) > -1).toBeTrue();
});
