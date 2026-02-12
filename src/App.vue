<template>
  <div class="demo">
    <h1>vue-use-github Demo</h1>
    <div v-if="isLoading">Loading...</div>
    <div v-else-if="error" class="error">{{ error.message }}</div>
    <template v-else-if="userInfo">
      <div class="user-card">
        <img :src="userInfo.avatar_url" :alt="userInfo.login" class="avatar" />
        <h2>{{ userInfo.name || userInfo.login }}</h2>
        <p>{{ userInfo.bio }}</p>
      </div>
      <div class="repos">
        <h3>Top 5 Repositories</h3>
        <ul>
          <li v-for="repo in topRepos" :key="repo.id">
            <a :href="repo.html_url" target="_blank" rel="noopener">
              {{ repo.name }} ({{ repo.stargazers_count }} stars)
            </a>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useGitHub } from "./composables/use-github";

const {
  userInfo,
  isLoading,
  error,
  getRepositories,
} = useGitHub({
  username: import.meta.env.VITE_GITHUB_USERNAME ?? "vuejs",
  personalAccessToken: import.meta.env.VITE_GITHUB_TOKEN,
});

const { repos: topRepos } = getRepositories.top(5);
</script>

<style scoped>
.demo {
  font-family: system-ui, sans-serif;
  padding: 2rem;
  max-width: 600px;
  margin: 0 auto;
}
.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
}
.user-card {
  margin-bottom: 2rem;
}
.error {
  color: #c00;
}
.repos ul {
  list-style: none;
  padding: 0;
}
.repos li {
  margin: 0.5rem 0;
}
</style>
