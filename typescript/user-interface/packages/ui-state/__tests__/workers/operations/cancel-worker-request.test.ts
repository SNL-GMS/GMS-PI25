import {
  addController,
  cancelWorkerRequests,
  removeController
} from '../../../src/ts/workers/waveform-worker/operations/cancel-worker-requests';

describe('cancelWorkerRequests', () => {
  it('has functions for controllers', () => {
    expect(removeController).toBeDefined();
    expect(addController).toBeDefined();
  });

  it('calls abort for each controller it is given', () => {
    const controller1 = new AbortController();
    const controller2 = new AbortController();
    const controller3 = new AbortController();
    const controller4 = new AbortController();
    const controller5 = new AbortController();
    const controller6 = new AbortController();

    addController(controller1);
    addController(controller2);
    addController(controller3);
    addController(controller4);
    addController(controller5);
    addController(controller6);

    const controller1Spy = jest.spyOn(controller1, 'abort');
    const controller2Spy = jest.spyOn(controller2, 'abort');
    const controller3Spy = jest.spyOn(controller3, 'abort');
    const controller4Spy = jest.spyOn(controller4, 'abort');
    const controller5Spy = jest.spyOn(controller5, 'abort');
    const controller6Spy = jest.spyOn(controller6, 'abort');

    cancelWorkerRequests();

    expect(controller1Spy).toHaveBeenCalled();
    expect(controller2Spy).toHaveBeenCalled();
    expect(controller3Spy).toHaveBeenCalled();
    expect(controller4Spy).toHaveBeenCalled();
    expect(controller5Spy).toHaveBeenCalled();
    expect(controller6Spy).toHaveBeenCalled();
  });

  it('removes controller', () => {
    const controller1 = new AbortController();
    const controller2 = new AbortController();
    addController(controller1);
    addController(controller2);
    removeController(controller1);
    expect(() => {
      removeController(controller1);
    }).toThrow('AbortController not found, cannot remove.');
    expect(() => {
      removeController(controller2);
    }).not.toThrow();
  });
});
