export type CollisionMode = 'elastic' | 'partial' | 'inelastic';

export interface CollisionInput {
  m1: number;
  m2: number;
  u1: number;
  u2: number;
  restitution: number;
  mode: CollisionMode;
}

export interface CollisionResult {
  v1: number;
  v2: number;
  momentumBefore: number;
  momentumAfter: number;
  energyBefore: number;
  energyAfter: number;
  energyRetained: number;
}

export function kineticEnergy(mass: number, velocity: number): number {
  return 0.5 * mass * velocity * velocity;
}

export function solveCollision(input: CollisionInput): CollisionResult {
  const { m1, m2, u1, u2, mode } = input;
  const e = mode === 'elastic' ? 1 : mode === 'inelastic' ? 0 : Math.min(0.99, Math.max(0.01, input.restitution));

  const momentumBefore = m1 * u1 + m2 * u2;
  const energyBefore = kineticEnergy(m1, u1) + kineticEnergy(m2, u2);

  let v1: number;
  let v2: number;

  if (mode === 'inelastic') {
    const common = momentumBefore / (m1 + m2);
    v1 = common;
    v2 = common;
  } else {
    v1 = (m1 * u1 + m2 * u2 - m2 * e * (u1 - u2)) / (m1 + m2);
    v2 = (m1 * u1 + m2 * u2 + m1 * e * (u1 - u2)) / (m1 + m2);
  }

  const momentumAfter = m1 * v1 + m2 * v2;
  const energyAfter = kineticEnergy(m1, v1) + kineticEnergy(m2, v2);

  return {
    v1,
    v2,
    momentumBefore,
    momentumAfter,
    energyBefore,
    energyAfter,
    energyRetained: energyBefore > 0 ? (energyAfter / energyBefore) * 100 : 100,
  };
}
