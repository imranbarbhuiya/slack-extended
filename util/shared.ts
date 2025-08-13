/* eslint-disable no-implicit-coercion */
// Shared utilities for Slack extension (action menu & context menu)
// Move all shared functions, constants, and types here.

export const SELECTORS = {
	actionsGroup: '[data-qa="message-actions"]:not(.c-file__actions), .c-message_actions__group:not(.c-file__actions)',
	messageContainer: '[data-qa="message_container"]',
	authorButton: '[data-qa="message_sender_name"]',
	messageText: '[data-qa="message-text"], .p-rich_text_block',
	composerPreferred: '[data-qa="message_input"][contenteditable="true"]',
	composerFallback: 'div[role="textbox"][contenteditable="true"]',
};

export const ATTR = {
	replyButtonQa: 'slack-extended-reply',
	copyButtonQa: 'slack-extended-copy',
};

const NAME_TO_ID = new Map<string, string>();

export function isElement(node: Node | null): node is Element {
	return !!node && node.nodeType === Node.ELEMENT_NODE;
}

export function findClosestMessageContainer(fromEl: Element | null): Element | null {
	if (!fromEl) return null;
	return fromEl.closest(SELECTORS.messageContainer);
}

export function getAuthorInfo(messageEl: Element | null) {
	if (!messageEl) return { userId: null, name: null };
	const btn = messageEl.querySelector(SELECTORS.authorButton);
	if (btn) {
		const userId = btn.getAttribute('data-message-sender');
		const name = (btn.textContent || '').trim() || null;
		if (name && userId) NAME_TO_ID.set(name.toLowerCase(), userId);
		return { userId, name };
	}
	const offscreen = messageEl.querySelector('[id$="-sender"].offscreen, .offscreen[id*="-sender"]');
	let name = offscreen ? (offscreen.textContent || '').trim() : null;
	if (!name) {
		const senderWrap = messageEl.querySelector('[data-qa="message_sender"]');
		const attrName = senderWrap ? senderWrap.getAttribute('data-stringify-text') : null;
		if (attrName) name = attrName.trim();
	}
	let userId: string | null = null;
	if (name) userId = NAME_TO_ID.get(name.toLowerCase()) ?? null;

	return { userId, name };
}

export function getPermalink(containerEl: Element): string {
	const link = containerEl.querySelector('a.c-link.c-timestamp');
	return (link && (link as HTMLAnchorElement).href) ?? '';
}

export function readSelectedTextWithin(containerEl: Element) {
	try {
		const sel = window.getSelection();
		if (!sel || sel.rangeCount === 0) return '';
		const range = sel.getRangeAt(0);
		if (!containerEl.contains(range.commonAncestorContainer)) return '';
		const text = sel.toString();
		return text ? sanitizeMessageText(text) : '';
	} catch {
		return '';
	}
}

export function readMessageText(containerEl: Element | null) {
	if (!containerEl) return '';
	const preferred = containerEl.querySelector(SELECTORS.messageText);
	let raw = '';
	if (preferred && (preferred as HTMLElement).innerText) raw = (preferred as HTMLElement).innerText;
	else raw = containerEl.textContent || '';

	return sanitizeMessageText(raw);
}

export function sanitizeMessageText(raw: string) {
	if (!raw) return '';
	let t = String(raw);
	t = t.replaceAll('\u00A0', ' ');
	t = t.replaceAll(/\s*\(edited\)\s*$/gm, '');
	t = t.replaceAll(/\s*\(edited\)\s*/g, ' ');
	t = t.replaceAll(/[\t ]+\n/g, '\n').replaceAll(/\n{3,}/g, '\n\n');
	return t.trim();
}

export function isVisible(el: Element | null) {
	if (!el) return false;
	const rect = el.getBoundingClientRect();
	const style = window.getComputedStyle(el);
	return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
}

