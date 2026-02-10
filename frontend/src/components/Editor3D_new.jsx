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
  const keyframesRef = useRef({});
  const gizmoRef = useRef(null);
  const cameraControlsRef = useRef({ isDragging: false, previousMousePosition: { x: 0, y: 0 } });
  const [projectTitle, setProjectTitle] = useState(project?.title || 'New Project');
  const [projectDescription, setProjectDescription] = useState(project?.description || '');
  const [selectedObject, setSelectedObject] = useState(null);
  const [saving, setSaving] = useState(false);
  const [objects, setObjects] = useState([]);
  const [transformMode, setTransformMode] = useState('move');
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [keyframes, setKeyframes] = useState({});
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bones, setBones] = useState([]);
  const [maxFrame, setMaxFrame] = useState(300);
  const animationRef = useRef(null);

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
      if (data.keyframes) {
        keyframesRef.current = data.keyframes;
        setKeyframes(data.keyframes);
      }
    } else {
      const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
      const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x00d4ff });
      const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
      cube.castShadow = true;
      cube.receiveShadow = true;
      scene.add(cube);
      objectsRef.current.push({ mesh: cube, type: 'cube', name: 'Cube' });
      setObjects([...objectsRef.current.map((o, i) => ({ ...o, id: i }))]);
    }

    // Transform Gizmo
    const createGizmo = () => {
      const gizmo = new THREE.Group();
      
      const axisLength = 1.5;
      
      // X axis (Red)
      const xGeom = new THREE.ConeGeometry(0.1, 0.4, 8);
      const xMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const xCone = new THREE.Mesh(xGeom, xMat);
      xCone.position.x = axisLength;
      xCone.rotation.z = Math.PI / 2;
      xCone.userData.axis = 'x';
      gizmo.add(xCone);

      // Y axis (Green)
      const yGeom = new THREE.ConeGeometry(0.1, 0.4, 8);
      const yMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const yCone = new THREE.Mesh(yGeom, yMat);
      yCone.position.y = axisLength;
      yCone.userData.axis = 'y';
      gizmo.add(yCone);

      // Z axis (Blue)
      const zGeom = new THREE.ConeGeometry(0.1, 0.4, 8);
      const zMat = new THREE.MeshBasicMaterial({ color: 0x0000ff });
      const zCone = new THREE.Mesh(zGeom, zMat);
      zCone.position.z = axisLength;
      zCone.rotation.x = -Math.PI / 2;
      zCone.userData.axis = 'z';
      gizmo.add(zCone);

      gizmo.visible = false;
      scene.add(gizmo);
      return gizmo;
    };

    gizmoRef.current = createGizmo();

    // Mouse controls
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let gizmoDragging = null;

    const onMouseDown = (event) => {
      if (event.button === 2) {
        cameraControlsRef.current.isDragging = true;
        cameraControlsRef.current.previousMousePosition = { x: event.clientX, y: event.clientY };
      } else if (event.button === 0) {
        mouse.x = (event.clientX / width) * 2 - 1;
        mouse.y = -(event.clientY / height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const gizmoIntersects = raycaster.intersectObjects(gizmoRef.current.children);

        if (gizmoIntersects.length > 0 && selectedObject) {
          gizmoDragging = gizmoIntersects[0].object.userData.axis;
        } else {
          const sceneIntersects = raycaster.intersectObjects(scene.children);
          if (sceneIntersects.length > 0) {
            const selected = sceneIntersects[0].object;
            const idx = objectsRef.current.findIndex(o => o.mesh === selected);
            
            if (idx !== -1) {
              if (selectedObject && selectedObject.material) {
                selectedObject.material.emissive.setHex(0x000000);
              }
              selected.material.emissive.setHex(0xffff00);
              setSelectedObject(selected);
              setSelectedIndex(idx);
              gizmoRef.current.position.copy(selected.position);
              gizmoRef.current.visible = true;
            }
          }
        }
      }
    };

    const onMouseMove = (event) => {
      if (cameraControlsRef.current.isDragging) {
        const deltaX = event.clientX - cameraControlsRef.current.previousMousePosition.x;
        const deltaY = event.clientY - cameraControlsRef.current.previousMousePosition.y;

        const speed = 0.01;
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(camera.position);
        
        spherical.theta -= deltaX * speed;
        spherical.phi -= deltaY * speed;
        
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
        
        camera.position.setFromSpherical(spherical);
        camera.lookAt(0, 0, 0);

        cameraControlsRef.current.previousMousePosition = { x: event.clientX, y: event.clientY };
      } else if (gizmoDragging && selectedObject) {
        const raycasterMove = new THREE.Raycaster();
        const mouseMove = new THREE.Vector2();
        
        mouseMove.x = (event.clientX / width) * 2 - 1;
        mouseMove.y = -(event.clientY / height) * 2 + 1;
        
        raycasterMove.setFromCamera(mouseMove, camera);
        
        const plane = new THREE.Plane();
        const normal = new THREE.Vector3();
        
        if (gizmoDragging === 'x') normal.set(1, 0, 0);
        else if (gizmoDragging === 'y') normal.set(0, 1, 0);
        else if (gizmoDragging === 'z') normal.set(0, 0, 1);
        
        plane.setFromNormalAndCoplanarPoint(normal, selectedObject.position);
        
        const intersection = new THREE.Vector3();
        raycasterMove.ray.intersectPlane(plane, intersection);
        
        if (intersection) {
          if (gizmoDragging === 'x') selectedObject.position.x = intersection.x;
          else if (gizmoDragging === 'y') selectedObject.position.y = intersection.y;
          else if (gizmoDragging === 'z') selectedObject.position.z = intersection.z;
          
          gizmoRef.current.position.copy(selectedObject.position);
        }
      }
    };

    const onMouseUp = () => {
      cameraControlsRef.current.isDragging = false;
      gizmoDragging = null;
    };

    const onContextMenu = (event) => {
      event.preventDefault();
    };

    const onWheel = (event) => {
      event.preventDefault();
      const direction = camera.position.clone().normalize();
      const distance = camera.position.length();
      const newDistance = distance + (event.deltaY > 0 ? 1 : -1);
      
      if (newDistance > 1 && newDistance < 100) {
        camera.position.copy(direction.multiplyScalar(newDistance));
      }
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('contextmenu', onContextMenu);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

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
      renderer.domElement.removeEventListener('wheel', onWheel);
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
      gizmoRef.current.visible = false;
    }
  };

  const transformObject = (axis, value) => {
    if (selectedObject && selectedIndex !== null) {
      const obj = objectsRef.current[selectedIndex];
      
      if (transformMode === 'move') {
        obj.mesh.position[axis] = parseFloat(value);
        gizmoRef.current.position.copy(obj.mesh.position);
      } else if (transformMode === 'rotate') {
        obj.mesh.rotation[axis] = parseFloat(value);
      } else if (transformMode === 'scale') {
        obj.mesh.scale[axis] = parseFloat(value);
      }
    }
  };

  const addKeyframe = () => {
    if (selectedIndex === null) return;
    
    const objId = selectedIndex;
    if (!keyframesRef.current[objId]) {
      keyframesRef.current[objId] = {};
    }

    const obj = objectsRef.current[objId];
    keyframesRef.current[objId][currentFrame] = {
      position: obj.mesh.position.clone(),
      rotation: new THREE.Euler(obj.mesh.rotation.x, obj.mesh.rotation.y, obj.mesh.rotation.z),
      scale: obj.mesh.scale.clone(),
    };

    setKeyframes({ ...keyframesRef.current });
  };

  const playAnimation = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      let frame = currentFrame;
      const maxFrameVal = Math.max(...Object.values(keyframesRef.current).map(kf => Math.max(...Object.keys(kf).map(Number), 0)), 300);

      const animLoop = setInterval(() => {
        if (frame > maxFrameVal) {
          setIsPlaying(false);
          clearInterval(animLoop);
          frame = 0;
          setCurrentFrame(0);
          return;
        }

        setCurrentFrame(frame);

        Object.keys(keyframesRef.current).forEach(objId => {
          const idx = parseInt(objId);
          if (idx < objectsRef.current.length) {
            const obj = objectsRef.current[idx].mesh;
            const kfs = keyframesRef.current[objId];
            const frames = Object.keys(kfs).map(Number).sort((a, b) => a - b);

            for (let i = 0; i < frames.length - 1; i++) {
              if (frame >= frames[i] && frame <= frames[i + 1]) {
                const f1 = frames[i];
                const f2 = frames[i + 1];
                const t = (frame - f1) / (f2 - f1);

                obj.position.lerpVectors(kfs[f1].position, kfs[f2].position, t);
                obj.scale.lerpVectors(kfs[f1].scale, kfs[f2].scale, t);
              }
            }
          }
        });

        frame++;
      }, 1000 / 30);

      animationRef.current = animLoop;
    } else {
      setIsPlaying(false);
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    }
  };

  const importModel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      
      try {
        const lines = text.split('\n');
        let vertices = [];
        let faces = [];

        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          if (parts[0] === 'v') {
            vertices.push(new THREE.Vector3(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])));
          } else if (parts[0] === 'f') {
            const face = [];
            for (let i = 1; i < parts.length; i++) {
              const indices = parts[i].split('/');
              face.push(parseInt(indices[0]) - 1);
            }
            faces.push(face);
          }
        });

        if (vertices.length > 0) {
          const geometry = new THREE.BufferGeometry();
          const positionArray = new Float32Array(vertices.length * 3);
          vertices.forEach((v, i) => {
            positionArray[i * 3] = v.x;
            positionArray[i * 3 + 1] = v.y;
            positionArray[i * 3 + 2] = v.z;
          });
          geometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));

          const indices = [];
          faces.forEach(face => {
            for (let i = 1; i < face.length - 1; i++) {
              indices.push(face[0], face[i], face[i + 1]);
            }
          });
          geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
          geometry.computeVertexNormals();

          const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          sceneRef.current.add(mesh);
          objectsRef.current.push({ mesh, type: 'imported', name: file.name.replace('.obj', '') });
          setObjects([...objectsRef.current.map((o, i) => ({ ...o, id: i }))]);

          alert('Model imported successfully!');
        }
      } catch (error) {
        alert('Error importing model: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  const zoomToObject = () => {
    if (selectedObject) {
      const bbox = new THREE.Box3().setFromObject(selectedObject);
      const center = bbox.getCenter(new THREE.Vector3());
      const size = bbox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = cameraRef.current.fov * (Math.PI / 180);
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

      cameraRef.current.position.copy(center);
      cameraRef.current.position.z += cameraZ;
      cameraRef.current.lookAt(center);
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
        keyframes: keyframesRef.current,
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
          <small>Right-click + Drag: Rotate | Scroll: Zoom | Left-click: Select | Drag Gizmo Arrows: Move</small>
        </div>
      </div>

      <div className="editor-sidebar">
        <div className="sidebar-section">
          <h3>⚙️ Project</h3>
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
              rows="2"
            ></textarea>
          </div>
          <button className="btn-save" onClick={saveProject} disabled={saving}>
            {saving ? 'Saving...' : '💾 Save Project'}
          </button>
        </div>

        <div className="sidebar-section">
          <h3>📦 Import Model</h3>
          <input
            type="file"
            accept=".obj"
            onChange={importModel}
            className="file-input"
          />
          <small style={{ color: '#999', marginTop: '5px', display: 'block' }}>
            Supports OBJ format (includes rigged models)
          </small>
        </div>

        <div className="sidebar-section">
          <h3>🎬 Timeline & Animation</h3>
          <div className="timeline-controls">
            <button className={`btn-play ${isPlaying ? 'playing' : ''}`} onClick={playAnimation}>
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <button className="btn-keyframe" onClick={addKeyframe} disabled={selectedIndex === null}>
              + Keyframe
            </button>
          </div>
          <div className="frame-display">
            <label>Frame: <strong>{currentFrame}</strong>/{maxFrame}</label>
            <input
              type="range"
              min="0"
              max={maxFrame}
              value={currentFrame}
              onChange={(e) => setCurrentFrame(parseInt(e.target.value))}
              className="frame-slider"
            />
          </div>
          {keyframes && Object.keys(keyframes).length > 0 && (
            <div className="keyframes-display">
              <small style={{ color: '#00d4ff' }}>Keyframes set:</small>
              {Object.entries(keyframes).map(([objId, frames]) => (
                <div key={objId} className="keyframe-item">
                  <small>Object {objId}: Frames {Object.keys(frames).sort((a, b) => Number(a) - Number(b)).join(', ')}</small>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sidebar-section">
          <h3>➕ Add Objects</h3>
          <div className="button-grid">
            <button className="btn-add" onClick={() => addObject('cube')}>📦 Cube</button>
            <button className="btn-add" onClick={() => addObject('sphere')}>🔵 Sphere</button>
            <button className="btn-add" onClick={() => addObject('cylinder')}>🥫 Cylinder</button>
            <button className="btn-add" onClick={() => addObject('cone')}>🔺 Cone</button>
            <button className="btn-add" onClick={() => addObject('torus')}>🍩 Torus</button>
          </div>
        </div>

        {selectedObject && selectedIndex !== null && (
          <div className="sidebar-section">
            <h3>🔄 Transform</h3>
            <button className="btn-zoom" onClick={zoomToObject}>
              📷 Zoom to Object
            </button>
            <div className="transform-modes">
              <button 
                className={`mode-btn ${transformMode === 'move' ? 'active' : ''}`}
                onClick={() => setTransformMode('move')}
              >
                ↔️ Move
              </button>
              <button 
                className={`mode-btn ${transformMode === 'rotate' ? 'active' : ''}`}
                onClick={() => setTransformMode('rotate')}
              >
                🔃 Rotate
              </button>
              <button 
                className={`mode-btn ${transformMode === 'scale' ? 'active' : ''}`}
                onClick={() => setTransformMode('scale')}
              >
                📏 Scale
              </button>
            </div>

            <div className="transform-controls">
              <div className="transform-axis">
                <label style={{ color: '#ff6666' }}>X</label>
                <input
                  type="number"
                  step="0.1"
                  value={
                    transformMode === 'move' ? selectedObject.position.x.toFixed(2) :
                    transformMode === 'rotate' ? selectedObject.rotation.x.toFixed(2) :
                    selectedObject.scale.x.toFixed(2)
                  }
                  onChange={(e) => transformObject('x', e.target.value)}
                />
              </div>
              <div className="transform-axis">
                <label style={{ color: '#66ff66' }}>Y</label>
                <input
                  type="number"
                  step="0.1"
                  value={
                    transformMode === 'move' ? selectedObject.position.y.toFixed(2) :
                    transformMode === 'rotate' ? selectedObject.rotation.y.toFixed(2) :
                    selectedObject.scale.y.toFixed(2)
                  }
                  onChange={(e) => transformObject('y', e.target.value)}
                />
              </div>
              <div className="transform-axis">
                <label style={{ color: '#6666ff' }}>Z</label>
                <input
                  type="number"
                  step="0.1"
                  value={
                    transformMode === 'move' ? selectedObject.position.z.toFixed(2) :
                    transformMode === 'rotate' ? selectedObject.rotation.z.toFixed(2) :
                    selectedObject.scale.z.toFixed(2)
                  }
                  onChange={(e) => transformObject('z', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        <div className="sidebar-section">
          <h3>🎯 Objects</h3>
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
                  gizmoRef.current.position.copy(obj.mesh.position);
                  gizmoRef.current.visible = true;
                }}
              >
                {obj.name}
              </div>
            ))}
          </div>
          {selectedObject && selectedIndex !== null && (
            <button className="btn-delete" onClick={deleteSelected}>
              🗑️ Delete Selected
            </button>
          )}
        </div>

        <button className="btn-back" onClick={onBack}>
          ← Back to Projects
        </button>
      </div>
    </div>
  );
}

export default Editor3D;
