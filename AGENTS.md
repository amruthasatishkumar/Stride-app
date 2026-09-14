# Stride application guide

This folder is the GitHub repository root for the Stride hackathon application. Keep pitch-only assets in the parent `Stride` folder and product source, tests, documentation, workflows, and release configuration here.

## MVP architecture

- Electron desktop application
- TypeScript, React, and Vite
- WorkIQ MCP launched by the Electron main process over stdio
- Local SQLite persistence
- GitHub Actions and GitHub Releases

## Product rules

- WorkIQ results are evidence candidates, not performance judgments.
- Only employee-approved evidence can enter the impact journal or Connect draft.
- Preserve source traceability for generated claims.
- Do not evaluate personality, emotion, accent, or protected characteristics.
- Do not commit credentials, tokens, internal transcripts, customer data, or employee evidence.
- Use fictional data for tests and demonstrations.

## Electron security

- Enable context isolation.
- Disable Node integration in the renderer.
- Enable the renderer sandbox.
- Expose only narrowly defined IPC operations through the preload bridge.

