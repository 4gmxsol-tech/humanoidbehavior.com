# Security

## Production requirements

- Set `DISABLE_DEMO_AUTH=true` in production.
- Use a managed PostgreSQL instance with TLS and restricted network access.
- Store database, Stripe and worker credentials in the hosting provider's secret manager; never commit them.
- Terminate TLS at the production edge and redirect HTTP to HTTPS.
- Keep API keys hashed; raw keys are returned only at creation time.
- Configure backups and restore testing for PostgreSQL.
- Restrict simulation/robot worker network access and authenticate worker requests before connecting real hardware.
- Do not publish measured robotics claims unless the result contains explicit engine, measured and provenance fields.

## Reporting security issues

Please report vulnerabilities privately to the project owner rather than opening a public issue with exploit details.