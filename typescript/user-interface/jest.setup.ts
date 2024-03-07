/* eslint-disable import/no-extraneous-dependencies */
import Adapter from '@cfaester/enzyme-adapter-react-18';
import { mount, render, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import type { GlobalWithFetchMock } from 'jest-fetch-mock';

// This is to fix an issue with test leaks related to createStateSyncMiddleware() in jsdom
process.env.GMS_DISABLE_REDUX_STATE_SYNC = 'true';

const customGlobal: GlobalWithFetchMock = (global as unknown) as GlobalWithFetchMock;
// eslint-disable-next-line @typescript-eslint/no-require-imports, import/no-extraneous-dependencies
customGlobal.fetch = require('jest-fetch-mock');

customGlobal.fetchMock = customGlobal.fetch;

// eslint-disable-next-line @typescript-eslint/no-require-imports
require('jest-canvas-mock');

const globalAny: any = global;

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const Enzyme = require('enzyme');

// React Enzyme adapter
Enzyme.configure({ adapter: new Adapter() });

// Make Enzyme functions available in all test files without importing
globalAny.shallow = shallow;
globalAny.render = render;
globalAny.mount = mount;
globalAny.toJson = toJson;
globalAny.window = window;
// eslint-disable-next-line @typescript-eslint/no-require-imports
globalAny.$ = require('jquery');

globalAny.jQuery = globalAny.$;
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
globalAny.fetch = require('jest-fetch-mock');
