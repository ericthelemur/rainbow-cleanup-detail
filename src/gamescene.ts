import * as THREE from 'three';
import { Scene } from 'three';

import { MeshSurfaceSampler } from "three-stdlib/math/MeshSurfaceSampler";
import { MessDecals } from './decals';
import { engine, models, textures } from './engine/engine';
import { loadTexturedModel } from './engine/loader';
import { ParticleSystem } from './engine/particles';
import { GLBScene } from "./engine/scenes";
import { Player } from './player';

export { GameScene }

class GameScene extends GLBScene {
    gravity: number = 300;
    player: Player;
    decals: MessDecals;
    bucket: THREE.Mesh | undefined = undefined;
    particles: ParticleSystem;

    constructor(name: string) {
        super(name);
        
        // engine.ui = '<img id="crosshair" src="resources/textures/ui/crosshair.png">';
        
        this.player = new Player();
        this.addUpdate("player", this.player);
        
        this.decals = new MessDecals(this);
        this.bucket = models.get("bucket")!.data!;; 
        this.bucket.castShadow = true;

        this.add(this.bucket!);
        this.bucket!.translateY(-1.75);
        this.bucket!.translateX(0.5);

        // Randomly place decals
        const sampler = new MeshSurfaceSampler(this.mesh!).build();
        const pos = new THREE.Vector3();
        const norm = new THREE.Vector3();

        const normalTransform = new THREE.Matrix3().getNormalMatrix(this.mesh!.matrixWorld);

        for (let i = 0; i < 100; i++) {
            sampler.sample(pos, norm);
            this.mesh?.localToWorld(pos);
            norm.applyMatrix3(normalTransform).normalize();
            this.decals.addDecal({ intersects: true, point: pos, normal: norm });
        }

        this.particles = new ParticleSystem(this);
    }

    init() {
        super.init();
        engine.enableUI("gameui");
        
        document.addEventListener('mousedown', this.mouseDown);
        document.body.requestPointerLock();
    }

    mouseDown() { document.body.requestPointerLock(); }

    destroy() {
        document.removeEventListener("mousedown", this.mouseDown);
    }

    
}