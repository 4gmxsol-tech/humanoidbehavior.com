# Authentication

Email/password signup and login use Node scrypt hashing. Bearer API keys are hashed with SHA-256 and never stored in plaintext.

Endpoints: POST /api/auth/signup, POST /api/auth/login, GET /api/me. Demo authentication is disabled when DISABLE_DEMO_AUTH=true.
