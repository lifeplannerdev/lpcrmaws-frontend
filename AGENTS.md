# Frontend Project Rules - LP CRM (`lpcrm-frontend-main`)

Inherits global rules from `~/.gemini/config/plugins/global-rules/rules/AGENTS.md` and parent CRM specification.

---

## 1. Monday.com Project Board
- **Board ID**: `5032325363` (Name: CRM)
- **Board URL**: [Monday.com CRM Board](https://developerlifeplanners-team.monday.com/boards/5032325363)
- **Authorization Gate**: Never mark items "Done" without explicit user confirmation in chat.

---

## 2. Git & Deployments
- **Remote**: `https://github.com/lifeplannerdev/lpcrmaws-frontend.git`
- **Branch Strategy**: Branch off `main` to `feat/...` or `fix/...`. Never commit directly to `main`.
- **Vercel Preview**: Pushing feature branches triggers Vercel Preview Deployments. Check preview URL before submitting for merge.

---

## 3. Commands
- `npm run dev`: Start local Vite dev server.
- `npm run build`: Production build.
- `npm test`: Run Vitest test suite.
- `npm run lint`: ESLint check.
