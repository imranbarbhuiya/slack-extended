import { useStorage } from '@plasmohq/storage/hook';
import { useEffect } from 'react';

import { DEFAULT_SETTINGS } from '~util/settings';

import type { PlasmoCSConfig } from '~node_modules/plasmo/dist/type';

export const config: PlasmoCSConfig = {
	matches: ['https://app.slack.com/*', 'https://*.slack.com/*'],
	run_at: 'document_idle',
};

export default function SkipForm() {
	const [enableSkipForm] = useStorage<boolean>('enableSkipForm', DEFAULT_SETTINGS.enableSkipForm);

	useEffect(() => {
		if (!enableSkipForm) return;

		const clickButton = () => {
			const btn = document.querySelector<HTMLButtonElement>('.sendMessageBtn__xNfhN');
			if (btn) btn.click();
		};
		clickButton();
		const observer = new MutationObserver(() => {
			clickButton();
		});
		observer.observe(document.body, { childList: true, subtree: true });
		return () => observer.disconnect();
	}, [enableSkipForm]);
	return null;
}
