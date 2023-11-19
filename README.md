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
  filter?: string[];
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

### Filter Option

The `filter` option takes an array of strings. Any files whose extensions match any of those strings will be ignored by
the plugin.

## License

This plugin is licensed under MIT.
