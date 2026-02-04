// app/api/resume/parse/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-middleware'
import { logger } from '@/lib/logger'
import type { User } from '@/types'

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024
// Maximum text length to return (for AI token efficiency)
const MAX_TEXT_LENGTH = 5000

// Lazy load the PDF extraction function to avoid build-time issues
async function extractTextFromPDF(
  buffer: Uint8Array
): Promise<{ text: string; pageCount: number }> {
  // Dynamic import at runtime only
  const { extractText } = await import('unpdf')
  const result = await extractText(buffer)

  // unpdf returns text as string or string[] depending on version
  const textContent = Array.isArray(result.text) ? result.text.join('\n\n') : result.text

  return {
    text: textContent,
    pageCount: result.totalPages,
  }
}

export const POST = withAuth(
  async (req: NextRequest, user: User) => {
    try {
      const formData = await req.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }

      // Validate file type
      if (file.type !== 'application/pdf') {
        return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 })
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 })
      }

      logger.info(`Parsing PDF resume for user ${user.id}, file size: ${file.size} bytes`)

      // Convert file to Uint8Array
      const arrayBuffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)

      // Extract text from PDF
      const { text, pageCount } = await extractTextFromPDF(uint8Array)

      if (!text || text.trim().length === 0) {
        return NextResponse.json(
          {
            error:
              'Could not extract text from PDF. The file may be scanned or contain only images.',
          },
          { status: 422 }
        )
      }

      // Clean up and truncate text
      const cleanedText = text
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
        .slice(0, MAX_TEXT_LENGTH)

      logger.info(
        `Successfully parsed PDF: ${pageCount} pages, ${cleanedText.length} characters extracted`
      )

      return NextResponse.json({
        success: true,
        text: cleanedText,
        pageCount,
        truncated: text.length > MAX_TEXT_LENGTH,
        originalLength: text.trim().length,
      })
    } catch (error) {
      logger.error('Error parsing PDF:', error)

      if (error instanceof Error) {
        // Handle specific errors
        if (error.message.includes('Invalid PDF') || error.message.includes('Failed to parse')) {
          return NextResponse.json(
            { error: 'Invalid PDF file. Please upload a valid PDF document.' },
            { status: 400 }
          )
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ error: 'Failed to parse PDF file' }, { status: 500 })
    }
  },
  {
    maxRequests: 10,
    windowMs: 60 * 1000,
  }
)
