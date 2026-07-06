import { parseArgv } from './args.js';
import { loadConfig } from './config.js';
import { executeCommand, normalizeCommand } from './commands.js';
import { DdysCliError } from './errors.js';

export { parseArgv } from './args.js';
export { DdysClient, buildUrl, createDdysClient, encodePathSegment, normalizePath } from './client.js';
export { executeCommand, normalizeCommand } from './commands.js';
export { loadConfig, normalizeBaseUrl, normalizeFormat, parseBoolean, parseNonNegativeInteger, parsePositiveInteger } from './config.js';
export { VERSION, DEFAULT_API_BASE, DEFAULT_PUBLIC_BASE, DEFAULT_TIMEOUT_MS, USER_AGENT } from './constants.js';
export { renderEmbed, renderPublicUrl, renderWorkerEnv } from './embed.js';
export { DdysApiError, DdysCliError, DdysNetworkError, DdysParseError, DdysTimeoutError, DdysUsageError } from './errors.js';
export { renderDoctor, renderOutput, renderTable, renderText, table, unwrapEnvelope } from './format.js';
export { renderCompletion, renderHelp } from './help.js';

export async function runCli(argv = [], env = {}, runtime = {}) {
  try {
    const parsed = parseArgv(argv);
    const command = normalizeCommand(parsed.command);
    const configOptions = command === 'worker-env' ? { ...parsed.options, format: undefined } : parsed.options;
    const config = loadConfig(configOptions, env);
    return await executeCommand(parsed, config, runtime);
  } catch (error) {
    const exitCode = error instanceof DdysCliError ? error.exitCode : 1;
    const code = error?.code ? `${error.code}: ` : '';
    const detail = env.DDYS_CLI_DEBUG ? `\n${error?.stack || ''}` : '';
    return {
      stdout: '',
      stderr: `${code}${error?.message || 'Unknown error'}${detail}\n`,
      exitCode
    };
  }
}

export async function main(argv = process.argv.slice(2), env = process.env, runtime = {}) {
  const result = await runCli(argv, env, runtime);
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
  return result;
}

export default runCli;
