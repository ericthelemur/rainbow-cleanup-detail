export {addV, subV};

function addV(v1: THREE.Vector3, v2: THREE.Vector3): THREE.Vector3 {
    return v1.clone().add(v2);
}

function subV(v1: THREE.Vector3, v2: THREE.Vector3): THREE.Vector3 {
    return v1.clone().sub(v2);
}