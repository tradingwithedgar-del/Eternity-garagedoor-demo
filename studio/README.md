# Reelix Studio

An AI image and video studio: text-to-video and image-to-video with 20 named camera moves, text-to-image with style presets, reference-based image editing, 4K upscaling, a per-user library, and a credit system with automatic refunds on failure. Generation runs on [fal.ai](https://fal.ai).

To rename the product, edit `src/lib/brand.ts`.

## Run it

```bash
cd studio
npm install
cp .env.example .env.local   # fill in AUTH_SECRET; FAL_KEY is optional
npm run dev                   # http://localhost:3000
```

With no `FAL_KEY`, the app runs in **mock mode**. Every tool works end to end, but it returns placeholder images and short sample clips, so nothing is billed. Put "fail" in a prompt to test the failure-and-refund path. Add a fal key to switch to real generation, with no code changes.

| Variable | Required | Notes |
| --- | --- | --- |
| `AUTH_SECRET` | yes, in production | 32+ random characters (`openssl rand -base64 48`). The server refuses to sign sessions without it. |
| `FAL_KEY` | for real output | From https://fal.ai/dashboard/keys |
| `DATABASE_URL` | no | Defaults to `file:./data/app.db` (SQLite). Use a Turso/libSQL URL on serverless hosts. |
| `DATABASE_AUTH_TOKEN` | with Turso | |
| `SIGNUP_CREDITS` | no | Free credits for new accounts (default 100). |
| `CONTACT_EMAIL` | no | Shows a "Contact us" button on the pricing page. |

Give an account credits: `npm run grant-credits -- someone@example.com 500`

## What's inside

| Tool | Models (fal endpoint) |
| --- | --- |
| Video | Kling 2.5 Turbo Pro, Veo 3.1 Fast (with audio), Seedance 1 Pro, Hailuo 02. Each runs text-to-video, or image-to-video when you add a start frame. |
| Image | Flux Schnell, Seedream 4, Flux 1.1 Pro Ultra, Nano Banana Pro |
| Edit | Nano Banana Edit, Nano Banana Pro Edit (up to 4 references) |
| Upscale | SeedVR2 (1080p / 1440p / 4K) |

- **Model registry:** `src/lib/models.ts` holds endpoints, input mapping, allowed options, and credit prices. Endpoint IDs and field names were checked against the type definitions shipped in `@fal-ai/client`. Credits are priced roughly at 1 credit ≈ $0.01 of provider cost. Set your own margins there.
- **Camera moves and styles:** `src/lib/presets.ts`. Each move appends cinematography language to the prompt, and "Locked Off" also sets Seedance's `camera_fixed`.
- **Jobs:** `src/lib/jobs.ts`. Credits are debited and the job row inserted in one transaction. Submission goes to fal's queue, and the browser polls `/api/jobs/:id`, which checks fal and finalises the job. Failure, provider rejection, and a 60-minute timeout all refund exactly once, guarded by a conditional status update.
- **Auth:** email and password (bcrypt), HS256 session cookie (`jose`), rate-limited sign-up and login.
- **Downloads:** `/api/download` streams results with a filename. It only fetches URLs stored on the caller's own jobs, and only from this origin or fal's CDN.

## Before you take real money

These are deliberately not built yet:

- **Payments.** Credits come from sign-up and `grant-credits`. Add Stripe Checkout plus a webhook that increments `users.credits` to sell packs.
- **Media storage.** Results are fal-hosted URLs, which aren't guaranteed to be permanent. Copy outputs to your own bucket (S3/R2) on completion if users need them long term.
- **Multi-instance hosting.** The rate limiter is in-memory, and mock-mode uploads go to local disk. Use Redis for limits if you run more than one server.
- **Password reset and email verification.**
- **Content moderation** beyond each model's own safety checker.

## Checks

```bash
npm run typecheck && npm run lint && npm run build
```
