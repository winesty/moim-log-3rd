// 설정 화면의 "버전 정보"에서 쓴다. Vercel이 배포할 때 자동으로 넣어주는 값과,
// 깃허브의 지금 최신 커밋을 비교해서 "최신인지"를 판단한다.

export interface VersionInfo {
  shortSha: string | null;
  commitMessage: string | null;
  commitDate: string | null; // ISO, 지금 배포에 쓰인 커밋이 만들어진 시각
  repoUrl: string | null;
  /** true=최신, false=뒤처짐, null=확인할 수 없음(로컬 환경이거나 깃허브 조회 실패) */
  isLatest: boolean | null;
  latestShortSha: string | null;
  latestMessage: string | null;
}

async function fetchCommit(owner: string, repo: string, ref: string) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${ref}`, {
    headers: { accept: "application/vnd.github+json", "user-agent": "moim-log-app" },
    // 깃허브 API는 로그인 없이 쓰면 시간당 호출 횟수 제한이 있어서(60회/시간),
    // 설정 화면을 열 때마다 매번 부르지 않고 5분 동안은 같은 결과를 재사용한다.
    next: { revalidate: 300 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    sha: data.sha as string,
    message: (data.commit?.message as string)?.split("\n")[0] ?? null,
    date: (data.commit?.committer?.date ?? data.commit?.author?.date ?? null) as string | null,
  };
}

export async function getVersionInfo(): Promise<VersionInfo> {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? null;
  const owner = process.env.VERCEL_GIT_REPO_OWNER;
  const repo = process.env.VERCEL_GIT_REPO_SLUG;
  const repoUrl = owner && repo ? `https://github.com/${owner}/${repo}` : null;

  const base: VersionInfo = {
    shortSha: sha ? sha.slice(0, 7) : null,
    commitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE?.split("\n")[0] ?? null,
    commitDate: null,
    repoUrl,
    isLatest: null,
    latestShortSha: null,
    latestMessage: null,
  };

  if (!sha || !owner || !repo) return base; // 로컬 환경 등 — 비교할 수 없으니 그냥 모른다고 둔다

  try {
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { accept: "application/vnd.github+json", "user-agent": "moim-log-app" },
      next: { revalidate: 300 },
    });
    if (!repoRes.ok) return base;
    const defaultBranch = (await repoRes.json()).default_branch ?? "main";

    const [own, latest] = await Promise.all([fetchCommit(owner, repo, sha), fetchCommit(owner, repo, defaultBranch)]);
    if (!latest) return base;

    return {
      ...base,
      commitDate: own?.date ?? null,
      latestShortSha: latest.sha.slice(0, 7),
      latestMessage: latest.message,
      isLatest: latest.sha === sha,
    };
  } catch {
    return base; // 네트워크 오류 등 — 조용히 "모른다"로 둔다
  }
}
