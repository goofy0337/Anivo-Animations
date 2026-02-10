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
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const moveAxesRef = useRef(null);
  const rotateCircleRef = useRef(null);
  
  const [projectTitle, setProjectTitle] = useState(project?.title || 'New Project');
  const [projectDescription, setProjectDescription] = useState(project?.description || '');
  const [selectedObject, setSelectedObject] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [gizmoMode, setGizmoMode] = useState('move');
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasKeyframe, setHasKeyframe] = useState(false);
  const [saving, setSaving] = useState(false);
  const [objects, setObjects] = useState([]);

  // Interaction state
  const interactionRef = useRef({
    cameraRotating: false,
    gizmoDragging: false,
    dragAxis: null,
    previousMouse: { x: 0, y: 0 }
  });

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a14);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 5, 8);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.pixelRatio = window.devicePixelRatio;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Grid
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Load project data
    if (project?.data) {
      const data = typeof project.data === 'string' ? JSON.parse(project.data) : project.data;
      if (data.objects) {
        data.objects.forEach((objData) => {
          addObjectToScene(objData);
        });
      }
      if (data.keyframes) {
        keyframesRef.current = data.keyframes;
      }
    } else {
      // Add default cube
      addObjectToScene({
        type: 'cube',
        name: 'Cube',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        color: 0x00d4ff
      });
    }

    // Mouse event handlers
    const onMouseDown = (event) => {
      if (event.button === 2) {
        // Right click - camera rotation
        interactionRef.current.cameraRotating = true;
        interactionRef.current.previousMouse = { x: event.clientX, y: event.clientY };
      } else if (event.button === 0) {
        // Left click - selection or gizmo drag
        handleClick(event);
      }
    };

    const onMouseMove = (event) => {
      if (interactionRef.current.cameraRotating) {
        handleCameraRotation(event);
      } else if (interactionRef.current.gizmoDragging && selectedObject) {
        handleGizmoDrag(event);
      }
    };

    const onMouseUp = () => {
      interactionRef.current.cameraRotating = false;
      interactionRef.current.gizmoDragging = false;
      interactionRef.current.dragAxis = null;
    };

    const onWheel = (event) => {
      event.preventDefault();
      const camera = cameraRef.current;
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

    // Handle window resize
    const handleResize = () => {
      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  const addObjectToScene = (objData) => {
    const scene = sceneRef.current;
    let mesh;

    switch (objData.type) {
      case 'cube':
        mesh = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshStandardMaterial({ color: objData.color || 0x00d4ff })
        );
        break;
      case 'sphere':
        mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.75, 32, 32),
          new THREE.MeshStandardMaterial({ color: objData.color || 0x00ff00 })
        );
        break;
      case 'cylinder':
        mesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5, 0.5, 1, 32),
          new THREE.MeshStandardMaterial({ color: objData.color || 0xff00ff })
        );
        break;
      default:
        return;
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (objData.position) mesh.position.fromArray(objData.position);
    if (objData.rotation) {
      mesh.rotation.x = objData.rotation[0];
      mesh.rotation.y = objData.rotation[1];
      mesh.rotation.z = objData.rotation[2];
    }
    if (objData.scale) mesh.scale.fromArray(objData.scale);

    scene.add(mesh);
    objectsRef.current.push({
      mesh,
      type: objData.type,
      name: objData.name || objData.type
    });
    setObjects([...objectsRef.current]);
  };

  const handleClick = (event) => {
    const canvas = rendererRef.current.domElement;
    const rect = canvas.getBoundingClientRect();

    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

    // First check if clicking on gizmo
    if (moveAxesRef.current || rotateCircleRef.current) {
      let gizmoObjects = [];
      if (moveAxesRef.current) {
        gizmoObjects = gizmoObjects.concat(moveAxesRef.current.children);
      }
      if (rotateCircleRef.current) {
        gizmoObjects.push(rotateCircleRef.current);
      }

      const gizmoIntersects = raycasterRef.current.intersectObjects(gizmoObjects, true);
      if (gizmoIntersects.length > 0) {
        const clicked = gizmoIntersects[0].object;
        
        if (clicked === rotateCircleRef.current) {
          interactionRef.current.gizmoDragging = true;
          interactionRef.current.dragAxis = 'rotate';
        } else {
          // Check which axis cone was clicked
          const parent = clicked.parent;
          if (parent === moveAxesRef.current) {
            interactionRef.current.gizmoDragging = true;
            interactionRef.current.dragAxis = clicked.userData.axis;
          }
        }

        interactionRef.current.previousMouse = { x: event.clientX, y: event.clientY };
        return;
      }
    }

    // Then check if clicking on objects
    const intersects = raycasterRef.current.intersectObjects(
      objectsRef.current.map(o => o.mesh),
      true
    );

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object;
      const foundIndex = objectsRef.current.findIndex(o => o.mesh === clickedMesh);

      if (foundIndex !== -1) {
        // Deselect previous
        if (selectedObject) {
          selectedObject.material.emissive.setHex(0x000000);
        }

        // Select new
        setSelectedObject(clickedMesh);
        clickedMesh.material.emissive.setHex(0xffff00);
        setSelectedIndex(foundIndex);

        // Create gizmo
        if (gizmoMode === 'move') {
          createMoveGizmo(clickedMesh);
        } else {
          createRotateCircle(clickedMesh);
        }

        // Check keyframe
        const objKeyframes = keyframesRef.current[foundIndex];
        setHasKeyframe(objKeyframes && objKeyframes[currentFrame] ? true : false);
      }
    }
  };

  const handleCameraRotation = (event) => {
    const deltaX = event.clientX - interactionRef.current.previousMouse.x;
    const deltaY = event.clientY - interactionRef.current.previousMouse.y;
    const speed = 0.005;

    const camera = cameraRef.current;
    const spherical = new THREE.Spherical();
    spherical.setFromVector3(camera.position);

    spherical.theta -= deltaX * speed;
    spherical.phi -= deltaY * speed;
    spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

    camera.position.setFromSpherical(spherical);
    camera.lookAt(0, 0, 0);

    interactionRef.current.previousMouse = { x: event.clientX, y: event.clientY };
  };

  const handleGizmoDrag = (event) => {
    if (!selectedObject) return;

    const deltaX = event.clientX - interactionRef.current.previousMouse.x;
    const deltaY = event.clientY - interactionRef.current.previousMouse.y;
    const speed = 0.02;

    if (interactionRef.current.dragAxis === 'x') {
      selectedObject.position.x += deltaX * speed;
    } else if (interactionRef.current.dragAxis === 'y') {
      selectedObject.position.y -= deltaY * speed;
    } else if (interactionRef.current.dragAxis === 'z') {
      selectedObject.position.z -= deltaY * speed;
    } else if (interactionRef.current.dragAxis === 'rotate') {
      selectedObject.rotation.y += deltaX * 0.01;
    }

    // Update gizmo position
    if (moveAxesRef.current) {
      moveAxesRef.current.position.copy(selectedObject.position);
    }
    if (rotateCircleRef.current) {
      rotateCircleRef.current.position.copy(selectedObject.position);
    }

    interactionRef.current.previousMouse = { x: event.clientX, y: event.clientY };
  };

  const createMoveGizmo = (object) => {
    const scene = sceneRef.current;

    if (moveAxesRef.current) {
      scene.remove(moveAxesRef.current);
    }

    const gizmo = new THREE.Group();
    const axisLength = 2;

    // X axis (red)
    const xMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000 });
    const xCone = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.5, 8), xMaterial);
    xCone.position.set(axisLength, 0, 0);
    xCone.rotation.z = Math.PI / 2;
    xCone.userData = { axis: 'x' };
    gizmo.add(xCone);

    const xLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(axisLength, 0, 0)
      ]),
      new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 3 })
    );
    gizmo.add(xLine);

    // Y axis (green)
    const yMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00 });
    const yCone = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.5, 8), yMaterial);
    yCone.position.set(0, axisLength, 0);
    yCone.userData = { axis: 'y' };
    gizmo.add(yCone);

    const yLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, axisLength, 0)
      ]),
      new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 })
    );
    gizmo.add(yLine);

    // Z axis (blue)
    const zMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff, emissive: 0x0000ff });
    const zCone = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.5, 8), zMaterial);
    zCone.position.set(0, 0, axisLength);
    zCone.rotation.y = Math.PI / 2;
    zCone.userData = { axis: 'z' };
    gizmo.add(zCone);

    const zLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, axisLength)
      ]),
      new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 3 })
    );
    gizmo.add(zLine);

    gizmo.position.copy(object.position);
    scene.add(gizmo);
    moveAxesRef.current = gizmo;
  };

  const createRotateCircle = (object) => {
    const scene = sceneRef.current;

    if (rotateCircleRef.current) {
      scene.remove(rotateCircleRef.current);
    }

    const torusGeometry = new THREE.TorusGeometry(1.5, 0.1, 16, 100);
    const torusMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffff00,
      emissive: 0xffff00
    });
    const circle = new THREE.Mesh(torusGeometry, torusMaterial);
    circle.position.copy(object.position);
    scene.add(circle);
    rotateCircleRef.current = circle;
  };

  const addKeyframe = () => {
    if (selectedObject === null || selectedIndex === -1) return;

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
    if (isPlaying) return;
    setIsPlaying(true);
    let frame = currentFrame;

    const animLoop = setInterval(() => {
      frame++;
      if (frame > 120) frame = 0;

      Object.keys(keyframesRef.current).forEach((objIdx) => {
        const idx = parseInt(objIdx);
        const obj = objectsRef.current[idx];
        if (!obj) return;

        const kfs = keyframesRef.current[idx];
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
            }
          }
        }
      });

      setCurrentFrame(frame);
    }, 1000 / 30);

    setTimeout(() => {
      clearInterval(animLoop);
      setIsPlaying(false);
    }, 4000);
  };

  const addObject = (type) => {
    const scene = sceneRef.current;

    addObjectToScene({
      type,
      name: type.charAt(0).toUpperCase() + type.slice(1),
      position: [Math.random() * 2 - 1, 1, Math.random() * 2 - 1],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: type === 'cube' ? 0x00d4ff : type === 'sphere' ? 0x00ff00 : 0xff00ff
    });
  };

  const deleteObject = (index) => {
    const scene = sceneRef.current;
    const obj = objectsRef.current[index];
    scene.remove(obj.mesh);
    objectsRef.current.splice(index, 1);
    setObjects([...objectsRef.current]);

    if (selectedIndex === index) {
      setSelectedObject(null);
      setSelectedIndex(-1);
      if (moveAxesRef.current) {
        scene.remove(moveAxesRef.current);
        moveAxesRef.current = null;
      }
      if (rotateCircleRef.current) {
        scene.remove(rotateCircleRef.current);
        rotateCircleRef.current = null;
      }
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
          🖱️ Right-click drag: Camera | Scroll: Zoom | Click object: Select | Drag axis: Move | Frame: {currentFrame}
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
        </div>

        {/* Objects */}
        <div className="sidebar-section">
          <h3>📦 Objects</h3>
          <div className="button-grid">
            <button className="btn-add" onClick={() => addObject('cube')}>+ Cube</button>
            <button className="btn-add" onClick={() => addObject('sphere')}>+ Sphere</button>
          </div>
          <div className="objects-list">
            {objectsRef.current.map((obj, index) => (
              <div
                key={index}
                className={`object-item ${selectedIndex === index ? 'selected' : ''}`}
                onClick={() => {
                  if (selectedObject) {
                    selectedObject.material.emissive.setHex(0x000000);
                  }
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
          {selectedIndex !== -1 && (
            <button className="btn-delete" onClick={() => deleteObject(selectedIndex)}>
              🗑️ Delete
            </button>
          )}
        </div>

        {/* Gizmo Mode */}
        <div className="sidebar-section">
          <h3>🔄 Transform</h3>
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
          <h3>🎬 Animation</h3>
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
              disabled={selectedIndex === -1}
            >
              + Frame
            </button>
          </div>
          <div className="frame-display">
            <label>Frame</label>
            <input
              type="range"
              min="0"
              max="120"
              value={currentFrame}
              onChange={(e) => setCurrentFrame(parseInt(e.target.value))}
              className="frame-slider"
            />
            <span style={{ fontSize: '12px', color: '#00d4ff' }}>{currentFrame}</span>
          </div>
        </div>

        {/* Save */}
        <button className="btn-save" onClick={saveProject} disabled={saving}>
          {saving ? '⏳ Saving...' : '💾 Save'}
        </button>
        <button className="btn-back" onClick={onBack}>← Back</button>
      </div>
    </div>
  );
}

export default Editor3D;
