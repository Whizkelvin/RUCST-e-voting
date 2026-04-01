// Enhanced UI for the Home Page

import React from 'react';
import './Home.css'; // Assuming a CSS file for styles

const HomePage = () => {
  return (
    <div className="home-container">
      <header className="home-header">
        <h1 className="title">Welcome to E-Voting</h1>
        <nav className="navbar">
          <ul>
            <li><a href="#features">Features</a></li>
            <li><a href="#support">Support</a></li>
          </ul>
        </nav>
      </header>
      <main className="content">
        <section className="features" id="features">
          <h2 className="section-title">Features</h2>
          <p>Explore the various features of our e-voting platform with enhanced animations.</p>
        </section>
        <section className="error-handling">
          <h2 className="section-title">Error Handling</h2>
          <p>Improved error handling provides clear, accessible feedback to users.</p>
        </section>
        <section className="loading-state">
          <h2 className="section-title">Loading States</h2>
          <p>Loading animations provide feedback during data retrieval.</p>
        </section>
      </main>
      <footer className="home-footer">
        <p>© 2026 E-Voting Inc. | <a href="#support">Support Links</a></p>
      </footer>
    </div>
  );
};

export default HomePage;

/* CSS Styles (Home.css) */
.home-container {
  font-family: 'Arial', sans-serif;
  padding: 20px;
  animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.home-header {
  text-align: center;
}

.title {
  font-size: 2.5em;
  color: #4CAF50;
}

.navbar ul {
  list-style-type: none;
  padding: 0;
}

.navbar li {
  display: inline;
  margin: 0 15px;
}

.content {
  margin: 20px 0;
}

.section-title {
  font-size: 1.8em;
  margin-bottom: 10px;
}

.home-footer {
  text-align: center;
  margin-top: 20px;
}