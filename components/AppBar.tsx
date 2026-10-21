import LogoutButton from '@/components/LogoutButton';

// Top bar of the signed-in pages and the login/register pages. Pass `email` to show the
// user box with the sign-out button.
export default function AppBar({ label = 'with Maria', email }: { label?: string; email?: string }) {
  return (
    <header className="admin__bar">
      <div className="container pad-x admin__bar-inner">
        <span className="nav__logo">
          <span className="mark" aria-hidden="true"></span>
          <span>Knowledge Connect<small>{label}</small></span>
        </span>
        {email !== undefined && (
          <div className="admin__user" id="user-box">
            <span id="user-email">{email}</span>
            <LogoutButton />
          </div>
        )}
      </div>
    </header>
  );
}
