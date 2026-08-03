#!/usr/bin/env python3
"""
art-gen/manifest.py -- the single source of truth for the art greenfield.

Holds one hand-written subject description per sprite, the chroma key to use,
and the (rare) cases where a reference image is still attached. Display widths
are NOT duplicated here: they are parsed out of LANDMARKS_DATA in
Space_Monkey_Elevator.html so they can never drift from the game.

Imported by gen.py (generation) and post.py (keying / resizing / verification).

Notes on the data:
  * 79 LANDMARKS_DATA entries -> 78 unique sprites (falcon-9-sm.webp is reused
    for both the "staging" and "orbit" landmarks, so it is generated once).
  * `godwit-sm.webp` is spelled correctly here. The file currently on disk is
    `godwid-sm.webp`, which is why that landmark 404s today. The replacement
    must be written as `godwit-sm.webp`.
  * De-branding is deliberate: no person's name, no company, no model badge, no
    roundel, no flag, no livery text. Where a real airframe is recognisable we
    describe the *shape*, not the brand.
"""
import functools
import re
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE_HTML = ROOT / "Space_Monkey_Elevator.html"
OLD_ASSETS = ROOT / "assets"


class Chroma:
    """A chroma-key colour: the phrase fed to the model and the hex post.py keys on."""

    def __init__(self, phrase, hex_value):
        self.phrase = phrase
        self.hex = hex_value

    def __repr__(self):
        return f"Chroma({self.hex})"


# Magenta by default. Green for predominantly warm/pink/red/purple subjects, so
# that keying magenta out can never eat part of the subject itself.
MAGENTA = Chroma("pure-magenta (#FF00FF)", "#FF00FF")
GREEN = Chroma("pure-green (#00FF00)", "#00FF00")

# Reference images: OFF, unconditionally. Every attachment weakens the "not
# derivative" position, and a condor or a Cessna is fully specified by words.
# The three wide hero pieces (Everest, Saturn V, Space Shuttle) were the only
# reference-assisted lineage in the set; that lineage was removed before v1.0
# by re-rolling them from words alone, so the dict is now permanently empty.
HERO_REFS = {}

# Sprites whose LANDMARKS_DATA width is a CSS string rather than a pixel count.
# Everest is `width: '100vw', fullWidth: true`; the shipped file is 800px wide,
# so that is the display width we scale against.
WIDTH_OVERRIDES = {
    "mount-everest-s-800.webp": 800,
}

