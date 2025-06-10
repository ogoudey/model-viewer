import * as THREE from 'three';
import 'bootstrap/dist/css/bootstrap.min.css';
 
import loadModel  from './loader.js';


const canvas = document.querySelector('#c');
const renderer = new THREE.WebGLRenderer({antialias: true, canvas}); // This calls what we pass requestAnimationFrame
const fov = 50;
const aspect = 2;  // the canvas default
const near = 0.01;
const far = 200;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.z = 0;
camera.position.x = 0;
camera.position.y = 0;
camera.rotation.x = 0;
camera.rotation.y = 0.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color('gray');
scene.updateMatrixWorld(true);




const color = 0xFFFFFF;
const intensity = 5;
const light = new THREE.DirectionalLight(color, intensity);
light.position.set(-1, 2, 4);
//scene.add(light);
camera.add(light);


/////////////////////
//   UI vars      //
///////////////////
let choice = "";
let hovered = "";

/////////////////////
// Mechanics vars //
///////////////////
let model = null;
let rotate_active = true;
let inventory = null;
let tick = 0
/////////////////////
// Load model     //
///////////////////

// load then conform it to JSON
await loadModel()
  .then(modelScene => {
    scene.add(modelScene);
    model = modelScene;
    
    // safe to rotate now!
    model.rotation.y = 0.0;
    
  })
  .catch(console.error);

moveCameraToPoint("camera_point_barista");


///////////////////
// Class helpers//
/////////////////

class PickHelper {
    constructor() {
        this.raycaster = new THREE.Raycaster();
        this.pickedObject = null;
    }
// -------mousemove   
    pick(normalizedPosition, scene, camera) {
        if (this.pickedObject) {
          this.pickedObject = undefined;
        }
        // cast a ray through the frustum
        this.raycaster.setFromCamera(normalizedPosition, camera);
        // get the list of objects the ray intersected
        const intersectedObjects = this.raycaster.intersectObjects(scene.children);
        if (intersectedObjects.length) {
          // pick the first object. It's the closest one
          this.pickedObject = intersectedObjects[0].object;
          return this.pickedObject;
        }
    }
}

/////////////////////
// Initializing   //
///////////////////

const pickHelper = new PickHelper();

const pickPosition = {x: 0, y: 0};
clearPickPosition();

await loadData()
  .then(data => {
    // data.inventory is your array of daily snapshots
    inventory = data["inventory"]["items"];
    // → now pass it into your Three.js rendering logic…
  })
  .catch(err => console.error('Failed to load JSON', err));

printAllMeshes(scene);
// Inventory

arrange()

/////////////////////
// major helpers  //
///////////////////

function arrange() {
    console.log("Arranging...");
    inventory.forEach((item) => {
      const original = scene.getObjectByName(item.geometry);
      if (!original) {
        console.warn(`No mesh named "${item.geometry}" found`);
        return;
      }

      const count = item.count;
      for (let i = 0; i < count; i++) {
        let worldPos = new THREE.Vector3();
        let worldQuat = new THREE.Quaternion();
        let worldScale = new THREE.Vector3(1,1,1);
        const spawnPoint = scene.getObjectByName(item.spawn);
         if (spawnPoint) {
          // Ensure world matrices are up to date
          spawnPoint.updateMatrixWorld(true);
          spawnPoint.getWorldPosition(worldPos);
          spawnPoint.getWorldQuaternion(worldQuat);
          spawnPoint.getWorldScale(worldScale);
        } else {
          console.warn('No spawn point named "${item.spawn}" found; defaulting to origin');
        }
        worldPos.y += i * 0.051; // REPLACE WITH FUNCTION LOOKUP BY ITEM
        
        const clone = original.clone(true);
        const localPos = model.worldToLocal(worldPos.clone());
        clone.position.copy(localPos);
        clone.quaternion.copy(worldQuat);
        clone.scale.copy(worldScale);
        model.add(clone);
      }

      // now that we've made all the clones, remove the original
      original.removeFromParent();
    });
}

function inspect() {
    if (choice) {
        const choiceObject = choice;
        const worldPos = new THREE.Vector3();
        choiceObject.getWorldPosition(worldPos);
        const canvas = renderer.domElement;
        const { x, y } = worldToCanvasPos(worldPos, camera, canvas);

        const tag = document.getElementById('inspector');
        tag.style.visibility="visible";
        
        /// Inspector Styling ///
        tag.style.left = `${x}px`;
        tag.style.top  = `${y - 30}px`;
        
        const record1 = inventory.find(item => item.geometry === choiceObject.name);
        tag.children[0].innerText = record1 ? record1.name : "";;
        
        const count = document.getElementById('count');
        const record = inventory.find(item => item.geometry === choiceObject.name);
        const num = record ? record.count : "";
        count.innerText = num.toString();
        ///
    } else {
        const tag = document.getElementById('inspector');
        tag.style.visibility="hidden";
    }     
}

