import { engine } from "./engine/engine";
import { BasicScene } from "./engine/scenes";

export class MenuScene extends BasicScene {
    // Function to create scene to transition to after start
    nextScene: () => BasicScene;
    levelToggle = false;

    constructor(nextScene: () => BasicScene) {
        super();
        this.nextScene = nextScene;

        // Start button listener
        document.getElementById("startbtn")?.addEventListener("click", this.finish.bind(this));
    }

    init() {
        engine.enableUI("menuui");
    }

    finish() {
        engine.scene = this.nextScene();
    }

    update(deltaTime: number): void {
        engine.renderer.clear(true, true, true);
    }
}
