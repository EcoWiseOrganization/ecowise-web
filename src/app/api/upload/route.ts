import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Cloudinary credentials missing" },
      { status: 500 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = "emission-evidence";

  // Cloudinary signed upload: tất cả params (trừ file/api_key) sort alphabetically rồi nối + apiSecret
  const signParams = `folder=${folder}&timestamp=${timestamp}`;
  const hashBuffer = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(`${signParams}${apiSecret}`)
  );
  const signature = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const upload = new FormData();
  upload.append("file", file);
  upload.append("api_key", apiKey);
  upload.append("timestamp", timestamp);
  upload.append("signature", signature);
  upload.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: upload }
  );

  const result = await res.json();
  if (result.secure_url) {
    return NextResponse.json({ url: result.secure_url });
  }
  return NextResponse.json(
    { error: result.error?.message ?? "Upload failed" },
    { status: 500 }
  );
}
