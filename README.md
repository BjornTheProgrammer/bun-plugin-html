# bun-plugin-html

A Bun plugin allowing `.html` file entrypoints.

## Installation
```bash
bun add -d bun-plugin-html
```

## Usage
```ts
import html from 'bun-plugin-html'

await Bun.build({
	entrypoints: ['./src/index.html', './src/other.html'],
	outdir: './dist',  // Must be specified!
	plugins: [
		html()
	],
})

// generates ./dist/index.html and ./dist/other.html, along with their scripts and links
```

### Input
With a file structure like the following, along with the html file, the output below will be generated
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

### Output
The output will be generated in the specified outdir. If certain files cannot be found, the console will output where the issue lies, and the rest of the files will be generated.

<img width="535" alt="Screenshot 2023-09-18 at 7 53 09 AM" src="https://github.com/BjornTheProgrammer/bun-plugin-html/assets/75190918/3498302e-12fe-44d9-a460-88a709263a2b">


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
└── dist/
    ├── index.html
    ├── main.css
    ├── main.js
    ├── js/
    │   └── secondary.js
    └── images/
        └── favicon.ico
```

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

### Minification
If you set `minify: true` in the Bun.build config, the following output will be generated
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
└── dist/
    ├── index.html
    └── images/
        └── favicon.ico
```

```html
<!DOCTYPE html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background-color:#000;color:#fff}</style><link rel="icon" type="image/x-icon" href="./images/favicon.ico"><title>Hello World!</title></head><body><h1>Hello World</h1><p id="js-target">This should be changed by JS</p><script type="module">console.log("Running JS for browser"),document.querySelector("#js-target").innerHTML="Changed!"</script><script>console.log("in secondary.ts")</script></body>
```

## License
MIT
