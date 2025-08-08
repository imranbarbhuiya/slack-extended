import { useEffect } from 'react';

const SkipForm = () => {
	useEffect(() => {
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
	}, []);
	return null;
};

export default SkipForm;
