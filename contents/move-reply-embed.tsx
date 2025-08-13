import { useStorage } from '@plasmohq/storage/hook';
import { useEffect } from 'react';

import { DEFAULT_SETTINGS } from '~util/settings';

import type { PlasmoCSConfig } from '~node_modules/plasmo/dist/type';

export const config: PlasmoCSConfig = {
	matches: ['https://app.slack.com/*', 'https://*.slack.com/*'],
	run_at: 'document_idle',
};

export default function MoveReplyEmbed() {
	const [moveReplyToTop] = useStorage<boolean>('moveReplyToTop', DEFAULT_SETTINGS.moveReplyToTop);
	const [replyFormat] = useStorage<'quote' | 'codeblock' | 'link'>('replyFormat', DEFAULT_SETTINGS.replyFormat);

	useEffect(() => {
		if (!(replyFormat && moveReplyToTop)) return;

		const moveAttachments = () => {
			const messages = document.querySelectorAll('.c-message_kit__gutter__right');
			for (const msg of messages) {
				const blocks = msg.querySelector('.c-message_kit__blocks');
				const attachments = msg.querySelector('.c-message_kit__attachments');
				if (blocks && attachments && blocks.nextElementSibling === attachments && attachments.parentNode === msg)
					msg.insertBefore(attachments, blocks);
			}
		};

		moveAttachments();

		const observer = new MutationObserver(() => {
			moveAttachments();
		});

		observer.observe(document.body, { childList: true, subtree: true });

		return () => observer.disconnect();
	}, [replyFormat, moveReplyToTop]);
	return null;
}
