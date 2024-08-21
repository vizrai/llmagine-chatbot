import { nanoid } from '@lib/utils';
import { Chat } from '@components/chat';
import { AI } from '@lib/chat/actions';
import { auth } from '@auth';
import { Session } from '@lib/types';
import { getMissingKeys } from '@app/actions';

export const metadata = {
  title: 'LLMagine Your AI Possibility Generator',
};

export default async function IndexPage() {
  try {
    const id = nanoid();
    const session = (await auth()) as Session;
    const missingKeys = await getMissingKeys();

    return (
      <AI initialAIState={{ chatId: id, messages: [] }}>
        <Chat id={id} session={session} missingKeys={missingKeys} />
      </AI>
    );
  } catch (error) {
    console.error('Error in IndexPage:', error);
    return <div>Error loading the page. Please try again later.</div>;
  }
}
