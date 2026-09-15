import * as THREE from 'three';
import { MATERIALS, type MaterialKey } from '../materials/materialLibrary';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  gravity: number;
  spin: THREE.Vector3;
}

export class ImpactEffects {
  private particles: Particle[] = [];
  private flash: THREE.PointLight;

  constructor(private scene: THREE.Object3D) {
    this.flash = new THREE.PointLight(0xffffff, 0, 5, 2);
    scene.add(this.flash);
  }

  trigger(materialA: MaterialKey, materialB: MaterialKey, point: THREE.Vector3, impactSpeed: number): void {
    const intensity = Math.min(2.5, Math.max(0.4, impactSpeed / 3));
    this.flash.position.copy(point).add(new THREE.Vector3(0, 0.6, 0));
    this.flash.intensity = 16 * intensity;

    this.spawnFor(materialA, point, intensity, -1);
    this.spawnFor(materialB, point, intensity, 1);
  }

  private spawnFor(key: MaterialKey, point: THREE.Vector3, intensity: number, side: number): void {
    const effect = MATERIALS[key].effect;
    if (effect === 'squash') return;

    let count = 12;
    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;
    let gravity = 5.5;

    if (effect === 'shards') {
      count = 18;
      geometry = new THREE.TetrahedronGeometry(0.09, 0);
      material = new THREE.MeshStandardMaterial({ color: 0xcff6ff, opacity: 0.58, transparent: true, roughness: 0.12, metalness: 0.04, depthWrite: false });
    } else if (effect === 'chips') {
      count = 14;
      geometry = new THREE.BoxGeometry(0.12, 0.04, 0.05);
      material = new THREE.MeshStandardMaterial({ color: 0x9c6435, roughness: 0.9 });
    } else if (effect === 'sparks') {
      count = 20;
      geometry = new THREE.SphereGeometry(0.025, 6, 6);
      material = new THREE.MeshBasicMaterial({ color: 0xffd27a });
      gravity = 2.5;
    } else {
      count = 16;
      geometry = new THREE.DodecahedronGeometry(0.035, 0);
      material = new THREE.MeshStandardMaterial({ color: 0xaaa79a, transparent: true, opacity: 0.72, roughness: 1 });
      gravity = 1.8;
    }

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geometry, material.clone());
      mesh.position.copy(point);
      mesh.position.y += Math.random() * 0.45;
      this.scene.add(mesh);
      const speed = (0.8 + Math.random() * 2.4) * intensity;
      const direction = new THREE.Vector3(
        side * (0.2 + Math.random()),
        0.25 + Math.random() * 1.2,
        (Math.random() - 0.5) * 1.6,
      ).normalize().multiplyScalar(speed);
      this.particles.push({
        mesh,
        velocity: direction,
        life: 0.55 + Math.random() * 0.9,
        maxLife: 1.45,
        gravity,
        spin: new THREE.Vector3((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7),
      });
    }
  }

  update(dt: number): void {
    this.flash.intensity *= Math.pow(0.0004, dt);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.velocity.y -= p.gravity * dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.mesh.rotation.x += p.spin.x * dt;
      p.mesh.rotation.y += p.spin.y * dt;
      p.mesh.rotation.z += p.spin.z * dt;
      const mat = p.mesh.material as THREE.Material & { opacity?: number; transparent?: boolean };
      if (typeof mat.opacity === 'number') {
        mat.transparent = true;
        mat.opacity = Math.max(0, p.life / p.maxLife);
      }
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  dispose(): void {
    this.particles.forEach((p) => {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    });
    this.particles = [];
    this.scene.remove(this.flash);
  }
}
