import { engine, models, textures, audio } from "./engine";
import { loadTexturedModel } from "./loader";
import { BasicScene } from "./scenes";


type modelTexsT = { model: string; diffuse: string; normal: string; roughness?: string; metal?: string; };
type modelArgT = modelTexsT | string;

export class LoadingScene extends BasicScene {
    // Resources to load
    texs: { [name: string]: string; };
    mods: { [name: string]: modelArgT; };
    aud: { [name: string]: string; };
    onLoads: { [name: string]: (x: any) => void; };

    // Loading promises
    promises: Promise<any>[] = [];
    progressBar: HTMLProgressElement;
    totalProgress: number = 0;

    // Function returning scene to transition to once loaded
    nextScene: () => BasicScene;

    // texs is textures to load: name and path; mods is same, but has option to give model material locations; aud is same as texs
    // nextScene is generator for the next scene; onLoads are option custom onLoad functions for those that need it
    constructor(texs: { [name: string]: string; }, mods: { [name: string]: modelArgT; }, aud: { [name: string]: string; },
            nextScene: () => BasicScene, onLoads: { [name: string]: (x: any) => void; } = {}) {
        super();
        this.texs = texs;
        this.mods = mods;
        this.aud = aud;
        this.onLoads = onLoads;

        this.nextScene = nextScene;
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

        // Audio load calls
        for (var key in this.aud) {
            this.addPromise(key, audio.load(key, this.aud[key]));
        }

        this.progressBar.max = this.promises.length;

        return Promise.all(this.promises).then(() => {
            const s = this.nextScene();
            engine.scene = s;
            console.log("Loading Complete", textures, models, audio);
        });
    }

    incProg() { this.progressBar.value += 1 }

    // Adds promise to this.promises and add progress increment and any custom onLoad after it
    addPromise(key: string, promise?: Promise<any>) {
        if (promise) {
            if (key in this.onLoads) promise = promise.then(this.onLoads[key]);
            this.totalProgress += 1;
            this.promises.push(promise.then(this.incProg.bind(this)));
        }
    }
}