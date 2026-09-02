"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { ViewProps } from "../WorldCanvas";
import { getAgentSymbolType } from "@/lib/world-types";
import type { Agent, Sign } from "@/lib/world-types";

const CELL_SIZE = 2;

const AGENT_COLORS: Record<string, number> = {
  clay: 0xc4644a,
  thorn: 0x4a4540,
  reed: 0xb8b0a0,
  cole: 0x3d3835,
  sol: 0xd4a54a,
};

const AGENT_COLORS_CSS: Record<string, string> = {
  clay: "#c4644a",
  thorn: "#4a4540",
  reed: "#b8b0a0",
  cole: "#3d3835",
  sol: "#d4a54a",
};

function detectSoftwareGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return true;
    const debugInfo = (gl as WebGLRenderingContext).getExtension("WEBGL_debug_renderer_info");
    if (!debugInfo) return true;
    const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    const isSoftware = /swiftshader|llvmpipe|software|mesa/i.test(renderer);
    canvas.remove();
    return isSoftware;
  } catch {
    return true;
  }
}

function Canvas2DFallback({
  world,
  animState,
  selectedAgent,
  onSelectAgent,
  onSelectSign,
}: ViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.8);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const animTimeRef = useRef(0);
  const animFrameRef = useRef(0);
  const mountedRef = useRef(true);

  const CELL = 24;
  const gridWidth = world.grid.width * CELL;
  const gridHeight = world.grid.height * CELL;

  useEffect(() => {
    mountedRef.current = true;
    
    const draw = () => {
      if (!mountedRef.current) return;
      if (document.hidden) {
        animFrameRef.current = requestAnimationFrame(draw);
        return;
      }
      
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || !containerRef.current) {
        animFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      ctx.fillStyle = "#d9e6cf";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(pan.x + rect.width / 2, pan.y + rect.height / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-gridWidth / 2, -gridHeight / 2);

      ctx.fillStyle = "#8b9a6b";
      ctx.fillRect(-10, -10, gridWidth + 20, gridHeight + 20);

      ctx.strokeStyle = "#6b7c5a";
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= world.grid.width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * CELL, 0);
        ctx.lineTo(x * CELL, gridHeight);
        ctx.stroke();
      }
      for (let y = 0; y <= world.grid.height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * CELL);
        ctx.lineTo(gridWidth, y * CELL);
        ctx.stroke();
      }

      world.signs.forEach((sign) => {
        ctx.fillStyle = "#5c4a32";
        ctx.fillRect(sign.x * CELL + CELL / 2 - 4, sign.y * CELL + CELL / 2 - 3, 8, 6);
        ctx.fillRect(sign.x * CELL + CELL / 2 - 1, sign.y * CELL + CELL / 2 + 3, 2, 4);
      });

      animTimeRef.current += 0.02;
      world.agents.forEach((agent) => {
        const pos = animState.agentPositions.get(agent.id) || { x: agent.x, y: agent.y };
        const symbolType = getAgentSymbolType(agent.symbol);
        const color = AGENT_COLORS_CSS[symbolType] || "#c4644a";
        const breathOffset = Math.sin(animTimeRef.current + agent.id.charCodeAt(0)) * 1;
        
        ctx.fillStyle = color;
        ctx.globalAlpha = agent.status === "sleeping" ? 0.5 : 1;
        ctx.fillRect(
          pos.x * CELL + CELL / 2 - 6,
          pos.y * CELL + CELL / 2 - 8 + breathOffset,
          12,
          16
        );
        ctx.globalAlpha = 1;
        
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          agent.name.charAt(0).toUpperCase(),
          pos.x * CELL + CELL / 2,
          pos.y * CELL + CELL / 2 + breathOffset
        );
      });

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      mountedRef.current = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [world, animState, pan, zoom, gridWidth, gridHeight]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.3, Math.min(2.5, z * delta)));
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { x: pan.x, y: pan.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pan]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    setPan({
      x: panStart.current.x + (e.clientX - dragStart.current.x),
      y: panStart.current.y + (e.clientY - dragStart.current.y),
    });
  }, [isDragging]);

  const handlePointerUp = useCallback(() => setIsDragging(false), []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const worldX = ((e.clientX - rect.left - cx - pan.x) / zoom + gridWidth / 2) / (gridWidth / world.grid.width);
    const worldY = ((e.clientY - rect.top - cy - pan.y) / zoom + gridHeight / 2) / (gridHeight / world.grid.height);

    for (const agent of world.agents) {
      const pos = animState.agentPositions.get(agent.id) || { x: agent.x, y: agent.y };
      if (Math.abs(pos.x - worldX) < 0.5 && Math.abs(pos.y - worldY) < 0.5) {
        onSelectAgent(agent);
        return;
      }
    }
    for (const sign of world.signs) {
      if (Math.abs(sign.x - worldX) < 0.5 && Math.abs(sign.y - worldY) < 0.5) {
        onSelectSign(sign);
        return;
      }
    }
  }, [world, animState, pan, zoom, gridWidth, gridHeight, onSelectAgent, onSelectSign]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing relative"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onClick={handleClick}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute top-2 left-2 bg-[#d9e6cf]/80 px-2 py-1 rounded text-xs text-[#4a5a3d]">
        2D Mode (Software GL detected)
      </div>
      <div className="absolute bottom-4 left-4 flex gap-2">
        <button
          onClick={() => setZoom((z) => Math.min(2.5, z * 1.2))}
          className="w-8 h-8 bg-[#d9e6cf] border border-[#6b7c5a] rounded text-[#4a5a3d]"
        >+</button>
        <button
          onClick={() => setZoom((z) => Math.max(0.3, z / 1.2))}
          className="w-8 h-8 bg-[#d9e6cf] border border-[#6b7c5a] rounded text-[#4a5a3d]"
        >−</button>
      </div>
    </div>
  );
}

