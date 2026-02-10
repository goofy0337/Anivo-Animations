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
  const rotateCircleRef = useRef(null);
  const moveAxesRef = useRef(null);
  const cameraControlsRef = useRef({ isDragging: false, previousMousePosition: { x: 0, y: 0 } });
  
  const [projectTitle, setProjectTitle] = useState(project?.title || 'New Project');
  const [projectDescription, setProjectDescription] = useState(project?.description || '');
  const [selectedObject, setSelectedObject] = useState(null);
  const [saving, setSaving] = useState(false);
  const [objects, setObjects] = useState([]);
  const [transformMode, setTransformMode] = useState('move'); // 'move', 'rotate', 'scale'
  const [gizmoMode, setGizmoMode] = useState('move'); // 'move' or 'rotate'
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasKeyframe, setHasKeyframe] = useState(false);

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

    // Mouse controls
    const onMouseDown = (event) => {
      if (event.button === 2) { // Right mouse button for camera
        cameraControlsRef.current.isDragging = true;
        cameraControlsRef.current.previousMousePosition = { x: event.clientX, y: event.clientY };
      } else if (event.button === 0) { // Left mouse button
        handleMouseInteraction(event, 'down');
      }
    };

    const onMouseMove = (event) => {
      if (cameraControlsRef.current.isDragging) {
        const deltaX = event.clientX - cameraControlsRef.current.previousMousePosition.x;
        const deltaY = event.clientY - cameraControlsRef.current.previousMousePosition.y;

        const speed = 0.01;
        const currentDistance = camera.position.length();
        
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(camera.position);
        
        spherical.theta -= deltaX * speed;
        spherical.phi -= deltaY * speed;
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

        camera.position.setFromSpherical(spherical);
        camera.lookAt(0, 0, 0);

        cameraControlsRef.current.previousMousePosition = { x: event.clientX, y: event.clientY };
      } else {
        handleMouseInteraction(event, 'move');
      }
    };

    const onMouseUp = () => {
      cameraControlsRef.current.isDragging = false;
      handleMouseInteraction(null, 'up');
    };

    const onWheel = (event) => {
      event.preventDefault();
      const zoomSpeed = 0.5;
      const direction = camera.position.clone().normalize();
      const distance = camera.position.length();
      const newDistance = Math.max(1, Math.min(50, distance + (event.deltaY > 0 ? zoomSpeed : -zoomSpeed)));
      camera.position.copy(direction.multiplyScalar(newDistance));
      camera.lookAt(0, 0, 0);
    };

    renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  const addObjectToScene = (objData) => {
    const scene = sceneRef.current;
    let mesh;

    switch (objData.type) {
      case 'cube':
        mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: objData.color || 0x00d4ff }));
        break;
      case 'sphere':
        mesh = new THREE.Mesh(new THREE.SphereGeometry(0.75, 32, 32), new THREE.MeshStandardMaterial({ color: objData.color || 0x00ff00 }));
        break;
      case 'cylinder':
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 32), new THREE.MeshStandardMaterial({ color: objData.color || 0xff00ff }));
        break;
      default:
        return;
    }

    if (objData.position) mesh.position.fromArray(objData.position);
    if (objData.rotation) mesh.rotation.fromArray(objData.rotation);
    if (objData.scale) mesh.scale.fromArray(objData.scale);

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    objectsRef.current.push({ mesh, type: objData.type, name: objData.name || 'Object' });
  };

  const createMoveGizmo = (object) => {
    if (moveAxesRef.current) {
      sceneRef.current.remove(moveAxesRef.current);
    }

    const gizmo = new THREE.Group();
    const axisLength = 2;

    // X axis - Red
    const xGeometry = new THREE.ConeGeometry(0.15, 0.4, 8);
    const xMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const xCone = new THREE.Mesh(xGeometry, xMaterial);
    xCone.position.set(axisLength, 0, 0);
    xCone.rotation.z = Math.PI / 2;
    xCone.userData = { axis: 'x' };
    gizmo.add(xCone);

    const xLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(axisLength, 0, 0)]),
      new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 3 })
    );
    gizmo.add(xLine);

    // Y axis - Green
    const yGeometry = new THREE.ConeGeometry(0.15, 0.4, 8);
    const yMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const yCone = new THREE.Mesh(yGeometry, yMaterial);
    yCone.position.set(0, axisLength, 0);
    yCone.userData = { axis: 'y' };
    gizmo.add(yCone);

    const yLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, axisLength, 0)]),
      new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 })
    );
    gizmo.add(yLine);

    // Z axis - Blue
    const zGeometry = new THREE.ConeGeometry(0.15, 0.4, 8);
    const zMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff });
    const zCone = new THREE.Mesh(zGeometry, zMaterial);
    zCone.position.set(0, 0, axisLength);
    zCone.rotation.y = Math.PI / 2;
    zCone.userData = { axis: 'z' };
    gizmo.add(zCone);

    const zLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, axisLength)]),
      new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 3 })
    );
    gizmo.add(zLine);

    gizmo.position.copy(object.position);
    sceneRef.current.add(gizmo);
    moveAxesRef.current = gizmo;
  };

  const createRotateCircle = (object) => {
    if (rotateCircleRef.current) {
      sceneRef.current.remove(rotateCircleRef.current);
    }

    const circleGeometry = new THREE.TorusGeometry(1.5, 0.1, 16, 64);
    const circleMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });
    const circle = new THREE.Mesh(circleGeometry, circleMaterial);
    circle.position.copy(object.position);
    circle.userData = { isRotateCircle: true };
    sceneRef.current.add(circle);
    rotateCircleRef.current = circle;
  };

  const handleMouseInteraction = (event, type) => {
    if (!selectedObject) return;

    const scene = sceneRef.current;
    const camera = cameraRef.current;

    if (type === 'down' && event) {
      if (gizmoMode === 'move' && moveAxesRef.current) {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(moveAxesRef.current.children, true);

        if (intersects.length > 0) {
          const axis = intersects[0].object.userData.axis;
          if (axis) {
            cameraControlsRef.current.gizmoDragging = axis;
            cameraControlsRef.current.previousMousePosition = { x: event.clientX, y: event.clientY };
          }
        }
      }
    }

    if (type === 'move' && event && cameraControlsRef.current.gizmoDragging) {
      const axis = cameraControlsRef.current.gizmoDragging;
      const deltaX = event.clientX - cameraControlsRef.current.previousMousePosition.x;
      const deltaY = event.clientY - cameraControlsRef.current.previousMousePosition.y;
      const speed = 0.01;

      if (axis === 'x') selectedObject.position.x += deltaX * speed;
      if (axis === 'y') selectedObject.position.y -= deltaY * speed;
      if (axis === 'z') selectedObject.position.z -= deltaY * speed;

      if (moveAxesRef.current) {
        moveAxesRef.current.position.copy(selectedObject.position);
      }

      cameraControlsRef.current.previousMousePosition = { x: event.clientX, y: event.clientY };
    }

    if (type === 'up') {
      cameraControlsRef.current.gizmoDragging = null;
    }
  };

  const handleObjectSelection = (event) => {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, cameraRef.current);

    const intersects = raycaster.intersectObjects(sceneRef.current.children, true);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object;
      const foundObject = objectsRef.current.find(o => o.mesh === clickedMesh);

      if (foundObject) {
        // Clear previous selection
        if (selectedObject) {
          selectedObject.material.emissive.setHex(0x000000);
        }

        // Select new object
        setSelectedObject(foundObject.mesh);
        foundObject.mesh.material.emissive.setHex(0xffff00);
        setSelectedIndex(objectsRef.current.indexOf(foundObject));

        // Show gizmo based on current mode
        if (gizmoMode === 'move') {
          createMoveGizmo(foundObject.mesh);
        } else {
          createRotateCircle(foundObject.mesh);
        }

        // Check if this object has keyframe at current frame
        const objKeyframes = keyframesRef.current[objectsRef.current.indexOf(foundObject)];
        setHasKeyframe(objKeyframes && objKeyframes[currentFrame] ? true : false);
      }
    }
  };

  const addKeyframe = () => {
    if (!selectedObject || selectedIndex === null) return;

    if (!keyframesRef.current[selectedIndex]) {
      keyframesRef.current[selectedIndex] = {};
    }

    keyframesRef.current[selectedIndex][currentFrame] = {
      position: selectedObject.position.toArray(),
      rotation: [selectedObject.rotation.x, selectedObject.rotation.y, selectedObject.rotation.z],
      scale: selectedObject.scale.toArray(),
    };

    setHasKeyframe(true);
  };

  const playAnimation = () => {
    setIsPlaying(true);
    let frame = currentFrame;

    const animLoop = setInterval(() => {
      frame++;
      if (frame > 120) frame = 0;

      Object.keys(keyframesRef.current).forEach((objIdx) => {
        const obj = objectsRef.current[parseInt(objIdx)];
        if (!obj) return;

        const kfs = keyframesRef.current[parseInt(objIdx)];
        const frames = Object.keys(kfs).map(Number).sort((a, b) => a - b);

        if (frames.length >= 2) {
          for (let i = 0; i < frames.length - 1; i++) {
            if (frame >= frames[i] && frame <= frames[i + 1]) {
              const t = (frame - frames[i]) / (frames[i + 1] - frames[i]);
              const kf1 = kfs[frames[i]];
              const kf2 = kfs[frames[i + 1]];

              obj.mesh.position.lerpVectors(
                new THREE.Vector3(...kf1.position),
                new THREE.Vector3(...kf2.position),
                t
              );

              obj.mesh.scale.lerpVectors(
                new THREE.Vector3(...kf1.scale),
                new THREE.Vector3(...kf2.scale),
                t
              );
            }
          }
        }
      });

      setCurrentFrame(frame);
    }, 1000 / 30);

    setTimeout(() => {
      clearInterval(animLoop);
      setIsPlaying(false);
    }, 120 * 1000 / 30);
  };

  const addObject = (type) => {
    const scene = sceneRef.current;
    let geometry, material, mesh;

    switch (type) {
      case 'cube':
        geometry = new THREE.BoxGeometry(1, 1, 1);
        material = new THREE.MeshStandardMaterial({ color: 0x00d4ff });
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(0.75, 32, 32);
        material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
        material = new THREE.MeshStandardMaterial({ color: 0xff00ff });
        break;
      default:
        return;
    }

    mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    objectsRef.current.push({ mesh, type, name: type.charAt(0).toUpperCase() + type.slice(1) });
    setObjects([...objectsRef.current.map((o, i) => ({ ...o, id: i }))]);
  };

  const deleteObject = (index) => {
    const scene = sceneRef.current;
    const obj = objectsRef.current[index];
    scene.remove(obj.mesh);
    objectsRef.current.splice(index, 1);
    setObjects([...objectsRef.current.map((o, i) => ({ ...o, id: i }))]);
    setSelectedObject(null);
    setSelectedIndex(null);

    if (moveAxesRef.current) {
      scene.remove(moveAxesRef.current);
      moveAxesRef.current = null;
    }
    if (rotateCircleRef.current) {
      scene.remove(rotateCircleRef.current);
      rotateCircleRef.current = null;
    }
  };

  const saveProject = async () => {
    setSaving(true);
    try {
      const projectData = {
        objects: objectsRef.current.map(o => ({
          type: o.type,
          name: o.name,
          position: o.mesh.position.toArray(),
          rotation: [o.mesh.rotation.x, o.mesh.rotation.y, o.mesh.rotation.z],
          scale: o.mesh.scale.toArray(),
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
    } catch (err) {
      alert('Failed to save project');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="editor-container">
      <div className="editor-viewport" ref={mountRef}>
        <div className="viewport-help">
          🖱 Right-click + drag: Rotate | Scroll: Zoom | 🎬 Frame: {currentFrame}
        </div>
      </div>

      <div className="editor-sidebar">
        {/* Project Info */}
        <div className="sidebar-section">
          <h3>📋 Project</h3>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              placeholder="Project title"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Project description"
            ></textarea>
          </div>
        </div>

        {/* Add Objects */}
        <div className="sidebar-section">
          <h3>📦 Add Objects</h3>
          <div className="button-grid">
            <button className="btn-add" onClick={() => addObject('cube')}>Cube</button>
            <button className="btn-add" onClick={() => addObject('sphere')}>Sphere</button>
            <button className="btn-add" onClick={() => addObject('cylinder')}>Cylinder</button>
          </div>
        </div>

        {/* Gizmo Controls */}
        <div className="sidebar-section">
          <h3>🔄 Gizmo</h3>
          <div className="button-grid">
            <button
              className={`btn-add ${gizmoMode === 'move' ? 'active' : ''}`}
              onClick={() => {
                setGizmoMode('move');
                if (selectedObject) createMoveGizmo(selectedObject);
              }}
            >
              Move
            </button>
            <button
              className={`btn-add ${gizmoMode === 'rotate' ? 'active' : ''}`}
              onClick={() => {
                setGizmoMode('rotate');
                if (selectedObject) createRotateCircle(selectedObject);
              }}
            >
              Rotate
            </button>
          </div>
        </div>

        {/* Timeline */}
        <div className="sidebar-section">
          <h3>🎬 Timeline</h3>
          <div className="timeline-controls">
            <button
              className={`btn-play ${isPlaying ? 'playing' : ''}`}
              onClick={playAnimation}
              disabled={isPlaying}
            >
              ▶ Play
            </button>
            <button
              className={`btn-keyframe ${hasKeyframe ? 'active' : ''}`}
              onClick={addKeyframe}
              disabled={!selectedObject}
            >
              + Keyframe
            </button>
          </div>
          <div className="frame-display">
            <label>Frame: {currentFrame}</label>
            <input
              type="range"
              min="0"
              max="120"
              value={currentFrame}
              onChange={(e) => setCurrentFrame(parseInt(e.target.value))}
              className="frame-slider"
            />
          </div>
        </div>

        {/* Objects List */}
        <div className="sidebar-section">
          <h3>📦 Objects</h3>
          <div className="objects-list">
            {objects.map((obj, index) => (
              <div
                key={index}
                className={`object-item ${selectedIndex === index ? 'selected' : ''}`}
                onClick={() => {
                  if (selectedObject) selectedObject.material.emissive.setHex(0x000000);
                  setSelectedObject(obj.mesh);
                  obj.mesh.material.emissive.setHex(0xffff00);
                  setSelectedIndex(index);
                  if (gizmoMode === 'move') {
                    createMoveGizmo(obj.mesh);
                  } else {
                    createRotateCircle(obj.mesh);
                  }
                }}
              >
                {obj.name}
              </div>
            ))}
          </div>
          <button
            className="btn-delete"
            onClick={() => selectedIndex !== null && deleteObject(selectedIndex)}
            disabled={selectedIndex === null}
          >
            Delete Selected
          </button>
        </div>

        {/* Save */}
        <button
          className="btn-save"
          onClick={saveProject}
          disabled={saving}
        >
          {saving ? 'Saving...' : '💾 Save Project'}
        </button>

        {/* Back */}
        <button className="btn-back" onClick={onBack}>
          ← Back
        </button>
      </div>
    </div>
  );
}

export default Editor3D;
