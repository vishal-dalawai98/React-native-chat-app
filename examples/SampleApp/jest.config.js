module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native(-community)?|@react-navigation|react-navigation|@stream-io|stream-chat-react-native)',
  ],
  setupFiles: ['./jest-setup.js'],
};