# sprite filename -> hand-written subject description.
# A good description = subject + dominant real colours + distinguishing marks
# + pose/view. Vague entries produce generic mush; the colour note is what
# stops the model defaulting to muted brown.
SUBJECTS = {
    # --- low altitude: insects, birds, kites, balloons -------------------
    "hummingbird-sm.webp":
        "a hovering hummingbird, IRIDESCENT EMERALD-GREEN back, pale grey "
        "underside, glowing RUBY-RED throat patch, long slender needle beak, "
        "wings blurred mid-beat, side view",
    "fireworks-sm.webp":
        "a single exploding firework burst, a radiating starburst of brilliant "
        "CRIMSON-RED and GOLDEN-YELLOW sparks with a white-hot core and "
        "trailing ember tails, front view",
    "mallard-migrate-sm.webp":
        "a mallard duck in flight, GLOSSY BOTTLE-GREEN head, thin white neck "
        "ring, CHESTNUT-BROWN breast, pale grey body, ORANGE feet tucked back, "
        "wings mid-beat, side view",
    "pigeon-sm.webp":
        "a rock pigeon in flight, soft BLUE-GREY body, iridescent green-purple "
        "neck sheen, two dark bars across each wing, coral-pink feet, side view",
    "bleriot-xi-sm.webp":
        "an early 1910s single-seat monoplane, wire-braced open framework "
        "fuselage, CREAM doped-linen wings, bare varnished wood spars, exposed "
        "radial engine and wooden propeller, side view",
    "box-kite-sm.webp":
        "a cellular box kite, two stacked open cube frames of slender pale "
        "wooden spars with taut BRIGHT RED and WHITE fabric panels, trailing "
        "string, three-quarter view",
    "hotair-balloon-sm.webp":
        "a hot air balloon with VIVID MULTICOLOURED panels (red, orange, "
        "yellow, teal, royal blue, purple) and a wicker basket",
    "osprey-sm.webp":
        "an osprey in flight, WHITE head and underparts, dark CHOCOLATE-BROWN "
        "back and wings, black eye stripe, piercing YELLOW eye, crooked "
        "gull-like wings, side view",
    "bald-eagle-sm.webp":
        "a bald eagle soaring, pure WHITE head and tail, dark CHOCOLATE-BROWN "
        "body and wings, bright YELLOW hooked beak and talons, wings "
        "outstretched, side view",
    "alpine-chough-sm.webp":
        "an alpine chough in flight, glossy JET-BLACK plumage, bright YELLOW "
        "beak and CORAL-RED legs, fanned tail, side view",
    "white-stork-sm.webp":
        "a white stork in flight, brilliant WHITE plumage with BLACK flight "
        "feathers, long CRIMSON-RED beak, red legs trailing straight behind, "
        "neck outstretched, side view",
    "mil-v-12-sm.webp":
        "a very large twin-rotor transport helicopter with two side-by-side "
        "main rotors mounted on stub wings, pale GREY-WHITE fuselage, glazed "
        "nose, tall tail fin, side view",
    "monarch-butterfly-sm.webp":
        "a monarch butterfly with wings spread, BLAZING ORANGE panels, bold "
        "black veins and white-dotted black wing borders",
    "bumblebee-sm.webp":
        "a fat furry bumblebee in flight, bold BLACK and GOLDEN-YELLOW bands, "
        "translucent pale grey wings blurred mid-beat, side view",
    "hang-gliding-sm.webp":
        "a hang glider in flight, taut triangular BRIGHT ORANGE and WHITE sail "
        "wing, bare aluminium control bar, a pilot in a BLUE harness lying "
        "prone beneath, side view",
    "cessna-sm.webp":
        "a small single-engine high-wing propeller plane in a classic bright "
        "WHITE livery with bold RED and BLUE stripe accents, side view",
    "vega-5b-sm.webp":
        "a 1930s single-engine high-wing record-breaking monoplane with a "
        "rounded wooden monocoque fuselage, glossy CRIMSON-RED body with GOLD "
        "trim stripes, radial engine cowl, polished propeller, side view",
    "mil-mi-8-sm.webp":
        "a medium twin-engine transport helicopter, five-blade main rotor, "
        "round cabin portholes, clamshell rear doors, OLIVE-GREEN upper and "
        "pale GREY lower fuselage, side view",
    "skydiving-sm.webp":
        "a skydiver in free fall, arms and legs spread in a stable arch, "
        "BRIGHT RED and BLACK jumpsuit, WHITE helmet and goggles, parachute "
        "backpack rig, seen from the side and slightly above",
    "pterodactyl-sm.webp":
        "a pterodactyl gliding, leathery TAN and RUST-BROWN membranous wings "
        "stretched between elongated finger bones, long pointed head crest, "
        "toothed beak, side view",
    "flamingo-sm.webp":
        "a flamingo in flight, VIVID PINK and coral plumage with BLACK flight "
        "feathers, long neck extended and legs trailing straight behind",
    "ruppell-bird-sm.webp":
        "a griffon vulture soaring, mottled dark BROWN and CREAM scalloped "
        "plumage, pale bare neck and small head, very broad slotted wings "
        "outstretched, side view",
    "zeppelin-sm.webp":
        "a rigid airship, an enormous smooth SILVER-GREY cigar-shaped envelope "
        "with cruciform tail fins and a small gondola plus engine cars slung "
        "beneath, side view",
    "sopwith-camel-sm.webp":
        "a First World War single-seat biplane fighter, OLIVE-DRAB doped upper "
        "surfaces with CREAM undersides, rotary engine cowl, wooden propeller, "
        "open cockpit, wire-braced wings, side view. Every surface is "
        "COMPLETELY BLANK AND UNMARKED: no roundels, no circles, no target "
        "markings, no stripes, no insignia, no letters or numbers anywhere",
    "p-51-sm.webp":
        "a Second World War single-seat long-range fighter, POLISHED "
        "BARE-METAL SILVER fuselage, clear bubble canopy, laminar-flow wings, "
        "four-blade propeller, side view. Every surface is COMPLETELY BLANK "
        "AND UNMARKED: no roundels, no stars, no stripes, no insignia, no "
        "nose art, no letters or numbers anywhere",
    "p-80-sm.webp":
        "an early straight-wing single-seat jet fighter, glossy PEARL-GREY "
        "fuselage with a smooth rounded nose intake, wingtip fuel tanks, "
        "bubble canopy, side view",
    "caproni-sm.webp":
        "a 1930s high-altitude research biplane with very long slender wings, "
        "CREAM and pale SILVER fabric surfaces, enclosed cockpit, radial "
        "engine and two-blade propeller, side view",
    "bell-47-sm.webp":
        "a small early helicopter with a distinctive clear SPHERICAL BUBBLE "
        "canopy, open lattice tail boom, two-blade rotor and skid landing "
        "gear, bright YELLOW fuselage, side view",
    "sa-315-sm.webp":
        "a lightweight high-altitude utility helicopter, open glazed cockpit, "
        "slender exposed tail boom, three-blade rotor, tall skid gear, WHITE "
        "and BLUE fuselage, side view",
    "godwit-sm.webp":
        "a bar-tailed godwit in long-distance flight, warm CINNAMON-BROWN "
        "mottled back, pale BUFF underside, very long straight dark bill, "
        "sharply pointed swept-back wings, side view",
    "andean-condor-sm.webp":
        "a soaring Andean condor, glossy BLACK plumage with a white neck ruff "
        "and white wing bands, red-tinged head, broad outstretched wings, "
        "side view",
    "whooper-swan-sm.webp":
        "a large swan in flight, brilliant WHITE plumage, long straight neck "
        "extended, BLACK and BRIGHT YELLOW wedge-shaped bill, broad wings "
        "mid-beat, side view",
    "bar-goose-sm.webp":
        "a bar-headed goose in flight, pale GREY body, WHITE head with two "
        "bold BLACK bars across the nape, ORANGE-YELLOW bill and legs, wings "
        "outstretched, side view",
    "bearded-vulture-sm.webp":
        "a bearded vulture soaring, its head, neck and entire underside a "
        "strong RUSTY ORANGE-RED, with SLATE-GREY wings and a long "
        "diamond-shaped grey tail, a black eye mask and a bristly black "
        "beard. The rust-orange body colour must be rich and obvious, NOT "
        "white and NOT pale. Narrow pointed wings outstretched, side view",
    "douglas-dc-3-sm.webp":
        "a 1930s twin-engine propeller airliner, POLISHED BARE-METAL SILVER "
        "fuselage, tapered wings, two radial engines, tailwheel stance, "
        "side view",
    "ussr-1-sm.webp":
        "a 1930s stratospheric research balloon, a huge pale CREAM-WHITE "
        "spherical gas envelope in a rigging net with a riveted SILVER-GREY "
        "spherical pressurised gondola hanging below, side view",
    "party-balloons-sm.webp":
        "a bunch of five or six glossy inflated party balloons with curling "
        "white ribbon strings. Each balloon is a DIFFERENT INTENSELY "
        "SATURATED colour -- one bright scarlet RED, one vivid ORANGE, one "
        "sunny YELLOW, one royal BLUE, one bright GREEN. Solidly filled with "
        "rich colour, glossy highlights; absolutely NOT white, pale or "
        "transparent. Three-quarter view",
    "paratrooper-sm.webp":
        "a paratrooper descending beneath a fully inflated round OLIVE-GREEN "
        "parachute canopy, rigging lines down to a figure in green fatigues "
        "and a helmet, side view",
    "crane-sm.webp":
        "a common crane in flight, SLATE-GREY body, BLACK and WHITE striped "
        "neck, small CRIMSON crown patch, long dark legs trailing behind, "
        "broad wings mid-beat, side view",
    # --- high mountain: animals and plants ------------------------------
    "mountain-goat-sm.webp":
        "a Himalayan mountain goat standing alert on bare rock, shaggy "
        "CREAM-WHITE coat, BLACK horns and hooves, dark eyes, side view",
    "spider-sm.webp":
        "a small ballooning spider trailing a fine silk thread upward, glossy "
        "DARK-BROWN body with pale cream markings, eight slender legs splayed, "
        "side view",
    "sandwort-sm.webp":
        "a low alpine cushion plant on grey rock: a dense rounded mound of "
        "tiny DEEP GREEN leaves COMPLETELY COVERED in many small BRIGHT "
        "MAGENTA-PINK five-petalled flowers with yellow centres. The flowers "
        "must be vivid and clearly visible, high contrast against the green "
        "cushion -- not white, not pale, not washed out. Side view",
    "yak-sm.webp":
        "a Himalayan yak standing, massive shaggy DARK-BROWN and black coat "
        "hanging almost to the ground, broad upward-curving PALE horns, bushy "
        "tail, side view",
    "lizard-sm.webp":
        "a small high-altitude agama lizard on rock, mottled SANDY-BROWN and "
        "OLIVE scales with darker bands, head raised alert, long tapering "
        "tail, side view",
    # --- rockets and aircraft, ascending --------------------------------
    "v-2-sm.webp":
        "an early single-stage liquid-fuel ballistic rocket, slender "
        "spindle-shaped body in a BLACK and WHITE alternating roll-pattern "
        "paint scheme, four large tapering tail fins, pointed nose, side view",
    "falcon-9-sm.webp":
        "a slender two-stage orbital launch rocket, tall gleaming WHITE "
        "cylindrical body with a BLACK interstage band, nine engine nozzles "
        "clustered at the base, four small grid fins near the top, side view",
    "mount-everest-s-800.webp":
        "a towering Himalayan mountain massif seen from far away, a broad "
        "pyramidal SNOW-WHITE summit with dark exposed GREY-BROWN rock ridges, "
        "long white glacier fields on its flanks and a sharp wind plume of "
        "snow streaming off the peak. Show the COMPLETE mountain as a single "
        "small centered shape with a WIDE EMPTY MARGIN of flat background on "
        "all four sides -- the mountain must NOT touch or run off any edge of "
        "the image, and there must be no foreground, no trees and no ground "
        "strip along the bottom",
    "spitfire-sm.webp":
        "a Second World War single-seat fighter with distinctive ELLIPTICAL "
        "wings, GREY-GREEN camouflaged upper surfaces and pale DUCK-EGG BLUE "
        "undersides, four-blade propeller, framed canopy, side view. Every "
        "surface is COMPLETELY BLANK AND UNMARKED: no roundels, no circles, "
        "no target markings, no stripes, no insignia, no letters or numbers",
    "an-225-sm.webp":
        "an enormous six-engine strategic cargo aircraft, WHITE upper fuselage "
        "and pale BLUE lower fuselage, very long high-mounted wings, TWIN "
        "vertical tail fins, side view",
    "passenger-jet-sm.webp":
        "a modern twin-engine wide-body passenger jet airliner, clean WHITE "
        "fuselage with a slim BLUE cheatline and a plain blue tail fin, swept "
        "wings with upturned winglets, side view",
    "space-shuttle-sm.webp":
        "a reusable winged orbiter spaceplane, WHITE upper fuselage with a "
        "BLACK heat-shield underside and nose, stubby delta wings, three large "
        "engine nozzles at the tail, side view",
    "learjet-45-sm.webp":
        "a small twin-engine business jet, glossy WHITE fuselage with a thin "
        "GOLD and CHARCOAL stripe, T-tail, rear-mounted engines, winglets, "
        "side view",
    "f-35-sm.webp":
        "a modern single-seat stealth fighter jet, faceted angular MATTE GREY "
        "airframe, canted twin tail fins, chiselled nose, single engine "
        "nozzle, side view",
    "su-9-sm.webp":
        "a 1950s single-seat delta-wing interceptor jet, BARE-METAL SILVER "
        "fuselage with a circular nose air intake and central shock cone, "
        "sharply swept delta wings, tall tail fin, side view",
    "vampire-mk-I-sm.webp":
        "an early TWIN-BOOM single-seat jet fighter, short stubby central pod, "
        "two tail booms joined by a straight tailplane, POLISHED SILVER-GREY "
        "finish, side view",
    "concorde-sm.webp":
        "a slender supersonic delta-wing airliner, gleaming WHITE fuselage, "
        "long drooping pointed nose, ogival delta wings, four underslung "
        "engines, side view",
    "u-2-sm.webp":
        "a high-altitude reconnaissance aircraft with extremely long slender "
        "straight glider-like wings, its whole airframe finished in solid "
        "MATTE BLACK / very dark charcoal -- a dark silhouette, definitely NOT "
        "white or silver. Single engine, small tail, side view",
    "bell-x-1-sm.webp":
        "a bullet-shaped experimental rocket research aircraft whose ENTIRE "
        "fuselage is painted a solid, intense, glossy ORANGE (the colour of a "
        "traffic cone) -- filled with strong orange, definitely NOT white and "
        "NOT pale. Shaped like a rifle bullet, with short thin straight wings "
        "and four rocket nozzles at the tail, side view",
    "explorer-2-sm.webp":
        "a 1930s stratospheric research balloon at altitude, a huge partially "
        "inflated pale CREAM-WHITE envelope in a rigging net above a riveted "
        "SILVER-GREY spherical gondola, side view",
    "zephyr-sm.webp":
        "a solar-powered high-altitude unmanned aircraft, ultra-slender very "
        "long wings surfaced in DEEP BLUE-BLACK solar cells, skinny "
        "carbon-fibre fuselage, two small propellers, side view",
    "perlan-sm.webp":
        "a high-altitude pressurised research glider, gleaming WHITE fuselage "
        "with a long tapering nose, extremely long slender WHITE wings, "
        "T-tail, bubble canopy, no engine, side view",
    "douglas-sm.webp":
        "a 1950s swept-wing experimental research rocket plane, glossy WHITE "
        "fuselage with a pointed nose boom, thin swept wings, single tail fin, "
        "rocket nozzle at the tail, side view",
    "sr-71-sm.webp":
        "a large twin-engine supersonic reconnaissance aircraft, MATTE BLACK "
        "blended-body airframe, sharp chines running forward to the nose, two "
        "huge engine nacelles with pointed inlet spikes, canted twin tail "
        "fins, side view",
    "helios-sm.webp":
        "an experimental solar-powered flying wing, a single extremely long "
        "straight WING surfaced with DARK BLUE solar panels and no fuselage, "
        "a row of many small propellers along the leading edge, slender "
        "landing pods below, side view",
    "f-104-sm.webp":
        "a 1950s single-seat interceptor jet shaped like a missile, POLISHED "
        "BARE-METAL SILVER needle fuselage, tiny razor-thin stubby straight "
        "wings, T-tail, sharply pointed nose, side view",
    "nasa-x-43-sm.webp":
        "a small unmanned experimental hypersonic scramjet vehicle, flat "
        "wedge-shaped BLACK and pale GREY body with a very sharp thin leading "
        "edge, tiny stub wings, twin vertical fins at the rear, side view",
    "highest-ejection-sm.webp":
        "a high-altitude parachutist in a bulky WHITE full-pressure suit and "
        "large round white helmet, descending beneath a small white parachute, "
        "side view",
    "weather-balloon-sm.webp":
        "a weather balloon, a large translucent PALE-WHITE latex sphere, "
        "slightly pear-shaped, with a thin cord down to a small ORANGE "
        "instrument package, side view",
    "bell-x-2-sm.webp":
        "a 1950s experimental swept-wing rocket research aircraft, gleaming "
        "STAINLESS-STEEL SILVER fuselage, sharply swept thin wings, tall swept "
        "tail fin, rocket nozzles at the tail, side view",
    "paper-airplane-sm.webp":
        "a folded paper airplane, crisp plain WHITE paper with visible clean "
        "fold creases and a sharp pointed nose, angled slightly nose-up, "
        "side view",
    "felix-sm.webp":
        "a stratosphere skydiver in a bulky WHITE full-pressure suit with a "
        "large round white helmet and a chest-mounted control pack, arms "
        "tucked in, falling in a head-down delta position, side view. The suit "
        "is PLAIN AND ENTIRELY UNMARKED: no flags, no flag patches, no "
        "sponsor logos, no badges, no names, no text of any kind",
    "highest-mouse-sm.webp":
        "a small deer mouse, warm SANDY-BROWN fur with a WHITE belly, large "
        "round dark eyes, big pink ears, long thin tail, standing on all "
        "fours, side view",
    "sud-ouest-sm.webp":
        "a 1950s experimental mixed-power interceptor, slim needle fuselage, "
        "small WINGTIP-MOUNTED engine nacelles, tiny thin trapezoidal wings, "
        "POLISHED SILVER finish, side view",
    "sounding-rocket-sm.webp":
        "a small slender sounding research rocket, thin WHITE cylindrical body "
        "with a BLACK nose cone and one narrow orange band, three small swept "
        "tail fins, side view",
    "saturn-v-sm.webp":
        "a colossal three-stage moon rocket, tall WHITE cylindrical body with "
        "BLACK roll-pattern markings on the lower stage, a tapering "
        "interstage, a slender escape tower at the pointed top and five large "
        "engine bells at the base, side view",
    "vss-unity-sm.webp":
        "a small suborbital spaceplane, glossy WHITE fuselage with a bulbous "
        "cabin and round porthole windows, straight mid-mounted wings ending "
        "in upturned twin tail booms, a single rocket nozzle at the tail, "
        "side view",
    "x-15-sm.webp":
        "a rocket-powered hypersonic research aircraft, MATTE JET-BLACK wedge "
        "fuselage, very short thin stubby wings, thick wedge-shaped vertical "
        "tail, one large rocket nozzle at the tail, side view",
    "vostok-1-sm.webp":
        "an early spherical crewed space capsule, a riveted SILVER-GREY sphere "
        "clad in scorched CHARCOAL ablative heat shielding, one small round "
        "porthole and protruding antenna whiskers, side view",
}

