import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";
import {
  type ChapterAnchor,
  type SceneState,
  SCENE_STATES,
  resolveChapterBlend,
} from "./scene-states";
import { SYSTEM_CORE_OUTLINES } from "./system-core-outlines";

// Outlines are stored in the traced order (by angle, counter-clockwise from
// the left piece). The scene works in domain order, clockwise from the top.
const OUTLINE_FOR_DOMAIN = [1, 2, 3, 4, 0] as const;
const PIECE_COUNT = OUTLINE_FOR_DOMAIN.length;
const STREAM_PARTICLES = 44;
const FOV = 32;
const CAMERA_Z = 8;

export type SystemCoreEngineOptions = {
  canvas: HTMLCanvasElement;
  domainLabels: HTMLElement[];
  routeLabels: HTMLElement[];
  getAnchors: () => ChapterAnchor[];
  reducedMotion: boolean;
  onReady: () => void;
  onContextLost: () => void;
};

type Targets = {
  positions: THREE.Vector3[];
  quaternions: THREE.Quaternion[];
  scales: number[];
  dims: number[];
  center: THREE.Vector3;
  frame: THREE.Quaternion;
};

type Piece = {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>;
  home: THREE.Vector2;
  direction: THREE.Vector2;
  size: number;
  dim: number;
};

function createTargets(): Targets {
  return {
    positions: Array.from({ length: PIECE_COUNT }, () => new THREE.Vector3()),
    quaternions: Array.from(
      { length: PIECE_COUNT },
      () => new THREE.Quaternion(),
    ),
    scales: new Array(PIECE_COUNT).fill(1),
    dims: new Array(PIECE_COUNT).fill(1),
    center: new THREE.Vector3(),
    frame: new THREE.Quaternion(),
  };
}

