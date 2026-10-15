import { Box3, Group, Vector3 } from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

export const MODEL_MAP: Record<string, string> = {
  'Su-30MKI': '/models/su30mki.glb',
  Rafale: '/models/rafale.glb',
  'MiG-29UPG': '/models/mig29.glb',
  'Mirage-2000': '/models/mirage2000.glb',
  'BrahMos-A': '/models/brahmos.glb',
  'BrahMos-NG': '/models/brahmos.glb',
  'T-90': '/models/t90.glb',
};

export interface ModelAsset {
  gltf: GLTF;
  center: Vector3;
  scale: number;
}

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');
const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);
const assets = new Map<string, Promise<ModelAsset>>();

function load(path: string): Promise<ModelAsset> {
  const existing = assets.get(path);
  if (existing) return existing;

  const pending = loader.loadAsync(path).then((gltf) => {
    const bounds = new Box3().setFromObject(gltf.scene);
    const center = bounds.getCenter(new Vector3());
    const dimensions = bounds.getSize(new Vector3());
    const largestDimension = Math.max(dimensions.x, dimensions.y, dimensions.z, 0.001);
    return { gltf, center, scale: 3.2 / largestDimension };
  }).catch((error: unknown) => {
    assets.delete(path);
    throw error;
  });
  assets.set(path, pending);
  return pending;
}

export function preloadModelAssets(): Promise<void> {
  return Promise.all([...new Set(Object.values(MODEL_MAP))].map((path) => load(path).catch(() => undefined))).then(() => undefined);
}

export function loadModelAsset(path: string): Promise<ModelAsset> {
  return load(path);
}

export function createModelInstance(asset: ModelAsset): Group {
  const scene = clone(asset.gltf.scene);
  const group = new Group();
  // Keep the glTF root transform intact and apply framing from an outer group.
  // Overwriting the glTF root position can offset models whose source scene has a transform.
  group.scale.setScalar(asset.scale);
  group.position.copy(asset.center).multiplyScalar(-asset.scale);
  group.add(scene);
  return group;
}
