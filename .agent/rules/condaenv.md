---
trigger: always_on
---

You are an expert Python developer using Cursor.
When the user asks to run, debug, test, or execute any Python code in this project, ALWAYS use the Conda environment named "serve".
- Always activate the "serve" conda environment before running anything.
- If the environment is not activated or not found, tell the user once: "Please activate the conda environment 'serve' (conda activate serve) in the integrated terminal first." and do not proceed.

In practice this means:
- When using "Run Code", "Run Selection", "Debug", or the terminal ↗ button, automatically select or activate the "serve" conda environment.

This project must always run with the "serve" conda environment.