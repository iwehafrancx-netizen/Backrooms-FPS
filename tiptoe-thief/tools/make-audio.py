"""Synthesises every sound of the game into assets/audio/*.mp3.

    python3 tools/make-audio.py      (needs numpy and ffmpeg)

Nothing is sampled from recordings: each effect is built from noise bursts,
filtered clicks and simple tones, and the music is a short sneaky loop
(pizzicato-style bass + muted keys + brushed hi-hat) written note by note.
"""
import os
import subprocess
import tempfile
import wave
import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'assets', 'audio')
os.makedirs(OUT, exist_ok=True)
SR = 44100
rng = np.random.default_rng(7)


def t(sec):
    return np.arange(int(SR * sec)) / SR


def env(n, attack=0.005, decay=0.15):
    """Fast attack, exponential decay envelope of length n samples."""
    x = np.arange(n) / SR
    a = np.clip(x / max(attack, 1e-4), 0, 1)
    return a * np.exp(-x / max(decay, 1e-4))


def lowpass(x, cutoff):
    """One-pole low-pass filter (cheap and good enough for footsteps/thuds)."""
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


def tone(freq, sec, kind='sine', decay=0.3, attack=0.004):
    x = t(sec)
    if kind == 'sine':
        w = np.sin(2 * np.pi * freq * x)
    elif kind == 'tri':
        w = 2 / np.pi * np.arcsin(np.sin(2 * np.pi * freq * x))
    else:  # soft square
        w = np.tanh(3 * np.sin(2 * np.pi * freq * x))
    return w * env(len(x), attack, decay)


def place(buf, snd, at):
    i = int(at * SR)
    end = min(len(buf), i + len(snd))
    buf[i:end] += snd[:end - i]


def write_mp3(name, x, gain=0.9, bitrate='96k', mono=True):
    x = x / (np.max(np.abs(x)) + 1e-9) * gain
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        tmp = f.name
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-ac', '1' if mono else '2', '-b:a', bitrate, os.path.join(OUT, name + '.mp3')], check=True)
    os.remove(tmp)


# ---------------------------------------------------------------- footsteps
def step(soft, seed):
    r = np.random.default_rng(seed)
    n = int(SR * (0.12 if soft else 0.16))
    noise = r.standard_normal(n)
    body = lowpass(noise, 500 if soft else 900) * env(n, 0.002, 0.025 if soft else 0.04)
    heel = lowpass(r.standard_normal(n), 2500) * env(n, 0.001, 0.008) * (0.15 if soft else 0.5)
    return body + heel


write_mp3('step_soft1', step(True, 1), 0.5)
write_mp3('step_soft2', step(True, 2), 0.5)
write_mp3('step_run1', step(False, 3), 0.85)
write_mp3('step_run2', step(False, 4), 0.85)

# ---------------------------------------------------------------- doors & locks
# door: wooden creak (slowly gliding resonant tone) + latch click
x = t(0.7)
creak = np.sin(2 * np.pi * (300 + 160 * x + 30 * np.sin(2 * np.pi * 7 * x)) * x) * env(len(x), 0.08, 0.35)
creak *= 0.35 + 0.65 * (np.abs(np.sin(2 * np.pi * 23 * x)) > 0.6)
latch = highpass(rng.standard_normal(int(SR * 0.05)), 1500) * env(int(SR * 0.05), 0.001, 0.01)
door = lowpass(creak, 1800) * 0.6
place(door, latch, 0.0)
write_mp3('door_open', door, 0.6)
# locked: two dull rattles
rattle = lowpass(rng.standard_normal(int(SR * 0.09)), 1200) * env(int(SR * 0.09), 0.001, 0.02)
locked = np.zeros(int(SR * 0.3))
place(locked, rattle, 0.0)
place(locked, rattle * 0.8, 0.12)
write_mp3('door_locked', locked, 0.7)
# lock pick click: tiny metallic tick
click = highpass(rng.standard_normal(int(SR * 0.04)), 4000) * env(int(SR * 0.04), 0.0005, 0.006) + tone(3200, 0.04, decay=0.01) * 0.4
write_mp3('pick_click', click, 0.7)
# lock opens: click + low thunk + bright rising chime
done = np.zeros(int(SR * 0.6))
place(done, click, 0)
place(done, lowpass(rng.standard_normal(int(SR * 0.1)), 300) * env(int(SR * 0.1), 0.001, 0.04), 0.05)
for i, f in enumerate([660, 880]):
    place(done, tone(f, 0.3, 'tri', 0.12) * 0.4, 0.12 + i * 0.08)
write_mp3('pick_done', done, 0.7)

# ---------------------------------------------------------------- loot, coins, hiding
loot = np.zeros(int(SR * 0.7))
for i, f in enumerate([784, 988, 1319]):  # G5 B5 E6 sparkle
    place(loot, tone(f, 0.5, 'sine', 0.18) + tone(f * 2, 0.5, 'sine', 0.08) * 0.3, i * 0.07)
