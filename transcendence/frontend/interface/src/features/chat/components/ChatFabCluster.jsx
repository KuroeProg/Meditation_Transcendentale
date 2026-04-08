import '../styles/Chat.css'

export default function ChatFabCluster({
	onOpenChat,
	textUnread,
	inviteUnread,
	toast,
	onToastClick,
	onToastDismiss,
}) {
	const showMsg = textUnread > 0
	const showInv = inviteUnread > 0

	return (
		<div className={`chat-fab-cluster${toast ? ' chat-fab-cluster--toast' : ''}`}>
			<div className="chat-fab-cluster__rail">
				{toast && (
					<button
						type="button"
						className="chat-fab-toast"
						onClick={() => onToastClick?.(toast)}
					>
						<span className="chat-fab-toast-title">{toast.title}</span>
						<span className="chat-fab-toast-sub">{toast.subtitle}</span>
					</button>
				)}
				<button
					className="chat-fab"
					type="button"
					onClick={() => {
						if (toast) onToastDismiss?.()
						onOpenChat?.()
					}}
					aria-label="Ouvrir le chat"
				>
					<i className="ri-chat-3-line" />
					{showInv && (
						<span className="chat-fab-badge chat-fab-badge--invite" title="Invitations">
							{inviteUnread > 99 ? '99+' : inviteUnread}
						</span>
					)}
					{showMsg && (
						<span
							className={`chat-fab-badge chat-fab-badge--msg${showInv ? ' chat-fab-badge--pair' : ''}`}
							title="Messages non lus"
						>
							{textUnread > 99 ? '99+' : textUnread}
						</span>
					)}
				</button>
			</div>
		</div>
	)
}
