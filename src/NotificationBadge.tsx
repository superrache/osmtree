import './NotificationBadge.css'

type NotificationCount = {
    count: number
}

const NotificationBadge = ({count}: NotificationCount) => {
    if (count <= 0) return null

    return (
        <div className="notification_badge">
            {count}
        </div>
    )
}

export default NotificationBadge
