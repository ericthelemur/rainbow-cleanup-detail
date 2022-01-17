import * as THREE from 'three';
import { CubeTexture } from 'three';
import { MeshSurfaceSampler } from "./mymeshsampler";
import { MessDecals } from './decals';
import { engine, models, textures } from './engine/engine';
import { ParticleSystem } from './engine/particles';
import { GLBScene } from "./engine/scenes";
import { Player } from './player';


export { GameScene };

class GameScene extends GLBScene {
    gravity: number = 15;
    player: Player;
    decals: MessDecals;
    bucket: THREE.Mesh | undefined = undefined;
    bucketCollider: THREE.Mesh;
    particles: ParticleSystem;
    skybox: THREE.CubeTexture;

    raycaster: THREE.Raycaster = new THREE.Raycaster();

    decalCount = 100;
    objCount = 50;
    powerUpCount = 3;

    constructor(name: string) {
        super(name);

        // Create player
        this.player = new Player();
        this.addUpdate("player", this.player);

        this.decals = new MessDecals();
        this.addUpdate("decals", this.decals);

        this.skybox = textures.getData("skybox") as CubeTexture;
        this.background = this.skybox;
        this.environment = this.skybox;

        // Create bucket
        this.bucket = models.getData("bucket").clone();
        (this.bucket.material as THREE.MeshStandardMaterial).envMap = this.skybox;
        (this.bucket.material as THREE.MeshStandardMaterial).envMapIntensity = 0.5;
        (this.mesh?.material as THREE.MeshStandardMaterial).envMap = this.skybox;
        (this.mesh?.material as THREE.MeshStandardMaterial).envMapIntensity = 0.5;
        this.bucket.castShadow = true;

        this.add(this.bucket);
        this.bucket.translateY(-1.75);
        this.bucket.translateX(0.5);

        // Create bucket collider
        this.bucketCollider = new THREE.Mesh(new THREE.SphereGeometry(1));
        this.bucketCollider.visible = false;
        this.bucket.add(this.bucketCollider);

        this.particles = new ParticleSystem();
    }


    // Randomly place decals
    placeDecals() {
        const sampler = new MeshSurfaceSampler(this.mesh!).build();
        const pos = new THREE.Vector3();
        const norm = new THREE.Vector3();

        const normalTransform = new THREE.Matrix3().getNormalMatrix(this.mesh!.matrixWorld);

        // Place decals
        for (let i = 0; i < this.decalCount; i++) {
            // Get location
            sampler.sample(pos, norm);
            // Ensure in world coords
            this.mesh?.localToWorld(pos);
            norm.applyMatrix3(normalTransform).normalize();
            // Add decal
            this.decals.addDecal({ intersects: true, point: pos, normal: norm });
        }

        // Place objects
        // Make upto 2 * count attempts to place - only place on flat-ish surfaces
        const up = new THREE.Vector3(0, 1, 0);
        for (let placed = this.objCount, i = 0; placed > 0 && i < 2 * this.objCount; i++) {
            sampler.sample(pos, norm);
            this.mesh?.localToWorld(pos); // Ensure in world coords
            norm.applyMatrix3(normalTransform).normalize();
            if (up.angleTo(norm) < Math.PI / 6) {
                this.decals.addBlock({ intersects: true, point: pos, normal: norm });
                placed -= 1;
            }
        }

        // Place powerups in same way as objects
        for (let placed = this.powerUpCount, i = 0; placed > 0 && i < 5 * this.powerUpCount; i++) {
            sampler.sample(pos, norm);
            this.mesh?.localToWorld(pos); // Ensure in world coords
            norm.applyMatrix3(normalTransform).normalize();
            if (up.angleTo(norm) < Math.PI / 6) {
                this.decals.addPowerUp({ intersects: true, point: pos, normal: norm });
                placed -= 1;
            }
        }

        console.log(this);
    }

    init() {
        super.init();
        engine.enableUI("gameui");

        document.addEventListener('mousedown', this.mouseDown);
        document.body.requestPointerLock();

        this.addUpdate("particles", this.particles);
    }

    initAfter(): void {
        super.initAfter();
        this.placeDecals();
    }

    mouseDown() { document.body.requestPointerLock(); }

    destroy() {
        super.destroy();
        document.removeEventListener("mousedown", this.mouseDown);
        this.decals.removeDecals();
    }

    // Checks for intersection from the window coords given
    checkIntersection(x: number, y: number, target: THREE.Object3D[] | null): THREE.Intersection[] {
        // Rescale to window coords
        const rayCoords = new THREE.Vector2();
        rayCoords.x = (x! / window.innerWidth) * 2 - 1;
        rayCoords.y = -(y! / window.innerHeight) * 2 + 1;

        // Raycast
        this.raycaster.setFromCamera(rayCoords, engine.camera!);
        const intersects: THREE.Intersection[] = [];
        if (target === null) target = this.children;
        this.raycaster.intersectObjects(target, true, intersects);

        return intersects;
    }
}