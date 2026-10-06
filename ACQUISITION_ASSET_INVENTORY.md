# HumanoidBehavior.com — Acquisition Asset Inventory

## Included core assets
| Asset | Status | Notes |
|---|---|---|
| HumanoidBehavior.com | Core | Category-specific .com domain |
| HumanoidBehavior brand | Core | Product identity and UI system |
| Frontend application | Core | Static web application |
| Behavior Registry | Core | Public versioned behavior specifications |
| Behavior Builder | Core | Private draft behavior workflow |
| Experiment Lab | Core | Evaluation configuration and execution workflow |
| Browser MuJoCo compute | Core | Measured browser-side execution path |
| Experiment persistence | Core | Cloudflare D1-backed records |
| Cloudflare Worker API | Core | Authentication, API and persistence boundary |
| API-key foundation | Core | Developer integration path |
| Documentation | Core | Public developer/API documentation |
| Replay/report workflow | Core | Inspectable experiment evidence |
| Public experiment sharing | Core | Shareable completed experiment reports |
| Buyer handoff documentation | Core | Transfer and diligence materials |

## Infrastructure / deployment
- GitHub repository: 4gmxsol-tech/humanoidbehavior.com
- Frontend: GitHub Pages
- API: Cloudflare Workers
- Database: Cloudflare D1
- Browser simulation: MuJoCo JavaScript/WebAssembly
- Worker configuration: wrangler.jsonc

Production credentials, tokens, Cloudflare account access and other secrets must be transferred separately and securely; plaintext secrets should not be included in source control.

## Not represented as included unless expressly agreed
- Registrar account itself
- GitHub organization/account ownership beyond the repository transfer agreed in the transaction
- Cloudflare account ownership beyond the agreed migration/transfer
- Third-party service accounts
- Private credentials or secrets
- Any unrelated repositories or domains
- Any customer contracts or revenue claims not separately documented

## Product boundaries
The following are roadmap / not currently enabled as production capabilities:
- Physical-robot execution
- Robot-specific hardware adapters
- Live Stripe checkout
- Enterprise organization/team administration
- Broad multi-simulator coverage

## License note
The repository currently uses the MIT License. The final asset schedule and purchase agreement should specify how source code, domain, brand assets, data, deployment infrastructure and any separately assigned rights are treated.

## Buyer verification artifacts
- README.md
- BUYER_HANDOFF.md
- TRANSFER_CHECKLIST.md
- LICENSE

The buyer should independently verify the live production workflow and infrastructure during technical diligence.