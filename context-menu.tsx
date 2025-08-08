import type { PlasmoCSConfig } from 'plasmo';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import {
	ATTR,
	createMentionEntity,
	findClosestMessageContainer,
	getAuthorInfo,
	insertIntoComposer,
	isElement,
	readMessageText,
	readSelectedTextWithin,
} from './util/shared';

export const config: PlasmoCSConfig = {
	matches: ['https://app.slack.com/*', 'https://*.slack.com/*'],
	run_at: 'document_idle',
};

function handleReplyClick(menuItem: Element) {
	const messageEl = findClosestMessageContainer(menuItem);
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
	createMentionEntity(displayName, userId, contextElement).then(() => {
		insertIntoComposer(' ' + lines[0] + '\n', contextElement);
		for (let i = 1; i < lines.length; i++) {
			insertIntoComposer('> ' + lines[i] + '\n', contextElement);
		}
		insertIntoComposer('\n', contextElement);
	});
}

function handleCopyClick(menuItem: Element) {
	const messageEl = findClosestMessageContainer(menuItem);
	if (!messageEl) return;
	const selected = readSelectedTextWithin(messageEl);
	const fullText = selected || readMessageText(messageEl);
	if (!fullText) return;
	navigator.clipboard.writeText(fullText);
}

function ReplyMenuButton({ onClick }: { onClick: () => void }) {
	return (
		<button
			className="c-button-unstyled c-menu_item__button c-menu_item--compact"
			style={{ cursor: 'pointer' }}
			data-qa={ATTR.replyButtonQa}
			aria-label="Quote reply"
			title="Quote reply"
			type="button"
			onClick={onClick}
		>
			<span className="c-menu_item__icon" data-qa="menu_item_icon" role="presentation">
				{/* SVG icon can be copied from action-menu */}
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
						fillRule="evenodd"
						clipRule="evenodd"
						d="M9.543 2.56C9.40757 2.50237 9.25818 2.48587 9.11343 2.51254C8.96869 2.53922 8.83499 2.60789 8.729 2.71L1.729 9.46C1.65641 9.52996 1.59868 9.61384 1.55924 9.70662C1.51981 9.7994 1.49948 9.89919 1.49948 10C1.49948 10.1008 1.51981 10.2006 1.55924 10.2934C1.59868 10.3862 1.65641 10.47 1.729 10.54L8.729 17.29C8.83493 17.3923 8.96864 17.4612 9.11344 17.488C9.25824 17.5148 9.40774 17.4984 9.54327 17.4408C9.67881 17.3832 9.7944 17.287 9.87562 17.1641C9.95684 17.0413 10.0001 16.8973 10 16.75V13.5H14C15.352 13.5 16.05 13.889 16.43 14.332C16.83 14.797 17 15.465 17 16.25C17 16.4489 17.079 16.6397 17.2197 16.7803C17.3603 16.921 17.5511 17 17.75 17C17.9489 17 18.1397 16.921 18.2803 16.7803C18.421 16.6397 18.5 16.4489 18.5 16.25V14C18.5 11.406 17.918 9.46 16.5 8.191C15.102 6.941 13.056 6.5 10.5 6.5H10V3.25C10 2.95 9.82 2.677 9.543 2.56ZM16.948 12.79C16.223 12.278 15.247 12 14 12H9.25C9.05109 12 8.86032 12.079 8.71967 12.2197C8.57902 12.3603 8.5 12.5511 8.5 12.75V14.985L3.33 10L8.5 5.015V7.25C8.5 7.44891 8.57902 7.63968 8.71967 7.78033C8.86032 7.92098 9.05109 8 9.25 8H10.5C12.944 8 14.523 8.434 15.5 9.309C16.284 10.011 16.79 11.097 16.948 12.79Z"
					/>
				</svg>
			</span>
			<span className="c-menu_item__label">Quote reply</span>
		</button>
	);
}

function CopyMenuButton({ onClick }: { onClick: () => void }) {
	const [copied, setCopied] = useState(false);
	useEffect(() => {
		if (!copied) return;
		const timeout = setTimeout(() => setCopied(false), 1200);
		return () => clearTimeout(timeout);
	}, [copied]);
	return (
		<button
			className="c-button-unstyled c-menu_item__button c-menu_item--compact"
			style={copied ? { color: '#2eb67d', transition: 'color 0.2s' } : { cursor: 'pointer' }}
			data-qa="slack-extended-copy"
			aria-label={copied ? 'Copied!' : 'Copy message'}
			title={copied ? 'Copied!' : 'Copy message'}
			type="button"
			onClick={() => {
				onClick();
				setCopied(true);
			}}
		>
			<span className="c-menu_item__icon" data-qa="menu_item_icon" role="presentation">
				{/* SVG icon can be copied from action-menu */}
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
			</span>
			<span className="c-menu_item__label">Copy message</span>
		</button>
	);
}

function injectContextMenuButtons(menu: Element) {
	if (!menu || !isElement(menu)) return;
	// Find "Reply in thread" and "Copy link" menu items
	const replyInThread = menu.querySelector('[data-qa="start_thread"]')?.closest('.c-menu_item__li');
	const copyLink = menu.querySelector('[data-qa="copy_link"]')?.closest('.c-menu_item__li');

	// Avoid duplicate injection for reply
	const hasReply = !!menu.querySelector('.slack-extended-reply-menu-injected');
	if (replyInThread && !hasReply) {
		const replyBtnLi = document.createElement('div');
		replyBtnLi.className = 'c-menu_item__li slack-extended-reply-menu-injected';
		replyInThread.parentElement?.insertBefore(replyBtnLi, replyInThread);
		const root = createRoot(replyBtnLi);
		root.render(<ReplyMenuButton onClick={() => handleReplyClick(replyBtnLi)} />);
	}

	// Avoid duplicate injection for copy
	const hasCopy = !!menu.querySelector('.slack-extended-copy-menu-injected');
	if (copyLink && !hasCopy) {
		const copyBtnLi = document.createElement('div');
		copyBtnLi.className = 'c-menu_item__li slack-extended-copy-menu-injected';
		copyLink.parentElement?.insertBefore(copyBtnLi, copyLink);
		const root = createRoot(copyBtnLi);
		root.render(<CopyMenuButton onClick={() => handleCopyClick(copyBtnLi)} />);
	}
}

function scanForMenus() {
	const menus = document.querySelectorAll('.c-menu.p-message_actions_menu');
	menus.forEach(injectContextMenuButtons);
}

const handleMutations = (mutations: MutationRecord[]) => {
	for (const m of mutations) {
		if (!m.addedNodes || m.addedNodes.length === 0) continue;
		for (const node of m.addedNodes) {
			if (!isElement(node)) continue;
			const el = node as Element;
			if (el.matches && el.matches('.c-menu.p-message_actions_menu')) {
				injectContextMenuButtons(el);
			}
			const nested = el.querySelectorAll ? el.querySelectorAll('.c-menu.p-message_actions_menu') : [];
			nested.forEach(injectContextMenuButtons);
		}
	}
};

function startObserver() {
	const obs = new MutationObserver(handleMutations);
	obs.observe(document.documentElement, { childList: true, subtree: true });
}

scanForMenus();
startObserver();

export {};
