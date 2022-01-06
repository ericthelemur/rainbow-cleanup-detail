import * as THREE from 'three';
import { Octree } from 'three-stdlib/math/Octree';
import { engine, models } from './engine';

// Class representing components of the scene that need updates
export class Updatable {
    scene: BasicScene | null = null;
    init(scene: BasicScene) { this.scene = scene; } // Called once scene created
    initAfter() {}                                  // Called after camera and other inits
    start() {}                                      // Called once scene has finished transition
    update(deltaTime: number) {}                    // Called per frame
    destroy() {}                                    // Called when transitioning out
}

export class BasicScene extends THREE.Scene {
    updates: Map<string, Updatable> = new Map();
    cameras: Map<string, THREE.PerspectiveCamera> = new Map();
    initialized: number = 0;
    ui: string = "";

    init() {
        if (this.initialized >= 1) return; 
        this.initialized = 1;
        this.updates.forEach(up => up.init(this));
        engine.ui = this.ui;
    }

    initAfter() {
        if (this.initialized >= 2) return; 
        this.initialized = 2;
        this.updates.forEach(up => up.initAfter());
    }

    start() {
        this.updates.forEach(up => up.start());
    }

    update(deltaTime: number) {
        this.updates.forEach(up => up.update(deltaTime));
    }

    destroy() {
        
        this.updates.forEach(up => up.destroy());
    }

    // Add Updatable, calling inits if already called for scene
    addUpdate(name: string, up: Updatable) {
        this.updates.set(name, up);
        if (this.initialized >= 1) up.init(this);
        if (this.initialized >= 2) up.initAfter();
    }

    getUpdate(name: string): Updatable | undefined {
        return this.updates.get(name);
    }
}

export class GLBScene extends BasicScene {
    worldOctree: Octree;
    mesh: THREE.Mesh | null = null;
    name: string;

    constructor(name: string) {
        super();
        this.name = name;
        this.background = new THREE.Color(0x88ccff);

        // Add lights
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
        
        // Assign mesh and calculate collision octree
        this.worldOctree = new Octree();
        
        this.mesh = models.getData(name);
        this.add(this.mesh);
    
        this.worldOctree.fromGraphNode(this.mesh);
    
        this.mesh.traverse(child => {
            if (child.type == "Mesh") {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }
}




