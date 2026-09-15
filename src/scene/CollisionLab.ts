import * as THREE from 'three';
import { MATERIALS, createThreeMaterial, effectiveMaterialRestitution, type MaterialKey } from '../materials/materialLibrary';
import { solveCollision, kineticEnergy, type CollisionMode, type CollisionResult } from '../physics/collision';
import { ImpactEffects } from '../effects/ImpactEffects';

export interface LabParameters {
  mode: CollisionMode;
  massA: number;
  massB: number;
  velocityA: number;
  velocityB: number;
  materialA: MaterialKey;
  materialB: MaterialKey;
  partialRestitution: number;
  autoMaterialRestitution: boolean;
  timeScale: number;
  showVectors: boolean;
  showLabels: boolean;
}

interface BodyVisual {
  group: THREE.Group;
  sphere: THREE.Mesh;
  arrow: THREE.ArrowHelper;
  mass: number;
  x: number;
  velocity: number;
  spin: number;
  squash: number;
  materialKey: MaterialKey;
  label: 'A' | 'B';
}

export interface LabSnapshot {
  momentum: number;
  energy: number;
  collisionCount: number;
  restitution: number;
  lastResult: CollisionResult | null;
  velocityA: number;
  velocityB: number;
}

export class CollisionLab {
  readonly root = new THREE.Group();
  private env = new THREE.Group();
  private bodies: BodyVisual[] = [];
  private effects: ImpactEffects;
  private radius = 0.72;
  private leftBound = -6.3;
  private rightBound = 6.3;
  private collisionActive = false;
  private stuck = false;
  private paused = false;
  private collisionCount = 0;
  private lastResult: CollisionResult | null = null;
  private onCollision?: (snapshot: LabSnapshot) => void;
  private labels: HTMLDivElement[] = [];
  private camera?: THREE.Camera;
  private labelLayer?: HTMLElement;

  constructor(private scene: THREE.Scene, private params: LabParameters) {
    scene.add(this.root);
    this.effects = new ImpactEffects(this.root);
    this.buildEnvironment();
    this.buildBodies();
  }

  attachLabels(camera: THREE.Camera, labelLayer: HTMLElement): void {
    this.camera = camera;
    this.labelLayer = labelLayer;
    this.rebuildLabels();
  }

  setOnCollision(cb: (snapshot: LabSnapshot) => void): void {
    this.onCollision = cb;
  }

  setParameters(params: LabParameters): void {
    const materialsChanged = params.materialA !== this.params.materialA || params.materialB !== this.params.materialB;
    this.params = { ...params };
    if (materialsChanged) this.buildBodies();
    this.setVectorVisibility(params.showVectors);
    this.setLabelVisibility(params.showLabels);
  }

  getRestitution(): number {
    if (this.params.mode === 'elastic') return 1;
    if (this.params.mode === 'inelastic') return 0;
    return this.params.autoMaterialRestitution
      ? effectiveMaterialRestitution(this.params.materialA, this.params.materialB)
      : this.params.partialRestitution;
  }

  getSnapshot(): LabSnapshot {
    const momentum = this.bodies.reduce((sum, b) => sum + b.mass * b.velocity, 0);
    const energy = this.bodies.reduce((sum, b) => sum + kineticEnergy(b.mass, b.velocity), 0);
    return {
      momentum,
      energy,
      collisionCount: this.collisionCount,
      restitution: this.getRestitution(),
      lastResult: this.lastResult,
      velocityA: this.bodies[0]?.velocity ?? 0,
      velocityB: this.bodies[1]?.velocity ?? 0,
    };
  }

  togglePause(): boolean {
    this.paused = !this.paused;
    return this.paused;
  }

  setPaused(value: boolean): void {
    this.paused = value;
  }

  reset(): void {
    this.collisionActive = false;
    this.stuck = false;
    this.collisionCount = 0;
    this.lastResult = null;
    const [a, b] = this.bodies;
    a.mass = this.params.massA;
    a.x = -4.35;
    a.velocity = this.params.velocityA;
    a.spin = 0;
    a.squash = 0;
    b.mass = this.params.massB;
    b.x = 4.35;
    b.velocity = this.params.velocityB;
    b.spin = 0;
    b.squash = 0;
    this.syncVisuals();
  }

