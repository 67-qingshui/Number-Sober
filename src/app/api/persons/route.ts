import { NextResponse } from "next/server";
import { createPerson, listPersons } from "@/server/persons";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(listPersons());
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const person = createPerson({
      name: String(body.name ?? ""),
      note: body.note != null ? String(body.note) : undefined,
    });
    return NextResponse.json(person, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "创建失败" },
      { status: 400 },
    );
  }
}
