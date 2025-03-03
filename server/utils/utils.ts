export function updateQueryStringParameter(path: string, key: string, value: string): string {
  const re = new RegExp('([?&])' + key + '=.*?(&|$)', 'i');
  const separator = path.indexOf('?') !== -1 ? '&' : '?';
  if (path.match(re)) {
    return path.replace(re, '$1' + key + '=' + value + '$2');
  } else {
    return path + separator + key + '=' + value;
  }
}

export function replacePublicToken(value: string, publicToken: string, privateToken: string): string {
  const rePublic = new RegExp(publicToken, 'g');
  const rePrivate = new RegExp(privateToken, 'g');

  return value
    .replace(rePrivate, '')
    .replace(rePublic, privateToken);
}

export function replacePublicTokenInBody(body: any, publicToken: string, privateToken: string): any {
  if (typeof body === 'string') {
    return replacePublicToken(body, publicToken, privateToken);
  } else if (typeof body === 'object') {
    return JSON.parse(replacePublicToken(JSON.stringify(body), publicToken, privateToken));
  }

  return body;
}
