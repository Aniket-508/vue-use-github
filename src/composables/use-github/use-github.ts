import { computed, onMounted, Ref, ref } from "vue";
import axios from "axios";
import type {
  IGitHubUserInfo,
  IUseGitHubHookMetadata,
  IUseGitHubHookProps,
  IUseGitHubHookReturn,
  IGitHubRepo,
  ProgrammingLanguage,
  LanguageDistribution,
  IGetRepositories,
  RepositoryGetter,
} from "./interfaces/global";

const GITHUB_REST_URL: string = "https://api.github.com";
const GITHUB_GRAPHQL_URL: string = "https://api.github.com/graphql";
const GITHUB_RAW_CONTENT_URL: string = "https://raw.githubusercontent.com";

export const useGitHub = ({
  username,
  personalAccessToken,
}: IUseGitHubHookProps): IUseGitHubHookReturn => {
  const metadata = ref<IUseGitHubHookMetadata | null>(null);
  const userInfo = ref<IGitHubUserInfo | null>(null);
  const repositories = ref<IGitHubRepo[]>([]);
  const pinnedRepositories = ref<IGitHubRepo[]>([]);
  const followers = ref<IGitHubUserInfo[]>([]);
  const followings = ref<IGitHubUserInfo[]>([]);
  const profileReadme = ref<string | null>(null);

  const axiosHeaders = computed(() => ({
    Accept: "application/vnd.github+json",
    Authorization: "Bearer " + personalAccessToken,
  }));

  const fetchGitHubData = async (): Promise<IUseGitHubHookMetadata | null> => {
    if (!username) return null;
    try {
      const response = await axios.get(`${GITHUB_REST_URL}/users/${username}`, {
        headers: axiosHeaders.value,
      });
      const { data, config, headers, request, status } = response;
      metadata.value = <IUseGitHubHookMetadata>{
        GITHUB_API_DATA: data,
        GITHUB_REQUEST_CONFIG: config,
        GITHUB_API_HEADERS: headers,
        GITHUB_API_REQUEST: request,
        GITHUB_API_STATUS_CODE: status,
      };
      return metadata.value;
    } catch (error) {
      console.error("Error while fetching GitHub user info:", error);
      return null;
    }
  };

  const updateUserInfo = (meta: IUseGitHubHookMetadata) => {
    if (meta && meta.GITHUB_API_STATUS_CODE === 200) {
      userInfo.value = meta.GITHUB_API_DATA as IGitHubUserInfo;
    } else {
      console.error(
        "Error while fetching GitHub user info, Please check network tab for more info"
      );
      console.error(
        "Getting status code",
        meta ? meta.GITHUB_API_STATUS_CODE : "Unknown"
      );
      userInfo.value = null;
    }
  };

  const fetchRepositories = async () => {
    if (!username) return;
    try {
      const response = await axios.get(
        `${GITHUB_REST_URL}/users/${username}/repos?per_page=100&sort=updated`,
        { headers: axiosHeaders.value }
      );
      repositories.value = response.data.map((repo: any) => ({
        ...repo,
        language: repo.language
          ? (repo.language.toLowerCase() as ProgrammingLanguage)
          : null,
      }));
    } catch (error) {
      console.error("Error while fetching repositories:", error);
    }
  };

  const fetchPinnedRepositories = async () => {
    if (!username || !personalAccessToken) return;
    const query = `
      query {
        user(login: "${username}") {
          pinnedItems(first: 6, types: REPOSITORY) {
            nodes {
              ... on Repository {
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
    try {
      const response = await axios.post(
        GITHUB_GRAPHQL_URL,
        { query },
        { headers: axiosHeaders.value }
      );

      pinnedRepositories.value = response.data.data.user.pinnedItems.nodes.map(
        (repo: any) => ({
          id: repo.id,
          name: repo.name,
          description: repo.description,
          html_url: repo.url,
          stargazers_count: repo.stargazerCount,
          forks_count: repo.forkCount,
          language: repo.primaryLanguage
            ? (repo.primaryLanguage.name.toLowerCase() as ProgrammingLanguage)
            : null,
        })
      );
    } catch (error) {
      console.error("Error while fetching pinned repositories:", error);
    }
  };

  const fetchFollowers = async () => {
    if (!username) return;
    try {
      const response = await axios.get(
        `${GITHUB_REST_URL}/users/${username}/followers?per_page=100`,
        { headers: axiosHeaders.value }
      );
      const followerPromises = response.data.map((follower: { url: string }) =>
        axios.get(follower.url, { headers: axiosHeaders.value })
      );
      const followerResponses = await Promise.all(followerPromises);
      followers.value = followerResponses.map((response) => response.data);
    } catch (error) {
      console.error("Error while fetching followers:", error);
    }
  };

  const fetchFollowings = async () => {
    if (!username) return;
    try {
      const response = await axios.get(
        `${GITHUB_REST_URL}/users/${username}/following?per_page=100`,
        { headers: axiosHeaders.value }
      );
      const followingPromises = response.data.map(
        (following: { url: string }) =>
          axios.get(following.url, { headers: axiosHeaders.value })
      );
      const followingResponses = await Promise.all(followingPromises);
      followings.value = followingResponses.map((response) => response.data);
    } catch (error) {
      console.error("Error while fetching followings:", error);
    }
  };

  const fetchProfileReadme = async () => {
    if (!username) return;
    try {
      const response = await axios.get(
        `${GITHUB_RAW_CONTENT_URL}/${username}/${username}/main/README.md`
      );
      profileReadme.value = response.data;
    } catch (error) {
      console.error("Error while fetching profile README:", error);
      profileReadme.value = null;
    }
  };

  const calculateLanguageDistribution = (
    repos: Ref<IGitHubRepo[]>
  ): LanguageDistribution[] => {
    const languageCounts: { [key in ProgrammingLanguage]?: number } = {};
    let totalCount = 0;

    repos.value.forEach((repo) => {
      if (repo.language) {
        languageCounts[repo.language] =
          (languageCounts[repo.language] || 0) + 1;
        totalCount++;
      }
    });

    return Object.entries(languageCounts).map(([language, count]) => ({
      language: language as ProgrammingLanguage,
      percentage: count! / totalCount,
    }));
  };

  const getRepositories = (): IGetRepositories => {
    const createRepositoryGetter = (
      reposRef: () => Ref<IGitHubRepo[]>
    ): RepositoryGetter => {
      const getter = reposRef as any;
      getter.languageDistribution = () =>
        calculateLanguageDistribution(reposRef());
      return getter;
    };

    return {
      all: createRepositoryGetter(() => repositories),
      withLanguage: (languages: ProgrammingLanguage[]) =>
        createRepositoryGetter(() =>
          computed(() =>
            repositories.value.filter(
              (repo) => repo.language && languages.includes(repo.language)
            )
          )
        ),
      top: (n: number) =>
        createRepositoryGetter(() =>
          computed(() => repositories.value.slice(0, n))
        ),
      pinned: createRepositoryGetter(() => pinnedRepositories),
    };
  };

  onMounted(async () => {
    const meta = await fetchGitHubData();
    if (meta) {
      updateUserInfo(meta);
    }
    fetchRepositories();
    fetchPinnedRepositories();
    fetchFollowers();
    fetchFollowings();
    fetchProfileReadme();
  });

  return {
    metadata,
    userInfo,
    followers,
    followings,
    profileReadme,
    getRepositories,
  };
};
