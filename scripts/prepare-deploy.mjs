/**
 * Assemble the Cloudflare Workers deployment bundle in `sites/`.
 *
 * `sites/worker.js` and `sites/manifest.json` are committed source; `sites/static/`
 * is generated from `dist/` by this script and is git-ignored. Run it through
 * `npm run deploy:prepare`, which builds first.
 *
 * Paths in the manifest are relative to the manifest itself, which is what the
 * Freebuff Sites deployer expects. Absolute or drive-lettered asset paths are
 * rejected by Cloudflare during `worker_upload`.
 */
import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const source = path.join(root, 'dist');
const target = path.join(root, 'sites', 'static');

async function main() {
  const indexSource = path.join(source, 'index.html');
  await stat(indexSource).catch(() => {
    throw new Error('dist/index.html is missing — run `npm run build` before preparing the deploy bundle.');
  });

  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  await cp(source, target, { recursive: true });

  // Netlify/Pages style fallback rules; the Worker implements this itself, and
  // honouring both would answer missing asset requests with HTML.
  await rm(path.join(target, '_redirects'), { force: true });

  const files = await readdir(target, { recursive: true, withFileTypes: true });
  const count = files.filter((entry) => entry.isFile()).length;
  console.log(`Prepared sites/static from dist (${count} files).`);
  console.log('Deploy with manifestPath "sites/manifest.json".');
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
