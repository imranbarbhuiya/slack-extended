import type { PlasmoCSConfig } from 'plasmo';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

export const config: PlasmoCSConfig = {
	matches: ['https://app.slack.com/*', 'https://*.slack.com/*'],
	run_at: 'document_idle',
};

const SELECTORS = {
	actionsGroup: '[data-qa="message-actions"]:not(.c-file__actions), .c-message_actions__group:not(.c-file__actions)',
	messageContainer: '[data-qa="message_container"]',
	authorButton: '[data-qa="message_sender_name"]',
	messageText: '[data-qa="message-text"], .p-rich_text_block',
	composerPreferred: '[data-qa="message_input"][contenteditable="true"]',
	composerFallback: 'div[role="textbox"][contenteditable="true"]',
};

const ATTR = {
	replyButtonQa: 'slack-extended-reply',
};

const NAME_TO_ID = new Map<string, string>();

function isElement(node: Node | null): node is Element {
	return !!node && node.nodeType === Node.ELEMENT_NODE;
}

function findClosestMessageContainer(fromEl: Element | null): Element | null {
	if (!fromEl) return null;
	return fromEl.closest(SELECTORS.messageContainer);
}

function getAuthorInfo(messageEl: Element | null) {
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
	let userId = null;
	if (name) {
		userId = NAME_TO_ID.get(name.toLowerCase()) || null;
	}
	return { userId, name };
}

function readSelectedTextWithin(containerEl: Element) {
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

function readMessageText(containerEl: Element | null) {
	if (!containerEl) return '';
	const preferred = containerEl.querySelector(SELECTORS.messageText);
	let raw = '';
	if (preferred && (preferred as HTMLElement).innerText) {
		raw = (preferred as HTMLElement).innerText;
	} else {
		raw = containerEl.textContent || '';
	}
	return sanitizeMessageText(raw);
}

function sanitizeMessageText(raw: string) {
	if (!raw) return '';
	let t = String(raw);
	t = t.replace(/\u00A0/g, ' ');
	t = t.replace(/\s*\(edited\)\s*$/gm, '');
	t = t.replace(/\s*\(edited\)\s*/g, ' ');
	t = t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
	return t.trim();
}

function isVisible(el: Element | null) {
	if (!el) return false;
	const rect = el.getBoundingClientRect();
	const style = window.getComputedStyle(el);
	return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
}

function getActiveComposer(contextElement: Element | null = null): HTMLElement | null {
	if (contextElement) {
		const threadPane = contextElement.closest(
			'[data-qa="rhs_container"], [aria-label*="Thread"], [data-qa*="thread"], .p-threads_view__default_background',
		);
		if (threadPane) {
			const threadComposer =
				threadPane.querySelector(SELECTORS.composerPreferred) || threadPane.querySelector(SELECTORS.composerFallback);
			if (threadComposer && isVisible(threadComposer)) {
				return threadComposer as HTMLElement;
			}
		} else {
			const allComposers = Array.from(
				document.querySelectorAll(SELECTORS.composerPreferred + ', ' + SELECTORS.composerFallback),
			);
			for (const composer of allComposers) {
				if (!isVisible(composer)) continue;
				const inThreadPane = composer.closest(
					'[data-qa="rhs_container"], [aria-label*="Thread"], [data-qa*="thread"], .p-threads_view__default_background',
				);
				if (!inThreadPane) {
					return composer as HTMLElement;
				}
			}
		}
	}
	const ae = document.activeElement;
	if (
		ae &&
		(ae as HTMLElement).matches &&
		(ae as HTMLElement).matches(SELECTORS.composerFallback) &&
		isVisible(ae as HTMLElement)
	) {
		return ae as HTMLElement;
	}
	const preferred = document.querySelector(SELECTORS.composerPreferred);
	if (preferred && isVisible(preferred)) return preferred as HTMLElement;
	const all = Array.from(document.querySelectorAll(SELECTORS.composerFallback));
	const visible = all.find(isVisible);
	return (visible as HTMLElement) || null;
}

function placeCaretAtEnd(el: HTMLElement) {
	if (!el) return;
	const range = document.createRange();
	range.selectNodeContents(el);
	range.collapse(false);
	const sel = window.getSelection();
	if (!sel) return;
	sel.removeAllRanges();
	sel.addRange(range);
}

function insertIntoComposer(text: string, contextElement: Element | null = null) {
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

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function sendKey(target: HTMLElement, key: string, code = key, keyCode = key === 'Enter' ? 13 : undefined) {
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

function findTypeaheadOption(name: string, userId: string | null) {
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
					if (val && val === userId) {
						return opt;
					}
					if (opt.querySelector(`[${attr}="${userId}"]`)) {
						return opt;
					}
				}
			}
			const text = (opt.textContent || '').trim().toLowerCase();
			if (!text) continue;
			if (text === lower || text.startsWith(lower) || text.includes(lower)) {
				return opt;
			}
		}
	}
	return null;
}

