// VS Code treats a .js file as JavaScript even when it contains JSX, so the javascript parser reads JSX too.
export function WelcomeBanner({ visitorName }) {
  return <h1 className="banner">Welcome back, {visitorName}!</h1>;
}
