import { apiUrl, lajiAuthUrl, systemId, triplestoreUrl } from '../server/config.local.js';
import request from 'supertest';
import { Application } from 'express';

export const testToken = 'abcdefghijk';

export const AxiosMock = {
  get: async (url: string) => {
    if (url === `${lajiAuthUrl}token/${testToken}`) {
      return Promise.resolve({
        status: 200,
        data: {
          target: systemId,
          source: 'LOCAL',
          next: '',
          user: {
            name: 'Test User',
            roles: ['MA.securePortalUser'],
            organisations: ['MOS.0']
          }
        }
      });
    } else if (url.startsWith(`${apiUrl}/person/${testToken}`)) {
      return Promise.resolve({
        status: 200,
        data: {
          id: 'MA.0',
          fullName: 'Test User',
          role: ['MA.securePortalUser'],
          organisation: 'MOS.0'
        }
      });
    } else if (url.startsWith(`${triplestoreUrl}/search`)) {
      if (url.includes('type=MA.person')) {
        return Promise.resolve({
          status: 200,
          data:
            `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://tun.fi/">
            <MA.person rdf:about="http://tun.fi/MA.0">
              <MA.role rdf:resource="http://tun.fi/MA.securePortalUser"/>
              <MA.fullName>Test User</MA.fullName>
              <MA.organisation rdf:resource="http://tun.fi/MOS.0"/>
           </MA.person>
         </rdf:RDF>`
        });
      } else {
        return Promise.resolve({
          status: 200,
          data:
            `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://tun.fi/">
            <MOS.organization rdf:about="http://tun.fi/MOS.0">
              <MZ.editor rdf:resource="http://tun.fi/MA.0" />
              <MOS.organizationLevel1 xml:lang="en">Test Organization</MOS.organizationLevel1>
            </MOS.organization>
          </rdf:RDF>`
        })
      }
    }

    return Promise.reject();
  }
};

export function timeout(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getAuthenticationCookie(app: Application): Promise<string> {
  const res = await request(app)
    .post('/user/viranomaiset')
    .send({
      token: testToken,
      next: ''
    });
  return res.header['set-cookie'];
}
