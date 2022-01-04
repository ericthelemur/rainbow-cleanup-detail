import * as THREE from 'three';
import { Input } from './inputmap';
import { Models, Textures, Audio } from './loader';
import { Updatable, BasicScene, GLBScene } from './scenes';

export { 
    engine, input, textures, models, audio,
    Updatable, BasicScene, GLBScene
}

const clock = new THREE.Clock();

class Engine {
    private _scene: BasicScene | undefined = undefined;
    _camera: THREE.Camera | undefined = undefined;
    renderer: THREE.WebGLRenderer;
    audio: THREE.AudioListener;
    
    constructor() {
        // Set renderer properties
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

        window.addEventListener('resize', this.onWindowResize.bind(this));

        this.audio = new THREE.AudioListener();
    }

    // Updates camera and renderer properties on resize
    onWindowResize () {
        if (!this.scene) return;
        this.scene.cameras.forEach(c => {
            c.aspect = window.innerWidth / window.innerHeight;
            c.updateProjectionMatrix();
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    
    // Main loop
    run() {
        const deltaTime = Math.min(0.05, clock.getDelta());
        // Call scene elements updates
        this.scene!.updates.forEach(up => {
            up.update(deltaTime);
        });
        input.update(deltaTime);
        
        // Draw if scene has camera
        if (this.scene && this.camera) this.renderer.render(this.scene, this.camera);
    }

    
    public get scene(): BasicScene | undefined {
        return this._scene;
    }

    // On set scene
    public set scene(value: BasicScene | undefined) {
        // Destroy old
        this._scene?.destroy();
        engine.ui = "";
        
        // Hide all ui layers apart from main
        const uis = document.getElementsByClassName("ui")!;
        for (var i=0; i < uis.length; i++) (uis[i] as HTMLElement).hidden = true;
        document.getElementById("ui")!.hidden = false;

        // Transition and call init
        console.log("Scene Transition to ", value, this.camera);
        this._scene = value;
        this._scene?.init();
        this.camera = value?.cameras?.get("main")!;
        this._scene?.initAfter();

        this.onWindowResize();  // Update scene cameras to match any change in window size
        this._scene?.start();
    }

    // Sets a UI layer to visible
    enableUI(name: string) {
        document.getElementById(name)!.hidden = false;
    }

    public set ui(value: string) {
        document.getElementById("ui")!.innerHTML = value;
    }
    
    public get ui() {
        return document.getElementById("ui")!.innerHTML;
    }

    public set camera(cam: THREE.Camera | undefined) {
        this._camera = cam;
        cam?.add(this.audio);
    }
    
    public get camera() {
        return this._camera;
    }

    playSFX(sound: THREE.Audio, loop=false) {
        if (sound.isPlaying) sound.stop();
        sound.setLoop(loop);
        sound.play();
    }
}

const engine = new Engine();
const input = new Input();
const textures = new Textures();
const models = new Models();
const audio = new Audio();