# Attributions

Two kinds of credit live here. **Ideas** — the published research this simulation
illustrates — come first, because they are the part that is not ours. **Art** — all
of it original to this project; nothing in `assets/` or inlined into `index.html`
is sourced from neal.fun or any other third party — follows, with a record of how
each piece was made. The licence position is at the bottom.

---

## Concept and prior art (the physics)

This file used to be meticulous about art and silent about ideas. The propulsion
concept this game illustrates is **not ours** — it is published work by named
researchers, and the game exists to make that work legible to people who have
never heard of it.

**Blaise Gassend**, *Powering Climbers Using Mechanical Waves: Fundamental Limits,
Getting Around Them, and One Climber Concept* — the primary source. Presented at
the National Space Society **International Space Development Conference (ISDC)
2025**, Space Elevator Technical Session, Orlando FL, 21 June 2025. Author's link,
printed on the slides themselves: <https://gassend.net/spaceelevator/isdc2025/>.
Also mirrored by ISEC at
<https://www.isec.org/s/ISDC2025-05-Powering-Climbers-Using-Mechanical-Waves.pdf>
(item 05 on <https://www.isec.org/recent-publications>, with an animated version
and presentation video). Everything this simulation is *about* — powering a space
elevator climber with mechanical waves in the ribbon rather than with lasers, and
the impedance, frequency, stroke, drag, taper, resonance and reflection trade-offs
that follow — comes from here.

**Mark A. Wessels**, *Space Elevator Propulsion with Mechanical Waves*,
arXiv:1802.07443 (2018) — <https://arxiv.org/abs/1802.07443>. Proposes
ground-driven opposing reciprocating pistons exciting **transverse** waves on the
cable, driven at λ/4 from the anchor, with energy extracted by tuned masses and
electromagnetic induction. The 60 cm stroke and 92 Hz carrier the game uses as
reference points are Wessels', via Gassend's summary of them.

> **A citation correction, recorded rather than silently propagated.** Gassend's
> slide 4 gives Wessels' patent as `US-11149719-B2`. That number is in fact
> "EdDrive propellantless propulsion system", inventor Edward Von Bargen —
> unrelated. Wessels' actual patent is **US 8,196,867 B1**, *"Space elevator
> propulsion system using mechanical waves"*, Mark Wessels, filed 2010-06-24,
> granted 2012-06-12. Slide 4 also gives the arXiv title as "Propulsion **by**
> Mechanical Waves"; arXiv's own record says "**with**". Both checked against
> Google Patents and arXiv directly.

**Keith Lofstrom**, *Acoustic Wave Powered Climbers* (c. 2015 — Gassend's slide 4
marks the year uncertain), cited there as available on spaceelevatorwiki.com;
related material and a submitted paper are on Lofstrom's own wiki at
<http://www.launchloop.com/AcousticClimber>. Independent prior work: 100–1000 Hz
longitudinal waves, 2–6 MW, 25–250 m wavelengths, 1.2–18 cm displacements — the
low end of the game's stroke range. Also the source of the observation that
descending climbers dissipate energy into ribbon vibrations.

**Zubax Robotics FluxGrip FG40** — the electro-permanent-magnet (EPM) hardware
the climber's coupling stack is modelled on. <https://fluxgrip.zubax.com/> and
<https://zubax.com/products/fluxgrip>. FG40 is the product family; FG401M and
FG401MA are shipping models. Zubax has published measurements this project reads
directly, including force versus airgap and current consumption during
magnetization, on <https://forum.zubax.com>. No affiliation with or endorsement
by Zubax is claimed or implied.

Deriving constants from these sources is our own work and may contain our own
errors; where the game's numbers are estimates rather than published figures,
that is stated in the code beside the constant.

---

## Concept credit (the game)

The *game* concept — climbing past real-world landmarks toward the Kármán Line —
is a tribute to ["Space Elevator" by Neal Agarwal](https://neal.fun/space-elevator/).
Game mechanics and concepts are not themselves copyrightable; Neal's specific
assets are, and **none of them are used here**. See the shader note below for the
one place the two projects meet in code.

---

## Original — AI-generated (91 files)

All 78 landmark sprites, the 12 atmosphere clouds, and the grass ground strip in
[`assets/`](assets) were generated with `google/gemini-3-pro-image` via
OpenRouter, from hand-written, de-branded subject prompts that live in
[`dev/art-gen/manifest.py`](dev/art-gen/manifest.py) (tracked in this repo — every
prompt is auditable). The pipeline (`dev/art-gen/gen.py` → `dev/art-gen/post.py`) keys
out the background, despills, trims and resizes to game dimensions.

References were **not** used: the generator saw words only. The three wide hero
pieces (`mount-everest-s-800.webp`, `saturn-v-sm.webp`, `space-shuttle-sm.webp`)
were at one point generated with the then-current sprite attached as a framing
reference (colour/texture/detail copying forbidden by the prompt); that lineage
was **removed before v1.0** by re-rolling all three from words alone, and the
reference mechanism (`HERO_REFS`) is permanently empty.

## Original — procedural (7 files)

Drawn locally, by hand or by code, with no third-party source:

| File(s) | What |
|---|---|
| `character.svg` | The monkey (favicon / in-game character) |
| `space-suit-1.svg`, `space-suit-2.svg`, `space-suit-3.svg` | Thermal-tier suit overlays |
| `thermometer.svg` | Temperature gauge |
| `grid.svg` | Background grid overlay |
| `noise.jpeg` | Film-grain noise tile |

## WebGL atmosphere shader

The shader code in this repo is original and independently written. What an
audit of this repository can and cannot establish:

- The sky declares 10 `sampler2D` uniforms (`rainTexture`, `horizon{,2,3,4}`,
  `airglow`, `aurora{,2}`, `stars`, `meteor`) but needs **no texture image
  files**: all ten are generated in-repo by `createLinearGradientTexture`,
  `createProceduralTexture` and `createTextureFromConfig`, and uploaded at
  startup. No `.js`, `.css` or GLSL file from neal.fun was ever tracked in this
  repository (verified across full git history before the v1.0 history rewrite).
- The sky's *layer structure* (horizon glow, airglow bands, aurora, stars,
  meteors, rain) parallels the reference page, and the GLSL has **not** been
  line-by-line compared against neal.fun's minified bundle (their server 403s
  automated fetches). Similarity of structure is not similarity of expression,
  but we disclose rather than assert.
- If that comparison ever becomes necessary and its answer is bad, remediation
  is cheap: the game already falls back to a static CSS-gradient sky when WebGL
  fails, so the shader can be dropped without a rewrite.

## Audio

None bundled — all sound is WebAudio tones synthesised at runtime.

## Fonts

None bundled — system fonts only.

---

## Licence

The **MIT License** ([`LICENSE`](LICENSE)) applies to the **whole repository,
code and art alike**. Note honestly: AI-generated images may not attract
copyright at all in some jurisdictions, so for those pieces the grant operates
*to the extent any rights exist*. Either way, you may use, modify and
redistribute everything here under the MIT terms.