  update(dt: number): void {
    const scaled = Math.min(0.05, dt) * this.params.timeScale;
    if (!this.paused) {
      if (this.stuck) {
        const [a, b] = this.bodies;
        const dx = a.velocity * scaled;
        a.x += dx;
        b.x = a.x + this.radius * 2;
        a.spin -= dx / this.radius;
        b.spin -= dx / this.radius;
        this.bounceStuckPair();
      } else {
        for (const body of this.bodies) {
          const dx = body.velocity * scaled;
          body.x += dx;
          body.spin -= dx / this.radius;
          this.bounceWall(body);
          body.squash = Math.max(0, body.squash - scaled * 4.2);
        }
        this.solveIfNeeded();
      }
    }
    this.effects.update(dt);
    this.syncVisuals();
  }

  setEnvironmentVisible(visible: boolean): void {
    this.env.visible = visible;
  }

  private buildEnvironment(): void {
    this.env.clear();
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(15.5, 0.35, 4.6),
      new THREE.MeshStandardMaterial({ color: 0xd9d4c8, roughness: 0.86, metalness: 0.02 }),
    );
    floor.position.y = -0.18;
    floor.receiveShadow = true;
    this.env.add(floor);

    const lane = new THREE.Mesh(
      new THREE.BoxGeometry(14.5, 0.08, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x1d1e1c, roughness: 0.8, metalness: 0.04 }),
    );
    lane.position.y = 0.045;
    lane.receiveShadow = true;
    this.env.add(lane);

    const lineMat = new THREE.MeshStandardMaterial({ color: 0xf2eee4, roughness: 0.7 });
    for (let x = -5.5; x <= 5.5; x += 1.1) {
      const mark = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.025, 0.06), lineMat);
      mark.position.set(x, 0.1, 0);
      this.env.add(mark);
    }

    const railMat = new THREE.MeshStandardMaterial({ color: 0x6f716d, roughness: 0.65, metalness: 0.32 });
    for (const z of [-1.25, 1.25]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.18, 0.11), railMat);
      rail.position.set(0, 0.35, z);
      rail.castShadow = true;
      this.env.add(rail);
    }
    this.root.add(this.env);
  }

  private createBody(label: 'A' | 'B', key: MaterialKey, x: number, mass: number, velocity: number): BodyVisual {
    const group = new THREE.Group();
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(this.radius, 36, 24), createThreeMaterial(key, label === 'A' ? 'a' : 'b'));
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    group.add(sphere);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(this.radius * 0.72, 0.035, 8, 28),
      new THREE.MeshBasicMaterial({ color: label === 'A' ? 0xe6fbff : 0xffefe6, transparent: true, opacity: 0.72 }),
    );
    ring.rotation.y = Math.PI / 2;
    group.add(ring);

    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(),
      1,
      label === 'A' ? 0x0f6b82 : 0xb64d35,
      0.26,
      0.15,
    );
    this.root.add(arrow);
    this.root.add(group);

    return { group, sphere, arrow, mass, x, velocity, spin: 0, squash: 0, materialKey: key, label };
  }

  private disposeBody(body: BodyVisual): void {
    this.root.remove(body.group);
    this.root.remove(body.arrow);
    body.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose()); else obj.material.dispose();
      }
    });
    body.arrow.line.geometry.dispose();
    (body.arrow.line.material as THREE.Material).dispose();
    body.arrow.cone.geometry.dispose();
    (body.arrow.cone.material as THREE.Material).dispose();
  }

  private buildBodies(): void {
    this.bodies.forEach((b) => this.disposeBody(b));
    this.bodies = [
      this.createBody('A', this.params.materialA, -4.35, this.params.massA, this.params.velocityA),
      this.createBody('B', this.params.materialB, 4.35, this.params.massB, this.params.velocityB),
    ];
    this.rebuildLabels();
    this.setVectorVisibility(this.params.showVectors);
    this.reset();
  }

  private rebuildLabels(): void {
    this.labels.forEach((el) => el.remove());
    this.labels = [];
    if (!this.labelLayer) return;
    for (const body of this.bodies) {
      const el = document.createElement('div');
      el.className = `object-label label-${body.label.toLowerCase()}`;
      this.labelLayer.appendChild(el);
      this.labels.push(el);
    }
  }

  private setVectorVisibility(value: boolean): void {
    this.bodies.forEach((b) => { b.arrow.visible = value; });
  }

  private setLabelVisibility(value: boolean): void {
    this.labels.forEach((el) => el.classList.toggle('hidden', !value));
  }

  private bounceWall(body: BodyVisual): void {
    if (body.x - this.radius < this.leftBound) {
      body.x = this.leftBound + this.radius;
      body.velocity = Math.abs(body.velocity) * 0.94;
    }
    if (body.x + this.radius > this.rightBound) {
      body.x = this.rightBound - this.radius;
      body.velocity = -Math.abs(body.velocity) * 0.94;
    }
  }

  private bounceStuckPair(): void {
    const [a, b] = this.bodies;
    if (a.x - this.radius < this.leftBound) {
      a.x = this.leftBound + this.radius;
      b.x = a.x + this.radius * 2;
      a.velocity = Math.abs(a.velocity) * 0.94;
      b.velocity = a.velocity;
    }
    if (b.x + this.radius > this.rightBound) {
      b.x = this.rightBound - this.radius;
      a.x = b.x - this.radius * 2;
      b.velocity = -Math.abs(b.velocity) * 0.94;
      a.velocity = b.velocity;
    }
  }

  private solveIfNeeded(): void {
    const [a, b] = this.bodies;
    const distance = b.x - a.x;
    const touching = distance <= this.radius * 2;
    const approaching = a.velocity > b.velocity;
    if (!touching || !approaching) {
      if (distance > this.radius * 2 + 0.03) this.collisionActive = false;
      return;
    }
    if (this.collisionActive) return;
    this.collisionActive = true;

    const midpoint = (a.x + b.x) / 2;
    a.x = midpoint - this.radius;
    b.x = midpoint + this.radius;
    const impactSpeed = Math.abs(a.velocity - b.velocity);
    const result = solveCollision({
      m1: a.mass,
      m2: b.mass,
      u1: a.velocity,
      u2: b.velocity,
      restitution: this.getRestitution(),
      mode: this.params.mode,
    });
    a.velocity = result.v1;
    b.velocity = result.v2;
    this.lastResult = result;
    this.collisionCount += 1;
    if (this.params.mode === 'inelastic') this.stuck = true;

    const point = new THREE.Vector3(midpoint, this.radius, 0);
    this.effects.trigger(a.materialKey, b.materialKey, point, impactSpeed);
    if (MATERIALS[a.materialKey].effect === 'squash') a.squash = Math.min(0.24, impactSpeed * 0.026);
    if (MATERIALS[b.materialKey].effect === 'squash') b.squash = Math.min(0.24, impactSpeed * 0.026);
    this.onCollision?.(this.getSnapshot());
  }

  private syncVisuals(): void {
    this.bodies.forEach((body, index) => {
      body.group.position.set(body.x, this.radius + 0.1, 0);
      body.sphere.rotation.z = body.spin;
      const squash = body.squash;
      body.group.scale.set(1 + squash * 0.7, 1 - squash, 1 + squash * 0.35);

      const p = body.mass * body.velocity;
      const dir = new THREE.Vector3(Math.sign(p || 1), 0, 0);
      body.arrow.position.set(body.x, this.radius + 1.1, 0);
      body.arrow.setDirection(dir);
      body.arrow.setLength(Math.max(0.35, Math.min(3.2, Math.abs(p) * 0.22 + 0.38)), 0.28, 0.15);

      const label = this.labels[index];
      if (label && this.camera && this.labelLayer) {
        const world = new THREE.Vector3();
        body.group.getWorldPosition(world);
        world.y += 1.35;
        world.project(this.camera);
        const rect = this.labelLayer.getBoundingClientRect();
        const x = (world.x * 0.5 + 0.5) * rect.width;
        const y = (-world.y * 0.5 + 0.5) * rect.height;
        label.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
        label.innerHTML = `<strong>Benda ${body.label}</strong><span>${MATERIALS[body.materialKey].label}</span><span>m ${body.mass.toFixed(1)} kg · v ${body.velocity.toFixed(2)} m/s</span>`;
      }
    });
  }

  dispose(): void {
    this.bodies.forEach((b) => this.disposeBody(b));
    this.effects.dispose();
    this.labels.forEach((el) => el.remove());
    this.scene.remove(this.root);
  }
}
