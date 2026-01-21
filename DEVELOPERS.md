# Space Monkey - Developer Documentation 🛠️

**Complete technical reference for developers, AI coders, and contributors**

## Table of Contents
- [Quick Start for AI Coders](#quick-start-for-ai-coders)
- [Core Physics](#core-physics)
- [Upgrade Systems](#upgrade-systems)
- [Technical Constants](#technical-constants)
- [Architecture](#architecture)
- [Development Roadmap](#development-roadmap)
- [Performance Optimization](#performance-optimization)

---

## QUICK START FOR AI CODERS

### 50-Line Working Prototype
```javascript
class Game {
  constructor() {
    this.canvas = document.getElementById('game')
    this.ctx = this.canvas.getContext('2d', { alpha: false, desynchronized: true })
    this.canvas.width = 800; this.canvas.height = 600
    
    this.monkey = { x: 400, y: 500, w: 40, h: 60, vx: 0, vy: 0 }
    this.wave = { freq: 2, amp: 50, time: 0 }
    this.camera = { y: 0 }
    this.grabbing = false
    
    requestAnimationFrame(this.update.bind(this))
  }
  
  update(time) {
    const dt = (time - (this.lastTime || time)) / 1000
    this.lastTime = time
    
    // Physics
    this.wave.time += dt
    if (!this.grabbing) {
      this.monkey.vy += 200 * dt // Gravity
      this.monkey.y += this.monkey.vy * dt
    }
    
    this.camera.y = this.monkey.y - 400
    this.render()
    requestAnimationFrame(this.update.bind(this))
  }
  
  render() {
    // Clear
    this.ctx.fillStyle = '#87CEEB'
    this.ctx.fillRect(0, 0, 800, 600)
    
    // Wave
    const waveX = 400 + this.wave.amp * Math.sin(this.wave.time * this.wave.freq * Math.PI * 2)
    this.ctx.strokeStyle = '#228B22'
    this.ctx.lineWidth = 4
    this.ctx.beginPath()
    this.ctx.moveTo(waveX, 0)
    this.ctx.lineTo(waveX, 600)
    this.ctx.stroke()
    
    // Monkey
    const monkeyY = this.monkey.y - this.camera.y
    this.ctx.fillStyle = '#8B4513'
    this.ctx.fillRect(this.monkey.x, monkeyY, 40, 60)
    
    // HUD
    this.ctx.fillStyle = 'white'
    this.ctx.font = '16px monospace'
    this.ctx.fillText(`Alt: ${Math.floor(this.monkey.y)}m | Speed: ${Math.floor(Math.abs(this.monkey.vy*3.6))}kph`, 10, 30)
  }
}
new Game()
```

### MVP Visual Spec (Geometric Only)
- **Monkey:** `#8B4513` rectangle (40×60px)
- **Vine:** `#228B22` line (4px)
- **Background:** `#87CEEB` gradient
- **Obstacles:** `#FF0000` rectangles
- **Collectibles:** `#FFD700` circles

---

## CORE PHYSICS

### Wave Generation
```javascript
// Position
wavePos = amplitude * Math.sin(time * frequency * 2 * Math.PI)

// Velocity (critical for momentum)
waveVel = amplitude * frequency * 2 * Math.PI * Math.cos(time * frequency * 2 * Math.PI)

// Wave Types
SINE:     smooth, predictable, medium momentum
SQUARE:   sudden transitions, high risk/reward, max momentum
SAWTOOTH: gradual rise, sharp drop, variable momentum
```

### Momentum Transfer System
```javascript
// Core Formula
capturedMomentum = waveVelocity × gripQuality × equipmentMultiplier × weightFactor

// Timing Windows
Perfect: 50ms   → quality = 1.0 (100%)
Good:    150ms  → quality = 0.7-1.0
OK:      300ms  → quality = 0.4-0.7
Poor:    >300ms → quality = 0.4 (minimum)

// Grip Quality Calculation
function calculateGripQuality(grabTime, wavePhase) {
  const optimalPhase = Math.PI / 2  // Peak of sine wave
  const phaseDiff = Math.abs(wavePhase % (2 * Math.PI) - optimalPhase)
  
  if (phaseDiff < 0.05) return 1.0       // Perfect
  if (phaseDiff < 0.15) return 0.7 + 0.3 * (1 - (phaseDiff - 0.05) / 0.10)
  if (phaseDiff < 0.30) return 0.4 + 0.3 * (1 - (phaseDiff - 0.15) / 0.15)
  return 0.4                              // Poor
}

// Apply Momentum
acceleration = momentum / monkeyMass
velocityY += acceleration * deltaTime
positionY += velocityY * deltaTime
```

### Environmental Physics
```javascript
// Temperature (Standard Atmosphere)
function calcTemp(altitude) {
  const SEA_LEVEL = 15, LAPSE_RATE = 6.5, TROPOPAUSE = 11000
  return altitude < TROPOPAUSE 
    ? SEA_LEVEL - (LAPSE_RATE * altitude / 1000)
    : -56.5  // Stratosphere constant
}

// Air Drag (Exponential Decay)
function calcDrag(altitude, velocity) {
  const airDensity = 1.225 * Math.exp(-altitude / 8500)  // Scale height: 8500m
  return 0.5 * airDensity * velocity * velocity * 0.8 * 0.5  // Cd=0.8, A=0.5m²
}

// Shivering Penalty (Temperature < Threshold)
gripModifier = 1.0 - Math.min((threshold - temp) * 0.02, 0.8)  // -2%/°C, max -80%
```

---

## UPGRADE SYSTEMS

### Gripping Technology (5 Tiers)
```javascript
const MAGNETS = {
  iron_ferrite: { cost: 0,     grip: 1.0,  maxSpeed: 100,  cargo: 0   },
  alnico:       { cost: 500,   grip: 1.5,  maxSpeed: 250,  cargo: 10  },
  neodymium:    { cost: 2000,  grip: 2.5,  maxSpeed: 500,  cargo: 25  },
  hallbach:     { cost: 5000,  grip: 4.0,  maxSpeed: 750,  cargo: 50  },
  rebco:        { cost: 15000, grip: 10.0, maxSpeed: 1500, cargo: 100 }  // Superconductor
}
```

### Thermal Protection (4 Tiers)
```javascript
const CLOTHING = {
  basic:     { cost: 0,     altLimit: 2000,  shiveringAt: 10,  penalty: 0.20 },
  jacket:    { cost: 400,   altLimit: 5000,  shiveringAt: -5,  penalty: 0.15 },
  thermal:   { cost: 1500,  altLimit: 8000,  shiveringAt: -20, penalty: 0.10 },
  spacesuit: { cost: 10000, altLimit: Infinity, shiveringAt: -273, penalty: 0 }
}
```

### Computer Guidance (4 Tiers)
```javascript
const COMPUTERS = {
  basic_hud:      { cost: 0,    features: ['Speed','Altitude'], effectiveSpeed: Infinity },
  wave_predictor: { cost: 1000, features: ['+Grab timing'],     effectiveSpeed: 250 },
  advanced:       { cost: 3000, features: ['+Trajectory'],      effectiveSpeed: 500 },
  ai_copilot:     { cost: 8000, features: ['+Auto-suggest'],    effectiveSpeed: 1000 }
}
```

### Solar Power (4 Tiers)
```javascript
const SOLAR = {
  amorphous:      { cost: 600,  power: 50,  weight: 5,  enables: 'Basic systems' },
  polycrystalline:{ cost: 1200, power: 150, weight: 8,  enables: 'Advanced guidance' },
  monocrystalline:{ cost: 2500, power: 300, weight: 10, enables: 'All systems' },
  perovskite:     { cost: 6000, power: 500, weight: 3,  enables: 'All + backup' }  // Ultralight
}
```

---

## PHASE 3A: WEBGL VISUAL ENHANCEMENT

### Architecture (4-Layer System)
```
Layer 4: Fixed UI (z-index: 4)     ← Settings, HUD
Layer 3: Canvas 2D (z-index: 3)    ← Monkey, obstacles, vine
Layer 2: HTML Landmarks (z-index: 2) ← Educational markers
Layer 1: WebGL Background (z-1)    ← Atmospheric effects
```

### WebGL Background Implementation
```javascript
class WebGLBackground {
  constructor(canvas) {
    this.gl = canvas.getContext('webgl')
    this.setupShaders()  // Vertex + Fragment shaders
    this.uniforms = { altitude: 0, time: 0 }
  }
  
  update(altitude, time) {
    this.uniforms.altitude = altitude
    this.uniforms.time = time
  }
  
  render() {
    // Single draw call: procedural atmospheric gradient
    // Ground (0m):    rgb(0.53, 0.81, 0.92) light blue
    // Space (12000m): rgb(0.0, 0.0, 0.1)    near black
    // Stars appear at 10km+, aurora at 85km+
  }
}
```

### Landmark System (16 Educational Markers)
```javascript
const LANDMARKS = [
  { alt: 305,    title: 'Fireworks',              pos: 'center' },
  { alt: 1000,   title: 'Bald Eagle',             pos: 'right' },
  { alt: 3048,   title: 'Mount Everest Peak',     pos: 'center' },
  { alt: 5000,   title: 'Cirrus Clouds',          pos: 'left' },
  { alt: 8000,   title: 'Death Zone',             pos: 'right' },
  { alt: 10000,  title: 'Stratosphere/Ozone',     pos: 'center' },
  { alt: 15000,  title: 'Armstrong Limit',        pos: 'left' },
  { alt: 40000,  title: 'Mesosphere',             pos: 'right' },
  { alt: 100000, title: 'Kármán Line (Space!)',   pos: 'center' }
  // ... 16 total landmarks
]

class LandmarkSystem {
  update(cameraY, altitude, screenHeight) {
    // Show landmarks within ±500m of screen center
    // CSS fade transitions for smooth appearance
  }
}
```

---

## TECHNICAL CONSTANTS

```javascript
const PHYSICS = {
  GRAVITY: 9.81,                    // m/s²
  AIR_DENSITY_SEA: 1.225,          // kg/m³
  SCALE_HEIGHT: 8500,               // m (density halving altitude)
  MONKEY_MASS: 50,                  // kg
  DRAG_COEFFICIENT: 0.8,
  CROSS_SECTION: 0.5,               // m²
  
  PERFECT_WINDOW: 0.05,             // 50ms
  GOOD_WINDOW: 0.15,                // 150ms
  OK_WINDOW: 0.30,                  // 300ms
  
  DEFAULT_FREQUENCY: 2.0,           // Hz
  DEFAULT_AMPLITUDE: 50,            // pixels
  
  TARGET_FPS: 120,                  // Physics update rate
  VIEWPORT_HEIGHT: 600,             // pixels
  CAMERA_OFFSET_RATIO: 0.3          // Keep monkey at 30% from top
}

const ALTITUDE_ZONES = [
  { name: 'Ground',       min: 0,     max: 100,   difficulty: 'Tutorial' },
  { name: 'Forest',       min: 100,   max: 1000,  difficulty: 'Easy' },
  { name: 'Tall Forest',  min: 1000,  max: 3000,  difficulty: 'Medium' },
  { name: 'Redwoods',     min: 3000,  max: 5000,  difficulty: 'Medium-Hard' },
  { name: 'Sky',          min: 5000,  max: 8000,  difficulty: 'Hard' },
  { name: 'Stratosphere', min: 8000,  max: 12000, difficulty: 'Very Hard' },
  { name: 'Space',        min: 12000, max: Infinity, difficulty: 'Extreme' }
]

const COLORS = {
  waves: { sine: '#4A9EFF', square: '#FF4757', sawtooth: '#FFA502' },
  grab: { perfect: '#00FF00', good: '#FFD700', poor: '#FF6B6B' }
}
```

---

## DEVELOPMENT ROADMAP

### Phase 0: MVP (3-5 Days) ⭐ START HERE
**Goal:** Validate core mechanic with geometric shapes

| Day | Deliverable | Success Criteria |
|-----|-------------|-----------------|
| 1 | Oscillating line | Smooth 60+ FPS, no stutter |
| 2 | Spacebar grab + momentum | Timing visibly matters |
| 3 | Scrolling camera | Can reach 500m |
| 4 | Obstacles + collectibles | Collision works |
| 5 | Physics tuning | 8/10 say "yes, fun!" |

**Success = Core mechanic feels AMAZING. If not, rethink approach.**

### Phase 1: Enhanced Mechanics (2-3 Weeks)
- Multiple wave types (square, sawtooth)
- Obstacle patterns
- First upgrade tier
- Basic progression
- Sound effects

### Phase 2: Full Systems (4-6 Weeks)
- All 4 upgrade categories (20 items total)
- 7 altitude zones
- Complete obstacle variety
- Save/load system
- Combo system
- Leaderboards

### Phase 3: Visual Polish (2-4 Weeks)
- Replace geometric shapes with art
- Particle effects
- Animations
- Environmental themes
- Phase 3a: WebGL backgrounds ✅ Complete

### Phase 4: Launch Prep (2-3 Weeks)
- Beta testing (50+ testers)
- Bug fixes
- Performance optimization
- Marketing assets

**Total Timeline:** 9-13 weeks (solo developer)

---

## FILE STRUCTURE

```
space-monkey/
├── index.html                     # Current working game
├── Space_Monkey_Elevator.html     # Alternative version
├── README.md                      # User-facing docs
├── DEVELOPERS.md                  # This file (technical docs)
├── LICENSE                        # MIT License
├── GITHUB_SETUP.md                # GitHub deployment guide
├── embed_assets.py                # Python asset embedding script
└── Space Elevator_files/          # 100+ game assets
    ├── character.svg
    ├── *.webp (images)
    └── *.svg (icons)
```

---

## PERFORMANCE OPTIMIZATION

### Canvas Context Setup
```javascript
// Canvas context setup
const ctx = canvas.getContext('2d', {
  alpha: false,        // Faster (opaque)
  desynchronized: true // Lower latency
})

// High DPI support (Retina)
const dpr = window.devicePixelRatio || 1
canvas.width = 800 * dpr
canvas.height = 600 * dpr
canvas.style.width = '800px'
canvas.style.height = '600px'
ctx.scale(dpr, dpr)

// Disable smoothing
ctx.imageSmoothingEnabled = false
```

### Core Systems Architecture
```javascript
// Game Loop (Fixed Timestep)
class PhysicsEngine {
  update(deltaTime) {
    this.accumulator += Math.min(deltaTime, 0.25)
    while (this.accumulator >= 1/120) {
      this.fixedUpdate(1/120)
      this.accumulator -= 1/120
    }
    this.interpolate(this.accumulator / (1/120))
  }
}

// State Machine
class GameState {
  states = { MENU, PLAYING, PAUSED, GAME_OVER }
  transition(newState, data) {
    this.current.exit()
    this.current = this.states[newState]
    this.current.enter(data)
  }
}

// Equipment System
class Equipment {
  calculateModifiers() {
    return {
      gripMultiplier: MAGNETS[this.magnet].grip,
      maxSpeed: MAGNETS[this.magnet].maxSpeed,
      thermalResist: CLOTHING[this.clothing].penalty,
      guidance: COMPUTERS[this.computer].effectiveSpeed
    }
  }
}

// Collision Detection (Spatial Partitioning)
class SpatialGrid {
  query(x, y, w, h) {
    // Only return objects in nearby cells (100px grid)
    // Massive performance gain over O(n²)
  }
}
```

### Performance Targets
- WebGL: Single draw call per frame, no texture uploads
- Landmarks: CSS `contain: layout`, dynamic visibility
- Canvas: Separate rendering contexts prevent overlap
- Target: 60-120 FPS maintained

---

## IMPLEMENTATION CHECKLIST

### Critical Success Factors (MVP)
- [ ] Spacebar → visual feedback <50ms (instant feel)
- [ ] Perfect grab = 10× momentum of poor grab (timing matters)
- [ ] Smooth ascent at 120 FPS (no stutter, jank)
- [ ] Failure feels fair (user error, not RNG)
- [ ] "Just one more try" compulsion present

### DO NOT Build Until MVP Validated
- ❌ Multiple wave types (sine is enough)
- ❌ Upgrade system (hardcode good physics)
- ❌ Save system (not needed for prototype)
- ❌ Sounds/music (silent is fine)
- ❌ Menus (just restart button)
- ❌ Settings panel (hardcode values)
- ❌ Art/animations (rectangles work)

### Testing Metrics
```javascript
class Metrics {
  track(run) {
    return {
      maxAltitude: run.altitude,
      perfectGrabs: run.perfects,
      accuracy: run.perfects / run.totalGrabs,
      duration: run.time,
      deathReason: run.cause
    }
  }
}

// Balance Goals
// - 70% of players reach 500m
// - Average plateau: 2000-3000m
// - Top 10%: 8000m+
// - Top 1%: 10000m+
```

---

## PHILOSOPHY & APPROACH

> **"Does grabbing the vine feel amazing?"**
> 
> If YES → Build more  
> If NO → No amount of features will fix it

### Core Principles
1. **Mechanics First, Art Later** — Rectangles can be more fun than sprites
2. **Feel > Features** — One perfect mechanic beats ten mediocre ones
3. **Iterate Obsessively** — Change one value, test, repeat
4. **Validate Early** — 8/10 playtesters must say "fun" by Day 5
5. **Kill Bad Ideas Fast** — Honest assessment saves months

### Why This Works
- M4 Max has power for 120 FPS silky physics
- Browser deployment = zero install friction
- Geometric shapes = instant iteration
- Single HTML file = no build complexity
- Vanilla JS = no framework overhead

### When to Add Art
**Only when:**
- [ ] Core mechanic validated as fun (Day 5 success)
- [ ] Players replay without prompting
- [ ] Clear skill improvement over 3-5 runs
- [ ] No physics complaints from testers
- [ ] You've decided to release it

---

## CONTROLS

**MVP:**
- `SPACE` = Grab/Release vine
- `←→` = Move left/right
- `R` = Restart
- `V` = Toggle settings panel (post-MVP)

**Phase 3a:**
- Same as MVP
- Settings panel toggles vine properties

---

## CREDITS

**Original Implementation:**
- Space Monkey: Physics-based climbing game
- Space Elevator by Neal Agarwal: WebGL atmospheric shaders (Phase 3a)

**Technologies:**
- Vanilla JavaScript + Canvas 2D
- WebGL 1.0 for backgrounds (Phase 3a)
- CSS3 for UI
- No external dependencies

---

**Version:** Phase 3a Complete | **Date:** 2025-11-01 | **Status:** ✅ Production Ready

**Stop planning. Start building. See you at 500 meters.** 🚀🐵
