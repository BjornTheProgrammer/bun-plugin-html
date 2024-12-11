// /private/var/folders/xp/2h79jwp12nq0qc6hrr1lhlb00000gn/T/bun-build-iaWWHG/js/third.js
var third_default = { hello: "world" };

// /Users/bjorn/Documents/GitHub/bun-plugin-html/test/starting/js/index.ts
function fromJs() {
  console.log("from js/index.ts");
}

// ../../../../../private/var/folders/xp/2h79jwp12nq0qc6hrr1lhlb00000gn/T/bun-build-iaWWHG/main.ts
console.log(third_default);
console.log("Running JS for browser");
fromJs();
document.querySelector("#js-target").innerHTML = "Changed!";
