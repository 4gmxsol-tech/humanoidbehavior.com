# Buyer Handoff — HumanoidBehavior.com

## 1. Executive Summary

HumanoidBehavior.com is an early-stage robotics infrastructure MVP focused on turning robot behavior specifications into reproducible simulator experiments and durable experiment artifacts.

Core flow:

**Behavior → Version → Experiment → Seed/Policy → MuJoCo → Measured Result → Persisted Artifact → Report/Replay**

The current measured execution path is browser-first MuJoCo using official JavaScript/WASM bindings. The product is designed to run the core measured path in the visitor's browser, with Cloudflare Worker + D1 providing the application/API and persistence layer.

This repository should be presented as an **early-stage robotics infrastructure asset / MVP**, not as a finished physical-robot benchmarking platform.

## 2. Current Production Path

**Frontend**
- GitHub Pages hosts the web application.
- Responsive UI covers landing, authentication, dashboard, behaviors, behavior detail, builder, simulation, experiments, compare, benchmark, docs, and pricing.

**Application/API**
- Cloudflare Worker provides the application/API layer.
- Cloudflare D1 provides durable persistence.
- Authentication uses password hashing, hashed sessions/API keys, session expiry, rate limiting, and production-origin CORS restrictions.

**Measured Compute**
- Browser compute uses MuJoCo JavaScript/WASM bindings.
- The browser worker isolates compute from the UI.
- Evaluation results are persisted as experiment records and exposed through the dashboard/replay/report flows.

**Optional development paths**
- Local/legacy worker and other development infrastructure remain in the repository for development and future use.
- The buyer should treat the documented browser + Cloudflare path as the canonical current production path unless a later handoff explicitly changes that decision.

## 3. What Is Working Today

- Responsive robotics SaaS UI.
- Authentication and account/session foundation.
- Behavior registry and behavior detail pages.
- Behavior builder.
- Experiment Lab.
- Benchmark launcher.
- Persistent experiment records.
- Browser-based measured MuJoCo execution.
- Experiment replay.
- Dashboard/workspace views.
- API documentation.
- API-key foundation.
- Cloudflare Worker + D1 persistence architecture.
- Production deployment through GitHub Pages.
- Automated CI and Pages deployment.

## 4. Deliberate Product Boundaries

The following should **not** be represented as completed production capabilities:

- Physical robot execution is not enabled.
- Robot-specific hardware adapters are not enabled.
- Current measured execution should be described as MuJoCo/reference-model execution.
- Live Stripe checkout is not enabled.
- Behavior-version comparison execution is not enabled; the UI currently identifies this as coming soon.
- Browser-side fake benchmark execution is not used as a substitute for measured execution.
- The product does not currently claim broad physical-robot benchmarking coverage.

## 5. Commercial Status

The pricing UI currently defines:

| Plan | Price | Included capacity |
|---|---:|---|
| Free | $0 | 25 benchmark runs/month; 5 private behaviors |
| Pro | $49/month | 500 runs; unlimited private behaviors; API; reports |
| Team | $299/month | 5,000 runs; team workspaces; shared datasets; priority support |

**Important:** paid checkout is not live. These are product/pricing definitions, not evidence of current recurring revenue.

## 6. Repository / IP Notes

The repository currently uses the **MIT License**.

A buyer handoff must distinguish between:
1. Domain/brand assets.
2. Repository source code and its existing license.
3. Proprietary configuration, deployment accounts, datasets, credentials, and other assets, if any.
4. Any separately assigned intellectual-property rights expressly included in a transaction.

Do not describe an acquisition as granting exclusive rights to MIT-licensed source code unless the licensing structure is changed or the transaction is otherwise legally structured to achieve that result.

Before a transaction, the seller and buyer should document exactly which domains, repositories, accounts, data, credentials, trademarks, content, and other assets are transferred. Obtain appropriate legal advice for any exclusivity/IP assignment language.

## 7. Buyer Verification Checklist

