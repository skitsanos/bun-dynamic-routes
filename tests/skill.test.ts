import {afterEach, describe, expect, test} from 'bun:test';
import {mkdir, mkdtemp, readFile, rm, symlink, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {checkExport, collectExport, templateDirectories, templateFiles, writeExport} from '../scripts/skill-export';

const temporary: string[] = [];
afterEach(async () => { await Promise.all(temporary.splice(0).map(path => rm(path, {recursive: true, force: true}))); });
async function fixture()
{
    const root = await mkdtemp(join(tmpdir(), 'bun-skill-export-test-'));
    temporary.push(root);
    const source = join(root, 'source');
    const target = join(root, 'export');
    await mkdir(source);
    for (const directory of templateDirectories)
    {
        await mkdir(join(source, directory));
        await writeFile(join(source, directory, '.keep'), '');
    }
    for (const file of templateFiles) await writeFile(join(source, file), `fixture:${file}\n`);
    await writeFile(join(source, 'skill/SKILL.md.template'), '---\nname: bun-server\ndescription: Fixture\n---\n');
    await writeFile(join(source, 'src/index.ts'), 'export const value = 1;\n');
    return {source, target, root};
}

describe('canonical skill export', () => {
    test('exports instructions and source bytes with provenance, and safely replaces an existing export', async () => {
        const {source, target} = await fixture();
        await writeExport(source, target);
        await checkExport(target, await collectExport(source));
        expect(await readFile(join(target, 'assets/src/index.ts'), 'utf8')).toContain('value = 1');
        expect(await readFile(join(target, 'SKILL.md'), 'utf8')).toEqual(await readFile(join(source, 'skill/SKILL.md.template'), 'utf8'));
        expect(JSON.parse(await readFile(join(target, '.source-manifest.json'), 'utf8')).format).toBe(1);
        await writeFile(join(source, 'src/index.ts'), 'export const value = 2;\n');
        await expect(checkExport(target, await collectExport(source))).rejects.toThrow('differs');
        await writeExport(source, target);
        await checkExport(target, await collectExport(source));
        expect(await readFile(join(target, 'assets/src/index.ts'), 'utf8')).toContain('value = 2');
    });

    test('discovers one skill and can re-export the bundled project without duplicates', async () => {
        const {source, target, root} = await fixture();
        await writeExport(source, target);
        const discovered = await Array.fromAsync(new Bun.Glob('**/SKILL.md').scan({cwd: target, dot: true}));
        expect(discovered).toEqual(['SKILL.md']);
        expect(await Bun.file(join(target, 'assets/skill/SKILL.md.template')).text())
            .toEqual(await Bun.file(join(target, 'SKILL.md')).text());
        const regenerated = join(root, 'regenerated');
        await writeExport(join(target, 'assets'), regenerated);
        await checkExport(regenerated, await collectExport(source));
        expect(await Array.fromAsync(new Bun.Glob('**/SKILL.md').scan({cwd: regenerated, dot: true})))
            .toEqual(['SKILL.md']);
    });

    test('rejects duplicate skill discovery even when file hashes match', async () => {
        const {source, target} = await fixture();
        await writeExport(source, target);
        const previous = await Bun.file(join(target, '.source-manifest.json')).text();
        await writeFile(join(source, 'public/SKILL.md'), '---\nname: duplicate\ndescription: Fixture\n---\n');
        // Generation builds a matching manifest; semantic validation must still reject it.
        await expect(writeExport(source, target)).rejects.toThrow('exactly one SKILL.md');
        expect(await Bun.file(join(target, '.source-manifest.json')).text()).toBe(previous);
        await checkExport(target);
    });

    test('detects changed, missing, and unexpected export files', async () => {
        const {source, target} = await fixture();
        await writeExport(source, target);
        await writeFile(join(target, 'assets/src/index.ts'), 'tampered');
        await expect(checkExport(target)).rejects.toThrow('modified');
        await writeExport(source, target);
        await rm(join(target, 'assets/src/index.ts'));
        await expect(checkExport(target)).rejects.toThrow('missing or unexpected');
        await writeExport(source, target);
        await writeFile(join(target, 'unexpected.txt'), 'extra');
        await expect(checkExport(target)).rejects.toThrow('missing or unexpected');
    });

    test('rejects source overlap, unrelated directories, and target symlinks', async () => {
        const {source, target, root} = await fixture();
        await expect(writeExport(source, source)).rejects.toThrow('source repository');
        await expect(writeExport(source, join(source, 'export'))).rejects.toThrow('source repository');
        await expect(writeExport(source, root)).rejects.toThrow('source repository');
        await mkdir(target);
        await writeFile(join(target, 'user.txt'), 'keep');
        await expect(writeExport(source, target)).rejects.toThrow('unrelated');
        expect(await readFile(join(target, 'user.txt'), 'utf8')).toBe('keep');
        const link = join(root, 'linked');
        await symlink(target, link);
        await expect(writeExport(source, link)).rejects.toThrow('real directory');
        const parentLink = join(root, 'source-link');
        await symlink(source, parentLink);
        await expect(writeExport(source, join(parentLink, 'nested'))).rejects.toThrow('source repository');
    });

    test('rejects source symlinks instead of exporting outside content', async () => {
        const {source, target} = await fixture();
        await symlink('/etc/passwd', join(source, 'public/outside.txt'));
        await expect(writeExport(source, target)).rejects.toThrow('symlinks');
    });
});
