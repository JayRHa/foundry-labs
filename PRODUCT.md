# Product

## Register

product

## Users

Microsoft cloud engineers, AI developers, and endpoint administrators who want
to understand how a browser-based Microsoft Foundry Realtime agent works before
they integrate the pattern into a production application.

## Product Purpose

The repository provides small, runnable Microsoft Foundry examples. The
Realtime Voice and Screen Share Lab lets a developer start a low-latency voice
conversation, explicitly share a browser tab, window, or monitor, see exactly
what is being sent, and discuss the visible screen with the model. Success means
the technical path is understandable, the privacy boundary is obvious, and the
example can be adapted without copying a large application.

## Brand Personality

Practical, expert, and calm. The interface should feel like
jannikreinhard.com: Microsoft-cloud focused, direct, trustworthy, and designed
for engineers who want real implementation details rather than a staged demo.

## Anti-references

- Not a Frontier Engine clone; only the proven interaction principles are reused.
- Not a generic AI dashboard with unrelated navigation, statistics, or cards.
- Not a neon voice assistant or a decorative audio visualizer.
- Never hide screen capture, microphone state, frame delivery, or preview status.
- Never expose Azure credentials or long-lived API keys in browser code.

## Design Principles

1. Make the trust boundary visible before the user grants a permission.
2. Keep the primary journey linear: connect, talk, share, stop.
3. Show evidence of state through labels, captions, preview, and frame counters.
4. Prefer a small working implementation over a framework-heavy abstraction.
5. Treat preview-model limits and production hardening as part of the example.

## Accessibility & Inclusion

Target WCAG 2.2 AA. All actions must be keyboard reachable, focus must remain
visible, status changes must be announced, captions must remain readable, color
must not carry state alone, and motion must respect `prefers-reduced-motion`.
