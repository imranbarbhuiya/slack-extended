import { useStorage } from '@plasmohq/storage/hook';
import hljs from 'highlight.js/lib/core';
import css from 'highlight.js/lib/languages/css';
import go from 'highlight.js/lib/languages/go';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import php from 'highlight.js/lib/languages/php';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import swift from 'highlight.js/lib/languages/swift';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import { useEffect } from 'react';

import { DEFAULT_SETTINGS } from '~util/settings';

import type { PlasmoCSConfig } from 'plasmo';

export const config: PlasmoCSConfig = {
	matches: ['https://app.slack.com/*', 'https://*.slack.com/*'],
	run_at: 'document_idle',
};

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('python', python);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('go', go);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('swift', swift);
hljs.registerLanguage('kotlin', kotlin);
hljs.registerLanguage('php', php);

const loadThemeCSS = (theme: string) => {
	const existingLink = document.querySelector('link[data-highlight-theme]');
	if (existingLink) existingLink.remove();

	const link = document.createElement('link');
	link.rel = 'stylesheet';
	link.href = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/${theme}.min.css`;
	link.setAttribute('data-highlight-theme', theme);
	document.head.appendChild(link);
};

const highlightSlackBlocks = async (theme: string) => {
	loadThemeCSS(theme);

	const selector = 'pre.c-mrkdwn__pre[data-stringify-type="pre"] > div.p-rich_text_block--no-overflow';
	const nodes = document.querySelectorAll<HTMLElement>(selector);
	for (const node of nodes) {
		if (node.dataset.highlightjsHighlighted) continue;
		const text = node.textContent || '';
		const lines = text.split('\n');
		if (lines.length < 2) continue;
		const lang = lines[0].trim().toLowerCase();
		const code = lines.slice(1).join('\n');

		const validLang = hljs.getLanguage(lang);
		if (!validLang) {
			node.dataset.highlightjsHighlighted = '1';
			node.innerHTML = `<pre><code class="hljs">${text}</code></pre>`;
			continue;
		}

		try {
			const result = hljs.highlight(code, { language: validLang.name! });
			node.innerHTML = `<pre><code class="hljs language-${lang}">${result.value}</code></pre>`;
		} catch {
			try {
				const result = hljs.highlightAuto(code);
				node.innerHTML = `<pre><code class="hljs">${result.value}</code></pre>`;
			} catch {
				node.innerHTML = `<pre><code class="hljs">${text}</code></pre>`;
			}
		}

		node.dataset.highlightjsHighlighted = '1';
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
