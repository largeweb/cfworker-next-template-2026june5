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

function createAgentMesh(color: number): THREE.Group {
  const group = new THREE.Group();
  
  const bodyGeo = new THREE.CylinderGeometry(0.35, 0.4, 1.0, 12);
  const bodyMat = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 1 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.5;
  group.add(body);
  
  const headGeo = new THREE.SphereGeometry(0.3, 12, 12);
  const headMat = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 1 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.15;
  group.add(head);
  
  return group;
}

const LERP_DURATION = 1500;

export default function World3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const rafRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const keysRef = useRef<Set<string>>(new Set());
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const agentMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const signMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const foodMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const lerpPositionsRef = useRef<Map<string, { fromX: number; fromY: number; toX: number; toY: number; startTime: number }>>(new Map());
  const cameraInitRef = useRef(false);
  const sceneReadyRef = useRef(false);

  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [worldData, setWorldData] = useState<WorldData | null>(null);
  const [meshCount, setMeshCount] = useState(0);

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    sessionStorage.removeItem("world3d-yaw");
  }, []);

  const fetchWorld = useCallback(async () => {
    try {
      const res = await fetch("/api/world");
      if (!res.ok) throw new Error("Failed to fetch world");
      const data = await res.json() as WorldData;
      const agents = Array.isArray(data.agents) ? data.agents : [];
      const signs = Array.isArray(data.signs) ? data.signs : [];
      const food = Array.isArray(data.food) ? data.food : [];
      setWorldData({ ...data, agents, signs, food });
      setTick(data.tick || 0);
      setLoading(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorld();
    const interval = setInterval(fetchWorld, 10000);
    return () => clearInterval(interval);
  }, [fetchWorld]);

  useEffect(() => {
    if (!containerRef.current) return;
    mountedRef.current = true;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 50, 120);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(16, 3, 20);
    cameraRef.current = camera;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "low-power" });
    } catch {
      setError("WebGL not supported");
      return;
    }
    renderer.setPixelRatio(1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const groundGeo = new THREE.PlaneGeometry(40, 40);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x8bc34a });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(16, 0, 16);
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(40, 40, 0x6b8e4a, 0x6b8e4a);
    gridHelper.position.set(16, 0.02, 16);
    scene.add(gridHelper);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(20, 30, 20);
    scene.add(dirLight);

    sceneReadyRef.current = true;

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
    };
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      mountedRef.current = false;
      sceneReadyRef.current = false;
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      renderer.dispose();
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !sceneReadyRef.current || !worldData) return;

    const agents = worldData.agents;
    const signs = worldData.signs;
    const food = worldData.food || [];
    const now = Date.now();

    if (!cameraInitRef.current && agents.length > 0 && cameraRef.current) {
      cameraInitRef.current = true;
      const idleAgent = agents.find(a => a.status === "idle" || a.status === "thinking") || agents[0];
      const cam = cameraRef.current;
      cam.position.set(idleAgent.x + 0.5, 2.5, idleAgent.y + 0.5 + 6);
      cam.lookAt(idleAgent.x + 0.5, 1, idleAgent.y + 0.5);
      const direction = new THREE.Vector3();
      cam.getWorldDirection(direction);
      yawRef.current = Math.atan2(direction.x, direction.z);
      pitchRef.current = Math.asin(-direction.y);
    }

    const agentIds = new Set(agents.map(a => a.id));
    for (const [id, mesh] of agentMeshesRef.current) {
      if (!agentIds.has(id)) {
        scene.remove(mesh);
        agentMeshesRef.current.delete(id);
        lerpPositionsRef.current.delete(id);
      }
    }

    for (const agent of agents) {
      let group = agentMeshesRef.current.get(agent.id);
      if (!group) {
        group = createAgentMesh(getAgentColor(agent));
        scene.add(group);
        agentMeshesRef.current.set(agent.id, group);
        lerpPositionsRef.current.set(agent.id, {
          fromX: agent.x, fromY: agent.y,
          toX: agent.x, toY: agent.y,
          startTime: now,
        });
      } else {
        const lerp = lerpPositionsRef.current.get(agent.id);
        if (lerp && (lerp.toX !== agent.x || lerp.toY !== agent.y)) {
          const elapsed = Math.min(1, (now - lerp.startTime) / LERP_DURATION);
          const currentX = lerp.fromX + (lerp.toX - lerp.fromX) * elapsed;
          const currentY = lerp.fromY + (lerp.toY - lerp.fromY) * elapsed;
          lerpPositionsRef.current.set(agent.id, {
            fromX: currentX, fromY: currentY,
            toX: agent.x, toY: agent.y,
            startTime: now,
          });
        }
      }

      const isDowned = agent.status === "downed";
      const isSleeping = agent.status === "sleeping";
      const opacity = isDowned ? 0.4 : isSleeping ? 0.6 : 1;
      group.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshLambertMaterial) {
          child.material.opacity = opacity;
        }
      });
      group.rotation.z = isDowned ? Math.PI / 2 : 0;
      group.userData.isDowned = isDowned;
    }

    const signIds = new Set(signs.map(s => s.id));
    for (const [id, group] of signMeshesRef.current) {
      if (!signIds.has(id)) {
        scene.remove(group);
        signMeshesRef.current.delete(id);
      }
    }

    for (const sign of signs) {
      if (!signMeshesRef.current.has(sign.id)) {
        const group = new THREE.Group();

        const postGeo = new THREE.BoxGeometry(0.12, 1.0, 0.12);
        const postMat = new THREE.MeshLambertMaterial({ color: 0x5a4020 });
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.y = 0.5;
        group.add(post);

        const plaqueGeo = new THREE.BoxGeometry(0.9, 0.5, 0.1);
        const plaqueMat = new THREE.MeshLambertMaterial({ color: 0xc8a060 });
        const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
        plaque.position.y = 1.1;
        group.add(plaque);

        group.position.set(sign.x + 0.5, 0, sign.y + 0.5);
        scene.add(group);
        signMeshesRef.current.set(sign.id, group);
      }
    }

    const foodIds = new Set(food.map(f => f.id));
    for (const [id, mesh] of foodMeshesRef.current) {
      if (!foodIds.has(id)) {
        scene.remove(mesh);
        foodMeshesRef.current.delete(id);
      }
    }

    for (const f of food) {
      if (!foodMeshesRef.current.has(f.id)) {
        const geo = new THREE.SphereGeometry(0.3, 12, 12);
        const mat = new THREE.MeshLambertMaterial({ color: 0xff6b6b });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(f.x + 0.5, 0.3, f.y + 0.5);
        scene.add(mesh);
        foodMeshesRef.current.set(f.id, mesh);
      }
    }

    setMeshCount(agentMeshesRef.current.size + signMeshesRef.current.size + foodMeshesRef.current.size);
  }, [worldData]);

  useEffect(() => {
    if (!sceneReadyRef.current) return;

    const animate = () => {
      if (!mountedRef.current) return;

      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const renderer = rendererRef.current;

      if (!scene || !camera || !renderer) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      if (document.hidden) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const now = Date.now();
      for (const [id, lerp] of lerpPositionsRef.current) {
        const mesh = agentMeshesRef.current.get(id);
        if (!mesh) continue;

        const elapsed = now - lerp.startTime;
        const t = Math.min(1, elapsed / LERP_DURATION);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const posX = lerp.fromX + (lerp.toX - lerp.fromX) * eased;
        const posY = lerp.fromY + (lerp.toY - lerp.fromY) * eased;

        if (mesh.userData.isDowned) {
          mesh.position.set(posX + 0.5, 0.4, posY + 0.5);
        } else {
          mesh.position.set(posX + 0.5, 0, posY + 0.5);
        }
      }

      if (!paused) {
        const speed = 0.12;
        const forward = new THREE.Vector3(Math.sin(yawRef.current), 0, Math.cos(yawRef.current));
        const right = new THREE.Vector3(Math.sin(yawRef.current + Math.PI / 2), 0, Math.cos(yawRef.current + Math.PI / 2));

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
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
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
    const forward = new THREE.Vector3(Math.sin(yawRef.current), 0, Math.cos(yawRef.current));
    const right = new THREE.Vector3(Math.sin(yawRef.current + Math.PI / 2), 0, Math.cos(yawRef.current + Math.PI / 2));
    camera.position.add(forward.clone().multiplyScalar(dy * 0.3));
    camera.position.add(right.clone().multiplyScalar(dx * 0.3));
  }, []);

  const handleMobileLook = useCallback((dx: number, dy: number) => {
    yawRef.current -= dx * 0.01;
    pitchRef.current -= dy * 0.01;
    pitchRef.current = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitchRef.current));
    if (cameraRef.current) {
      cameraRef.current.rotation.order = "YXZ";
      cameraRef.current.rotation.y = yawRef.current;
      cameraRef.current.rotation.x = pitchRef.current;
    }
  }, []);

  const agentCount = worldData?.agents?.length ?? 0;

  return (
    <div className="fixed inset-0 bg-black">
      <div ref={containerRef} className="w-full h-full" onClick={handleCanvasClick} />

      <div className="absolute top-4 left-4 text-white text-sm bg-black/60 px-3 py-2 rounded font-mono">
        <div>tick: {tick}</div>
        <div>agents: {agentCount}</div>
        <div>meshes: {meshCount}</div>
        {loading && <div className="text-yellow-300">loading...</div>}
        {error && <div className="text-red-300">{error}</div>}
      </div>

      {isMobile && !paused && (
        <>
          <div className="absolute bottom-24 left-4 flex flex-col gap-2">
            <button
              className="w-14 h-14 bg-white/40 rounded-lg flex items-center justify-center text-white text-2xl active:bg-white/60 font-bold"
              onTouchStart={() => handleMobileMove(0, 1)}
            >
              W
            </button>
            <div className="flex gap-2">
              <button
                className="w-14 h-14 bg-white/40 rounded-lg flex items-center justify-center text-white text-2xl active:bg-white/60 font-bold"
                onTouchStart={() => handleMobileMove(-1, 0)}
              >
                A
              </button>
              <button
                className="w-14 h-14 bg-white/40 rounded-lg flex items-center justify-center text-white text-2xl active:bg-white/60 font-bold"
                onTouchStart={() => handleMobileMove(1, 0)}
              >
                D
              </button>
            </div>
            <button
              className="w-14 h-14 bg-white/40 rounded-lg flex items-center justify-center text-white text-2xl active:bg-white/60 font-bold"
              onTouchStart={() => handleMobileMove(0, -1)}
            >
              S
            </button>
          </div>

          <div
            className="absolute bottom-24 right-4 w-36 h-36 bg-white/30 rounded-lg border-2 border-white/50"
            onTouchMove={(e) => {
              const touch = e.touches[0];
              const rect = e.currentTarget.getBoundingClientRect();
              const dx = (touch.clientX - rect.left - rect.width / 2) / (rect.width / 2);
              const dy = (touch.clientY - rect.top - rect.height / 2) / (rect.height / 2);
              handleMobileLook(dx * 5, dy * 5);
            }}
          >
            <div className="w-full h-full flex items-center justify-center text-white/60 text-sm font-bold">
              LOOK
            </div>
          </div>

          <button
            className="absolute top-4 right-4 bg-white/40 px-4 py-2 rounded text-white font-bold"
            onClick={() => setPaused(true)}
          >
            PAUSE
          </button>
        </>
      )}

      {!isMobile && !paused && (
        <div className="absolute bottom-4 left-4 text-white/80 text-sm">
          WASD move • Mouse look • ESC pause
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
