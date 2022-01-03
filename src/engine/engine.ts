import * as THREE from 'three';
import { Input } from './inputmap';
import { Models, Textures } from './loader';
import { Updatable, BasicScene, GLBScene } from './scenes';

export { 
    engine, input, textures, models, 
    Updatable, BasicScene, GLBScene
}

const clock = new THREE.Clock();
const STEPS_PER_FRAME = 5;

class Engine {
    private _scene: BasicScene | undefined = undefined;
    camera: THREE.Camera | undefined = undefined;
    renderer: THREE.WebGLRenderer;
    
    constructor() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.VSMShadowMap;
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        this.renderer.toneMappingExposure = 2.2;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.setPixelRatio(window.devicePixelRatio);

        const container = document.getElementById('container')!;
        container.appendChild(this.renderer.domElement);

        window.addEventListener('resize', this.onWindowResize());
    }

    onWindowResize () {
        const t = this;
        return () => {
            if (!t.scene) return;
            t.scene.cameras.forEach(c => {
                c.aspect = window.innerWidth / window.innerHeight;
                c.updateProjectionMatrix();
            });

            t.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }

    run() {
        const deltaTime = Math.min(0.05, clock.getDelta()) / STEPS_PER_FRAME;
        
        this.scene!.updates.forEach(up => {
            up.update(deltaTime);
        });
        input.update(deltaTime);

        if (this.scene && this.camera) this.renderer.render(this.scene, this.camera);
    }

    
    public get scene(): BasicScene | undefined {
        return this._scene;
    }

    public set scene(value: BasicScene | undefined) {
        this._scene?.destroy();
        engine.ui = "";
        
        const uis = document.getElementsByClassName("ui")!;
        for (var i=0; i < uis.length; i++) (uis[i] as HTMLElement).hidden = true;
        document.getElementById("ui")!.hidden = false;

        console.log("TRANSITION TO", value);
        this._scene = value;
        this.camera = value?.cameras?.get("main")!;
        this.onWindowResize();  // Update scene cameras to match any change in window size
        
        this._scene?.init();
    }

    enableUI(name: string) {
        document.getElementById(name)!.hidden = false;
    }

    public set ui(value: string) {
        document.getElementById("ui")!.innerHTML = value;
    }
    
    public get ui() {
        return document.getElementById("ui")!.innerHTML;
    }
}

const engine = new Engine();
const input = new Input();
const textures = new Textures();
const models = new Models();
