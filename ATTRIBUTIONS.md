# Attributions

All artwork shipped in this repository is **original to this project**. Nothing in
`assets/` or inlined into `index.html` is sourced from neal.fun or any other
third party. This file records how each piece was made; the licence position is
at the bottom.

---

## Concept credit

The *concept* — climbing past real-world landmarks toward the Kármán Line — is a
tribute to ["Space Elevator" by Neal Agarwal](https://neal.fun/space-elevator/).
Game mechanics and concepts are not themselves copyrightable; Neal's specific
assets are, and **none of them are used here**. See the shader note below for the
one place the two projects meet in code.

---

## Original — AI-generated (91 files)

All 78 landmark sprites, the 12 atmosphere clouds, and the grass ground strip in
[`assets/`](assets) were generated with `google/gemini-3-pro-image` via
OpenRouter, from hand-written, de-branded subject prompts that live in
[`art-gen/manifest.py`](art-gen/manifest.py) (tracked in this repo — every
prompt is auditable). The pipeline (`art-gen/gen.py` → `art-gen/post.py`) keys
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
