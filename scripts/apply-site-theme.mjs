import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const routes = [
  ['Home', '/', 'home'],
  ['Programs', '/opportunities/', 'programs'],
  ['Mentors', '/mentors/', 'mentors'],
  ['Finalists', '/finalists/', 'finalists'],
  ['Achievements', '/achievements/', 'achievements'],
  ['FLEX essay practice', '/flex-mock/', 'flex-mock'],
];

function navigation(active, mobile = false) {
  return routes.map(([label, href, key]) => `<a href="${href}"${active === key ? ' aria-current="page"' : ''}>${label}</a>`).join('');
}

function chrome(active) {
  const brand = `<a class="relay-side-brand" href="/" aria-label="Relay Fellowship home"><img class="relay-brand-image" src="/media/relay-logo.jpg" alt=""><span>Relay <small>Fellowship</small></span></a>`;
  return `<aside class="relay-sidebar" aria-label="Site navigation">${brand}<nav>${navigation(active)}</nav><div class="relay-side-bottom"><p>Find your next opportunity and build your application.</p><a class="relay-side-register" href="/register/"${active === 'register' ? ' aria-current="page"' : ''}>Register <span aria-hidden="true">↗</span></a></div></aside><div class="relay-mobilebar">${brand}<a class="relay-mobile-register" href="/register/">Register ↗</a><details><summary aria-label="Open navigation">☰</summary><nav>${navigation(active, true)}</nav></details></div>`;
}

function routeFor(file) {
  const relative = path.relative(dist, file).replaceAll('\\', '/');
  if (relative === 'index.html') return 'home';
  if (relative.startsWith('programs/') || relative.startsWith('opportunities/') || relative.startsWith('available-programs/')) return 'programs';
  return relative.split('/')[0];
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(file); continue; }
    if (entry.name !== 'index.html') continue;
    let html = fs.readFileSync(file, 'utf8');
    html = html.replaceAll('<span class="relay-brand-icon">R<span>.</span></span>', '<img class="relay-brand-image" src="/media/relay-logo.jpg" alt="">');
    html = html.replaceAll('<span class="brand-mark">R<span>.</span></span>', '<img class="brand-logo-image" src="/media/relay-logo.jpg" alt="">');
    html = html.replaceAll('/__l5e/assets-v1/64849a4b-34c9-4fee-8df8-d9a4ede0c4e1/relay-logo.jpg', '/media/relay-logo.jpg');
    html = html.replace(/<link rel="icon"[^>]*>/g, '<link rel="icon" type="image/jpeg" href="/media/relay-logo.jpg?v=2">');
    html = html.replace(/<link rel="apple-touch-icon"[^>]*>/g, '');
    html = html.replace('</head>', '<link rel="apple-touch-icon" href="/media/relay-logo.jpg?v=2"></head>');
    html = html.replace(/href="\/flex-trial\.css(?:\?v=\d+)?"/, 'href="/flex-trial.css?v=2"');
    if (html.includes('data-relay-theme="2026"')) {
      html = html.replace(/href="\/theme\.css(?:\?v=\d+)?"/, 'href="/theme.css?v=3"');
      fs.writeFileSync(file, html);
      continue;
    }
    const active = routeFor(file);
    html = html.replace('</head>', '<link rel="stylesheet" href="/theme.css?v=3"></head>');
    html = html.replace(/<body([^>]*)>/i, (_, attrs) => `<body${attrs} data-relay-theme="2026">${chrome(active)}`);
    fs.writeFileSync(file, html);
  }
}

walk(dist);
