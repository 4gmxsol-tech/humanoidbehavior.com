#!/usr/bin/env python3
"""Measured MuJoCo Menagerie robot evaluation.

This is deliberately a small, reproducible embodiment smoke benchmark:
load the published Unitree G1 scene, initialize its stand keyframe, hold
the actuator targets, and measure stability under gravity.
"""
import argparse
import json
import math
import sys
import time

import mujoco
import mujoco_menagerie as mm


def quat_tilt_rad(quat):
    # Rotate world-up by the base quaternion and measure its angle from +Z.
    w, x, y, z = [float(v) for v in quat]
    up_z = 1.0 - 2.0 * (x * x + y * y)
    up_z = max(-1.0, min(1.0, up_z))
    return math.acos(up_z)


def evaluate(robot_id="unitree_g1", seconds=2.0, seed=42, realtime=False):
    if robot_id != "unitree_g1":
        raise ValueError("The first measured embodiment benchmark is unitree_g1")

    model = mm.load(robot_id)
    data = mujoco.MjData(model)

    if model.nkey < 1:
        raise RuntimeError("Menagerie model has no keyframe")

    key_id = 0
    for i in range(model.nkey):
        name = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_KEY, i)
        if name == "stand":
            key_id = i
            break

    data.qpos[:] = model.key_qpos[key_id]
    if model.nu:
        data.ctrl[:] = model.key_ctrl[key_id]
    mujoco.mj_forward(model, data)

    dt = float(model.opt.timestep)
    steps = max(1, int(seconds / dt))
    max_tilt = 0.0
    min_height = float(data.qpos[2]) if model.nq >= 3 else 0.0
    control_cost = 0.0
    wall_start = time.perf_counter()

    for _ in range(steps):
        if model.nu:
            data.ctrl[:] = model.key_ctrl[key_id]
            control_cost += float((data.ctrl * data.ctrl).mean())
        mujoco.mj_step(model, data)
        if model.nq >= 3:
            min_height = min(min_height, float(data.qpos[2]))
        if model.nq >= 7:
            max_tilt = max(max_tilt, quat_tilt_rad(data.qpos[3:7]))
        if realtime:
            time.sleep(dt)

    simulated_seconds = float(data.time)
    fall = bool(min_height < 0.45 or max_tilt > 0.8)
    result = {
        "schemaVersion": "1.0",
        "robotId": robot_id,
        "robotModel": "MuJoCo Menagerie",
        "engine": "MuJoCo",
        "measured": True,
        "seed": str(seed),
        "task": "stand-stability",
        "simulation": True,
        "success": not fall,
        "survivalRate": 0.0 if fall else 1.0,
        "simulatedSeconds": simulated_seconds,
        "completionTime": simulated_seconds,
        "controlCost": control_cost / steps,
        "maxTiltRad": max_tilt,
        "minBaseHeight": min_height,
        "fell": fall,
        "timestep": dt,
        "modelNq": int(model.nq),
        "modelNu": int(model.nu),
        "modelNbody": int(model.nbody),
        "provenance": {
            "source": "mujoco-menagerie",
            "model": robot_id,
            "evaluation": "stand-keyframe-hold",
        },
        "wallSeconds": time.perf_counter() - wall_start,
    }
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--robot", default="unitree_g1")
    parser.add_argument("--seconds", type=float, default=2.0)
    parser.add_argument("--seed", default="42")
    args = parser.parse_args()
    try:
        print(json.dumps(evaluate(args.robot, max(0.1, min(args.seconds, 30.0)), args.seed), separators=(",", ":")))
    except Exception as exc:
        print(json.dumps({"error": str(exc), "robotId": args.robot}), file=sys.stderr)
        raise


if __name__ == "__main__":
    main()
