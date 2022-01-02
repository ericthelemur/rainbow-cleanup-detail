import { engine } from "./engine/engine";
import { GameScene } from "./gamescene";
import { LoadingScene } from "./engine/loadscreen";

engine.scene = new LoadingScene({
    decal_diff1: 'decals/diff1.png', decal_norm1: 'decals/norm1.png',
    decal_diff2: 'decals/diff2.png', decal_norm2: 'decals/norm2.png',
    decal_diff3: 'decals/diff3.png', decal_norm3: 'decals/norm3.png',
}, {
    testscene: "collision-world.glb",
    brush: { model: "Brush/brush.gltf", diffuse: "brush/brush_col.png", normal: "brush/brush_norm.png", 
                roughness: "brush/brush_rough_metal.png", metal: "brush/brush_rough_metal.png"},
    bucket: { model: "Bucket/bucket.gltf", diffuse: "bucket/bucket_col.png", normal: "bucket/bucket_norm.png", 
                roughness: "bucket/bucket_metal.png", metal: "bucket/bucket_rough.png" }

}, () => new GameScene("testscene"));
// engine.scene = new GameScene("collision-world.glb");
console.log("ENGINE SCNEE", engine.scene);

function run() {
    engine.run();
    requestAnimationFrame(run);
}
run();
