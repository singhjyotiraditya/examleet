import { NextResponse } from "next/server";

export const ok = <T>(data: T, status = 200) =>
  NextResponse.json({ data }, { status });

export const created = <T>(data: T) =>
  NextResponse.json({ data }, { status: 201 });

export const noContent = () => new NextResponse(null, { status: 204 });

export const badRequest = (message: string) =>
  NextResponse.json({ error: message }, { status: 400 });

export const unauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export const forbidden = () =>
  NextResponse.json({ error: "Forbidden" }, { status: 403 });

export const notFound = (entity = "Resource") =>
  NextResponse.json({ error: `${entity} not found` }, { status: 404 });

export const conflict = (message: string) =>
  NextResponse.json({ error: message }, { status: 409 });

export const serverError = (err: unknown) => {
  console.error(err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
};
