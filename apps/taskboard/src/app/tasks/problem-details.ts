import { HttpErrorResponse } from '@angular/common/http';

/** The body of the backend's error responses (application/problem+json, RFC 9457). */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  /** Only on 400 validation errors: the message for each rejected field, by field name. */
  errors?: Record<string, string>;
}

/** The problem details of a failed request, or null if the response had none. */
export function problemDetailsOf(error: unknown): ProblemDetails | null {
  if (error instanceof HttpErrorResponse && typeof error.error === 'object' && error.error) {
    return error.error as ProblemDetails;
  }
  return null;
}

/** Why a request failed, in a few words that fit after "Could not ...: ". */
export function reasonOf(error: unknown): string {
  const problem = problemDetailsOf(error);
  if (problem?.detail) {
    return problem.detail;
  }
  if (error instanceof HttpErrorResponse) {
    return error.status === 0
      ? 'the backend is unreachable'
      : `the backend answered with status ${error.status}`;
  }
  return 'something unexpected went wrong';
}