# Green-screen these: predominantly warm / pink / red / purple subjects, where
# keying out magenta risks eating the subject.
GREEN_KEYED = {
    "fireworks-sm.webp",
    "box-kite-sm.webp",
    "hotair-balloon-sm.webp",
    "hang-gliding-sm.webp",
    "vega-5b-sm.webp",
    "skydiving-sm.webp",
    "flamingo-sm.webp",
    "party-balloons-sm.webp",
    "sandwort-sm.webp",
    "bell-x-1-sm.webp",
}


def chroma_for(sprite):
    if sprite in ATMOSPHERE:
        return BLACK if sprite in LUMA_ALPHA else MAGENTA
    return GREEN if sprite in GREEN_KEYED else MAGENTA


# ---------------------------------------------------------------------------
# Atmosphere group (roadmap 2f): the 12 clouds + the ground strip.
#
# These are NOT stickers, so they do not use the sprite STYLE: a white sticker
# border and a dark outline are actively wrong on a soft semi-transparent
# backdrop. Two differences from the landmark pipeline:
#
#   * Clouds are generated on PURE BLACK and their alpha is taken from
#     LUMINANCE, not chroma-keyed. Chroma keying is the worst possible tool for
#     a wispy translucent edge -- the alpha erode eats the wisps and the despill
#     leaves fringe. On black, a white cloud's own brightness *is* its opacity,
#     which is the classic smoke/cloud trick and gives genuinely soft edges.
#   * The ground strip is keyed normally: its crest is a hard edge against sky.
#
# Display widths come from the game's `this.clouds` maxWidth, parsed at runtime
# like the landmark widths, so they cannot drift.
# ---------------------------------------------------------------------------
BLACK = Chroma("pure-black (#000000)", "#000000")

