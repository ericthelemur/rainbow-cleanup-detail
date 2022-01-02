import * as THREE from 'three';
import { Scene } from 'three';

import { MeshSurfaceSampler } from "three-stdlib/math/MeshSurfaceSampler";
import { MessDecals } from './decals';
import { engine, models, textures } from './engine/engine';
import { loadTexturedModel } from './engine/loader';
import { GLBScene } from "./engine/scenes";
import { Player } from './player';

export { GameScene }

class GameScene extends GLBScene {
    gravity: number = 300;
    player: Player;
    decals: MessDecals;
    bucket: THREE.Mesh | undefined = undefined;

    constructor(name: string) {
        super(name);
        
        engine.ui = '<img id="crosshair" src="resources/textures/ui/crosshair.png">';

        document.addEventListener('mousedown', () => {
            document.body.requestPointerLock();
        });

        this.player = new Player();
        this.addUpdate("player", this.player);
        
        this.decals = new MessDecals(this);
        this.bucket = models.get("bucket")!.data!;; 
        this.bucket.castShadow = true;

        this.add(this.bucket!);
        this.bucket!.translateY(-1.75);
        this.bucket!.translateX(0.5);

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
    }
    
    // loaderFunc() {
    //     const t = this;
    //     const f = super.loaderFunc();
    //     return (mesh: THREE.Mesh) => {
    //         f(mesh);

    //         const sampler = new MeshSurfaceSampler(this.mesh!).build();
    //         const pos = new THREE.Vector3();
    //         const norm = new THREE.Vector3();

    //         const normalTransform = new THREE.Matrix3().getNormalMatrix(this.mesh!.matrixWorld);

    //         for (let i = 0; i < 100; i++) {
    //             sampler.sample(pos, norm);
    //             this.mesh?.localToWorld(pos);
    //             norm.applyMatrix3(normalTransform).normalize();
    //             t.decals.addDecal({ intersects: true, point: pos, normal: norm });
    //         }
    //     };
    // }

    
}