async function createMentionEntity(displayName: string, userId: string | null, contextElement: Element | null = null) {
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
		if (anyList) {
			sendKey(composer, 'Enter', 'Enter', 13);
		}
	}
	return true;
}

async function handleReplyClick(actionsGroup: Element) {
	try {
		const messageEl = findClosestMessageContainer(actionsGroup);
		if (!messageEl) return;
		const { userId, name } = getAuthorInfo(messageEl);
		const displayName = name || 'user';
		const selected = readSelectedTextWithin(messageEl);
		const fullText = selected || readMessageText(messageEl);
		if (!fullText) return;
		const lines = fullText.trim().split(/\r?\n/);
		if (!lines.length) return;
		const contextElement = messageEl;
		insertIntoComposer('> ', contextElement);
		await createMentionEntity(displayName, userId, contextElement);
		insertIntoComposer(' ' + lines[0] + '\n', contextElement);
		for (let i = 1; i < lines.length; i++) {
			insertIntoComposer('> ' + lines[i] + '\n', contextElement);
		}
		insertIntoComposer('\n', contextElement);
	} catch {}
}

function ReplyButton({ onClick }: { onClick: () => void }) {
	return (
		<button
			className="c-button-unstyled c-icon_button c-icon_button--size_small c-message_actions__button c-icon_button--default"
			style={{ cursor: 'pointer' }}
			data-qa={ATTR.replyButtonQa}
			aria-label="Quote reply"
			title=""
			type="button"
			onClick={onClick}
		>
			<svg
				data-hlc="true"
				data-qa="reply-message"
				aria-hidden="true"
				width="20"
				height="20"
				viewBox="0 0 20 20"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					fill="currentColor"
					fill-rule="evenodd"
					clip-rule="evenodd"
					d="M9.543 2.56C9.40757 2.50237 9.25818 2.48587 9.11343 2.51254C8.96869 2.53922 8.83499 2.60789 8.729 2.71L1.729 9.46C1.65641 9.52996 1.59868 9.61384 1.55924 9.70662C1.51981 9.7994 1.49948 9.89919 1.49948 10C1.49948 10.1008 1.51981 10.2006 1.55924 10.2934C1.59868 10.3862 1.65641 10.47 1.729 10.54L8.729 17.29C8.83493 17.3923 8.96864 17.4612 9.11344 17.488C9.25824 17.5148 9.40774 17.4984 9.54327 17.4408C9.67881 17.3832 9.7944 17.287 9.87562 17.1641C9.95684 17.0413 10.0001 16.8973 10 16.75V13.5H14C15.352 13.5 16.05 13.889 16.43 14.332C16.83 14.797 17 15.465 17 16.25C17 16.4489 17.079 16.6397 17.2197 16.7803C17.3603 16.921 17.5511 17 17.75 17C17.9489 17 18.1397 16.921 18.2803 16.7803C18.421 16.6397 18.5 16.4489 18.5 16.25V14C18.5 11.406 17.918 9.46 16.5 8.191C15.102 6.941 13.056 6.5 10.5 6.5H10V3.25C10 2.95 9.82 2.677 9.543 2.56ZM16.948 12.79C16.223 12.278 15.247 12 14 12H9.25C9.05109 12 8.86032 12.079 8.71967 12.2197C8.57902 12.3603 8.5 12.5511 8.5 12.75V14.985L3.33 10L8.5 5.015V7.25C8.5 7.44891 8.57902 7.63968 8.71967 7.78033C8.86032 7.92098 9.05109 8 9.25 8H10.5C12.944 8 14.523 8.434 15.5 9.309C16.284 10.011 16.79 11.097 16.948 12.79Z"
				/>
			</svg>
		</button>
	);
}

