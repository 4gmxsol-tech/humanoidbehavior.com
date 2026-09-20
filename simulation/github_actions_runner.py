#!/usr/bin/env python3
"""Free GitHub Actions compute runner for HumanoidBehavior D1 jobs.

This runner is intentionally external to Cloudflare Workers: MuJoCo/Python
needs normal CPU/runtime facilities that a 10ms Workers request cannot provide.
It claims one queued D1 job, executes it, and writes progress/results back to D1.
"""
import json, os, subprocess, sys, urllib.request, urllib.error
from statistics import mean, median, stdev

ACCOUNT_ID = os.environ["CLOUDFLARE_ACCOUNT_ID"]
DATABASE_ID = os.environ["D1_DATABASE_ID"]
TOKEN = os.environ["CLOUDFLARE_API_TOKEN"]
API = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database/{DATABASE_ID}/query"

def d1(sql, params=None):
    body = {"sql": sql}
    if params is not None:
        body["params"] = params
    req = urllib.request.Request(
        API,
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"D1 HTTP {e.code}: {e.read().decode()[:1000]}")
    if not data.get("success"):
        raise RuntimeError("D1 query failed: " + json.dumps(data)[:2000])
    result = data.get("result") or []
    if not result:
        return []
    return result[0].get("results") or []

def update_progress(job_id, exp, completed, total):
    pct = round(completed / total * 100) if total else 0
    d1("UPDATE jobs SET progress_json=? WHERE id=?", [json.dumps({"completed": completed, "total": total, "percentage": pct}), job_id])
    exp["status"] = "running"
    exp["result"]["status"] = "running"
    exp["result"]["runCount"] = completed
    exp["result"]["expectedRunCount"] = total
    exp["result"]["validation"] = {"passed": False, "message": f"Evaluation running: {completed}/{total} runs completed."}
    save_experiment(exp)

def save_experiment(exp):
    d1(
        "UPDATE experiments SET status=?, engine=?, behavior_id=?, behavior_version=?, result_json=? WHERE id=?",
        [exp["status"], exp.get("engine", "MuJoCo"), exp.get("behaviorId"), exp.get("behaviorVersion"), json.dumps(exp, separators=(",", ":")), exp["id"]],
    )

def run_task(payload):
    behavior = str(payload.get("behaviorId") or "pick-place")
    version = str(payload.get("behaviorVersion") or "1.0.0")
    seconds = float(payload.get("seconds") or 5)
    seeds = [str(x) for x in (payload.get("seeds") or ["42"])]
    policies = [str(x) for x in (payload.get("policies") or ["policy-a"])]
    if len(seeds) > 20:
        raise RuntimeError("Maximum 20 seeds")
    if len(policies) > 8:
        raise RuntimeError("Maximum 8 policies")
    if behavior not in {"pick-place", "open-door", "follow-person", "handover"}:
        raise RuntimeError("Unsupported behavior task: " + behavior)
    if str(payload.get("engine") or "MuJoCo") != "MuJoCo":
        raise RuntimeError("This compute runner currently executes MuJoCo jobs only")

    rows = []
    total = len(seeds) * len(policies)
    return rows, behavior, version, seconds, seeds, policies, total

