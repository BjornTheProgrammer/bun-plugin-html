import * as React from "react";
import { render } from "react-dom";

console.log('in secondary.tsx');

window.addEventListener("DOMContentLoaded", () => {
	const root = document.createElement("div");
	document.body.appendChild(root);
	render(<App />, root);
});

function App(): React.ReactNode {
	return (
		<div>
			<h1>Hello from React!</h1>
		</div>
	);
}
