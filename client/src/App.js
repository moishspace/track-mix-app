// App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import './App.css';

const App = () => {
  const [isAuthorized, setIsAuthorized] = useState(false);

  return (
    <Router>
      <div className="app-container">
        {/* Only the Router component here, no additional title/description */}
        <Routes>
          <Route
            path="/"
            element={<Home isAuthorized={isAuthorized} setIsAuthorized={setIsAuthorized} />}
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;