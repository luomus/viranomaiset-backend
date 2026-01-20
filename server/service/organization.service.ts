import { allowedRoles } from '../config.local.js';
import { TriplestoreService } from './triplestore.service.js';

interface IdValuePair {
  id: string;
  value: string
}

export interface VirUser {
  id: string;
  fullName: string;
  emailAddress: string;
  organisation: IdValuePair[];
  organisationAdmin: IdValuePair[];
  section: IdValuePair[];
  securePortalUserRoleExpires?: string;
}

const REFRESH_INTERVAL = 3600000; // 1h

export class OrganizationService {

  private users: VirUser[] = [];
  private organisations: {[id: string]: string};
  private sections: {[id: string]: string};

  private organisationsCacheKey: string;
  private organisationsCacheResponse: string[];

  constructor(
    private triplestoreService: TriplestoreService
  ) {
    setTimeout(() => {
      setInterval(() => this.refreshUsers(), REFRESH_INTERVAL);
      this.refreshUsers();
    }, 3000)
  }

  getUsers(includeExpired = false): VirUser[] {
    if (!includeExpired) {
      return this.users.filter(p => {
        return p.securePortalUserRoleExpires
          ? new Date(p.securePortalUserRoleExpires) > new Date()
          : true
      });
    }
    return this.users;
  }

  async getUser(id: string): Promise<VirUser> {
    const p = await this.triplestoreService.search<any>({
      type: 'MA.person',
      subject: id
    });
    return this.prepareSinglePerson(p[0], true);
  }

  refreshUsers(): Promise<void> {
    return this.triplestoreService.search<any>({
      type: 'MA.person', predicate: 'MA.role',
      objectresource: allowedRoles.filter(r => r !== 'MA.admin').join(','),
      limit: '999999999'
    })
      .then(persons => {
        const organizations = new Set<string>();
        persons.forEach(p => Array.isArray(p.organisation) ? p.organisation.forEach(o => organizations.add(o)) : organizations.add(p.organisation));
        return this.getOrganisationsFromRemote(organizations).then(organizations => {
          this.organisations = this.organizationsToLookUp(organizations);
          this.sections = this.sectionsToLookUp(organizations);
          return this.preparePersons(persons);
        })
      })
      .then(result => {
        this.users = result
      })
      .catch(e => console.log('User list refresh failed', e));
  }

  private getOrganisationsFromRemote(organisations: Set<string>) {
    const arr = Array.from(organisations.values());
    const query = arr.sort().join(',');
    if (query === this.organisationsCacheKey) {
      return Promise.resolve(this.organisationsCacheResponse);
    }
    this.organisationsCacheKey = query;
    return this.triplestoreService.search<any>({
      type: 'MOS.organization',
      subject: query,
      limit: '999999999'
    }).then(res => {
      this.organisationsCacheResponse = res;
      return res;
    });
  }

  private organizationsToLookUp(organizations: any[]): {[id: string]: string} {
    const result = {};
    organizations.forEach(organization => {
      result[organization.id] = organization?.['organizationLevel1']?.en;
    })
    return result;
  }

  private sectionsToLookUp(organizations: any[]): {[id: string]: string} {
    const result = {};
    const toName = (organization): string => {
      let result: string;
      ['organizationLevel1', 'organizationLevel2', 'organizationLevel3', 'organizationLevel4'].forEach(key => {
        if (organization?.[key]?.en) {
          result = organization[key].en;
        }
      });
      return result;
    };
    organizations.forEach(organization => {
      result[organization.id] = toName(organization);
    })
    return result;
  }

  private prepareSinglePerson(p: any, emailDomainOnly = false): VirUser {
    return {
      id: p.id,
      fullName: p.fullName || (`${p?.givenNames} ${p?.inheritedName}`),
      emailAddress: this.prepareEmailAddress(p.emailAddress, emailDomainOnly),
      organisation: this.toIdValuePairs(p?.organisation, this.organisations),
      organisationAdmin: this.toIdValuePairs(p.organisationAdmin, this.organisations),
      section: this.toIdValuePairs(p?.organisation, this.sections),
      securePortalUserRoleExpires: p.securePortalUserRoleExpires
    }
  }

  private preparePersons(persons: any[]): VirUser[] {
    return persons
      .filter(p => !!p.id)
      .map(p => (this.prepareSinglePerson(p)));
  }

  // Triplestore values aren't formatted properly, so they can be non-arrays
  // if there's only a single value. This function normalizes the value to
  // be always an array.
  private toArray(val: any): any[] {
    return !val
      ? []
      : Array.isArray(val)
        ? val
        : [val]
  }

  private toIdValuePairs(val: any, nameMap: { [id: string]: string }): IdValuePair[] {
    return this.toArray(val).map(o => ({
      id: o,
      value: this.mapName(o, nameMap)
    }));
  }

  private mapName(org: string, nameMap: { [id: string]: string }): string {
    return nameMap[org] || `unknown (${org})`;
  }

  private prepareEmailAddress(emailAddress: string, domainOnly = false): string {
    return domainOnly
      ? '@' + emailAddress?.split('@')?.[1]
      : emailAddress
  }
}