export function getActiveComposer(contextElement: Element | null = null): HTMLElement | null {
	if (contextElement) {
		const threadPane = contextElement.closest(
			'[data-qa="rhs_container"], [aria-label*="Thread"], [data-qa*="thread"], .p-threads_view__default_background',
		);
		if (threadPane) {
			const threadComposer =
				threadPane.querySelector(SELECTORS.composerPreferred) ?? threadPane.querySelector(SELECTORS.composerFallback);
			if (threadComposer && isVisible(threadComposer)) return threadComposer as HTMLElement;
		} else {
			const allComposers = Array.from(
				document.querySelectorAll(SELECTORS.composerPreferred + ', ' + SELECTORS.composerFallback),
			);
			for (const composer of allComposers) {
				if (!isVisible(composer)) continue;
				const inThreadPane = composer.closest(
					'[data-qa="rhs_container"], [aria-label*="Thread"], [data-qa*="thread"], .p-threads_view__default_background',
				);
				if (!inThreadPane) return composer as HTMLElement;
			}
		}
	}
	const ae = document.activeElement;
	if (
		ae &&
		(ae as HTMLElement).matches &&
		(ae as HTMLElement).matches(SELECTORS.composerFallback) &&
		isVisible(ae as HTMLElement)
	)
		return ae as HTMLElement;

	const preferred = document.querySelector(SELECTORS.composerPreferred);
	if (preferred && isVisible(preferred)) return preferred as HTMLElement;
	const all = Array.from(document.querySelectorAll(SELECTORS.composerFallback));
	const visible = all.find(isVisible);

	return (visible as HTMLElement) || null;
}

export function placeCaretAtEnd(el: HTMLElement) {
	if (!el) return;
	const range = document.createRange();
	range.selectNodeContents(el);
	range.collapse(false);
	const sel = window.getSelection();
	if (!sel) return;
	sel.removeAllRanges();
	sel.addRange(range);
}

export function insertIntoComposer(text: string, contextElement: Element | null = null) {
	if (!text) return;
	const composer = getActiveComposer(contextElement);
	if (!composer) return;
	composer.focus();
	const ok = document.execCommand('insertText', false, text);
	if (!ok) {
		const sel = window.getSelection();
		if (sel && sel.rangeCount > 0) {
			const range = sel.getRangeAt(0);
			range.deleteContents();
			range.insertNode(document.createTextNode(text));
			sel.collapseToEnd();
		} else {
			placeCaretAtEnd(composer);
			const sel2 = window.getSelection();
			if (sel2 && sel2.rangeCount > 0) {
				const r = sel2.getRangeAt(0);
				r.insertNode(document.createTextNode(text));
				sel2.collapseToEnd();
			}
		}
	}
	composer.dispatchEvent(new InputEvent('input', { bubbles: true }));
}

export function delay(ms: number) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

export function sendKey(target: HTMLElement, key: string, code = key, keyCode = key === 'Enter' ? 13 : undefined) {
	const opts = {
		key,
		code,
		which: keyCode,
		keyCode,
		bubbles: true,
		cancelable: true,
	};
	target.dispatchEvent(new KeyboardEvent('keydown', opts));
	target.dispatchEvent(new KeyboardEvent('keypress', opts));
	target.dispatchEvent(new KeyboardEvent('keyup', opts));
}

export function findTypeaheadOption(name: string, userId: string | null) {
	const lower = (name || '').toLowerCase();
	const lists = Array.from(
		document.querySelectorAll(
			'[role="listbox"], [data-qa*="typeahead"], .c-menu, .c-typeahead__popper, .ql-autocomplete__list',
		),
	);
	const attrCandidates = ['data-user-id', 'data-entity-id', 'data-qa-user-id', 'data-member-id', 'data-id', 'data-uid'];
	for (const list of lists) {
		const opts = list.querySelectorAll('[role="option"], .c-menu_item, [data-qa="typeahead-item"]');
		for (const opt of opts) {
			if (userId) {
				for (const attr of attrCandidates) {
					const val = opt.getAttribute(attr);
					if (val && val === userId) return opt;

					if (opt.querySelector(`[${attr}="${userId}"]`)) return opt;
				}
			}
			const text = (opt.textContent || '').trim().toLowerCase();
			if (!text) continue;
			if (text === lower || text.startsWith(lower) || text.includes(lower)) return opt;
		}
	}
	return null;
}

export async function createMentionEntity(
	displayName: string,
	userId: string | null,
	contextElement: Element | null = null,
) {
	const composer = getActiveComposer(contextElement);
	if (!composer) return false;
	composer.focus();
	insertIntoComposer(`@${displayName}`, contextElement);
	const deadline = Date.now() + 900;
	let clicked = false;
	while (Date.now() < deadline) {
		const opt = findTypeaheadOption(displayName, userId);
		if (opt) {
			opt.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
			opt.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
			(opt as HTMLElement).click();
			clicked = true;
			break;
		}
		await delay(60);
	}
	if (!clicked) {
		const anyList = document.querySelector(
			'[role="listbox"], [data-qa*="typeahead"], .c-menu, .c-typeahead__popper, .ql-autocomplete__list',
		);
		if (anyList) sendKey(composer, 'Enter', 'Enter', 13);
	}
	return true;
}
