/* eslint-disable max-classes-per-file */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable import/first */
/* eslint-disable import/no-extraneous-dependencies */
import 'fake-indexeddb/auto';

import type { FilterDefinition } from '@gms/common-model/lib/filter/types';
import crypto from 'crypto';
import * as util from 'util';

// This is to fix an issue with test leaks related to createStateSyncMiddleware() in jsdom
process.env.GMS_DISABLE_REDUX_STATE_SYNC = 'true';

Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: async (algorithm: AlgorithmIdentifier, msg: Uint8Array) =>
        (crypto.webcrypto as any).subtle.digest(algorithm, msg) as Promise<any>
    }
  }
});

Object.defineProperty(window, 'TextEncoder', {
  writable: true,
  value: util.TextEncoder
});
Object.defineProperty(window, 'TextDecoder', {
  writable: true,
  value: util.TextDecoder
});
Object.defineProperty(global, 'TextEncoder', {
  writable: true,
  value: util.TextEncoder
});
Object.defineProperty(global, 'TextDecoder', {
  writable: true,
  value: util.TextDecoder
});

import Adapter from '@cfaester/enzyme-adapter-react-18';
import Enzyme, { mount, render, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import type { GlobalWithFetchMock } from 'jest-fetch-mock';

const customGlobal: GlobalWithFetchMock = (global as unknown) as GlobalWithFetchMock;
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
customGlobal.fetch = require('jest-fetch-mock');

customGlobal.fetchMock = customGlobal.fetch;

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
require('jest-canvas-mock');

Enzyme.configure({ adapter: new Adapter() });

const globalAny: any = global;

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
globalAny.fetch = require('jest-fetch-mock');

// Make Enzyme functions available in all test files without importing
globalAny.shallow = shallow;
globalAny.render = render;
globalAny.mount = mount;
globalAny.toJson = toJson;
globalAny.TextEncoder = util.TextEncoder;

globalAny.window = window;

class Worker {
  public url: string;

  public onmessage: (message: Record<string, unknown>, transfer?: Transferable[]) => void;

  public constructor(stringUrl: string) {
    this.url = stringUrl;
    this.onmessage = () => {
      // do nothing
    };
  }

  public postMessage(message: Record<string, unknown>, transfer?: Transferable[]) {
    this.onmessage(message, transfer);
  }
}
globalAny.window.Worker = Worker;

class MessagePort {
  public url: string;

  public onmessage: (message: Record<string, unknown>, transfer?: Transferable[]) => void;

  public postMessage(message: Record<string, unknown>, transfer?: Transferable[]) {
    this.onmessage(message, transfer);
  }
}

class SharedWorker {
  public url: string;

  public port = new MessagePort();

  public constructor(stringUrl: string) {
    this.url = stringUrl;

    this.port.onmessage = () => {
      // do nothing
    };
  }
}
globalAny.window.SharedWorker = SharedWorker;

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports,  import/no-extraneous-dependencies
require('jest-fetch-mock').enableMocks();

jest.mock('@gms/ui-wasm', () => {
  const isDesigned = jest.requireActual('@gms/ui-wasm/lib/gms-filters-provider/is-designed');

  const filter = async (
    filterDefinition: FilterDefinition,
    data: Float64Array
  ): Promise<Float64Array> => Promise.resolve(data);

  const design = async (filterDefinition: FilterDefinition): Promise<FilterDefinition> =>
    Promise.resolve(filterDefinition);

  const getBoundsForPositionBuffer = async (): Promise<{
    min: number;
    minSecs: number;
    max: number;
    maxSecs: number;
  }> => Promise.resolve({ min: 0, minSecs: 0, max: 10, maxSecs: 10 });

  return {
    design,
    filter,
    getBoundsForPositionBuffer,
    isDesigned: isDesigned.isDesigned
  };
});