CLOUD_STYLE = (
    "Render it as a SOFT, NATURALISTIC cloud: billowing volumetric form, gentle "
    "self-shadowing in cool pale grey, bright sunlit upper surfaces, and "
    "genuinely WISPY, feathered, semi-transparent edges that fade gradually. "
    "NO outline, NO dark line art, NO white sticker border, NO frame, NO "
    "cartoon cel shading. The cloud must be the ONLY bright thing in the image: "
    "no sun, no moon, no stars, no light rays, no lens flare, no horizon, no "
    "ground, no birds, no aircraft, no text, no watermark."
)

GRASS_STYLE = (
    "Render it as a SOFT, NATURALISTIC band of grassland seen from slightly "
    "above ground level: rich saturated living green with warm yellow-green "
    "sunlit highlights and cooler green shadow in the hollows, individual blade "
    "detail along the top crest so the edge reads as grass and not as a cut "
    "line. NO outline, NO sticker border, NO frame, NO cartoon cel shading. No "
    "sky, no clouds, no horizon line, no trees, no flowers, no path, no fence, "
    "no animals, no text, no watermark."
)

# sprite filename -> hand-written subject description.
ATMOSPHERE = {
    "cumulus-950.webp":
        "a single fair-weather cumulus cloud, brilliant white heaped "
        "cauliflower-like domes on top and a soft flat pale-grey base, "
        "well-defined but soft-edged, seen from the side",
    "stratus-900.webp":
        "a low stratus cloud layer, a wide featureless soft sheet of pale "
        "grey-white, almost no internal structure, drawn out horizontally",
    "nimbostratus-750.webp":
        "a thick nimbostratus rain layer, deep slate-grey and heavy, with a "
        "ragged diffuse base trailing faint precipitation haze, no visible "
        "raindrops, drawn out horizontally",
    "altostratus-500.webp":
        "a mid-level altostratus veil, a broad translucent sheet of soft "
        "blue-grey, thin enough to be semi-transparent throughout, featureless "
        "and drawn out horizontally",
    "cumulonimbus-850.webp":
        "a towering cumulonimbus storm cloud rising as one narrow very tall "
        "vertical column, much TALLER than it is wide, filling the full "
        "height of the frame from bottom edge to top edge, brilliant white "
        "boiling upper turrets flattening into a small narrow anvil top, "
        "dark blue-grey heavy base, seen from the side",
    "altocumulus-700.webp":
        "a field of altocumulus cloudlets, many small rounded white puffs in "
        "loose rows with pale grey undersides and clear gaps between them, "
        "spread out horizontally",
    "cirrus-700.webp":
        "high thin cirrus cloud, delicate white ice-crystal streaks swept into "
        "fine mare's-tail filaments, extremely wispy and translucent, spread "
        "out horizontally",
    "cirrus2-700.webp":
        "high thin cirrus cloud, a looser scatter of fine white feathery "
        "filaments hooked at one end, very translucent, spread out horizontally",
    "cirrus3-700.webp":
        "high thin cirrus cloud, long fine parallel white streaks combed in one "
        "direction by wind shear, very translucent, spread out horizontally",
    "cirrostratus-950.webp":
        "a cirrostratus veil, an extremely thin faint translucent white sheet of "
        "ice haze with barely any structure, ghostly and almost transparent, "
        "spread out horizontally",
    "cirrostratus2-950.webp":
        "a cirrostratus veil, a very faint smooth translucent white ice haze "
        "with soft fibrous banding, ghostly and almost transparent, spread out "
        "horizontally",
    "cirrostratus3-950.webp":
        "a cirrostratus veil, a barely-there translucent white ice haze, "
        "fainter at the edges, ghostly and almost transparent, spread out "
        "horizontally",
    "grass.webp":
        "a wide panoramic band of sunlit green meadow grass filling the lower "
        "half of the frame, gently undulating hummocks, fine blade detail along "
        "the crest",
}

