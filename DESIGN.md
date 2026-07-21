# Design System

## Overview

The Realtime Lab uses the visual language of jannikreinhard.com without copying
the WordPress layout. It is a focused engineering product: light workspace,
deep-navy live-call surface, restrained blue actions, and cyan used only for
live media and screen-awareness signals.

## Color Palette

- Canvas: `#F7F9FC`
- Surface: `#FFFFFF`
- Navy: `#081427`
- Ink: `#243044`
- Muted ink: `#52627A`
- Brand blue: `#146CDD`
- Deep blue: `#0A5FC0`
- Live cyan: `#4ADEDD`
- Success: `#16835F`
- Warning: `#A15C00`
- Error: `#C63C3C`
- Border: `#DDE4EE`

## Typography

Use `Aptos`, `Segoe UI`, and system sans-serif fallbacks. Headings are compact,
confident, and never larger than needed for a tool. Body text is limited to
72 characters per line. Labels use sentence case.

## Layout

- The page begins with a compact brand header and a two-column introduction.
- The main action is visible without scrolling on a laptop viewport.
- A native dialog contains the live call and owns focus while connected.
- The call dialog becomes a full-height sheet on narrow screens.
- Screen preview and transcript split into two columns on desktop and stack on
  mobile.

## Components

### Brand header

Navy wordmark, short product descriptor, and a GitHub link. It should identify
the example without imitating the full website navigation.

### Permission brief

Three concise statements explain microphone use, explicit screen-share consent,
and ephemeral image frames before the call begins.

### Live-call dialog

The dialog shows connection state, duration, model preview status, agent voice,
screen preview, transcript, and four direct controls: mute, share screen, send
current frame, and end call.

### Status language

Every state combines a text label with a dot or icon. Cyan indicates screen
awareness, green indicates an active connection, amber indicates connecting,
and red indicates failure or ending.

## Motion

Use 180-220 ms state transitions. Audio bars may move only while the remote
audio track is playing. Disable repeating motion when reduced motion is enabled.

## Accessibility

Maintain 4.5:1 text contrast, 44px minimum control height, strong focus rings,
native dialog semantics, `aria-live` status and transcript updates, meaningful
button labels, and no information conveyed by animation alone.
