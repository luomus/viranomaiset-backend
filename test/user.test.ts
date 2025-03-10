import app from '../server/app.js';
import request from 'supertest';
import { describe, it, beforeEach, mock } from 'node:test'
import assert from 'node:assert';
import axios from 'axios';
import { AxiosMock, testToken } from './utils.js';

describe('User', () => {
  beforeEach(() => {
    mock.restoreAll();
    mock.method(axios, 'get', AxiosMock.get);
  });

  it('should render the login page ', async () => {
    const res = await request(app)
      .get('/user/viranomaiset')
      .expect(200);

    assert.equal(res.text.includes('Valitse kirjautumistapa'), true);
  });

  it('should redirect to frontend login page after successful login', async () => {
    const res = await request(app)
      .post('/user/viranomaiset')
      .send({
        token: testToken,
        next: ''
      })
      .expect(302);

    assert.equal(res.header['location'].includes('/user/login?'), true);
    assert.equal(res.header['location'].includes(testToken), false);
  });
});
