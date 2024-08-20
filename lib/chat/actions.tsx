import 'server-only'

import {
  createAI,
  createStreamableUI,
  getMutableAIState,
  getAIState,
  streamUI,
  createStreamableValue
} from 'ai/rsc'
import { openai } from '@ai-sdk/openai'

import { spinner, BotMessage } from '@/components/ui' // Adjust imports to UI components relevant to your case

import {
  runAsyncFnWithoutBlocking,
  sleep,
  nanoid
} from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { SpinnerMessage, UserMessage } from '@/components/ui/message'
import { Chat, Message } from '@/lib/types'
import { auth } from '@/auth'

async function submitUserMessage(content: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content
      }
    ]
  })

  let textStream: undefined | ReturnType<typeof createStreamableValue<string>>
  let textNode: undefined | React.ReactNode

  const result = await streamUI({
    model: openai('gpt-3.5-turbo'), // Replace with 'gpt-4o-mini' if desired
    initial: <SpinnerMessage />,
    system: `\
    You are an AI assistant for Vizr.ai, a company that rapidly implements and manages advanced AI solutions for SMEs and mid-size companies. Your role is to engage with potential clients, understand their business challenges, and explain how Vizr.ai can help them leverage AI to improve their operations. Keep these key points in mind:

    1. Target Audience: SMEs and mid-size companies looking to work smarter but lacking time or expertise to explore AI solutions.

    2. Key Offering: Rapid implementation (within 72 hours) of custom AI solutions, managed by Vizr.ai experts.

    3. Value Proposition: 
       - Transform business operations quickly
       - No in-house tech expertise required
       - Boost productivity (up to 40%)
       - Reduce operational costs (up to 30%)
       - Automate tedious tasks

    4. Approach:
       - Listen to understand unique challenges
       - Craft custom AI solutions
       - Implement and manage the technology
       - Empower clients to excel with AI support

    5. Differentiators:
       - Speed of implementation (72 hours)
       - Managed service (ongoing support and optimization)
       - Focus on practical, immediate business impact
       - Bridge between AI potential and business reality

    When interacting:
    - Ask questions to understand the user's specific business challenges
    - Explain how Vizr.ai's solutions address these challenges without using technical jargon
    - Emphasize the speed of implementation and the managed service aspect
    - Highlight how Vizr.ai makes advanced AI accessible without requiring in-house expertise
    - Use concrete examples or potential use cases relevant to the user's industry or problem
    - Always maintain a tone that is helpful, confident, and focused on practical business benefits

    Your goal is to clearly communicate how Vizr.ai can quickly turn AI potential into business reality for SMEs and mid-size companies, encouraging them to take the next step in exploring Vizr.ai's services.`,
    messages: [
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: message.name
      }))
    ],
    text: ({ content, done, delta }) => {
      if (!textStream) {
        textStream = createStreamableValue('')
        textNode = <BotMessage content={textStream.value} />
      }

      if (done) {
        textStream.done()
        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: nanoid(),
              role: 'assistant',
              content
            }
          ]
        })
      } else {
        textStream.update(delta)
      }

      return textNode
    },
    tools: {
      // Add or refactor tools that are relevant to Vizr.ai if needed
    }
  })

  return {
    id: nanoid(),
    display: result.value
  }
}

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
  onGetUIState: async () => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const aiState = getAIState() as Chat

      if (aiState) {
        const uiState = getUIStateFromAIState(aiState)
        return uiState
      }
    } else {
      return
    }
  },
  onSetAIState: async ({ state }) => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const { chatId, messages } = state

      const createdAt = new Date()
      const userId = session.user.id as string
      const path = `/chat/${chatId}`

      const firstMessageContent = messages[0].content as string
      const title = firstMessageContent.substring(0, 100)

      const chat: Chat = {
        id: chatId,
        title,
        userId,
        createdAt,
        messages,
        path
      }

      await saveChat(chat)
    } else {
      return
    }
  }
})

export const getUIStateFromAIState = (aiState: Chat) => {
  return aiState.messages
    .filter(message => message.role !== 'system')
    .map((message, index) => ({
      id: `${aiState.chatId}-${index}`,
      display: message.role === 'user' ? (
        <UserMessage>{message.content as string}</UserMessage>
      ) : message.role === 'assistant' && typeof message.content === 'string' ? (
        <BotMessage content={message.content} />
      ) : null
    }))
}
