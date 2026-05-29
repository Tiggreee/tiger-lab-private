export interface ParsedCliArgs {
  readonly positional: string[];
  readonly options: Record<string, string | boolean>;
}

export function parseCliArgs(argv: string[]): ParsedCliArgs {
  const positional: string[] = [];
  const options: Record<string, string | boolean> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }

    const rawOption = token.slice(2);
    const equalsIndex = rawOption.indexOf('=');

    if (equalsIndex >= 0) {
      const key = rawOption.slice(0, equalsIndex);
      const value = rawOption.slice(equalsIndex + 1);
      options[key] = value;
      continue;
    }

    const nextToken = argv[index + 1];
    if (nextToken && !nextToken.startsWith('--')) {
      options[rawOption] = nextToken;
      index += 1;
      continue;
    }

    options[rawOption] = true;
  }

  return {
    positional,
    options
  };
}

export function getStringOption(
  parsed: ParsedCliArgs,
  key: string,
  fallback?: string
): string | undefined {
  const value = parsed.options[key];
  if (typeof value === 'string') {
    return value;
  }

  return fallback;
}

export function getBooleanOption(parsed: ParsedCliArgs, key: string): boolean {
  const value = parsed.options[key];
  return value === true || value === 'true';
}
