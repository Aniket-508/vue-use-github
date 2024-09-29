# useGitHub Composable

`useGitHub` is a custom Vue composable that provides an easy way to fetch and manage GitHub user data and repositories in your Vue applications.

## Features

- Fetch GitHub user information
- Retrieve user's repositories
- Get user's pinned repositories
- Filter repositories by programming language
- Get top N repositories

## Installation

```bash
npm install vue-use-github axios
```

## API

### Hook Parameters

- `username`: GitHub username
- `personalAccessToken`: GitHub personal access token (required for fetching pinned repositories)

### Return Values

- `userInfo`: Object containing user information
- `followers`: Array containing user's followers information
- `followings`: Array containing user's followings information
- `profileReadme`: String in markdown format containing user profile's readme
- `metadata`: Object containing API response metadata
- `getRepositories`: Function to access and filter repositories

#### `getRepositories()`

Returns an object with the following methods:

- `all()`: Returns all repositories
- `withLanguage(languages)`: Filters repositories by programming language(s)
- `top(n)`: Returns top N repositories
- `pinned()`: Returns pinned repositories

## Note

It requires the `axios` library to be installed so make sure to install both `vue-use-github` and `axios` before using the composable.

## License

[MIT License](https://opensource.org/licenses/MIT)
