import { ITriplestoreSearchQuery, TriplestoreService } from './triplestore.service';
import { systemId } from '../config.local';

export interface IDownloadRequest {
  id: string;
  requested: string;
  downloadType: string;
  source: string;
  collectionId: string;
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
    private triplestoreService: TriplestoreService
  ) {
    this.refreshSearchList();
    setInterval(() => { this.refreshSearchList(); }, REFRESH_LIST);
  }

  async searchDownloads(query: IDownloadRequestSearch): Promise<IDownloadRequest[]> {
    let keyCnt = 0;
    const filter = Object.keys(query).reduce((result, key) => {
      if (['collectionId', 'person'].includes(key)) {
        key++;
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

  private refreshSearchList() {
    this.search({
      predicate: 'HBF.source',
      objectliteral: systemId
    })
      .then(data => (data || []).map(d => this.rawToDownloadRequest(d)))
      .then(data => this.allRequests = data)
      .catch(e => console.log('Failed to featch all download requests', e))
  }

  private search(query: Omit<ITriplestoreSearchQuery, 'type'>): Promise<IDownloadRequest[]> {
    return this.triplestoreService.search<IDownloadRequest>({
      ...query,
      type: 'HBF.downloadRequest'
    })
      .then(data => (data || []).map(d => this.rawToDownloadRequest(d)))
      .then(data => data.filter(d => d.source === systemId));
  }

  private rawToDownloadRequest(raw: any): IDownloadRequest {
    if (typeof raw !== 'object') {
      return undefined;
    }
    // console.log(raw);
    return {
      id: raw.id,
      person: raw.person,
      source: raw.source,
      requested: raw.requested,
      downloadType: raw.downloadType,
      collectionId: raw.collectionId,
      dataUsePurpose: raw.dataUsePurpose
    };
  }

}