# Clouds: alpha from luminance (generated on black). Everything else in the
# atmosphere group is chroma-keyed like a sprite.
LUMA_ALPHA = {s for s in ATMOSPHERE if s != "grass.webp"}

# The ground strip has no width in the game (CSS stretches it to 100%), so its
# drawing width is a deliberate choice: the widest of the four rasters it
# replaces.
ATMOS_WIDTH_OVERRIDES = {"grass.webp": 1400}


# Members of ATMOSPHERE that are absent from the game's `this.clouds` array by
# design: the ground strip IS wired in, but as a CSS background, not a cloud.
# check() exempts exactly this set -- keying the exemption on
# ATMOS_WIDTH_OVERRIDES instead would let any future width-override entry
# silently escape cloud validation.
NOT_CLOUDS = {"grass.webp"}


def style_for(sprite):
    """Prompt style for a sprite. Landmarks fall back to the sticker STYLE."""
    if sprite == "grass.webp":
        return GRASS_STYLE
    if sprite in ATMOSPHERE:
        return CLOUD_STYLE
    return None


def mode_for(sprite):
    """'luma' (alpha from brightness) or 'key' (chroma key)."""
    return "luma" if sprite in LUMA_ALPHA else "key"


@functools.lru_cache(maxsize=None)
def cloud_widths():
    """Parse cloud sprite -> display width (px) out of the game's cloud array.

    The clouds are sized in CSS (`width: '80vw', maxWidth: '1400px'`), so
    maxWidth is the largest width they are ever drawn at, and therefore the
    width to scale against.
    """
    src = SOURCE_HTML.read_text()
    start = src.index("this.clouds = [")
    block = src[start:src.index("\n                ];", start)]
    widths = {}
    for entry in re.findall(r"\{[^{}]*\}", block):
        img = re.search(r"img:\s*ASSET_BASE_PATH\s*\+\s*'([^']*)'", entry)
        mx = re.search(r"maxWidth:\s*'(\d+)px'", entry)
        if img and mx:
            widths[img.group(1)] = int(mx.group(1))
    return widths


