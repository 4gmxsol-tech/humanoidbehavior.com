# Production Transfer Checklist — HumanoidBehavior.com

Use this checklist for a buyer handoff or production ownership transfer.

## 1. Domain & DNS
- [ ] Confirm registrar ownership of HumanoidBehavior.com.
- [ ] Export/record current DNS records.
- [ ] Confirm GitHub Pages custom-domain configuration.
- [ ] Transfer registrar and DNS access through the agreed secure process.

## 2. GitHub
- [ ] Transfer repository ownership or organization access.
- [ ] Review collaborators, deploy keys, GitHub Apps and Actions secrets.
- [ ] Review Pages deployment settings and custom domain.
- [ ] Confirm the buyer can clone, build and deploy the repository.
- [ ] Rotate tokens and credentials after transfer.

## 3. Cloudflare
- [ ] Transfer or recreate the Worker deployment.
- [ ] Confirm Worker routes/origins and production CORS configuration.
- [ ] Confirm D1 database and bindings.
- [ ] Confirm production environment variables and secrets without placing plaintext values in Git.
- [ ] Rotate API/session secrets after transfer.
- [ ] Verify health/readiness endpoints after ownership changes.

## 4. Application
- [ ] Create a new test account.
- [ ] Sign in and verify session authentication.
- [ ] Create/revoke an API key.
- [ ] Launch a measured MuJoCo experiment.
- [ ] Confirm persistence in the dashboard.
- [ ] Open report/replay and export raw JSON/CSV.
- [ ] Create and inspect a public share report.
- [ ] Verify unauthorized users cannot access private workspace data.
- [ ] Verify invalid/expired credentials are rejected.

## 5. Browser/device QA
- [ ] Test current Chrome/Chromium desktop.
- [ ] Test Safari/iOS where available.
- [ ] Test Android Chrome.
- [ ] Test a slow/mobile network.
- [ ] Verify timeout and failure states are understandable.
- [ ] Verify the measured result clearly identifies engine/build/provenance.

## 6. Commercial readiness (without Stripe)
- [ ] Keep pricing clearly labeled as planned/current product definitions, not live recurring revenue.
- [ ] Keep paid checkout disabled until a payment provider is configured.
- [ ] Confirm free-plan limits are enforced by the API.
- [ ] Confirm usage counters reflect persisted benchmark activity.
- [ ] Confirm dashboard plan/usage information matches API responses.
- [ ] Record the exact commercial scope included in the transaction.

## 7. Legal & disclosure
- [ ] Review Privacy and Terms with counsel for the operating entity/jurisdiction.
- [ ] Confirm open-source license inventory.
- [ ] Document included/excluded domains, code, data, content and accounts.
- [ ] Document public-report data handling and deletion expectations.
- [ ] Do not represent MIT-licensed source as exclusive IP without an appropriate legal structure.

## 8. Final buyer verification
- [ ] Buyer completes the end-to-end demo independently.
- [ ] Buyer confirms repository, Pages, Worker, D1 and domain access.
- [ ] Buyer confirms credentials were rotated.
- [ ] Seller removes access only after the agreed handoff is complete.
