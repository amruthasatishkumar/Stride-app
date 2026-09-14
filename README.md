# Stride

Stride is a private, employee-owned growth and impact companion for Microsoft employees.

The hackathon MVP is a downloadable Electron Windows application that uses Microsoft WorkIQ to retrieve factual work evidence, provides evidence-grounded coaching, requires human validation, and drafts Connect content from approved evidence only.

## Download and run

Stride is currently available as a source-based preview. A packaged Windows installer will be added to [GitHub Releases](https://github.com/amruthasatishkumar/Stride-app/releases) in a future release.

### Prerequisites

- Windows 10 or Windows 11
- [Node.js](https://nodejs.org/) current LTS release, including `npm` and `npx`
- A Microsoft work account with access to WorkIQ
- Git, only if you choose the clone option

### Option 1: Clone with Git

Open PowerShell and run:

```powershell
git clone https://github.com/amruthasatishkumar/Stride-app.git
Set-Location Stride-app
npm install
npm run dev
```

### Option 2: Download a ZIP

1. Select **Code** at the top of this repository.
2. Select **Download ZIP**.
3. Extract the downloaded ZIP file.
4. Open PowerShell in the extracted `Stride-app` folder.
5. Run:

```powershell
npm install
npm run dev
```

Keep the PowerShell window open while Stride is running. Press `Ctrl+C` in that window to stop the app.

## First use

1. Select **Connect Microsoft services** in Stride.
2. Complete the Microsoft sign-in and WorkIQ terms flow if prompted.
3. Add or import the goals you want Stride to use.
4. Select **Find recent evidence** to retrieve factual evidence candidates.
5. Review each candidate and approve only the evidence you want saved.

WorkIQ results are evidence candidates, not performance claims. Stride requires your review before evidence is added to the local journal or used for Connect content.

## Privacy

- Stride stores its application state locally on your device.
- Only employee-approved evidence is saved.
- Do not add authentication tokens, confidential transcripts, customer data, or employee evidence to GitHub issues.
- See [SECURITY.md](SECURITY.md) for responsible reporting guidance.

## Troubleshooting

**`npm` or `npx` is not recognized**

Install the current Node.js LTS release, close PowerShell, open a new PowerShell window, and try again.

**WorkIQ requests setup or sign-in**

Complete the WorkIQ terms and Microsoft work-account sign-in flow, then select **Connect Microsoft services** again.

**WorkIQ is unavailable**

Confirm that your Microsoft work account and tenant have access to WorkIQ. Stride cannot bypass account or tenant availability restrictions.

## MVP

- One Microsoft fiscal-year priority
- One Consultative Mindset growth goal
- WorkIQ evidence retrieval
- Evidence-grounded coaching
- Approve, edit, reject, or clarify evidence
- Local impact journal
- Traceable Connect draft
- Local SQLite persistence

## Architecture

```text
Electron renderer
React interface
      |
      | Secure IPC
      v
Electron main process
      |
      +-- WorkIQ MCP child process
      +-- Coaching rubric engine
      +-- Evidence validation
      +-- Connect drafting
      +-- SQLite repositories
```

## Status

The first implementation milestone is complete:

- Secure Electron main, preload, and renderer boundary
- WorkIQ MCP process initialization
- WorkIQ tool discovery
- Actionable readiness states
- Mock WorkIQ path for automated testing

## Development

```powershell
npm install
npm run dev
```

## Verification

```powershell
npm run typecheck
npm test
npm run build
npm run verify:app
npm run verify:workiq
```

`verify:app` launches the compiled Electron application with a mock WorkIQ adapter. `verify:workiq` performs a real MCP handshake and lists the tools available from WorkIQ.
