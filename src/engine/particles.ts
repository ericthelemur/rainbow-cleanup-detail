import * as THREE from 'three';
import { GameScene } from '../gamescene';
import { textures } from './engine';
import { BasicScene } from './scenes';

const vertexShader = `
uniform float pointMultiplier;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = pointMultiplier / gl_Position.w;
}`;

const fragmentShader = `
uniform sampler2D diffuseTexture;

void main() {
  gl_FragColor = texture2D(diffuseTexture, gl_PointCoord);
}`;

type Particle = { position: THREE.Vector3 }

export class ParticleSystem {
    scene: GameScene;
    material: THREE.ShaderMaterial;
    particles: Particle[] = [];
    geometry = new THREE.BufferGeometry();
    points: THREE.Points;

    constructor(scene: GameScene) {
        this.scene = scene;
        const uniforms = {
            diffuseTexture: { value: textures.getData("decal_diff1") },
            pointMultiplier: { value: window.innerHeight / (2.0 * Math.tan(0.5 * 60.0 * Math.PI / 180.0)) }
        };

        this.material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            blending: THREE.AdditiveBlending,
            depthTest: true,
            depthWrite: false,
            transparent: true,
            vertexColors: true
        });

        this.geometry.setAttribute("position", new THREE.Float32BufferAttribute([], 3));
        this.points = new THREE.Points(this.geometry, this.material);
        
        this.scene.add(this.points);

        for (let i = 0; i < 100; i++) {
            this.particles.push({
                position: new THREE.Vector3(
                    Math.random() * 2 - 1,
                    Math.random() * 2 - 1,
                    Math.random() * 2 - 1
                )
            });
        }
        this.updateGeometry();
    }

    updateGeometry() {
        const positions = [];
        for (let p of this.particles) {
            positions.push(p.position.x, p.position.y, p.position.z);
        }

        this.geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        this.geometry.attributes.position.needsUpdate = true;
        console.log("POS", positions)
    }
}