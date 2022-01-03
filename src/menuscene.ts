import { engine } from "./engine/engine";
import { BasicScene } from "./engine/scenes";

export class MenuScene extends BasicScene {
    nextScene: () => BasicScene;

    constructor(nextScene: () => BasicScene) {
        super();
        this.nextScene = nextScene;

        document.getElementById("startbtn")?.addEventListener("click", this.start.bind(this));
    }

    init() {
        engine.enableUI("menuui");
    }

    start() {
        engine.scene = this.nextScene();
    }
}
