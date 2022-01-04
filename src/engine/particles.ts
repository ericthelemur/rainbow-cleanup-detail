import * as THREE from 'three';
import { GameScene } from '../gamescene';
import { engine, textures } from './engine';
import { BasicScene, Updatable } from './scenes';

// Vertex shader sets size and passes properties to fragment
const vertexShader = `
attribute float size;
attribute vec4 colour;
attribute float angle;

varying vec4 vColour;
varying vec2 vAngle;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  gl_PointSize = size / gl_Position.w;
  vAngle = vec2(cos(angle), sin(angle));
  vColour = colour;
}`;

// Fragment shader colours and rotate image
const fragmentShader = `
uniform sampler2D diffuseTexture;

varying vec4 vColour;
varying vec2 vAngle;

void main() {
  vec2 coords = (gl_PointCoord - 0.5) * mat2(vAngle.x, vAngle.y, -vAngle.y, vAngle.x) + 0.5;
  gl_FragColor = texture2D(diffuseTexture, coords) * vColour;
}`;

type Particle = { position: THREE.Vector3, velocity: THREE.Vector3, 
                rotation: number, size: number, 
                colour: THREE.Color, life: number,  }

export class ParticleSystem extends Updatable {
    scene: GameScene | null = null;
    material: THREE.ShaderMaterial;
    particles: Particle[] = [];
    geometry = new THREE.BufferGeometry();
    points: THREE.Points;

    constructor() {
        super();
        // Shader uniforms
        const uniforms = {
            diffuseTexture: { value: textures.getData("decal_diff1") },
        };

        this.material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            depthTest: true, depthWrite: false,
            transparent: false,
            vertexColors: true
        });

        // Attributes used in shader
        this.geometry.setAttribute("position", new THREE.Float32BufferAttribute([], 3));
        this.geometry.setAttribute("size", new THREE.Float32BufferAttribute([], 1));
        this.geometry.setAttribute("colour", new THREE.Float32BufferAttribute([], 4));
        this.geometry.setAttribute("angle", new THREE.Float32BufferAttribute([], 1));
        this.points = new THREE.Points(this.geometry, this.material);
    }

    init(scene: GameScene) {
        super.init(scene);
        scene.add(this.points);
    }

    initAfter() {
        // Update geometry after camera has been created
        this.updateGeometry();
    }

    // Pop of particles on cleaning decal
    clean(loc: THREE.Vector3, colour: THREE.Color, normal: THREE.Vector3) {
        // Approx decal colour without lighting
        colour = colour.lerp(new THREE.Color("white"), 0.7);
        // Create points
        for (let i = 0; i < 200; i++) {
            // Velocity is random away from wall
            const vel = new THREE.Vector3().randomDirection().multiplyScalar(4 * Math.random());
            if (vel.dot(normal) < 0) vel.multiplyScalar(-1.0);
            const pos = loc.clone();
            // Add particle
            this.particles.push({ position: pos, velocity: vel,
                rotation: 2.0 * Math.PI * Math.random(),
                size: 10 + Math.random() * 20,
                colour: colour, life: 1
            });
        }
        this.updateGeometry();

    }

    update(deltaTime: number): void {
        // Kill when out of life
        this.particles.forEach((p) => p.life -= deltaTime);
        this.particles = this.particles.filter((p) => p.life > 0.0);

        // Apply gravity and motion
        this.particles.forEach((p) => {
            p.velocity.y -= 15 * deltaTime;
            p.position.addScaledVector(p.velocity, deltaTime);
        })

        this.updatePositions();
    }

    // Sort points so display order is correct
    pointComp(a: Particle, b: Particle) {
        const d1 = engine.camera!.position.distanceToSquared(a.position);
        const d2 = engine.camera!.position.distanceToSquared(b.position);
        return d1 - d2;
    }

    updateGeometry() {
        this.particles.sort(this.pointComp);

        // Fill arrays with values
        const positions = [];
        const sizes = [];
        const colours = [];
        const angles = [];
        for (let p of this.particles) {
            positions.push(p.position.x, p.position.y, p.position.z);
            sizes.push(p.size);
            colours.push(p.colour.r, p.colour.g, p.colour.b, 0.75);
            angles.push(p.rotation);
        }

        // Pass arrays into geometry
        this.geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        this.geometry.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1));
        this.geometry.setAttribute("colour", new THREE.Float32BufferAttribute(colours, 4));
        this.geometry.setAttribute("angle", new THREE.Float32BufferAttribute(angles, 1));
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.size.needsUpdate = true;
        this.geometry.attributes.colour.needsUpdate = true;
        this.geometry.attributes.angle.needsUpdate = true;
        // Update bounding info so not clipped
        this.geometry.computeBoundingBox();
        this.geometry.computeBoundingSphere();
    }

    updatePositions() {
        // Update only positions - all that is needed per frame
        const positions = [];
        for (let p of this.particles) {
            positions.push(p.position.x, p.position.y, p.position.z);
        }

        this.geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.computeBoundingBox();
        this.geometry.computeBoundingSphere();
    }
}