
import * as THREE from 'three';
import { Capsule } from 'three-stdlib/math/Capsule';
import { clamp } from 'three/src/math/MathUtils';
import { DirtType, MessDecals } from './decals';
import { audio, engine, input, models, Updatable } from './engine/engine';
import { GameScene } from './gamescene';
import { MenuScene } from './menuscene';

export class Player extends Updatable {
    // Components
    head: THREE.Object3D = new THREE.Object3D();
    collider: Capsule;
    brush: THREE.Mesh | null;

    camera: THREE.PerspectiveCamera;
    topDownCamera: THREE.PerspectiveCamera;
    currCam = true;

    mixer: THREE.AnimationMixer | null = null;
    cleanAnim: THREE.AnimationAction | null = null;

    // Properties
    velocity: THREE.Vector3;
    direction: THREE.Vector3;
    onFloor: boolean;

    speed: number = 100;
    airSpeed: number = 10;
    jumpSpeed: number = 20;

    // Cleaning vars
    waterCapacity: number = 5;
    _waterLevel: number = 0;
    cleanTarget: number = 150;
    _cleanCount: number = 0;
    cleanSFX: THREE.Audio;

    // Event functions
    pointerUp: (event: MouseEvent) => void;
    mouseMove: (event: MouseEvent) => void;

    // Cleaning GUI elements
    cleanedElement: HTMLElement;
    waterElement: HTMLElement;
    waterMarkers: HTMLElement;
    brpar: THREE.Object3D = new THREE.Object3D();
    particleEmitter: THREE.Object3D = new THREE.Object3D();

    constructor() {
        super();
        // Create components
        this.head.rotation.order = 'YXZ';

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.collider = new Capsule(new THREE.Vector3(0, 0.35, 0), new THREE.Vector3(0, 1, 0), 0.35);
        this.brush = null;


        this.topDownCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.topDownCamera.position.set(0, 15, 0);
        this.topDownCamera.rotateX(-Math.PI / 2);

        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();

        this.onFloor = false;
        this.pointerUp = this.mouseMove = () => 1;

        // Fetch GUI elements
        this.cleanedElement = document.getElementById("cleanedPercent")!;
        this.waterElement = document.getElementById("waterLevel")!;
        this.waterMarkers = document.getElementById("waterMarkers")!;
        this.waterLevel = this.waterCapacity;
        document.getElementById("waterMax")!.innerText = this.waterCapacity.toString();

        this.cleanSFX = audio.getData("clean");
        this.cleanSFX.setVolume(0.4);
    }

    init(scene: GameScene) {
        super.init(scene);
        scene.add(this.head);
        scene.cameras.set("main", this.camera);

        // Add and store click listener
        window.addEventListener('pointerup', this.pointerUp = ((event: MouseEvent) => {
            if (event.button == 2) this.splat();
            else if (event.button == 0) this.clean();
        }).bind(this));

        // Add and store mouse move listener
        document.body.addEventListener('mousemove', this.mouseMove = ((event: MouseEvent) => {
            if (document.pointerLockElement === document.body) {
                this.head.rotation.y -= event.movementX / 500;
                this.head.rotation.x -= event.movementY / 500;
                // Limit vertical rotation
                this.head.rotation.x = clamp(this.head.rotation.x, -Math.PI / 2, Math.PI / 2);
            }
        }).bind(this));

        // Create brush
        this.brush = this.addBrush();
        
        // Clean vars for the GUI
        this.cleanTarget = (this.scene as GameScene).decalCount + (this.scene as GameScene).objCount;
        this.cleanCount = 0;

        // Add clean animation
        const bgltf = models.getGLTF("brush_gltf");
        const anim = bgltf.animations[0];
        this.mixer = new THREE.AnimationMixer(this.brush);
        this.cleanAnim = this.mixer.clipAction(anim, this.brush);
        this.cleanAnim.setLoop(THREE.LoopOnce, 1);
    }

