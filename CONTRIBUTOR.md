# Contributing to Rook

Rook is an open-source developer progression platform built around a CLI, an Express + Socket.io backend, PostgreSQL, and a Mintlify documentation site. Good contributions improve real product behavior, documentation accuracy, and operational clarity.

If you are planning a larger change, open an issue first or contact the maintainers before investing significant implementation time. Small fixes, typo corrections, and focused quality-of-life improvements can be opened directly as pull requests.

## What to Contribute

High-value contributions include:

- CLI polish and command usability
- backend correctness, route hardening, and permission enforcement
- test coverage for commands, routes, and webhook behavior
- gameplay system tuning such as quests, XP, loot, and leaderboard logic
- deployment guides, docs fixes, and API reference improvements
- production-readiness improvements across observability, security, and ops

## Development Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/TypeTenzinHoTT/rook.git
cd rook
npm install
cd backend && npm install && cd ..
```

Start the backend:

```bash
cd backend
npm install
npm start
```

Build the CLI from the repo root:

```bash
npm run build
```

If you are working on the docs, install the Mintlify CLI and run checks from `docs/`:

```bash
mint validate
mint broken-links
mint openapi-check api-reference/openapi.json
```

## Contribution Standards

Before opening a pull request:

1. Keep the change scoped. Avoid mixing unrelated fixes into one PR.
2. Update documentation when command behavior, routes, environment variables, deployment steps, or architecture assumptions change.
3. Prefer documenting current behavior over aspirational behavior.
4. Include or update tests when the change affects logic that can regress.
5. Call out any intentional follow-up work or known limitations in the PR description.

## Pull Request Expectations

Each PR should include:

1. A clear summary of the user-facing or operator-facing change.
2. Notes on any backend, schema, auth, or webhook impact.
3. Docs updates when the CLI, API, deployment model, or environment setup changes.
4. Verification notes listing the commands or manual checks you ran.

Examples of useful verification:

```bash
npm run build
cd backend && npm test
cd docs && mint validate
```

If a relevant check could not be run, say so explicitly in the PR.

## Documentation Guidelines

When writing docs for Rook:

- use direct, runnable instructions
- prefer short command examples over long narrative blocks
- keep CLI examples copy-pasteable
- flag mismatches between implementation and docs instead of smoothing over them
- avoid overstating features that are incomplete or only partially implemented

## Code Review and Merging

Pull requests should be reviewed before merge. For non-trivial changes, prefer at least one technical review from a maintainer or repository owner. Do not merge breaking or behavior-changing work without review from someone familiar with the affected area.

Maintainers may ask contributors to split oversized PRs, add missing verification, or update inaccurate docs before merge.

## Reporting Security Issues

Do not open public issues for suspected security vulnerabilities. Report them privately to `tarun@octave-x.com` with reproduction details, impact, and any suggested mitigation if you have one.

## Code of Conduct

### Our Pledge

We want Rook to be a high-signal, respectful, and inclusive project. Contributors, maintainers, and community members are expected to make participation harassment-free for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

Examples of behavior that contributes to a healthy project:

- using respectful, direct, and inclusive language
- giving technical criticism without personal attacks
- accepting feedback in good faith
- prioritizing accuracy, collaboration, and user impact
- helping keep issues, pull requests, and docs actionable

Examples of unacceptable behavior:

- harassment, intimidation, or abuse in public or private channels
- discriminatory, hateful, or sexualized language or imagery
- trolling, dogpiling, or deliberately disruptive conduct
- doxxing or publishing private information without permission
- repeated bad-faith arguments or hostile personal attacks

### Scope

This Code of Conduct applies in repository discussions, issues, pull requests, review comments, documentation contributions, project chat, and any public or private setting where someone is representing Rook or its maintainers.

### Enforcement

Report unacceptable behavior to `tarun@octave-x.com`. Include links, screenshots, logs, or other supporting context where possible.

All reports will be reviewed in good faith and handled as confidentially as practical. Maintainers may remove content, reject contributions, lock discussions, or temporarily or permanently restrict participation depending on severity and pattern of behavior.

### Attribution

This Code of Conduct is adapted from the Contributor Covenant, version 1.4:

https://www.contributor-covenant.org/version/1/4/code-of-conduct/
