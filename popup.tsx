import { useStorage } from '@plasmohq/storage/hook';
import { useEffect, useState } from 'react';
import { bundledThemes } from 'shiki';

import { DEFAULT_SETTINGS } from '~util/settings';

import { version } from './package.json';

import './popup.css';

function App() {
	const [enableSyntaxHighlight, setEnableSyntaxHighlight] = useStorage<boolean>(
		'enableSyntaxHighlight',
		DEFAULT_SETTINGS.enableSyntaxHighlight ?? true,
	);
	const [syntaxHighlightTheme, setSyntaxHighlightTheme] = useStorage<string>(
		'syntaxHighlightTheme',
		DEFAULT_SETTINGS.syntaxHighlightTheme ?? 'github-dark',
	);
	const [themeOptions, setThemeOptions] = useState<string[]>([]);

	useEffect(() => {
		setThemeOptions(Object.keys(bundledThemes));
	}, []);
	const [enableReplyButton, setEnableReplyButton] = useStorage<boolean>(
		'enableReplyButton',
		DEFAULT_SETTINGS.enableReplyButton,
	);
	const [enableCopyButton, setEnableCopyButton] = useStorage<boolean>(
		'enableCopyButton',
		DEFAULT_SETTINGS.enableCopyButton,
	);
	const [enableSkipForm, setEnableSkipForm] = useStorage<boolean>('enableSkipForm', DEFAULT_SETTINGS.enableSkipForm);
	const [replyFormat, setReplyFormat] = useStorage<'quote' | 'codeblock' | 'link'>(
		'replyFormat',
		DEFAULT_SETTINGS.replyFormat,
	);
	const [moveReplyToTop, setMoveReplyToTop] = useStorage<boolean>(
		'moveReplyToTop',
		DEFAULT_SETTINGS.moveReplyToTop ?? false,
	);
	const [saving, setSaving] = useStorage<boolean>('saving', false);

	const resetSettings = async () => {
		if (!confirm('Are you sure you want to reset all settings to default?')) return;
		void setSaving(true);
		try {
			void setEnableReplyButton(DEFAULT_SETTINGS.enableReplyButton);
			void setEnableCopyButton(DEFAULT_SETTINGS.enableCopyButton);
			void setEnableSkipForm(DEFAULT_SETTINGS.enableSkipForm);
			void setReplyFormat(DEFAULT_SETTINGS.replyFormat);
			void setMoveReplyToTop(DEFAULT_SETTINGS.moveReplyToTop ?? false);
		} catch (error) {
			console.error('Failed to reset settings:', error);
		} finally {
			void setSaving(false);
		}
	};

	return (
		<div className="popup">
			<div className="header">
				<h1>Slack Extended</h1>
				<p className="version">v{version}</p>
			</div>
			<div className="settings">
				<div className="section">
					<div className="setting">
						<label className="toggle">
							<input
								checked={enableSyntaxHighlight}
								disabled={saving}
								onChange={(e) => setEnableSyntaxHighlight(e.target.checked)}
								type="checkbox"
							/>
							<span className="toggle-slider"></span>
							<span className="toggle-label">Syntax Highlight</span>
						</label>
						<p className="setting-description">Highlight code blocks in Slack messages</p>
					</div>
					{enableSyntaxHighlight && (
						<div className="setting">
							<label className="toggle-label" htmlFor="syntaxHighlightTheme" style={{ marginBottom: 4 }}>
								Theme
							</label>
							<select
								disabled={saving}
								id="syntaxHighlightTheme"
								onChange={(e) => setSyntaxHighlightTheme(e.target.value)}
								style={{ width: '100%', marginTop: 4 }}
								value={syntaxHighlightTheme}
							>
								{themeOptions.map((theme) => (
									<option key={theme} value={theme}>
										{theme}
									</option>
								))}
							</select>
						</div>
					)}
					<h3>Features</h3>
					<div className="setting">
						<label className="toggle">
							<input
								checked={enableReplyButton}
								disabled={saving}
								onChange={(e) => setEnableReplyButton(e.target.checked)}
								type="checkbox"
							/>
							<span className="toggle-slider"></span>
							<span className="toggle-label">Reply Button</span>
						</label>
						<p className="setting-description">Add quote reply button to messages</p>
					</div>
					<div className="setting">
						<label className="toggle">
							<input
								checked={enableCopyButton}
								disabled={saving}
								onChange={(e) => setEnableCopyButton(e.target.checked)}
								type="checkbox"
							/>
							<span className="toggle-slider"></span>
							<span className="toggle-label">Copy Button</span>
						</label>
						<p className="setting-description">Add copy message button to messages</p>
					</div>
					<div className="setting">
						<label className="toggle">
							<input
								checked={enableSkipForm}
								disabled={saving}
								onChange={(e) => setEnableSkipForm(e.target.checked)}
								type="checkbox"
							/>
							<span className="toggle-slider"></span>
							<span className="toggle-label">Skip Forms</span>
						</label>
						<p className="setting-description">Automatically skip Slack form dialogs</p>
					</div>
				</div>
				{enableReplyButton && (
					<div className="section">
						<h3>Reply Format</h3>
						<div className="setting">
							<div className="radio-group">
								<label className="radio">
									<input
										checked={replyFormat === 'quote'}
										disabled={saving}
										name="replyFormat"
										onChange={(e) => setReplyFormat(e.target.value as 'quote')}
										type="radio"
										value="quote"
									/>
									<span className="radio-label">Quote Reply</span>
								</label>
								<p className="setting-description">Format replies with quote</p>
								<label className="radio">
									<input
										checked={replyFormat === 'codeblock'}
										disabled={saving}
										name="replyFormat"
										onChange={(e) => setReplyFormat(e.target.value as 'codeblock')}
										type="radio"
										value="codeblock"
									/>
									<span className="radio-label">Codeblock Reply</span>
								</label>
								<p className="setting-description">Format replies with a code block</p>
								<label className="radio">
									<input
										checked={replyFormat === 'link'}
										disabled={saving}
										name="replyFormat"
										onChange={(e) => setReplyFormat(e.target.value as 'link')}
										type="radio"
										value="link"
									/>
									<span className="radio-label">Link Embed Reply</span>
								</label>
								<p className="setting-description">Format replies as a Slack embed with a link</p>
							</div>
						</div>
						{replyFormat === 'link' && (
							<div className="setting">
								<label className="toggle">
									<input
										checked={moveReplyToTop}
										disabled={saving}
										onChange={(e) => setMoveReplyToTop(e.target.checked)}
										type="checkbox"
									/>
									<span className="toggle-slider"></span>
									<span className="toggle-label">Move Reply To Top</span>
								</label>
								<p className="setting-description">Show the link embed at the top of the reply</p>
							</div>
						)}
					</div>
				)}
			</div>
			<div className="footer">
				<button className="reset-btn" disabled={saving} onClick={resetSettings} type="button">
					Reset to Defaults
				</button>
				{saving && <span className="saving-indicator">Saving...</span>}
			</div>
			{enableReplyButton && (
				<div className="info">
					<p>
						<strong>Note:</strong> You must have "Format messages with markup" enabled in Slack settings for reply
						formatting to work properly.
					</p>
				</div>
			)}
		</div>
	);
}

export default App;
