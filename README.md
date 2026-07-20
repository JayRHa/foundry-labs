# Microsoft Foundry Examples

Practical, security-conscious examples for building with Microsoft Foundry.

The examples in this repository start small and make the production boundaries
explicit. They use versioned inputs, Microsoft Entra ID where possible, and a
human decision point before any administrative change.

## Examples

| Example | What it demonstrates | Status |
|---|---|---|
| [Intune Change Briefing](examples/intune-change-briefing/) | Review a proposed Microsoft Intune change with Claude in Microsoft Foundry | Runnable |

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
