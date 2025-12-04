/* eslint-disable */
const { readFileSync } = require("fs");

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, "utf-8")
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

// Skip screenshot tests on Windows/Mac CI (no display server)
const isWindowsOrMacCI = process.env.CI && (process.platform === "win32" || process.platform === "darwin");

module.exports = {
  displayName: "@ai-capabilities-suite/mcp-screenshot",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/?(*.)+(spec|test).[jt]s?(x)"],
  testPathIgnorePatterns: isWindowsOrMacCI ? [
    "integration.spec.ts",
    "e2e.spec.ts",
    "property.spec.ts"
  ] : [],
  transform: {
    "^.+\\.(t|j)sx?$": ["@swc/jest", swcJestConfig],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  coverageDirectory: "test-output/jest/coverage",
  transformIgnorePatterns: [],
  setupFilesAfterEnv: [],
};
