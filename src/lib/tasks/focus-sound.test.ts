import { afterEach, describe, expect, it, vi } from "vitest";

const originalAudioContext = Object.getOwnPropertyDescriptor(
  window,
  "AudioContext",
);

afterEach(() => {
  vi.resetModules();
  if (originalAudioContext) {
    Object.defineProperty(window, "AudioContext", originalAudioContext);
  } else {
    Reflect.deleteProperty(window, "AudioContext");
  }
});

describe("playFocusActivationSound", () => {
  it("schedules a gentle two-note chime", async () => {
    const start = vi.fn();
    const stop = vi.fn();
    const setFrequency = vi.fn();
    const setGain = vi.fn();
    const rampGain = vi.fn();

    class MockAudioContext {
      currentTime = 4;
      state = "running";
      destination = {};

      createOscillator() {
        return {
          type: "sine",
          frequency: { setValueAtTime: setFrequency },
          connect: vi.fn(),
          disconnect: vi.fn(),
          addEventListener: vi.fn(),
          start,
          stop,
        };
      }

      createGain() {
        return {
          gain: {
            setValueAtTime: setGain,
            exponentialRampToValueAtTime: rampGain,
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        };
      }

      resume() {
        return Promise.resolve();
      }
    }

    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: MockAudioContext,
    });
    const { playFocusActivationSound } = await import("./focus-sound");

    await playFocusActivationSound();

    expect(start).toHaveBeenCalledTimes(2);
    expect(stop).toHaveBeenCalledTimes(2);
    expect(setFrequency).toHaveBeenNthCalledWith(1, 523.25, 4.015);
    expect(setFrequency).toHaveBeenNthCalledWith(2, 659.25, 4.125);
    expect(
      Math.max(...rampGain.mock.calls.map(([value]) => value)),
    ).toBeLessThan(0.04);
  });
});
