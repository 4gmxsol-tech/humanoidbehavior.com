# HumanoidBehavior.com — Sale Package

## Asset Overview

**HumanoidBehavior.com** is an early-stage robotics infrastructure MVP built around a browser-first, measured MuJoCo workflow.

Core loop:

**Behavior → Version → Experiment → Seed/Policy → MuJoCo → Measured Result → Persisted Artifact → Report/Replay**

The asset is positioned as a working foundation for robotics / Embodied AI evaluation rather than as a completed physical-robot benchmarking platform.

## Included Product Surface

- Responsive robotics SaaS frontend.
- Landing, authentication, dashboard and workspace flows.
- Public behavior registry and behavior detail pages.
- Behavior builder.
- Experiment Lab and benchmark launcher.
- Persistent experiment records.
- Browser-based measured MuJoCo execution using JavaScript/WASM.
- Experiment replay and report-oriented views.
- API documentation and API-key foundation.
- Cloudflare Worker application/API layer.
- Cloudflare D1 persistence architecture.
- GitHub Pages deployment and automated CI/Pages workflow.
- Buyer handoff and transfer documentation.

## Canonical Production Architecture

**GitHub Pages** → frontend

**Browser** → measured MuJoCo JavaScript/WASM execution

**Cloudflare Worker** → authenticated application/API layer

**Cloudflare D1** → durable experiment/session persistence

The browser-first measured path is the canonical current production path.

## What a Buyer Can Verify

1. Open the production site.
2. Create or log into an account.
3. Select a supported behavior.
4. Launch an evaluation.
5. Confirm measured MuJoCo execution.
6. Inspect measured result and seed/policy metadata.
7. Open replay/report views.
8. Confirm the persisted experiment in the workspace.
9. Review the API/docs surface.

The intended proof point is **measured and reproducible execution**, not feature count.

## Current Product Boundaries

The following are not represented as completed production capabilities:

- Physical robot execution.
- Robot-specific hardware adapters.
- Broad physical-robot benchmarking coverage.
- Live paid checkout.
- Executable behavior-version comparison.
- Fake browser benchmark execution as a substitute for measured compute.

Current simulator execution should be described as MuJoCo/reference-model execution.

## Commercial Model

The product includes a pricing model and plan definitions in the UI, but **paid checkout is not live and there is no claim of current recurring revenue**.

Any commercial terms, acquisition consideration, valuation or transaction structure should be discussed directly during a strategic acquisition process rather than treated as public pricing guidance.

## Asset Scope for a Transaction

The transaction should explicitly identify:

- HumanoidBehavior.com domain.
- Repository/source-code access as agreed.
- Frontend and application assets.
- Cloudflare Worker/D1 architecture and deployment configuration.
- Documentation and buyer handoff materials.
- Branding/content included by agreement.
- Any separately assigned rights expressly included in the agreement.

Production credentials and secrets should be transferred securely and separately; plaintext secrets should not be placed in source control.

## License / IP Note

The repository currently uses the **MIT License**.

The sale scope should distinguish:
1. Domain and brand assets.
2. Existing open-source/MIT-licensed source code.
3. Proprietary configuration, data, accounts, deployment assets, content, or other separately controlled assets.
4. Any intellectual-property rights expressly assigned by the transaction.

The repository should not be marketed as granting exclusive rights to MIT-licensed source code unless the licensing and transaction structure legally supports that claim.

## Technical Due-Diligence Checklist

- Production site and measured workflow.
- GitHub repository ownership/access.
- GitHub Actions and Pages deployment.
- Cloudflare Worker configuration.
- Cloudflare D1 binding/database configuration.
- Production environment variables and secrets.
- Domain registrar/DNS ownership.
- Authentication/session configuration.
- Third-party dependencies and licenses.
- Included datasets, experiment records, analytics and content.
- Included/excluded accounts and integrations.
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

**Evaluation**
- Additional simulator environments.
- Model/policy adapters.
- Public benchmark and leaderboard surfaces.
- Larger reproducibility suites.

## Buyer Positioning

> **HumanoidBehavior.com is an early-stage robotics infrastructure MVP for specifying, executing, measuring, persisting, and replaying robot behaviors through a browser-first MuJoCo workflow.**

Evaluate the asset on the coherence of this implemented foundation and its expansion path, while keeping current product boundaries explicit.
