import * as THREE from 'three';
import { DecalGeometry } from './mydecalgeom';
import { audio, engine, models, textures, Updatable } from './engine/engine';
import { GameScene } from './gamescene';
import { Object3D } from "three";

export { MessDecals, intersectionT, DirtType };

const collMat = new THREE.MeshBasicMaterial({transparent: true, opacity: 0.5, depthWrite: false});

// let line: THREE.Line;

type intersectionT = { intersects: boolean; point: THREE.Vector3; normal: THREE.Vector3; };

enum DirtType {
    DECAL,
    BLOCK,
    POWERUP
}
type dirtT = { decal: THREE.Mesh, collider: THREE.Mesh; type: DirtType, SFX?: THREE.PositionalAudio, container: THREE.Object3D };

class MessDecals extends Updatable {
    // Stores references to colliders and decals
    dirts: Map<number, dirtT> = new Map();
    colliders = new THREE.Group();
    decals = new THREE.Group();

    decalMaterials: THREE.MeshPhongMaterial[];
    blocks: THREE.Mesh[];
    blockMat: THREE.MeshPhongMaterial;
    anims: THREE.AnimationMixer[] = [];

    constructor() {
        super();
        this.colliders.name = "Colliders";
        this.decals.name = "Decals";
        
        // Creates materials
        const args = {  // common vals
            specular: 0x444444, shininess: 10,
            transparent: true, depthTest: true, depthWrite: false,
            polygonOffset: true, polygonOffsetFactor: -4
        }

        function mat(num: number) {
            return new THREE.MeshPhongMaterial({...args,
                map: textures.getData("decal_diff" + num.toString()),
                normalMap: textures.getData("decal_norm" + num.toString()),
            });
        }
        this.decalMaterials = [mat(4), mat(5), mat(6), mat(7)]; // Contruct decal mats from each texture index

        // Create blocks
        this.blockMat = new THREE.MeshPhongMaterial({...args, depthWrite: true});
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

    init(scene: GameScene) {
        super.init(scene);
        this.scene = scene;
        scene.add(this.colliders);
        scene.add(this.decals);
    }

    update(deltaTime: number) {
        super.update(deltaTime);
        this.anims.forEach((mixer) => mixer.update(deltaTime));
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
        const scale = 0.75 * (1 + Math.random());
        const size = new THREE.Vector3(scale, scale, 0.1);

        const i = Math.trunc(Math.random() * this.decalMaterials.length);
        const material = (this.decalMaterials[i]).clone();
        material.color.setHex(Math.random() * 0xffffff);
        // material.specular.set(material.color);

        // Create mesh
        const geom = new DecalGeometry((this.scene as GameScene).mesh!, position, orientation, size, intersection.normal.clone());
        const mesh = new THREE.Mesh(geom, material);
        mesh.name = "Decal";
        mesh.receiveShadow = true;
        mesh.castShadow = false;    // Actually useless with VSM shadows, but in case using other

        this.add(mesh, position);
    }

    // Adds decal at the point and normal given
    addBlock(intersection: intersectionT) {
        const position = intersection.point.clone();

        // Use workaround with blank O3D to get Euler angles for decal projection
        const o = new THREE.Object3D();
        o.position.copy(position);
        o.lookAt(position.clone().add(intersection.normal));

        // Pick block type
        const i = Math.trunc(Math.random() * this.blocks.length);
        const block = (this.blocks[i]).clone();
        // Random colour
        const mat = (block.material as THREE.MeshPhongMaterial).clone();
        mat.color.setHex(Math.random() * 0xffffff);
        block.material = mat;

        // Random rotation and scale
        o.rotateX(Math.PI/2);
        o.rotateY(Math.random() * 2 * Math.PI);

        const scale = (1 + Math.random()) * 0.3;
        // position.addScaledVector(intersection.normal, scale * 0.5);
        
        block.scale.set(scale, scale, scale);

        block.position.set(0, scale * 0.47, 0);
        block.castShadow = true;
        block.receiveShadow = true;
        block.name = "Block";
        o.add(block);

        this.add(block, position, DirtType.BLOCK, undefined, o);
    }

    // Adds powerup at the point and normal given
    addPowerUp(intersection: intersectionT) {
        const position = intersection.point.clone();

        // Pick block type
        const powerup = models.getData("powerup").clone();
        powerup.name = "Powerup";
        // Random colour
        const mat = (powerup.material as THREE.MeshPhongMaterial).clone();
        mat.color.setHSL(Math.random() * 255, 0.5, 0.5);
        powerup.material = mat;

        position.addScaledVector(intersection.normal, 1);

        const container = new Object3D();
        container.name = "Powerup container";
        container.position.set(position.x, position.y, position.z);
        container.add(powerup);
        powerup.castShadow = true;
        powerup.receiveShadow = true;

        // Add SFX to powerup
        const sound = audio.getData("powerup");
        const posSound = new THREE.PositionalAudio(engine.audio);
        posSound.setBuffer(sound.buffer!);
        posSound.setRefDistance(5);
        posSound.setLoop(true);
        posSound.setVolume(0.05);
        posSound.play();
        container.add(posSound);

        // Add animation to powerup
        const pgltf = models.getGLTF("powerup_gltf");
        const anim = pgltf.animations[0];
        const mixer = new THREE.AnimationMixer(powerup);
        const clip = mixer.clipAction(anim, powerup);
        clip.play();
        this.anims.push(mixer);
        
        this.add(powerup, position, DirtType.POWERUP, posSound, container);
    }

    // Adds block or decal to scene with collider
    add(mesh: THREE.Mesh, position: THREE.Vector3, type: DirtType = DirtType.DECAL, SFX?: THREE.PositionalAudio, container?: THREE.Object3D) {
        this.decals.add((container ? container : mesh));

        // Create collider
        const sph = new THREE.Mesh(new THREE.SphereGeometry(0.75), collMat);
        sph.name = "Sphere Collider";
        sph.visible = false;
        sph.position.set(position.x, position.y, position.z);

        const e = { decal: mesh, collider: sph, type: type, SFX: SFX, container: (container ? container : mesh) };
        this.dirts.set(sph.id, e);
        this.dirts.set(mesh.id, e);
        this.colliders.add(sph);
    }

    clean() {
        // Raycast onto colliders
        const raycaster = (this.scene as GameScene).raycaster;
        raycaster.setFromCamera(new THREE.Vector2(), engine.camera!);
        const intersects: THREE.Intersection[] = [];
        raycaster.intersectObjects(this.colliders.children, true, intersects);

        // If no intersection, attempt raycast onto decals directly
        if (intersects.length == 0 || intersects[0].distance > 1) {
            raycaster.intersectObjects(this.decals.children, true, intersects);
            if (intersects.length == 0 || intersects[0].distance > 1) return null;
        }

        // Fetch decal info
        const id = intersects[0].object.id;
        const inter = MessDecals.convertIntersectType(intersects[0]);
        const dirt = this.dirts.get(id)!;

        // Remove from scene
        this.colliders.remove(dirt.collider);
        this.decals.remove(dirt.container);
        this.dirts.delete(id);

        // Stop powerup sound
        dirt.SFX?.stop();
        return { intersection: inter, ...dirt};
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
            s!.remove(d);
        });
        this.dirts.forEach((d) => d.SFX?.stop());
        this.decals.clear();
    }
}