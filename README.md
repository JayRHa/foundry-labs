<!-- jr-brand:start -->
<div align="center">
  <a href="https://jannikreinhard.com/">
    <img src="https://raw.githubusercontent.com/JayRHa/.github/main/assets/readme/brand-header.png" alt="Jannik Reinhard — Driving AI with passion" width="100%">
  </a>
  <h1>Microsoft Foundry Examples</h1>
  <p><strong>Practical, security-conscious examples for building with Microsoft Foundry</strong></p>
  <p>
  <a href="https://jannikreinhard.com/"><img src="https://img.shields.io/badge/Website-146CDD?style=flat-square&amp;logo=wordpress&amp;logoColor=white" alt="Website"></a>
  <a href="https://github.com/JayRHa"><img src="https://img.shields.io/badge/GitHub-081427?style=flat-square&amp;logo=github&amp;logoColor=white" alt="GitHub"></a>
  <a href="https://www.linkedin.com/in/jannik-r/"><img src="https://img.shields.io/badge/LinkedIn-0795FF?style=flat-square&amp;logo=linkedin&amp;logoColor=white" alt="LinkedIn"></a>
  <a href="https://x.com/jannik_reinhard"><img src="https://img.shields.io/badge/X-081427?style=flat-square&amp;logo=x&amp;logoColor=white" alt="X"></a>
  <a href="https://www.youtube.com/@jannikreinhard"><img src="https://img.shields.io/badge/YouTube-146CDD?style=flat-square&amp;logo=youtube&amp;logoColor=white" alt="YouTube"></a>
  </p>
  <p><sub>Driving AI with passion · Microsoft Foundry · Intune · Azure</sub></p>
</div>
<!-- jr-brand:end -->

Practical, security-conscious examples for building with Microsoft Foundry.

The examples in this repository start small and make the production boundaries
explicit. They use versioned inputs, Microsoft Entra ID where possible, and a
human decision point before any administrative change.

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

## Prerequisites

Each example has its own setup instructions. In general, you need:

- Python 3.11 or later
- Azure CLI and an authenticated Azure account
- A Microsoft Foundry project
- A suitable model deployment

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
