/**
 * API endpoint for receiving client-side error logs
 * POST /api/logs
 * 
 * Accepts error logs from the browser and logs them server-side
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => null);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const {
      message,
      errorMessage,
      errorStack,
      context,
      userAgent,
      url,
      timestamp,
    } = payload;

    // Log the client error on the server
    logger.error(`Client error: ${message}`, null, {
      errorMessage,
      userAgent,
      url,
      context,
      clientTimestamp: timestamp,
      source: 'client',
    });

    // Return success response
    return NextResponse.json(
      { message: 'Error logged successfully' },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Failed to process client error log', error as Error);

    return NextResponse.json(
      { error: 'Failed to process error log' },
      { status: 500 }
    );
  }
}
