# Relay Fellowship site content

This public site uses structured JSON files so the team can add programs and verified stories without changing page layouts. A private web editor is not connected yet. Edit these files, run `node scripts/build-content.mjs` from the project folder, and republish the resulting `dist` directory.

## Programs

Edit `programs.json`. Each program needs a unique lowercase `slug`, official `sources`, and an `applyUrl`. The build script creates `/programs/{slug}/` and adds a card to `/opportunities/`. Review deadline, funding, eligibility, and numerical claims against the official sources before each publish; update the reviewed date in the build script when you do.

The catalog filters use `type`, `country`, `grade`, `field`, `fundingCategory`, `deadlineCategory`, and `durationCategory`. Keep those fields concise and consistent. `heroImage` and `logo` are local paths under `dist/media`; leave either blank when approved imagery is unavailable. Give any photograph a descriptive `heroImageAlt`, `heroImageCredit`, and `heroImageSource`.

## Relay stories

`finalists.json`, `achievements.json`, and `testimonials.json` are empty until the team supplies verified, approved records. Add only real Relay students and outcomes, with written permission for names, quotations, and photos. The site shows an intentional “coming soon” state while these lists are empty.

Finalist record fields: `name`, `programSlug`, `year`, `story`, and optionally `photo` and `photoAlt`. Achievement record fields: `title`, `programSlug`, `year`, `summary`, and optionally `photo` and `photoAlt`. The `programSlug` must match a record in `programs.json`. Store approved photos in `dist/media/` and use paths such as `/media/student-name.jpg`.

The build script currently reserves `testimonials.json` for approved quotations. It does not display testimonials yet, so quotations can be collected without accidentally publishing them.

## Publishing

The current public site is hosted through Sites. The project ID and static directory are in `.openai/hosting.json`. Rebuilding files locally does not update the public URL until a new site version is deployed.
