export type MentionType = 'quote' | 'codeblock' | 'link';

export const DEFAULT_SETTINGS = {
	enableReplyButton: true,
	enableCopyButton: true,
	enableSkipForm: false,
	moveReplyToTop: false,
	replyFormat: 'codeblock' as MentionType,
};
