import * as THREE from 'three';

export type MaterialKey = 'rubber' | 'wood' | 'glass' | 'stone' | 'metal';

export interface MaterialPreset {
  key: MaterialKey;
  label: string;
  density: number;
  restitution: number;
  friction: number;
  breakThreshold: number;
  effect: 'squash' | 'chips' | 'shards' | 'dust' | 'sparks';
  description: string;
}

export const MATERIALS: Record<MaterialKey, MaterialPreset> = {
  rubber: {
    key: 'rubber', label: 'Karet', density: 1100, restitution: 0.86, friction: 0.82,
    breakThreshold: 999, effect: 'squash', description: 'Elastis, memantul kuat, permukaan matte.',
  },
  wood: {
    key: 'wood', label: 'Kayu', density: 720, restitution: 0.42, friction: 0.62,
    breakThreshold: 7.2, effect: 'chips', description: 'Serat terlihat, pantulan sedang, dapat menghasilkan serpihan.',
  },
  glass: {
    key: 'glass', label: 'Kaca', density: 2500, restitution: 0.28, friction: 0.35,
    breakThreshold: 4.6, effect: 'shards', description: 'Transparan dan rapuh, dapat menghasilkan efek pecahan.',
  },
  stone: {
    key: 'stone', label: 'Batu', density: 2700, restitution: 0.18, friction: 0.78,
    breakThreshold: 10, effect: 'dust', description: 'Kasar, berat, pantulan rendah, menghasilkan debu saat benturan kuat.',
  },
  metal: {
    key: 'metal', label: 'Logam', density: 7850, restitution: 0.58, friction: 0.28,
    breakThreshold: 999, effect: 'sparks', description: 'Metallic dan reflektif, menghasilkan percikan pada benturan kuat.',
  },
};

function canvasTexture(draw: (ctx: CanvasRenderingContext2D, size: number) => void): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function woodTexture(): THREE.CanvasTexture {
  const texture = canvasTexture((ctx, size) => {
    const gradient = ctx.createLinearGradient(0, 0, size, 0);
    gradient.addColorStop(0, '#6c3d1e');
    gradient.addColorStop(0.5, '#b9793f');
    gradient.addColorStop(1, '#5b3219');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    ctx.lineWidth = 4;
    for (let y = 0; y < size; y += 18) {
      ctx.strokeStyle = `rgba(48,20,7,${0.16 + (y % 54) / 400})`;
      ctx.beginPath();
      for (let x = 0; x <= size; x += 8) {
        const yy = y + Math.sin(x * 0.035 + y * 0.02) * 7;
        if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 10; i++) {
      const x = (i * 71 + 53) % size;
      const y = (i * 113 + 97) % size;
      ctx.strokeStyle = 'rgba(50,18,5,.34)';
      ctx.beginPath();
      ctx.ellipse(x, y, 34, 12, 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
  texture.repeat.set(2.2, 1.4);
  return texture;
}

function stoneTexture(): THREE.CanvasTexture {
  return canvasTexture((ctx, size) => {
    ctx.fillStyle = '#72716b';
    ctx.fillRect(0, 0, size, size);
    const image = ctx.getImageData(0, 0, size, size);
    const data = image.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = Math.floor((Math.random() - 0.5) * 55);
      data[i] = Math.max(0, Math.min(255, data[i] + n));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
    }
    ctx.putImageData(image, 0, 0);
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(35,35,32,${0.05 + Math.random() * 0.12})`;
      ctx.beginPath();
      ctx.arc(Math.random() * size, Math.random() * size, 1 + Math.random() * 7, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function createThreeMaterial(key: MaterialKey, accent: 'a' | 'b'): THREE.Material {
  if (key === 'glass') {
    // Transparansi standar jauh lebih ringan daripada transmission PBR, terutama pada HP.
    return new THREE.MeshStandardMaterial({
      color: accent === 'a' ? 0xa9ecff : 0xffd8b8,
      roughness: 0.08,
      metalness: 0.06,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });
  }

  if (key === 'metal') {
    return new THREE.MeshStandardMaterial({
      color: accent === 'a' ? 0xbac7d6 : 0xd2b4a3,
      roughness: 0.25,
      metalness: 0.92,
    });
  }

  if (key === 'rubber') {
    return new THREE.MeshStandardMaterial({
      color: accent === 'a' ? 0x176b87 : 0xc2573e,
      roughness: 0.86,
      metalness: 0.02,
    });
  }

  if (key === 'wood') {
    return new THREE.MeshStandardMaterial({
      map: woodTexture(),
      roughness: 0.7,
      metalness: 0.02,
    });
  }

  return new THREE.MeshStandardMaterial({
    map: stoneTexture(),
    color: accent === 'a' ? 0xc6c3b5 : 0xb5aaa1,
    roughness: 0.94,
    metalness: 0,
  });
}

export function effectiveMaterialRestitution(a: MaterialKey, b: MaterialKey): number {
  return Math.sqrt(MATERIALS[a].restitution * MATERIALS[b].restitution);
}