def execute_job(job):
    payload = json.loads(job["payload_json"] or "{}")
    rows, behavior, version, seconds, seeds, policies, total = run_task(payload)
    exp_row = d1("SELECT result_json FROM experiments WHERE id=? AND user_id=?", [job["experiment_id"], job["user_id"]])
    if not exp_row:
        raise RuntimeError("Experiment not found")
    exp = json.loads(exp_row[0]["result_json"])
    exp["status"] = "running"
    exp["engine"] = "MuJoCo"
    exp["result"]["status"] = "running"

    for seed in seeds:
        for policy_name in policies:
            policy = "A" if "a" in policy_name.lower() else "B"
            request_payload = {
                "behaviorId": behavior,
                "behaviorVersion": version,
                "seed": seed,
                "policy": policy,
                "seconds": seconds,
            }
            proc = subprocess.run(
                [sys.executable, "simulation/behavior_task_worker.py"],
                input=json.dumps(request_payload),
                text=True,
                capture_output=True,
                timeout=max(30, int(seconds * 8)),
                check=False,
            )
            if proc.returncode != 0:
                raise RuntimeError(proc.stderr.strip() or "MuJoCo task worker failed")
            line = proc.stdout.strip().splitlines()[-1] if proc.stdout.strip() else ""
            row = json.loads(line)
            row["seed"] = seed
            row["policy"] = policy_name
            row["behaviorVersion"] = version
            rows.append(row)
            update_progress(job["id"], exp, len(rows), total)

    def metric(key):
        vals = [float(r.get("metrics", {}).get(key, 0) or 0) for r in rows]
        return {
            "mean": mean(vals) if vals else 0,
            "median": median(vals) if vals else 0,
            "stddev": stdev(vals) if len(vals) > 1 else 0,
        }

    exp["status"] = "completed"
    exp["result"].update({
        "status": "completed",
        "behaviorId": behavior,
        "behaviorVersion": version,
        "engine": "MuJoCo",
        "measured": True,
        "reproducible": True,
        "runCount": len(rows),
        "expectedRunCount": total,
        "rawResults": rows,
        "summary": {
            "taskSuccessRate": sum(bool(r.get("metrics", {}).get("taskSuccess")) for r in rows) / max(1, len(rows)),
            "completionTime": metric("completionTime"),
            "survivalRate": metric("survivalRate"),
            "controlCost": metric("controlCost"),
            "maxTiltRad": metric("maxTiltRad"),
        },
        "validation": {"passed": len(rows) == total, "message": "Every requested seed/policy was evaluated by the MuJoCo compute worker."},
        "provenance": {"worker": "github-actions-mujoco", "execution": "free-standard-runner"},
        "completedAt": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
    })
    save_experiment(exp)
    d1(
        "UPDATE jobs SET status=?, result_json=?, progress_json=?, finished_at=datetime('now') WHERE id=?",
        ["completed", json.dumps(exp["result"], separators=(",", ":")), json.dumps({"completed": len(rows), "total": total, "percentage": 100}), job["id"]],
    )
    d1(
        "INSERT INTO artifacts(id,experiment_id,user_id,name,content_type,storage,payload_json) VALUES(?,?,?,?,?,?,?)",
        [__import__("uuid").uuid4().hex, job["experiment_id"], job["user_id"], "experiment.json", "application/json", "database", json.dumps(exp["result"], separators=(",", ":"))],
    )

def fail_job(job, message):
    exp_row = d1("SELECT result_json FROM experiments WHERE id=? AND user_id=?", [job["experiment_id"], job["user_id"]])
    if exp_row:
        exp = json.loads(exp_row[0]["result_json"])
        exp["status"] = "failed"
        exp["result"]["status"] = "failed"
        exp["result"]["validation"] = {"passed": False, "message": message}
        save_experiment(exp)
    d1("UPDATE jobs SET status=?, error=?, finished_at=datetime('now') WHERE id=?", ["failed", message[:2000], job["id"]])

def main():
    jobs = d1("SELECT id,experiment_id,user_id,type,status,attempts,payload_json FROM jobs WHERE status='queued' ORDER BY created_at LIMIT 1")
    if not jobs:
        print("No queued jobs.")
        return
    job = jobs[0]
    claimed = d1(
        "UPDATE jobs SET status='running', started_at=datetime('now'), attempts=COALESCE(attempts,0)+1 WHERE id=? AND status='queued'",
        [job["id"]],
    )
    if not claimed:
        print("Job was claimed by another runner.")
        return
    job["status"] = "running"
    try:
        if job["type"] != "experiment-run":
            raise RuntimeError("Unsupported job type for GitHub Actions runner: " + str(job["type"]))
        execute_job(job)
        print("Completed job", job["id"])
    except Exception as exc:
        print("Job failed:", exc, file=sys.stderr)
        fail_job(job, str(exc))
        raise

if __name__ == "__main__":
    main()
