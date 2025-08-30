// Web polyfills for React Native
// This file provides necessary polyfills for web compatibility

// Global polyfill
if (typeof global === 'undefined') {
  var global = window;
}

// Process polyfill
if (typeof process === 'undefined') {
  global.process = { env: {} };
}

// __DEV__ polyfill
if (typeof __DEV__ === 'undefined') {
  global.__DEV__ = process.env.NODE_ENV !== 'production';
}

// Console polyfill
if (typeof console === 'undefined') {
  global.console = {
    log: () => {},
    warn: () => {},
    error: () => {},
    info: () => {},
    debug: () => {},
  };
}

// RequestAnimationFrame polyfill
if (typeof requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (callback) => setTimeout(callback, 16);
}

if (typeof cancelAnimationFrame === 'undefined') {
  global.cancelAnimationFrame = (id) => clearTimeout(id);
}

// Performance polyfill
if (typeof performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
  };
}

// Crypto polyfill
if (typeof crypto === 'undefined') {
  global.crypto = {
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  };
}

export default {};
