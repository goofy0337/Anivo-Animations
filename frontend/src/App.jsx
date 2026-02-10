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
  const [purchasedItem, setPurchasedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentProject, setCurrentProject] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const timeout = setTimeout(() => {
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
        .catch(() => {
          clearTimeout(timeout);
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

  if (loading) return <div className="loading">Loading...</div>;

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
            onPurchase={(item) => {
              // store purchased item and open editor to place it
              setPurchasedItem(item);
              setPage('editor');
            }}
          />
        )}

        {page === 'editor' && user && (
          <Editor3D
            project={currentProject}
            user={user}
            purchasedItem={purchasedItem}
            onSpawned={() => setPurchasedItem(null)}
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
