import { useStorage } from '@plasmohq/storage/hook';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { DEFAULT_SETTINGS, type MentionType } from '../util/settings';
import {
	ATTR,
	createMentionEntity,
	escapeMentions,
	findClosestMessageContainer,
	getActiveComposer,
	getAuthorInfo,
	getPermalink,
	insertIntoComposer,
	isElement,
	readMessageText,
	readSelectedTextWithin,
	SELECTORS,
} from '../util/shared';

import type { PlasmoCSConfig } from 'plasmo';

export const config: PlasmoCSConfig = {
	matches: ['https://app.slack.com/*', 'https://*.slack.com/*'],
	run_at: 'document_idle',
};

async function handleReplyClick(actionsGroup: Element, replyFormat: MentionType) {
	try {
		const messageEl = findClosestMessageContainer(actionsGroup);
		if (!messageEl) return;
		const { userId, name } = getAuthorInfo(messageEl);
		const displayName = name ?? 'user';
		const selected = readSelectedTextWithin(messageEl);
		const fullText = selected || readMessageText(messageEl);
		if (!fullText) return;
		const contextElement = messageEl;

		const maxLineLength = 100;
		let line = fullText.trim().split(/\r?\n/).join(' ');
		if (!line.length) return;
		if (line.length > maxLineLength) line = line.slice(0, maxLineLength) + '...';

		if (replyFormat === 'link') {
			const permalink = getPermalink(messageEl);
			insertIntoComposer(`▸ [Reply to](${permalink}) @${displayName}\n`, contextElement);
		} else if (replyFormat === 'codeblock') {
			insertIntoComposer('▸ Replying to ', contextElement);
			await createMentionEntity(displayName, userId, contextElement);
			insertIntoComposer(':\n```\n', contextElement);
			insertIntoComposer(line, contextElement);
			insertIntoComposer('\n```\n\n', contextElement);
		} else {
			const permalink = getPermalink(messageEl);
			line = escapeMentions(line);
			insertIntoComposer('> ', contextElement);
			insertIntoComposer(line + '\n', contextElement);
			if (permalink) {
				insertIntoComposer(`[View Message](${permalink})\n\n`, contextElement);

				const composer = getActiveComposer(contextElement);

				if (composer) {
					const observer = new MutationObserver((mutations) => {
						for (const mutation of mutations) {
							if (mutation.addedNodes.length > 0) {
								const removeBtn = document.querySelector(
									'button.p-draft_unfurls__remove_btn[aria-label="Remove link preview"]',
								);
								if (removeBtn && removeBtn instanceof HTMLButtonElement) {
									removeBtn.click();
									observer.disconnect();
									return;
								}
							}
						}
					});

					observer.observe(document.body, {
						childList: true,
						subtree: true,
					});

					setTimeout(() => observer.disconnect(), 5_000);
				}
			}
			await createMentionEntity(displayName, userId, contextElement);
			insertIntoComposer(' ', contextElement);
		}
	} catch {}
}

