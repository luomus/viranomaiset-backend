import jsonld from 'jsonld';
import rdf from 'rdflib';
import fetch from 'node-fetch';
import { triplestoreUrl, triplestoreAuth } from '../config.local.js';

export interface ITriplestoreSearchQuery {
  type: string;
  predicate?: string;
  objectresource?: string;
  objectliteral?: string;
  limit?: string;
  offset?: string;
  object?: string;
  subject?: string;
  format?: 'JSON_RDFXML' | 'RDFXMLABBREV' | 'RDFXML' | 'JSON_RDFXMLABBREV'
}

export class TriplestoreService {

  search<T>(query: ITriplestoreSearchQuery): Promise<T[]> {
    return fetch(triplestoreUrl + '/search?' + this.getQuery(query), {
      headers: {
        'Authorization': triplestoreAuth
      }
    })
      .then((res) => res.text())
      .then(rdf => this.rdfToJsonLd(rdf))
      .then(json => jsonld.compact(json, TriplestoreService.getContext(query) as any))
      .then(data => TriplestoreService.findDataArray(data))
      .then(data => this.convertToSort(data) as T[])
  }

  private rdfToJsonLd(data): Promise<object> {
    return new Promise((resolve, reject) => {
      if (!data) {
        return reject('No data from the triplestore server');
      }
      const store = rdf.graph();
      rdf.parse(data, store, 'http://tun.fi/', 'application/rdf+xml')
      rdf.serialize(null, store, 'http://tun.fi/', 'application/ld+json', (err, jsonldData) => {
        if (err) {
          return reject(err);
        }
        resolve(JSON.parse(jsonldData))
      })
    })
  }

  private getQuery(query: object) {
    return Object.keys(query).map((key) => {
      return encodeURIComponent(key) + '=' + encodeURIComponent(query[key])
    }).join('&');
  }

  private static findDataArray(data: any) {
    if (Array.isArray(data['@graph'])) {
      return data['@graph'];
    } else if (Array.isArray(data)) {
      return data;
    }
    return [data];
  }

  private static getContext(query: ITriplestoreSearchQuery) {
    return `http://schema.laji.fi/context/${TriplestoreService.toSort(query.type)}.jsonld`;
  }

  private static toSort(id: string) {
    if (typeof id !== 'string') {
      return id;
    }
    return id.replace(/^[A-Z]+[.:]/, '');
  }

  private convertToSort(data: object|object[]) {
    if (!data) {
      return data;
    }
    if (Array.isArray(data)) {
      return data.map(d => this.convertToSort(d));
    }
    return Object.keys(data).reduce((res, key) => {
      const shortKey = TriplestoreService.toSort(key);
      res[shortKey] = data[key];
      return res;
    }, {});
  }
}
