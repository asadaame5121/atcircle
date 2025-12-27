import { html } from 'hono/html';

export const Layout = (props: { title: string; children: any }) => html`
  <!DOCTYPE html>
  <html lang="en" data-theme="light">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${props.title}</title>
    <link href="https://cdn.jsdelivr.net/npm/daisyui@4.4.19/dist/full.min.css" rel="stylesheet" type="text/css" />
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      /* Custom overrides if needed */
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    </style>
  </head>
  <body class="bg-base-200 min-h-screen">
    <div class="container mx-auto p-4 max-w-4xl">
      <header class="navbar bg-base-100 rounded-box shadow-lg mb-8">
        <div class="flex-1">
          <a href="/" class="btn btn-ghost text-xl text-primary">Webring</a>
        </div>
        <div class="flex-none">
          <ul class="menu menu-horizontal px-1">
            <li><a href="/">Home</a></li>
            <li><a href="/sites">Sites</a></li>
            <li><a href="/antenna">Antenna</a></li>
            <li><a href="/dashboard">Dashboard</a></li>
          </ul>
        </div>
      </header>
      ${props.children}
    </div>
  </body>
  </html>
`;
