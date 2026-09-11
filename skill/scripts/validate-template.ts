import {join, resolve} from 'node:path';

const skillRoot = resolve(import.meta.dir, '..');
const child = Bun.spawn([process.execPath, join(skillRoot, 'assets/scripts/validate-export.ts'), skillRoot], {
    stdout: 'inherit', stderr: 'inherit'
});
process.exit(await child.exited);
