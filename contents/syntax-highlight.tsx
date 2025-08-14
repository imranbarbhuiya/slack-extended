import { useStorage } from '@plasmohq/storage/hook';
import githubDark from '@shikijs/themes/github-dark';
import githubLight from '@shikijs/themes/github-light';
import { useEffect } from 'react';
import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

import { DEFAULT_SETTINGS } from '~util/settings';

const jsEngine = createJavaScriptRegexEngine({ forgiving: true });

const shiki = createHighlighterCore({
	themes: [githubDark, githubLight],
	langs: [import('@shikijs/langs/javascript'), import('@shikijs/langs/typescript'), import('@shikijs/langs/json')],
	engine: jsEngine,
});

const highlightSlackBlocks = async (theme: string) => {
	const selector = 'pre.c-mrkdwn__pre[data-stringify-type="pre"] > div.p-rich_text_block--no-overflow';
	const nodes = document.querySelectorAll<HTMLElement>(selector);
	for (const node of nodes) {
		if (node.dataset.shikiHighlighted) continue;
		const text = node.textContent || '';
		const lines = text.split('\n');
		if (lines.length < 2) continue;
		const lang = lines[0].trim().toLowerCase();
		const code = lines.slice(1).join('\n');
		const html = (await shiki).codeToHtml(code, { lang, theme });
		node.innerHTML = html;
		node.dataset.shikiHighlighted = '1';
	}
};

export default function SyntaxHighlightContentScript() {
	const [enableSyntaxHighlight] = useStorage<boolean>('enableSyntaxHighlight', DEFAULT_SETTINGS.enableSyntaxHighlight);
	const [syntaxHighlightTheme] = useStorage<string>('syntaxHighlightTheme', DEFAULT_SETTINGS.syntaxHighlightTheme);

	useEffect(() => {
		if (!enableSyntaxHighlight) return;
		let running = false;
		const runHighlight = async () => {
			if (running) return;
			running = true;
			try {
				await highlightSlackBlocks(syntaxHighlightTheme);
			} finally {
				// eslint-disable-next-line require-atomic-updates
				running = false;
			}
		};
		void runHighlight();
		const observer = new MutationObserver(() => {
			void runHighlight();
		});
		observer.observe(document.body, { childList: true, subtree: true });
		return () => observer.disconnect();
	}, [enableSyntaxHighlight, syntaxHighlightTheme]);
	return null;
}