def atmos_widths():
    # Copy: cloud_widths() is cached, so mutating its return value here would
    # leak the ground strip into every later cloud_widths() call (and break
    # check()'s cloud-set comparison).
    w = dict(cloud_widths())
    w.update(ATMOS_WIDTH_OVERRIDES)
    return w


def atmos_jobs():
    """Ordered list of (sprite, subject, chroma, ref) for the atmosphere group."""
    return [(s, ATMOSPHERE[s], chroma_for(s), None) for s in ATMOSPHERE]


def display_width(sprite):
    """Display width for any sprite, landmark or atmosphere."""
    if sprite in ATMOSPHERE:
        return atmos_widths().get(sprite)
    return landmark_widths().get(sprite)


def ref_for(sprite):
    """Absolute path to a reference image, or None (the default).

    Hero pieces are EXPECTED to have their reference on disk -- warn if it is
    missing, so a folder rename or a deleted file cannot silently downgrade the
    generation to no-reference mode.
    """
    name = HERO_REFS.get(sprite)
    if not name:
        return None
    path = OLD_ASSETS / name
    if not path.exists():
        import warnings
        warnings.warn(f"hero reference {path} is listed in HERO_REFS but does "
                      f"not exist; generating {sprite} WITHOUT a reference")
        return None
    return path


