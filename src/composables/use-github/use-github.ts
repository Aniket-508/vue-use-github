import {
  computed,
  onScopeDispose,
  ref,
  toValue,
  watch,
  type ComputedRef,
  type Ref,
} from "vue";
import type {
  IGitHubUserInfo,
  IGitHubUserSummary,
  IUseGitHubHookMetadata,
  IUseGitHubHookProps,
  IUseGitHubHookReturn,
  IGitHubRepo,
  IGetRepositories,
  RepositoryGroup,
  ProgrammingLanguage,
} from "./interfaces/global";

const GITHUB_REST_URL = "https://api.github.com";
const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
const GITHUB_RAW_CONTENT_URL = "https://raw.githubusercontent.com";

const isAbortError = (e: unknown): boolean =>
  e instanceof DOMException && e.name === "AbortError";

async function request<T>(url: string, init?: RequestInit): Promise<{ data: T; response: Response }> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as T;
  return { data, response };
}

export function useGitHub(options: IUseGitHubHookProps): IUseGitHubHookReturn {
  const metadata = ref<IUseGitHubHookMetadata | null>(null);
  const userInfo = ref<IGitHubUserInfo | null>(null);
  const repositories = ref<IGitHubRepo[]>([]);
  const pinnedRepositories = ref<IGitHubRepo[]>([]);
  const followers = ref<IGitHubUserSummary[]>([]);
  const followings = ref<IGitHubUserSummary[]>([]);
  const profileReadme = ref<string | null>(null);
  const isLoading = ref(false);
  const error = ref<Error | null>(null);

  const resolvedUsername = computed(() => toValue(options.username));
  const resolvedToken = computed(() =>
    options.personalAccessToken
      ? toValue(options.personalAccessToken)
      : undefined,
  );

  const headers = computed<Record<string, string>>(() => ({
    Accept: "application/vnd.github+json",
    ...(resolvedToken.value
      ? { Authorization: `Bearer ${resolvedToken.value}` }
      : {}),
  }));

  let abortController: AbortController | null = null;

  const resetState = () => {
    metadata.value = null;
    userInfo.value = null;
    repositories.value = [];
    pinnedRepositories.value = [];
    followers.value = [];
    followings.value = [];
    profileReadme.value = null;
  };

  const fetchUserInfo = async (signal: AbortSignal) => {
    const user = resolvedUsername.value;
    if (!user) return;

    const { data, response } = await request<IGitHubUserInfo>(
      `${GITHUB_REST_URL}/users/${user}`,
      { headers: headers.value, signal },
    );

    userInfo.value = data;
    metadata.value = {
      status: response.status,
      rateLimit: response.headers.get("x-ratelimit-limit")
        ? {
            limit: Number(response.headers.get("x-ratelimit-limit")),
            remaining: Number(response.headers.get("x-ratelimit-remaining")),
            reset: Number(response.headers.get("x-ratelimit-reset")),
          }
        : null,
    };
  };

  const fetchRepositories = async (signal: AbortSignal) => {
    const user = resolvedUsername.value;
    if (!user) return;

    const allRepos: IGitHubRepo[] = [];
    let page = 1;
    const maxPages = 10;

    while (page <= maxPages) {
      const params = new URLSearchParams({
        per_page: "100",
        sort: "updated",
        page: String(page),
      });

      const { data } = await request<Record<string, unknown>[]>(
        `${GITHUB_REST_URL}/users/${user}/repos?${params}`,
        { headers: headers.value, signal },
      );

      const pageRepos: IGitHubRepo[] = data.map((repo) => ({
        ...repo,
        language: repo.language
          ? String(repo.language).toLowerCase()
          : null,
      })) as IGitHubRepo[];

      allRepos.push(...pageRepos);
      if (pageRepos.length < 100) break;
      page++;
    }

    repositories.value = allRepos;
  };

  const fetchPinnedRepositories = async (signal: AbortSignal) => {
    const user = resolvedUsername.value;
    const token = resolvedToken.value;
    if (!user || !token) return;

    const query = `
      query($login: String!) {
        user(login: $login) {
          pinnedItems(first: 6, types: REPOSITORY) {
            nodes {
              ... on Repository {
                databaseId
                id
                name
                description
                url
                stargazerCount
                forkCount
                primaryLanguage {
                  name
                }
              }
            }
          }
        }
      }
    `;

    const { data } = await request<{
      data: { user: { pinnedItems: { nodes: Record<string, unknown>[] } } };
    }>(GITHUB_GRAPHQL_URL, {
      method: "POST",
      headers: { ...headers.value, "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { login: user } }),
      signal,
    });

    const nodes = data?.data?.user?.pinnedItems?.nodes ?? [];

    pinnedRepositories.value = nodes.map((repo) => ({
      id: typeof repo.databaseId === "number" ? repo.databaseId : 0,
      node_id: String(repo.id ?? ""),
      name: String(repo.name ?? ""),
      full_name: `${user}/${repo.name}`,
      private: false,
      owner: {
        login: user,
        id: 0,
        avatar_url: "",
        url: "",
        html_url: `https://github.com/${user}`,
      },
      html_url: String(repo.url ?? ""),
      description: repo.description != null ? String(repo.description) : null,
      fork: false,
      url: "",
      created_at: "",
      updated_at: "",
      pushed_at: "",
      homepage: null,
      size: 0,
      stargazers_count: (repo.stargazerCount as number) ?? 0,
      watchers_count: 0,
      language: repo.primaryLanguage
        ? String(
            (repo.primaryLanguage as { name: string }).name,
          ).toLowerCase()
        : null,
      forks_count: (repo.forkCount as number) ?? 0,
      open_issues_count: 0,
      license: null,
      topics: [],
      visibility: "public",
      default_branch: "main",
    }));
  };

  const fetchFollowers = async (signal: AbortSignal) => {
    const user = resolvedUsername.value;
    if (!user) return;

    const { data } = await request<Record<string, unknown>[]>(
      `${GITHUB_REST_URL}/users/${user}/followers?per_page=100`,
      { headers: headers.value, signal },
    );

    followers.value = data.map((u) => ({
      login: String(u.login),
      id: Number(u.id),
      node_id: String(u.node_id),
      avatar_url: String(u.avatar_url),
      html_url: String(u.html_url),
      type: String(u.type),
    }));
  };

  const fetchFollowings = async (signal: AbortSignal) => {
    const user = resolvedUsername.value;
    if (!user) return;

    const { data } = await request<Record<string, unknown>[]>(
      `${GITHUB_REST_URL}/users/${user}/following?per_page=100`,
      { headers: headers.value, signal },
    );

    followings.value = data.map((u) => ({
      login: String(u.login),
      id: Number(u.id),
      node_id: String(u.node_id),
      avatar_url: String(u.avatar_url),
      html_url: String(u.html_url),
      type: String(u.type),
    }));
  };

  const fetchProfileReadme = async (signal: AbortSignal) => {
    const user = resolvedUsername.value;
    if (!user) return;

    const branches = ["main", "master"];
    for (const branch of branches) {
      try {
        const response = await fetch(
          `${GITHUB_RAW_CONTENT_URL}/${user}/${user}/${branch}/README.md`,
          { signal },
        );
        if (!response.ok) continue;
        profileReadme.value = await response.text();
        return;
      } catch {
        // try next branch
      }
    }
    profileReadme.value = null;
  };

  const createRepositoryGroup = (
    source: Ref<IGitHubRepo[]> | ComputedRef<IGitHubRepo[]>,
  ): RepositoryGroup => ({
    repos: computed(() => source.value),
    languageDistribution: computed(() => {
      const counts: Record<string, number> = {};
      let total = 0;

      for (const repo of source.value) {
        if (repo.language) {
          counts[repo.language] = (counts[repo.language] ?? 0) + 1;
          total++;
        }
      }

      if (total === 0) return [];

      return Object.entries(counts).map(([language, count]) => ({
        language: language as ProgrammingLanguage,
        percentage: count / total,
      }));
    }),
  });

  const withLanguageCache = new Map<string, RepositoryGroup>();
  const topCache = new Map<number, RepositoryGroup>();

  const getRepositories: IGetRepositories = {
    all: createRepositoryGroup(repositories),

    withLanguage: (languages: ProgrammingLanguage[]) => {
      const key = [...languages].sort().join("\0");
      let cached = withLanguageCache.get(key);
      if (!cached) {
        cached = createRepositoryGroup(
          computed(() =>
            repositories.value.filter(
              (repo) =>
                repo.language != null && languages.includes(repo.language),
            ),
          ),
        );
        withLanguageCache.set(key, cached);
      }
      return cached;
    },

    top: (n: number) => {
      let cached = topCache.get(n);
      if (!cached) {
        cached = createRepositoryGroup(
          computed(() => repositories.value.slice(0, n)),
        );
        topCache.set(n, cached);
      }
      return cached;
    },

    pinned: createRepositoryGroup(pinnedRepositories),
  };

  const refresh = async () => {
    const user = resolvedUsername.value;
    if (!user) {
      resetState();
      return;
    }

    abortController?.abort();
    const controller = new AbortController();
    abortController = controller;

    resetState();
    isLoading.value = true;
    error.value = null;

    try {
      await fetchUserInfo(controller.signal);
      if (controller.signal.aborted) return;

      const results = await Promise.allSettled([
        fetchRepositories(controller.signal),
        fetchPinnedRepositories(controller.signal),
        fetchFollowers(controller.signal),
        fetchFollowings(controller.signal),
        fetchProfileReadme(controller.signal),
      ]);

      if (controller.signal.aborted) return;

      const errors = results
        .filter(
          (r): r is PromiseRejectedResult => r.status === "rejected",
        )
        .map((r) => r.reason)
        .filter((e) => !isAbortError(e));

      if (errors.length > 0) {
        error.value =
          errors[0] instanceof Error
            ? errors[0]
            : new Error(String(errors[0]));
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      error.value =
        err instanceof Error ? err : new Error(String(err));
    } finally {
      if (!controller.signal.aborted) {
        isLoading.value = false;
      }
    }
  };

  watch(
    [resolvedUsername, resolvedToken],
    () => {
      if (resolvedUsername.value) {
        refresh();
      } else {
        abortController?.abort();
        resetState();
        isLoading.value = false;
        error.value = null;
      }
    },
    { immediate: true },
  );

  onScopeDispose(() => {
    abortController?.abort();
  });

  return {
    metadata,
    userInfo,
    repositories,
    pinnedRepositories,
    followers,
    followings,
    profileReadme,
    isLoading,
    error,
    refresh,
    getRepositories,
  };
}
