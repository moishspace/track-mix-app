// App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Home from './pages/Home';
import './App.css';
import { CssBaseline } from '@mui/material';

// Minimal theme setup
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
});

const App = () => {
  const [isAuthorized, setIsAuthorized] = useState(false);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <div className="app-container">
          <Routes>
            <Route
              path="/"
              element={<Home isAuthorized={isAuthorized} setIsAuthorized={setIsAuthorized} />}
            />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
};

export default App;