    addBrush() {
        // Assign and move brush model
        const brush = (models.getData("brush") as THREE.Mesh).clone();
        const mat = brush.material as THREE.MeshStandardMaterial
        mat.envMap = (this.scene! as GameScene).skybox;
        mat.envMapIntensity = 0.5;

        brush.add(this.particleEmitter);
        this.particleEmitter.rotateX(Math.PI/2);
        this.particleEmitter.translateY(0.2);

        // Have a parent element for the animation to be relative to
        const brpar = new THREE.Object3D();
        brpar.add(brush);
        brpar.translateZ(-0.8);
        brpar.translateY(-0.2);
        brpar.translateX(0.4);

        brpar.rotateX(Math.PI / 2);
        brpar.rotateY(Math.PI / 6);

        // Create second scene just for brush (so rendered on top)
        // Possibly a way to address with layers and render order, but cannot set layer render order
        // And cannot disable depth test, otherwise the brush model does not render correctly
        // Unfortunately, this leads to no shadows on the brush
        const s2 = new THREE.Scene();
        this.brpar.add(brpar);
        s2.add(this.brpar);
        engine.scene2 = s2;

        this.scene!.traverse((obj) => {
            if (obj instanceof THREE.Light) {
                s2.add(obj.clone());
            }
        });
        return brush;
    }

    // Adds decal at players view location, for debugging
    splat() {
        const gs = this.scene as GameScene;
        const decals = gs.decals;
        // Intersection call
        const intersects: THREE.Intersection[] = gs.checkIntersection(window.innerWidth / 2, window.innerHeight / 2, this.scene!.children);

        // Construct intersection result
        if (intersects.length > 0) {
            const intersection = MessDecals.convertIntersectType(intersects[0]);
            decals.addDecal(intersection);
        }
    }

    // Attempts to clean the decal the player is looking at
    clean() {
        if (this.waterLevel > 0) {
            const gs = this.scene! as GameScene;
            // Attempt to remove
            const intersect = gs.decals.clean();
            if (intersect) {
                // If successful, update levels and trigger particles

                engine.playSFX(this.cleanSFX);
                this.cleanAnim?.stop();
                this.cleanAnim?.play();

                // Only do water particles if decal
                if (intersect.type == DirtType.DECAL) {
                    this.waterLevel = this._waterLevel - 1;
                    this.cleanCount = this._cleanCount + 1;

                    const mat = intersect.decal.material as THREE.MeshPhongMaterial
                    gs.particles.clean(
                        intersect.collider.position,
                        new THREE.Color("white").lerp(mat.color, 0.5),  // Mix some white, as particles not effected by lights
                        intersect.intersection.normal
                    );
                    this.brushParticles();
                }

                if (intersect.type == DirtType.POWERUP) {
                    this.randomPowerup();
                }
            } else {    // Have brush particles if cleaning decal or no clean
                this.brushParticles();
            }
        }
        // Check for refill at bucket
        const refilled = this.refillCheck();
        if (!refilled && this.waterLevel == 0) {
            this.refillAnim();
        }
    }

    randomPowerup() {
        const t = Math.random();
        if (t < 0.75) {
            this.waterCapacity += 5;
            document.getElementById("waterMax")!.innerText = this.waterCapacity.toString();
            this.waterLevel = this.waterCapacity;
        } else {
            this.speed *= 1.5;
        }
    }

    brushParticles() {
        const gs = this.scene! as GameScene;
        // Brush water effect if enough water
        const p2 = new THREE.Vector3(); 
        const d2 = new THREE.Vector3();
        this.particleEmitter.getWorldPosition(p2);
        this.particleEmitter.getWorldDirection(d2);
        gs.particles.clean(p2, new THREE.Color(0x3c9ee8), d2, 50);
    }

    // Checks if player is looking at bucket, refills if so
    refillCheck() {
        if (this.waterLevel >= this.waterCapacity) return;
        const gs = this.scene as GameScene;
        const intersects: THREE.Intersection[] = gs.checkIntersection(window.innerWidth / 2, window.innerHeight / 2, [gs.bucketCollider]);
        if (intersects.length > 0 && intersects[0].distance < 1.0) {
            this.waterLevel = this.waterCapacity;
            engine.playSFX(this.cleanSFX);
            return true;
        }
        return false;
    }

    // Crosshair and reminder flash if water empty
    refillAnim() {
        const we = this.waterMarkers;
        // Animations defined in gameui.css
        we.style.animation = "flashRed 0.5s 1 ease";
        const warnCH = document.getElementById("crosshairWarn")!;
        warnCH.style.animation = "fadeInOut 0.25s 1 ease";
        // Remove animation in a couple of seconds
        new Promise((re) => setTimeout(re, 600)).then(() => {
            we.style.animation = "";
            warnCH.style.animation = "";
        });
    }

    // Scene's update loop
    update(deltaTime: number) {
        this.controls(deltaTime);
        this.updatePlayer(deltaTime);
        this.playerOutOfBounds();

        this.updateChildren();
        this.mixer?.update(deltaTime);
    }

