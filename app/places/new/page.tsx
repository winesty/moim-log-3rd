import Script from "next/script";
import PlaceForm from "@/components/PlaceForm";

export default function NewPlacePage() {
  return (
    <div>
      <h1 className="text-xl font-medium mb-4">새 장소 등록</h1>
      <Script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="afterInteractive" />
      <PlaceForm />
    </div>
  );
}
