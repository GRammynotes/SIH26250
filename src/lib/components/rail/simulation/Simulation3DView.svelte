<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import { system } from '../../stores/systemStore.svelte';
  const redToken = Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue('--accent-red').trim().slice(1), 16);

  let container: HTMLDivElement;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let controls: OrbitControls;
  let animationId: number;
  let aircraftMeshes: Map<string, THREE.Group> = new Map();
  let threatMeshes: THREE.Group[] = [];
  let flightPaths: THREE.Line[] = [];

  let { active = false, phase = 'BRIEFING' }: { active?: boolean; phase?: string } = $props();

  // Camera position
  let cameraPosition = $state({ x: 0, y: 80, z: 120 });

  onMount(() => {
    initThreeJS();
    animate();
    updateScene();

    return () => {
      cleanup();
    };
  });

  function initThreeJS() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05080f);
    scene.fog = new THREE.Fog(0x05080f, 100, 300);

    // Camera
    camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 20;
    controls.maxDistance = 200;
    controls.maxPolarAngle = Math.PI / 2 - 0.1;

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const cyanLight = new THREE.PointLight(0x00d4ff, 0.5, 100);
    cyanLight.position.set(0, 30, 0);
    scene.add(cyanLight);

    // Create terrain
    createTerrain();

    // Create grid
    createGrid();

    // Handle resize
    window.addEventListener('resize', onWindowResize);
  }

  function createTerrain() {
    // Create a procedural terrain with elevation
    const geometry = new THREE.PlaneGeometry(200, 200, 50, 50);
    const vertices = geometry.attributes.position.array as Float32Array;

    // Add elevation based on noise-like pattern
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const y = vertices[i + 1];
      // Simple elevation function
      const elevation = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 8 +
                        Math.sin(x * 0.1 + y * 0.1) * 4;
      vertices[i + 2] = elevation;
    }

    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.8,
      metalness: 0.2,
      wireframe: false,
    });

    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);

    // Add wireframe overlay for tactical look
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      wireframe: true,
      transparent: true,
      opacity: 0.1,
    });
    const wireframe = new THREE.Mesh(geometry.clone(), wireframeMaterial);
    wireframe.rotation.x = -Math.PI / 2;
    wireframe.position.y = 0.1;
    scene.add(wireframe);
  }

  function createGrid() {
    const gridHelper = new THREE.GridHelper(200, 40, 0x00d4ff, 0x2a3447);
    gridHelper.position.y = 0.2;
    scene.add(gridHelper);
  }

  function createAircraftMesh(tailNumber: string, position: { lat: number; lng: number }) {
    const group = new THREE.Group();

    // Aircraft body (simplified jet shape)
    const bodyGeometry = new THREE.ConeGeometry(0.5, 3, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x39ff14,
      emissive: 0x39ff14,
      emissiveIntensity: 0.3,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2;
    body.castShadow = true;
    group.add(body);

    // Wings
    const wingGeometry = new THREE.BoxGeometry(4, 0.1, 1);
    const wingMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a3447,
      metalness: 0.8,
    });
    const wings = new THREE.Mesh(wingGeometry, wingMaterial);
    wings.position.z = 0.5;
    wings.castShadow = true;
    group.add(wings);

    // Tail
    const tailGeometry = new THREE.BoxGeometry(1.5, 0.8, 0.1);
    const tail = new THREE.Mesh(tailGeometry, wingMaterial);
    tail.position.set(0, 0.5, -1);
    tail.castShadow = true;
    group.add(tail);

    // Position aircraft (convert lat/lng to 3D coordinates)
    const x = (position.lng - 75) * 10;
    const z = (position.lat - 32) * 10;
    group.position.set(x, 15, z);

    // Add glow effect
    const glowGeometry = new THREE.SphereGeometry(2, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.2,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glow);

    scene.add(group);
    aircraftMeshes.set(tailNumber, group);

    return group;
  }

  function createThreatZone(threat: { type: string; position: { lat: number; lng: number }; radius: number }) {
    const group = new THREE.Group();

    // Threat zone cylinder
    const geometry = new THREE.CylinderGeometry(threat.radius / 5, threat.radius / 5, 30, 32);
    const material = new THREE.MeshStandardMaterial({
      color: redToken,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const cylinder = new THREE.Mesh(geometry, material);
    group.add(cylinder);

    // Top ring
    const ringGeometry = new THREE.RingGeometry(threat.radius / 5 - 0.5, threat.radius / 5, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: redToken,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 15;
    group.add(ring);

    // Position threat zone
    const x = (threat.position.lng - 75) * 10;
    const z = (threat.position.lat - 32) * 10;
    group.position.set(x, 15, z);

    scene.add(group);
    threatMeshes.push(group);

    return group;
  }

  function createFlightPath(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
    const points = [];
    const startX = (from.lng - 75) * 10;
    const startZ = (from.lat - 32) * 10;
    const endX = (to.lng - 75) * 10;
    const endZ = (to.lat - 32) * 10;

    // Create curved flight path
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const x = startX + (endX - startX) * t;
      const z = startZ + (endZ - startZ) * t;
      const y = 15 + Math.sin(t * Math.PI) * 10; // Arc for altitude
      points.push(new THREE.Vector3(x, y, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.6,
    });
    const line = new THREE.Line(geometry, material);
    scene.add(line);
    flightPaths.push(line);

    return line;
  }

  function updateScene() {
    // Clear existing objects
    aircraftMeshes.forEach((mesh) => scene.remove(mesh));
    aircraftMeshes.clear();
    threatMeshes.forEach((mesh) => scene.remove(mesh));
    threatMeshes = [];
    flightPaths.forEach((line) => scene.remove(line));
    flightPaths = [];

    if (!active) return;

    // Add aircraft
    system.aircraft.forEach((aircraft) => {
      createAircraftMesh(aircraft.tailNumber, aircraft.position);
    });

    // Add threat zones
    system.threats.forEach((threat) => {
      createThreatZone(threat);
    });

    // Add flight paths for active missions
    system.activeMissions.forEach((mission) => {
      const aircraft = system.aircraft.find((a) => mission.aircraftIds.includes(a.id));
      if (aircraft && mission.target) {
        createFlightPath(aircraft.position, mission.target);
      }
    });
  }

  function animate() {
    animationId = requestAnimationFrame(animate);

    // Rotate aircraft slowly
    aircraftMeshes.forEach((mesh) => {
      mesh.rotation.y += 0.01;
    });

    // Pulse threat zones
    const time = Date.now() * 0.001;
    threatMeshes.forEach((mesh, index) => {
      const scale = 1 + Math.sin(time * 2 + index) * 0.1;
      mesh.scale.set(scale, 1, scale);
    });

    controls.update();
    renderer.render(scene, camera);
  }

  function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  function cleanup() {
    window.removeEventListener('resize', onWindowResize);
    cancelAnimationFrame(animationId);

    aircraftMeshes.forEach((mesh) => scene.remove(mesh));
    threatMeshes.forEach((mesh) => scene.remove(mesh));
    flightPaths.forEach((line) => scene.remove(line));

    if (renderer) {
      renderer.dispose();
      container.removeChild(renderer.domElement);
    }

    if (controls) {
      controls.dispose();
    }
  }

  // Update scene when system state changes
  $effect(() => {
    if (active) {
      updateScene();
    }
  });

  // Update phase indicator
  $effect(() => {
    // Could add phase-specific visual effects
  });
</script>

<div class="simulation-3d-container" bind:this={container}>
  {#if !active}
    <div class="placeholder">
      <div class="placeholder-content">
        <span class="icon">🎮</span>
        <span class="text">3D SIMULATION VIEW</span>
        <span class="sub">Start the simulation to see 3D visualization</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .simulation-3d-container {
    width: 100%;
    height: 100%;
    position: relative;
    background: var(--bg-base);
    border-radius: 4px;
    overflow: hidden;
  }

  .placeholder {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: linear-gradient(135deg, color-mix(in srgb, var(--accent-cyan) 5%, transparent), rgba(5, 8, 15, 0.95));
  }

  .placeholder-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
  }

  .icon {
    font-size: 48px;
    opacity: 0.5;
  }

  .text {
    color: var(--accent-cyan);
    font: 14px var(--font-mono);
    letter-spacing: 0.12em;
  }

  .sub {
    color: var(--text-muted);
    font: 11px var(--font-sans);
  }
</style>
