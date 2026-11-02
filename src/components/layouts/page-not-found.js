import { Link } from 'react-router-dom';

export default function NotFoundLayout({ data }) {
  return (
    <div className="App w3-theme-l5">
      <header className="w3-bar w3-theme-d2 w3-large">
        <Link to="/" className="w3-bar-item w3-button w3-padding-large">{data.siteName}</Link>
      </header>
      <main className="w3-container w3-content w3-padding-32">
        <div className="w3-card w3-round w3-white w3-container w3-padding-32">
          <h1>{data.title}</h1>
          <div dangerouslySetInnerHTML={{ __html: data.text }} />
          <p><Link to="/">{data.homeLabel}</Link></p>
          {data.sections.length > 0 && (
            <nav aria-label={data.sectionsLabel}>
              <h2>{data.sectionsLabel}</h2>
              <ul className="w3-ul">{data.sections.map(section => (
                <li key={section.path}><Link to={section.path}>{section.title}</Link></li>
              ))}</ul>
            </nav>
          )}
        </div>
      </main>
    </div>
  );
}
