# Bun Plugin for HTML

The `bun-plugin-html` is a plugin for the Bun build tool that enables `.html` file entrypoints. This document instructions on how to install, use, and configure the plugin.

> [!IMPORTANT]
> With bun v1.2 the html loader will be [stabilized](https://github.com/oven-sh/bun/issues/4688). This plugin will still be updated if any issues occur,
> but it is recommended that you use the built-in loader.

## Installation

You can install `bun-plugin-html` using the following command:

```bash
bun add -d bun-plugin-html
```

Ensure Bun is upgraded to `v1.1.34`, as a bug fix was introduced in this version of Bun.

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
    <link rel="stylesheet" type="text/css" href="./style.scss" />
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
    ├── style.scss
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
    ├── style.scss
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

Note that `sass` and `scss` files are transpiled by default.

## Configuration Options

You can customize the behavior of the `bun-plugin-html` by providing options. Here's the available configuration:

```typescript
type BunPluginHTMLOptions = {
    inline?: boolean | {
        css?: boolean;
        js?: boolean;
    };
    naming?: {
        css?: string;
    };
    minifyOptions?: HTMLTerserOptions;
    includeExtensions?: string[];
    excludeExtensions?: string[];
    excludeSelectors?: string[];
    preprocessor?: (processor: Processor) => void | Promise<void>;
    keepOriginalPaths?: boolean | string[];
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
```ts
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

### Naming Option

The `naming` option takes in an optional template to name css files with. By default css files follow the `chunk` naming [rules](https://bun.sh/docs/bundler#naming). This overrides that default behavior, following the same syntax.

The example below shows spliting the js, assets, and css into different directories.
```ts
await Bun.build({
    entrypoints: ['index.html'],
    outdir: 'dist',
    naming: {
        chunk: 'js/[dir]/[name]-[hash].[ext]',
        asset: 'assets/[name].[ext]',
        entry: 'main.html'
    },
    plugins: [html({
        naming: {
            css: 'css/[name].[ext]'
        }
    })],
})
```

### Preprocessor Option

The `preprocessor` option takes in a funciton which will be provided a `Processor` class, in which you can modify the files provided to it, before they are processed by `bun-plugin-html`.

The example below shows processing the css files with tailwind. By default `sass` is transpiled.
```ts
await Bun.build({
    entrypoints: ['src/index.html'],
    outdir: 'dist',
    minify: true,
    plugins: [html({
        async preprocessor(processor) {
            const files = processor.getFiles();

            for (const file of files) {
                if (file.extension == '.css') {
                    const contents = await $`bun run tailwindcss -i ${file.path} --content 'src/**/*.{html,js,ts}'`.quiet().text();
                    processor.writeFile(file.path, contents);
                }
            }

            // Add hello.txt to the out dir.
            // The path provided to writeFile must be an absolute path.
            processor.writeFile(path.resolve('src/hello.txt'), 'Hello World!')
        },
    })]
})
```

### Keep Original Paths Option

Determines whether file paths in the source code are replaced by new paths.
| Value                                     | Result                      |
|-------------------------------------------|-----------------------------|
| `true`                                    | Path replacement is completely skipped. |
| `string[]`                                | Only the specified file paths are excluded from replacement. |
| `false` or `undefined`                    | All paths are replaced within the source code. |

## License

This plugin is licensed under MIT.
