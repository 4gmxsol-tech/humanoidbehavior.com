# HumanoidBehavior.com

HumanoidBehavior is an engineering platform concept for designing, testing and benchmarking behaviors for humanoid robots.

## MVP

The first release is intentionally lightweight:

- Behavior Library
- Benchmark concepts and metrics
- Developer workflow
- Early-access funnel

## Roadmap

1. Behavior specifications
2. Benchmark runner
3. Simulation adapters
4. Developer API
5. Accounts and usage limits
6. Marketplace for reusable behaviors
7. Enterprise evaluation

## Local preview

Open `index.html` in a browser. The project is static HTML/CSS for the first deployment and can be hosted with GitHub Pages.

## Repository

https://github.com/4gmxsol-tech/humanoidbehavior.com


## Deployment

The included Dockerfile runs the Node API and serves the complete frontend on port 3000. Copy .env.example to .env for local configuration. The current account system is an MVP session layer; production deployments should replace it with a managed identity provider and durable database before handling real users.

## Product roadmap

### Foundation
- Behavior catalog and specifications
- Benchmark contract
- Developer workspace
- API and CI

### Robotics execution
- MuJoCo adapter
- Isaac Lab adapter
- Gazebo adapter
- Containerized benchmark workers
- Robot/model adapters

### SaaS
- Durable PostgreSQL storage
- OAuth/email authentication
- API keys
- Team workspaces
- Usage metering
- Stripe billing

### Marketplace
- Publish behavior packages
- Versioning and provenance
- Private/public visibility
- Ratings and usage analytics
- Paid behavior packages


## Production status

The repository now contains a working web application and API foundation. For a real public production launch, configure a Node-capable host, persistent PostgreSQL storage, managed authentication, HTTPS, secrets, backups, monitoring and a real payment processor. GitHub Pages alone cannot run the Node API.

The benchmark runner is a deterministic task-specification validator. It is intentionally not presented as physical-robot or simulator performance. Hardware/simulation adapters must be connected before publishing measured robotics results.

## v1 platform integrations

The repository now contains the integration foundation for:

- **PostgreSQL** via `DATABASE_URL`, with JSON fallback for local development.
- **Authentication** via email/password + scrypt and bearer sessions.
- **API keys** with hashed storage, plan limits and revocation.
- **Billing** via Stripe Checkout/webhook verification; requires real Stripe secrets/prices.
- **Robot adapters** for generic HTTP and ROS 2 command contracts.
- **Simulation adapters** for MuJoCo, Isaac Lab and Gazebo through an external worker command.
- **Model/policy benchmarking** through the benchmark request's `model` / `policy` fields and persisted run metadata.
- **Docker Compose** with PostgreSQL for an end-to-end local infrastructure environment.

### Important execution boundary

The adapter layer is designed so that the platform does not claim a robot or simulator executed a task when it did not. A real measured benchmark requires a connected simulator/robot worker. Stripe and PostgreSQL also remain configuration-dependent.
