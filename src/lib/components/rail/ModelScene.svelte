<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import { OrbitControls } from '@threlte/extras';
  import { CatmullRomCurve3, Group, TubeGeometry, Vector3, type ColorRepresentation } from 'three';

  let { modelInstance, trajectory, liveProgress = null, interactive = false, autoRotate = true, rotationOffset = 0, cameraDistance = 8 }: { modelInstance: Group; trajectory: 'ingress' | 'wez' | 'release' | 'egress' | null; liveProgress?: number | null; interactive?: boolean; autoRotate?: boolean; rotationOffset?: number; cameraDistance?: number } = $props();
  let modelGroup: Group | undefined = $state();
  let elapsed = 0;
  const points = [
    new Vector3(-3.6, -0.35, -1.2),
    new Vector3(-2.7, 0.35, -1.4),
    new Vector3(-1.5, 0.75, -1.4),
    new Vector3(-0.4, 0.82, -1.5),
    new Vector3(0.8, 0.18, -1.5),
    new Vector3(3.6, 1.05, -1.1),
    new Vector3(2.7, -0.95, -1.4),
  ];
  const phaseColors: Record<'ingress' | 'wez' | 'release' | 'egress', ColorRepresentation> = {
    ingress: '#00d4ff', wez: '#ffb800', release: '#ff2d55', egress: '#42f58d',
  };
  const arcSegments = [
    { phase: 'ingress', curve: new CatmullRomCurve3(points.slice(0, 3)), color: phaseColors.ingress },
    { phase: 'wez', curve: new CatmullRomCurve3(points.slice(2, 5)), color: phaseColors.wez },
    { phase: 'release', curve: new CatmullRomCurve3(points.slice(3, 6)), color: phaseColors.release },
    { phase: 'egress', curve: new CatmullRomCurve3(points.slice(5, 7)), color: phaseColors.egress },
  ].map((segment) => ({ ...segment, geometry: new TubeGeometry(segment.curve, 28, 0.035, 6, false) }));
  const traceCurve = new CatmullRomCurve3(points.slice(0, 6));

  useTask((delta) => {
    if (!modelGroup) return;
    elapsed += delta;
    if (liveProgress !== null && !interactive) {
      const t = Math.max(0, Math.min(1, liveProgress));
      const location = traceCurve.getPoint(t);
      const tangent = traceCurve.getTangent(t);
      modelGroup.position.copy(location);
      modelGroup.rotation.y = Math.atan2(tangent.x, tangent.z);
      return;
    }
    if (interactive) {
      modelGroup.rotation.y = rotationOffset;
      modelGroup.position.y = 0;
      return;
    }
    if (autoRotate) modelGroup.rotation.y += delta * 0.08;
    modelGroup.position.y = Math.sin(elapsed * Math.PI) * 0.5;
  }, { autoInvalidate: false });
</script>

<T.PerspectiveCamera makeDefault position={[0, 2.5, cameraDistance]} fov={38} />
<T.AmbientLight intensity={0.3} />
<T.DirectionalLight position={[5, 10, 5]} intensity={1.2} color="#ffb800" />
<T.DirectionalLight position={[-5, 5, -5]} intensity={0.4} color="#00d4ff" />
<T.GridHelper args={[20, 20, 0x0a0e1a, 0x0a0e1a]} />
<OrbitControls enableZoom={interactive} enablePan={interactive} {autoRotate} autoRotateSpeed={0.8} />

<T.Group bind:ref={modelGroup}>
  <T is={modelInstance} />
</T.Group>

{#if trajectory}
  {#each arcSegments as segment (segment.phase)}
    <T.Mesh>
      <T is={segment.geometry} />
      <T.MeshBasicMaterial color={segment.color} transparent opacity={trajectory === segment.phase ? 0.95 : 0.36} />
    </T.Mesh>
  {/each}
{/if}
{#if liveProgress !== null}
  <T.Mesh position={traceCurve.getPoint(Math.max(0, Math.min(1, liveProgress)))}>
    <T.SphereGeometry args={[0.11, 12, 12]} />
    <T.MeshBasicMaterial color="#ffffff" />
  </T.Mesh>
{/if}
