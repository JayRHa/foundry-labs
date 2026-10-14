<!-- jr-brand:start -->
<p align="center">
  <a href="https://jannikreinhard.com/">
    <img src="https://raw.githubusercontent.com/JayRHa/.github/main/assets/readme/brand-header.png" alt="Jannik Reinhard — I help enterprises ship secure AI agents" width="100%">
  </a>
</p>
<p align="center">
  <a href="https://jannikreinhard.com/">Website</a> ·
  <a href="https://www.linkedin.com/in/jannik-r/">LinkedIn</a> ·
  <a href="https://x.com/jannik_reinhard">X</a> ·
  <a href="https://www.youtube.com/@jannikreinhard">YouTube</a>
</p>
<!-- jr-brand:end -->

# Microsoft Foundry labs

**Type:** Examples and labs · **Status:** Community project

## Overview

Practical, security-conscious examples for building with Microsoft Foundry.

The examples in this repository start small and make the production boundaries
explicit. They use versioned inputs, Microsoft Entra ID where possible, and a
human decision point before any administrative change.

<a id="prerequisites"></a>

## Requirements

Each example has its own setup instructions. In general, you need:

- Python 3.11 or later
- Azure CLI and an authenticated Azure account
- A Microsoft Foundry project
- A suitable model deployment

## Quickstart

Get the source locally:

```bash
git clone https://github.com/JayRHa/foundry-labs.git
cd foundry-labs
```

## Examples

| Example | What it demonstrates | Status |
|---|---|---|
| [Intune Change Briefing](examples/intune-change-briefing/) | Review a proposed Microsoft Intune change with Claude in Microsoft Foundry | Runnable |
| [Realtime Voice and Screen Share Lab](examples/realtime-voice-screen-share/) | Talk to a Realtime agent over WebRTC and add an explicitly shared screen as visual context | Runnable · preview model |

## Design principles

- Begin with a read-only workflow.
- Treat model-catalog availability and model deployment as different states.
- Use Microsoft Entra ID instead of storing a long-lived API key.
- Make missing information visible instead of asking the model to invent it.
- Version the input, prompt, tests, and automation together.
- Add tools and scheduling only after the direct model call is understood.
- Keep a human responsible for the final change decision.

## Companion article

The first example was created for
[Microsoft Foundry June 2026: Build More Than a Demo](https://jannikreinhard.com/microsoft-foundry-june-2026/).
The article explains why Claude, Toolboxes, Routines, Memory, and evaluation
should be treated as one controlled agent lifecycle.

## Disclaimer

These examples are educational starting points. Review permissions, identity,
networking, data handling, retention, model availability, and preview-feature
limitations before using them in production.

## License

MIT

<!-- jr-brand-footer:start -->
---

[Articles and guides](https://jannikreinhard.com/) · [Repository index](https://github.com/JayRHa/.github/blob/main/REPOSITORIES.md)
<!-- jr-brand-footer:end -->
