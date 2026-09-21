#!/usr/bin/env python3
"""Local MuJoCo compute worker for HumanoidBehavior.

This is the no-GitHub-token path: the local machine polls the D1-backed
job queue and reuses the same verified MuJoCo job runner used by CI.
Keep Cloudflare credentials in environment variables; never commit them.
"""

import os
import time

required = ("CLOUDFLARE_ACCOUNT_ID", "D1_DATABASE_ID", "CLOUDFLARE_API_TOKEN")
missing = [name for name in required if not os.environ.get(name)]
if missing:
    raise SystemExit(
        "Missing environment variables: "
        + ", ".join(missing)
        + ". Set them locally before starting the worker."
    )

from github_actions_runner import main as process_queue

POLL_SECONDS = max(3, int(os.environ.get("HB_POLL_SECONDS", "10")))

print("HumanoidBehavior local MuJoCo worker started.")
print("Polling D1 every", POLL_SECONDS, "seconds. Press Ctrl+C to stop.")

while True:
    try:
        process_queue()
    except KeyboardInterrupt:
        print("\nLocal worker stopped.")
        raise
    except Exception as exc:
        print("Worker cycle failed:", exc)
        print("Retrying after", POLL_SECONDS, "seconds.")
    time.sleep(POLL_SECONDS)
