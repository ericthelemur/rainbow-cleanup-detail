import * as THREE from 'three';
import { audio, engine, textures } from "./engine/engine";
import { LoadingScene } from "./engine/loadscreen";
import { GameScene } from "./gamescene";
import { MenuScene } from "./menuscene";

// Give textures and models to load
const menu: MenuScene = engine.scene = new MenuScene(() => new LoadingScene({
    // Textures
    decal_diff1: 'decals/diff1.png', decal_norm1: 'decals/norm1.png',
    decal_diff2: 'decals/diff2.png', decal_norm2: 'decals/norm2.png',
    decal_diff3: 'decals/diff3.png', decal_norm3: 'decals/norm3.png',
    skybox: "skybox/px.jpg"
}, {    // Meshes
    scene1: "collision-world.glb",
    scene2: "scene2.glb",
    brush: {
        model: "Brush/brush.gltf", diffuse: "brush/brush_col.png", normal: "brush/brush_norm.png",
        roughness: "brush/brush_rough_metal.png", metal: "brush/brush_rough_metal.png"
    },
    bucket: {
        model: "Bucket/bucket.gltf", diffuse: "bucket/bucket_col.png", normal: "bucket/bucket_norm.png",
        roughness: "bucket/bucket_metal.png", metal: "bucket/bucket_rough.png"
    }

}, {    // Audio
    musicloop: "bgmusic.wav",
    clean: "clean.mp3"
}, () => {  // On load
    // Play bg music
    const bgmusic = audio.getData("musicloop");
    bgmusic.setVolume(0.15);
    engine.playSFX(bgmusic, true);

    const toggle = document.getElementById("levelSwitch")! as HTMLInputElement;
    return new GameScene(toggle.checked ? "scene2" : "scene1");
}, {
    skybox: (x: any) => {   // Custom skybox loading
        textures.set("skybox", {
            url: "skybox/px.jpg", data: new THREE.CubeTextureLoader().setPath("resources/textures/").load([
                "skybox/px.jpg", "skybox/nx.jpg", "skybox/py.jpg", "skybox/ny.jpg", "skybox/pz.jpg", "skybox/nz.jpg"
            ])
        });
    }
}));

// Skips menu if ?nomenu
if (new URLSearchParams(window.location.search).has('nomenu')) (engine.scene as MenuScene).finish();

// Run main loop
function run() {
    engine.run();
    requestAnimationFrame(run);
}
run();
