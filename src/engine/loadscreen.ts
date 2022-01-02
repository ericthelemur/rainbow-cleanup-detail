import { engine, models, textures } from "./engine";
import { loadTexturedModel } from "./loader";
import { BasicScene } from "./scenes";


type modelTexsT = {model: string; diffuse: string; normal: string; roughness?: string; metal?: string};
type modelArgT = modelTexsT | string;

export class LoadingScene extends BasicScene {
    texs: {[name: string]: string};
    mods: {[name: string]: modelArgT};
    afterScene: () => BasicScene;

    constructor(texs: {[name: string]: string}, mods: {[name: string]: modelArgT}, afterScene: () => BasicScene) {
        super();
        this.texs = texs;
        this.mods = mods;
        this.afterScene = afterScene;
    }

    init() {
        const promises = [];
        promises.push(textures.loadMultiple(this.texs));
        
        for (var key in this.mods) {
            const urls = this.mods[key];
            if (typeof urls == "string") 
                promises.push(models.load(key, urls));
            else 
                promises.push(loadTexturedModel(key, urls.model, urls.diffuse, 
                                    urls.normal, urls.roughness, urls.metal));
        }

        return Promise.all(promises).then(() => {
            engine.scene = this.afterScene();
            console.log("Loading Complete", textures, models);
        });

    }
}