function ReplyButton({ onClick }: { readonly onClick: () => void }) {
	return (
		<button
			aria-label="Quote reply"
			className="c-button-unstyled c-icon_button c-icon_button--size_small c-message_actions__button c-icon_button--default"
			data-qa={ATTR.replyButtonQa}
			onClick={onClick}
			style={{ cursor: 'pointer' }}
			title="Quote reply"
			type="button"
		>
			<svg
				aria-hidden="true"
				data-hlc="true"
				data-qa="reply-message"
				fill="none"
				height="20"
				viewBox="0 0 20 20"
				width="20"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					clipRule="evenodd"
					d="M9.543 2.56C9.40757 2.50237 9.25818 2.48587 9.11343 2.51254C8.96869 2.53922 8.83499 2.60789 8.729 2.71L1.729 9.46C1.65641 9.52996 1.59868 9.61384 1.55924 9.70662C1.51981 9.7994 1.49948 9.89919 1.49948 10C1.49948 10.1008 1.51981 10.2006 1.55924 10.2934C1.59868 10.3862 1.65641 10.47 1.729 10.54L8.729 17.29C8.83493 17.3923 8.96864 17.4612 9.11344 17.488C9.25824 17.5148 9.40774 17.4984 9.54327 17.4408C9.67881 17.3832 9.7944 17.287 9.87562 17.1641C9.95684 17.0413 10.0001 16.8973 10 16.75V13.5H14C15.352 13.5 16.05 13.889 16.43 14.332C16.83 14.797 17 15.465 17 16.25C17 16.4489 17.079 16.6397 17.2197 16.7803C17.3603 16.921 17.5511 17 17.75 17C17.9489 17 18.1397 16.921 18.2803 16.7803C18.421 16.6397 18.5 16.4489 18.5 16.25V14C18.5 11.406 17.918 9.46 16.5 8.191C15.102 6.941 13.056 6.5 10.5 6.5H10V3.25C10 2.95 9.82 2.677 9.543 2.56ZM16.948 12.79C16.223 12.278 15.247 12 14 12H9.25C9.05109 12 8.86032 12.079 8.71967 12.2197C8.57902 12.3603 8.5 12.5511 8.5 12.75V14.985L3.33 10L8.5 5.015V7.25C8.5 7.44891 8.57902 7.63968 8.71967 7.78033C8.86032 7.92098 9.05109 8 9.25 8H10.5C12.944 8 14.523 8.434 15.5 9.309C16.284 10.011 16.79 11.097 16.948 12.79Z"
					fill="currentColor"
					fillRule="evenodd"
				/>
			</svg>
		</button>
	);
}

