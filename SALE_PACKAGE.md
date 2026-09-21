# HumanoidBehavior.com — Sale Package

## Asset Overview

**HumanoidBehavior.com** is an early-stage robotics infrastructure MVP built around a browser-first, measured MuJoCo workflow.

The core product loop is:

**Behavior → Version → Experiment → Seed/Policy → MuJoCo → Measured Result → Persisted Artifact → Report/Replay**

The asset is positioned as a working foundation for a robotics/Embodied AI product rather than as a completed physical-robot benchmarking platform.

## Included Product Surface

- Responsive robotics SaaS frontend.
- Landing, authentication, dashboard and workspace flows.
- Public behavior registry and behavior detail pages.
- Behavior builder.
- Experiment Lab.
- Benchmark launcher.
- Persistent experiment records.
- Browser-based measured MuJoCo execution using official JavaScript/WASM bindings.
- Experiment replay and report-oriented views.
- API documentation and API-key foundation.
- Cloudflare Worker application/API layer.
- Cloudflare D1 persistence architecture.
- GitHub Pages deployment and automated CI/Pages workflow.
- Buyer handoff documentation and deployment/verification guidance.

## Canonical Production Architecture

**GitHub Pages** → frontend

**Browser** → measured MuJoCo JavaScript/WASM execution

**Cloudflare Worker** → authenticated application/API layer

**Cloudflare D1** → durable experiment/session persistence

The browser-first measured path is the canonical current production path. Local/legacy worker infrastructure remains available for development and future use but should not be treated as the primary production architecture.

## What a Buyer Can Verify

1. Open the production site.
2. Create or log into an account.
3. Select **Pick & Place**.
4. Launch an evaluation.
5. Confirm measured MuJoCo execution.
6. Inspect the measured result and seed/policy metadata.
7. Open replay/report views.
8. Confirm the persisted experiment in the dashboard.
9. Review the API/docs surface.

The intended proof point is **measured and reproducible execution**, not the number of UI pages.

## Current Product Boundaries

The following are intentionally not represented as completed production capabilities:

- Physical robot execution.
- Robot-specific hardware adapters.
- Broad physical-robot benchmarking coverage.
- Live Stripe checkout.
- Executable behavior-version comparison.
- Browser-side fake benchmark execution as a substitute for measured compute.

Current simulator execution should be described as MuJoCo/reference-model execution.

## Commercial Status

| Plan | Price | Definition |
|---|---:|---|
| Free | $0 | 25 benchmark runs/month; 5 private behaviors |
| Pro | $49/month | 500 runs; unlimited private behaviors; API; reports |
| Team | $299/month | 5,000 runs; team workspaces; shared datasets; priority support |

**Checkout is not live.** These figures describe the product/pricing model and should not be presented as current recurring revenue.

## Asset Scope for a Transaction

The transaction should explicitly identify what is included, for example:

- HumanoidBehavior.com domain.
- Repository/source-code access.
- Frontend and application assets.
- Cloudflare Worker/D1 architecture and deployment configuration.
- Documentation and buyer handoff materials.
- Branding/content included by agreement.
- Relevant deployment configuration and operational knowledge.

Production credentials and secrets should be transferred securely and separately; plaintext secrets should not be placed in source control.

Any excluded asset should be listed explicitly in the transaction agreement.

## License / IP Note

The repository currently uses the **MIT License**.

The sale scope should distinguish:

1. Domain and brand assets.
2. Existing open-source/MIT-licensed source code.
3. Proprietary configuration, data, accounts, deployment assets, content, or other separately controlled assets.
4. Any intellectual-property rights expressly assigned by the transaction.

The repository should not be marketed as granting exclusive rights to MIT-licensed source code unless the licensing and transaction structure has been legally changed to support that claim.

## Technical Due-Diligence Checklist

- Production site and core measured workflow.
- GitHub repository ownership/access.
- GitHub Actions and Pages deployment.
- Cloudflare Worker configuration.
- Cloudflare D1 binding/database configuration.
- Domain registrar/DNS ownership.
- Production environment variables and secrets.
- Authentication/session configuration.
- Third-party dependencies and licenses.
- Included datasets, experiment records, analytics and content.
- Included and excluded accounts/integrations.
- Credential rotation plan after transfer.

## Recommended Handoff Package

- Domain transfer details.
- GitHub transfer details.
- Cloudflare migration/transfer plan.
- Production configuration and secret-rotation procedure.
- Architecture and deployment documentation.
- Known limitations.
- Product/pricing specification.
- Open-source/license inventory.
- Third-party service inventory.
- Demo/verification instructions.
- Included/excluded asset list.
- Post-transfer credential rotation checklist.

## Expansion Opportunities

**Commercialization**
- Billing and entitlement enforcement.
- Usage metering.
- Team administration.

**Robotics**
- Validated robot-specific adapters.
- Hardware-in-the-loop execution.
- Expanded benchmark suites.
- Behavior/version comparison.

**Teleoperation**
- Pointer/touch-based live teleoperation.
- Trajectory recording.
- Replay and evaluation.
- Physics-backed control after controller/API validation.

## Buyer Positioning

> **HumanoidBehavior.com is an early-stage robotics infrastructure MVP for specifying, executing, measuring, persisting, and replaying robot behaviors through a browser-first MuJoCo workflow.**

The asset should be evaluated on the coherence of this implemented foundation and its expansion path, while keeping the current product boundaries explicit.

## Related Documentation

- [Buyer Handoff](BUYER_HANDOFF.md)
- [README](README.md)
