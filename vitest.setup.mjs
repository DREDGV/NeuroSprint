import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import 'fake-indexeddb/auto';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverMock;
}

if (!globalThis.AudioContext) {
  globalThis.AudioContext = class AudioContextMock {
    createOscillator() { return { connect() {}, start() {}, stop() {}, frequency: { setValueAtTime() {} }, type: "" }; }
    createGain() { return { connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
    get destination() { return {}; }
    get currentTime() { return 0; }
    close() {}
    resume() {}
  };
}

afterEach(() => {
  cleanup();
});
