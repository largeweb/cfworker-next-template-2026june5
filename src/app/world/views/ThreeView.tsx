"use client";

import { useEffect, useRef, useState } from "react";
import type { ViewProps } from "../WorldCanvas";
import { getAgentSymbolType } from "@/lib/world-types";

const CELL_SIZE = 2;

const AGENT_COLORS: Record<string, number> = {
  clay: 0xc4644a,
  thorn: 0x4a4540,
  reed: 0xb8b0a0,
  cole: 0x3d3835,
  sol: 0xd4a54a,
};

export default function ThreeView({
  world,
  animState,
  onSelectAgent,
  onSelectSign,
}: ViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);
  const rendererRef = useRef<{ dispose: () => void } | null>(null);
  const animationIdRef = useRef<number>(0);

  useEffect(() => {
    mountedRef.current = true;
    let renderer: InstanceType<typeof import("three").WebGLRenderer> | null = null;
    let scene: InstanceType<typeof import("three").Scene> | null = null;
    let controls: InstanceType<typeof import("three/examples/jsm/controls/OrbitControls.js").OrbitControls> | null = null;
    const geometries: InstanceType<typeof import("three").BufferGeometry>[] = [];
    const materials: InstanceType<typeof import("three").Material>[] = [];
    let handleResize: (() => void) | null = null;
    let handleClick: ((e: MouseEvent) => void) | null = null;

    const init = async () => {
      if (!containerRef.current || !mountedRef.current) return;

      try {
        const THREE = await import("three");
        const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");

        if (!containerRef.current || !mountedRef.current) return;

        const sceneLocal = new THREE.Scene();
        scene = sceneLocal;
        sceneLocal.background = new THREE.Color("#d9e6cf");
        sceneLocal.fog = new THREE.Fog("#d9e6cf", 50, 150);

        const camera = new THREE.PerspectiveCamera(
          60,
          containerRef.current.clientWidth / containerRef.current.clientHeight,
          0.1,
          1000
        );
        camera.position.set(30, 40, 30);
        camera.lookAt(world.grid.width / 2, 0, world.grid.height / 2);

        renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "default" });
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI / 2.2;
        controls.minDistance = 10;
        controls.maxDistance = 100;
        controls.target.set(
          (world.grid.width * CELL_SIZE) / 2,
          0,
          (world.grid.height * CELL_SIZE) / 2
        );

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        sceneLocal.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xfff5e6, 1);
        sunLight.position.set(50, 80, 30);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 200;
        sunLight.shadow.camera.left = -50;
        sunLight.shadow.camera.right = 50;
        sunLight.shadow.camera.top = 50;
        sunLight.shadow.camera.bottom = -50;
        sceneLocal.add(sunLight);

        const groundGeometry = new THREE.PlaneGeometry(
          world.grid.width * CELL_SIZE + 20,
          world.grid.height * CELL_SIZE + 20
        );
        geometries.push(groundGeometry);
        const groundMaterial = new THREE.MeshStandardMaterial({
          color: 0x8b9a6b,
          roughness: 0.9,
          metalness: 0,
        });
        materials.push(groundMaterial);
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(
          (world.grid.width * CELL_SIZE) / 2,
          -0.1,
          (world.grid.height * CELL_SIZE) / 2
        );
        ground.receiveShadow = true;
        sceneLocal.add(ground);

        const gridHelper = new THREE.GridHelper(
          Math.max(world.grid.width, world.grid.height) * CELL_SIZE,
          Math.max(world.grid.width, world.grid.height),
          0x6b7c5a,
          0x9aa888
        );
        gridHelper.position.set(
          (world.grid.width * CELL_SIZE) / 2,
          0.01,
          (world.grid.height * CELL_SIZE) / 2
        );
        sceneLocal.add(gridHelper);

        for (let i = 0; i < 15; i++) {
          const treeHeight = 3 + Math.random() * 4;
          const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.25, treeHeight * 0.4, 6);
          geometries.push(trunkGeometry);
          const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x5c4a32 });
          materials.push(trunkMaterial);
          const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);

          const leavesGeometry = new THREE.ConeGeometry(1.5, treeHeight * 0.6, 6);
          geometries.push(leavesGeometry);
          const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x4a5a3d });
          materials.push(leavesMaterial);
          const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
          leaves.position.y = treeHeight * 0.4;

          const tree = new THREE.Group();
          tree.add(trunk);
          tree.add(leaves);

          const edgeX = Math.random() > 0.5;
          const x = edgeX
            ? Math.random() > 0.5
              ? -3 - Math.random() * 5
              : world.grid.width * CELL_SIZE + 3 + Math.random() * 5
            : Math.random() * world.grid.width * CELL_SIZE;
          const z = edgeX
            ? Math.random() * world.grid.height * CELL_SIZE
            : Math.random() > 0.5
              ? -3 - Math.random() * 5
              : world.grid.height * CELL_SIZE + 3 + Math.random() * 5;

          tree.position.set(x, treeHeight * 0.2, z);
          tree.castShadow = true;
          sceneLocal.add(tree);
        }

        const agentMeshes = new Map<string, InstanceType<typeof THREE.Mesh>>();

        world.agents.forEach((agent) => {
          const symbolType = getAgentSymbolType(agent.symbol);
          const geometry = new THREE.BoxGeometry(1.2, 1.8, 1.2);
          geometries.push(geometry);
          const material = new THREE.MeshStandardMaterial({
            color: AGENT_COLORS[symbolType] ?? 0xc4644a,
            roughness: 0.7,
            metalness: 0.1,
          });
          materials.push(material);
          const mesh = new THREE.Mesh(geometry, material);
          mesh.castShadow = true;
          mesh.userData = { agentId: agent.id };
          mesh.position.x = agent.x * CELL_SIZE + CELL_SIZE / 2;
          mesh.position.z = agent.y * CELL_SIZE + CELL_SIZE / 2;
          mesh.position.y = 0.9;
          sceneLocal.add(mesh);
          agentMeshes.set(agent.id, mesh);
        });

        world.signs.forEach((sign) => {
          const postGeometry = new THREE.BoxGeometry(0.2, 1.5, 0.2);
          geometries.push(postGeometry);
          const postMaterial = new THREE.MeshStandardMaterial({ color: 0x5c4a32 });
          materials.push(postMaterial);
          const post = new THREE.Mesh(postGeometry, postMaterial);
          post.position.y = 0.75;

          const signGeometry = new THREE.BoxGeometry(1, 0.6, 0.1);
          geometries.push(signGeometry);
          const signMaterial = new THREE.MeshStandardMaterial({ color: 0x8b6f47 });
          materials.push(signMaterial);
          const signMesh = new THREE.Mesh(signGeometry, signMaterial);
          signMesh.position.y = 1.5;

          const group = new THREE.Group();
          group.add(post);
          group.add(signMesh);
          group.position.set(
            sign.x * CELL_SIZE + CELL_SIZE / 2,
            0,
            sign.y * CELL_SIZE + CELL_SIZE / 2
          );
          group.castShadow = true;
          group.userData = { signId: sign.id };

          sceneLocal.add(group);
        });

        if (mountedRef.current) {
          setIsLoading(false);
        }

        const animate = () => {
          if (!mountedRef.current || !renderer || !scene || !controls) return;
          
          animationIdRef.current = requestAnimationFrame(animate);
          controls.update();

          agentMeshes.forEach((mesh, id) => {
            const agent = world.agents.find((a) => a.id === id);
            if (!agent) return;

            const pos = animState.agentPositions.get(id);
            if (pos) {
              mesh.position.x = pos.x * CELL_SIZE + CELL_SIZE / 2;
              mesh.position.z = pos.y * CELL_SIZE + CELL_SIZE / 2;
            }

            const breathOffset = Math.sin(Date.now() * 0.002 + id.charCodeAt(0)) * 0.05;
            mesh.position.y = 0.9 + breathOffset;

            if (agent.status === "sleeping") {
              mesh.scale.y = 0.5;
              mesh.position.y = 0.45;
            } else {
              mesh.scale.y = 1;
            }

            if (animState.thinkingAgents.has(id)) {
              mesh.rotation.y = Date.now() * 0.001;
            }
          });

          renderer.render(scene, camera);
        };
        animate();

        handleResize = () => {
          if (!containerRef.current || !renderer) return;
          camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        };
        window.addEventListener("resize", handleResize);

        handleClick = (e: MouseEvent) => {
          if (!renderer) return;
          const rect = renderer.domElement.getBoundingClientRect();
          const mouse = new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
          );

          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(mouse, camera);
          const intersects = raycaster.intersectObjects(sceneLocal.children, true);

          for (const hit of intersects) {
            const obj = hit.object;
            if (obj.userData?.agentId) {
              const agent = world.agents.find((a) => a.id === obj.userData.agentId);
              if (agent) onSelectAgent(agent);
              return;
            }
            let parent = obj.parent;
            while (parent) {
              if (parent.userData?.signId) {
                const sign = world.signs.find((s) => s.id === parent!.userData.signId);
                if (sign) onSelectSign(sign);
                return;
              }
              parent = parent.parent;
            }
          }
        };
        renderer.domElement.addEventListener("click", handleClick);

      } catch (err) {
        console.error("Failed to load Three.js:", err);
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      mountedRef.current = false;
      
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = 0;
      }
      
      if (handleResize) {
        window.removeEventListener("resize", handleResize);
      }
      
      if (renderer && handleClick) {
        renderer.domElement.removeEventListener("click", handleClick);
      }
      
      if (controls) {
        controls.dispose();
      }
      
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      
      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
        if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
          containerRef.current.removeChild(renderer.domElement);
        }
      }
      
      if (scene) {
        scene.clear();
      }
      
      rendererRef.current = null;
    };
  }, [world, animState, onSelectAgent, onSelectSign]);

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
