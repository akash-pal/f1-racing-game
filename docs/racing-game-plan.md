# Browser F1 Racing Game — Project Plan

## Vision
A hobby/learning side project: a browser-based racing game that starts as a
retro 2D top-down prototype and evolves into a 3D F1 car navigating real
circuits (starting with Monaco). Priorities are learning game dev, strong
visualization, and eventual showcase value — not shipping speed. Target
platforms: browser first, then desktop and mobile. Logitech G29 wheel +
pedals should eventually work as an input device, with keyboard as fallback.

## Tech Stack
- **Build tool:** Vite + React + TypeScript
- **3D rendering:** Three.js via React Three Fiber (R3F)
- **Physics:** Rapier via `@react-three/rapier`
- **State:** Zustand
- **Helpers:** `@react-three/drei` (environments, controls, loaders)
- **Deployment:** Vercel or GitHub Pages

## Reference Projects (study before building)
- **Drift & Drive** — `Yashparmar1125/Car-Game-ThreeJS`. R3F + Rapier +
  Zustand + Drei. Good example of production-style component architecture
  (Car.jsx, Scene.jsx, UI.jsx, Experience.jsx).
- **threejs_car_demo** — `cconsta1/threejs_car_demo`. Plain Three.js +
  Cannon-es. Simpler reference for keyboard-controlled vehicle physics.

## Phases

### Phase 0 — Environment Setup
Scaffold a Vite + React + TS project. Install `three`, `@react-three/fiber`,
`@react-three/drei`, `@react-three/rapier`, `zustand`. Init git, push to
GitHub.
**Done when:** a blank R3F canvas renders in the browser.

### Phase 1 — Fundamentals
Get comfortable with the R3F scene graph (Canvas, camera, lights, meshes)
and Rapier basics (RigidBody, Physics world, colliders). Read through the
reference repos' vehicle-controller code.
**Done when:** you can build a box that moves with keyboard input.

### Phase 2 — 2D / Top-Down Prototype
Flat track, box or sprite car, arrow-key/WASD controls (accelerate, brake,
steer) using plain velocity/rotation math — no physics engine yet. Basic
track-boundary logic.
**Done when:** the car drives a full loop and stays in bounds.

### Phase 3 — 3D Driving Physics
Swap to a 3D car model (placeholder GLB is fine). Integrate Rapier for real
acceleration, braking, and handbrake behavior. Add a chase camera.
**Done when:** the car has real momentum, slip, and braking feel.

### Phase 4 — Real Circuit (Monaco)
Approximate the Monaco circuit centerline and width from reference track
maps, extrude into a drivable mesh, add curbs, barriers, and a starting
grid.
**Done when:** a full lap of Monaco is drivable start to finish.

### Phase 5 — G29 Wheel & Pedal Support
Use the browser's Gamepad API to detect the G29. Map the wheel axis to
steering and pedals to throttle/brake. Keep keyboard as a fallback.
**Done when:** the car can be driven end-to-end on the G29 alone.

### Phase 6 — Cross-Platform Polish
Add touch controls for mobile, responsive canvas/UI scaling, and
performance tuning (LOD, texture compression, draw-call reduction).
**Done when:** it runs at an acceptable frame rate on desktop and mobile
browsers.

### Phase 7 — Deploy & Showcase
Deploy to Vercel or GitHub Pages. Write a README covering the tech stack,
record a demo GIF, link it from your GitHub profile.
**Done when:** a public, playable URL exists.

## How to Use This in Claude Code
1. Save this file as `PLAN.md` in your project root.
2. Open a terminal in that folder and run `claude`.
3. Say: "Read PLAN.md and start Phase 0."
4. Work through phases in order — test after each one before moving on,
   and commit to git at each "Done when" milestone.
5. Check off phases below as you complete them, so future sessions know
   where you left off.

## Current Status
- [x] Phase 0 — Environment Setup (Vite + React 19 + R3F v9 + Rapier v2)
- [x] Phase 1 — Fundamentals (Sandbox scene: Rapier ground + keyboard-driven box)
- [x] Phase 2 — 2D / Top-Down Prototype (arcade model; now on the Silverstone outline)
- [x] Phase 3 — 3D Driving Physics (Rapier raycast vehicle + chase camera)
- [~] Phase 4 — Real Circuit: **stylised Silverstone** built (`src/track/silverstone.ts`),
      shared by 2D and 3D, with kerbs + barriers (trimesh colliders) either side.
      Monaco not attempted; the track is a hand-authored Silverstone-shaped loop.
- [ ] Phase 5 — G29 Wheel & Pedal Support (mouse steering added as a stopgap)
- [ ] Phase 6 — Cross-Platform Polish
- [ ] Phase 7 — Deploy & Showcase

### Notes for next session
- `npm run dev` then open the Browser pane; `npm test` runs vitest (22 tests).
- Scene switch = `useGameStore.mode`: Sandbox / 2D / 3D (buttons top-left).
- Controls: W/↑ throttle, S/↓ brake+reverse, A/D **or mouse X** steer, Space handbrake,
  R reset, P pause. `STEER_SIGN` in `lib/constants.ts` is the one knob for steer polarity.
- Track: `src/track/silverstone.ts` (centre-line anchors + curve + sample/finish-line
  helpers), `src/track/trackMesh.ts` (road/kerb/wall geometry), `Track2D` / `Track3D`.
  `node --experimental-strip-types scripts/renderTrackSvg.ts /tmp/t.svg` dumps the layout.
- Car model: `src/car/F1Car.tsx` — low-poly F1-2026 body (from the reference USDZ),
  used in both scenes; wheels are separate, driven by the Rapier vehicle controller.
- Verified: geometry (no self-intersection), steering polarity (right = clockwise),
  barriers contain the car, both scenes render. NOT yet verified live: a full timed lap,
  chase-cam feel, mouse-steer feel (browser preview keeps auto-hiding — needs a human).
- Tuning ideas: track width (`HALF_WIDTH`), barrier height (`Track3D` `WALL_HEIGHT`),
  2D car scale (`Car2D` `CAR_SCALE`), light should follow the car for shadows on a big map.