    // User input
    controls(deltaTime: number) {
        const speedDelta = deltaTime * (this.onFloor ? this.speed : this.airSpeed);

        if (input.isHeld('KeyW')) { this.velocity.add(this.getForwardVector().multiplyScalar(speedDelta)); }
        if (input.isHeld('KeyS')) { this.velocity.add(this.getForwardVector().multiplyScalar(-speedDelta)); }
        if (input.isHeld('KeyA')) { this.velocity.add(this.getSideVector().multiplyScalar(-speedDelta)); }
        if (input.isHeld('KeyD')) { this.velocity.add(this.getSideVector().multiplyScalar(speedDelta)); }
        // Jump
        if (this.onFloor && input.isPressed('Space')) {
            this.velocity.y = this.jumpSpeed;
        }
        // Camera toggle
        if (input.isPressed('KeyC')) {
            this.currCam = !this.currCam;
            engine.camera = this.currCam ? this.camera : this.topDownCamera;
        }
        // Return to menu
        if (input.isPressed("Escape")) engine.scene = new MenuScene(() => {
            const toggle = document.getElementById("levelSwitch")! as HTMLInputElement;
            return new GameScene(toggle.checked ? "scene2" : "scene1");
        });

        if (input.isHeld('NumpadAdd')) { this.waterLevel += 1; }
        if (input.isHeld('NumpadSubtract') && this.waterLevel > 0) { this.waterLevel -= 1; }
    }

    // Update player position and check collisions
    updatePlayer(deltaTime: number) {
        let damping = Math.exp(-30 * deltaTime) - 1;

        if (!this.onFloor) {
            this.velocity.y -= (engine.scene! as GameScene).gravity * deltaTime;
            damping *= 0.1;
        }

        this.velocity.addScaledVector(this.velocity, damping);
        const deltaPosition = this.velocity.clone().multiplyScalar(deltaTime);
        this.collider.translate(deltaPosition);

        this.collisions();

        this.head.position.copy(this.collider.end);

        if (this.brush) this.brush.updateMatrixWorld();
    }

    // Check collision with scene
    collisions() {
        const result = (this.scene! as GameScene).worldOctree.capsuleIntersect(this.collider);
        this.onFloor = false;

        if (result) {
            this.onFloor = result.normal.y > 0;
            if (!this.onFloor) {
                this.velocity.addScaledVector(result.normal, -result.normal.dot(this.velocity));
            }
            this.collider.translate(result.normal.multiplyScalar(result.depth));
        }
    }

    // Check is player outside of map
    playerOutOfBounds() {
        if (this.head.position.y <= -25) {
            this.collider.start.set(0, 0.35, 0);
            this.collider.end.set(0, 1, 0);
            this.collider.radius = 0.35;
            this.head.position.copy(this.collider.end);
            this.head.rotation.set(0, 0, 0);
        }
    }

    // Updates camera position to match head
    updateChildren() {
        this.camera.position.copy(this.head.position);
        this.camera.rotation.copy(this.head.rotation);
        this.topDownCamera.position.x = this.head.position.x;
        this.topDownCamera.position.z = this.head.position.z;
        this.brpar!.position.copy(this.head.position);
        this.brpar!.rotation.copy(this.head.rotation);
    }

    // Gets forward pointing vector
    getForwardVector() {
        const looking = new THREE.Vector3();
        engine.camera!.getWorldDirection(looking);
        if (!this.currCam) looking.multiplyScalar(-1);
        looking.y = 0;
        looking.normalize();

        return looking;
    }

    // Gets sideways pointing vector
    getSideVector() {
        return this.getForwardVector().cross(this.camera.up);
    }

    // Updates UI when setting waterLevel
    set waterLevel(level: number) {
        this._waterLevel = level;
        new Promise((() => {    // Update UI in promise to avoid delays
            this.waterElement.innerText = level.toString();
            const text = level > 0 ? "🌢".repeat(level) : "Refill at Bucket";
            this.waterMarkers.innerText = text; // + "○".repeat(this.waterCapacity - level);
        }).bind(this));
    }
    get waterLevel() {
        return this._waterLevel;
    }

    // Updates UI when setting cleanCount
    set cleanCount(count: number) {
        this._cleanCount = count;
        const perc = 100.0 * count / this.cleanTarget;
        this.cleanedElement.innerText = Math.trunc(perc).toString();
    }

    get cleanCount() {
        return this._cleanCount;
    }

    // Removes pointers on scene change
    destroy() {
        window.removeEventListener("pointerup", this.pointerUp);
        document.body.removeEventListener("mousemove", this.mouseMove);
    }
}