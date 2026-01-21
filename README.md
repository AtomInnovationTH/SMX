# Space Monkey 🚀🐵

[![Play Now](https://img.shields.io/badge/🎮_Play-Now-brightgreen?style=for-the-badge)](https://atominnovationth.github.io/SMX/)
[![HTML5 Game](https://img.shields.io/badge/HTML5-Game-E34F26?style=flat&logo=html5&logoColor=white)](https://github.com/AtomInnovationTH/SMX)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**[► Click to play demo in your browser](https://atominnovationth.github.io/SMX/)** - Climb up to 100 kilometers!

---

## 🎮 What is Space Monkey?

A simple game shows how a **low-power ultralight climber** can move up a vibrating tether all the way to space using **non-contact eddy-current grabbing**. 

**Selectable tether-vibration shapes:** sine, square, sawtooth

### Controls
- **SPACE** - Grab/Release the tether
- **← →** - Move left/right  
- **R** - Restart

---

## 🔬 Background

**Tether vibrations** allow distributed power delivery to multiple ultralight climbers (space monkeys) simultaneously. Waste heat is generated inside the tether from eddy currents and radiated to space at **–206 °C**. 

The game mostly takes place in the atmosphere, but the actual trip to **GEO (geostationary Earth orbit)** is 99.9% in the cold of space.

---

## 🔧 Current Prototype

The **current built prototype:**
- ⚖️ Weighs **500 g**
- 🚀 Tested up to **100 kph**
- 🔜 **Next step:** 200 kph with electricity generation from momentum
- 🔋 Sacrificing 10% of speed allows 24/7 operation with minimal battery backup

---

## 📐 Design Guidelines

✅ **Climber has no moving parts** - reliability in extreme environments at speeds up to 1000 kph  
✅ **Must not damage the tether** - no mechanical contact, hot spots, or sparks  
✅ **Must not block the tether** - failure triggers a passive release system  
✅ **Must not heat tether above 450 °C** - graphene oxidation threshold  
✅ **Must not start/stop on tether** - accelerate to cruise speed before attachment

---

## 🛠️ For Developers

Want to understand the code or contribute?

📖 **[DEVELOPERS.md](DEVELOPERS.md)** - Complete technical documentation  
🔗 **[GMX Project](https://github.com/AtomInnovationTH/GMX)** - Graphene tether production system

### Quick Start
```bash
# Just open the HTML file
open index.html

# Or serve locally
python3 -m http.server 8000
```

---

## 📜 License

MIT License - feel free to learn from, modify, or build upon this project!

---

## 🙏 Credits

**Idea based on the work of:** Blaise Gassend, Ph.D.  
**Game based on:** [Space Elevator by Neal Agarwal](https://neal.fun/space-elevator/)  
**Technologies:** Vanilla JavaScript, Canvas 2D, WebGL

---

**Ready to climb?** [🚀 Play Now](https://atominnovationth.github.io/SMX/)
