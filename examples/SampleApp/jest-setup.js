jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('react-native-worklets', () => ({
  createWorkletRuntime: jest.fn(),
  runOnUI: (fn) => fn,
  runOnJS: (fn) => fn,
}));
