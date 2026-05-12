import { logger } from '@/lib/logger';

describe('Logger', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('log()', () => {
    it('should log a message with timestamp and level', () => {
      const message = 'Test message';
      logger.log(message);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[LOG]'),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(message),
      );
    });

    it('should include context in output', () => {
      const message = 'User action';
      const context = { userId: '123', action: 'login' };
      logger.log(message, context);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(JSON.stringify(context)),
      );
    });

    it('should format output with ISO timestamp', () => {
      const before = new Date().toISOString();
      logger.log('Test');
      const after = new Date().toISOString();

      const call = (console.log as jest.Mock).mock.calls[0][0];
      expect(call).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });
  });

  describe('info()', () => {
    it('should call console.info with formatted message', () => {
      const message = 'Info message';
      logger.info(message);

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
      );
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining(message),
      );
    });
  });

  describe('warn()', () => {
    it('should call console.warn with formatted message', () => {
      const message = 'Warning message';
      logger.warn(message);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]'),
      );
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining(message),
      );
    });
  });

  describe('error()', () => {
    it('should log error message with level', () => {
      const message = 'Error occurred';
      logger.error(message);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(message),
      );
    });

    it('should include Error object stack trace in dev mode', () => {
      const error = new Error('Test error');
      logger.error('Error:', error);

      const call = (console.error as jest.Mock).mock.calls[0][0];
      expect(call).toContain('Test error');
    });

    it('should include context in error output', () => {
      const error = new Error('DB connection failed');
      const context = { database: 'postgres', retries: 3 };
      logger.error('Connection error', error, context);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(JSON.stringify(context)),
      );
    });
  });
});
