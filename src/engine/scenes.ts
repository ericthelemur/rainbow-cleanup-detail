import * as THREE from 'three';
import { Octree } from 'three-stdlib/math/Octree';
import { engine, models } from './engine';

export class Updatable {
    scene: BasicScene | null = null;
    init(scene: BasicScene) { this.scene = scene; }
    update(deltaTime: number) {}
    destroy() {}
}

export class BasicScene extends THREE.Scene {
    updates: Map<string, Updatable> = new Map();
    cameras: Map<string, THREE.PerspectiveCamera> = new Map();
    initialized: boolean = false;
    ui: string = "";

    init() {
        this.updates.forEach(up => up.init(this));
        this.initialized = true;
        engine.ui = this.ui;
    }

    update(deltaTime: number) {
        this.updates.forEach(up => up.update(deltaTime));
    }

    destroy() {
        this.updates.forEach(up => up.destroy());
    }

    addUpdate(name: string, up: Updatable) {
        this.updates.set(name, up);
        up.init(this);
    }

    getUpdate(name: string): Updatable | undefined {
        return this.updates.get(name);
    }
}

export class GLBScene extends BasicScene {
    worldOctree: Octree;
    mesh: THREE.Mesh | null = null;

    constructor(name: string) {
        super();
        this.background = new THREE.Color(0x88ccff);

        const ambientlight = new THREE.AmbientLight(0x6688cc);
        this.add(ambientlight);

        const fillLight1 = new THREE.DirectionalLight(0xff9999, 0.5);
        fillLight1.position.set(-1, 1, 2);
        this.add(fillLight1);

        const fillLight2 = new THREE.DirectionalLight(0x8888ff, 0.2);
        fillLight2.position.set(0, -1, 0);
        this.add(fillLight2);

        const directionalLight = new THREE.DirectionalLight(0xffffaa, 1.2);
        directionalLight.position.set(-5, 25, -1);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.near = 0.01;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.right = 30;
        directionalLight.shadow.camera.left = -30;
        directionalLight.shadow.camera.top = 30;
        directionalLight.shadow.camera.bottom = -30;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.radius = 4;
        directionalLight.shadow.bias = -0.00006;
        this.add(directionalLight);
        
        this.worldOctree = new Octree();
        
        const s = this;
        // models.load("scene", path).then(this.loaderFunc());

        this.mesh = models.get(name)!.data!;
        this.add(this.mesh);
    
        this.worldOctree.fromGraphNode(this.mesh);
    
        this.mesh.traverse(child => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
    
                if (child.material.map) {
                    child.material.map.anisotropy = 8;
                }
            }
        });

        // modelLoader.load(path, (gltf) => this.loaderFunc(s, gltf));
    }
    
    
    // loaderFunc() {
    //     const t = this;
    //     return (mesh: THREE.Mesh) => {
    //         this.mesh = mesh;
    //         this.add(mesh);
        
    //         this.worldOctree.fromGraphNode(mesh);
        
    //         mesh.traverse(child => {
    //             if (child instanceof THREE.Mesh) {
    //                 child.castShadow = true;
    //                 child.receiveShadow = true;
        
    //                 if (child.material.map) {
    //                     child.material.map.anisotropy = 8;
    //                 }
    //             }
    //         });
    //     };
    // };
}




