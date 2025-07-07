/*
  Integration test guarded by LIVE_AI_TESTS env variable.
  Executes a minimal prompt and verifies ai_calls record has raw_api_response + latency.
*/

import { jest } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { createAIResponseLogger } from '@/lib/services/ai-response-logger'
import { getModelStringFromEnvironment } from '@/lib/config'
import { getProvider } from '@/lib/services/llm-provider'

const runLive = process.env.LIVE_AI_TESTS === 'true'

(runLive ? describe : describe.skip)('AI response logging (live)', () => {
  jest.setTimeout(60_000)

  it('stores raw_api_response and latency', async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const admin = createClient(supabaseUrl, supabaseKey)
    const aiCallService = new AiCallService(admin as any)
    const logger = createAIResponseLogger(aiCallService)

    const modelString = getModelStringFromEnvironment()
    const parsed = (await import('@/lib/config/models')).parseModelString(modelString)
    const providerInstance = getProvider(parsed.provider)
    const model = providerInstance(parsed.modelName)

    const aiCall = await aiCallService.startCallWithModelString({
      userId: '00000000-0000-0000-0000-000000000000',
      modelString,
      prompt_type: 'chat',
    })

    const startTs = Date.now()
    const result: any = await model.generateText('Say HELLO')
    const finishTs = Date.now()

    await logger.completeAICall({
      aiCallId: aiCall.id,
      response: {
        ...result,
        startTimestamp: startTs,
        finishTimestamp: finishTs,
      } as any,
    })

    const { data } = await admin
      .from('ai_calls')
      .select('raw_api_response, latency_ms')
      .eq('id', aiCall.id)
      .single()

    expect(data).toBeDefined()
    expect(data!.raw_api_response).toBeTruthy()
    expect(data!.latency_ms).toBeGreaterThan(0)
  })
}) 