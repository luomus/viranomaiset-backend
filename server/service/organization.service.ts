import { allowedRoles, rootCollections, userCollectionMap } from '../config.local';
import { TriplestoreService } from './triplestore.service';

interface IPerson {
  id: string;
  fullName: string;
  emailAddress: string;
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

  private organizations = [];

  constructor(
    private triplestoreService: TriplestoreService
  ) {
    setTimeout(() => {
      setInterval(() => this.refreshOrganizations(), REFRESH_INTERVAL);
      this.refreshOrganizations();
    }, 3000)
  }

  public getUsers(): IColOrganization[] {
    return this.organizations;
  }

  private refreshOrganizations() {
    this.triplestoreService.search<any>({
      type: 'MA.person',
      predicate: 'MA.role',
      objectresource: allowedRoles.join(',')
    })
      .then(persons => {
        return this.triplestoreService.search<any>({
          type: 'MY.collection',
          subject: rootCollections.join(',')
        })
          .then(roots => this.findSubOrganizations(roots))
          .then(cols => this.addPersonInfoToCollections(this.personsToLookUp(persons), cols))
      })
      .then(result => this.organizations = result)
      .catch(e => console.log('Organization refresh failed', e));
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

  private personsToLookUp(persons: any[]): {[id: string]: IPerson} {
    const result = {};
    persons.forEach(person => {
      result[person.id] = {
        id: person.id,
        fullName: person.fullName || (`person.firstName`),
        emailAddress: person.emailAddress
      }
    })
    return result;
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
