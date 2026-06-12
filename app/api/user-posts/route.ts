import { NextResponse } from "next/server";

import { createUserPost, type UserPostInput } from "@/lib/user-posts";

export async function POST(request: Request) {
  let body: UserPostInput;

  try {
    body = (await request.json()) as UserPostInput;
  } catch {
    return NextResponse.json({ ok: false, message: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  try {
    const post = await createUserPost(body, request);
    return NextResponse.json({
      ok: true,
      post,
      url: `/posts/${post.slug}`,
      message: "등록되었습니다. 검수 전 상태로 바로 공개되며, 검색 노출은 승인 후 열립니다.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "등록에 실패했습니다.";

    if (error instanceof Error && error.name === "ValidationError") {
      return NextResponse.json({ ok: false, message }, { status: 400 });
    }

    if (
      message === "USER_POSTS_NOT_CONFIGURED" ||
      /relation .*user_posts.* does not exist/i.test(message) ||
      /user_posts/i.test(message) ||
      /schema cache/i.test(message)
    ) {
      return NextResponse.json(
        {
          ok: false,
          message: "자동 등록 저장소가 아직 준비되지 않았습니다. Supabase user_posts 테이블을 먼저 적용해주세요.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ ok: false, message: "잠시 후 다시 시도해주세요." }, { status: 500 });
  }
}
