import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MODEL = "gemini-flash-latest"; // 항상 구글의 현재 권장 Flash 모델을 가리키는 별칭이라 특정 버전이 없어져도 안전하다

const PROMPT = `아래 입력은 한국 식당·카페의 영수증 사진이거나, 카드 승인 문자·푸시 알림을 복사한 글입니다. 둘 중 무엇이든 읽을 수 있는 정보만 사용해서 아래 JSON 형식으로만 응답하세요. 설명이나 다른 텍스트는 절대 포함하지 마세요.

{
  "placeName": "상호명/가맹점명 (모르면 null)",
  "date": "YYYY-MM-DD 형식의 결제 날짜 (모르면 null. 연도가 없으면 올해로 가정)",
  "totalAmount": 전체 결제 금액 숫자 (쉼표·원 없이, 모르면 null),
  "items": [
    { "name": "메뉴 이름", "price": 단가 숫자 또는 null, "quantity": 수량 숫자 (모르면 1) }
  ]
}

카드 승인 문자에는 보통 메뉴 항목이 없으니, 그럴 땐 items를 빈 배열로 두고 상호명·금액·날짜만 채우세요.
영수증도 문자도 아니거나 아무 정보도 읽을 수 없으면 placeName, date, totalAmount를 모두 null로, items는 빈 배열로 응답하세요.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    placeName: { type: "STRING", nullable: true },
    date: { type: "STRING", nullable: true },
    totalAmount: { type: "NUMBER", nullable: true },
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          price: { type: "NUMBER", nullable: true },
          quantity: { type: "NUMBER" },
        },
        required: ["name", "quantity"],
      },
    },
  },
  required: ["items"],
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY가 설정되어 있지 않습니다." }, { status: 500 });
  }

  const { imageBase64, mimeType, text } = await req.json().catch(() => ({}));
  const trimmedText = typeof text === "string" ? text.trim() : "";
  if (!imageBase64 && !trimmedText) {
    return NextResponse.json({ error: "이미지나 텍스트가 없습니다." }, { status: 400 });
  }

  // 사진이면 이미지와 함께, 붙여넣은 글이면 프롬프트 뒤에 그 글을 그대로 덧붙여서 보낸다.
  const parts = imageBase64
    ? [{ text: PROMPT }, { inlineData: { mimeType: mimeType || "image/jpeg", data: imageBase64 } }]
    : [{ text: `${PROMPT}

--- 입력 ---
${trimmedText}` }];

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini API error:", res.status, errText);
      const status = res.status === 429 ? 429 : 502;
      const message =
        res.status === 429 ? "오늘 무료 사용량을 다 썼어요. 잠시 후 다시 시도해주세요." : `영수증을 분석하지 못했어요. (오류 코드 ${res.status})`;
      return NextResponse.json({ error: message }, { status });
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json({ error: "영수증에서 내용을 읽지 못했어요." }, { status: 502 });
    }

    const parsed = JSON.parse(text);
    return NextResponse.json({
      placeName: parsed.placeName ?? null,
      date: parsed.date ?? null,
      totalAmount: typeof parsed.totalAmount === "number" ? parsed.totalAmount : null,
      items: Array.isArray(parsed.items) ? parsed.items : [],
    });
  } catch (e: any) {
    console.error("Receipt scan error:", e);
    return NextResponse.json({ error: "영수증을 분석하는 중 오류가 발생했어요." }, { status: 500 });
  }
}
