import json, math, os, statistics, sys
from compare_mujoco import run

POLICIES = [
    {"name": "policy-a-stabilizer", "kp": 38.0, "kd": 8.0},
    {"name": "policy-b-stabilizer", "kp": 24.0, "kd": 5.0},
]

def parse_seeds(value):
    if isinstance(value, list):
        return [str(x).strip() for x in value if str(x).strip()]
    return [x.strip() for x in str(value).split(",") if x.strip()]

def mean(values):
    return sum(values) / len(values) if values else 0.0

def stddev(values):
    return statistics.stdev(values) if len(values) > 1 else 0.0

def median(values):
    return statistics.median(values) if values else 0.0

def ci95(values):
    n = len(values)
    if n < 2:
        return {"low": mean(values), "high": mean(values)}
    t95 = {2: 12.706, 3: 4.303, 4: 3.182, 5: 2.776, 6: 2.571,
           7: 2.447, 8: 2.365, 9: 2.306, 10: 2.262, 11: 2.228,
           12: 2.201, 13: 2.179, 14: 2.160, 15: 2.145, 16: 2.131,
           17: 2.120, 18: 2.110, 19: 2.101, 20: 2.093, 21: 2.086,
           22: 2.080, 23: 2.074, 24: 2.069, 25: 2.064, 26: 2.060,
           27: 2.056, 28: 2.052, 29: 2.048, 30: 2.045}
    critical = t95.get(n, 1.96)
    margin = critical * stddev(values) / math.sqrt(n)
    m = mean(values)
    return {"low": max(0.0, m - margin), "high": m + margin}

def summarize(rows, seconds):
    metrics = [
        ("survivalRate", "survival_rate"),
        ("simulatedSeconds", "simulated_seconds"),
        ("minTorsoHeightM", "min_torso_height_m"),
        ("maxTiltRad", "max_tilt_rad"),
        ("controlCost", "control_cost"),
    ]
    out = {"runs": len(rows), "fallRate": mean([1.0 if r["metrics"]["fell"] else 0.0 for r in rows])}
    for source, name in metrics:
        values = [float(r["metrics"][source]) for r in rows]
        out[name] = {
            "mean": round(mean(values), 6),
            "median": round(median(values), 6),
            "stddev": round(stddev(values), 6),
            "min": round(min(values), 6),
            "max": round(max(values), 6),
            "ci95": {k: round(v, 6) for k, v in ci95(values).items()},
        }
    out["targetSeconds"] = seconds
    return out

def build_experiment(seeds, seconds, provenance=None):
    results = []
    for seed in seeds:
        for policy in POLICIES:
            row = run(policy, seed, seconds)
            row["benchmark"] = "humanoid-stand-v1"
            row["environment"] = "hb-humanoid-v1"
            results.append(row)

    expected_runs = len(seeds) * len(POLICIES)
    if len(results) != expected_runs:
        raise RuntimeError(
            f"Experiment integrity check failed: expected {expected_runs} runs, got {len(results)}"
        )

    expected_pairs = {(str(seed), policy["name"]) for seed in seeds for policy in POLICIES}
    actual_pairs = {(str(row["seed"]), row["policy"]) for row in results}
    if actual_pairs != expected_pairs:
        missing = sorted(expected_pairs - actual_pairs)
        unexpected = sorted(actual_pairs - expected_pairs)
        raise RuntimeError(
            f"Experiment integrity check failed: missing={missing}, unexpected={unexpected}"
        )

    summaries = {}
    for policy in POLICIES:
        name = policy["name"]
        summaries[name] = summarize(
            [r for r in results if r["policy"] == name], seconds
        )

    a = summaries[POLICIES[0]["name"]]
    b = summaries[POLICIES[1]["name"]]
    delta = {
        "survivalRateMean": round(b["survival_rate"]["mean"] - a["survival_rate"]["mean"], 6),
        "simulatedSecondsMean": round(b["simulated_seconds"]["mean"] - a["simulated_seconds"]["mean"], 6),
        "controlCostMean": round(b["control_cost"]["mean"] - a["control_cost"]["mean"], 6),
        "maxTiltMean": round(b["max_tilt_rad"]["mean"] - a["max_tilt_rad"]["mean"], 6),
    }

    return {
        "schemaVersion": "1.0",
        "benchmark": "humanoid-stand-v1",
        "environment": "hb-humanoid-v1",
        "engine": "MuJoCo",
        "measured": True,
        "simulation": True,
        "targetSeconds": seconds,
        "runCount": len(results),
        "expectedRunCount": len(seeds) * len(POLICIES),
        "validation": {
            "passed": True,
            "message": "Every requested seed was evaluated against every policy."
        },
        "provenance": provenance or {},
        "seeds": seeds,
        "policies": [p["name"] for p in POLICIES],
        "rawResults": results,
        "summary": summaries,
        "policyBMinusPolicyA": delta,
    }

def markdown(report):
    lines = [
        "# HumanoidBehavior MuJoCo Experiment",
        "",
        f"- Benchmark: {report['benchmark']}",
        f"- Engine: **{report['engine']}**",
        f"- Seeds: {', '.join(report['seeds'])}",
        f"- Target duration: **{report['targetSeconds']}s**",
        "",
        "| Policy | Mean survival | Mean simulated s | Fall rate | Mean control cost |",
        "|---|---:|---:|---:|---:|",
    ]
    for p in report["policies"]:
        s = report["summary"][p]
        lines.append(
            f"| {p} | {s['survival_rate']['mean']:.4f} | "
            f"{s['simulated_seconds']['mean']:.4f} | "
            f"{s['fallRate']:.2%} | {s['control_cost']['mean']:.5f} |"
        )
    lines += [
        "",
        "## Notes",
        "",
        "Results are measured from MuJoCo runs with the same benchmark/environment contract.",
        "The summary reports descriptive statistics only; it does not claim physical-robot performance.",
        "",
    ]
    return "\\n".join(lines)

def main():
    job = json.load(sys.stdin)
    seeds = parse_seeds(job.get("seeds", "42,1337,2026,7,99"))
    seconds = float(job.get("seconds", 5))
    if not seeds:
        raise ValueError("At least one seed is required")
    if seconds <= 0:
        raise ValueError("seconds must be greater than zero")
    provenance = {
        key: value for key, value in {
            "gitSha": os.environ.get("GITHUB_SHA"),
            "workflow": os.environ.get("GITHUB_WORKFLOW"),
            "runId": os.environ.get("GITHUB_RUN_ID"),
            "runNumber": os.environ.get("GITHUB_RUN_NUMBER"),
        }.items() if value
    }
    report = build_experiment(seeds, seconds, provenance)
    print(json.dumps(report))
    with open("mujoco-experiment.md", "w", encoding="utf-8") as f:
        f.write(markdown(report))

if __name__ == "__main__":
    main()
