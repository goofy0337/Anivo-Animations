import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { projectAPI } from '../api/api';
import './Editor3D.css';

function Editor3D({ project, onBack, user, purchasedItem, onSpawned }) {
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
  
  // State tracking refs
  const selectedObjectRef = useRef(null);
  const selectedIndexRef = useRef(-1);
  const gizmoModeRef = useRef('move');
  
  const [projectTitle, setProjectTitle] = useState(project?.title || 'New Project');
  const [projectDescription, setProjectDescription] = useState(project?.description || '');
  const [gizmoMode, setGizmoMode] = useState('move');
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasKeyframe, setHasKeyframe] = useState(false);
  const [saving, setSaving] = useState(false);
  const [objects, setObjects] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [objectKeyframes, setObjectKeyframes] = useState([]);
  const [inventoryCounts, setInventoryCounts] = useState({});

  // Interaction state
  const interactionRef = useRef({
    cameraRotating: false,
    gizmoDragging: false,
    dragAxis: null,
    previousMouse: { x: 0, y: 0 }
  });

  // Coins / activity tracking
  const coinKey = `coins_${user?.username || user?.id || 'guest'}`;
  const [coins, setCoins] = useState(() => {
    const saved = localStorage.getItem(coinKey);
    return saved ? parseInt(saved, 10) : 0;
  });
  const lastActivityRef = useRef(Date.now());
  const activeSecondsRef = useRef(0);

  // Initialize Three.js scene
  useEffect(() => {
    // If a purchased item arrives, spawn it into the scene, update inventory and select it
    if (purchasedItem) {
      // Slight delay to ensure scene is ready
      setTimeout(() => {
        if (purchasedItem.id === 'rig') {
          createRig();
        } else {
          addObjectToScene({ type: purchasedItem.id, name: purchasedItem.name || purchasedItem.id, position: [0,1,0], rotation: [0,0,0], scale: [1,1,1], color: purchasedItem.color || 0x00d4ff });
        }
        // refresh inventory buttons
        loadInventoryCounts();
        if (onSpawned) onSpawned();
      }, 120);
    }
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
      lastActivityRef.current = Date.now();
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
      lastActivityRef.current = Date.now();
      if (interactionRef.current.cameraRotating) {
        handleCameraRotation(event);
      } else if (interactionRef.current.gizmoDragging && selectedObjectRef.current) {
        handleGizmoDrag(event);
      }
    };

    const onMouseUp = () => {
      interactionRef.current.cameraRotating = false;
      interactionRef.current.gizmoDragging = false;
      interactionRef.current.dragAxis = null;
    };

    const onWheel = (event) => {
      lastActivityRef.current = Date.now();
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

  // Load inventory counts from localStorage (shop stores items in 'userInventory')
  const loadInventoryCounts = () => {
    try {
      const saved = localStorage.getItem('userInventory');
      if (!saved) {
        setInventoryCounts({});
        return;
      }
      const arr = JSON.parse(saved);
      const counts = {};
      arr.forEach(i => { counts[i.id] = (counts[i.id] || 0) + 1; });
      setInventoryCounts(counts);
    } catch (e) {
      console.error('Failed to load inventory', e);
      setInventoryCounts({});
    }
  };

  useEffect(() => {
    loadInventoryCounts();
  }, []);

  // Activity coin awarding: 1 coin per 30 seconds of active editing
  useEffect(() => {
    const tick = setInterval(() => {
      const now = Date.now();
      // consider user active if they interacted in the last 5 seconds
      if (now - lastActivityRef.current < 5000) {
        activeSecondsRef.current += 1;
        if (activeSecondsRef.current >= 30) {
          const awards = Math.floor(activeSecondsRef.current / 30);
          activeSecondsRef.current = activeSecondsRef.current % 30;
          const current = parseInt(localStorage.getItem(coinKey) || String(coins), 10) || 0;
          const newCoins = current + awards;
          setCoins(newCoins);
          localStorage.setItem(coinKey, String(newCoins));
        }
      }
    }, 1000);

    return () => clearInterval(tick);
  }, [coinKey, coins]);

  const giveTestCoins = (amount = 500) => {
    const current = parseInt(localStorage.getItem(coinKey) || String(coins), 10) || 0;
    const newCoins = current + amount;
    setCoins(newCoins);
    localStorage.setItem(coinKey, String(newCoins));
    alert(`Added ${amount} test coins.`);
  };

  const createRig = () => {
    const scene = sceneRef.current;
    const rigGroup = new THREE.Group();

    // Simple 3-joint spine rig example
    const material = new THREE.MeshStandardMaterial({ color: 0x00ffff });

    const jointGeometry = new THREE.SphereGeometry(0.12, 12, 12);
    const joint0 = new THREE.Mesh(jointGeometry, material);
    const joint1 = new THREE.Mesh(jointGeometry, material);
    const joint2 = new THREE.Mesh(jointGeometry, material);

    joint0.position.set(0, 0.5, 0);
    joint1.position.set(0, 1.0, 0);
    joint2.position.set(0, 1.5, 0);

    rigGroup.add(joint0);
    rigGroup.add(joint1);
    rigGroup.add(joint2);

    // bones as lines
    const points01 = [new THREE.Vector3().copy(joint0.position), new THREE.Vector3().copy(joint1.position)];
    const points12 = [new THREE.Vector3().copy(joint1.position), new THREE.Vector3().copy(joint2.position)];

    const boneMat = new THREE.LineBasicMaterial({ color: 0x00ffff });
    const bone01 = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points01), boneMat);
    const bone12 = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points12), boneMat);

    rigGroup.add(bone01);
    rigGroup.add(bone12);

    rigGroup.name = 'Rig';
    scene.add(rigGroup);

    objectsRef.current.push({ mesh: rigGroup, type: 'rig', name: 'Rig' });
    setObjects([...objectsRef.current]);
  };

  const createSky = (color = 0x87ceeb) => {
    const scene = sceneRef.current;
    // remove existing sky if present
    const existing = objectsRef.current.find(o => o.type === 'sky');
    if (existing) {
      scene.remove(existing.mesh);
      objectsRef.current = objectsRef.current.filter(o => o !== existing);
    }

    const skyMesh = new THREE.Mesh(
      new THREE.SphereGeometry(40, 32, 32),
      new THREE.MeshStandardMaterial({ color, side: THREE.BackSide })
    );
    skyMesh.name = 'Sky';
    skyMesh.receiveShadow = false;
    skyMesh.castShadow = false;
    scene.add(skyMesh);

    objectsRef.current.push({ mesh: skyMesh, type: 'sky', name: 'Sky' });
    setObjects([...objectsRef.current]);
  };

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
      case 'torus':
        mesh = new THREE.Mesh(
          new THREE.TorusGeometry(0.8, 0.15, 16, 100),
          new THREE.MeshStandardMaterial({ color: objData.color || 0xffff00 })
        );
        break;
      case 'pyramid':
        mesh = new THREE.Mesh(
          new THREE.ConeGeometry(0.9, 1.2, 4),
          new THREE.MeshStandardMaterial({ color: objData.color || 0xff6b6b })
        );
        break;
      case 'sky':
        // large inverted sphere to act as skybox/sky dome
        mesh = new THREE.Mesh(
          new THREE.SphereGeometry(40, 32, 32),
          new THREE.MeshStandardMaterial({ color: objData.color || 0x87ceeb, side: THREE.BackSide })
        );
        mesh.receiveShadow = false;
        mesh.castShadow = false;
        break;
      case 'rig':
        // rig should be created via createRig(), not addObjectToScene
        createRig();
        return;
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
          if (moveAxesRef.current) {
            const axis = clicked.userData?.axis;
            if (axis) {
              interactionRef.current.gizmoDragging = true;
              interactionRef.current.dragAxis = axis;
            }
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

      // find owner object index by walking up parent chain
      const findOwnerIndex = (mesh) => {
        let node = mesh;
        while (node) {
          const idx = objectsRef.current.findIndex(o => o.mesh === node);
          if (idx !== -1) return idx;
          node = node.parent;
        }
        return -1;
      };

      const foundIndex = findOwnerIndex(clickedMesh);

      if (foundIndex !== -1) {
        // Deselect previous (clear emissive if material exists)
        if (selectedObjectRef.current && selectedObjectRef.current.material && selectedObjectRef.current.material.emissive) {
          try { selectedObjectRef.current.material.emissive.setHex(0x000000); } catch (e) {}
        }

        // Select new: pick the actual mesh clicked (so emissive exists)
        selectedObjectRef.current = clickedMesh.material ? clickedMesh : (clickedMesh.children && clickedMesh.children.find(c=>c.isMesh) ? clickedMesh.children.find(c=>c.isMesh) : clickedMesh);
        selectedIndexRef.current = foundIndex;
        if (selectedObjectRef.current && selectedObjectRef.current.material && selectedObjectRef.current.material.emissive) {
          try { selectedObjectRef.current.material.emissive.setHex(0xffff00); } catch (e) {}
        }
        setSelectedIndex(foundIndex);

        // Create gizmo attached to the selected object's world position
        const targetMeshForGizmo = selectedObjectRef.current;
        if (gizmoModeRef.current === 'move') {
          createMoveGizmo(targetMeshForGizmo);
        } else {
          createRotateCircle(targetMeshForGizmo);
        }

        // Check keyframe and update keyframes list
        const objKeyframes = keyframesRef.current[foundIndex];
        setHasKeyframe(objKeyframes && objKeyframes[currentFrame] ? true : false);
        updateObjectKeyframes();
      }
    } else {
      // Clicked on empty space - deselect everything
      if (selectedObjectRef.current) {
        selectedObjectRef.current.material.emissive.setHex(0x000000);
        selectedObjectRef.current = null;
        selectedIndexRef.current = -1;
        setSelectedIndex(-1);
        setHasKeyframe(false);
        setObjectKeyframes([]);
      }

      // Remove gizmos
      const scene = sceneRef.current;
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
    if (!selectedObjectRef.current) return;

    const deltaX = event.clientX - interactionRef.current.previousMouse.x;
    const deltaY = event.clientY - interactionRef.current.previousMouse.y;
    const speed = 0.02;

    const obj = selectedObjectRef.current;

    if (interactionRef.current.dragAxis === 'x') {
      obj.position.x += deltaX * speed;
    } else if (interactionRef.current.dragAxis === 'y') {
      obj.position.y -= deltaY * speed;
    } else if (interactionRef.current.dragAxis === 'z') {
      obj.position.z -= deltaY * speed;
    } else if (interactionRef.current.dragAxis === 'rotate') {
      obj.rotation.y += deltaX * 0.01;
    }

    // Update gizmo position
    if (moveAxesRef.current) {
      moveAxesRef.current.position.copy(obj.position);
    }
    if (rotateCircleRef.current) {
      rotateCircleRef.current.position.copy(obj.position);
    }

    interactionRef.current.previousMouse = { x: event.clientX, y: event.clientY };
  };

  const createMoveGizmo = (object) => {
    const scene = sceneRef.current;

    // Remove previous gizmos
    if (moveAxesRef.current) {
      scene.remove(moveAxesRef.current);
      moveAxesRef.current = null;
    }
    if (rotateCircleRef.current) {
      scene.remove(rotateCircleRef.current);
      rotateCircleRef.current = null;
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

    // Remove previous gizmos
    if (moveAxesRef.current) {
      scene.remove(moveAxesRef.current);
      moveAxesRef.current = null;
    }
    if (rotateCircleRef.current) {
      scene.remove(rotateCircleRef.current);
      rotateCircleRef.current = null;
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
    lastActivityRef.current = Date.now();
    if (selectedObjectRef.current === null || selectedIndexRef.current === -1) return;

    if (!keyframesRef.current[selectedIndexRef.current]) {
      keyframesRef.current[selectedIndexRef.current] = {};
    }

    keyframesRef.current[selectedIndexRef.current][currentFrame] = {
      position: selectedObjectRef.current.position.toArray(),
      rotation: [selectedObjectRef.current.rotation.x, selectedObjectRef.current.rotation.y, selectedObjectRef.current.rotation.z],
      scale: selectedObjectRef.current.scale.toArray(),
    };

    setHasKeyframe(true);
    updateObjectKeyframes();
  };

  const deleteKeyframe = (frame) => {
    if (selectedIndexRef.current === -1) return;

    if (keyframesRef.current[selectedIndexRef.current]) {
      delete keyframesRef.current[selectedIndexRef.current][frame];
      
      // Clean up empty keyframe object
      if (Object.keys(keyframesRef.current[selectedIndexRef.current]).length === 0) {
        delete keyframesRef.current[selectedIndexRef.current];
      }
    }

    updateObjectKeyframes();

    // Check if current frame still has keyframe
    const objKeyframes = keyframesRef.current[selectedIndexRef.current];
    setHasKeyframe(objKeyframes && objKeyframes[currentFrame] ? true : false);
  };

  const updateObjectKeyframes = () => {
    if (selectedIndexRef.current === -1) {
      setObjectKeyframes([]);
      return;
    }

    const kfs = keyframesRef.current[selectedIndexRef.current];
    if (kfs) {
      const frames = Object.keys(kfs).map(Number).sort((a, b) => a - b);
      setObjectKeyframes(frames);
    } else {
      setObjectKeyframes([]);
    }
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
    lastActivityRef.current = Date.now();
    addObjectToScene({
      type,
      name: type.charAt(0).toUpperCase() + type.slice(1),
      position: [Math.random() * 2 - 1, 1, Math.random() * 2 - 1],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: type === 'cube' ? 0x00d4ff : type === 'sphere' ? 0x00ff00 : 0xff00ff
    });
  };

  const spawnFromInventory = (itemId) => {
    lastActivityRef.current = Date.now();
    if (itemId === 'rig') {
      createRig();
    } else {
      // spawn at slightly in front of origin so it's visible
      addObjectToScene({ type: itemId, name: itemId.charAt(0).toUpperCase() + itemId.slice(1), position: [0,1,0], rotation: [0,0,0], scale: [1,1,1], color: 0x00d4ff });
    }
  };

  const deleteObject = (index) => {
    lastActivityRef.current = Date.now();
    const scene = sceneRef.current;
    const obj = objectsRef.current[index];
    scene.remove(obj.mesh);
    objectsRef.current.splice(index, 1);
    setObjects([...objectsRef.current]);

    if (selectedIndexRef.current === index) {
      selectedObjectRef.current = null;
      selectedIndexRef.current = -1;
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
    lastActivityRef.current = Date.now();
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

  const handleGizmoModeChange = (mode) => {
    gizmoModeRef.current = mode;
    setGizmoMode(mode);

    // Update gizmo when mode changes
    if (selectedObjectRef.current) {
      if (mode === 'move') {
        createMoveGizmo(selectedObjectRef.current);
      } else {
        createRotateCircle(selectedObjectRef.current);
      }
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
          {Object.keys(inventoryCounts).length > 0 && (
            <div style={{ marginTop: 8 }}>
              <h4 style={{ margin: '8px 0 6px 0', color: '#ccc', fontSize: 12 }}>Owned Items</h4>
              <div className="button-grid">
                {Object.entries(inventoryCounts).map(([id, count]) => (
                  <button key={id} className="btn-add" onClick={() => spawnFromInventory(id)}>
                    + {id.charAt(0).toUpperCase() + id.slice(1)} {count > 1 ? `(${count})` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="objects-list">
            {objectsRef.current.map((obj, index) => (
                <div
                  key={index}
                  className={`object-item ${selectedIndex === index ? 'selected' : ''}`}
                  onClick={() => {
                    // safely clear previous emissive
                    if (selectedObjectRef.current && selectedObjectRef.current.material && selectedObjectRef.current.material.emissive) {
                      try { selectedObjectRef.current.material.emissive.setHex(0x000000); } catch (e) {}
                    }

                    // find a pickable mesh for this object (prefer the mesh itself, otherwise a descendant mesh)
                    const getPickable = (node) => {
                      if (!node) return null;
                      if (node.isMesh) return node;
                      if (node.children && node.children.length) {
                        for (let i=0;i<node.children.length;i++) {
                          const found = getPickable(node.children[i]);
                          if (found) return found;
                        }
                      }
                      return null;
                    };

                    const pickable = getPickable(obj.mesh) || obj.mesh;
                    selectedObjectRef.current = pickable;
                    selectedIndexRef.current = index;
                    if (pickable && pickable.material && pickable.material.emissive) {
                      try { pickable.material.emissive.setHex(0xffff00); } catch (e) {}
                    }
                    setSelectedIndex(index);

                    const target = pickable || obj.mesh;
                    if (gizmoModeRef.current === 'move') {
                      createMoveGizmo(target);
                    } else {
                      createRotateCircle(target);
                    }
                    updateObjectKeyframes();
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
              onClick={() => handleGizmoModeChange('move')}
            >
              Move
            </button>
            <button
              className={`btn-add ${gizmoMode === 'rotate' ? 'active' : ''}`}
              onClick={() => handleGizmoModeChange('rotate')}
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

        {/* Keyframes Panel */}
        {selectedIndex !== -1 && (
          <div className="sidebar-section">
            <h3>📌 Keyframes</h3>
            {objectKeyframes.length > 0 ? (
              <div className="keyframes-list">
                {objectKeyframes.map((frame) => (
                  <div
                    key={frame}
                    className={`keyframe-item ${currentFrame === frame ? 'current' : ''}`}
                    onClick={() => setCurrentFrame(frame)}
                  >
                    <span>Frame {frame}</span>
                    <button
                      className="btn-remove-keyframe"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteKeyframe(frame);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-keyframes">No keyframes yet</p>
            )}
          </div>
        )}

        {/* Coins & Save */}
        <div className="coins-row">
          <div className="coins-display-small">💰 {coins}</div>
          <button className="btn-test-coins" onClick={() => giveTestCoins(500)}>+500 Test Coins</button>
        </div>
        <button className="btn-save" onClick={saveProject} disabled={saving}>
          {saving ? '⏳ Saving...' : '💾 Save'}
        </button>
        <button className="btn-back" onClick={onBack}>← Back</button>
      </div>
    </div>
  );
}

export default Editor3D;
