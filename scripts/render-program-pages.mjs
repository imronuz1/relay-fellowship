import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const programs = JSON.parse(fs.readFileSync(path.join(root, 'content', 'programs.json'), 'utf8'));
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const safeUrl = value => {
  const url = String(value ?? '');
  if (!/^(https:\/\/.+|\/.*)$/i.test(url)) throw Error(`Unsafe program URL: ${url}`);
  return esc(url);
};
const link = (url, label, cls = '', external = false) => `<a class="${cls}" href="${safeUrl(url)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(label)}</a>`;

for (const program of programs) {
  if (program.slug === 'flex') continue;
  const file = path.join(root, 'dist', 'programs', program.slug, 'index.html');
  let html = fs.readFileSync(file, 'utf8');
  const content = `<div class="flex-shell">
    <div class="flex-breadcrumb">${link('/opportunities/', '← All programs')}<span>/</span>${esc(program.shortName)}</div>
    <div class="flex-heading"><div><p class="flex-eyebrow">${esc(program.type)} · ${esc(program.country)}</p><h1>${esc(program.name)}</h1><div class="flex-organizer">${esc(program.organizer)}</div></div><span class="flex-status">${esc(program.fundingCategory)}</span></div>
    <figure class="flex-banner"><img src="${safeUrl(program.heroImage)}" alt="${esc(program.heroImageAlt)}"><figcaption>${link(program.heroImageSource, program.heroImageCredit, '', true)}</figcaption></figure>
    <div class="flex-content"><div class="flex-primary">
      <section class="flex-panel"><p class="flex-eyebrow">THE OPPORTUNITY</p><h2>About ${esc(program.shortName)}</h2><p class="flex-lead">${esc(program.tagline)}</p>${program.about.map(paragraph => `<p>${esc(paragraph)}</p>`).join('')}</section>
      <section class="flex-panel"><p class="flex-eyebrow">YOUR RELAY PROFILE</p><h2>Tell us your story</h2><p>Register on Relay Fellowship to share your school, grade, achievements, date of birth, and your own essay. Your account keeps your answers in one place.</p>${link('/register/?program=' + program.slug, 'Register with Relay ↗', 'flex-cta')}</section>
      <section class="flex-panel"><p class="flex-eyebrow">INSIDE THE EXPERIENCE</p><h2>What you’ll explore</h2><div class="flex-experiences">${program.experiences.map(item => `<div><span>${esc(item.icon)}</span><strong>${esc(item.title)}</strong><p>${esc(item.text)}</p></div>`).join('')}</div></section>
      <section class="flex-panel"><p class="flex-eyebrow">THE JOURNEY</p><h2>How it came to life</h2><div class="flex-experiences">${program.history.map(item => `<div><span>${esc(item.year)}</span><strong>${esc(item.title)}</strong><p>${esc(item.text)}</p></div>`).join('')}</div></section>
      <section class="flex-panel"><p class="flex-eyebrow">READY TO BEGIN?</p><h2>Your next steps</h2><ol class="flex-steps">${program.applySteps.map(step => `<li>${esc(step)}</li>`).join('')}</ol>${link(program.applyUrl, 'Visit the official application ↗', 'flex-cta', true)}</section>
    </div><aside class="flex-side"><section class="flex-panel flex-facts"><h2>At a glance</h2><dl><div><dt>LOCATION</dt><dd>${esc(program.location)}</dd></div><div><dt>DURATION</dt><dd>${esc(program.duration)}</dd></div><div><dt>FUNDING</dt><dd>${esc(program.funding)}</dd></div><div><dt>ELIGIBILITY</dt><dd>${esc(program.eligibility)}</dd></div><div><dt>APPLICATION TIMING</dt><dd>${esc(program.deadline)}</dd></div></dl>${link('/register/?program=' + program.slug, 'Register with Relay ↗', 'flex-cta')}${link(program.applyUrl, 'Official application ↗', 'flex-official', true)}</section><section class="flex-panel flex-note"><span>✳</span><p>Relay Fellowship helps you prepare. Confirm current eligibility and dates on the official program site.</p></section></aside></div>
    <section class="flex-sources"><h2>Official sources</h2><p>Program information reviewed 5 October 2026.</p><ul>${program.sources.map(source => `<li>${link(source.url, source.label, '', true)}</li>`).join('')}</ul></section>
  </div>`;
  html = html.replace(/<main>[\s\S]*?<\/main>/, `<main>${content}</main>`)
    .replace('<body>', '<body class="flex-trial">')
    .replace('</head>', '<link rel="stylesheet" href="/flex-trial.css"></head>');
  fs.writeFileSync(file, html);
}