interface ThreeState {
  renderer: InstanceType<typeof import("three").WebGLRenderer>;
  scene: InstanceType<typeof import("three").Scene>;
  camera: InstanceType<typeof import("three").PerspectiveCamera>;
  controls: InstanceType<typeof import("three/examples/jsm/controls/OrbitControls.js").OrbitControls>;
  agentMeshes: Map<string, InstanceType<typeof import("three").Mesh>>;
  signGroups: Map<string, InstanceType<typeof import("three").Group>>;
  geometries: InstanceType<typeof import("three").BufferGeometry>[];
  materials: InstanceType<typeof import("three").Material>[];
}

export default function ThreeView(props: ViewProps) {
  const { world, animState, onSelectAgent, onSelectSign } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [useFallback, setUseFallback] = useState<boolean | null>(null);
  const threeRef = useRef<ThreeState | null>(null);
  const animFrameRef = useRef(0);
  const mountedRef = useRef(true);
  const worldRef = useRef(world);
  const animStateRef = useRef(animState);
  const onSelectAgentRef = useRef(onSelectAgent);
  const onSelectSignRef = useRef(onSelectSign);

  worldRef.current = world;
  animStateRef.current = animState;
  onSelectAgentRef.current = onSelectAgent;
  onSelectSignRef.current = onSelectSign;

  useEffect(() => {
    const isSoftware = detectSoftwareGL();
    setUseFallback(isSoftware);
  }, []);

  useEffect(() => {
    if (useFallback !== false) return;
    if (!containerRef.current) return;

    mountedRef.current = true;
    let three: ThreeState | null = null;

    const init = async () => {
      if (!containerRef.current || !mountedRef.current) return;

      try {
        const THREE = await import("three");
        const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");

        if (!containerRef.current || !mountedRef.current) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color("#d9e6cf");
        scene.fog = new THREE.Fog("#d9e6cf", 50, 150);

        const camera = new THREE.PerspectiveCamera(
          60,
          containerRef.current.clientWidth / containerRef.current.clientHeight,
          0.1,
          1000
        );
        camera.position.set(30, 40, 30);
        camera.lookAt(worldRef.current.grid.width / 2, 0, worldRef.current.grid.height / 2);

        const renderer = new THREE.WebGLRenderer({
          antialias: false,
          powerPreference: "low-power",
        });
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        renderer.setPixelRatio(1);
        renderer.shadowMap.enabled = false;
        containerRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI / 2.2;
        controls.minDistance = 10;
        controls.maxDistance = 100;
        controls.target.set(
          (worldRef.current.grid.width * CELL_SIZE) / 2,
          0,
          (worldRef.current.grid.height * CELL_SIZE) / 2
        );

        const geometries: InstanceType<typeof THREE.BufferGeometry>[] = [];
        const materials: InstanceType<typeof THREE.Material>[] = [];

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xfff5e6, 0.6);
        sunLight.position.set(50, 80, 30);
        scene.add(sunLight);

        const groundGeometry = new THREE.PlaneGeometry(
          worldRef.current.grid.width * CELL_SIZE + 20,
          worldRef.current.grid.height * CELL_SIZE + 20
        );
        geometries.push(groundGeometry);
        const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x8b9a6b });
        materials.push(groundMaterial);
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(
          (worldRef.current.grid.width * CELL_SIZE) / 2,
          -0.1,
          (worldRef.current.grid.height * CELL_SIZE) / 2
        );
        scene.add(ground);

        const gridHelper = new THREE.GridHelper(
          Math.max(worldRef.current.grid.width, worldRef.current.grid.height) * CELL_SIZE,
          Math.max(worldRef.current.grid.width, worldRef.current.grid.height),
          0x6b7c5a,
          0x9aa888
        );
        gridHelper.position.set(
          (worldRef.current.grid.width * CELL_SIZE) / 2,
          0.01,
          (worldRef.current.grid.height * CELL_SIZE) / 2
        );
        scene.add(gridHelper);

        const agentMeshes = new Map<string, InstanceType<typeof THREE.Mesh>>();
        const signGroups = new Map<string, InstanceType<typeof THREE.Group>>();

        three = {
          renderer,
          scene,
          camera,
          controls,
          agentMeshes,
          signGroups,
          geometries,
          materials,
        };
        threeRef.current = three;

        if (mountedRef.current) {
          setIsLoading(false);
        }

        const animate = () => {
          if (!mountedRef.current || !three) return;
          
          animFrameRef.current = requestAnimationFrame(animate);
          
          if (document.hidden) return;

          three.controls.update();

          const currentWorld = worldRef.current;
          const currentAnim = animStateRef.current;

          currentWorld.agents.forEach((agent) => {
            let mesh = three!.agentMeshes.get(agent.id);
            if (!mesh) {
              const symbolType = getAgentSymbolType(agent.symbol);
              const geometry = new THREE.BoxGeometry(1.2, 1.8, 1.2);
              three!.geometries.push(geometry);
              const material = new THREE.MeshBasicMaterial({
                color: AGENT_COLORS[symbolType] ?? 0xc4644a,
              });
              three!.materials.push(material);
              mesh = new THREE.Mesh(geometry, material);
              mesh.userData = { agentId: agent.id };
              three!.scene.add(mesh);
              three!.agentMeshes.set(agent.id, mesh);
            }

            const pos = currentAnim.agentPositions.get(agent.id) || { x: agent.x, y: agent.y };
            mesh.position.x = pos.x * CELL_SIZE + CELL_SIZE / 2;
            mesh.position.z = pos.y * CELL_SIZE + CELL_SIZE / 2;
            
            const breathOffset = Math.sin(Date.now() * 0.002 + agent.id.charCodeAt(0)) * 0.05;
            
            if (agent.status === "sleeping") {
              mesh.scale.y = 0.5;
              mesh.position.y = 0.45;
            } else {
              mesh.scale.y = 1;
              mesh.position.y = 0.9 + breathOffset;
            }

            if (currentAnim.thinkingAgents.has(agent.id)) {
              mesh.rotation.y = Date.now() * 0.001;
            }
          });

          currentWorld.signs.forEach((sign) => {
            let group = three!.signGroups.get(sign.id);
            if (!group) {
              const postGeometry = new THREE.BoxGeometry(0.2, 1.5, 0.2);
              three!.geometries.push(postGeometry);
              const postMaterial = new THREE.MeshBasicMaterial({ color: 0x5c4a32 });
              three!.materials.push(postMaterial);
              const post = new THREE.Mesh(postGeometry, postMaterial);
              post.position.y = 0.75;

              const signGeometry = new THREE.BoxGeometry(1, 0.6, 0.1);
              three!.geometries.push(signGeometry);
              const signMaterial = new THREE.MeshBasicMaterial({ color: 0x8b6f47 });
              three!.materials.push(signMaterial);
              const signMesh = new THREE.Mesh(signGeometry, signMaterial);
              signMesh.position.y = 1.5;

              group = new THREE.Group();
              group.add(post);
              group.add(signMesh);
              group.userData = { signId: sign.id };
              three!.scene.add(group);
              three!.signGroups.set(sign.id, group);
            }
            group.position.set(
              sign.x * CELL_SIZE + CELL_SIZE / 2,
              0,
              sign.y * CELL_SIZE + CELL_SIZE / 2
            );
          });

          three.renderer.render(three.scene, three.camera);
        };
        animate();

        const handleResize = () => {
          if (!containerRef.current || !three) return;
          three.camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
          three.camera.updateProjectionMatrix();
          three.renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        };
        window.addEventListener("resize", handleResize);

        const handleClick = (e: MouseEvent) => {
          if (!three) return;
          const threeModule = THREE;
          const rect = three.renderer.domElement.getBoundingClientRect();
          const mouse = new threeModule.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
          );

          const raycaster = new threeModule.Raycaster();
          raycaster.setFromCamera(mouse, three.camera);
          const intersects = raycaster.intersectObjects(three.scene.children, true);

          for (const hit of intersects) {
            const obj = hit.object;
            if (obj.userData?.agentId) {
              const agent = worldRef.current.agents.find((a) => a.id === obj.userData.agentId);
              if (agent) onSelectAgentRef.current(agent);
              return;
            }
            let parent = obj.parent;
            while (parent) {
              if (parent.userData?.signId) {
                const sign = worldRef.current.signs.find((s) => s.id === parent!.userData.signId);
                if (sign) onSelectSignRef.current(sign);
                return;
              }
              parent = parent.parent;
            }
          }
        };
        renderer.domElement.addEventListener("click", handleClick);

        return () => {
          window.removeEventListener("resize", handleResize);
          renderer.domElement.removeEventListener("click", handleClick);
        };

      } catch (err) {
        console.error("Failed to load Three.js:", err);
        if (mountedRef.current) {
          setUseFallback(true);
        }
      }
    };

    init();

    return () => {
      mountedRef.current = false;
      
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
      
      if (three) {
        three.controls.dispose();
        three.geometries.forEach((g) => g.dispose());
        three.materials.forEach((m) => m.dispose());
        three.renderer.dispose();
        three.renderer.forceContextLoss();
        if (containerRef.current && three.renderer.domElement.parentNode === containerRef.current) {
          containerRef.current.removeChild(three.renderer.domElement);
        }
        three.scene.clear();
      }
      
      threeRef.current = null;
    };
  }, [useFallback]);

  if (useFallback === null) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#d9e6cf]">
        <div className="text-[var(--garden-olive-dark)] font-serif italic">
          Checking graphics...
        </div>
      </div>
    );
  }

  if (useFallback) {
    return <Canvas2DFallback {...props} />;
  }

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#d9e6cf]">
        <div className="text-[var(--garden-olive-dark)] font-serif italic">
          Growing the garden...
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
}
