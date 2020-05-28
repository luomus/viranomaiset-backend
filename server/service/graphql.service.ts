import ApolloClient from 'apollo-boost';
import { accessToken, apiUrl } from '../config.local';
import { QueryOptions } from 'apollo-client/core/watchQueryOptions';
import { ApolloQueryResult, OperationVariables } from 'apollo-client/core/types';

export class GraphQLService {

  private client: ApolloClient<any>;

  constructor() {
    this.client = new ApolloClient({
      uri: apiUrl + '/graphql',
      headers: {
        Authorization: accessToken
      }
    });
  }

  query<T = any, TVariables = OperationVariables>(options: QueryOptions<TVariables>): Promise<ApolloQueryResult<T>> {
    return this.client.query(options)
  }

}
