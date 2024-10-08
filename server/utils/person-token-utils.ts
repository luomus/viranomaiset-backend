export function replacePublicTokenInUrl(url: string, publicToken: string, privateToken: string): string {
  return url
    .replace(privateToken, '')
    .replace(publicToken, privateToken);
}

export function replacePublicTokenInBody(body: any, publicToken: string, privateToken: string): any {
  if (typeof body === 'string') {
    try {
      const rePublic = new RegExp(publicToken, 'g');
      const rePrivate = new RegExp(privateToken, 'g');
      body = body
        .replace(rePrivate, '')
        .replace(rePublic, privateToken);
    } catch (e) {
      body = '';
    }
  } else if (typeof body === 'object' && Object.keys(body).length === 0) {
    body = '';
  }

  return body;
}
