import {homedir} from 'node:os';
import {join, resolve} from 'node:path';
import {checkExport, collectExport, writeExport} from './skill-export';

const args = process.argv.slice(2);
let target = join(process.env.CODEX_HOME ?? join(homedir(), '.codex'), 'skills', 'bun-server');
let write = false;
for (let index = 0; index < args.length; index++)
{
    const argument = args[index];
    if (argument === '--write') write = true;
    else if (argument === '--check') write = false;
    else if (argument === '--target' && args[index + 1]) target = resolve(args[++index]!);
    else throw new Error(`Unknown or incomplete argument: ${argument}`);
}
const root = resolve(import.meta.dir, '..');
if (write) await writeExport(root, target);
await checkExport(target, await collectExport(root));
console.log(`Bun Server skill ${write ? 'synchronized and verified' : 'matches the repository'}: ${target}`);
