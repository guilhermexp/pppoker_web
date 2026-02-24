import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { markdown, pageUrl, annotations } = await request.json();

    if (!markdown) {
      return NextResponse.json(
        { error: "Markdown content is required" },
        { status: 400 },
      );
    }

    console.log("[Feedback]", {
      pageUrl,
      count: annotations?.length,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Feedback API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
