# Bun Plugin for HTML

The `bun-plugin-html` is a plugin for the Bun build tool that enables `.html` file entrypoints. This document instructions on how to install, use, and configure the plugin.

## Installation

You can install `bun-plugin-html` using the following command:

```bash
bun add -d bun-plugin-html
```

## Usage

To use this plugin, import it into your code and add it to the list of plugins when building your project with Bun. Here's an example:

```typescript
import html from 'bun-plugin-html';

await Bun.build({
  entrypoints: ['./src/index.html', './src/other.html'],
  outdir: './dist',  // Specify the output directory
  plugins: [
    html()
  ],
});
```

This code snippet builds HTML files from the specified entrypoints and places them in the specified output directory, along with their associated scripts and links.

### Input

Here is an example of an HTML file (`index.html`) that serves as an input:

```html
<!DOCTYPE html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link rel="stylesheet" type="text/css" href="main.css">
	<link rel="icon" type="image/x-icon" href="./images/favicon.ico">
	<title>Hello World!</title>
</head>
<body>
	<h1>Hello World</h1>
	<p id="js-target">This should be changed by JS</p>
	<script src="main.ts"></script>
	<script src="./js/secondary.ts"></script>
</body>
```

Along with a file structure like the one below, the plugin generates the output as described:

```
.
└── src/
    ├── index.html
    ├── main.css
    ├── main.ts
    ├── js/
    │   └── secondary.ts
    └── images/
        └── favicon.ico
```

### Output

The plugin generates the output in the specified output directory. If certain files are missing, the console will indicate the issue while generating the rest of the files. The generated output would look like this:

```
.
└── src/
    └── ...
└── dist/
    ├── index.html
    ├── main.css
    ├── main.js
    ├── js/
    │   └── secondary.js
    └── images/
        └── favicon.ico
```

Here's the transformed HTML file in the output directory (`dist/index.html`):

```html
<!DOCTYPE html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link rel="stylesheet" type="text/css" href="main.css">
	<link rel="icon" type="image/x-icon" href="./images/favicon.ico">
	<title>Hello World!</title>
</head>
<body>
	<h1>Hello World</h1>
	<p id="js-target">This should be changed by JS</p>
	<script src="main.js"></script>
	<script src="./js/secondary.js"></script>
</body>
```

## Configuration Options

You can customize the behavior of the `bun-plugin-html` by providing options. Here's the available configuration:

```typescript
type BunPluginHTMLOptions = {
  inline?: boolean | {
    css?: boolean;
    js?: boolean;
  };
  minify?: Options;
  includeExtensions?: string[];
  excludeExtensions?: string[];
  excludeSelectors?: string[];
};
```

### Inline Option

By setting the `inline` option to `true`, you can choose to inline CSS and/or JS files within your HTML. Here's an example:

```html
<!DOCTYPE html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<style>
    body {
      background-color: #000;
      color: #fff;
    }
  </style>
	<link rel="icon" type="image/x-icon" href="./images/favicon.ico">
	<title>Hello World!</title>
</head>
<body>
	<h1>Hello World</h1>
	<p id="js-target">This should be changed by JS</p>
	<script>
    // Content of main.ts
    console.log("Running JS for browser");
    document.querySelector("#js-target").innerHTML = "Changed!";
  </script>
	<script>
    // Content of js/secondary.ts
    console.log("in secondary.ts");
  </script>
</body>
```

### MinifyOptions Option

Use `minifyOptions` to configure [`html-minifier-terser`](https://github.com/terser/html-minifier-terser?tab=readme-ov-file#options-quick-reference). 

The `minifyCSS` and `minifyJS` fields enable further configuration of 
[`clean-css`](https://github.com/clean-css/clean-css?tab=readme-ov-file#constructor-options) and 
[`terser`](https://github.com/terser/terser?tab=readme-ov-file#minify-options), respectively.

The following default options are exported as `defaultMinifyOptions`:
```
{
	collapseWhitespace: true,
	collapseInlineTagWhitespace: true,
	caseSensitive: true,
	minifyCSS: {},
	minifyJS: true,
	removeComments: true,
	removeRedundantAttributes: true,
}
```

`minifyCSS` and `minifyJS` can both be set to either `true`, `false`, a configuration object, or a callback function. The different 
values of `minifyCSS` and `minifyJS` behave as follows:

#### MinifyCSS

| Value                                      | Result                      |
|--------------------------------------------|-----------------------------|
| `false`                                    | CSS minification is skipped |
| `true` or `undefined`                      | CSS minification is performed with default options using `clean-css` |
| `{ opts } `                                | CSS minification is performed with the provided options using `clean-css` |
| `((text: string, type: string) => string)` | Your function is called for every CSS element encountered and should return minified content. |


#### MinifyJS

| Value                                        | Result                      |
|----------------------------------------------|-----------------------------|
| `false`                                      | JS minification is skipped |
| `true` or `undefined`                        | JS minification is performed by `Bun.build` and inlined scripts will also be processed with default options using `terser` |
| `{ opts } `                                  | JS minification is performed with the provided options using `terser`. No minification is performed by `Bun.build` |
| `((text: string, inline: boolean) => string)`| Your function is called for every JS element encoutered and should return minified content. |

### IncludeExtensions Option

The `includeExtensions` option takes an array of strings. Any files whose extensions match any of those strings will be passed to 
`Bun.build` (in addition to `['.js', '.jsx', '.ts', '.tsx']`).

**Note: you must ensure an appropriate plugin is included for each file extension.**

### ExcludeExtensions Option

The `excludeExtensions` option takes an array of strings. Any files whose extensions match any of those strings will be ignored by
the plugin.

The extension name follows the same format as the [path.extname](https://nodejs.org/api/path.html#pathextnamepath) return.

### ExcludeSelectors Option

The `excludeSelectors` option takes an array of strings. Any HTML elements matched by a selector will be ignored by the plugin.

### Plugins Option

The `plugins` option takes an array of `BunPlugin`s. These plugins will be used when transpiling Java/Typescript files.

## License

This plugin is licensed under MIT.
