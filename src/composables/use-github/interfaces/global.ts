import type { ComputedRef, MaybeRefOrGetter, Ref } from "vue";

export type ProgrammingLanguage =
  | "javascript"
  | "typescript"
  | "python"
  | "java"
  | "c"
  | "c++"
  | "c#"
  | "ruby"
  | "go"
  | "rust"
  | "swift"
  | "kotlin"
  | "php"
  | "html"
  | "css"
  | "shell"
  | "dart"
  | (string & {}); // eslint-disable-line @typescript-eslint/ban-types

export interface IUseGitHubHookProps {
  username: MaybeRefOrGetter<string>;
  personalAccessToken?: MaybeRefOrGetter<string | undefined>;
}

export interface LanguageDistribution {
  language: ProgrammingLanguage;
  percentage: number;
}

export interface RepositoryGroup {
  repos: ComputedRef<IGitHubRepo[]>;
  languageDistribution: ComputedRef<LanguageDistribution[]>;
}

export interface IGetRepositories {
  all: RepositoryGroup;
  withLanguage: (languages: ProgrammingLanguage[]) => RepositoryGroup;
  top: (n: number) => RepositoryGroup;
  pinned: RepositoryGroup;
}

export interface IUseGitHubHookReturn {
  metadata: Ref<IUseGitHubHookMetadata | null>;
  userInfo: Ref<IGitHubUserInfo | null>;
  repositories: Ref<IGitHubRepo[]>;
  pinnedRepositories: Ref<IGitHubRepo[]>;
  followers: Ref<IGitHubUserSummary[]>;
  followings: Ref<IGitHubUserSummary[]>;
  profileReadme: Ref<string | null>;
  isLoading: Ref<boolean>;
  error: Ref<Error | null>;
  refresh: () => Promise<void>;
  getRepositories: IGetRepositories;
}

export interface IUseGitHubHookMetadata {
  status: number;
  rateLimit: {
    limit: number;
    remaining: number;
    reset: number;
  } | null;
}

export interface IGitHubUserSummary {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  html_url: string;
  type: string;
}

export interface IGitHubUserInfo extends IGitHubUserSummary {
  gravatar_id: string;
  url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  site_admin: boolean;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  hireable: boolean | null;
  bio: string | null;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export interface IGitHubRepo {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
    url: string;
    html_url: string;
  };
  html_url: string;
  description: string | null;
  fork: boolean;
  url: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  homepage: string | null;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  language: ProgrammingLanguage | null;
  forks_count: number;
  open_issues_count: number;
  license: {
    key: string;
    name: string;
    url: string;
  } | null;
  topics: string[];
  visibility: string;
  default_branch: string;
}
