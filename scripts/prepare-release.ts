import {mkdir,cp,writeFile,readFile} from 'node:fs/promises';
import {build} from 'esbuild';
// Vercel側の依存インストールを省く代替配布。先に npm run build を実行する。
await mkdir('release/api',{recursive:true});await cp('dist','release/public',{recursive:true});
await build({entryPoints:['server/vercel-entry.ts'],bundle:true,minify:true,platform:'node',format:'esm',target:'node22',outfile:'release/api/timeline.js',banner:{js:"import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);"}});
const config=JSON.parse(await readFile('vercel.json','utf8'));config.buildCommand='';config.installCommand='';config.outputDirectory='public';config.framework=null;
await writeFile('release/vercel.json',JSON.stringify(config,null,2)+'\n');
await writeFile('release/package.json',JSON.stringify({name:'uchi-timeline-release',private:true,type:'module',engines:{node:'22.x'}},null,2)+'\n');
console.log('release/ に静的フロントと単一APIを作成しました。');
