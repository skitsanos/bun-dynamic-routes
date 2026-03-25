export const GET = () =>
{
    const html = `<!doctype html>
<html lang="en">
  <body>
    <h1>My app</h1>
    <p>Rewritten for Bun file-system routing.</p>
  </body>
</html>`;

    return new Response(html, {
        headers: {'Content-Type': 'text/html'}
    });
};
