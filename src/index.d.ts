export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface CliConfig {
  apiBase: string;
  publicBase: string;
  apiKey: string;
  timeoutMs: number;
  format: 'table' | 'json' | 'ndjson' | 'text' | 'raw';
  raw: boolean;
  color: boolean;
  verbose: boolean;
  userAgent: string;
}

export interface ParsedArgv {
  command: string;
  positionals: string[];
  options: Record<string, unknown>;
}

export class DdysCliError extends Error {
  code: string;
  status?: number;
  endpoint: string;
  exitCode: number;
  details?: unknown;
}
export class DdysUsageError extends DdysCliError {}
export class DdysApiError extends DdysCliError {}
export class DdysTimeoutError extends DdysApiError {}
export class DdysNetworkError extends DdysApiError {}
export class DdysParseError extends DdysApiError {}

export class DdysClient {
  constructor(config: CliConfig, runtime?: { fetch?: typeof fetch });
  request(method: string, path: string, options?: {
    query?: Record<string, unknown>;
    headers?: Record<string, string>;
    body?: unknown;
    auth?: boolean;
  }): Promise<unknown>;
}

export const VERSION: string;
export const DEFAULT_API_BASE: string;
export const DEFAULT_PUBLIC_BASE: string;
export const DEFAULT_TIMEOUT_MS: number;
export const USER_AGENT: string;

export function parseArgv(argv?: string[]): ParsedArgv;
export function loadConfig(options?: Record<string, unknown>, env?: Record<string, string | undefined>): CliConfig;
export function createDdysClient(config: CliConfig, runtime?: { fetch?: typeof fetch }): DdysClient;
export function executeCommand(parsed: ParsedArgv, config: CliConfig, runtime?: { fetch?: typeof fetch }): Promise<CliResult>;
export function runCli(argv?: string[], env?: Record<string, string | undefined>, runtime?: { fetch?: typeof fetch }): Promise<CliResult>;
export function main(argv?: string[], env?: Record<string, string | undefined>, runtime?: { fetch?: typeof fetch }): Promise<CliResult>;
export function renderOutput(payload: unknown, options?: Record<string, unknown>): string;
export function renderEmbed(component?: string, options?: Record<string, unknown>): string;
export function renderWorkerEnv(options?: Record<string, unknown>): string;
export function renderCompletion(shell?: string): string;
export function renderHelp(command?: string): string;

declare const defaultRunCli: typeof runCli;
export default defaultRunCli;
