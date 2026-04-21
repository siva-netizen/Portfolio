import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const filename = "experience.md";
    const abspath = path.join(process.cwd(), "src", "app", "api", "chat", "memory", filename);
    const exists = fs.existsSync(abspath);
    const content = exists ? fs.readFileSync(abspath, "utf-8") : "MISSING";

    return NextResponse.json({
      cwd: process.cwd(),
      abspath,
      exists,
      content,
      __dirname: __dirname || "no __dirname"
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
