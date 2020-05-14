import { allowedRoles, rootCollections, userCollectionMap } from '../config.local';
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
      setInterval(() => this.refreshOrganizations(), REFRESH_INTERVAL);
      this.refreshOrganizations();
    }, 3000)
  }

  public getUsers(): IColOrganization[] {
    return this.users;
  }

  private refreshOrganizations() {
    this.triplestoreService.search<any>({
      type: 'MA.person',
      predicate: 'MA.role',
      objectresource: allowedRoles.join(',')
    })
      .then(persons => {
        const organizations = new Set<string>();
        persons.forEach(p => Array.isArray(p.organisation) ? p.organisation.forEach(o => organizations.add(o)) : organizations.add(p.organisation))
        return this.triplestoreService.search<any>({
          type: 'MOS.organization',
          subject: Array.from(organizations.values()).join(',')
        })
          .then(organizations => this.preparePerson(persons, this.organizationsToLookUp(organizations)))
      })
      .then(result => this.users = result)
      .catch(e => console.log('User list refresh failed', e));
  }

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
    const toName = (organization): string => {
      const result = [];
      ['organizationLevel1', 'organizationLevel2', 'organizationLevel3', 'organizationLevel4'].forEach(key => {
        if (organization?.[key]?.en) {
          result.push(organization[key].en);
        }
      });
      return result.join(', ')
    };
    organizations.forEach(organization => {
      result[organization.id] = toName(organization);
    })
    return result;
  }

  private preparePerson(persons: any[], organizations: { [id: string]: string }) {
    return persons.map(p => ({
      id: p.id,
      fullName: p.fullName || (`${p.givenNames} ${p.inheritedName}`),
      emailAddress: p.emailAddress,
      organisation: this.prepareOrganization(p, organizations)
    }));
  }

  private prepareOrganization(person: any, organizations: { [id: string]: string }): string[] {
    if (person.organisation) {
      if (Array.isArray(person.organisation)) {
        return person.organisation.map(o => organizations[o] || 'unknown')
      }
      return [(organizations[person.organisation] || 'unknown')];
    }
    return ['unknown'];
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
