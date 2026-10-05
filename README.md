# Relay Fellowship

Public website for programs and private student registration.

## Deploy on GitHub Pages

The intended repository is `imronuz1/relay-fellowship`, served from the `main` branch's `/docs` folder at `https://imronuz1.github.io/relay-fellowship/`.

Run `node scripts/build-github-pages.mjs` after editing content or site files. Commit and push the regenerated `docs/` folder. The script builds program pages from `content/`, adds the registration links, and rewrites local links for the GitHub Pages project path.

## Connect Firebase

Create a Firebase project and register a web app. Copy its public web configuration into `dist/firebase-config.js`, then rebuild `docs/`. Enable these products in Firebase Console:

1. Authentication → Email/Password and Email link (passwordless), plus Google.
2. Authentication → Settings → Authorized domains: `imronuz1.github.io`.
3. Cloud Firestore in production mode; publish the rules from `firestore.rules` before enabling registration.

Email sign-in sends a link to the student's entered email address. Google sign-in uses a popup. Student profiles and their own essays are saved only after sign-in. Firestore rules restrict each profile to its owner. The site never submits a program application on the student's behalf.

Firebase's web configuration is public client configuration; keep service-account keys and other private credentials out of this repository.

## Content

See `content/README.md` for programs and verified student stories. The registration form currently lists the four programs in `content/programs.json`; add any new program to its selector and essay prompt in `dist/register/` as well.