write_mp3('loot', loot, 0.7)
whoosh = highpass(rng.standard_normal(int(SR * 0.25)), 1200)
whoosh = lowpass(whoosh, 3000) * np.sin(np.linspace(0, np.pi, len(whoosh))) ** 2
write_mp3('coin_throw', whoosh, 0.35)
land = np.zeros(int(SR * 0.6))
for k, at in enumerate([0, 0.11, 0.19, 0.24]):  # bounces getting closer together
    place(land, (tone(3900, 0.25, 'sine', 0.06) + tone(5200, 0.25, 'sine', 0.04) * 0.6) * (0.9 ** k), at)
write_mp3('coin_land', land, 0.8)
rustle = lowpass(highpass(rng.standard_normal(int(SR * 0.35)), 600), 4000) * np.sin(np.linspace(0, np.pi, int(SR * 0.35)))
write_mp3('hide', rustle, 0.45)
# fuse box: big switch clunk + electrical buzz dying down
fuse = lowpass(rng.standard_normal(int(SR * 0.12)), 500) * env(int(SR * 0.12), 0.001, 0.05)
buzz = np.sign(np.sin(2 * np.pi * 100 * t(0.6))) * env(int(SR * 0.6), 0.001, 0.2) * 0.25
fz = np.zeros(int(SR * 0.7))
place(fz, fuse, 0)
place(fz, lowpass(buzz, 1500), 0.02)
write_mp3('fuse', fz, 0.7)

# ---------------------------------------------------------------- guards & alarms
huh = np.zeros(int(SR * 0.5))  # questioning two-note woodwind
place(huh, tone(523, 0.18, 'tri', 0.12), 0)
place(huh, tone(659, 0.3, 'tri', 0.16), 0.12)
write_mp3('guard_huh', lowpass(huh, 2500), 0.6)
alert = np.zeros(int(SR * 0.7))  # sharp brass-like stab
for f in [392, 494, 587]:
    place(alert, tone(f, 0.6, 'square', 0.25, 0.002), 0)
write_mp3('guard_alert', lowpass(alert, 3000), 0.8)
alarm = np.zeros(int(SR * 1.6))  # two-tone siren
for i in range(4):
    place(alarm, tone(880 if i % 2 == 0 else 660, 0.38, 'square', 0.6, 0.01) * 0.6, i * 0.4)
write_mp3('alarm', lowpass(alarm, 2200), 0.7)
caught = np.zeros(int(SR * 1.4))  # descending "wah wah" phrase
for i, f in enumerate([392, 370, 349, 330]):
    place(caught, tone(f, 0.5 if i < 3 else 0.9, 'tri', 0.3 if i < 3 else 0.6), i * 0.28)
write_mp3('caught', lowpass(caught, 2000), 0.75)
win = np.zeros(int(SR * 1.5))  # bright little fanfare
for i, f in enumerate([523, 659, 784, 1047]):
    place(win, tone(f, 0.6, 'tri', 0.3) + tone(f * 2, 0.6, 'sine', 0.12) * 0.25, i * 0.11)
place(win, tone(1047, 1.0, 'tri', 0.5) * 0.6, 0.5)
write_mp3('win', win, 0.75)
ui = tone(1400, 0.05, 'sine', 0.012) * 0.6
write_mp3('ui_click', ui, 0.4)

# ---------------------------------------------------------------- music loop
# 8 bars at 96 bpm in D minor: tiptoeing pizzicato bass, muted chords on the
# off-beats and a brushed hi-hat. The loop length is exact so it repeats cleanly.
BPM = 96
beat = 60 / BPM
bars = 8
music = np.zeros(int(SR * beat * 4 * bars))
note = lambda m: 440 * 2 ** ((m - 69) / 12)
bass_line = [50, 53, 57, 53, 50, 53, 55, 57, 48, 52, 55, 52, 46, 50, 53, 52]  # two notes per bar
chords = [[62, 65, 69], [62, 65, 69], [60, 64, 67], [58, 62, 65]] * 2
for bar in range(bars):
    t0 = bar * beat * 4
    for k in range(2):
        m = bass_line[(bar * 2 + k) % len(bass_line)]
        pluck = tone(note(m), beat * 1.5, 'tri', 0.18, 0.003)
        place(pluck, tone(note(m) * 2, beat, 'sine', 0.08) * 0.3, 0)  # octave overtone, shorter
        place(music, pluck * 0.9, t0 + k * beat * 2)
        place(music, pluck * 0.45, t0 + k * beat * 2 + beat * 1.5)  # ghost note
    for off in [0.5, 1.5, 2.5, 3.5]:  # muted off-beat chords
        for m in chords[bar % len(chords)]:
            place(music, tone(note(m), beat * 0.4, 'sine', 0.06) * 0.12, t0 + off * beat)
    for k in range(8):  # brushed hat on eighths, accented on beats
        hat = highpass(rng.standard_normal(int(SR * 0.08)), 6000) * env(int(SR * 0.08), 0.002, 0.03 if k % 2 else 0.05)
        place(music, hat * (0.12 if k % 2 else 0.2), t0 + k * beat / 2)
    if bar % 4 == 3:  # little vibraphone answer every fourth bar
        for i, m in enumerate([74, 77, 76, 72]):
            place(music, tone(note(m), beat, 'sine', 0.35) * 0.25, t0 + beat * 2 + i * beat / 2)
music = lowpass(music, 6000)
write_mp3('music', music, 0.55, bitrate='96k')

print('audio written to', os.path.relpath(OUT, ROOT), ':', len(os.listdir(OUT)), 'files')
