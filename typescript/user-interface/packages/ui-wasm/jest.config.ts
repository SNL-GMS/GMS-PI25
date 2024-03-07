import type { Config } from 'jest';

const config: Config = {
  bail: true,
  cacheDirectory: '<rootDir>/.cache/jest',
  testEnvironmentOptions: {
    url: 'http://localhost/'
  },
  globalSetup: '<rootDir>/jest.global-setup.ts',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.m?jsx?$': ['babel-jest', { configFile: './jest-babelrc.json' }],
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        isolatedModules: true,
        diagnostics: false,
        tsconfig: '<rootDir>/tsconfig-test.json',
        astTransformers: {
          before: [
            {
              path: require.resolve('ts-jest-mock-import-meta'),
              options: { metaObjectReplacement: { url: 'https://www.url.com' } }
            }
          ]
        }
      }
    ]
  },
  modulePathIgnorePatterns: ['<rootDir>/lib/', '<rootDir>/dist/'],
  testRegex: '/__tests__/.*\\.test\\.(ts|tsx)$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json', 'mjs'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '@gms/((?!golden-layout)[^/]+)$': '<rootDir>/../$1/src/ts/$1',
    '@gms/((?!golden-layout)[^/]+)(/lib/)(.*)$': '<rootDir>/../$1/src/ts/$3',
    '.*\\.(css|less|styl|scss|sass)$': '<rootDir>/__mocks__/style-mock.ts',
    '.*\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga|wasm)$':
      '<rootDir>/__mocks__/file-mock.ts'
  },
  testEnvironment: 'node',
  collectCoverage: true,
  coverageReporters: ['lcov', 'html', 'text-summary']
};
// eslint-disable-next-line import/no-default-export
export default config;