printAllMeshes(scene);

requestAnimationFrame(render); // Point WebGL to render() below

//////////////////////
// Render function //
////////////////////

function render(time) {
    tick += 1;
    time *= 0.001;  // convert time to seconds
    
    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }    
    
    // Lazy stream
    if (tick % 1000 === 0) {
        loadData()
          .then(data => {
            inventory = data["inventory"]["items"];
          })
          .catch(err => console.error('Failed to load JSON', err));
        arrange();
    }
    // end lazy steam
    
    if (model && rotate_active) {
        //model.rotation.y = time * 0.01;
        camera.rotation.y = time * 0.1;
    }
    
    hovered = pickHelper.pick(pickPosition, scene, camera);
    inspect();
    if (choice) {
        document.getElementById("chosen-part").innerText = choice.name;
    }
    if (hovered) {
        document.getElementById("hover-part").innerText = hovered.name;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

///////////////////////
// Helper functions //
/////////////////////

function moveCameraToPoint(pointName) {
  const newCameraPoint = scene.getObjectByName(pointName);
  if (!newCameraPoint) {
    console.warn(`Camera point '${pointName}' not found.`);
    return;
  }

  // Remove camera from current parent
  if (camera.parent) {
    camera.parent.remove(camera);
  }

  // Add camera to the new point
  newCameraPoint.add(camera);
}

function printAllMeshes(root) {
  const meshes = [];
  root.traverse(obj => {
    if (obj.isMesh) meshes.push(obj);
  });
  meshes.forEach((m, i) => {
    console.log(`${i}: name="${m.name}"`, m);
  });
  return meshes;
}

async function loadData() {
  const res = await fetch('/inv.json');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// -------click
function choose(event) {
    choice = pickHelper.pick(pickPosition, scene, camera);
    console.log(choice);
}

function worldToCanvasPos(worldPos, camera, canvas) {
  // Clone so we don't overwrite the original
  const pos = worldPos.clone();

  // Project into NDC space (x,y ∈ [-1,1])
  pos.project(camera);
   
  // Convert to pixels
  const halfW = canvas.clientWidth  / 2;
  const halfH = canvas.clientHeight / 2;

  return {
    x: ( pos.x * halfW ) + halfW,
    y: ( -pos.y * halfH ) + halfH,
  };
}

function getCanvasRelativePosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * canvas.width  / rect.width,
    y: (event.clientY - rect.top ) * canvas.height / rect.height,
  };
}
 
function setPickPosition(event) {
  const pos = getCanvasRelativePosition(event);
  pickPosition.x = (pos.x / canvas.width ) *  2 - 1;
  pickPosition.y = (pos.y / canvas.height) * -2 + 1;  // note we flip Y
}

function clearPickPosition() {
  pickPosition.x = -100000;
  pickPosition.y = -100000;
}

function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
    renderer.setSize(width, height, false);
    }
    return needResize;
}

/////////////////////
//Event Listeners //
///////////////////

window.addEventListener('click', choose);
window.addEventListener('mousemove', setPickPosition);
window.addEventListener('mouseout', clearPickPosition);
window.addEventListener('mouseleave', clearPickPosition);

//mobile
window.addEventListener('touchstart', (event) => {
  // prevent the window from scrolling
  event.preventDefault();
  setPickPosition(event.touches[0]);
}, {passive: false});
 
window.addEventListener('touchmove', (event) => {
  setPickPosition(event.touches[0]);
  choose(event)
});
 
window.addEventListener('touchend', clearPickPosition);

////////////////////////
//Specific Listeners //
//////////////////////

const blButton = document.getElementById('bl-button');

function handleBottomLeftClick(event) {
  console.log('Bottom-left button clicked!', event);
    rotate_active = !rotate_active;
}

blButton.addEventListener('click', handleBottomLeftClick);

// Dropdown buttons
const tlAction1 = document.getElementById('tl-action-1');
const tlAction2 = document.getElementById('tl-action-2');

function handleTopLeftAction1Click(event) {
  console.log('Top-left Action 1 clicked!', event);
  moveCameraToPoint("camera_point_barista");
  
}

function handleTopLeftAction2Click(event) {
  console.log('Top-left Action 2 clicked!', event);
  moveCameraToPoint("camera_point_scooper");
}

tlAction1.addEventListener('click', handleTopLeftAction1Click);
tlAction2.addEventListener('click', handleTopLeftAction2Click);

const gazeboButton = document.getElementById('gazebo-button');

gazeboButton.addEventListener('click', async () => {
  console.log('Simulate with Gazebo clicked!');
  
  // Example: Export scene and generate SDF


  // Placeholder action:
  alert('Scene would now be exported for Gazebo simulation.');
});


