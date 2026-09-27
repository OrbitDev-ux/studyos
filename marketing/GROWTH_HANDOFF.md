# StudyOS Growth Handoff

## Product State

- Product model: FREE ONLY. New in-app checkout is disabled.
- Historical billing records, plan enums, Polar/Toss compatibility, and migrations are retained. Polar's external configuration was not changed.
- Fair-use and abuse controls remain for cost-bearing AI generation.
- Release freeze applies to StudyOS core: no new large features, payment changes, or broad redesign. P0/P1 fixes, security, analytics/observability, and small landing-copy experiments remain allowed.
- Theme Events are an explicit live-content exception to the core freeze. New optional events may add event config, theme tokens, assets, copy, missions/challenges, accessibility/performance improvements, and event analytics. Do not rebuild core architecture, add per-event DB schema, interrupt study flows, force participation, promise rewards, or use fake urgency/countdowns.

## Funnel

Target: visit → signup → first study → study completion → return.

Available evidence is partial: Vercel Web Analytics can collect page views; the demo emits `demo_started` once per tab session; typed events exist for signup/login, generated problems, and completed study sessions. Server `capture()` is currently a production no-op, and there is no confirmed first-study-start or return/retention sink. No Midnight event-specific analytics event is currently wired. Do not report a complete conversion/retention funnel.

## Public URLs

- Production: https://studyos-teal-eta.vercel.app/
- Free product page: https://studyos-teal-eta.vercel.app/pricing
- Public demo: https://studyos-teal-eta.vercel.app/demo
- Demo dashboard: https://studyos-teal-eta.vercel.app/demo/dashboard
- Demo problems: https://studyos-teal-eta.vercel.app/demo/problems
- Demo AI Tutor experience: https://studyos-teal-eta.vercel.app/demo/tutor

## Verified Product Claims

- StudyOS can be used without purchasing a plan; no new checkout is offered in the app.
- The product includes study planning/progress, problem solving, review, and AI-assisted study surfaces.
- A public Demo Mode is available without an account. Demo records are sample/demo state, not real user results; the demo tutor is not evidence of a live AI request.
- The `MIDNIGHT STUDY WEEK` treatment is optional and scheduled from 2026-09-27 08:59:58 KST through 2026-10-04 08:59:58 KST (end exclusive).

## Do Not Claim

- No unsupported user counts, learning outcomes, score lifts, testimonials, causal study claims, or invented analytics.
- Do not call the demo's sample students, scores, streaks, or activity real customer evidence.
- Do not advertise PRO/PREMIUM, upgrade, subscriptions, checkout, or a live payment offer.
- Do not claim legal/privacy compliance, verified processor contracts, retention periods, international-transfer details, or current provider-side billing status. Public legal text still contains human-review placeholders and historical billing terms.
- Do not publish a ticking countdown or suggest the core product disappears when the event ends.

## Operations

Do not publish automatically from this handoff. Before external campaigns, complete operator/legal review of current public legal documents and verify any operational claims against the deployed product.
