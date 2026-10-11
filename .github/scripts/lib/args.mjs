// Linha de comando comum aos geradores de cartão.

/**
 * `<login> [saída] [--placeholder] [--fixture <json>]`.
 * Devolve { login, out, placeholder, fixture }.
 */
export function parseArgs(argv, defaultOut) {
  const fixtureAt = argv.indexOf('--fixture');
  const fixture = fixtureAt === -1 ? null : (argv[fixtureAt + 1] ?? null);
  if (fixtureAt !== -1 && !fixture) throw new Error('--fixture exige o caminho de um arquivo JSON');

  const positional = argv.filter((arg, i) => {
    if (arg === '--placeholder' || arg === '--fixture') return false;
    if (fixtureAt !== -1 && i === fixtureAt + 1) return false; // o valor de --fixture
    return true;
  });

  const [login, out = defaultOut] = positional;
  if (!login) throw new Error(`uso: <login> [saída] [--placeholder] [--fixture <json>]`);

  return { login, out, placeholder: argv.includes('--placeholder'), fixture };
}
