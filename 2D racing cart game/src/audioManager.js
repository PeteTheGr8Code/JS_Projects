const AUDIO_SETTINGS_KEY = "whisteriaAudioSettings";

let currentMusic = null;
let preloadedMusic = null;

function getSavedSettings() {
    try {
        return JSON.parse(localStorage.getItem(AUDIO_SETTINGS_KEY)) ?? {
            musicVolume: 0.5,
            sfxVolume: 0.7,
            muted: false
        };
    } catch {
        return {
            musicVolume: 0.5,
            sfxVolume: 0.7,
            muted: false
        };
    }
}

function saveSettings(settings) {
    localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(settings));
}

export function createAudioControls() {
    const settings = getSavedSettings();

    return {
        get settings() {
            return settings;
        },

        setMuted(value) {
            settings.muted = value;
            if (currentMusic) {
                currentMusic.muted = value;
            }
            saveSettings(settings);
        },

        setMusicVolume(value) {
            settings.musicVolume = Math.max(0, Math.min(1, value));
            if (currentMusic) {
                currentMusic.volume = settings.musicVolume;
            }
            saveSettings(settings);
        },

        setSfxVolume(value) {
            settings.sfxVolume = Math.max(0, Math.min(1, value));
            saveSettings(settings);
        }
    };
}

export function playMusic(src, { volume = null, loop = true } = {}) {
    const settings = getSavedSettings();

    if (currentMusic) {
        currentMusic.pause();
        currentMusic.currentTime = 0;
    }

    if (preloadedMusic && preloadedMusic.src.includes(src)) {
        currentMusic = preloadedMusic;
    } else {
        currentMusic = new Audio(src);
    }

    currentMusic.loop = loop;
    currentMusic.volume = volume ?? settings.musicVolume;
    currentMusic.muted = settings.muted;

    return currentMusic.play().catch(() => {});
}

export function stopMusic() {
    if (currentMusic) {
        currentMusic.pause();
        currentMusic.currentTime = 0;
    }
}

export function playSfx(src, { volume = null } = {}) {
    const settings = getSavedSettings();

    if (settings.muted) return;

    const sfx = new Audio(src);
    sfx.preload = "auto";
    sfx.volume = volume ?? settings.sfxVolume;
    sfx.play().catch(() => {
        // Ignore blocked play attempts
    });
}

export function enableMusicOnFirstInteraction(src, options = {}) {
    // Preload immediately
    preloadedMusic = new Audio(src);
    preloadedMusic.preload = "auto";

    const handler = () => {
        playMusic(src, options);
        window.removeEventListener("click", handler);
        window.removeEventListener("keydown", handler);
    };

    window.addEventListener("click", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
}