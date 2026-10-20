import AppError from "../utils/AppError.js";

export default function errorHandler(err, req, res, next) {
  let error = err;

  // Mongoose validation (required, match, enum...)
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
    error = new AppError(message, 400);
  }

  // Duplicate key (unique index)
  else if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    error = new AppError(`This ${field} is already used`, 409);
  }

  // Bad ObjectId or wrong type in a query
  else if (err.name === "CastError") {
    error = new AppError(`Invalid ${err.path}`, 400);
  }

  const statusCode = error.statusCode || 500;

  if (!error.isOperational) console.error(err); // unexpected bug: log it

  res.status(statusCode).json({
    message: error.isOperational ? error.message : "Server error",
    ...(error.isOperational && error.errorCode && { code: error.errorCode }),
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
}
