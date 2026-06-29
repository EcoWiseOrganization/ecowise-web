"use server";

export async function uploadToCloudinary(file: File): Promise<{ url: string | null; error: string | null }> {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return { url: null, error: "Cloudinary credentials missing in .env" };
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const str = `timestamp=${timestamp}${apiSecret}`;
    
    // Generate SHA-1 signature
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    if (result.secure_url) {
      return { url: result.secure_url, error: null };
    } else {
      return { url: null, error: result.error?.message || "Failed to upload" };
    }
  } catch (error: unknown) {
    return { url: null, error: error instanceof Error ? error.message : "unknown error" };
  }
}