def raw_name(sprite):
    """`andean-condor-sm.webp` -> `andean-condor.png` (the raw generator output)."""
    return sprite[:-len(".webp")].removesuffix("-sm") + ".png"


@functools.lru_cache(maxsize=None)
def landmark_widths():
    """Parse sprite -> display width (px) straight out of LANDMARKS_DATA.

    Cached: post.py calls display_width() per job and this re-reads and
    regex-parses the ~200 KB source HTML on every call. The file cannot change
    mid-run, and callers must not mutate the returned dict.
    """
    src = SOURCE_HTML.read_text()
    start = src.index("const LANDMARKS_DATA = [")
    block = src[start:src.index("\n        ];", start)]
    widths = {}
    for entry in re.findall(r"\{[^{}]*\}", block):
        sprite = re.search(r"sprite:\s*'([^']*)'", entry)
        if not sprite:
            continue
        sprite = sprite.group(1)
        width = re.search(r"width:\s*(\d+)\s*[,}]", entry)
        if width:
            widths[sprite] = int(width.group(1))
        elif sprite in WIDTH_OVERRIDES:
            widths[sprite] = WIDTH_OVERRIDES[sprite]
    widths.update({k: v for k, v in WIDTH_OVERRIDES.items() if k not in widths})
    return widths


