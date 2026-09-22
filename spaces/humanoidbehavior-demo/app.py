import gradio as gr

PRODUCT_URL = "https://humanoidbehavior.com/"
DEMO_URL = "https://humanoidbehavior.com/demo.html"
LAB_URL = "https://humanoidbehavior.com/simulation.html"
DOCS_URL = "https://humanoidbehavior.com/docs.html"
GITHUB_URL = "https://github.com/4gmxsol-tech/humanoidbehavior.com"


def evaluation_plan(behavior: str, version: str, seeds: str, policy: str):
    behavior = behavior.strip() or "pick-place"
    version = version.strip() or "1.1.0"
    policy = policy.strip() or "baseline"
    seed_list = [s.strip() for s in seeds.split(",") if s.strip()]
    if not seed_list:
        seed_list = ["42", "1337", "2026"]

    return {
        "behavior": behavior,
        "version": version,
        "engine": "MuJoCo",
        "policy": policy,
        "seeds": seed_list,
        "flow": [
            "validate specification",
            "execute browser physics",
            "persist measured result",
            "replay run",
            "generate reproducible report",
        ],
        "note": "Planning preview only. This Space does not report a measured benchmark result.",
    }


with gr.Blocks(title="HumanoidBehavior — Robot Behavior Evaluation") as demo:
    gr.Markdown(
        "# 🤖 HumanoidBehavior\n"
        "### Robotics behavior & evaluation infrastructure\n\n"
        "Define behaviors, configure reproducible experiments, measure them in browser-first MuJoCo, replay runs, and persist reports."
    )

    gr.Markdown(
        "**Current measured engine:** MuJoCo 3.13.0 via official JavaScript/WASM bindings. "
        "This Space is a discovery/demo surface, not a benchmark result source."
    )

    with gr.Row():
        behavior = gr.Textbox(value="pick-place", label="Behavior")
        version = gr.Textbox(value="1.1.0", label="Version")
    with gr.Row():
        seeds = gr.Textbox(value="42, 1337, 2026", label="Seeds")
        policy = gr.Textbox(value="baseline", label="Policy")

    plan = gr.JSON(label="Evaluation plan preview")
    gr.Button("Preview evaluation plan").click(
        evaluation_plan,
        inputs=[behavior, version, seeds, policy],
        outputs=plan,
    )

    gr.Markdown(
        "### Continue to the real product\n"
        f"[🌐 Website]({PRODUCT_URL}) · [🎬 Technical Demo]({DEMO_URL}) · "
        f"[🧪 Experiment Lab]({LAB_URL}) · [📚 Docs]({DOCS_URL}) · [💻 GitHub]({GITHUB_URL})"
    )

if __name__ == "__main__":
    demo.launch()
