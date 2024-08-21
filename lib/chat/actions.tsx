import 'server-only';

import {
  createAI,
  createStreamableUI,
  getMutableAIState,
  getAIState,
  streamUI,
  createStreamableValue,
} from 'ai/rsc';
import { openai } from '@ai-sdk/openai';

import {
  BotMessage,
  SystemMessage,
  SpinnerMessage,
  UserMessage,
} from '@/components/stocks/message';
import { saveChat } from '@/app/actions';
import { Chat } from '@/lib/types';
import { auth } from '@/auth';
import { nanoid } from '@lib/utils';

// Removed unused imports and functions

async function submitUserMessage(content: string) {
  'use server';

  const aiState = getMutableAIState<typeof AI>();

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content,
      },
    ],
  });

  let textStream: undefined | ReturnType<typeof createStreamableValue<string>>;
  let textNode: undefined | React.ReactNode;

  const result = await streamUI({
    model: openai('gpt-3.5-turbo'),
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

    Your goal is to clearly communicate how Vizr.ai can quickly turn AI potential into business reality for SMEs and mid-size companies, encouraging them to take the next step in exploring Vizr.ai's services.`,
    messages: aiState.get().messages.map((message: any) => ({
      role: message.role,
      content: message.content,
      name: message.name,
    })),
    text: ({ content, done, delta }) => {
      if (!textStream) {
        textStream = createStreamableValue('');
        textNode = <BotMessage content={textStream.value} />;
      }

      if (done) {
        textStream.done();
        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: nanoid(),
              role: 'assistant',
              content,
            },
          ],
        });
      } else {
        textStream.update(delta);
      }

      return textNode;
    },
  });

  return {
    id: nanoid(),
    display: result.value,
  };
}

export const AI = createAI<Chat>({
  actions: {
    submitUserMessage,
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
  onGetUIState: async () => {
    'use server';

    const session = await auth();

    if (session && session.user) {
      const aiState = getAIState() as Chat;

      if (aiState) {
        return getUIStateFromAIState(aiState);
      }
    }
  },
  onSetAIState: async ({ state }) => {
    'use server';

    const session = await auth();

    if (session && session.user) {
      const { chatId, messages } = state;

      const createdAt = new Date();
      const userId = session.user.id as string;
      const path = `/chat/${chatId}`;

      const firstMessageContent = messages[0].content as string;
      const title = firstMessageContent.substring(0, 100);

      const chat: Chat = {
        id: chatId,
        title,
        userId,
        createdAt,
        messages,
        path,
      };

      await saveChat(chat);
    }
  },
});

export const getUIStateFromAIState = (aiState: Chat) => {
  return aiState.messages
    .filter((message) => message.role !== 'system')
    .map((message, index) => ({
      id: `${aiState.chatId}-${index}`,
      display:
        message.role === 'user' ? (
          <UserMessage>{message.content as string}</UserMessage>
        ) : message.role === 'assistant' &&
          typeof message.content === 'string' ? (
          <BotMessage content={message.content} />
        ) : null,
    }));
};
