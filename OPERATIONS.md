# Operations

Coagulation Corp runs itself on GitHub. Pages hosts it, and Actions runs every recurring job. The game is static: no server, no database, no accounts. Runs and found endings are saved in each player's browser. Nothing here needs a person for the site to keep working.

- **Live:** https://theguysaccount.github.io/coagulation-corp-incremental-game/
  - Act I: `/`
  - Act II: `/coherence/`
  - Guide: `/guide/`
  - About: `/about/`
- **Repo:** https://github.com/theguysaccount/coagulation-corp-incremental-game
- **Indexed:** yes. The two games were saved artifacts that were never public. On 2026-11-22, coherencequest.com served a different site ("The Main Quest") and infinitecoherence.org showed a Namecheap parking page. Nothing here duplicates them.

## Automated jobs

| Job | Workflow | When | What it does | How it fails safe |
|---|---|---|---|---|
| Deploy | `pages.yml` | Every push to `main` that touches the game; by hand; when the self-test finds the live site behind `main` | <ol><li>Content and rules tests</li><li>Build</li><li>Rendered-HTML tests</li><li>Both acts end to end in headless Chrome</li><li>The balance check</li><li>Deploy</li><li>Wait for the new build, check it, play it end to end again</li><li>Ping IndexNow</li></ol> | Any failed check stops the run before the deploy, so the last good site stays live. IndexNow problems are warnings. Re-running is always safe. |
| Weekly self-test | `selftest.yml` | Fridays 09:19 UTC, or by hand. This account's schedules often start hours late; nothing depends on the exact time. | The same tests and balance check on a fresh build of `main`. A health check and the end-to-end test on the **live** site. A staleness check that asks `pages.yml` for a fresh deploy if the live build is behind the last change to the game. | Read-only apart from that one dispatch. A failure opens or updates one `ops-alert` issue, and GitHub emails the repository owner. A later pass closes it. |
| Keep-alive | `selftest.yml` → `scripts/keepalive.sh` | Weekly, even when the self-test fails | Re-enables every scheduled workflow. Pushes an empty `[skip ci]` commit after 45 quiet days. | GitHub disables schedules after 60 days without activity. |

`selftest.yml` also carries a temporary launch-proof schedule (`41 */2 22,23 11 *`). It can only fire on 22 and 23 November, and should be deleted after the first scheduled pass.

### What each check means

- **`tests/data.test.mjs`** checks the content of both acts:
  - **Endings.** All ten endings are registered, and every ending the code can trigger is in the registry.
  - **Shared links.** They accept only known endings.
  - **Research hint.** The "45,000×" on screen equals the product of the research data.
  - **No banned names.** No trademarked or real-world names (Tolkien, Black Mirror, named essays or trusts) are in the text.
  - **No real-world requests.** The game makes no real-world calls to action.
- **`tests/rendered-html.test.mjs`** checks the built pages:
  - Pages and links.
  - No banned names anywhere in the shipped JavaScript.
  - All ten endings appear in the guide.
  - A custom-domain build and a staged build.
  - The https-only optional slots.
- **`scripts/e2e.mjs`** plays both acts:
  - **Act I.** It clicks and buys, reloads and expects the run back, then forces Act I's FLATLINE ending, checking the ending card, the share link and the gallery count.
  - **Defection to Act II.** It checks the carry-over: coherence, conviction to wisdom, and the head start of their curve. It plays Act II, reloads, and forces THE CONVERSION.
  - **Everything else.** A shared `?ending=` link, broken save codes, the phone layouts with no sideways scroll, the 404 page and the browser console.
- **`scripts/balance.mjs`** runs scripted players on the real game code with fast-forwarded time:
  - A first run that defects at once must take 8–45 minutes. The script is faster than a person; a human first run lands around 20–40.
  - Act II must end within 35 minutes.
  - Never defecting must reach an Act I ending within 15–70 minutes.

## What to watch

| Signal | Where | Healthy |
|---|---|---|
| Open `ops-alert` issues | Issues tab; GitHub's failure emails | None open |
| Weekly self-test, including the balance summary | Actions → Weekly self-test | Green every week |
| Starts, defections, endings, shares (once analytics is on) | GoatCounter events: `act1_start`, `defect`, `act2_start`, `ending_<id>` (the first time on a device), `share_native`, `share_download`, `share_copy` | Endings per start is the completion rate. Shares per ending is the swing factor. |

## Run anything by hand

```bash
npm ci --ignore-scripts
npm test                     # content tests, build, rendered-HTML tests
npm run e2e                  # both acts end to end in headless Chrome
npm run balance              # scripted players, pacing summary
npm run screens              # docs/screens/*.png
node scripts/og.mjs          # re-render public/og.jpg
~/.local/bin/gh workflow run pages.yml -R theguysaccount/coagulation-corp-incremental-game
```

