import { StringController } from 'lil-gui';
import * as THREE from 'three';
import { CubeTexture, Scene } from 'three';

import { MeshSurfaceSampler } from "three-stdlib/math/MeshSurfaceSampler";
import { intersectionT, MessDecals } from './decals';
import { audio, engine, models, textures } from './engine/engine';
import { loadTexturedModel } from './engine/loader';
import { ParticleSystem } from './engine/particles';
import { GLBScene } from "./engine/scenes";
import { Player } from './player';

export { GameScene }

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

    constructor(name: string) {
        super(name);
        // Link scenes

        // Create player
        this.player = new Player();
        this.addUpdate("player", this.player);
        
        this.decals = new MessDecals(this);
        this.placeDecals();

        // this.skybox = new THREE.CubeTextureLoader().setPath("resources/textures/").load([
        //     "skybox/px.jpg", "skybox/nx.jpg", "skybox/py.jpg", "skybox/ny.jpg", "skybox/pz.jpg", "skybox/nz.jpg"
        // ]);
        this.skybox = textures.getData("skybox") as CubeTexture;
        this.background = this.skybox;

        // Create bucket
        this.bucket = models.getData("bucket").clone();
        this.bucket.castShadow = true;
        (this.bucket.material as THREE.MeshStandardMaterial).envMap = this.skybox;
        (this.mesh?.material as THREE.MeshStandardMaterial).envMap = this.skybox;

        this.add(this.bucket);
        this.bucket.translateY(-1.75);
        this.bucket.translateX(0.5);

        // Create bucket collider
        this.bucketCollider = new THREE.Mesh(new THREE.SphereGeometry(1));
        this.bucketCollider.visible = false;
        this.bucket!.add(this.bucketCollider);

        this.particles = new ParticleSystem();
    }

    // Randomly place decals
    placeDecals() {
        const sampler = new MeshSurfaceSampler(this.mesh!).build();
        const pos = new THREE.Vector3();
        const norm = new THREE.Vector3();

        const normalTransform = new THREE.Matrix3().getNormalMatrix(this.mesh!.matrixWorld);

        for (let i = 0; i < this.decalCount; i++) {
            // Get location
            sampler.sample(pos, norm);
            // Ensure in world coords
            this.mesh?.localToWorld(pos);
            norm.applyMatrix3(normalTransform).normalize();
            // Add decal
            this.decals.addDecal({ intersects: true, point: pos, normal: norm });
        }
    }

    init() {
        super.init();
        engine.enableUI("gameui");
        
        document.addEventListener('mousedown', this.mouseDown);
        document.body.requestPointerLock();

        this.addUpdate("particles", this.particles);
    }

    mouseDown() { document.body.requestPointerLock(); }

    destroy() {
        document.removeEventListener("mousedown", this.mouseDown);
    }

    // Checks for intersection from the window coords given
    checkIntersection (x: number, y: number, target: THREE.Object3D[] | null): THREE.Intersection[] {
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