function CopyButton({ onClick }: { readonly onClick: () => void }) {
	const [copied, setCopied] = useState(false);
	useEffect(() => {
		if (!copied) return;
		const timeout = setTimeout(() => setCopied(false), 1_200);
		return () => clearTimeout(timeout);
	}, [copied]);

	return (
		<button
			aria-label={copied ? 'Copied!' : 'Copy message'}
			className="c-button-unstyled c-icon_button c-icon_button--size_small c-message_actions__button c-icon_button--default"
			data-qa={ATTR.copyButtonQa}
			onClick={() => {
				onClick();
				setCopied(true);
			}}
			style={copied ? { color: '#2eb67d', transition: 'color 0.2s' } : { cursor: 'pointer' }}
			title={copied ? 'Copied!' : 'Copy message'}
			type="button"
		>
			{copied ? (
				<svg aria-hidden="true" focusable="false" height="0.9em" viewBox="0 0 20 20" width="0.9em">
					<path
						d="M7.629 14.629a1 1 0 0 1-1.414 0l-3.243-3.243a1 1 0 1 1 1.414-1.414l2.536 2.536 6.536-6.536a1 1 0 1 1 1.414 1.414l-7.243 7.243Z"
						fill="currentColor"
					/>
				</svg>
			) : (
				<svg aria-hidden="true" focusable="false" height="0.9em" viewBox="0 0 20 20" width="0.9em">
					<path
						d="M6 2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H6Zm0 2h8v10H6V4Zm-2 4a1 1 0 0 0-1 1v7a2 2 0 0 0 2 2h7a1 1 0 1 0 0-2H5V9a1 1 0 0 0-1-1Z"
						fill="currentColor"
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
	void navigator.clipboard.writeText(fullText);
}

function injectReactReplyButton(
	actionsGroup: Element,
	enableReplyButton: boolean,
	enableCopyButton: boolean,
	replyFormat: MentionType,
) {
	if (!actionsGroup || !isElement(actionsGroup)) return;
	if (!enableReplyButton && !enableCopyButton) return;
	const existingReply = actionsGroup.querySelector(`[data-qa="${ATTR.replyButtonQa}"]`);
	const existingCopy = actionsGroup.querySelector(`[data-qa="${ATTR.copyButtonQa}"]`);

	const replyExists = !enableReplyButton || Boolean(existingReply);
	const copyExists = !enableCopyButton || Boolean(existingCopy);
	if (replyExists && copyExists) return;
	const prevContainers = actionsGroup.querySelectorAll('span[data-slack-extended-reply-container]');
	for (const el of prevContainers) el.remove();
	const btnContainer = document.createElement('span');
	btnContainer.setAttribute('data-slack-extended-reply-container', 'true');
	btnContainer.style.display = 'inline-flex';
	btnContainer.style.alignItems = 'center';
	const lastButton = actionsGroup.lastElementChild;
	if (lastButton) actionsGroup.insertBefore(btnContainer, lastButton);
	else actionsGroup.appendChild(btnContainer);

	const root = createRoot(btnContainer);
	root.render(
		<>
			{enableReplyButton && <ReplyButton onClick={() => handleReplyClick(actionsGroup, replyFormat)} />}
			{enableCopyButton && <CopyButton onClick={() => handleCopyClick(actionsGroup)} />}
		</>,
	);
}

function scanInitial(enableReplyButton: boolean, enableCopyButton: boolean, replyFormat: MentionType) {
	const groups = document.querySelectorAll(SELECTORS.actionsGroup);
	for (const group of groups) injectReactReplyButton(group, enableReplyButton, enableCopyButton, replyFormat);
}

function makeHandleMutations(enableReplyButton: boolean, enableCopyButton: boolean, replyFormat: MentionType) {
	return (mutations: MutationRecord[]) => {
		for (const m of mutations) {
			if (!m.addedNodes?.length) continue;
			for (const node of m.addedNodes) {
				if (!isElement(node)) continue;
				const el = node;

				if (el.matches?.(SELECTORS.actionsGroup))
					injectReactReplyButton(el, enableReplyButton, enableCopyButton, replyFormat);

				const nested = el.querySelectorAll ? el.querySelectorAll(SELECTORS.actionsGroup) : null;
				if (nested) for (const g of nested) injectReactReplyButton(g, enableReplyButton, enableCopyButton, replyFormat);
			}
		}
	};
}

function startObserver(enableReplyButton: boolean, enableCopyButton: boolean, replyFormat: MentionType) {
	const obs = new MutationObserver(makeHandleMutations(enableReplyButton, enableCopyButton, replyFormat));
	obs.observe(document.documentElement, { childList: true, subtree: true });
}

function ensureReplySoonForMessage(
	messageEl: Element,
	enableReplyButton: boolean,
	enableCopyButton: boolean,
	replyFormat: MentionType,
) {
	let attempts = 8;
	function tick() {
		const group = messageEl.querySelector(SELECTORS.actionsGroup);
		if (group) {
			injectReactReplyButton(group, enableReplyButton, enableCopyButton, replyFormat);
			return;
		}
		if (attempts-- > 0) requestAnimationFrame(tick);
	}
	tick();
}

export default function ActionMenuExtended() {
	const [enableReplyButton] = useStorage<boolean>('enableReplyButton', DEFAULT_SETTINGS.enableReplyButton);
	const [enableCopyButton] = useStorage<boolean>('enableCopyButton', DEFAULT_SETTINGS.enableCopyButton);
	const [replyFormat] = useStorage<MentionType>('replyFormat', DEFAULT_SETTINGS.replyFormat);

	useEffect(() => {
		if (!enableReplyButton && !enableCopyButton) return;

		const mouseHandler = (e: Event) => {
			const target = e.target as Element;
			if (
				!(target instanceof Element) ||
				target.closest(`[data-qa="${ATTR.replyButtonQa}"], [data-qa="${ATTR.copyButtonQa}"]`) ||
				target.closest('span[data-slack-extended-reply-container]')
			)
				return;

			const message = target.closest(SELECTORS.messageContainer);
			if (message) ensureReplySoonForMessage(message, enableReplyButton, enableCopyButton, replyFormat);
		};
		document.addEventListener('mouseenter', mouseHandler, true);
		scanInitial(enableReplyButton, enableCopyButton, replyFormat);
		startObserver(enableReplyButton, enableCopyButton, replyFormat);

		return () => {
			document.removeEventListener('mouseenter', mouseHandler, true);
		};
	}, [enableReplyButton, enableCopyButton, replyFormat]);
}
