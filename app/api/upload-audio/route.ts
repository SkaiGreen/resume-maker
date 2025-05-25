import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Check if token is available
    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (!token) {
      console.error("BLOB_READ_WRITE_TOKEN environment variable is not set")
      return NextResponse.json({ error: "Blob storage not configured" }, { status: 500 })
    }

    // Generate a unique filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const filename = `audio_${timestamp}_${randomId}.mp4`

    // Upload to Vercel Blob with explicit token
    const blob = await put(filename, file, {
      access: "public",
      token: token,
    })

    return NextResponse.json({
      url: blob.url,
      filename: filename,
      success: true,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      {
        error: `Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    )
  }
}
