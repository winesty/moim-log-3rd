import { redirect } from "next/navigation";

// 예전 "모임 검색" 페이지 주소. 폴더를 지우는 대신 새 "모임" 페이지로 안내만 하도록 남겨둔다.
export default function OldSearchPage() {
  redirect("/meetings");
}
