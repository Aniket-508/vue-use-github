# vue-use-github

Vue composable for fetching GitHub user data and repositories. Zero runtime dependencies.

## Installation

```bash
npm install vue-use-github
```

Requires Vue 3.3+.

## Usage

```ts
import { useGitHub } from "vue-use-github";

const {
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
} = useGitHub({
  username: "vuejs",
  personalAccessToken: "ghp_...", // optional, needed for pinned repos
});
```

### Reactive username

`username` and `personalAccessToken` accept plain values, refs, or getters. Data refetches automatically when they change.

```ts
const username = ref("vuejs");
const { userInfo } = useGitHub({ username });

// changing username triggers a refetch
username.value = "vitejs";
```

### Repository helpers

`getRepositories` is a stable object with cached, reactive repository groups:

```ts
const { repos: allRepos } = getRepositories.all;
const { repos: topRepos } = getRepositories.top(5);
const { repos: tsRepos } = getRepositories.withLanguage(["typescript"]);
const { repos: pinned } = getRepositories.pinned;
```

Each group also exposes a `languageDistribution` computed:

```ts
const { languageDistribution } = getRepositories.all;
// [{ language: "typescript", percentage: 0.4 }, ...]
```

## API

### Options

| Option | Type | Required | Description |
|---|---|---|---|
| `username` | `string \| Ref<string> \| () => string` | yes | GitHub username |
| `personalAccessToken` | `string \| Ref<string> \| () => string` | no | GitHub PAT (needed for pinned repos via GraphQL) |

### Return values

| Property | Type | Description |
|---|---|---|
| `userInfo` | `Ref<IGitHubUserInfo \| null>` | Full user profile |
| `repositories` | `Ref<IGitHubRepo[]>` | All public repositories (paginated, up to 1000) |
| `pinnedRepositories` | `Ref<IGitHubRepo[]>` | Pinned repositories (requires PAT) |
| `followers` | `Ref<IGitHubUserSummary[]>` | Followers list |
| `followings` | `Ref<IGitHubUserSummary[]>` | Following list |
| `profileReadme` | `Ref<string \| null>` | Profile README markdown content |
| `metadata` | `Ref<IUseGitHubHookMetadata \| null>` | Response status and rate limit info |
| `isLoading` | `Ref<boolean>` | Loading state |
| `error` | `Ref<Error \| null>` | Last error |
| `refresh` | `() => Promise<void>` | Manually refetch all data |
| `getRepositories` | `IGetRepositories` | Cached repository group helpers |

## License

[MIT](./LICENSE)
