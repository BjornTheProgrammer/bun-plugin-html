import { DateTime } from 'https://cdn.jsdelivr.net/npm/luxon@3.5.0/+esm'
export function Hello(name: string) {
  console.log(`hello, ${name || "world"}! The date in New York is ${DateTime.now().setZone("America/New_York").toLocaleString()}!`);
}
