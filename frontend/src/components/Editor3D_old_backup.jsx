import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { projectAPI } from '../api/api';
import './Editor3D.css';

function Editor3D({ project, onBack }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const objectsRef = useRef([]);
  const cameraControlsRef = useRef({ isDragging: false, previousMousePosition: { x: 0, y: 0 } });
  const [projectTitle, setProjectTitle] = useState(project?.title || 'New Project');
  const [projectDescription, setProjectDescription] = useState(project?.description || '');
  const [selectedObject, setSelectedObject] = useState(null);
  const [saving, setSaving] = useState(false);
  const [objects, setObjects] = useState([]);
  const [transformMode, setTransformMode] = useState('move'); // 'move', 'rotate', 'scale'
  const [selectedIndex, setSelectedIndex] = useState(null);

  // Initialize Three.js scene
  useEffect(() => {
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 5, 8);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Grid helper
    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Load project data if editing
    if (project?.data) {
      const data = typeof project.data === 'string' ? JSON.parse(project.data) : project.data;
      if (data.objects) {
        data.objects.forEach(obj => addObjectToScene(obj));
      }
    } else {
      // Add default cube
      const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
      const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x00d4ff });
      const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
      cube.castShadow = true;
      cube.receiveShadow = true;
      scene.add(cube);
      objectsRef.current.push({ mesh: cube, type: 'cube', name: 'Cube' });
      setObjects([...objectsRef.current.map((o, i) => ({ ...o, id: i }))]);
    }

    // Mouse controls for camera
    const onMouseDown = (event) => {
      if (event.button === 2) { // Right mouse button for camera
        cameraControlsRef.current.isDragging = true;
        cameraControlsRef.current.previousMousePosition = { x: event.clientX, y: event.clientY };
      } else if (event.button === 0) { // Left mouse button for selection
        handleObjectSelection(event);
      }
    };

    const onMouseMove = (event) => {
      if (cameraControlsRef.current.isDragging) {
        const deltaX = event.clientX - cameraControlsRef.current.previousMousePosition.x;
        const deltaY = event.clientY - cameraControlsRef.current.previousMousePosition.y;

        const speed = 0.01;
        const currentDistance = camera.position.length();
        
        // Rotate camera around origin
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(camera.position);
        
        spherical.theta -= deltaX * speed;
        spherical.phi -= deltaY * speed;
        
        // Clamp phi to avoid flipping
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
        
        camera.position.setFromSpherical(spherical);
        camera.lookAt(0, 0, 0);

        cameraControlsRef.current.previousMousePosition = { x: event.clientX, y: event.clientY };
      }
    };

    const onMouseUp = () => {
      cameraControlsRef.current.isDragging = false;
    };

    const onContextMenu = (event) => {
      event.preventDefault();
    };

    // Selection function
    const handleObjectSelection = (event) => {
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      mouse.x = (event.clientX / width) * 2 - 1;
      mouse.y = -(event.clientY / height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children);

      if (intersects.length > 0) {
        const selected = intersects[0].object;
        const idx = objectsRef.current.findIndex(o => o.mesh === selected);
        
        if (idx !== -1) {
          if (selectedObject && selectedObject.material) {
            selectedObject.material.emissive.setHex(0x000000);
          }
          selected.material.emissive.setHex(0xffff00);
          setSelectedObject(selected);
          setSelectedIndex(idx);
        }
      } else {
        if (selectedObject && selectedObject.material) {
          selectedObject.material.emissive.setHex(0x000000);
        }
        setSelectedObject(null);
        setSelectedIndex(null);
      }
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('contextmenu', onContextMenu);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  const addObjectToScene = (objData) => {
    let geometry;
    const material = new THREE.MeshStandardMaterial({
      color: objData.color || 0x00d4ff,
    });

    switch (objData.type) {
      case 'cube':
        geometry = new THREE.BoxGeometry(1, 1, 1);
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(0.5, 32, 32);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
        break;
      case 'cone':
        geometry = new THREE.ConeGeometry(0.5, 1, 32);
        break;
      case 'torus':
        geometry = new THREE.TorusGeometry(0.5, 0.2, 16, 100);
        break;
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(objData.position?.x || 0, objData.position?.y || 0, objData.position?.z || 0);
    mesh.rotation.set(objData.rotation?.x || 0, objData.rotation?.y || 0, objData.rotation?.z || 0);
    mesh.scale.set(objData.scale?.x || 1, objData.scale?.y || 1, objData.scale?.z || 1);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    sceneRef.current.add(mesh);
    objectsRef.current.push({ mesh, type: objData.type, name: `${objData.type.charAt(0).toUpperCase() + objData.type.slice(1)} ${objectsRef.current.length}` });
    setObjects([...objectsRef.current.map((o, i) => ({ ...o, id: i }))]);
  };

  const addObject = (type) => {
    addObjectToScene({ type, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } });
  };

  const deleteSelected = () => {
    if (selectedObject && selectedIndex !== null) {
      sceneRef.current.remove(selectedObject);
      objectsRef.current = objectsRef.current.filter((_, i) => i !== selectedIndex);
      setObjects([...objectsRef.current.map((o, i) => ({ ...o, id: i }))]);
      setSelectedObject(null);
      setSelectedIndex(null);
    }
  };

  const transformObject = (axis, value) => {
    if (selectedObject && selectedIndex !== null) {
      const obj = objectsRef.current[selectedIndex];
      
      if (transformMode === 'move') {
        obj.mesh.position[axis] = parseFloat(value);
      } else if (transformMode === 'rotate') {
        obj.mesh.rotation[axis] = parseFloat(value);
      } else if (transformMode === 'scale') {
        obj.mesh.scale[axis] = parseFloat(value);
      }
    }
  };

  const saveProject = async () => {
    setSaving(true);
    try {
      const projectData = {
        objects: objectsRef.current.map(o => ({
          type: o.type,
          position: { x: o.mesh.position.x, y: o.mesh.position.y, z: o.mesh.position.z },
          rotation: { x: o.mesh.rotation.x, y: o.mesh.rotation.y, z: o.mesh.rotation.z },
          scale: { x: o.mesh.scale.x, y: o.mesh.scale.y, z: o.mesh.scale.z },
          color: o.mesh.material.color.getHex(),
        })),
      };

      if (project?.id) {
        await projectAPI.updateProject(project.id, projectTitle, projectDescription, projectData);
      } else {
        await projectAPI.createProject(projectTitle, projectDescription);
      }
      alert('Project saved successfully!');
    } catch (error) {
      alert('Error saving project: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="editor-container">
      <div className="editor-viewport" ref={mountRef}>
        <div className="viewport-help">
          <small>Right-click + Drag to rotate camera | Left-click to select object</small>
        </div>
      </div>

      <div className="editor-sidebar">
        <div className="sidebar-section">
          <h3>Project</h3>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              rows="3"
            ></textarea>
          </div>
          <button className="btn-save" onClick={saveProject} disabled={saving}>
            {saving ? 'Saving...' : 'Save Project'}
          </button>
        </div>

        <div className="sidebar-section">
          <h3>Add Objects</h3>
          <div className="button-grid">
            <button className="btn-add" onClick={() => addObject('cube')}>
              Cube
            </button>
            <button className="btn-add" onClick={() => addObject('sphere')}>
              Sphere
            </button>
            <button className="btn-add" onClick={() => addObject('cylinder')}>
              Cylinder
            </button>
            <button className="btn-add" onClick={() => addObject('cone')}>
              Cone
            </button>
            <button className="btn-add" onClick={() => addObject('torus')}>
              Torus
            </button>
          </div>
        </div>

        {selectedObject && selectedIndex !== null && (
          <div className="sidebar-section">
            <h3>Transform</h3>
            <div className="transform-modes">
              <button 
                className={`mode-btn ${transformMode === 'move' ? 'active' : ''}`}
                onClick={() => setTransformMode('move')}
              >
                Move
              </button>
              <button 
                className={`mode-btn ${transformMode === 'rotate' ? 'active' : ''}`}
                onClick={() => setTransformMode('rotate')}
              >
                Rotate
              </button>
              <button 
                className={`mode-btn ${transformMode === 'scale' ? 'active' : ''}`}
                onClick={() => setTransformMode('scale')}
              >
                Scale
              </button>
            </div>

            <div className="transform-controls">
              <div className="transform-axis">
                <label>X</label>
                <input
                  type="number"
                  step="0.1"
                  value={
                    transformMode === 'move' ? selectedObject.position.x :
                    transformMode === 'rotate' ? selectedObject.rotation.x :
                    selectedObject.scale.x
                  }
                  onChange={(e) => transformObject('x', e.target.value)}
                />
              </div>
              <div className="transform-axis">
                <label>Y</label>
                <input
                  type="number"
                  step="0.1"
                  value={
                    transformMode === 'move' ? selectedObject.position.y :
                    transformMode === 'rotate' ? selectedObject.rotation.y :
                    selectedObject.scale.y
                  }
                  onChange={(e) => transformObject('y', e.target.value)}
                />
              </div>
              <div className="transform-axis">
                <label>Z</label>
                <input
                  type="number"
                  step="0.1"
                  value={
                    transformMode === 'move' ? selectedObject.position.z :
                    transformMode === 'rotate' ? selectedObject.rotation.z :
                    selectedObject.scale.z
                  }
                  onChange={(e) => transformObject('z', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        <div className="sidebar-section">
          <h3>Objects</h3>
          <div className="objects-list">
            {objects.map((obj, idx) => (
              <div
                key={idx}
                className={`object-item ${selectedIndex === idx ? 'selected' : ''}`}
                onClick={() => {
                  if (selectedObject && selectedObject.material) {
                    selectedObject.material.emissive.setHex(0x000000);
                  }
                  obj.mesh.material.emissive.setHex(0xffff00);
                  setSelectedObject(obj.mesh);
                  setSelectedIndex(idx);
                }}
              >
                {obj.name}
              </div>
            ))}
          </div>
          {selectedObject && (
            <button className="btn-delete" onClick={deleteSelected}>
              Delete Selected
            </button>
          )}
        </div>

        <button className="btn-back" onClick={onBack}>
          Back to Projects
        </button>
      </div>
    </div>
  );
}

export default Editor3D;
