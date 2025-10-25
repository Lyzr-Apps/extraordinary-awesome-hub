import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/agent
 * Secure API route for calling AI agents
 * API keys are stored server-side and never exposed to the client
 */

const LYZR_API_URL = 'https://agent-prod.studio.lyzr.ai/v3/inference/chat/'

// API key from environment variable only - NO hardcoded fallback!
const LYZR_API_KEY = process.env.LYZR_API_KEY

export async function POST(request: NextRequest) {
  try {
    // Check API key is configured
    if (!LYZR_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'LYZR_API_KEY not configured in .env.local',
        },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { message, agent_id, user_id, session_id } = body

    // Validate required fields
    if (!message || !agent_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: message and agent_id are required',
        },
        { status: 400 }
      )
    }

    // Call Lyzr API with server-side API key (secure!)
    const response = await fetch(LYZR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': LYZR_API_KEY,
      },
      body: JSON.stringify({
        user_id: user_id || `user-${Date.now()}`,
        agent_id,
        session_id: session_id || `session-${Date.now()}`,
        message,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({
        success: true,
        response: data.response,
        agent_id,
        user_id,
        session_id,
        timestamp: new Date().toISOString(),
      })
    } else {
      const errorText = await response.text()
      return NextResponse.json(
        {
          success: false,
          error: `API returned status ${response.status}`,
          details: errorText,
        },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error('AI Agent API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

// OPTIONS for CORS preflight (if needed)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
