import { Updatable } from "./scenes";

// KeyStates is states last complete frame, and changed is what has changed since
const keyStates: Map<string, boolean> = new Map();
const changed: Map<string, boolean> = new Map();

window.addEventListener('keydown', (event: KeyboardEvent) => {
    changed.set(event.code, true);
});

window.addEventListener('keyup', (event: KeyboardEvent) => {
    changed.set(event.code, false);
});

// Checks changed first then previous
function get(keyCode: string): boolean {
    const v = changed.get(keyCode);
    if (v !== undefined) return v;
    return getLast(keyCode);
}

// Checks keyStates only
function getLast(keyCode: string): boolean {
    const v = keyStates.get(keyCode);
    if (v !== undefined) return v;
    return false;
}

// Checks if key state last frame was lastState and is now nowState - used for press and release detect
function getLastThis(keyCode: string, lastState: boolean, nowState: boolean) {
    // Check now
    let now = changed.get(keyCode);
    if (now === undefined) now = false;
    if (now != nowState) return false;
    // Check last frame
    let last = keyStates.get(keyCode);
    if (last === undefined) last = false;
    return last == lastState;
}

export class Input extends Updatable {
    isHeld(keyCode: string): boolean {
        return get(keyCode);
    }

    isPressed(keyCode: string): boolean {
        return getLastThis(keyCode, false, true);
    }

    isReleased(keyCode: string): boolean {
        return getLastThis(keyCode, true, false);
    }

    update(_deltaTime: number) {
        // Update keyStates to include changes
        for (const [key, value] of changed.entries()) {
            keyStates.set(key, value);
        }
        changed.clear();
    }
}
