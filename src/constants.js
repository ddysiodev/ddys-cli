export const VERSION = '0.1.0';
export const DEFAULT_API_BASE = 'https://ddys.io/api/v1';
export const DEFAULT_PUBLIC_BASE = 'https://ddys.io';
export const DEFAULT_TIMEOUT_MS = 15000;
export const DEFAULT_FORMAT = 'table';
export const DEFAULT_LIMIT = 10;
export const USER_AGENT = `ddys-cli/${VERSION}`;

export const COMMAND_GROUPS = {
  read: ['search', 'latest', 'hot', 'movies', 'movie', 'sources', 'related', 'comments', 'calendar', 'types', 'genres', 'regions', 'collections', 'collection', 'shares', 'share', 'requests', 'activities', 'user', 'me'],
  write: ['create-request', 'comment-create', 'comment-delete', 'report-invalid', 'follow', 'unfollow'],
  utility: ['api', 'doctor', 'embed', 'worker-env', 'completion', 'help', 'version']
};
