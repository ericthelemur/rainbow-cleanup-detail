import { engine, models, textures } from "./engine";
import { loadTexturedModel } from "./loader";
import { BasicScene } from "./scenes";


type modelTexsT = {model: string; diffuse: string; normal: string; roughness?: string; metal?: string};
type modelArgT = modelTexsT | string;

export class LoadingScene extends BasicScene {
    texs: {[name: string]: string};
    mods: {[name: string]: modelArgT};

    promises: Promise<any>[] = [];
    progressBar: HTMLProgressElement;
    totalProgress: number = 0;
    afterScene: () => BasicScene;

    constructor(texs: {[name: string]: string}, mods: {[name: string]: modelArgT}, afterScene: () => BasicScene) {
        super();
        this.texs = texs;
        this.mods = mods;
        this.afterScene = afterScene;
        this.progressBar = document.getElementById("loadprogress")! as HTMLProgressElement;
    }

    init() {
        engine.enableUI("loadui");
        this.addPromise(textures.loadMultiple(this.texs));
        
        for (var key in this.texs) {
            this.addPromise(textures.load(key, this.texs[key]));
        }

        for (var key in this.mods) {
            const urls = this.mods[key];
            if (typeof urls == "string") 
                this.addPromise(models.load(key, urls));
            else 
                this.addPromise(loadTexturedModel(key, urls.model, urls.diffuse, 
                                    urls.normal, urls.roughness, urls.metal));
        }

        // this.addPromise(new Promise(function(resolve) {
        //     setTimeout(resolve, 600000);
        // }));

        this.progressBar.max = this.promises.length;

        return Promise.all(this.promises).then(() => {
            engine.scene = this.afterScene();
            console.log("Loading Complete", textures, models);
        });
    }

    addPromise(promise?: Promise<any>) {
        if (promise)
            this.promises.push(this.progressTick(promise));
    }

    progressTick(promise: Promise<any>) {
        this.totalProgress += 1;
        return promise.then((() => this.progressBar.value += 1).bind(this));
    }
}