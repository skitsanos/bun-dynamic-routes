# Configuration and request boundaries

The template loads optional config/server.yaml from the working directory, validates it with Zod, and applies environment overrides. Follow the [README configuration table](../assets/README.md) rather than inventing environment-only replacement configuration. Invalid numeric inputs, environment values, headers, and wildcard credentials fail before binding.

Require the endpoint's actual media type and convert parse errors to 400/415. Then validate payload shape. Uploads require multipart data and use UUID-based names with exclusive creation under uploads/. Existing files must never be replaced. Tests use separate temporary applications; never delete the user's upload tree during verification.

CORS is an HTTP browser policy, not authentication. A preflight requires OPTIONS, Origin and Access-Control-Request-Method. Resolve the path first, derive methods from its actual handlers and configured allowlist, and check requested headers case-insensitively. Preserve explicit ordinary OPTIONS. Add Vary: Origin to allowed, denied and no-Origin variants when using an allowlist. Reject wildcard origins with credentials.

Trust forwarding headers only when server.trustProxy is enabled for a deployment whose proxy rewrites those headers. Keep configuration and credentials out of response bodies. The config demo uses an explicit field allowlist and does not publish TLS material.

Public Markdown is trusted repository content. If adding user-controlled Markdown/HTML, sanitize it before rendering. Keep uploads outside the public tree. For static/page/document file access, use [the canonical containment helper](../assets/src/utils/files.ts).
