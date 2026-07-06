export class DdysCliError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'DdysCliError';
    this.code = options.code || 'ERR_DDYS_CLI';
    this.status = options.status;
    this.endpoint = options.endpoint || '';
    this.exitCode = options.exitCode || 1;
    this.details = options.details;
    this.cause = options.cause;
  }
}

export class DdysUsageError extends DdysCliError {
  constructor(message, options = {}) {
    super(message, { ...options, code: 'ERR_DDYS_USAGE', exitCode: options.exitCode || 2 });
    this.name = 'DdysUsageError';
  }
}

export class DdysApiError extends DdysCliError {
  constructor(message, options = {}) {
    super(message, { ...options, code: 'ERR_DDYS_API' });
    this.name = 'DdysApiError';
  }
}

export class DdysTimeoutError extends DdysApiError {
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'DdysTimeoutError';
  }
}

export class DdysNetworkError extends DdysApiError {
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'DdysNetworkError';
  }
}

export class DdysParseError extends DdysApiError {
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'DdysParseError';
  }
}
