import * as THREE from 'three';
import { DecalGeometry } from 'three-stdlib/geometries/DecalGeometry';
import { GameScene } from './gamescene';
import { BasicScene, engine, textures, Updatable } from './engine/engine';

export { MessDecals, intersectionT }

const collMat = new THREE.MeshBasicMaterial();

let line: THREE.Line;

type intersectionT = { intersects: boolean; point: THREE.Vector3; normal: THREE.Vector3 };
type dirtT = { decal: THREE.Mesh, collider: THREE.Mesh }

class MessDecals {
    // decals: THREE.Mesh[] = [];
    scene: GameScene;

    dirts: Map<number, dirtT> = new Map();
    colliders = new THREE.Group();
    decals = new THREE.Group();
    decalMaterials: THREE.MeshPhongMaterial[];

    constructor(scene: GameScene) {
        this.scene = scene;
        scene.add(this.colliders);
        scene.add(this.decals);

        this.decalMaterials = [new THREE.MeshPhongMaterial({
            specular: 0x444444, shininess: 30,
            map: textures.getData("decal_diff1"), 
            normalMap: textures.getData("decal_norm1"),
            transparent: true, depthTest: true, depthWrite: false,
            polygonOffset: true, polygonOffsetFactor: -4, wireframe: false
        }),
        new THREE.MeshPhongMaterial({
            specular: 0x444444, shininess: 30,
            map: textures.getData("decal_diff2"), 
            normalMap: textures.getData("decal_norm2"),
            transparent: true, depthTest: true, depthWrite: false,
            polygonOffset: true, polygonOffsetFactor: -4, wireframe: false
        }),
        new THREE.MeshPhongMaterial({
            specular: 0x444444, shininess: 30,
            map: textures.getData("decal_diff3"), 
            normalMap: textures.getData("decal_norm3"),
            transparent: true, depthTest: true, depthWrite: false,
            polygonOffset: true, polygonOffsetFactor: -4, wireframe: false
        })]
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

        const material = (this.decalMaterials[Math.trunc(Math.random() * this.decalMaterials.length)]).clone();
        material.color.setHex(Math.random() * 0xffffff);

        const m = new THREE.Mesh(
            new DecalGeometry(this.scene.mesh!, position, orientation, size),
            material
        );

        this.decals.add(m);
        this.scene.add(m);

        const sph = new THREE.Mesh(new THREE.SphereGeometry(0.75), collMat);
        sph.visible = false;
        sph.position.set(position.x, position.y, position.z);
        
        this.dirts.set(sph.id, {decal: m, collider: sph});
        this.dirts.set(m.id, {decal: m, collider: sph});
        this.colliders.add(sph);

        // console.log(m, sph);
    }

    clean() {
        const mouse = new THREE.Vector2();
        mouse.x = (window.innerWidth/2 / window.innerWidth) * 2 - 1;
        mouse.y = -(window.innerHeight/2 / window.innerHeight) * 2 + 1;

        this.scene.raycaster.setFromCamera(mouse, engine.camera!);
        const intersects: THREE.Intersection[] = [];
        this.scene.raycaster.intersectObjects(this.colliders.children, true, intersects);

        // console.log(intersects);
        if (intersects.length == 0 || intersects[0].distance > 1) {
            this.scene.raycaster.intersectObjects(this.decals.children, true, intersects);
            if (intersects.length == 0 || intersects[0].distance > 1) return false;
        }

        const id = intersects[0].object.id;
        const dirt = this.dirts.get(id)!;
        // console.log(dirt);

        this.colliders.remove(dirt.collider);
        this.decals.remove(dirt.decal);
        this.scene.remove(dirt.decal);
        this.scene.remove(dirt.collider);
        this.dirts.delete(id);
        return true;
    }

    static convertIntersectType(int: THREE.Intersection) {
        const n = int.face!.normal.clone();
        const normalTransform = new THREE.Matrix3().getNormalMatrix(int.object.matrixWorld);
        n.applyMatrix3(normalTransform).normalize();

        return { intersects: true, point: int.point.clone(), normal: n };
    }

    removeDecals () {
        const s = this.scene;
        this.decals.traverse(function (d) {
            s.remove(d);
        });
        this.decals.clear();
    }
}

        // const p = intersection.point.clone();
        // const n = intersection.normal.clone();
        // n.add(p);
        // const positions = line.geometry.attributes.position;
        // positions.setXYZ(0, p.x, p.y, p.z);
        // positions.setXYZ(1, n.x, n.y, n.z);
        // positions.needsUpdate = true;
        // line.geometry.computeBoundingSphere();