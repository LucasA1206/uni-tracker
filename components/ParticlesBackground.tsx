"use client";

import Particles from "./Particles";

export default function ParticlesBackground() {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Particles
        particleColors={["#ffffff", "#ffffff"]}
        particleCount={200}
        particleSpread={10}
        speed={0.1}
        particleBaseSize={100}
        moveParticlesOnHover={true}
        alphaParticles={false}
        disableRotation={false}
      />
      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/60 via-slate-950/40 to-black/80" />
    </div>
  );
}
