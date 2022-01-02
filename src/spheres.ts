import * as THREE from 'three';
import { engine } from './engine/engine';
import { addV, subV } from "./engine/utils";
import { GameScene } from './gamescene';
import { Player } from "./player";
export { Sphere, Spheres}

const NUM_SPHERES = 100;
const SPHERE_RADIUS = 0.2;

const sphereGeometry = new THREE.SphereGeometry(SPHERE_RADIUS, 32, 32);
const sphereMaterial = new THREE.MeshStandardMaterial({
    color: 0x888855,
    roughness: 0.8,
    metalness: 0.5
});

class Sphere {
    mesh: THREE.Mesh;
    collider: THREE.Sphere;
    velocity: THREE.Vector3;
    mass: number;

    constructor() {
        const mesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        engine.scene!.add(mesh);
        
        this.mesh = mesh;
        this.collider = new THREE.Sphere(new THREE.Vector3(0, -100, 0), SPHERE_RADIUS);
        this.velocity = new THREE.Vector3();
        this.mass = 1;
    }

    collide(s2: Sphere) {
        const d2 = this.collider.center.distanceToSquared(s2.collider.center);
        const r = this.collider.radius + s2.collider.radius;
        const r2 = r * r;

        if (d2 < r2) {
            const collNormal = subV(this.collider.center, s2.collider.center).normalize();
            const v1 = collNormal.clone().multiplyScalar(collNormal.dot(this.velocity));
            const v2 = collNormal.clone().multiplyScalar(collNormal.dot(s2.velocity));

            this.velocity.add(v2).sub(v1);
            s2.velocity.add(v1).sub(v2);

            const d = (r - Math.sqrt(d2)) / 2;

            this.collider.center.addScaledVector(collNormal, d);
            s2.collider.center.addScaledVector(collNormal, -d);
        }
    }

    update(deltaTime: number) {
        this.collider.center.addScaledVector(this.velocity, deltaTime);

        const result = (engine.scene! as GameScene).worldOctree.sphereIntersect(this.collider);

        if (result) {
            this.velocity.addScaledVector(result.normal, -result.normal.dot(this.velocity) * 1.5);
            this.collider.center.add(result.normal.multiplyScalar(result.depth));
        } else {
            this.velocity.y -= (engine.scene! as GameScene).gravity * deltaTime;
        }

        const damping = Math.exp(-1.5 * deltaTime) - 1;
        this.velocity.addScaledVector(this.velocity, damping);
    }

    playerCollision (player: Player) {
        const coll = player.collider;
        const center = coll.start.clone().sub(coll.end).multiplyScalar(0.5);
        const sphere_center = this.collider.center;

        const r = coll.radius + this.collider.radius;
        const r2 = r * r;

        // approximation: player = 3 spheres

        for (const point of [coll.start, coll.end, center]) {
            const d2 = point.distanceToSquared(sphere_center);

            if (d2 < r2) {
                const normal = point.clone().sub(sphere_center).normalize();
                const v1 = normal.clone().multiplyScalar(normal.dot(player.velocity));
                const v2 = normal.clone().multiplyScalar(normal.dot(this.velocity));

                player.velocity.add(v2).sub(v1);
                this.velocity.add(v1).sub(v2);

                const d = (r - Math.sqrt(d2)) / 2;
                sphere_center.addScaledVector(normal, -d);
            }
        }
    }
};

var Spheres = (function() {
    // Private
    const spheres: Sphere[] = [];
    let sphereIdx = 0;

    function spheresCollisions () {
        for (const [i, s1] of spheres.entries()) {
            for (const s2 of spheres.slice(i+1)) {
                s1.collide(s2);
            }
        }
    }

    return {    // Public
        spheres: spheres,
        initSpheres: function() {
            for (let i = 0; i < NUM_SPHERES; i++) {
                spheres.push(new Sphere());
            }
        },

        getNextSphere: function() {
            const sphere = spheres[sphereIdx];
            sphereIdx = (sphereIdx + 1) % spheres.length;
            return sphere;
        },

        updateSpheres: function(deltaTime: number) {
            spheres.forEach(sphere => sphere.update(deltaTime));

            spheresCollisions();

            for (const sphere of spheres) { // Update spheres to match collisions
                sphere.mesh.position.copy(sphere.collider.center);
            }
        },

        throwBall (player: Player) {
            const sphere = this.getNextSphere();
            player.camera.getWorldDirection(player.direction);
    
            sphere.collider.center.copy(player.collider.end).addScaledVector(player.direction, player.collider.radius * 2);
    
            // throw the ball with more force if we hold the button longer, and if we move forward
            const impulse = 15 + 30 * (1 - Math.exp((player.mouseTime - performance.now()) * 0.001));
            sphere.velocity.copy(player.direction).multiplyScalar(impulse);
            sphere.velocity.addScaledVector(player.velocity, 2);
        }
    };
})();