# Frontend choices

The canonical template serves trusted HTML, browser JS/CSS, and Markdown through FileSystemRouter/custom fetch. It does not include React, a frontend bundler or native HTML-import routes. Keep this architecture when the task is template maintenance.

For a project deliberately using React SSR, make route modules explicit HTTP handlers and render components inside those handlers. Never identify components by inspecting function source. Treat rendered user HTML/Markdown as untrusted and use sanitization appropriate to the application.

For a project deliberately using Bun HTML imports, register the HTML under Bun.serve({routes}); that is a different route contract with runtime browser-asset bundling. Do not silently convert canonical FileSystemRouter modules or tell their handlers they receive BunRequest. Preserve existing frontend frameworks when migration was not requested.

Verify affected pages in a real browser after frontend changes: rendering, interaction, network failures and console errors. The canonical chat includes safe text escaping; preserve it when changing markup.