A prospective buyer should verify:

### Product
- Open the production site.
- Create/login to an account.
- Select a behavior.
- Launch an evaluation.
- Confirm measured execution completes.
- Inspect the resulting experiment record.
- Open replay/report views.
- Test the responsive UI on desktop and mobile.

### Infrastructure
- Verify GitHub repository access and deployment workflow.
- Verify Cloudflare Worker configuration.
- Verify D1 database configuration.
- Confirm production environment variables/secrets are transferred separately and securely.
- Confirm domain DNS and GitHub Pages configuration.

### Security
- Rotate all production credentials after transfer.
- Rotate API/session secrets where applicable.
- Review Cloudflare bindings and access permissions.
- Review GitHub collaborators/tokens/actions.
- Review any third-party integrations before ownership transfer.

### Legal / Asset Scope
- Confirm domain ownership/registrar transfer.
- Confirm repository and organization ownership.
- Confirm license treatment.
- Confirm any third-party/open-source dependencies and their licenses.
- Confirm whether datasets, experiment records, analytics, branding, content, and documentation are included.
- Record all excluded assets explicitly.

## 8. Recommended Demo Path

The shortest buyer-facing product demonstration is:

1. Open HumanoidBehavior.com.
2. Choose **Pick & Place**.
3. Run an evaluation.
4. Show measured MuJoCo execution.
5. Show the measured result and seed/policy metadata.
6. Open replay.
7. Show the persisted experiment in the dashboard.
8. Open API/docs to demonstrate the intended infrastructure direction.

The demo should emphasize **measured, reproducible execution**, not feature count.

## 9. Current Known Limitations

- Physical-robot control/adapters are not enabled.
- Paid billing/checkout is not live.
- Version-comparison execution is not live.
- The codebase contains legacy/optional infrastructure that should be reviewed during a buyer technical due-diligence pass.
- Current simulator execution is centered on MuJoCo/reference-model behavior rather than a production hardware fleet.
- The repository is an MVP and should not be represented as a mature enterprise-scale robotics platform.

## 10. Suggested Acquisition Handoff Package

A clean transaction package should contain:

- Domain transfer details.
- GitHub repository/organization transfer details.
- Cloudflare account/Worker/D1 transfer or migration plan.
- Production environment configuration, excluding plaintext secrets from source control.
- Architecture overview.
- Deployment/runbook.
- Known limitations and roadmap.
- Open-source/license inventory.
- Third-party service inventory.
- Current pricing/product specification.
- Demo instructions.
- List of included and excluded assets.
- Credential rotation checklist.

## 11. Roadmap After Acquisition

Recommended sequence:

**Phase 1 — Hardening**
- Complete browser/device QA.
- Remove or clearly isolate obsolete infrastructure.
- Formalize production runbook.
- Improve observability and failure reporting.

**Phase 2 — Commercialization**
- Activate billing and entitlement enforcement.
- Add production usage metering.
- Formalize team/workspace administration.
- Add operational support tooling.

**Phase 3 — Robotics Expansion**
- Add validated robot-specific adapters.
- Add hardware-in-the-loop execution where appropriate.
- Expand behavior/version comparison.
- Expand benchmark suites and reproducibility metadata.

**Phase 4 — Teleoperation**
- Add pointer/touch-based live teleoperation where technically appropriate.
- Record trajectories.
- Replay and evaluate recorded behavior.
- Integrate true physics control only where the underlying MuJoCo/controller APIs are validated.

## 12. Buyer Positioning

The strongest concise description is:

> **HumanoidBehavior.com is an early-stage robotics infrastructure MVP for specifying, executing, measuring, persisting, and replaying robot behaviors through a browser-first MuJoCo workflow.**

Avoid claiming:
- production physical-robot fleet support,
- live recurring billing,
- completed enterprise scale,
- or capabilities marked as coming soon/disabled in the product.

The value proposition is the coherent foundation and implementation path, not an inflated feature list.
