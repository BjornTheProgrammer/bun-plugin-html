import { mindon } from "https://mindon.dev/hello.js";
export function Hello(name: string) {
  console.log(`hello, ${name || "world"}! ${mindon()}`);
}
