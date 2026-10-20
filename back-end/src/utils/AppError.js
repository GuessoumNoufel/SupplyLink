export default class AppError extends Error {
  constructor(message, statusCode = 500, errorCode) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true; // an expected error, safe to show to the client
    Error.captureStackTrace(this, this.constructor);
  }
}
