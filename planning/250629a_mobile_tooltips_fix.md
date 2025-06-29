# Mobile tooltip reliability & touch support fixes

## Goal & context
Spideryarn's custom `TooltipOrPopover` was introduced so long-press on touch devices mimics hover tooltips on desktop.  Real-world testing shows two main UX issues:

1.  Tooltips often **fail to appear** or require an awkward delay.
2.  Once open, they **don't dismiss consistently** (tap outside, scroll, etc.).

This plan delivers a focussed patch (Steps 1-4) that fixes the current implementation **without library changes**.  We will:

* Harden the `useLongPress` hook.
* Simplify `TooltipOrPopover` to always render a `Popover`, driven by hover + focus + long-press triggers.
* Introduce a lightweight **TooltipManager** so only one tooltip is open at a time and dismiss logic is centralised.
* Ensure heading summaries load when a tooltip/popup actually opens (touch & desktop).

The work is bounded to a single PR so we can ship improvements quickly while leaving the door open for a later Floating UI migration.

### Success criteria
* Long-press (≈500 ms) on any tooltip trigger reliably shows its content on iOS & Android.
* Tapping outside, scrolling, or pressing ⎋ always closes the tooltip.
* Only one tooltip may be open at once.
* Existing hover & keyboard behaviour on desktop is unchanged.
* All tests & health checks pass.

## References
* `components/ui/tooltip-or-popover.tsx` – current component.
* `lib/hooks/use-long-press.ts` – current long-press implementation.
* `components/ui/tooltip.tsx`, `components/ui/popover.tsx` – Radix shells.
* `docs/reference/DESIGN_TOOLTIPS.md` – canonical styling patterns.
* `docs/instructions/WRITE_PLANNING_DOC.md` – planning-doc template (this doc follows it).

## Principles & key decisions
* **Ship value first** – keep Radix; fix the bugs before considering larger refactors.
* **Minimum surface-area change** – avoid cascading API changes; keep `TooltipOrPopover` props stable.
* **Single-tooltip rule** – UX is clearer and code simpler when only one tooltip is open.
* **Touch parity** – long-press should feel as quick & natural as hover.
* **Tests where behaviour is subtle** – add a unit test for `useLongPress` to guard against regressions.

## Stages & actions

### Refactor `useLongPress`
- [x] Rewrite hook: early `preventDefault`, maintain `isActive` until callback fires, add movement/outside-pointer cancellation, support `touchstart` fallback.
- [x] Unit-test with JSDOM: verify callback fires after delay and cancels on early pointer up.

### Simplify `TooltipOrPopover`
- [x] Remove desktop/touch branching – always render Radix `Popover`.
- [x] Add hover (`pointerenter`/`focus`) trigger to open instantly on hover-capable devices.
- [x] Integrate new `useLongPress` trigger.
- [x] Add global listeners (pointerdown outside, scroll, resize, keydown Esc) to dismiss.
- [x] Manual smoke test on desktop & mobile simulator.

### TooltipManager context
- [x] Create `lib/context/tooltip-manager.tsx` that tracks `openId` + `setOpenId`.
- [x] Wrap `_app.tsx` (or nearest common root) in provider.
- [x] Inside `TooltipOrPopover`, on open set `openId`, on close clear it; auto-close previous tooltip when a new one opens.

### Trigger summary load on open
- [ ] Expose `onOpenChange` prop from `TooltipOrPopover` (non-breaking).
- [ ] In `HeadingTree` & other callers, pass `handleTooltipShow` so summaries load on touch.

### QA & polish
- [ ] Re-run `npm run lint`, `npm run build`, and relevant Jest suites.
- [ ] Add Playwright run in iPhone 12 viewport for quick manual confirm (no new automated E2E yet).
- [ ] Update `docs/reference/DESIGN_TOOLTIPS.md` with new interaction details.
- [ ] Prepare concise PR description referencing this planning doc.

### Review & merge
- [ ] Receive user + code-review approval.
- [ ] Merge feature branch; delete branch.
- [ ] Move this file to `planning/finished/` directory.

## Appendix: Future directions & alternatives

### Floating UI migration (not part of this patch)
* **Hybrid approach** – keep Radix shells but replace internal hover/long-press logic with `@floating-ui/react` hooks (`useHover`, `useLongPress`, `useDismiss`, etc.). Minimal styling churn, better interaction fidelity.
* **Full rewrite** – drop Radix Tooltip/Popover entirely, create headless Tooltip component powered by Floating UI. Gains: smaller bundle, unified positioning API, richer middleware (flip/shift/size). Requires wiring ARIA roles and Tailwind animation classes manually.

### Other considered options
* Keep current branch logic but fix media-query false-positives (use `@react-aria/useHover` to detect actual hover events) – rejected: still leaves dismiss issues.
* Increase Radix Tooltip delay & attempt to detect long-press via `delayDuration` – rejected: Radix Tooltip stops listening after `pointerdown`, so not viable for long-press on touch.

> When we revisit tooltips holistically (e.g. dark-mode, better positioning on small viewports) we should re-evaluate Floating UI, possibly standardising all floating elements (context menus, comboboxes) on it. 