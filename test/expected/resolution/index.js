// /Users/bjorn/Documents/GitHub/bun-plugin-html/test/resolution/moduleA.ts
var getARandomNumber = () => Math.floor(Math.random() * 1000);

// test/resolution/index.ts
console.log("random number:", getARandomNumber());
