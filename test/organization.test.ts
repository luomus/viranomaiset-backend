import app from '../server/app.js';
import request from 'supertest';
import { describe, it, beforeEach, mock } from 'node:test'
import assert from 'node:assert';
import axios from 'axios';
import { ErrorMessageEnum } from '../server/models/models.js';
import { AxiosMock, getAuthenticationCookie, timeout } from './utils.js';

describe('Organization', () => {
  const organizationQuery = '/api/authorities';

  beforeEach(() => {
    mock.restoreAll();
    mock.method(axios, 'get', AxiosMock.get);
  });

  it('should return 401 response if not authenticated', async () => {
    const res = await request(app)
      .get(organizationQuery)
      .expect(401);

    assert.equal(res.error && res.error.text, ErrorMessageEnum.loginRequired);
  });

  it('should return correct response if authenticated', async () => {
    const cookie = await getAuthenticationCookie(app);

    await timeout(3500); // wait for organizations to load to cache

    const res = await request(app)
      .get(organizationQuery)
      .set('cookie', cookie)
      .expect(200);

    assert.equal(res.body.length, 1);

    const person = res.body[0];
    assert.equal(person.id, 'MA.0');
  });
});