function CopyButton({ onClick }: { onClick: () => void }) {
	const [copied, setCopied] = useState(false);
	useEffect(() => {
		if (!copied) return;
		const timeout = setTimeout(() => setCopied(false), 1200);
		return () => clearTimeout(timeout);
	}, [copied]);
	return (
		<button
			className="c-button-unstyled c-icon_button c-icon_button--size_small c-message_actions__button c-icon_button--default"
			style={copied ? { color: '#2eb67d', transition: 'color 0.2s' } : { cursor: 'pointer' }}
			data-qa="slack-extended-copy"
			aria-label={copied ? 'Copied!' : 'Copy message'}
			title={copied ? 'Copied!' : ''}
			type="button"
			onClick={() => {
				onClick();
				setCopied(true);
			}}
		>
			{copied ? (
				<svg viewBox="0 0 20 20" width="0.9em" height="0.9em" aria-hidden="true" focusable="false">
					<path
						fill="currentColor"
						d="M7.629 14.629a1 1 0 0 1-1.414 0l-3.243-3.243a1 1 0 1 1 1.414-1.414l2.536 2.536 6.536-6.536a1 1 0 1 1 1.414 1.414l-7.243 7.243Z"
					/>
				</svg>
			) : (
				<svg viewBox="0 0 20 20" width="0.9em" height="0.9em" aria-hidden="true" focusable="false">
					<path
						fill="currentColor"
						d="M6 2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H6Zm0 2h8v10H6V4Zm-2 4a1 1 0 0 0-1 1v7a2 2 0 0 0 2 2h7a1 1 0 1 0 0-2H5V9a1 1 0 0 0-1-1Z"
					/>
				</svg>
			)}
		</button>
	);
}

function handleCopyClick(actionsGroup: Element) {
	const messageEl = findClosestMessageContainer(actionsGroup);
	if (!messageEl) return;
	const selected = readSelectedTextWithin(messageEl);
	const fullText = selected || readMessageText(messageEl);
	if (!fullText) return;
	navigator.clipboard.writeText(fullText);
}

function MessageActions({ actionsGroup }: { actionsGroup: Element }) {
	return (
		<>
			<ReplyButton onClick={() => handleReplyClick(actionsGroup)} />
			<CopyButton onClick={() => handleCopyClick(actionsGroup)} />
		</>
	);
}

function injectReactReplyButton(actionsGroup: Element) {
	if (!actionsGroup || !isElement(actionsGroup)) return;
	const existing = actionsGroup.querySelector(`[data-qa="${ATTR.replyButtonQa}"]`);
	const existingCopy = actionsGroup.querySelector('[data-qa="slack-extended-copy"]');
	if (existing && existingCopy) return;
	const prevContainers = actionsGroup.querySelectorAll('span[data-slack-extended-reply-container]');
	prevContainers.forEach((el) => el.remove());
	const btnContainer = document.createElement('span');
	btnContainer.setAttribute('data-slack-extended-reply-container', 'true');
	const lastButton = actionsGroup.lastElementChild;
	if (lastButton) {
		actionsGroup.insertBefore(btnContainer, lastButton);
	} else {
		actionsGroup.appendChild(btnContainer);
	}
	const root = createRoot(btnContainer);
	root.render(<MessageActions actionsGroup={actionsGroup} />);
}

function scanInitial() {
	const groups = document.querySelectorAll(SELECTORS.actionsGroup);
	groups.forEach(injectReactReplyButton);
}

const handleMutations = (mutations: MutationRecord[]) => {
	for (const m of mutations) {
		if (!m.addedNodes || m.addedNodes.length === 0) continue;
		for (const node of m.addedNodes) {
			if (!isElement(node)) continue;
			const el = node as Element;
			if (el.matches && el.matches(SELECTORS.actionsGroup)) {
				injectReactReplyButton(el);
			}
			const nested = el.querySelectorAll ? el.querySelectorAll(SELECTORS.actionsGroup) : [];
			nested.forEach(injectReactReplyButton);
		}
	}
};

function startObserver() {
	const obs = new MutationObserver(handleMutations);
	obs.observe(document.documentElement, { childList: true, subtree: true });
}

function ensureReplySoonForMessage(messageEl: Element) {
	let attempts = 8;
	function tick() {
		const group = messageEl.querySelector(SELECTORS.actionsGroup);
		if (group) {
			injectReactReplyButton(group);
			return;
		}
		if (attempts-- > 0) {
			requestAnimationFrame(tick);
		}
	}
	tick();
}

document.addEventListener(
	'mouseenter',
	(e) => {
		const target = e.target as Element;
		if (!(target instanceof Element)) return;
		const message = target.closest(SELECTORS.messageContainer);
		if (message) ensureReplySoonForMessage(message);
	},
	true,
);

scanInitial();
startObserver();

export {};
