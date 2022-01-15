import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three-stdlib/loaders/GLTFLoader';
import { engine, models, textures } from './engine';
export { Textures, Models, loadTexturedModel, Audio };

type LoadT<T> = { url: string; data: T | null; };

// Class to represent generic resource loader, creates promises for multiple loads
class ResourceLoader<T> extends Map<string, LoadT<T>> {
    loader: THREE.Loader;

    constructor(loader: THREE.Loader) {
        super();
        this.loader = loader;
    }

    // Load a single resource
    load(name: string, url: string, then?: (data: T) => any) {
        if (this.get(name)?.url == url) return Promise.resolve();
        return this.createPromise(name, url, then);
    }

    // Load multiple resources at a time
    loadMultiple(urls: { [key: string]: string; }, then?: () => any): Promise<any> {
        const promises = [];
        for (var key in urls) {
            promises.push(this.load(key, urls[key], undefined));
        }
        return Promise.all(promises).then(then);
    }

    // Base funciton creating the load calls
    createPromise(name: string, url: string, then?: (data: T) => any) {
        if (this.get(name)) {
            if (then) return new Promise<T>(() => { then(this.getData(name)); });
            else return Promise.resolve();
        }
        if (!url) return Promise.resolve();

        return this._combine(name, url, then);
    }

    _combine(name: string, url: string, then?: (data: T) => any) {
        return this.loader.loadAsync(url)
            .then(this.storeResult(name, url))
            .then(then);
    }

    // Stores result in dict
    storeResult(name: string, url: string) {
        return (result: any) => {
            const entry = { url: url, data: result };
            this.set(name, entry);
            return result;
        };
    }

    // Fetch from dict
    getData(key: string): T {
        return super.get(key)!.data!;
    }

    public get path(): string {
        return this.loader.path;
    }

}

// Resource paths
const RESOURCE_BASE = "../resources/";
const MODEL_PATH = RESOURCE_BASE + "models/";
const TEXTURE_PATH = RESOURCE_BASE + "textures/";
const AUDIO_PATH = RESOURCE_BASE + "audio/";

class Models extends ResourceLoader<THREE.Mesh | GLTF> {
    constructor() { super(new GLTFLoader().setPath(MODEL_PATH)); }

    // Model loader extracts child mesh from GLTF object
    storeResult(name: string, url: string) {
        const f = super.storeResult(name, url);
        return ((result: GLTF) => {
            super.storeResult(name + "_gltf", url)(result);
            const m = result.scene.children[0] as THREE.Mesh;
            return f(m);
        });
    }

    getGLTF(name: string) {
        return this.get(name)!.data! as GLTF;
    }

    getData(name: string) {
        return this.get(name)!.data! as THREE.Mesh;
    }
}

class Textures extends ResourceLoader<THREE.Texture> {
    constructor() { super(new THREE.TextureLoader().setPath(TEXTURE_PATH)); }

    // Texture loader unflips texture
    storeResult(name: string, url: string) {
        const f = super.storeResult(name, url);
        return (result: any) => {
            result.flipY = false;
            return f(result);
        };
    }
};

class Audio extends ResourceLoader<THREE.Audio> {
    constructor() { super(new THREE.AudioLoader().setPath(AUDIO_PATH)); }

    storeResult(name: string, url: string): (result: any) => any {
        const f = super.storeResult(name, url);
        return (result: any) => {
            const audio = new THREE.Audio(engine.audio);
            audio.setBuffer(result);
            return f(audio);
        };
    }
}

// Load model with set colour, normal, roughness and metallic properties
function loadTexturedModel(name: string, model_url: string, col_url: string, norm_url: string, 
                    rough_url?: string, metal_url?: string, onLoad?: (model: THREE.Mesh) => any) {
    if (models.get(name)) return;
    // Create load url dict
    const [nc, nn, nr, nm] = [name + "_col", name + "_norm", name + "_rough", name + "_metal"];
    const urls: { [name: string]: string; } = {};
    urls[nc] = col_url;
    urls[nn] = norm_url;
    if (rough_url) urls[nr] = rough_url;
    if (metal_url) urls[nm] = metal_url;

    // Create loads
    return Promise.all([textures.loadMultiple(urls), models.load(name, model_url)])
        .then(() => {
            // On complete, load textures and assign to model
            const diffuse = textures.getData(nc);
            diffuse.encoding = THREE.sRGBEncoding;
            const norm = textures.getData(nn);
            const rough = textures.getData(nr);
            const metal = textures.getData(nm);

            const material = new THREE.MeshStandardMaterial({
                map: diffuse,
                normalMap: norm,
                roughnessMap: rough,
                metalnessMap: metal,
            });
            // Assigns material to all mesh children
            const model = models.getData(name);
            model.traverse((obj) => {
                if (obj.type == "Mesh") {
                    obj.receiveShadow = true;
                    (obj as THREE.Mesh).material = material;
                }
            });
            if (onLoad) onLoad(model);
        });
}