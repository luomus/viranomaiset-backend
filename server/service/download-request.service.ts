import { ITriplestoreSearchQuery, TriplestoreService } from './triplestore.service';
import { rootCollections, systemId } from '../config.local';
import { GraphQLService } from './graphql.service';
import { gql } from 'apollo-boost';

export interface IDownloadRequest {
  id: string;
  requested: string;
  downloadType: string;
  source: string;
  collectionId: string[];
  rootCollections: string[];
  person: string;
  dataUsePurpose: string;
}

export interface IDownloadRequestSearch {
  collectionId?: string;
  person?: string;
}

const REFRESH_LIST = 1000 * 60 * 60 // 1h

export class DownloadRequestService {

  private allRequests: IDownloadRequest[];

  constructor(
    private triplestoreService: TriplestoreService,
    private graphQLService: GraphQLService
  ) {
    this.refreshSearchList().then();
    setInterval(() => { this.refreshSearchList().then(); }, REFRESH_LIST);
  }

  async searchDownloads(query: IDownloadRequestSearch): Promise<IDownloadRequest[]> {
    let keyCnt = 0;
    const filter = Object.keys(query).reduce((result, key) => {
      if (['collectionId', 'person'].includes(key)) {
        keyCnt++;
        return key;
      }
      return result;
    }, '');
    if (keyCnt === 0) {
      return this.allRequests;
    } else if (keyCnt === 1) {
      return this.search({
        predicate: 'HBF.' + filter,
        objectliteral: query[filter]
      })
    }
    return [];
  }

  private async refreshSearchList() {
    return this.search({
      predicate: 'HBF.source',
      objectliteral: systemId
    })
      .then(data => this.allRequests = data)
      .catch(e => console.log('Failed to featch all download requests', e))
  }

  private collectionsIn(id: string) {
    return this.graphQLService.query({
      query: gql`
          query($id: ID) {
              children: collection(id: $id) {
                  id
                  children {
                      id
                      children {
                          id
                          children {
                              id
                          }
                      }
                  }
              }
          }
      `,
      variables: {
        id
      }
    })
    .then(data => this.pickCollections(data.data))
    .then(data => data.reduce((r, d) => {
      r[d] = id;
      return r;
    }, {}));
  }

  private pickCollections(data, cols = []) {
    if (!data) {
      return cols;
    }
    if (data.id) {
      cols.push(data.id);
    }
    if (data.children) {
      data.children.forEach(c => this.pickCollections(c, cols));
    }
    return cols;
  }

  private async search(query: Omit<ITriplestoreSearchQuery, 'type'>): Promise<IDownloadRequest[]> {
    const colRootMap = await Promise.all(
      rootCollections.map(c => this.collectionsIn(c))
    ).then(cols => cols.reduce((a, c) => ({...a,...c}), {}));

    return this.triplestoreService.search<IDownloadRequest>({
      ...query,
      type: 'HBF.downloadRequest'
    })
      .then(data => (data || []).map(d => this.rawToDownloadRequest(d, colRootMap)))
      .then(data => data.filter(d => d?.source === systemId));
  }

  private rawToDownloadRequest(raw: any, colRootMap: {[id: string]: string}): IDownloadRequest {
    if (typeof raw !== 'object' || !(raw.completed === 'true' || raw.completed === true)) {
      return undefined;
    }
    const roots = new Set<string>();
    if (raw.collectionId) {
      if (!Array.isArray(raw.collectionId)) {
        raw.collectionId = [raw.collectionId];
      }
      raw.collectionId.forEach(c => roots.add(colRootMap[(c.replace('http://tun.fi/', ''))]));
    }
    // console.log(raw);
    return {
      id: raw.id,
      person: raw.person,
      source: raw.source,
      requested: raw.requested,
      downloadType: raw.downloadType,
      collectionId: raw.collectionId,
      rootCollections: Array.from(roots.values()) as string[],
      dataUsePurpose: raw.dataUsePurpose
    };
  }

}
