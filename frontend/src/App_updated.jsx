import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Signup from './components/Signup';
import Editor3D from './components/Editor3D';
import ProjectsList from './components/ProjectsList';
import Shop from './components/Shop';
import { authAPI } from './api/api';
import './App.css';

function App() {
  const [page, setPage] = useState('login');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentProject, setCurrentProject] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.warn('Loading timeout - clearing token');
      localStorage.removeItem('token');
      setLoading(false);
    }, 5000);

    if (token) {
      authAPI
        .getUser()
        .then((res) => {
          clearTimeout(timeout);
          setUser(res.data);
          setPage('projects');
          setLoading(false);
        })
        .catch((error) => {
          clearTimeout(timeout);
          console.error('Failed to get user:', error);
          localStorage.removeItem('token');
          setLoading(false);
        });
    } else {
      clearTimeout(timeout);
      setLoading(false);
    }
  }, []);

  const handleLoginSuccess = (token, user) => {
    localStorage.setItem('token', token);
    setUser(user);
    setPage('projects');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setCurrentProject(null);
    setPage('login');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app">
      {user && (
        <header className="app-header">
          <div className="header-left">
            <h1>3D Animation Editor</h1>
          </div>
          <div className="header-right">
            <span className="user-name">Welcome, {user.username}!</span>
            <button className="btn-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>
      )}

      <main>
        {page === 'login' && !user && (
          <Login
            onLoginSuccess={handleLoginSuccess}
            onSwitchToSignup={() => setPage('signup')}
          />
        )}

        {page === 'signup' && !user && (
          <Signup
            onSignupSuccess={handleLoginSuccess}
            onSwitchToLogin={() => setPage('login')}
          />
        )}

        {page === 'projects' && user && !currentProject && (
          <ProjectsList
            onSelectProject={(project) => {
              setCurrentProject(project);
              setPage('editor');
            }}
            onCreateNew={() => setPage('editor')}
            onGoToShop={() => setPage('shop')}
          />
        )}

        {page === 'shop' && user && (
          <Shop
            user={user}
            onBack={() => setPage('projects')}
            onPurchase={() => {}}
          />
        )}

        {page === 'editor' && user && (
          <Editor3D
            project={currentProject}
            onBack={() => {
              setCurrentProject(null);
              setPage('projects');
            }}
          />
        )}
      </main>
    </div>
  );
}

export default App;