def jobs(wave=None, wave_size=20):
    """Ordered list of (sprite, subject, chroma, ref). `wave` is 1-based."""
    all_jobs = [(s, SUBJECTS[s], chroma_for(s), ref_for(s)) for s in SUBJECTS]
    if wave is None:
        return all_jobs
    lo = (wave - 1) * wave_size
    if lo >= len(all_jobs):
        raise SystemExit(
            f"wave {wave} is past the end ({len(all_jobs)} jobs, "
            f"{-(-len(all_jobs) // wave_size)} waves of {wave_size})"
        )
    return all_jobs[lo:lo + wave_size]


def check():
    """Cross-check the manifest against the game. Returns a list of problems."""
    widths = landmark_widths()
    problems = []
    for sprite in sorted(set(widths) - set(SUBJECTS)):
        problems.append(f"in the game but missing from SUBJECTS: {sprite}")
    for sprite in sorted(set(SUBJECTS) - set(widths)):
        # godwit is the intended correct spelling; the game references it and
        # the on-disk file is misspelled, so it must appear here.
        problems.append(f"in SUBJECTS but no width found in the game: {sprite}")

    # Atmosphere group: the clouds must match the game's cloud array exactly.
    clouds = cloud_widths()
    described = set(ATMOSPHERE) - NOT_CLOUDS
    for sprite in sorted(set(clouds) - described):
        problems.append(f"cloud in the game but missing from ATMOSPHERE: {sprite}")
    for sprite in sorted(described - set(clouds)):
        problems.append(f"in ATMOSPHERE but not a cloud in the game: {sprite}")
    return problems


if __name__ == "__main__":
    widths = landmark_widths()
    print(f"{len(SUBJECTS)} subjects, {len(widths)} sprite widths parsed from the game")
    for sprite, subject in SUBJECTS.items():
        w = widths.get(sprite, "?")
        key = "GREEN" if sprite in GREEN_KEYED else "magenta"
        ref = "REF" if ref_for(sprite) else "-"
        print(f"  {sprite:<28} w={str(w):>5} {key:<8} {ref:<4} {subject[:52]}...")

    aw = atmos_widths()
    print(f"\n{len(ATMOSPHERE)} atmosphere subjects "
          f"({len(LUMA_ALPHA)} luma-alpha, {len(ATMOSPHERE) - len(LUMA_ALPHA)} keyed)")
    for sprite, subject in ATMOSPHERE.items():
        print(f"  {sprite:<28} w={str(aw.get(sprite, '?')):>5} "
              f"{mode_for(sprite):<8} {'-':<4} {subject[:52]}...")

    for problem in check():
        print("  !!", problem)
