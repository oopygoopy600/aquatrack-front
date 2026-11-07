import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getApiError,
  getFieldErrors,
  hasFieldErrors,
} from '../../src/utils/apiError.js';

describe('getApiError', () => {
  it('explains that the API is unreachable when there is no response', () => {
    assert.match(getApiError(new Error('Network Error')), /Cannot reach the API/);
  });

  it('prefers the first validation error message', () => {
    const error = {
      response: {
        data: {
          message: 'Validation failed.',
          errors: [
            { field: 'customer_name', message: 'Customer name is required.' },
            { field: 'email', message: 'Email is invalid.' },
          ],
        },
      },
    };
    assert.equal(getApiError(error), 'Customer name is required.');
  });

  it('falls back to the top-level API message', () => {
    const error = { response: { data: { message: 'Sale not found.' } } };
    assert.equal(getApiError(error), 'Sale not found.');
  });

  it('uses the provided fallback when the payload has no message', () => {
    const error = { response: { data: { success: false } } };
    assert.equal(getApiError(error, 'Custom fallback.'), 'Custom fallback.');
  });
});

describe('getFieldErrors', () => {
  it('keeps the first message for each field', () => {
    const error = {
      response: {
        data: {
          errors: [
            { field: 'amount', message: 'Amount must be positive.' },
            { field: 'amount', message: 'A later duplicate message.' },
            { field: 'description', message: 'Description is required.' },
            { message: 'No field attached.' },
          ],
        },
      },
    };
    assert.deepEqual(getFieldErrors(error), {
      amount: 'Amount must be positive.',
      description: 'Description is required.',
    });
  });

  it('returns an empty object when there are no field errors', () => {
    assert.deepEqual(getFieldErrors(new Error('offline')), {});
  });
});

describe('hasFieldErrors', () => {
  it('detects at least one field error', () => {
    assert.equal(
      hasFieldErrors({ response: { data: { errors: [{ field: 'x', message: 'y' }] } } }),
      true
    );
  });

  it('returns false for missing or empty error arrays', () => {
    assert.equal(hasFieldErrors(new Error('offline')), false);
    assert.equal(hasFieldErrors({ response: { data: { errors: [] } } }), false);
  });
});