function radialTexture(stops: Array<[number, string]>, size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function damp(current: number, target: number, factor: number) {
  return current + (target - current) * factor;
}

const euler = new THREE.Euler();
const spinAxis = new THREE.Vector3(0, 0, 1);
const scratchQ = new THREE.Quaternion();
const tiltQ = new THREE.Quaternion();
const scratchV = new THREE.Vector3();
const projectV = new THREE.Vector3();

export class SystemCoreEngine {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 80);
  private readonly pieces: Piece[] = [];
  private readonly glow: THREE.Sprite;
  private readonly backdrop: THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.MeshBasicMaterial
  >;
  private readonly coreLight = new THREE.PointLight(0x5b8cff, 0, 7, 1.6);
  private readonly rings = new THREE.Group();
  private readonly ringMaterial: THREE.LineBasicMaterial;
  private readonly dust: THREE.Points<
    THREE.BufferGeometry,
    THREE.PointsMaterial
  >;
  private readonly streams: THREE.Points<
    THREE.BufferGeometry,
    THREE.PointsMaterial
  >;
  private routeLine: THREE.Mesh<
    THREE.TubeGeometry,
    THREE.MeshBasicMaterial
  > | null = null;
  private readonly routeMaterial = new THREE.MeshBasicMaterial({
    color: 0x84afff,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  private readonly environment: THREE.Texture;
  private readonly targetsA = createTargets();
  private readonly targetsB = createTargets();
  private readonly options: SystemCoreEngineOptions;
  private anchors: ChapterAnchor[] = [];
  private anchorsCheckedAt = 0;
  private width = 1;
  private height = 1;
  private narrow = false;
  private frameId = 0;
  private lastTime = 0;
  private elapsed = 0;
  private ready = false;
  private disposed = false;
  private pointer = new THREE.Vector2();
  private pointerCurrent = new THREE.Vector2();
  private readonly current = {
    glow: 0,
    streams: 0,
    rings: 0,
    route: 0,
    domainLabels: 0,
    routeLabels: 0,
    visibility: 0,
    center: new THREE.Vector3(),
    frame: new THREE.Quaternion(),
  };

  constructor(options: SystemCoreEngineOptions) {
    this.options = options;
    this.renderer = new THREE.WebGLRenderer({
      canvas: options.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor(0x05070b, 1);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.environment;
    this.scene.environmentIntensity = 0.55;
    this.scene.fog = new THREE.Fog(0x05070b, 9, 22);

    this.camera.position.set(0, 0, CAMERA_Z);

    this.backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: radialTexture([
          [0, "rgba(46, 98, 235, 0.55)"],
          [0.35, "rgba(24, 58, 160, 0.22)"],
          [1, "rgba(5, 7, 11, 0)"],
        ]),
        transparent: true,
        depthWrite: false,
        fog: false,
      }),
    );
    this.backdrop.position.z = -7;
    this.scene.add(this.backdrop);

    this.glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: radialTexture([
          [0, "rgba(220, 234, 255, 1)"],
          [0.12, "rgba(132, 175, 255, 0.85)"],
          [0.4, "rgba(40, 103, 232, 0.28)"],
          [1, "rgba(40, 103, 232, 0)"],
        ]),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        fog: false,
      }),
    );
    this.scene.add(this.glow);
    this.scene.add(this.coreLight);

    this.scene.add(new THREE.AmbientLight(0x8fb0ff, 0.35));
    const key = new THREE.DirectionalLight(0xf2f6ff, 2.4);
    key.position.set(-4, 5, 6);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x3d7bff, 3.2);
    rim.position.set(5, -1.5, -4);
    this.scene.add(rim);
    const fill = new THREE.DirectionalLight(0x84afff, 0.9);
    fill.position.set(3, 1, 5);
    this.scene.add(fill);

    this.buildPieces();

    this.ringMaterial = new THREE.LineBasicMaterial({
      color: 0x84afff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    for (const radius of [1.35, 2.15, 2.9]) {
      const points = Array.from({ length: 160 }, (_, index) => {
        const angle = (index / 160) * Math.PI * 2;
        return new THREE.Vector3(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          0,
        );
      });
      this.rings.add(
        new THREE.LineLoop(
          new THREE.BufferGeometry().setFromPoints(points),
          this.ringMaterial,
        ),
      );
    }
    this.scene.add(this.rings);

    const dot = radialTexture(
      [
        [0, "rgba(255,255,255,1)"],
        [0.4, "rgba(200,220,255,0.6)"],
        [1, "rgba(200,220,255,0)"],
      ],
      64,
    );

    const dustCount = window.innerWidth < 768 ? 260 : 680;
    const dustPositions = new Float32Array(dustCount * 3);
    for (let index = 0; index < dustCount; index += 1) {
      dustPositions[index * 3] = (Math.random() - 0.5) * 26;
      dustPositions[index * 3 + 1] = (Math.random() - 0.5) * 16;
      dustPositions[index * 3 + 2] = -12 + Math.random() * 16;
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(dustPositions, 3),
    );
    this.dust = new THREE.Points(
      dustGeometry,
      new THREE.PointsMaterial({
        map: dot,
        size: 0.05,
        color: 0x9fbcff,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.scene.add(this.dust);

    const streamGeometry = new THREE.BufferGeometry();
    streamGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array(PIECE_COUNT * STREAM_PARTICLES * 3),
        3,
      ),
    );
    this.streams = new THREE.Points(
      streamGeometry,
      new THREE.PointsMaterial({
        map: dot,
        size: 0.075,
        color: 0xbcd3ff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    );
    this.streams.frustumCulled = false;
    this.scene.add(this.streams);

    options.canvas.addEventListener("webglcontextlost", this.handleContextLost);
    window.addEventListener("resize", this.handleResize);
    if (!options.reducedMotion) {
      window.addEventListener("pointermove", this.handlePointer, {
        passive: true,
      });
    }
    document.addEventListener("visibilitychange", this.handleVisibility);
    this.handleResize();
  }

  start() {
    this.lastTime = performance.now();
    this.frameId = requestAnimationFrame(this.tick);
  }

  refreshAnchors() {
    this.anchors = this.options.getAnchors();
    this.anchorsCheckedAt = performance.now();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    this.options.canvas.removeEventListener(
      "webglcontextlost",
      this.handleContextLost,
    );
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("pointermove", this.handlePointer);
    document.removeEventListener("visibilitychange", this.handleVisibility);
    this.scene.traverse((object) => {
      const withGeometry = object as THREE.Mesh;
      withGeometry.geometry?.dispose();
      const material = withGeometry.material as
        THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) material.forEach((item) => item.dispose());
      else material?.dispose();
    });
    this.environment.dispose();
    this.renderer.dispose();
  }

  private buildPieces() {
    for (const outlineIndex of OUTLINE_FOR_DOMAIN) {
      const outline = SYSTEM_CORE_OUTLINES[outlineIndex]!;
      let cx = 0;
      let cy = 0;
      for (const [x, y] of outline) {
        cx += x;
        cy += y;
      }
      cx /= outline.length;
      cy /= outline.length;

      const shape = new THREE.Shape(
        outline.map(([x, y]) => new THREE.Vector2(x - cx, y - cy)),
      );
      const extruded = new THREE.ExtrudeGeometry(shape, {
        depth: 0.2,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.03,
        bevelOffset: -0.028,
        bevelSegments: 6,
        curveSegments: 1,
      });
      extruded.translate(0, 0, -0.1);
      const geometry = toCreasedNormals(extruded, Math.PI / 4);
      extruded.dispose();
      geometry.computeBoundingSphere();

      const material = new THREE.MeshPhysicalMaterial({
        color: 0x4a7dff,
        metalness: 0,
        roughness: 0.07,
        transmission: 0.9,
        thickness: 0.9,
        ior: 1.55,
        attenuationColor: new THREE.Color(0x2458f0),
        attenuationDistance: 0.9,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        emissive: new THREE.Color(0x1238b4),
        emissiveIntensity: 0.55,
        iridescence: 0.25,
        iridescenceIOR: 1.3,
        specularIntensity: 1,
        specularColor: new THREE.Color(0xdfe9ff),
        envMapIntensity: 1.8,
      });
      const mesh = new THREE.Mesh(geometry, material);
      this.scene.add(mesh);

      const home = new THREE.Vector2(cx, cy);
      this.pieces.push({
        mesh,
        home,
        direction: home.clone().normalize(),
        size: (geometry.boundingSphere?.radius ?? 0.45) * 2,
        dim: 1,
      });
    }
  }

  private visibleAt(depth: number) {
    const distance = CAMERA_Z - depth;
    const height = 2 * distance * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    return { height, width: height * this.camera.aspect };
  }

  private layout(state: SceneState, time: number, out: Targets) {
    const view = this.visibleAt(0);
    const spin = this.options.reducedMotion ? 0 : time * 0.12;
    const narrow = this.narrow;

    switch (state.layout) {
      case "assembled": {
        const scale =
          (narrow ? Math.min(0.95, view.width / 2.9) : 1.08) * state.scale;
        out.center.set(
          narrow ? 0 : state.side * view.width * 0.23,
          narrow ? view.height * 0.18 : 0,
          0,
        );
        out.frame.setFromEuler(
          euler.set(
            narrow ? -0.24 : -0.16,
            narrow ? -0.4 : -state.side * 0.42,
            0,
          ),
        );
        scratchQ.setFromAxisAngle(spinAxis, spin);
        this.pieces.forEach((piece, index) => {
          out.positions[index]!.set(
            piece.home.x * scale,
            piece.home.y * scale,
            0,
          )
            .applyQuaternion(scratchQ)
            .applyQuaternion(out.frame)
            .add(out.center);
          out.quaternions[index]!.copy(out.frame).multiply(scratchQ);
          out.scales[index]! = scale;
          out.dims[index]! = 1;
        });
        break;
      }
      case "exploded": {
        const radius = narrow
          ? Math.min(0.85, view.width * 0.27)
          : Math.min(1.6, view.width * 0.19);
        const scale = narrow ? 0.38 : 0.78;
        out.center.set(
          narrow ? 0 : view.width * 0.19,
          narrow ? view.height * 0.21 : 0,
          0,
        );
        out.frame.setFromEuler(
          euler.set(narrow ? -1 : -0.82, narrow ? 0 : -0.28, 0.1),
        );
        scratchQ.setFromAxisAngle(spinAxis, spin * 0.35);
        const depths = [0.5, -0.5, 0.3, -0.8, 0.15];
        this.pieces.forEach((piece, index) => {
          out.positions[index]!.set(
            piece.direction.x * radius,
            piece.direction.y * radius,
            depths[index],
          )
            .applyQuaternion(scratchQ)
            .applyQuaternion(out.frame)
            .add(out.center);
          out.quaternions[index]!.copy(out.frame)
            .multiply(scratchQ)
            .multiply(
              tiltQ.setFromEuler(
                euler.set(
                  Math.sin(index * 1.7) * 0.5,
                  Math.cos(index * 2.3) * 0.6,
                  Math.sin(time * 0.3 + index) * 0.08,
                ),
              ),
            );
          out.scales[index]! = scale;
          out.dims[index]! = 1;
        });
        break;
      }
      case "focus": {
        const depth = narrow ? 1.4 : 2.1;
        const near = this.visibleAt(depth);
        this.pieces.forEach((piece, index) => {
          if (index === state.focus) {
            const scale = narrow
              ? Math.min(0.5 * near.width, 0.28 * near.height) / piece.size
              : (0.38 * near.height) / piece.size;
            out.positions[index]!.set(
              0,
              narrow ? near.height * 0.26 : 0.05,
              depth,
            );
            const sway = this.options.reducedMotion ? 0 : time * 0.35;
            out.quaternions[index]!.setFromEuler(
              euler.set(
                -0.3 + Math.sin(sway) * 0.08,
                -state.side * 0.55 + Math.cos(sway * 0.8) * 0.18,
                Math.sin(sway * 0.6) * 0.05,
              ),
            );
            out.scales[index]! = scale;
            out.dims[index]! = 1;
            out.center.copy(out.positions[index]!);
          } else {
            const far = this.visibleAt(-10);
            out.positions[index]!.set(
              piece.direction.x * far.width * 0.5,
              piece.direction.y * far.height * 0.44,
              -10,
            );
            out.quaternions[index]!.setFromEuler(
              euler.set(0.4 * index, 0.6 - index * 0.3, spin * 0.5),
            );
            out.scales[index]! = 1.1;
            out.dims[index]! = 0.12;
          }
        });
        out.frame.identity();
        break;
      }
      case "orbit": {
        const radius = narrow ? Math.min(1.4, view.width * 0.3) : 1.55;
        out.center.set(
          narrow ? 0 : state.side * view.width * 0.22,
          narrow ? view.height * 0.2 : 0,
          0,
        );
        out.frame.setFromEuler(euler.set(-1.05, 0, 0.12));
        const orbit = this.options.reducedMotion ? 0 : time * 0.22;
        this.pieces.forEach((piece, index) => {
          const angle =
            Math.atan2(piece.direction.y, piece.direction.x) + orbit;
          out.positions[index]!.set(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            0,
          )
            .applyQuaternion(out.frame)
            .add(out.center);
          out.quaternions[index]!.setFromEuler(
            euler.set(-0.25, Math.cos(angle) * 0.5, angle * 0.5),
          );
          out.scales[index]! = narrow ? 0.5 : 0.62;
          out.dims[index]! = 0.9;
        });
        break;
      }
      case "route": {
        this.pieces.forEach((piece, index) => {
          const position = this.routePosition(index, view);
          out.positions[index]!.copy(position);
          const turn = this.options.reducedMotion ? 0 : time * 0.25;
          out.quaternions[index]!.setFromEuler(
            euler.set(-0.35, 0.45, turn + index * 1.2),
          );
          out.scales[index]! = narrow
            ? Math.min(0.42, view.height * 0.045)
            : Math.min(0.55, view.width * 0.065);
          out.dims[index]! = 1;
        });
        out.center.set(0, 0, -1);
        out.frame.identity();
        break;
      }
    }
  }

  private routePosition(
    index: number,
    view: { width: number; height: number },
  ) {
    const t = index / (PIECE_COUNT - 1);
    if (this.narrow) {
      return new THREE.Vector3(
        -view.width * 0.32,
        THREE.MathUtils.lerp(0.15, -0.19, t) * view.height,
        0,
      );
    }
    return new THREE.Vector3(
      THREE.MathUtils.lerp(-0.37, 0.37, t) * view.width,
      Math.sin(index * 1.4) * 0.22 - 0.25,
      0,
    );
  }

  private rebuildRoute() {
    if (this.routeLine) {
      this.scene.remove(this.routeLine);
      this.routeLine.geometry.dispose();
    }
    const view = this.visibleAt(0);
    const points = Array.from({ length: PIECE_COUNT }, (_, index) =>
      this.routePosition(index, view),
    );
    const first = points[0]!;
    const last = points[points.length - 1]!;
    const lead = this.narrow
      ? new THREE.Vector3(0, view.height * 0.04, 0)
      : new THREE.Vector3(-view.width * 0.12, 0, 0);
    points.unshift(first.clone().add(lead));
    points.push(last.clone().sub(lead));
    const curve = new THREE.CatmullRomCurve3(points);
    this.routeLine = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 220, 0.009, 6, false),
      this.routeMaterial,
    );
    this.routeLine.geometry.setDrawRange(0, 0);
    this.scene.add(this.routeLine);
  }

  private tick = (now: number) => {
    if (this.disposed) return;
    this.frameId = requestAnimationFrame(this.tick);
    const delta = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.elapsed += delta;

    if (now - this.anchorsCheckedAt > 1200) this.refreshAnchors();

    const { from, to, weight } = resolveChapterBlend(
      this.anchors,
      window.scrollY,
    );
    const stateA = SCENE_STATES[from];
    const stateB = SCENE_STATES[to];
    const mix = (key: keyof SceneState) =>
      THREE.MathUtils.lerp(
        stateA[key] as number,
        stateB[key] as number,
        weight,
      );

    const visibilityTarget = mix("visibility");
    const follow = this.options.reducedMotion ? 1 : 1 - Math.exp(-delta * 4.2);
    const ease = this.ready ? follow : 1;

    this.current.visibility = damp(
      this.current.visibility,
      visibilityTarget,
      ease,
    );
    this.options.canvas.style.opacity = this.current.visibility.toFixed(3);
    if (this.current.visibility < 0.004 && visibilityTarget < 0.004) {
      this.updateLabels(0, 0);
      return;
    }

    this.layout(stateA, this.elapsed, this.targetsA);
    this.layout(stateB, this.elapsed, this.targetsB);

    this.pieces.forEach((piece, index) => {
      scratchV
        .copy(this.targetsA.positions[index]!)
        .lerp(this.targetsB.positions[index]!, weight);
      piece.mesh.position.lerp(scratchV, ease);
      scratchQ
        .copy(this.targetsA.quaternions[index]!)
        .slerp(this.targetsB.quaternions[index]!, weight);
      piece.mesh.quaternion.slerp(scratchQ, ease);
      const scale = THREE.MathUtils.lerp(
        this.targetsA.scales[index]!,
        this.targetsB.scales[index]!,
        weight,
      );
      piece.mesh.scale.setScalar(damp(piece.mesh.scale.x, scale, ease));
      piece.dim = damp(
        piece.dim,
        THREE.MathUtils.lerp(
          this.targetsA.dims[index]!,
          this.targetsB.dims[index]!,
          weight,
        ),
        ease,
      );
      const material = piece.mesh.material;
      material.emissiveIntensity = 0.1 + 0.48 * piece.dim;
      material.envMapIntensity = 0.3 + 1.5 * piece.dim;
      material.transmission = 0.55 + 0.35 * piece.dim;
    });

    scratchV.copy(this.targetsA.center).lerp(this.targetsB.center, weight);
    this.current.center.lerp(scratchV, ease);
    scratchQ.copy(this.targetsA.frame).slerp(this.targetsB.frame, weight);
    this.current.frame.slerp(scratchQ, ease);

    this.current.glow = damp(this.current.glow, mix("glow"), ease);
    this.current.streams = damp(this.current.streams, mix("streams"), ease);
    this.current.rings = damp(this.current.rings, mix("rings"), ease);
    this.current.route = damp(this.current.route, mix("route"), ease);
    this.current.domainLabels = damp(
      this.current.domainLabels,
      mix("domainLabels"),
      ease,
    );
    this.current.routeLabels = damp(
      this.current.routeLabels,
      mix("routeLabels"),
      ease,
    );

    const pulse = this.options.reducedMotion
      ? 1
      : 1 + Math.sin(this.elapsed * 1.6) * 0.06;
    const glow = this.current.glow;
    this.glow.position.copy(this.current.center);
    this.glow.scale.setScalar(
      (1.4 + glow * 2.6) * pulse * (this.narrow ? 0.5 : 1),
    );
    this.glow.material.opacity = Math.min(1, glow * (this.narrow ? 0.55 : 1.1));
    this.coreLight.position
      .copy(this.current.center)
      .setZ(this.current.center.z + 0.35);
    this.coreLight.intensity = glow * (this.narrow ? 5 : 16) * pulse;

    const view = this.visibleAt(this.backdrop.position.z);
    this.backdrop.scale.set(view.height * 1.6, view.height * 1.6, 1);
    this.backdrop.position.x = this.current.center.x * 1.4;
    this.backdrop.position.y = this.current.center.y * 1.2;
    this.backdrop.material.opacity = 0.45 + glow * 0.55;

    this.rings.position.copy(this.current.center);
    this.rings.quaternion.copy(this.current.frame);
    this.rings.scale.setScalar(this.narrow ? 0.7 : 1);
    this.ringMaterial.opacity = this.current.rings * 0.16;
    this.rings.visible = this.current.rings > 0.01;

    if (this.routeLine) {
      const count = this.routeLine.geometry.index?.count ?? 0;
      const drawn = Math.floor(count * this.current.route);
      this.routeLine.geometry.setDrawRange(0, drawn - (drawn % 3));
      this.routeLine.visible = this.current.route > 0.01;
    }

    this.updateStreams();
    this.updateDust(delta);
    this.updateCamera(ease);

    this.renderer.render(this.scene, this.camera);
    this.updateLabels(this.current.domainLabels, this.current.routeLabels);

    if (!this.ready) {
      this.ready = true;
      this.options.onReady();
    }
  };

  private updateStreams() {
    const strength = this.current.streams;
    this.streams.visible = strength > 0.01;
    this.streams.material.opacity = strength * 0.9;
    if (!this.streams.visible) return;
    const attribute = this.streams.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const center = this.current.center;
    const speed = this.options.reducedMotion ? 0 : 0.28;
    this.pieces.forEach((piece, pieceIndex) => {
      const start = piece.mesh.position;
      for (let index = 0; index < STREAM_PARTICLES; index += 1) {
        const offset = index / STREAM_PARTICLES;
        const t = (this.elapsed * speed + offset + pieceIndex * 0.13) % 1;
        const eased = t * t;
        const swirl = Math.sin(t * Math.PI) * 0.35;
        const wobble = Math.sin(index * 12.9898 + pieceIndex) * 0.06;
        const x =
          THREE.MathUtils.lerp(start.x, center.x, eased) +
          -(start.y - center.y) * swirl * 0.3 +
          wobble;
        const y =
          THREE.MathUtils.lerp(start.y, center.y, eased) +
          (start.x - center.x) * swirl * 0.3 +
          wobble;
        const z = THREE.MathUtils.lerp(start.z, center.z, eased);
        attribute.setXYZ(pieceIndex * STREAM_PARTICLES + index, x, y, z);
      }
    });
    attribute.needsUpdate = true;
  }

  private updateDust(delta: number) {
    if (this.options.reducedMotion) return;
    this.dust.rotation.y += delta * 0.006;
    this.dust.position.y = Math.sin(this.elapsed * 0.05) * 0.4;
  }

  private updateCamera(ease: number) {
    this.pointerCurrent.lerp(this.pointer, ease * 0.6);
    this.camera.position.set(
      this.pointerCurrent.x * 0.32,
      this.pointerCurrent.y * 0.2,
      CAMERA_Z,
    );
    this.camera.lookAt(
      this.pointerCurrent.x * 0.08,
      this.pointerCurrent.y * 0.05,
      0,
    );
  }

  private updateLabels(domainStrength: number, routeStrength: number) {
    const { domainLabels, routeLabels } = this.options;
    this.pieces.forEach((piece, index) => {
      projectV.copy(piece.mesh.position).project(this.camera);
      const x = (projectV.x * 0.5 + 0.5) * this.width;
      const y = (-projectV.y * 0.5 + 0.5) * this.height;
      const domain = domainLabels[index];
      if (domain) {
        domain.style.opacity = domainStrength.toFixed(3);
        domain.style.visibility = domainStrength > 0.01 ? "visible" : "hidden";
        domain.dataset.side = projectV.x < 0 ? "left" : "right";
        domain.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      }
      const route = routeLabels[index];
      if (route) {
        route.style.opacity = routeStrength.toFixed(3);
        route.style.visibility = routeStrength > 0.01 ? "visible" : "hidden";
        route.dataset.placement = this.narrow ? "right" : "below";
        route.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      }
    });
  }

  private handleResize = () => {
    const canvas = this.options.canvas;
    this.width = canvas.clientWidth || window.innerWidth;
    this.height = canvas.clientHeight || window.innerHeight;
    this.narrow = this.width / this.height < 0.9 || this.width < 1024;
    const ratio = Math.min(
      window.devicePixelRatio || 1,
      this.width < 720 ? 1.5 : 1.75,
    );
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.rebuildRoute();
    this.refreshAnchors();
  };

  private handlePointer = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    this.pointer.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -((event.clientY / window.innerHeight) * 2 - 1),
    );
  };

  private handleVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.frameId);
    } else if (!this.disposed) {
      this.lastTime = performance.now();
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private handleContextLost = (event: Event) => {
    event.preventDefault();
    cancelAnimationFrame(this.frameId);
    this.options.onContextLost();
  };
}
