"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import * as THREE from "three";

interface Agent {
  id: string;
  name: string;
  x: number;
  y: number;
  energy: number;
  health: number;
  status: string;
  symbol?: string;
  appearance?: string;
}

interface Sign {
  id: string;
  x: number;
  y: number;
  text: string;
  author?: string;
  tick?: number;
}

interface Food {
  id: string;
  x: number;
  y: number;
  type?: string;
}

interface WorldData {
  tick: number;
  grid: { width: number; height: number } | unknown[][];
  agents: Agent[];
  signs: Sign[];
  food?: Food[];
}

const AGENT_COLORS: Record<string, number> = {
  clay: 0xa05030,
  thorn: 0x3a5a3a,
  reed: 0xc9a040,
  cole: 0x404040,
  sol: 0xe0b020,
  unknown: 0x888888,
};

function getAgentColor(agent: Agent): number {
  const appearance = agent.appearance;
  if (appearance) {
    const lower = appearance.toLowerCase();
    if (lower.includes("brown") || lower.includes("clay")) return AGENT_COLORS.clay;
    if (lower.includes("green") || lower.includes("thorn")) return AGENT_COLORS.thorn;
    if (lower.includes("gold") || lower.includes("reed")) return AGENT_COLORS.reed;
    if (lower.includes("charcoal") || lower.includes("cole") || lower.includes("dark")) return AGENT_COLORS.cole;
    if (lower.includes("yellow") || lower.includes("sol")) return AGENT_COLORS.sol;
  }
  const name = (agent.name || agent.id || "").toLowerCase();
  if (name.includes("clay")) return AGENT_COLORS.clay;
  if (name.includes("thorn")) return AGENT_COLORS.thorn;
  if (name.includes("reed")) return AGENT_COLORS.reed;
  if (name.includes("cole")) return AGENT_COLORS.cole;
  if (name.includes("sol")) return AGENT_COLORS.sol;
  return AGENT_COLORS.unknown;
}

function getGridDimensions(grid: { width: number; height: number } | unknown[][]): { width: number; height: number } {
  if (Array.isArray(grid)) {
    return { width: grid.length, height: (grid[0] as unknown[] | undefined)?.length ?? 0 };
  }
  return { width: grid.width, height: grid.height };
}

const LERP_DURATION = 1500;

