var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);

// /private/var/folders/xp/2h79jwp12nq0qc6hrr1lhlb00000gn/T/bun-build-9GQqGA/js/third.js
var third_default = { hello: "world" };

// /var/folders/xp/2h79jwp12nq0qc6hrr1lhlb00000gn/T/bun-build-9GQqGA/main.ts
console.log(third_default);
console.log("Running JS for browser");
document.querySelector("#js-target").innerHTML = "Changed!";
