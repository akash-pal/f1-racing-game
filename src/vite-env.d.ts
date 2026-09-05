/// <reference types="vite/client" />

// GLB/GLTF model imports (used from Phase 4 onward).
declare module '*.glb' {
  const src: string
  export default src
}
declare module '*.gltf' {
  const src: string
  export default src
}