export default function World3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rafRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const keysRef = useRef<Set<string>>(new Set());
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const agentMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const signMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const foodMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const lerpPositionsRef = useRef<Map<string, { fromX: number; fromY: number; toX: number; toY: number; startTime: number }>>(new Map());
  const prevPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const worldDataRef = useRef<WorldData | null>(null);

  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const fetchWorld = useCallback(async () => {
    try {
      const res = await fetch("/api/world");
      if (!res.ok) throw new Error("Failed to fetch world");
      const data = await res.json() as WorldData;
      worldDataRef.current = data;
      setTick(data.tick);
      setLoading(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    fetchWorld();
    const interval = setInterval(fetchWorld, 10000);
    return () => clearInterval(interval);
  }, [fetchWorld]);

  useEffect(() => {
    const storedYaw = sessionStorage.getItem("world3d-yaw");
    if (storedYaw) yawRef.current = parseFloat(storedYaw);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    mountedRef.current = true;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 30, 80);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(16, 2, 16);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const groundGeo = new THREE.PlaneGeometry(32, 32);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x8bc34a });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(16, 0, 16);
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(32, 32, 0x6b8e4a, 0x6b8e4a);
    gridHelper.position.set(16, 0.01, 16);
    scene.add(gridHelper);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        document.exitPointerLock();
        setPaused(true);
        return;
      }
      keysRef.current.add(e.key.toLowerCase());
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== renderer.domElement) return;
      yawRef.current -= e.movementX * 0.002;
      pitchRef.current -= e.movementY * 0.002;
      pitchRef.current = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitchRef.current));
      sessionStorage.setItem("world3d-yaw", yawRef.current.toString());
    };
    window.addEventListener("mousemove", handleMouseMove);

    const handleVisibility = () => {
      if (document.hidden) {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      mountedRef.current = false;
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;

    const animate = () => {
      if (!mountedRef.current || document.hidden) return;

      const world = worldDataRef.current;
      if (world) {
        const now = Date.now();

        for (const agent of world.agents) {
          const prev = prevPositionsRef.current.get(agent.id);
          const current = lerpPositionsRef.current.get(agent.id);

          if (!prev) {
            lerpPositionsRef.current.set(agent.id, {
              fromX: agent.x, fromY: agent.y,
              toX: agent.x, toY: agent.y,
              startTime: now,
            });
          } else if (prev.x !== agent.x || prev.y !== agent.y) {
            const elapsed = current ? Math.min(1, (now - current.startTime) / LERP_DURATION) : 1;
            const currentX = current ? current.fromX + (current.toX - current.fromX) * elapsed : prev.x;
            const currentY = current ? current.fromY + (current.toY - current.fromY) * elapsed : prev.y;
            lerpPositionsRef.current.set(agent.id, {
              fromX: currentX, fromY: currentY,
              toX: agent.x, toY: agent.y,
              startTime: now,
            });
          }
          prevPositionsRef.current.set(agent.id, { x: agent.x, y: agent.y });
        }

        const agentIds = new Set(world.agents.map(a => a.id));
        for (const [id, mesh] of agentMeshesRef.current) {
          if (!agentIds.has(id)) {
            scene.remove(mesh);
            agentMeshesRef.current.delete(id);
          }
        }

        for (const agent of world.agents) {
          const lerp = lerpPositionsRef.current.get(agent.id);
          let posX = agent.x;
          let posY = agent.y;
          if (lerp) {
            const elapsed = now - lerp.startTime;
            const t = Math.min(1, elapsed / LERP_DURATION);
            posX = lerp.fromX + (lerp.toX - lerp.fromX) * t;
            posY = lerp.fromY + (lerp.toY - lerp.fromY) * t;
          }

          let mesh = agentMeshesRef.current.get(agent.id);
          if (!mesh) {
            const geo = new THREE.CapsuleGeometry(0.3, 0.6, 4, 8);
            const mat = new THREE.MeshLambertMaterial({ color: getAgentColor(agent) });
            mesh = new THREE.Mesh(geo, mat);
            scene.add(mesh);
            agentMeshesRef.current.set(agent.id, mesh);
          }

          mesh.position.set(posX + 0.5, 0.6, posY + 0.5);
          mesh.visible = agent.status !== "downed";
          if (agent.status === "sleeping") {
            (mesh.material as THREE.MeshLambertMaterial).opacity = 0.5;
            (mesh.material as THREE.MeshLambertMaterial).transparent = true;
          } else {
            (mesh.material as THREE.MeshLambertMaterial).opacity = 1;
            (mesh.material as THREE.MeshLambertMaterial).transparent = false;
          }

          const prev = prevPositionsRef.current.get(agent.id);
          if (prev && (prev.x !== agent.x || prev.y !== agent.y)) {
            const dx = agent.x - prev.x;
            const dy = agent.y - prev.y;
            if (dx !== 0 || dy !== 0) {
              mesh.rotation.y = Math.atan2(dx, dy);
            }
          }
        }

        const signIds = new Set(world.signs.map(s => s.id));
        for (const [id, group] of signMeshesRef.current) {
          if (!signIds.has(id)) {
            scene.remove(group);
            signMeshesRef.current.delete(id);
          }
        }

        for (const sign of world.signs) {
          let group = signMeshesRef.current.get(sign.id);
          if (!group) {
            group = new THREE.Group();

            const postGeo = new THREE.BoxGeometry(0.1, 0.6, 0.1);
            const postMat = new THREE.MeshLambertMaterial({ color: 0x5a4020 });
            const post = new THREE.Mesh(postGeo, postMat);
            post.position.y = 0.3;
            group.add(post);

            const plaqueGeo = new THREE.BoxGeometry(0.6, 0.3, 0.05);
            const plaqueMat = new THREE.MeshLambertMaterial({ color: 0xc8a060 });
            const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
            plaque.position.y = 0.7;
            group.add(plaque);

            group.position.set(sign.x + 0.5, 0, sign.y + 0.5);
            scene.add(group);
            signMeshesRef.current.set(sign.id, group);
          }
        }

        const food = world.food || [];
        const foodIds = new Set(food.map(f => f.id));
        for (const [id, mesh] of foodMeshesRef.current) {
          if (!foodIds.has(id)) {
            scene.remove(mesh);
            foodMeshesRef.current.delete(id);
          }
        }

        for (const f of food) {
          let mesh = foodMeshesRef.current.get(f.id);
          if (!mesh) {
            const geo = new THREE.SphereGeometry(0.15, 8, 8);
            const mat = new THREE.MeshLambertMaterial({ color: 0xff6b6b });
            mesh = new THREE.Mesh(geo, mat);
            scene.add(mesh);
            foodMeshesRef.current.set(f.id, mesh);
          }
          mesh.position.set(f.x + 0.5, 0.15, f.y + 0.5);
        }
      }

      if (!paused) {
        const speed = 0.15;
        const forward = new THREE.Vector3(
          Math.sin(yawRef.current),
          0,
          Math.cos(yawRef.current)
        );
        const right = new THREE.Vector3(
          Math.sin(yawRef.current + Math.PI / 2),
          0,
          Math.cos(yawRef.current + Math.PI / 2)
        );

        if (keysRef.current.has("w")) camera.position.add(forward.clone().multiplyScalar(speed));
        if (keysRef.current.has("s")) camera.position.add(forward.clone().multiplyScalar(-speed));
        if (keysRef.current.has("a")) camera.position.add(right.clone().multiplyScalar(-speed));
        if (keysRef.current.has("d")) camera.position.add(right.clone().multiplyScalar(speed));

        camera.rotation.order = "YXZ";
        camera.rotation.y = yawRef.current;
        camera.rotation.x = pitchRef.current;
      }

      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [paused]);

  const handleResume = useCallback(() => {
    setPaused(false);
    if (rendererRef.current?.domElement) {
      rendererRef.current.domElement.requestPointerLock();
    }
  }, []);

  const handleCanvasClick = useCallback(() => {
    if (!paused && rendererRef.current?.domElement) {
      rendererRef.current.domElement.requestPointerLock();
    }
  }, [paused]);

  const handleMobileMove = useCallback((dx: number, dy: number) => {
    const camera = cameraRef.current;
    if (!camera) return;
    const forward = new THREE.Vector3(
      Math.sin(yawRef.current),
      0,
      Math.cos(yawRef.current)
    );
    const right = new THREE.Vector3(
      Math.sin(yawRef.current + Math.PI / 2),
      0,
      Math.cos(yawRef.current + Math.PI / 2)
    );
    camera.position.add(forward.clone().multiplyScalar(dy * 0.2));
    camera.position.add(right.clone().multiplyScalar(dx * 0.2));
  }, []);

  const handleMobileLook = useCallback((dx: number, dy: number) => {
    yawRef.current -= dx * 0.01;
    pitchRef.current -= dy * 0.01;
    pitchRef.current = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitchRef.current));
    sessionStorage.setItem("world3d-yaw", yawRef.current.toString());

    if (cameraRef.current) {
      cameraRef.current.rotation.order = "YXZ";
      cameraRef.current.rotation.y = yawRef.current;
      cameraRef.current.rotation.x = pitchRef.current;
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-black">
      <div ref={containerRef} className="w-full h-full" onClick={handleCanvasClick} />

      <div className="absolute top-4 left-4 text-white text-sm bg-black/50 px-3 py-2 rounded">
        <div>Tick: {tick}</div>
        {loading && <div className="text-yellow-300">Loading...</div>}
        {error && <div className="text-red-300">{error}</div>}
      </div>

      {isMobile && !paused && (
        <>
          <div className="absolute bottom-24 left-4 flex flex-col gap-2">
            <button
              className="w-12 h-12 bg-white/30 rounded-lg flex items-center justify-center text-white text-2xl active:bg-white/50"
              onTouchStart={() => handleMobileMove(0, 1)}
            >
              ↑
            </button>
            <div className="flex gap-2">
              <button
                className="w-12 h-12 bg-white/30 rounded-lg flex items-center justify-center text-white text-2xl active:bg-white/50"
                onTouchStart={() => handleMobileMove(-1, 0)}
              >
                ←
              </button>
              <button
                className="w-12 h-12 bg-white/30 rounded-lg flex items-center justify-center text-white text-2xl active:bg-white/50"
                onTouchStart={() => handleMobileMove(1, 0)}
              >
                →
              </button>
            </div>
            <button
              className="w-12 h-12 bg-white/30 rounded-lg flex items-center justify-center text-white text-2xl active:bg-white/50"
              onTouchStart={() => handleMobileMove(0, -1)}
            >
              ↓
            </button>
          </div>

          <div
            className="absolute bottom-24 right-4 w-32 h-32 bg-white/20 rounded-lg"
            onTouchMove={(e) => {
              const touch = e.touches[0];
              const rect = e.currentTarget.getBoundingClientRect();
              const dx = (touch.clientX - rect.left - rect.width / 2) / (rect.width / 2);
              const dy = (touch.clientY - rect.top - rect.height / 2) / (rect.height / 2);
              handleMobileLook(dx * 5, dy * 5);
            }}
          >
            <div className="w-full h-full flex items-center justify-center text-white/50 text-xs">
              LOOK
            </div>
          </div>

          <button
            className="absolute top-4 right-4 bg-white/30 px-4 py-2 rounded text-white"
            onClick={() => setPaused(true)}
          >
            Pause
          </button>
        </>
      )}

      {!isMobile && !paused && (
        <div className="absolute bottom-4 left-4 text-white/70 text-xs">
          WASD to move • Mouse to look • ESC to pause
        </div>
      )}

      {paused && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[var(--garden-paper)] border border-[var(--garden-dust)] rounded-lg p-6 text-center max-w-sm mx-4">
            <h2 className="text-xl font-bold text-[var(--garden-ink)] mb-4">Paused</h2>
            <p className="text-[var(--garden-ink-light)] mb-6 text-sm">
              {isMobile ? "Use on-screen controls to navigate" : "Use WASD to move and mouse to look around"}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleResume}
                className="w-full bg-[var(--garden-olive)] text-white py-3 rounded-lg font-medium hover:bg-[var(--garden-olive)]/80 transition-colors"
              >
                Resume
              </button>
              <Link
                href="/world"
                className="w-full bg-[var(--garden-paper-dark)] text-[var(--garden-ink)] py-3 rounded-lg font-medium hover:bg-[var(--garden-dust)] transition-colors block"
              >
                Navigate back to 2D
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
