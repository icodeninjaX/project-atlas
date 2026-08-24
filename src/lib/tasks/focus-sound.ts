type AudioContextConstructor = new () => AudioContext;

let focusAudioContext: AudioContext | null = null;

function scheduleTone({
  context,
  frequency,
  startsAt,
  duration,
  volume,
}: {
  context: AudioContext;
  frequency: number;
  startsAt: number;
  duration: number;
  volume: number;
}) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  const endsAt = startsAt + duration;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startsAt);
  envelope.gain.setValueAtTime(0.0001, startsAt);
  envelope.gain.exponentialRampToValueAtTime(volume, startsAt + 0.025);
  envelope.gain.exponentialRampToValueAtTime(0.0001, endsAt);
  oscillator.connect(envelope);
  envelope.connect(context.destination);
  oscillator.addEventListener(
    "ended",
    () => {
      oscillator.disconnect();
      envelope.disconnect();
    },
    { once: true },
  );
  oscillator.start(startsAt);
  oscillator.stop(endsAt + 0.02);
}

export async function playFocusActivationSound() {
  if (typeof window === "undefined") return;

  const AudioContextApi =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: AudioContextConstructor })
      .webkitAudioContext;
  if (!AudioContextApi) return;

  try {
    if (!focusAudioContext || focusAudioContext.state === "closed") {
      focusAudioContext = new AudioContextApi();
    }
    if (focusAudioContext.state === "suspended") {
      await focusAudioContext.resume();
    }

    const startsAt = focusAudioContext.currentTime + 0.015;
    scheduleTone({
      context: focusAudioContext,
      frequency: 523.25,
      startsAt,
      duration: 0.28,
      volume: 0.035,
    });
    scheduleTone({
      context: focusAudioContext,
      frequency: 659.25,
      startsAt: startsAt + 0.11,
      duration: 0.36,
      volume: 0.028,
    });
  } catch {
    // Focus mode remains fully usable when audio is blocked or unavailable.
  }
}
