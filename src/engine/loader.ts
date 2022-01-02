import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three-stdlib/loaders/GLTFLoader';
import { models, textures } from './engine';
export { Textures, Models, loadTexturedModel }

type LoadT<T> = {url: string; data: T | null};

class MyLoader<T> extends Map<string, LoadT<T>> {
    loader: THREE.Loader;

    constructor(loader: THREE.Loader) {
        super();
        this.loader = loader;
    }
    
    load(name: string, url: string, then?: (data: T) => any) {
        if (this.get(name)?.url == url) return Promise.resolve();
        return this.createPromise(name, url, then);
        // return this.loadMultiple({name: url});
        // Promise.resolve(this.createPromise(name, url));
        // return this.get(name);
    }

    loadMultiple(urls: { [key: string]: string }, then?: () => any): Promise<any> {
        const promises = [];
        for (var key in urls) {
            promises.push(this.load(key, urls[key]));
        }
        return Promise.all(promises).then(then);
    }
    
    createPromise(name: string, url: string, then?: (data: T) => any) {
        if (this.get(name)) {
            if (then) return new Promise<T>( () => { then(this.get(name)!.data!) });
            else return Promise.resolve();
        }
        if (!url) return Promise.resolve();

        return this.loader.loadAsync(url, console.log)
            .then(this.storeResult(name, url))
            .then(then);
    }

    storeResult(name: string, url: string) {
        return (result: any) => {
            const entry = {url: url, data: result};
            this.set(name, entry);
            return result;
        }
    }

    getData(key: string): T {
        return super.get(key)!.data!;
    }

    public get path() : string {
        return this.loader.path;
    }
    
}

const RESOURCE_BASE = "../resources/"
const MODEL_PATH = RESOURCE_BASE + "models/";
const TEXTURE_PATH = RESOURCE_BASE + "textures/";

class Models extends MyLoader<THREE.Mesh> {
    constructor() { super(new GLTFLoader().setPath(MODEL_PATH)) }

    storeResult(name: string, url: string) {
        const f = super.storeResult(name, url);
        return ((result: GLTF) => {
            const m = result.scene.children[0] as THREE.Mesh;
            return f(m);
        });
    }
}

class Textures extends MyLoader<THREE.Texture>{
    constructor() { super(new THREE.TextureLoader().setPath(TEXTURE_PATH)) }

    storeResult(name: string, url: string) {
        const f = super.storeResult(name, url);
        return (result: any) => {
            result.flipY = false;
            return f(result);
        }
    }
};

function loadTexturedModel(name: string, model_url: string, col_url: string, norm_url: string, rough_url?: string, metal_url?: string, onLoad?: (model: THREE.Mesh) => any) {
    if (models.get(name)) return;
    const [nc, nn, nr, nm] = [name + "_col", name + "_norm", name + "_rough", name + "_metal"]
    const urls: {[name: string]: string} = {};
    urls[nc] = col_url;
    urls[nn] = norm_url;
    if (rough_url) urls[nr] = rough_url;
    if (metal_url) urls[nm] = metal_url;

    // return textures.loadMultiple(urls, () => {
    //     const diffuse = textures.get(nc)!.data!;
    //     diffuse.encoding = THREE.sRGBEncoding;
    //     const norm = textures.get(nn)!.data!;
    //     const rough = textures.get(nr)!.data!;
    //     const metal = textures.get(nm)!.data!;

    //     const material = new THREE.MeshStandardMaterial({map: diffuse, 
    //                             normalMap: norm,
    //                             roughnessMap: rough,
    //                             metalnessMap: metal,
    //                         });

    //     models.load(name, model_url, function (model) {
    //         model.traverse((obj) => {
    //             if (obj.type == "Mesh") {
    //                 obj.receiveShadow = true;
    //                 (obj as THREE.Mesh).material = material;
    //             }
    //         });
    //         if (onLoad) onLoad(model);
    //     });
    // });

    return Promise.all([textures.loadMultiple(urls), models.load(name, model_url)])
            .then(() => {
                const diffuse = textures.get(nc)!.data!;
                diffuse.encoding = THREE.sRGBEncoding;
                const norm = textures.get(nn)!.data!;
                const rough = textures.get(nr)!.data!;
                const metal = textures.get(nm)!.data!;

                const material = new THREE.MeshStandardMaterial({map: diffuse, 
                                        normalMap: norm,
                                        roughnessMap: rough,
                                        metalnessMap: metal,
                                    });
                
                const model = models.get(name)!.data!;
                model.traverse((obj) => {
                    if (obj.type == "Mesh") {
                        obj.receiveShadow = true;
                        (obj as THREE.Mesh).material = material;
                    }
                });
                if (onLoad) onLoad(model);
            });
}