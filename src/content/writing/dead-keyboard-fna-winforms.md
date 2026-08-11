---
title: 'The keyboard was dead, the mouse was fine'
summary: >-
  A dead keyboard in an XNA-era game under Wine on Apple Silicon turned out to be
  Windows Forms desyncing SDL input focus. The interesting part is not the fix — it is
  the eleven hypotheses that had to die first, and why the mouse working was the clue.
date: 2026-08-11
tags: ['debugging', 'FNA', 'Wine', 'IL patching', 'root cause']
source:
  label: 'Full technical findings — castleminerz-mac-tools/FINDINGS.md'
  url: 'https://github.com/brandonmrgich/castleminerz-mac-tools/blob/main/FINDINGS.md'
---

A game launches on an M1 Mac through a Wine wrapper. It renders. The mouse aims, and
clicking fires. Not one key does anything — not in menus, not in game, not even Escape.

The asymmetry is the whole story, and it took a while to hear it.

## Why "the mouse works" is a clue and not a consolation

The instinct with a dead keyboard is to look at the keyboard: scancodes, layouts,
Steam Input, a stuck modifier. I spent real time there. All of it was wrong, and the
reason is that a working mouse is not a neutral fact — it is evidence that narrows the
search enormously, if you ask what the two devices do *differently*.

They differ in how the runtime reads them. This game does not run on Microsoft XNA at
all; under wine-mono the XNA assemblies are type-forwarder facades onto **FNA**. And
FNA sources the two devices through different mechanisms:

```csharp
SDL_EVENT_KEY_DOWN  ->  Keyboard.keys.AddPressedKey(key);
SDL_EVENT_KEY_UP    ->  Keyboard.keys.RemovePressedKey(key);
```

Keyboard state comes from SDL key *events*. SDL delivers those only to the window
holding input focus. The mouse, by contrast, is polled globally and never consults
focus at all.

So "mouse works, keyboard dead" is not two symptoms. It is one symptom with a built-in
control group. Anything that breaks both devices is not the cause. Anything that breaks
only focus-dependent input is a candidate. That single reframing eliminated most of the
search space before a single further experiment.

## Eleven hypotheses, all dead

Before the real cause surfaced, each of these was tested and eliminated by direct
experiment rather than by argument: 32-bit-on-Apple-Silicon, a damaged Wine prefix, a
missing XNA runtime, the Steam overlay, Steam Input, scancode mapping, the
`GetState(PlayerIndex)` overload, a phantom gamepad claiming input, fullscreen mode,
macOS window focus, and Win32 window focus.

That list is the actual work. The fix at the end is six instructions.

Two of those deserve attention, because they are the ones that nearly ended the
investigation in the wrong place. Win32 `GetGUIThreadInfo` reported the game's window as
`hwndFocus`. macOS Accessibility independently agreed it was the focused window. Both
operating-system-level answers said focus was correct.

They were both right, and both irrelevant. **SDL keeps its own idea of input focus**,
and only SDL's disagreed. Two authoritative sources confirming a healthy state is not
proof the state is healthy — it is proof you are asking the wrong layer.

The measurement that finally pinned it: instrument every `Keyboard.GetState()` call
during sustained key-mashing. `IsKeyDown` returned false 144,152 times out of 144,152
calls. Not flaky, not a race — the events were never arriving at all.

## The cause

The game boots Mono Windows Forms in the same process. `Application.EnableVisualStyles`
at startup, and a static constructor calling `Application.AddMessageFilter` to install a
chat-key grabber.

Those hidden WinForms service windows desync SDL's focus tracking for the peer FNA
window. The FNA window stops receiving key events. `Keyboard.GetState()` returns empty
forever. The mouse, polling globally, never notices.

Nothing here is a bug in the game, in FNA, or in Wine individually. It is an
interaction — which is why every single-component hypothesis failed.

## Corroboration from a second failure mode

The strongest evidence arrived by accident. On a newer runtime the same game does not
boot at all:

| wine-mono | FNA | Result |
|---|---|---|
| 9.4.0 | 24.10 | Boots, keyboard dead |
| 10.4.0 | 25.11 | Crashes at window creation — `Window handle already exists` |
| 11.2.0 | 26.6 | Identical crash |

A minimal FNA app with no WinForms runs correctly on all three.

One apparatus, two entirely different failure modes across versions, and a control that
passes everywhere. A diagnosis that explains both is far stronger than one that explains
either. It also settles a tempting non-fix: upgrading the runtime does not resolve this.
It trades a dead keyboard for a crash at startup.

## The fix, and why it generalizes

Six WinForms-init call sites rewritten to stack-balanced no-ops, preserving method
length and branch targets so nothing else shifts.

The part worth keeping is not the patch. It is that the mechanism is not specific to
this game: any XNA-era title that initializes WinForms in-process, running on FNA under
Wine, is in the same class. So the tooling ships a scanner that flags at-risk assemblies
by their `Application.AddMessageFilter` / `EnableVisualStyles` call sites, and a
standalone FNA input probe that separates "the runtime is broken" from "this game is
broken."

Fixing one title is a workaround. Naming the class and shipping the detector is a fix.

## What I take from it

- **Asymmetry is information.** The component that still works constrains the cause more
  than the one that fails.
- **Confirmation from the wrong layer is worse than no information**, because it reads
  like progress. Two systems agreeing that focus was fine sent the search sideways.
- **A second, unrelated-looking failure mode is a gift.** Explaining both at once is what
  turned a plausible story into a confident one.
- **Write the dead ends down.** The eliminated hypotheses are the reusable artifact; the
  final patch is the least transferable part of the whole exercise.

Reported upstream to both projects it touches:
[FNA-XNA/FNA#671](https://github.com/FNA-XNA/FNA/issues/671) and
[wine-mono/wine-mono#230](https://github.com/wine-mono/wine-mono/issues/230).
