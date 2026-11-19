# Lumen Arcade

A free, play-money casino-style arcade: Sky Crash, Orchard Climb, Mine Field, Plinko, Lucky Dice, Fortune Wheel, Gold Slots and Coin Flip.
Credits (LC) have no cash value. There are no deposits, withdrawals or payments.

Created by developer Ahmed Naser. Contact (WhatsApp): 01050162971, for feedback only, never for payments.

Static site, no build step.

## Run locally
    npx serve .
or open `index.html` in a browser.

## Deploy to Vercel
1. Push this folder to a GitHub repo, then "Add New Project" in Vercel and import it.
   Framework preset: Other. Leave build command and output directory empty.
2. Or from this folder: `npx vercel --prod`.

## Files
- `index.html` page markup, SVG symbols, footer credit, meta CSP
- `style.css` all styles
- `app.js` games, wallet, settings, fairness logic, terms gate
- `vercel.json` security headers
- `favicon.svg`

## Terms & policies
Shown on first visit as a scrollable "Terms & Conditions" window with Agree / Disagree.
Agree unlocks after scrolling to the end and ticking the 18+ / play-money box. Disagree keeps the site locked.
Terms are also available from the footer and Settings, where agreement can be withdrawn.
To change the wording, edit the `TERMS` array in `app.js`; raise `TERMS_V` to make everyone agree again.

## Security notes
- No backend, no accounts, no cookies, no analytics, no payment fields.
- Strict Content-Security-Policy (scripts only from this site, no inline scripts, no eval), plus HSTS, X-Frame-Options DENY,
  X-Content-Type-Options, no-referrer, Permissions-Policy, COOP and CORP headers (see `vercel.json`).
- All user-visible text is inserted as text, never as HTML. The few HTML insertions use developer-written icon markup only.
- Saved browser data is rebuilt field by field with strict types, so edited or corrupt storage cannot inject markup or break the app.
- Only external requests: Google Fonts (allowed in the CSP) and the WhatsApp link when tapped.
- Do not add real-money features, payment numbers or payment forms. The terms forbid it.
