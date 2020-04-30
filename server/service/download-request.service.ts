import { ITriplestoreSearchQuery, TriplestoreService } from './triplestore.service';
import { systemId } from '../config.local';

export interface IDownloadRequest {
  id: string;
  requested: string;
  downloadType: string;
  source: string;
  collectionId: string;
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
    setInterval(() => {
      this.refreshSearchList();
    }, REFRESH_LIST);
  }

  async searchDownloads(query: IDownloadRequestSearch): Promise<IDownloadRequest[]> {
    const queryKeysLength = Object.keys(query).length;
    if (queryKeysLength === 0) {
      return this.allRequests;
    } else if (queryKeysLength === 1) {
      const key = Object.keys(query)[0];
      return this.search({
        predicate: 'HBF.' + key,
        objectliteral: query[key]
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
    console.log('S', query);
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
      requested: raw.requested,
      downloadType: raw.downloadType,
      source: raw.source,
      collectionId: raw.collectionId
    };
  }

}
