module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 20000,
  testPathIgnorePatterns: ["<rootDir>/config/", "<rootDir>/node_modules/"]
};