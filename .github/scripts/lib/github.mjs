// Acesso à API do GitHub para os cartões do perfil.
// Tudo com timeout explícito e retry só em leitura (idempotente).

const API = 'https://api.github.com';
const GRAPHQL = 'https://api.github.com/graphql';
const TIMEOUT_MS = 15_000;
const ATTEMPTS = 3;

function token() {
  const t = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!t) throw new Error('GH_TOKEN/GITHUB_TOKEN ausente no ambiente.');
  return t;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(url, init = {}) {
  let lastError;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          'User-Agent': 'agnesmillie-profile-cards',
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(init.headers || {}),
        },
      });
      // 403/429 em busca é limite de taxa: vale esperar. 5xx é transitório.
      if (res.status === 403 || res.status === 429 || res.status >= 500) {
        throw new Error(`HTTP ${res.status} em ${url}`);
      }
      if (!res.ok) {
        const body = (await res.text()).slice(0, 300);
        const err = new Error(`HTTP ${res.status} em ${url}: ${body}`);
        err.status = res.status;
        throw err; // 4xx (exceto os acima) não melhora com retry
      }
      return res;
    } catch (error) {
      lastError = error;
      const retryable = !error.status || error.status === 403 || error.status === 429 || error.status >= 500;
      if (!retryable || attempt === ATTEMPTS) break;
      await sleep(2 ** attempt * 1000 + Math.floor(Math.random() * 500)); // backoff + jitter
    }
  }
  throw lastError;
}

export async function rest(path) {
  const res = await request(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  return res.json();
}

export async function graphql(query, variables) {
  const res = await request(GRAPHQL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await res.json();
  if (payload.errors?.length) {
    throw new Error(`GraphQL: ${payload.errors.map((e) => e.message).join('; ')}`);
  }
  return payload.data;
}

/** Todos os repositórios públicos do usuário (paginado). */
export async function allPublicRepos(login) {
  const repos = [];
  for (let page = 1; page <= 10; page += 1) {
    const chunk = await rest(`/users/${encodeURIComponent(login)}/repos?per_page=100&type=owner&sort=pushed&page=${page}`);
    repos.push(...chunk);
    if (chunk.length < 100) break;
  }
  return repos;
}

/** total_count de uma busca; devolve null se a busca não estiver disponível. */
export async function searchCount(path) {
  try {
    const data = await rest(path);
    return typeof data.total_count === 'number' ? data.total_count : null;
  } catch (error) {
    console.warn(`[aviso] busca indisponível (${path}): ${error.message}`);
    return null;
  }
}

const CALENDAR_QUERY = `
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

/**
 * Calendário de contribuições dos últimos 365 dias.
 * Fonte primária: GraphQL. Reserva: a página pública de contribuições, usada
 * quando o token do Actions não tem acesso ao contributionsCollection.
 */
export async function contributionCalendar(login) {
  const to = new Date();
  const from = new Date(to.getTime() - 364 * 24 * 60 * 60 * 1000);
  try {
    const data = await graphql(CALENDAR_QUERY, {
      login,
      from: from.toISOString(),
      to: to.toISOString(),
    });
    const calendar = data?.user?.contributionsCollection?.contributionCalendar;
    if (!calendar) throw new Error('resposta sem contributionCalendar');
    const days = calendar.weeks.flatMap((w) => w.contributionDays).map((d) => ({ date: d.date, count: d.contributionCount }));
    if (!days.length) throw new Error('calendário vazio');
    return { days, source: 'graphql' };
  } catch (error) {
    console.warn(`[aviso] GraphQL indisponível para o calendário: ${error.message}`);
    return scrapeCalendar(login, from, to);
  }
}

async function scrapeCalendar(login, from, to) {
  const day = (d) => d.toISOString().slice(0, 10);
  const url = `https://github.com/users/${encodeURIComponent(login)}/contributions?from=${day(from)}&to=${day(to)}`;
  const res = await request(url, { headers: { Accept: 'text/html' } });
  return { days: parseContributionsHtml(await res.text()), source: 'html' };
}

/** Lê o calendário da página pública de contribuições. Exportado para teste. */
export function parseContributionsHtml(html) {
  const tooltips = new Map();
  for (const m of html.matchAll(/<tool-tip[^>]*for="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const text = m[2].trim();
    // "4 contributions on January 2nd." → 4 (só o primeiro número; o resto é data)
    const first = text.match(/\d+/);
    tooltips.set(m[1], /^no contributions/i.test(text) ? 0 : Number.parseInt(first?.[0] ?? '', 10));
  }

  const days = [];
  for (const m of html.matchAll(/<td[^>]*\bdata-date="(\d{4}-\d{2}-\d{2})"[^>]*>/g)) {
    const tag = m[0];
    const id = tag.match(/\bid="([^"]+)"/)?.[1];
    const level = Number.parseInt(tag.match(/\bdata-level="(\d+)"/)?.[1] ?? '', 10);
    const fromTooltip = id ? tooltips.get(id) : undefined;
    const count = Number.isFinite(fromTooltip) ? fromTooltip : null;
    if (count === null && !Number.isFinite(level)) continue;
    days.push({ date: m[1], count: count ?? 0, estimated: count === null });
  }

  if (!days.length) throw new Error('não foi possível ler o calendário público de contribuições');
  // Sem a contagem exata o gráfico viraria ficção: só aceitamos ruído residual.
  const estimated = days.filter((d) => d.estimated).length;
  if (estimated > days.length * 0.1) {
    throw new Error(`calendário público sem contagens (${estimated}/${days.length} dias sem tooltip)`);
  }
  return days;
}
