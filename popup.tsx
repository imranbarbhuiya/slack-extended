import { useStorage } from '@plasmohq/storage/hook';

import { DEFAULT_SETTINGS } from '~util/settings';

import { version } from './package.json';

import './popup.css';

function App() {
	const [enableReplyButton, setEnableReplyButton] = useStorage<boolean>(
		'enableReplyButton',
		DEFAULT_SETTINGS.enableReplyButton,
	);
	const [enableCopyButton, setEnableCopyButton] = useStorage<boolean>(
		'enableCopyButton',
		DEFAULT_SETTINGS.enableCopyButton,
	);
	const [enableSkipForm, setEnableSkipForm] = useStorage<boolean>('enableSkipForm', DEFAULT_SETTINGS.enableSkipForm);
	const [replyFormat, setReplyFormat] = useStorage<'quote' | 'codeblock'>('replyFormat', DEFAULT_SETTINGS.replyFormat);
	const [saving, setSaving] = useStorage<boolean>('saving', false);

	const resetSettings = async () => {
		if (!confirm('Are you sure you want to reset all settings to default?')) return;
		setSaving(true);
		try {
			setEnableReplyButton(DEFAULT_SETTINGS.enableReplyButton);
			setEnableCopyButton(DEFAULT_SETTINGS.enableCopyButton);
			setEnableSkipForm(DEFAULT_SETTINGS.enableSkipForm);
			setReplyFormat(DEFAULT_SETTINGS.replyFormat);
		} catch (error) {
			console.error('Failed to reset settings:', error);
		} finally {
			setSaving(false);
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
					<h3>Features</h3>
					<div className="setting">
						<label className="toggle">
							<input
								type="checkbox"
								checked={enableReplyButton}
								onChange={(e) => setEnableReplyButton(e.target.checked)}
								disabled={saving}
							/>
							<span className="toggle-slider"></span>
							<span className="toggle-label">Reply Button</span>
						</label>
						<p className="setting-description">Add quote reply button to messages</p>
					</div>
					<div className="setting">
						<label className="toggle">
							<input
								type="checkbox"
								checked={enableCopyButton}
								onChange={(e) => setEnableCopyButton(e.target.checked)}
								disabled={saving}
							/>
							<span className="toggle-slider"></span>
							<span className="toggle-label">Copy Button</span>
						</label>
						<p className="setting-description">Add copy message button to messages</p>
					</div>
					<div className="setting">
						<label className="toggle">
							<input
								type="checkbox"
								checked={enableSkipForm}
								onChange={(e) => setEnableSkipForm(e.target.checked)}
								disabled={saving}
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
										type="radio"
										name="replyFormat"
										value="quote"
										checked={replyFormat === 'quote'}
										onChange={(e) => setReplyFormat(e.target.value as 'quote')}
										disabled={saving}
									/>
									<span className="radio-label">Quote Reply</span>
								</label>
								<p className="setting-description">Format replies with quote</p>
								<label className="radio">
									<input
										type="radio"
										name="replyFormat"
										value="codeblock"
										checked={replyFormat === 'codeblock'}
										onChange={(e) => setReplyFormat(e.target.value as 'codeblock')}
										disabled={saving}
									/>
									<span className="radio-label">Codeblock Reply</span>
								</label>
								<p className="setting-description">Format replies with a code block</p>
							</div>
						</div>
					</div>
				)}
			</div>
			<div className="footer">
				<button className="reset-btn" onClick={resetSettings} disabled={saving}>
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