## Keys Jack can turn later

None of these are needed for the game to work.

### 1. Custom domain (the base address is one setting: `SITE_URL`)

The "domain rollout" session sets domains up. Nothing here changes DNS.

Candidates:
- `coherencequest.com`. It is live with a different site (SiteGround nameservers, A 216.198.79.1). Under the build-on-top rule the game goes on a subdomain such as `play.coherencequest.com`.
- `infinitecoherence.org`. It is parked at Namecheap, so the apex is free. It is listed as a redirect.

Steps, in this order:

1. **Add the DNS records** in the zone that serves the domain. For coherencequest.com that is SiteGround's zone; for infinitecoherence.org it is Namecheap's Advanced DNS.
   - **Subdomain:** `CNAME play → theguysaccount.github.io.`
   - **Apex:**
     - `A @` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
     - `AAAA @` → `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
     - `CNAME www → theguysaccount.github.io.`

     Remove the parking records first.
2. **Point Pages at the domain:**
   `~/.local/bin/gh api -X PUT repos/theguysaccount/coagulation-corp-incremental-game/pages -f cname=play.coherencequest.com`
   You can also use Settings → Pages. No CNAME file is used.
3. **Enforce HTTPS** once the certificate is issued:
   `~/.local/bin/gh api -X PUT repos/theguysaccount/coagulation-corp-incremental-game/pages -F https_enforced=true`
4. **Switch the address and redeploy:**
   `~/.local/bin/gh variable set SITE_URL -b https://play.coherencequest.com -R theguysaccount/coagulation-corp-incremental-game`
   Then run `~/.local/bin/gh workflow run pages.yml -R theguysaccount/coagulation-corp-incremental-game`.
   Every canonical, card link, health check and IndexNow ping follows `SITE_URL`.
5. **What happens next.**
   - The github.io address redirects by itself.
   - Saves belong to the browser's address. Players carry a run across with EXPORT/IMPORT in Act I or the ⇅ save button in Act II. Found endings start fresh on the new address.

### 2. Money: one support link

GitHub Pages is non-commercial, and the evaluator's cheapest test was a pay-what-you-want itch.io page. The slot is a footer link on both acts, hidden until set.

1. `~/.local/bin/gh variable set SUPPORT_URL -b https://<you>.itch.io/coagulation-corp -R theguysaccount/coagulation-corp-incremental-game`
2. Optional: `SUPPORT_LABEL`, for example `PAY WHAT YOU WANT`.
3. Redeploy. Only https links are accepted.

### 3. Analytics

Off by default, and the About page says so.

1. Create a free GoatCounter site.
2. Run `~/.local/bin/gh variable set GOATCOUNTER_URL -b https://<code>.goatcounter.com/count -R theguysaccount/coagulation-corp-incremental-game`.
3. Redeploy.

The events are already in the code. Automated browsers are never counted.

### 4. itch.io release (needs an account)

1. Build and zip it: `SITE_URL=https://theguysaccount.github.io/coagulation-corp-incremental-game npm run build && (cd dist && zip -r ../coagulation-corp-itch.zip .)`
2. Upload it as an HTML game played in the browser:
   - Viewport 1280×860, with "Mobile friendly" on.
   - Tags: incremental, idle, clicker, satire.

Paths are relative, so both acts run inside itch's frame. The Defection link works too.

### 5. Search Console

After key 1, verify the domain and submit `/sitemap.xml`. IndexNow engines are pinged on every deploy.

### 6. Optional content routine (Claude, quarterly)

The game needs no new content to keep running. If Jack wants it to grow, a quarterly Claude Code routine can add one wire headline and one event per act. Use this prompt:

> Pull main. In `src/act1/data.js`, add one headline to HEADLINES and, in `src/act1/game.js`, one event to the Coagulation pool, both in the existing satirical voice. Invent everything: no real company, person, product, essay title or trademark. Run `npm test`, `npm run e2e` and `npm run balance`, commit, push. Do not post anywhere.

## Safety and privacy rules the code keeps

- **Fiction labels.** Satire and fiction are stated on both acts, in the About and guide pages, on every ending card, and in the descriptions. Every company, person and event is invented.
- **Replaced names.** Trademarked and real-world names from the originals were replaced, and tests fail the build if they come back:
  - Gollum Mode → Hoard Mode
  - The One Ring → The Sole Key
  - Black Mirror Fleet → Dark Screen Fleet
  - Resistance Is Futile → No Exit Protocol
  - Ring-Bearer → Keyholder
  - Long-Term Benefit Trust → Long-Horizon Trust
  - "Gentle Singularity" → "Soft Takeoff"
  - YC → accelerators
- **No real-world asks.** There are no real-world calls to action, sign-ups or donations, and no cookies or accounts.
- **Sound.** Sound is off until the player turns it on.
- **Share links.** A shared link carries only the ending's name.
