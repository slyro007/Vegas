# ARCHIVED — Vegas is dormant (paused 2026-09-11)

Nothing was deleted. The app was paused to stop Vercel/Neon usage until it is needed again.
Domains, Clerk, and API keys were left in place.

## What was done
- **Vercel** project `vegas` (`prj_iTZDdq4AJQNQ4JxM7L9tr00EY0ps`, team `longhorn-houses`) → **Paused** (Settings → General → Pause Project). Domain `vegas.longhornhouses.com` is still attached; it serves Vercel's paused page.
- **Neon** project `winter-mountain-42299313` (org `org-long-snow-93622409`) → compute capped at **0.25 CU** min/max, scale-to-zero left on. Data intact.
- **Backup** of every table: `/Users/pithya/Claude Projects/Vegas-backups/db-backup-2026-09-11T12-40-07.json`

## To restart
1. Vercel dashboard → `vegas` → Settings → General → **Unpause Project** (or `POST /v1/projects/prj_iTZDdq4AJQNQ4JxM7L9tr00EY0ps/unpause?teamId=team_JQjmt24pqO1ZuTqsabUsXaI9`).
2. `npx -y neonctl projects update winter-mountain-42299313 --org-id org-long-snow-93622409 --cu 8` (restores the 0.25–8 CU autoscaling range).
3. Redeploy if needed: `vercel deploy --prod --yes`. Confirm env vars are still set in Vercel.
4. Smoke-test sign-in and one DB read.
5. Delete this file.
