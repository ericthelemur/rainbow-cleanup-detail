
import * as THREE from 'three';
import { Capsule } from 'three-stdlib/math/Capsule';
import { engine, input, textures, models, Updatable, GLBScene } from './engine/engine';
import { loadTexturedModel } from './engine/loader';
import { GameScene } from './gamescene';

export class Player extends Updatable {
    head: THREE.Object3D = new THREE.Object3D();
    camera: THREE.PerspectiveCamera;
    collider: Capsule;

    velocity: THREE.Vector3;
    direction: THREE.Vector3;
    onFloor: boolean;

    mouseTime: number;
    mass: number = 50;
    brush: THREE.Mesh | null;

    speed: number = 300;
    airSpeed: number = 50;
    jumpSpeed: number = 50;

    constructor() {
        super();
        this.head.rotation.order = 'YXZ';

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.collider = new Capsule(new THREE.Vector3(0, 0.35, 0), new THREE.Vector3(0, 1, 0), 0.35);
        this.brush = null;

        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();

        this.onFloor = false;
        this.mouseTime = 0;
    }

    init(scene: GameScene) {
        super.init(scene);
        scene.add(this.head);
        scene.cameras.set("main", this.camera);

        const p = this;
        window.addEventListener('pointerup', function(event) {
            if (event.button == 0) p.splat();
            else if (event.button == 2) scene.decals.clean();
        });
        
        document.body.addEventListener('mousemove', event => {
            if (document.pointerLockElement === document.body) {
                this.head.rotation.y -= event.movementX / 500;
                this.head.rotation.x -= event.movementY / 500;
            }
        });

        const brush = models.get("brush")!.data!;

        this.brush = brush.clone();
        this.head.add(this.brush);
        this.brush.translateZ(-0.8);
        this.brush.translateY(-0.2);
        this.brush.translateX(0.4);

        this.brush.rotateX(Math.PI/2);
        this.brush.rotateY(Math.PI / 6);
        
        // const c = brush.clone();
        // scene.add(c);
        // c.translateY(-1);
    }

    splat () {
        const decals = (this.scene as GameScene).decals;
        const intersection = decals.checkIntersection(window.innerWidth/2, window.innerHeight/2, this.scene);
        if (!intersection.intersects) return;
        decals.addDecal(intersection);
    }

    updateChildren() {
        this.camera.position.copy(this.head.position);
        this.camera.rotation.copy(this.head.rotation);
    }

    update(deltaTime: number) {
        this.controls(deltaTime);
        this.updatePlayer(deltaTime);
        this.teleportPlayerIfOob();

        this.updateChildren();
    }

    updatePlayer (deltaTime: number) {
        let damping = Math.exp(-30 * deltaTime) - 1;

        if (!this.onFloor) {
            this.velocity.y -= (engine.scene! as GameScene).gravity * deltaTime;

            // small air resistance
            damping *= 0.1;
        }

        this.velocity.addScaledVector(this.velocity, damping);
        const deltaPosition = this.velocity.clone().multiplyScalar(deltaTime);
        this.collider.translate(deltaPosition);

        this.collisions();

        this.head.position.copy(this.collider.end);

        if (this.brush) {
            this.brush.updateMatrixWorld();
        }
    }

    collisions () {
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
    
    teleportPlayerIfOob() {
        if (this.head.position.y <= -25) {
            this.collider.start.set(0, 0.35, 0);
            this.collider.end.set(0, 1, 0);
            this.collider.radius = 0.35;
            this.head.position.copy(this.collider.end);
            this.head.rotation.set(0, 0, 0);
        }
    }

    
    controls (deltaTime: number) {
        // gives a bit of air control
        const speedDelta = deltaTime * (this.onFloor ? this.speed : this.airSpeed);

        if (input.isHeld('KeyW')) { this.velocity.add(this.getForwardVector().multiplyScalar(speedDelta)); }
        if (input.isHeld('KeyS')) { this.velocity.add(this.getForwardVector().multiplyScalar(-speedDelta)); }
        if (input.isHeld('KeyA')) { this.velocity.add(this.getSideVector().multiplyScalar(-speedDelta)); }
        if (input.isHeld('KeyD')) { this.velocity.add(this.getSideVector().multiplyScalar(speedDelta)); }

        if (this.onFloor) {
            if (input.isPressed('Space')) {
                this.velocity.y = this.jumpSpeed;
            }
        }
    }

    getForwardVector () {
        const looking = new THREE.Vector3();
        this.camera.getWorldDirection(looking);
        looking.y = 0;
        looking.normalize();

        return looking;
    }

    getSideVector () {
        return this.getForwardVector().cross(this.camera.up);
    }
}