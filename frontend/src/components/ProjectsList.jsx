import React, { useState, useEffect } from 'react';
import { projectAPI } from '../api/api';
import './ProjectsList.css';

function ProjectsList({ onSelectProject, onCreateNew, onGoToShop }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingProject, setEditingProject] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await projectAPI.getProjects();
        setProjects(res.data);
      } catch (err) {
        setError('Failed to load projects');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const handleEdit = (project) => {
    setEditingProject(project.id);
    setEditTitle(project.title);
    setEditDescription(project.description || '');
  };

  const handleSaveEdit = async (projectId) => {
    try {
      await projectAPI.updateProject(projectId, editTitle, editDescription, projects.find(p => p.id === projectId).data);
      setProjects(projects.map(p =>
        p.id === projectId
          ? { ...p, title: editTitle, description: editDescription }
          : p
      ));
      setEditingProject(null);
    } catch (err) {
      alert('Failed to update project');
    }
  };

  const handleDelete = async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await projectAPI.deleteProject(projectId);
        setProjects(projects.filter(p => p.id !== projectId));
      } catch (err) {
        alert('Failed to delete project');
      }
    }
  };

  if (loading) {
    return <div className="projects-loading">Loading projects...</div>;
  }

  return (
    <div className="projects-container">
      <div className="projects-header">
        <h2>My Projects</h2>
        <button className="btn-new-project" onClick={onCreateNew}>
          + New Project
        </button>
        <button className="btn-shop" onClick={onGoToShop} title="Visit the shop to buy items">
          🛍️ Shop
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {editingProject && (
        <div className="modal-overlay" onClick={() => setEditingProject(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Project</h3>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Project title"
              className="modal-input"
            />
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Project description"
              className="modal-textarea"
            ></textarea>
            <div className="modal-actions">
              <button
                className="btn-save"
                onClick={() => handleSaveEdit(editingProject)}
              >
                Save
              </button>
              <button
                className="btn-cancel"
                onClick={() => setEditingProject(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="empty-state">
          <p>No projects yet. Create a new one to get started!</p>
          <button className="btn-new-project" onClick={onCreateNew}>
            Create New Project
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((project) => (
            <div key={project.id} className="project-card">
              <div className="project-content">
                <h3>{project.title}</h3>
                <p className="project-description">
                  {project.description || 'No description'}
                </p>
                <p className="project-date">
                  Created: {new Date(project.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="project-actions">
                <button
                  className="btn-open"
                  onClick={() => onSelectProject(project)}
                >
                  Open
                </button>
                <button
                  className="btn-edit"
                  onClick={() => handleEdit(project)}
                >
                  Edit
                </button>
                <button
                  className="btn-delete-project"
                  onClick={() => handleDelete(project.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProjectsList;
