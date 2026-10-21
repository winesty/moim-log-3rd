import { VersionInfo } from "@/lib/versionInfo";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function VersionInfoPanel({ info }: { info: VersionInfo }) {
  return (
    <section className="bg-white border border-[#ddd8ca] rounded-2xl p-5">
      <h2 className="text-sm font-medium mb-2">버전 정보</h2>

      {info.shortSha ? (
        <div className="text-sm text-[#2b2a26] flex flex-col gap-1">
          <p>
            마지막 배포: {formatDate(info.commitDate) ?? "시각 확인 불가"}
            {info.commitMessage ? ` · "${info.commitMessage}"` : ""}
          </p>
          <p className="text-xs text-[#a09c8c]">
            커밋: <code>{info.shortSha}</code>
          </p>

          {info.isLatest === true && <p className="text-sm text-[#3d7a4a] mt-1">✅ 최신 버전입니다.</p>}

          {info.isLatest === false && (
            <p className="text-sm text-[#a34a3a] mt-1">
              ⬆️ 최신 버전이 있습니다. (최신 커밋: <code>{info.latestShortSha}</code>
              {info.latestMessage ? ` · "${info.latestMessage}"` : ""})
              {info.repoUrl && (
                <>
                  {" "}
                  <a href={`${info.repoUrl}/commits`} target="_blank" rel="noreferrer" className="underline">
                    GitHub에서 보기
                  </a>
                </>
              )}
            </p>
          )}

          {info.isLatest === null && <p className="text-xs text-[#a09c8c] mt-1">최신 여부는 지금 확인할 수 없어요.</p>}
        </div>
      ) : (
        <p className="text-sm text-[#a09c8c]">로컬 환경이라 버전 정보가 없어요.</p>
      )}
    </section>
  );
}
