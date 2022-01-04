import { engine, models, textures, audio } from "./engine";
import { loadTexturedModel } from "./loader";
import { BasicScene } from "./scenes";


type modelTexsT = {model: string; diffuse: string; normal: string; roughness?: string; metal?: string};
type modelArgT = modelTexsT | string;

export class LoadingScene extends BasicScene {
    // Resources to load
    texs: {[name: string]: string};
    mods: {[name: string]: modelArgT};
    aud: {[name: string]: string};
    onLoads: {[name: string]: (x: any) => void};

    // Loading promises
    promises: Promise<any>[] = [];
    progressBar: HTMLProgressElement;
    totalProgress: number = 0;

    // Function returning scene to transition to once loaded
    afterScene: () => BasicScene;

    constructor(texs: {[name: string]: string}, mods: {[name: string]: modelArgT}, aud: {[name: string]: string}, afterScene: () => BasicScene, onLoads: {[name: string]: (x: any) => void} = {}) {
        super();
        this.texs = texs;
        this.mods = mods;
        this.aud = aud;
        this.onLoads = onLoads;

        this.afterScene = afterScene;
        this.progressBar = document.getElementById("loadprogress")! as HTMLProgressElement;
    }

    init() {
        // Show loading elements
        engine.enableUI("loadui");
        
        // Texture load calls
        for (var key in this.texs) {
            this.addPromise(key, textures.load(key, this.texs[key]));
        }

        // Model load calls, both single model and full material paths
        for (var key in this.mods) {
            const urls = this.mods[key];
            if (typeof urls == "string") 
                this.addPromise(key, models.load(key, urls));
            else 
                this.addPromise(key, loadTexturedModel(key, urls.model, urls.diffuse, 
                                    urls.normal, urls.roughness, urls.metal));
        }
        
        
        for (var key in this.aud) {
            this.addPromise(key, audio.load(key, this.aud[key]));
        }

        this.progressBar.max = this.promises.length;
        
        return Promise.all(this.promises).then(() => {
            engine.scene = this.afterScene();
            console.log("Loading Complete", textures, models);
        });
    }

    addPromise(key: string, promise?: Promise<any>) {
        if (promise) {
            if (key in this.onLoads) promise = promise.then(this.onLoads[key]);

            this.promises.push(this.progressTick(promise));
        }
    }

    // Increases progress when one done
    progressTick(promise: Promise<any>) {
        this.totalProgress += 1;
        return promise.then((() => this.progressBar.value += 1).bind(this));
    }
}