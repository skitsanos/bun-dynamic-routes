import {join} from 'node:path';

const isCompiled = process.execPath !== Bun.which('bun');
const baseDir = isCompiled ? process.cwd() : new URL('../../..', import.meta.url).pathname;
const docsDir = join(baseDir, 'public', 'docs');

const renderPage = (content: string, title: string) => `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title} — Docs</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background: #0a0a0a;
            color: #d4d4d4;
            max-width: 780px;
            margin: 0 auto;
            padding: 2rem 1.5rem;
            line-height: 1.7;
        }
        h1, h2, h3 { color: #fff; margin-top: 2rem; }
        h1 { border-bottom: 1px solid #222; padding-bottom: 0.5rem; }
        a { color: #7cb3ff; text-decoration: none; }
        a:hover { text-decoration: underline; }
        code {
            background: #1a1a1a;
            padding: 0.15rem 0.4rem;
            border-radius: 4px;
            font-size: 0.9em;
        }
        pre {
            background: #111;
            border: 1px solid #222;
            border-radius: 6px;
            padding: 1rem;
            overflow-x: auto;
        }
        pre code { background: none; padding: 0; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
        }
        th, td {
            border: 1px solid #222;
            padding: 0.5rem 0.75rem;
            text-align: left;
        }
        th { background: #111; color: #fff; }
        blockquote {
            border-left: 3px solid #333;
            margin: 1rem 0;
            padding: 0.5rem 1rem;
            color: #999;
        }
        hr { border: none; border-top: 1px solid #222; margin: 2rem 0; }
        ul, ol { padding-left: 1.5rem; }
        li { margin: 0.3rem 0; }
    </style>
</head>
<body>
${content}
</body>
</html>`;

export const GET = async ({params}) =>
{
    const slug = params.slug || 'readme';
    const safePath = slug.replace(/[^a-zA-Z0-9_\-/]/g, '');
    const filePath = join(docsDir, `${safePath}.md`);

    // Block traversal out of docs dir
    if (!filePath.startsWith(docsDir))
    {
        return new Response('Not Found', {status: 404});
    }

    const file = Bun.file(filePath);
    if (!await file.exists())
    {
        return new Response('Not Found', {status: 404});
    }

    const markdown = await file.text();
    const content = Bun.markdown.html(markdown, {
        tables: true,
        strikethrough: true,
        tasklists: true,
        autolinks: true,
        headings: {ids: true}
    });

    return new Response(renderPage(content, safePath), {
        headers: {'Content-Type': 'text/html'}
    });
};
