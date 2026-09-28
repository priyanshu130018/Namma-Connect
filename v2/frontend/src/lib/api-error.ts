export interface NormalizedApiError {
  code:
    | "VALIDATION_ERROR"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "CONFLICT"
    | "BAD_REQUEST"
    | "RATE_LIMITED"
    | "NETWORK_ERROR"
    | "TIMEOUT"
    | "SERVER_ERROR"
    | "SERVICE_UNAVAILABLE"
    | "UNKNOWN_ERROR"
    | string;
  message: string;
  status?: number;
  details?: Record<string, any> | null;
}

export function normalizeApiError(err: unknown, fallbackMessage?: string): NormalizedApiError {
  if (!err) {
    return {
      code: "UNKNOWN_ERROR",
      message: fallbackMessage || "An unknown error occurred. Please try again.",
    };
  }

  // Handle Axios/Fetch or HTTP Errors
  const errorObj = err as any;
  const status = errorObj?.response?.status || errorObj?.status;
  const serverErrorObj = errorObj?.response?.data?.error || errorObj?.data?.error;
  const serverMessage = serverErrorObj?.message || errorObj?.response?.data?.detail || errorObj?.message;
  const serverCode = serverErrorObj?.code || errorObj?.response?.data?.error_code || errorObj?.code;

  // Network / Connection Failure
  if (errorObj?.code === "ERR_NETWORK" || errorObj?.message === "Network Error" || !errorObj?.response && errorObj?.request) {
    return {
      code: "NETWORK_ERROR",
      status: 0,
      message: "Unable to connect to the server. Please check your connection and try again.",
    };
  }

  // Timeout Error
  if (errorObj?.code === "ECONNABORTED" || errorObj?.message?.toLowerCase().includes("timeout")) {
    return {
      code: "TIMEOUT",
      status: 408,
      message: "The request took too long to complete. Please try again.",
    };
  }

  // HTTP Status Code Specific Mappings
  if (status === 401) {
    return {
      code: "UNAUTHORIZED",
      status: 401,
      message: "Your session has expired. Please sign in again.",
    };
  }

  if (status === 403) {
    return {
      code: "FORBIDDEN",
      status: 403,
      message: "You do not have permission to perform this action.",
    };
  }

  if (status === 404) {
    return {
      code: "NOT_FOUND",
      status: 404,
      message: fallbackMessage || "The requested resource could not be found.",
    };
  }

  if (status === 409) {
    return {
      code: "CONFLICT",
      status: 409,
      message: serverMessage || "Conflicting state or action. Please refresh and try again.",
    };
  }

  if (status === 422) {
    return {
      code: "VALIDATION_ERROR",
      status: 422,
      message: "Please correct the highlighted fields.",
      details: serverErrorObj?.details || null,
    };
  }

  if (status === 429) {
    return {
      code: "RATE_LIMITED",
      status: 429,
      message: "Too many requests. Please wait a moment and try again.",
    };
  }

  if (status >= 500) {
    return {
      code: status === 503 ? "SERVICE_UNAVAILABLE" : "SERVER_ERROR",
      status,
      message: "Something went wrong. The service is temporarily unavailable. Please try again later.",
    };
  }

  // Return server code/message if safe and clean string, else fallback
  if (typeof serverMessage === "string" && serverMessage.trim() && !isRawTechnicalError(serverMessage)) {
    return {
      code: serverCode || "BAD_REQUEST",
      status: status || 400,
      message: serverMessage,
    };
  }

  return {
    code: serverCode || "UNKNOWN_ERROR",
    status: status || 500,
    message: fallbackMessage || "Unable to complete the operation. Please try again.",
  };
}

/**
 * Filter out technical error strings like database, ORM, stack traces, etc.
 */
function isRawTechnicalError(msg: string): boolean {
  const technicalKeywords = [
    "MongoServerError",
    "PrismaClientKnownRequestError",
    "SQLSTATE",
    "SyntaxError",
    "TypeError",
    "ReferenceError",
    "Traceback",
    "postgresql",
    "mongodb",
    "sqlite",
    "connection refused",
    "at ",
  ];
  const lower = msg.toLowerCase();
  return technicalKeywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}
