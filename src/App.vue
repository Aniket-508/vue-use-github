<template>Hi</template>

<script setup lang="ts">
import { useGitHub } from "./composables/use-github";

const { getRepositories } = useGitHub({
  username: process.env.GITHUB_USERNAME as string,
  personalAccessToken: process.env.GITHUB_PERSONAL_ACCESS_TOKEN as string,
});

const topRepos = getRepositories().top(5)();

console.log({ topRepos });
</script>
