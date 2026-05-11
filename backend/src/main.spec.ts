describe('main entrypoint', () => {
  it('invokes bootstrap when module loads', () => {
    jest.isolateModules(() => {
      const bootstrap = jest.fn().mockResolvedValue(undefined);
      jest.doMock('./bootstrap', () => ({ bootstrap }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('./main');

      expect(bootstrap).toHaveBeenCalledTimes(1);
    });
  });
});
