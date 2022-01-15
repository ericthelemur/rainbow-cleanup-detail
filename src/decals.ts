import * as THREE from 'three';
import { DecalGeometry } from 'three-stdlib/geometries/DecalGeometry';
import { engine, textures } from './engine/engine';
import { GameScene } from './gamescene';

export { MessDecals, intersectionT };

const collMat = new THREE.MeshBasicMaterial();

// let line: THREE.Line;

type intersectionT = { intersects: boolean; point: THREE.Vector3; normal: THREE.Vector3; };
type dirtT = { decal: THREE.Mesh, collider: THREE.Mesh; };

class MessDecals {
    scene: GameScene;

    // Stores references to colliders and decals
    dirts: Map<number, dirtT> = new Map();
    colliders = new THREE.Group();
    decals = new THREE.Group();

    decalMaterials: THREE.MeshPhongMaterial[];
    blocks: THREE.Mesh[];
    blockMat: THREE.MeshPhongMaterial;

    constructor(scene: GameScene) {
        this.scene = scene;
        scene.add(this.colliders);
        scene.add(this.decals);

        function mat(num: number) {
            return new THREE.MeshPhongMaterial({
                specular: 0x444444, shininess: 30,
                map: textures.getData("decal_diff" + num.toString()),
                normalMap: textures.getData("decal_norm" + num.toString()),
                transparent: true, depthTest: true, depthWrite: false,
                polygonOffset: true, polygonOffsetFactor: -4, wireframe: false
            });
        }
        // Creates materials
        this.decalMaterials = [mat(1), mat(2), mat(3)];

        this.blockMat = new THREE.MeshPhongMaterial();
        this.blocks = [
            new THREE.Mesh(new THREE.BoxGeometry(), this.blockMat),
            new THREE.Mesh(new THREE.SphereGeometry(0.5), this.blockMat),
            new THREE.Mesh(new THREE.CylinderGeometry(0, 0.6, 0.8, 3, 1), this.blockMat), // tetrahedron
            new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5), this.blockMat),
            new THREE.Mesh(new THREE.DodecahedronGeometry(0.5), this.blockMat),
            new THREE.Mesh(new THREE.ConeGeometry(0.5), this.blockMat),
            new THREE.Mesh(new THREE.BoxGeometry(), this.blockMat),
        ];
    }


    // Adds decal at the point and normal given
    addDecal(intersection: intersectionT) {
        const position = intersection.point.clone();

        // Use workaround with blank O3D to get Euler angles for decal projection
        const o = new THREE.Object3D();
        o.position.copy(intersection.point.clone().add(intersection.normal));
        o.lookAt(intersection.point);
        const orientation = o.rotation;

        // Randomize orientation, scale, and colour
        orientation.z = Math.random() * 2 * Math.PI;
        const scale = 1 + Math.random() * (2 - 1);
        const size = new THREE.Vector3(scale, scale, 0.05);

        const i = Math.trunc(Math.random() * this.decalMaterials.length);
        const material = (this.decalMaterials[i]).clone();
        material.color.setHex(Math.random() * 0xffffff);

        // Create mesh
        const geom = new DecalGeometry(this.scene.mesh!, position, orientation, size);
        const mesh = new THREE.Mesh(geom, material);

        this.add(mesh, position);
    }

    // Adds decal at the point and normal given
    addBlock(intersection: intersectionT) {
        const position = intersection.point.clone();

        const i = Math.trunc(Math.random() * this.blocks.length);
        const block = (this.blocks[i]).clone();
        const mat = (block.material as THREE.MeshPhongMaterial).clone();
        mat.color.setHex(Math.random() * 0xffffff);
        block.material = mat;

        block.rotateY(Math.random() * 2 * Math.PI);

        const scale = (1 + Math.random()) * 0.2;
        position.addScaledVector(intersection.normal, scale * 0.5);
        block.scale.set(scale, scale, scale);

        block.position.set(position.x, position.y, position.z);

        this.add(block, position);
    }

    // Adds block or decal to scene with collider
    add(mesh: THREE.Mesh, position: THREE.Vector3) {
        this.decals.add(mesh);   // Add o if given, otherwise the mesh

        // Create collider
        const sph = new THREE.Mesh(new THREE.SphereGeometry(0.75), collMat);
        sph.visible = false;
        sph.position.set(position.x, position.y, position.z);

        const e = { decal: mesh, collider: sph };
        this.dirts.set(sph.id, e);
        this.dirts.set(mesh.id, e);
        this.colliders.add(sph);
    }

    clean() {
        // Raycast onto colliders
        this.scene.raycaster.setFromCamera(new THREE.Vector2(), engine.camera!);
        const intersects: THREE.Intersection[] = [];
        this.scene.raycaster.intersectObjects(this.colliders.children, true, intersects);

        // If no intersection, attempt raycast onto decals directly
        if (intersects.length == 0 || intersects[0].distance > 1) {
            this.scene.raycaster.intersectObjects(this.decals.children, true, intersects);
            if (intersects.length == 0 || intersects[0].distance > 1) return null;
        }

        // Fetch decal info
        const id = intersects[0].object.id;
        const inter = MessDecals.convertIntersectType(intersects[0]);
        const dirt = this.dirts.get(id)!;

        // Remove from scene
        this.colliders.remove(dirt.collider);
        this.decals.remove(dirt.decal);
        this.dirts.delete(id);
        return { intersection: inter, decal: dirt.decal, collider: dirt.collider };
    }

    // Converts from Three intersection, fetching normal
    static convertIntersectType(int: THREE.Intersection) {
        const n = int.face!.normal.clone();
        const normalTransform = new THREE.Matrix3().getNormalMatrix(int.object.matrixWorld);
        n.applyMatrix3(normalTransform).normalize();

        return { intersects: true, point: int.point.clone(), normal: n };
    }

    // Cleanup
    removeDecals() {
        const s = this.scene;
        this.decals.traverse(function(d) {
            s.remove(d);
        });
        this.decals.clear();
    }
}
        // Debug line code
        // const p = intersection.point.clone();
        // const n = intersection.normal.clone();
        // n.add(p);
        // const positions = line.geometry.attributes.position;
        // positions.setXYZ(0, p.x, p.y, p.z);
        // positions.setXYZ(1, n.x, n.y, n.z);
        // positions.needsUpdate = true;
        // line.geometry.computeBoundingSphere();