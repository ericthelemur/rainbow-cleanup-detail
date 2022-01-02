import { Updatable } from "./scenes";

const keyStates: Map<string, boolean> = new Map();
const changed: Map<string, boolean> = new Map();

window.addEventListener('keydown', (event: KeyboardEvent) => {
    changed.set(event.code, true);
});

window.addEventListener('keyup', (event: KeyboardEvent) => {
    changed.set(event.code,  false);
});


function get(keyCode: string): boolean {
    var v = changed.get(keyCode);
    if (v !== undefined) return v;
    return getLast(keyCode);
}

function getLast(keyCode: string): boolean {
    const v = keyStates.get(keyCode);
    if (v !== undefined) return v;
    return false;
}

function getLastThis(keyCode: string, lastState: boolean, nowState: boolean) {
    var now = changed.get(keyCode);
    if (now === undefined) now = false;
    if (now != nowState) return false;

    var last = keyStates.get(keyCode);
    if (last === undefined) last = false;
    return last == lastState;
}

export class Input extends Updatable {
    isHeld(keyCode: string): boolean {
        return get(keyCode);
    }

    isPressed(keyCode: string): boolean {
        if (getLastThis(keyCode, false, true) != get(keyCode) && !getLast(keyCode)) 
            console.warn("Press mismatch", keyCode, changed.get(keyCode), keyStates.get(keyCode));
        return getLastThis(keyCode, false, true);
    }

    isReleased(keyCode: string): boolean {
        return getLastThis(keyCode, true, false);
    }

    update(_deltaTime: number) {
        for (const [key, value] of changed.entries()) {
            keyStates.set(key, value);
        }
        changed.clear();
    }
}
