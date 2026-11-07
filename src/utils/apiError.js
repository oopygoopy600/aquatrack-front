/**
 * Normalises API failures for inline alerts and toasts.
 * The API always returns { success, message, errors? }.
 */
export function getApiError(error, fallback = 'Something went wrong. Please try again.') {
  if (!error?.response) {
    return 'Cannot reach the API. Make sure the Express server and PostgreSQL are running.';
  }
  const data = error.response.data;
  return data?.errors?.[0]?.message || data?.message || fallback;
}

/** Maps express-validator errors to { fieldName: message }. */
export function getFieldErrors(error) {
  const fields = {};
  for (const item of error?.response?.data?.errors || []) {
    if (item?.field && !fields[item.field]) fields[item.field] = item.message;
  }
  return fields;
}

export function hasFieldErrors(error) {
  return (error?.response?.data?.errors?.length || 0) > 0;
}
