// /Users/bjorn/Documents/GitHub/bun-plugin-html/test/starting/js/index.ts
function fromJs() {
  console.log("from js/index.ts");
}

// test/starting/main.ts
console.log("Running JS for browser");
fromJs();
document.querySelector("#js-target").innerHTML = "Changed!";
