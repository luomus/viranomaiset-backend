import { allowedRoles, userCollectionMap } from '../config.local';
import { TriplestoreService } from './triplestore.service';

interface IPerson {
  id: string;
  fullName: string;
  emailAddress: string;
  organisation: string[]
}

export interface IColOrganization {
  id: string;
  collectionName: {
    fi: string;
    sv: string;
    en: string;
  };
  person?: IPerson[];
  children?: IColOrganization[];
}

const REFRESH_INTERVAL = 3600000; // 1h

const UNDEFINED_COLLECTION = {
  id: 'undefined',
  collectionName: {
    fi: 'Tuntematon',
    sv: 'Tuntematon',
    en: 'Tuntematon'
  }
};

export class OrganizationService {

  private users = [];

  constructor(
    private triplestoreService: TriplestoreService
  ) {
    setTimeout(() => {
      setInterval(() => this.getAllUsers(), REFRESH_INTERVAL);
      this.getAllUsers();
    }, 3000)
  }

  public getUsers(includeExpired = false): IColOrganization[] {
    if (!includeExpired) {
      return this.users.filter(p => {
        return p.securePortalUserRoleExpires
          ? new Date(p.securePortalUserRoleExpires) > new Date()
          : true
      });
    }
    return this.users;
  }

  public async getUser(id: string): Promise<any> {
    const p = await this.triplestoreService.search<any>({
      type: 'MA.person',
      subject: id
    });
    return this.prepareSinglePerson(p[0], !!"domain only");
  }

  getAllUsers() {
    return this.triplestoreService.search<any>({
      type: 'MA.person',
      predicate: 'MA.role',
      objectresource: allowedRoles.filter(r => r !== 'MA.admin').join(',')
    })
      .then(persons => {
        const organizations = new Set<string>();
        persons.forEach(p => Array.isArray(p.organisation) ? p.organisation.forEach(o => organizations.add(o)) : organizations.add(p.organisation))
        return this.triplestoreService.search<any>({
          type: 'MOS.organization',
          subject: Array.from(organizations.values()).join(',')
        })
          .then(organizations => {
            this.organisations = this.organizationsToLookUp(organizations);
            this.sections = this.sectionsToLookUp(organizations);
            return this.preparePersons(persons);
          })
      })
      .then(result => this.users = result)
      .catch(e => console.log('User list refresh failed', e));
  }

  organisations: {[id: string]: string};
  sections: {[id: string]: string};

  private addPersonInfoToCollections(persons: {[colID: string]: IPerson}, collections: any[], level = 0): IColOrganization[] {
    const result: IColOrganization[] = [];
    collections.forEach(raw => {
      if (!raw) {
        return;
      }
      result.push(OrganizationService.rawCollectionToCollection(raw, {
        person: userCollectionMap[raw.id] ? userCollectionMap[raw.id].map(id => {
          const person = persons[id];
          delete persons[id];
          return person as IPerson;
        }) : [],
        children: raw.children ? this.addPersonInfoToCollections(persons, raw.children, level + 1) : []
      }));
    });

    if (level !== 0) {
      return result;
    }

    const unknown = [];
    Object.keys(persons).forEach(id => {
      unknown.push(persons[id]);
    });

    if (unknown.length > 0) {
      result.push({
        ...UNDEFINED_COLLECTION,
        person: unknown
      });
    }

    return result;
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

  private prepareSinglePerson(p: any, emailDomainOnly = false) {
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

  private preparePersons(persons: any[]) {
    const prepared = persons
      .filter(p => !!p.id)
      .map(p => {
        return this.prepareSinglePerson(p);
    });
    return prepared;
  }

  // Triplestore values aren't formatted properly, so they can be non-arrays
  // if there's only a single value. This function normalizes the value to
  // be always an array.
  private toArray(val: any) {
    return !val
      ? []
      : Array.isArray(val)
        ? val
        : [val]
  }


  private toIdValuePairs(val: any, nameMap: { [id: string]: string }) {
    return this.toArray(val).map(o => ({
      id: o,
      value: this.mapName(o, nameMap)
    }));
  }

  private mapName(org: string, nameMap: { [id: string]: string }) {
    return nameMap[org] || `unknown (${org})`;
  }

  private prepareEmailAddress(emailAddress: string, domainOnly = false) {
    return domainOnly
      ? `@` + emailAddress?.split('@')?.[1]
      : emailAddress

  }

  private async findSubOrganizations(roots: any, fetched = {}): Promise<IColOrganization[]> {
    if (!roots) {
      return [];
    }

    const collectionMap = await this.triplestoreService.search<any>({
      type: 'MY.collection',
      predicate: 'MY.isPartOf',
      objectresource: roots.map(c => c.id).join(',')
    }).then(cols => (cols || []).reduce((all, raw) => {
      const partOf = raw && raw.isPartOf && raw.isPartOf.id || '';
      if (!partOf) {
        return;
      }
      if (!all[partOf]) {
        all[partOf] = [];
      }
      all[partOf].push(OrganizationService.rawCollectionToCollection(raw));
      return all;
    }, {}));

    if (!collectionMap) {
      return []
    }

    const newLevel = [];
    roots.forEach(root => {
      if (collectionMap[root.id]) {
        if (!root.children) {
          root.children = [];
        }
        collectionMap[root.id].forEach(col => {
          if (fetched[col.id]) {
            return;
          }
          fetched[col.id] = true;
          newLevel.push(col);
          root.children.push(col);
        })
      }
    });
    if (newLevel.length > 0) {
      await this.findSubOrganizations(newLevel, fetched);
    }

    return roots;
  }

  private static rawCollectionToCollection(raw: any, override: object = {}) {
    if (!raw || typeof raw !== 'object') {
      return undefined;
    }
    return {
      id: raw.id,
      collectionName: raw.collectionName,
      ...override
    }
  }
}
