# Architecture

Stride is a local-first Electron application with no Stride-owned cloud backend.

The Electron main process owns WorkIQ MCP communication, SQLite access, coaching orchestration, evidence validation, and Connect drafting. The React renderer communicates with the main process through a narrow preload API.

WorkIQ remains a Microsoft-hosted service. Stride-specific priorities, approvals, coaching results, and drafts are persisted locally.

