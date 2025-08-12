import { useEffect } from 'react';

import { useStorage } from '@plasmohq/storage/hook';

import { DEFAULT_SETTINGS } from '~util/settings';

export default function SkipForm() {
	const [enableSkipForm] = useStorage<boolean>('enableSkipForm', DEFAULT_SETTINGS.enableSkipForm);

	useEffect(() => {
		if (!enableSkipForm) return;

		const clickButton = () => {
			const btn = document.querySelector<HTMLButtonElement>('.sendMessageBtn__xNfhN');
			if (btn) {
				btn.click();
			}
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
