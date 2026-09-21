# HumanoidBehavior.com

HumanoidBehavior is a robotics behavior evaluation platform for defining reusable humanoid-robot tasks, running reproducible experiments, and keeping measured simulation results attached to the exact behavior/version configuration.

## Current product

The current public MVP provides:

- Versioned public behavior specifications
- Authenticated workspaces
- Persistent experiments and job status
- Multi-seed evaluation configuration
- Measured MuJoCo execution through a dedicated local compute worker
- Cloudflare D1 persistence for accounts, experiments, jobs and artifacts
- Experiment reports with raw JSON/CSV export
- API-key and usage foundations
- A public behavior registry and developer documentation

The supported measured execution path today is **MuJoCo**. Deterministic/specification validation is kept separate from physics-based measurement.

## Architecture

```
HumanoidBehavior.com
       |
       v
GitHub Pages frontend
       |
       v
Cloudflare Worker API
       |
       v
Cloudflare D1
       |
       v
experiments / jobs / artifacts
       |
       v
Local MuJoCo compute worker
       |
       v
MuJoCo task runner
       |
       v
D1 result persistence
```

The compute worker is intentionally separate from the Cloudflare Worker. Long-running MuJoCo simulation is not executed inside the request/response API.

## Free deployment model

The current MVP uses:

- GitHub Pages for the static frontend
- Cloudflare Workers for the API
- Cloudflare D1 for durable application data
- A local machine for on-demand MuJoCo compute

No paid cloud database or always-on compute server is required for the current MVP architecture.

The API only queues the evaluation in D1. A local worker polls that queue and runs MuJoCo directly, so no GitHub token is required. The worker can be started only when compute is needed.

## Evaluation model

A typical evaluation flow is:

1. Select a published behavior.
2. Choose a version, engine, seeds and policy.
3. Create a durable experiment.
4. The experiment is stored as a queued job.
5. The local compute worker polls D1, claims the queued job, and starts the MuJoCo task.
6. The worker claims the job and executes the requested seeds/policies.
7. Results and an experiment artifact are persisted to D1.
8. The dashboard/report displays the measured output.

A successful validation check is not presented as a physics success. Measured metrics are only shown for actual simulator execution.

## Current limitations

The following are deliberately not presented as enabled production capabilities:

- Physical-robot execution
- Robot-specific hardware adapters
- Live Stripe checkout
- Behavior-version comparison worker
- Unverified human handover evaluation
- Browser-side fake benchmark execution

The public registry uses **Not measured** for specifications that do not have a verified measured baseline. This prevents illustrative numbers from being mistaken for benchmark evidence.

## Repository structure

- `index.html` — public product landing page
- `behaviors.html` / `behavior.html` — public behavior registry and specifications
- `simulation.html` — experiment launcher
- `experiment.html` — persistent experiment report
- `dashboard.html` — authenticated workspace
- `docs.html` — developer/API documentation
- `pricing.html` — current plan positioning
- `cloudflare-worker.js` — Worker API and D1 integration
- `wrangler.jsonc` — Cloudflare Worker/D1 configuration
- `simulation/` — MuJoCo worker and task execution code
- `simulation/local_worker.py` — no-token local MuJoCo queue worker
- `.github/workflows/mujoco-worker.yml` — optional GitHub Actions compute workflow

## Development

The frontend is static and can be previewed locally. The production frontend is served from GitHub Pages and routes `/api/*` requests to the Cloudflare Worker origin.

The current Worker uses PBKDF2 password hashing, hashed bearer sessions/API keys, CORS restricted to the production origin, and D1-backed authorization.

## Positioning

HumanoidBehavior is best understood today as an **early-stage robotics infrastructure asset / MVP**, not as a claim of completed physical-robot benchmarking coverage.

Its core value is the integrated behavior-specification → durable experiment → simulator worker → reproducible report workflow, with a clean path toward additional simulator and robot adapters.

## License

See repository files for the current project/license terms.

## Local compute worker

No GitHub token is required.

Set these environment variables on the machine that will run MuJoCo:

- `CLOUDFLARE_ACCOUNT_ID`
- `D1_DATABASE_ID`
- `CLOUDFLARE_API_TOKEN` — a Cloudflare API token with D1 read/write access

Then run:

```bash
cd simulation
python local_worker.py
```

The worker polls the D1 queue, claims jobs atomically, executes the MuJoCo task runner, and writes progress/results back to D1. Keep the Cloudflare token local and never commit it to the repository.
