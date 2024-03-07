/* eslint-disable import/first */
/* eslint-disable import/no-extraneous-dependencies */
import * as util from 'util';

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

const globalAny: any = global;

// React Enzyme adapter
Enzyme.configure({ adapter: new Adapter() });

// Make Enzyme functions available in all test files without importing
globalAny.shallow = shallow;
globalAny.render = render;
globalAny.mount = mount;
globalAny.toJson = toJson;

// create range was missing on documents mock
globalAny.document.createRange = () => ({
  setStart: jest.fn(),
  setEnd: jest.fn(),
  commonAncestorContainer: {
    nodeName: 'BODY',
    ownerDocument: document
  }
});
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
