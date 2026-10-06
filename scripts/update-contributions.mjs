// Usage: node update-contributions.mjs <README path>
// Fetches merged MRs (GitLab) and merged PRs (GitHub) made to projects the user
// does not own, and rewrites the block between the CONTRIBUTIONS markers.
import { readFileSync, writeFileSync } from "node:fs";

const GITLAB_USER = process.env.GITLAB_USER ?? "yoobinkim541";
const GITHUB_USER = process.env.GITHUB_USER ?? "yoobinkim541";
const START = "<!-- CONTRIBUTIONS:START -->";
const END = "<!-- CONTRIBUTIONS:END -->";

const getJson = async (url, headers = {}) => {
  const res = await fetch(url, { headers: { "User-Agent": "contrib-readme", ...headers } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
};

async function gitlab() {
  const mrs = await getJson(
    `https://gitlab.com/api/v4/merge_requests?author_username=${GITLAB_USER}&scope=all&state=merged&per_page=100`,
  );
  const projects = new Map();
  for (const mr of mrs) {
    if (!projects.has(mr.project_id))
      projects.set(mr.project_id, await getJson(`https://gitlab.com/api/v4/projects/${mr.project_id}`));
  }
  return mrs
    .map((mr) => ({ mr, p: projects.get(mr.project_id) }))
    .filter(({ p }) => p.namespace.full_path.split("/")[0].toLowerCase() !== GITLAB_USER.toLowerCase())
    .map(({ mr, p }) => ({
      host: "GitLab", repo: p.path_with_namespace, url: p.web_url, stars: p.star_count,
      title: mr.title, link: mr.web_url, ref: `!${mr.iid}`, date: mr.merged_at,
    }));
}

async function github() {
  const headers = process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
  const q = encodeURIComponent(`author:${GITHUB_USER} type:pr is:merged is:public -user:${GITHUB_USER}`);
  const { items } = await getJson(`https://api.github.com/search/issues?q=${q}&per_page=100`, headers);
  const repos = new Map();
  const out = [];
  for (const it of items) {
    const name = it.repository_url.replace("https://api.github.com/repos/", "");
    if (!repos.has(name)) repos.set(name, await getJson(it.repository_url, headers));
    out.push({
      host: "GitHub", repo: name, url: repos.get(name).html_url, stars: repos.get(name).stargazers_count,
      title: it.title, link: it.html_url, ref: `#${it.number}`, date: it.pull_request?.merged_at ?? it.closed_at,
    });
  }
  return out;
}

const items = [...(await gitlab()), ...(await github())].sort((a, b) => b.date.localeCompare(a.date));
const byRepo = new Map();
for (const i of items) {
  const key = `${i.host}:${i.repo}`;
  byRepo.set(key, [...(byRepo.get(key) ?? []), i]);
}

const star = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);
const badge = (host) =>
  host === "GitLab"
    ? "![GitLab](https://img.shields.io/badge/GitLab-FC6D26?style=flat-square&logo=gitlab&logoColor=white)"
    : "![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat-square&logo=github&logoColor=white)";

let md = `${START}\n`;
if (!items.length) {
  md += "_아직 병합된 기여가 없습니다. 곧 채워질 예정입니다!_\n";
} else {
  md += `**${byRepo.size}** 개 오픈소스 프로젝트 · **${items.length}** 건 병합\n\n`;
  md += "| 프로젝트 | ⭐ | 병합된 기여 |\n|---|---:|---|\n";
  for (const list of byRepo.values()) {
    const f = list[0];
    const prs = list
      .map((i) => `[${i.title.replace(/\|/g, "\\|")}](${i.link}) <sub>${i.ref} · ${i.date.slice(0, 10)}</sub>`)
      .join("<br>");
    md += `| ${badge(f.host)} [**${f.repo}**](${f.url}) | ${star(f.stars)} | ${prs} |\n`;
  }
}
md += `\n<sub>마지막 갱신: ${new Date().toISOString().slice(0, 10)} (자동 갱신)</sub>\n${END}`;

const path = process.argv[2];
const src = readFileSync(path, "utf8");
const re = new RegExp(`${START}[\\s\\S]*?${END}`);
if (!re.test(src)) throw new Error(`markers not found in ${path}`);
writeFileSync(path, src.replace(re, () => md));
console.log(`updated ${path}: ${items.length} contributions`);
