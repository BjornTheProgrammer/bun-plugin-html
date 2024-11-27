import path from 'node:path';
import { $ } from 'bun';
import { withHtmlLiveReload } from 'bun-html-live-reload';

const outdir = './dist';

await $`bun run build`;

export default withHtmlLiveReload(
	{
		fetch(req) {
			const pathname = new URL(req.url).pathname;
			const filePath =
				pathname === '/' ? `${outdir}/index.html` : outdir + pathname;
			const file = Bun.file(path.resolve(filePath));
			return new Response(file);
		},
		error(error) {
			console.error(error);
			return new Response(null, { status: 404 });
		},
		port: 3000,
	},
	{
		watchPath: path.resolve(import.meta.dir, 'src'),
		async onChange() {
			await $`bun run build`;
		},
	},
);
