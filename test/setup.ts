import { $ } from "bun"
import { afterAll, beforeAll } from 'bun:test';

beforeAll(async () => {
	// await $`rm -rf ./test/generation`
});

afterAll(async () => {
	// await $`rm -rf ./test/expected`
	// await $`cp -R ./test/generation ./test/expected`
})

