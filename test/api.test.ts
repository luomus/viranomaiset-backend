import app from '../server/app.js';
import request from 'supertest';
import { describe, it, beforeEach, mock } from 'node:test'
import assert from 'node:assert';
import axios from 'axios';
import { ErrorMessageEnum } from '../server/models/models.js';
import { apiUrl } from '../server/config.local.js';
import { AxiosMock, getAuthenticationCookie, testToken } from './utils.js';

describe('Api', () => {
  const apiQuery = '/api/file-download?id=HBF.123';

  beforeEach(() => {
    mock.restoreAll();
    mock.method(axios, 'get', AxiosMock.get);
  });

  it('should return 401 response if not authenticated', async () => {
    const res = await request(app)
      .get(apiQuery)
      .expect(401);

    assert.equal(res.error && res.error.text, ErrorMessageEnum.loginRequired);
  });

  it('should return correct response if authenticated', async () => {
    const cookie = await getAuthenticationCookie(app);

    const res = await request(app)
      .get(apiQuery)
      .set('cookie', cookie)
      .expect(302);

    assert.equal(res.header['location'].includes(`${apiUrl}/warehouse/download`), true);
    assert.equal(res.header['location'].includes(testToken), true);
  });
});
